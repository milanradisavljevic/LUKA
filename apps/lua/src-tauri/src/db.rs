use std::path::PathBuf;
use std::sync::Mutex;

use once_cell::sync::Lazy;
use rusqlite::{Connection, OptionalExtension};
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
    // Vorhandene Korrektur-Datenbanken können die Tabelle noch ohne Cluster-
    // Spalten enthalten. Vorhandene Tabellen deshalb vor dem Schema-Batch migrieren.
    migrate_fehler_cluster_columns(conn)?;
    conn.execute_batch(NATASCHA_SCHEMA_SQL).map_err(|e| format!("Korrektur-Schema fehlgeschlagen: {}", e))?;
    conn.execute_batch(LUA_SCHEMA_SQL).map_err(|e| format!("LUA-Schema fehlgeschlagen: {}", e))?;
    migrate_natascha_abgabe_link_columns(conn)?;
    migrate_fehler_cluster_columns(conn)?;
    // Bewusst außerhalb des Schema-Batches: Der Index darf erst entstehen,
    // nachdem die Cluster-Spalte auch bei Alt-Datenbanken sicher existiert.
    conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_fehler_cluster ON fehler_historie(cluster_id);")
        .map_err(|e| format!("Fehler-Cluster-Index anlegen fehlgeschlagen: {}", e))?;
    migrate_korrektur_revisionen(conn)?;
    migrate_pool_local_metadata(conn)?;
    migrate_lua_klassen_identity(conn)?;
    migrate_lua_klassen_land(conn)?;
    migrate_generated_materials_loop_columns(conn)?;
    Ok(())
}

/// Ergänzt optionale Fehler-Cluster auch in gemeinsam genutzten Alt-Datenbanken.
/// Die vier historischen Typcodes R/G/Z/A bleiben unverändert erhalten.
fn migrate_fehler_cluster_columns(conn: &Connection) -> Result<(), String> {
    let table_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='fehler_historie')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Fehler-Cluster-Tabelle prüfen fehlgeschlagen: {e}"))?;
    if !table_exists {
        // Frische Datenbanken erhalten die Tabelle durch NATASCHA_SCHEMA_SQL;
        // die Migration wird danach in init_schema erneut ausgeführt.
        return Ok(());
    }

    let mut stmt = conn
        .prepare("PRAGMA table_info(fehler_historie)")
        .map_err(|e| format!("Fehler-Cluster-Migration vorbereiten fehlgeschlagen: {e}"))?;
    let columns: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Fehler-Cluster-Migration lesen fehlgeschlagen: {e}"))?
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Fehler-Cluster-Migration auswerten fehlgeschlagen: {e}"))?;
    if !columns.contains("cluster_id") {
        conn.execute_batch("ALTER TABLE fehler_historie ADD COLUMN cluster_id TEXT;")
            .map_err(|e| format!("Fehler-Cluster-Spalte ergänzen fehlgeschlagen: {e}"))?;
    }
    if !columns.contains("regel_muster") {
        conn.execute_batch("ALTER TABLE fehler_historie ADD COLUMN regel_muster TEXT;")
            .map_err(|e| format!("Fehler-Regelmuster-Spalte ergänzen fehlgeschlagen: {e}"))?;
    }
    Ok(())
}

/// Ergänzt die Closed-Loop-Herkunfts-Spalten (L1) auch in bereits vorhandenen
/// Datenbanken: aus welcher NATASCHA-Korrektur eine Unterlage abgeleitet wurde.
fn migrate_generated_materials_loop_columns(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("PRAGMA table_info(generated_materials)")
        .map_err(|e| format!("Loop-Migration vorbereiten fehlgeschlagen: {}", e))?;
    let columns: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Loop-Migration lesen fehlgeschlagen: {}", e))?
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Loop-Migration auswerten fehlgeschlagen: {}", e))?;

    if !columns.contains("loop_klasse") {
        conn.execute_batch("ALTER TABLE generated_materials ADD COLUMN loop_klasse TEXT;")
            .map_err(|e| format!("Loop-Migration loop_klasse fehlgeschlagen: {}", e))?;
    }
    if !columns.contains("loop_aufgabe") {
        conn.execute_batch("ALTER TABLE generated_materials ADD COLUMN loop_aufgabe TEXT;")
            .map_err(|e| format!("Loop-Migration loop_aufgabe fehlgeschlagen: {}", e))?;
    }
    if !columns.contains("loop_datum") {
        conn.execute_batch("ALTER TABLE generated_materials ADD COLUMN loop_datum TEXT;")
            .map_err(|e| format!("Loop-Migration loop_datum fehlgeschlagen: {}", e))?;
    }
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_materials_loop ON generated_materials(loop_klasse);",
    )
    .map_err(|e| format!("Loop-Migration Index fehlgeschlagen: {}", e))?;
    Ok(())
}

