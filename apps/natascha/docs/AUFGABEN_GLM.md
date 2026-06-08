# NATASCHA — Aufgaben für GLM
## Stand: 2026-04-14

Dieses Dokument beschreibt die Aufgaben, die GLM in dieser Codebase umsetzt.
Claudes Aufgaben stehen in `AUFGABEN_CLAUDE.md`.

---

## Wichtige Konventionen (bitte vor dem Coden lesen)

### Codebase-Überblick
```
natascha_core.py     (~944 Zeilen)  — Shared logic: Config, LLM, DOCX-Lesen, Paths
natascha.py          (~2089 Zeilen) — Textual Dashboard (Haupt-TUI)
generate_feedback.py (~870 Zeilen)  — DOCX-Ausgabe-Generierung
natascha_wizard.py   (~1525 Zeilen) — Rich/InquirerPy CLI-Wizard (Parallel-UI)
natascha_config.toml                — Projekt-Konfiguration (TOML)
rubrics/                            — Rubrik-Dateien (.md)
tests/                              — pytest-Tests (test_feedback.py, test_llm_pipeline.py, test_tui.py)
```

### 3-stufige Hierarchie (implementiert seit v0.7.0)
```
Klasse (z.B. "3b")
  └── Aufgabe/Assignment (z.B. "SA2_Eroerterung")
        └── Dateien (.docx pro Schüler/in)
```
Config-Struktur in `natascha_config.toml`:
```toml
[classes.3b]
input = "input/3b"
output = "output/3b"
active_aufgabe = "SA2_Eroerterung"

[classes.3b.aufgaben.SA2_Eroerterung]
label = "SA2 – Erörterung"
fach = "Deutsch"
schulstufe = "Oberstufe"
textsorte = "Erörterung"
rubric = "srdp_deutsch_oberstufe.md"
input = "input/3b/SA2_Eroerterung"
output = "output/3b/SA2_Eroerterung"
```

### Textual-Spezifika (WICHTIG)
- `ListView.clear()` ist **async** — in sync-Funktionen nie ohne `await` aufrufen.
  Stattdessen In-Place-Update: alte Items einzeln `.remove()`, neue `.append()`.
- Hash-basierte stabile Item-IDs: `"item-" + hashlib.md5(name.encode()).hexdigest()[:8]`
- `@work(thread=True)` für alle LLM/IO-Calls; UI-Updates via `self.call_from_thread()`
- Alle Modal-Screens erben von `ModalScreen[bool]` und dismissen mit `self.dismiss(True/False)`

### API-Keys
Liegen in `.env` im Projektordner — nie in Config-Dateien hardcoden.

---

## Sprint G1 — A4: Rubrik-Editor (TUI-Modal)

### Kontext
Rubriken liegen als `.md`-Dateien in `rubrics/`. Sie bestehen aus Abschnitten mit
Kriterien, Stufen und Punktebereichen. Natascha muss sie aktuell im Texteditor öffnen.

### G1A: `RubrikEditorScreen(ModalScreen[bool])` in `natascha.py` (~120 Zeilen)
Neuer Modal-Screen mit zwei Modi: Anzeigen und Bearbeiten.

```
┌─ Rubrik-Editor: srdp_deutsch_oberstufe.md ─────────────┐
│  [Schreiben]  [Vorschau]                    [Speichern] │
│ ┌──────────────────────────────────────────────────────┐│
│ │# Kriterium 1: Inhalt                                 ││
│ │                                                      ││
│ │**Sehr gut (4 Punkte):** ...                          ││
│ │**Gut (3 Punkte):** ...                               ││
│ └──────────────────────────────────────────────────────┘│
│  [Schließen]                                            │
└─────────────────────────────────────────────────────────┘
```

