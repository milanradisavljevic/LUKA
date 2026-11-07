# NATASCHA – Agent-Dokumentation

> **Für AI-Coding-Agents:** Diese Datei beschreibt das gesamte Projekt aus Sicht eines Entwicklers, der den Code noch nicht kennt. Alle Informationen sind aus dem tatsächlichen Code abgeleitet — keine Annahmen.

---

## 1. Projektübersicht

**NATASCHA** (Normbasierte Analyse von Textproduktionen – Automatisierte Schularbeits-Correction als Hilfe-Agent) ist ein Python-TUI-Dashboard für Lehrkräfte. Es liest Schüler-Abgaben (DOCX, PDF, Bilder), schickt sie an LLM-APIs zur Analyse, validiert das JSON-Ergebnis gegen ein Schema und erzeugt daraus formatierte DOCX-Feedback-Dokumente.

- **Version:** 0.7.10
- **Python:** >= 3.11
- **Lizenz:** MIT
- **Primärsprache:** Deutsch (Code-Kommentare, UI, Dokumentation, Rubriken)

---

## 2. Technologie-Stack

| Komponente | Paket / Tool | Zweck |
|------------|-------------|-------|
| TUI-Framework | `textual>=0.47` | Dashboard-UI (3-Spalten-Layout, modale Dialoge) |
| DOCX-Verarbeitung | `python-docx>=1.1` | Lesen von Abgaben, Schreiben von Feedback-DOCX |
| LLM-APIs | `anthropic>=0.30`, `openai>=1.30` | API-Clients für Claude, OpenAI, DeepSeek, Qwen, Mistral, Kimi |
| JSON-Validierung | `jsonschema>=4.20` | Schema-Validierung der LLM-Antworten |
| TOML-Bearbeitung | `tomlkit>=0.13` | Editierbares TOML (Kommentare bleiben erhalten) |
| Rich Text | `rich>=13` | Konsolen-Output, Formatierung |
| Wizard-CLI | `InquirerPy>=0.3` | Legacy-sequentieller Workflow |
| Bildverarbeitung | `pillow>=10` | Bild/PDF-Input für Vision-Prompts |
| Linting | `ruff>=0.4` | Code-Style (Zeilenlänge 100, py311) |
| Tests | `pytest>=7` | Test-Framework |

---

## 3. Projektstruktur

```
Natascha3/
├── natascha.py              # Haupt-Einstieg: Textual-Dashboard (~3200 Zeilen)
├── natascha_core.py         # Gemeinsame Logik: Config, LLM-Pipeline, Benotung (~2400 Zeilen)
├── bewertungsprofile.py      # Versionierte Englisch-SRDP-Profile, lokale Punkte-/Notenauswertung
├── natascha_db.py           # SQLite-Persistenz: Schueler, Abgaben, Historie, Heatmap (~700 Zeilen)
├── generate_feedback.py     # DOCX-Generator aus JSON (~2000 Zeilen)
├── natascha_wizard.py       # Legacy-CLI-Wizard (InquirerPy) (~1244 Zeilen)
├── natascha.tcss            # Textual-CSS für das Dashboard
├── natascha_config.toml     # Klassen, Aufgaben, API-Provider, Pfade
├── feedback_schema.json     # JSON-Schema für LLM-Output-Validierung
├── pyproject.toml           # Projekt-Metadaten, Dependencies, Tool-Konfiguration
├── requirements_tui.txt     # Minimale Requirements für TUI-Modus
├── .env                     # API-Keys (gitignored!)
├── natascha.env.example     # Template für .env
│
├── input/                   # Schüler-Abgaben (gitignored)
├── output/                  # Feedback-DOCX + JSON-Daten (gitignored)
│   └── feedback_data/       # Zwischengespeicherte Analyse-JSONs
├── rubrics/                 # Markdown-Bewertungsraster (n + erwartungshorizont_*.md)
├── tests/                   # Testsuite
│   ├── test_feedback.py
│   ├── test_llm_pipeline.py
│   ├── test_tui.py
│   └── fixtures/            # JSON-Fixtures für Tests
├── docs/                    # Projekt-Dokumentation, Prompts, Aufgabenbeschreibungen
└── prompts/                 # LLM-Prompt-Templates (Markdown)
```

