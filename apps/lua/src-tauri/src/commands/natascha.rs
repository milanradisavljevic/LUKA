//! Phase 3a + Welle 1: NATASCHA-Integration — TUI-Start + Headless-CLI.
//!
//! Phase 3a: Startet die NATASCHA-TUI in einem Terminalfenster (Fallback).
//! Welle 1: Ruft die Headless-CLI als Sidecar auf (analyze, heatmap, etc.).
//! Langlaeufer (analyze) mit Fortschritts-Events und Cancel.

use once_cell::sync::Lazy;
use serde::Serialize;
use std::path::PathBuf;
use std::process::{Command as StdCommand, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const NATASCHA_CLI_TIMEOUT_SECS: u64 = 10 * 60;

static ACTIVE_PROCESS: Lazy<Mutex<Option<(u32, u64)>>> = Lazy::new(|| Mutex::new(None));
static NEXT_JOB_ID: Lazy<Mutex<u64>> = Lazy::new(|| Mutex::new(1));

#[derive(Clone, Serialize)]
struct NataschaProgress {
    job_id: Option<u64>,
    stage: &'static str,
    message: String,
}

fn emit_progress(
    app: Option<&AppHandle>,
    job_id: Option<u64>,
    stage: &'static str,
    message: impl Into<String>,
) {
    if let Some(app) = app {
        let _ = app.emit(
            "natascha://progress",
            NataschaProgress {
                job_id,
                stage,
                message: message.into(),
            },
        );
    }
}

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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NataschaStatus {
    pub mode: &'static str,
    pub label: &'static str,
}

fn next_job_id() -> u64 {
    let mut id = NEXT_JOB_ID.lock().expect("job id mutex poisoned");
    let current = *id;
    *id = current.saturating_add(1);
    current
}

fn bundled_cli() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let filename = if cfg!(windows) {
        "natascha-cli-x86_64-pc-windows-msvc.exe"
    } else {
        "natascha-cli"
    };
    let mut candidates = Vec::new();
    if let Some(parent) = exe.parent() {
        candidates.push(parent.join(filename));
        candidates.push(parent.join("resources").join(filename));
        candidates.push(parent.join("Resources").join(filename));
        candidates.push(parent.join(r"..\Resources").join(filename));
    }
    candidates.into_iter().find(|path| path.is_file())
}

fn natascha_status(dir: &str, _python: &str) -> NataschaStatus {
    if bundled_cli().is_some() {
        return NataschaStatus {
            mode: "bundled",
            label: "Gebündeltes NATASCHA-Sidecar",
        };
    }
    if resolve_dir(dir).is_ok() {
        return NataschaStatus {
            mode: "python",
            label: "Python-Fallback",
        };
    }
    NataschaStatus {
        mode: "unavailable",
        label: "Nicht verfügbar",
    }
}

fn default_python() -> &'static str {
    if cfg!(windows) {
        "python"
    } else {
        "python3"
    }
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
    StdCommand::new("cmd")
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
    StdCommand::new("osascript")
        .args(["-e", &script])
        .spawn()
        .map(|_| ())
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
        (
            "xterm",
            vec!["-fa", "Monospace", "-fs", "11", "-e", "bash", "-c", &inner],
        ),
        ("gnome-terminal", vec!["--", "bash", "-c", &inner]),
        ("konsole", vec!["-e", "bash", "-c", &inner]),
        ("x-terminal-emulator", vec!["-e", "bash", "-c", &inner]),
    ];
    let mut last_err: Option<std::io::Error> = None;
    for (term, args) in candidates {
        match StdCommand::new(term).args(&args).current_dir(work).spawn() {
            Ok(_) => return Ok(()),
            Err(e) => last_err = Some(e),
        }
    }
    Err(last_err.unwrap_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "kein Terminal gefunden")
    }))
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
            work.display(),
            py
        )
    })
}

// --- Welle 1: Headless-CLI als Sidecar ---

