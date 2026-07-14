use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::db::DbState;

const EINSATZ_STATUS: &[&str] = &["geplant", "eingesetzt"];
const EINSATZ_ARTEN: &[&str] = &[
    "",
    "verteilt",
    "gemeinsam_bearbeitet",
    "hausuebung",
    "schularbeit",
    "nur_geplant",
];
const RUECKBLICK_STATUS: &[&str] = &["offen", "hilfreich", "anpassen", "nicht_eingesetzt"];

fn now_string() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn validate(value: &str, allowed: &[&str], label: &str) -> Result<String, String> {
    if allowed.contains(&value) {
        Ok(value.to_string())
    } else {
        Err(format!("Ungültiger {label}: {value}"))
    }
}

fn optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim().to_string();
        (!trimmed.is_empty()).then_some(trimmed)
    })
}

#[derive(Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct EinsatzMeta {
    pub id: Option<String>,
    pub material_id: Option<String>,
    pub klasse_id: Option<String>,
    pub klasse_name_snapshot: Option<String>,
    pub titel_snapshot: Option<String>,
    pub status: Option<String>,
    pub einsatz_art: Option<String>,
    pub geplant_am: Option<String>,
    pub eingesetzt_am: Option<String>,
    pub lernziele_snapshot: Option<String>,
    pub notiz: Option<String>,
}

