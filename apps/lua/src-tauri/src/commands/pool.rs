use serde::{Deserialize, Serialize};

use super::db::DbState;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PoolEntry {
    pub id: String,
    pub fach: String,
    pub stufe: String,
    pub schulstufe: Option<i32>,
    pub thema: Option<String>,
    pub aufgabentyp: String,
    pub tags: Option<String>,
    pub block_json: String,
    pub quelle_hinweis: Option<String>,
    pub created_at: String,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PoolFilter {
    pub fach: Option<String>,
    pub stufe: Option<String>,
    pub aufgabentyp: Option<String>,
    pub search: Option<String>,
}

#[tauri::command]
pub async fn pool_add(
    state: tauri::State<'_, DbState>,
    entry: PoolEntry,
) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;

    conn.execute(
        "INSERT INTO aufgabe_pool (id, fach, stufe, schulstufe, thema, aufgabentyp, tags, block_json, quelle_hinweis, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            entry.id,
            entry.fach,
            entry.stufe,
            entry.schulstufe,
            entry.thema,
            entry.aufgabentyp,
            entry.tags,
            entry.block_json,
            entry.quelle_hinweis,
            entry.created_at,
        ],
    )
    .map_err(|e| format!("pool_add: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn pool_list(
    state: tauri::State<'_, DbState>,
    filter: Option<PoolFilter>,
) -> Result<Vec<PoolEntry>, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let filter = filter.unwrap_or_default();

    let mut sql = String::from(
        "SELECT id, fach, stufe, schulstufe, thema, aufgabentyp, tags, block_json, quelle_hinweis, created_at
         FROM aufgabe_pool WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref fach) = filter.fach {
        sql.push_str(" AND fach = ?");
        params.push(Box::new(fach.clone()));
    }
    if let Some(ref stufe) = filter.stufe {
        sql.push_str(" AND stufe = ?");
        params.push(Box::new(stufe.clone()));
    }
    if let Some(ref typ) = filter.aufgabentyp {
        sql.push_str(" AND aufgabentyp = ?");
        params.push(Box::new(typ.clone()));
    }
    if let Some(ref search) = filter.search {
        sql.push_str(" AND (thema LIKE ? OR tags LIKE ? OR block_json LIKE ?)");
        let pattern = format!("%{}%", search);
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern));
    }

    sql.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("pool_list prepare: {}", e))?;

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt
        .query_map(params_ref.as_slice(), |row| {
            Ok(PoolEntry {
                id: row.get(0)?,
                fach: row.get(1)?,
                stufe: row.get(2)?,
                schulstufe: row.get(3)?,
                thema: row.get(4)?,
                aufgabentyp: row.get(5)?,
                tags: row.get(6)?,
                block_json: row.get(7)?,
                quelle_hinweis: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("pool_list query: {}", e))?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| format!("pool_list row: {}", e))?);
    }

    Ok(entries)
}

#[tauri::command]
pub async fn pool_get(
    state: tauri::State<'_, DbState>,
    id: String,
) -> Result<Option<PoolEntry>, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let mut stmt = conn
        .prepare(
            "SELECT id, fach, stufe, schulstufe, thema, aufgabentyp, tags, block_json, quelle_hinweis, created_at
             FROM aufgabe_pool WHERE id = ?1",
        )
        .map_err(|e| format!("pool_get prepare: {}", e))?;

    let result = stmt
        .query_row(rusqlite::params![id], |row| {
            Ok(PoolEntry {
                id: row.get(0)?,
                fach: row.get(1)?,
                stufe: row.get(2)?,
                schulstufe: row.get(3)?,
                thema: row.get(4)?,
                aufgabentyp: row.get(5)?,
                tags: row.get(6)?,
                block_json: row.get(7)?,
                quelle_hinweis: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .optional()
        .map_err(|e| format!("pool_get query: {}", e))?;

    Ok(result)
}

#[tauri::command]
pub async fn pool_delete(
    state: tauri::State<'_, DbState>,
    id: String,
) -> Result<bool, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let affected = conn
        .execute("DELETE FROM aufgabe_pool WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("pool_delete: {}", e))?;

    Ok(affected > 0)
}

use rusqlite::OptionalExtension;
