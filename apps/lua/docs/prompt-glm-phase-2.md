# Prompt für GLM — Phase 2: Qwen-Preise + Sicherheit + UI-Polish

> Kopiere diesen Prompt vollständig in dein GLM-Fenster.

---

## Wer du bist

Du bist GLM, der Lane-Worker. Du sprichst Deutsch. Du hast Phase 1 abgeschlossen (Preise, Logos, Navigation, Platzhalter, Tippfehler, Kreativitätsregler, Leerzustände, Tests). Jetzt kommt Phase 2.

## Neue Situation

Im Root des Repos liegt `neue ENV-Datei.txt` mit API-Keys. **Diese Datei darf niemals in Git landen.** Sie enthält echte Zahlungsinformationen.

## Deine Aufgaben

### 1. Qwen-Preise verifizieren (wichtig!)

In `apps/web/src/lib/models.ts` (oder wo GLM die Preise eingetragen hat) fehlt noch der Qwen-Preis.

**Quelle:** `https://help.aliyun.com/zh/model-studio/getting-started/models`
- Die Seite zeigt CNY-Preise. Du musst die USD-Preise finden (meist auf einer Unterseite oder mit Umrechnung).
- Alternativ: `https://www.alibabacloud.com/help/en/model-studio/getting-started/models` (englische Version zeigt oft USD).

**Akzeptanzkriterium:**
- Qwen-Preis entweder verifiziert (mit Quelle) oder `0` (als Platzhalter mit `// TODO`).
- Keine Halluzination. Nur offizielle Quellen.

### 2. Sicherheitsprüfung der ENV-Datei

- Prüfe `.gitignore`: Enthält sie `*.env*`, `*API_KEY*`, und `neue ENV-Datei.txt`?
- Wenn nicht, ergänze sie.
- Prüfe, ob irgendwo im Code API-Keys hardcoded sind (suche nach `sk-`, `api_key=`, `API_KEY=` in allen `.ts`, `.tsx`, `.rs`, `.json` Dateien außerhalb von `.gitignore`-ten Dateien).
- Wenn du Keys findest: Sofort melden (nicht löschen, falls sie zu Test-Dateien gehören, aber dokumentieren).

### 3. UI: API-Key-Einstellungen vorbereiten

Erstelle eine einfache React-Komponente `SettingsPanel.tsx` (oder erweitere eine bestehende Einstellungsseite):

- Liste der 6 Anbieter mit Eingabefeldern für API-Key
- Hinweis: "Keys werden sicher im System-Keyring gespeichert und verlassen niemals den Rechner."
- Button "Speichern" ruft `invoke('save_api_key', { provider, key })` auf
- Button "Löschen" ruft `invoke('delete_api_key', { provider })` auf
- Visuelles Feedback (Erfolg/Fehler)

**Wichtig:** Die Keys dürfen im Frontend-State nicht gespeichert werden (nur die Aktion `invoke` ausführen, dann State leeren).

### 4. Modell-Info-Panel verbessern

Wenn Kimi die 6-Anbieter-Auswahl integriert hat, soll das Modell-Info-Panel:
- Aktuelle Preise anzeigen (die du verifiziert hast)
- Datenschutz-Kennzeichnung:
  - Mistral: "EU-Anbieter (DSGVO-freundlich)" 🟢
  - OpenAI, Anthropic: "USA" 🟡
  - DeepSeek, Qwen, Kimi: "China — für unkritische Inhalte empfohlen" 🔴
- Region und Stärken pro Modell

### 5. Zusätzliche Tests

- Unit-Test für `SettingsPanel` (Mock von `invoke`)
- Test für Provider-Mapping (wenn Kimi es erweitert hat)
- Fehlerfall-Tests: Was passiert, wenn `invoke` fehlschlägt?

### 6. Changelog

Trage in `docs/changelog.md` ein:
- Qwen-Preis verifiziert (oder als TODO markiert)
- Sicherheitsprüfung durchgeführt
- SettingsPanel erstellt/erweitert
- Modell-Info-Panel mit Datenschutz-Kennzeichnung

## Regeln

1. **Keine API-Keys in Git, Code oder Logs.**
2. **Keine Schema-Änderungen.**
3. **Keine Rust-Code-Änderungen.** (Qwen macht das)
4. **Changelog pflegen.**
5. **Bei Unklarheiten fragen.** (Kimi oder der Nutzer)

## Erste Schritte

1. Qwen-Preis recherchieren (offizielle Alibaba-Cloud-Preisseite).
2. `.gitignore` prüfen und ggf. ergänzen.
3. `SettingsPanel` bauen.
4. Modell-Info-Panel verbessern.

Melde dich, wenn du mit den ersten 3 Tasks durch bist.

---

> **Hinweis für den Nutzer:** Dieser Prompt geht davon aus, dass GLM direkt auf das Dateisystem zugreifen kann.
