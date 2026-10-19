use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::db::DbState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LernzielFokus {
    pub id: String,
    pub klasse_id: String,
    pub klasse_name_snapshot: String,
    pub lernziel: String,
    pub fehler_typ: String,
    pub aufgabe_snapshot: String,
    pub ausgangseinsatz_id: Option<String>,
    pub ausgangsstunden_titel_snapshot: Option<String>,
    pub ausgangsdatum_snapshot: Option<String>,
    pub zeitraum_von: Option<String>,
    pub zeitraum_bis: Option<String>,
    pub antwort_anzahl: i64,
    pub fehler_anzahl: i64,
    pub bestaetigt_am: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LernzielEvidenz {
    pub fehler_typ: String,
    pub antwort_anzahl: i64,
    pub fehler_anzahl: i64,
    pub zeitraum_von: Option<String>,
    pub zeitraum_bis: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LernzielFokusNeu {
    pub klasse_id: String,
    pub klasse_name_snapshot: String,
    pub lernziel: String,
    pub fehler_typ: String,
    pub aufgabe_snapshot: String,
    pub ausgangseinsatz_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AbrufCheck {
    pub id: String,
    pub fokus_id: String,
    pub lernziel: String,
    pub klasse_id: String,
    pub klasse_name_snapshot: String,
    pub einsatz_id: String,
    pub stunden_titel: String,
    pub faellig_am: String,
    pub termin_gueltig: bool,
    pub antwortmodus: String,
    pub frage: String,
    pub optionen_json: String,
    pub loesung: Option<String>,
    pub vergleichsgrundlage_bestaetigt: bool,
    pub teilnahmeliste_snapshot: bool,
    pub roster_anzahl: i64,
    pub anwesend_anzahl: i64,
    pub abwesend_anzahl: i64,
    pub teilnahme_offen_anzahl: i64,
    pub antwort_anzahl: i64,
    pub richtig_anzahl: i64,
    pub teilweise_anzahl: i64,
    pub noch_nicht_anzahl: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AbrufCheckTeilnahme {
    pub schueler_id: i64,
    pub vorname: String,
    pub nachname: Option<String>,
    pub status: String,
    pub antwort: Option<String>,
    pub ergebnis: Option<String>,
    pub aenderung_anzahl: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AbrufCheckErgebnisAenderung {
    pub id: i64,
    pub geaendert_am: String,
    pub antwort_geaendert: bool,
    pub ergebnis_vorher: String,
    pub ergebnis_nachher: String,
    pub ausgewertet_von_vorher: String,
    pub ausgewertet_von_nachher: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AbrufCheckTeilnahmeNeu {
    pub abrufcheck_id: String,
    pub schueler_id: i64,
    pub status: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AbrufCheckNeu {
    pub fokus_id: String,
    pub einsatz_id: String,
    pub antwortmodus: String,
    pub frage: String,
    pub optionen: Vec<String>,
    pub loesung: Option<String>,
    pub vergleichsgrundlage_bestaetigt: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AbrufCheckErgebnisNeu {
    pub abrufcheck_id: String,
    pub schueler_id: i64,
    pub antwort: String,
    pub ergebnis: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AbrufCheckErgebnisBatchNeu {
    pub abrufcheck_id: String,
    pub eintraege: Vec<AbrufCheckErgebnisBatchEintrag>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AbrufCheckErgebnisBatchEintrag {
    pub schueler_id: i64,
    pub antwort: String,
    pub ergebnis: Option<String>,
}

#[tauri::command]
pub async fn lernziel_evidenz_list(
    state: tauri::State<'_, DbState>,
    klasse_id: String,
    aufgabe: String,
) -> Result<Vec<LernzielEvidenz>, String> {
    let conn = state.conn()?;
    lernziel_evidenz_list_impl(&conn, &klasse_id, &aufgabe)
}

pub(crate) fn lernziel_evidenz_list_impl(
    conn: &Connection,
    klasse_id: &str,
    aufgabe: &str,
) -> Result<Vec<LernzielEvidenz>, String> {
    let mut stmt = conn.prepare(
        "SELECT upper(f.typ), COUNT(DISTINCT a.id), \
         (SELECT COUNT(*) FROM abgabe x WHERE x.aufgabe=?2 AND (x.klasse_id=?1 OR (x.klasse_id IS NULL AND \
           x.klasse=(SELECT name FROM klasse_stammdaten WHERE id=?1) COLLATE NOCASE AND \
           (SELECT COUNT(*) FROM klasse_stammdaten k WHERE k.name=x.klasse COLLATE NOCASE)=1 AND \
           (SELECT pruefung_noetig FROM klasse_stammdaten WHERE id=?1)=0 AND \
           trim(COALESCE((SELECT schuljahr FROM klasse_stammdaten WHERE id=?1),''))<>''))), \
         MIN(a.datum),MAX(a.datum) FROM abgabe a JOIN fehler_historie f ON f.abgabe_id=a.id \
         WHERE a.aufgabe=?2 AND (a.klasse_id=?1 OR (a.klasse_id IS NULL AND a.klasse=(SELECT name FROM klasse_stammdaten WHERE id=?1) COLLATE NOCASE \
           AND (SELECT COUNT(*) FROM klasse_stammdaten k WHERE k.name=a.klasse COLLATE NOCASE)=1 \
           AND (SELECT pruefung_noetig FROM klasse_stammdaten WHERE id=?1)=0 \
           AND trim(COALESCE((SELECT schuljahr FROM klasse_stammdaten WHERE id=?1),''))<>'')) \
           AND upper(f.typ) IN ('R','G','Z','A') GROUP BY upper(f.typ) ORDER BY upper(f.typ)",
    ).map_err(|e| format!("Lernziel-Evidenz vorbereiten: {e}"))?;
    let rows = stmt
        .query_map(params![klasse_id, aufgabe.trim()], |r| {
            Ok(LernzielEvidenz {
                fehler_typ: r.get(0)?,
                fehler_anzahl: r.get(1)?,
                antwort_anzahl: r.get(2)?,
                zeitraum_von: r.get(3)?,
                zeitraum_bis: r.get(4)?,
            })
        })
        .map_err(|e| format!("Lernziel-Evidenz abfragen: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Lernziel-Evidenz lesen: {e}"))
}

#[tauri::command]
pub async fn lernziel_fokus_list(
    state: tauri::State<'_, DbState>,
    klasse_id: String,
) -> Result<Vec<LernzielFokus>, String> {
    let conn = state.conn()?;
    lernziel_fokus_list_impl(&conn, &klasse_id)
}

pub(crate) fn lernziel_fokus_list_impl(
    conn: &Connection,
    klasse_id: &str,
) -> Result<Vec<LernzielFokus>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id,klasse_id,klasse_name_snapshot,lernziel,fehler_typ,aufgabe_snapshot, \
         ausgangseinsatz_id,ausgangsstunden_titel_snapshot,ausgangsdatum_snapshot, \
         zeitraum_von,zeitraum_bis,antwort_anzahl,fehler_anzahl,bestaetigt_am \
         FROM lernziel_fokus WHERE klasse_id=?1 ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("Lernziel-Kompass vorbereiten: {e}"))?;
    let rows = stmt
        .query_map([klasse_id], |r| {
            Ok(LernzielFokus {
                id: r.get(0)?,
                klasse_id: r.get(1)?,
                klasse_name_snapshot: r.get(2)?,
                lernziel: r.get(3)?,
                fehler_typ: r.get(4)?,
                aufgabe_snapshot: r.get(5)?,
                ausgangseinsatz_id: r.get(6)?,
                ausgangsstunden_titel_snapshot: r.get(7)?,
                ausgangsdatum_snapshot: r.get(8)?,
                zeitraum_von: r.get(9)?,
                zeitraum_bis: r.get(10)?,
                antwort_anzahl: r.get(11)?,
                fehler_anzahl: r.get(12)?,
                bestaetigt_am: r.get(13)?,
            })
        })
        .map_err(|e| format!("Lernziel-Kompass abfragen: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Lernziel-Kompass lesen: {e}"))
}

/// Quelle und Evidenz werden direkt aus der gemeinsamen Korrekturdatenbank
/// ermittelt. Der Aufrufer kann deshalb keine geplante Unterlage als Ergebnis
/// oder frei erfundene Antwortzahl als Evidenz speichern.
#[tauri::command]
pub async fn lernziel_fokus_bestaetigen(
    state: tauri::State<'_, DbState>,
    meta: LernzielFokusNeu,
) -> Result<LernzielFokus, String> {
    let conn = state.conn()?;
    lernziel_fokus_bestaetigen_impl(&conn, meta)
}

pub(crate) fn lernziel_fokus_bestaetigen_impl(
    conn: &Connection,
    meta: LernzielFokusNeu,
) -> Result<LernzielFokus, String> {
    let lernziel = meta.lernziel.trim();
    let aufgabe = meta.aufgabe_snapshot.trim();
    let fehler_typ = meta.fehler_typ.trim().to_uppercase();
    if lernziel.is_empty()
        || aufgabe.is_empty()
        || !["R", "G", "Z", "A"].contains(&fehler_typ.as_str())
    {
        return Err("Bitte Lernziel, Aufgabe und ein erkanntes Fehlermuster angeben.".to_string());
    }
    let klasse_name: String = conn
        .query_row(
            "SELECT name FROM klasse_stammdaten WHERE id=?1",
            [&meta.klasse_id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| format!("Klassenidentität prüfen: {e}"))?
        .ok_or_else(|| "Die Klasse ist nicht mehr vorhanden.".to_string())?;
    let (stunden_titel, stunden_datum) =
        fokus_stunde_pruefen(conn, &meta.klasse_id, &meta.ausgangseinsatz_id)?;
    let evidence: Option<(i64, i64, Option<String>, Option<String>)> = conn.query_row(
        "SELECT COUNT(DISTINCT a.id), COUNT(DISTINCT CASE WHEN f.id IS NOT NULL THEN a.id END), MIN(a.datum), MAX(a.datum) \
         FROM abgabe a LEFT JOIN fehler_historie f ON f.abgabe_id=a.id AND upper(f.typ)=?3 \
         WHERE a.aufgabe=?2 AND (a.klasse_id=?1 OR (a.klasse_id IS NULL AND a.klasse=?4 COLLATE NOCASE \
           AND (SELECT COUNT(*) FROM klasse_stammdaten k WHERE k.name=?4 COLLATE NOCASE)=1 \
           AND (SELECT pruefung_noetig FROM klasse_stammdaten WHERE id=?1)=0 \
           AND trim(COALESCE((SELECT schuljahr FROM klasse_stammdaten WHERE id=?1),''))<>''))",
        params![meta.klasse_id, aufgabe, fehler_typ, klasse_name],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    ).optional().map_err(|e| format!("Korrekturevidenz lesen: {e}"))?;
    let (answers, errors, from, to) = evidence.unwrap_or((0, 0, None, None));
    if answers == 0 || errors == 0 {
        return Err("Für dieses Fehlermuster liegt in der ausgewählten Aufgabe noch keine ausreichende Korrekturevidenz vor.".to_string());
    }
    let now: String = conn
        .query_row("SELECT datetime('now')", [], |r| r.get(0))
        .map_err(|e| format!("Zeitstempel: {e}"))?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO lernziel_fokus (id,klasse_id,klasse_name_snapshot,lernziel,fehler_typ,aufgabe_snapshot, \
         ausgangseinsatz_id,ausgangsstunden_titel_snapshot,ausgangsdatum_snapshot, \
         zeitraum_von,zeitraum_bis,antwort_anzahl,fehler_anzahl,bestaetigt_am,created_at,updated_at) \
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?14,?14)",
        params![id, meta.klasse_id, klasse_name, lernziel, fehler_typ, aufgabe, meta.ausgangseinsatz_id,
            stunden_titel, stunden_datum, from, to, answers, errors, now],
    ).map_err(|e| format!("Lernziel bestätigen: {e}"))?;
    Ok(LernzielFokus {
        id,
        klasse_id: meta.klasse_id,
        klasse_name_snapshot: klasse_name,
        lernziel: lernziel.to_string(),
        fehler_typ,
        aufgabe_snapshot: aufgabe.to_string(),
        ausgangseinsatz_id: Some(meta.ausgangseinsatz_id),
        ausgangsstunden_titel_snapshot: Some(stunden_titel),
        ausgangsdatum_snapshot: Some(stunden_datum),
        zeitraum_von: from,
        zeitraum_bis: to,
        antwort_anzahl: answers,
        fehler_anzahl: errors,
        bestaetigt_am: now,
    })
}

fn fokus_stunde_pruefen(
    conn: &Connection,
    klasse_id: &str,
    einsatz_id: &str,
) -> Result<(String, String), String> {
    let lesson: Option<(Option<String>, String, Option<String>, String, String)> = conn.query_row(
        "SELECT klasse_id,titel_snapshot,COALESCE(date(eingesetzt_am),date(geplant_am)),status,einsatz_art \
         FROM unterrichtseinsatz WHERE id=?1",
        [einsatz_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
    ).optional().map_err(|e| format!("Ausgangsstunde prüfen: {e}"))?;
    let (lesson_class, title, date, status, kind) =
        lesson.ok_or_else(|| "Die ausgewählte Ausgangsstunde wurde nicht gefunden.".to_string())?;
    if lesson_class.as_deref() != Some(klasse_id)
        || !["geplant", "eingesetzt"].contains(&status.as_str())
        || kind == "ausgefallen"
    {
        return Err(
            "Die Ausgangsstunde muss zur selben Klasse gehören und geplant oder gehalten sein."
                .to_string(),
        );
    }
    let date = date
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Die Ausgangsstunde braucht ein gültiges Datum.".to_string())?;
    let date_is_future_or_today: bool = conn
        .query_row("SELECT date(?1)>=date('now','localtime')", [&date], |row| {
            row.get::<_, Option<i64>>(0)
                .map(|value| value.unwrap_or(0) != 0)
        })
        .map_err(|e| format!("Ausgangsstundendatum prüfen: {e}"))?;
    if status == "geplant" && !date_is_future_or_today {
        return Err(
            "Die vergangene Ausgangsstunde muss zuerst als gehalten markiert werden.".to_string(),
        );
    }
    Ok((title, date))
}

#[tauri::command]
pub async fn lernziel_fokus_ausgangsstunde_verbinden(
    state: tauri::State<'_, DbState>,
    fokus_id: String,
    ausgangseinsatz_id: String,
) -> Result<LernzielFokus, String> {
    let conn = state.conn()?;
    lernziel_fokus_ausgangsstunde_verbinden_impl(&conn, &fokus_id, &ausgangseinsatz_id)
}

pub(crate) fn lernziel_fokus_ausgangsstunde_verbinden_impl(
    conn: &Connection,
    fokus_id: &str,
    ausgangseinsatz_id: &str,
) -> Result<LernzielFokus, String> {
    let klasse_id: String = conn
        .query_row(
            "SELECT klasse_id FROM lernziel_fokus WHERE id=?1",
            [fokus_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Lernziel laden: {e}"))?
        .ok_or_else(|| "Das Lernziel wurde nicht gefunden.".to_string())?;
    let (title, date) = fokus_stunde_pruefen(conn, &klasse_id, ausgangseinsatz_id)?;
    conn.execute(
        "UPDATE lernziel_fokus SET ausgangseinsatz_id=?1,ausgangsstunden_titel_snapshot=?2, \
         ausgangsdatum_snapshot=?3,updated_at=datetime('now') WHERE id=?4",
        params![ausgangseinsatz_id, title, date, fokus_id],
    )
    .map_err(|e| format!("Ausgangsstunde verknüpfen: {e}"))?;
    lernziel_fokus_list_impl(conn, &klasse_id)?
        .into_iter()
        .find(|focus| focus.id == fokus_id)
        .ok_or_else(|| "Das verknüpfte Lernziel konnte nicht erneut geladen werden.".to_string())
}

#[tauri::command]
pub async fn abrufcheck_list(
    state: tauri::State<'_, DbState>,
    klasse_id: String,
) -> Result<Vec<AbrufCheck>, String> {
    let conn = state.conn()?;
    abrufcheck_list_impl(&conn, &klasse_id)
}

pub(crate) fn abrufcheck_list_impl(
    conn: &Connection,
    klasse_id: &str,
) -> Result<Vec<AbrufCheck>, String> {
    let mut stmt = conn.prepare(
        "SELECT c.id,c.fokus_id,f.lernziel,c.klasse_id,c.klasse_name_snapshot,c.einsatz_id,e.titel_snapshot, \
         COALESCE(date(e.eingesetzt_am),date(e.geplant_am),c.faellig_am), \
         CASE WHEN e.status IN ('geplant','eingesetzt') AND e.einsatz_art<>'ausgefallen' \
           AND date(COALESCE(e.eingesetzt_am,e.geplant_am))>date(f.ausgangsdatum_snapshot) \
           AND (f.zeitraum_bis IS NULL OR date(COALESCE(e.eingesetzt_am,e.geplant_am))>date(f.zeitraum_bis)) \
           AND (e.status='eingesetzt' OR date(COALESCE(e.eingesetzt_am,e.geplant_am))>=date('now','localtime')) \
           THEN 1 ELSE 0 END,c.teilnahmeliste_snapshot, \
         (SELECT COUNT(*) FROM abrufcheck_teilnahme t WHERE t.abrufcheck_id=c.id), \
         (SELECT COUNT(*) FROM abrufcheck_teilnahme t WHERE t.abrufcheck_id=c.id AND t.status='anwesend'), \
         (SELECT COUNT(*) FROM abrufcheck_teilnahme t WHERE t.abrufcheck_id=c.id AND t.status='abwesend'), \
         (SELECT COUNT(*) FROM abrufcheck_teilnahme t WHERE t.abrufcheck_id=c.id AND t.status='offen'), \
         (SELECT COUNT(*) FROM abrufcheck_ergebnis r WHERE r.abrufcheck_id=c.id), \
         (SELECT COUNT(*) FROM abrufcheck_ergebnis r WHERE r.abrufcheck_id=c.id AND r.ergebnis='richtig'), \
         (SELECT COUNT(*) FROM abrufcheck_ergebnis r WHERE r.abrufcheck_id=c.id AND r.ergebnis='teilweise'), \
         (SELECT COUNT(*) FROM abrufcheck_ergebnis r WHERE r.abrufcheck_id=c.id AND r.ergebnis='noch_nicht'), \
         c.antwortmodus,c.frage,c.optionen_json,c.loesung,c.vergleichsgrundlage_bestaetigt \
         FROM abrufcheck c JOIN lernziel_fokus f ON f.id=c.fokus_id \
         JOIN unterrichtseinsatz e ON e.id=c.einsatz_id \
         WHERE c.klasse_id=?1 ORDER BY c.faellig_am DESC",
    ).map_err(|e| format!("Abrufchecks vorbereiten: {e}"))?;
    let rows = stmt
        .query_map([klasse_id], |r| {
            Ok(AbrufCheck {
                id: r.get(0)?,
                fokus_id: r.get(1)?,
                lernziel: r.get(2)?,
                klasse_id: r.get(3)?,
                klasse_name_snapshot: r.get(4)?,
                einsatz_id: r.get(5)?,
                stunden_titel: r.get(6)?,
                faellig_am: r.get(7)?,
                termin_gueltig: r.get::<_, i64>(8)? != 0,
                teilnahmeliste_snapshot: r.get::<_, i64>(9)? != 0,
                roster_anzahl: r.get(10)?,
                anwesend_anzahl: r.get(11)?,
                abwesend_anzahl: r.get(12)?,
                teilnahme_offen_anzahl: r.get(13)?,
                antwort_anzahl: r.get(14)?,
                richtig_anzahl: r.get(15)?,
                teilweise_anzahl: r.get(16)?,
                noch_nicht_anzahl: r.get(17)?,
                antwortmodus: r.get(18)?,
                frage: r.get(19)?,
                optionen_json: r.get(20)?,
                loesung: r.get(21)?,
                vergleichsgrundlage_bestaetigt: r.get::<_, i64>(22)? != 0,
            })
        })
        .map_err(|e| format!("Abrufchecks abfragen: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Abrufchecks lesen: {e}"))
}

#[tauri::command]
pub async fn abrufcheck_teilnahme_list(
    state: tauri::State<'_, DbState>,
    abrufcheck_id: String,
) -> Result<Vec<AbrufCheckTeilnahme>, String> {
    let conn = state.conn()?;
    abrufcheck_teilnahme_list_impl(&conn, &abrufcheck_id)
}

pub(crate) fn abrufcheck_teilnahme_list_impl(
    conn: &Connection,
    abrufcheck_id: &str,
) -> Result<Vec<AbrufCheckTeilnahme>, String> {
    let mut stmt = conn.prepare(
        "SELECT * FROM ( \
           SELECT s.id,s.vorname,s.nachname,COALESCE(t.status,'anwesend'),r.antwort,r.ergebnis, \
                  (SELECT COUNT(*) FROM abrufcheck_ergebnis_aenderung h WHERE h.abrufcheck_id=c.id AND h.schueler_id=s.id) \
             FROM abrufcheck c JOIN abrufcheck_ergebnis r ON r.abrufcheck_id=c.id \
             JOIN schueler s ON s.id=r.schueler_id \
             LEFT JOIN abrufcheck_teilnahme t ON t.abrufcheck_id=c.id AND t.schueler_id=s.id \
            WHERE c.id=?1 AND t.schueler_id IS NULL \
           UNION ALL \
           SELECT s.id,s.vorname,s.nachname,t.status,r.antwort,r.ergebnis, \
                  (SELECT COUNT(*) FROM abrufcheck_ergebnis_aenderung h WHERE h.abrufcheck_id=t.abrufcheck_id AND h.schueler_id=s.id) \
             FROM abrufcheck_teilnahme t JOIN schueler s ON s.id=t.schueler_id \
             LEFT JOIN abrufcheck_ergebnis r ON r.abrufcheck_id=t.abrufcheck_id AND r.schueler_id=t.schueler_id \
            WHERE t.abrufcheck_id=?1 \
         ) ORDER BY nachname,vorname",
    ).map_err(|e| format!("Check-Teilnahmeliste vorbereiten: {e}"))?;
    let rows = stmt
        .query_map([abrufcheck_id], |r| {
            Ok(AbrufCheckTeilnahme {
                schueler_id: r.get(0)?,
                vorname: r.get(1)?,
                nachname: r.get(2)?,
                status: r.get(3)?,
                antwort: r.get(4)?,
                ergebnis: r.get(5)?,
                aenderung_anzahl: r.get(6)?,
            })
        })
        .map_err(|e| format!("Check-Teilnahmeliste abfragen: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Check-Teilnahmeliste lesen: {e}"))
}

#[tauri::command]
pub async fn abrufcheck_ergebnis_aenderungen_list(
    state: tauri::State<'_, DbState>,
    abrufcheck_id: String,
    schueler_id: i64,
) -> Result<Vec<AbrufCheckErgebnisAenderung>, String> {
    let conn = state.conn()?;
    abrufcheck_ergebnis_aenderungen_list_impl(&conn, &abrufcheck_id, schueler_id)
}

pub(crate) fn abrufcheck_ergebnis_aenderungen_list_impl(
    conn: &Connection,
    abrufcheck_id: &str,
    schueler_id: i64,
) -> Result<Vec<AbrufCheckErgebnisAenderung>, String> {
    let mut stmt = conn.prepare(
        "SELECT id,geaendert_am,antwort_geaendert,ergebnis_vorher,ergebnis_nachher, \
                ausgewertet_von_vorher,ausgewertet_von_nachher \
           FROM abrufcheck_ergebnis_aenderung \
          WHERE abrufcheck_id=?1 AND schueler_id=?2 ORDER BY id",
    ).map_err(|e| format!("Check-Änderungsverlauf vorbereiten: {e}"))?;
    let rows = stmt.query_map(params![abrufcheck_id, schueler_id], |r| {
        Ok(AbrufCheckErgebnisAenderung {
            id: r.get(0)?,
            geaendert_am: r.get(1)?,
            antwort_geaendert: r.get::<_, i64>(2)? != 0,
            ergebnis_vorher: r.get(3)?,
            ergebnis_nachher: r.get(4)?,
            ausgewertet_von_vorher: r.get(5)?,
            ausgewertet_von_nachher: r.get(6)?,
        })
    }).map_err(|e| format!("Check-Änderungsverlauf abfragen: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Check-Änderungsverlauf lesen: {e}"))
}

#[tauri::command]
pub async fn abrufcheck_teilnahme_speichern(
    state: tauri::State<'_, DbState>,
    meta: AbrufCheckTeilnahmeNeu,
) -> Result<(), String> {
    let conn = state.conn()?;
    abrufcheck_teilnahme_speichern_impl(&conn, meta)
}

pub(crate) fn abrufcheck_teilnahme_speichern_impl(
    conn: &Connection,
    meta: AbrufCheckTeilnahmeNeu,
) -> Result<(), String> {
    if !["offen", "anwesend", "abwesend"].contains(&meta.status.as_str()) {
        return Err("Unbekannter Teilnahmestatus.".to_string());
    }
    let klasse_id: String = conn
        .query_row(
            "SELECT klasse_id FROM abrufcheck WHERE id=?1",
            [&meta.abrufcheck_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Check-Klasse lesen: {e}"))?
        .ok_or_else(|| "Der Abrufcheck wurde nicht gefunden.".to_string())?;
    if !abrufcheck_list_impl(conn, &klasse_id)?
        .iter()
        .any(|check| check.id == meta.abrufcheck_id && check.termin_gueltig)
    {
        return Err(
            "Der Checktermin ist nicht mehr gültig. Prüfe zuerst die verknüpfte Stunde."
                .to_string(),
        );
    }
    let has_result: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM abrufcheck_ergebnis WHERE abrufcheck_id=?1 AND schueler_id=?2)",
        params![meta.abrufcheck_id, meta.schueler_id], |row| row.get(0),
    ).map_err(|e| format!("Check-Antwort prüfen: {e}"))?;
    if has_result && meta.status != "anwesend" {
        return Err("Für diesen Schüler ist bereits eine Antwort gespeichert; die Teilnahme kann nicht auf abwesend oder offen zurückgesetzt werden.".to_string());
    }
    let has_roster_row: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM abrufcheck_teilnahme WHERE abrufcheck_id=?1 AND schueler_id=?2)",
        params![meta.abrufcheck_id, meta.schueler_id], |row| row.get(0),
    ).map_err(|e| format!("Teilnahmezeile prüfen: {e}"))?;
    if !has_roster_row {
        let member: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM schueler_klassen WHERE schueler_id=?1 AND klasse_id=?2 AND status='aktiv')",
            params![meta.schueler_id, klasse_id], |row| row.get(0),
        ).map_err(|e| format!("Aktuelle Klassenzuordnung prüfen: {e}"))?;
        if !member {
            return Err("Der Schüler ist weder im gespeicherten Check-Roster noch aktuell dieser Klasse zugeordnet.".to_string());
        }
    }
    conn.execute(
        "INSERT INTO abrufcheck_teilnahme (abrufcheck_id,schueler_id,status,updated_at) \
         VALUES (?1,?2,?3,datetime('now')) \
         ON CONFLICT(abrufcheck_id,schueler_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at",
        params![meta.abrufcheck_id, meta.schueler_id, meta.status],
    ).map_err(|e| format!("Teilnahme speichern: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn abrufcheck_erstellen(
    state: tauri::State<'_, DbState>,
    meta: AbrufCheckNeu,
) -> Result<AbrufCheck, String> {
    let conn = state.conn()?;
    abrufcheck_erstellen_impl(&conn, meta)
}

pub(crate) fn abrufcheck_erstellen_impl(
    conn: &Connection,
    meta: AbrufCheckNeu,
) -> Result<AbrufCheck, String> {
    let frage = meta.frage.trim();
    if frage.is_empty() {
        return Err("Bitte eine kurze Checkfrage formulieren.".to_string());
    }
    if !["offen", "auswahl"].contains(&meta.antwortmodus.as_str()) {
        return Err("Unbekannter Antwortmodus.".to_string());
    }
    let fokus = conn.query_row(
        "SELECT klasse_id,klasse_name_snapshot,lernziel,ausgangseinsatz_id,ausgangsdatum_snapshot,zeitraum_bis \
         FROM lernziel_fokus WHERE id=?1", [&meta.fokus_id],
        |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?,
            r.get::<_, Option<String>>(3)?, r.get::<_, Option<String>>(4)?, r.get::<_, Option<String>>(5)?)),
    ).optional().map_err(|e| format!("Bestätigtes Lernziel prüfen: {e}"))?
        .ok_or_else(|| "Das bestätigte Lernziel wurde nicht gefunden.".to_string())?;
    let origin_id = fokus.3.as_deref().ok_or_else(|| {
        "Bitte zuerst eine Ausgangsstunde mit diesem Lernziel verbinden.".to_string()
    })?;
    let origin_date = fokus
        .4
        .as_deref()
        .ok_or_else(|| "Für die Ausgangsstunde fehlt ein gültiges Datum.".to_string())?;
    let lesson = conn.query_row(
        "SELECT klasse_id,klasse_name_snapshot,titel_snapshot,date(geplant_am),status,einsatz_art \
         FROM unterrichtseinsatz WHERE id=?1", [&meta.einsatz_id],
        |r| Ok((r.get::<_, Option<String>>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?,
            r.get::<_, Option<String>>(3)?, r.get::<_, String>(4)?, r.get::<_, String>(5)?)),
    ).optional().map_err(|e| format!("Stundenkontext prüfen: {e}"))?
        .ok_or_else(|| "Die ausgewählte Stunde wurde nicht gefunden.".to_string())?;
    if lesson.0.as_deref() != Some(fokus.0.as_str())
        || lesson.3.is_none()
        || lesson.4 != "geplant"
        || lesson.5 == "ausgefallen"
    {
        return Err(
            "Der Abrufcheck braucht eine geplante Stunde derselben Klasse mit Termin.".to_string(),
        );
    }
    let later_than_basis: bool = conn
        .query_row(
            "SELECT date(?1)>date('now','localtime') AND date(?1)>date(?2) \
         AND (date(?3) IS NULL OR date(?1)>date(?3))",
            params![lesson.3, origin_date, fokus.5],
            |row| {
                row.get::<_, Option<i64>>(0)
                    .map(|value| value.unwrap_or(0) != 0)
            },
        )
        .map_err(|e| format!("Abrufcheck-Termin prüfen: {e}"))?;
    if meta.einsatz_id == origin_id || !later_than_basis {
        return Err("Der Abrufcheck braucht einen zukünftigen Termin nach Ausgangsstunde und Korrekturzeitraum.".to_string());
    }
    let options: Vec<String> = meta
        .optionen
        .into_iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    let solution = meta
        .loesung
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);
    if meta.antwortmodus == "auswahl" {
        if options.len() < 2
            || solution
                .as_deref()
                .map_or(true, |answer| !options.iter().any(|o| o == answer))
        {
            return Err("Für eine Auswahlfrage brauchst du mindestens zwei Optionen und eine davon als Lösung.".to_string());
        }
    }
    let compare = meta.antwortmodus == "offen" && meta.vergleichsgrundlage_bestaetigt;
    let options_json =
        serde_json::to_string(&options).map_err(|e| format!("Antwortoptionen speichern: {e}"))?;
    let id = Uuid::new_v4().to_string();
    let now: String = conn
        .query_row("SELECT datetime('now')", [], |r| r.get(0))
        .map_err(|e| format!("Zeitstempel: {e}"))?;
    conn.execute_batch("SAVEPOINT create_abrufcheck")
        .map_err(|e| format!("Check-Speicherung vorbereiten: {e}"))?;
    let save_result = (|| -> Result<(), String> {
        conn.execute(
            "INSERT INTO abrufcheck (id,fokus_id,klasse_id,klasse_name_snapshot,einsatz_id,faellig_am,antwortmodus,frage, \
             optionen_json,loesung,vergleichsgrundlage_bestaetigt,teilnahmeliste_snapshot,created_at,updated_at) \
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,1,?12,?12)",
            params![id, meta.fokus_id, fokus.0, fokus.1, meta.einsatz_id, lesson.3, meta.antwortmodus, frage, options_json, solution, compare as i64, now],
        ).map_err(|e| format!("Abrufcheck anlegen: {e}"))?;
        conn.execute(
            "INSERT INTO abrufcheck_teilnahme (abrufcheck_id,schueler_id,status,updated_at) \
             SELECT ?1,schueler_id,'offen',?2 FROM schueler_klassen WHERE klasse_id=?3 AND status='aktiv'",
            params![id, now, fokus.0],
        ).map_err(|e| format!("Klassenliste für Abrufcheck sichern: {e}"))?;
        Ok(())
    })();
    if let Err(error) = save_result {
        let _ = conn.execute_batch("ROLLBACK TO create_abrufcheck; RELEASE create_abrufcheck;");
        return Err(error);
    }
    conn.execute_batch("RELEASE create_abrufcheck")
        .map_err(|e| format!("Check-Speicherung abschließen: {e}"))?;
    abrufcheck_list_impl(conn, &fokus.0)?
        .into_iter()
        .find(|check| check.id == id)
        .ok_or_else(|| {
            "Der gespeicherte Abrufcheck konnte nicht erneut geladen werden.".to_string()
        })
}

#[tauri::command]
pub async fn abrufcheck_ergebnis_speichern(
    state: tauri::State<'_, DbState>,
    meta: AbrufCheckErgebnisNeu,
) -> Result<String, String> {
    let conn = state.conn()?;
    abrufcheck_ergebnis_speichern_impl(&conn, meta)
}

pub(crate) fn abrufcheck_ergebnis_speichern_impl(
    conn: &Connection,
    meta: AbrufCheckErgebnisNeu,
) -> Result<String, String> {
    let check = conn
        .query_row(
            "SELECT klasse_id,antwortmodus,loesung FROM abrufcheck WHERE id=?1",
            [&meta.abrufcheck_id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|e| format!("Abrufcheck laden: {e}"))?
        .ok_or_else(|| "Der Abrufcheck wurde nicht gefunden.".to_string())?;
    if !abrufcheck_list_impl(conn, &check.0)?
        .iter()
        .any(|item| item.id == meta.abrufcheck_id && item.termin_gueltig)
    {
        return Err("Der Checktermin liegt nicht mehr nach Ausgangsstunde und Korrekturzeitraum. Prüfe die verknüpfte Stunde.".to_string());
    }
    let has_roster_row: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM abrufcheck_teilnahme WHERE abrufcheck_id=?1 AND schueler_id=?2)",
        params![meta.abrufcheck_id, meta.schueler_id], |row| row.get(0),
    ).map_err(|e| format!("Gespeichertes Check-Roster prüfen: {e}"))?;
    let current_member: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM schueler_klassen WHERE schueler_id=?1 AND klasse_id=?2 AND status='aktiv')",
        params![meta.schueler_id, check.0], |row| row.get(0),
    ).map_err(|e| format!("Aktuelle Schülerzuordnung prüfen: {e}"))?;
    if !has_roster_row && !current_member {
        return Err("Der Schüler steht nicht im gespeicherten Check-Roster und ist dieser Klasse aktuell nicht zugeordnet.".to_string());
    }
    let answer = meta.antwort.trim();
    if answer.is_empty() {
        return Err("Bitte zuerst eine Antwort eintragen.".to_string());
    }
    let (result, scored_by) = if check.1 == "auswahl" {
        let solution = check.2.as_deref().unwrap_or("");
        (
            if answer.eq_ignore_ascii_case(solution) {
                "richtig"
            } else {
                "noch_nicht"
            },
            "lokal",
        )
    } else {
        match meta.ergebnis.as_deref() {
            Some("richtig" | "teilweise" | "noch_nicht") => {
                (meta.ergebnis.as_deref().unwrap(), "lehrkraft")
            }
            _ => {
                return Err(
                    "Offene Antworten müssen von der Lehrkraft eingeordnet werden.".to_string(),
                )
            }
        }
    };
    let id = Uuid::new_v4().to_string();
    let now: String = conn
        .query_row("SELECT datetime('now')", [], |r| r.get(0))
        .map_err(|e| format!("Zeitstempel: {e}"))?;
    conn.execute_batch("SAVEPOINT save_abrufcheck_ergebnis")
        .map_err(|e| format!("Check-Ergebnis-Speicherung vorbereiten: {e}"))?;
    let save_result = (|| -> Result<(), String> {
        let previous: Option<(String, String, String)> = conn.query_row(
            "SELECT antwort,ergebnis,ausgewertet_von FROM abrufcheck_ergebnis \
              WHERE abrufcheck_id=?1 AND schueler_id=?2",
            params![meta.abrufcheck_id, meta.schueler_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).optional().map_err(|e| format!("Vorheriges Check-Ergebnis lesen: {e}"))?;

        if let Some((previous_answer, previous_result, previous_scored_by)) = previous {
            let answer_changed = previous_answer != answer;
            let result_changed = previous_result != result;
            let scored_by_changed = previous_scored_by != scored_by;
            if answer_changed || result_changed || scored_by_changed {
                conn.execute(
                    "INSERT INTO abrufcheck_ergebnis_aenderung \
                     (abrufcheck_id,schueler_id,antwort_geaendert,ergebnis_vorher,ergebnis_nachher, \
                      ausgewertet_von_vorher,ausgewertet_von_nachher,geaendert_am) \
                     VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                    params![
                        meta.abrufcheck_id,
                        meta.schueler_id,
                        answer_changed as i64,
                        previous_result,
                        result,
                        previous_scored_by,
                        scored_by,
                        now,
                    ],
                ).map_err(|e| format!("Check-Ergebnisänderung protokollieren: {e}"))?;
            }
        }

        conn.execute(
            "INSERT INTO abrufcheck_teilnahme (abrufcheck_id,schueler_id,status,updated_at) \
             VALUES (?1,?2,'anwesend',?3) \
             ON CONFLICT(abrufcheck_id,schueler_id) DO UPDATE SET status='anwesend',updated_at=excluded.updated_at",
            params![meta.abrufcheck_id, meta.schueler_id, now],
        ).map_err(|e| format!("Check-Teilnahme sichern: {e}"))?;
        conn.execute(
            "INSERT INTO abrufcheck_ergebnis (id,abrufcheck_id,schueler_id,antwort,ergebnis,ausgewertet_von,erstellt_am) \
             VALUES (?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(abrufcheck_id,schueler_id) DO UPDATE SET \
             antwort=excluded.antwort,ergebnis=excluded.ergebnis,ausgewertet_von=excluded.ausgewertet_von",
            params![id, meta.abrufcheck_id, meta.schueler_id, answer, result, scored_by, now],
        ).map_err(|e| format!("Check-Ergebnis speichern: {e}"))?;
        Ok(())
    })();
    if let Err(error) = save_result {
        let _ = conn.execute_batch(
            "ROLLBACK TO save_abrufcheck_ergebnis; RELEASE save_abrufcheck_ergebnis;",
        );
        return Err(error);
    }
    conn.execute_batch("RELEASE save_abrufcheck_ergebnis")
        .map_err(|e| format!("Check-Ergebnis-Speicherung abschließen: {e}"))?;
    Ok(result.to_string())
}

#[tauri::command]
pub async fn abrufcheck_ergebnisse_batch_speichern(
    state: tauri::State<'_, DbState>,
    meta: AbrufCheckErgebnisBatchNeu,
) -> Result<usize, String> {
    let conn = state.conn()?;
    abrufcheck_ergebnisse_batch_speichern_impl(&conn, meta)
}

pub(crate) fn abrufcheck_ergebnisse_batch_speichern_impl(
    conn: &Connection,
    meta: AbrufCheckErgebnisBatchNeu,
) -> Result<usize, String> {
    if meta.eintraege.is_empty() {
        return Err("Es gibt keine vorbereiteten Antworten zum Speichern.".to_string());
    }
    let mut seen = std::collections::HashSet::new();
    for entry in &meta.eintraege {
        if !seen.insert(entry.schueler_id) {
            return Err(format!("Schüler-ID {} ist mehrfach in der Sammelliste enthalten.", entry.schueler_id));
        }
    }

    conn.execute_batch("SAVEPOINT save_abrufcheck_batch")
        .map_err(|e| format!("Sammelspeicherung vorbereiten: {e}"))?;
    for entry in meta.eintraege {
        let student_id = entry.schueler_id;
        let result = abrufcheck_ergebnis_speichern_impl(
            conn,
            AbrufCheckErgebnisNeu {
                abrufcheck_id: meta.abrufcheck_id.clone(),
                schueler_id: student_id,
                antwort: entry.antwort,
                ergebnis: entry.ergebnis,
            },
        );
        if let Err(error) = result {
            let _ = conn.execute_batch(
                "ROLLBACK TO save_abrufcheck_batch; RELEASE save_abrufcheck_batch;",
            );
            return Err(format!(
                "Sammelspeicherung abgebrochen; es wurde nichts übernommen (Schüler-ID {student_id}): {error}"
            ));
        }
    }
    conn.execute_batch("RELEASE save_abrufcheck_batch")
        .map_err(|e| format!("Sammelspeicherung abschließen: {e}"))?;
    Ok(seen.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        crate::db::init_schema(&conn).unwrap();
        conn.execute(
            "INSERT INTO lua_klassen (id,name,schuljahr) VALUES ('k1','7A','2026/27')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO klasse_stammdaten (id,name,schuljahr) VALUES ('k1','7A','2026/27')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO schueler (id,klasse,klasse_id,vorname) VALUES (1,'7A','k1','Mia')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO schueler_klassen (schueler_id,klasse_id) VALUES (1,'k1')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO abgabe (id,schueler_id,klasse,klasse_id,aufgabe,dateiname,datei_hash,datum) VALUES (1,1,'7A','k1','Aufsatz','a.docx','h1','2099-10-01')", []).unwrap();
        conn.execute(
            "INSERT INTO fehler_historie (abgabe_id,typ) VALUES (1,'G')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO unterrichtseinsatz (id,klasse_id,klasse_name_snapshot,titel_snapshot,status,geplant_am,eingesetzt_am,created_at,updated_at) VALUES ('e0','k1','7A','Nebensatz-Einstieg','eingesetzt','2099-10-01','2099-10-01','now','now')", []).unwrap();
        conn.execute("INSERT INTO unterrichtseinsatz (id,klasse_id,klasse_name_snapshot,titel_snapshot,status,geplant_am,created_at,updated_at) VALUES ('e1','k1','7A','Grammatik wiederholen','geplant','2099-10-15','now','now')", []).unwrap();
        conn
    }

    #[test]
    fn check_sichert_klassenroster_und_unterscheidet_abwesenheit_antwort_und_offen() {
        let conn = setup();
        conn.execute(
            "INSERT INTO schueler (id,klasse,klasse_id,vorname) VALUES (2,'7A','k1','Jonas')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO schueler_klassen (schueler_id,klasse_id) VALUES (2,'k1')",
            [],
        )
        .unwrap();
        for id in 3..=25 {
            conn.execute(
                "INSERT INTO schueler (id,klasse,klasse_id,vorname) VALUES (?1,'7A','k1',?2)",
                params![id, format!("Lernende{id}")],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO schueler_klassen (schueler_id,klasse_id) VALUES (?1,'k1')",
                [id],
            )
            .unwrap();
        }
        let focus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(),
                klasse_name_snapshot: "7A".into(),
                lernziel: "Nebensätze korrekt setzen".into(),
                fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(),
                ausgangseinsatz_id: "e0".into(),
            },
        )
        .unwrap();
        let check = abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: focus.id,
                einsatz_id: "e1".into(),
                antwortmodus: "offen".into(),
                frage: "Bilde einen Nebensatz.".into(),
                optionen: vec![],
                loesung: None,
                vergleichsgrundlage_bestaetigt: true,
            },
        )
        .unwrap();

        assert!(check.teilnahmeliste_snapshot);
        assert_eq!(check.roster_anzahl, 25);
        assert_eq!(check.teilnahme_offen_anzahl, 25);
        abrufcheck_teilnahme_speichern_impl(
            &conn,
            AbrufCheckTeilnahmeNeu {
                abrufcheck_id: check.id.clone(),
                schueler_id: 2,
                status: "abwesend".into(),
            },
        )
        .unwrap();
        abrufcheck_teilnahme_speichern_impl(
            &conn,
            AbrufCheckTeilnahmeNeu {
                abrufcheck_id: check.id.clone(),
                schueler_id: 3,
                status: "anwesend".into(),
            },
        )
        .unwrap();
        abrufcheck_ergebnis_speichern_impl(
            &conn,
            AbrufCheckErgebnisNeu {
                abrufcheck_id: check.id.clone(),
                schueler_id: 1,
                antwort: "Ein Nebensatz.".into(),
                ergebnis: Some("richtig".into()),
            },
        )
        .unwrap();

        let summary = abrufcheck_list_impl(&conn, "k1")
            .unwrap()
            .into_iter()
            .find(|item| item.id == check.id)
            .unwrap();
        assert_eq!(
            (
                summary.roster_anzahl,
                summary.anwesend_anzahl,
                summary.abwesend_anzahl,
                summary.teilnahme_offen_anzahl,
                summary.antwort_anzahl
            ),
            (25, 2, 1, 22, 1)
        );
        let rows = abrufcheck_teilnahme_list_impl(&conn, &check.id).unwrap();
        assert_eq!(rows.len(), 25);
        assert_eq!(
            rows.iter().find(|row| row.schueler_id == 1).unwrap().status,
            "anwesend"
        );
        assert_eq!(
            rows.iter().find(|row| row.schueler_id == 2).unwrap().status,
            "abwesend"
        );
        let unanswered_attendee = rows.iter().find(|row| row.schueler_id == 3).unwrap();
        assert_eq!(unanswered_attendee.status, "anwesend");
        assert!(unanswered_attendee.antwort.is_none());
        assert!(abrufcheck_teilnahme_speichern_impl(
            &conn,
            AbrufCheckTeilnahmeNeu {
                abrufcheck_id: check.id.clone(),
                schueler_id: 1,
                status: "abwesend".into(),
            }
        )
        .is_err());

        // Für ältere Checks gab es keinen historischen Roster-Snapshot. Ihre
        // Antwortliste bleibt sichtbar, aber wird nicht als Vollklasse gezählt.
        conn.execute(
            "DELETE FROM abrufcheck_teilnahme WHERE abrufcheck_id=?1",
            [&check.id],
        )
        .unwrap();
        conn.execute(
            "UPDATE abrufcheck SET teilnahmeliste_snapshot=0 WHERE id=?1",
            [&check.id],
        )
        .unwrap();
        let legacy = abrufcheck_list_impl(&conn, "k1")
            .unwrap()
            .into_iter()
            .find(|item| item.id == check.id)
            .unwrap();
        assert!(!legacy.teilnahmeliste_snapshot);
        assert_eq!(legacy.roster_anzahl, 0);
        assert_eq!(legacy.antwort_anzahl, 1);
        let legacy_rows = abrufcheck_teilnahme_list_impl(&conn, &check.id).unwrap();
        assert_eq!(legacy_rows.len(), 1);
        assert_eq!(legacy_rows[0].status, "anwesend");
    }

    #[test]
    fn fokus_nur_mit_tatsaechlicher_korrekturevidenz_und_check_nur_an_spaeterer_stunde() {
        let conn = setup();
        let fokus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(),
                klasse_name_snapshot: "7A".into(),
                lernziel: "Nebensätze korrekt setzen".into(),
                fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(),
                ausgangseinsatz_id: "e0".into(),
            },
        )
        .unwrap();
        assert_eq!(fokus.antwort_anzahl, 1);
        assert_eq!(fokus.fehler_anzahl, 1);
        assert!(abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: fokus.id.clone(),
                einsatz_id: "e1".into(),
                antwortmodus: "offen".into(),
                frage: "Formuliere einen Satz mit Nebensatz.".into(),
                optionen: vec![],
                loesung: None,
                vergleichsgrundlage_bestaetigt: true,
            }
        )
        .is_ok());
    }

    #[test]
    fn auswahlantwort_wird_lokal_geprueft_und_offene_antwort_erfordert_lehrkraft() {
        let conn = setup();
        let fokus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(),
                klasse_name_snapshot: "7A".into(),
                lernziel: "Verbformen unterscheiden".into(),
                fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(),
                ausgangseinsatz_id: "e0".into(),
            },
        )
        .unwrap();
        let check = abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: fokus.id.clone(),
                einsatz_id: "e1".into(),
                antwortmodus: "auswahl".into(),
                frage: "Welche Form ist korrekt?".into(),
                optionen: vec!["war gegangen".into(), "gingen war".into()],
                loesung: Some("war gegangen".into()),
                vergleichsgrundlage_bestaetigt: true,
            },
        )
        .unwrap();
        let result = abrufcheck_ergebnis_speichern_impl(
            &conn,
            AbrufCheckErgebnisNeu {
                abrufcheck_id: check.id.clone(),
                schueler_id: 1,
                antwort: "war gegangen".into(),
                ergebnis: None,
            },
        )
        .unwrap();
        assert_eq!(result, "richtig");
        let open = abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: fokus.id,
                einsatz_id: "e1".into(),
                antwortmodus: "offen".into(),
                frage: "Schreibe einen Satz.".into(),
                optionen: vec![],
                loesung: None,
                vergleichsgrundlage_bestaetigt: false,
            },
        )
        .unwrap();
        assert!(abrufcheck_ergebnis_speichern_impl(
            &conn,
            AbrufCheckErgebnisNeu {
                abrufcheck_id: open.id,
                schueler_id: 1,
                antwort: "Beispiel".into(),
                ergebnis: None,
            }
        )
        .is_err());
    }

    #[test]
    fn sammelspeicherung_erfasst_mehrere_schueler_und_wertet_antworten_lehrkraftseitig() {
        let conn = setup();
        conn.execute(
            "INSERT INTO schueler (id,klasse,klasse_id,vorname) VALUES (2,'7A','k1','Jonas')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO schueler_klassen (schueler_id,klasse_id) VALUES (2,'k1')",
            [],
        ).unwrap();
        let focus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(), klasse_name_snapshot: "7A".into(),
                lernziel: "Nebensätze korrekt setzen".into(), fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(), ausgangseinsatz_id: "e0".into(),
            },
        ).unwrap();
        let check = abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: focus.id, einsatz_id: "e1".into(), antwortmodus: "offen".into(),
                frage: "Formuliere einen Nebensatz.".into(), optionen: vec![], loesung: None,
                vergleichsgrundlage_bestaetigt: true,
            },
        ).unwrap();

        let saved = abrufcheck_ergebnisse_batch_speichern_impl(
            &conn,
            AbrufCheckErgebnisBatchNeu {
                abrufcheck_id: check.id.clone(),
                eintraege: vec![
                    AbrufCheckErgebnisBatchEintrag { schueler_id: 1, antwort: "weil es regnet".into(), ergebnis: Some("teilweise".into()) },
                    AbrufCheckErgebnisBatchEintrag { schueler_id: 2, antwort: "Ich bleibe drinnen, weil es regnet.".into(), ergebnis: Some("richtig".into()) },
                ],
            },
        ).unwrap();

        assert_eq!(saved, 2);
        let summary = abrufcheck_list_impl(&conn, "k1").unwrap().remove(0);
        assert_eq!((summary.antwort_anzahl, summary.teilweise_anzahl, summary.richtig_anzahl), (2, 1, 1));
        let roster = abrufcheck_teilnahme_list_impl(&conn, &check.id).unwrap();
        assert!(roster.iter().all(|row| row.status == "anwesend" && row.antwort.is_some()));
    }

    #[test]
    fn fehlgeschlagene_sammelspeicherung_rollt_alle_antworten_zurueck() {
        let conn = setup();
        let focus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(), klasse_name_snapshot: "7A".into(),
                lernziel: "Nebensätze korrekt setzen".into(), fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(), ausgangseinsatz_id: "e0".into(),
            },
        ).unwrap();
        let check = abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: focus.id, einsatz_id: "e1".into(), antwortmodus: "offen".into(),
                frage: "Formuliere einen Nebensatz.".into(), optionen: vec![], loesung: None,
                vergleichsgrundlage_bestaetigt: true,
            },
        ).unwrap();
        let error = abrufcheck_ergebnisse_batch_speichern_impl(
            &conn,
            AbrufCheckErgebnisBatchNeu {
                abrufcheck_id: check.id.clone(),
                eintraege: vec![
                    AbrufCheckErgebnisBatchEintrag { schueler_id: 1, antwort: "Ein Nebensatz.".into(), ergebnis: Some("richtig".into()) },
                    AbrufCheckErgebnisBatchEintrag { schueler_id: 999, antwort: "Nicht im Kurs.".into(), ergebnis: Some("noch_nicht".into()) },
                ],
            },
        ).unwrap_err();

        assert!(error.contains("es wurde nichts übernommen"));
        let summary = abrufcheck_list_impl(&conn, "k1").unwrap().remove(0);
        assert_eq!(summary.antwort_anzahl, 0);
        let student = abrufcheck_teilnahme_list_impl(&conn, &check.id).unwrap().remove(0);
        assert_eq!(student.status, "offen");
        assert!(student.antwort.is_none());
    }

    #[test]
    fn sammelspeicherung_prueft_auswahlantworten_lokal_und_ignoriert_eingesandte_wertung() {
        let conn = setup();
        let focus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(), klasse_name_snapshot: "7A".into(),
                lernziel: "Verbformen unterscheiden".into(), fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(), ausgangseinsatz_id: "e0".into(),
            },
        ).unwrap();
        let check = abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: focus.id, einsatz_id: "e1".into(), antwortmodus: "auswahl".into(),
                frage: "Welche Form ist korrekt?".into(),
                optionen: vec!["war gegangen".into(), "gingen war".into()],
                loesung: Some("war gegangen".into()), vergleichsgrundlage_bestaetigt: true,
            },
        ).unwrap();

        abrufcheck_ergebnisse_batch_speichern_impl(
            &conn,
            AbrufCheckErgebnisBatchNeu {
                abrufcheck_id: check.id.clone(),
                eintraege: vec![AbrufCheckErgebnisBatchEintrag {
                    schueler_id: 1, antwort: "gingen war".into(), ergebnis: Some("richtig".into()),
                }],
            },
        ).unwrap();

        let answer: (String, String) = conn.query_row(
            "SELECT ergebnis,ausgewertet_von FROM abrufcheck_ergebnis WHERE abrufcheck_id=?1 AND schueler_id=1",
            [&check.id], |row| Ok((row.get(0)?, row.get(1)?)),
        ).unwrap();
        assert_eq!(answer, ("noch_nicht".to_string(), "lokal".to_string()));
    }

    #[test]
    fn nachtraegliche_aenderungen_halten_einstufung_aber_keinen_alten_antworttext_fest() {
        let conn = setup();
        let fokus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(),
                klasse_name_snapshot: "7A".into(),
                lernziel: "Verbformen unterscheiden".into(),
                fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(),
                ausgangseinsatz_id: "e0".into(),
            },
        ).unwrap();
        let check = abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: fokus.id,
                einsatz_id: "e1".into(),
                antwortmodus: "offen".into(),
                frage: "Schreibe einen Satz mit passender Verbform.".into(),
                optionen: vec![],
                loesung: None,
                vergleichsgrundlage_bestaetigt: true,
            },
        ).unwrap();

        let save = |antwort: &str, ergebnis: &str| abrufcheck_ergebnis_speichern_impl(
            &conn,
            AbrufCheckErgebnisNeu {
                abrufcheck_id: check.id.clone(),
                schueler_id: 1,
                antwort: antwort.into(),
                ergebnis: Some(ergebnis.into()),
            },
        );

        save("Sie ging nach Hause.", "noch_nicht").unwrap();
        assert!(abrufcheck_ergebnis_aenderungen_list_impl(&conn, &check.id, 1).unwrap().is_empty());
        // Ein erneutes Speichern desselben Standes erzeugt keinen Scheineintrag.
        save("Sie ging nach Hause.", "noch_nicht").unwrap();
        assert!(abrufcheck_ergebnis_aenderungen_list_impl(&conn, &check.id, 1).unwrap().is_empty());
        save("Sie ging nach Hause.", "teilweise").unwrap();
        save("Sie ging gestern nach Hause.", "teilweise").unwrap();

        let history = abrufcheck_ergebnis_aenderungen_list_impl(&conn, &check.id, 1).unwrap();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].ergebnis_vorher, "noch_nicht");
        assert_eq!(history[0].ergebnis_nachher, "teilweise");
        assert!(!history[0].antwort_geaendert);
        assert_eq!(history[1].ergebnis_vorher, "teilweise");
        assert_eq!(history[1].ergebnis_nachher, "teilweise");
        assert!(history[1].antwort_geaendert);
        assert_eq!(history[0].ausgewertet_von_nachher, "lehrkraft");

        let row = abrufcheck_teilnahme_list_impl(&conn, &check.id).unwrap().remove(0);
        assert_eq!(row.aenderung_anzahl, 2);
        let summary = abrufcheck_list_impl(&conn, "k1").unwrap().remove(0);
        assert_eq!(summary.teilweise_anzahl, 1);
        assert_eq!(summary.noch_nicht_anzahl, 0);

        let columns: Vec<String> = conn.prepare("PRAGMA table_info(abrufcheck_ergebnis_aenderung)").unwrap()
            .query_map([], |r| r.get(1)).unwrap().collect::<Result<_, _>>().unwrap();
        assert!(!columns.iter().any(|column| column.contains("antwort_vorher") || column.contains("antwort_nachher")));
    }

    #[test]
    fn ausgangsstunde_bleibt_bei_lernziel_und_verschobener_checktermin_wird_aktuell_angezeigt() {
        let conn = setup();
        let fokus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(),
                klasse_name_snapshot: "7A".into(),
                lernziel: "Nebensätze korrekt setzen".into(),
                fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(),
                ausgangseinsatz_id: "e0".into(),
            },
        )
        .unwrap();
        assert_eq!(fokus.ausgangseinsatz_id.as_deref(), Some("e0"));
        assert_eq!(
            fokus.ausgangsstunden_titel_snapshot.as_deref(),
            Some("Nebensatz-Einstieg")
        );
        assert_eq!(fokus.ausgangsdatum_snapshot.as_deref(), Some("2099-10-01"));
        let check = abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: fokus.id,
                einsatz_id: "e1".into(),
                antwortmodus: "offen".into(),
                frage: "Bilde einen Nebensatz.".into(),
                optionen: vec![],
                loesung: None,
                vergleichsgrundlage_bestaetigt: false,
            },
        )
        .unwrap();

        conn.execute(
            "UPDATE unterrichtseinsatz SET geplant_am='2099-10-20' WHERE id='e1'",
            [],
        )
        .unwrap();
        let moved = abrufcheck_list_impl(&conn, "k1")
            .unwrap()
            .into_iter()
            .find(|item| item.id == check.id)
            .unwrap();
        assert_eq!(moved.faellig_am, "2099-10-20");
        assert!(moved.termin_gueltig);

        conn.execute(
            "UPDATE unterrichtseinsatz SET geplant_am='2099-09-30' WHERE id='e1'",
            [],
        )
        .unwrap();
        let stale = abrufcheck_list_impl(&conn, "k1")
            .unwrap()
            .into_iter()
            .find(|item| item.id == check.id)
            .unwrap();
        assert!(!stale.termin_gueltig);
        assert!(abrufcheck_ergebnis_speichern_impl(
            &conn,
            AbrufCheckErgebnisNeu {
                abrufcheck_id: check.id,
                schueler_id: 1,
                antwort: "Ein Nebensatz".into(),
                ergebnis: Some("teilweise".into()),
            }
        )
        .is_err());
    }

    #[test]
    fn abrufcheck_verlangt_termin_nach_ausgangsstunde_und_korrekturzeitraum() {
        let conn = setup();
        let fokus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(),
                klasse_name_snapshot: "7A".into(),
                lernziel: "Nebensätze korrekt setzen".into(),
                fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(),
                ausgangseinsatz_id: "e0".into(),
            },
        )
        .unwrap();
        conn.execute("UPDATE abgabe SET datum='2099-10-18' WHERE id=1", [])
            .unwrap();
        let updated_focus = lernziel_fokus_bestaetigen_impl(
            &conn,
            LernzielFokusNeu {
                klasse_id: "k1".into(),
                klasse_name_snapshot: "7A".into(),
                lernziel: "Kommas prüfen".into(),
                fehler_typ: "G".into(),
                aufgabe_snapshot: "Aufsatz".into(),
                ausgangseinsatz_id: "e0".into(),
            },
        )
        .unwrap();
        assert!(abrufcheck_erstellen_impl(
            &conn,
            AbrufCheckNeu {
                fokus_id: updated_focus.id,
                einsatz_id: "e1".into(),
                antwortmodus: "offen".into(),
                frage: "Bilde einen Nebensatz.".into(),
                optionen: vec![],
                loesung: None,
                vergleichsgrundlage_bestaetigt: false,
            }
        )
        .is_err());
        assert_eq!(fokus.ausgangseinsatz_id.as_deref(), Some("e0"));
    }
}
