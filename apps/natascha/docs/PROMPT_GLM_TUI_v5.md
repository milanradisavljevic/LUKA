# NATASCHA TUI – Polishing v5 (zugewiesen an GLM)

> Kontext: TUI funktioniert, aber drei klare Probleme:
> 1. Markup-Bug bei InquirerPy-Prompts
> 2. Falsche CLI-Befehle (qwen --no-stream existiert nicht)
> 3. Agent-Integration halbgar – Subprocess-CLI ist fragil
> Erstellt: 2026-04-10 von Claude Opus

---

## Aenderung 1: Bugfix Markup in InquirerPy

**Problem:** In `step_assignment()` wird der Dateiname mit `[bold]...[/bold]` gewrappt und an `inquirer.select(message=...)` uebergeben. InquirerPy interpretiert kein Rich-Markup – das Tag erscheint als Literal:

```
? [bold]Kommentar -Krass, Digga!...- Matthias Bachler.docx[/bold] (464 Wörter) – Fach
```

**Loesung:** Markup vor dem Datei-Block via `console.print()` ausgeben, dann InquirerPy ohne Markup verwenden.

```python
def step_assignment(files, config, console):
    assignments = []
    defaults = config.get("defaults", {})

    for docx_path in files:
        wc = count_words(docx_path)

        # Header via console.print (Rich-Markup funktioniert hier)
        console.print()
        console.print(f"  [bold cyan]●[/bold cyan] [bold]{docx_path.name}[/bold]  [dim]({wc} Wörter)[/dim]")
        console.print()

        # InquirerPy ohne Markup
        fach = inquirer.select(
            message="Fach",
            choices=["Deutsch", "Englisch"],
            default=defaults.get("fach", "Deutsch"),
        ).execute()

        # ... rest unverändert
```

Pruefe alle anderen Stellen, wo Rich-Markup in InquirerPy-Messages landen koennte – und ziehe es heraus.

---

## Aenderung 2: Korrekte CLI-Befehle

Aktualisiere `natascha_config.toml`:

```toml
[agent.commands]
# Claude Code: Non-interaktiv mit --print
claude = "claude --print"

# Codex CLI: Non-interaktiv mit exec
codex = "codex exec"

# Qwen Code: -p/--prompt für Non-Interactive
qwen = "qwen -p"

# GLM (Z.AI): Wahrscheinlich glm-cli oder zai-cli, je nach Installation
glm = "glm"
```

Und in `run_agent_sync()`:

Aktuell wird `$PROMPT` als Env-Variable gesetzt und der Befehl per bash ausgefuehrt. Das ist umstaendlich und fragil. Besser: Prompt direkt via `stdin` oder als Argument uebergeben.

```python
def run_agent_sync(cmd_template: str, prompt: str, timeout: int) -> str:
    """Fuehrt einen CLI-Agent aus und gibt die Antwort zurueck."""
    parts = cmd_template.split()
    try:
        result = subprocess.run(
            parts,
            input=prompt,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            return f"FEHLER (Exit {result.returncode}): {result.stderr[:500]}"
        return result.stdout
    except subprocess.TimeoutExpired:
        return f"FEHLER: Timeout nach {timeout}s"
    except FileNotFoundError as e:
        return f"FEHLER: Befehl nicht gefunden: {e}"
```

Vorteile:
- Kein bash-Wrapping
- Kein Shell-Escaping fuer den Prompt noetig
- Sauber lesbarer Befehl in der Config

---

## Aenderung 3: Agent-Verfuegbarkeit pruefen

Die TUI sollte beim Start (oder im Settings-Menue) anzeigen, welche Agents tatsaechlich verfuegbar sind.

```python
def check_agent_availability(config: dict) -> dict[str, bool]:
    """Prueft welche konfigurierten Agents im PATH gefunden werden."""
    commands = config.get("agent", {}).get("commands", {})
    availability = {}
    for name, cmd in commands.items():
        binary = cmd.split()[0]
        try:
            result = subprocess.run(
                ["which", binary],
                capture_output=True,
                timeout=2,
            )
            availability[name] = result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            availability[name] = False
    return availability
```

Im Settings-Screen anzeigen:

```python
def show_settings(config, console):
    # ... bestehender Code ...

    console.print()
    console.print("[bold]Agent-Verfügbarkeit:[/bold]")

    availability = check_agent_availability(config)
    for name, available in availability.items():
        cmd = config["agent"]["commands"][name]
        if available:
            console.print(f"  [green]✓[/green]  [cyan]{name}[/cyan]  [dim]{cmd}[/dim]")
        else:
            console.print(f"  [red]✗[/red]  [cyan]{name}[/cyan]  [dim]nicht installiert[/dim]")
```

