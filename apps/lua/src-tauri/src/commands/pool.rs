use serde::{Deserialize, Serialize};

use super::db::DbState;

#[derive(Serialize, Deserialize, Clone, Debug)]
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

/// Vorschau vor dem Import: was steckt in der Datei, was kollidiert mit der DB?
/// Die Lehrkraft sieht das, BEVOR etwas in die lokale DB geschrieben wird.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PoolImportPreview {
    pub gesamt: usize,
    /// (Fach-Key, Anzahl) — sortiert nach Anzahl absteigend
    pub je_fach: Vec<(String, usize)>,
    /// IDs, die bereits in der lokalen DB existieren
    pub duplikate: usize,
    /// Einträge mit quelle_hinweis (Herkunfts-/Entwurfsvermerk)
    pub mit_quelle: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PoolImportReport {
    pub eingefuegt: usize,
    pub ersetzt: usize,
    pub uebersprungen: usize,
}

/// Dateiformat: JSON-Array von PoolEntry (camelCase) — identisch zu
/// `scripts/generate-aufgabenpool-draft.mjs`-Output und `bin/seed_pool.rs`.
fn lese_pool_datei(path: &str) -> Result<Vec<PoolEntry>, String> {
    let raw = std::fs::read_to_string(path)
        .map_err(|e| format!("Datei nicht lesbar: {}", e))?;
    serde_json::from_str::<Vec<PoolEntry>>(&raw)
        .map_err(|e| format!("Kein gültiges Pool-Paket (erwartet JSON-Array von Aufgaben): {}", e))
}

pub(crate) fn import_preview_impl(
    conn: &rusqlite::Connection,
    entries: &[PoolEntry],
) -> Result<PoolImportPreview, String> {
    let mut je_fach_map: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut duplikate = 0usize;
    let mut mit_quelle = 0usize;

    let mut stmt = conn
        .prepare("SELECT 1 FROM aufgabe_pool WHERE id = ?1")
        .map_err(|e| format!("pool_import_preview prepare: {}", e))?;

    for e in entries {
        *je_fach_map.entry(e.fach.clone()).or_insert(0) += 1;
        if e.quelle_hinweis.is_some() {
            mit_quelle += 1;
        }
        let existiert = stmt
            .exists(rusqlite::params![e.id])
            .map_err(|err| format!("pool_import_preview exists: {}", err))?;
        if existiert {
            duplikate += 1;
        }
    }

    let mut je_fach: Vec<(String, usize)> = je_fach_map.into_iter().collect();
    je_fach.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));

    Ok(PoolImportPreview { gesamt: entries.len(), je_fach, duplikate, mit_quelle })
}

pub(crate) fn import_impl(
    conn: &rusqlite::Connection,
    entries: &[PoolEntry],
    ueberschreiben: bool,
) -> Result<PoolImportReport, String> {
    let sql = if ueberschreiben {
        "INSERT OR REPLACE INTO aufgabe_pool (id, fach, stufe, schulstufe, thema, aufgabentyp, tags, block_json, quelle_hinweis, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
    } else {
        "INSERT OR IGNORE INTO aufgabe_pool (id, fach, stufe, schulstufe, thema, aufgabentyp, tags, block_json, quelle_hinweis, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
    };

    let mut check = conn
        .prepare("SELECT 1 FROM aufgabe_pool WHERE id = ?1")
        .map_err(|e| format!("pool_import prepare: {}", e))?;
    let mut insert = conn.prepare(sql).map_err(|e| format!("pool_import prepare: {}", e))?;

    let mut eingefuegt = 0usize;
    let mut ersetzt = 0usize;
    let mut uebersprungen = 0usize;

    for e in entries {
        let existierte = check
            .exists(rusqlite::params![e.id])
            .map_err(|err| format!("pool_import exists: {}", err))?;
        let affected = insert
            .execute(rusqlite::params![
                e.id, e.fach, e.stufe, e.schulstufe, e.thema, e.aufgabentyp,
                e.tags, e.block_json, e.quelle_hinweis, e.created_at,
            ])
            .map_err(|err| format!("pool_import insert ({}): {}", e.id, err))?;
        match (existierte, affected > 0) {
            (false, true) => eingefuegt += 1,
            (true, true) => ersetzt += 1,
            _ => uebersprungen += 1,
        }
    }

    Ok(PoolImportReport { eingefuegt, ersetzt, uebersprungen })
}

#[tauri::command]
pub async fn pool_import_preview(
    state: tauri::State<'_, DbState>,
    path: String,
) -> Result<PoolImportPreview, String> {
    let entries = lese_pool_datei(&path)?;
    let guard = state.conn()?;
    import_preview_impl(&guard, &entries)
}

#[tauri::command]
pub async fn pool_import(
    state: tauri::State<'_, DbState>,
    path: String,
    ueberschreiben: bool,
) -> Result<PoolImportReport, String> {
    let entries = lese_pool_datei(&path)?;
    let guard = state.conn()?;
    import_impl(&guard, &entries, ueberschreiben)
}

