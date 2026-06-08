# NATASCHA TUI – Feinschliff-Prompt v3 (zugewiesen an GLM)

> Kontext: Die TUI mit rich + InquirerPy funktioniert. Drei Verbesserungen noetig.
> Erstellt: 2026-04-10 von Claude Opus

---

## Aenderung 1: ASCII-Art-Logo

Ersetze den aktuellen Banner in `show_banner()` durch ein ASCII-Art-Logo.

Verwende dieses Logo (oder erzeuge ein vergleichbares mit pyfiglet/rich):

```
 ███╗   ██╗ █████╗ ████████╗ █████╗ ███████╗ ██████╗██╗  ██╗ █████╗
 ████╗  ██║██╔══██╗╚══██╔══╝██╔══██╗██╔════╝██╔════╝██║  ██║██╔══██╗
 ██╔██╗ ██║███████║   ██║   ███████║███████╗██║     ███████║███████║
 ██║╚██╗██║██╔══██║   ██║   ██╔══██║╚════██║██║     ██╔══██║██╔══██║
 ██║ ╚████║██║  ██║   ██║   ██║  ██║███████║╚██████╗██║  ██║██║  ██║
 ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝
```

Darunter in klein (mit rich.text oder Console.print):
```
 Normbasierte Analyse von Textproduktionen
 Automatisierte Schularbeits-Correction als Hilfe-Agent
```

Hinweise:
- Das Logo darf in `rich` Farbe bekommen (z.B. Gradient blau→cyan oder einfach bold blue)
- Falls das Terminal zu schmal ist (<80 Spalten), Fallback auf den bisherigen Panel-Banner
- Terminalbreite pruefen: `console.width`
- Alternativ `pyfiglet` verwenden (`pip install pyfiglet`), Schriftart "slant" oder "standard" -- aber nur wenn installiert, sonst Fallback auf hartkodierten Block

---

## Aenderung 2: Prompt-Darstellung verbessern

Aktuell wird der gesamte Prompt als Textwand in einem einzigen Panel angezeigt.
Das ist bei 200+ Zeilen unlesbar. Aendere `_prompt_anzeigen()` wie folgt:

**Statt einem grossen Panel → mehrere farblich getrennte Abschnitte:**

```python
def _prompt_anzeigen(...):
    for a in assignments:
        if a["filename"] in results:
            continue

        docx_text = read_docx_text(a["path"])
        rubric_content = load_rubric(a["rubric"], config)

        console.print()
        console.rule(f"[bold]Prompt für {a['filename']}[/bold]")

        # Meta-Info kompakt
        meta_table = Table(box=box.SIMPLE, show_header=False, padding=(0, 2))
        meta_table.add_column("Key", style="bold")
        meta_table.add_column("Value")
        meta_table.add_row("Fach", a["fach"])
        meta_table.add_row("Schulstufe", a["schulstufe"])
        meta_table.add_row("Textsorte", a["textsorte"])
        meta_table.add_row("Rubrik", a["rubric"])
        console.print(meta_table)

        # Schülertext: nur Vorschau (erste 500 Zeichen)
        preview = docx_text[:500] + ("..." if len(docx_text) > 500 else "")
        console.print(Panel(
            preview,
            title="Schülertext (Vorschau)",
            border_style="green",
            padding=(1, 1),
        ))

        # Rubrik: nur Titel + erste 5 Zeilen
        rubric_preview = "\n".join(rubric_content.splitlines()[:8])
        console.print(Panel(
            rubric_preview + "\n[dim]...[/dim]",
            title="Bewertungsraster (Auszug)",
            border_style="cyan",
            padding=(1, 1),
        ))

        # JSON-Schema: nur Hinweis, nicht komplett anzeigen
        console.print("[dim]  JSON-Schema und Beispiel-JSON werden im Prompt mitgesendet.[/dim]")

        # Aktionen
        prompt = build_analysis_prompt(
            docx_text, rubric_content,
            a["fach"], a["schulstufe"], a["textsorte"], config,
        )
        action = inquirer.select(
            message="Was tun?",
            choices=[
                Choice(value="clipboard", name="Prompt in Zwischenablage kopieren"),
                Choice(value="full", name="Vollständigen Prompt anzeigen"),
                Choice(value="skip", name="Überspringen"),
            ],
        ).execute()

        if action == "clipboard":
            if copy_to_clipboard(prompt):
                console.print("[green]  In Zwischenablage kopiert.[/green]")
            else:
                console.print("[yellow]  Zwischenablage nicht verfügbar.[/yellow]")
                console.print(Panel(prompt, border_style="yellow"))
        elif action == "full":
            console.print(Panel(prompt, title="Vollständiger Prompt", border_style="blue"))
            inquirer.confirm(message="Weiter?", default=True).execute()
```

