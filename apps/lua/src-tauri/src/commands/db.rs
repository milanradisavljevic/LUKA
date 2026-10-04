use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use uuid::Uuid;

use crate::db;

pub struct DbState(pub Mutex<Connection>);

impl DbState {
    pub fn conn(&self) -> Result<std::sync::MutexGuard<'_, Connection>, String> {
        self.0.lock().map_err(|e| format!("DB-Lock: {}", e))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedDocumentRow {
    pub id: String,
    pub title: String,
    pub klasse: String,
    pub aufgabe: String,
    pub snapshot_json: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_favorite: bool,
    pub is_deleted: bool,
    pub deleted_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntryRow {
    pub id: String,
    pub timestamp: String,
    pub thema: String,
    pub fach: String,
    pub stufe: String,
    pub llm_provider: Option<String>,
    pub model_name: Option<String>,
    pub block_count: i64,
    pub total_punkte: i64,
    pub exported_files_json: String,
    pub saved_document_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbLoadAllResult {
    pub documents: Vec<SavedDocumentRow>,
    pub history: Vec<HistoryEntryRow>,
    pub settings_json: String,
    pub templates_json: String,
    pub klassen: Vec<KlasseInfo>,
    pub db_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KlasseInfo {
    pub id: Option<String>,
    pub klasse: String,
    pub anzahl_abgaben: i64,
}

fn load_klassen(conn: &Connection) -> Result<Vec<KlasseInfo>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT k.id, k.klasse, COALESCE(a.cnt, 0) AS cnt \
         FROM ( \
           SELECT id, name AS klasse FROM lua_klassen \
           UNION ALL \
           SELECT NULL AS id, legacy.klasse FROM ( \
             SELECT DISTINCT klasse FROM abgabe \
             UNION SELECT DISTINCT klasse FROM schueler \
           ) legacy \
           WHERE NOT EXISTS (SELECT 1 FROM lua_klassen known WHERE known.name=legacy.klasse COLLATE NOCASE) \
         ) k \
         LEFT JOIN ( \
           SELECT klasse_id AS id, NULL AS legacy_name, COUNT(*) AS cnt FROM abgabe \
             WHERE klasse_id IS NOT NULL GROUP BY klasse_id \
           UNION ALL \
           SELECT NULL AS id, klasse AS legacy_name, COUNT(*) AS cnt FROM abgabe \
             WHERE klasse_id IS NULL GROUP BY klasse \
         ) a ON (k.id IS NOT NULL AND a.id=k.id) \
           OR (k.id IS NULL AND a.id IS NULL AND a.legacy_name=k.klasse) \
         ORDER BY k.klasse, k.id",
        )
        .map_err(|e| format!("prepare klassen: {e}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(KlasseInfo {
                id: row.get(0)?,
                klasse: row.get(1)?,
                anzahl_abgaben: row.get(2)?,
            })
        })
        .map_err(|e| format!("query klassen: {e}"))?;
    rows.map(|row| row.map_err(|e| format!("row klassen: {e}")))
        .collect()
}

