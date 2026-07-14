use std::path::PathBuf;
use std::sync::Mutex;

use once_cell::sync::Lazy;
use rusqlite::Connection;
use uuid::Uuid;

pub const NATASCHA_SCHEMA_SQL: &str = include_str!("natascha_schema.sql");
pub const LUA_SCHEMA_SQL: &str = include_str!("lua_schema.sql");

static DB_PATH_OVERRIDE: Lazy<Mutex<Option<PathBuf>>> = Lazy::new(|| Mutex::new(None));

pub fn set_db_path(path: Option<PathBuf>) {
    let mut guard = DB_PATH_OVERRIDE.lock().unwrap();
    *guard = path;
}

pub fn resolve_db_path() -> PathBuf {
    let guard = DB_PATH_OVERRIDE.lock().unwrap();
    if let Some(ref p) = *guard {
        return p.clone();
    }
    drop(guard);

    if let Some(home) = home_dir() {
        let bridge_dir = home.join("lehr-suite-bridge");
        let _ = std::fs::create_dir_all(&bridge_dir);
        return bridge_dir.join("lehr-suite.db");
    }
    PathBuf::from("lehr-suite.db")
}

pub fn open_db() -> Result<Connection, String> {
    let path = resolve_db_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("DB-Verzeichnis konnte nicht erstellt werden: {}", e))?;
    }
    let conn = Connection::open(&path).map_err(|e| format!("DB konnte nicht geöffnet werden ({}): {}", path.display(), e))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").map_err(|e| format!("PRAGMA fehlgeschlagen: {}", e))?;
    init_schema(&conn)?;
    Ok(conn)
}

pub fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(NATASCHA_SCHEMA_SQL).map_err(|e| format!("Korrektur-Schema fehlgeschlagen: {}", e))?;
    conn.execute_batch(LUA_SCHEMA_SQL).map_err(|e| format!("LUA-Schema fehlgeschlagen: {}", e))?;
    migrate_pool_local_metadata(conn)?;
    migrate_lua_klassen_identity(conn)?;
    Ok(())
}

/// Ergänzt lokale Pool-Metadaten auch in bereits vorhandenen Datenbanken.
/// Diese Felder gehören nicht zum exportierten PoolEntry-Format.
fn migrate_pool_local_metadata(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("PRAGMA table_info(aufgabe_pool)")
        .map_err(|e| format!("Pool-Migration vorbereiten fehlgeschlagen: {}", e))?;
    let columns: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Pool-Migration lesen fehlgeschlagen: {}", e))?
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Pool-Migration auswerten fehlgeschlagen: {}", e))?;

    if !columns.contains("is_favorite") {
        conn.execute_batch("ALTER TABLE aufgabe_pool ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;")
            .map_err(|e| format!("Pool-Migration Favorit fehlgeschlagen: {}", e))?;
    }
    if !columns.contains("quality_status") {
        conn.execute_batch("ALTER TABLE aufgabe_pool ADD COLUMN quality_status TEXT NOT NULL DEFAULT 'unbewertet';")
            .map_err(|e| format!("Pool-Migration Status fehlgeschlagen: {}", e))?;
    }
    if !columns.contains("last_used_at") {
        conn.execute_batch("ALTER TABLE aufgabe_pool ADD COLUMN last_used_at TEXT;")
            .map_err(|e| format!("Pool-Migration Nutzung fehlgeschlagen: {}", e))?;
    }
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_pool_quality_status ON aufgabe_pool(quality_status);
         CREATE INDEX IF NOT EXISTS idx_pool_last_used ON aufgabe_pool(last_used_at);",
    )
    .map_err(|e| format!("Pool-Migration Indizes fehlgeschlagen: {}", e))?;
    Ok(())
}

