//! Unterrichtsplanung: Wochenraster, geplante Stunden, Anlagen sowie die
//! Ferien- und Pausentage, an denen nichts stattfindet.
//!
//! **Schichtung:** Alles, was Datum *rechnet* (Wochentag, Monatsgitter,
//! Schuljahresgrenzen, gesetzliche Feiertage), macht TypeScript in `lib/`.
//! Diese Datei speichert, prüft Formate und liefert Datensätze. Deshalb gibt es
//! hier bewusst keine Feiertagsrechnung - die Ferien kommen als Daten aus
//! `schulferien`, weil die Verordnung jedes Jahr neu gilt.

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::db::DbState;

fn now_string() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn optional_string(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let t = v.trim().to_string();
        (!t.is_empty()).then_some(t)
    })
}

// ── Wochenraster ─────────────────────────────────────────────────────────────

#[derive(Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct RasterMeta {
    pub id: Option<String>,
    pub klasse_id: Option<String>,
    pub klasse_name_snapshot: Option<String>,
    /// 1 = Montag … 7 = Sonntag
    pub wochentag: i64,
    pub start_zeit: Option<String>,
    pub ende_zeit: Option<String>,
    pub bezeichnung: Option<String>,
    /// Beginnjahr des Schuljahres: 2026 = Schuljahr 2026/27.
    pub schuljahr: Option<i64>,
    /// 0 oder 1 aus dem Frontend; None lässt die Spalte unverändert.
    pub aktiv: Option<i64>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RasterRecord {
    pub id: String,
    pub klasse_id: Option<String>,
    pub klasse_name_snapshot: String,
    pub wochentag: i64,
    pub start_zeit: String,
    pub ende_zeit: String,
    pub bezeichnung: String,
    /// Beginnjahr des Schuljahres: 2026 = Schuljahr 2026/27.
    pub schuljahr: Option<i64>,
    pub aktiv: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Liest eine Schuljahrszahl, die in einer Spalte mit **TEXT-Affinität** steht.
///
///  Hintergrund: `migrate_planung_jahresbezug` in `db.rs` hat die Spalte
///  `schuljahr` in Bestandsdatenbanken als TEXT ergänzt, während das Schema sie
///  als INTEGER anlegt. SQLite konvertiert deshalb jede geschriebene Zahl in
///  Text, und ein schlichtes `row.get::<_, Option<i64>>` scheitert dann an
///  `Invalid column type`. Genau daran ist das Speichern im Wochenraster auf
///  Bestandsdatenbanken gescheitert.
///
///  Beide Affinitäten kommen in freier Wildbahn vor, deshalb wird hier nicht
///  blind auf INTEGER vertraut, sondern TEXT mitgeparst. NULL bleibt NULL. Ein
///  unlesbarer Wert ist ein Fehler - stillschweigend `None` zu liefern würde
///  einen Raster-Slot aus jedem Schuljahresfilter fallen lassen.
fn schuljahr_aus_sqlite(row: &rusqlite::Row<'_>, idx: usize) -> rusqlite::Result<Option<i64>> {
    match row.get_ref(idx)? {
        rusqlite::types::ValueRef::Null => Ok(None),
        rusqlite::types::ValueRef::Integer(wert) => Ok(Some(wert)),
        rusqlite::types::ValueRef::Text(bytes) => {
            let roh = std::str::from_utf8(bytes)
                .map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        idx,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?
                .trim();
            if roh.is_empty() {
                return Ok(None);
            }
            roh.parse::<i64>().map(Some).map_err(|_| {
                // Der Spaltenname gehört in die Meldung: ohne ihn sieht eine
                // Meldung wie "invalid digit found in string" nicht aus wie ein
                // Datenbankproblem, sondern wie ein Fehler in der Planung.
                rusqlite::Error::FromSqlConversionFailure(
                    idx,
                    rusqlite::types::Type::Integer,
                    Box::new(std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        format!("schuljahr ist unlesbar: {roh}"),
                    )),
                )
            })
        }
        andere => Err(rusqlite::Error::FromSqlConversionFailure(
            idx,
            rusqlite::types::Type::Integer,
            Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Unerwarteter SQLite-Typ für schuljahr: {andere:?}"),
            )),
        )),
    }
}

fn raster_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<RasterRecord> {
    Ok(RasterRecord {
        id: row.get(0)?,
        klasse_id: row.get(1)?,
        klasse_name_snapshot: row.get(2)?,
        wochentag: row.get(3)?,
        start_zeit: row.get(4)?,
        ende_zeit: row.get(5)?,
        bezeichnung: row.get(6)?,
        schuljahr: schuljahr_aus_sqlite(row, 7)?,
        aktiv: row.get::<_, i64>(8)? != 0,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
    })
}

const RASTER_SELECT: &str = "SELECT id, klasse_id, klasse_name_snapshot, wochentag, \
     start_zeit, ende_zeit, bezeichnung, schuljahr, aktiv, created_at, updated_at FROM stundenraster";

/// Normalisiert eine Uhrzeit auf `HH:MM`. Leeres Ergebnis = "Uhrzeit offen",
/// das ist im Raster erlaubt (der Einsatz kann noch ohne Zeit geplant sein).
fn validiere_zeit(wert: Option<String>, label: &str) -> Result<String, String> {
    let wert = optional_string(wert).unwrap_or_default();
    if wert.is_empty() {
        return Ok(String::new());
    }
    let ungueltig = || format!("Ungültige {label} (erwartet HH:MM): {wert}");
    let teile: Vec<&str> = wert.split(':').collect();
    if teile.len() != 2 || teile.iter().any(|t| t.is_empty() || t.len() > 2) {
        return Err(ungueltig());
    }
    let stunde: u32 = teile[0].parse().map_err(|_| ungueltig())?;
    let minute: u32 = teile[1].parse().map_err(|_| ungueltig())?;
    if stunde > 23 || minute > 59 {
        return Err(ungueltig());
    }
    Ok(format!("{stunde:02}:{minute:02}"))
}

pub(crate) fn raster_upsert_impl(
    conn: &Connection,
    meta: RasterMeta,
) -> Result<RasterRecord, String> {
    if !(1..=7).contains(&meta.wochentag) {
        return Err(format!(
            "Ungültiger Wochentag (1-7 erwartet): {}",
            meta.wochentag
        ));
    }
    let id = optional_string(meta.id).unwrap_or_else(|| Uuid::new_v4().to_string());
    let klasse_id = optional_string(meta.klasse_id);
    // Wie beim Einsatz: der Klassenname kommt aus `lua_klassen`, damit er nicht
    // von der Oberfläche abweichen kann.
    let klasse_name = if let Some(ref kid) = klasse_id {
        conn.query_row("SELECT name FROM lua_klassen WHERE id=?1", params![kid], |r| {
            r.get::<_, String>(0)
        })
        .optional()
        .map_err(|e| format!("raster_upsert Klassen-Snapshot: {e}"))?
        .ok_or_else(|| "Die gewählte Klasse existiert nicht.".to_string())?
    } else {
        meta.klasse_name_snapshot.unwrap_or_default().trim().to_string()
    };
    let start_zeit = validiere_zeit(meta.start_zeit, "Startzeit")?;
    let ende_zeit = validiere_zeit(meta.ende_zeit, "Endzeit")?;
    if !start_zeit.is_empty() && !ende_zeit.is_empty() && ende_zeit <= start_zeit {
        return Err("Die Endzeit muss nach der Startzeit liegen.".to_string());
    }
    let now = now_string();
    let aktiv = meta.aktiv.unwrap_or(1);
    conn.execute(
        "INSERT INTO stundenraster
          (id, klasse_id, klasse_name_snapshot, wochentag, start_zeit, ende_zeit,
           bezeichnung, schuljahr, aktiv, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)
         ON CONFLICT(id) DO UPDATE SET
           klasse_id=excluded.klasse_id,
           klasse_name_snapshot=excluded.klasse_name_snapshot,
           wochentag=excluded.wochentag,
           start_zeit=excluded.start_zeit,
           ende_zeit=excluded.ende_zeit,
           bezeichnung=excluded.bezeichnung,
           schuljahr=excluded.schuljahr,
           aktiv=excluded.aktiv,
           updated_at=excluded.updated_at",
        params![
            id,
            klasse_id,
            klasse_name,
            meta.wochentag,
            start_zeit,
            ende_zeit,
            meta.bezeichnung.unwrap_or_default().trim().to_string(),
            meta.schuljahr,
            aktiv,
            now,
        ],
    )
    .map_err(|e| format!("raster_upsert: {e}"))?;
    conn.query_row(
        &format!("{RASTER_SELECT} WHERE id=?1"),
        params![id],
        raster_from_row,
    )
    .map_err(|e| format!("raster_upsert lesen: {e}"))
}

