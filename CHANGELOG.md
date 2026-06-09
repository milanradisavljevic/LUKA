# Changelog

Alle nennenswerten Änderungen an **lehr-suite** (NATASCHA × LUA Integration).
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/).
Neueste Einträge oben. Bitte bei jeder substanziellen Änderung hier ergänzen
(auch andere Coding-Agents) — siehe `AGENTS.md`.

## [Unreleased]

### Added — Welle 4: Aufgabe/Klasse/Rubrik nativ anlegen
- **CLI** (`natascha_cli.py`): `add-klasse`, `add-aufgabe` (mit `--fach/--schulstufe/
  --textsorte/--rubric`), `list-rubrics` — nutzen NATASCHAs vorhandene, kommentar-
  erhaltende Config-Schreiber (`nc.add_class_to_config`/`add_aufgabe_to_config`/
  `rubric_options_for`/`default_rubric_for`). Smoke-getestet (Config-Roundtrip).
- **Rust** (`natascha.rs`): `natascha_add_klasse`/`natascha_add_aufgabe`/
  `natascha_list_rubrics` (Sidecar) + Registrierung.
- **UI** (`SchuelerView`): „Aufgabe anlegen (Rubrik)"-Formular (Bezeichnung, Fach,
  Schulstufe, Rubrik-Dropdown). `useNatascha` um `addKlasse`/`addAufgabe`/
  `listRubrics` erweitert. (Schüler-Anlegen war bereits da; Klassen entstehen
  automatisch.)

### Added — M1 Polish (Fehler + Dev-Seed)
- **Strukturierte Analyse-Fehler:** `natascha.rs` kategorisiert CLI-Fehler jetzt
  (API-Key fehlt / Netzwerk / Ratenlimit / fehlende Python-Deps / Python nicht
  startbar) statt rohem stderr/Traceback durchzureichen (`categorize_cli_error`).
- **Dev-Seed-Button:** `natascha_seed_testdaten` (Rust) führt `seed_testdaten.py`
  in die gemeinsame DB aus; Button „Testdaten laden (Dev)" + DB-Pfad-Anzeige im
  Einstellungen-Abschnitt „NATASCHA". Behebt das „Views sind leer"-Rätsel beim Testen.

### Changed/Removed — M2 Aufräumen (eine Read-Quelle, Bugfixes)
- **Doppelten Read-Pfad entfernt:** Die 6 ungenutzten CLI-Sidecar-Read-Commands
  (`natascha_klassen_liste/aufgaben/abgaben/heatmap/notenverteilung/statistik` in
  `natascha.rs`) und ihre Python-Pendants in `natascha_cli.py` gelöscht. LUA liest
  ausschließlich über den Rust-Read-Layer (`natascha_read.rs`, `db_*`). Kein
  Drift-Risiko mehr durch zwei Read-Implementierungen.
- **`feedback-docx`-Bug behoben:** suchte die Abgabe via
  `get_abgaben_by_klasse_aufgabe(db,"","")` (leere Filter → nichts gefunden) + toter
  Loop. Jetzt direkter `SELECT * FROM abgabe WHERE id=?`.
- **`db_set_path`** stellt die gemanagte Connection jetzt sofort um (vorher erst nach
  Neustart wirksam).
- `natascha_schema.sql` mit Hinweis versehen, dass NATASCHA Schema-Eigentümer ist
  (1:1-Spiegelung). Ungenutzter `Mutex`-Import entfernt.

### Fixed — M0 Blocker + WSLg-Crash (Review-Nacharbeit)
- **DB-Split-Brain behoben:** `natascha_analyze` schrieb über die CLI in
  `natascha_schuljahr.db`, während die UI aus `lehr-suite.db` las → Analysen tauchten
  nie in den Views auf. Jetzt ist Rust Single Source of Truth: `natascha.rs`
  `build_cli_command` reicht `--db-path` (`db::resolve_db_path`) an `natascha_cli.py`
  (neues globales `--db-path`); `natascha_config.toml [database] path` aktiv auf
  `~/lehr-suite-bridge/lehr-suite.db` (für TUI/seed). Verifiziert: seed → CLI-Read
  finden dieselben Daten.
- **`require()`-Runtime-Crash** in `useNatascha.ts` (3×) → echtes
  `import { loadSettings }` (Vite/ESM kennt kein `require`; Analyse-Button war so tot).
- **Terminal-Start-Crash unter WSLg** (`fontpack.cc: No suitable files for '9x18'`):
  `x-terminal-emulator` → Zutty stürzt ohne die Bitmap-Schrift ab. `launch_natascha`
  bevorzugt jetzt `xterm` mit skalierbarer Xft-Schrift (`-fa Monospace -fs 11`),
  Zutty/x-terminal-emulator nur noch als letzter Fallback.

