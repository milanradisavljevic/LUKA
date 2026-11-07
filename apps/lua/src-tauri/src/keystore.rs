const SERVICE_NAME: &str = "lehrunterlagen-tool";

fn env_var_name(provider: &str) -> String {
    format!("{}_API_KEY", provider.to_uppercase())
}

fn env_file_path() -> std::path::PathBuf {
    // Bevorzuge Verzeichnis neben der Binary (fuer portable Builds),
    // fallback auf CWD.
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    exe_dir.join(".env.local")
}

/// Lies einen Key aus .env.local (priorisiert) oder .env.
fn load_from_env_file(provider: &str) -> Option<String> {
    let env_var = env_var_name(provider);
    for path in [env_file_path(), std::path::PathBuf::from(".env.local"), std::path::PathBuf::from("src-tauri/.env.local")] {
        if let Ok(content) = std::fs::read_to_string(&path) {
            for line in content.lines() {
                let line = line.trim();
                if line.starts_with('#') || line.is_empty() { continue; }
                if let Some((k, v)) = line.split_once('=') {
                    if k.trim().to_uppercase() == env_var {
                        let val = v.trim().to_string();
                        if !val.is_empty() { return Some(val); }
                    }
                }
            }
        }
    }
    None
}

/// Schreibe einen Key in .env.local (neben der Binary oder CWD).
fn save_to_env_file(provider: &str, key: &str) -> Result<(), String> {
    let env_var = env_var_name(provider);
    let path = env_file_path();

    // Lies bestehende Datei und ersetze/fuege die Zeile hinzu.
    let mut lines: Vec<String> = std::fs::read_to_string(&path)
        .unwrap_or_default()
        .lines()
        .map(|l| l.to_string())
        .collect();

    let prefix = format!("{}=", env_var);
    let new_line = format!("{}={}", env_var, key);
    let mut replaced = false;
    for line in &mut lines {
        if line.trim().to_uppercase().starts_with(&prefix.to_uppercase()) {
            *line = new_line.clone();
            replaced = true;
            break;
        }
    }
    if !replaced {
        lines.push(new_line);
    }

    // Schreibe mit explizitem Zeilenumbruch (kein trailing newline nötig).
    let content = lines.join("\n") + "\n";
    std::fs::write(&path, content)
        .map_err(|e| format!("Fehler beim Schreiben von {}: {}", path.display(), e))?;
    Ok(())
}

fn verify_saved_key(expected: &str, loaded: &str) -> Result<(), String> {
    if !expected.is_empty() && loaded == expected {
        Ok(())
    } else {
        Err("Nach dem Speichern wurde ein anderer oder kein API-Schlüssel geladen. Bitte den Schlüsselspeicher und vorhandene Umgebungsvariablen prüfen.".to_string())
    }
}

fn save_to_keyring(provider: &str, key: &str) -> Result<(), String> {
    keyring::Entry::new(SERVICE_NAME, provider)
        .and_then(|entry| entry.set_password(key))
        .map_err(|_| "System-Schlüsselspeicher nicht beschreibbar.".to_string())?;
    // Ein neuer Entry muss denselben Wert lesen koennen. Der Mock-Speicher
    // meldet beim Schreiben Erfolg, verliert ihn aber beim naechsten Entry.
    let loaded = keyring::Entry::new(SERVICE_NAME, provider)
        .and_then(|entry| entry.get_password())
        .map_err(|_| "System-Schlüsselspeicher konnte den gespeicherten Schlüssel nicht erneut laden.".to_string())?;
    verify_saved_key(key, &loaded)
}

pub fn save_key(provider: &str, key: &str) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Bitte einen API-Schlüssel eingeben.".to_string());
    }
    match save_to_keyring(provider, key) {
        Ok(()) => return Ok(()),
        Err(keyring_err) => {
            eprintln!("[keystore] Keyring-Speicherung fehlgeschlagen ({}), falle auf .env.local zurück.", keyring_err);
        }
    }
    // Fallback: .env.local
    save_to_env_file(provider, key)?;
    // Gleiche Aufloesung wie beim Modellaufruf: ein alter Env-/Keyring-Wert
    // darf einen neu gespeicherten Schluessel nicht unbemerkt ueberlagern.
    let loaded = load_key(provider)?;
    verify_saved_key(key, &loaded)
}

pub fn load_key(provider: &str) -> Result<String, String> {
    let env_var = env_var_name(provider);

    // 1. Versuche Keyring (produktiv, sicher)
    if let Ok(entry) = keyring::Entry::new(SERVICE_NAME, provider) {
        if let Ok(key) = entry.get_password() {
            if !key.is_empty() {
                return Ok(key);
            }
        }
    }

    // 2. Fallback: Umgebungsvariable
    if let Ok(key) = std::env::var(&env_var) {
        if !key.is_empty() {
            return Ok(key);
        }
    }

    // 3. Fallback: .env.local Datei
    if let Some(key) = load_from_env_file(provider) {
        return Ok(key);
    }

    Err(format!(
        "Schlüssel nicht gefunden für '{}'. Tipp: Bitte API-Key in den Einstellungen hinterlegen oder Umgebungsvariable '{}' setzen.",
        provider, env_var
    ))
}

pub fn delete_key(provider: &str) -> Result<(), String> {
    // Versuche Keyring (ignoriere Fehler).
    if let Ok(entry) = keyring::Entry::new(SERVICE_NAME, provider) {
        let _ = entry.delete_credential();
    }

    // Entferne aus .env.local.
    let env_var = env_var_name(provider);
    let path = env_file_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        let prefix = format!("{}=", env_var);
        let new_lines: Vec<String> = content
            .lines()
            .filter(|line| !line.trim().to_uppercase().starts_with(&prefix.to_uppercase()))
            .map(|l| l.to_string())
            .collect();
        let new_content = new_lines.join("\n") + "\n";
        let _ = std::fs::write(&path, new_content);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn save_verification_rejects_missing_and_stale_keys_without_exposing_them() {
        assert!(verify_saved_key("synthetic-new", "synthetic-new").is_ok());
        for loaded in ["", "synthetic-old"] {
            let error = verify_saved_key("synthetic-new", loaded).unwrap_err();
            assert!(!error.contains("synthetic-new"));
            assert!(!error.contains("synthetic-old"));
        }
        assert!(verify_saved_key("", "").is_err());
    }

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
