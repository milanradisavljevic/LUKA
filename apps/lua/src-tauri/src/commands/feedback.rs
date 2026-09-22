use std::time::Duration;

use reqwest::{Client, StatusCode, Url};
use serde::{Deserialize, Serialize};

// This is a public endpoint, not a credential. It is supplied at build time
// after the Cloudflare Worker has been deployed. Never add a mail password or
// an API key to this application.
const BUG_REPORT_ENDPOINT: Option<&str> = option_env!("LUKA_BUG_REPORT_ENDPOINT");
const DESCRIPTION_MIN_CHARS: usize = 10;
const DESCRIPTION_MAX_CHARS: usize = 4_000;

#[derive(Debug, Deserialize)]
pub struct BugReportPayload {
    pub description: String,
    #[serde(rename = "includeSystemInfo")]
    pub include_system_info: bool,
    #[serde(rename = "contactEmail")]
    pub contact_email: Option<String>,
}

#[derive(Debug, Serialize, PartialEq)]
struct BugReportRequest {
    description: String,
    #[serde(rename = "contactEmail", skip_serializing_if = "Option::is_none")]
    contact_email: Option<String>,
    #[serde(rename = "systemInfo", skip_serializing_if = "Option::is_none")]
    system_info: Option<SystemInfo>,
}

#[derive(Debug, Serialize, PartialEq)]
struct SystemInfo {
    #[serde(rename = "appVersion")]
    app_version: String,
    os: String,
    arch: String,
}

#[tauri::command]
pub async fn submit_bug_report(payload: BugReportPayload) -> Result<String, String> {
    let request = build_request(payload)?;
    let endpoint = configured_endpoint()?;
    let client = Client::builder()
        .connect_timeout(Duration::from_secs(8))
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|_| "Der Bericht konnte nicht vorbereitet werden. Bitte versuche es erneut.".to_string())?;

    let response = client
        .post(endpoint)
        .header("User-Agent", format!("LUKA/{}", env!("CARGO_PKG_VERSION")))
        .json(&request)
        .send()
        .await
        .map_err(|_| "Der Bericht konnte nicht gesendet werden. Bitte prüfe deine Internetverbindung und versuche es erneut.".to_string())?;

    if response.status().is_success() {
        Ok("Fehlermeldung erfolgreich weitergeleitet.".into())
    } else {
        Err(response_error_message(response.status()))
    }
}

fn build_request(payload: BugReportPayload) -> Result<BugReportRequest, String> {
    let description = payload.description.trim().to_string();
    let length = description.chars().count();
    if !(DESCRIPTION_MIN_CHARS..=DESCRIPTION_MAX_CHARS).contains(&length) {
        return Err(format!(
            "Bitte beschreibe den Fehler mit mindestens {DESCRIPTION_MIN_CHARS} und höchstens {DESCRIPTION_MAX_CHARS} Zeichen."
        ));
    }
    if contains_disallowed_control_characters(&description) {
        return Err("Die Beschreibung enthält nicht unterstützte Steuerzeichen.".into());
    }

    let contact_email = payload
        .contact_email
        .map(|email| email.trim().to_string())
        .filter(|email| !email.is_empty());
    if let Some(email) = &contact_email {
        if !is_valid_contact_email(email) {
            return Err("Bitte gib eine gültige E-Mail-Adresse für Rückfragen ein.".into());
        }
    }

    Ok(BugReportRequest {
        description,
        contact_email,
        system_info: payload.include_system_info.then(|| SystemInfo {
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            os: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
        }),
    })
}

fn configured_endpoint() -> Result<Url, String> {
    let endpoint = BUG_REPORT_ENDPOINT.ok_or_else(|| {
        "Der Versand für Fehlermeldungen ist in dieser LUKA-Version noch nicht eingerichtet.".to_string()
    })?;
    let url = Url::parse(endpoint)
        .map_err(|_| "Der Versand für Fehlermeldungen ist in dieser LUKA-Version nicht korrekt eingerichtet.".to_string())?;
    if url.scheme() != "https" || url.host_str().is_none() {
        return Err("Der Versand für Fehlermeldungen ist in dieser LUKA-Version nicht korrekt eingerichtet.".into());
    }
    Ok(url)
}

fn response_error_message(status: StatusCode) -> String {
    match status {
        StatusCode::TOO_MANY_REQUESTS => {
            "Zu viele Fehlermeldungen in kurzer Zeit. Bitte warte kurz und versuche es dann erneut."
                .into()
        }
        status if status.is_client_error() => {
            "Die Fehlermeldung konnte nicht verarbeitet werden. Bitte prüfe deine Angaben und versuche es erneut."
                .into()
        }
        _ => "Der Versanddienst ist gerade nicht erreichbar. Bitte versuche es später erneut.".into(),
    }
}

fn is_valid_contact_email(email: &str) -> bool {
    email.len() <= 254
        && !email.chars().any(|character| character.is_control() || character.is_whitespace())
        && email.split('@').count() == 2
        && email
            .split_once('@')
            .is_some_and(|(local, domain)| !local.is_empty() && domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.'))
}

fn contains_disallowed_control_characters(value: &str) -> bool {
    value
        .chars()
        .any(|character| character.is_control() && !matches!(character, '\n' | '\r' | '\t'))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload(description: &str) -> BugReportPayload {
        BugReportPayload {
            description: description.into(),
            include_system_info: false,
            contact_email: None,
        }
    }

    #[test]
    fn accepts_a_valid_minimal_report() {
        let request = build_request(payload("LUKA startet nicht")).unwrap();
        assert_eq!(request.description, "LUKA startet nicht");
        assert_eq!(request.contact_email, None);
        assert_eq!(request.system_info, None);
    }

    #[test]
    fn rejects_short_or_overlong_reports() {
        assert!(build_request(payload("Zu kurz")).is_err());
        assert!(build_request(payload(&"a".repeat(DESCRIPTION_MAX_CHARS + 1))).is_err());
    }

    #[test]
    fn validates_optional_contact_email() {
        let mut valid = payload("Die Vorschau zeigt einen leeren Bereich");
        valid.contact_email = Some("lehrkraft@example.org".into());
        assert_eq!(
            build_request(valid).unwrap().contact_email.as_deref(),
            Some("lehrkraft@example.org")
        );

        let mut invalid = payload("Die Vorschau zeigt einen leeren Bereich");
        invalid.contact_email = Some("keine-adresse".into());
        assert!(build_request(invalid).is_err());
    }

    #[test]
    fn includes_only_requested_system_information() {
        let mut report = payload("Die Vorschau zeigt einen leeren Bereich");
        report.include_system_info = true;
        let request = build_request(report).unwrap();
        assert_eq!(request.system_info.unwrap().app_version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn contact_email_validation_rejects_whitespace_and_multiple_at_signs() {
        assert!(!is_valid_contact_email("frau beispiel@example.org"));
        assert!(!is_valid_contact_email("frau@beispiel@example.org"));
    }

    #[test]
    fn maps_rate_limit_client_and_service_failures_without_provider_details() {
        assert!(response_error_message(StatusCode::TOO_MANY_REQUESTS).contains("Zu viele"));
        assert!(response_error_message(StatusCode::BAD_REQUEST).contains("Angaben"));
        assert!(response_error_message(StatusCode::BAD_GATEWAY).contains("später"));
    }
}
