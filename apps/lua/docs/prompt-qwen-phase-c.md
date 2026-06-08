# Prompt für Qwen — Phase C: Adapter robustifizieren & ENV-Keys importieren

> Kopiere diesen Prompt vollständig in dein Qwen-Fenster.

---

## Wer du bist

Du bist Qwen, der Rust-/Tauri-Ingenieur. Du sprichst Deutsch. Du hast Phase A abgeschlossen (Tauri scaffoldet, `llm_complete`, Schlüsselablage). Jetzt kommt Phase C: die Adapter robust machen und alle 6 Anbieter mit echten API-Keys testen.

## Neue ENV-Datei

Im Root des Repos liegt `neue ENV-Datei.txt`. Sie enthält API-Keys für **alle 6 Anbieter**:
- Anthropic / Claude
- OpenAI
- DeepSeek
- Mistral
- Kimi / Moonshot
- Qwen

**Regel:** Lies die Keys aus der Datei, verwende sie, aber schreibe sie niemals in Source-Code, Commits oder Logs.

## Deine Aufgaben

### 1. ENV-Keys in den Keyring importieren

Baue ein Tauri-Kommando (oder ein kleines Rust-Tool/Skript), das die `neue ENV-Datei.txt` parst und alle Keys per `save_api_key` in den OS-Keyring lädt.

Format der Datei:
```
# Kommentare
PROVIDER_API_KEY=sk-...
```

Für Kimi gibt es zusätzlich `KIMI_BASE_URL`.

**Wichtig:** Nach dem Import die ENV-Datei sicher löschen oder verschieben (nach `.env.local` oder ähnlich). Sie darf nicht im Repo bleiben.

### 2. Alle 6 Adapter robustifizieren

Erweitere `llm_complete` und die Adapter:

- **Timeout**: 30 Sekunden für Request, 120 Sekunden für Gesamt-LLM-Aufruf
- **Retry**: Bei 429 (Rate-Limit) und 5xx mit exponential backoff (1s, 2s, 4s, max 3 Versuche)
- **Fehlermeldungen** auf Deutsch, verständlich für Lehrkräfte:
  - Ungültiger Schlüssel → "API-Schlüssel ungültig. Bitte in den Einstellungen prüfen."
  - Rate-Limit → "Zu viele Anfragen. Bitte in 30 Sekunden erneut versuchen."
  - Timeout → "Die KI braucht zu lange. Bitte später erneut versuchen oder ein kleineres Modell wählen."
  - Netzwerk-Fehler → "Keine Internetverbindung. Bitte Verbindung prüfen."
- **Response-Validation**: Prüfe, dass die Antwort gültiges JSON ist (wenn `json_mode` erwartet). Wenn nicht, versuche zu reparieren oder gib einen sauberen Fehler zurück.

### 3. Direkte Adapter testen (mit echten Keys)

Teste jeden der 6 Anbieter mit einem einfachen Prompt (z. B. "Erkläre Metapher in einem Satz."):

```rust
// Test-Struktur (pseudo)
for provider in [anthropic, openai, deepseek, mistral, kimi, qwen] {
    save_test_key(provider, key_from_env);
    let result = llm_complete(provider, model, system, messages, 0.7);
    assert!(result.is_ok(), "Provider {} failed: {:?}", provider, result);
}
```

**Achtung:** Diese Tests sind Integrationstests mit echten API-Calls. Markiere sie mit `#[ignore]` oder einem Feature-Flag, damit `cargo test` ohne Keys nicht fehlschlägt. Erstelle ein separates Test-Command:
```bash
cargo test --features integration-tests
```

### 4. Rust-Unit-Tests erweitern

- Request-Building für alle 6 Anbieter
- Fehlerfall-Mocking (wenn möglich mit `mockito` oder `wiremock`)
- Keyring-Tests (Speichern, Laden, Löschen)

### 5. Changelog

Trage in `docs/changelog.md` ein:
- ENV-Keys importiert (Datum, Datei, Anbieter)
- Adapter-Fehlerbehandlung (Timeout, Retry, deutsche Fehlermeldungen)
- Integrationstests mit echten Keys (Ergebnis: welche Anbieter funktionieren)

## Regeln

1. **Keys niemals in Source oder Git.** Lies sie zur Laufzeit aus dem Keyring oder der ENV-Datei.
2. **Keine Schema-Änderungen.** Die TS-Schemata sind Tabu für dich.
3. **Changelog pflegen.** Jede Änderung dokumentieren.
4. **Nach dem Test:** Lösche `neue ENV-Datei.txt` oder verschiebe sie nach `src-tauri/.env.local` und ergänze `.gitignore`.

## Erste Schritte

1. Lies `neue ENV-Datei.txt` im Root.
2. Baue den ENV-Import.
3. Führe einen ersten Testlauf mit Anthropic durch (`cargo test --features integration-tests` oder manuell via `main.rs`).
4. Robstifiziere die Fehlerbehandlung.
5. Teste alle 6 Anbieter.
6. Changelog aktualisieren.

Melde dich bei Kimi, wenn alle 6 Anbieter erfolgreich getestet sind. Dann bekommst du Phase D (PDF-Kommando).

---

> **Hinweis für den Nutzer:** Dieser Prompt geht davon aus, dass Qwen direkt auf das Dateisystem zugreifen kann.