/// Exportiert den gesamten lokalen Pool als teilbares Paket (gleiches Format
/// wie der Import — Roundtrip-kompatibel, auch mit seed_pool/Skripten).
#[tauri::command]
pub async fn pool_export(
    state: tauri::State<'_, DbState>,
    path: String,
) -> Result<usize, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let mut stmt = conn
        .prepare(
            "SELECT id, fach, stufe, schulstufe, thema, aufgabentyp, tags, block_json, quelle_hinweis, created_at
             FROM aufgabe_pool ORDER BY created_at DESC",
        )
        .map_err(|e| format!("pool_export prepare: {}", e))?;
    let rows = stmt
        .query_map([], |row| {
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
        .map_err(|e| format!("pool_export query: {}", e))?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| format!("pool_export row: {}", e))?);
    }

    let json = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("pool_export serialize: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Datei nicht schreibbar: {}", e))?;

    Ok(entries.len())
}

use rusqlite::OptionalExtension;

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(crate::db::LUA_SCHEMA_SQL).unwrap();
        conn
    }

    fn entry(id: &str, fach: &str) -> PoolEntry {
        PoolEntry {
            id: id.into(),
            fach: fach.into(),
            stufe: "oberstufe".into(),
            schulstufe: Some(10),
            thema: Some("Testthema".into()),
            aufgabentyp: "multipleChoice".into(),
            tags: None,
            block_json: "{}".into(),
            quelle_hinweis: Some("LLM-Entwurf, ungeprüft".into()),
            created_at: "2026-07-09T00:00:00Z".into(),
        }
    }

    #[test]
    fn preview_zaehlt_gesamt_faecher_duplikate_und_quellen() {
        let conn = setup();
        // ein Eintrag existiert schon → muss als Duplikat zählen
        import_impl(&conn, &[entry("a", "deutsch")], false).unwrap();

        let entries = vec![entry("a", "deutsch"), entry("b", "deutsch"), entry("c", "informatikki")];
        let p = import_preview_impl(&conn, &entries).unwrap();
        assert_eq!(p.gesamt, 3);
        assert_eq!(p.duplikate, 1);
        assert_eq!(p.mit_quelle, 3);
        assert_eq!(p.je_fach, vec![("deutsch".into(), 2), ("informatikki".into(), 1)]);
    }

    #[test]
    fn import_ohne_ueberschreiben_ueberspringt_duplikate() {
        let conn = setup();
        import_impl(&conn, &[entry("a", "deutsch")], false).unwrap();

        let r = import_impl(&conn, &[entry("a", "geschichte"), entry("b", "deutsch")], false).unwrap();
        assert_eq!(r.eingefuegt, 1);
        assert_eq!(r.ersetzt, 0);
        assert_eq!(r.uebersprungen, 1);
        // Duplikat wurde NICHT überschrieben
        let fach: String = conn
            .query_row("SELECT fach FROM aufgabe_pool WHERE id='a'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fach, "deutsch");
    }

    #[test]
    fn import_mit_ueberschreiben_ersetzt_duplikate() {
        let conn = setup();
        import_impl(&conn, &[entry("a", "deutsch")], false).unwrap();

        let r = import_impl(&conn, &[entry("a", "geschichte")], true).unwrap();
        assert_eq!(r.eingefuegt, 0);
        assert_eq!(r.ersetzt, 1);
        assert_eq!(r.uebersprungen, 0);
        let fach: String = conn
            .query_row("SELECT fach FROM aufgabe_pool WHERE id='a'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(fach, "geschichte");
    }

    #[test]
    fn export_import_roundtrip_ueber_datei() {
        let conn = setup();
        import_impl(&conn, &[entry("a", "deutsch"), entry("b", "informatikki")], false).unwrap();

        // Export in Temp-Datei (Serialisierung wie im Command)
        let mut stmt = conn
            .prepare("SELECT id, fach, stufe, schulstufe, thema, aufgabentyp, tags, block_json, quelle_hinweis, created_at FROM aufgabe_pool")
            .unwrap();
        let entries: Vec<PoolEntry> = stmt
            .query_map([], |row| {
                Ok(PoolEntry {
                    id: row.get(0)?, fach: row.get(1)?, stufe: row.get(2)?,
                    schulstufe: row.get(3)?, thema: row.get(4)?, aufgabentyp: row.get(5)?,
                    tags: row.get(6)?, block_json: row.get(7)?, quelle_hinweis: row.get(8)?,
                    created_at: row.get(9)?,
                })
            })
            .unwrap()
            .map(|r| r.unwrap())
            .collect();
        let dir = std::env::temp_dir().join("luka-pool-test");
        std::fs::create_dir_all(&dir).unwrap();
        let pfad = dir.join("roundtrip.json");
        std::fs::write(&pfad, serde_json::to_string_pretty(&entries).unwrap()).unwrap();

        // frische DB, Datei wieder einlesen (kompletter lese_pool_datei-Pfad)
        let conn2 = setup();
        let gelesen = lese_pool_datei(pfad.to_str().unwrap()).unwrap();
        let r = import_impl(&conn2, &gelesen, false).unwrap();
        assert_eq!(r.eingefuegt, 2);
        std::fs::remove_file(&pfad).ok();
    }

    #[test]
    fn kaputte_datei_liefert_verstaendlichen_fehler() {
        let dir = std::env::temp_dir().join("luka-pool-test");
        std::fs::create_dir_all(&dir).unwrap();
        let pfad = dir.join("kaputt.json");
        std::fs::write(&pfad, "{ kein array }").unwrap();
        let err = lese_pool_datei(pfad.to_str().unwrap()).unwrap_err();
        assert!(err.contains("Kein gültiges Pool-Paket"), "Fehlertext war: {}", err);
        std::fs::remove_file(&pfad).ok();
    }
}