#[tauri::command]
pub async fn db_load_all(state: tauri::State<'_, DbState>) -> Result<DbLoadAllResult, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let mut documents = Vec::new();
    {
        let mut stmt = conn.prepare("SELECT id, title, klasse, aufgabe, snapshot_json, created_at, updated_at, is_favorite, is_deleted, deleted_at FROM generated_materials ORDER BY updated_at DESC").map_err(|e| format!("prepare documents: {}", e))?;
        let rows = stmt.query_map([], |row| {
            Ok(SavedDocumentRow {
                id: row.get(0)?,
                title: row.get(1)?,
                klasse: row.get(2)?,
                aufgabe: row.get(3)?,
                snapshot_json: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                is_favorite: row.get::<_, i64>(7)? != 0,
                is_deleted: row.get::<_, i64>(8)? != 0,
                deleted_at: row.get(9)?,
            })
        }).map_err(|e| format!("query documents: {}", e))?;
        for row in rows {
            documents.push(row.map_err(|e| format!("row documents: {}", e))?);
        }
    }

    let mut history = Vec::new();
    {
        let mut stmt = conn.prepare("SELECT id, timestamp, thema, fach, stufe, llm_provider, model_name, block_count, total_punkte, exported_files_json, saved_document_id FROM lua_history ORDER BY timestamp DESC").map_err(|e| format!("prepare history: {}", e))?;
        let rows = stmt.query_map([], |row| {
            Ok(HistoryEntryRow {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                thema: row.get(2)?,
                fach: row.get(3)?,
                stufe: row.get(4)?,
                llm_provider: row.get(5)?,
                model_name: row.get(6)?,
                block_count: row.get(7)?,
                total_punkte: row.get(8)?,
                exported_files_json: row.get(9)?,
                saved_document_id: row.get(10)?,
            })
        }).map_err(|e| format!("query history: {}", e))?;
        for row in rows {
            history.push(row.map_err(|e| format!("row history: {}", e))?);
        }
    }

    let settings_json: String = conn.query_row(
        "SELECT value_json FROM lua_settings WHERE key = 'app'",
        [],
        |row| row.get(0),
    ).unwrap_or_else(|_| "{}".to_string());

    let templates_json = {
        let mut stmt = conn.prepare("SELECT id, name, meta_json, bloecke_json, saved_at FROM lua_templates ORDER BY name").map_err(|e| format!("prepare templates: {}", e))?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let meta_json: String = row.get(2)?;
            let bloecke_json: String = row.get(3)?;
            let saved_at: String = row.get(4)?;
            Ok(serde_json::json!({
                "id": id,
                "name": name,
                "meta": serde_json::from_str::<serde_json::Value>(&meta_json).unwrap_or(serde_json::Value::Null),
                "bloecke": serde_json::from_str::<serde_json::Value>(&bloecke_json).unwrap_or(serde_json::Value::Null),
                "savedAt": saved_at,
            }))
        }).map_err(|e| format!("query templates: {}", e))?;
        let tpl_array: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
        serde_json::to_string(&tpl_array).unwrap_or_else(|_| "[]".to_string())
    };

    // Stable identities keep same-named classes apart. Unlinked historic
    // submissions stay visible only for legacy names without class metadata.
    let klassen = load_klassen(conn)?;

    let db_path = db::resolve_db_path().to_string_lossy().to_string();

    Ok(DbLoadAllResult {
        documents,
        history,
        settings_json,
        templates_json,
        klassen,
        db_path,
    })
}

#[tauri::command]
pub async fn db_upsert_document(state: tauri::State<'_, DbState>, doc_json: String) -> Result<(), String> {
    let doc: serde_json::Value = serde_json::from_str(&doc_json).map_err(|e| format!("JSON-Fehler: {}", e))?;
    let guard = state.conn()?;
    let conn = &*guard;

    let id = doc["id"].as_str().ok_or("id fehlt")?;
    let title = doc["title"].as_str().unwrap_or("Unbenannt");
    let klasse = doc.get("klasse").and_then(|v| v.as_str()).unwrap_or("");
    let aufgabe = doc.get("aufgabe").and_then(|v| v.as_str()).unwrap_or("");
    let snapshot_json = serde_json::to_string(doc.get("snapshot").unwrap_or(&serde_json::Value::Null)).unwrap_or_default();
    let saved_at = doc["savedAt"].as_str().unwrap_or("");
    let updated_at = doc["updatedAt"].as_str().unwrap_or("");
    let is_favorite = doc["isFavorite"].as_bool().unwrap_or(false) as i64;
    let is_deleted = doc["isDeleted"].as_bool().unwrap_or(false) as i64;
    let deleted_at: Option<String> = doc.get("deletedAt").and_then(|v| v.as_str()).map(|s| s.to_string());

    // Closed-Loop-Herkunft (L1) aus snapshot.meta.loopQuelle — Buchhaltung für
    // das Loop-Wirkung-Panel. Leere Strings → NULL (manuell erzeugt).
    let loop_meta = &doc["snapshot"]["meta"]["loopQuelle"];
    let loop_klasse = loop_meta["klasse"].as_str().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let loop_aufgabe = loop_meta["aufgabe"].as_str().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let loop_datum = loop_meta["exportDatum"].as_str().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO generated_materials (id, title, klasse, aufgabe, snapshot_json, created_at, updated_at, is_favorite, is_deleted, deleted_at, loop_klasse, loop_aufgabe, loop_datum)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)
         ON CONFLICT(id) DO UPDATE SET title=?2, klasse=?3, aufgabe=?4, snapshot_json=?5, updated_at=?7, is_favorite=?8, is_deleted=?9, deleted_at=?10, loop_klasse=?11, loop_aufgabe=?12, loop_datum=?13",
        rusqlite::params![id, title, klasse, aufgabe, snapshot_json, saved_at, updated_at, is_favorite, is_deleted, deleted_at, loop_klasse, loop_aufgabe, loop_datum],
    ).map_err(|e| format!("upsert document: {}", e))?;
    Ok(())
}

