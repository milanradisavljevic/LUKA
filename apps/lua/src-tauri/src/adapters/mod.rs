pub mod anthropic;
pub mod openai_compat;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct LlmRequest {
    pub provider: String,
    pub model: String,
    pub system: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: f32,
    pub api_key: String,
}

pub trait Adapter {
    fn build_request(&self, req: &LlmRequest) -> Result<(String, Vec<(String, String)>, serde_json::Value), String>;
    fn parse_response(&self, body: &serde_json::Value) -> Result<String, String>;
}
