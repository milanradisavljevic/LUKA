# NATASCHA TUI – Aenderungsprompt (zugewiesen an GLM)

> Kontext: Die erste Version von natascha_tui.py mit textual ist fertig, crasht aber bei Dateinamen mit Sonderzeichen (BadIdentifier) und ist fuer die Zielgruppe (Lehrkraft) zu komplex.
> Entscheidung: Wechsel von textual (Dashboard-Pattern) zu rich + InquirerPy (Wizard-Pattern).
> Erstellt: 2026-04-10 von Claude Opus

---

## Was sich aendert und warum

Das aktuelle 5-Screen-Layout mit Checkboxen, Dropdowns und Freitextfeldern ist ein Dashboard. NATASCHA braucht aber einen Wizard: eine Frage nach der anderen, klar gefuehrt, ohne dass man alles auf einmal sehen muss. Die Zielgruppe ist eine Lehrkraft, die dreimal im Semester Schularbeiten korrigiert -- nicht ein Entwickler, der taeglich im Terminal lebt.

**Weg:** textual, pyperclip
**Hin:** rich (Ausgabe), InquirerPy (Menues und Prompts)

Vorteile:
- Keine Widget-ID-Probleme (der aktuelle Crash-Bug loest sich von selbst)
- Sequentieller Flow = natuerlich ein Wizard
- Weniger Code, weniger Abhaengigkeiten, leichter zu debuggen
- Maus nicht noetig, aber Pfeiltasten + Enter reichen
- rich kann Tabellen, Panels, Farben -- sieht trotzdem gut aus

---

## Vorbereitung

Lies zuerst:
1. `natascha_tui.py` (aktueller Stand -- die Logik-Funktionen wie build_analysis_prompt, count_words, load_config etc. sind gut und sollen uebernommen werden)
2. `generate_feedback.py` (wird als Modul importiert)
3. `feedback_schema.json`
4. `natascha_config.toml`

---

## Neue Architektur

Eine einzige Datei `natascha_tui.py`, kein Klassen-Geflecht, sondern ein linearer Ablauf mit Funktionen.

```python
# Grob-Struktur (Pseudocode)

def main():
    config = load_config()
    console = Console()
    show_banner(console)

    while True:
        choice = main_menu()
        if choice == "neue_korrektur":
            run_korrektur_wizard(config, console)
        elif choice == "analyse_laden":
            run_load_existing(config, console)
        elif choice == "einstellungen":
            show_settings(config, console)
        elif choice == "beenden":
            break
```

---

## Screens als Wizard-Schritte

### Schritt 0: Banner + Hauptmenue

```
╭─ NATASCHA ─────────────────────────────────────────╮
│  Normbasierte Analyse von Textproduktionen         │
│  Automatisierte Schularbeits-Correction            │
│  als Hilfe-Agent                                   │
╰────────────────────────────────────────────────────╯

? Hauptmenue (Pfeiltasten + Enter)
› Neue Korrektur starten
  Bestehende Analyse laden
  Einstellungen
  Beenden
```

Verwende `rich.panel.Panel` fuer den Banner und `InquirerPy.inquirer.select` fuer das Menue.

### Schritt 1: Dateiauswahl

```
? Welche Arbeiten sollen korrigiert werden? (Leertaste = auswaehlen, Enter = weiter)
› ◉ deutsch digga.docx                              342 Woerter
  ◉ Kommentar -Krass, Digga!...- Matthias Bachler   464 Woerter
```

Verwende `InquirerPy.inquirer.checkbox`.
- Zeige alle .docx aus input/
- Wortanzahl mit count_words() daneben
- Dateien unter 50 Woerter: mit "[!]" markieren
- Alle vorausgewaehlt

WICHTIG: Die Dateinamen sind nur Labels, keine Widget-IDs. Sonderzeichen sind kein Problem.

### Schritt 2: Zuordnung (pro Datei, sequentiell)

Fuer jede ausgewaehlte Datei nacheinander:

```
─── deutsch digga.docx (342 Woerter) ───

? Fach
› Deutsch
  Englisch

? Schulstufe
› Oberstufe
  Unterstufe

? Textsorte (frei eingeben)
: Eroerterung

  Rubrik: srdp_deutsch_oberstufe.md (automatisch gewaehlt)
  Aendern? [j/N]: _
```

Verwende `inquirer.select` fuer Fach und Schulstufe, `inquirer.text` fuer Textsorte.

Rubrik-Automatik:
- Deutsch + Oberstufe → srdp_deutsch_oberstufe.md
- Deutsch + Unterstufe → deutsch_unterstufe.md
- Englisch + Oberstufe → srdp_englisch_b2.md
- Englisch + Unterstufe → englisch_a2.md

Nur bei "j" ein zusaetzlicher `inquirer.select` mit allen Rubrik-Dateien.

Bei Englisch + Oberstufe zusaetzlich fragen:
```
? GERS-Niveau
› B2 (7./8. Klasse)
  B1 (5./6. Klasse)
```

### Schritt 3: Analyse ausloesen

```
─── Analyse ───

? Wie soll die Analyse durchgefuehrt werden?
› Prompt in Zwischenablage kopieren
  Prompt anzeigen (zum manuellen Kopieren)
  Agent starten (claude)
  JSON-Datei manuell laden
```

**"Prompt in Zwischenablage kopieren":**
- Versuche xclip, xsel, oder wl-copy (WSL: clip.exe)
- Bei Erfolg: "Prompt kopiert. Fuege ihn in deinen LLM-Agent ein."
- Bei Fehler: Automatisch Fallback auf "Prompt anzeigen"
- Danach: "Speichere das JSON-Ergebnis nach output/feedback_data/ und waehle 'JSON-Datei manuell laden'."