/// Folgeübungen einer Klasse (Closed-Loop-Herkunft, L1): Grundlage für das
/// Loop-Wirkung-Panel in der Klassenansicht. Neueste zuerst.
#[derive(serde::Serialize)]
pub struct LoopUebungRow {
    pub id: String,
    pub titel: String,
    pub loop_aufgabe: Option<String>,
    pub loop_datum: Option<String>,
    pub created_at: String,
}

#[tauri::command]
pub async fn db_list_loop_uebungen(state: tauri::State<'_, DbState>, klasse: String) -> Result<Vec<LoopUebungRow>, String> {
    let guard = state.conn()?;
    let conn = &*guard;
    let klasse_trimmed = klasse.trim();
    if klasse_trimmed.is_empty() {
        return Ok(Vec::new());
    }
    let mut stmt = conn
        .prepare(
            "SELECT id, title, loop_aufgabe, loop_datum, created_at FROM generated_materials \
             WHERE loop_klasse = ?1 AND is_deleted = 0 ORDER BY created_at DESC",
        )
        .map_err(|e| format!("prepare loop-uebungen: {}", e))?;
    let rows = stmt
        .query_map(rusqlite::params![klasse_trimmed], |row| {
            Ok(LoopUebungRow {
                id: row.get(0)?,
                titel: row.get(1)?,
                loop_aufgabe: row.get(2)?,
                loop_datum: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("query loop-uebungen: {}", e))?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| format!("row loop-uebungen: {}", e))?);
    }
    Ok(out)
}