Im Agent-Auswahl-Screen ebenfalls nur verfuegbare Agents anbieten:

```python
def _run_agent(...):
    availability = check_agent_availability(config)
    available_agents = [name for name, ok in availability.items() if ok]

    if not available_agents:
        console.print("[red]Keine CLI-Agents verfügbar.[/red]")
        console.print("[dim]Tipp: Nutze stattdessen 'Prompt in Zwischenablage kopieren' und füge ihn manuell in einen LLM ein.[/dim]")
        return

    agent_choices = [
        Choice(value=name, name=f"{name}")
        for name in available_agents
    ]
    # ... rest ...
```

---

## Aenderung 4: API-Modus als zweite Option

Du hast Recht: Subprocess ist fragil, API ist stabiler. Aber API braucht Auth.

**Pragmatischer Ansatz:** API-Modus als optionale Erweiterung, nur fuer Anthropic Claude (weil du dort einen Key hast).

### 4a. Config erweitern

```toml
[api]
# Falls aktiviert: API-Calls statt CLI-Subprocess
enabled = false
provider = "anthropic"  # aktuell nur anthropic unterstuetzt
model = "claude-sonnet-4-6"
# API-Key wird aus Umgebungsvariable ANTHROPIC_API_KEY gelesen
# (NICHT in der Config speichern!)
```

### 4b. API-Call-Funktion

```python
def run_anthropic_api(prompt: str, model: str, timeout: int = 120) -> str:
    """Ruft die Anthropic API direkt auf."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return "FEHLER: ANTHROPIC_API_KEY nicht gesetzt"

    try:
        import anthropic
    except ImportError:
        return "FEHLER: anthropic-Paket nicht installiert (pip install anthropic)"

    client = anthropic.Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model=model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
            timeout=timeout,
        )
        # Antwort extrahieren
        if response.content and len(response.content) > 0:
            return response.content[0].text
        return "FEHLER: Leere Antwort"
    except Exception as e:
        return f"FEHLER: API-Aufruf fehlgeschlagen: {e}"
```

### 4c. Im Analyse-Menue als Option

```python
def step_analysis(...):
    api_enabled = config.get("api", {}).get("enabled", False)

    choices = [
        Choice(value="clipboard", name="Prompt in Zwischenablage kopieren"),
        Choice(value="anzeigen", name="Prompt anzeigen"),
    ]

    if api_enabled:
        choices.append(Choice(value="api", name="Über Anthropic API analysieren (empfohlen)"))

    # CLI-Agent nur anbieten wenn welche verfuegbar sind
    availability = check_agent_availability(config)
    if any(availability.values()):
        choices.append(Choice(value="agent", name="CLI-Agent starten"))

    choices.extend([
        Choice(value="json_laden", name="JSON-Datei manuell laden"),
        Choice(value="weiter", name="Weiter zum Review"),
    ])

    mode = inquirer.select(message="Wie soll die Analyse durchgeführt werden?", choices=choices).execute()
```

### 4d. requirements_tui.txt ergaenzen

```
rich>=13.0
InquirerPy>=0.3.4
python-docx>=1.1.0
jsonschema>=4.20
anthropic>=0.40.0  # optional, nur fuer API-Modus
pyfiglet>=1.0.0    # optional, nur fuer Logo
```

### 4e. Setup-Hinweis

Erstelle eine `SETUP_API.md` im Projektroot:

```markdown
# API-Modus aktivieren

Der API-Modus erlaubt direkte Aufrufe an die Anthropic API ohne CLI-Subprocess.

## Voraussetzungen

1. Anthropic API-Key besorgen: https://console.anthropic.com/
2. Paket installieren:
   ```bash
   pip install anthropic
   ```
3. API-Key als Umgebungsvariable setzen:
   ```bash
   # Einmalig in der aktuellen Session:
   export ANTHROPIC_API_KEY="sk-ant-..."

   # Dauerhaft (in ~/.bashrc oder ~/.zshrc):
   echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
   source ~/.bashrc
   ```
4. In `natascha_config.toml`:
   ```toml
   [api]
   enabled = true
   provider = "anthropic"
   model = "claude-sonnet-4-6"
   ```

## Kosten

Pro Schularbeit ca. 0,02 – 0,05 USD bei Sonnet, je nach Textlänge und Rubrik.
Bei Opus entsprechend höher (ca. 5x).
```

---

