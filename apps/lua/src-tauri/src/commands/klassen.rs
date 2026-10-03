use serde::{Deserialize, Serialize};
use rusqlite::OptionalExtension;
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
    pub land: Option<String>,
    pub stufe: Option<String>,
    pub schulstufe: Option<i32>,
    pub schuljahr: Option<String>,
    pub notizen: Option<String>,
    /// Farbslot 1..8 im Stundenplan. NULL = noch nicht zugewiesen, dann
    /// vergibt die Oberfläche den naechsten freien Slot.
    pub farbe: Option<String>,
    pub archiviert: bool,
    pub pruefung_noetig: bool,
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
            "SELECT k.id, k.name, k.fach, k.land, k.stufe, k.schulstufe, k.schuljahr, k.notizen, \
                    k.archiviert, k.created_at, k.farbe, COALESCE(s.pruefung_noetig,0) \
             FROM lua_klassen k LEFT JOIN klasse_stammdaten s ON s.id=k.id \
             ORDER BY k.archiviert ASC, k.name ASC, k.schuljahr ASC, k.fach ASC",
        )
        .map_err(|e| format!("klassen_meta_list prepare: {e}"))?;
    let rows = stmt
        .query_map([], |row| {
            Ok(KlasseMeta {
                id: row.get(0)?,
                name: row.get(1)?,
                fach: row.get(2)?,
                land: row.get(3)?,
                stufe: row.get(4)?,
                schulstufe: row.get(5)?,
                schuljahr: row.get(6)?,
                notizen: row.get(7)?,
                archiviert: row.get::<_, i64>(8)? != 0,
                created_at: row.get(9)?,
                farbe: row.get(10)?,
                pruefung_noetig: row.get::<_, i64>(11)? != 0,
            })
        })
        .map_err(|e| format!("klassen_meta_list query: {e}"))?;
    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("klassen_meta_list row: {e}"))?);
    }
    Ok(result)
}

