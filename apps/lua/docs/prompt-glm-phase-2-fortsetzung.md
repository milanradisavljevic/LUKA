# Prompt für GLM — Phase 2 Fortsetzung: SettingsPanel, Tests, Datenschutz

> Kopiere diesen Prompt vollständig in dein GLM-Fenster.

---

## Wer du bist

Du bist GLM, der Lane-Worker. Du sprichst Deutsch. Du hast Phase 1 abgeschlossen (Preise, Logos, Navigation, Platzhalter, Tippfehler, Kreativitätsregler, Leerzustände, Tests). Jetzt kommt Phase 2 Fortsetzung.

## Neue Situation

- Kimi hat `useGenerate` auf `invoke('llm_complete', ...)` umgestellt — `@tauri-apps/api/core` ist verfügbar.
- Qwen hat Rust-Commands für Schlüsselverwaltung: `save_api_key`, `load_api_key`, `delete_api_key`.
- Die Modell-Liste in `constants.ts` und `models.ts` ist aktuell (6 Anbieter, 12 Modelle).
- **MODEL_MAP Bug ist gefixt** — Kimi hat die `useGenerate.ts` aktualisiert.

## Deine Aufgaben

### 1. SettingsPanel-Komponente

Erstelle `apps/web/src/components/SettingsPanel.tsx`:

- **Liste der 6 Anbieter** mit Eingabefeldern für API-Key (Password-Input, Maskierung)
- **Speichern-Button** pro Anbieter: ruft `invoke('save_api_key', { provider, key })` auf
- **Laden-Button** pro Anbieter: ruft `invoke('load_api_key', { provider })` auf, zeigt Maskierung (`sk-...XXXX`) an
- **Löschen-Button** pro Anbieter: ruft `invoke('delete_api_key', { provider })` auf
- **Hinweis**: "Keys werden sicher im System-Keyring gespeichert und verlassen niemals den Rechner."
- **Fallback**: Wenn nicht in Tauri (Browser-Dev), zeige: "Nur in der Desktop-App verfügbar."
- **Keine Keys im React-State** — nur temporär im Input-Feld, nach Speichern sofort leeren

**Wichtig:** Keine Routing-Änderungen, keine Sidebar-Änderungen. Reine Komponente, die Kimi später einbaut.

### 2. Datenschutz-Kennzeichnung im Modell-Info-Panel

Erweitere `Step3_LLMOptions.tsx` (oder wo das Info-Panel gerendert wird):

- Farb-Codierung pro Anbieter:
  - 🟢 **Mistral** (EU, DSGVO-konform)
  - 🟡 **Anthropic, OpenAI** (USA)
  - 🔴 **DeepSeek, Qwen, Kimi** (China — nur für selbst verfasste Inhalte)
- Zeige "Preise Stand 2026-06-01" an

### 3. Unit-Tests

- **models.ts**: Prüfe, dass alle `provider`-Werte gültig sind, keine negativen Preise
- **blockDefaults.ts**: Prüfe, dass `BLOCK_ARBEITSANWEISUNG_PLACEHOLDER` für alle 6 Blocktypen existiert
- **SettingsPanel**: Mock von `invoke` — falls React Testing Library nicht installiert ist, dokumentiere den Test-Vorschlag in `docs/` statt ihn zu bauen (Kimi entscheidet über Testing-Library)

### 4. Qwen-Preise

- Die Namensdiskrepanz (unsere `qwen3.7-max` vs. offizielles `qwen3-max`) ist **kein Bug** — Qwen 3.7 Max ist ein reales, brandneues Modell. Lass die Preise als `0` + `// TODO: verifizieren` stehen.
- Füge einen Kommentar hinzu: "Qwen 3.7 Max ist ein aktives Modell in der Opencode-Plattform. Die API-Namen können von den offiziellen Doku-Namen abweichen."

### 5. Changelog

Trage in `docs/changelog.md` ein:
- SettingsPanel erstellt
- Datenschutz-Kennzeichnung im Modell-Info-Panel
- Unit-Tests für models.ts und blockDefaults.ts

## Regeln

1. **Keine API-Keys in Git, Code oder Logs.**
2. **Keine Schema-Änderungen.**
3. **Keine Rust-Code-Änderungen.** (Qwen macht das)
4. **Keine Routing- oder Architektur-Änderungen.** (Kimi macht das)
5. **Changelog pflegen.**

## Erste Schritte

1. `SettingsPanel.tsx` bauen.
2. Datenschutz-Farb-Codierung im Modell-Panel.
3. Unit-Tests für models.ts und blockDefaults.ts.
4. Changelog aktualisieren.

Melde dich bei Kimi, wenn du durch bist.

---

> **Hinweis:** Dieser Prompt geht davon aus, dass GLM direkt auf das Dateisystem zugreifen kann.