---

## 4. Build- und Test-Kommandos

```bash
# Abhängigkeiten installieren
pip install -r requirements_tui.txt
# oder (vollständig):
pip install -e .

# Tests ausführen
python3 -m pytest tests/

# Linting
ruff check .
ruff check . --fix

# Anwendung starten (TUI-Dashboard – empfohlen)
python natascha.py
# oder als installiertes Kommando:
natascha

# Legacy-Wizard (Fallback)
python natascha_wizard.py
# oder:
natascha-wizard
```

> **Hinweis (WSL):** Der `.venv`-Pfad wurde auf einem anderen Rechner angelegt und kann unter WSL ungültig sein. Falls nötig, `python3` (System-Python) statt `.venv/bin/python` verwenden.

---

## 5. Code-Style-Richtlinien

- **Zeilenlänge:** 100 Zeichen (`tool.ruff.line-length = 100`)
- **Python-Version:** 3.11+ (`target-version = "py311"`)
- **Linter:** ruff mit `select = ["E", "F", "W", "I"]`
- **Sprache:** Alle Code-Kommentare, Docstrings und UI-Texte sind auf Deutsch.
- **Umlaute:** In Markdown-Dateien und Rubriken werden Umlaute teilweise als `ae/oe/ue` geschrieben (bestehende Konsistenz beibehalten).
- **Imports:** `from __future__ import annotations` am Beginn jeder Datei.
- **Typisierung:** Typ-Hints verwenden (`dict[str, Any]`, `Path`, etc.).

---

## 6. Test-Anleitungen

**Test-Dateien:**

| Datei | Testgegenstand |
|-------|---------------|
| `tests/test_feedback.py` | DOCX-Generierung: JSON parsen, Sektionen prüfen, Datei-Erzeugung, Skip-Logik |
| `tests/test_llm_pipeline.py` | JSON-Extraktion aus LLM-Rohantworten, Schema-Validierung, Retry-Prompts, Provider-Dispatch |
| `tests/test_tui.py` | Rubrik-Mapping, Rubrik-Optionen, Agent-Sync, Fehler-Humanisierung |

**Fixtures:** `tests/fixtures/` enthält JSON-Dateien mit realistischen Analyse-Ergebnissen.

**Wichtig:** Tests verwenden `sys.path.insert(0, str(Path(__file__).resolve().parent.parent))`, um die Root-Module zu importieren.

---

## 7. Sicherheits-Hinweise

- **API-Keys:** Nur via `os.environ.get()` lesen — niemals hardcoden.
- **`.env`-Datei:** Ist in `.gitignore` eingetragen. Es gibt ein Template `natascha.env.example`.
- **Schülerdaten:** `input/`, `output/`, `abgegebene Arbeiten/` sind gitignored.
- **Keine Secrets in Logs:** API-Keys werden nicht in Fehlerlogs geschrieben.

---

## 8. Architektur-Überblick

### Datenfluss

```
input/<klasse>/<aufgabe>/*.docx
        ↓  count_words(), read_docx_text()
natascha.py._run_analysis()
        ↓  nc.run_llm_analysis()
        ↓  build_analysis_prompt() / build_vision_prompt()
        ↓  run_llm_api() → Provider-API
        ↓  extract_json_from_llm() (bracket-counting)
        ↓  validate_against_schema() + retries (max 3)
        ↓  berechne_note_srdp() / berechne_note_unterstufe()
output/feedback_data/<datei>_analysis.json
        ↓  generate_feedback.build_feedback_document()
output/<klasse>/<aufgabe>/<datei>_Feedback.docx
```

### UI-Struktur (natascha.py)

```
NataschaApp (App)
├── NataschaHeader           – Logo + Titelzeile
├── #main-container (Horizontal)
│   ├── #files-panel         – Klassen-Select, Aufgaben-Select, Dateiliste
│   ├── #middle-panel        – Zuordnung (Fach/Stufe/Textsorte/Rubrik)
│   └── #preview-panel       – 4 Tabs: Text | Bewertung | Rubrik | Output
└── NataschaFooter           – 9 Buttons (dock:bottom, height:3)
                               Analysieren | DOCX | Zuordnung | Einstellungen |
                               Hilfe | Schüler | Klasse | Ordner | Beenden
```

