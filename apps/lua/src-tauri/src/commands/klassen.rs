use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::db::DbState;

/// LUA-eigene Klassen-Metadaten. `name` ist bewusst derselbe String wie in den
/// NATASCHA-Tabellen (abgabe.klasse, schueler.klasse) — kein Fremdschlüssel,
/// da diese Tabelle nicht in natascha_schema.sql liegt (Schema-Sync-Wächter
/// prüft nur NATASCHA-Tabellen, siehe lua_schema.sql-Kommentar).
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KlasseMeta {
    pub id: Option<String>,
    pub name: String,
    pub fach: Option<String>,
    pub stufe: Option<String>,
    pub schulstufe: Option<i32>,
    pub schuljahr: Option<String>,
    pub notizen: Option<String>,
    pub archiviert: bool,
    pub created_at: String,
}

#[tauri::command]
pub async fn klassen_meta_list(state: tauri::State<'_, DbState>) -> Result<Vec<KlasseMeta>, String> {
    let guard = state.conn()?;
    klassen_meta_list_impl(&guard)
}

pub(crate) fn klassen_meta_list_impl(conn: &rusqlite::Connection) -> Result<Vec<KlasseMeta>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, fach, stufe, schulstufe, schuljahr, notizen, archiviert, created_at \
             FROM lua_klassen ORDER BY archiviert ASC, name ASC",
        )
        .map_err(|e| format!("klassen_meta_list prepare: {e}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(KlasseMeta {
                id: row.get(0)?,
                name: row.get(1)?,
                fach: row.get(2)?,
                stufe: row.get(3)?,
                schulstufe: row.get(4)?,
                schuljahr: row.get(5)?,
                notizen: row.get(6)?,
                archiviert: row.get::<_, i64>(7)? != 0,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("klassen_meta_list query: {e}"))?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("klassen_meta_list row: {e}"))?);
    }
    Ok(result)
}

/// Legt eine Klasse neu an oder aktualisiert sie (Name ist der Primärschlüssel).
#[tauri::command]
pub async fn klassen_meta_upsert(
    state: tauri::State<'_, DbState>,
    meta: KlasseMeta,
) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    let name = meta.name.trim();
    if name.is_empty() {
        return Err("Klassenname darf nicht leer sein.".to_string());
    }
    let id = meta.id.filter(|id| !id.trim().is_empty()).unwrap_or_else(|| Uuid::new_v4().to_string());
    conn.execute(
        "INSERT INTO lua_klassen (id, name, fach, stufe, schulstufe, schuljahr, notizen, archiviert) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) \
         ON CONFLICT(name) DO UPDATE SET \
           fach=excluded.fach, stufe=excluded.stufe, schulstufe=excluded.schulstufe, \
           schuljahr=excluded.schuljahr, notizen=excluded.notizen, archiviert=excluded.archiviert",
        rusqlite::params![
            id,
            name,
            meta.fach,
            meta.stufe,
            meta.schulstufe,
            meta.schuljahr,
            meta.notizen,
            meta.archiviert as i64,
        ],
    )
    .map_err(|e| format!("klassen_meta_upsert: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn klassen_meta_delete(state: tauri::State<'_, DbState>, name: String) -> Result<(), String> {
    let guard = state.conn()?;
    conn_delete(&guard, &name)
}

fn conn_delete(conn: &rusqlite::Connection, name: &str) -> Result<(), String> {
    conn.execute("DELETE FROM lua_klassen WHERE name=?1", rusqlite::params![name])
        .map_err(|e| format!("klassen_meta_delete: {e}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        conn.execute_batch(crate::db::LUA_SCHEMA_SQL).unwrap();
        conn
    }

    fn beispiel(name: &str) -> KlasseMeta {
        KlasseMeta {
            id: None,
            name: name.to_string(),
            fach: Some("deutsch".to_string()),
            stufe: Some("oberstufe".to_string()),
            schulstufe: Some(7),
            schuljahr: Some("2026/27".to_string()),
            notizen: None,
            archiviert: false,
            created_at: String::new(),
        }
    }

    fn upsert(conn: &Connection, meta: &KlasseMeta) {
        conn.execute(
            "INSERT INTO lua_klassen (id, name, fach, stufe, schulstufe, schuljahr, notizen, archiviert) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) \
             ON CONFLICT(name) DO UPDATE SET \
               fach=excluded.fach, stufe=excluded.stufe, schulstufe=excluded.schulstufe, \
               schuljahr=excluded.schuljahr, notizen=excluded.notizen, archiviert=excluded.archiviert",
            rusqlite::params![uuid::Uuid::new_v4().to_string(), meta.name, meta.fach, meta.stufe, meta.schulstufe, meta.schuljahr, meta.notizen, meta.archiviert as i64],
        ).unwrap();
    }

    #[test]
    fn upsert_dann_list_liefert_klasse() {
        let conn = setup();
        upsert(&conn, &beispiel("7A"));
        let liste = klassen_meta_list_impl(&conn).unwrap();
        assert_eq!(liste.len(), 1);
        assert_eq!(liste[0].name, "7A");
        assert_eq!(liste[0].fach.as_deref(), Some("deutsch"));
        assert_eq!(liste[0].schulstufe, Some(7));
        assert!(liste[0]
            .id
            .as_deref()
            .map(|id| Uuid::parse_str(id).is_ok())
            .unwrap_or(false));
        assert!(!liste[0].archiviert);
    }

    #[test]
    fn upsert_ueberschreibt_statt_zu_duplizieren() {
        let conn = setup();
        upsert(&conn, &beispiel("7A"));
        let mut geaendert = beispiel("7A");
        geaendert.fach = Some("englisch".to_string());
        upsert(&conn, &geaendert);
        let liste = klassen_meta_list_impl(&conn).unwrap();
        assert_eq!(liste.len(), 1);
        assert_eq!(liste[0].fach.as_deref(), Some("englisch"));
    }

    #[test]
    fn archivierte_klassen_stehen_hinten() {
        let conn = setup();
        upsert(&conn, &beispiel("9A"));
        let mut archiviert = beispiel("1A");
        archiviert.archiviert = true;
        upsert(&conn, &archiviert);
        let liste = klassen_meta_list_impl(&conn).unwrap();
        assert_eq!(liste.len(), 2);
        assert_eq!(liste[0].name, "9A");
        assert!(liste[0].name < liste[1].name || liste[1].archiviert);
        assert!(liste[1].archiviert);
    }

    #[test]
    fn delete_entfernt_klasse() {
        let conn = setup();
        upsert(&conn, &beispiel("7A"));
        conn_delete(&conn, "7A").unwrap();
        assert!(klassen_meta_list_impl(&conn).unwrap().is_empty());
    }
}
