//! Datei-Brücke NATASCHA → LUA (Phase 1).
//!
//! NATASCHA schreibt pro korrigierter Klasse/Aufgabe eine JSON-Datei in einen
//! geteilten Inbox-Ordner; LUA listet diese in Step0 und liest die ausgewählte
//! Datei. Vertrag siehe `bridge/schema.json` im Repo-Root.

use std::path::{Path, PathBuf};

use serde::Serialize;

/// Kompakter Heatmap-Eintrag für die Vorschau in der Auswahlliste.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapMini {
    pub typ: String,
    pub kategorie: String,
    pub anzahl: u64,
    pub prozent: f64,
}

/// Vorschau-Metadaten eines Exports für die Auswahlliste in Step0.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeExportMeta {
    pub klasse: String,
    pub aufgabe: String,
    pub datum: String,
    pub fach: String,
    pub anzahl_abgaben: u64,
    /// Summe aller Heatmap-Fehler (für das "X Fehler"-Badge).
    pub gesamt_fehler: u64,
    /// Heatmap, stärkste Kategorie zuerst (für die Mini-Vorschau).
    pub heatmap: Vec<HeatmapMini>,
    /// Absoluter Pfad — wird unverändert an `read_bridge_export` zurückgegeben.
    pub pfad: String,
    pub dateiname: String,
}

/// Standard-Inbox, falls der Aufrufer keinen Ordner vorgibt. Home-basiert, damit
/// beide Apps unabhängig vom Arbeitsverzeichnis denselben Ort treffen und keine
/// Schüler-Echtdaten im Repo-Baum landen.
fn default_inbox_dir() -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    Path::new(&home)
        .join("lehr-suite-bridge")
        .join("inbox")
}

fn resolve_dir(dir: &str) -> PathBuf {
    let trimmed = dir.trim();
    if trimmed.is_empty() {
        default_inbox_dir()
    } else {
        PathBuf::from(trimmed)
    }
}

/// Obergrenze für Bridge-JSON. Die Inbox ist ein von Fremdprozessen beschreibbares
/// Verzeichnis; ohne Cap friert eine riesige JSON die App beim Parsen ein (DoS).
const MAX_BRIDGE_BYTES: u64 = 5 * 1024 * 1024;

/// True, wenn `target` (nach Symlink-Auflösung) unterhalb von `inbox` liegt.
/// `canonicalize` verlangt Existenz → nicht existierende/fremde Pfade sind automatisch außen vor.
fn is_within(inbox: &Path, target: &Path) -> bool {
    match (inbox.canonicalize(), target.canonicalize()) {
        (Ok(base), Ok(t)) => t.starts_with(&base),
        _ => false,
    }
}

/// Prüft die Format-Version des Exports gegen den Vertrag (`bridge/schema.json`: 1 | 2).
fn check_schema_version(text: &str) -> Result<(), String> {
    let json: serde_json::Value = serde_json::from_str(text)
        .map_err(|e| format!("Export ist kein gültiges JSON: {}", e))?;
    match json.get("schemaVersion").and_then(|v| v.as_u64()) {
        Some(1) | Some(2) => Ok(()),
        Some(v) => Err(format!(
            "Nicht unterstützte Format-Version {} (LUA akzeptiert 1 oder 2).",
            v
        )),
        None => Err("Export ohne schemaVersion — abgelehnt.".to_string()),
    }
}

/// Liest einen Export mit Inbox-Confinement, Size-Cap und Versions-Check.
/// Sync-Kern von `read_bridge_export`, damit er ohne async-Runtime testbar ist.
fn read_export_confined(path: &str, inbox: &Path) -> Result<String, String> {
    let p = PathBuf::from(path.trim());
    let is_json = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("json"))
        .unwrap_or(false);
    if !is_json {
        return Err("Nur .json-Exporte werden unterstützt.".to_string());
    }
    if !is_within(inbox, &p) {
        return Err("Export liegt außerhalb des Inbox-Ordners.".to_string());
    }
    let meta = std::fs::metadata(&p).map_err(|e| format!("Export nicht lesbar: {}", e))?;
    if meta.len() > MAX_BRIDGE_BYTES {
        return Err(format!(
            "Export zu groß ({} Bytes, erlaubt max. {} Bytes).",
            meta.len(),
            MAX_BRIDGE_BYTES
        ));
    }
    let text = std::fs::read_to_string(&p).map_err(|e| format!("Export nicht lesbar: {}", e))?;
    check_schema_version(&text)?;
    Ok(text)
}

