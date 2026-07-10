use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use super::db::DbState;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LehrerProfil {
    pub display_name: String,
    pub land: String,
    pub region_at: String,
    pub region_ch: String,
    pub region_de: String,
    pub schulform: String,
    pub faecher: Vec<String>,
    pub schulstufen: Vec<i32>,
    pub aufgabenformate: Vec<String>,
    pub standard_provider: String,
    pub standard_model: String,
    pub standard_kreativitaet: f64,
    pub export_docx: bool,
    pub export_pdf: bool,
    pub export_loesung: bool,
    pub export_erwartungshorizont: bool,
    pub updated_at: String,
}

fn validate_profile(profile: &LehrerProfil) -> Result<(), String> {
    if !matches!(profile.land.as_str(), "AT" | "CH" | "DE") {
        return Err("Land muss AT, CH oder DE sein.".to_string());
    }
    if !(0.0..=1.0).contains(&profile.standard_kreativitaet) {
        return Err("Kreativität muss zwischen 0 und 1 liegen.".to_string());
    }
    if profile.standard_provider.trim().is_empty() {
        return Err("Standard-Provider darf nicht leer sein.".to_string());
    }
    if profile.standard_model.trim().is_empty() {
        return Err("Standard-Modell darf nicht leer sein.".to_string());
    }
    if profile.faecher.iter().any(|value| value.trim().is_empty())
        || profile.aufgabenformate.iter().any(|value| value.trim().is_empty())
        || profile.schulstufen.iter().any(|value| *value <= 0)
    {
        return Err("Profil-Listen dürfen keine leeren oder ungültigen Werte enthalten.".to_string());
    }
    Ok(())
}

pub(crate) fn profil_get_impl(conn: &Connection) -> Result<Option<LehrerProfil>, String> {
    conn.query_row(
        "SELECT display_name, land, region_at, region_ch, region_de, schulform,
                faecher_json, schulstufen_json, aufgabenformate_json,
                standard_provider, standard_model, standard_kreativitaet,
                export_docx, export_pdf, export_loesung, export_erwartungshorizont,
                updated_at
         FROM lua_lehrerprofil WHERE id = 1",
        [],
        |row| {
            let faecher_json: String = row.get(6)?;
            let schulstufen_json: String = row.get(7)?;
            let aufgabenformate_json: String = row.get(8)?;
            Ok(LehrerProfil {
                display_name: row.get(0)?,
                land: row.get(1)?,
                region_at: row.get(2)?,
                region_ch: row.get(3)?,
                region_de: row.get(4)?,
                schulform: row.get(5)?,
                faecher: serde_json::from_str(&faecher_json).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(6, rusqlite::types::Type::Text, Box::new(e))
                })?,
                schulstufen: serde_json::from_str(&schulstufen_json).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(7, rusqlite::types::Type::Text, Box::new(e))
                })?,
                aufgabenformate: serde_json::from_str(&aufgabenformate_json).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(8, rusqlite::types::Type::Text, Box::new(e))
                })?,
                standard_provider: row.get(9)?,
                standard_model: row.get(10)?,
                standard_kreativitaet: row.get(11)?,
                export_docx: row.get::<_, i64>(12)? != 0,
                export_pdf: row.get::<_, i64>(13)? != 0,
                export_loesung: row.get::<_, i64>(14)? != 0,
                export_erwartungshorizont: row.get::<_, i64>(15)? != 0,
                updated_at: row.get(16)?,
            })
        },
    )
    .optional()
    .map_err(|e| format!("profil_get: {}", e))
}

