use rusqlite::OptionalExtension;
use serde::Serialize;

use crate::commands::db::DbState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AbgabeInfo {
    pub id: i64,
    pub schueler_id: Option<i64>,
    pub klasse: String,
    pub aufgabe: String,
    pub dateiname: String,
    pub datum: Option<String>,
    pub note: Option<f64>,
    pub gesamtstufe: Option<f64>,
    pub wortanzahl: Option<i64>,
    pub fach: Option<String>,
    pub schulstufe: Option<String>,
    pub textsorte: Option<String>,
    pub vorname: Option<String>,
    pub nachname: Option<String>,
    pub hat_lehrer_feedback: bool,
    pub note_final: Option<f64>,
    pub rohtext: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapEntry {
    pub typ: String,
    pub anzahl: i64,
    pub prozent: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Notenverteilung {
    pub noten: std::collections::BTreeMap<String, i64>,
    pub durchschnitt: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KlassenStatistik {
    pub anzahl_abgaben: i64,
    pub notenverteilung: Notenverteilung,
    pub kriterien: Vec<KriteriumDurchschnitt>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KriteriumDurchschnitt {
    pub name: String,
    pub durchschnitt: f64,
    pub anzahl: i64,
}

#[tauri::command]
pub async fn db_list_aufgaben(state: tauri::State<'_, DbState>, klasse: String) -> Result<Vec<String>, String> {
    let guard = state.conn()?;
    list_aufgaben_impl(&guard, &klasse)
}

pub(crate) fn list_aufgaben_impl(conn: &rusqlite::Connection, klasse: &str) -> Result<Vec<String>, String> {
    let mut stmt = conn.prepare("SELECT DISTINCT aufgabe FROM abgabe WHERE klasse=?1 ORDER BY aufgabe")
        .map_err(|e| format!("prepare: {}", e))?;
    let rows: Vec<String> = stmt.query_map(rusqlite::params![klasse], |row| row.get(0))
        .map_err(|e| format!("query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(rows)
}

#[tauri::command]
pub async fn db_get_abgaben(state: tauri::State<'_, DbState>, klasse: String, aufgabe: Option<String>) -> Result<Vec<AbgabeInfo>, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let sql = if aufgabe.is_some() {
        "SELECT a.id, a.schueler_id, a.klasse, a.aufgabe, a.dateiname, a.datum, a.note, a.gesamtstufe, a.wortanzahl, a.fach, a.schulstufe, a.textsorte, s.vorname, s.nachname, CASE WHEN lf.id IS NOT NULL THEN 1 ELSE 0 END, lf.note_final FROM abgabe a LEFT JOIN schueler s ON a.schueler_id=s.id LEFT JOIN lehrer_feedback lf ON a.id=lf.abgabe_id WHERE a.klasse=?1 AND a.aufgabe=?2 ORDER BY s.nachname, s.vorname, a.dateiname"
    } else {
        "SELECT a.id, a.schueler_id, a.klasse, a.aufgabe, a.dateiname, a.datum, a.note, a.gesamtstufe, a.wortanzahl, a.fach, a.schulstufe, a.textsorte, s.vorname, s.nachname, CASE WHEN lf.id IS NOT NULL THEN 1 ELSE 0 END, lf.note_final FROM abgabe a LEFT JOIN schueler s ON a.schueler_id=s.id LEFT JOIN lehrer_feedback lf ON a.id=lf.abgabe_id WHERE a.klasse=?1 ORDER BY a.aufgabe, s.nachname, s.vorname, a.dateiname"
    };

    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref af) = aufgabe {
        vec![Box::new(klasse), Box::new(af.clone())]
    } else {
        vec![Box::new(klasse)]
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(sql).map_err(|e| format!("prepare: {}", e))?;
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(AbgabeInfo {
            id: row.get(0)?,
            schueler_id: row.get(1)?,
            klasse: row.get(2)?,
            aufgabe: row.get(3)?,
            dateiname: row.get(4)?,
            datum: row.get(5)?,
            note: row.get(6)?,
            gesamtstufe: row.get(7)?,
            wortanzahl: row.get(8)?,
            fach: row.get(9)?,
            schulstufe: row.get(10)?,
            textsorte: row.get(11)?,
            vorname: row.get(12)?,
            nachname: row.get(13)?,
            hat_lehrer_feedback: row.get::<_, i64>(14)? != 0,
            note_final: row.get(15)?,
            rohtext: None,
        })
    }).map_err(|e| format!("query: {}", e))?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub async fn db_get_fehler_heatmap(state: tauri::State<'_, DbState>, klasse: String, aufgabe: Option<String>) -> Result<Vec<HeatmapEntry>, String> {
    let guard = state.conn()?;
    fehler_heatmap_impl(&guard, klasse, aufgabe)
}

pub(crate) fn fehler_heatmap_impl(conn: &rusqlite::Connection, klasse: String, aufgabe: Option<String>) -> Result<Vec<HeatmapEntry>, String> {
    let data_sql = if aufgabe.is_some() {
        "SELECT f.typ, COUNT(*) as cnt FROM fehler_historie f JOIN abgabe a ON f.abgabe_id=a.id WHERE a.klasse=?1 AND a.aufgabe=?2 GROUP BY f.typ ORDER BY cnt DESC"
    } else {
        "SELECT f.typ, COUNT(*) as cnt FROM fehler_historie f JOIN abgabe a ON f.abgabe_id=a.id WHERE a.klasse=?1 GROUP BY f.typ ORDER BY cnt DESC"
    };

    let total_sql = if aufgabe.is_some() {
        "SELECT COUNT(*) FROM fehler_historie f JOIN abgabe a ON f.abgabe_id=a.id WHERE a.klasse=?1 AND a.aufgabe=?2"
    } else {
        "SELECT COUNT(*) FROM fehler_historie f JOIN abgabe a ON f.abgabe_id=a.id WHERE a.klasse=?1"
    };

    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref af) = aufgabe {
        vec![Box::new(klasse.clone()), Box::new(af.clone())]
    } else {
        vec![Box::new(klasse)]
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let total: f64 = conn.query_row(total_sql, param_refs.as_slice(), |row| row.get::<_, i64>(0)).unwrap_or(0) as f64;

    let mut stmt = conn.prepare(data_sql).map_err(|e| format!("prepare heatmap: {}", e))?;
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        let typ: String = row.get(0)?;
        let anzahl: i64 = row.get(1)?;
        let prozent = if total > 0.0 { (anzahl as f64 / total) * 100.0 } else { 0.0 };
        Ok(HeatmapEntry { typ, anzahl, prozent })
    }).map_err(|e| format!("query heatmap: {}", e))?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub async fn db_get_notenverteilung(state: tauri::State<'_, DbState>, klasse: String, aufgabe: Option<String>) -> Result<Notenverteilung, String> {
    let guard = state.conn()?;
    let conn = &*guard;
    query_notenverteilung(conn, &klasse, aufgabe.as_deref())
}

#[tauri::command]
pub async fn db_get_klassen_statistik(state: tauri::State<'_, DbState>, klasse: String, aufgabe: Option<String>) -> Result<KlassenStatistik, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let count_sql = if aufgabe.is_some() {
        "SELECT COUNT(*) FROM abgabe WHERE klasse=?1 AND aufgabe=?2"
    } else {
        "SELECT COUNT(*) FROM abgabe WHERE klasse=?1"
    };
    let count_params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref af) = aufgabe {
        vec![Box::new(klasse.clone()), Box::new(af.clone())]
    } else {
        vec![Box::new(klasse.clone())]
    };
    let count_refs: Vec<&dyn rusqlite::types::ToSql> = count_params.iter().map(|p| p.as_ref()).collect();
    let anzahl_abgaben: i64 = conn.query_row(count_sql, count_refs.as_slice(), |row| row.get(0)).unwrap_or(0);

    let notenverteilung = query_notenverteilung(conn, &klasse, aufgabe.as_deref())?;
    let kriterien = query_kriterien_durchschnitt(conn, &klasse, aufgabe.as_deref())?;
    Ok(KlassenStatistik { anzahl_abgaben, notenverteilung, kriterien })
}

fn query_notenverteilung(conn: &rusqlite::Connection, klasse: &str, aufgabe: Option<&str>) -> Result<Notenverteilung, String> {
    let dist_sql = if aufgabe.is_some() {
        "SELECT ROUND(COALESCE(lf.note_final, a.note)) as n, COUNT(*) as cnt FROM abgabe a LEFT JOIN lehrer_feedback lf ON a.id=lf.abgabe_id WHERE a.klasse=?1 AND a.aufgabe=?2 AND COALESCE(lf.note_final, a.note) IS NOT NULL GROUP BY n ORDER BY n"
    } else {
        "SELECT ROUND(COALESCE(lf.note_final, a.note)) as n, COUNT(*) as cnt FROM abgabe a LEFT JOIN lehrer_feedback lf ON a.id=lf.abgabe_id WHERE a.klasse=?1 AND COALESCE(lf.note_final, a.note) IS NOT NULL GROUP BY n ORDER BY n"
    };

    let avg_sql = if aufgabe.is_some() {
        "SELECT AVG(COALESCE(lf.note_final, a.note)) FROM abgabe a LEFT JOIN lehrer_feedback lf ON a.id=lf.abgabe_id WHERE a.klasse=?1 AND a.aufgabe=?2 AND COALESCE(lf.note_final, a.note) IS NOT NULL"
    } else {
        "SELECT AVG(COALESCE(lf.note_final, a.note)) FROM abgabe a LEFT JOIN lehrer_feedback lf ON a.id=lf.abgabe_id WHERE a.klasse=?1 AND COALESCE(lf.note_final, a.note) IS NOT NULL"
    };

    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(af) = aufgabe {
        vec![Box::new(klasse.to_string()), Box::new(af.to_string())]
    } else {
        vec![Box::new(klasse.to_string())]
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let durchschnitt = conn.query_row(avg_sql, param_refs.as_slice(), |row| row.get::<_, Option<f64>>(0)).unwrap_or(None);
    let mut noten = std::collections::BTreeMap::new();
    let mut stmt = conn.prepare(dist_sql).map_err(|e| format!("prepare noten: {}", e))?;
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        let n: f64 = row.get(0)?;
        let cnt: i64 = row.get(1)?;
        Ok((n, cnt))
    }).map_err(|e| format!("query noten: {}", e))?;
    for row in rows {
        if let Ok((n, cnt)) = row {
            noten.insert(format!("{:.0}", n), cnt);
        }
    }
    Ok(Notenverteilung { noten, durchschnitt })
}