---

## Aenderung 3: Umlaute korrigieren

### Problem

Im gesamten Code und in der TUI-Anzeige werden konsequent ae/oe/ue statt ä/ö/ü verwendet.
Das war fuer Code-Kommentare und Dateinamen richtig, aber fuer die Benutzeranzeige falsch.

### Regel

| Wo | Umlaute |
|----|---------|
| Dateinamen (.py, .md, .json, .toml) | ae/oe/ue beibehalten (keine Umlaute in Pfaden) |
| Python-Variablennamen, Funktionsnamen, Schlüssel | ae/oe/ue beibehalten |
| Code-Kommentare und Docstrings | ae/oe/ue beibehalten (Konsistenz) |
| **Angezeigte Texte im Terminal (UI-Strings)** | **ä/ö/ü verwenden** |
| **Prompt-Text an den LLM** | **ä/ö/ü verwenden** |
| **Feedback-DOCX-Inhalte** | **ä/ö/ü verwenden** |

### Konkrete Stellen in natascha_tui.py

Ersetze in allen `console.print()`, `inquirer.*()` messages, und Panel-Titeln:

```
"Hauptmenue"          → "Hauptmenü"
"Woerter"             → "Wörter"
"Zurueck"             → "Zurück"
"Naechste"            → "Nächste"
"Ueberschreiben"      → "Überschreiben"
"Ueberspringen"       → "Überspringen"
"moechtest"           → "möchtest"
"oeffnen"             → "öffnen"
"Aendern"             → "Ändern"
"Uebersprungen"       → "Übersprungen"
"Loesungen"           → "Lösungen"
"Staerken"            → "Stärken"
"Schwaechen"          → "Schwächen"
"Verbesserungsvorschlaege" → "Verbesserungsvorschläge"
"verfuegbar"          → "verfügbar"
"geprueft"            → "geprüft"
"benoetigt"           → "benötigt"
"Schuelerarbeiten"    → "Schülerarbeiten"
"Schuelertext"        → "Schülertext"
"Schueler"            → "Schüler"
```

Allgemeine Regel: Jeder String der dem User angezeigt wird, bekommt echte Umlaute.

### Prompt-Text (build_analysis_prompt)

Auch hier Umlaute einsetzen:
```
"Du bist ein Korrekturassistent fuer oesterreichische Gymnasium-Schularbeiten."
→
"Du bist ein Korrekturassistent für österreichische Gymnasium-Schularbeiten."
```

Und analog alle anderen Stellen im Prompt-Template.

### WICHTIG: Nicht ändern

- Variablennamen bleiben ae/oe/ue: `notenempfehlung`, `staerken`, `schwaechen`, `vorschlaege`
- JSON-Keys bleiben ae/oe/ue: "staerken", "schwaechen", "vorschlaege"
- Dateinamen bleiben ae/oe/ue
- feedback_schema.json bleibt unverändert
- generate_feedback.py bleibt unverändert

---

## Zusammenfassung der Aenderungen

| Was | Datei | Art |
|-----|-------|-----|
| ASCII-Art-Logo | natascha_tui.py: `show_banner()` | Ersetzen |
| Prompt-Darstellung | natascha_tui.py: `_prompt_anzeigen()` | Neuschreiben |
| Umlaute in UI-Strings | natascha_tui.py: alle `console.print()` und `inquirer.*()` | Suchen/Ersetzen |
| Umlaute im LLM-Prompt | natascha_tui.py: `build_analysis_prompt()` | Suchen/Ersetzen |
| requirements_tui.txt | Optional: `pyfiglet` als optionale Abhaengigkeit | Ergaenzen |

## Nicht aendern

- generate_feedback.py
- feedback_schema.json
- natascha_config.toml
- rubrics/*
- tests/*

---

*Feinschliff-Prompt für GLM 5.1*
*Erstellt: 2026-04-10, Claude Opus via claude.ai*
