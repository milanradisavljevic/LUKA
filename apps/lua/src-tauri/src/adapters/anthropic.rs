use super::{Adapter, LlmRequest};

pub struct AnthropicAdapter;

impl AnthropicAdapter {
    pub fn new() -> Self {
        AnthropicAdapter
    }
}

impl Adapter for AnthropicAdapter {
    fn build_request(&self, req: &LlmRequest) -> Result<(String, Vec<(String, String)>, serde_json::Value), String> {
        let url = "https://api.anthropic.com/v1/messages".to_string();
        
        let headers = vec![
            ("x-api-key".to_string(), req.api_key.clone()),
            ("anthropic-version".to_string(), "2023-06-01".to_string()),
            ("content-type".to_string(), "application/json".to_string()),
        ];

        let messages: Vec<serde_json::Value> = req.messages
            .iter()
            .filter(|m| m.role != "system")
            .map(|m| serde_json::json!({
                "role": m.role,
                "content": m.content
            }))
            .collect();

        let body = serde_json::json!({
            "model": req.model,
            "max_tokens": 16000,
            "temperature": req.temperature,
            "system": req.system,
            "messages": messages
        });

        Ok((url, headers, body))
    }

    fn parse_response(&self, body: &serde_json::Value) -> Result<String, String> {
        let content = body.get("content")
            .and_then(|c| c.as_array())
            .ok_or_else(|| "Invalid Anthropic response: missing content array".to_string())?;

        let text_blocks: Vec<&str> = content
            .iter()
            .filter_map(|block| {
                if block.get("type")?.as_str()? == "text" {
                    block.get("text")?.as_str()
                } else {
                    None
                }
            })
            .collect();

        if text_blocks.is_empty() {
            return Err("No text content in Anthropic response".to_string());
        }

        Ok(text_blocks.join("\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::ChatMessage;

    #[test]
    fn test_build_request() {
        let adapter = AnthropicAdapter::new();
        let req = LlmRequest {
            provider: "anthropic".to_string(),
            model: "claude-sonnet-4-6".to_string(),
            system: "You are a helpful assistant.".to_string(),
            messages: vec![
                ChatMessage { role: "user".to_string(), content: "Hello".to_string() },
            ],
            temperature: 0.7,
            api_key: "test-key".to_string(),
        };

        let (url, headers, body) = adapter.build_request(&req).unwrap();
        
        assert_eq!(url, "https://api.anthropic.com/v1/messages");
        assert!(headers.iter().any(|(k, v)| k == "x-api-key" && v == "test-key"));
        assert!(headers.iter().any(|(k, v)| k == "anthropic-version" && v == "2023-06-01"));
        assert_eq!(body["model"], "claude-sonnet-4-6");
        assert_eq!(body["system"], "You are a helpful assistant.");
        assert_eq!(body["messages"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn test_parse_response() {
        let adapter = AnthropicAdapter::new();
        let response = serde_json::json!({
            "content": [
                { "type": "text", "text": "Hello" },
                { "type": "text", "text": "World" }
            ]
        });

        let result = adapter.parse_response(&response).unwrap();
        assert_eq!(result, "Hello\nWorld");
    }
}
