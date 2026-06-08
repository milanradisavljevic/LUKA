# NATASCHA — Aufgaben für Claude
## Stand: 2026-04-14

Dieses Dokument beschreibt die Aufgaben, die Claude (Claude Code) in dieser Codebase umsetzt.
GLMs Aufgaben stehen in `AUFGABEN_GLM.md`.

---

## Sprint C1 — Rubrik-Upload pro Aufgabe (NEU, NÄCHSTER SPRINT)

### Kontext
Natascha kann derzeit eine Rubrik aus dem `rubrics/`-Verzeichnis wählen.
Neu: Pro Aufgabe (Assignment) soll eine **eigene Rubrik-Datei (.md)** hochgeladen werden können —
entweder als Kopie in `rubrics/` oder als absoluter Pfad, gespeichert direkt in der Aufgaben-Config.
Button `📎 Rubrik` neben `＋ Aufgabe` im Files-Panel.

### C1A: Config-Layer (`natascha_core.py`, ~20 Zeilen)
- Neues Feld `rubric_path` in Aufgaben-Config (absoluter oder relativer Pfad zu einer .md-Datei)
- `load_rubric_for_aufgabe(config, klasse, aufgabe) -> str`:
  - Prüft `rubric_path` in der Aufgaben-Config (absoluter Pfad bevorzugt)
  - Fällt zurück auf `rubric` (Dateiname in `rubrics/`) — bisheriges Verhalten
  - Fällt zurück auf `default_rubric_for(fach, schulstufe, config)`
- `attach_rubric_to_aufgabe(klasse, aufgabe, source_path: Path) -> str`:
  - Kopiert `source_path` nach `rubrics/{slug}_{filename}` (damit Rubrik im Projekt bleibt)
  - Schreibt `rubric = "{zieldateiname}"` in die Aufgaben-Config via `_update_in_section()`
  - Gibt den Dateinamen zurück

### C1B: TUI (`natascha.py`, ~40 Zeilen)
- Button `📎 Rubrik` (`#attach-rubric-btn`, classes `add-class-btn`) im Files-Panel,
  direkt nach `#add-aufgabe-btn`
- Handler in `on_button_pressed`: öffnet `AttachRubricScreen`

**`AttachRubricScreen(ModalScreen[bool])`** (~60 Zeilen):
```
┌─ Rubrik hochladen ──────────────────────────────────┐
│  Aufgabe: SA2 – Erörterung                          │
│                                                     │
│  Pfad zur Rubrik-Datei (.md):                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ /home/natascha/Rubriken/erörterung.md       │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Oder vorhandene Rubrik aus rubrics/:               │
│  [Select: srdp_deutsch_oberstufe.md ▼]              │
│                                                     │
│  [Speichern]  [Abbrechen]                           │
└──────────────────────────────────────────────────────┘
```
- Input-Feld für freien Pfad (tippen oder Paste)
- Select für vorhandene Rubriken aus `rubrics/` (Fallback ohne Upload)
- Validierung: Datei muss existieren, Endung `.md`
- On Save: `nc.attach_rubric_to_aufgabe(...)` aufrufen, Notify mit Dateinamen
- Fehler: Notify `"Datei nicht gefunden: {pfad}"` statt Exception

### C1C: Integration in LLM-Pipeline
- In `_apply_defaults()` in `natascha.py`: wenn Aufgabe aktiv ist, Rubrik über
  `nc.load_rubric_for_aufgabe()` laden statt direkt `aufgabe_defaults()["rubric"]`
- In `natascha_core.py` → `build_analysis_prompt()`: bereits über `rubric`-Feld geliefert,
  kein direkter Eingriff nötig — Rubrik-Text kommt schon als Parameter rein

### C1D: Preview-Tab "Rubrik" aktualisieren
- `_update_preview_panel()` beim Tab "rubrik": ebenfalls `load_rubric_for_aufgabe()` nutzen
  (bisher: `nc.load_rubric(fi.rubric, self.config)` — ignoriert Aufgaben-spezifische Rubrik)

**Dateien:** `natascha_core.py`, `natascha.py`, `natascha.tcss` (+3 Zeilen für `#attach-rubric-btn`)

---

## Sprint C2 — B1: Wizard-Deduplizierung (~500 Zeilen entfernen)

### Kontext
`natascha_wizard.py` (1525 Zeilen) enthält ~20 Funktionen 1:1 aus `natascha_core.py` kopiert.
Das macht Bugfixes doppelt notwendig und erzeugt Drift-Risiken.

