//! Phase 3a + Welle 1: NATASCHA-Integration — TUI-Start + Headless-CLI.
//!
//! Phase 3a: Startet die NATASCHA-TUI in einem Terminalfenster (Fallback).
//! Welle 1: Ruft die Headless-CLI als Sidecar auf (analyze, heatmap, etc.).
//! Langlaeufer (analyze) mit Fortschritts-Events und Cancel.

use once_cell::sync::Lazy;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::{Command as StdCommand, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const NATASCHA_CLI_TIMEOUT_SECS: u64 = 10 * 60;

static ACTIVE_PROCESS: Lazy<Mutex<Option<(u32, u64)>>> = Lazy::new(|| Mutex::new(None));
static NEXT_JOB_ID: Lazy<Mutex<u64>> = Lazy::new(|| Mutex::new(1));
static STATUS_CACHE: Lazy<Mutex<Option<(String, NataschaStatus)>>> = Lazy::new(|| Mutex::new(None));

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
            "Das Korrektur-Modul ist nicht verfügbar. Bitte LUKA aktualisieren oder \
             unter Einstellungen → Korrektur-Modul → Erweitert einen gültigen \
             Korrektur-Ordner hinterlegen."
                .to_string()
        })?
    } else {
        PathBuf::from(trimmed)
    };
    if !path.join("natascha.py").is_file() {
        return Err(format!(
            "Der eingestellte Korrektur-Ordner ist nicht verfügbar:\n{}\n\
             Lösung: In den Einstellungen unter Korrektur-Modul → Erweitert einen \
             gültigen Ordner auswählen oder das Feld für die automatische Erkennung leeren.",
            path.display()
        ));
    }
    Ok(path)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NataschaStatus {
    pub available: bool,
    pub mode: &'static str,
    pub code: &'static str,
    pub label: &'static str,
    pub diagnostic: Option<String>,
}

fn next_job_id() -> u64 {
    let mut id = NEXT_JOB_ID.lock().expect("job id mutex poisoned");
    let current = *id;
    *id = current.saturating_add(1);
    current
}

fn bundled_cli_candidates(exe: &Path) -> Vec<PathBuf> {
    let filenames: &[&str] = if cfg!(windows) {
        // Tauri bundles externalBin under its configured base name. The
        // target-suffixed name remains useful for development artifacts.
        &[
            "natascha-cli.exe",
            "natascha-cli-x86_64-pc-windows-msvc.exe",
        ]
    } else {
        &["natascha-cli", "natascha-cli-universal-apple-darwin"]
    };
    let mut candidates = Vec::new();
    if let Some(parent) = exe.parent() {
        for filename in filenames {
            candidates.push(parent.join(filename));
            candidates.push(parent.join("resources").join(filename));
            candidates.push(parent.join("Resources").join(filename));
            candidates.push(parent.join(r"..\Resources").join(filename));
        }
    }
    candidates
}

fn bundled_cli_from_exe(exe: &Path) -> Option<PathBuf> {
    bundled_cli_candidates(exe)
        .into_iter()
        .find(|path| path.is_file())
}

fn bundled_cli() -> Option<PathBuf> {
    bundled_cli_from_exe(&std::env::current_exe().ok()?)
}

fn status_ready(mode: &'static str, code: &'static str, label: &'static str) -> NataschaStatus {
    NataschaStatus {
        available: true,
        mode,
        code,
        label,
        diagnostic: None,
    }
}

fn status_unavailable(
    code: &'static str,
    label: &'static str,
    diagnostic: impl Into<String>,
) -> NataschaStatus {
    NataschaStatus {
        available: false,
        mode: "unavailable",
        code,
        label,
        diagnostic: Some(diagnostic.into()),
    }
}