### Added — Welle 4 (P3, Start): Schüler nativ anlegen
- Native Rust-Commands `db_insert_schueler` / `db_delete_schueler`
  (`natascha_read.rs`, reiner SQL-INSERT/DELETE, kein Python). `db_load_all` listet
  Klassen jetzt aus Abgaben **und** Schülern (neu angelegte Klasse erscheint sofort).
- `SchuelerView`: „Schüler anlegen"-Formular (Klasse/Vorname/Nachname) + Löschen je
  Zeile; `useNatascha` um `insertSchueler`/`deleteSchueler` erweitert.

### Added — Welle 3 (P2): Klassen-/Schüler-Ansichten
- **7 neue Rust-Commands in `natascha_read.rs`:**
  - `db_list_schueler` — Schülerliste pro Klasse
  - `db_get_schueler_laengsschnitt` — Längsschnittprofil (Verlauf, Trend, Fehlerschwerpunkte, Kalibrierung)
  - `db_get_klassen_trend` — Noten-Trend über Aufgaben (KI + Lehrer)
  - `db_get_klassen_kalibrierung` — KI vs. Lehrer-Notenvergleich
  - `db_get_fehler_detail` — Drill-down einzelner Fehlerzitate pro Typ
  - `db_export_noten_csv` — Semicolon-getrennter CSV-Export der Noten
- **`SchuelerView.tsx`** — Neue Sidebar-Ansicht „Schüler":
  Klassen/Schüler-Selector, Längsschnitt-Profil mit Notenverlauf (LineChart via Recharts),
  Trend-Indikatoren, Kriterien-K1/K3-Verlauf, Fehlerschwerpunkte, Kalibrierung.
- **`KlassenView.tsx`** — Erweitert mit Tab „Statistik":
  Noten-Trend (LineChart), Kalibrierung (KI vs. Lehrer), Heatmap-Drilldown (Klick → Fehler-Detail-Liste),
  CSV-Export-Button.
- **Recharts** — Neue Dependency für Charts (`BarChart`, `LineChart`, `ResponsiveContainer`).
- **Sidebar** — Neuer Eintrag „Schüler" (Users-Icon) zwischen Korrektur und Vorlagen.
- **`useNatascha.ts`** — 6 neue Methoden: `listSchueler`, `getSchuelerLaengsschnitt`, `getKlassenTrend`,
  `getKlassenKalibrierung`, `getFehlerDetail`, `exportNotenCsv` + zugehörige TypeScript-Interfaces.

### Added — Welle 2: P1 Korrektur-Core-Flow
- **`KorrekturView.tsx`** — Native React-View fuer Korrektur-Workflow:
  TUI-Modus (startet NATASCHA-Terminal) + Native-Modus (Klassen/Aufgaben-Selector,
  Abgaben-Tabelle, Detail-Ansicht mit Kriterien, Fehlern, Lehrer-Noten-Vergabe).
  Neue-Analyse-Dialog (Datei-Chooser + Klasse/Aufgabe + `natascha_analyze` Sidecar).
  Feedback-DOCX-Button in Detail-Ansicht.
- **`db_get_abgabe_detail`** — Neuer Rust-Command fuer vollstaendige Abgabe-Details
  (AbgabeInfo + KriteriumRow + FehlerRow + LehrerFeedbackRow).
- **`db_upsert_lehrer_feedback`** — INSERT/UPDATE Lehrer-Feedback (Note, Kommentar).
- **`useNatascha.ts`** — Neue Methoden `getAbgabeDetail()`, `upsertLehrerFeedback()`
  + zugehoerige TypeScript-Interfaces (`KriteriumRow`, `FehlerRow`,
  `LehrerFeedbackRow`, `AbgabeDetail`). Alle Views nutzen jetzt den Hook statt
  direktem `invoke()` (DRY).
- **`KlassenView.tsx`** — Refactored auf `useNatascha`-Hook.
- **`tauri-plugin-dialog`** — Datei-Dialog-Plugin (Tauri v2) fuer
  Datei-Auswahl im Analyse-Dialog.
- **`@keyframes spin`** — CSS-Animation fuer Lade-Spinner in `index.css`.

### Added — Welle 1: Headless-CLI + Sidecar-Commands
- **`natascha_cli.py`** — Neues Headless-CLI (12 Sub-Commands):
  `analyze`, `srdp-detail`, `schueler-profil`, `klassen-briefing`,
  `feedback-docx`, `erwartungshorizont`, `klassen-liste`, `aufgaben`,
  `abgaben`, `heatmap`, `notenverteilung`, `statistik`.
  Alle Ausgabe als JSON auf stdout, Fehler auf stderr. Kein TUI-Import.
