# NATASCHA – Agent-Dokumentation

> **Für AI-Coding-Agents:** Diese Datei beschreibt das gesamte Projekt aus Sicht eines Entwicklers, der den Code noch nicht kennt. Alle Informationen sind aus dem tatsächlichen Code abgeleitet — keine Annahmen.

---

## 1. Projektübersicht

**NATASCHA** (Normbasierte Analyse von Textproduktionen – Automatisierte Schularbeits-Correction als Hilfe-Agent) ist ein Python-TUI-Dashboard für Lehrkräfte. Es liest Schüler-Abgaben (DOCX, PDF, Bilder), schickt sie an LLM-APIs zur Analyse, validiert das JSON-Ergebnis gegen ein Schema und erzeugt daraus formatierte DOCX-Feedback-Dokumente.

- **Version:** 0.7.3
- **Python:** >= 3.11
- **Lizenz:** MIT
- **Primärsprache:** Deutsch (Code-Kommentare, UI, Dokumentation, Rubriken)

---

## 2. Technologie-Stack

| Komponente | Paket / Tool | Zweck |
|------------|-------------|-------|
| TUI-Framework | `textual>=0.47` | Dashboard-UI (3-Spalten-Layout, modale Dialoge) |
| DOCX-Verarbeitung | `python-docx>=1.1` | Lesen von Abgaben, Schreiben von Feedback-DOCX |
| LLM-APIs | `anthropic>=0.30`, `openai>=1.30` | API-Clients für Claude, OpenAI, DeepSeek, Qwen, Kimi |
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
├── rubrics/                 # 27 Markdown-Bewertungsraster
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
| `run_llm_api()` | Provider-Dispatch (anthropic, openai, deepseek, qwen, kimi, ollama) |
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
```

---

## 10. LLM-Provider

| Provider | API-Key-Env-Var | Besonderheit |
|----------|----------------|-------------|
| anthropic | `ANTHROPIC_API_KEY` | Standard; Vision (PDF+Bild); JSON forced |
| deepseek | `DEEPSEEK_API_KEY` | `deepseek-chat` (V3); `response_format: json_object` |
| qwen | `QWEN_API_KEY` oder `DASHSCOPE_API_KEY` | DashScope-Endpoint; `enable_thinking: false` |
| openai | `OPENAI_API_KEY` | OpenAI-kompatibel |
| kimi | `KIMI_API_KEY` | moonshot-v1 |
| ollama | — | Lokal; kein JSON-Modus; nur Bracket-Counting-Fallback |

---

## 11. Rubriken-Verzeichnis (`rubrics/`)

27 Markdown-Dateien. Jede Rubrik enthält:
- `## JSON-Kriterien` – exakte Schlüssel für die Bewertung
- `## Checkliste Kriterien` – menschenlesbare Checkliste
- `## Stufenbeschreibungen (1–5)` – je Kriterium
- `## Gewichtung` – Prozentwerte je Kriterium
- `## SRDP-Detail` (nur Oberstufe) – K1/K3 Sub-Kriterien

**Unterstufe:** `*_unterstufe.md`  
**Oberstufe:** `srdp_deutsch_oberstufe.md`, `kommentar.md`, `textinterpretation.md`, etc.

---

## 12. Feedback-JSON-Schema (`feedback_schema.json`)

**Pflichtfelder:** `datei`, `textsorte`, `fach`, `schulstufe`, `rubrik`, `bewertung`, `fehler`

**Wichtig:** `fehler` ist ein Top-Level-Array mit Objekten `{zitat, korrektur, typ, erklaerung}`. `fehler_detail` innerhalb von `bewertung`-Kriterien ist **deprecated**.

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