fn status_from_probe(mode: &'static str, probe: Result<(), String>) -> NataschaStatus {
    match (mode, probe) {
        ("bundled", Ok(())) => status_ready(
            "bundled",
            "ready_bundled",
            "Einsatzbereit — Korrektur eingebaut",
        ),
        ("python", Ok(())) => status_ready(
            "python",
            "ready_python",
            "Einsatzbereit — lokales Korrektur-Modul",
        ),
        ("bundled", Err(detail)) | ("python", Err(detail)) => status_unavailable(
            "sidecar_unstartable",
            "Korrektur-Modul konnte nicht gestartet werden",
            detail,
        ),
        _ => status_unavailable(
            "sidecar_unstartable",
            "Korrektur-Modul konnte nicht gestartet werden",
            "Unbekannter Korrektur-Modus",
        ),
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
        .args(["/C", "start", "Korrektur", "cmd", "/K"])
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
            "Terminal konnte nicht gestartet werden: {e}. Starte die Korrektur-TUI manuell: \
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
/// Provider-IDs → Env-Variablen, die das Python-Modul liest (natascha_core
/// key_map). Muss mit beiden Seiten synchron bleiben.
const PROVIDER_ENV_KEYS: &[(&str, &str)] = &[
    ("anthropic", "ANTHROPIC_API_KEY"),
    ("openai", "OPENAI_API_KEY"),
    ("mistral", "MISTRAL_API_KEY"),
    ("deepseek", "DEEPSEEK_API_KEY"),
    ("kimi", "KIMI_API_KEY"),
    ("qwen", "QWEN_API_KEY"),
];

/// Reicht die im OS-Keystore hinterlegten API-Keys als Umgebungsvariablen an
/// den Sidecar durch. Das gebündelte Python liest Keys ausschließlich aus
/// os.environ und eine .env wird nicht mitgeliefert — ohne diese Injektion
/// ist die Korrektur-Analyse in der installierten App tot. Bewusst Env statt
/// CLI-Argument: Argumente wären in Prozesslisten für jeden sichtbar.
/// (_load_dotenv arbeitet mit override=False — im Dev-Modus gewinnt der
/// Keystore-Key ebenfalls, eine lokale .env bleibt nur Fallback.)
fn inject_provider_keys(cmd: &mut Command) {
    for (provider, env_name) in PROVIDER_ENV_KEYS {
        if let Ok(key) = crate::keystore::load_key(provider) {
            let key = key.trim();
            if !key.is_empty() {
                cmd.env(env_name, key);
            }
        }
    }
}

fn build_cli_command(dir: &str, python: &str) -> Result<Command, String> {
    let db_path = crate::db::resolve_db_path();
    if let Some(sidecar) = bundled_cli() {
        let mut cmd = Command::new(sidecar);
        inject_provider_keys(&mut cmd);
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
    inject_provider_keys(&mut cmd);
    cmd.arg(natascha_dir.join("natascha_cli.py"))
        .arg("--db-path")
        .arg(db_path.as_os_str())
        .current_dir(natascha_dir);
    Ok(cmd)
}

/// Führt einen nicht-destruktiven Starttest aus. `--help` beendet sich vor
/// jeder Datenbank- oder LLM-Initialisierung und prüft trotzdem, ob das
/// gebündelte bzw. konfigurierte Modul tatsächlich ausführbar ist.
async fn probe_command(mut cmd: Command) -> Result<(), String> {
    cmd.kill_on_drop(true);
    let output = timeout(Duration::from_secs(8), cmd.arg("--help").output())
        .await
        .map_err(|_| "Die Prüfung des Korrektur-Moduls hat zu lange gedauert.".to_string())?
        .map_err(|e| format!("Korrektur-Modul konnte nicht gestartet werden: {e}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if detail.is_empty() {
            format!("Korrektur-Modul beendet sich mit Status {}.", output.status)
        } else {
            detail
        })
    }
}

async fn natascha_status(dir: &str, python: &str) -> NataschaStatus {
    if let Some(sidecar) = bundled_cli() {
        let mut cmd = Command::new(sidecar);
        cmd.arg("analyze");
        return status_from_probe("bundled", probe_command(cmd).await);
    }

    let natascha_dir = match resolve_dir(dir) {
        Ok(path) => path,
        Err(detail) => {
            return status_unavailable("sidecar_missing", "Korrektur-Modul nicht gefunden", detail)
        }
    };
    let py = resolve_python(python);
    let mut cmd = Command::new(py);
    cmd.arg(natascha_dir.join("natascha_cli.py"));
    status_from_probe("python", probe_command(cmd).await)
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
        .ok_or_else(|| "Korrektur-Prozess hat keine PID.".to_string())?;
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
        .ok_or_else(|| "Kein laufender Korrektur-Prozess gefunden.".to_string())?;
    #[cfg(windows)]
    let result = StdCommand::new("taskkill")
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .status();
    #[cfg(not(windows))]
    let result = StdCommand::new("kill")
        .args(["-TERM", &pid.to_string()])
        .status();
    result.map_err(|e| format!("Korrektur-Prozess konnte nicht beendet werden: {e}"))?;
    ACTIVE_PROCESS
        .lock()
        .expect("process mutex poisoned")
        .take();
    Ok(())
}

#[tauri::command]
pub async fn natascha_get_status(
    dir: String,
    python: String,
    force_refresh: Option<bool>,
) -> NataschaStatus {
    let key = format!("{dir}\u{0}{python}");
    if !force_refresh.unwrap_or(false) {
        if let Some((cached_key, status)) = STATUS_CACHE
            .lock()
            .expect("status cache mutex poisoned")
            .as_ref()
        {
            if cached_key == &key {
                return status.clone();
            }
        }
    }
    let status = natascha_status(&dir, &python).await;
    *STATUS_CACHE.lock().expect("status cache mutex poisoned") = Some((key, status.clone()));
    status
}

#[tauri::command]
pub fn natascha_cancel(app: AppHandle, job_id: Option<u64>) -> Result<(), String> {
    let current = ACTIVE_PROCESS
        .lock()
        .map_err(|_| "Prozessstatus nicht verfügbar".to_string())?
        .clone();
    let id = job_id
        .or_else(|| current.map(|(_, id)| id))
        .ok_or_else(|| "Kein laufender Korrektur-Prozess.".to_string())?;
    terminate_process(id)?;
    emit_progress(
        Some(&app),
        Some(id),
        "cancelled",
        "Korrektur-Auftrag abgebrochen",
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
    ausgangstext_text: Option<String>,
    ausgangstext_file: Option<String>,
    erwartungshorizont: Option<String>,
    rubric: Option<String>,
    pseudonymisierung: Option<bool>,
    schueler_id: Option<i64>,
    einsatz_id: Option<String>,
    material_id: Option<String>,
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
    if let Some(ref v) = ausgangstext_text {
        cmd.arg("--ausgangstext-text").arg(v);
    } else if let Some(ref v) = ausgangstext_file {
        cmd.arg("--ausgangstext-file").arg(v);
    } else if let Some(ref v) = ausgangstext {
        // Rückwärtskompatibilität für ältere Web-Bundles: alter Parameter war
        // ein Dateipfad.
        cmd.arg("--ausgangstext-file").arg(v);
    }
    if let Some(ref v) = erwartungshorizont {
        cmd.arg("--erwartungshorizont").arg(v);
    }
    if let Some(ref v) = rubric {
        cmd.arg("--rubric").arg(v);
    }
    // Standard ist Pseudonymisierung AN (Python-Default); nur explizites
    // Abschalten wird als Flag durchgereicht.
    if pseudonymisierung == Some(false) {
        cmd.arg("--keine-pseudonymisierung");
    }
    // Von der Lehrkraft bestätigte Zuordnung — hat in Python Vorrang vor der
    // Namensheuristik und legt nie neue Schüler an.
    if let Some(id) = schueler_id {
        cmd.arg("--schueler-id").arg(id.to_string());
    }
    if let Some(ref id) = einsatz_id {
        cmd.arg("--einsatz-id").arg(id);
    }
    if let Some(ref id) = material_id {
        cmd.arg("--material-id").arg(id);
    }
    run_cli_and_capture(cmd, Some(&app), "Korrektur-Analyse").await
}

/// Redaktionsvorschau: welche Personenangaben aus der Klassenliste würden vor
/// dem LLM-Versand ersetzt (kein LLM-Call). Gibt JSON `{ funde, visionModus,
/// klassenlisteLeer }` zurück.
#[tauri::command]
pub async fn natascha_personen_vorschau(
    dir: String,
    python: String,
    file_path: String,
    klasse: String,
    schueler: Option<String>,
) -> Result<String, String> {
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("personen-vorschau")
        .arg(&file_path)
        .arg("--klasse")
        .arg(&klasse);
    if let Some(ref v) = schueler {
        cmd.arg("--schueler").arg(v);
    }
    run_cli_and_capture(cmd, None, "Personen-Vorschau").await
}

// Hinweis: Lese-Befehle (Klassen/Aufgaben/Abgaben/Heatmap/Notenverteilung/
// Statistik) laufen NICHT über die CLI, sondern direkt über den Rust-Read-Layer
// (`natascha_read.rs`, db_*). Die früheren CLI-Sidecar-Wrapper waren ungenutzt
// und wurden entfernt (eine Read-Quelle statt zwei).

/// Generiert eine Feedback-DOCX via CLI.
#[tauri::command]
pub async fn natascha_feedback_docx(
    state: tauri::State<'_, crate::commands::db::DbState>,
    dir: String,
    python: String,
    abgabe_id: i64,
    output: Option<String>,
    bewertungsmodus: Option<String>,
) -> Result<String, String> {
    // Name der Lehrkraft aus dem lokalen LUKA-Profil: Kommentare und
    // Metadaten der Feedback-DOCX sollen die tatsächliche Lehrkraft
    // ausweisen, nicht den teacher_name-Default aus der Sidecar-Config.
    // (Eigener Scope: der Mutex-Guard darf nicht über das await leben.)
    let lehrer: Option<String> = {
        let guard = state.conn()?;
        guard
            .query_row(
                "SELECT display_name FROM lua_lehrerprofil WHERE id=1",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok()
            .map(|name| name.trim().to_string())
            .filter(|name| !name.is_empty())
    };
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("feedback-docx").arg(abgabe_id.to_string());
    // Immer einen expliziten Zielpfad übergeben: der Python-Default wäre
    // Path.cwd() = Exe-Verzeichnis (z. B. Program Files) — dort ist Schreiben
    // oft verboten und die Datei für die Lehrkraft unauffindbar. Ablage im
    // Bridge-Ordner, den „Ordner öffnen“ in der UI direkt anzeigen kann.
    let ziel = match output {
        Some(v) => v,
        None => {
            let ordner = crate::db::home_dir()
                .ok_or_else(|| "Home-Verzeichnis nicht gefunden.".to_string())?
                .join("lehr-suite-bridge")
                .join("feedback");
            std::fs::create_dir_all(&ordner)
                .map_err(|e| format!("Feedback-Ordner konnte nicht erstellt werden: {e}"))?;
            ordner
                .join(format!("feedback_{abgabe_id}.docx"))
                .to_string_lossy()
                .into_owned()
        }
    };
    cmd.arg("--output").arg(&ziel);
    if let Some(ref v) = bewertungsmodus {
        cmd.arg("--bewertungsmodus").arg(v);
    }
    if let Some(ref v) = lehrer {
        cmd.arg("--lehrer").arg(v);
    }
    run_cli_and_capture(cmd, None, "Korrektur-DOCX").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Erwartungshorizont").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Klasse").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Aufgabe").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Rubriken").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Retro-Import").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Ausgangstext").await
}

/// Listet alle Rubrik-Markdown-Dateien (roh) für den Editor.
#[tauri::command]
pub async fn natascha_list_rubric_files(dir: String, python: String) -> Result<String, String> {
    let mut cmd = build_cli_command(&dir, &python)?;
    cmd.arg("list-rubric-files");
    run_cli_and_capture(cmd, None, "Korrektur-Rubrikdateien").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Rubrik").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Klassenbriefing").await
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
    run_cli_and_capture(cmd, None, "Korrektur-Schuelerprofil").await
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

    /// Muss synchron zur key_map in natascha_core.py bleiben — sonst startet
    /// der Sidecar ohne Key und die Analyse endet mit "API_KEY nicht gesetzt".
    #[test]
    fn provider_env_mapping_ist_vollstaendig_und_eindeutig() {
        let erwartet = [
            ("anthropic", "ANTHROPIC_API_KEY"),
            ("openai", "OPENAI_API_KEY"),
            ("mistral", "MISTRAL_API_KEY"),
            ("deepseek", "DEEPSEEK_API_KEY"),
            ("kimi", "KIMI_API_KEY"),
            ("qwen", "QWEN_API_KEY"),
        ];
        assert_eq!(PROVIDER_ENV_KEYS, &erwartet);
        let mut env_namen: Vec<&str> = PROVIDER_ENV_KEYS.iter().map(|(_, e)| *e).collect();
        env_namen.sort_unstable();
        env_namen.dedup();
        assert_eq!(env_namen.len(), PROVIDER_ENV_KEYS.len());
    }

    #[test]
    fn bundled_cli_prefers_installed_runtime_name() {
        let root = std::env::temp_dir().join(format!("luka-sidecar-name-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let exe = root.join(if cfg!(windows) { "luka.exe" } else { "luka" });
        let installed = root.join(if cfg!(windows) {
            "natascha-cli.exe"
        } else {
            "natascha-cli"
        });
        let suffixed = root.join(if cfg!(windows) {
            "natascha-cli-x86_64-pc-windows-msvc.exe"
        } else {
            "natascha-cli-universal-apple-darwin"
        });
        std::fs::write(&installed, b"installed").unwrap();
        std::fs::write(&suffixed, b"build").unwrap();

        assert_eq!(bundled_cli_from_exe(&exe), Some(installed));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn bundled_cli_accepts_target_suffix_as_fallback() {
        let root =
            std::env::temp_dir().join(format!("luka-sidecar-fallback-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let exe = root.join(if cfg!(windows) { "luka.exe" } else { "luka" });
        let suffixed = root.join(if cfg!(windows) {
            "natascha-cli-x86_64-pc-windows-msvc.exe"
        } else {
            "natascha-cli-universal-apple-darwin"
        });
        std::fs::write(&suffixed, b"build").unwrap();

        assert_eq!(bundled_cli_from_exe(&exe), Some(suffixed));
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn status_probe_maps_ready_and_unstartable_states() {
        let ready = status_from_probe("bundled", Ok(()));
        assert!(ready.available);
        assert_eq!(ready.code, "ready_bundled");

        let failed = status_from_probe("bundled", Err("probe failed".to_string()));
        assert!(!failed.available);
        assert_eq!(failed.code, "sidecar_unstartable");
        assert_eq!(failed.diagnostic.as_deref(), Some("probe failed"));
    }
}