/// Ergänzt die stabile LUA-Identität für Klassen in bereits vorhandenen Datenbanken.
/// `name` bleibt bewusst der NATASCHA-Brückenschlüssel und Primärschlüssel.
fn migrate_lua_klassen_identity(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("PRAGMA table_info(lua_klassen)")
        .map_err(|e| format!("Klassen-ID-Migration vorbereiten fehlgeschlagen: {}", e))?;
    let columns: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Klassen-ID-Migration lesen fehlgeschlagen: {}", e))?
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Klassen-ID-Migration auswerten fehlgeschlagen: {}", e))?;

    if !columns.contains("id") {
        conn.execute_batch("ALTER TABLE lua_klassen ADD COLUMN id TEXT;")
            .map_err(|e| format!("Klassen-ID-Migration Spalte fehlgeschlagen: {}", e))?;
    }

    let mut backfill_stmt = conn
        .prepare("SELECT name FROM lua_klassen WHERE id IS NULL OR trim(id) = ''")
        .map_err(|e| format!("Klassen-ID-Migration Backfill vorbereiten fehlgeschlagen: {}", e))?;
    let namen: Vec<String> = backfill_stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Klassen-ID-Migration Backfill lesen fehlgeschlagen: {}", e))?
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Klassen-ID-Migration Backfill auswerten fehlgeschlagen: {}", e))?;
    for name in namen {
        conn.execute(
            "UPDATE lua_klassen SET id=?1 WHERE name=?2 AND (id IS NULL OR trim(id) = '')",
            rusqlite::params![Uuid::new_v4().to_string(), name],
        )
        .map_err(|e| format!("Klassen-ID-Migration Backfill fehlgeschlagen: {}", e))?;
    }

    conn.execute_batch("CREATE UNIQUE INDEX IF NOT EXISTS idx_lua_klassen_id ON lua_klassen(id);")
        .map_err(|e| format!("Klassen-ID-Migration Index fehlgeschlagen: {}", e))?;
    Ok(())
}

fn home_dir() -> Option<PathBuf> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()
        .map(PathBuf::from)
}