/// Helper: Baut den Basis-Command für natascha_cli.py. Übergibt IMMER den
/// kanonischen DB-Pfad (`db::resolve_db_path`), damit Python in dieselbe DB
/// schreibt, die LUA liest (Single Source of Truth = Rust).
fn build_cli_command(dir: &str, python: &str) -> Result<Command, String> {
    let db_path = crate::db::resolve_db_path();
    if let Some(sidecar) = bundled_cli() {
        let mut cmd = Command::new(sidecar);
        cmd.arg("--db-path").arg(db_path.as_os_str());
        if let Some(parent) = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(PathBuf::from))
        {
            cmd.current_dir(parent);
        }
        return Ok(cmd);
    }
    let natascha_dir = resolve_dir(dir)?;
    let py = resolve_python(python);
    let mut cmd = Command::new(&py);
    cmd.arg(natascha_dir.join("natascha_cli.py"))
        .arg("--db-path")
        .arg(db_path.as_os_str())
        .current_dir(natascha_dir);
    Ok(cmd)
}

/// Helper: Führt die CLI aus, gibt stdout (JSON) zurück. Bei Fehler eine
/// kategorisierte, lesbare Meldung statt rohem stderr/Traceback.
async fn run_cli_and_capture(
    mut cmd: Command,
    app: Option<&AppHandle>,
    label: &'static str,
) -> Result<String, String> {
    let job_id = next_job_id();
    emit_progress(app, Some(job_id), "start", format!("{label} gestartet"));
    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    let child = cmd.spawn().map_err(|e| {
        format!(
            "Python konnte nicht gestartet werden: {e}. Ist Python installiert? \
             Ggf. den Python-Befehl in den Einstellungen setzen."
        )
    })?;
    let pid = child
        .id()
        .ok_or_else(|| "NATASCHA-Prozess hat keine PID.".to_string())?;
    {
        let mut active = ACTIVE_PROCESS.lock().expect("process mutex poisoned");
        *active = Some((pid, job_id));
    }
    let output = match timeout(
        Duration::from_secs(NATASCHA_CLI_TIMEOUT_SECS),
        child.wait_with_output(),
    )
    .await
    {
        Ok(result) => result.map_err(|e| format!("CLI-Aufruf fehlgeschlagen: {e}"))?,
        Err(_) => {
            emit_progress(
                app,
                Some(job_id),
                "timeout",
                format!("{label} nach Timeout abgebrochen"),
            );
            let _ = terminate_process(job_id);
            return Err(format!(
                "{label} hat laenger als {} Minuten gedauert und wurde abgebrochen.",
                NATASCHA_CLI_TIMEOUT_SECS / 60
            ));
        }
    };
    ACTIVE_PROCESS
        .lock()
        .expect("process mutex poisoned")
        .take();
    if !output.status.success() {
        emit_progress(
            app,
            Some(job_id),
            "error",
            format!("{label} fehlgeschlagen"),
        );
        return Err(categorize_cli_error(&String::from_utf8_lossy(
            &output.stderr,
        )));
    }
    emit_progress(app, Some(job_id), "done", format!("{label} abgeschlossen"));
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn terminate_process(job_id: u64) -> Result<(), String> {
    let pid = ACTIVE_PROCESS
        .lock()
        .map_err(|_| "Prozessstatus nicht verfügbar".to_string())?
        .filter(|(_, id)| *id == job_id)
        .map(|(pid, _)| pid)
        .ok_or_else(|| "Kein laufender NATASCHA-Prozess gefunden.".to_string())?;
    #[cfg(windows)]
    let result = StdCommand::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status();
    #[cfg(not(windows))]
    let result = StdCommand::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status();
    result.map_err(|e| format!("NATASCHA-Prozess konnte nicht beendet werden: {e}"))?;
    ACTIVE_PROCESS
        .lock()
        .expect("process mutex poisoned")
        .take();
    Ok(())
}

#[tauri::command]
pub fn natascha_get_status(dir: String, python: String) -> NataschaStatus {
    natascha_status(&dir, &python)
}

#[tauri::command]
pub fn natascha_cancel(app: AppHandle, job_id: Option<u64>) -> Result<(), String> {
    let current = ACTIVE_PROCESS
        .lock()
        .map_err(|_| "Prozessstatus nicht verfügbar".to_string())?
        .clone();
    let id = job_id
        .or_else(|| current.map(|(_, id)| id))
        .ok_or_else(|| "Kein laufender NATASCHA-Prozess.".to_string())?;
    terminate_process(id)?;
    emit_progress(
        Some(&app),
        Some(id),
        "cancelled",
        "NATASCHA-Auftrag abgebrochen",
    );
    Ok(())
}

/// Übersetzt typische CLI/LLM-Fehler in verständliche Meldungen (statt Traceback).
fn categorize_cli_error(stderr: &str) -> String {
    let s = stderr.to_lowercase();
    let hint = if s.contains("api")
        && (s.contains("key")
            || s.contains("401")
            || s.contains("authentication")
            || s.contains("unauthorized"))
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
    app: AppHandle,
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
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("analyze")
        .arg(&file_path)
        .arg("--klasse")
        .arg(&klasse)
        .arg("--aufgabe")
        .arg(&aufgabe);
    if let Some(ref v) = fach {
        cmd.arg("--fach").arg(v);
    }
    if let Some(ref v) = schulstufe {
        cmd.arg("--schulstufe").arg(v);
    }
    if let Some(ref v) = textsorte {
        cmd.arg("--textsorte").arg(v);
    }
    if let Some(ref v) = schueler {
        cmd.arg("--schueler").arg(v);
    }
    if let Some(ref v) = bewertungsmodus {
        cmd.arg("--bewertungsmodus").arg(v);
    }
    if let Some(ref v) = ausgangstext {
        cmd.arg("--ausgangstext").arg(v);
    }
    if let Some(ref v) = erwartungshorizont {
        cmd.arg("--erwartungshorizont").arg(v);
    }
    if let Some(ref v) = rubric {
        cmd.arg("--rubric").arg(v);
    }
    run_cli_and_capture(cmd, Some(&app), "NATASCHA-Analyse").await
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
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("feedback-docx").arg(abgabe_id.to_string());
    if let Some(ref v) = output {
        cmd.arg("--output").arg(v);
    }
    if let Some(ref v) = bewertungsmodus {
        cmd.arg("--bewertungsmodus").arg(v);
    }
    run_cli_and_capture(cmd, None, "NATASCHA-DOCX").await
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
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("erwartungshorizont")
        .arg("--klasse")
        .arg(&klasse)
        .arg("--aufgabe")
        .arg(&aufgabe);
    if let Some(ref v) = provider {
        cmd.arg("--provider").arg(v);
    }
    if let Some(ref v) = model {
        cmd.arg("--model").arg(v);
    }
    run_cli_and_capture(cmd, None, "NATASCHA-Erwartungshorizont").await
}

/// Dev-Hilfe: lädt synthetische Testdaten in die gemeinsame DB
/// (führt `seed_testdaten.py` aus; nutzt den Shared-DB-Pfad aus der Config).
#[tauri::command]
pub async fn natascha_seed_testdaten(dir: String, python: String) -> Result<String, String> {
    let nat_dir = resolve_dir(&dir)?;
    let py = resolve_python(&python);
    let output = Command::new(&py)
        .arg(nat_dir.join("seed_testdaten.py"))
        .arg("--db-path")
        .arg(crate::db::resolve_db_path().as_os_str())
        .current_dir(&nat_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .output()
        .await
        .map_err(|e| format!("Python konnte nicht gestartet werden: {e}. Python-Befehl ggf. in den Einstellungen setzen."))?;
    if !output.status.success() {
        return Err(categorize_cli_error(&String::from_utf8_lossy(
            &output.stderr,
        )));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

// --- Welle 4: Setup (Klasse/Aufgabe/Rubrik) ---

/// Legt eine neue Klasse in der NATASCHA-Config an.
#[tauri::command]
pub async fn natascha_add_klasse(
    dir: String,
    python: String,
    name: String,
) -> Result<String, String> {
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("add-klasse").arg(&name);
    run_cli_and_capture(cmd, None, "NATASCHA-Klasse").await
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
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("add-aufgabe").arg(&klasse).arg(&label);
    if let Some(ref v) = fach {
        cmd.arg("--fach").arg(v);
    }
    if let Some(ref v) = schulstufe {
        cmd.arg("--schulstufe").arg(v);
    }
    if let Some(ref v) = textsorte {
        cmd.arg("--textsorte").arg(v);
    }
    if let Some(ref v) = rubric {
        cmd.arg("--rubric").arg(v);
    }
    run_cli_and_capture(cmd, None, "NATASCHA-Aufgabe").await
}

/// Listet verfügbare Rubriken (gefiltert nach Fach/Schulstufe).
#[tauri::command]
pub async fn natascha_list_rubrics(
    dir: String,
    python: String,
    fach: Option<String>,
    schulstufe: Option<String>,
) -> Result<String, String> {
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("list-rubrics");
    if let Some(ref v) = fach {
        cmd.arg("--fach").arg(v);
    }
    if let Some(ref v) = schulstufe {
        cmd.arg("--schulstufe").arg(v);
    }
    run_cli_and_capture(cmd, None, "NATASCHA-Rubriken").await
}

/// Importiert bestehende Analyse-JSONs (output/.../feedback_data) in die DB.
#[tauri::command]
pub async fn natascha_retro_import(
    dir: String,
    python: String,
    klasse: String,
    aufgabe: Option<String>,
) -> Result<String, String> {
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("retro-import").arg("--klasse").arg(&klasse);
    if let Some(ref v) = aufgabe {
        cmd.arg("--aufgabe").arg(v);
    }
    run_cli_and_capture(cmd, None, "NATASCHA-Retro-Import").await
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
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("quelltext-get")
        .arg("--klasse")
        .arg(&klasse)
        .arg("--aufgabe")
        .arg(&aufgabe);
    run_cli_and_capture(cmd, None, "NATASCHA-Ausgangstext").await
}

/// Listet alle Rubrik-Markdown-Dateien (roh) für den Editor.
#[tauri::command]
pub async fn natascha_list_rubric_files(dir: String, python: String) -> Result<String, String> {
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("list-rubric-files");
    run_cli_and_capture(cmd, None, "NATASCHA-Rubrikdateien").await
}

/// Liest den Roh-Markdown einer Rubrik.
#[tauri::command]
pub async fn natascha_read_rubric(
    dir: String,
    python: String,
    name: String,
) -> Result<String, String> {
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("read-rubric").arg("--name").arg(&name);
    run_cli_and_capture(cmd, None, "NATASCHA-Rubrik").await
}

/// Speichert (überschreibt/legt an) eine Rubrik (Markdown via stdin).
#[tauri::command]
pub async fn natascha_save_rubric(
    dir: String,
    python: String,
    name: String,
    content: String,
) -> Result<String, String> {
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("save-rubric")
        .arg("--name")
        .arg(&name)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| {
        format!("Python konnte nicht gestartet werden: {e}. Python-Befehl ggf. in den Einstellungen setzen.")
    })?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(content.as_bytes())
            .await
            .map_err(|e| format!("stdin-Schreibfehler: {e}"))?;
    }
    let output = timeout(
        Duration::from_secs(NATASCHA_CLI_TIMEOUT_SECS),
        child.wait_with_output(),
    )
    .await
    .map_err(|_| "Rubrik-Speichern hat zu lange gedauert und wurde abgebrochen.".to_string())?
    .map_err(|e| format!("CLI-Aufruf fehlgeschlagen: {e}"))?;
    if !output.status.success() {
        return Err(categorize_cli_error(&String::from_utf8_lossy(
            &output.stderr,
        )));
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
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("erwartungshorizont-save")
        .arg("--klasse")
        .arg(&klasse)
        .arg("--aufgabe")
        .arg(&aufgabe)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| {
        format!("Python konnte nicht gestartet werden: {e}. Python-Befehl ggf. in den Einstellungen setzen.")
    })?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(text.as_bytes())
            .await
            .map_err(|e| format!("stdin-Schreibfehler: {e}"))?;
    }
    let output = timeout(
        Duration::from_secs(NATASCHA_CLI_TIMEOUT_SECS),
        child.wait_with_output(),
    )
    .await
    .map_err(|_| {
        "Erwartungshorizont-Speichern hat zu lange gedauert und wurde abgebrochen.".to_string()
    })?
    .map_err(|e| format!("CLI-Aufruf fehlgeschlagen: {e}"))?;
    if !output.status.success() {
        return Err(categorize_cli_error(&String::from_utf8_lossy(
            &output.stderr,
        )));
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
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("klassen-briefing").arg("--klasse").arg(&klasse);
    if let Some(ref v) = aufgabe {
        cmd.arg("--aufgabe").arg(v);
    }
    if let Some(ref v) = provider {
        cmd.arg("--provider").arg(v);
    }
    if let Some(ref v) = model {
        cmd.arg("--model").arg(v);
    }
    run_cli_and_capture(cmd, None, "NATASCHA-Klassenbriefing").await
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
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("schueler-profil")
        .arg("--schueler-id")
        .arg(schueler_id.to_string());
    if let Some(ref v) = provider {
        cmd.arg("--provider").arg(v);
    }
    if let Some(ref v) = model {
        cmd.arg("--model").arg(v);
    }
    run_cli_and_capture(cmd, None, "NATASCHA-Schuelerprofil").await
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
