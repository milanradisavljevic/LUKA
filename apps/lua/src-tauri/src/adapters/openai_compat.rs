use super::{Adapter, LlmRequest};

pub struct OpenAiCompatAdapter {
    base_url: String,
}

impl OpenAiCompatAdapter {
    pub fn new(provider: &str) -> Self {
        let base_url = match provider {
            "openai" => "https://api.openai.com/v1",
            "deepseek" => "https://api.deepseek.com/v1",
            "mistral" => "https://api.mistral.ai/v1",
            "qwen" => "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
            "kimi" => "https://api.moonshot.ai/v1",
            _ => "https://api.openai.com/v1",
        };
        OpenAiCompatAdapter { base_url: base_url.to_string() }
    }
}

/// Manche Modelle legen `temperature` fest und antworten mit einem Fehler,
/// wenn ein anderer Wert mitkommt: Kimi K2.6/K3 (fest 0.6 bzw. 1.0) und die
/// Reasoning-Modelle von OpenAI (GPT-5.x, GPT-6.x, o-Serie). Dort bleibt der
/// Parameter weg, das Modell nutzt seinen Standard.
fn accepts_temperature(provider: &str, model: &str) -> bool {
    match provider {
        "kimi" => !model.starts_with("kimi-"),
        "openai" => {
            let reasoning_o = model.starts_with('o')
                && model.chars().nth(1).map_or(false, |c| c.is_ascii_digit());
            !(model.starts_with("gpt-5") || model.starts_with("gpt-6") || reasoning_o)
        }
        _ => true,
    }
}

impl Adapter for OpenAiCompatAdapter {
    fn build_request(&self, req: &LlmRequest) -> Result<(String, Vec<(String, String)>, serde_json::Value), String> {
        let url = format!("{}/chat/completions", self.base_url);
        
        let headers = vec![
            ("Authorization".to_string(), format!("Bearer {}", req.api_key)),
            ("content-type".to_string(), "application/json".to_string()),
        ];

        let mut messages = vec![
            serde_json::json!({
                "role": "system",
                "content": req.system
            })
        ];

        for msg in &req.messages {
            messages.push(serde_json::json!({
                "role": msg.role,
                "content": msg.content
            }));
        }

        // OpenAI (GPT-4o, GPT-5.4) nutzt max_completion_tokens statt max_tokens
        let token_field = if req.provider == "openai" {
            "max_completion_tokens"
        } else {
            "max_tokens"
        };

        let mut body_map = serde_json::Map::new();
        body_map.insert("model".to_string(), serde_json::Value::String(req.model.clone()));
        body_map.insert(token_field.to_string(), serde_json::Value::Number(16000.into()));
        if accepts_temperature(&req.provider, &req.model) {
            body_map.insert("temperature".to_string(), serde_json::Value::from(req.temperature));
        }
        body_map.insert("messages".to_string(), serde_json::Value::Array(messages));

        // JSON-Mode fuer Provider, die es unterstuetzen (OpenAI, Mistral, DeepSeek, Kimi, Qwen)
        if matches!(req.provider.as_str(), "openai" | "mistral" | "deepseek" | "kimi" | "qwen") {
            body_map.insert("response_format".to_string(), serde_json::json!({ "type": "json_object" }));
        }

        let body = serde_json::Value::Object(body_map);

        Ok((url, headers, body))
    }