fn query_kriterien_durchschnitt(conn: &rusqlite::Connection, klasse: &str, aufgabe: Option<&str>) -> Result<Vec<KriteriumDurchschnitt>, String> {
    let sql = if aufgabe.is_some() {
        "SELECT k.kriterium_name, AVG(k.stufe) as avg_stufe, COUNT(*) as cnt FROM kriterium_historie k JOIN abgabe a ON k.abgabe_id=a.id WHERE a.klasse=?1 AND a.aufgabe=?2 GROUP BY k.kriterium_name ORDER BY avg_stufe"
    } else {
        "SELECT k.kriterium_name, AVG(k.stufe) as avg_stufe, COUNT(*) as cnt FROM kriterium_historie k JOIN abgabe a ON k.abgabe_id=a.id WHERE a.klasse=?1 GROUP BY k.kriterium_name ORDER BY avg_stufe"
    };

    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(af) = aufgabe {
        vec![Box::new(klasse.to_string()), Box::new(af.to_string())]
    } else {
        vec![Box::new(klasse.to_string())]
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(sql).map_err(|e| format!("prepare kriterien: {}", e))?;
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(KriteriumDurchschnitt { name: row.get(0)?, durchschnitt: row.get(1)?, anzahl: row.get(2)? })
    }).map_err(|e| format!("query kriterien: {}", e))?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub async fn db_upsert_lehrer_feedback(
    state: tauri::State<'_, DbState>,
    abgabe_id: i64,
    klasse: String,
    aufgabe: String,
    note_final: Option<f64>,
    lehrer_kommentar: Option<String>,
    schueler_id: Option<i64>,
) -> Result<(), String> {
    let guard = state.conn()?;
    let conn = &*guard;
    conn.execute(
        "INSERT INTO lehrer_feedback (abgabe_id, klasse, aufgabe, note_final, lehrer_kommentar, schueler_id, note_app_snapshot) \
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, note FROM abgabe WHERE id=?1 \
         ON CONFLICT(abgabe_id) DO UPDATE SET note_final=COALESCE(?4, note_final), lehrer_kommentar=COALESCE(?5, lehrer_kommentar), geaendert_am=CURRENT_TIMESTAMP",
        rusqlite::params![abgabe_id, klasse, aufgabe, note_final, lehrer_kommentar, schueler_id],
    ).map_err(|e| format!("upsert lehrer_feedback: {}", e))?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KriteriumRow {
    pub id: i64,
    pub abgabe_id: i64,
    pub kriterium_name: String,
    pub stufe: Option<f64>,
    pub gewichtung: Option<f64>,
    pub datum: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FehlerRow {
    pub id: i64,
    pub abgabe_id: i64,
    pub zitat: Option<String>,
    pub korrektur: Option<String>,
    pub typ: String,
    pub erklaerung: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AbgabeDetail {
    pub abgabe: AbgabeInfo,
    pub kriterien: Vec<KriteriumRow>,
    pub fehler: Vec<FehlerRow>,
    pub lehrer_feedback: Option<LehrerFeedbackRow>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LehrerFeedbackRow {
    pub id: i64,
    pub note_final: Option<f64>,
    pub note_app_snapshot: Option<f64>,
    pub lehrer_kommentar: Option<String>,
    pub erstellt_am: Option<String>,
    pub geaendert_am: Option<String>,
}

#[tauri::command]
pub async fn db_get_abgabe_detail(state: tauri::State<'_, DbState>, abgabe_id: i64) -> Result<AbgabeDetail, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let abgabe = conn.query_row(
        "SELECT a.id, a.schueler_id, a.klasse, a.aufgabe, a.dateiname, a.datum, a.note, a.gesamtstufe, a.wortanzahl, a.fach, a.schulstufe, a.textsorte, s.vorname, s.nachname, CASE WHEN lf.id IS NOT NULL THEN 1 ELSE 0 END, lf.note_final, a.rohtext FROM abgabe a LEFT JOIN schueler s ON a.schueler_id=s.id LEFT JOIN lehrer_feedback lf ON a.id=lf.abgabe_id WHERE a.id=?1",
        rusqlite::params![abgabe_id], |row| {
            Ok(AbgabeInfo {
                id: row.get(0)?,
                schueler_id: row.get(1)?,
                klasse: row.get(2)?,
                aufgabe: row.get(3)?,
                dateiname: row.get(4)?,
                datum: row.get(5)?,
                note: row.get(6)?,
                gesamtstufe: row.get(7)?,
                wortanzahl: row.get(8)?,
                fach: row.get(9)?,
                schulstufe: row.get(10)?,
                textsorte: row.get(11)?,
                vorname: row.get(12)?,
                nachname: row.get(13)?,
                hat_lehrer_feedback: row.get::<_, i64>(14)? != 0,
                note_final: row.get(15)?,
                rohtext: row.get(16)?,
            })
        }
    ).map_err(|e| format!("query abgabe: {}", e))?;

    let kriterien: Vec<KriteriumRow> = {
        let mut stmt = conn.prepare("SELECT id, abgabe_id, kriterium_name, stufe, gewichtung, datum FROM kriterium_historie WHERE abgabe_id=?1 ORDER BY kriterium_name")
            .map_err(|e| format!("prepare kriterien: {}", e))?;
        let mut result = Vec::new();
        let rows = stmt.query_map(rusqlite::params![abgabe_id], |row| {
            Ok(KriteriumRow { id: row.get(0)?, abgabe_id: row.get(1)?, kriterium_name: row.get(2)?, stufe: row.get(3)?, gewichtung: row.get(4)?, datum: row.get(5)? })
        }).map_err(|e| format!("query kriterien: {}", e))?;
        for row in rows {
            if let Ok(k) = row { result.push(k); }
        }
        result
    };

    let fehler: Vec<FehlerRow> = {
        let mut stmt = conn.prepare("SELECT id, abgabe_id, zitat, korrektur, typ, erklaerung FROM fehler_historie WHERE abgabe_id=?1 ORDER BY typ, id")
            .map_err(|e| format!("prepare fehler: {}", e))?;
        let mut result = Vec::new();
        let rows = stmt.query_map(rusqlite::params![abgabe_id], |row| {
            Ok(FehlerRow { id: row.get(0)?, abgabe_id: row.get(1)?, zitat: row.get(2)?, korrektur: row.get(3)?, typ: row.get(4)?, erklaerung: row.get(5)? })
        }).map_err(|e| format!("query fehler: {}", e))?;
        for row in rows {
            if let Ok(f) = row { result.push(f); }
        }
        result
    };

    let lehrer_feedback = conn.query_row(
        "SELECT id, note_final, note_app_snapshot, lehrer_kommentar, erstellt_am, geaendert_am FROM lehrer_feedback WHERE abgabe_id=?1",
        rusqlite::params![abgabe_id],
        |row| {
            Ok(LehrerFeedbackRow {
                id: row.get(0)?,
                note_final: row.get(1)?,
                note_app_snapshot: row.get(2)?,
                lehrer_kommentar: row.get(3)?,
                erstellt_am: row.get(4)?,
                geaendert_am: row.get(5)?,
            })
        }
    ).ok();

    Ok(AbgabeDetail { abgabe, kriterien, fehler, lehrer_feedback })
}

// ─── P2: Schüler- und Klassen-Queries ─────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchuelerInfo {
    pub id: i64,
    pub klasse: String,
    pub vorname: String,
    pub nachname: Option<String>,
    pub created_at: Option<String>,
}

#[tauri::command]
pub async fn db_list_schueler(state: tauri::State<'_, DbState>, klasse: String) -> Result<Vec<SchuelerInfo>, String> {
    let guard = state.conn()?;
    list_schueler_impl(&guard, &klasse)
}

pub(crate) fn list_schueler_impl(conn: &rusqlite::Connection, klasse: &str) -> Result<Vec<SchuelerInfo>, String> {
    let mut stmt = conn.prepare("SELECT id, klasse, vorname, nachname, created_at FROM schueler WHERE klasse=?1 ORDER BY vorname, nachname")
        .map_err(|e| format!("prepare schueler: {}", e))?;
    let rows = stmt.query_map(rusqlite::params![klasse], |row| {
        Ok(SchuelerInfo {
            id: row.get(0)?,
            klasse: row.get(1)?,
            vorname: row.get(2)?,
            nachname: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| format!("query schueler: {}", e))?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

/// Legt einen neuen Schüler an (nativer INSERT, kein Python nötig). Gibt die neue ID zurück.
#[tauri::command]
pub async fn db_insert_schueler(
    state: tauri::State<'_, DbState>,
    klasse: String,
    vorname: String,
    nachname: Option<String>,
) -> Result<i64, String> {
    let guard = state.conn()?;
    insert_schueler_impl(&guard, &klasse, &vorname, nachname.as_deref())
}

pub(crate) fn insert_schueler_impl(
    conn: &rusqlite::Connection,
    klasse: &str,
    vorname: &str,
    nachname: Option<&str>,
) -> Result<i64, String> {
    let klasse = klasse.trim();
    let vorname = vorname.trim();
    if klasse.is_empty() || vorname.is_empty() {
        return Err("Klasse und Vorname dürfen nicht leer sein.".to_string());
    }
    let nachname = nachname.map(str::trim).filter(|s| !s.is_empty());
    conn.execute(
        "INSERT INTO schueler (klasse, vorname, nachname) VALUES (?1, ?2, ?3)",
        rusqlite::params![klasse, vorname, nachname],
    )
    .map_err(|e| format!("insert schueler: {}", e))?;
    Ok(conn.last_insert_rowid())
}

/// Löscht einen Schüler. Abgaben bleiben erhalten (schueler_id → NULL via FK).
#[tauri::command]
pub async fn db_delete_schueler(state: tauri::State<'_, DbState>, schueler_id: i64) -> Result<(), String> {
    let guard = state.conn()?;
    delete_schueler_impl(&guard, schueler_id)
}

pub(crate) fn delete_schueler_impl(conn: &rusqlite::Connection, schueler_id: i64) -> Result<(), String> {
    conn.execute("DELETE FROM schueler WHERE id=?1", rusqlite::params![schueler_id])
        .map_err(|e| format!("delete schueler: {}", e))?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaengsschnittEintrag {
    pub abgabe_id: i64,
    pub aufgabe: String,
    pub datum: Option<String>,
    pub note_app: Option<f64>,
    pub note_lehrer: Option<f64>,
    pub kriterien: std::collections::HashMap<String, Option<f64>>,
    pub k1: Option<f64>,
    pub k3: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendEintrag {
    pub start: Option<f64>,
    pub ende: Option<f64>,
    pub richtung: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Fehlerschwerpunkt {
    pub typ: String,
    pub label: String,
    pub anzahl: i64,
    pub beispiele: Vec<FehlerBeispiel>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FehlerBeispiel {
    pub zitat: Option<String>,
    pub korrektur: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Kalibrierung {
    pub paare: i64,
    pub mittlere_abweichung: Option<f64>,
    pub tendenz: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchuelerLaengsschnitt {
    pub schueler: SchuelerInfo,
    pub anzahl_abgaben: i64,
    pub verlauf: Vec<LaengsschnittEintrag>,
    pub trend: std::collections::HashMap<String, TrendEintrag>,
    pub fehlerschwerpunkte: Vec<Fehlerschwerpunkt>,
    pub kalibrierung: Kalibrierung,
}

const KRITERIUM_VARIANTS: &[(&[&str], &str)] = &[
    (&["inhalt", "inhalt/gedankengang", "inhalt/gedanke", "gedankengang", "gedanke", "content"], "inhalt"),
    (&["textstruktur", "textstruktur/aufbau", "aufbau", "struktur", "organisation", "organization"], "textstruktur"),
    (&["ausdruck", "ausdruck/stil", "stil", "ausdrucksvermögen", "expression"], "ausdruck"),
    (&["sprachrichtigkeit", "sprachrichtigkeit/grammatik", "grammatik", "sprache", "language accuracy"], "sprachrichtigkeit"),
];

fn normalisiere_kriterien(rows: &[(String, Option<f64>)]) -> std::collections::HashMap<String, Option<f64>> {
    let mut buckets: std::collections::HashMap<String, Vec<f64>> = std::collections::HashMap::new();
    for (name, stufe) in rows {
        let lower = name.to_lowercase().trim().to_string();
        let matched = KRITERIUM_VARIANTS.iter().find(|(variants, _)| variants.iter().any(|v| lower.contains(v)));
        let key = matched.map(|(_, k)| k.to_string()).unwrap_or_else(|| lower.clone());
        if let Some(val) = stufe {
            buckets.entry(key).or_default().push(*val);
        }
    }
    let mut result = std::collections::HashMap::new();
    for (key_name, _) in &[("inhalt", "inhalt"), ("textstruktur", "textstruktur"), ("ausdruck", "ausdruck"), ("sprachrichtigkeit", "sprachrichtigkeit")] {
        if let Some(vals) = buckets.get(*key_name) {
            result.insert(key_name.to_string(), Some(vals.iter().sum::<f64>() / vals.len() as f64));
        } else {
            result.insert(key_name.to_string(), None);
        }
    }
    result
}

fn mittel(vals: &[Option<f64>]) -> Option<f64> {
    let filtered: Vec<f64> = vals.iter().filter_map(|v| *v).collect();
    if filtered.is_empty() { return None; }
    Some(filtered.iter().sum::<f64>() / filtered.len() as f64)
}

fn trend_berechnen(serie: &[Option<f64>], besser_ist_groesser: bool) -> TrendEintrag {
    let valid: Vec<f64> = serie.iter().filter_map(|v| *v).collect();
    if valid.len() < 2 {
        return TrendEintrag { start: valid.first().copied(), ende: valid.last().copied(), richtung: "n/a".to_string() };
    }
    let start = valid.first().unwrap();
    let ende = valid.last().unwrap();
    let delta = ende - start;
    let richtung = if delta.abs() < 0.5 {
        "stabil".to_string()
    } else if besser_ist_groesser {
        if delta > 0.0 { "steigt".to_string() } else { "faellt".to_string() }
    } else {
        if delta < 0.0 { "steigt".to_string() } else { "faellt".to_string() }
    };
    TrendEintrag { start: Some(*start), ende: Some(*ende), richtung }
}

const FEHLER_LABELS: &[(&str, &str)] = &[("R", "Rechtschreibung"), ("G", "Grammatik"), ("Z", "Zeichensetzung"), ("A", "Ausdruck")];
fn fehler_label(typ: &str) -> String {
    FEHLER_LABELS.iter().find(|(k, _)| *k == typ).map(|(_, v)| v.to_string()).unwrap_or_else(|| typ.to_string())
}

#[tauri::command]
pub async fn db_get_schueler_laengsschnitt(state: tauri::State<'_, DbState>, schueler_id: i64) -> Result<SchuelerLaengsschnitt, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let schueler = conn.query_row(
        "SELECT id, klasse, vorname, nachname, created_at FROM schueler WHERE id=?1",
        rusqlite::params![schueler_id],
        |row| Ok(SchuelerInfo { id: row.get(0)?, klasse: row.get(1)?, vorname: row.get(2)?, nachname: row.get(3)?, created_at: row.get(4)? })
    ).map_err(|e| format!("query schueler: {}", e))?;

    let mut abgabe_stmt = conn.prepare(
        "SELECT id, schueler_id, klasse, aufgabe, dateiname, datum, note, gesamtstufe, wortanzahl, fach, schulstufe, textsorte FROM abgabe WHERE schueler_id=?1 ORDER BY datum, id"
    ).map_err(|e| format!("prepare abgaben: {}", e))?;
    let abgabe_rows = abgabe_stmt.query_map(rusqlite::params![schueler_id], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, String>(3)?, row.get::<_, Option<String>>(5)?, row.get::<_, Option<f64>>(6)?))
    }).map_err(|e| format!("query abgaben: {}", e))?;

    let mut verlauf = Vec::new();
    let mut all_note_app: Vec<Option<f64>> = Vec::new();
    let mut all_note_lehrer: Vec<Option<f64>> = Vec::new();
    let mut all_k1: Vec<Option<f64>> = Vec::new();
    let mut all_k3: Vec<Option<f64>> = Vec::new();
    let mut all_kriterien: std::collections::HashMap<String, Vec<Option<f64>>> = std::collections::HashMap::new();
    let mut abgabe_ids: Vec<i64> = Vec::new();
    let mut fehler_by_typ: std::collections::HashMap<String, Vec<(Option<String>, Option<String>)>> = std::collections::HashMap::new();
    let mut kalib_paare: Vec<(f64, f64)> = Vec::new();

    for row in abgabe_rows {
        if let Ok((aid, aufgabe, datum, note_app)) = row {
            abgabe_ids.push(aid);
            let note_lehrer: Option<f64> = conn.query_row(
                "SELECT note_final FROM lehrer_feedback WHERE abgabe_id=?1",
                rusqlite::params![aid], |r| r.get(0)
            ).unwrap_or(None);

            let krit_rows: Vec<(String, Option<f64>)> = {
                let mut s = conn.prepare("SELECT kriterium_name, stufe FROM kriterium_historie WHERE abgabe_id=?1")
                    .map_err(|e| format!("prepare krit: {}", e))?;
                let r = s.query_map(rusqlite::params![aid], |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<f64>>(1)?)))
                    .map_err(|e| format!("query krit: {}", e))?;
                r.filter_map(|x| x.ok()).collect()
            };
            let norm = normalisiere_kriterien(&krit_rows);
            let k1 = mittel(&[norm.get("inhalt").copied().flatten(), norm.get("textstruktur").copied().flatten()]);
            let k3 = mittel(&[norm.get("ausdruck").copied().flatten(), norm.get("sprachrichtigkeit").copied().flatten()]);

            for (key, val) in &norm {
                all_kriterien.entry(key.to_string()).or_default().push(*val);
            }

            let fehler_rows: Vec<(String, Option<String>, Option<String>)> = {
                let mut s = conn.prepare("SELECT typ, zitat, korrektur FROM fehler_historie WHERE abgabe_id=?1")
                    .map_err(|e| format!("prepare fehler: {}", e))?;
                let r = s.query_map(rusqlite::params![aid], |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?, row.get::<_, Option<String>>(2)?)))
                    .map_err(|e| format!("query fehler: {}", e))?;
                r.filter_map(|x| x.ok()).collect()
            };
            for (typ, zitat, korrektur) in &fehler_rows {
                fehler_by_typ.entry(typ.to_string()).or_default().push((zitat.clone(), korrektur.clone()));
            }

            if let (Some(app), Some(lehrer)) = (note_app, note_lehrer) {
                kalib_paare.push((app, lehrer));
            }

            all_note_app.push(note_app);
            all_note_lehrer.push(note_lehrer);
            all_k1.push(k1);
            all_k3.push(k3);

            let krit_map: std::collections::HashMap<String, Option<f64>> = norm.into_iter().map(|(k, v)| (k, v)).collect();
            verlauf.push(LaengsschnittEintrag { abgabe_id: aid, aufgabe, datum, note_app, note_lehrer, kriterien: krit_map, k1, k3 });
        }
    }

    let mut trend = std::collections::HashMap::new();
    trend.insert("noteApp".to_string(), trend_berechnen(&all_note_app, false));
    trend.insert("noteLehrer".to_string(), trend_berechnen(&all_note_lehrer, false));
    trend.insert("k1".to_string(), trend_berechnen(&all_k1, true));
    trend.insert("k3".to_string(), trend_berechnen(&all_k3, true));
    for key in &["inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit"] {
        if let Some(serie) = all_kriterien.get(*key) {
            trend.insert(key.to_string(), trend_berechnen(serie, true));
        }
    }

    let mut fehlerschwerpunkte: Vec<Fehlerschwerpunkt> = fehler_by_typ.iter().map(|(typ, beispiele)| {
        let mut unique: Vec<(Option<String>, Option<String>)> = beispiele.clone();
        unique.dedup();
        let top3: Vec<FehlerBeispiel> = unique.iter().take(3).map(|(zitat, korrektur)| FehlerBeispiel { zitat: zitat.clone(), korrektur: korrektur.clone() }).collect();
        Fehlerschwerpunkt { typ: typ.clone(), label: fehler_label(typ), anzahl: beispiele.len() as i64, beispiele: top3 }
    }).collect();
    fehlerschwerpunkte.sort_by(|a, b| b.anzahl.cmp(&a.anzahl));

    let mittlere_abw = if kalib_paare.is_empty() { None } else {
        let sum: f64 = kalib_paare.iter().map(|(a, l)| (a - l).abs()).sum();
        Some((sum / kalib_paare.len() as f64 * 100.0).round() / 100.0)
    };
    let tendenz = if kalib_paare.is_empty() { "n/a".to_string() } else {
        let avg_diff: f64 = kalib_paare.iter().map(|(a, l)| a - l).sum::<f64>() / kalib_paare.len() as f64;
        if avg_diff > 0.3 { "app strenger".to_string() } else if avg_diff < -0.3 { "app milder".to_string() } else { "deckungsgleich".to_string() }
    };

    Ok(SchuelerLaengsschnitt {
        schueler,
        anzahl_abgaben: verlauf.len() as i64,
        verlauf,
        trend,
        fehlerschwerpunkte,
        kalibrierung: Kalibrierung { paare: kalib_paare.len() as i64, mittlere_abweichung: mittlere_abw, tendenz },
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendPoint {
    pub aufgabe: String,
    pub datum: Option<String>,
    pub n: i64,
    pub avg_note_app: Option<f64>,
    pub avg_note_lehrer: Option<f64>,
    pub n_mit_feedback: i64,
}

#[tauri::command]
pub async fn db_get_klassen_trend(state: tauri::State<'_, DbState>, klasse: String) -> Result<Vec<TrendPoint>, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let mut app_stmt = conn.prepare(
        "SELECT a.aufgabe, a.datum, COUNT(*) as n, AVG(a.note) as avg_note FROM abgabe a WHERE a.klasse=?1 GROUP BY a.aufgabe, a.datum ORDER BY a.datum, a.id"
    ).map_err(|e| format!("prepare trend app: {}", e))?;
    let app_rows = app_stmt.query_map(rusqlite::params![klasse], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?, row.get::<_, i64>(2)?, row.get::<_, Option<f64>>(3)?))
    }).map_err(|e| format!("query trend app: {}", e))?;

    let mut trend_map: std::collections::HashMap<String, (Option<String>, i64, Option<f64>, Option<f64>, i64)> = std::collections::HashMap::new();
    for row in app_rows {
        if let Ok((aufgabe, datum, n, avg_app)) = row {
            trend_map.insert(aufgabe.clone(), (datum, n, avg_app, None, 0i64));
        }
    }

    let _lehrer_rows = conn.query_row(
        "SELECT a.aufgabe, AVG(lf.note_final), COUNT(*) FROM lehrer_feedback lf JOIN abgabe a ON a.id=lf.abgabe_id WHERE a.klasse=?1 AND lf.note_final IS NOT NULL GROUP BY a.aufgabe",
        rusqlite::params![klasse],
        |row| { let _ = row; Ok(()) }
    );
    let mut lehrer_stmt = conn.prepare(
        "SELECT a.aufgabe, AVG(lf.note_final) as avg_lehrer, COUNT(*) as n_fb FROM lehrer_feedback lf JOIN abgabe a ON a.id=lf.abgabe_id WHERE a.klasse=?1 AND lf.note_final IS NOT NULL GROUP BY a.aufgabe"
    ).map_err(|e| format!("prepare trend lehrer: {}", e))?;
    let l_rows = lehrer_stmt.query_map(rusqlite::params![klasse], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, Option<f64>>(1)?, row.get::<_, i64>(2)?))
    }).map_err(|e| format!("query trend lehrer: {}", e))?;
    for row in l_rows {
        if let Ok((aufgabe, avg_lehrer, n_fb)) = row {
            if let Some(entry) = trend_map.get_mut(&aufgabe) {
                entry.3 = avg_lehrer;
                entry.4 = n_fb;
            }
        }
    }

    let mut result: Vec<TrendPoint> = trend_map.into_iter().map(|(aufgabe, (datum, n, avg_app, avg_lehrer, n_fb))| {
        TrendPoint { aufgabe, datum, n, avg_note_app: avg_app.map(|v| (v * 100.0).round() / 100.0), avg_note_lehrer: avg_lehrer.map(|v| (v * 100.0).round() / 100.0), n_mit_feedback: n_fb }
    }).collect();
    result.sort_by(|a, b| a.datum.cmp(&b.datum).then(a.aufgabe.cmp(&b.aufgabe)));
    Ok(result)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FehlerTrendPunkt {
    pub aufgabe: String,
    pub datum: Option<String>,
    pub n_abgaben: i64,
    /// typ → Gesamtanzahl (Schlüssel sind die DB-Typ-Codes, i. d. R. R/G/Z/A)
    pub fehler: std::collections::BTreeMap<String, i64>,
    /// typ → Fehler pro Abgabe (2 Dezimalen) — normalisiert, weil die
    /// Abgabenzahl je Schularbeit schwankt und Rohzahlen sonst täuschen
    pub fehler_pro_abgabe: std::collections::BTreeMap<String, f64>,
}

#[tauri::command]
pub async fn db_get_fehler_trend(state: tauri::State<'_, DbState>, klasse: String) -> Result<Vec<FehlerTrendPunkt>, String> {
    let guard = state.conn()?;
    fehler_trend_impl(&guard, &klasse)
}

pub(crate) fn fehler_trend_impl(conn: &rusqlite::Connection, klasse: &str) -> Result<Vec<FehlerTrendPunkt>, String> {
    // datum ist der Import-Zeitpunkt, nicht das Prüfungsdatum — gleiche
    // Chronologie-Annahme wie db_get_klassen_trend.
    let mut basis_stmt = conn.prepare(
        "SELECT aufgabe, MIN(datum), COUNT(*) FROM abgabe WHERE klasse=?1 GROUP BY aufgabe"
    ).map_err(|e| format!("prepare fehlertrend basis: {}", e))?;
    let basis_rows = basis_stmt.query_map(rusqlite::params![klasse], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?, row.get::<_, i64>(2)?))
    }).map_err(|e| format!("query fehlertrend basis: {}", e))?;

    // Basis seedet auch Schularbeiten ohne Fehler (Punkt mit leeren Maps).
    let mut punkte: std::collections::HashMap<String, FehlerTrendPunkt> = std::collections::HashMap::new();
    for row in basis_rows.filter_map(|r| r.ok()) {
        let (aufgabe, datum, n_abgaben) = row;
        punkte.insert(aufgabe.clone(), FehlerTrendPunkt {
            aufgabe,
            datum,
            n_abgaben,
            fehler: std::collections::BTreeMap::new(),
            fehler_pro_abgabe: std::collections::BTreeMap::new(),
        });
    }

    let mut fehler_stmt = conn.prepare(
        "SELECT a.aufgabe, f.typ, COUNT(*) FROM fehler_historie f JOIN abgabe a ON a.id=f.abgabe_id WHERE a.klasse=?1 GROUP BY a.aufgabe, f.typ"
    ).map_err(|e| format!("prepare fehlertrend typen: {}", e))?;
    let fehler_rows = fehler_stmt.query_map(rusqlite::params![klasse], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)?))
    }).map_err(|e| format!("query fehlertrend typen: {}", e))?;

    for row in fehler_rows.filter_map(|r| r.ok()) {
        let (aufgabe, typ, anzahl) = row;
        if let Some(punkt) = punkte.get_mut(&aufgabe) {
            if punkt.n_abgaben > 0 {
                let pro_abgabe = (anzahl as f64 / punkt.n_abgaben as f64 * 100.0).round() / 100.0;
                punkt.fehler_pro_abgabe.insert(typ.clone(), pro_abgabe);
            }
            punkt.fehler.insert(typ, anzahl);
        }
    }

    let mut result: Vec<FehlerTrendPunkt> = punkte.into_values().collect();
    result.sort_by(|a, b| a.datum.cmp(&b.datum).then(a.aufgabe.cmp(&b.aufgabe)));
    Ok(result)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KalibrierungResult {
    pub app_avg: Option<f64>,
    pub lehrer_avg: Option<f64>,
    pub diff: Option<f64>,
    pub n_mit_feedback: i64,
    pub n_gesamt: i64,
    pub tendenz: String,
}