/// Übernimmt vorhandene Abgaben und ihre aktuell sichtbaren Bewertungen als Revision 1.
fn migrate_korrektur_revisionen(conn: &Connection) -> Result<(), String> {
    let revision_columns = {
        let mut stmt = conn.prepare("PRAGMA table_info(korrektur_revision)")
            .map_err(|e| format!("Korrekturversions-Spalten prüfen: {e}"))?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| format!("Korrekturversions-Spalten lesen: {e}"))?
            .collect::<Result<std::collections::HashSet<_>, _>>()
            .map_err(|e| format!("Korrekturversions-Spalten auswerten: {e}"))?;
        rows
    };
    if !revision_columns.contains("basis_json") {
        conn.execute_batch("ALTER TABLE korrektur_revision ADD COLUMN basis_json TEXT NOT NULL DEFAULT '{}';")
            .map_err(|e| format!("Korrekturversions-Grundlage ergänzen: {e}"))?;
    }
    let abgaben = {
        let mut stmt = conn
            .prepare(
                "SELECT a.id, a.note, a.gesamtstufe, a.datum, a.feedback_json_path FROM abgabe a \
                 WHERE NOT EXISTS (SELECT 1 FROM korrektur_revision r WHERE r.abgabe_id=a.id)",
            )
            .map_err(|e| format!("Korrekturversions-Migration vorbereiten fehlgeschlagen: {e}"))?;
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, Option<f64>>(1)?,
                row.get::<_, Option<f64>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        })
        .map_err(|e| format!("Korrekturversions-Migration lesen fehlgeschlagen: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Korrekturversions-Migration auswerten fehlgeschlagen: {e}"))?;
        rows
    };

    for (abgabe_id, note, gesamtstufe, datum, feedback_json_path) in abgaben {
        let analysis_json = feedback_json_path
            .and_then(|path| std::fs::read_to_string(path).ok())
            .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
            .filter(|value| value.is_object())
            .and_then(|value| serde_json::to_string(&value).ok())
            .unwrap_or_else(|| "{}".to_string());
        conn.execute(
            "INSERT INTO korrektur_revision \
             (abgabe_id, revision_no, provider, model, privacy_mode, status, is_active, \
              note, gesamtstufe, analysis_json, created_at, completed_at) \
             VALUES (?1, 1, 'unbekannt', 'unbekannt', 'unbekannt', 'completed', 1, \
                     ?2, ?3, ?4, COALESCE(?5, CURRENT_TIMESTAMP), COALESCE(?5, CURRENT_TIMESTAMP))",
            rusqlite::params![abgabe_id, note, gesamtstufe, analysis_json, datum],
        )
        .map_err(|e| format!("Korrekturversions-Migration Revision anlegen fehlgeschlagen: {e}"))?;
        let revision_id = conn.last_insert_rowid();

        let kriterien = {
            let mut stmt = conn.prepare(
                "SELECT kriterium_name, stufe, gewichtung FROM kriterium_historie \
                 WHERE abgabe_id=?1 ORDER BY id",
            ).map_err(|e| format!("Korrekturversions-Migration Kriterien vorbereiten fehlgeschlagen: {e}"))?;
            let rows = stmt.query_map([abgabe_id], |row| {
                Ok(serde_json::json!({
                    "kriterium_name": row.get::<_, String>(0)?,
                    "stufe": row.get::<_, Option<f64>>(1)?,
                    "gewichtung": row.get::<_, Option<f64>>(2)?,
                }))
            }).map_err(|e| format!("Korrekturversions-Migration Kriterien lesen fehlgeschlagen: {e}"))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("Korrekturversions-Migration Kriterien auswerten fehlgeschlagen: {e}"))?;
            rows
        };
        let fehler = {
            let mut stmt = conn.prepare(
                "SELECT zitat, korrektur, typ, erklaerung, cluster_id, regel_muster, vertrauensstufe, \
                        lehrkraft_aktion, lehrkraft_korrektur \
                 FROM fehler_historie WHERE abgabe_id=?1 ORDER BY id",
            ).map_err(|e| format!("Korrekturversions-Migration Fehler vorbereiten fehlgeschlagen: {e}"))?;
            let rows = stmt.query_map([abgabe_id], |row| {
                Ok(serde_json::json!({
                    "zitat": row.get::<_, Option<String>>(0)?,
                    "korrektur": row.get::<_, Option<String>>(1)?,
                    "typ": row.get::<_, String>(2)?,
                    "erklaerung": row.get::<_, Option<String>>(3)?,
                    "cluster_id": row.get::<_, Option<String>>(4)?,
                    "regel_muster": row.get::<_, Option<String>>(5)?,
                    "vertrauensstufe": row.get::<_, Option<String>>(6)?,
                    "lehrkraft_aktion": row.get::<_, Option<String>>(7)?,
                    "lehrkraft_korrektur": row.get::<_, Option<String>>(8)?,
                }))
            }).map_err(|e| format!("Korrekturversions-Migration Fehler lesen fehlgeschlagen: {e}"))?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| format!("Korrekturversions-Migration Fehler auswerten fehlgeschlagen: {e}"))?;
            rows
        };
        let feedback = conn.query_row(
            "SELECT note_final, note_app_snapshot, lehrer_kommentar, erstellt_am, geaendert_am \
             FROM lehrer_feedback WHERE abgabe_id=?1",
            [abgabe_id],
            |row| Ok((
                row.get::<_, Option<f64>>(0)?,
                row.get::<_, Option<f64>>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
            )),
        ).optional().map_err(|e| format!("Korrekturversions-Migration Feedback lesen fehlgeschlagen: {e}"))?;
        let (note_final, note_snapshot, kommentar, erstellt, geaendert) =
            feedback.unwrap_or((None, None, None, None, None));
        conn.execute(
            "UPDATE korrektur_revision SET kriterien_json=?1, fehler_json=?2, \
             lehrer_note_final=?3, lehrer_note_app_snapshot=?4, lehrer_kommentar=?5, \
             lehrer_feedback_erstellt_am=?6, lehrer_feedback_geaendert_am=?7 WHERE id=?8",
            rusqlite::params![
                serde_json::to_string(&kriterien).unwrap_or_else(|_| "[]".into()),
                serde_json::to_string(&fehler).unwrap_or_else(|_| "[]".into()),
                note_final, note_snapshot, kommentar, erstellt, geaendert, revision_id,
            ],
        ).map_err(|e| format!("Korrekturversions-Migration sichern fehlgeschlagen: {e}"))?;
    }
    Ok(())
}

