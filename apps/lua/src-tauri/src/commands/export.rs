use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Speichert ein exportiertes Dokument (z. B. DOCX) als Datei.
///
/// - `dir` gesetzt und `ask == false` → direkt nach `dir/filename` schreiben.
/// - sonst → „Speichern unter…"-Dialog (Startordner = `dir`, falls vorhanden).
///
/// Rückgabe: gespeicherter Pfad. Bricht der Nutzer den Dialog ab, wird der
/// Fehlertext `ABBRUCH` zurückgegeben (der Aufrufer behandelt das nicht als Fehler).
#[tauri::command]
pub fn export_docx(
    app: AppHandle,
    dir: Option<String>,
    filename: String,
    bytes: Vec<u8>,
    ask: bool,
) -> Result<String, String> {
    let dir = dir.filter(|d| !d.trim().is_empty());

    let target: PathBuf = if !ask && dir.is_some() {
        let mut p = PathBuf::from(dir.unwrap());
        p.push(&filename);
        p
    } else {
        let mut builder = app.dialog().file().set_file_name(&filename);
        if let Some(d) = dir {
            builder = builder.set_directory(d);
        }
        match builder.blocking_save_file() {
            Some(fp) => fp.into_path().map_err(|e| e.to_string())?,
            None => return Err("ABBRUCH".to_string()),
        }
    };

    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Ordner konnte nicht angelegt werden: {}", e))?;
    }
    std::fs::write(&target, &bytes)
        .map_err(|e| format!("Speichern fehlgeschlagen: {}", e))?;

    Ok(target.to_string_lossy().to_string())
}
