//! Phase 3a + Welle 1: NATASCHA-Integration — TUI-Start + Headless-CLI.
//!
//! Phase 3a: Startet die NATASCHA-TUI in einem Terminalfenster (Fallback).
//! Welle 1: Ruft die Headless-CLI als Sidecar auf (analyze, heatmap, etc.).
//! Langlaeufer (analyze) mit Fortschritts-Events und Cancel.

use std::path::PathBuf;
use std::process::Command;

/// Sucht `apps/natascha/` ausgehend vom Programmpfad aufwaerts.
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
    if cfg!(windows) { "python" } else { "python3" }
}

fn resolve_python(python: &str) -> String {
    if python.trim().is_empty() {
        default_python().to_string()
    } else {
        python.trim().to_string()
    }
}

/// Validiert den Python-Befehl gegen eine Whitelist, bevor er (in `launch_natascha`)
/// in einen `cmd`-/`osascript`-String interpoliert wird. Ein präpariertes Settings-JSON
/// könnte sonst beliebige Kommandos ausführen. Erlaubt sind nur Zeichen, die in echten
/// Interpreter-Pfaden vorkommen: Buchstaben, Ziffern und `_ . : / \ - ` (Leerzeichen).
fn validate_python_command(py: &str) -> Result<(), String> {
    let ok = !py.is_empty()
        && py.chars().all(|c| {
            c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | ':' | '/' | '\\' | ' ' | '-')
        });
    if ok {
        Ok(())
    } else {
        Err(format!(
            "Ungültiger Python-Befehl: {py:?}. Erlaubt sind nur Buchstaben, Ziffern und _ . : / \\ - \
             (keine Shell-Sonderzeichen). Bitte den Python-Befehl in den Einstellungen korrigieren."
        ))
    }
}

// --- Phase 3a: TUI in Terminal starten ---

#[cfg(target_os = "windows")]
fn spawn_terminal(work: &PathBuf, py: &str) -> std::io::Result<()> {
    Command::new("cmd")
        .args(["/C", "start", "NATASCHA", "cmd", "/K"])
        .arg(format!("{} natascha.py", py))
        .current_dir(work)
        .spawn()
        .map(|_| ())
}

#[cfg(target_os = "macos")]
fn spawn_terminal(work: &PathBuf, py: &str) -> std::io::Result<()> {
    let script = format!(
        "tell application \"Terminal\" to do script \"cd {:?} && {} natascha.py\"",
        work, py
    );
    Command::new("osascript").args(["-e", &script]).spawn().map(|_| ())
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn spawn_terminal(work: &PathBuf, py: &str) -> std::io::Result<()> {
    let inner = format!("{} natascha.py; exec bash", py);
    // xterm zuerst, mit skalierbarer Xft-Schrift (-fa/-fs): vermeidet den Absturz
    // von Terminals, die die Bitmap-Schrift "9x18" verlangen, die unter WSLg/
    // minimalen X-Servern fehlt (z. B. Zutty hinter x-terminal-emulator →
    // "fontpack.cc: No suitable files for '9x18' found"). x-terminal-emulator
    // deshalb zuletzt.
    let candidates: [(&str, Vec<&str>); 4] = [
        ("xterm", vec!["-fa", "Monospace", "-fs", "11", "-e", "bash", "-c", &inner]),
        ("gnome-terminal", vec!["--", "bash", "-c", &inner]),
        ("konsole", vec!["-e", "bash", "-c", &inner]),
        ("x-terminal-emulator", vec!["-e", "bash", "-c", &inner]),
    ];
    let mut last_err: Option<std::io::Error> = None;
    for (term, args) in candidates {
        match Command::new(term).args(&args).current_dir(work).spawn() {
            Ok(_) => return Ok(()),
            Err(e) => last_err = Some(e),
        }
    }
    Err(last_err.unwrap_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "kein Terminal gefunden")))
}

/// Startet die NATASCHA-TUI in einem Terminalfenster.
#[tauri::command]
pub async fn launch_natascha(dir: String, python: String) -> Result<(), String> {
    let work = resolve_dir(&dir)?;
    let py = resolve_python(&python);
    validate_python_command(&py)?;
    spawn_terminal(&work, &py).map_err(|e| {
        format!(
            "Terminal konnte nicht gestartet werden: {e}. Starte NATASCHA manuell: \
             cd {} && {} natascha.py",
            work.display(), py
        )
    })
}

// --- Welle 1: Headless-CLI als Sidecar ---