## Aenderung 5: Einstellungs-Menü erweitern

Aktuell ist das Settings-Menue read-only. Mache es interaktiv:

```python
def show_settings(config, console):
    while True:
        # Tabelle anzeigen wie bisher
        # ...

        action = inquirer.select(
            message="Was möchtest du tun?",
            choices=[
                Choice(value="check_agents", name="Agent-Verfügbarkeit prüfen"),
                Choice(value="test_api", name="API-Verbindung testen"),
                Choice(value="open_config", name="Konfigurationsdatei im Editor öffnen"),
                Choice(value="zurueck", name="Zurück"),
            ],
        ).execute()

        if action == "check_agents":
            _check_and_show_agents(config, console)
        elif action == "test_api":
            _test_api_connection(config, console)
        elif action == "open_config":
            _open_config_in_editor(config, console)
        elif action == "zurueck":
            break
```

---

## Aenderung 6: Hilfetext und First-Run-Erkennung

Wenn die TUI zum ersten Mal startet (z.B. erkannt durch Abwesenheit eines Markers wie `~/.natascha_first_run_done`), zeige einen Willkommens-Bildschirm:

```python
def show_first_run_help(console):
    console.print()
    console.print(Panel(
        "[bold cyan]Willkommen bei NATASCHA![/bold cyan]\n\n"
        "Diese Anwendung hilft dir beim Korrigieren von Schularbeiten.\n\n"
        "[bold]So funktioniert's:[/bold]\n"
        "  1. Lege deine .docx-Dateien in den [cyan]input/[/cyan]-Ordner\n"
        "  2. Starte »Neue Korrektur« im Hauptmenü\n"
        "  3. Wähle Fach, Schulstufe und Textsorte\n"
        "  4. Lass den LLM die Arbeit analysieren (per API oder CLI)\n"
        "  5. Die Notenempfehlung wird als Word-Dokument im output/-Ordner gespeichert\n\n"
        "[dim]Tipp: Im Hauptmenü unter »Einstellungen« findest du alle Konfigurationsoptionen.[/dim]",
        border_style="cyan",
        padding=(1, 2),
    ))
    console.print()
    inquirer.confirm(message="Verstanden, los geht's?", default=True).execute()
```

Marker-Datei nach dem ersten Start anlegen:
```python
marker = Path.home() / ".natascha_first_run_done"
if not marker.exists():
    show_first_run_help(console)
    marker.touch()
```

---

## Aenderung 7: Bessere Fehlermeldungen

Aktuell:
```
FEHLER (Exit 1): bash: line 1: glm: command not found
```

Besser: Fehler abfangen, eindeutschen, Loesung anbieten:

```python
def humanize_agent_error(error: str, agent_name: str) -> str:
    """Macht aus technischen Fehlern lesbare Hinweise."""
    if "command not found" in error or "not found" in error:
        return (
            f"Der Agent »{agent_name}« ist nicht installiert.\n"
            f"  Tipp: Nutze stattdessen einen anderen Agent oder den Zwischenablage-Modus."
        )
    if "Timeout" in error:
        return (
            f"Der Agent »{agent_name}« hat zu lange gebraucht.\n"
            f"  Tipp: Erhöhe den Timeout in den Einstellungen oder nutze einen anderen Agent."
        )
    if "API" in error and "key" in error.lower():
        return (
            f"API-Schlüssel fehlt oder ist ungültig.\n"
            f"  Tipp: Setze ANTHROPIC_API_KEY und prüfe die Verbindung im Einstellungsmenü."
        )
    return error  # Fallback
```

---

## Zusammenfassung

| Nr | Was | Priorität | Datei |
|----|-----|-----------|-------|
| 1 | Markup-Bug in InquirerPy fixen | HOCH | natascha_tui.py |
| 2 | CLI-Befehle korrigieren | HOCH | natascha_config.toml + run_agent_sync |
| 3 | Agent-Verfügbarkeit prüfen | MITTEL | natascha_tui.py |
| 4 | Anthropic API-Modus | MITTEL | natascha_tui.py + Config + SETUP_API.md |
| 5 | Settings interaktiv | NIEDRIG | show_settings() |
| 6 | First-Run-Hilfe | NIEDRIG | main() |
| 7 | Bessere Fehlermeldungen | MITTEL | humanize_agent_error() |

## Nicht ändern

- generate_feedback.py
- feedback_schema.json
- rubrics/*
- tests/*

---

*Polishing-Prompt für GLM 5.1*
*Erstellt: 2026-04-10, Claude Opus via claude.ai*