**"Prompt anzeigen":**
- Zeige den Prompt mit `rich.syntax.Syntax` (Syntax-Highlighting) oder `rich.panel.Panel`
- Scrollbar im Terminal reicht

**"Agent starten":**
- `inquirer.select` fuer Agent-Auswahl (claude, codex, qwen, glm) mit Default aus Config
- Fortschrittsanzeige mit `rich.progress.Progress` oder `rich.spinner.Spinner`
- stdout parsen, JSON extrahieren (zwischen ```json...``` oder raw)
- Schema-Validierung
- Bei Fehler: "Analyse fehlgeschlagen. Erneut versuchen? [j/N]"

**"JSON-Datei manuell laden":**
- `inquirer.filepath` mit Default-Pfad output/feedback_data/
- Schema-Validierung nach dem Laden

### Schritt 4: Review

```
─── Ergebnis: deutsch digga.docx ───

┌────────────────────┬───────────────────────────────┬────────┐
│ Kriterium          │ Stufe                         │ Punkte │
├────────────────────┼───────────────────────────────┼────────┤
│ Inhalt             │ im Wesentlichen richtig       │ 2      │
│ Textstruktur       │ mit kleinen Maengeln          │ 3      │
│ Stil und Ausdruck  │ mit kleinen Maengeln          │ 3      │
│ Sprachrichtigkeit  │ mit kleinen Maengeln          │ 3      │
├────────────────────┼───────────────────────────────┼────────┤
│ Durchschnitt       │                               │ 2.75   │
│ Note               │ 3 - Befriedigend              │        │
└────────────────────┴───────────────────────────────┴────────┘

? Was moechtest du tun?
› DOCX generieren
  Details zu einem Kriterium anzeigen
  JSON im Editor oeffnen
  Analyse wiederholen
```

Verwende `rich.table.Table` fuer die Uebersicht.

**"Details zu einem Kriterium anzeigen":**
- `inquirer.select` mit den Kriterien
- Danach: Staerken, Schwaechen, Vorschlaege als `rich.panel.Panel`
- Zurueck zur Auswahl

**"JSON im Editor oeffnen":**
- Oeffne die JSON-Datei in $EDITOR (Default: nano)
- Nach dem Schliessen: Schema-Validierung
- Bei Fehler: Warnung + "Erneut editieren? [j/N]"

### Schritt 5: DOCX generieren

```
─── DOCX-Generierung ───

  ✓ deutsch digga_feedback.docx
    → output/deutsch_digga_feedback.docx

  ✓ Kommentar -Krass, Digga!...- Matthias Bachler_feedback.docx
    → output/Kommentar -Krass, Digga!...- Matthias Bachler_feedback.docx

? Was moechtest du tun?
› Ordner oeffnen
  Neue Korrektur starten
  Zurueck zum Hauptmenue
  Beenden
```

Rufe `gf.process_file()` auf. "Ordner oeffnen" nutzt `xdg-open` oder `explorer.exe` (WSL-Detection).

---

## Was aus dem alten Code uebernommen wird

Diese Funktionen aus dem aktuellen natascha_tui.py sind gut und sollen 1:1 uebernommen werden:

- `load_config()`
- `resolve_path()`
- `count_words()`
- `read_docx_text()`
- `load_rubric()`
- `load_schema()`
- `load_example_fixture()`
- `build_analysis_prompt()`
- `extract_json_from_text()` (falls vorhanden)
- `validate_json()` (falls vorhanden)
- `run_agent()` (falls vorhanden)

Der gesamte textual-spezifische Code (Screens, Widgets, CSS, ComposeResult) wird geloescht.

---

## Abhaengigkeiten

Aktualisiere `requirements_tui.txt`:

```
rich>=13.0
InquirerPy>=0.3.4
python-docx>=1.1.0
```

Optional (fuer Schema-Validierung):
```
jsonschema>=4.20
```

Entferne:
```
textual
pyperclip
```

---

## Zwischenablage in WSL

Statt pyperclip, nutze einen simplen Fallback-Mechanismus:

```python
def copy_to_clipboard(text: str) -> bool:
    """Versucht den Text in die Zwischenablage zu kopieren."""
    for cmd in ["clip.exe", "xclip -selection clipboard", "xsel --clipboard", "wl-copy"]:
        try:
            proc = subprocess.run(
                cmd.split(), input=text.encode(), timeout=5,
                capture_output=True
            )
            if proc.returncode == 0:
                return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    return False
```

---

## Einschraenkungen (unveraendert)

- NICHT aendern: generate_feedback.py, feedback_schema.json, MASTER_PROMPT.md, rubrics/*
- Alle Texte in der TUI auf Deutsch
- Umlaute: ae/oe/ue in Code und Dateinamen, ae/oe/ue in der Anzeige (Konsistenz)
- Kein Webserver, kein Browser

## Lieferumfang

| Datei | Aktion |
|-------|--------|
| `natascha_tui.py` | Komplett neu schreiben (Logik-Funktionen uebernehmen) |
| `requirements_tui.txt` | Aktualisieren (textual raus, InquirerPy rein) |
| `natascha_config.toml` | Unveraendert lassen |
| `INTEGRATION_NOTES.md` | Aktualisieren falls neue Findings |

---

*Aenderungsprompt fuer GLM 5.1*
*Erstellt: 2026-04-10, Claude Opus via claude.ai*
