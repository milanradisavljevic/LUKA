use crate::adapters::{anthropic::AnthropicAdapter, openai_compat::OpenAiCompatAdapter, Adapter, ChatMessage, LlmRequest};
use crate::keystore;
use std::time::Duration;

const MAX_RETRIES: u32 = 3;
const REQUEST_TIMEOUT: u64 = 180; // 3 Minuten fuer grosse Modelle
const BASE_DELAY_MS: u64 = 1000;
const CONNECTION_TEST_TIMEOUT: u64 = 20;

fn compact_connection_test_body(mut body: serde_json::Value) -> serde_json::Value {
    if let Some(map) = body.as_object_mut() {
        if map.contains_key("max_completion_tokens") {
            map.insert("max_completion_tokens".to_string(), serde_json::json!(16));
        } else {
            map.insert("max_tokens".to_string(), serde_json::json!(16));
        }
    }
    body
}

/// Prüft einen übergebenen Key mit einem kurzen, kostenarmen Request, ohne ihn
/// vorher im Keyring zu speichern. So ersetzt ein Tippfehler keinen gültigen Key.
#[tauri::command]
pub async fn test_provider_connection(
    provider: String,
    model: String,
    api_key: String,
) -> Result<(), String> {
    if !matches!(provider.as_str(), "anthropic" | "openai" | "mistral" | "deepseek" | "kimi" | "qwen") {
        return Err("Unbekannter KI-Anbieter.".to_string());
    }
    if api_key.trim().is_empty() {
        return Err("Kein API-Schlüssel angegeben.".to_string());
    }

    let req = LlmRequest {
        provider: provider.clone(),
        model,
        system: "Du bist ein Verbindungstest. Antworte nur mit {\"ok\":true}.".to_string(),
        messages: vec![ChatMessage {
            role: "user".to_string(),
            content: "Antworte jetzt.".to_string(),
        }],
        temperature: 0.0,
        api_key,
    };
    let adapter: Box<dyn Adapter + Send + Sync> = match provider.as_str() {
        "anthropic" => Box::new(AnthropicAdapter::new()),
        _ => Box::new(OpenAiCompatAdapter::new(&provider)),
    };
    let (url, headers, body) = adapter.build_request(&req)?;
    let body = compact_connection_test_body(body);
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(CONNECTION_TEST_TIMEOUT))
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;
    let mut request = client.post(&url);
    for (key, value) in &headers {
        request = request.header(key.as_str(), value.as_str());
    }
    let response = request.json(&body).send().await.map_err(|e| {
        if e.is_timeout() {
            "Zeitüberschreitung beim Verbindungstest.".to_string()
        } else if e.is_connect() {
            "Keine Internetverbindung. Bitte Verbindung prüfen.".to_string()
        } else {
            format!("Netzwerkfehler: {}", e)
        }
    })?;
    let status = response.status();
    let response_text = response.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(match status.as_u16() {
            401 | 403 => "API-Schlüssel ungültig. Bitte in den Einstellungen prüfen.".to_string(),
            402 | 429 => "Rate-Limit, Guthaben oder Abrechnung blockiert den Test.".to_string(),
            _ => format!("HTTP-Fehler ({}): {}", status, response_text.chars().take(500).collect::<String>()),
        });
    }
    let response_body: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Ungültige Provider-Antwort: {}", e))?;
    let content = adapter.parse_response(&response_body)?;
    if content.trim().is_empty() {
        return Err("Der Anbieter hat leer geantwortet.".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn llm_complete(
    provider: String,
    model: String,
    system: String,
    messages: Vec<serde_json::Value>,
    kreativitaet: f32,
) -> Result<String, String> {
    let api_key = keystore::load_key(&provider)?;

    let chat_messages: Vec<ChatMessage> = messages
        .into_iter()
        .map(|m| {
            let role = m.get("role").and_then(|r| r.as_str()).unwrap_or("user").to_string();
            let content = m.get("content").and_then(|c| c.as_str()).unwrap_or("").to_string();
            ChatMessage { role, content }
        })
        .collect();

    let req = LlmRequest {
        provider: provider.clone(),
        model,
        system,
        messages: chat_messages,
        temperature: kreativitaet,
        api_key,
    };

    let adapter: Box<dyn Adapter + Send + Sync> = match provider.as_str() {
        "anthropic" => Box::new(AnthropicAdapter::new()),
        _ => Box::new(OpenAiCompatAdapter::new(&provider)),
    };

    let (url, headers, body) = adapter.build_request(&req)?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT))
        .build()
        .map_err(|e| format!("HTTP-Client-Fehler: {}", e))?;

    let mut last_error = String::new();

    for attempt in 1..=MAX_RETRIES {
        let mut request = client.post(&url);
        for (key, value) in &headers {
            request = request.header(key.as_str(), value.as_str());
        }
        request = request.json(&body);

        match request.send().await {
            Ok(response) => {
                let status = response.status();
                
                if status.is_success() {
                    // Zuerst als Text lesen, dann parsen — bessere Fehlermeldung bei leerem/ungueltigem Body
                    let response_text = response.text().await
                        .map_err(|e| format!("Die KI hat eine leere Antwort gesendet: {}", e))?;
                    
                    // Debug-Logging der Rohantwort (nur im Debug-Modus)
                    #[cfg(debug_assertions)]
                    {
                        eprintln!("[DEBUG] Provider: {}, Model: {}", provider, req.model);
                        eprintln!("[DEBUG] Raw response length: {} chars", response_text.len());
                        eprintln!("[DEBUG] Raw response (first 1000 chars): {}", response_text.chars().take(1000).collect::<String>());
                    }
                    
                    if response_text.trim().is_empty() {
                        return Err("Die KI hat eine leere Antwort zurueckgegeben. Bitte erneut versuchen.".to_string());
                    }
                    
                    let response_body: serde_json::Value = serde_json::from_str(&response_text)
                        .map_err(|e| format!("Die KI hat eine ungueltige Antwort gesendet (kein gueltiges JSON): {}. Antwort (erste 500 Zeichen): {}", e, response_text.chars().take(500).collect::<String>()))?;
                    
                    return adapter.parse_response(&response_body);
                }

                let error_text = response.text().await.unwrap_or_else(|_| "Unbekannter Fehler".to_string());
                
                let is_retryable = status.as_u16() == 429 || status.is_server_error();
                
                if is_retryable && attempt < MAX_RETRIES {
                    let delay = BASE_DELAY_MS * 2u64.pow(attempt - 1);
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                    last_error = format!("HTTP-Fehler ({}): {}", status, error_text);
                    continue;
                }

                return Err(match status.as_u16() {
                    401 => "API-Schlüssel ungültig. Bitte in den Einstellungen prüfen.".to_string(),
                    429 => "Zu viele Anfragen. Bitte in 30 Sekunden erneut versuchen.".to_string(),
                    500..=599 => format!("Serverfehler ({}). Bitte später erneut versuchen.", status),
                    _ => format!("HTTP-Fehler ({}): {}", status, error_text),
                });
            }
            Err(e) => {
                if e.is_timeout() {
                    if attempt < MAX_RETRIES {
                        let delay = BASE_DELAY_MS * 2u64.pow(attempt - 1);
                        tokio::time::sleep(Duration::from_millis(delay)).await;
                        last_error = "Zeitüberschreitung".to_string();
                        continue;
                    }
                    return Err("Die KI braucht zu lange. Bitte später erneut versuchen oder ein kleineres Modell wählen.".to_string());
                }
                
                if e.is_connect() {
                    return Err("Keine Internetverbindung. Bitte Verbindung prüfen.".to_string());
                }

                if attempt < MAX_RETRIES {
                    let delay = BASE_DELAY_MS * 2u64.pow(attempt - 1);
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                    last_error = format!("Netzwerkfehler: {}", e);
                    continue;
                }

                return Err(format!("Netzwerkfehler: {}", e));
            }
        }
    }

    Err(format!("Maximale Wiederholungen erreicht. Letzter Fehler: {}", last_error))
}

#[cfg(test)]
mod connection_tests {
    use super::*;

    #[test]
    fn connection_test_reduziert_token_budget() {
        let body = serde_json::json!({"max_tokens": 16000, "model": "test"});
        assert_eq!(compact_connection_test_body(body)["max_tokens"], 16);
        let body = serde_json::json!({"max_completion_tokens": 16000, "model": "test"});
        assert_eq!(compact_connection_test_body(body)["max_completion_tokens"], 16);
    }
}
