//! Phase 3a: NATASCHA-Korrektur-TUI aus der App heraus starten.
//!
//! Die Textual-TUI läuft nicht in der WebView, daher öffnen wir sie in einem
//! eigenen Terminalfenster. Ordner/Python sind konfigurierbar (Einstellungen);
//! sind sie leer, wird `apps/natascha` relativ zur Anwendung gesucht und der
//! OS-Standard-Python verwendet.

use std::path::{Path, PathBuf};
use std::process::Command;

/// Sucht `apps/natascha/` ausgehend vom Programmpfad aufwärts (Dev-Layout +
/// kopiertes Repo). Für ein gepacktes Installer-Bundle wäre NATASCHA als
/// Sidecar zu bündeln — siehe docs/phase3-correction-ui.md.
fn find_natascha_dir() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    for anc in exe.ancestors() {
        let cand = anc.join("apps").join("natascha");
        if cand.join("natascha.py").is_file() {
            return Some(cand);
        }
    }
    None
}

fn resolve_dir(dir: &str) -> Result<PathBuf, String> {
    let trimmed = dir.trim();
    let path = if trimmed.is_empty() {
        find_natascha_dir().ok_or_else(|| {
            "NATASCHA-Ordner nicht gefunden. Bitte in den Einstellungen den Pfad zum \
             Ordner apps/natascha setzen."
                .to_string()
        })?
    } else {
        PathBuf::from(trimmed)
    };
    if !path.join("natascha.py").is_file() {
        return Err(format!("In {} liegt keine natascha.py.", path.display()));
    }
    Ok(path)
}

fn default_python() -> &'static str {
    if cfg!(windows) {
        "python"
    } else {
        "python3"
    }
}

#[cfg(target_os = "windows")]
fn spawn_terminal(work: &Path, py: &str) -> std::io::Result<()> {
    // Neues Konsolenfenster, das nach Beenden offen bleibt (cmd /K).
    Command::new("cmd")
        .args(["/C", "start", "NATASCHA", "cmd", "/K"])
        .arg(format!("{} natascha.py", py))
        .current_dir(work)
        .spawn()
        .map(|_| ())
}

#[cfg(target_os = "macos")]
fn spawn_terminal(work: &Path, py: &str) -> std::io::Result<()> {
    let script = format!(
        "tell application \"Terminal\" to do script \"cd {:?} && {} natascha.py\"",
        work, py
    );
    Command::new("osascript").args(["-e", &script]).spawn().map(|_| ())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn spawn_terminal(work: &Path, py: &str) -> std::io::Result<()> {
    // Gängige Terminal-Emulatoren der Reihe nach probieren; cwd via current_dir,
    // damit keine Pfade in den Shell-String müssen.
    let inner = format!("{} natascha.py; exec bash", py);
    let candidates: [(&str, Vec<&str>); 4] = [
        ("x-terminal-emulator", vec!["-e", "bash", "-c", &inner]),
        ("gnome-terminal", vec!["--", "bash", "-c", &inner]),
        ("konsole", vec!["-e", "bash", "-c", &inner]),
        ("xterm", vec!["-e", "bash", "-c", &inner]),
    ];
    let mut last_err: Option<std::io::Error> = None;
    for (term, args) in candidates {
        match Command::new(term).args(&args).current_dir(work).spawn() {
            Ok(_) => return Ok(()),
            Err(e) => last_err = Some(e),
        }
    }
    Err(last_err
        .unwrap_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "kein Terminal gefunden")))
}

/// Öffnet die NATASCHA-Korrektur-TUI in einem neuen Terminalfenster.
/// Leerer `dir`/`python` → Auto-Erkennung bzw. OS-Default.
#[tauri::command]
pub async fn launch_natascha(dir: String, python: String) -> Result<(), String> {
    let work = resolve_dir(&dir)?;
    let py = if python.trim().is_empty() {
        default_python().to_string()
    } else {
        python.trim().to_string()
    };

    spawn_terminal(&work, &py).map_err(|e| {
        format!(
            "Terminal konnte nicht gestartet werden: {e}. Starte NATASCHA manuell: \
             cd {} && {} natascha.py",
            work.display(),
            py
        )
    })
}
