use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Speichert ein exportiertes Dokument (z. B. DOCX) als Datei.
///
/// - `dir` gesetzt und `ask == false` → direkt nach `dir/filename` schreiben.
/// - `dir` leer und `ask == false` → direkt in den Downloads-Ordner schreiben
///   (kein Dialog; entspricht dem Browser-Fallback und der Erfolgsmeldung).
/// - `ask == true` → „Speichern unter…"-Dialog (Startordner = `dir`, falls vorhanden).
///
/// Rückgabe: gespeicherter Pfad. Bricht der Nutzer den Dialog ab, wird der
/// Fehlertext `ABBRUCH` zurückgegeben (der Aufrufer behandelt das nicht als Fehler).
///
/// ACHTUNG: MUSS `async` bleiben. Synchrone Tauri-Commands laufen auf dem
/// Main-Thread, und `blocking_save_file()` deadlockt dort den Event-Loop —
/// die App friert komplett ein (Export-Freeze-Bug, 2026-07-04).
#[tauri::command]
pub async fn export_docx(
    app: AppHandle,
    dir: Option<String>,
    filename: String,
    bytes: Vec<u8>,
    ask: bool,
) -> Result<String, String> {
    let dir = dir.filter(|d| !d.trim().is_empty());

    // Nur den reinen Dateinamen zulassen — kein Pfad, kein "..", kein absoluter
    // Pfad. Verhindert Path-Traversal/Schreiben außerhalb des Zielordners, falls
    // der IPC-Aufrufer einen manipulierten `filename` schickt.
    let safe_name = std::path::Path::new(&filename)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Ungültiger Dateiname".to_string())?
        .to_string();

    let target: PathBuf = if !ask {
        // Ohne Dialog: konfigurierter Ordner, sonst Downloads-Fallback.
        let base = match dir {
            Some(d) => PathBuf::from(d),
            None => downloads_dir()?,
        };
        let mut p = base;
        p.push(&safe_name);
        p
    } else {
        let mut builder = app.dialog().file().set_file_name(&safe_name);
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

/// Downloads-Ordner des Nutzers (Windows: %USERPROFILE%\Downloads, sonst ~/Downloads).
fn downloads_dir() -> Result<PathBuf, String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Kein Home-Verzeichnis gefunden".to_string())?;
    let mut p = PathBuf::from(home);
    p.push("Downloads");
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn downloads_dir_endet_auf_downloads() {
        let d = downloads_dir().unwrap();
        assert!(d.ends_with("Downloads"));
    }
}