pub fn migrate_from_localstorage(conn: &Connection, payload: &serde_json::Value) -> Result<usize, String> {
    let mut count = 0;
    if let Some(docs) = payload.get("documents").and_then(|v| v.as_array()) {
        for doc in docs {
            let id = doc["id"].as_str().unwrap_or("");
            let title = doc["title"].as_str().unwrap_or("Unbenannt");
            let saved_at = doc["savedAt"].as_str().unwrap_or("");
            let updated_at = doc["updatedAt"].as_str().unwrap_or("");
            let is_favorite = doc["isFavorite"].as_bool().unwrap_or(false);
            let is_deleted = doc["isDeleted"].as_bool().unwrap_or(false);
            let deleted_at: Option<String> = doc.get("deletedAt").and_then(|v| v.as_str()).map(|s| s.to_string());
            let snapshot_json = serde_json::to_string(doc.get("snapshot").unwrap_or(&serde_json::Value::Null)).unwrap_or_else(|_| "{}".to_string());
            let klasse = doc.get("klasse").and_then(|v| v.as_str()).unwrap_or("");
            let aufgabe = doc.get("aufgabe").and_then(|v| v.as_str()).unwrap_or("");
            conn.execute(
                "INSERT OR IGNORE INTO generated_materials (id, title, klasse, aufgabe, snapshot_json, created_at, updated_at, is_favorite, is_deleted, deleted_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                rusqlite::params![id, title, klasse, aufgabe, snapshot_json, saved_at, updated_at, is_favorite, is_deleted, deleted_at],
            ).map_err(|e| format!("Migrate doc {}: {}", id, e))?;
            count += 1;
        }
    }
    if let Some(history) = payload.get("history").and_then(|v| v.as_array()) {
        for entry in history {
            let id = entry["id"].as_str().unwrap_or("");
            let timestamp = entry["timestamp"].as_str().unwrap_or("");
            let thema = entry["thema"].as_str().unwrap_or("");
            let fach = entry["fach"].as_str().unwrap_or("");
            let stufe = entry["stufe"].as_str().unwrap_or("");
            let llm_provider: Option<&str> = entry.get("llmProvider").and_then(|v| v.as_str());
            let model_name: Option<&str> = entry.get("modelName").and_then(|v| v.as_str());
            let block_count: i64 = entry["blockCount"].as_i64().unwrap_or(0);
            let total_punkte: i64 = entry["totalPunkte"].as_i64().unwrap_or(0);
            let exported_json = serde_json::to_string(entry.get("exportedFiles").unwrap_or(&serde_json::Value::Null)).unwrap_or_else(|_| "[]".to_string());
            let saved_document_id = entry.get("savedDocumentId").and_then(|v| v.as_str());
            conn.execute(
                "INSERT OR IGNORE INTO lua_history (id, timestamp, thema, fach, stufe, llm_provider, model_name, block_count, total_punkte, exported_files_json, saved_document_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
                rusqlite::params![id, timestamp, thema, fach, stufe, llm_provider, model_name, block_count, total_punkte, exported_json, saved_document_id],
            ).map_err(|e| format!("Migrate history {}: {}", id, e))?;
            count += 1;
        }
    }
    if let Some(settings) = payload.get("settings") {
        let settings_json = serde_json::to_string(settings).unwrap_or_else(|_| "{}".to_string());
        conn.execute(
            "INSERT OR REPLACE INTO lua_settings (key, value_json) VALUES ('app', ?1)",
            rusqlite::params![settings_json],
        ).map_err(|e| format!("Migrate settings: {}", e))?;
        count += 1;
    }
    if let Some(templates) = payload.get("templates").and_then(|v| v.as_array()) {
        for tpl in templates {
            let name = tpl["name"].as_str().unwrap_or("");
            let id = format!("tpl_{}", name.replace(' ', "_"));
            let meta_json = serde_json::to_string(tpl.get("meta").unwrap_or(&serde_json::Value::Null)).unwrap_or_else(|_| "{}".to_string());
            let bloecke_json = serde_json::to_string(tpl.get("bloecke").unwrap_or(&serde_json::Value::Null)).unwrap_or_else(|_| "[]".to_string());
            let saved_at = tpl["savedAt"].as_str().unwrap_or("");
            conn.execute(
                "INSERT OR IGNORE INTO lua_templates (id, name, meta_json, bloecke_json, saved_at) VALUES (?1,?2,?3,?4,?5)",
                rusqlite::params![id, name, meta_json, bloecke_json, saved_at],
            ).map_err(|e| format!("Migrate template '{}': {}", name, e))?;
            count += 1;
        }
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pool_metadata_migration_ergaenzt_alte_datenbank() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE aufgabe_pool (
                id TEXT PRIMARY KEY, fach TEXT NOT NULL, stufe TEXT NOT NULL,
                schulstufe INTEGER, thema TEXT, aufgabentyp TEXT NOT NULL,
                tags TEXT, block_json TEXT NOT NULL, quelle_hinweis TEXT,
                created_at TEXT NOT NULL
            );",
        ).unwrap();

        init_schema(&conn).unwrap();

        let columns: std::collections::HashSet<String> = conn
            .prepare("PRAGMA table_info(aufgabe_pool)")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert!(columns.contains("is_favorite"));
        assert!(columns.contains("quality_status"));
        assert!(columns.contains("last_used_at"));
    }

    #[test]
    fn lua_klassen_identity_migration_ergaenzt_alte_datenbank() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE lua_klassen (
                name TEXT PRIMARY KEY, fach TEXT, stufe TEXT, schulstufe INTEGER,
                schuljahr TEXT, notizen TEXT, archiviert INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            INSERT INTO lua_klassen (name, fach) VALUES ('7A', 'deutsch'), ('8B', 'englisch');",
        )
        .unwrap();

        init_schema(&conn).unwrap();

        let columns: std::collections::HashSet<String> = conn
            .prepare("PRAGMA table_info(lua_klassen)")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert!(columns.contains("id"));

        let ids: Vec<String> = conn
            .prepare("SELECT id FROM lua_klassen ORDER BY name")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert_eq!(ids.len(), 2);
        assert!(ids.iter().all(|id| Uuid::parse_str(id).is_ok()));
        assert_ne!(ids[0], ids[1]);

        let unique_index_exists: bool = conn
            .prepare("PRAGMA index_list(lua_klassen)")
            .unwrap()
            .query_map([], |row| Ok((row.get::<_, String>(1)?, row.get::<_, i64>(2)? != 0)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap()
            .into_iter()
            .any(|(name, unique)| name == "idx_lua_klassen_id" && unique);
        assert!(unique_index_exists);
    }
}