/// Helper: Baut den Basis-Command für natascha_cli.py. Übergibt IMMER den
/// kanonischen DB-Pfad (`db::resolve_db_path`), damit Python in dieselbe DB
/// schreibt, die LUA liest (Single Source of Truth = Rust).
fn build_cli_command(natascha_dir: &PathBuf, python: &str) -> Command {
    let py = resolve_python(python);
    let db_path = crate::db::resolve_db_path();
    let mut cmd = Command::new(&py);
    cmd.arg(natascha_dir.join("natascha_cli.py"))
        .arg("--db-path")
        .arg(db_path.as_os_str())
        .current_dir(natascha_dir);
    cmd
}

/// Helper: Führt die CLI aus, gibt stdout (JSON) zurück. Bei Fehler eine
/// kategorisierte, lesbare Meldung statt rohem stderr/Traceback.
fn run_cli_and_capture(mut cmd: Command) -> Result<String, String> {
    let output = cmd.output().map_err(|e| {
        format!(
            "Python konnte nicht gestartet werden: {e}. Ist Python installiert? \
             Ggf. den Python-Befehl in den Einstellungen setzen."
        )
    })?;
    if !output.status.success() {
        return Err(categorize_cli_error(&String::from_utf8_lossy(&output.stderr)));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Übersetzt typische CLI/LLM-Fehler in verständliche Meldungen (statt Traceback).
fn categorize_cli_error(stderr: &str) -> String {
    let s = stderr.to_lowercase();
    let hint = if s.contains("api")
        && (s.contains("key") || s.contains("401") || s.contains("authentication") || s.contains("unauthorized"))
    {
        "API-Key fehlt oder ist ungültig — bitte in den Einstellungen hinterlegen."
    } else if s.contains("datei nicht gefunden") || s.contains("no such file") {
        "Datei nicht gefunden."
    } else if s.contains("timeout")
        || s.contains("timed out")
        || s.contains("connection")
        || s.contains("getaddrinfo")
        || s.contains("temporary failure in name resolution")
    {
        "Netzwerkfehler — keine Verbindung zum LLM-Anbieter. Internet/Proxy prüfen."
    } else if s.contains("rate limit") || s.contains("429") {
        "Anbieter-Ratenlimit erreicht — bitte später erneut versuchen."
    } else if s.contains("modulenotfounderror") || s.contains("no module named") {
        "Python-Abhängigkeit fehlt — bitte requirements installieren (apps/natascha)."
    } else {
        ""
    };
    let detail = stderr.trim();
    if hint.is_empty() {
        format!("Analyse fehlgeschlagen: {detail}")
    } else {
        format!("{hint}\n\nDetails: {detail}")
    }
}

/// Fuehrt `natascha_cli.py analyze` als Sidecar aus. Gibt das Analyse-JSON zurueck.
#[tauri::command]
pub async fn natascha_analyze(
    dir: String,
    python: String,
    file_path: String,
    klasse: String,
    aufgabe: String,
    fach: Option<String>,
    schulstufe: Option<String>,
    textsorte: Option<String>,
    schueler: Option<String>,
    bewertungsmodus: Option<String>,
    ausgangstext: Option<String>,
    erwartungshorizont: Option<String>,
    rubric: Option<String>,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("analyze")
        .arg(&file_path)
        .arg("--klasse").arg(&klasse)
        .arg("--aufgabe").arg(&aufgabe);
    if let Some(ref v) = fach { cmd.arg("--fach").arg(v); }
    if let Some(ref v) = schulstufe { cmd.arg("--schulstufe").arg(v); }
    if let Some(ref v) = textsorte { cmd.arg("--textsorte").arg(v); }
    if let Some(ref v) = schueler { cmd.arg("--schueler").arg(v); }
    if let Some(ref v) = bewertungsmodus { cmd.arg("--bewertungsmodus").arg(v); }
    if let Some(ref v) = ausgangstext { cmd.arg("--ausgangstext").arg(v); }
    if let Some(ref v) = erwartungshorizont { cmd.arg("--erwartungshorizont").arg(v); }
    if let Some(ref v) = rubric { cmd.arg("--rubric").arg(v); }
    run_cli_and_capture(cmd)
}

// Hinweis: Lese-Befehle (Klassen/Aufgaben/Abgaben/Heatmap/Notenverteilung/
// Statistik) laufen NICHT über die CLI, sondern direkt über den Rust-Read-Layer
// (`natascha_read.rs`, db_*). Die früheren CLI-Sidecar-Wrapper waren ungenutzt
// und wurden entfernt (eine Read-Quelle statt zwei).

/// Generiert eine Feedback-DOCX via CLI.
#[tauri::command]
pub async fn natascha_feedback_docx(
    dir: String,
    python: String,
    abgabe_id: i64,
    output: Option<String>,
    bewertungsmodus: Option<String>,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("feedback-docx").arg(abgabe_id.to_string());
    if let Some(ref v) = output { cmd.arg("--output").arg(v); }
    if let Some(ref v) = bewertungsmodus { cmd.arg("--bewertungsmodus").arg(v); }
    run_cli_and_capture(cmd)
}

/// Generiert einen Erwartungshorizont via CLI.
#[tauri::command]
pub async fn natascha_erwartungshorizont(
    dir: String,
    python: String,
    klasse: String,
    aufgabe: String,
    provider: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("erwartungshorizont")
        .arg("--klasse").arg(&klasse)
        .arg("--aufgabe").arg(&aufgabe);
    if let Some(ref v) = provider { cmd.arg("--provider").arg(v); }
    if let Some(ref v) = model { cmd.arg("--model").arg(v); }
    run_cli_and_capture(cmd)
}

/// Dev-Hilfe: lädt synthetische Testdaten in die gemeinsame DB
/// (führt `seed_testdaten.py` aus; nutzt den Shared-DB-Pfad aus der Config).
#[tauri::command]
pub async fn natascha_seed_testdaten(dir: String, python: String) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let py = resolve_python(&python);
    let output = Command::new(&py)
        .arg(nat_dir.join("seed_testdaten.py"))
        .current_dir(&nat_dir)
        .output()
        .map_err(|e| {
            format!("Python konnte nicht gestartet werden: {e}. Python-Befehl ggf. in den Einstellungen setzen.")
        })?;
    if !output.status.success() {
        return Err(categorize_cli_error(&String::from_utf8_lossy(&output.stderr)));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

// --- Welle 4: Setup (Klasse/Aufgabe/Rubrik) ---

/// Legt eine neue Klasse in der NATASCHA-Config an.
#[tauri::command]
pub async fn natascha_add_klasse(dir: String, python: String, name: String) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("add-klasse").arg(&name);
    run_cli_and_capture(cmd)
}

/// Legt eine neue Aufgabe (mit Rubrik-Zuordnung) an.
#[tauri::command]
pub async fn natascha_add_aufgabe(
    dir: String,
    python: String,
    klasse: String,
    label: String,
    fach: Option<String>,
    schulstufe: Option<String>,
    textsorte: Option<String>,
    rubric: Option<String>,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("add-aufgabe").arg(&klasse).arg(&label);
    if let Some(ref v) = fach { cmd.arg("--fach").arg(v); }
    if let Some(ref v) = schulstufe { cmd.arg("--schulstufe").arg(v); }
    if let Some(ref v) = textsorte { cmd.arg("--textsorte").arg(v); }
    if let Some(ref v) = rubric { cmd.arg("--rubric").arg(v); }
    run_cli_and_capture(cmd)
}

/// Listet verfügbare Rubriken (gefiltert nach Fach/Schulstufe).
#[tauri::command]
pub async fn natascha_list_rubrics(
    dir: String,
    python: String,
    fach: Option<String>,
    schulstufe: Option<String>,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("list-rubrics");
    if let Some(ref v) = fach { cmd.arg("--fach").arg(v); }
    if let Some(ref v) = schulstufe { cmd.arg("--schulstufe").arg(v); }
    run_cli_and_capture(cmd)
}

/// Importiert bestehende Analyse-JSONs (output/.../feedback_data) in die DB.
#[tauri::command]
pub async fn natascha_retro_import(
    dir: String,
    python: String,
    klasse: String,
    aufgabe: Option<String>,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("retro-import").arg("--klasse").arg(&klasse);
    if let Some(ref v) = aufgabe { cmd.arg("--aufgabe").arg(v); }
    run_cli_and_capture(cmd)
}

/// Liest den gespeicherten Ausgangstext einer Aufgabe (für die In-App-Übung-
/// Vorbefüllung). Gibt JSON `{ klasse, aufgabe, ausgangstext }` zurück;
/// `ausgangstext` ist leer, wenn keiner gespeichert ist.
#[tauri::command]
pub async fn natascha_quelltext_get(
    dir: String,
    python: String,
    klasse: String,
    aufgabe: String,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("quelltext-get")
        .arg("--klasse").arg(&klasse)
        .arg("--aufgabe").arg(&aufgabe);
    run_cli_and_capture(cmd)
}

/// Listet alle Rubrik-Markdown-Dateien (roh) für den Editor.
#[tauri::command]
pub async fn natascha_list_rubric_files(
    dir: String,
    python: String,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("list-rubric-files");
    run_cli_and_capture(cmd)
}

/// Liest den Roh-Markdown einer Rubrik.
#[tauri::command]
pub async fn natascha_read_rubric(
    dir: String,
    python: String,
    name: String,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("read-rubric").arg("--name").arg(&name);
    run_cli_and_capture(cmd)
}

/// Speichert (überschreibt/legt an) eine Rubrik (Markdown via stdin).
#[tauri::command]
pub async fn natascha_save_rubric(
    dir: String,
    python: String,
    name: String,
    content: String,
) -> Result<String, String> {
    use std::io::Write;
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("save-rubric").arg("--name").arg(&name)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| {
        format!("Python konnte nicht gestartet werden: {e}. Python-Befehl ggf. in den Einstellungen setzen.")
    })?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(content.as_bytes()).map_err(|e| format!("stdin-Schreibfehler: {e}"))?;
    }
    let output = child.wait_with_output().map_err(|e| format!("CLI-Aufruf fehlgeschlagen: {e}"))?;
    if !output.status.success() {
        return Err(categorize_cli_error(&String::from_utf8_lossy(&output.stderr)));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Speichert den (bearbeiteten) Erwartungshorizont (Text via stdin) als
/// rubrics/erwartungshorizont_*.md und verlinkt ihn in der Config.
#[tauri::command]
pub async fn natascha_save_erwartungshorizont(
    dir: String,
    python: String,
    klasse: String,
    aufgabe: String,
    text: String,
) -> Result<String, String> {
    use std::io::Write;
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("erwartungshorizont-save")
        .arg("--klasse").arg(&klasse)
        .arg("--aufgabe").arg(&aufgabe)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| {
        format!("Python konnte nicht gestartet werden: {e}. Python-Befehl ggf. in den Einstellungen setzen.")
    })?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(text.as_bytes()).map_err(|e| format!("stdin-Schreibfehler: {e}"))?;
    }
    let output = child.wait_with_output().map_err(|e| format!("CLI-Aufruf fehlgeschlagen: {e}"))?;
    if !output.status.success() {
        return Err(categorize_cli_error(&String::from_utf8_lossy(&output.stderr)));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Generiert ein KI-Klassen-Briefing via CLI und speichert es in der DB.
#[tauri::command]
pub async fn natascha_klassen_briefing(
    dir: String,
    python: String,
    klasse: String,
    aufgabe: Option<String>,
    provider: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("klassen-briefing").arg("--klasse").arg(&klasse);
    if let Some(ref v) = aufgabe { cmd.arg("--aufgabe").arg(v); }
    if let Some(ref v) = provider { cmd.arg("--provider").arg(v); }
    if let Some(ref v) = model { cmd.arg("--model").arg(v); }
    run_cli_and_capture(cmd)
}

/// Generiert ein KI-Schüler-Profil via CLI und speichert es in der DB.
#[tauri::command]
pub async fn natascha_schueler_profil(
    dir: String,
    python: String,
    schueler_id: i64,
    provider: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let mut cmd = build_cli_command(&nat_dir, &python);
    cmd.arg("schueler-profil").arg("--schueler-id").arg(schueler_id.to_string());
    if let Some(ref v) = provider { cmd.arg("--provider").arg(v); }
    if let Some(ref v) = model { cmd.arg("--model").arg(v); }
    run_cli_and_capture(cmd)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn python_command_accepts_real_interpreters() {
        assert!(validate_python_command("python").is_ok());
        assert!(validate_python_command("python3").is_ok());
        assert!(validate_python_command("py").is_ok());
        assert!(validate_python_command("/usr/bin/python3").is_ok());
        assert!(validate_python_command("C:\\Python311\\python.exe").is_ok());
    }

    #[test]
    fn python_command_rejects_injection() {
        assert!(validate_python_command("python & calc").is_err());
        assert!(validate_python_command("python; rm -rf /").is_err());
        assert!(validate_python_command("python$(whoami)").is_err());
        assert!(validate_python_command("python`id`").is_err());
        assert!(validate_python_command("python && start").is_err());
        assert!(validate_python_command("").is_err());
    }
}