- `TextArea` Widget (Textual >= 0.47) für Bearbeitung — liest Datei aus `rubrics/`
- Tab `[Vorschau]` — zeigt Markdown-Rendering via `Markdown` Widget
- `[Speichern]` — schreibt zurück in die `.md`-Datei, Notify mit Dateiname
- `[Schließen]` — `dismiss(False)` wenn keine Änderungen, sonst Bestätigung via `ConfirmScreen`

### G1B: Öffnen des Editors
- Im Preview-Panel Tab "Rubrik": Button `✏️ Rubrik bearbeiten` unter dem Rubrik-Text
- Aufruf: `self.app.push_screen(RubrikEditorScreen(rubric_filename))`
- Nach Schließen: Preview-Panel neu laden (Rubrik-Tab refreshen)

**Dateien:** `natascha.py` (~120 Zeilen), `natascha.tcss` (~10 Zeilen)

---

## Sprint G2 — A3: Lernfortschritts-Tracking

### Kontext
`compute_statistics(analyses)` in `natascha_core.py` (Zeile 882) liefert bereits
Noten-Durchschnitt und Kriterien-Ø pro Aufgabe. Für Lernfortschritt brauchen wir
Vergleich **über mehrere Aufgaben hinweg** für eine Klasse.

### G2A: Fortschritts-Aggregation in `natascha_core.py` (~50 Zeilen)
Neue Funktion `compute_class_progress(config, klasse) -> list[dict]`:
```python
[
  {
    "aufgabe": "SA1_Kommentar",
    "label": "SA1 – Kommentar",
    "avg_note": 2.4,
    "avg_criteria": {"Inhalt": 3.1, "Sprache": 2.8, ...},
    "n": 22,
  },
  ...
]
```
- Iteriert alle Aufgaben der Klasse
- Für jede Aufgabe: liest `output/{aufgabe}/*.json` ein (via `glob`)
- Nutzt `compute_statistics()` pro Aufgabe
- Gibt Liste sortiert nach Erstellungsdatum der Aufgabe (TOML-Reihenfolge)

### G2B: Fortschritts-Tab im `StatisticsScreen` (~80 Zeilen)
- Neuer Tab `[Fortschritt]` neben dem bestehenden Statistik-Inhalt
- Zeigt ASCII-Trendkurve (kein externes Paket — nur Textual/Rich):
  ```
  Note ↑
  1 │
  2 │    ●
  3 │  ●   ●
  4 │●
  5 │
    └──────────────→ Aufgabe
      SA1  SA2  SA3
  ```
  Implementierung: `Table` Widget oder direktes Rich-`Text`-Rendering
- Darunter: Kriterien-Vergleich als Tabelle: Kriterium | SA1-Ø | SA2-Ø | Trend (↑/↓/=)

**Dateien:** `natascha_core.py` (~50 Zeilen), `natascha.py` (StatisticsScreen, ~80 Zeilen)

---

## Sprint G3 — A5: PDF-Export

### Kontext
`generate_feedback.py` erzeugt DOCX-Dateien via `python-docx`.
PDF wird als Alternativformat gewünscht — für Archivierung und Schul-Systeme.
Strategie: DOCX zuerst generieren, dann nach PDF konvertieren (sauberer als direktes PDF-Rendering).

### G3A: Konvertierungs-Funktion in `natascha_core.py` (~30 Zeilen)
```python
def docx_to_pdf(docx_path: Path, out_path: Path | None = None) -> Path | None:
```
Konvertierungs-Strategie (Priorität):
1. **LibreOffice headless** (bevorzugt, da auf Linux/WSL verfügbar):
   `libreoffice --headless --convert-to pdf --outdir {dir} {docx}`
2. **unoconv** als Fallback: `unoconv -f pdf {docx}`
3. Gibt `None` zurück wenn kein Konverter verfügbar — Caller zeigt Notify

