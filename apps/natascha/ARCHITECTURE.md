# NATASCHA – Architekturübersicht

**Version:** 0.7.x | **Stack:** Python 3.12+, Textual TUI, urllib (stdlib), jsonschema, python-docx

## Was die App macht

NATASCHA (Normbasierte Analyse von Textproduktionen: Automatisierte Schularbeits-Correction als Hilfe-Agent) ist ein TUI-Dashboard für Deutschlehrerinnen. Es liest Schüler-Abgaben (DOCX/PDF/Bild), schickt sie via LLM-API zur Analyse, validiert das JSON-Ergebnis gegen ein Schema und erzeugt daraus DOCX-Feedback-Dokumente.

## Module

| Datei | Zweck | Größe |
|-------|-------|-------|
| `natascha.py` | Textual-Dashboard, UI-Logik, Async-Worker | ~4500 Zeilen |
| `natascha_core.py` | Config, Dateiverarbeitung, LLM-Pipeline, Benotung | ~2400 Zeilen |
| `natascha_db.py` | SQLite-Persistenz: Schueler, Abgaben, Noten-/Fehler-Historie, Heatmap, Lehrer-Feedback | ~1000 Zeilen |
| `generate_feedback.py` | DOCX-Generierung aus JSON-Feedback | ~2000 Zeilen |
| `natascha_wizard.py` | Legacy-CLI (InquirerPy), Fallback | ~4400 Zeilen |
| `natascha_config.toml` | Klassen, Aufgaben, Provider, Pfade (tomlkit) | — |
| `feedback_schema.json` | jsonschema für LLM-Output-Validierung | — |
| `natascha.tcss` | Textual-CSS (Subset – kein gradient/shadow/gap) | — |

## Datenfluss

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

## UI-Struktur (natascha.py)

```
NataschaApp (App)
├── NataschaHeader           – Logo + Titelzeile
├── #main-container (Horizontal)
│   ├── #files-panel         – Klassen-Select, Aufgaben-Select, Dateiliste, #file-counter
│   ├── #middle-panel        – Zuordnung (Fach/Stufe/Textsorte/Rubrik) + Lehrer-Feedback (Collapsible)
│   │                          RadioSet Note 1-5, TextArea Kommentar, Speichern-Button
│   └── #preview-panel       – 4 Tabs: Text | Bewertung | Rubrik | Output
└── NataschaFooter           – 9 Buttons (dock:bottom, height:3)
                               Analysieren | DOCX | Zuordnung | Einstellungen |
                               Hilfe | Schüler | Klasse | Ordner | Beenden

Modale: HelpScreen, ConfirmScreen, SettingsScreen, ReviewScreen,
        EditAssignmentScreen, RubrikEditorScreen,
        AddAufgabeScreen, AddClassScreen, AttachRubricScreen,
        ErwartungshorizontGeneratorScreen,
        SchuelerVerwaltungScreen, SchuelerDetailScreen,
        RetroImportScreen,
        KlassenFeedbackScreen  ← Tab-Screen mit 3 Reitern:
                                  Feedback | Heatmap | Statistik
```

## Konfigurationsschema (natascha_config.toml)

```toml
[api]
provider = "anthropic"   # anthropic | deepseek | kimi | openai | qwen | ollama
model    = "claude-sonnet-4-6"

[classes.<klasse>]
active_aufgabe = "AufgabenKey"
input  = "input/<klasse>"
output = "output/<klasse>"

[classes.<klasse>.aufgaben.<key>]
label       = "Anzeigename"
fach        = "Deutsch"          # Deutsch | Englisch
schulstufe  = "Oberstufe"        # Oberstufe | Unterstufe
textsorte   = "Kommentar"
rubric      = "kommentar.md"     # Dateiname in rubrics/
input       = "input/<klasse>/<key>"
output      = "output/<klasse>/<key>"
erwartungshorizont = ""          # optional: .md-Datei in rubrics/
```

## LLM-Provider

| Provider | API Key | Besonderheit |
|----------|---------|-------------|
| anthropic | `ANTHROPIC_API_KEY` | Standard; Vision (PDF+Bild); JSON forced |
| deepseek | `DEEPSEEK_API_KEY` | deepseek-chat (V3); `response_format: json_object` |
| qwen | `QWEN_API_KEY` oder `DASHSCOPE_API_KEY` | DashScope-Endpoint |
| openai | `OPENAI_API_KEY` | OpenAI-kompatibel |
| kimi | `KIMI_API_KEY` | moonshot-v1 |
| ollama | — | Lokal; kein JSON-Modus; nur Text-Parsing |

Alle Keys nur über `os.environ.get()` — nie hardcoded. `.env` ist gitignored.

## feedback_schema.json – Pflichtfelder

