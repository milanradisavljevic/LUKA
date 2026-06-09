use std::sync::Mutex;

use rusqlite::Connection;
use serde::Serialize;

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
    pub klasse: String,
    pub anzahl_abgaben: i64,
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

    let mut klassen = Vec::new();
    {
        // Klassen aus Abgaben UND Schülern (damit eine neu angelegte Klasse ohne
        // Abgaben trotzdem erscheint). anzahlAbgaben = 0, falls noch keine Abgabe.
        let mut stmt = conn.prepare(
            "SELECT k.klasse, COALESCE(a.cnt, 0) AS cnt \
             FROM (SELECT DISTINCT klasse FROM abgabe UNION SELECT DISTINCT klasse FROM schueler) k \
             LEFT JOIN (SELECT klasse, COUNT(*) AS cnt FROM abgabe GROUP BY klasse) a ON a.klasse = k.klasse \
             ORDER BY k.klasse",
        ).map_err(|e| format!("prepare klassen: {}", e))?;
        let rows = stmt.query_map([], |row| {
            Ok(KlasseInfo {
                klasse: row.get(0)?,
                anzahl_abgaben: row.get(1)?,
            })
        }).map_err(|e| format!("query klassen: {}", e))?;
        for row in rows {
            klassen.push(row.map_err(|e| format!("row klassen: {}", e))?);
        }
    }

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

    conn.execute(
        "INSERT INTO generated_materials (id, title, klasse, aufgabe, snapshot_json, created_at, updated_at, is_favorite, is_deleted, deleted_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
         ON CONFLICT(id) DO UPDATE SET title=?2, klasse=?3, aufgabe=?4, snapshot_json=?5, updated_at=?7, is_favorite=?8, is_deleted=?9, deleted_at=?10",
        rusqlite::params![id, title, klasse, aufgabe, snapshot_json, saved_at, updated_at, is_favorite, is_deleted, deleted_at],
    ).map_err(|e| format!("upsert document: {}", e))?;
    Ok(())
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

fn chrono_now() -> String {
    let now = std::time::SystemTime::now();
    let dur = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{:.0}", dur.as_secs())
}