### G3B: Integration in Dashboard (`natascha.py`, ~25 Zeilen)
- Im `ReviewScreen`: zweiter Button `📄 Als PDF` neben `📄 DOCX erstellen`
- In `_generate_docx_files()`: optionales `also_pdf=True`-Flag (aus Settings)
- Settings-Screen: Checkbox `PDF automatisch erzeugen`
  → schreibt `[docx] auto_pdf = true` in Config

### G3C: Config-Erweiterung
```toml
[docx]
teacher_name = ""
school_name = ""
logo_path = ""
auto_pdf = false
```

**Achtung:** Keine neuen Python-Packages installieren — nur System-Tools (libreoffice, unoconv).

**Dateien:** `natascha_core.py` (~30 Zeilen), `natascha.py` (~25 Zeilen),
`natascha_config.toml` (+1 Zeile), `natascha.tcss` (~5 Zeilen)

---

## Sprint G4 — B4: Proper Python Package + pyproject.toml

### Kontext
Aktuell: Kein `pyproject.toml`, kein Package-Layout, keine Entry-Points.
Ziel: `pip install -e .` funktioniert, `natascha` startet das Dashboard.

### G4A: `pyproject.toml` erstellen
```toml
[build-system]
requires = ["setuptools>=70", "wheel"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "natascha"
version = "0.7.0"
requires-python = ">=3.11"
dependencies = [
    "textual>=0.80",
    "python-docx>=1.1",
    "anthropic>=0.30",
    "openai>=1.30",
    "tomlkit>=0.13",   # benötigt für Sprint C3
    "rich>=13",
    "InquirerPy>=0.3",
]

[project.scripts]
natascha = "natascha:main"
natascha-wizard = "natascha_wizard:main"

[tool.setuptools.packages.find]
where = ["."]
include = ["natascha*"]

[tool.ruff]
line-length = 100
target-version = "py311"
```

### G4B: Entry-Point-Wrapper prüfen
- `natascha.py` muss `def main()` haben (bereits vorhanden: `NataschaApp().run()`)
- `natascha_wizard.py` muss `def main()` haben (bereits vorhanden)
- Beide mit `if __name__ == "__main__": main()` absichern

**Dateien:** `pyproject.toml` (neu), minimale Änderungen an `natascha.py` / `natascha_wizard.py`

---

## Koordination mit Claude

| GLM tut              | Claude tut                | Koordination                                    |
|----------------------|---------------------------|-------------------------------------------------|
| G1: Rubrik-Editor    | C1: Rubrik-Upload         | Beide nutzen `rubric`-Feld — Format: `dateiname.md` in `rubrics/`, KEIN absoluter Pfad im TOML |
| G2: Lernfortschritt  | —                         | `compute_statistics()` Signatur nicht ändern    |
| G3: PDF-Export       | —                         | Unabhängig                                      |
| G4: pyproject.toml   | C3: tomlkit               | `tomlkit` als Dependency in G4 eintragen        |

---

## Verifikation Sprint G1
1. Preview-Panel Tab "Rubrik" → `✏️ Rubrik bearbeiten` Button sichtbar
2. Editor öffnet Rubrik-Text in bearbeitbarem Feld
3. Änderung speichern → `.md`-Datei aktualisiert, Preview refresht

## Verifikation Sprint G2
1. `StatisticsScreen` (`t`) zeigt neuen Tab `[Fortschritt]`
2. Mindestens 2 Aufgaben mit Analysen vorhanden → ASCII-Chart sichtbar
3. Kriterien-Vergleichstabelle zeigt Trend-Symbole (↑/↓/=)

## Verifikation Sprint G3
1. LibreOffice installiert: `📄 Als PDF`-Button im ReviewScreen sichtbar
2. DOCX erstellen → PDF erscheint im gleichen `output/`-Ordner
3. Ohne LibreOffice: Button ausgegraut oder Notify `"LibreOffice nicht gefunden"`

## Verifikation Sprint G4
1. `pip install -e .` läuft durch ohne Fehler
2. `natascha` Kommando startet Dashboard
3. `natascha-wizard` Kommando startet Wizard