```json
{
  "datei": "string",
  "textsorte": "string",
  "fach": "Deutsch|Englisch",
  "schulstufe": "Unterstufe|Oberstufe",
  "rubrik": "string",
  "bewertung": { "<kriterium>": { "stufe": 1-5, "punkte": 1-5, ... } },
  "fehler": [ { "zitat": "", "korrektur": "", "typ": "R|G|Z|A", "erklaerung": "" } ]
}
```

Wichtig: `fehler` ist Top-Level-Array. `fehler_detail` innerhalb von `bewertung`-Kriterien ist **deprecated** (`additionalProperties: false`).

## Datenbank-Schema (natascha_db.py)

5 Tabellen, eine `.db`-Datei pro Schuljahr:

| Tabelle | Zweck |
|---------|-------|
| `schueler` | Klasse, Vorname, Nachname |
| `abgabe` | Datei-Hash, Note (App), Kriterien, Metadaten |
| `kriterium_historie` | Pro-Abgabe-Kriterien mit Stufe/Gewichtung |
| `fehler_historie` | Pro-Abgabe-Fehler (Zitat, Korrektur, Typ) |
| `lehrer_feedback` | **NEU:** `note_final` (echte Note), `note_app_snapshot` (App-Note), `lehrer_kommentar`, `pdf_pfad` |

CRUD-Funktionen:
- `upsert_lehrer_feedback()` — INSERT ... ON CONFLICT(abgabe_id) DO UPDATE (COALESCE für schueler_id + snapshot)
- `get_lehrer_feedback(abgabe_id)` — einzelnes Feedback
- `get_lehrer_feedback_by_hash(datei_hash)` — Lookup über Abgabe-Hash
- `has_lehrer_feedback_for_file(datei_hash)` — bool für Status-Marker

## Schüler-Längsschnitt (Lernverlauf, dreischichtig)

Aufbauend auf der DB. Trendrichtung ist immer an die **Verbesserung** gekoppelt, nicht an die
Zahlrichtung (bei Noten = kleinere Zahl besser → „steigt").

| Schicht | Ort | Zweck |
|---------|-----|-------|
| 1 – Aggregation | `natascha_db.get_schueler_laengsschnitt(db_path, schueler_id)` | regelbasiert: Notenverlauf (App+Lehrer), 4 Hauptkriterien + K1/K3, Trend, Fehlerschwerpunkte, Kalibrierung |
| 2 – UI | `SchuelerDetailScreen` (Button „📈 Verlauf" in der Schüler-Verwaltung) | reine Anzeige, keine LLM-Calls |
| 3 – Prompt (Entwurf) | `natascha_core.build_schueler_profil_prompt(laengsschnitt)` | datenminimierter LLM-Prompt; **DSGVO:** nie Name/Klasse/Texte; nicht verdrahtet |

`KRITERIUM_KEY_VARIANTS` (in `natascha_core`) ist die gemeinsame Quelle der
Kriteriumsnamen-Varianten für `berechne_note_srdp()` und die Aggregation.

## Benotung

- **Oberstufe SRDP:** `Note = 6 − Stufe` (gerundet). Sonderregel: K1 **oder** K3 Stufe ≤ 1.5 → Note 5
- **Unterstufe:** Gewichteter Durchschnitt der 4 Kriterien (Gewichte aus Rubrik, default 25%)

## Wichtige Funktionen (natascha_core.py)

| Funktion | Zeile | Zweck |
|----------|-------|-------|
| `run_llm_analysis()` | 761 | Haupt-Pipeline: Prompt → API → JSON → Schema → Retry |
| `extract_json_from_llm()` | 672 | Bracket-counting Extraktor (kein greedy regex) |
| `validate_against_schema()` | 715 | jsonschema-Validierung |
| `build_analysis_prompt()` | 438 | Text-Analyse-Prompt mit Rubrik-Kontext |
| `build_vision_prompt()` | 546 | Bild/PDF-Analyse-Prompt |
| `berechne_note_srdp()` | 1196 | SRDP-Benotung inkl. Sonderregel |
| `berechne_note_unterstufe()` | 1297 | Unterstufe-Benotung gewichtet |
| `run_llm_api()` | 2013 | Provider-Dispatch |

## Rubrik-Verzeichnis (rubrics/)

27 Markdown-Dateien. Struktur jeder Rubrik:
- `## Kriterien` – Kriterium-Definitionen
- `## Gewichtung` – Prozentwerte je Kriterium
- `## SRDP-Detail` (nur Oberstufe) – K1/K3 Sub-Kriterien (15 Einträge)

Unterstufe: `*_unterstufe.md`. Oberstufe: `srdp_deutsch_oberstufe.md`, `kommentar.md`, `textinterpretation.md` etc.
