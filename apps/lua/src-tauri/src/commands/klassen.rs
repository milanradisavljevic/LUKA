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

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KlassenLoeschvorschau {
    pub klasse: String,
    pub schueler: i64,
    pub abgaben: i64,
    pub materialien: i64,
    pub briefings: i64,
    pub quelltexte: i64,
    pub einsaetze: i64,
}

fn normalisiere_klasse(name: &str) -> Result<String, String> {
    let klasse = name.trim();
    if klasse.is_empty() {
        return Err("Klassenname darf nicht leer sein.".to_string());
    }
    Ok(klasse.to_string())
}

fn count_klasse_rows(
    conn: &rusqlite::Connection,
    table: &str,
    klasse: &str,
) -> Result<i64, String> {
    let sql = format!("SELECT COUNT(*) FROM {table} WHERE klasse=?1");
    conn.query_row(&sql, rusqlite::params![klasse], |row| row.get(0))
        .map_err(|e| format!("Klassen-Löschvorschau {table}: {e}"))
}

fn klasse_loeschvorschau_impl(
    conn: &rusqlite::Connection,
    name: &str,
) -> Result<KlassenLoeschvorschau, String> {
    let klasse = normalisiere_klasse(name)?;
    let einsaetze = conn
        .query_row(
            "SELECT COUNT(*) FROM unterrichtseinsatz
             WHERE klasse_name_snapshot=?1
                OR klasse_id=(SELECT id FROM lua_klassen WHERE name=?1)",
            rusqlite::params![klasse],
            |row| row.get(0),
        )
        .map_err(|e| format!("Klassen-Löschvorschau unterrichtseinsatz: {e}"))?;
    Ok(KlassenLoeschvorschau {
        schueler: count_klasse_rows(conn, "schueler", &klasse)?,
        abgaben: count_klasse_rows(conn, "abgabe", &klasse)?,
        materialien: count_klasse_rows(conn, "generated_materials", &klasse)?,
        briefings: count_klasse_rows(conn, "klassen_briefing", &klasse)?,
        quelltexte: count_klasse_rows(conn, "aufgabe_quelltext", &klasse)?,
        einsaetze,
        klasse,
    })
}

/// Liefert vor dem endgültigen Löschen die betroffenen Datensatzmengen.
#[tauri::command]
pub async fn db_klasse_loeschvorschau(
    state: tauri::State<'_, DbState>,
    klasse: String,
) -> Result<KlassenLoeschvorschau, String> {
    let guard = state.conn()?;
    klasse_loeschvorschau_impl(&guard, &klasse)
}

/// Archiviert oder reaktiviert eine Klasse. Bei einer NATASCHA-Klasse ohne
/// bisherige LUA-Metadaten wird der LUA-Datensatz mit stabiler UUID angelegt.
#[tauri::command]
pub async fn db_klasse_archivieren(
    state: tauri::State<'_, DbState>,
    klasse: String,
    archiviert: bool,
) -> Result<(), String> {
    let guard = state.conn()?;
    klasse_archivieren_impl(&guard, &klasse, archiviert)
}

pub(crate) fn klasse_archivieren_impl(
    conn: &rusqlite::Connection,
    name: &str,
    archiviert: bool,
) -> Result<(), String> {
    let klasse = normalisiere_klasse(name)?;
    conn.execute(
        "INSERT INTO lua_klassen (id, name, archiviert) VALUES (?1, ?2, ?3) \
         ON CONFLICT(name) DO UPDATE SET archiviert=excluded.archiviert",
        rusqlite::params![Uuid::new_v4().to_string(), klasse, archiviert as i64],
    ).map_err(|e| format!("db_klasse_archivieren: {e}"))?;
    Ok(())
}

/// Löscht eine Klasse und alle direkt oder über Foreign Keys abhängigen Daten
/// in einer einzigen Transaktion. Globale LUA-Tabellen bleiben unberührt.
#[tauri::command]
pub async fn db_klasse_loeschen(
    state: tauri::State<'_, DbState>,
    klasse: String,
) -> Result<KlassenLoeschvorschau, String> {
    let guard = state.conn()?;
    klasse_loeschen_impl(&guard, &klasse)
}

