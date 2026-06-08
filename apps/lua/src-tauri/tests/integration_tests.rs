#[cfg(feature = "integration-tests")]
mod integration_tests {
    use lehrunterlagen_tool::keystore;
    use serde_json::json;

    async fn test_provider(provider: &str, model: &str) -> Result<(), String> {
        let _key = keystore::load_key(provider)
            .map_err(|e| format!("Kein Key für {}: {}", provider, e))?;

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| format!("Client-Fehler: {}", e))?;

        let adapter: Box<dyn lehrunterlagen_tool::adapters::Adapter + Send + Sync> = match provider {
            "anthropic" => Box::new(lehrunterlagen_tool::adapters::anthropic::AnthropicAdapter::new()),
            _ => Box::new(lehrunterlagen_tool::adapters::openai_compat::OpenAiCompatAdapter::new(provider)),
        };

        let req = lehrunterlagen_tool::adapters::LlmRequest {
            provider: provider.to_string(),
            model: model.to_string(),
            system: "Du bist ein hilfreicher Assistent. Antworte kurz.".to_string(),
            messages: vec![
                lehrunterlagen_tool::adapters::ChatMessage {
                    role: "user".to_string(),
                    content: "Erkläre Metapher in einem Satz.".to_string(),
                },
            ],
            temperature: 0.7,
            api_key: _key,
        };

        let (url, headers, body) = adapter.build_request(&req)?;

        let mut request = client.post(&url);
        for (key, value) in &headers {
            request = request.header(key.as_str(), value.as_str());
        }
        request = request.json(&body);

        let response = request.send().await
            .map_err(|e| format!("Netzwerkfehler: {}", e))?;

        let status = response.status();
        if !status.is_success() {
            let text = response.text().await.unwrap_or_default();
            return Err(format!("HTTP {}: {}", status, text));
        }

        let response_body: serde_json::Value = response.json().await
            .map_err(|e| format!("JSON-Fehler: {}", e))?;

        let result = adapter.parse_response(&response_body)?;
        
        assert!(!result.is_empty(), "Leere Antwort von {}", provider);
        println!("{}: OK ({} Zeichen)", provider, result.len());
        
        Ok(())
    }

    #[tokio::test]
    async fn test_anthropic() {
        test_provider("anthropic", "claude-sonnet-4-6").await.unwrap();
    }

    #[tokio::test]
    async fn test_openai() {
        test_provider("openai", "gpt-4o").await.unwrap();
    }

    #[tokio::test]
    async fn test_deepseek() {
        test_provider("deepseek", "deepseek-chat").await.unwrap();
    }

    #[tokio::test]
    async fn test_mistral() {
        test_provider("mistral", "mistral-large-latest").await.unwrap();
    }

    #[tokio::test]
    async fn test_kimi() {
        test_provider("kimi", "moonshot-v1-128k").await.unwrap();
    }

    #[tokio::test]
    async fn test_qwen() {
        test_provider("qwen", "qwen-plus").await.unwrap();
    }
}