**Modale Screens:** HelpScreen, ConfirmScreen, SettingsScreen, ReviewScreen, EditAssignmentScreen, RubrikEditorScreen, AddAufgabeScreen, AddClassScreen, AttachRubricScreen, ErwartungshorizontGeneratorScreen, SchuelerVerwaltungScreen, SchuelerDetailScreen, KlassenFeedbackScreen (3 Tabs: Feedback/Heatmap/Statistik), RetroImportScreen

### Kernfunktionen (natascha_core.py)

| Funktion | Zweck |
|----------|-------|
| `run_llm_analysis()` | Haupt-Pipeline: Prompt → API → JSON → Schema → Retry |
| `extract_json_from_llm()` | Bracket-Counting Extraktor (kein greedy regex) |
| `validate_against_schema()` | jsonschema-Validierung |
| `build_analysis_prompt()` | Text-Analyse-Prompt mit Rubrik-Kontext |
| `build_vision_prompt()` | Bild/PDF-Analyse-Prompt |
| `berechne_note_srdp()` | SRDP-Benotung inkl. Sonderregel (nutzt `KRITERIUM_KEY_VARIANTS`) |
| `berechne_note_unterstufe()` | Gewichtete Unterstufe-Benotung |
| `run_llm_api()` | Provider-Dispatch (anthropic, openai, deepseek, qwen, mistral, kimi, ollama) |
| `build_schueler_profil_prompt()` | **Entwurf** (Schicht 3): datenminimierter LLM-Prompt aus dem Längsschnitt — kein API-Call, keine UI; DSGVO: enthält nie Name/Klasse/Texte |

### Schüler-Längsschnitt (dreischichtig)