/// Legt eine Klassenidentität neu an oder aktualisiert sie. Der Anzeigename ist
/// absichtlich kein Schlüssel: gleiche Namen können in anderen Jahren/Kursen vorkommen.
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
    let land_ungueltig = meta
        .land
        .as_deref()
        .is_some_and(|land| !["AT", "DE", "CH"].contains(&land));
    if land_ungueltig {
        return Err("Land muss AT, DE oder CH sein.".to_string());
    }
    // Slot 1..8, sonst "keine". Abgelehnt wird ein Zahlendreher wie 13, damit
    // nie ein Slot entsteht, den es im Stylesheet nicht gibt.
    let farbe = match meta.farbe.as_deref().map(str::trim) {
        None | Some("") => None,
        Some(wert) => match wert.parse::<u32>() {
            Ok(slot) if (1..=8).contains(&slot) => Some(slot.to_string()),
            _ => return Err("Farbe muss ein Slot 1 bis 8 sein.".to_string()),
        },
    };
    let id = if let Some(id) = meta.id.filter(|id| !id.trim().is_empty()) {
        id
    } else if let Some(id) = conn.query_row(
        "SELECT id FROM lua_klassen WHERE name=?1 COLLATE NOCASE \
         AND COALESCE(fach,'')=COALESCE(?2,'') AND COALESCE(schuljahr,'')=COALESCE(?3,'') LIMIT 1",
        rusqlite::params![name, meta.fach, meta.schuljahr], |row| row.get::<_, String>(0),
    ).optional().map_err(|e| format!("Klassenidentität suchen: {e}"))? {
        id
    } else {
        Uuid::new_v4().to_string()
    };
    let old_name: Option<String> = conn.query_row("SELECT name FROM klasse_stammdaten WHERE id=?1", [&id], |row| row.get(0))
        .optional().map_err(|e| format!("Bisherigen Klassennamen lesen: {e}"))?;
    conn.execute(
        "INSERT INTO lua_klassen (id, name, fach, land, stufe, schulstufe, schuljahr, notizen, archiviert, farbe) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) \
         ON CONFLICT(id) DO UPDATE SET name=excluded.name, fach=excluded.fach, land=excluded.land, \
           stufe=excluded.stufe, schulstufe=excluded.schulstufe, schuljahr=excluded.schuljahr, \
           notizen=excluded.notizen, archiviert=excluded.archiviert, farbe=excluded.farbe",
        rusqlite::params![
            id,
            name,
            meta.fach,
            meta.land,
            meta.stufe,
            meta.schulstufe,
            meta.schuljahr,
            meta.notizen,
            meta.archiviert as i64,
            farbe,
        ],
    )
    .map_err(|e| format!("klassen_meta_upsert: {e}"))?;
    conn.execute(
        "INSERT INTO klasse_stammdaten (id,name,fach,schuljahr,archiviert,pruefung_noetig) \
         VALUES (?1,?2,?3,?4,?5,0) ON CONFLICT(id) DO UPDATE SET \
         name=excluded.name,fach=excluded.fach,schuljahr=excluded.schuljahr,archiviert=excluded.archiviert, \
         pruefung_noetig=CASE WHEN excluded.schuljahr IS NOT NULL AND trim(excluded.schuljahr)<>'' THEN 0 ELSE klasse_stammdaten.pruefung_noetig END",
        rusqlite::params![id, name, meta.fach, meta.schuljahr, meta.archiviert as i64],
    ).map_err(|e| format!("Klassenstamm speichern: {e}"))?;
    if old_name.as_deref().is_some_and(|old| old != name) {
        conn.execute("UPDATE schueler SET klasse=?1 WHERE klasse_id=?2", rusqlite::params![name, id])
            .map_err(|e| format!("Schülernamen nach Klassenänderung aktualisieren: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn klassen_meta_delete(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let guard = state.conn()?;
    conn_delete(&guard, &id)
}

fn conn_delete(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM lua_klassen WHERE id=?1", rusqlite::params![id])
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
    let identitaeten: i64 = conn.query_row(
        "SELECT COUNT(*) FROM klasse_stammdaten WHERE name=?1 COLLATE NOCASE",
        rusqlite::params![klasse],
        |row| row.get(0),
    ).map_err(|e| format!("Klassenidentitäten vor Löschung zählen: {e}"))?;
    if identitaeten > 1 {
        return Err("Gleichnamige Klassen lassen sich nicht über den Anzeigenamen löschen. Bitte archiviere die gewünschte Klasse.".to_string());
    }
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
    klasse_id: Option<String>,
    archiviert: bool,
) -> Result<(), String> {
    let guard = state.conn()?;
    let id = klasse_id.unwrap_or_else(|| klasse.clone());
    klasse_archivieren_impl(&guard, &id, archiviert)
}

pub(crate) fn klasse_archivieren_impl(
    conn: &rusqlite::Connection,
    id: &str,
    archiviert: bool,
) -> Result<(), String> {
    conn.execute("UPDATE lua_klassen SET archiviert=?1 WHERE id=?2", rusqlite::params![archiviert as i64, id])
        .map_err(|e| format!("db_klasse_archivieren: {e}"))?;
    conn.execute("UPDATE klasse_stammdaten SET archiviert=?1 WHERE id=?2", rusqlite::params![archiviert as i64, id])
        .map_err(|e| format!("db_klasse_archivieren Stamm: {e}"))?;
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
    let klasse_id: Option<String> = conn.query_row(
        "SELECT id FROM klasse_stammdaten WHERE name=?1 COLLATE NOCASE",
        rusqlite::params![preview.klasse],
        |row| row.get(0),
    ).optional().map_err(|e| format!("Klassenidentität vor Löschung laden: {e}"))?;
    conn.execute_batch("BEGIN IMMEDIATE;")
        .map_err(|e| format!("Klassenlöschung transaction start: {e}"))?;
    let klasse = preview.klasse.clone();
    let result = (|| -> rusqlite::Result<()> {
        if let Some(ref id) = klasse_id {
            // Bei Mehrfachzuordnung den Schülerbestand an eine verbleibende
            // Klasse hängen, bevor die ausgewählte Mitgliedschaft entfernt wird.
            conn.execute(
                "UPDATE schueler SET \
                   klasse_id=(SELECT sk.klasse_id FROM schueler_klassen sk JOIN klasse_stammdaten k ON k.id=sk.klasse_id \
                     WHERE sk.schueler_id=schueler.id AND sk.klasse_id<>?1 AND sk.status='aktiv' ORDER BY sk.zugeordnet_am LIMIT 1), \
                   klasse=(SELECT k.name FROM schueler_klassen sk JOIN klasse_stammdaten k ON k.id=sk.klasse_id \
                     WHERE sk.schueler_id=schueler.id AND sk.klasse_id<>?1 AND sk.status='aktiv' ORDER BY sk.zugeordnet_am LIMIT 1) \
                 WHERE schueler.klasse_id=?1 AND EXISTS (SELECT 1 FROM schueler_klassen sk \
                   WHERE sk.schueler_id=schueler.id AND sk.klasse_id<>?1 AND sk.status='aktiv')",
                rusqlite::params![id],
            )?;
            conn.execute("DELETE FROM schueler_klassen WHERE klasse_id=?1", rusqlite::params![id])?;
            conn.execute(
                "DELETE FROM schueler WHERE klasse=?1 COLLATE NOCASE AND NOT EXISTS \
                   (SELECT 1 FROM schueler_klassen sk WHERE sk.schueler_id=schueler.id AND sk.status='aktiv')",
                rusqlite::params![klasse],
            )?;
            conn.execute("DELETE FROM lernziel_fokus WHERE klasse_id=?1", rusqlite::params![id])?;
            conn.execute("DELETE FROM abgabe WHERE klasse_id=?1 OR klasse=?2 COLLATE NOCASE", rusqlite::params![id, klasse])?;
        } else {
            conn.execute("DELETE FROM abgabe WHERE klasse=?1", rusqlite::params![klasse])?;
            conn.execute("DELETE FROM schueler WHERE klasse=?1", rusqlite::params![klasse])?;
        }
        conn.execute("DELETE FROM klassen_briefing WHERE klasse=?1", rusqlite::params![klasse])?;
        conn.execute("DELETE FROM aufgabe_quelltext WHERE klasse=?1", rusqlite::params![klasse])?;
        // Planung: Anlagen zuerst, dann die Stunden – der Fremdschlüssel
        // würde das zwar auch erledigen, aber diese Löschung ist überall
        // ausdrücklich geschrieben, und „nicht darauf vertrauen" ist hier billig.
        conn.execute(
            "DELETE FROM stundenmaterial
             WHERE einsatz_id IN (
                 SELECT id FROM unterrichtseinsatz
                 WHERE klasse_name_snapshot=?1
                    OR klasse_id=(SELECT id FROM lua_klassen WHERE name=?1)
             )",
            rusqlite::params![klasse],
        )?;
        conn.execute(
            "DELETE FROM stundenraster
             WHERE klasse_name_snapshot=?1
                OR klasse_id=(SELECT id FROM lua_klassen WHERE name=?1)",
            rusqlite::params![klasse],
        )?;
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
        if let Some(ref id) = klasse_id {
            conn.execute("DELETE FROM klasse_stammdaten WHERE id=?1", rusqlite::params![id])?;
            conn.execute("DELETE FROM lua_klassen WHERE id=?1", rusqlite::params![id])?;
        } else {
            conn.execute("DELETE FROM lua_klassen WHERE name=?1", rusqlite::params![klasse])?;
        }
        conn.execute("DELETE FROM legacy_klasse_pruefung WHERE legacy_name=?1 COLLATE NOCASE", rusqlite::params![klasse])?;
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
        conn.execute_batch(crate::db::NATASCHA_SCHEMA_SQL).unwrap();
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
            land: Some("AT".to_string()),
            stufe: Some("oberstufe".to_string()),
            schulstufe: Some(7),
            schuljahr: Some("2026/27".to_string()),
            notizen: None,
            farbe: None,
            archiviert: false,
            pruefung_noetig: false,
            created_at: String::new(),
        }
    }

    fn upsert(conn: &Connection, meta: &KlasseMeta) {
        let id = meta.id.clone().or_else(|| conn.query_row(
            "SELECT id FROM lua_klassen WHERE name=?1 COLLATE NOCASE AND COALESCE(fach,'')=COALESCE(?2,'') AND COALESCE(schuljahr,'')=COALESCE(?3,'')",
            rusqlite::params![meta.name, meta.fach, meta.schuljahr], |r| r.get(0),
        ).optional().ok().flatten()).unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        conn.execute(
            "INSERT INTO lua_klassen (id, name, fach, land, stufe, schulstufe, schuljahr, notizen, archiviert, farbe) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) \
             ON CONFLICT(id) DO UPDATE SET \
               name=excluded.name, fach=excluded.fach, land=excluded.land, stufe=excluded.stufe, schulstufe=excluded.schulstufe, \
               schuljahr=excluded.schuljahr, notizen=excluded.notizen, archiviert=excluded.archiviert, \
               farbe=excluded.farbe",
            rusqlite::params![id, meta.name, meta.fach, meta.land, meta.stufe, meta.schulstufe, meta.schuljahr, meta.notizen, meta.archiviert as i64, meta.farbe],
        ).unwrap();
        conn.execute("INSERT INTO klasse_stammdaten (id,name,fach,schuljahr,archiviert) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET name=excluded.name,fach=excluded.fach,schuljahr=excluded.schuljahr,archiviert=excluded.archiviert",
            rusqlite::params![id, meta.name, meta.fach, meta.schuljahr, meta.archiviert as i64]).unwrap();
    }

    #[test]
    fn upsert_dann_list_liefert_klasse() {
        let conn = setup();
        upsert(&conn, &beispiel("7A"));
        let liste = klassen_meta_list_impl(&conn).unwrap();
        assert_eq!(liste.len(), 1);
        assert_eq!(liste[0].name, "7A");
        assert_eq!(liste[0].fach.as_deref(), Some("deutsch"));
        assert_eq!(liste[0].land.as_deref(), Some("AT"));
        assert_eq!(liste[0].schulstufe, Some(7));
        assert!(liste[0]
            .id
            .as_deref()
            .map(|id| Uuid::parse_str(id).is_ok())
            .unwrap_or(false));
        assert!(!liste[0].archiviert);
    }

    #[test]
    fn gleicher_name_in_anderen_fachkontexten_bleibt_eigene_identitaet() {
        let conn = setup();
        upsert(&conn, &beispiel("7A"));
        let mut geaendert = beispiel("7A");
        geaendert.fach = Some("englisch".to_string());
        geaendert.land = Some("DE".to_string());
        upsert(&conn, &geaendert);
        let liste = klassen_meta_list_impl(&conn).unwrap();
        assert_eq!(liste.len(), 2);
        assert!(liste.iter().any(|k| k.fach.as_deref() == Some("deutsch")));
        assert!(liste.iter().any(|k| k.fach.as_deref() == Some("englisch")));
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
        let id = klassen_meta_list_impl(&conn).unwrap()[0].id.clone().unwrap();
        conn_delete(&conn, &id).unwrap();
        assert!(klassen_meta_list_impl(&conn).unwrap().is_empty());
    }

    #[test]
    fn archivieren_erzeugt_fehlende_metadaten_und_ist_reversibel() {
        let conn = setup();
        upsert(&conn, &beispiel("7A"));
        let id = klassen_meta_list_impl(&conn).unwrap()[0].id.clone().unwrap();
        klasse_archivieren_impl(&conn, &id, true).unwrap();
        let archiviert = klassen_meta_list_impl(&conn).unwrap();
        assert_eq!(archiviert.len(), 1);
        assert!(archiviert[0].archiviert);
        assert!(archiviert[0].id.as_deref().map(|id| Uuid::parse_str(id).is_ok()).unwrap_or(false));

        klasse_archivieren_impl(&conn, &id, false).unwrap();
        assert!(!klassen_meta_list_impl(&conn).unwrap()[0].archiviert);
    }

    #[test]
    fn gleichnamige_kurse_und_historische_abgabe_bleiben_beim_archivieren_getrennt() {
        let conn = setup_full();
        let mut previous_year = beispiel("7A");
        previous_year.schuljahr = Some("2025/26".to_string());
        upsert(&conn, &previous_year);
        let previous_id: String = conn.query_row(
            "SELECT id FROM lua_klassen WHERE name='7A' AND schuljahr='2025/26'",
            [], |row| row.get(0),
        ).unwrap();

        let current_year = beispiel("7A");
        upsert(&conn, &current_year);
        let current_id: String = conn.query_row(
            "SELECT id FROM lua_klassen WHERE name='7A' AND schuljahr='2026/27'",
            [], |row| row.get(0),
        ).unwrap();
        assert_ne!(previous_id, current_id);

        let student_id = crate::commands::natascha_read::insert_schueler_with_class_id_impl(
            &conn, "7A", "Mia", Some("Beispiel"), Some(&previous_id),
        ).unwrap();
        crate::commands::natascha_read::conn_assign_schueler_klasse(
            &conn, student_id, &current_id,
        ).unwrap();
        let student_memberships: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schueler_klassen WHERE schueler_id=?1 AND status='aktiv'",
            [student_id], |row| row.get(0),
        ).unwrap();
        assert_eq!(student_memberships, 2);
        for class_id in [&previous_id, &current_id] {
            let students = crate::commands::natascha_read::list_schueler_by_class_id_impl(&conn, class_id).unwrap();
            assert_eq!(students.len(), 1);
            assert_eq!(students[0].id, student_id);
            assert!(!students[0].zuordnung_pruefen);
        }

        conn.execute(
            "INSERT INTO abgabe (schueler_id, klasse, klasse_id, aufgabe, dateiname, datei_hash) \
             VALUES (?1, '7A', ?2, 'SA1', 'mia.docx', 'history-7a')",
            rusqlite::params![student_id, previous_id],
        ).unwrap();

        let mut renamed_previous_year = previous_year;
        renamed_previous_year.id = Some(previous_id.clone());
        renamed_previous_year.name = "7A Alt".to_string();
        upsert(&conn, &renamed_previous_year);
        klasse_archivieren_impl(&conn, &previous_id, true).unwrap();

        let old_class = klassen_meta_list_impl(&conn).unwrap().into_iter()
            .find(|class| class.id.as_deref() == Some(previous_id.as_str())).unwrap();
        let current_class = klassen_meta_list_impl(&conn).unwrap().into_iter()
            .find(|class| class.id.as_deref() == Some(current_id.as_str())).unwrap();
        assert_eq!(old_class.name, "7A Alt");
        assert!(old_class.archiviert);
        assert_eq!(current_class.name, "7A");
        assert!(!current_class.archiviert);

        let (historic_label, historic_id): (String, Option<String>) = conn.query_row(
            "SELECT klasse, klasse_id FROM abgabe WHERE datei_hash='history-7a'",
            [], |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();
        assert_eq!(historic_label, "7A");
        assert_eq!(historic_id.as_deref(), Some(previous_id.as_str()));
        let student_memberships_after_archive: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schueler_klassen WHERE schueler_id=?1 AND status='aktiv'",
            [student_id], |row| row.get(0),
        ).unwrap();
        assert_eq!(student_memberships_after_archive, 2);
    }

    #[test]
    fn klassen_loeschung_vorschau_und_kaskade_lassen_unabhaengige_daten_stehen() {
        let conn = setup_full();
        upsert(&conn, &beispiel("7A"));
        upsert(&conn, &beispiel("8B"));
        conn.execute("INSERT INTO schueler (klasse, vorname) VALUES ('7A', 'Mia')", []).unwrap();
        let s1 = conn.last_insert_rowid();
        let class_7a: String = conn.query_row("SELECT id FROM lua_klassen WHERE name='7A'", [], |r| r.get(0)).unwrap();
        let class_8b: String = conn.query_row("SELECT id FROM lua_klassen WHERE name='8B'", [], |r| r.get(0)).unwrap();
        conn.execute("UPDATE schueler SET klasse_id=?1 WHERE id=?2", rusqlite::params![class_7a, s1]).unwrap();
        conn.execute("INSERT INTO schueler_klassen (schueler_id,klasse_id) VALUES (?1,?2),(?1,?3)",
            rusqlite::params![s1, class_7a, class_8b]).unwrap();
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
        let verbleibende_klasse: String = conn.query_row("SELECT klasse_id FROM schueler WHERE id=?1", rusqlite::params![s1], |r| r.get(0)).unwrap();
        assert_eq!(verbleibende_klasse, class_8b);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM abgabe WHERE klasse='7A'", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM kriterium_historie", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM fehler_historie", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM lehrer_feedback", [], |r| r.get(0)).unwrap(), 0);
        assert_eq!(conn.query_row::<i64, _, _>("SELECT COUNT(*) FROM schueler_profil", [], |r| r.get(0)).unwrap(), 1);
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
