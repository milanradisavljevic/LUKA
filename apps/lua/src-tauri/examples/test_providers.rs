use std::fs;
use std::path::Path;
use std::collections::HashMap;

fn load_env_file() -> HashMap<String, String> {
    let env_file = Path::new("src-tauri/.env.local");
    let mut keys = HashMap::new();
    
    if let Ok(content) = fs::read_to_string(env_file) {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((key, value)) = line.split_once('=') {
                keys.insert(key.trim().to_string(), value.trim().to_string());
            }
        }
    }
    
    keys
}

#[tokio::main]
async fn main() {
    let env_keys = load_env_file();
    
    let providers = vec![
        ("anthropic", "claude-sonnet-4-6", "ANTHROPIC_API_KEY"),
        ("openai", "gpt-4o", "OPENAI_API_KEY"),
        ("deepseek", "deepseek-chat", "DEEPSEEK_API_KEY"),
        ("mistral", "mistral-large-latest", "MISTRAL_API_KEY"),
        ("kimi", "moonshot-v1-128k", "KIMI_API_KEY"),
        ("qwen", "qwen-plus", "QWEN_API_KEY"),
    ];

    println!("Testing {} providers...\n", providers.len());

    for (provider, model, env_key) in providers {
        let api_key = match env_keys.get(env_key) {
            Some(key) => key.clone(),
            None => {
                println!("✗ {}: Kein Key gefunden ({})", provider, env_key);
                continue;
            }
        };

        print!("Testing {} ({})... ", provider, model);

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
            api_key,
        };

        let (url, headers, body) = match adapter.build_request(&req) {
            Ok(result) => result,
            Err(e) => {
                println!("✗ Request-Build-Fehler: {}", e);
                continue;
            }
        };

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Client-Fehler");

        let mut request = client.post(&url);
        for (key, value) in &headers {
            request = request.header(key.as_str(), value.as_str());
        }
        request = request.json(&body);

        match request.send().await {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(response_body) => {
                            match adapter.parse_response(&response_body) {
                                Ok(result) => {
                                    println!("✓ OK ({} Zeichen)", result.len());
                                }
                                Err(e) => {
                                    println!("✗ Parse-Fehler: {}", e);
                                }
                            }
                        }
                        Err(e) => {
                            println!("✗ JSON-Fehler: {}", e);
                        }
                    }
                } else {
                    let text = response.text().await.unwrap_or_default();
                    println!("✗ HTTP {}: {}", status, text.chars().take(100).collect::<String>());
                }
            }
            Err(e) => {
                println!("✗ Netzwerkfehler: {}", e);
            }
        }
    }

    println!("\nFertig!");
}
