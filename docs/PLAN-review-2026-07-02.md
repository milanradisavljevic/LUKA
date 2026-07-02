# LUKA/lehr-suite — Gesamt-Review & Umsetzungsplan (2026-07-02)

Review durch Claude (Fable 5): Architektur, Produkt, UX, Security, Qualität, Performance.
Basis: 3 parallele Deep-Explorations + AGENTS.md, CHANGELOG.md, docs/.
Umsetzung erfolgt durch Codex und Opus — Copy-Paste-Prompts ganz unten (Abschnitt I).

---

## A. Executive Summary

Das Projekt ist deutlich reifer als ein Prototyp: ~650 Tests über alle Schichten, saubere Schichtung (schema→input/renderer/export, qa als Integrationsebene), sicherheitsbewusste Rust-Schicht (Keyring, CSP-Allowlist, SSRF-Denylist, parametrisiertes SQL, argv-Spawns, GIFT-Escaping, Prompt-Injection-Sanitizer). Kein Critical-Fund.

Die drei größten Baustellen:

1. **Doku ≠ Realität.** AGENTS.md sagt „Phase 2 (gemeinsame SQLite) geplant" — sie ist **gebaut** (Rust `db.rs` erzeugt NATASCHA- + LUA-Schema in `~/lehr-suite-bridge/lehr-suite.db`, Sidecar via `--db-path`). Der nächste Agent plant sonst Doppeltes.
2. **Zwei tote Parallelwelten.** TS-LLM-Provider (`packages/llm/provider-*.ts`) und TS-URL-Parser laufen nur in Tests; Live-Pfad ist Rust. NATASCHA-Tabellenschema doppelt gepflegt (Python + Rust-SQL). Repo trägt ~5 MB Müll (gespeicherte ORF.at-Seite, altes Projekt-Snapshot „Administration der LLMs", Chat-Exporte).
3. **Frontend-Gewicht.** 15 MB `src/assets` (9 MB Fach-PNGs, 2,1 MB verwaistes Mural, 3,1 MB Fonts), null Code-Splitting (alle 18 Views statisch, recharts im Bundle trotz abgeschalteter NATASCHA-Views), Riesen-Komponenten (BlockConfigPanel 1190 LOC, Step0 838, Step4 818).

Produktseitig: Closed-Loop-These trägt. Kompetenz-Mapping, Pool, Vorlagen, Quick-Übung, Selbsteinschätzung existieren schon. Größte Lücken für Alltagstauglichkeit: SRDP-Matura-Modus (eigene Top-Prio, richtig so), Binnendifferenzierung (3 Niveaus), PDF-Export ohne LibreOffice-Pfad-Tipperei, In-App-Angabe-Erfassung für den vollautomatischen Loop.

---

## B. Die 10 wichtigsten nächsten Schritte

1. **Doku-Drift fixen**: AGENTS.md/docs auf Ist-Stand (Phase 2 gebaut, Bridge v2, Kimi-Host). 30 min, verhindert Fehlplanung jedes künftigen Agents.
2. **Repo-Hygiene**: ORF.at-Ordner, `Administration der LLMs/`, `Icons für LLMs/`, `chat-export-*.json`, Root-PNG/session-md raus (bzw. `docs/archiv/`).
3. **Bridge-Read härten**: `read_bridge_export` auf Inbox-Verzeichnis begrenzen + Size-Cap + `schemaVersion`-Check (einziger Rust-Command, der beliebige Pfade liest).
4. **PDF-Export-Flow entkrampfen**: Pfad-Tippfeld durch Dialog ersetzen; LibreOffice-Erkennung mit klarem Onboarding.
5. **Asset-Diät**: 12 Fach-PNGs → WebP (Lineart komprimiert exzellent, ~70–80 % Ersparnis), verwaistes `murals/philosophie.png` (2,1 MB) löschen, Fonts subsetten.
6. **Code-Splitting**: `React.lazy` je View + recharts nur laden, wenn `FEATURES.natascha`.
7. **Emoji→lucide** in 5 Dateien (eigene Regel, rendert im gepackten EXE nicht) + Du/Sie vereinheitlichen.
8. **SRDP-Matura-Modus** starten (eigene NEXT-STEPS-Prio 1 — bestätigt sinnvoll: nutzt vorhandene NATASCHA-15-Subkriterien, Oberstufen-Killer).
9. **CI ausbauen**: `cargo test` + `cargo audit` + `pnpm audit` + Dependabot (aktuell null Rust-Coverage in CI).
10. **`launch_natascha`-Spawn** auf Windows real testen + `pythonCommand`-Interpolation absichern.

---

## C. Security Findings (priorisiert)

Kein Critical. Trust-Boundary-Hinweis: Frontend und Rust-Commands sind dieselbe Vertrauenszone (kein Remote-Content im WebView, `script-src 'self'`), daher sind „Frontend darf beliebige Pfade angeben"-Funde nur Low.

### S1 — Medium: Klartext-API-Keys auf Platte (6 Provider)
- **Wo:** `apps/lua/.env`, `apps/lua/src-tauri/.env.local`, `apps/natascha/.env` (echte Keys, gitignored, nie committet — Git-History geprüft).
- **Warum relevant:** Keyring existiert und ist der Produktionspfad (`keystore.rs:3-46`, `.env.local`-Fallback nur `#[cfg(debug_assertions)]`). Aber `import_keys.rs:54-59` benennt die Import-Datei nach `.env.local` um statt sie zu löschen → Klartextkopie bleibt dauerhaft liegen. NATASCHA nutzt gar keinen Keyring.
- **Fix:** `import_keys` löscht Quelldatei nach erfolgreichem Keyring-Import (oder fragt); `.env.local` nach Umstieg manuell entsorgen; mittelfristig NATASCHA-Sidecar Keys via env-var aus Rust-Keystore durchreichen statt eigener `.env`.
- **Verifikation:** `cargo run --bin import_keys` mit Dummy-Datei → Datei weg, Keyring gefüllt; `llm_complete` im Release-Build ohne `.env.local` funktionsfähig.

### S2 — Medium: `read_bridge_export` liest beliebige Pfade ohne Limit
- **Wo:** `src-tauri/src/commands/bridge.rs:136-148` — prüft nur `.json`-Endung, dann `fs::read_to_string` (kein Verzeichnis-Confinement, kein Size-Cap); `list_bridge_exports` ebenso ohne Cap, überspringt kaputte Dateien still.
- **Warum relevant:** Inbox ist ein von Fremdprozessen beschreibbares Verzeichnis; eine 2-GB-JSON friert die App ein (DoS); LUA-Seite prüft `schemaVersion` nur handgerollt im Frontend (`nataschaBridge.ts:97-102`), Rust gar nicht.
- **Fix:** Pfad kanonisieren und gegen `resolve_bridge_inbox()` prüfen; `metadata().len()`-Cap (z. B. 5 MB); `schemaVersion`-Check in Rust; abgelehnte Dateien mit Grund an UI melden statt still skippen.
- **Verifikation:** Rust-Unit-Tests: Pfad außerhalb Inbox → Err; 6-MB-Datei → Err; `schemaVersion: 99` → Err mit Meldung.

### S3 — Medium (Privacy): Schüler-PII unverschlüsselt in SQLite
- **Wo:** `~/lehr-suite-bridge/lehr-suite.db` (`db.rs:24-29`), Tabellen `schueler(vorname,nachname)`, `abgabe`, `lehrer_feedback`, `schueler_profil`.
- **Warum relevant:** DATENSCHUTZ.md setzt ehrlich auf Geräteverschlüsselung — legitim, aber für Schulbetrieb (GTM-Plan!) ist DB-Verschlüsselung (SQLCipher via rusqlite-Feature) oder mindestens verschlüsseltes Backup ein Verkaufs-/Compliance-Argument.
- **Fix (pragmatisch):** kurzfristig: BitLocker-Empfehlung prominenter in App-Onboarding; mittelfristig: SQLCipher-Option mit Passphrase im Keyring. Kein Blocker.
- **Verifikation:** DB-Datei im Hexeditor: kein Klartext-Name auffindbar (bei SQLCipher).

### S4 — Low: `launch_natascha` interpoliert Setting in Shell-String
- **Wo:** `natascha.rs:53-61`: `cmd /C start … cmd /K "{py} natascha.py"` — `py` = frei editierbares Setting `pythonCommand`; macOS-osascript analog. Alle anderen Spawns sauber argv-basiert.
- **Warum relevant:** Nur Selbst-Injection (User schadet sich selbst), aber ein präpariertes Settings-JSON (Import/Support-Fall) würde beliebige Kommandos ausführen.
- **Fix:** `pythonCommand` gegen Whitelist-Regex validieren oder Spawn ohne cmd-String bauen.
- **Verifikation:** Setting `python & calc` → Fehlermeldung statt Rechner.

### S5 — Low: Prompt-Injection-Sanitizer ist pattern-basiert (Restrisiko akzeptieren, aber kennen)
- **Wo:** `packages/llm/src/prompt.ts:690-708` (`INJECTION_PATTERNS` → `[neutralisiert]`).
- **Warum relevant:** Pattern-Listen sind umgehbar (Umschreibungen, andere Sprachen). Blast-Radius aber klein und gut begrenzt: LLM-Output läuft durch Zod (`validate.ts:104`), `meta`/`quelltexte` stammen nie vom Modell (`validate.ts:70-99`), kein HTML-Sink im Frontend (0× `dangerouslySetInnerHTML`). Schlimmster Fall: inhaltlich manipulierte Aufgaben — die Lehrkraft sieht die Vorschau.
- **Fix:** Kein Umbau nötig. In HelpView/DATENSCHUTZ einen Satz ergänzen: „Importierte Quelltexte können die KI-Generierung beeinflussen — Vorschau prüfen." Quality-Gate (existiert) ist die richtige zweite Verteidigungslinie.
- **Verifikation:** bestehende `sanitize.test.ts` + ein Testfall mit umschriebener Injection dokumentiert das Restrisiko.

### S6 — Low: CSP-Feinschliff + Kimi-Host-Diskrepanz
- **Wo:** `tauri.conf.json:22-24`.
- **Warum relevant:** CSP gilt nur für WebView-Fetches — LLM-HTTP läuft in Rust (reqwest, CSP-frei). Die 6 LLM-Hosts in `connect-src` sind damit Ballast (schadlos). `style-src 'unsafe-inline'` bei React üblich, ohne Script-Sink harmlos. Kimi: Rust-Adapter (Live) nutzt `api.moonshot.ai` (`openai_compat.rs:14`) — konsistent zur CSP; nur der ungenutzte TS-Provider zeigt auf `.cn` (`provider-kimi.ts:4`).
- **Fix:** Optional `connect-src` auf `'self'` reduzieren (Klarheit: „Frontend telefoniert nie selbst raus"); TS-Kimi-Host angleichen oder TS-Provider als test-only markieren.
- **Verifikation:** App-Smoke nach CSP-Änderung: Generierung + URL-Import funktionieren.

### S7 — Low (Prozess): Supply-Chain unbewacht
- **Wo:** `.github/workflows/ci.yml` — kein `cargo test`, kein `cargo audit`, kein `pnpm audit`, kein Dependabot/Renovate.
- **Warum relevant:** NATASCHA-Requirements zeigen manuelles CVE-Nachziehen (lxml/pillow-Pins mit CVE-Kommentaren) — das sollte automatisch kommen.
- **Fix:** CI-Job `cargo test && cargo audit`; `pnpm audit --prod` (non-blocking Report); Dependabot für npm+cargo+pip.
- **Verifikation:** CI grün mit neuen Jobs; ein absichtlich veralteter Dep erzeugt Warnung.

### Positivliste (belegt, damit sie niemand „verbessert")
Keyring-only-Keys im Release; parametrisiertes SQL überall (rusqlite `params![]`, Python `?`); argv-Spawns; SSRF-Denylist inkl. Metadata/CGNAT/ULA pro Redirect-Hop (`web.rs:122-172`); 50k-Cap + Content-Type-Gate beim URL-Fetch; Dateiname-Basename-Guard (`export.rs:25`); `_safe_segment` für Bridge-Dateinamen; atomare Bridge-Writes; GIFT-Escaping (`export/src/index.ts:8-15`); kein HTML-Sink; keine Key-Logs.

---

## D. UX/Product Findings (priorisiert)

### Produktbewertung
Closed-Loop-Workflow (Erstellen → Korrigieren → gezielt Üben) ist als Lehrer-Workflow stimmig und differenzierend — kein Konkurrenztool verbindet Generierung mit Fehler-Heatmaps aus echter Korrektur. Bereits vorhanden und alltagstauglich: 5-Schritte-Wizard mit Quality-Gate, Aufgaben-Pool, Vorlagen, Quick-Übung, Kompetenz-Mapping mit Ehrlichkeits-Vermerk, Selbsteinschätzungsbogen, GIFT/Moodle. **Fehlend für echten Alltag:** SRDP-Modus (Oberstufe), Binnendifferenzierung (3 Niveaus aus einem Master — größter ungelöster Zeitfresser), reibungsloser PDF-Weg, In-App-Angabe-Erfassung (Loop-Schließung ohne Terminal-Umweg). **Nice-to-have:** Themenpool-Vergleich, Drive-Integration (Spec liegt in docs), Sprachbefehle-Ausbau.

### U1 — Hoch: PDF-Export verlangt manuell getippten Windows-Pfad
`Step4_Generate.tsx:748-815` — Textfeld für `C:\Users\…`-Pfad ist der unprofessionellste Moment der App. Fix: `dialog:allow-open` existiert schon → Datei-Picker; letzten DOCX-Pfad (liegt schon in `usePdfExport.ts:7-10`) als Default, Tippfeld streichen.

### U2 — Hoch: Emojis in UI trotz eigener „Icons statt Emojis"-Regel (rendert im EXE nicht)
`PreviewTwoColumn.tsx:213` („💡 Tip:" → auch „Tipp"), `Step0_Absicht.tsx:148,754`, `SettingsView.tsx:106,126`, `ErwartungshorizontView.tsx:51,65`. Fix: lucide `Lightbulb`/`TriangleAlert`/`Check`.

### U3 — Hoch: Du/Sie-Bruch im wichtigsten Moment
App duzt durchgehend, aber Export-Erfolg/PDF-Modals siezen (`Step4_Generate.tsx:498,727-767`). Fix: auf „du" vereinheitlichen.

### U4 — Mittel: „Testdaten laden (Dev)"-Button für Endnutzer sichtbar
`SettingsView.tsx:340-350`. Fix: hinter `import.meta.env.DEV` oder Feature-Flag.

### U5 — Mittel: ThemeToggle verliert „System"-Präferenz
`useTheme.ts:46-52` — Header-Toggle kippt nur light/dark. Fix: 3-Wege-Zyklus light→dark→system oder Dropdown in Settings.

### U6 — Mittel: Kein Offline-/Kein-Key-Zustand vor dem Klick
0× `navigator.onLine`; Fehler erscheint erst nach Timeout als „Anbieter nicht erreichbar" (`useGenerate.ts:382`). Fix: Vorab-Check in Step 3/4 (Key vorhanden? online?) als Hinweis-Banner statt Fehlversuch.

### U7 — Mittel: Validierung fehlt bei API-Key-Eingabe und NATASCHA-Pfaden
`SettingsPanel.tsx`, `SettingsView.tsx:298-355` — Freitext ohne Format-/Existenzprüfung. Fix: Provider-Prefix-Check (`sk-ant-`, …) als Hinweis; Pfad-Existenz via kleinem Tauri-Command prüfen, grüner/roter Punkt.

### U8 — Niedrig: Lange Dokumente ohne Virtualisierung
`PreviewTwoColumn.tsx` rendert alle Blöcke. Erst relevant bei 30+ Blöcken — beobachten, nicht vorauseilend fixen.

### Gut (nicht anfassen)
Lade-Modal mit Stufen/Timer/Abbrechen (`Step4_Generate.tsx:602-674`), Quality-Gate mit „Trotzdem exportieren", Empty-States mit Treffer/leer-Unterscheidung, Ctrl+K-Palette mit gruppierten Treffern, A11y-Grundgerüst (aria-current, role=switch, keyboard-operable Tiles), Fachatmosphäre-Konzept selbst.

---

## E. Architektur/Code Findings

### E1 — Doku-Drift (größtes Risiko für Agent-Workflow)
AGENTS.md §Roadmap: „Phase 2 — geplant". Real: `db.rs` embedded `natascha_schema.sql`+`lua_schema.sql`, `storage.ts` ist bereits Cache-über-SQLite mit localStorage-Migration (`storage.ts:126`), Sidecar-Kommandos (`natascha_analyze` etc.) erzwingen `--db-path`. Fix: AGENTS.md + phase2-Doc auf DONE, Ist-Architektur 5 Zeilen dokumentieren.

### E2 — Zwei LLM-Stacks ohne markiertes Ownership
TS-Provider (`packages/llm/provider-*.ts`, fetch + env-Keys) vs. Rust-Adapter (Live). Kimi-Host divergiert bereits (.cn vs .ai) — erstes Symptom. Fix: README-Block in `packages/llm`: „Provider = Test-/CLI-Pfad; Live = src-tauri/adapters"; Host angleichen.

### E3 — NATASCHA-Schema doppelt (Python + Rust-SQL)
`natascha_db.py:149` vs. `src-tauri/src/natascha_schema.sql`. Drift = stille Korruption des gemeinsamen DB-Files. Fix: Sync-Test (CI-Job vergleicht `CREATE TABLE`-Statements normalisiert) — billiger als Single-Source-Umbau.

### E4 — Riesen-Komponenten
`BlockConfigPanel.tsx` 1190 (18 Blocktypen in einem File → pro Typ splitten wie bei `BlockPreview*` schon geschehen), `Step0_Absicht.tsx` 838, `Step4_Generate.tsx` 818 (Generierung + 7 Export-Arten + 3 Modals → Export-Panel extrahieren), `SubjectAtmosphere.tsx` 952. Muster existiert schon (17 kleine BlockPreview-Komponenten) — nachziehen.

### E5 — Bridge-Validierung handgerollt statt Zod
`nataschaBridge.ts:97-102` — Repo hat Zod überall, hier Hand-Narrowing gegen `bridge/schema.json` (SSOT). Fix: Zod-Schema aus Contract ableiten, ein Modul, beide Checks daraus.

### E6 — CI-Lücken
Kein `cargo test`/`cargo check` in CI (Rust nur lokal), kein Tauri-Build-Smoke. WSL-rollup-Flake (AGENTS.md) macht lokale `vitest`-Läufe unzuverlässig → CI ist die einzige verlässliche Instanz, sollte vollständig sein.

### E7 — Kleinkram
`packages/input` deklariert ungenutzte Deps `docx`/`pdf-lib`; Legacy-Blocktyp `umformung` wirft zur Laufzeit (`useGenerate.ts:188`) statt im Schema deprecated zu sein; Bridge-Doppelexistenz `bridge/inbox/` (Repo) vs. `~/lehr-suite-bridge/inbox` (live) verwirrt.

---

## F. Performance Findings

### F1 — Hoch: 9 MB Fach-PNGs → WebP
12 PNGs 536–1092 KB (`assets/subject-atmospheres/`), statisch importiert (`SubjectAtmosphere.tsx:3-14`). Lineart mit Alpha ist Idealfall für WebP (`cwebp -q 82`, vorher `pngquant`-Vergleich) — erwartbar 70–85 % kleiner ohne sichtbaren Verlust (getönt/invertiert wird eh per CSS).

### F2 — Hoch: 2,1 MB Leiche
`assets/murals/philosophie.png` — 0 Referenzen (murals.css-Rasterpfad deaktiviert). Löschen.

### F3 — Mittel: Kein Code-Splitting
Alle Views statisch in `App.tsx:11-34`; recharts im Hauptbundle trotz `FEATURES.natascha:false`. Fix: `React.lazy` + `Suspense` je View, `manualChunks` für recharts/dnd-kit. Parser/Exporter sind schon vorbildlich lazy (`Step1_Input.tsx:23`, `useExport.ts:24`).

### F4 — Mittel: 3,1 MB Fonts
10 TTFs (9× Ubuntu-Schnitte + PlaywriteAT). Fix: nur genutzte Schnitte behalten, `woff2` statt TTF, Rest raus.

### F5 — Niedrig: App.tsx als State-Hub
Ganzer Baum re-rendert bei Top-Level-State; mit memo-Handlern gemildert, kein akutes Problem. Nach E4-Split neu bewerten.

---

## G. PR-Backlog (reviewbare Häppchen, priorisiert)

| # | PR-Titel | Ziel | Dateien | Risiko | Verifikation |
|---|---|---|---|---|---|
| 1 | `docs: AGENTS/Phase-Status auf Ist-Stand` | Doku-Drift beenden (Phase 2 = gebaut) | AGENTS.md, docs/phase2-shared-db.md, CHANGELOG.md | keins | Review-Lesen |
| 2 | `chore(repo): Dev-Artefakte entfernen` | ORF.at-Ordner, „Administration der LLMs", „Icons für LLMs", chat-export-*.json, Root-PNG/session-md löschen/archivieren | apps/lua/*, Repo-Root | keins (git-Historie behält alles) | `git status` clean, Build grün |
| 3 | `perf(assets): Fach-PNGs→WebP, Mural-Leiche raus, Fonts subsetten` | ~12 MB → ~3 MB | assets/subject-atmospheres/*, assets/murals/, assets/fonts/, SubjectAtmosphere.tsx, index.css | niedrig | Vorher/Nachher-Screenshot 12 Fächer hell+dunkel; `pnpm -r build` |
| 4 | `fix(ui): Emojis→lucide + Du/Sie vereinheitlichen` | EXE-Rendering + Tonalität | PreviewTwoColumn.tsx, Step0_Absicht.tsx, SettingsView.tsx, ErwartungshorizontView.tsx, Step4_Generate.tsx | keins | grep Emoji = 0; Sichtprüfung |
| 5 | `sec(bridge): Inbox-Confinement + Size-Cap + Versions-Check` | S2 schließen | src-tauri/src/commands/bridge.rs (+Tests) | niedrig | Rust-Tests: Pfad außerhalb, >5 MB, Version 99 → Err |
| 6 | `feat(export): PDF-Flow mit Datei-Dialog statt Pfad-Tippfeld` | U1 | Step4_Generate.tsx, usePdfExport.ts | niedrig | Tauri-App: PDF ohne Tippen erzeugen |
| 7 | `perf(web): React.lazy Views + recharts aus Hauptbundle` | F3 | App.tsx, vite.config.ts, KlassenView/SchuelerView | mittel | Chunk-Report vorher/nachher; Smoke alle Views |
| 8 | `ci: cargo test/audit + pnpm audit + Dependabot` | S7/E6 | .github/workflows/ci.yml, .github/dependabot.yml | keins | CI-Lauf grün |
| 9 | `sec(spawn+keys): pythonCommand validieren, import_keys räumt auf` | S1/S4 | src-tauri/src/commands/natascha.rs, bin/import_keys.rs | niedrig | Unit-Test böses Setting → Err; Import-Durchlauf |
| 10 | `fix(settings): Dev-Button gaten, Theme 3-Wege, Key-/Pfad-Feedback` | U4/U5/U7 | SettingsView.tsx, useTheme.ts, SettingsPanel.tsx | niedrig | Sichtprüfung, Theme-Persistenz |
| 11 | `test(schema-sync): NATASCHA-Schema Python↔Rust CI-Wächter` | E3 | neues Script + CI-Step | keins | Mutations-Test: Feld einseitig ändern → CI rot |
| 12 | `refactor: BlockConfigPanel + Step4 Export-Panel splitten` | E4 | components/BlockConfigPanel.tsx → blockconfig/*, Step4_Generate.tsx | mittel | Web-Tests + Sichtprüfung Wizard |

Danach (Feature-Track, eigene Planung): **SRDP-Matura-Modus** → **Binnendifferenzierung** → **In-App-Angabe-Erfassung**.

### Roadmap 2/4/8 Wochen
- **2 Wochen:** PRs 1–6 + 8 (Hygiene, Security-Härtung, PDF-Flow, Assets, CI). Klein, risikoarm, App wirkt sofort fertiger.
- **4 Wochen:** PRs 7, 9–12 + SRDP-Spike (Template + ein Fach end-to-end).
- **8 Wochen:** SRDP komplett, Binnendifferenzierung (Schema-Feld `differenzierung` + 3-fach-Export), In-App-Angabe-Erfassung; danach GO-TO-MARKET-Voraussetzungen (Signing, Updater).

---

## H. Offene Fragen (nicht blockierend, Antworten folgen)

1. **Kimi-Konto:** Key auf moonshot.**ai** (international) oder .**cn**? Entscheidet den richtigen Host (Rust nutzt .ai).
2. **Repo-Zukunft:** irgendwann public (GTM)? Dann Müll-Entfernung + History-Prüfung doppelt wichtig.
3. **SQLCipher:** reicht dokumentierte Geräteverschlüsselung (BitLocker) oder DB-Verschlüsselung aufs Board?
4. **„Administration der LLMs"/„Icons für LLMs":** löschen oder nach `docs/archiv/`?
5. **SRDP zuerst:** nach Quick-Win-PRs direkt SRDP-Spike?
6. **NATASCHA-Keys:** in Keyring migrieren (Sidecar bekommt Key als env von Rust) oder `.env` bewusst behalten (Standalone)?

---

## Verifikation (global, nach jedem PR)

```bash
cd apps/lua && pnpm -r build && pnpm -r typecheck && pnpm -r test   # vitest ggf. auf Windows/CI (WSL-rollup-Flake, siehe AGENTS.md)
cd src-tauri && cargo check && cargo test
cd ../../apps/natascha && python3 -m pytest -q
```
CHANGELOG.md je PR ergänzen (AGENTS.md-Regel 1).

---

## I. Umsetzung mit Codex & Opus — Copy-Paste-Prompts

**Reihenfolge (simpel):** 1 → 2 → 4 → 5 → 6 → 3 → 8 → 9 → 10 → 7 → 11 → 12. Jeder PR eigener Branch, eigener Commit, CHANGELOG-Eintrag. PRs 1/2/4 sind unabhängig und können parallel laufen.

**Aufteilung:** Codex = mechanische/abgegrenzte PRs (1, 2, 4, 8, 10). Opus = Rust/Refactor/Perf (3, 5, 6, 7, 9, 11, 12).

### Prompt PR 1 (Codex)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (Abschnitt G, PR 1 + E1).
Aktualisiere AGENTS.md (Roadmap-Abschnitt) und docs/phase2-shared-db.md auf den Ist-Stand:
Phase 2 (gemeinsame SQLite) ist gebaut — Rust src-tauri/src/commands/db.rs erzeugt
natascha_schema.sql + lua_schema.sql in ~/lehr-suite-bridge/lehr-suite.db, LUA-Sidecar
erzwingt --db-path. Beschreibe die Ist-Architektur in ~5 Zeilen. CHANGELOG.md ergänzen.
Keine Code-Änderungen.
```

### Prompt PR 2 (Codex)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (Abschnitt G, PR 2).
Entferne Dev-Artefakte aus dem Repo: apps/lua/"Westbalkan_ EU verspricht Tempo bei
Erweiterung - news.ORF.at.html" + zugehöriger _files-Ordner, apps/lua/"Administration
der LLMs"/, apps/lua/"Icons für LLMs"/, apps/lua/chat-export-*.json, Root-Dateien
9a2d416d-*.png und session-ses_1478.md. Nur löschen, nichts anderes anfassen.
Danach: cd apps/lua && pnpm -r typecheck (muss grün bleiben). CHANGELOG.md ergänzen.
```

### Prompt PR 3 (Opus)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (F1/F2/F4, PR 3).
1) Konvertiere die 12 PNGs in apps/lua/apps/web/src/assets/subject-atmospheres/ nach
   WebP (cwebp -q 82, Alpha erhalten), passe die Imports in
   components/SubjectAtmosphere.tsx an. Sichtqualität geht vor Maximalkompression.
2) Lösche apps/lua/apps/web/src/assets/murals/philosophie.png (0 Referenzen, vorher
   mit grep verifizieren).
3) Fonts: prüfe in index.css, welche Schnitte in assets/fonts/ wirklich per
   @font-face eingebunden sind; entferne unbenutzte TTFs, konvertiere genutzte nach
   woff2.
Verifikation: pnpm -r build; Sichtprüfung aller 12 Fächer hell+dunkel.
CHANGELOG.md ergänzen.
```

### Prompt PR 4 (Codex)
```
Lies AGENTS.md (Regel: Icons statt Emojis, WebView2) und docs/PLAN-review-2026-07-02.md
(U2/U3, PR 4).
1) Ersetze Emojis durch lucide-react-Icons: PreviewTwoColumn.tsx:213 („💡 Tip:" →
   Lightbulb-Icon + „Tipp:"), Step0_Absicht.tsx:148 (🎯) und :754 (⚠ → TriangleAlert),
   SettingsView.tsx:106,126 und ErwartungshorizontView.tsx:51,65 (✓ → Check-Icon).
2) Vereinheitliche Anrede auf „du": Step4_Generate.tsx:498 und die PDF-Modals
   :727-767 siezen aktuell.
Verifikation: grep nach Emojis in src = 0 Treffer; pnpm -r typecheck.
CHANGELOG.md ergänzen.
```

### Prompt PR 5 (Opus)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (S2, PR 5). Security-Härtung in
apps/lua/src-tauri/src/commands/bridge.rs:
1) read_bridge_export: Pfad kanonisieren und ablehnen, wenn er nicht unterhalb von
   resolve_bridge_inbox() liegt.
2) Size-Cap 5 MB via fs::metadata vor dem Lesen (read_bridge_export UND
   list_bridge_exports).
3) schemaVersion prüfen (erlaubt: 1, 2 — siehe bridge/schema.json); bei Ablehnung
   Fehlermeldung mit Grund statt stillem Skip.
Rust-Unit-Tests ergänzen: Pfad außerhalb Inbox → Err; >5 MB → Err; schemaVersion 99
→ Err. Muster: bestehende Tests in web.rs. cargo test muss grün sein.
CHANGELOG.md ergänzen.
```

### Prompt PR 6 (Opus)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (U1, PR 6).
PDF-Export-Flow verbessern: In Step4_Generate.tsx:748-815 tippt der User heute einen
vollen Windows-Pfad in ein Textfeld. Ersetze das durch den Tauri-Datei-Dialog
(dialog:allow-open ist in capabilities/default.json schon erlaubt; Muster: useExport.ts
Speichern-unter). Default = letzter DOCX-Pfad aus usePdfExport.ts:7-10.
Verifikation: pnpm -r typecheck; manuell in der Tauri-App: PDF erzeugen ohne Tippen.
CHANGELOG.md ergänzen.
```

### Prompt PR 7 (Opus)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (F3, PR 7).
Code-Splitting in apps/lua/apps/web:
1) Views in App.tsx:11-34 auf React.lazy + Suspense umstellen (renderView()-Switch
   bleibt; leichter Spinner als Fallback).
2) recharts darf nicht mehr im Hauptbundle landen (wird nur von KlassenView/
   SchuelerView genutzt, die per FEATURES.natascha gegated sind).
3) vite.config.ts: manualChunks für recharts und @dnd-kit.
Verifikation: vite build Chunk-Report vorher/nachher dokumentieren; alle Views einmal
öffnen (Smoke). Achtung WSL-rollup-Flake (AGENTS.md) — Build ggf. auf Windows/CI prüfen.
CHANGELOG.md ergänzen.
```

### Prompt PR 8 (Codex)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (S7/E6, PR 8).
CI ausbauen (.github/workflows/ci.yml):
1) Neuer Job „Rust": cargo check + cargo test in apps/lua/src-tauri (ubuntu-latest;
   nötige System-Deps für Tauri v2: libwebkit2gtk-4.1-dev, libgtk-3-dev etc.).
2) cargo audit (non-blocking) + pnpm audit --prod (non-blocking Report).
3) .github/dependabot.yml: npm (apps/lua), cargo (apps/lua/src-tauri), pip
   (apps/natascha), wöchentlich.
Verifikation: CI-Lauf grün. CHANGELOG.md ergänzen.
```

### Prompt PR 9 (Opus)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (S1/S4, PR 9).
1) apps/lua/src-tauri/src/commands/natascha.rs:53-61: launch_natascha interpoliert
   das Setting pythonCommand in einen cmd-/osascript-String. Validiere py vor dem
   Spawn gegen eine Whitelist (nur [A-Za-z0-9_.:/\\ -]); bei Verstoß Err mit
   Meldung. Unit-Test: "python & calc" → Err.
2) src-tauri/src/bin/import_keys.rs:54-59: statt Rename nach .env.local die
   Quelldatei nach erfolgreichem Keyring-Import löschen; Hinweis ausgeben.
cargo test grün. CHANGELOG.md ergänzen.
```

### Prompt PR 10 (Codex)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (U4/U5/U7, PR 10).
1) SettingsView.tsx:340-350: „Testdaten laden (Dev)"-Button nur bei
   import.meta.env.DEV rendern.
2) useTheme.ts:46-52: Header-Toggle als 3-Wege-Zyklus light→dark→system (Titel/Icon
   zeigt aktuellen Modus).
3) SettingsPanel.tsx: API-Key-Prefix-Hinweis je Provider (z. B. sk-ant- für
   Anthropic) als sanfte Warnung, kein Hard-Block.
pnpm -r typecheck + Sichtprüfung. CHANGELOG.md ergänzen.
```

### Prompt PR 11 (Opus)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (E3, PR 11).
NATASCHA-Tabellenschema existiert doppelt: apps/natascha/natascha_db.py (SCHEMA_SQL,
~Zeile 149) und apps/lua/src-tauri/src/natascha_schema.sql. Baue einen Sync-Wächter:
Script (Python, stdlib-only) das beide Schemata normalisiert (Whitespace, Case,
IF NOT EXISTS) und CREATE-TABLE-weise vergleicht; Exit 1 bei Drift mit Diff-Ausgabe.
In CI als Step einhängen. Mutations-Test lokal: ein Feld einseitig ändern → Script rot.
CHANGELOG.md ergänzen.
```

### Prompt PR 12 (Opus)
```
Lies AGENTS.md und docs/PLAN-review-2026-07-02.md (E4, PR 12). Reiner Refactor,
Verhalten unverändert:
1) apps/lua/apps/web/src/components/BlockConfigPanel.tsx (1190 LOC, 18 Blocktypen)
   in components/blockconfig/<Typ>.tsx aufteilen — gleiches Muster wie die 17
   BlockPreview*-Komponenten.
2) Step4_Generate.tsx (818 LOC): Export-Aktionen-Panel (Zeilen ~277-531) als eigene
   Komponente ExportPanel.tsx extrahieren.
Verifikation: pnpm -r typecheck && pnpm -r test (Web-Tests), Wizard-Sichtprüfung.
CHANGELOG.md ergänzen.
```