#[derive(Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct EinsatzFilter {
    pub klasse_id: Option<String>,
    pub material_id: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EinsatzRueckblick {
    pub id: String,
    pub einsatz_id: String,
    pub status: String,
    pub notiz: String,
    pub erstellt_am: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EinsatzRecord {
    pub id: String,
    pub material_id: Option<String>,
    pub klasse_id: Option<String>,
    pub klasse_name_snapshot: String,
    pub titel_snapshot: String,
    pub status: String,
    pub einsatz_art: String,
    pub geplant_am: Option<String>,
    pub eingesetzt_am: Option<String>,
    pub lernziele_snapshot: String,
    pub notiz: String,
    pub created_at: String,
    pub updated_at: String,
    pub rueckblick: Option<EinsatzRueckblick>,
}

fn rueckblick_from_row(
    row: &rusqlite::Row<'_>,
    offset: usize,
) -> rusqlite::Result<Option<EinsatzRueckblick>> {
    let id: Option<String> = row.get(offset)?;
    Ok(id.map(|id| EinsatzRueckblick {
        id,
        einsatz_id: row.get(offset + 1).unwrap_or_default(),
        status: row.get(offset + 2).unwrap_or_default(),
        notiz: row.get(offset + 3).unwrap_or_default(),
        erstellt_am: row.get(offset + 4).unwrap_or_default(),
    }))
}

fn record_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<EinsatzRecord> {
    Ok(EinsatzRecord {
        id: row.get(0)?,
        material_id: row.get(1)?,
        klasse_id: row.get(2)?,
        klasse_name_snapshot: row.get(3)?,
        titel_snapshot: row.get(4)?,
        status: row.get(5)?,
        einsatz_art: row.get(6)?,
        geplant_am: row.get(7)?,
        eingesetzt_am: row.get(8)?,
        lernziele_snapshot: row.get(9)?,
        notiz: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
        rueckblick: rueckblick_from_row(row, 13)?,
    })
}

fn einsatz_get_impl(conn: &rusqlite::Connection, id: &str) -> Result<EinsatzRecord, String> {
    conn.query_row(
        "SELECT e.id, e.material_id, e.klasse_id, e.klasse_name_snapshot,
                e.titel_snapshot, e.status, e.einsatz_art, e.geplant_am,
                e.eingesetzt_am, e.lernziele_snapshot, e.notiz, e.created_at,
                e.updated_at, r.id, r.einsatz_id, r.status, r.notiz, r.erstellt_am
         FROM unterrichtseinsatz e
         LEFT JOIN einsatz_rueckblick r ON r.einsatz_id=e.id
         WHERE e.id=?1",
        params![id],
        record_from_row,
    )
    .map_err(|e| format!("einsatz_get: {e}"))
}

pub(crate) fn einsatz_upsert_impl(
    conn: &rusqlite::Connection,
    meta: EinsatzMeta,
) -> Result<EinsatzRecord, String> {
    let id = optional_string(meta.id).unwrap_or_else(|| Uuid::new_v4().to_string());
    let klasse_id = optional_string(meta.klasse_id);
    let klasse_name_snapshot = if let Some(ref klasse_id) = klasse_id {
        conn.query_row(
            "SELECT name FROM lua_klassen WHERE id=?1",
            params![klasse_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| format!("einsatz_upsert Klassen-Snapshot: {e}"))?
        .ok_or_else(|| "Die gewählte Klasse existiert nicht.".to_string())?
    } else {
        meta.klasse_name_snapshot
            .unwrap_or_default()
            .trim()
            .to_string()
    };
    let material_id = optional_string(meta.material_id);
    let titel_snapshot = meta.titel_snapshot.unwrap_or_default().trim().to_string();
    let status = validate(
        meta.status.as_deref().unwrap_or("geplant"),
        EINSATZ_STATUS,
        "Einsatzstatus",
    )?;
    let einsatz_art = validate(
        meta.einsatz_art.as_deref().unwrap_or(""),
        EINSATZ_ARTEN,
        "Einsatzart",
    )?;
    let lernziele_snapshot = meta
        .lernziele_snapshot
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "[]".to_string());
    let lernziele: serde_json::Value = serde_json::from_str(&lernziele_snapshot)
        .map_err(|e| format!("Lernziele müssen ein JSON-Array sein: {e}"))?;
    if !lernziele.is_array() {
        return Err("Lernziele müssen ein JSON-Array sein.".to_string());
    }
    let now = now_string();
    conn.execute(
        "INSERT INTO unterrichtseinsatz
          (id, material_id, klasse_id, klasse_name_snapshot, titel_snapshot,
           status, einsatz_art, geplant_am, eingesetzt_am, lernziele_snapshot,
           notiz, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
         ON CONFLICT(id) DO UPDATE SET
           material_id=excluded.material_id,
           klasse_id=excluded.klasse_id,
           klasse_name_snapshot=excluded.klasse_name_snapshot,
           titel_snapshot=excluded.titel_snapshot,
           status=excluded.status,
           einsatz_art=excluded.einsatz_art,
           geplant_am=excluded.geplant_am,
           eingesetzt_am=excluded.eingesetzt_am,
           lernziele_snapshot=excluded.lernziele_snapshot,
           notiz=excluded.notiz,
           updated_at=excluded.updated_at",
        params![
            id,
            material_id,
            klasse_id,
            klasse_name_snapshot,
            titel_snapshot,
            status,
            einsatz_art,
            optional_string(meta.geplant_am),
            optional_string(meta.eingesetzt_am),
            lernziele_snapshot,
            meta.notiz.unwrap_or_default(),
            now,
        ],
    )
    .map_err(|e| format!("einsatz_upsert: {e}"))?;
    einsatz_get_impl(conn, &id)
}

pub(crate) fn einsatz_list_impl(
    conn: &rusqlite::Connection,
    filter: Option<EinsatzFilter>,
) -> Result<Vec<EinsatzRecord>, String> {
    let mut sql = String::from(
        "SELECT e.id, e.material_id, e.klasse_id, e.klasse_name_snapshot,
                e.titel_snapshot, e.status, e.einsatz_art, e.geplant_am,
                e.eingesetzt_am, e.lernziele_snapshot, e.notiz, e.created_at,
                e.updated_at, r.id, r.einsatz_id, r.status, r.notiz, r.erstellt_am
         FROM unterrichtseinsatz e
         LEFT JOIN einsatz_rueckblick r ON r.einsatz_id=e.id WHERE 1=1",
    );
    let mut values = Vec::new();
    if let Some(filter) = filter {
        if let Some(klasse_id) = optional_string(filter.klasse_id) {
            sql.push_str(" AND e.klasse_id=?");
            values.push(klasse_id);
        }
        if let Some(material_id) = optional_string(filter.material_id) {
            sql.push_str(" AND e.material_id=?");
            values.push(material_id);
        }
    }
    sql.push_str(" ORDER BY e.updated_at DESC, e.created_at DESC");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("einsatz_list prepare: {e}"))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(values), record_from_row)
        .map_err(|e| format!("einsatz_list query: {e}"))?;
    rows.map(|row| row.map_err(|e| format!("einsatz_list row: {e}")))
        .collect()
}

pub(crate) fn einsatz_delete_impl(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM unterrichtseinsatz WHERE id=?1", params![id])
        .map_err(|e| format!("einsatz_delete: {e}"))?;
    Ok(())
}

fn rueckblick_get_impl(
    conn: &rusqlite::Connection,
    einsatz_id: &str,
) -> Result<EinsatzRueckblick, String> {
    conn.query_row(
        "SELECT id, einsatz_id, status, notiz, erstellt_am FROM einsatz_rueckblick WHERE einsatz_id=?1",
        params![einsatz_id],
        |row| {
            Ok(EinsatzRueckblick {
                id: row.get(0)?,
                einsatz_id: row.get(1)?,
                status: row.get(2)?,
                notiz: row.get(3)?,
                erstellt_am: row.get(4)?,
            })
        },
    )
    .map_err(|e| format!("rueckblick_get: {e}"))
}