pub(crate) fn raster_list_impl(
    conn: &Connection,
    klasse_id: Option<String>,
) -> Result<Vec<RasterRecord>, String> {
    let mut sql = format!("{RASTER_SELECT} WHERE 1=1");
    let mut werte: Vec<String> = Vec::new();
    if let Some(kid) = optional_string(klasse_id) {
        werte.push(kid);
        sql.push_str(&format!(" AND klasse_id=?{}", werte.len()));
    }
    sql.push_str(" ORDER BY wochentag ASC, start_zeit ASC, id ASC");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("raster_list prepare: {e}"))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(werte), raster_from_row)
        .map_err(|e| format!("raster_list query: {e}"))?;
    rows.map(|r| r.map_err(|e| format!("raster_list row: {e}")))
        .collect()
}

pub(crate) fn raster_delete_impl(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM stundenraster WHERE id=?1", params![id])
        .map_err(|e| format!("raster_delete: {e}"))?;
    Ok(())
}

/// Übernimmt die Zeiten eines Schuljahres in ein anderes. Additiv und
/// wiederholbar: Zeilen, die im Zieljahr schon existieren (gleiche Klasse, gleicher
/// Tag, gleiche Startzeit), werden übersprungen statt dupliziert.
pub(crate) fn raster_uebernehmen_impl(
    conn: &Connection,
    von_schuljahr: Option<i64>,
    nach_schuljahr: i64,
) -> Result<usize, String> {
    let (quell_sql, quell_werte) = match von_schuljahr {
        Some(jahr) => (
            format!("{RASTER_SELECT} WHERE schuljahr=?1 AND aktiv=1"),
            vec![rusqlite::types::Value::from(jahr)],
        ),
        // Ohne Jahresangabe der Altbestand: Slots, die nie ein Jahr bekommen haben.
        None => (
            format!("{RASTER_SELECT} WHERE schuljahr IS NULL AND aktiv=1"),
            vec![],
        ),
    };
    let quellen: Vec<RasterRecord> = {
        let mut stmt = conn
            .prepare(&quell_sql)
            .map_err(|e| format!("raster_uebernehmen lesen: {e}"))?;
        let rows = stmt
            .query_map(rusqlite::params_from_iter(quell_werte), raster_from_row)
            .map_err(|e| format!("raster_uebernehmen abfragen: {e}"))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("raster_uebernehmen Zeile: {e}"))?
    };

    let mut uebernommen = 0usize;
    for quelle in quellen {
        let vorhanden: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM stundenraster
                  WHERE schuljahr=?1 AND klasse_id IS ?2 AND wochentag=?3 AND start_zeit=?4",
                params![
                    nach_schuljahr,
                    quelle.klasse_id,
                    quelle.wochentag,
                    quelle.start_zeit
                ],
                |r| r.get(0),
            )
            .map_err(|e| format!("raster_uebernehmen prüfen: {e}"))?;
        if vorhanden > 0 {
            continue;
        }
        raster_upsert_impl(
            conn,
            RasterMeta {
                id: None,
                klasse_id: quelle.klasse_id.clone(),
                klasse_name_snapshot: Some(quelle.klasse_name_snapshot.clone()),
                wochentag: quelle.wochentag,
                start_zeit: Some(quelle.start_zeit.clone()),
                ende_zeit: Some(quelle.ende_zeit.clone()),
                bezeichnung: Some(quelle.bezeichnung.clone()),
                schuljahr: Some(nach_schuljahr),
                aktiv: Some(1),
            },
        )?;
        uebernommen += 1;
    }
    Ok(uebernommen)
}

// ── Anlagen (Unterlagen an einer Stunde) ─────────────────────────────────────

const MATERIAL_ARTEN: &[&str] = &["ablage", "material", "verweis"];

#[derive(Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct MaterialMeta {
    pub id: Option<String>,
    pub einsatz_id: String,
    pub art: String,
    /// art = "material": Verweis auf `generated_materials.id`
    pub material_id: Option<String>,
    /// art = "ablage": absoluter Pfad der Quelldatei; LUA kopiert sie in die Ablage.
    pub quelle_pfad: Option<String>,
    /// art = "verweis": Pfad oder URL der Lehrkraft
    pub ziel: Option<String>,
    pub label: Option<String>,
    pub notiz: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MaterialRecord {
    pub id: String,
    pub einsatz_id: String,
    pub art: String,
    pub material_id: Option<String>,
    pub dateiname: String,
    pub ablage_pfad: Option<String>,
    pub ziel: Option<String>,
    pub label: String,
    pub notiz: String,
    pub sort_order: i64,
    /// true, wenn die Datei in der Ablage noch wirklich existiert.
    pub datei_vorhanden: bool,
    pub created_at: String,
    pub updated_at: String,
}

const MATERIAL_SELECT: &str = "SELECT id, einsatz_id, art, material_id, dateiname, \
     ablage_pfad, ziel, label, notiz, sort_order, created_at, updated_at FROM stundenmaterial";

