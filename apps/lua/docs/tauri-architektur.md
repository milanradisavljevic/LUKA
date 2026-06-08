# Tauri-Architektur und Migration

Stand: 2026-06-01. Entscheidung: Desktop-App mit Tauri 2 (Rust), nicht Electron.
Direkte Anbieter-Adapter mit eigenen Schluesseln des Nutzers. OpenRouter erst bei
spaeterer Produktisierung.

## Warum Tauri

Der Browser kann den LLM-Aufruf, die PDF-Erzeugung (LibreOffice) und den Drive-Zugriff
nicht leisten. Der Fehler "process is not defined" war das Symptom: Node-Code lief im
Browser. Tauri gibt eine lokale Rust-Seite, auf der genau diese Aufrufe leben. Zugleich
passt es zur Datenschutz-Position: Daten und Schluessel bleiben auf dem Rechner.

## Repo-Layout

```
/apps/web        bestehendes React/Vite-Frontend (bleibt fast unveraendert)
/src-tauri       neue Rust-Seite (Tauri-Kommandos)
/packages/*      Schema, Renderer, Input, LLM (Prompt+Validierung), QA
```

Tauri mit dem offiziellen CLI scaffolden (`npm create tauri-app` bzw. `tauri init`),
damit die Konfiguration der aktuellen Tauri-2-Version entspricht. Nicht von Hand raten.

## Rust-Kommando-Schicht (duenn)

Nur eine Handvoll Kommandos, nach bekannten Mustern (reqwest, serde, std::process):

- `llm_complete(provider, model, system, messages, kreativitaet) -> string`
  HTTPS-Aufruf an den jeweiligen Anbieter. Direkte Adapter:
  - Anthropic: `https://api.anthropic.com/v1/messages`, Header `x-api-key` und
    `anthropic-version`, eigenes Nachrichtenformat.
  - OpenAI, DeepSeek, Mistral, Qwen, Kimi: OpenAI-kompatibel
    (`/v1/chat/completions`, Bearer-Token), je eigene Basis-URL.
- Sichere Schlusselablage ueber Tauri-Stronghold oder den OS-Schluesselbund.
  Erststart-Maske, in der die Lehrkraft ihre Schluessel einmal hinterlegt.
- `convert_pdf(docx) -> pdf` ueber `std::process::Command` mit `soffice --headless`.
  Fallback-Meldung, wenn LibreOffice fehlt.
- `drive_*` spaeter (OAuth, Datei lesen), app-vermittelt, kein autonomes Stoebern.

Schluessel liegen ausschliesslich auf der Rust-Seite, nie im Frontend-Bundle.

## Frontend-Anbindung

- `useGenerate` ruft kuenftig `invoke('llm_complete', ...)` statt `fetch`.
- Prompt-Bau (`packages/llm/src/prompt.ts`) und Zod-Validierung (`validate.ts`)
  bleiben im TypeScript, weil sie reine Logik ohne Node-Bezug sind.
- Die bisherigen fetch-Adapter (`provider-*.ts`) werden fuer die App durch die
  Rust-Seite ersetzt. Sie koennen fuer Node-Tests erhalten bleiben.
- Der DOCX-Renderer laeuft weiter im Webview, die `docx`-Bibliothek ist browsertauglich.

## Entwicklungs-Workflow

- `npm run tauri dev` startet Rust-Seite plus Fenster. Hier funktioniert die Generierung.
- `npm run dev` (nur Vite) zeigt das Frontend ohne LLM-Aufruf. Zum reinen UI-Bauen ok.

## Windows-11-Distribution

- Tauri baut einen nativen Installer (MSI oder NSIS). Win11 bringt WebView2 mit.
  Endnutzer brauchen kein WSL. WSL ist nur Entwicklungsumgebung.
- LibreOffice ist die einzige externe Abhaengigkeit (fuer PDF). Optionen: mitliefern,
  oder PDF optional halten, oder spaeter eine eigene Loesung. Bis dahin Hinweis-Modal.
- Spaetere Schritte: Code-Signing gegen SmartScreen-Warnung, Auto-Update ueber den
  Tauri-Updater.

## Sicherheit

- Schluessel nie im Frontend oder im Bundle.
- Tauri-Kommandos eng halten (nur was gebraucht wird).
- Hochgeladene Fremdtexte als Daten behandeln, nie als Anweisung ausfuehren
  (Prompt-Injection).

Owner: Claude Code (Rust- und Tauri-Kern). Frontend-Anbindung: Kimi.