#[tauri::command]
pub async fn db_get_klassen_kalibrierung(state: tauri::State<'_, DbState>, klasse: String, aufgabe: Option<String>) -> Result<KalibrierungResult, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let where_clause = if aufgabe.is_some() { "a.klasse=?1 AND a.aufgabe=?2 AND lf.note_final IS NOT NULL" } else { "a.klasse=?1 AND lf.note_final IS NOT NULL" };
    let sql = format!("SELECT COUNT(*) as n_fb, AVG(lf.note_app_snapshot) as app_avg, AVG(lf.note_final) as lehrer_avg FROM lehrer_feedback lf JOIN abgabe a ON a.id=lf.abgabe_id WHERE {}", where_clause);
    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref af) = aufgabe {
        vec![Box::new(klasse.clone()), Box::new(af.clone())]
    } else {
        vec![Box::new(klasse.clone())]
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let (n_fb, app_avg, lehrer_avg): (i64, Option<f64>, Option<f64>) = conn.query_row(&sql, param_refs.as_slice(), |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    }).map_err(|e| format!("query kalibrierung: {}", e))?;

    let count_where = if aufgabe.is_some() { "klasse=?1 AND aufgabe=?2" } else { "klasse=?1" };
    let count_sql = format!("SELECT COUNT(*) FROM abgabe WHERE {}", count_where);
    let n_gesamt: i64 = conn.query_row(&count_sql, param_refs.as_slice(), |row| row.get(0)).unwrap_or(0);

    let diff = match (app_avg, lehrer_avg) {
        (Some(a), Some(l)) => Some((l - a).round() / 100.0 * 100.0),
        _ => None,
    };
    let tendenz = match diff {
        Some(d) if d < -0.3 => "app milder".to_string(),
        Some(d) if d > 0.3 => "app strenger".to_string(),
        Some(_) => "deckungsgleich".to_string(),
        None => "n/a".to_string(),
    };

    Ok(KalibrierungResult {
        app_avg: app_avg.map(|v| (v * 100.0).round() / 100.0),
        lehrer_avg: lehrer_avg.map(|v| (v * 100.0).round() / 100.0),
        diff: diff.map(|v| (v * 100.0).round() / 100.0),
        n_mit_feedback: n_fb,
        n_gesamt,
        tendenz,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FehlerDetailRow {
    pub zitat: Option<String>,
    pub korrektur: Option<String>,
    pub erklaerung: Option<String>,
    pub vorname: Option<String>,
    pub dateiname: String,
}

#[tauri::command]
pub async fn db_get_fehler_detail(state: tauri::State<'_, DbState>, klasse: String, typ: String, aufgabe: Option<String>, limit: Option<i64>) -> Result<Vec<FehlerDetailRow>, String> {
    let guard = state.conn()?;
    let conn = &*guard;
    let limit = limit.unwrap_or(50);

    let sql = if aufgabe.is_some() {
        "SELECT fh.zitat, fh.korrektur, fh.erklaerung, s.vorname, a.dateiname FROM fehler_historie fh JOIN abgabe a ON fh.abgabe_id=a.id LEFT JOIN schueler s ON a.schueler_id=s.id WHERE a.klasse=?1 AND fh.typ=?2 AND a.aufgabe=?3 ORDER BY fh.zitat LIMIT ?4"
    } else {
        "SELECT fh.zitat, fh.korrektur, fh.erklaerung, s.vorname, a.dateiname FROM fehler_historie fh JOIN abgabe a ON fh.abgabe_id=a.id LEFT JOIN schueler s ON a.schueler_id=s.id WHERE a.klasse=?1 AND fh.typ=?2 ORDER BY fh.zitat LIMIT ?3"
    };

    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref af) = aufgabe {
        vec![Box::new(klasse), Box::new(typ), Box::new(af.clone()), Box::new(limit)]
    } else {
        vec![Box::new(klasse), Box::new(typ), Box::new(limit)]
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(sql).map_err(|e| format!("prepare fehler_detail: {}", e))?;
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(FehlerDetailRow { zitat: row.get(0)?, korrektur: row.get(1)?, erklaerung: row.get(2)?, vorname: row.get(3)?, dateiname: row.get(4)? })
    }).map_err(|e| format!("query fehler_detail: {}", e))?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotenCsvRow {
    pub nachname: Option<String>,
    pub vorname: Option<String>,
    pub aufgabe: String,
    pub note: Option<f64>,
    pub gesamtstufe: Option<f64>,
    pub wortanzahl: Option<i64>,
    pub datum: Option<String>,
    pub fach: Option<String>,
    pub textsorte: Option<String>,
}

#[tauri::command]
pub async fn db_export_noten_csv(state: tauri::State<'_, DbState>, klasse: String, aufgabe: Option<String>) -> Result<String, String> {
    let guard = state.conn()?;
    let conn = &*guard;

    let sql = if aufgabe.is_some() {
        "SELECT s.nachname, s.vorname, a.aufgabe, a.note, a.gesamtstufe, a.wortanzahl, a.datum, a.fach, a.textsorte FROM abgabe a LEFT JOIN schueler s ON a.schueler_id=s.id WHERE a.klasse=?1 AND a.aufgabe=?2 ORDER BY s.nachname, s.vorname, a.datum"
    } else {
        "SELECT s.nachname, s.vorname, a.aufgabe, a.note, a.gesamtstufe, a.wortanzahl, a.datum, a.fach, a.textsorte FROM abgabe a LEFT JOIN schueler s ON a.schueler_id=s.id WHERE a.klasse=?1 ORDER BY a.aufgabe, s.nachname, s.vorname, a.datum"
    };

    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref af) = aufgabe {
        vec![Box::new(klasse), Box::new(af.clone())]
    } else {
        vec![Box::new(klasse)]
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(sql).map_err(|e| format!("prepare noten_csv: {}", e))?;
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(NotenCsvRow {
            nachname: row.get(0)?, vorname: row.get(1)?, aufgabe: row.get(2)?,
            note: row.get(3)?, gesamtstufe: row.get(4)?, wortanzahl: row.get(5)?,
            datum: row.get(6)?, fach: row.get(7)?, textsorte: row.get(8)?,
        })
    }).map_err(|e| format!("query noten_csv: {}", e))?;

    let mut csv = String::from("Nachname;Vorname;Aufgabe;Note;Gesamtstufe;Wortanzahl;Datum;Fach;Textsorte\n");
    for row in rows {
        if let Ok(r) = row {
            csv.push_str(&format!(
                "{};{};{};{};{};{};{};{};{}\n",
                r.nachname.unwrap_or_default(),
                r.vorname.unwrap_or_default(),
                r.aufgabe,
                r.note.map_or(String::new(), |v| format!("{:.1}", v)),
                r.gesamtstufe.map_or(String::new(), |v| format!("{:.2}", v)),
                r.wortanzahl.map_or(String::new(), |v| v.to_string()),
                r.datum.unwrap_or_default(),
                r.fach.unwrap_or_default(),
                r.textsorte.unwrap_or_default(),
            ));
        }
    }
    Ok(csv)
}

