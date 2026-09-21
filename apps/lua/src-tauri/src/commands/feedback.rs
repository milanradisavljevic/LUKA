use std::fmt;

use lettre::message::{header::ContentType, Mailbox, Message};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Tokio1Executor};
use serde::{Deserialize, Serialize};

use crate::keystore;

const SMTP_CONFIG_SERVICE: &str = "lehr-suite-smtp";
const DEFAULT_SMTP_HOST: &str = "smtp.proton.me";
const DEFAULT_SMTP_PORT: u16 = 465;
const BUG_REPORT_TO: &str = "milan.radisavljevic@proton.me";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    #[serde(skip)]
    pub password: String,
}

impl Default for SmtpConfig {
    fn default() -> Self {
        Self {
            host: DEFAULT_SMTP_HOST.to_string(),
            port: DEFAULT_SMTP_PORT,
            username: String::new(),
            password: String::new(),
        }
    }
}

impl fmt::Display for SmtpConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.host, self.port)
    }
}

fn config_json_key() -> String {
    format!("{SMTP_CONFIG_SERVICE}-config")
}

fn password_key() -> String {
    format!("{SMTP_CONFIG_SERVICE}-password")
}

#[tauri::command]
pub async fn load_smtp_config() -> Result<SmtpConfig, String> {
    let config_json = keystore::load_key(&config_json_key()).unwrap_or_default();
    let mut config: SmtpConfig = if config_json.is_empty() {
        SmtpConfig::default()
    } else {
        serde_json::from_str(&config_json).unwrap_or_default()
    };
    config.password = keystore::load_key(&password_key()).unwrap_or_default();
    Ok(config)
}

#[tauri::command]
pub async fn save_smtp_config(config: SmtpConfig) -> Result<(), String> {
    let mut config = config;
    let password = config.password.clone();
    config.password = String::new();
    let json = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    keystore::save_key(&config_json_key(), &json)?;
    keystore::save_key(&password_key(), &password)?;
    Ok(())
}

#[tauri::command]
pub async fn test_smtp_connection(config: SmtpConfig) -> Result<String, String> {
    if config.username.is_empty() || config.password.is_empty() {
        return Err("Benutzername und Passwort muessen angegeben werden.".into());
    }

    let creds = Credentials::new(config.username.clone(), config.password.clone());

    let transport = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.host)
        .map_err(|e| format!("SMTP-Relay-Fehler: {e}"))?
        .port(config.port)
        .credentials(creds)
        .build();

    let test_msg = Message::builder()
        .from(Mailbox::new(None, "test@lehr-suite.local".parse().unwrap()))
        .to(Mailbox::new(None, "test@lehr-suite.local".parse().unwrap()))
        .subject("LUKA SMTP-Test")
        .header(ContentType::TEXT_PLAIN)
        .body(String::from("Test"))
        .map_err(|e| format!("Nachrichtenbau-Fehler: {e}"))?;

    transport
        .send(test_msg)
        .await
        .map_err(|e| format!("SMTP-Verbindung fehlgeschlagen: {e}"))?;

    Ok("Verbindung erfolgreich hergestellt.".into())
}

#[derive(Debug, Deserialize)]
pub struct BugReportPayload {
    pub description: String,
    pub include_system_info: bool,
    pub contact_email: Option<String>,
}

#[tauri::command]
pub async fn submit_bug_report(payload: BugReportPayload) -> Result<String, String> {
    let config = load_smtp_config().await?;

    if config.username.is_empty() || config.password.is_empty() {
        return Err(
            "SMTP nicht konfiguriert. Bitte zuerst in den Einstellungen unter \
             'SMTP / Fehlermeldungen' einrichten."
                .into(),
        );
    }

    let mut body = String::new();
    body.push_str("=== LUKA Bug-Report ===\n\n");
    body.push_str(&format!("Datum: {}\n", chrono_now()));
    body.push_str(&format!("Beschreibung:\n{}\n\n", payload.description));

    if payload.include_system_info {
        body.push_str("--- Systeminfos ---\n");
        body.push_str(&format!("App-Version: {}\n", env!("CARGO_PKG_VERSION")));
        body.push_str(&format!("Betriebssystem: {}\n", std::env::consts::OS));
        body.push_str(&format!("Architektur: {}\n", std::env::consts::ARCH));
        body.push('\n');
    }

    if let Some(email) = &payload.contact_email {
        if !email.is_empty() {
            let line = format!("Kontakt-E-Mail: {}\n", email);
            body.push_str(&line);
        }
    }

    let from_mailbox: Mailbox = format!("LUKA Bug-Report <{}>", config.username)
        .parse()
        .map_err(|e| format!("Absender-Adresse ungueltig: {e}"))?;

    let to_mailbox: Mailbox = format!("Luka Entwicklung <{BUG_REPORT_TO}>")
        .parse()
        .map_err(|e| format!("Empfaenger-Adresse ungueltig: {e}"))?;

    let subject = format!(
        "[LUKA Bug] {}",
        truncate(&payload.description, 60)
    );

    let email = Message::builder()
        .from(from_mailbox)
        .to(to_mailbox)
        .subject(subject)
        .header(ContentType::TEXT_PLAIN)
        .body(body)
        .map_err(|e| format!("Nachrichtenbau-Fehler: {e}"))?;

    let creds = Credentials::new(config.username.clone(), config.password.clone());

    let transport = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.host)
        .map_err(|e| format!("SMTP-Relay-Fehler: {e}"))?
        .port(config.port)
        .credentials(creds)
        .build();

    transport
        .send(email)
        .await
        .map_err(|e| format!("E-Mail-Versand fehlgeschlagen: {e}"))?;

    Ok("Bug-Report erfolgreich gesendet.".into())
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.len() <= max_chars {
        s.to_string()
    } else {
        format!("{}...", &s[..max_chars])
    }
}

fn chrono_now() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| format!("Unix-{}", d.as_secs()))
        .unwrap_or_else(|_| "unbekannt".into())
}
