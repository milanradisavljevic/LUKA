# NATASCHA TUI – Design-Polishing v4 (zugewiesen an GLM)

> Kontext: TUI funktioniert, Umlaute sind korrigiert, Flow stimmt.
> Problem: Die Optik wirkt zusammengewürfelt. Kein visuelles System.
> Erstellt: 2026-04-10 von Claude Opus

---

## Designziel

NATASCHA soll wirken wie ein professionelles CLI-Tool, nicht wie ein Prototyp.
Referenz: Tools wie `gh` (GitHub CLI), `lazygit`, `k9s` -- sauber, ruhig, konsistent.

---

## Aenderung 1: Logo ersetzen

Das aktuelle Block-Logo ist zu breit und zu laut. Ersetze es durch eine cleane Variante:

**Option A (bevorzugt) -- Handgemachtes schlankes Logo:**

```python
LOGO = r"""
 _   _   ____  _____  ____  ____   ___  _   _   ____
| \ | | / () \|_   _|/ () \/ ___| / __\| |_| | / () \
|_|\__| \__/\__ |_| /__/\__\___)  \___/|_| |_| \__/\__\\
"""
```

**Option B -- Falls pyfiglet installiert:**
```python
try:
    from pyfiglet import figlet_format
    LOGO = figlet_format("NATASCHA", font="small")
except ImportError:
    LOGO = "NATASCHA"  # Fallback
```

Schriftart `small` oder `mini` aus pyfiglet -- NICHT `banner`, `block` oder `standard` (zu gross).

**Darstellung:**

```python
def show_banner(console: Console) -> None:
    console.print()
    console.print(Text(LOGO, style="bold cyan"), highlight=False)
    console.print(
        "  Normbasierte Analyse von Textproduktionen\n"
        "  Automatisierte Schularbeits-Correction als Hilfe-Agent\n",
        style="dim",
    )
```

Kein Panel um das Logo. Einfach Text + Untertitel. Weniger ist mehr.

---

## Aenderung 2: Farbschema definieren

Definiere ein konsistentes Farbschema als Konstanten am Anfang der Datei:

```python
# --- Farbschema ---
STYLE_BRAND = "bold cyan"          # Logo, Haupttitel
STYLE_HEADING = "bold white"       # Abschnittsueberschriften
STYLE_SUCCESS = "green"            # Erfolg, OK
STYLE_WARNING = "yellow"           # Warnungen
STYLE_ERROR = "bold red"           # Fehler
STYLE_DIM = "dim"                  # Nebensaechliches, Pfade, Hinweise
STYLE_ACCENT = "cyan"              # Rubrik-Namen, Agent-Namen, Links
STYLE_INPUT_LABEL = "bold"         # Labels bei Zuordnung
STYLE_TABLE_HEADER = "bold cyan"   # Tabellenkopf
```

Verwende diese Konstanten ueberall statt hartcodierter Farben.

---

## Aenderung 3: Schritt-Indikator

Zeige bei jedem Wizard-Schritt an, wo man sich befindet:

```python
def show_step(console: Console, current: int, total: int, title: str) -> None:
    bar = "─" * 50
    dots = ""
    for i in range(1, total + 1):
        if i < current:
            dots += "● "
        elif i == current:
            dots += "◉ "
        else:
            dots += "○ "

    console.print()
    console.print(f"  {dots}  [dim]Schritt {current}/{total}[/dim]")
    console.print(f"  [{STYLE_HEADING}]{title}[/{STYLE_HEADING}]")
    console.print(f"  [{STYLE_DIM}]{bar}[/{STYLE_DIM}]")
    console.print()
```

Anwendung:
```
  ● ◉ ○ ○ ○  Schritt 2/5
  Zuordnung
  ──────────────────────────────────────────────────
```

Einbauen in:
- Schritt 1: Dateiauswahl (1/5)
- Schritt 2: Zuordnung (2/5)
- Schritt 3: Analyse (3/5)
- Schritt 4: Review (4/5)
- Schritt 5: DOCX-Generierung (5/5)

---

## Aenderung 4: Datei-Zuordnung visuell verbessern

Statt:
```
--- Kommentar -Krass, Digga!...- Matthias Bachler.docx (464 Wörter) ---
? Fach Deutsch
? Schulstufe Unterstufe
```

Besser -- mit einer kompakten Zusammenfassung nach der Eingabe:

```python
def show_assignment_summary(console: Console, assignment: dict) -> None:
    table = Table(
        box=box.SIMPLE_HEAVY,
        show_header=False,
        padding=(0, 2),
        border_style="dim",
    )
    table.add_column("Key", style=STYLE_INPUT_LABEL, width=14)
    table.add_column("Value")
    table.add_row("Datei", assignment["filename"])
    table.add_row("Fach", assignment["fach"])
    table.add_row("Schulstufe", assignment["schulstufe"])
    table.add_row("Textsorte", assignment["textsorte"])
    table.add_row("Rubrik", f"[{STYLE_ACCENT}]{assignment['rubric']}[/{STYLE_ACCENT}]")
    console.print(table)
```