// ─── Stage 4: LLM-Briefing/Profil lesen ──────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KlassenBriefingRow {
    pub id: i64,
    pub klasse: String,
    pub aufgabe: String,
    pub text: String,
    pub modell: String,
    pub erstellt_am: String,
}

/// Holt das jüngste KI-Klassen-Briefing aus der DB (oder None, wenn noch keins existiert).
#[tauri::command]
pub async fn db_get_klassen_briefing(
    state: tauri::State<'_, DbState>,
    klasse: String,
    aufgabe: Option<String>,
) -> Result<Option<KlassenBriefingRow>, String> {
    let guard = state.conn()?;
    let conn = &*guard;
    let sql = if aufgabe.is_some() {
        "SELECT id, klasse, aufgabe, json_extract(briefing_json,'$.text'), modell, erstellt_am \
         FROM klassen_briefing WHERE klasse=?1 AND aufgabe=?2 ORDER BY erstellt_am DESC, id DESC LIMIT 1"
    } else {
        "SELECT id, klasse, aufgabe, json_extract(briefing_json,'$.text'), modell, erstellt_am \
         FROM klassen_briefing WHERE klasse=?1 AND (aufgabe IS NULL OR aufgabe='') ORDER BY erstellt_am DESC, id DESC LIMIT 1"
    };
    let params: Vec<Box<dyn rusqlite::types::ToSql>> = if let Some(ref af) = aufgabe {
        vec![Box::new(klasse), Box::new(af.clone())]
    } else {
        vec![Box::new(klasse)]
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(sql).map_err(|e| format!("prepare klassen_briefing: {e}"))?;
    let row = stmt.query_row(param_refs.as_slice(), |row| {
        Ok(KlassenBriefingRow {
            id: row.get(0)?,
            klasse: row.get(1)?,
            aufgabe: row.get(2)?,
            text: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            modell: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
            erstellt_am: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
        })
    }).optional().map_err(|e| format!("query klassen_briefing: {e}"))?;
    Ok(row)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchuelerProfilRow {
    pub id: i64,
    pub schueler_id: i64,
    pub text: String,
    pub modell: String,
    pub erstellt_am: String,
}

/// Holt das jüngste KI-Schüler-Profil aus der DB (oder None).
#[tauri::command]
pub async fn db_get_schueler_profil(
    state: tauri::State<'_, DbState>,
    schueler_id: i64,
) -> Result<Option<SchuelerProfilRow>, String> {
    let guard = state.conn()?;
    let conn = &*guard;
    let row = conn.query_row(
        "SELECT id, schueler_id, json_extract(profil_json,'$.text'), modell, erstellt_am \
         FROM schueler_profil WHERE schueler_id=?1 ORDER BY erstellt_am DESC, id DESC LIMIT 1",
        rusqlite::params![schueler_id],
        |row| Ok(SchuelerProfilRow {
            id: row.get(0)?,
            schueler_id: row.get(1)?,
            text: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            modell: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            erstellt_am: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
        }),
    ).optional().map_err(|e| format!("query schueler_profil: {e}"))?;
    Ok(row)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        // Muss den PRAGMA-Haushalt von db::open_db() spiegeln (foreign_keys=ON),
        // sonst testen wir ON DELETE SET NULL/CASCADE gegen ein Verhalten,
        // das die echte App nie hat.
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        conn.execute_batch(crate::db::NATASCHA_SCHEMA_SQL).unwrap();
        conn
    }

    /// Seedet 2 Schüler (7a), 1 Abgabe (SA1) + 4 Fehler (3×Z, 1×G).
    fn seed(conn: &Connection) {
        let s1 = insert_schueler_impl(conn, "7a", "Mona", Some("Muster")).unwrap();
        insert_schueler_impl(conn, "7a", "Max", None).unwrap();
        conn.execute(
            "INSERT INTO abgabe (schueler_id, klasse, aufgabe, dateiname, datei_hash, note) \
             VALUES (?1,'7a','SA1','mona.docx','h1',2.0)",
            rusqlite::params![s1],
        ).unwrap();
        let abgabe_id = conn.last_insert_rowid();
        for typ in ["Z", "Z", "Z", "G"] {
            conn.execute(
                "INSERT INTO fehler_historie (abgabe_id, typ) VALUES (?1, ?2)",
                rusqlite::params![abgabe_id, typ],
            ).unwrap();
        }
    }

    #[test]
    fn schueler_crud() {
        let conn = setup();
        seed(&conn);
        let list = list_schueler_impl(&conn, "7a").unwrap();
        assert_eq!(list.len(), 2);
        // leerer Vorname wird abgelehnt
        assert!(insert_schueler_impl(&conn, "7a", "   ", None).is_err());
        // löschen reduziert die Liste
        delete_schueler_impl(&conn, list[0].id).unwrap();
        assert_eq!(list_schueler_impl(&conn, "7a").unwrap().len(), 1);
        // andere Klasse ist leer
        assert!(list_schueler_impl(&conn, "9z").unwrap().is_empty());
    }

    #[test]
    fn list_aufgaben_distinct() {
        let conn = setup();
        seed(&conn);
        assert_eq!(list_aufgaben_impl(&conn, "7a").unwrap(), vec!["SA1".to_string()]);
        assert!(list_aufgaben_impl(&conn, "9z").unwrap().is_empty());
    }

    #[test]
    fn heatmap_counts_and_percent() {
        let conn = setup();
        seed(&conn);
        let hm = fehler_heatmap_impl(&conn, "7a".to_string(), None).unwrap();
        // Z=3, G=1, total=4 → sortiert nach Häufigkeit
        assert_eq!(hm.len(), 2);
        assert_eq!(hm[0].typ, "Z");
        assert_eq!(hm[0].anzahl, 3);
        assert!((hm[0].prozent - 75.0).abs() < 0.001);
        assert_eq!(hm[1].typ, "G");
        assert!((hm[1].prozent - 25.0).abs() < 0.001);
        // leere Klasse → keine Einträge
        assert!(fehler_heatmap_impl(&conn, "9z".to_string(), None).unwrap().is_empty());
    }

    /// Seedet zwei Schularbeiten: SA1 (2 Abgaben, Fehler Z,Z,Z,Z,G),
    /// SA2 (1 Abgabe, Fehler Z,G,X) und SA3 (1 Abgabe, keine Fehler).
    fn seed_fehler_trend(conn: &Connection) {
        let abgabe = |aufgabe: &str, datum: &str, hash: &str| -> i64 {
            conn.execute(
                "INSERT INTO abgabe (klasse, aufgabe, dateiname, datei_hash, datum) \
                 VALUES ('8b', ?1, 'x.docx', ?2, ?3)",
                rusqlite::params![aufgabe, hash, datum],
            ).unwrap();
            conn.last_insert_rowid()
        };
        let a1 = abgabe("SA1", "2026-01-10", "t1");
        let a2 = abgabe("SA1", "2026-01-10", "t2");
        let a3 = abgabe("SA2", "2026-03-01", "t3");
        abgabe("SA3", "2026-05-01", "t4");
        for (id, typ) in [(a1, "Z"), (a1, "Z"), (a2, "Z"), (a2, "Z"), (a1, "G"), (a3, "Z"), (a3, "G"), (a3, "X")] {
            conn.execute(
                "INSERT INTO fehler_historie (abgabe_id, typ) VALUES (?1, ?2)",
                rusqlite::params![id, typ],
            ).unwrap();
        }
    }

    #[test]
    fn fehler_trend_chronologie_und_normalisierung() {
        let conn = setup();
        seed_fehler_trend(&conn);
        let trend = fehler_trend_impl(&conn, "8b").unwrap();
        assert_eq!(trend.len(), 3);
        // Chronologie via MIN(datum)
        assert_eq!(trend[0].aufgabe, "SA1");
        assert_eq!(trend[1].aufgabe, "SA2");
        assert_eq!(trend[2].aufgabe, "SA3");
        // SA1: 4×Z auf 2 Abgaben → 2.0 pro Abgabe; SA2: 1×Z auf 1 Abgabe → 1.0
        assert_eq!(trend[0].n_abgaben, 2);
        assert_eq!(trend[0].fehler["Z"], 4);
        assert!((trend[0].fehler_pro_abgabe["Z"] - 2.0).abs() < 0.001);
        assert!((trend[0].fehler_pro_abgabe["G"] - 0.5).abs() < 0.001);
        assert!((trend[1].fehler_pro_abgabe["Z"] - 1.0).abs() < 0.001);
        // unbekannter Code überlebt unverändert
        assert_eq!(trend[1].fehler["X"], 1);
        // Schularbeit ohne Fehler → Punkt existiert mit leeren Maps
        assert_eq!(trend[2].n_abgaben, 1);
        assert!(trend[2].fehler.is_empty());
        assert!(trend[2].fehler_pro_abgabe.is_empty());
    }

    #[test]
    fn fehler_trend_unbekannte_klasse_leer() {
        let conn = setup();
        seed_fehler_trend(&conn);
        assert!(fehler_trend_impl(&conn, "9z").unwrap().is_empty());
    }

    /// Lösch-Dialog (SchuelerView) behauptet: Profil weg, Abgaben/Fehler bleiben
    /// anonymisiert. Das gilt nur, wenn foreign_keys=ON greift (ON DELETE CASCADE
    /// bei schueler_profil, ON DELETE SET NULL bei abgabe) — hier verifiziert.
    #[test]
    fn delete_schueler_cascaded_profil_aber_abgabe_bleibt_anonymisiert() {
        let conn = setup();
        // seed() legt Mona (s1) + Max an, Abgabe SA1 gehört Mona.
        let s1 = insert_schueler_impl(&conn, "7a", "Mona", Some("Muster")).unwrap();
        conn.execute(
            "INSERT INTO abgabe (schueler_id, klasse, aufgabe, dateiname, datei_hash, note) \
             VALUES (?1,'7a','SA1','mona.docx','h1',2.0)",
            rusqlite::params![s1],
        ).unwrap();
        let abgabe_id: i64 = conn.query_row(
            "SELECT id FROM abgabe WHERE schueler_id=?1", rusqlite::params![s1], |r| r.get(0),
        ).unwrap();
        conn.execute(
            "INSERT INTO schueler_profil (schueler_id, profil_json, basis_anzahl_abgaben) VALUES (?1, '{}', 1)",
            rusqlite::params![s1],
        ).unwrap();

        delete_schueler_impl(&conn, s1).unwrap();

        let profil_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schueler_profil WHERE schueler_id=?1", rusqlite::params![s1], |r| r.get(0),
        ).unwrap();
        assert_eq!(profil_count, 0, "Profil muss per CASCADE gelöscht sein");

        let abgabe_existiert: i64 = conn.query_row(
            "SELECT COUNT(*) FROM abgabe WHERE id=?1", rusqlite::params![abgabe_id], |r| r.get(0),
        ).unwrap();
        assert_eq!(abgabe_existiert, 1, "Abgabe muss erhalten bleiben");

        let schueler_id_null: Option<i64> = conn.query_row(
            "SELECT schueler_id FROM abgabe WHERE id=?1", rusqlite::params![abgabe_id], |r| r.get(0),
        ).unwrap();
        assert_eq!(schueler_id_null, None, "abgabe.schueler_id muss per SET NULL entkoppelt sein");
    }
}