- **`requirements_cli.txt`** — Minimale Dependencies fuer Headless-Betrieb
  (ohne `textual`/`rich`, nur API+DB+DOCX).
- **Tauri Sidecar-Commands** — 8 neue Commands in `natascha.rs`:
  `natascha_analyze`, `natascha_klassen_liste`, `natascha_aufgaben`,
  `natascha_abgaben`, `natascha_heatmap`, `natascha_notenverteilung`,
  `natascha_statistik`, `natascha_feedback_docx`,
  `natascha_erwartungshorizont`. Alle rufen `natascha_cli.py` als
  Sidecar auf und reichen JSON durch.
- **React Hook `useNatascha.ts`** —抽象ion fuer alle NATASCHA-Operationen
  aus der UI: `analyze()`, `listKlassen()`, `listAufgaben()`, `getAbgaben()`,
  `getHeatmap()`, `getNotenverteilung()`, `getKlassenStatistik()`,
  `generateFeedbackDocx()`, `generateErwartungshorizont()`.

### Added — Phase 2: Gemeinsame SQLite-Datenbank
- **Rust-DB-Infrastruktur:** `rusqlite` (bundled) als neue Dependency.
  `src-tauri/src/db.rs` + `natascha_schema.sql` + `lua_schema.sql` — erstellt
  alle 7 NATASCHA-Tabellen + 4 LUA-Tabellen (`generated_materials`, `lua_history`,
  `lua_settings`, `lua_templates`) mit WAL-Modus und Foreign Keys.
- **Tauri-Commands:** 16 neue Commands in `commands/db.rs` und
  `commands/natascha_read.rs`: `db_load_all`, `db_upsert_document`,
  `db_delete_document`, `db_restore_document`, `db_purge_deleted`,
  `db_toggle_favorite`, `db_append_history`, `db_clear_history`,
  `db_save_settings`, `db_save_template`, `db_delete_template`,
  `db_migrate_from_localstorage`, `db_resolve_path`, `db_set_path`,
  `db_list_aufgaben`, `db_get_abgaben`, `db_get_fehler_heatmap`,
  `db_get_notenverteilung`, `db_get_klassen_statistik`,
  `db_upsert_lehrer_feedback`.
- **Hydrate-Cache:** `storage.ts` liest jetzt aus einem In-Memory-Cache, der
  beim App-Start asynchron aus der SQLite-DB geladen wird. Schreibzugriffe
  erfolgen als fire-and-forget über Tauri-Commands. Fallback auf localStorage
  im Browser. Einmalige Migration localStorage → SQLite beim ersten Start.
- **„Meine Klassen"-View:** Neue `KlassenView` in der Sidebar — zeigt
  Klassenliste mit Abgabenzahl, Aufgabenauswahl, Notenverteilung,
  Fehler-Heatmap (R/G/Z/A) und Abgaben-Tabelle. Liest direkt aus der
  NATASCHA-Datenbank (via Rust SQL-Commands, kein Python-Sidecar nötig).
- **DB-Pfad-Sektion in Einstellungen:** Zeigt den erkannten DB-Pfad an
  (`~/lehr-suite-bridge/lehr-suite.db` oder Auto-Erkennung von
  `apps/natascha/*.db`).
- **NATASCHA `natascha_db.py`:** `init_db()` aktiviert jetzt WAL-Modus und
  Foreign Keys. `save_analysis_to_db()` nutzt atomare Transaktionen statt
  einzelner Inserts. `get_db_path()` unterstützt `~/`-Pfade.
- **App-Start:** Loading-Spinner während DB-Hydratation, bevor die
  Oberfläche rendert. Templates werden jetzt über die DB gespeichert
  statt direkt in localStorage.

### Added — Phase 3c Bauplan (voller Port, freigegeben)
- `docs/phase3c-natascha-port-plan.md` — verbindlicher Bauplan: NATASCHA komplett
  nativ in die LUA-UX (Python-Core als headless Sidecar, alle ~15 Screens in
  React), inkrementell in Wellen 0–4. Erster Bau-Schritt = Welle 0 = Phase 2
  (gemeinsame DB). Verlinkt aus `AGENTS.md`.

### Added — Phase 3a: NATASCHA-Korrektur aus der App starten
- Sidebar-Eintrag **„Korrektur (NATASCHA)"** + neue `KorrekturView` mit Button
  „NATASCHA-Korrektur öffnen" (startet die TUI in einem Terminalfenster) und
  manuellem Fallback-Befehl.
- Tauri-Command `launch_natascha` (`src-tauri/src/commands/natascha.rs`),
  plattformspezifisch (Windows/macOS/Linux, je `#[cfg]`); findet `apps/natascha`
  automatisch relativ zur App.