pub(crate) fn rueckblick_upsert_impl(
    conn: &rusqlite::Connection,
    einsatz_id: &str,
    status: &str,
    notiz: &str,
) -> Result<EinsatzRueckblick, String> {
    validate(status, RUECKBLICK_STATUS, "Rückblickstatus")?;
    let exists: Option<String> = conn
        .query_row(
            "SELECT id FROM unterrichtseinsatz WHERE id=?1",
            params![einsatz_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("rueckblick_upsert Einsatzprüfung: {e}"))?;
    if exists.is_none() {
        return Err("Der Einsatz existiert nicht.".to_string());
    }
    conn.execute(
        "INSERT OR REPLACE INTO einsatz_rueckblick (id, einsatz_id, status, notiz, erstellt_am)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            Uuid::new_v4().to_string(),
            einsatz_id,
            status,
            notiz,
            now_string()
        ],
    )
    .map_err(|e| format!("rueckblick_upsert: {e}"))?;
    rueckblick_get_impl(conn, einsatz_id)
}

#[tauri::command]
pub async fn einsatz_upsert(
    state: tauri::State<'_, DbState>,
    meta: EinsatzMeta,
) -> Result<EinsatzRecord, String> {
    let guard = state.conn()?;
    einsatz_upsert_impl(&guard, meta)
}

#[tauri::command]
pub async fn einsatz_list(
    state: tauri::State<'_, DbState>,
    filter: Option<EinsatzFilter>,
) -> Result<Vec<EinsatzRecord>, String> {
    let guard = state.conn()?;
    einsatz_list_impl(&guard, filter)
}

#[tauri::command]
pub async fn einsatz_delete(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let guard = state.conn()?;
    einsatz_delete_impl(&guard, &id)
}

#[tauri::command]
pub async fn rueckblick_upsert(
    state: tauri::State<'_, DbState>,
    einsatz_id: String,
    status: String,
    notiz: String,
) -> Result<EinsatzRueckblick, String> {
    let guard = state.conn()?;
    rueckblick_upsert_impl(&guard, &einsatz_id, &status, &notiz)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        conn.execute_batch(crate::db::LUA_SCHEMA_SQL).unwrap();
        conn.execute(
            "INSERT INTO lua_klassen (id, name) VALUES ('klasse-uuid', '7A')",
            [],
        )
        .unwrap();
        conn
    }

    fn meta() -> EinsatzMeta {
        EinsatzMeta {
            material_id: Some("material-1".to_string()),
            klasse_id: Some("klasse-uuid".to_string()),
            titel_snapshot: Some("Übung".to_string()),
            einsatz_art: Some("verteilt".to_string()),
            lernziele_snapshot: Some("[\"Argumentieren\"]".to_string()),
            ..Default::default()
        }
    }

    #[test]
    fn crud_roundtrip_mit_filter_und_rueckblick() {
        let conn = setup();
        let einsatz = einsatz_upsert_impl(&conn, meta()).unwrap();
        assert!(Uuid::parse_str(&einsatz.id).is_ok());
        assert_eq!(einsatz.klasse_name_snapshot, "7A");
        assert_eq!(
            einsatz_list_impl(
                &conn,
                Some(EinsatzFilter {
                    klasse_id: Some("klasse-uuid".into()),
                    ..Default::default()
                })
            )
            .unwrap()
            .len(),
            1
        );
        let rueckblick =
            rueckblick_upsert_impl(&conn, &einsatz.id, "hilfreich", "Gut angekommen").unwrap();
        assert_eq!(rueckblick.status, "hilfreich");
        assert!(einsatz_list_impl(&conn, None).unwrap()[0]
            .rueckblick
            .is_some());
        einsatz_delete_impl(&conn, &einsatz.id).unwrap();
        assert!(einsatz_list_impl(&conn, None).unwrap().is_empty());
    }

    #[test]
    fn einsatz_delete_kaskadiert_rueckblick() {
        let conn = setup();
        let einsatz = einsatz_upsert_impl(&conn, meta()).unwrap();
        rueckblick_upsert_impl(&conn, &einsatz.id, "offen", "").unwrap();
        einsatz_delete_impl(&conn, &einsatz.id).unwrap();
        assert_eq!(
            conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM einsatz_rueckblick", [], |row| row
                .get(0))
                .unwrap(),
            0
        );
    }
}