pub(crate) fn klasse_loeschen_impl(
    conn: &rusqlite::Connection,
    name: &str,
) -> Result<KlassenLoeschvorschau, String> {
    let preview = klasse_loeschvorschau_impl(conn, name)?;
    conn.execute_batch("BEGIN IMMEDIATE;")
        .map_err(|e| format!("Klassenlöschung transaction start: {e}"))?;
    let klasse = preview.klasse.clone();
    let result = (|| -> rusqlite::Result<()> {
        conn.execute("DELETE FROM abgabe WHERE klasse=?1", rusqlite::params![klasse])?;
        conn.execute("DELETE FROM schueler WHERE klasse=?1", rusqlite::params![klasse])?;
        conn.execute("DELETE FROM klassen_briefing WHERE klasse=?1", rusqlite::params![klasse])?;
        conn.execute("DELETE FROM aufgabe_quelltext WHERE klasse=?1", rusqlite::params![klasse])?;
        conn.execute(
            "DELETE FROM einsatz_rueckblick
             WHERE einsatz_id IN (
                 SELECT id FROM unterrichtseinsatz
                 WHERE klasse_name_snapshot=?1
                    OR klasse_id=(SELECT id FROM lua_klassen WHERE name=?1)
             )",
            rusqlite::params![klasse],
        )?;
        conn.execute(
            "DELETE FROM unterrichtseinsatz
             WHERE klasse_name_snapshot=?1
                OR klasse_id=(SELECT id FROM lua_klassen WHERE name=?1)",
            rusqlite::params![klasse],
        )?;
        conn.execute("DELETE FROM generated_materials WHERE klasse=?1", rusqlite::params![klasse])?;
        conn.execute("DELETE FROM lua_klassen WHERE name=?1", rusqlite::params![klasse])?;
        Ok(())
    })();
    if let Err(e) = result {
        let _ = conn.execute_batch("ROLLBACK;");
        return Err(format!("Klassenlöschung: {e}"));
    }
    if let Err(e) = conn.execute_batch("COMMIT;") {
        let _ = conn.execute_batch("ROLLBACK;");
        return Err(format!("Klassenlöschung transaction commit: {e}"));
    }
    Ok(preview)
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

    fn setup_full() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        conn.execute_batch(crate::db::NATASCHA_SCHEMA_SQL).unwrap();
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

    #[test]
    fn archivieren_erzeugt_fehlende_metadaten_und_ist_reversibel() {
        let conn = setup();
        klasse_archivieren_impl(&conn, "7A", true).unwrap();
        let archiviert = klassen_meta_list_impl(&conn).unwrap();
        assert_eq!(archiviert.len(), 1);
        assert!(archiviert[0].archiviert);
        assert!(archiviert[0].id.as_deref().map(|id| Uuid::parse_str(id).is_ok()).unwrap_or(false));

        klasse_archivieren_impl(&conn, "7A", false).unwrap();
        assert!(!klassen_meta_list_impl(&conn).unwrap()[0].archiviert);
    }

    #[test]
    fn klassen_loeschung_vorschau_und_kaskade_lassen_unabhaengige_daten_stehen() {
        let conn = setup_full();
        upsert(&conn, &beispiel("7A"));
        upsert(&conn, &beispiel("8B"));
        conn.execute("INSERT INTO schueler (klasse, vorname) VALUES ('7A', 'Mia')", []).unwrap();
        let s1 = conn.last_insert_rowid();
        conn.execute(
            "INSERT INTO schueler (klasse, vorname) VALUES ('8B', 'Noah')", [],
        ).unwrap();
        conn.execute(
            "INSERT INTO abgabe (schueler_id, klasse, aufgabe, dateiname, datei_hash) VALUES (?1, '7A', 'SA1', 'mia.docx', 'hash-7a')",
            rusqlite::params![s1],
        ).unwrap();
        let abgabe_id = conn.last_insert_rowid();
        conn.execute("INSERT INTO kriterium_historie (abgabe_id, kriterium_name) VALUES (?1, 'Richtigkeit')", rusqlite::params![abgabe_id]).unwrap();
        conn.execute("INSERT INTO fehler_historie (abgabe_id, typ) VALUES (?1, 'G')", rusqlite::params![abgabe_id]).unwrap();
        conn.execute("INSERT INTO lehrer_feedback (abgabe_id, klasse, aufgabe) VALUES (?1, '7A', 'SA1')", rusqlite::params![abgabe_id]).unwrap();
        conn.execute("INSERT INTO schueler_profil (schueler_id, profil_json, basis_anzahl_abgaben) VALUES (?1, '{}', 1)", rusqlite::params![s1]).unwrap();
        conn.execute("INSERT INTO klassen_briefing (klasse, briefing_json, basis_anzahl_abgaben, basis_anzahl_fehler) VALUES ('7A', '{}', 1, 1)", []).unwrap();
        conn.execute("INSERT INTO aufgabe_quelltext (klasse, aufgabe, ausgangstext) VALUES ('7A', 'SA1', 'Text')", []).unwrap();
        conn.execute("INSERT INTO generated_materials (id, title, snapshot_json, created_at, updated_at, klasse) VALUES ('mat-7a', 'Übung', '{}', 'now', 'now', '7A')", []).unwrap();
        conn.execute("INSERT INTO generated_materials (id, title, snapshot_json, created_at, updated_at, klasse) VALUES ('mat-8b', 'Übung', '{}', 'now', 'now', '8B')", []).unwrap();
        conn.execute("INSERT INTO unterrichtseinsatz (id, klasse_id, klasse_name_snapshot, titel_snapshot, created_at, updated_at) VALUES ('einsatz-7a', (SELECT id FROM lua_klassen WHERE name='7A'), '7A', 'Übung', 'now', 'now')", []).unwrap();
        conn.execute("INSERT INTO einsatz_rueckblick (id, einsatz_id, status, erstellt_am) VALUES ('rueckblick-7a', 'einsatz-7a', 'offen', 'now')", []).unwrap();
        conn.execute("INSERT INTO unterrichtseinsatz (id, klasse_name_snapshot, titel_snapshot, created_at, updated_at) VALUES ('einsatz-7a-snapshot', '7A', 'Alte Übung', 'now', 'now')", []).unwrap();

        let preview = klasse_loeschvorschau_impl(&conn, "7A").unwrap();
        assert_eq!(preview.schueler, 1);
        assert_eq!(preview.abgaben, 1);
        assert_eq!(preview.materialien, 1);
        assert_eq!(preview.briefings, 1);
        assert_eq!(preview.quelltexte, 1);
        assert_eq!(preview.einsaetze, 2);

        let report = klasse_loeschen_impl(&conn, "7A").unwrap();
        assert_eq!(report.abgaben, 1);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM schueler WHERE klasse='7A'", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM abgabe WHERE klasse='7A'", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM kriterium_historie", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM fehler_historie", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM lehrer_feedback", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM schueler_profil", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM generated_materials WHERE klasse='7A'", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM generated_materials WHERE klasse='8B'", [], |r| r.get(0)).unwrap(), 1);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM unterrichtseinsatz", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM einsatz_rueckblick", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM lua_klassen WHERE name='7A'", [], |r| r.get(0)).unwrap(), 0);
    }

    #[test]
    fn klassen_loeschung_rollt_bei_fehler_vollstaendig_zurueck() {
        let conn = setup_full();
        upsert(&conn, &beispiel("7A"));
        conn.execute("INSERT INTO generated_materials (id, title, snapshot_json, created_at, updated_at, klasse) VALUES ('mat-7a', 'Übung', '{}', 'now', 'now', '7A')", []).unwrap();
        conn.execute_batch(
            "CREATE TRIGGER block_klasse_material_delete
             BEFORE DELETE ON generated_materials
             WHEN OLD.klasse='7A'
             BEGIN SELECT RAISE(ABORT, 'Testfehler'); END;",
        ).unwrap();

        assert!(klasse_loeschen_impl(&conn, "7A").is_err());
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM lua_klassen WHERE name='7A'", [], |r| r.get(0)).unwrap(), 1);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM generated_materials WHERE klasse='7A'", [], |r| r.get(0)).unwrap(), 1);
    }
}
