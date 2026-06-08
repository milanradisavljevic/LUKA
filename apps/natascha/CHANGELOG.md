# CHANGELOG

## [0.7.9] – 2026-05-30 (aktuell)

### Bugfixes & UX

- **Fix 1 (KRITISCH):** `ErwartungshorizontGeneratorScreen` crashte mit
  `InvalidSelectValueError`, wenn der konfigurierte Provider (z. B. `mistral`, `qwen`) nicht
  in der lokalen `_PROVIDERS`-Liste des Screens stand. Behoben durch: (a) Liste auf alle 7
  Provider erweitert (identisch mit `SettingsScreen`), (b) neue Hilfsfunktion
  `_safe_select_value(value, options, default)` eingeführt, die jeden Config-Wert gegen die
  verfügbaren Optionen prüft und sauber auf den Fallback fällt. 5 neue Tests grün.

- **Fix 2 – Button-Konsistenz:** "Schließen"-Buttons in `SchuelerVerwaltungScreen` und
  `SchuelerDetailScreen` jetzt einheitlich `variant="error"` (rot). "🗑 Löschen" im
  `SchuelerVerwaltungScreen` räumlich abgesetzt (Links-positioniert mit größerem Abstand via
  `.btn-destructive`), damit Löschen und Schließen nicht verwechselt werden können.

- **Fix 3 – Layout-Clipping:** Buttons am unteren Rand waren in `SchuelerDetailScreen` und
  `KlassenFeedbackScreen` abgeschnitten, weil alles in einem `VerticalScroll` steckte.
  Behoben durch strukturelle Trennung: äußerer `Container` mit fixer Höhe, innerer
  `VerticalScroll` (`.stats-scroll`, `height: 1fr`) für Body-Inhalt, Aktionsleisten fest
  außen. CSS: `.stats-container` von `height: auto; max-height: 88%` auf `height: 88%` mit
  `layout: vertical` umgestellt.

- **Fix 4 – HelpScreen:** F1 und ? öffnen den Hilfe-Dialog (Bindings bereits korrekt).
  Neuer Button **"📖 Anleitung öffnen"** öffnet `docs/ANLEITUNG.md` im System-Standard-
  programm (`nc.open_file`); feundliche Meldung, wenn Datei fehlt.

- **KNOWN_ISSUES:** Neuer Eintrag — `docs/ANLEITUNG.md` inhaltlich veraltet (nennt noch
  die alten drei Footer-Buttons). Inhalt muss manuell überarbeitet werden.

## [0.7.8] – 2026-05-30

### Features – Klassenansicht in Tabs zusammengeführt

- **Footer:** Drei separate Buttons (🔥 Heatmap, 📊 Feedback, 📈 Statistik) durch einen
  einzigen Button **"👥 Klasse"** ersetzt. Key-Binding `Shift+F` öffnet dieselbe Ansicht.
  Veraltete Bindings `t` (Statistik) und `Shift+H` (Heatmap) entfernt.
- **`KlassenFeedbackScreen` jetzt Tab-basiert:** Drei Reiter über `TabbedContent`/`TabPane`:
  - **Feedback** (Default): regelbasiertes Klassen-Feedback, KI-Briefing, Kalibrierung.
  - **Heatmap**: Fehler-Heatmap aus der DB (lazy geladen beim ersten Öffnen).
  - **Statistik**: DB-basierte Notenverteilung, Kriterien-Ø und Lernfortschritt über
    Aufgaben (lazy geladen); DOCX-Export über `gf.build_statistics_document()`.
- **DB-Statistik-Funktion `get_klassen_statistik()`** (`natascha_db.py`): Aggregiert
  Notenverteilung, Kriterien-Durchschnitte und Aufgaben-Verlauf aus der DB; liefert
  dasselbe Format wie ehemals `compute_statistics()` + `compute_class_progress()`, jetzt
  ohne Abhängigkeit von geladenen Datei-Analysen.
- **Klassen-Hinzufügte Tests (4):** `test_get_klassen_statistik_leer`,
  `test_get_klassen_statistik_notenverteilung`, `test_get_klassen_statistik_kriterien`,
  `test_get_klassen_statistik_progress` → 109 Tests, alle grün.