/// Ergänzt die optionalen Verknüpfungen einer Abgabe mit einem Unterrichtseinsatz
/// bzw. gespeicherten Material in bereits vorhandenen gemeinsamen Datenbanken.
fn migrate_natascha_abgabe_link_columns(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("PRAGMA table_info(abgabe)")
        .map_err(|e| format!("Abgabe-Link-Migration vorbereiten fehlgeschlagen: {}", e))?;
    let columns: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Abgabe-Link-Migration lesen fehlgeschlagen: {}", e))?
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Abgabe-Link-Migration auswerten fehlgeschlagen: {}", e))?;
    if !columns.contains("korrekturauftrag_id") {
        conn.execute_batch("ALTER TABLE abgabe ADD COLUMN korrekturauftrag_id TEXT;")
            .map_err(|e| format!("Abgabe-Link-Migration Auftrag fehlgeschlagen: {}", e))?;
    }
    if !columns.contains("unterrichtseinsatz_id") {
        conn.execute_batch("ALTER TABLE abgabe ADD COLUMN unterrichtseinsatz_id TEXT;")
            .map_err(|e| format!("Abgabe-Link-Migration Einsatz fehlgeschlagen: {}", e))?;
    }
    if !columns.contains("material_id") {
        conn.execute_batch("ALTER TABLE abgabe ADD COLUMN material_id TEXT;")
            .map_err(|e| format!("Abgabe-Link-Migration Material fehlgeschlagen: {}", e))?;
    }
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

/// Ergänzt das länderspezifische Schulsystem für Closed-Loop-Vorschläge.
/// Bestehende Klassen bleiben ohne explizites Land beim Lehrkraftprofil.
fn migrate_lua_klassen_land(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn
        .prepare("PRAGMA table_info(lua_klassen)")
        .map_err(|e| format!("Klassen-Land-Migration vorbereiten fehlgeschlagen: {e}"))?;
    let columns: std::collections::HashSet<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("Klassen-Land-Migration lesen fehlgeschlagen: {e}"))?
        .collect::<Result<_, _>>()
        .map_err(|e| format!("Klassen-Land-Migration auswerten fehlgeschlagen: {e}"))?;
    if !columns.contains("land") {
        conn.execute_batch("ALTER TABLE lua_klassen ADD COLUMN land TEXT;")
            .map_err(|e| format!("Klassen-Land-Spalte ergänzen fehlgeschlagen: {e}"))?;
    }
    Ok(())
}