/// Listet die NATASCHA-Exporte im Inbox-Ordner, neueste zuerst.
/// Leerer `dir` → Standard-Inbox. Nicht vorhandener Ordner → leere Liste (kein Fehler).
#[tauri::command]
pub async fn list_bridge_exports(dir: String) -> Result<Vec<BridgeExportMeta>, String> {
    let inbox = resolve_dir(&dir);
    if !inbox.is_dir() {
        return Ok(Vec::new());
    }

    let entries =
        std::fs::read_dir(&inbox).map_err(|e| format!("Inbox-Ordner nicht lesbar: {}", e))?;

    let mut exports: Vec<BridgeExportMeta> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let is_json = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("json"))
            .unwrap_or(false);
        if !path.is_file() || !is_json {
            continue;
        }

        // Überdimensionale Dateien nicht einlesen (DoS-Schutz, gleiches Cap wie read_bridge_export).
        if std::fs::metadata(&path).map(|m| m.len() > MAX_BRIDGE_BYTES).unwrap_or(true) {
            continue;
        }

        // Defekte/fremde JSON-Dateien still überspringen statt die Liste zu sprengen.
        let Ok(text) = std::fs::read_to_string(&path) else { continue };
        let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) else { continue };

        let get = |key: &str| json.get(key).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let dateiname = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // Heatmap zusammenfassen (Gesamtfehler + sortierte Mini-Liste).
        let mut heatmap: Vec<HeatmapMini> = Vec::new();
        let mut gesamt_fehler: u64 = 0;
        if let Some(arr) = json.get("heatmap").and_then(|v| v.as_array()) {
            for h in arr {
                let anzahl = h.get("anzahl").and_then(|v| v.as_u64()).unwrap_or(0);
                gesamt_fehler += anzahl;
                heatmap.push(HeatmapMini {
                    typ: h.get("typ").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    kategorie: h.get("kategorie").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    anzahl,
                    prozent: h.get("prozent").and_then(|v| v.as_f64()).unwrap_or(0.0),
                });
            }
        }
        heatmap.sort_by(|a, b| b.anzahl.cmp(&a.anzahl));

        exports.push(BridgeExportMeta {
            klasse: get("klasse"),
            aufgabe: get("aufgabe"),
            datum: get("datum"),
            fach: get("fach"),
            anzahl_abgaben: json.get("anzahlAbgaben").and_then(|v| v.as_u64()).unwrap_or(0),
            gesamt_fehler,
            heatmap,
            pfad: path.to_string_lossy().to_string(),
            dateiname,
        });
    }

    // Neueste zuerst: nach Datum, dann Dateiname (beide absteigend).
    exports.sort_by(|a, b| {
        b.datum
            .cmp(&a.datum)
            .then_with(|| b.dateiname.cmp(&a.dateiname))
    });

    Ok(exports)
}

/// Liefert den rohen JSON-Inhalt eines Exports. Nur `.json`-Dateien unterhalb des
/// (aufgelösten) Inbox-Ordners, ≤ 5 MB, mit gültiger `schemaVersion` (1|2).
/// `dir` = derselbe Inbox-Pfad wie bei `list_bridge_exports` (leer → Standard-Inbox).
#[tauri::command]
pub async fn read_bridge_export(path: String, dir: String) -> Result<String, String> {
    let inbox = resolve_dir(&dir);
    read_export_confined(&path, &inbox)
}

/// Liefert den tatsächlich verwendeten Inbox-Pfad (für Anzeige im Leerzustand).
/// Leerer `dir` → Standard-Inbox.
#[tauri::command]
pub async fn resolve_bridge_inbox(dir: String) -> Result<String, String> {
    Ok(resolve_dir(&dir).to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Einmaliges Test-Inbox-Verzeichnis (std-only, kein tempfile-Dep).
    fn tmp_inbox(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "luka_bridge_test_{}_{}_{:?}",
            tag,
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn version_check_accepts_1_and_2() {
        assert!(check_schema_version(r#"{"schemaVersion":1}"#).is_ok());
        assert!(check_schema_version(r#"{"schemaVersion":2}"#).is_ok());
    }

    #[test]
    fn version_check_rejects_unknown_and_missing() {
        assert!(check_schema_version(r#"{"schemaVersion":99}"#).is_err());
        assert!(check_schema_version(r#"{"klasse":"7a"}"#).is_err());
        assert!(check_schema_version("nicht json").is_err());
    }

    #[test]
    fn read_confined_accepts_valid_export() {
        let inbox = tmp_inbox("ok");
        let f = inbox.join("export.json");
        std::fs::write(&f, r#"{"schemaVersion":2,"klasse":"7a"}"#).unwrap();
        let out = read_export_confined(f.to_str().unwrap(), &inbox).unwrap();
        assert!(out.contains("7a"));
    }

    #[test]
    fn read_confined_rejects_path_outside_inbox() {
        let inbox = tmp_inbox("outside_in");
        let other = tmp_inbox("outside_out");
        let f = other.join("evil.json");
        std::fs::write(&f, r#"{"schemaVersion":2}"#).unwrap();
        assert!(read_export_confined(f.to_str().unwrap(), &inbox).is_err());
    }

    #[test]
    fn read_confined_rejects_oversized_file() {
        let inbox = tmp_inbox("big");
        let f = inbox.join("big.json");
        // > 5 MB, mit gültigem JSON-Kopf (Größe schlägt zuerst zu).
        let mut blob = String::from(r#"{"schemaVersion":2,"pad":""#);
        blob.push_str(&"x".repeat((MAX_BRIDGE_BYTES as usize) + 1024));
        blob.push_str("\"}");
        std::fs::write(&f, &blob).unwrap();
        let err = read_export_confined(f.to_str().unwrap(), &inbox).unwrap_err();
        assert!(err.contains("zu groß"), "unerwartet: {err}");
    }

    #[test]
    fn read_confined_rejects_unknown_version() {
        let inbox = tmp_inbox("ver");
        let f = inbox.join("v99.json");
        std::fs::write(&f, r#"{"schemaVersion":99}"#).unwrap();
        assert!(read_export_confined(f.to_str().unwrap(), &inbox).is_err());
    }
}