- **`StatisticsScreen` und `FehlerHeatmapScreen`** als eigenständige Modal-Screens entfernt
  (Inhalt in Tabs von `KlassenFeedbackScreen` integriert).
- **HelpScreen** aktualisiert: Erklärt die zwei Einstiegspunkte "👤 Schüler" und "👥 Klasse"
  mit den drei Reitern in einfacher Sprache.

## [0.7.7] – 2026-05-30

### Features – Klassen-Briefing (LLM-gestützt)
- **Regelbasierte Aggregation klassenweit:** Vier neue DB-Funktionen:
  - `get_klassen_k1_k3()` — K1/K3-Durchschnitte über alle Abgaben einer Klasse (via
    `_normalisiere_kriterien`, reuse, nicht dupliziert).
  - `get_notenverteilung()` — Notenverteilung mit Lehrer-Feedback-Fallback.
  - `get_klassen_kalibrierung()` — App-Ø vs. Lehrer-Ø mit Tendenz ("app strenger/milder/
    deckungsgleich") und Paarzählung.
  - `get_klassen_trend()` — Noten-Trend chronologisch über Aufgaben, mit Lehrer-Ø.
- **KRITERIUM_KEY_VARIANTS erweitert:** `analyse`/`interpretation` → `inhalt`,
  `einleitung_aufbau` → `textstruktur` (konsistent für Längsschnitt + Klassenansicht).
- **LLM-Prompt `build_klassen_briefing_prompt()`:** Datenminimiert, keine Namen, keine
  Texte, keine Beispielzitate (DSGVO). Präzise Instruktionen: K1/K3-Spreizung nur bei
  ≥0.5 Stufen Abstand; Kalibrierung bei <5 Paaren als "Momentaufnahme" behandeln;
  Anti-Floskel-Regeln; Du-Anrede an die Kollegin. Output-JSON: `kurzbild`,
  `schwerpunkte[].befund/empfehlung`, `unterrichtsempfehlungen[].stundenidee/material/
  zielgruppe`, `matura_fokus`.
- **DB-Tabelle `klassen_briefing` + CRUD:** Analog `schueler_profil` — historisch,
  append-only, mit `basis_anzahl_abgaben`, `basis_anzahl_fehler`, `modell`.
- **UI `KlassenFeedbackScreen` erweitert:**
  - Regelbasierte Sicht oben: K1/K3-Block, Notenverteilung, Kalibrierung, Trend über
    Aufgaben (immer sichtbar).
  - Button "🤖 Klassen-Briefing" (ersetzt alten Freitext-LLM-Button) — nur auf Klick,
    `@work(thread=True)`, JSON-Extraktion, Auto-Save nach Erstellung.
  - Button "📂 Briefing laden" — lädt jüngstes gespeichertes Briefing mit
    Veraltungshinweis (Basis vs. aktuelle Abgaben).
- **Footer-Button "📈 Statistik":** `StatisticsScreen` jetzt über sichtbaren Button
  erreichbar (vorher nur versteckte Taste `t`).
- **`seed_testdaten.py` erweitert:** 3 Schüler (Mona, Max, Mia) mit unterschiedlichen
  Profilen (aufsteigend, stabil, absteigend), idempotent.
- **Tests:** 8 neue DB-Tests + 4 DSGVO/Prompt-Tests + 104 Tests gesamt, alle grün.

## [0.7.6] – 2026-05-30

### Features – Schüler-Profil (LLM-gestützt)
Vervollständigung des dreischichtigen Längsschnitt-Systems:
- **Schicht 3 (Prompt + UI):** `build_schueler_profil_prompt()` mit verfeinertem
  Instruktionstext: pädagogisch dichtere Rollenbeschreibung, Daten-Leselogik
  (Ausreißer vs. Tendenz, Stagnation hoch/niedrig, K1/K3-Spreizung, App-vs-Lehrer-
  Differenzen, Fehlermuster), neue JSON-Struktur (`kurzbild`, `staerken`,
  `foerderbereiche[].befund/uebung`, `maturabezug`).
- **Schicht 2 (UI):** `SchuelerDetailScreen` bekommt Button „KI-Profil erstellen" —
  NUR auf Klick einen LLM-Call mit `@work(thread=True)`, Ergebnis wird als formatierter
  Text im Screen angezeigt. Defensives Error-Handling (API-Fehler, JSON-Exception).
- **Hilfsskript:** `seed_testdaten.py` — eigenständiges Skript, das einen synthetischen
  Schüler („Testschueler Mona", Klasse „TEST-7a") mit 4 aufsteigenden Arbeiten in die DB
  schreibt. Idempotent (Hash-basiert), mit Lehrer-Feedback bei 2 Arbeiten.

## [0.7.5] – 2026-05-30

### Features – Schüler-Längsschnitt (Lernverlauf)
Erste Stufe eines dreischichtigen Systems zur Lernverlaufs-Analyse pro Schüler:
- **Schicht 1 (Aggregation, regelbasiert):** `natascha_db.get_schueler_laengsschnitt(db_path,
  schueler_id)` aggregiert über `abgabe`, `kriterium_historie`, `fehler_historie` und
  `lehrer_feedback`: Notenverlauf (App **und** Lehrer-Note), die vier SRDP-Hauptkriterien +
  K1/K3-Gruppierung, Trend (erste→letzte Abgabe), Fehlerschwerpunkte und App-vs-Lehrer-
  Kalibrierung. Trendrichtung ist an die **Verbesserung** gekoppelt (Note sinkt = „steigt").
- **Schicht 2 (UI):** `SchuelerDetailScreen` — über „📈 Verlauf" in der Schüler-Verwaltung
  geöffnet; textbasierte Anzeige mit ↑/↓/→-Pfeilen (↑ = Verbesserung), keine LLM-Calls.
- **Schicht 3 (nur Entwurf):** `natascha_core.build_schueler_profil_prompt(laengsschnitt)`
  baut einen **datenminimierten** LLM-Prompt (DSGVO: niemals Name/Klasse/Texte — liest nie
  `laengsschnitt["schueler"]`). Kein API-Call, keine UI-Verdrahtung; DSGVO-Regressionstest.
- **Refactor:** `KRITERIUM_KEY_VARIANTS` als gemeinsame Konstante in `natascha_core`
  (verhindert Duplizierung der Kriteriumsnamen-Varianten zwischen `berechne_note_srdp` und
  der Längsschnitt-Aggregation).
- Tests: `tests/test_laengsschnitt.py` (Trend-Invertierung, Kalibrierung, n=1, fehlende
  Kriterien, englische Kriteriumsnamen, Fehlerschwerpunkte, DSGVO-Prompt).

## [0.7.4] – 2026-05-29

### Features
- **Lehrer-Notenerfassung:** Neue Tabelle `lehrer_feedback` in SQLite + UI-Block im mittleren Panel
  - `Collapsible` "Echte Note eintragen" mit `RadioSet` (1–5) + `TextArea` für Kommentar
  - `upsert_lehrer_feedback()` speichert `note_final`, `note_app_snapshot` (App-Note zum Zeitpunkt der Bewertung) und `lehrer_kommentar`
  - Status-Marker `✓` in der Dateiliste zeigt an, wenn bereits eine Note eingetragen wurde
  - `abgabe_id` wird nach erfolgreicher Analyse in `data["_abgabe_id"]` gespeichert und durchgereicht
  - Beim Öffnen einer bereits bewerteten Datei: Note + Kommentar werden vorbefüllt
- **DB-CRUD:** `get_lehrer_feedback()`, `get_lehrer_feedback_by_hash()`, `has_lehrer_feedback_for_file()`

## [0.7.3] – 2026-05-28

### Fixes
- **Footer-Taskleiste:** Buttons height:3 statt height:5; `#status-bar` entfernt (redundant mit `#file-counter` im Datei-Panel)
- **Logo-Truncation:** `render_brand_art()` gibt immer ASCII-Logo zurück (PNG ist 96×95px Icon); LOGO_FULL-Schwellwert 100→120 Spalten
- **DeepSeek-Modell:** `deepseek-v4-flash` existiert nicht → `deepseek-chat` (V3-Stable)
- **JSON-Extraktion:** Greedy-Regex `\{.*\}` durch Bracket-Counting ersetzt (verhindert Trunkierung bei Text mit `{}` nach dem JSON)
- **Klassen/Aufgaben-Wechsel:** `_switching_context`-Guard + try/except in `on_select_changed()` verhindert App-Crash
- **DeepSeek JSON-Modus:** `extra_body={"response_format": {"type": "json_object"}}` erzwingt reines JSON

### Features
- `#file-counter` Static im Datei-Panel zeigt `analyzed/total ████░ 60% ☑ 3` kompakt
- `action_open_folder()`: öffnet Input-Verzeichnis im Betriebssystem-Dateimanager

## [0.7.2] – 2026-05-26

### Features
- **Interpunktions-Korrekturen:** `is_punctuation_only_fix()` – rendert nur das geänderte Zeichen statt rotem Durchstrich des ganzen Satzes
- **Metadaten-Override:** klasse/fach/schulstufe/textsorte/datei nach LLM-Aufruf aus Config überschreiben (verhindert LLM-Halluzination)
- **Schülernamen-Extraktion:** `extract_schueler_name()` prüft DOCX-Header + erste 3 Absätze; NAME_BLOCKLIST verhindert False Positives
- **Modell-Anzeige:** `modell` + `provider` aus JSON im Detail-Panel sichtbar

## [0.7.0] – 2026-04-26

### Breaking Changes
- `natascha.py` ersetzt `natascha_wizard.py` als primären Einstiegspunkt
- Zuordnung: Freitext-Inputs → Select-Dropdowns (Fach, Schulstufe, Textsorte, Rubrik)

### Features
- **Textual Dashboard:** 3-Spalten-Layout (Dateien | Zuordnung | Vorschau)
- **Async-Worker:** `@work(thread=True)` für LLM-Analyse; Progress-Dialog mit Cancel
- **File Watcher:** Background-Worker pollt `input/` alle 10 s
- **Cancel-Mechanismus:** `threading.Event` auf App-Ebene (thread-sicher)
- **Modale Dialoge:** Review, Settings, Hilfe, EditAssignment, Statistik, RubrikEditor
- **Batch-Analyse:** Mehrere Dateien markieren (Space) + Shift+A
- **Einstellungen:** Default-Fach, Schulstufe, Provider/Modell im Dashboard änderbar

---

## 2026-04-13 – v0.6.0 (LLM-Analyse-Pipeline mit Retry-Logik)

### LLM-Pipeline (Neu)
- **`run_llm_analysis()`** in `natascha_core.py`: Vollstaendige Analyse-Pipeline
  - Prompt-Building → API-Aufruf → JSON-Extraktion → Schema-Validierung
  - **Automatische Retry-Logik** (bis zu 3 Versuche) bei:
    - Ungueltigem JSON aus der LLM-Antwort
    - Schema-Verletzungen im JSON-Response
  - Retry-Prompt enthaelt Fehlerdetails + Original-Aufgabe als Kontext
  - Exponentieller Backoff (2s, 4s, 6s) zwischen Retries
  - `cancel_event`-Support fuer sofortigen Abbruch
  - Return-Typ: `tuple[data | None, list[errors]]` – explizite Fehlerkommunikation

### Dashboard
- **`_run_analysis()`** refactored: Nutzt jetzt `nc.run_llm_analysis()` statt manueller Einzelschritte
  - Deutlich weniger Code, bessere Fehlerbehandlung
  - Alle Fehler (JSON, Schema, API) werden ins Fehlerlog geschrieben
  - Status-Text "Analyse laeuft..." statt nur "Sende an API..."

### Tests
- **`tests/test_llm_pipeline.py`**: Neue Testsuite fuer die LLM-Pipeline
  - `extract_json_from_llm`: Plain JSON, Markdown-fenced, Surrounding Text, Error Cases
  - `validate_against_schema`: Valid-Fixture, Missing Fields, Invalid Note Range, No Schema
  - `_build_retry_prompt`: Error Message, Attempt Number, Truncation
  - `run_llm_analysis`: Success on first try, Retry on invalid JSON, Fail after max retries, API error (no retry), Cancel event, Schema violation then success

### Bugfix
- VERSION auf 0.6.0 aktualisiert

## 2026-04-13 – v0.5.0 (UX-Verbesserungen + DOCX-Redesign)

### TUI / Dashboard
- **EditAssignment**: Text-Inputs durch `Select`-Dropdowns ersetzt (Fach, Schulstufe, Textsorte, Rubrik)
  - Textsorte-Optionen wechseln automatisch je nach Fach (Deutsch / Englisch)
  - Rubrik wird auf Basis von Fach+Schulstufe vorausgewählt (inkl. B1/B2 für Englisch Oberstufe)
- **File-Watcher**: Neuer Background-Worker pollt `input/` alle 10s; neue `.docx`-Dateien werden ohne Neustart erkannt
- **Cancel**: `threading.Event` auf App-Ebene ersetzt fragilen Screen-Flag-Ansatz
- **Einstellungen**: Default-Fach, Schulstufe und Modell jetzt direkt im Dashboard bearbeitbar (kein Editor, kein Neustart)
- **Logo**: Acronym aktualisiert → "Normbasierte Analyse von Texten / Automatisierte Schularbeits-Correction mit Hilfe-Agents"

### DOCX-Generator
- **Zusammenfassungstabelle**: Kriterien-Übersicht mit blauem Header und farbiger Notenzeile am Dokumentanfang
- **Farbschema**: Stärken grün, Schwächen rot, Verbesserungsvorschläge blau (benannte Konstanten `C_STRENGTH`, `C_WEAKNESS`, `C_SUGGESTION`)
- **Notenfarbe**: Note ≥ 5 rot, alle anderen in der Primärfarbe (vorher: immer orange)
- **Header-Block**: Metadaten-Tabelle (Datei, Schüler/in, Fach, Datum) mit optionalem Logo und Lehrerkennzeichnung
- **Seitenformat**: A4 explizit gesetzt (21×29.7cm), Ränder 2.5cm, Fußzeile mit Datum
- `build_feedback_document()` nimmt jetzt optionales `config`-Dict für Lehrername, Schule, Logo-Pfad

### Bugfix
- `tests/test_tui.py`: Import von `natascha_tui` auf `natascha_core` korrigiert (Modul wurde in v0.4.0 umbenannt)

## 2026-04-11 – v0.4.0 (Textual Dashboard)

- `natascha.py` Neu: Textual-basiertes 3-Spalten-Dashboard (Dateien / Zuordnung / Vorschau)
- `natascha_core.py` Logik-Funktionen aus dem Wizard extrahiert (gemeinsamer Unterbau)
- `natascha_wizard.py` Bisheriger rich+InquirerPy-Wizard als Fallback umbenannt
- `natascha.tcss` Eigenstaendige CSS-Datei fuer das Dashboard
- Asynchrone API-Analyse mit `@work(thread=True)` und Fortschrittsdialog
- Modale Dialoge: Review, Einstellungen, Hilfe, Zuordnung bearbeiten
- Tastatursteuerung: Navigation, Batch-Markierung, Suche, Sortierung
- Existierende Analysen werden beim Start automatisch erkannt
- CLI: `python natascha.py` (Dashboard), `python natascha_wizard.py` (Wizard)

## 2026-04-10

- neue SRDP-orientierte Rubrics fuer Deutsch Oberstufe, Deutsch Unterstufe und Englisch A2/B1/B2 angelegt
- bisherige Rubrics aus `rubrics/` nach `rubrics/legacy/` verschoben
- `MASTER_PROMPT.md` auf das neue Rubric-System vorbereitet
- `generate_feedback.py` von hartcodierten Einzelfaellen auf einen JSON-basierten Batch-Generator umgestellt
- `feedback_schema.json` sowie pytest-Fixtures und Tests fuer den DOCX-Generator ergaenzt