Diese Zusammenfassung nach jeder Dateizuordnung anzeigen, bevor zur naechsten Datei gewechselt wird. Gibt dem User Sicherheit, dass alles stimmt.

---

## Aenderung 5: Review-Tabelle aufwerten

Die aktuelle Tabelle ist funktional, aber kann schoener:

```python
def show_review_table(console: Console, data: dict, fname: str) -> None:
    bewertung = data.get("bewertung", {})
    note_data = data.get("notenempfehlung", {})

    table = Table(
        title=f"[{STYLE_HEADING}]{fname}[/{STYLE_HEADING}]",
        box=box.ROUNDED,
        show_lines=True,
        border_style="dim",
        title_style=STYLE_BRAND,
    )
    table.add_column("Kriterium", style="bold", min_width=20)
    table.add_column("Stufe", min_width=30)
    table.add_column("Punkte", justify="center", width=8)

    for key, crit in bewertung.items():
        if not isinstance(crit, dict):
            continue
        # Farbliche Kodierung der Punkte
        punkte = crit.get("punkte", 0)
        if isinstance(punkte, (int, float)):
            if punkte >= 4:
                punkte_str = f"[{STYLE_SUCCESS}]{punkte}[/{STYLE_SUCCESS}]"
            elif punkte >= 2.5:
                punkte_str = f"[{STYLE_WARNING}]{punkte}[/{STYLE_WARNING}]"
            else:
                punkte_str = f"[{STYLE_ERROR}]{punkte}[/{STYLE_ERROR}]"
        else:
            punkte_str = str(punkte)

        label = key.replace("_", " ").title()
        table.add_row(label, str(crit.get("stufe", "?")), punkte_str)

    # Trennlinie visuell
    table.add_section()

    schnitt = note_data.get("durchschnitt", "?")
    note = note_data.get("note", "?")
    bez = note_data.get("bezeichnung", "?")

    # Note farblich kodieren
    if isinstance(note, int):
        if note <= 2:
            note_style = STYLE_SUCCESS
        elif note <= 3:
            note_style = STYLE_WARNING
        else:
            note_style = STYLE_ERROR
    else:
        note_style = ""

    table.add_row(
        "[bold]Durchschnitt[/bold]", "", str(schnitt)
    )
    table.add_row(
        "[bold]Note[/bold]",
        f"[{note_style}]{note} – {bez}[/{note_style}]",
        "",
    )

    console.print(table)
```

---

## Aenderung 6: Abstände und Trennlinien

Grundregel: Zwischen logischen Bloecken immer eine Leerzeile. Nie zwei Bloecke direkt aufeinander.

Nutze `console.print()` (leere Zeile) und `console.rule()` sparsam:
- `console.rule()` nur fuer Hauptabschnitte (Dateiauswahl, Review, DOCX-Generierung)
- Zwischen InquirerPy-Prompts keine rule, nur eine Leerzeile
- Nach Tabellen immer eine Leerzeile

---

## Aenderung 7: Ergebnis-Screen aufwerten

Statt:
```
OK  deutsch_digga_feedback.docx
    → output/deutsch_digga_feedback.docx
```

Besser:
```python
def show_generation_result(console: Console, results: list[tuple[str, Path, bool]]) -> None:
    console.print()
    for name, path, success in results:
        if success:
            console.print(f"  [green]✓[/green]  [bold]{name}[/bold]")
            console.print(f"     [{STYLE_DIM}]{path}[/{STYLE_DIM}]")
        else:
            console.print(f"  [red]✗[/red]  [bold]{name}[/bold]")
    console.print()
```

---

## Zusammenfassung aller Aenderungen

| Nr | Was | Wo | Art |
|----|-----|-----|-----|
| 1 | Schlankeres Logo | `show_banner()` | Ersetzen |
| 2 | Farbschema-Konstanten | Dateianfang + überall | Neu + Refactor |
| 3 | Schritt-Indikator | `show_step()` + in jedem Wizard-Schritt | Neu |
| 4 | Zuordnungs-Zusammenfassung | `step_assignment()` | Ergänzen |
| 5 | Review-Tabelle mit Farbkodierung | `step_review()` | Verbessern |
| 6 | Konsistente Abstände | Überall | Polishing |
| 7 | Ergebnis-Darstellung | `_generate_docx()` | Verbessern |

## Nicht ändern

- generate_feedback.py, feedback_schema.json, rubrics/*, tests/*
- Die Wizard-Logik (Reihenfolge der Schritte, InquirerPy-Abläufe) bleibt gleich
- Nur die visuelle Darstellung ändert sich

---

*Design-Prompt für GLM 5.1*
*Erstellt: 2026-04-10, Claude Opus via claude.ai*