### Identische Funktionen im Wizard (zu entfernen, durch `import natascha_core as nc` ersetzen):
```
load_config()           → nc.load_config()
resolve_path()          → nc.resolve_path()
count_words()           → nc.count_words()
read_docx_text()        → nc.read_docx_text()
load_rubric()           → nc.load_rubric()
load_schema()           → nc.load_schema()
load_example_fixture()  → nc.load_example_fixture()
build_analysis_prompt() → nc.build_analysis_prompt()
extract_json_from_llm() → nc.extract_json_from_llm()
validate_against_schema() → nc.validate_against_schema()
build_project_paths()   → nc.build_project_paths()
rubric_options_for()    → nc.rubric_options_for()
default_rubric_for()    → nc.default_rubric_for()
copy_to_clipboard()     → nc.copy_to_clipboard()
check_agent_availability() → nc.check_agent_availability()
run_agent_sync()        → nc.run_agent_sync()
run_anthropic_api()     → nc.run_anthropic_api()
humanize_agent_error()  → nc.humanize_agent_error()
```

### Vorgehen
1. `import natascha_core as nc` am Anfang von `natascha_wizard.py` hinzufügen
2. Jede duplizierte Funktion in der Wizard-Datei löschen
3. Alle internen Aufrufe dieser Funktionen auf `nc.XYZ()` umstellen
4. `python3 -m pytest tests/ -q` muss grün bleiben

**Achtung:** `build_project_paths()` hat im Wizard noch die alte Signatur (ohne `klasse`/`aufgabe`).
Core-Version ist rückwärtskompatibel (optionale Parameter) — direkter Drop-in.

---

## Sprint C3 — B2: Config-Management mit tomlkit

### Kontext
Aktuell: TOML-Schreiben über Regex (`re.sub`) in ~6 Stellen in `natascha_core.py`.
Das ist fragil bei Kommentaren, mehrzeiligen Werten, Sonderzeichen.
`tomlkit` erhält Formatierung und Kommentare — kein Regex mehr.

### Betroffene Stellen in `natascha_core.py`:
- `save_active_klasse()` — `re.sub(r'^active = ".*"', ...)`
- `add_class_to_config()` — Append neuer Block
- `save_active_aufgabe()` — `_update_in_section()` (der komplexeste Teil)
- `add_aufgabe_to_config()` — Append neuer Aufgaben-Block
- Settings-Screen in `natascha.py` — schreibt `provider`, `model`, `teacher_name`, etc.

### Implementierung
```python
# Neue Hilfsfunktionen in natascha_core.py:
def _load_toml_doc() -> tomlkit.TOMLDocument:
    with open("natascha_config.toml", "rb") as f:
        return tomlkit.parse(f.read().decode())

def _save_toml_doc(doc: tomlkit.TOMLDocument) -> None:
    with open("natascha_config.toml", "w", encoding="utf-8") as f:
        f.write(tomlkit.dumps(doc))
```

- Alle `re.sub`-basierten Schreibfunktionen auf `tomlkit`-Zugriff umstellen
- `_update_in_section()` wird obsolet → entfernen
- `tomlkit` zu Dependencies (aktuell: `python-docx`, `textual`, `anthropic`, `openai`)

**Reihenfolge:** Nach C2 (Deduplizierung) durchführen, damit Änderungen nur einmal gemacht werden.

---

## Verifikation Sprint C1

1. `📎 Rubrik`-Button sichtbar im Files-Panel (nur aktiv wenn Aufgabe aktiv ist)
2. Modal öffnet sich mit korrektem Aufgabennamen in der Titelzeile
3. Pfad eingeben → Datei wird nach `rubrics/` kopiert → TOML aktualisiert
4. Preview-Tab "Rubrik" zeigt die hochgeladene Rubrik für diese Aufgabe
5. LLM-Analyse nutzt die hochgeladene Rubrik (im Prompt sichtbar via Debug-Log)

## Verifikation Sprint C2

1. `python3 natascha_wizard.py --help` startet ohne ImportError
2. `python3 -m pytest tests/ -q` — alle Tests grün
3. `wc -l natascha_wizard.py` — signifikant unter 1100 Zeilen

## Verifikation Sprint C3

1. `natascha_config.toml` nach Settings-Änderung: Kommentare erhalten
2. Neue Klasse anlegen → TOML korrekt strukturiert (kein Regex-Artefakt)
3. `python3 -m pytest tests/ -q` — alle Tests grün

---

## Abhängigkeiten zu GLMs Aufgaben

| Claude tut              | GLM tut                   | Abhängigkeit                          |
|-------------------------|---------------------------|---------------------------------------|
| C1: Rubrik-Upload       | G1: Rubrik-Editor         | Beide ändern `rubric`-Feld in Config — koordinieren welches Format |
| C2: Wizard-Dedup        | —                         | Unabhängig                            |
| C3: tomlkit             | G4: pyproject.toml        | G4 soll `tomlkit` als Dependency eintragen |
| —                       | G2: Lernfortschritt       | Nutzt `compute_statistics()` aus Core — Claude darf Signatur nicht ändern |