#[tauri::command]
pub async fn db_delete_document(state: tauri::State<'_, DbState>, id: String, soft: bool) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    if soft {
        let now = chrono_now();
        conn.execute("UPDATE generated_materials SET is_deleted=1, deleted_at=?1, updated_at=?1 WHERE id=?2",
            rusqlite::params![now, id])
            .map_err(|e| format!("soft delete: {}", e))?;
    } else {
        conn.execute("DELETE FROM generated_materials WHERE id=?1", rusqlite::params![id])
            .map_err(|e| format!("hard delete: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn db_restore_document(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    let now = chrono_now();
    conn.execute("UPDATE generated_materials SET is_deleted=0, deleted_at=NULL, updated_at=?1 WHERE id=?2",
        rusqlite::params![now, id])
        .map_err(|e| format!("restore: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn db_purge_deleted(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    conn.execute("DELETE FROM generated_materials WHERE is_deleted=1", [])
        .map_err(|e| format!("purge deleted: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn db_toggle_favorite(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    let now = chrono_now();
    conn.execute("UPDATE generated_materials SET is_favorite = CASE WHEN is_favorite=1 THEN 0 ELSE 1 END, updated_at=?1 WHERE id=?2",
        rusqlite::params![now, id])
        .map_err(|e| format!("toggle favorite: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn db_append_history(state: tauri::State<'_, DbState>, entry_json: String) -> Result<(), String> {
    let e: serde_json::Value = serde_json::from_str(&entry_json).map_err(|e2| format!("JSON: {}", e2))?;
    let guard = state.conn()?;
    let conn = &*guard;
    let id = e["id"].as_str().ok_or("id fehlt")?;
    let timestamp = e["timestamp"].as_str().unwrap_or("");
    let thema = e["thema"].as_str().unwrap_or("");
    let fach = e["fach"].as_str().unwrap_or("");
    let stufe = e["stufe"].as_str().unwrap_or("");
    let llm_provider = e.get("llmProvider").and_then(|v| v.as_str());
    let model_name = e.get("modelName").and_then(|v| v.as_str());
    let block_count: i64 = e["blockCount"].as_i64().unwrap_or(0);
    let total_punkte: i64 = e["totalPunkte"].as_i64().unwrap_or(0);
    let exported_json = serde_json::to_string(e.get("exportedFiles").unwrap_or(&serde_json::Value::Null)).unwrap_or_else(|_| "[]".to_string());
    let saved_document_id = e.get("savedDocumentId").and_then(|v| v.as_str());
    conn.execute(
        "INSERT OR IGNORE INTO lua_history (id, timestamp, thema, fach, stufe, llm_provider, model_name, block_count, total_punkte, exported_files_json, saved_document_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        rusqlite::params![id, timestamp, thema, fach, stufe, llm_provider, model_name, block_count, total_punkte, exported_json, saved_document_id],
    ).map_err(|e2| format!("append history: {}", e2))?;
    Ok(())
}

#[tauri::command]
pub async fn db_clear_history(state: tauri::State<'_, DbState>) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    conn.execute("DELETE FROM lua_history", []).map_err(|e| format!("clear history: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn db_save_settings(state: tauri::State<'_, DbState>, settings_json: String) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    conn.execute(
        "INSERT OR REPLACE INTO lua_settings (key, value_json) VALUES ('app', ?1)",
        rusqlite::params![settings_json],
    ).map_err(|e| format!("save settings: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn db_save_template(state: tauri::State<'_, DbState>, template_json: String) -> Result<(), String> {
    let t: serde_json::Value = serde_json::from_str(&template_json).map_err(|e| format!("JSON: {}", e))?;
    let guard = state.conn()?;
    let conn = &*guard;
    let name = t["name"].as_str().ok_or("name fehlt")?;
    let id = format!("tpl_{}", name.replace(' ', "_"));
    let meta_json = serde_json::to_string(t.get("meta").unwrap_or(&serde_json::Value::Null)).unwrap_or_else(|_| "{}".to_string());
    let bloecke_json = serde_json::to_string(t.get("bloecke").unwrap_or(&serde_json::Value::Null)).unwrap_or_else(|_| "[]".to_string());
    let saved_at = t["savedAt"].as_str().unwrap_or("");
    conn.execute(
        "INSERT OR REPLACE INTO lua_templates (id, name, meta_json, bloecke_json, saved_at) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![id, name, meta_json, bloecke_json, saved_at],
    ).map_err(|e| format!("save template: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn db_delete_template(state: tauri::State<'_, DbState>, name: String) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    let id = format!("tpl_{}", name.replace(' ', "_"));
    conn.execute("DELETE FROM lua_templates WHERE id=?1 OR name=?2", rusqlite::params![id, name])
        .map_err(|e| format!("delete template: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn db_migrate_from_localstorage(state: tauri::State<'_, DbState>, payload_json: String) -> Result<usize, String> {
    let payload: serde_json::Value = serde_json::from_str(&payload_json).map_err(|e| format!("JSON: {}", e))?;
    let guard = state.conn()?;
    let conn = &*guard;
    db::migrate_from_localstorage(conn, &payload)
}

#[tauri::command]
pub async fn db_resolve_path() -> Result<String, String> {
    Ok(db::resolve_db_path().to_string_lossy().to_string())
}

#[tauri::command]
pub async fn db_set_path(state: tauri::State<'_, DbState>, custom_path: String) -> Result<(), String> {
    let p = if custom_path.trim().is_empty() {
        None
    } else {
        Some(std::path::PathBuf::from(custom_path.trim()))
    };
    db::set_db_path(p);
    // Gemanagte Verbindung sofort auf die neue DB umstellen — sonst würde der
    // Pfadwechsel erst nach App-Neustart greifen.
    let new_conn = db::open_db()?;
    let mut guard = state.0.lock().map_err(|e| format!("DB-Lock: {}", e))?;
    *guard = new_conn;
    Ok(())
}

/// Schreibt eine konsistente, geprüfte Sicherungskopie an `target_path`.
#[tauri::command]
pub async fn db_backup(state: tauri::State<'_, DbState>, target_path: String) -> Result<(), String> {
    let target = PathBuf::from(target_path.trim());
    if target.as_os_str().is_empty() {
        return Err("Kein Zielpfad angegeben.".into());
    }
    let current_db = db::resolve_db_path();
    if same_path(&target, &current_db) {
        return Err("Die aktive Datenbank kann nicht als eigene Sicherung verwendet werden.".into());
    }
    if target.exists() {
        return Err("Zieldatei existiert bereits — bitte einen neuen Dateinamen wählen.".into());
    }
    let parent = usable_parent(&target);
    if !parent.exists() || !parent.is_dir() {
        return Err("Der gewählte Sicherungsordner existiert nicht.".into());
    }
    let conn = state.conn()?;
    backup_database(&conn, &target, &current_db)
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now();
    let dur = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{:.0}", dur.as_secs())
}

/// Stellt eine vorher validierte Datenbank wieder her. Vor dem Austausch wird
/// die Quelle in den Arbeitsordner kopiert; so kann ein fehlgeschlagener
/// Austausch jederzeit auf den lokalen Snapshot zurückrollen.
#[tauri::command]
pub async fn db_restore_from_backup(
    state: tauri::State<'_, DbState>,
    backup_path: String,
) -> Result<String, String> {
    let src = PathBuf::from(backup_path.trim());
    restore_database(&state.0, &db::resolve_db_path(), &src)
}

fn validate_luka_database(path: &Path) -> Result<(), String> {
    let mut file = std::fs::File::open(path)
        .map_err(|e| format!("Sicherungsdatei konnte nicht gelesen werden: {}", e))?;
    let mut header = [0u8; 16];
    file.read_exact(&mut header)
        .map_err(|_| "Die Datei ist keine gültige SQLite-Datenbank.".to_string())?;
    if &header != b"SQLite format 3\0" {
        return Err("Die Datei ist keine gültige SQLite-Datenbank.".into());
    }

    let conn = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("Sicherungsdatei konnte nicht geöffnet werden: {}", e))?;
    let integrity: String = conn.query_row("PRAGMA quick_check(1)", [], |row| row.get(0))
        .map_err(|e| format!("SQLite-Prüfung der Sicherung fehlgeschlagen: {}", e))?;
    if integrity != "ok" {
        return Err(format!("Die Datenbankprüfung meldet einen Fehler: {}", integrity));
    }
    let has_luka_tables: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name IN ('aufgabe_pool','generated_materials'))",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("LUKA-Schema der Sicherung konnte nicht gelesen werden: {}", e))?;
    if !has_luka_tables {
        return Err("Die Datei enthält keine LUKA-Datenbank (Tabelle 'aufgabe_pool' oder 'generated_materials' fehlt).".into());
    }
    Ok(())
}

fn backup_database(conn: &Connection, target: &Path, current_db: &Path) -> Result<(), String> {
    if same_path(target, current_db) {
        return Err("Die aktive Datenbank kann nicht als eigene Sicherung verwendet werden.".into());
    }
    if target.exists() {
        return Err("Zieldatei existiert bereits — bitte einen neuen Dateinamen wählen.".into());
    }
    let parent = usable_parent(target);
    if !parent.exists() || !parent.is_dir() {
        return Err("Der gewählte Sicherungsordner existiert nicht.".into());
    }
    let staging = sibling_temp_path(target, "backup")?;
    let result = (|| {
        conn.execute("VACUUM INTO ?1", rusqlite::params![staging.to_string_lossy()])
            .map_err(|e| format!("Backup fehlgeschlagen: {}", e))?;
        validate_luka_database(&staging)
            .map_err(|e| format!("Die erzeugte Sicherung ist nicht gültig: {}", e))?;
        sync_file(&staging)?;
        std::fs::rename(&staging, target)
            .map_err(|e| format!("Sicherung konnte nicht am gewählten Ort gespeichert werden: {}", e))?;
        Ok(())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&staging);
    }
    result
}

fn usable_parent(path: &Path) -> &Path {
    path.parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .unwrap_or_else(|| Path::new("."))
}

fn normalized_for_comparison(path: &Path) -> Option<PathBuf> {
    if path.exists() {
        return std::fs::canonicalize(path).ok();
    }
    let name = path.file_name()?;
    let parent = usable_parent(path);
    let canonical_parent = std::fs::canonicalize(parent).ok()?;
    Some(canonical_parent.join(name))
}

fn same_path(left: &Path, right: &Path) -> bool {
    match (normalized_for_comparison(left), normalized_for_comparison(right)) {
        (Some(left), Some(right)) => left == right,
        _ => left == right,
    }
}

fn sibling_temp_path(target: &Path, kind: &str) -> Result<PathBuf, String> {
    let name = target.file_name().ok_or_else(|| "Ungültiger Dateipfad.".to_string())?;
    Ok(usable_parent(target).join(format!(".{}.{}.{}.tmp", name.to_string_lossy(), kind, Uuid::new_v4())))
}

fn sync_file(path: &Path) -> Result<(), String> {
    std::fs::OpenOptions::new()
        .write(true)
        .open(path)
        .and_then(|file| file.sync_all())
        .map_err(|e| format!("Datei konnte nicht dauerhaft gespeichert werden: {}", e))
}

fn sqlite_sidecar(db_path: &Path, suffix: &str) -> PathBuf {
    PathBuf::from(format!("{}-{}", db_path.to_string_lossy(), suffix))
}

fn validate_and_stage_backup(src: &Path, current_db: &Path) -> Result<PathBuf, String> {
    if !src.exists() {
        return Err("Sicherungsdatei nicht gefunden.".into());
    }
    if !src.is_file() {
        return Err("Der angegebene Pfad ist keine Datei.".into());
    }
    if same_path(src, current_db) {
        return Err("Die ausgewählte Datei ist die aktuell verwendete Datenbank; wähle eine separate Sicherung.".into());
    }
    validate_luka_database(src)?;
    let staged = sibling_temp_path(current_db, "restore")?;
    let stage_result = (|| {
        // Copy through SQLite instead of copying the main file: a valid source
        // may still have committed changes in a sibling WAL file.
        let source = Connection::open_with_flags(src, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|e| format!("Sicherungsdatei konnte nicht geöffnet werden: {}", e))?;
        source.execute("VACUUM INTO ?1", rusqlite::params![staged.to_string_lossy()])
            .map_err(|e| format!("Sicherungsdatei konnte nicht konsistent kopiert werden: {}", e))?;
        validate_luka_database(&staged)?;
        sync_file(&staged)
    })();
    if let Err(error) = stage_result {
        let _ = std::fs::remove_file(&staged);
        return Err(error);
    }
    Ok(staged)
}

fn restore_database(
    conn_mutex: &Mutex<Connection>,
    current_db: &Path,
    src: &Path,
) -> Result<String, String> {
    let staged = validate_and_stage_backup(src, current_db)?;
    let result = restore_staged_database(conn_mutex, current_db, &staged);
    if result.is_err() {
        let _ = std::fs::remove_file(&staged);
    }
    result
}

fn restore_staged_database(
    conn_mutex: &Mutex<Connection>,
    current_db: &Path,
    staged: &Path,
) -> Result<String, String> {
    let mut conn = conn_mutex.lock().map_err(|e| format!("DB-Lock: {}", e))?;
    let snapshot = if current_db.exists() {
        let snapshot = sibling_temp_path(current_db, "pre-restore")?;
        if let Err(error) = conn.execute(
            "VACUUM INTO ?1",
            rusqlite::params![snapshot.to_string_lossy()],
        ) {
            let _ = std::fs::remove_file(&snapshot);
            return Err(format!("Sicherung der aktuellen DB fehlgeschlagen: {}", error));
        }
        if let Err(error) = validate_luka_database(&snapshot) {
            let _ = std::fs::remove_file(&snapshot);
            return Err(format!("Die automatische Rückfallsicherung ist ungültig: {}", error));
        }
        Some(snapshot)
    } else {
        None
    };

    // Keep the mutex locked while the on-disk database is replaced so commands
    // cannot write into the old connection during the brief swap.
    *conn = Connection::open_in_memory()
        .map_err(|e| format!("Temporäre DB-Verbindung konnte nicht erstellt werden: {}", e))?;

    if current_db.exists() {
        let archive = current_db.with_file_name(format!(
            "{}.pre-restore-{}.db",
            current_db.file_stem().unwrap_or_default().to_string_lossy(),
            Uuid::new_v4()
        ));
        if let Err(error) = std::fs::rename(current_db, &archive) {
            return rollback_restore(
                &mut conn,
                current_db,
                snapshot.as_deref(),
                format!("Aktuelle Datenbank konnte nicht archiviert werden: {}", error),
            );
        }
        for suffix in ["wal", "shm"] {
            let live_sidecar = sqlite_sidecar(current_db, suffix);
            if live_sidecar.exists() {
                let archived_sidecar = sqlite_sidecar(&archive, suffix);
                if let Err(error) = std::fs::rename(&live_sidecar, &archived_sidecar) {
                    return rollback_restore(
                        &mut conn,
                        current_db,
                        snapshot.as_deref(),
                        format!("SQLite-Begleitdatei konnte nicht archiviert werden: {}", error),
                    );
                }
            }
        }
    }

    if let Err(error) = std::fs::rename(staged, current_db) {
        return rollback_restore(
            &mut conn,
            current_db,
            snapshot.as_deref(),
            format!("Sicherung konnte nicht aktiviert werden: {}", error),
        );
    }

    match db::open_db_at(current_db) {
        Ok(restored) => {
            *conn = restored;
            if let Some(snapshot) = snapshot {
                let _ = std::fs::remove_file(snapshot);
            }
            Ok(current_db.to_string_lossy().to_string())
        }
        Err(error) => rollback_restore(
            &mut conn,
            current_db,
            snapshot.as_deref(),
            format!("Wiederhergestellte Datenbank konnte nicht geöffnet werden: {}", error),
        ),
    }
}

fn rollback_restore(
    conn: &mut Connection,
    current_db: &Path,
    snapshot: Option<&Path>,
    cause: String,
) -> Result<String, String> {
    let recovery = if let Some(snapshot) = snapshot {
        restore_snapshot_file(snapshot, current_db)
    } else {
        remove_db_file_and_sidecars(current_db)
    }
    .and_then(|_| db::open_db_at(current_db));

    match recovery {
        Ok(previous) => {
            *conn = previous;
            Err(format!("{}. Die vorherige Datenbank wurde wiederhergestellt.", cause))
        }
        Err(recovery_error) => Err(format!(
            "{}. Die automatische Wiederherstellung der vorherigen Datenbank schlug ebenfalls fehl: {}. Die Sicherungskopie bleibt im Arbeitsordner erhalten.",
            cause, recovery_error
        )),
    }
}

fn remove_db_file_and_sidecars(db_path: &Path) -> Result<(), String> {
    for path in [db_path.to_path_buf(), sqlite_sidecar(db_path, "wal"), sqlite_sidecar(db_path, "shm")] {
        if path.exists() {
            std::fs::remove_file(&path)
                .map_err(|e| format!("Temporäre Datenbankdatei konnte nicht entfernt werden: {}", e))?;
        }
    }
    Ok(())
}

fn restore_snapshot_file(snapshot: &Path, current_db: &Path) -> Result<(), String> {
    validate_luka_database(snapshot)?;
    let staged = sibling_temp_path(current_db, "rollback")?;
    let result = (|| {
        std::fs::copy(snapshot, &staged)
            .map_err(|e| format!("Vorherige Datenbank konnte nicht zurückkopiert werden: {}", e))?;
        sync_file(&staged)?;
        remove_db_file_and_sidecars(current_db)?;
        std::fs::rename(&staged, current_db)
            .map_err(|e| format!("Vorherige Datenbank konnte nicht aktiviert werden: {}", e))
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(staged);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::load_klassen;
    use rusqlite::Connection;

    #[test]
    fn klassenliste_trennt_gleichnamige_jahre_und_zaehlt_legacy_namen_nur_eindeutig() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE lua_klassen (id TEXT PRIMARY KEY, name TEXT NOT NULL);
             CREATE TABLE abgabe (klasse TEXT NOT NULL, klasse_id TEXT);
             CREATE TABLE schueler (klasse TEXT NOT NULL, klasse_id TEXT);
             INSERT INTO lua_klassen (id,name) VALUES ('jahr-alt','7A'),('jahr-neu','7A');
             INSERT INTO abgabe (klasse,klasse_id) VALUES
               ('7A','jahr-alt'),('7A Alt','jahr-alt'),('7A','jahr-neu'),('7A','jahr-neu'),
               ('7A',NULL),('7a',NULL),('8B',NULL);
             INSERT INTO schueler (klasse,klasse_id) VALUES ('9C',NULL);",
        ).unwrap();

        let klassen = load_klassen(&conn).unwrap();
        let alt = klassen
            .iter()
            .find(|klasse| klasse.id.as_deref() == Some("jahr-alt"))
            .unwrap();
        let neu = klassen
            .iter()
            .find(|klasse| klasse.id.as_deref() == Some("jahr-neu"))
            .unwrap();
        let legacy = klassen
            .iter()
            .find(|klasse| klasse.id.is_none() && klasse.klasse == "8B")
            .unwrap();
        let ohne_abgaben = klassen
            .iter()
            .find(|klasse| klasse.id.is_none() && klasse.klasse == "9C")
            .unwrap();

        assert_eq!(alt.anzahl_abgaben, 2);
        assert_eq!(neu.anzahl_abgaben, 2);
        assert_eq!(legacy.anzahl_abgaben, 1);
        assert_eq!(ohne_abgaben.anzahl_abgaben, 0);
        // Nicht verknüpfte 7A-Abgaben sind mehrdeutig und dürfen nicht beiden
        // Schuljahren als vermeintlich eigene Ergebnisse zugeschlagen werden.
        assert_eq!(
            klassen
                .iter()
                .filter(|klasse| klasse.klasse == "7A")
                .count(),
            2
        );
        assert!(!klassen.iter().any(|klasse| {
            klasse.id.is_none() && klasse.klasse.eq_ignore_ascii_case("7A")
        }));
    }
}

#[cfg(test)]
mod backup_restore_tests {
    use super::*;

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!("luka-db-safety-{}", Uuid::new_v4()));
            std::fs::create_dir_all(&path).unwrap();
            Self(path)
        }

        fn file(&self, name: &str) -> PathBuf {
            self.0.join(name)
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn db_with_marker(path: &Path, marker: &str) -> Connection {
        let conn = db::open_db_at(path).unwrap();
        conn.execute_batch("CREATE TABLE IF NOT EXISTS safety_probe (value TEXT NOT NULL);").unwrap();
        conn.execute("DELETE FROM safety_probe", []).unwrap();
        conn.execute("INSERT INTO safety_probe(value) VALUES (?1)", [marker]).unwrap();
        conn
    }

    fn read_marker(conn: &Connection) -> String {
        conn.query_row("SELECT value FROM safety_probe LIMIT 1", [], |row| row.get(0)).unwrap()
    }

    #[test]
    fn backup_is_valid_and_does_not_overwrite_existing_file() {
        let dir = TestDirectory::new();
        let current = dir.file("lehr-suite.db");
        let target = dir.file("lehr-suite-backup.db");
        let conn = db_with_marker(&current, "live");

        backup_database(&conn, &target, &current).unwrap();
        validate_luka_database(&target).unwrap();
        let copy = db::open_db_at(&target).unwrap();
        assert_eq!(read_marker(&copy), "live");

        let error = backup_database(&conn, &target, &current).unwrap_err();
        assert!(error.contains("existiert bereits"));
        assert_eq!(read_marker(&conn), "live");
    }

    #[test]
    fn restore_rejects_the_active_database_without_closing_it() {
        let dir = TestDirectory::new();
        let current = dir.file("lehr-suite.db");
        let conn = db_with_marker(&current, "live");
        let state = Mutex::new(conn);

        let error = restore_database(&state, &current, &current).unwrap_err();
        assert!(error.contains("aktuell verwendete Datenbank"));
        assert!(current.exists());
        assert_eq!(read_marker(&state.lock().unwrap()), "live");
    }

    #[test]
    fn restore_replaces_data_and_keeps_a_reopenable_database() {
        let dir = TestDirectory::new();
        let current = dir.file("lehr-suite.db");
        let backup = dir.file("separate-backup.db");
        drop(db_with_marker(&current, "old"));
        let backup_conn = db_with_marker(&backup, "restored");
        let state = Mutex::new(db::open_db_at(&current).unwrap());

        let opened_path = restore_database(&state, &current, &backup).unwrap();
        assert_eq!(PathBuf::from(opened_path), current);
        assert_eq!(read_marker(&state.lock().unwrap()), "restored");
        drop(backup_conn);
        drop(state);

        let reopened = db::open_db_at(&current).unwrap();
        assert_eq!(read_marker(&reopened), "restored");
        assert!(std::fs::read_dir(&dir.0).unwrap().any(|entry| {
            entry.unwrap().file_name().to_string_lossy().contains("pre-restore")
        }));
    }

    #[test]
    fn invalid_backup_leaves_current_database_and_connection_untouched() {
        let dir = TestDirectory::new();
        let current = dir.file("lehr-suite.db");
        let invalid = dir.file("not-a-database.db");
        std::fs::write(&invalid, b"not an SQLite database").unwrap();
        let state = Mutex::new(db_with_marker(&current, "live"));

        let error = restore_database(&state, &current, &invalid).unwrap_err();
        assert!(error.contains("gültige SQLite-Datenbank"));
        assert!(current.exists());
        assert_eq!(read_marker(&state.lock().unwrap()), "live");
        assert!(!std::fs::read_dir(&dir.0).unwrap().any(|entry| {
            entry.unwrap().file_name().to_string_lossy().contains("pre-restore")
        }));
    }

    #[test]
    fn rollback_reinstalls_the_previous_database_after_a_failed_swap() {
        let dir = TestDirectory::new();
        let current = dir.file("lehr-suite.db");
        let snapshot = dir.file("pre-restore.db");
        drop(db_with_marker(&snapshot, "previous"));
        std::fs::write(&current, b"incomplete restored database").unwrap();
        let mut connection = Connection::open_in_memory().unwrap();

        let error = rollback_restore(
            &mut connection,
            &current,
            Some(&snapshot),
            "Simulierter Austauschfehler".into(),
        ).unwrap_err();
        assert!(error.contains("vorherige Datenbank wurde wiederhergestellt"));
        assert_eq!(read_marker(&connection), "previous");
        validate_luka_database(&current).unwrap();
    }
}