- Einstellungen: `AppSettings.nataschaDir` + `pythonCommand` (Abschnitt „NATASCHA").
- Design-Doku `docs/phase3-correction-ui.md` (Wege A/B/C + Empfehlung).
- **Verifikation offen:** Terminal-Spawn nur auf Linux kompiliert; Windows-Pfad
  braucht echten Test (Fallback-Befehl in der View dokumentiert).

### Added
- **Phase-1-UX:** Auswahlliste „Aus NATASCHA-Korrektur" zeigt jetzt pro Export
  ein Badge „X Fehler · Y Kategorien" + Mini-Heatmap-Balken (farbcodiert R/G/Z/A)
  + Top-3-Kategorien. Rust-`BridgeExportMeta` um `gesamtFehler` + `heatmap`
  erweitert (`commands/bridge.rs`).
- **Inbox-Ordner konfigurierbar:** neues Feld `AppSettings.nataschaInboxDir`
  (Default leer = `~/lehr-suite-bridge/inbox`), Eingabe im Einstellungen-View
  (Abschnitt „NATASCHA-Brücke"). Step0 übergibt den Ordner an die Bridge-Commands.
- **Bessere Leer-/Fehlerzustände:** Leerzustand zeigt den tatsächlich gesuchten
  Pfad (neuer Command `resolve_bridge_inbox`) + Hinweis auf NATASCHA-Export-Button
  und die Einstellung; klarere Fehlermeldungen (z. B. „nur in Desktop-App").
- `docs/phase2-shared-db.md` — ausführbares Design für Phase 2 (gemeinsame
  SQLite). Kernentscheidung dokumentiert: `storage.ts` ist synchron, SQLite-
  über-Tauri ist async → Hydrate-Cache (Weg A), sync-API erhalten.

## 2026-06-08 — Phase 1: Datei-Brücke NATASCHA → LUA (MVP)

### Added
- **Neues Mono-Repo** `lehr-suite/` mit `apps/lua/` (Lehrunterlagen-Tool) und
  `apps/natascha/` (NATASCHA) als sauberer Snapshot ihrer eigenständigen Repos
  (keine Alt-Git-Historie). Original-Repos bleiben als Backup unangetastet.
- **Bridge-Vertrag** `bridge/schema.json` (JSON Schema, `schemaVersion: 1`):
  Heatmap (R/G/Z/A) + echte Fehlerbeispiele (`zitat`/`korrektur`) + Empfehlungen.
  Doku: `bridge/README.md`.
- **NATASCHA** `natascha_bridge.py`: `export_klassen_bridge()` schreibt pro
  Klasse/Aufgabe ein schema-konformes JSON in die Inbox (atomar). Mit CLI
  (`python natascha_bridge.py <klasse> <aufgabe>`).
- **NATASCHA-TUI**: Button „🎯 Für Übungs-Tool" im Heatmap-Tab
  (`natascha.py`, Handler `_export_bridge`). Config-Sektion `[bridge]` in
  `natascha_config.toml` (`inbox_dir`, Default `~/lehr-suite-bridge/inbox`).
- **LUA** `meta.fokusThemen` (+ in `AuftragSchema`) in
  `packages/schema/src/index.ts`. Prompt-Hinweis `fokusThemenHinweis` in
  `packages/llm/src/prompt.ts` (`buildMessages`).
- **LUA** Tauri-Commands `list_bridge_exports` / `read_bridge_export`
  (`src-tauri/src/commands/bridge.rs`, registriert in `main.rs`/`mod.rs`).
- **LUA** Step0-Einstieg „Aus NATASCHA-Korrektur" + Mapping-Helfer
  `apps/web/src/lib/nataschaBridge.ts` (Kategorie → Aufgabentypen, Vorbefüllung).
- **Tests**: `prompt.test.ts` (fokusThemen-Hinweis), `nataschaBridge.test.ts`
  (Parse + Mapping).

### Verified
- `pnpm build`, `pnpm -r typecheck`, `pnpm -r test` — grün.
- `cargo check` (Tauri-Backend) — sauber.
- NATASCHA seed (`seed_testdaten.py`) → Export → `jsonschema.validate` — PASS.

### Noch offen
- Phase 2 (gemeinsame SQLite) und Phase 3 (Unified Tauri-Frontend) — geplant,
  nicht gebaut. Siehe `AGENTS.md` → Roadmap und `docs/phase2-shared-db.md`.

### 2026-06-08 — Live-GUI-Test bestanden
- `pnpm tauri:dev` baut & läuft (Tauri-Backend inkl. `commands/bridge.rs`
  kompiliert in ~1m13s); NATASCHA-Sektion in Step0 sichtbar und funktional.
