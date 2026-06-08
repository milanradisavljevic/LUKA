//! Datei-Brücke NATASCHA → LUA (Phase 1).
//!
//! NATASCHA schreibt pro korrigierter Klasse/Aufgabe eine JSON-Datei in einen
//! geteilten Inbox-Ordner; LUA listet diese in Step0 und liest die ausgewählte
//! Datei. Vertrag siehe `bridge/schema.json` im Repo-Root.

use std::path::{Path, PathBuf};

use serde::Serialize;

/// Vorschau-Metadaten eines Exports für die Auswahlliste in Step0.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeExportMeta {
    pub klasse: String,
    pub aufgabe: String,
    pub datum: String,
    pub fach: String,
    pub anzahl_abgaben: u64,
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

        // Defekte/fremde JSON-Dateien still überspringen statt die Liste zu sprengen.
        let Ok(text) = std::fs::read_to_string(&path) else { continue };
        let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) else { continue };

        let get = |key: &str| json.get(key).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let dateiname = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        exports.push(BridgeExportMeta {
            klasse: get("klasse"),
            aufgabe: get("aufgabe"),
            datum: get("datum"),
            fach: get("fach"),
            anzahl_abgaben: json.get("anzahlAbgaben").and_then(|v| v.as_u64()).unwrap_or(0),
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

/// Liefert den rohen JSON-Inhalt eines Exports. Nur `.json`-Dateien zugelassen.
#[tauri::command]
pub async fn read_bridge_export(path: String) -> Result<String, String> {
    let p = PathBuf::from(path.trim());
    let is_json = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("json"))
        .unwrap_or(false);
    if !is_json {
        return Err("Nur .json-Exporte werden unterstützt.".to_string());
    }
    std::fs::read_to_string(&p).map_err(|e| format!("Export nicht lesbar: {}", e))
}