    fn parse_response(&self, body: &serde_json::Value) -> Result<String, String> {
        let content = body
            .get("choices")
            .and_then(|c| c.as_array())
            .and_then(|arr| arr.first())
            .and_then(|choice| choice.get("message"))
            .and_then(|msg| msg.get("content"))
            .and_then(|c| c.as_str())
            .ok_or_else(|| "Invalid OpenAI-compatible response".to_string())?;

        Ok(content.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::ChatMessage;

    #[test]
    fn test_build_request_openai() {
        let adapter = OpenAiCompatAdapter::new("openai");
        let req = LlmRequest {
            provider: "openai".to_string(),
            model: "gpt-4o".to_string(),
            system: "You are helpful.".to_string(),
            messages: vec![
                ChatMessage { role: "user".to_string(), content: "Hi".to_string() },
            ],
            temperature: 0.5,
            api_key: "sk-test".to_string(),
        };

        let (url, headers, body) = adapter.build_request(&req).unwrap();
        
        assert_eq!(url, "https://api.openai.com/v1/chat/completions");
        assert!(headers.iter().any(|(k, v)| k == "Authorization" && v == "Bearer sk-test"));
        assert_eq!(body["model"], "gpt-4o");
        assert_eq!(body["messages"].as_array().unwrap().len(), 2);
        assert!(body.get("max_completion_tokens").is_some(), "OpenAI sollte max_completion_tokens verwenden");
        assert!(body.get("response_format").is_some(), "OpenAI sollte response_format haben");
    }

    #[test]
    fn test_build_request_deepseek() {
        let adapter = OpenAiCompatAdapter::new("deepseek");
        let req = LlmRequest {
            provider: "deepseek".to_string(),
            model: "deepseek-chat".to_string(),
            system: "System".to_string(),
            messages: vec![],
            temperature: 0.4,
            api_key: "ds-key".to_string(),
        };

        let (url, _, body) = adapter.build_request(&req).unwrap();
        assert_eq!(url, "https://api.deepseek.com/v1/chat/completions");
        assert!(body.get("max_tokens").is_some(), "DeepSeek sollte max_tokens verwenden");
        assert!(body.get("response_format").is_some(), "DeepSeek sollte response_format haben");
    }

    #[test]
    fn test_build_request_mistral() {
        let adapter = OpenAiCompatAdapter::new("mistral");
        let req = LlmRequest {
            provider: "mistral".to_string(),
            model: "mistral-large-latest".to_string(),
            system: "System".to_string(),
            messages: vec![],
            temperature: 0.4,
            api_key: "mistral-key".to_string(),
        };

        let (url, _, _) = adapter.build_request(&req).unwrap();
        assert_eq!(url, "https://api.mistral.ai/v1/chat/completions");
    }

    #[test]
    fn test_build_request_qwen() {
        let adapter = OpenAiCompatAdapter::new("qwen");
        let req = LlmRequest {
            provider: "qwen".to_string(),
            model: "qwen-plus".to_string(),
            system: "System".to_string(),
            messages: vec![],
            temperature: 0.4,
            api_key: "qwen-key".to_string(),
        };

        let (url, _, body) = adapter.build_request(&req).unwrap();
        assert_eq!(url, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
        assert!(body.get("response_format").is_some(), "Qwen sollte response_format haben");
    }

    #[test]
    fn test_build_request_kimi() {
        let adapter = OpenAiCompatAdapter::new("kimi");
        let req = LlmRequest {
            provider: "kimi".to_string(),
            model: "moonshot-v1-128k".to_string(),
            system: "System".to_string(),
            messages: vec![],
            temperature: 0.4,
            api_key: "kimi-key".to_string(),
        };

        let (url, _, body) = adapter.build_request(&req).unwrap();
        assert_eq!(url, "https://api.moonshot.ai/v1/chat/completions");
        assert!(body.get("response_format").is_some(), "Kimi sollte response_format haben");
    }

    #[test]
    fn feste_temperature_modelle_ohne_temperature() {
        for (provider, model, erwartet) in [
            ("kimi", "kimi-k2.6", false),
            ("kimi", "kimi-k3", false),
            ("openai", "gpt-5.4", false),
            ("openai", "gpt-6.1-sol", false),
            ("openai", "o3", false),
            ("openai", "gpt-4o", true),
            ("mistral", "mistral-large-4", true),
            ("deepseek", "deepseek-v4-pro", true),
        ] {
            let adapter = OpenAiCompatAdapter::new(provider);
            let req = LlmRequest {
                provider: provider.to_string(),
                model: model.to_string(),
                system: "System".to_string(),
                messages: vec![],
                temperature: 0.4,
                api_key: "key".to_string(),
            };
            let (_, _, body) = adapter.build_request(&req).unwrap();
            assert_eq!(body.get("temperature").is_some(), erwartet, "{provider}/{model}");
        }
    }

    #[test]
    fn test_parse_response() {
        let adapter = OpenAiCompatAdapter::new("openai");
        let response = serde_json::json!({
            "choices": [{
                "message": {
                    "content": "{\"test\": \"data\"}"
                }
            }]
        });

        let result = adapter.parse_response(&response).unwrap();
        assert_eq!(result, "{\"test\": \"data\"}");
    }
}