fn material_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<MaterialRecord> {
    let ablage_pfad: Option<String> = row.get(5)?;
    // Die Datei kann von Hand verschoben oder gelöscht worden sein - das ist
    // genau der Fall, den die Oberfläche anzeigen muss.
    let datei_vorhanden = ablage_pfad
        .as_deref()
        .map(|p| Path::new(p).is_file())
        .unwrap_or(false);
    Ok(MaterialRecord {
        id: row.get(0)?,
        einsatz_id: row.get(1)?,
        art: row.get(2)?,
        material_id: row.get(3)?,
        dateiname: row.get(4)?,
        ablage_pfad,
        ziel: row.get(6)?,
        label: row.get(7)?,
        notiz: row.get(8)?,
        sort_order: row.get(9)?,
        datei_vorhanden,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

/// Der Ordner, in den LUA abgelegte Dateien kopiert. Bewusst neben der
/// Datenbank im Bridge-Ordner: dort liegt alles, was zur Lehrkraft gehört, und
/// die Oberfläche kann ihn direkt im Explorer anzeigen.
fn ablage_ordner() -> Result<PathBuf, String> {
    let ordner = crate::db::home_dir()
        .ok_or_else(|| "Home-Verzeichnis nicht gefunden.".to_string())?
        .join("lehr-suite-bridge")
        .join("ablage");
    std::fs::create_dir_all(&ordner)
        .map_err(|e| format!("Ablage-Ordner konnte nicht angelegt werden: {e}"))?;
    Ok(ordner)
}

pub(crate) fn material_add_impl(
    conn: &Connection,
    meta: MaterialMeta,
) -> Result<MaterialRecord, String> {
    if !MATERIAL_ARTEN.contains(&meta.art.as_str()) {
        return Err(format!("Ungültige Anlagenart: {}", meta.art));
    }
    let einsatz_id = optional_string(Some(meta.einsatz_id.clone()))
        .ok_or_else(|| "Die Anlage braucht eine Stunde.".to_string())?;

    let (dateiname, ablage_pfad, ziel, material_id) = match meta.art.as_str() {
        "ablage" => {
            let quelle = optional_string(meta.quelle_pfad)
                .map(PathBuf::from)
                .ok_or_else(|| "Bitte eine Datei auswählen.".to_string())?;
            if !quelle.is_file() {
                return Err(format!("Die Datei gibt es nicht mehr: {}", quelle.display()));
            }
            let name = quelle
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "Anlage".to_string());
            // Kopie statt Move: das Original bleibt, wo die Lehrkraft es hat.
            // Ein Verschieben darf die Ablage nicht ins Leere laufen lassen.
            let ziel_pfad = ablage_ordner()?.join(format!("{}-{}", &Uuid::new_v4().to_string()[..8], name));
            std::fs::copy(&quelle, &ziel_pfad)
                .map_err(|e| format!("Datei konnte nicht kopiert werden: {e}"))?;
            (name, Some(ziel_pfad.to_string_lossy().to_string()), None, None)
        }
        "material" => {
            let mid = optional_string(meta.material_id)
                .ok_or_else(|| "Bitte eine Unterlage auswählen.".to_string())?;
            let dateiname: String = conn
                .query_row(
                    "SELECT title FROM generated_materials WHERE id=?1",
                    params![mid],
                    |r| r.get(0),
                )
                .optional()
                .map_err(|e| format!("material_add Unterlage lesen: {e}"))?
                .unwrap_or_else(|| "Unterlage".to_string());
            (dateiname, None, None, Some(mid))
        }
        "verweis" => {
            let ziel = optional_string(meta.ziel)
                .ok_or_else(|| "Bitte einen Pfad oder eine Adresse angeben.".to_string())?;
            let dateiname = ziel
                .rsplit(['/', '\\'])
                .next()
                .unwrap_or(ziel.as_str())
                .trim()
                .to_string();
            (dateiname, None, Some(ziel), None)
        }
        andere => return Err(format!("Ungültige Anlagenart: {andere}")),
    };

    let label = optional_string(meta.label).unwrap_or_else(|| dateiname.clone());
    let naechste: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM stundenmaterial WHERE einsatz_id=?1",
            params![einsatz_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("material_add Reihenfolge: {e}"))?;
    let id = optional_string(meta.id).unwrap_or_else(|| Uuid::new_v4().to_string());
    let now = now_string();
    conn.execute(
        "INSERT INTO stundenmaterial
           (id, einsatz_id, art, material_id, dateiname, ablage_pfad, ziel, label, notiz,
            sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
         ON CONFLICT(id) DO UPDATE SET
           art=excluded.art, material_id=excluded.material_id,
           dateiname=excluded.dateiname, ablage_pfad=excluded.ablage_pfad,
           ziel=excluded.ziel, label=excluded.label, notiz=excluded.notiz,
           sort_order=excluded.sort_order, updated_at=excluded.updated_at",
        params![
            id,
            einsatz_id,
            meta.art,
            material_id,
            dateiname,
            ablage_pfad,
            ziel,
            label,
            meta.notiz.unwrap_or_default(),
            naechste,
            now,
        ],
    )
    .map_err(|e| format!("material_add: {e}"))?;
    conn.query_row(
        &format!("{MATERIAL_SELECT} WHERE id=?1"),
        params![id],
        material_from_row,
    )
    .map_err(|e| format!("material_add lesen: {e}"))
}

pub(crate) fn material_list_impl(
    conn: &Connection,
    einsatz_id: &str,
) -> Result<Vec<MaterialRecord>, String> {
    let mut stmt = conn
        .prepare(&format!(
            "{MATERIAL_SELECT} WHERE einsatz_id=?1 ORDER BY sort_order ASC, id ASC"
        ))
        .map_err(|e| format!("material_list prepare: {e}"))?;
    let rows = stmt
        .query_map(params![einsatz_id], material_from_row)
        .map_err(|e| format!("material_list query: {e}"))?;
    rows.map(|r| r.map_err(|e| format!("material_list row: {e}")))
        .collect()
}

/// Löscht die Anlagenzeile und gibt den Ablagepfad zurück, damit die Oberfläche
/// die Datei selbst in den Papierkorb geben kann. Die Datei wird hier bewusst
/// **nicht** gelöscht - sie könnte eine abgelegte Kopie einer Unterlage sein,
/// die auch woanders gebraucht wird.
pub(crate) fn material_delete_impl(
    conn: &Connection,
    id: &str,
) -> Result<Option<String>, String> {
    let pfad: Option<Option<String>> = conn
        .query_row(
            "SELECT ablage_pfad FROM stundenmaterial WHERE id=?1",
            params![id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| format!("material_delete lesen: {e}"))?;
    conn.execute("DELETE FROM stundenmaterial WHERE id=?1", params![id])
        .map_err(|e| format!("material_delete: {e}"))?;
    Ok(pfad.flatten())
}

// ── Einplanen ────────────────────────────────────────────────────────────────

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Planungsvorgang {
    pub raster_id: String,
    pub datum: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EinplanErgebnis {
    pub angelegt: Vec<String>,
    /// Bereits vorhandene Stunden – damit ein zweiter Klick nicht dupliziert.
    pub uebersprungen: Vec<String>,
    /// Rasterzeilen ohne Klasse, die **nicht** eingeplant wurden. Eine Stunde
    /// ohne Klasse taucht sonst als "ohne Klasse" im Kalender auf und landet in
    /// der Anstehend-Liste, wo niemand sie zuordnen kann. Die Zeile selbst
    /// bleibt im Raster - sie ist eine Freistunde, keine Aufsicht über eine Klasse.
    pub ohne_klasse: usize,
}

/// Macht aus Rasterzeilen einzelne Stunden. Idempotent: existiert für
/// (raster_id, datum) schon eine Stunde, wird sie übersprungen statt dupliziert.
///
/// Schreibt bewusst **keine** Kalenderdaten - es materialisiert nur, was die
/// Lehrkraft sieht. Ferien, Feiertage und Pausen entscheidet die Oberfläche und
/// filtert sie vor dem Aufruf heraus. Rasterzeilen ohne Klasse werden hier
/// übersprungen, damit dieser eine Ort für die Regel genügt.
pub(crate) fn woche_einplanen_impl(
    conn: &Connection,
    vorgaenge: Vec<Planungsvorgang>,
) -> Result<EinplanErgebnis, String> {
    let mut angelegt: Vec<String> = Vec::new();
    let mut uebersprungen: Vec<String> = Vec::new();
    let mut ohne_klasse = 0usize;
    for vorgang in vorgaenge {
        // Rasterzeile holen; ist sie inzwischen gelöscht, wird der Vorgang
        // stillschweigend übersprungen statt einen Fehler auszulösen.
        let slot: Option<(Option<String>, String, String)> = conn
            .query_row(
                "SELECT klasse_id, start_zeit, ende_zeit FROM stundenraster
                  WHERE id=?1 AND aktiv=1",
                params![vorgang.raster_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .optional()
            .map_err(|e| format!("woche_einplanen Raster lesen: {e}"))?;
        let Some((klasse_id, start_zeit, ende_zeit)) = slot else {
            continue;
        };
        let Some(ref kid) = klasse_id else {
            // Ohne Klasse: stehen lassen, aber nicht zu einer Stunde machen.
            ohne_klasse += 1;
            continue;
        };
        let klasse_name: String = conn
            .query_row("SELECT name FROM lua_klassen WHERE id=?1", params![kid], |r| {
                r.get(0)
            })
            .optional()
            .map_err(|e| format!("woche_einplanen Klasse lesen: {e}"))?
            .unwrap_or_default();
        let bezeichnung: String = conn
            .query_row(
                "SELECT bezeichnung FROM stundenraster WHERE id=?1",
                params![vorgang.raster_id],
                |r| r.get(0),
            )
            .map_err(|e| format!("woche_einplanen Bezeichnung lesen: {e}"))?;

        let schon_da: Option<String> = conn
            .query_row(
                "SELECT id FROM unterrichtseinsatz WHERE raster_id=?1 AND geplant_am=?2",
                params![vorgang.raster_id, vorgang.datum],
                |r| r.get(0),
            )
            .optional()
            .map_err(|e| format!("woche_einplanen Duplikat prüfen: {e}"))?;
        if let Some(id) = schon_da {
            uebersprungen.push(id);
            continue;
        }

        let id = Uuid::new_v4().to_string();
        let now = now_string();
        conn.execute(
            "INSERT INTO unterrichtseinsatz
               (id, material_id, klasse_id, klasse_name_snapshot, titel_snapshot,
                status, einsatz_art, geplant_am, lernziele_snapshot, notiz,
                created_at, updated_at, start_zeit, ende_zeit, raster_id)
             VALUES (?1, NULL, ?2, ?3, ?4, 'geplant', 'nur_geplant',
                     ?5, '[]', '', ?6, ?6, ?7, ?8, ?9)",
            params![
                id,
                klasse_id,
                klasse_name,
                bezeichnung,
                vorgang.datum,
                now,
                start_zeit,
                ende_zeit,
                vorgang.raster_id,
            ],
        )
        .map_err(|e| format!("woche_einplanen: {e}"))?;
        angelegt.push(id);
    }
    Ok(EinplanErgebnis { angelegt, uebersprungen, ohne_klasse })
}

// ── Ferien und schulinterne Pausen ───────────────────────────────────────────

/// Prüft ein Datum streng: Format `YYYY-MM-DD` **und** ein realer Kalendertag.
/// Nur die Form zu prüfen würde den 31. Februar durchlassen, und der taucht
/// dann im Monatsraster an einer Stelle auf, an der es nichts gibt.
fn pruefe_datum(wert: &str, label: &str) -> Result<(), String> {
    let fehler = || format!("Ungültiges {label} (erwartet JJJJ-MM-TT): {wert}");
    let teile: Vec<&str> = wert.split('-').collect();
    if teile.len() != 3 || teile.iter().any(|t| t.len() != 4 && t.len() != 2) {
        return Err(fehler());
    }
    if !teile.iter().all(|t| t.bytes().all(|b| b.is_ascii_digit()) || t.is_empty()) {
        return Err(fehler());
    }
    let jahr: i32 = teile[0].parse().map_err(|_| fehler())?;
    let monat: u32 = teile[1].parse().map_err(|_| fehler())?;
    let tag: u32 = teile[2].parse().map_err(|_| fehler())?;
    if !(1..=12).contains(&monat) || tag == 0 {
        return Err(fehler());
    }
    let tage_im_monat = match monat {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        // Schaltjahr: durch 4 teilbar, aber nicht durch 100 - außer durch 400.
        2 if jahr % 4 == 0 && (jahr % 100 != 0 || jahr % 400 == 0) => 29,
        2 => 28,
        _ => return Err(fehler()),
    };
    if tag > tage_im_monat {
        return Err(fehler());
    }
    Ok(())
}

#[derive(Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct FerienMeta {
    pub id: Option<String>,
    /// AT-Bundesland 1..9, leer = für alle Regionen.
    pub region: Option<String>,
    pub bezeichnung: Option<String>,
    pub von: String,
    pub bis: String,
    pub schuljahr: Option<i64>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FerienRecord {
    pub id: String,
    pub region: String,
    pub bezeichnung: String,
    pub von: String,
    pub bis: String,
    pub schuljahr: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

const FERIEN_SELECT: &str = "SELECT id, region, bezeichnung, von, bis, schuljahr, \
     created_at, updated_at FROM schulferien";

pub(crate) fn ferien_list_impl(
    conn: &Connection,
    region: Option<String>,
) -> Result<Vec<FerienRecord>, String> {
    let mut sql = format!("{FERIEN_SELECT} WHERE 1=1");
    let mut werte: Vec<String> = Vec::new();
    if let Some(r) = optional_string(region) {
        werte.push(r);
        sql.push_str(&format!(" AND region=?{}", werte.len()));
    }
    sql.push_str(" ORDER BY von ASC, id ASC");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("ferien_list prepare: {e}"))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(werte), |row| {
            Ok(FerienRecord {
                id: row.get(0)?,
                region: row.get(1)?,
                bezeichnung: row.get(2)?,
                von: row.get(3)?,
                bis: row.get(4)?,
                schuljahr: schuljahr_aus_sqlite(row, 5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("ferien_list query: {e}"))?;
    rows.map(|r| r.map_err(|e| format!("ferien_list row: {e}")))
        .collect()
}

pub(crate) fn ferien_upsert_impl(
    conn: &Connection,
    meta: FerienMeta,
) -> Result<FerienRecord, String> {
    pruefe_datum(&meta.von, "Ferienbeginn")?;
    pruefe_datum(&meta.bis, "Ferienende")?;
    if meta.bis < meta.von {
        return Err("Das Ferienende darf nicht vor dem Beginn liegen.".to_string());
    }
    let bezeichnung = optional_string(meta.bezeichnung)
        .ok_or_else(|| "Der Ferienblock braucht eine Bezeichnung.".to_string())?;
    let id = optional_string(meta.id).unwrap_or_else(|| Uuid::new_v4().to_string());
    let region = optional_string(meta.region).unwrap_or_default();
    let now = now_string();
    conn.execute(
        "INSERT INTO schulferien (id, region, bezeichnung, von, bis, schuljahr, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
         ON CONFLICT(id) DO UPDATE SET
           region=excluded.region, bezeichnung=excluded.bezeichnung,
           von=excluded.von, bis=excluded.bis, schuljahr=excluded.schuljahr,
           updated_at=excluded.updated_at",
        params![id, region, bezeichnung, meta.von, meta.bis, meta.schuljahr, now],
    )
    .map_err(|e| format!("ferien_upsert: {e}"))?;
    conn.query_row(
        &format!("{FERIEN_SELECT} WHERE id=?1"),
        params![id],
        |row| {
            Ok(FerienRecord {
                id: row.get(0)?,
                region: row.get(1)?,
                bezeichnung: row.get(2)?,
                von: row.get(3)?,
                bis: row.get(4)?,
                schuljahr: schuljahr_aus_sqlite(row, 5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| format!("ferien_upsert lesen: {e}"))
}

pub(crate) fn ferien_delete_impl(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM schulferien WHERE id=?1", params![id])
        .map_err(|e| format!("ferien_delete: {e}"))?;
    Ok(())
}

/// Schreibt einen ganzen Ferienblock für ein Bundesland und Schuljahr.
///
///  Ersetzt dabei die bisherigen Zeilen **dieses** Bundeslandes und Jahres: eine
///  Verordnung gilt als Ganzes, und ein zweites Nachladen darf nicht zwei
///  konkurrierende Blöcke hinterlassen.
pub(crate) fn ferien_seed_impl(
    conn: &Connection,
    region: &str,
    schuljahr: i64,
    eintraege: &[(String, String, String)],
) -> Result<usize, String> {
    for (bezeichnung, von, bis) in eintraege {
        pruefe_datum(von, "Ferienbeginn")?;
        pruefe_datum(bis, "Ferienende")?;
        if bis < von {
            return Err(format!("Ferienblock [{}] hat das Ende vor dem Beginn.", bezeichnung));
        }
    }
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("ferien_seed Transaktion: {e}"))?;
    tx.execute(
        "DELETE FROM schulferien WHERE region=?1 AND schuljahr=?2",
        params![region, schuljahr],
    )
    .map_err(|e| format!("ferien_seed alte Blöcke entfernen: {e}"))?;
    let now = now_string();
    for (bezeichnung, von, bis) in eintraege {
        tx.execute(
            "INSERT INTO schulferien (id, region, bezeichnung, von, bis, schuljahr, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
            params![Uuid::new_v4().to_string(), region, bezeichnung, von, bis, schuljahr, now],
        )
        .map_err(|e| format!("ferien_seed: {e}"))?;
    }
    tx.commit().map_err(|e| format!("ferien_seed abschließen: {e}"))?;
    Ok(eintraege.len())
}

#[derive(Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct PauseMeta {
    pub id: Option<String>,
    pub bezeichnung: Option<String>,
    pub datum: String,
    /// Leer = die ganze Schule, sonst nur diese Klasse.
    pub klasse_name: Option<String>,
    pub notiz: Option<String>,
    pub schuljahr: Option<i64>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PauseRecord {
    pub id: String,
    pub bezeichnung: String,
    pub datum: String,
    pub klasse_name: String,
    pub notiz: String,
    pub schuljahr: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

const PAUSE_SELECT: &str = "SELECT id, bezeichnung, datum, klasse_name, notiz, \
     schuljahr, created_at, updated_at FROM schulpause";

fn pause_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<PauseRecord> {
    Ok(PauseRecord {
        id: row.get(0)?,
        bezeichnung: row.get(1)?,
        datum: row.get(2)?,
        klasse_name: row.get(3)?,
        notiz: row.get(4)?,
        schuljahr: schuljahr_aus_sqlite(row, 5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

pub(crate) fn pause_list_impl(
    conn: &Connection,
    von: Option<String>,
    bis: Option<String>,
) -> Result<Vec<PauseRecord>, String> {
    let mut sql = format!("{PAUSE_SELECT} WHERE 1=1");
    let mut werte: Vec<String> = Vec::new();
    // Die Parameter heißen absichtlich `von`/`bis`, die Spalte heißt `datum` -
    // deshalb wird der Vergleich ausdrücklich gebaut statt aus dem Namen
    // abgeleitet.
    if let Some(w) = optional_string(von) {
        pruefe_datum(&w, "Zeitraum von")?;
        werte.push(w);
        sql.push_str(&format!(" AND datum>=?{}", werte.len()));
    }
    if let Some(w) = optional_string(bis) {
        pruefe_datum(&w, "Zeitraum bis")?;
        werte.push(w);
        sql.push_str(&format!(" AND datum<=?{}", werte.len()));
    }
    sql.push_str(" ORDER BY datum ASC, id ASC");
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("pause_list prepare: {e}"))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(werte), pause_from_row)
        .map_err(|e| format!("pause_list query: {e}"))?;
    rows.map(|r| r.map_err(|e| format!("pause_list row: {e}")))
        .collect()
}

pub(crate) fn pause_upsert_impl(
    conn: &Connection,
    meta: PauseMeta,
) -> Result<PauseRecord, String> {
    pruefe_datum(&meta.datum, "Pausentag")?;
    let bezeichnung = optional_string(meta.bezeichnung)
        .ok_or_else(|| "Die Pause braucht eine Bezeichnung.".to_string())?;
    let id = optional_string(meta.id).unwrap_or_else(|| Uuid::new_v4().to_string());
    let klasse_name = optional_string(meta.klasse_name).unwrap_or_default();
    let now = now_string();
    conn.execute(
        "INSERT INTO schulpause (id, bezeichnung, datum, klasse_name, notiz, schuljahr, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
         ON CONFLICT(id) DO UPDATE SET
           bezeichnung=excluded.bezeichnung, datum=excluded.datum,
           klasse_name=excluded.klasse_name, notiz=excluded.notiz,
           schuljahr=excluded.schuljahr, updated_at=excluded.updated_at",
        params![
            id,
            bezeichnung,
            meta.datum,
            klasse_name,
            meta.notiz.unwrap_or_default(),
            meta.schuljahr,
            now
        ],
    )
    .map_err(|e| format!("pause_upsert: {e}"))?;
    conn.query_row(
        &format!("{PAUSE_SELECT} WHERE id=?1"),
        params![id],
        pause_from_row,
    )
    .map_err(|e| format!("pause_upsert lesen: {e}"))
}

pub(crate) fn pause_delete_impl(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM schulpause WHERE id=?1", params![id])
        .map_err(|e| format!("pause_delete: {e}"))?;
    Ok(())
}


// ── Tauri-Commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub async fn raster_list(
    state: tauri::State<'_, DbState>,
    klasse_id: Option<String>,
) -> Result<Vec<RasterRecord>, String> {
    let guard = state.conn()?;
    raster_list_impl(&guard, klasse_id)
}

#[tauri::command]
pub async fn raster_upsert(
    state: tauri::State<'_, DbState>,
    meta: RasterMeta,
) -> Result<RasterRecord, String> {
    let guard = state.conn()?;
    raster_upsert_impl(&guard, meta)
}

#[tauri::command]
pub async fn raster_delete(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let guard = state.conn()?;
    raster_delete_impl(&guard, &id)
}

#[tauri::command]
pub async fn raster_uebernehmen(
    state: tauri::State<'_, DbState>,
    von_schuljahr: Option<i64>,
    nach_schuljahr: i64,
) -> Result<usize, String> {
    let guard = state.conn()?;
    raster_uebernehmen_impl(&guard, von_schuljahr, nach_schuljahr)
}

#[tauri::command]
pub async fn ferien_list(
    state: tauri::State<'_, DbState>,
    region: Option<String>,
) -> Result<Vec<FerienRecord>, String> {
    let guard = state.conn()?;
    ferien_list_impl(&guard, region)
}

#[tauri::command]
pub async fn ferien_upsert(
    state: tauri::State<'_, DbState>,
    meta: FerienMeta,
) -> Result<FerienRecord, String> {
    let guard = state.conn()?;
    ferien_upsert_impl(&guard, meta)
}

#[tauri::command]
pub async fn ferien_delete(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let guard = state.conn()?;
    ferien_delete_impl(&guard, &id)
}

#[tauri::command]
pub async fn ferien_seed(
    state: tauri::State<'_, DbState>,
    region: String,
    schuljahr: i64,
    eintraege: Vec<(String, String, String)>,
) -> Result<usize, String> {
    let guard = state.conn()?;
    ferien_seed_impl(&guard, &region, schuljahr, &eintraege)
}

#[tauri::command]
pub async fn pause_list(
    state: tauri::State<'_, DbState>,
    von: Option<String>,
    bis: Option<String>,
) -> Result<Vec<PauseRecord>, String> {
    let guard = state.conn()?;
    pause_list_impl(&guard, von, bis)
}

#[tauri::command]
pub async fn pause_upsert(
    state: tauri::State<'_, DbState>,
    meta: PauseMeta,
) -> Result<PauseRecord, String> {
    let guard = state.conn()?;
    pause_upsert_impl(&guard, meta)
}

#[tauri::command]
pub async fn pause_delete(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let guard = state.conn()?;
    pause_delete_impl(&guard, &id)
}

#[tauri::command]
pub async fn material_list(
    state: tauri::State<'_, DbState>,
    einsatz_id: String,
) -> Result<Vec<MaterialRecord>, String> {
    let guard = state.conn()?;
    material_list_impl(&guard, &einsatz_id)
}

#[tauri::command]
pub async fn material_add(
    state: tauri::State<'_, DbState>,
    meta: MaterialMeta,
) -> Result<MaterialRecord, String> {
    let guard = state.conn()?;
    material_add_impl(&guard, meta)
}

#[tauri::command]
pub async fn material_delete(
    state: tauri::State<'_, DbState>,
    id: String,
) -> Result<Option<String>, String> {
    let guard = state.conn()?;
    material_delete_impl(&guard, &id)
}

#[tauri::command]
pub async fn ablage_pfad() -> Result<String, String> {
    Ok(ablage_ordner()?.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn woche_einplanen(
    state: tauri::State<'_, DbState>,
    vorgaenge: Vec<Planungsvorgang>,
) -> Result<EinplanErgebnis, String> {
    let guard = state.conn()?;
    woche_einplanen_impl(&guard, vorgaenge)
}

/// Die im Zeitraum geplanten Stunden. Läuft über `einsatz_list_impl`, damit
/// Sortierung und Materialzählung mit der Einsatzliste identisch bleiben.
#[tauri::command]
pub async fn planung_stunden(
    state: tauri::State<'_, DbState>,
    datum_von: Option<String>,
    datum_bis: Option<String>,
    klasse_id: Option<String>,
) -> Result<Vec<super::einsatz::EinsatzRecord>, String> {
    let guard = state.conn()?;
    super::einsatz::einsatz_list_impl(
        &guard,
        Some(super::einsatz::EinsatzFilter {
            klasse_id,
            material_id: None,
            datum_von,
            datum_bis,
            sortierung: Some("datum".to_string()),
        }),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        // `init_schema` statt Roh-Schema: die Anlagen-Tabelle und die
        // Planungs-Spalten entstehen genau so auch in der echten Anwendung.
        crate::db::init_schema(&conn).unwrap();
        conn.execute("INSERT INTO lua_klassen (id, name) VALUES ('k-6b', '6b')", [])
            .unwrap();
        conn
    }

    /// Ein Wochenraster, wie es eine Datenbank aus der Zeit vor dem
    /// Schuljahresbezug hat: Tabelle vorhanden, Spalte `schuljahr` fehlt.
    ///
    ///  Das ist der Zustand, den kein `setup()` hier erzeugen kann - dort legt
    ///  `init_schema` die Tabelle frisch mit INTEGER an. Genau darum ist der
    ///  Fehler durch die vorhandenen Tests nicht aufgefallen.
    fn setup_legacy_ohne_schuljahr() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "PRAGMA foreign_keys=ON;
             CREATE TABLE lua_klassen (id TEXT, name TEXT PRIMARY KEY, farbe TEXT);
             CREATE TABLE stundenraster (
                 id TEXT PRIMARY KEY, klasse_id TEXT, klasse_name_snapshot TEXT,
                 wochentag INTEGER NOT NULL, start_zeit TEXT, ende_zeit TEXT,
                 bezeichnung TEXT, aktiv INTEGER NOT NULL DEFAULT 1,
                 created_at TEXT, updated_at TEXT);",
        )
        .unwrap();
        conn.execute("INSERT INTO lua_klassen (id, name) VALUES ('k-6b', '6b')", [])
            .unwrap();
        conn
    }

    /// Dieselbe Datenbank, aber mit der **falschen** Spalte: so hat es die
    /// fehlerhafte Migration hinterlassen, TEXT statt INTEGER. Dafür gibt es
    /// keinen Reparaturweg per ALTER - deshalb der tolerante Leser.
    fn setup_mit_text_affinitaet() -> Connection {
        let conn = setup_legacy_ohne_schuljahr();
        conn.execute_batch("ALTER TABLE stundenraster ADD COLUMN schuljahr TEXT;")
            .unwrap();
        conn
    }

    fn vorgang(raster_id: &str, datum: &str) -> Planungsvorgang {
        Planungsvorgang { raster_id: raster_id.into(), datum: datum.into() }
    }

    fn ferie(conn: &Connection, region: &str, name: &str, von: &str, bis: &str) -> String {
        ferien_upsert_impl(
            conn,
            FerienMeta {
                region: Some(region.into()),
                bezeichnung: Some(name.into()),
                von: von.into(),
                bis: bis.into(),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap()
        .id
    }


    // ── Bestandsdatenbank mit TEXT-Affinität in schuljahr ──────────────────────
    //
    // Regression: `migrate_planung_jahresbezug` hat `schuljahr` als TEXT
    // ergänzt, das Schema legt es als INTEGER an. SQLite wandelt daraufhin jede
    // geschriebene Zahl in Text, und `row.get::<_, Option<i64>>` scheiterte an
    // `Invalid column type` - Rasterlisten und das Speichern waren auf jeder
    // betroffenen Datenbank tot.

    #[test]
    fn raster_lesen_vertraegt_text_affinitaet_von_schuljahr() {
        let conn = setup_mit_text_affinitaet();
        conn.execute_batch(
            "INSERT INTO stundenraster
               (id, klasse_id, klasse_name_snapshot, wochentag, start_zeit, ende_zeit,
                bezeichnung, aktiv, created_at, updated_at, schuljahr)
             VALUES ('r1', 'k-6b', '6b', 1, '08:00', '08:45', 'Deutsch', 1, '', '', 2026);",
        )
        .unwrap();

        let typ: String = conn
            .query_row("SELECT typeof(schuljahr) FROM stundenraster", [], |r| r.get(0))
            .unwrap();
        assert_eq!(typ, "text", "Vorbedingung: die Spalte hat TEXT-Affinität");

        let liste = raster_list_impl(&conn, None).expect("Bestandsdatenbank muss lesbar sein");
        assert_eq!(liste.len(), 1);
        assert_eq!(liste[0].schuljahr, Some(2026));
    }

    #[test]
    fn raster_speichern_vertraegt_text_affinitaet_von_schuljahr() {
        let conn = setup_mit_text_affinitaet();
        // Genau der Ablauf, der beim Anwender mit "gespeichert, aber nichts
        // geschehen" endete: schreiben und danach den Datensatz lesen.
        let gespeichert = raster_upsert_impl(
            &conn,
            RasterMeta {
                klasse_id: Some("k-6b".into()),
                wochentag: 2,
                start_zeit: Some("10:00".into()),
                ende_zeit: Some("10:45".into()),
                bezeichnung: Some("Mathe".into()),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .expect("Speichern darf an der Schuljahresspalte nicht scheitern");
        assert_eq!(gespeichert.schuljahr, Some(2026));
    }

    #[test]
    fn schuljahr_null_bleibt_null() {
        let conn = setup_mit_text_affinitaet();
        conn.execute_batch(
            "INSERT INTO stundenraster
               (id, klasse_id, klasse_name_snapshot, wochentag, start_zeit, ende_zeit,
                bezeichnung, aktiv, created_at, updated_at, schuljahr)
             VALUES ('r1', 'k-6b', '6b', 1, '', '', '', 1, '', '', NULL);",
        )
        .unwrap();
        assert_eq!(raster_list_impl(&conn, None).unwrap()[0].schuljahr, None);
    }

    #[test]
    fn schuljahr_mit_leerzeichen_wird_gelesen() {
        let conn = setup_mit_text_affinitaet();
        conn.execute_batch(
            "INSERT INTO stundenraster
               (id, klasse_id, klasse_name_snapshot, wochentag, start_zeit, ende_zeit,
                bezeichnung, aktiv, created_at, updated_at, schuljahr)
             VALUES ('r1', 'k-6b', '6b', 1, '', '', '', 1, '', '', ' 2027 ');",
        )
        .unwrap();
        assert_eq!(raster_list_impl(&conn, None).unwrap()[0].schuljahr, Some(2027));
    }

    #[test]
    fn schuljahr_muell_wird_nicht_stillschweigend_zu_null() {
        // Ein unlesbarer Wert darf nicht als "kein Schuljahr" durchgehen: das
        // würde einen Raster-Slot still aus jedem Schuljahresfilter fallen
        // lassen. Lieber ein klarer Fehler.
        let conn = setup_mit_text_affinitaet();
        conn.execute_batch(
            "INSERT INTO stundenraster
               (id, klasse_id, klasse_name_snapshot, wochentag, start_zeit, ende_zeit,
                bezeichnung, aktiv, created_at, updated_at, schuljahr)
             VALUES ('r1', 'k-6b', '6b', 1, '', '', '', 1, '', '', 'zweites Halbjahr');",
        )
        .unwrap();
        let fehler = raster_list_impl(&conn, None)
            .err()
            .expect("Unsinniger Schuljahrwert muss als Fehler auffallen");
        assert!(
            fehler.contains("schuljahr") || fehler.contains("Invalid column type"),
            "erwartet eine meldbare Fehlermeldung, bekam: {fehler}"
        );
    }

    #[test]
    fn migration_legt_schuljahr_als_integer_an() {
        // Alt-Datenbank: Tabelle ohne `schuljahr`. `init_schema` ergänzt sie -
        // und zwar als INTEGER, weil das Schema sie als INTEGER anlegt. Mit TEXT
        // war jede geschriebene Zahl unlesbar.
        let alt = setup_legacy_ohne_schuljahr();
        crate::db::init_schema(&alt).unwrap();
        let mut stmt = alt.prepare("PRAGMA table_info(stundenraster)").unwrap();
        let spalten: Vec<String> = stmt
            .query_map([], |r| {
                let name: String = r.get(1)?;
                let typ: String = r.get(2)?;
                Ok(format!("{name}:{typ}"))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        let schuljahr = spalten
            .iter()
            .find(|s| s.starts_with("schuljahr:"))
            .expect("Spalte schuljahr muss vorhanden sein");
        assert_eq!(
            schuljahr, "schuljahr:INTEGER",
            "eine frisch migrierte Spalte muss INTEGER sein, nicht TEXT"
        );
    }

    // ── Wochenraster ──────────────────────────────────────────────────────────

    #[test]
    fn raster_anlegen_und_lesen() {
        let conn = setup();
        let slot = raster_upsert_impl(
            &conn,
            RasterMeta {
                klasse_id: Some("k-6b".into()),
                wochentag: 1,
                start_zeit: Some("8:00".into()),
                ende_zeit: Some("8:45".into()),
                bezeichnung: Some("Deutsch".into()),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();
        // Uhrzeiten werden auf HH:MM normalisiert.
        assert_eq!(slot.start_zeit, "08:00");
        assert_eq!(slot.klasse_name_snapshot, "6b");
        assert_eq!(slot.aktiv, true);
        assert_eq!(raster_list_impl(&conn, None).unwrap().len(), 1);
    }

    #[test]
    fn raster_lehnt_unsinnige_werte_ab() {
        let conn = setup();
        let zu_laut = RasterMeta {
            klasse_id: Some("k-6b".into()),
            wochentag: 0,
            start_zeit: Some("08:00".into()),
            ende_zeit: Some("08:45".into()),
            ..Default::default()
        };
        assert!(raster_upsert_impl(&conn, zu_laut).is_err());

        let falsche_zeit = RasterMeta {
            klasse_id: Some("k-6b".into()),
            wochentag: 1,
            start_zeit: Some("8:70".into()),
            ende_zeit: Some("09:00".into()),
            ..Default::default()
        };
        assert!(raster_upsert_impl(&conn, falsche_zeit).is_err());

        let ende_zu_frueh = RasterMeta {
            klasse_id: Some("k-6b".into()),
            wochentag: 1,
            start_zeit: Some("10:00".into()),
            ende_zeit: Some("09:00".into()),
            ..Default::default()
        };
        assert!(raster_upsert_impl(&conn, ende_zu_frueh).is_err());

        let unbekannte_klasse = RasterMeta {
            klasse_id: Some("gibtsnicht".into()),
            wochentag: 1,
            start_zeit: Some("08:00".into()),
            ende_zeit: Some("08:45".into()),
            ..Default::default()
        };
        assert!(raster_upsert_impl(&conn, unbekannte_klasse).is_err());
    }

    #[test]
    fn raster_deaktivieren_bleibt_erhalten() {
        let conn = setup();
        let slot = raster_upsert_impl(
            &conn,
            RasterMeta {
                klasse_id: Some("k-6b".into()),
                wochentag: 3,
                start_zeit: Some("08:00".into()),
                ende_zeit: Some("08:45".into()),
                aktiv: Some(0),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(slot.aktiv, false);
        // Deaktiviert heißt nicht gelöscht - die Zeile ist noch da.
        assert_eq!(raster_list_impl(&conn, None).unwrap().len(), 1);
    }

    #[test]
    fn raster_uebernehmen_ist_wiederholbar() {
        let conn = setup();
        raster_upsert_impl(
            &conn,
            RasterMeta {
                klasse_id: Some("k-6b".into()),
                wochentag: 1,
                start_zeit: Some("08:00".into()),
                ende_zeit: Some("08:45".into()),
                bezeichnung: Some("Deutsch".into()),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();

        assert_eq!(raster_uebernehmen_impl(&conn, Some(2026), 2027).unwrap(), 1);
        // Zweiter Versuch darf nichts duplizieren.
        assert_eq!(raster_uebernehmen_impl(&conn, Some(2026), 2027).unwrap(), 0);

        let ziel: Vec<RasterRecord> = raster_list_impl(&conn, None)
            .unwrap()
            .into_iter()
            .filter(|r| r.schuljahr == Some(2027))
            .collect();
        assert_eq!(ziel.len(), 1);
        assert_eq!(ziel[0].start_zeit, "08:00", "die Uhrzeit wandert mit");
        assert_eq!(ziel[0].klasse_name_snapshot, "6b");
    }

    #[test]
    fn raster_uebernehmen_aus_altbestand_ohne_jahr() {
        let conn = setup();
        // Slot ohne Schuljahr, wie ihn eine Datenbank aus der Zeit vor dem
        // Schuljahresbezug hat.
        conn.execute(
            "INSERT INTO stundenraster
               (id, klasse_id, klasse_name_snapshot, wochentag, start_zeit, ende_zeit,
                bezeichnung, schuljahr, aktiv, created_at, updated_at)
             VALUES ('r-alt', 'k-6b', '6b', 4, '07:30', '08:15', 'Turnen', NULL, 1, '', '')",
            [],
        )
        .unwrap();
        assert_eq!(raster_uebernehmen_impl(&conn, None, 2026).unwrap(), 1);
        let neu = raster_list_impl(&conn, None)
            .unwrap()
            .into_iter()
            .find(|r| r.schuljahr == Some(2026))
            .expect("kopierte Zeile");
        assert_ne!(neu.id, "r-alt", "das Ziel bekommt eigene Zeilen");
        assert_eq!(neu.bezeichnung, "Turnen");
    }

    // ── Einplanen ─────────────────────────────────────────────────────────────

    #[test]
    fn einplanen_legt_eine_stunde_pro_rasterzeile_an() {
        let conn = setup();
        raster_upsert_impl(
            &conn,
            RasterMeta {
                id: Some("r1".into()),
                klasse_id: Some("k-6b".into()),
                wochentag: 1,
                start_zeit: Some("08:00".into()),
                ende_zeit: Some("08:45".into()),
                bezeichnung: Some("Deutsch".into()),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();
        let ergebnis = woche_einplanen_impl(&conn, vec![vorgang("r1", "2026-09-07")]).unwrap();
        assert_eq!(ergebnis.angelegt.len(), 1);
        assert!(ergebnis.uebersprungen.is_empty());

        let stunden = super::super::einsatz::einsatz_list_impl(&conn, None).unwrap();
        assert_eq!(stunden.len(), 1);
        assert_eq!(stunden[0].klasse_name_snapshot, "6b");
        assert_eq!(stunden[0].titel_snapshot, "Deutsch");
        assert_eq!(stunden[0].status, "geplant");
        assert_eq!(stunden[0].einsatz_art, "nur_geplant");
        assert_eq!(stunden[0].geplant_am.as_deref(), Some("2026-09-07"));
        assert_eq!(stunden[0].anzahl_materialien, 0);
    }

    #[test]
    fn einplanen_uebernimmt_beide_uhrzeiten_aus_dem_raster() {
        // Regression: das INSERT hatte für start_zeit und ende_zeit denselben
        // Platzhalter (?7, ?7). Damit bekam jede geplante Stunde die Endzeit der
        // Startzeit - in der Oberfläche stand "08:00 bis 08:00".
        let conn = setup();
        raster_upsert_impl(
            &conn,
            RasterMeta {
                id: Some("r1".into()),
                klasse_id: Some("k-6b".into()),
                wochentag: 1,
                start_zeit: Some("08:00".into()),
                ende_zeit: Some("09:30".into()),
                bezeichnung: Some("Deutsch".into()),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();
        woche_einplanen_impl(&conn, vec![vorgang("r1", "2026-09-07")]).unwrap();
        let stunden = super::super::einsatz::einsatz_list_impl(&conn, None).unwrap();
        assert_eq!(stunden[0].start_zeit.as_deref(), Some("08:00"));
        assert_eq!(stunden[0].ende_zeit.as_deref(), Some("09:30"));
    }

    #[test]
    fn zweites_einplanen_erzeugt_keine_dublette() {
        let conn = setup();
        raster_upsert_impl(
            &conn,
            RasterMeta {
                id: Some("r1".into()),
                klasse_id: Some("k-6b".into()),
                wochentag: 1,
                start_zeit: Some("08:00".into()),
                ende_zeit: Some("08:45".into()),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();
        let erste = woche_einplanen_impl(&conn, vec![vorgang("r1", "2026-09-07")]).unwrap();
        let zweite = woche_einplanen_impl(&conn, vec![vorgang("r1", "2026-09-07")]).unwrap();
        assert_eq!(erste.angelegt.len(), 1);
        assert!(zweite.angelegt.is_empty(), "kein zweites Anlegen");
        assert_eq!(zweite.uebersprungen.len(), 1, "aber als bereits geplant melden");
        assert_eq!(super::super::einsatz::einsatz_list_impl(&conn, None).unwrap().len(), 1);
    }

    #[test]
    fn einplanen_ueberspringt_geloeschte_rasterzeilen() {
        let conn = setup();
        // Rasterzeile existiert nicht (mehr) - das darf keinen Fehler geben,
        // sondern wird stillschweigend übersprungen.
        let ergebnis = woche_einplanen_impl(&conn, vec![vorgang("weg", "2026-09-07")]).unwrap();
        assert!(ergebnis.angelegt.is_empty());
        assert!(ergebnis.uebersprungen.is_empty());
    }

    #[test]
    fn einplanen_ignoriert_deaktivierte_rasterzeilen() {
        let conn = setup();
        raster_upsert_impl(
            &conn,
            RasterMeta {
                id: Some("r1".into()),
                klasse_id: Some("k-6b".into()),
                wochentag: 1,
                start_zeit: Some("08:00".into()),
                ende_zeit: Some("08:45".into()),
                aktiv: Some(0),
                ..Default::default()
            },
        )
        .unwrap();
        let ergebnis = woche_einplanen_impl(&conn, vec![vorgang("r1", "2026-09-07")]).unwrap();
        assert!(ergebnis.angelegt.is_empty());
    }

    #[test]
    fn einplanen_ueberspringt_rasterzeilen_ohne_klasse() {
        // Eine Rasterzeile ohne Klasse ist eine Freistunde - sie bleibt im Raster,
        // erzeugt aber keine Stunde. Sonst steht "ohne Klasse" im Kalender.
        let conn = setup();
        let ohne = raster_upsert_impl(
            &conn,
            RasterMeta {
                id: Some("r-ohne".into()),
                klasse_id: None,
                klasse_name_snapshot: Some("Englisch".into()),
                wochentag: 1,
                start_zeit: Some("11:00".into()),
                ende_zeit: Some("14:00".into()),
                bezeichnung: Some("Englisch".into()),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(ohne.klasse_id.is_none());

        let ergebnis = woche_einplanen_impl(&conn, vec![vorgang("r-ohne", "2026-09-07")]).unwrap();
        assert!(ergebnis.angelegt.is_empty(), "keine Stunde ohne Klasse");
        assert_eq!(ergebnis.ohne_klasse, 1, "aber gemeldet");
        assert!(
            super::super::einsatz::einsatz_list_impl(&conn, None).unwrap().is_empty(),
            "und nichts in der Einsatzliste"
        );
        // Die Zeile selbst bleibt erhalten.
        assert_eq!(raster_list_impl(&conn, None).unwrap().len(), 1);
    }

    #[test]
    fn einplanen_zaehlt_klassenlose_zeilen_separat() {
        // Der Zähler darf nicht die Skala sprengen, wenn dieselbe Zeile in
        // mehreren Wochen vorkommt - das sind verschiedene Vorgänge.
        let conn = setup();
        raster_upsert_impl(
            &conn,
            RasterMeta {
                id: Some("r-ohne".into()),
                wochentag: 1,
                start_zeit: Some("11:00".into()),
                ende_zeit: Some("12:00".into()),
                ..Default::default()
            },
        )
        .unwrap();
        let ergebnis = woche_einplanen_impl(
            &conn,
            vec![vorgang("r-ohne", "2026-09-07"), vorgang("r-ohne", "2026-09-14")],
        )
        .unwrap();
        assert_eq!(ergebnis.ohne_klasse, 2);
    }

    // ── Anlagen ───────────────────────────────────────────────────────────────

    #[test]
    fn ablage_kopiert_die_datei_und_verschieb_das_original_nicht() {
        let conn = setup();
        let einsatz = super::super::einsatz::einsatz_upsert_impl(
            &conn,
            super::super::einsatz::EinsatzMeta {
                klasse_name_snapshot: Some("6b".into()),
                ..Default::default()
            },
        )
        .unwrap();
        let ordner = std::env::temp_dir().join(format!("luka-ablage-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&ordner).unwrap();
        let quelle = ordner.join("Arbeitsblatt.pdf");
        std::fs::write(&quelle, b"%PDF-1.4 test").unwrap();

        let anlage = material_add_impl(
            &conn,
            MaterialMeta {
                einsatz_id: einsatz.id.clone(),
                art: "ablage".into(),
                quelle_pfad: Some(quelle.to_string_lossy().to_string()),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(quelle.is_file(), "das Original bleibt liegen");
        let pfad = anlage.ablage_pfad.clone().unwrap();
        assert!(Path::new(&pfad).is_file(), "die Kopie liegt in der Ablage");
        assert_ne!(pfad, quelle.to_string_lossy().to_string());
        assert!(anlage.datei_vorhanden);

        // Datei von Hand weg -> die Oberfläche muss das melden können.
        std::fs::remove_file(&pfad).unwrap();
        let neu = material_list_impl(&conn, &einsatz.id).unwrap();
        assert_eq!(neu.len(), 1);
        assert!(!neu[0].datei_vorhanden, "fehlende Datei wird erkannt");

        // Anlage löschen meldet den Pfad zurück, löscht die Datei aber nicht.
        let zurueck = material_delete_impl(&conn, &anlage.id).unwrap();
        assert_eq!(zurueck.as_deref(), Some(pfad.as_str()));
        assert!(material_list_impl(&conn, &einsatz.id).unwrap().is_empty());

        std::fs::remove_dir_all(&ordner).ok();
    }

    #[test]
    fn verweis_braucht_ein_ziel() {
        let conn = setup();
        let einsatz = super::super::einsatz::einsatz_upsert_impl(
            &conn,
            super::super::einsatz::EinsatzMeta {
                klasse_name_snapshot: Some("6b".into()),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(material_add_impl(
            &conn,
            MaterialMeta {
                einsatz_id: einsatz.id.clone(),
                art: "verweis".into(),
                ..Default::default()
            },
        )
        .is_err());

        let anlage = material_add_impl(
            &conn,
            MaterialMeta {
                einsatz_id: einsatz.id,
                art: "verweis".into(),
                ziel: Some("C:/Materialien/Lesekreis.pdf".into()),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(anlage.dateiname, "Lesekreis.pdf");
        assert_eq!(anlage.ablage_pfad, None);
    }

    #[test]
    fn anlagen_werden_nach_reihenfolge_sortiert() {
        let conn = setup();
        let einsatz = super::super::einsatz::einsatz_upsert_impl(
            &conn,
            super::super::einsatz::EinsatzMeta {
                klasse_name_snapshot: Some("6b".into()),
                ..Default::default()
            },
        )
        .unwrap();
        for ziel in ["erste.pdf", "zweite.pdf", "dritte.pdf"] {
            material_add_impl(
                &conn,
                MaterialMeta {
                    einsatz_id: einsatz.id.clone(),
                    art: "verweis".into(),
                    ziel: Some(ziel.into()),
                    ..Default::default()
                },
            )
            .unwrap();
        }
        let liste = material_list_impl(&conn, &einsatz.id).unwrap();
        assert_eq!(
            liste.iter().map(|a| a.dateiname.as_str()).collect::<Vec<_>>(),
            vec!["erste.pdf", "zweite.pdf", "dritte.pdf"]
        );
        assert_eq!(liste[0].sort_order, 1);
        assert_eq!(liste[2].sort_order, 3);
    }

    #[test]
    fn anlagenart_muss_gueltig_sein() {
        let conn = setup();
        let einsatz = super::super::einsatz::einsatz_upsert_impl(
            &conn,
            super::super::einsatz::EinsatzMeta {
                klasse_name_snapshot: Some("6b".into()),
                ..Default::default()
            },
        )
        .unwrap();
        assert!(material_add_impl(
            &conn,
            MaterialMeta {
                einsatz_id: einsatz.id,
                art: "download".into(),
                ziel: Some("x".into()),
                ..Default::default()
            },
        )
        .is_err());
    }

    #[test]
    fn materialzahl_steht_in_der_einsatzliste() {
        let conn = setup();
        let einsatz = super::super::einsatz::einsatz_upsert_impl(
            &conn,
            super::super::einsatz::EinsatzMeta {
                klasse_name_snapshot: Some("6b".into()),
                ..Default::default()
            },
        )
        .unwrap();
        for ziel in ["a.pdf", "b.pdf"] {
            material_add_impl(
                &conn,
                MaterialMeta {
                    einsatz_id: einsatz.id.clone(),
                    art: "verweis".into(),
                    ziel: Some(ziel.into()),
                    ..Default::default()
                },
            )
            .unwrap();
        }
        let neu = super::super::einsatz::einsatz_list_impl(&conn, None).unwrap();
        assert_eq!(neu[0].anzahl_materialien, 2);
    }

    // ── Ferien ────────────────────────────────────────────────────────────────

    #[test]
    fn ferien_anlegen_lesen_loeschen() {
        let conn = setup();
        let id = ferie(&conn, "9", "Sommerferien", "2026-07-04", "2026-09-05");
        let wien = ferien_list_impl(&conn, Some("9".into())).unwrap();
        assert_eq!(wien.len(), 1);
        assert_eq!(wien[0].bezeichnung, "Sommerferien");
        assert_eq!(wien[0].schuljahr, Some(2026));
        // Ein anderes Bundesland sieht die Daten nicht.
        assert!(ferien_list_impl(&conn, Some("7".into())).unwrap().is_empty());

        ferien_delete_impl(&conn, &id).unwrap();
        assert!(ferien_list_impl(&conn, None).unwrap().is_empty());
    }

    #[test]
    fn ferien_weisen_unsinnige_daten_zurueck() {
        let conn = setup();
        let monat_13 = FerienMeta {
            region: Some("9".into()),
            bezeichnung: Some("X".into()),
            von: "2027-13-01".into(),
            bis: "2027-13-05".into(),
            ..Default::default()
        };
        assert!(ferien_upsert_impl(&conn, monat_13).is_err());

        let feb_30 = FerienMeta {
            region: Some("9".into()),
            bezeichnung: Some("X".into()),
            von: "2027-02-30".into(),
            bis: "2027-03-05".into(),
            ..Default::default()
        };
        assert!(
            ferien_upsert_impl(&conn, feb_30).is_err(),
            "der 30. Februar existiert nicht"
        );

        let ende_vor_beginn = FerienMeta {
            region: Some("9".into()),
            bezeichnung: Some("X".into()),
            von: "2027-03-05".into(),
            bis: "2027-02-01".into(),
            ..Default::default()
        };
        assert!(ferien_upsert_impl(&conn, ende_vor_beginn).is_err());

        let ohne_bezeichnung = FerienMeta {
            region: Some("9".into()),
            bezeichnung: None,
            von: "2027-03-05".into(),
            bis: "2027-03-10".into(),
            ..Default::default()
        };
        assert!(ferien_upsert_impl(&conn, ohne_bezeichnung).is_err());
    }

    #[test]
    fn schaltjahr_wird_beruecksichtigt() {
        // 2028 ist ein Schaltjahr, 2027 nicht.
        assert!(pruefe_datum("2028-02-29", "Test").is_ok());
        assert!(pruefe_datum("2027-02-29", "Test").is_err());
        // 1900 war kein Schaltjahr, 2000 war eines.
        assert!(pruefe_datum("1900-02-29", "Test").is_err());
        assert!(pruefe_datum("2000-02-29", "Test").is_ok());
    }

    #[test]
    fn seed_ersetzt_die_verordnung_des_jahres() {
        let conn = setup();
        let alt = vec![("Sommerferien".to_string(), "2026-07-01".to_string(), "2026-09-01".to_string())];
        assert_eq!(ferien_seed_impl(&conn, "9", 2026, &alt).unwrap(), 1);

        // Die neue Verordnung gilt als Ganzes: ein zweites Nachladen darf nicht
        // zwei konkurrierende Blöcke hinterlassen.
        let neu = vec![
            ("Sommerferien".to_string(), "2027-07-05".to_string(), "2027-09-05".to_string()),
            ("Herbstferien".to_string(), "2027-10-25".to_string(), "2027-11-05".to_string()),
        ];
        assert_eq!(ferien_seed_impl(&conn, "9", 2026, &neu).unwrap(), 2);

        let liste = ferien_list_impl(&conn, Some("9".into())).unwrap();
        assert_eq!(liste.len(), 2, "kein Block aus der alten Fassung bleibt übrig");
        assert_eq!(liste[0].von, "2027-07-05", "die neue Verordnung gilt");
    }

    #[test]
    fn seed_fasst_unterschiedliche_bundeslaender_nicht_an() {
        let conn = setup();
        let wien = vec![("Sommerferien".to_string(), "2027-07-05".to_string(), "2027-09-05".to_string())];
        let tirol = vec![("Sommerferien".to_string(), "2027-07-10".to_string(), "2027-09-01".to_string())];
        ferien_seed_impl(&conn, "9", 2026, &wien).unwrap();
        ferien_seed_impl(&conn, "7", 2026, &tirol).unwrap();
        let wien = ferien_list_impl(&conn, Some("9".into())).unwrap();
        let tirol = ferien_list_impl(&conn, Some("7".into())).unwrap();
        assert_eq!(wien.len(), 1);
        assert_eq!(tirol.len(), 1);
        assert_eq!(wien[0].von, "2027-07-05");
        assert_eq!(tirol[0].von, "2027-07-10");
    }

    #[test]
    fn seed_weist_unsinnige_daten_zurueck() {
        let conn = setup();
        let kaputt = vec![("X".to_string(), "2027-13-01".to_string(), "2027-13-05".to_string())];
        assert!(ferien_seed_impl(&conn, "9", 2026, &kaputt).is_err());
        // Und es bleibt nichts halb geschrieben zurück.
        assert!(ferien_list_impl(&conn, None).unwrap().is_empty());
    }

    // ── Pausen ────────────────────────────────────────────────────────────────

    #[test]
    fn pause_gilt_ganze_schule_oder_nur_eine_klasse() {
        let conn = setup();
        pause_upsert_impl(
            &conn,
            PauseMeta {
                bezeichnung: Some("MuT".into()),
                datum: "2026-11-12".into(),
                klasse_name: Some("6b".into()),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();
        pause_upsert_impl(
            &conn,
            PauseMeta {
                bezeichnung: Some("Fortbildung".into()),
                datum: "2026-11-13".into(),
                schuljahr: Some(2026),
                ..Default::default()
            },
        )
        .unwrap();
        let liste = pause_list_impl(&conn, None, None).unwrap();
        assert_eq!(liste.len(), 2);
        assert_eq!(liste[0].klasse_name, "6b");
        assert_eq!(liste[1].klasse_name, "", "leer = ganze Schule");
        // Nach Datum sortiert.
        assert_eq!(liste[0].datum, "2026-11-12");
    }

    #[test]
    fn pause_list_kann_zeitraum_eingrenzen() {
        let conn = setup();
        for (tag, name) in [("2026-11-12", "MuT"), ("2026-12-01", "Elternabend")] {
            pause_upsert_impl(
                &conn,
                PauseMeta {
                    bezeichnung: Some(name.into()),
                    datum: tag.into(),
                    ..Default::default()
                },
            )
            .unwrap();
        }
        let im_november = pause_list_impl(
            &conn,
            Some("2026-11-01".into()),
            Some("2026-11-30".into()),
        )
        .unwrap();
        assert_eq!(im_november.len(), 1);
        assert_eq!(im_november[0].bezeichnung, "MuT");
    }

    #[test]
    fn klassenloeschung_nimmt_ferien_und_pausen_nicht_mit() {
        // Ferien und Pausen sind schulweit, nicht klassengebunden - sie müssen
        // eine Klassenlöschung unangetastet überstehen.
        let conn = setup();
        ferie(&conn, "9", "Sommerferien", "2027-07-01", "2027-09-05");
        pause_upsert_impl(
            &conn,
            PauseMeta {
                bezeichnung: Some("MuT".into()),
                datum: "2026-11-12".into(),
                klasse_name: Some("6b".into()),
                ..Default::default()
            },
        )
        .unwrap();
        super::super::klassen::klasse_loeschen_impl(&conn, "6b").unwrap();
        assert_eq!(ferien_list_impl(&conn, None).unwrap().len(), 1);
        assert_eq!(pause_list_impl(&conn, None, None).unwrap().len(), 1);
    }
}