- **Schicht 1 – `natascha_db.get_schueler_laengsschnitt(db_path, schueler_id)`:** rein
  regelbasierte Aggregation des Lernverlaufs (Notenverlauf App+Lehrer, vier Hauptkriterien
  + K1/K3, Trend, Fehlerschwerpunkte, Kalibrierung). Trend an Verbesserung gekoppelt
  (Note sinkt = „steigt").
- **Schicht 2 – `SchuelerDetailScreen` (natascha.py):** Anzeige des Längsschnitts (Button
  „📈 Verlauf" in der Schüler-Verwaltung). Keine LLM-Calls.
- **Schicht 3 – `build_schueler_profil_prompt()` (natascha_core.py):** NUR Prompt-Entwurf
  (s. o.), nicht verdrahtet.

`KRITERIUM_KEY_VARIANTS` (natascha_core) ist die gemeinsame Quelle der Kriteriumsnamen-
Varianten für `berechne_note_srdp()` und die Längsschnitt-Aggregation.

---

## 9. Konfiguration

### `natascha_config.toml`

Zentrale Konfigurationsdatei für:

- `[api]` – Provider und Modell
- `[paths]` – input, output, rubrics, feedback_data, schema, fehlerlog
- `[defaults]` – Default-Fach, Default-Schulstufe
- `[rubric_mapping]` – Mapping `"Fach+Schulstufe" → rubrik-datei.md`
- `[classes.<klasse>]` – Klassen mit input/output-Pfaden und aktiver Aufgabe
- `[classes.<klasse>.aufgaben.<key>]` – Einzelne Aufgaben mit Fach, Stufe, Textsorte, Rubrik
- `[docx]` – Lehrername, Schulname, Logo-Pfad
- `[erwartungshorizont]` – Separates LLM für EH-Generierung

### Umgebungsvariablen (`.env`)

```bash
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
DEEPSEEK_API_KEY=...
KIMI_API_KEY=...
QWEN_API_KEY=...
DASHSCOPE_API_KEY=...   # alternativer Name für QWEN_API_KEY
MISTRAL_API_KEY=...      # gepinntes Modell des Qualitätsgates
```

---

## 10. LLM-Provider

| Provider | API-Key-Env-Var | Besonderheit |
|----------|----------------|-------------|
| anthropic | `ANTHROPIC_API_KEY` | Standard; Vision (PDF+Bild); JSON forced |
| deepseek | `DEEPSEEK_API_KEY` | `deepseek-chat` (V3); `response_format: json_object` |
| qwen | `QWEN_API_KEY` oder `DASHSCOPE_API_KEY` | DashScope-Endpoint; `enable_thinking: false` |
| mistral | `MISTRAL_API_KEY` | **nur Text, kein Vision** (`natascha_core.py`, Vision-Pfad lehnt ab). `mistral-medium-3-5` (256k/32k) ist das **gepinnte Modell des Qualitätsgates** — `benchmarks/evaluiere.py` akzeptiert keinen anderen Provider. Achtung: der Anbieter beantwortet HTTP 429 `code: 1300`, wenn das Konto kein Inferenzkontingent hat; ein 401 bedeutet dagegen einen ungültigen Schlüssel |
| openai | `OPENAI_API_KEY` | OpenAI-kompatibel |
| kimi | `KIMI_API_KEY` | moonshot-v1 |
| ollama | — | Lokal; kein JSON-Modus; nur Bracket-Counting-Fallback |

---

## 11. Rubriken-Verzeichnis (`rubrics/`)

Markdown-Dateien. Jede Rubrik enthält:
- `## JSON-Kriterien` – exakte Schlüssel für die Bewertung (in Backticks)
- `## Checkliste Kriterien` – menschenlesbare Checkliste
- `## Stufenbeschreibungen (1–5)` – je Kriterium
- `## Gewichtung` – Prozentwerte je Kriterium
- `## SRDP-Detail` (nur Oberstufe) – K1/K3 Sub-Kriterien

**Unterstufe:** `*_unterstufe.md`
**Oberstufe:** `srdp_deutsch_oberstufe.md`, `kommentar.md`, `textinterpretation.md`, etc.

### Metadaten-Header

Optionaler HTML-Kommentar am Dateianfang. Ohne ihn bleibt eine Rubrik
vollständig nutzbar, nur ohne Metadaten.

```
<!-- luka-rubrik
titel: Leseverständnis
fach: deutsch
schulstufe: oberstufe
textsorte: leseverstaendnis
aufgabenart: verstaendnis
k1: sachverstaendnis, detailverstaendnis, schlussfolgern
k3: ausdruck, sprachrichtigkeit
-->
```

| Feld | Wirkung |
|------|---------|
| `titel` | Anzeigename in LUA und im Korrekturdialog |
| `fach` | Filterung der Rubrikliste (L3) |
| `schulstufe` | Einordnung in der Fallback-Kette |
| `textsorte` | maschinenlesbar – **Umlaute ausschreiben** (`leseverstaendnis`), das Auswahlfeld zeigt die lesbare Form und normalisiert beim Vergleich |
| `aufgabenart` | `verstaendnis` schaltet die Erwartungshorizont-Anweisung auf Verständnisfragen statt Pro-/Contra-Argumente |
| `k1` / `k3` | eigene Kriterium-Zuordnung zu den SRDP-Kompetenzbereichen |

**Warum `k1`/`k3`?** Oberstufe/AT rechnet die Note aus vier festen
SRDP-Hauptkriterien. Ein Raster mit eigenen Kriterien fällt dort sonst auf die
Mittelstufe 3.0 zurück und ergibt konstant Note 3. Wer `k1`/`k3` setzt,
bestimmt die Aufteilung selbst. Die Deutsch-Gegenprüfung verwendet dann diese
eigenen Kriterien; die 15 SRDP-Schreibkriterien werden nicht zusätzlich erzwungen.

### Fallen beim Schreiben

- **Eigene Kriterien-Keys dürfen keinen Kanon-Teilstring enthalten.**
  `textstruktur_ausgangstext` enthält „textstruktur"; `aufbau_ausgangstext`
  ist richtig. Vorhandene Raster folgen dem bereits
  (`sprachfach_*.md` nutzt `textaufbau`).
- **In `## Gewichtung` Klartext schreiben, keine Backticks-Zeilen** — die
  Formate ohne Klammern sind sicher: `- Sachverstaendnis: 25 %`.
  Umlaute sind erlaubt und werden aufgelöst.
- **Summe = 100 %** je Rubrik mit Gewichtungsabschnitt.

### Prüfung

`natascha_rubrik_check.py` prüft alle mitgelieferten Raster;
`tests/test_leseverstaendnis.py` lässt die Prüfung über die ganze Sammlung
laufen und hält bekannte Bestandsbefunde namentlich fest. Nach jeder Änderung
an einer Rubrik:

```bash
python3 -m pytest tests/test_leseverstaendnis.py -q
```

---

## 12. Feedback-JSON-Schema (`feedback_schema.json`)

**Pflichtfelder:** `datei`, `textsorte`, `fach`, `schulstufe`, `rubrik`, `bewertung`, `fehler`

**Wichtig:** `fehler` ist ein Top-Level-Array mit Objekten `{zitat, korrektur, typ, erklaerung}` plus den optionalen post-hoc-Feldern `vertrauensstufe` (`hoch|mittel|niedrig`) und `korrektur_lokal_ambig` (boolean) — beide werden nach der LLM-Validierung ergänzt und sind im Schema zugelassen. `fehler_detail` innerhalb von `bewertung`-Kriterien ist **deprecated**.

---

## 13. Entwicklungskonventionen

- **Keine externen `.env`-Loader nötig:** `natascha_core.py` hat einen Fallback-Parser für `.env`, der `python-dotenv` nicht braucht.
- **TOML-Editierung:** Config-Änderungen im Dashboard verwenden `tomlkit`, um Kommentare zu erhalten.
- **Thread-Sicherheit:** LLM-Analyse läuft in `@work(thread=True)`-Workern; Abbruch via `threading.Event`.
- **File-Watcher:** Hintergrund-Worker pollt `input/` alle 10 Sekunden auf neue `.docx`-Dateien.
- **Cancel-Mechanismus:** `threading.Event` auf App-Ebene ist thread-sicher.
- **Retry-Logik:** Max. 3 Versuche bei ungültigem JSON oder Schema-Verletzung; exponentieller Backoff (2s, 4s, 6s).

---

## 14. Bekannte Einschränkungen

(siehe auch `KNOWN_ISSUES.md`)

- **SRDP-Raster fehlt im DOCX:** Noch nicht implementiert (v0.8 geplant).
- **Notenberechnung Randfall:** Stufe 3.5 → Note 2.5 (Rundungsverhalten ist heuristisch).
- **Bild-/PDF-Größe:** Kein Check vor API-Call; Dateien >10 MB können scheitern.
- **Ollama:** Kein `json_object`-Modus; nur für lokale Tests geeignet.

---

## 15. Wichtige Referenz-Dateien

| Datei | Inhalt |
|-------|--------|
| `ARCHITECTURE.md` | Detaillierte Architektur-Dokumentation (Datenfluss, UI-Struktur, Funktionen) |
| `CHANGELOG.md` | Versionshistorie mit Breaking Changes und Features |
| `KNOWN_ISSUES.md` | Dokumentierte Bugs, Workarounds, geplante Fixes |
| `docs/ANLEITUNG.md` | Endnutzer-Anleitung (Deutsch) |
| `docs/AGENT_PROMPTS.md` | Prompts für externe Coding-Agents (Claude, Codex, Qwen, GLM) |
| `docs/MASTER_PROMPT.md` | Gesamtlogik des Korrektur-Agents |

---

*Diese Datei wurde aus dem tatsächlichen Projektstand abgeleitet. Bei strukturellen Änderungen (neue Module, neue Dependencies, neue Konventionen) muss sie aktualisiert werden.*

## Englisch-SRDP ab 2026-10-22

`bewertungsprofile.py` besitzt die expliziten B1-/B2-Profil-IDs, Profilschemata (0–10), Veto-/Wortzahlregeln und die lokale Auswertung eines ausdrücklich bestätigten individuellen Notenschlüssels. Neue Kriterien werden als `profil@version::kriterium` gespeichert; keine Umrechnung alter Ergebnisse und keine Mischung in Statistikreihen. Der Notenschlüssel gelangt nicht in den Modellprompt. Unveränderte alte Standardraster werden hashgebunden aktualisiert, eigene Raster bleiben erhalten. Technische Tests ersetzen keine fachliche Profilabnahme. Die Legacy-Skala 1–5 bleibt für Deutsch und andere Bestandsraster bestehen.

Befund-Aggregationen verwenden nur `lehrkraft_aktion IN ('uebernommen', 'geaendert')`; die vollständige Prüfliste behält auch offene und verworfene Hinweise. Geänderte Hinweise verwenden die aktuelle `lehrkraft_korrektur`.


## Scan-Pruefsitzungen

`scan_review.py` verwaltet lokale, hashgebundene OCR-Pruefsitzungen unter output/ocr/reviews.
`run_llm_analysis(persist=False, scan_text=...)` erzeugt eine Vorschau ohne Abgabe-
oder Revisionsspeicherung; `persist_analysis_result` ist der gemeinsame Speicherpfad.
Die CLI-Erweiterung `analyze --scan-action prepare|commit` nutzt denselben Kontext.
`scan-review` liest Sitzungen oder setzt eine revisionsgebundene Lehrerentscheidung.
Offene Lesefragen bleiben aus Fehlerhistorie und numerischen Empfehlungen heraus.

## Korrekturqualität und Denkmodus ab 2026-11-02

Feedback-Dateinamen kommen zentral aus `feedback_filename.py`: bestätigter Name aus der Abgabezuordnung, sonst Quelldateiname, jeweils mit Abgabe-ID und bereinigten Dateinamenzeichen. Tauri übergibt standardmäßig `feedback-docx --output-dir`; ausdrücklich gesetzte `--output`-Pfade behalten Vorrang. Die bestätigte DB-Zuordnung wird beim Export auch als Schülername im Dokument verwendet. Das ändert keine Analyse oder Bewertung. Namen können im Korrekturauftrag über den bestehenden Schüler-INSERT angelegt und anschließend über ihre ID zugeordnet werden; Pseudonymisierung verwendet weiterhin die Klassenliste.

`model_reasoning.py` besitzt die modellbezogenen Denkoptionen und nativen API-Parameter.
Die App fragt dieselbe Tabelle mit `model-options` ab. `correction_quality.py` prüft
wortgetreue Anker, Änderungsdubletten und die KI-Gegenprüfung. Diese ersetzt keine
Lehrkraftentscheidung. Export und Freigabe sind getrennt; `pruefstatus` gehört auch
zum Revisionssnapshot. Neue Revisionen speichern Schülertext und SHA-256 in `basis_json`.


## Deutsch-Gegenprüfung ab 2026-11-03

`deutsch_review.py` v4 legt dem vorhandenen zweiten Aufruf einzeln zusammengesetzte Ergebniskontexte vor. `correction_quality.replacement_context` verwendet vollständige Originalabsätze (keine heuristischen Satzgrenzen) und eine text-/anker-/ersatzgebundene Prüfsumme. Die optionale `ersetzungspruefung` bestätigt Grammatik, Bereich und Bedeutung; bei geänderten oder neu gefundenen Ersetzungen muss der zurückgegebene Ergebniskontext exakt passen. Ohne ausdrückliche Bestätigung bleibt der Vorschlag Kommentar. `ki_pruefung.status=verworfen` bedeutet eine falsche Beanstandung, keine Lehrkraftentscheidung: im Analyse-JSON erhalten, im DOCX ohne explizite Übernahme ausgelassen. Alte Revisionen werden nicht nachträglich geprüft oder umgeschrieben. Es bleiben zwei Aufrufe.

`feedback_annotations.py` verankert sämtliche Word-Kommentare vor den Texteingriffen am unveränderten Original. Überlappende oder zu weit reichende Ersatztexte bleiben Kommentare. `deutsch_review.py` v3 akzeptiert kompakte Bestätigungen, S-IDs für Originalzeilen, einzeln geprüfte Randnotizen und eindeutig verankerte zusätzliche Befunde. Vergrößerte Ersetzungsbereiche müssen den ursprünglichen Befund enthalten. Alte Antwortformate bleiben lesbar. Aufrufbelege speichern Phase, Status, Dauer und verfügbare Abschluss-/Fehlergründe sowie Ausgabegrenzen, niemals Prompts oder Antworttexte.

`deutsch_review.py` erstellt den Rastervertrag und die gemeinsame, versionierte Bewertungsgrundlage. Jeder Deutsch-Lauf verwendet Analyse und rasterbezogene Gegenprüfung; 15 SRDP-Details nur bei passenden AT-Oberstufenrastern. Der zweite Aufruf prüft auch die Hauptkriterien und Befunde. Nur vollständige, belegte Änderungen gehen in die unveränderte Notenberechnung ein. Offene Fragen behalten einen ausdrücklich vorläufigen Vorschlag. `gegenpruefung`, Ursprungsbewertungen und die Vorläufigkeit bleiben im Analyse-JSON; Grundlagenversion und Hash im Revisionssnapshot. Fehlende Kriterien erzeugen keine stillen mittleren Werte. `deutsch_raster_seed.py` erlaubt nur hashgebundene Updates unveränderter Vorlagen. Referenzen/Selbstchecks tragen `verwendung:` und bleiben lesbar, sind aber keine Notenraster.

## Kriterienklärung und Exportansichten ab 2026-11-04

`deutsch_review.py` v5 prüft Belege und Detailkriterien einzeln. Zusätzliche ungültige Zitate verwerfen keine vorhandenen eindeutigen Belege. `bewertungspruefung` enthält Kriterienstatus, Belegdiagnosen, geprüfte Aussagen und gezielte Aufgaben. Tatsächlich offene benotungsrelevante Kriterien verhindern eine automatische Gesamtnote; es gibt keinen Rückfall auf andere Hauptkriterien. Referenzen auf verworfene Befunde und ungeklärte quellenabhängige Aussagen bleiben offen.

`review_resolution.py` verwendet dieselben bestehenden Notenfunktionen für explizite Lehrkraftentscheidungen. `review-save` speichert Entscheidungen, Befundaktionen und Freigabe atomar und revisionsgebunden. `lehrer_pruefung_json` ist additiv und getrennt von der unveränderten `analysis_json`; beide DB-Initialisierungen müssen diese Spalte ergänzen. Alte Revisionen werden nicht automatisch nachgeprüft.

`feedback-docx --ansicht schueler|lehrkraft` behält als CLI-Default die ausführliche Lehrkraftansicht. Die kurze Schüleransicht enthält höchstens drei Stärken und drei nächste Schritte, nur ausdrücklich übernommene Befunde und eine Note erst nach Freigabe. `source-text` liest eine Beilage ohne Modellaufruf; `analyze --grundlage-snapshot-file` verwendet eingefrorenen Rasterinhalt und Beilagentext aus der App. Es bleiben zwei reguläre Modellaufrufe.

`feedback_annotations.py` markiert reine Beistrichänderungen am unveränderten Original orange und unterstrichen, ohne Word-Kommentar. Andere Zeichen- und Wortänderungen behalten ihre Kommentare. Erläuterungen bleiben im Fehlerprotokoll. `correction_quality.german_usage_guidance` gibt Text-/Vision-Analyse und Deutsch-Gegenprüfung denselben Prüfauftrag für doppelte Satzbausteine, unpassende Wortverbindungen und kontextbezogene Ausdrucksprobleme; freiwillige Stilalternativen bleiben getrennt. Beispiele und Regressionstexte sind synthetisch.

Deutsch-Gegenprüfung v6 behandelt bei `status=bestaetigt` eine leere oder fehlende optionale Begründung gleich. Die Anker-, Befundart- und Ersetzungsprüfungen bleiben erforderlich; andere Entscheidungen brauchen weiterhin eine Begründung.

## DeepSeek-Budgets ab 2026-11-05

Der Python-Korrekturpfad verwendet für `deepseek-flash` und `deepseek-v4-pro`
32.768 Tokens ohne Denken, 65.536 bei `low`/`high` oder Anbieterstandard und
131.072 bei `max`. Denken und Endantwort teilen sich dieses Budget. Die
ausgewählte Denkstufe wird nicht still reduziert. Analyse, Gegenprüfung und
weitere Python-Aufrufe verwenden dieselbe Auflösung in `_deepseek_max_tokens`.
Die HTTP-Wartezeit beträgt mit Denken mindestens 600 s, bei `max` 1.200 s.
Die Anbietergrenze (384K Ausgabe, 1M Kontext) bleibt davon getrennt; historische
Modelle behalten ihre bisherigen Grenzen. Aufrufbelege enthalten das tatsächlich
gesendete Budget. Quelle: DeepSeek Chat Completions / Models & Pricing, 2026-11-05.

**Getrennter LUA-Pfad:** Die Unterlagenerstellung läuft über
`apps/lua/src-tauri/src/adapters/openai_compat.rs`, aktuell mit 16.000 Tokens.
Diese Änderung des Korrekturpfads passt den Rust-Adapter nicht an. Eine künftig
abweichende LUA-Budgetpolitik muss dort eigens umgesetzt und geprüft werden;
die Grenzen beider Pfade dürfen nicht als gemeinsame DeepSeek-Grenze gelten.


## Bestätigte Grundlage ab 2026-11-05

`correction_basis.py` prüft den neuen optionalen Grundlagenvertrag in
`correction_basis.grundlage` bzw. `--grundlage-snapshot-file`. Der Deutsch-Dialog
verwendet ihn obligatorisch. Sprachmodus und vollständige Prüfung sind getrennt;
ein ausdrücklich leerer Erwartungshorizont darf nicht aus der Konfiguration
nachgeladen werden. Alte Aufrufer ohne neuen Vertrag bleiben kompatibel.
`grundlage_json` im Korrekturauftrag wird in Python und Rust additiv ergänzt.
Rohantwort und normalisierte Gegenprüfung bleiben getrennt erhalten.


## Deutsch-Gegenprüfung v7 und Sprachregeln ab 2026-11-06

`sprachregeln.py` (stdlib, ohne Modell) enthält enge, deterministische Regeln: `anrede_kleinschreibung` (Großschreibung nach Anrede mit Komma am Textanfang; nur geschlossene Wortliste oder Verb + Personalpronomen, Nomen und Höflichkeitsform bleiben unberührt), `aenderungsart`/`pruefe_fehlertyp` (reine Groß-/Klein-, das/dass-, Bindestrich- und Getrennt-/Zusammenänderungen → R, reine Beistrichänderung → Z, das/dass + Beistrich → R mit `teiltypen: ["R","Z"]`, alter Typ in `typ_vorher`) und `regel_muster` (Etikett für die regelbezogenen Übungstipps in `generate_feedback`). `deutsch_review._regelpruefung` wendet das nach jeder Gegenprüfung an, auch bei unvollständiger Antwort; `natascha_core` setzt Typ und Etikett zusätzlich im allgemeinen Analysepfad.

`correction_quality.deduplicate` führt auch überlappende Änderungen zusammen (enthaltener Befund mit bereits enthaltenem Ersatz oder sich schneidende Änderungsspannen). Vorrang: geprüfter Befund mit bestätigter Ersetzung, dann größere Spanne; zusammengeführte IDs stehen in `zusammengefuehrt`.

Gegenprüfung v7: `neue_befunde` erhalten `ki_pruefung.status=ungeklaert` (`vorgeschlagene_befundart` behält den Modellvorschlag) und stützen keine Kriterien. Eigene Modell-IDs (`neu-…`) werden still aus `befund_ids` entfernt. Ein begründetes `ungeklaert` ist keine Technikdiagnose mehr, Verweise darauf stützen aber keine abschließende Aussage. Im Sprachmodus wird `kriterienpruefung` ignoriert (`review_shape_valid(..., kriterien_erwartet=False)`). Nicht bestätigte globale Aussagen behalten den Ursprungswert mit `bewertungspruefung.aussagen[feld]="offen"` (Lehrkraftansicht mit Vermerk, Schüleransicht ohne). `pruefbedarf`, der genau einen Befund nennt, steht in dessen `ki_pruefung.pruefbedarf`. Neue Post-hoc-Felder sind in `feedback_schema.json` zugelassen. `filter_title_false_positives` lässt Kleinschreibungsbefunde nach einer Komma-Anredezeile stehen.