pub(crate) fn profil_save_impl(conn: &Connection, profile: &LehrerProfil) -> Result<(), String> {
    validate_profile(profile)?;
    let faecher_json = serde_json::to_string(&profile.faecher).map_err(|e| format!("Fächer: {}", e))?;
    let schulstufen_json = serde_json::to_string(&profile.schulstufen).map_err(|e| format!("Schulstufen: {}", e))?;
    let aufgabenformate_json = serde_json::to_string(&profile.aufgabenformate).map_err(|e| format!("Aufgabenformate: {}", e))?;

    conn.execute(
        "INSERT INTO lua_lehrerprofil (
            id, display_name, land, region_at, region_ch, region_de, schulform,
            faecher_json, schulstufen_json, aufgabenformate_json,
            standard_provider, standard_model, standard_kreativitaet,
            export_docx, export_pdf, export_loesung, export_erwartungshorizont, updated_at
         ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
            display_name=excluded.display_name, land=excluded.land,
            region_at=excluded.region_at, region_ch=excluded.region_ch, region_de=excluded.region_de,
            schulform=excluded.schulform, faecher_json=excluded.faecher_json,
            schulstufen_json=excluded.schulstufen_json, aufgabenformate_json=excluded.aufgabenformate_json,
            standard_provider=excluded.standard_provider, standard_model=excluded.standard_model,
            standard_kreativitaet=excluded.standard_kreativitaet,
            export_docx=excluded.export_docx, export_pdf=excluded.export_pdf,
            export_loesung=excluded.export_loesung, export_erwartungshorizont=excluded.export_erwartungshorizont,
            updated_at=datetime('now')",
        rusqlite::params![
            profile.display_name.trim(), profile.land, profile.region_at.trim(), profile.region_ch.trim(), profile.region_de.trim(),
            profile.schulform.trim(), faecher_json, schulstufen_json, aufgabenformate_json,
            profile.standard_provider.trim(), profile.standard_model.trim(), profile.standard_kreativitaet,
            profile.export_docx as i64, profile.export_pdf as i64, profile.export_loesung as i64,
            profile.export_erwartungshorizont as i64,
        ],
    )
    .map_err(|e| format!("profil_save: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn profil_get(state: tauri::State<'_, DbState>) -> Result<Option<LehrerProfil>, String> {
    let guard = state.conn()?;
    profil_get_impl(&guard)
}

#[tauri::command]
pub async fn profil_save(state: tauri::State<'_, DbState>, profile: LehrerProfil) -> Result<(), String> {
    let guard = state.conn()?;
    profil_save_impl(&guard, &profile)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(crate::db::LUA_SCHEMA_SQL).unwrap();
        conn
    }

    fn profile() -> LehrerProfil {
        LehrerProfil {
            display_name: "Mila".into(), land: "AT".into(), region_at: "Wien".into(),
            region_ch: "".into(), region_de: "".into(), schulform: "ahs".into(),
            faecher: vec!["deutsch".into(), "informatikki".into()], schulstufen: vec![7, 8],
            aufgabenformate: vec!["multipleChoice".into()], standard_provider: "mistral".into(),
            standard_model: "Mistral Medium 3.5".into(), standard_kreativitaet: 0.4,
            export_docx: true, export_pdf: false, export_loesung: true,
            export_erwartungshorizont: false, updated_at: String::new(),
        }
    }

    #[test]
    fn leerer_store_liefert_none() { assert_eq!(profil_get_impl(&setup()).unwrap(), None); }

    #[test]
    fn save_get_roundtrip_und_singleton_update() {
        let conn = setup();
        let p = profile();
        profil_save_impl(&conn, &p).unwrap();
        let mut updated = p.clone(); updated.display_name = "Mila R.".into(); updated.export_pdf = true;
        profil_save_impl(&conn, &updated).unwrap();
        assert_eq!(profil_get_impl(&conn).unwrap().unwrap().display_name, "Mila R.");
        assert_eq!(conn.query_row("SELECT COUNT(*) FROM lua_lehrerprofil", [], |row| row.get::<_, i64>(0)).unwrap(), 1);
    }

    #[test]
    fn invalides_land_und_kreativitaet_werden_abgewiesen() {
        let conn = setup();
        let mut p = profile(); p.land = "FR".into(); assert!(profil_save_impl(&conn, &p).is_err());
        let mut p = profile(); p.standard_kreativitaet = 1.1; assert!(profil_save_impl(&conn, &p).is_err());
    }

    #[test]
    fn schema_initialisierung_ist_idempotent() {
        let conn = setup(); conn.execute_batch(crate::db::LUA_SCHEMA_SQL).unwrap();
        assert!(profil_get_impl(&conn).unwrap().is_none());
    }
}
