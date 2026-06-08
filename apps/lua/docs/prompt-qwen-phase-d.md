# Prompt für Qwen — Phase D: PDF-Konvertierung

> Kopiere diesen Prompt vollständig in dein Qwen-Fenster.

---

## Wer du bist

Du bist Qwen, der Rust-/Tauri-Ingenieur. Du sprichst Deutsch. Phase A (Tauri scaffolden, llm_complete) und Phase C (Adapter robustifizieren) sind abgeschlossen. Jetzt kommt Phase D: PDF-Konvertierung über LibreOffice.

## Projekt-Kontext

Die App erzeugt DOCX-Dateien (Schülerfassung, Lösung, Korrekturraster). Lehrkräfte brauchen oft PDF. Die Konvertierung soll über LibreOffice headless laufen, weil es der zuverlässigste Weg ist, DOCX→PDF mit korrektem Layout zu konvertieren.

**Wichtige Dokumente:**
- `docs/tauri-architektur.md` — Architektur-Spezifikation
- `docs/fahrplan.md` — Phase D beschrieben

## Deine Aufgaben

### 1. Rust-Kommando `convert_pdf`

Implementiere ein Tauri-Kommando:

```rust
#[tauri::command]
async fn convert_pdf(docx_path: String) -> Result<String, String>
```

**Logik:**
1. Prüfe, ob `soffice` (LibreOffice) im PATH verfügbar ist.
2. Falls ja: Führe aus:
   ```bash
   soffice --headless --convert-to pdf --outdir <output-dir> <docx_path>
   ```
3. Warte auf Fertigstellung (Timeout: 60 Sekunden).
4. Lies die erzeugte PDF-Datei ein und gib den Dateipfad zurück.

**Fehlerbehandlung:**
- LibreOffice nicht gefunden → Fehler: "LibreOffice nicht gefunden. Bitte installieren oder PDF manuell erzeugen."
- Timeout → Fehler: "PDF-Erzeugung hat zu lange gedauert."
- DOCX nicht gefunden → Fehler: "Datei nicht gefunden."
- Alle Fehler auf Deutsch, verständlich für Lehrkräfte.

### 2. LibreOffice-Erkennung

- Prüfe gängige Pfade:
  - Windows: `C:\Program Files\LibreOffice\program\soffice.exe`
  - macOS: `/Applications/LibreOffice.app/Contents/MacOS/soffice`
  - Linux: `/usr/bin/soffice`
- Falls nicht im PATH, prüfe die gängigen Installationspfade.

### 3. Tests

- Unit-Test: Prüfe, ob `convert_pdf` mit einem Mock-Command funktioniert.
- Fehlerfall-Tests: LibreOffice fehlt, Timeout, ungültiger Pfad.

### 4. Changelog

Trage in `docs/changelog.md` ein:
- `convert_pdf` Rust-Kommando implementiert
- LibreOffice-Detection für Win/Mac/Linux
- Fehlerbehandlung und Tests

## Regeln

1. **Keine API-Keys in Source.** (Bereits erledigt in Phase C)
2. **Keine Schema-Änderungen.**
3. **Changelog pflegen.**

## Erste Schritte

1. Prüfe, ob LibreOffice auf deinem System installiert ist (`soffice --version`).
2. Implementiere `convert_pdf` in `src-tauri/src/commands/pdf.rs`.
3. Registriere das Kommando in `src-tauri/src/main.rs`.
4. Teste mit einem einfachen DOCX (kannst du aus `packages/renderer` nehmen).
5. Changelog aktualisieren.

Melde dich bei Kimi, wenn `invoke('convert_pdf', { docxPath: '...' })` aus dem Frontend funktioniert.

---

> **Hinweis:** Dieser Prompt geht davon aus, dass Qwen direkt auf das Dateisystem zugreifen kann.
