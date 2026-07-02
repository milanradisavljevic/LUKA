use std::fs;
use std::path::Path;

fn main() {
    let env_file = Path::new("neue ENV-Datei.txt");
    
    if !env_file.exists() {
        eprintln!("Fehler: 'neue ENV-Datei.txt' nicht gefunden.");
        std::process::exit(1);
    }

    let content = fs::read_to_string(env_file)
        .expect("Konnte ENV-Datei nicht lesen");

    let mut imported = 0;

    for line in content.lines() {
        let line = line.trim();
        
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim();

            let provider = match key {
                "ANTHROPIC_API_KEY" => Some("anthropic"),
                "OPENAI_API_KEY" => Some("openai"),
                "DEEPSEEK_API_KEY" => Some("deepseek"),
                "MISTRAL_API_KEY" => Some("mistral"),
                "KIMI_API_KEY" => Some("kimi"),
                "QWEN_API_KEY" => Some("qwen"),
                _ => None,
            };

            if let Some(provider) = provider {
                match lehrunterlagen_tool::keystore::save_key(provider, value) {
                    Ok(_) => {
                        println!("✓ {} importiert", provider);
                        imported += 1;
                    }
                    Err(e) => {
                        eprintln!("✗ {} fehlgeschlagen: {}", provider, e);
                    }
                }
            }
        }
    }

    println!("\n{} Keys erfolgreich importiert.", imported);

    // Keys liegen jetzt im OS-Keyring (Produktionspfad). Die Klartext-Quelldatei
    // wird gelöscht statt nach .env.local umbenannt — sonst bliebe eine dauerhafte
    // Klartext-Kopie auf der Platte liegen (S1 aus docs/PLAN-review-2026-07-02.md).
    if imported > 0 {
        match fs::remove_file(env_file) {
            Ok(_) => println!(
                "Klartext-Quelldatei '{}' gelöscht (Keys nur noch im Keyring).",
                env_file.display()
            ),
            Err(e) => eprintln!(
                "Warnung: Quelldatei '{}' konnte nicht gelöscht werden: {} — bitte manuell entfernen.",
                env_file.display(), e
            ),
        }
    } else {
        eprintln!("Keine Keys importiert — Quelldatei bleibt unverändert.");
    }
}