pub(crate) fn home_dir() -> Option<PathBuf> {
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
        assert!(columns.contains("land"));

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

    #[test]
    fn natascha_abgabe_link_migration_ergaenzt_alte_datenbank() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE abgabe (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                schueler_id INTEGER,
                klasse TEXT NOT NULL,
                aufgabe TEXT NOT NULL,
                dateiname TEXT NOT NULL,
                datei_hash TEXT UNIQUE NOT NULL,
                datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rohtext TEXT, note REAL, gesamtstufe REAL,
                feedback_json_path TEXT, wortanzahl INTEGER, fach TEXT,
                schulstufe TEXT, textsorte TEXT, rubrik TEXT
            );",
        )
        .unwrap();

        init_schema(&conn).unwrap();

        let columns: std::collections::HashSet<String> = conn
            .prepare("PRAGMA table_info(abgabe)")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert!(columns.contains("unterrichtseinsatz_id"));
        assert!(columns.contains("material_id"));
        assert!(columns.contains("korrekturauftrag_id"));
    }

    #[test]
    fn fehler_cluster_migration_laeuft_vor_dem_cluster_index() {
        let conn = Connection::open_in_memory().unwrap();
        // Bestand vor der Cluster-Erweiterung: Die CREATE-TABLE-Klausel wird
        // bei einer vorhandenen Tabelle von SQLite nicht erneut ausgeführt.
        conn.execute_batch(
            "CREATE TABLE fehler_historie (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                abgabe_id INTEGER,
                zitat TEXT,
                korrektur TEXT,
                typ TEXT NOT NULL,
                erklaerung TEXT,
                vertrauensstufe TEXT,
                lehrkraft_aktion TEXT,
                lehrkraft_korrektur TEXT
            );",
        )
        .unwrap();

        init_schema(&conn).unwrap();

        let columns: std::collections::HashSet<String> = conn
            .prepare("PRAGMA table_info(fehler_historie)")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert!(columns.contains("cluster_id"));
        assert!(columns.contains("regel_muster"));

        let index_exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_fehler_cluster'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(index_exists, 1);
    }

    #[test]
    fn loop_migration_ergaenzt_alte_generated_materials() {
        let conn = Connection::open_in_memory().unwrap();
        // Alte Datenbank ohne Loop-Spalten (Stand vor L1).
        conn.execute_batch(
            "CREATE TABLE generated_materials (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                klasse TEXT,
                aufgabe TEXT,
                snapshot_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                deleted_at TEXT
            );",
        )
        .unwrap();

        init_schema(&conn).unwrap();

        let columns: std::collections::HashSet<String> = conn
            .prepare("PRAGMA table_info(generated_materials)")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(1))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert!(columns.contains("loop_klasse"));
        assert!(columns.contains("loop_aufgabe"));
        assert!(columns.contains("loop_datum"));

        // Upsert mit loopQuelle schreibt die Spalten; ohne Quelle bleiben sie NULL.
        conn.execute(
            "INSERT INTO generated_materials (id, title, klasse, aufgabe, snapshot_json, created_at, updated_at, is_favorite, is_deleted, deleted_at, loop_klasse, loop_aufgabe, loop_datum)
             VALUES ('d1','Übung','6i','SA2','{}','2026-09-23T10:00:00Z','2026-09-23T10:00:00Z',0,0,NULL,'6i','SA2','2026-05-26')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO generated_materials (id, title, klasse, aufgabe, snapshot_json, created_at, updated_at, is_favorite, is_deleted, deleted_at, loop_klasse, loop_aufgabe, loop_datum)
             VALUES ('d2','Manuell',NULL,NULL,'{}','2026-09-23T11:00:00Z','2026-09-23T11:00:00Z',0,0,NULL,NULL,NULL,NULL)",
            [],
        )
        .unwrap();
        let loop_rows: Vec<(String, Option<String>)> = conn
            .prepare("SELECT id, loop_klasse FROM generated_materials ORDER BY id")
            .unwrap()
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(loop_rows[0], ("d1".into(), Some("6i".into())));
        assert_eq!(loop_rows[1], ("d2".into(), None));
    }

    #[test]
    fn bestehende_abgabe_wird_als_aktive_revision_migriert() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys=ON;
             CREATE TABLE abgabe (
                id INTEGER PRIMARY KEY AUTOINCREMENT, schueler_id INTEGER,
                klasse TEXT NOT NULL, aufgabe TEXT NOT NULL, dateiname TEXT NOT NULL,
                datei_hash TEXT UNIQUE NOT NULL, datum TEXT, rohtext TEXT, note REAL,
                gesamtstufe REAL, feedback_json_path TEXT, wortanzahl INTEGER,
                fach TEXT, schulstufe TEXT, textsorte TEXT, rubrik TEXT
             );
             CREATE TABLE kriterium_historie (
                id INTEGER PRIMARY KEY, abgabe_id INTEGER, kriterium_name TEXT,
                stufe REAL, gewichtung REAL
             );
             CREATE TABLE fehler_historie (
                id INTEGER PRIMARY KEY, abgabe_id INTEGER, zitat TEXT, korrektur TEXT,
                typ TEXT NOT NULL, erklaerung TEXT, cluster_id TEXT, regel_muster TEXT, vertrauensstufe TEXT,
                lehrkraft_aktion TEXT, lehrkraft_korrektur TEXT
             );
             CREATE TABLE lehrer_feedback (
                id INTEGER PRIMARY KEY, abgabe_id INTEGER UNIQUE, schueler_id INTEGER,
                klasse TEXT, aufgabe TEXT, note_final REAL, note_app_snapshot REAL,
                lehrer_kommentar TEXT, pdf_pfad TEXT, erstellt_am TEXT, geaendert_am TEXT
             );
             INSERT INTO abgabe (id, klasse, aufgabe, dateiname, datei_hash, datum, note, gesamtstufe)
                VALUES (7, 'TEST-6A', 'Kommentar', 'synthetic.docx', 'synthetic-hash', '2026-09-20', 3, 2.5);
             INSERT INTO kriterium_historie (abgabe_id, kriterium_name, stufe, gewichtung)
                VALUES (7, 'Inhalt', 2.5, 1.0);
             INSERT INTO fehler_historie (abgabe_id, zitat, korrektur, typ)
                VALUES (7, 'synthetic quote', 'synthetic fix', 'G');
             INSERT INTO lehrer_feedback (abgabe_id, klasse, aufgabe, note_final, lehrer_kommentar)
                VALUES (7, 'TEST-6A', 'Kommentar', 2, 'synthetic note');",
        ).unwrap();

        init_schema(&conn).unwrap();
        let revision: (i64, String, String, i64, String, String, Option<String>) = conn.query_row(
            "SELECT revision_no, provider, model, is_active, kriterien_json, fehler_json, lehrer_kommentar \
             FROM korrektur_revision WHERE abgabe_id=7",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?)),
        ).unwrap();
        assert_eq!(revision.0, 1);
        assert_eq!(revision.1, "unbekannt");
        assert_eq!(revision.2, "unbekannt");
        assert_eq!(revision.3, 1);
        assert!(revision.4.contains("Inhalt"));
        assert!(revision.5.contains("synthetic quote"));
        assert_eq!(revision.6.as_deref(), Some("synthetic note"));
    }

    #[test]
    fn einsatz_schema_wird_bei_alter_datenbank_angelegt() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE lua_klassen (
                name TEXT PRIMARY KEY, fach TEXT, stufe TEXT, schulstufe INTEGER,
                schuljahr TEXT, notizen TEXT, archiviert INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        )
        .unwrap();
        init_schema(&conn).unwrap();

        for table in ["unterrichtseinsatz", "einsatz_rueckblick"] {
            let exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    rusqlite::params![table],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(exists, 1, "Tabelle {table} fehlt nach init_schema");
        }
    }
}
