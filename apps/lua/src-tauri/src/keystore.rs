const SERVICE_NAME: &str = "lehrunterlagen-tool";

pub fn save_key(provider: &str, key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider)
        .map_err(|e| format!("Keyring-Fehler: {}", e))?;
    entry.set_password(key)
        .map_err(|e| format!("Schlüssel speichern fehlgeschlagen: {}", e))?;
    Ok(())
}

pub fn load_key(provider: &str) -> Result<String, String> {
    // 1. Versuche Keyring (produktiv, sicher)
    let entry = keyring::Entry::new(SERVICE_NAME, provider)
        .map_err(|e| format!("Keyring-Fehler: {}", e))?;
    match entry.get_password() {
        Ok(key) => return Ok(key),
        Err(keyring_err) => {
            // 2. Fallback: Umgebungsvariable (für WSL / Tests)
            let env_var = format!("{}_API_KEY", provider.to_uppercase());
            if let Ok(key) = std::env::var(&env_var) {
                if !key.is_empty() {
                    return Ok(key);
                }
            }
            // 3. Fallback: .env.local Datei (nur im Debug-Modus, nicht in Production!)
            #[cfg(debug_assertions)]
            {
                let possible_paths = [".env.local", "src-tauri/.env.local"];
                for path in &possible_paths {
                    if let Ok(content) = std::fs::read_to_string(path) {
                        for line in content.lines() {
                            let line = line.trim();
                            if line.starts_with('#') || line.is_empty() { continue; }
                            if let Some((k, v)) = line.split_once('=') {
                                if k.trim().to_uppercase() == env_var {
                                    return Ok(v.trim().to_string());
                                }
                            }
                        }
                    }
                }
            }
            Err(format!("Schlüssel nicht gefunden: {}. Tipp: Bitte API-Key in den Einstellungen hinterlegen oder Umgebungsvariable '{}' setzen.", keyring_err, env_var))
        }
    }
}

pub fn delete_key(provider: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, provider)
        .map_err(|e| format!("Keyring-Fehler: {}", e))?;
    entry.delete_credential()
        .map_err(|e| format!("Schlüssel löschen fehlgeschlagen: {}", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "Benötigt laufenden Secret-Service (nicht in WSL/CI)"]
    fn test_save_load_delete_key() {
        let provider = "test_provider_unit";
        let key = "test_secret_key_12345";

        save_key(provider, key).expect("Speichern fehlgeschlagen");
        
        let loaded = load_key(provider).expect("Laden fehlgeschlagen");
        assert_eq!(loaded, key);

        delete_key(provider).expect("Löschen fehlgeschlagen");
        
        let result = load_key(provider);
        assert!(result.is_err(), "Schlüssel sollte gelöscht sein");
    }
}
