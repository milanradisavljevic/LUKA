# NATASCHA TUI – Vollwertiges Textual-Dashboard (zugewiesen an GLM)

> Kontext: Bisheriger Wizard mit rich + InquirerPy funktioniert, ist aber linear und limitiert.
> Ziel: Vollwertiges Textual-Dashboard im Stil von lazygit / k9s / gh dash.
> Erstellt: 2026-04-10 von Claude Opus

---

## Wichtige Vorab-Info

Ja, wir haben Textual schonmal versucht und es ist gescheitert. Der Grund war NICHT Textual selbst, sondern der Ansatz: 5 Wizard-Screens mit Widget-IDs aus Dateinamen. BadIdentifier-Crash.

Diesmal machen wir es richtig: Ein Dashboard-Layout, kein Wizard. Drei Panels gleichzeitig sichtbar, Tastatur-Navigation, modale Dialoge fuer Details.

Behalte den bisherigen Code (`natascha_tui.py`) als `natascha_wizard.py` bei. Der neue Code kommt als `natascha.py` (neue Hauptdatei).

---

## Vorbereitung

Lies zuerst:

1. `natascha_tui.py` (aktueller Wizard – die Logik-Funktionen sind alle gut und werden uebernommen)
2. `generate_feedback.py` (Modul-Integration)
3. `feedback_schema.json`
4. `natascha_config.toml`
5. `rubrics/` (Rubrik-Auswahl-Logik)

Die folgenden Funktionen aus `natascha_tui.py` sollen 1:1 uebernommen werden (in eine neue `natascha_core.py` ausgelagert):

- `load_config`, `resolve_path`, `count_words`, `read_docx_text`
- `load_rubric`, `load_schema`, `load_example_fixture`
- `build_analysis_prompt`, `extract_json_from_llm`, `validate_against_schema`
- `build_project_paths`, `log_tui_error`
- `rubric_options_for`, `default_rubric_for`
- `copy_to_clipboard`
- `run_anthropic_api` (aus v5, falls schon implementiert)
- `check_agent_availability` (aus v5)

Damit ist `natascha_core.py` der gemeinsame Unterbau fuer Wizard und Dashboard.

---

## Layout

```
┌─ NATASCHA – Korrektur-Agent ──────────────────────────────────────────────────┐
│  API: ✓  Klasse: 6i (28 Dateien)                                       v0.4.0 │
├──────────────────────┬────────────────────────────┬───────────────────────────┤
│ DATEIEN              │ ZUORDNUNG                  │ VORSCHAU                  │
│ ─────────────        │ ─────────────              │ ─────────────             │
│ Suche: ___________   │                            │                           │
│                      │ Datei:                     │ Was ist Bitte Quark?      │
│ ▶ kommentar.docx  ●  │   kommentar.docx           │                           │
│   464 W           │  │                            │ "Für das Rezept brauchen  │
│ ─                    │ Fach:        Deutsch       │ wir noch 200g Quark..."   │
│   digga.docx      ○  │ Schulstufe:  Unterstufe    │ Piefke, würde man sich    │
│   260 W           │  │ Textsorte:   Kommentar     │ an dieser Stelle denken.  │
│ ─                    │ Rubrik:      deutsch_un... │ Doch wenn man solche      │
│   essay_emma.docx ●  │                            │ Hochdeutschen Wörter von  │
│   612 W           │  │ Note: 3 – Befriedigend     │ Influencer*innen hört...  │
│ ─                    │ ⌀ 2.75                     │                           │
│   ...                │                            │ Stärken:                  │
│                      │ ┌─ Kriterien ────────────┐ │   + Klarer Hauptthese     │
│ 28 Dateien           │ │ Inhalt        2  ●●○○○ │ │   + Drei Aspekte          │
│ ● 12 analysiert      │ │ Textstruktur  3  ●●●○○ │ │                           │
│ ○ 16 offen           │ │ Ausdruck      3  ●●●○○ │ │ Schwächen:                │
│                      │ │ Sprache       3  ●●●○○ │ │   - Keine Pro/Contra      │
│ [+ Datei hinzufügen] │ └────────────────────────┘ │                           │
│                      │                            │                           │
├──────────────────────┴────────────────────────────┴───────────────────────────┤
│ [↑↓] Navigieren  [a] Analyse  [r] Review  [d] DOCX  [s] Settings  [?] Hilfe  │
│ [/] Suche  [Tab] Panel wechseln  [Enter] Aktion  [q] Beenden                  │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Layout-Aufbau

- **Header (Zeile 1-2):** Titel + Status (API verfuegbar, aktive Klasse, Anzahl Dateien, Versionsnummer)
- **Hauptbereich (3-spaltig):**
  - **Links (25%):** Dateiliste mit Suche, Status-Indikatoren, Counter unten
  - **Mitte (40%):** Detail/Bearbeitung der aktuell ausgewaehlten Datei
  - **Rechts (35%):** Vorschau – wechselt zwischen Schuelertext und Bewertungs-Details
- **Footer (Zeile -2 bis -1):** Tastatur-Shortcuts (Textual `Footer`-Widget mit Bindings)

### Status-Indikatoren in der Dateiliste

| Symbol | Bedeutung |
|--------|-----------|
| `●` (gruen) | Vollstaendig analysiert + DOCX generiert |
| `●` (gelb) | Analysiert, DOCX noch nicht generiert |
| `◐` (cyan) | Analyse laeuft gerade |
| `○` (dim) | Noch nicht analysiert |
| `✗` (rot) | Fehler bei letzter Analyse |

---

## Navigation

### Globale Tastatur-Shortcuts

| Taste | Aktion |
|-------|--------|
| `q` / `Ctrl+C` | Beenden (mit Bestaetigung) |
| `?` / `F1` | Hilfe-Dialog |
| `s` | Settings-Dialog |
| `Tab` | Panel-Fokus wechseln (Files → Mitte → Vorschau) |
| `/` | Suche im Dateilisten-Panel aktivieren |

### Aktionen auf der ausgewaehlten Datei

| Taste | Aktion |
|-------|--------|
| `↑` / `↓` | In der Dateiliste navigieren |
| `Space` | Datei zur Batch-Auswahl markieren |
| `a` | Analyse starten (einzeln oder Batch) |
| `r` | Review-Dialog oeffnen (modaler Vollbild-Screen) |
| `d` | DOCX generieren |
| `e` | Edit-Modus fuer Zuordnung (Fach/Schulstufe/Textsorte/Rubrik) |
| `Enter` | Vorschau zwischen Schuelertext und Bewertung umschalten |
| `Del` | Datei aus der Liste entfernen (DOCX bleibt) |

### Batch-Operationen

- Mehrere Dateien mit `Space` markieren
- `Shift+A`: Analyse fuer alle markierten Dateien starten (sequentiell, mit Fortschrittsanzeige)
- `Shift+D`: DOCX fuer alle markierten Dateien generieren
- `a` ohne Markierung: nur die aktuell fokussierte Datei

---

## Skalierung auf 28 Dateien (ganze Klasse)

### Suche (`/`)

- Filtert die Dateiliste in Echtzeit (case-insensitive substring match)
- Esc beendet die Suche, Enter springt zum ersten Treffer
- Suchfeld als `Input`-Widget oben in der Dateiliste

### Sortierung

- Default: alphabetisch
- `o` toggelt zwischen: Name / Status (analysiert zuerst) / Wortzahl
- Sortierreihenfolge im Header der Dateiliste anzeigen

### Virtual Scrolling

Bei 28 Dateien noch nicht kritisch, aber `ListView` von Textual nutzt es automatisch. Bei 100+ Dateien wuerde es relevant.

### Counter unten in der Dateiliste

```
28 Dateien
● 12 analysiert
○ 16 offen
```

Bei aktiver Suche zusaetzlich:
```
12 / 28 angezeigt
```

---

## Modaler Review-Dialog (Taste `r`)

Wenn `r` gedrueckt wird, oeffnet sich ein modaler Vollbild-Screen ueber dem Dashboard:

```
╭─ Review: kommentar.docx ────────────────────────────────────────────────────╮
│                                                                              │
│  Note: 3 – Befriedigend          Durchschnitt: 2.75                          │
│                                                                              │
│  ╭─ Inhalt ─ 2 Punkte (●●○○○) ────────────────────────────────────────────╮  │
│  │ Stufe: im Wesentlichen richtig                                         │  │
│  │                                                                        │  │
│  │ Stärken:                                                               │  │
│  │   + Klare Hauptthese erkennbar                                         │  │
│  │   + Drei thematische Aspekte angesprochen                              │  │
│  │   + Bezug zum Ausgangstext vorhanden                                   │  │
│  │                                                                        │  │
│  │ Schwächen:                                                             │  │
│  │   - Keine Pro/Contra-Argumentation                                     │  │
│  │   - 3B-Schema kaum erkennbar                                           │  │
│  │                                                                        │  │
│  │ Vorschläge:                                                            │  │
│  │   > Mindestens ein Gegenargument einbauen                              │  │
│  │   > Jeden Absatz nach 3B-Schema aufbauen                               │  │
│  ╰────────────────────────────────────────────────────────────────────────╯  │
│                                                                              │
│  ╭─ Textstruktur ─ 3 Punkte (●●●○○) ──────────────────────────────────────╮  │
│  │ ...                                                                    │  │
│  ╰────────────────────────────────────────────────────────────────────────╯  │
│                                                                              │
│  [↑↓] Scrollen  [e] Editieren (JSON)  [d] DOCX  [Esc] Schließen             │
╰──────────────────────────────────────────────────────────────────────────────╯
```

- `Collapsible`-Widgets fuer jedes Kriterium (klappbar)
- Punkte als ASCII-Bar (●●○○○ fuer 2/5)
- Farben: Stärken gruen, Schwächen rot, Vorschläge cyan
- `e` oeffnet die JSON-Datei in $EDITOR (TUI suspendieren, danach Validierung)

---

## Analyse-Lauf mit Live-Updates

Wenn `a` (oder `Shift+A`) gedrueckt wird:

1. Modaler Progress-Dialog oeffnet sich
2. Pro Datei: Spinner + Status-Text
3. Bei Erfolg: ✓ Datei-Status in der Hauptliste sofort aktualisieren
4. Bei Fehler: ✗ + Fehler in einer ausklappbaren Sektion

```
╭─ Analyse läuft ─────────────────────────────────────╮
│                                                      │
│  ⠋ kommentar.docx                                    │
│    Sende an Anthropic API...                         │
│                                                      │
│  ⏳ digga.docx        (in Warteschlange)             │
│  ⏳ essay_emma.docx   (in Warteschlange)             │
│                                                      │
│  Fortschritt: 1/3                                    │
│  ████████░░░░░░░░░░░░░░░░  33%                       │
│                                                      │
│  [Esc] Abbrechen                                     │
╰──────────────────────────────────────────────────────╯
```

Verwende `textual.worker` (`@work` Decorator) fuer asynchrone API-Calls, damit das UI nicht blockiert.

---

## Settings-Dialog (Taste `s`)

Modaler Dialog mit allen Konfigurations-Optionen:

```
╭─ Einstellungen ─────────────────────────────────────╮
│                                                      │
│  ╭─ Pfade ────────────────────────────────────────╮  │
│  │ Input:    /home/milan/dev/Natascha3/input      │  │
│  │ Output:   /home/milan/dev/Natascha3/output     │  │
│  │ Rubrics:  /home/milan/dev/Natascha3/rubrics    │  │
│  ╰────────────────────────────────────────────────╯  │
│                                                      │
│  ╭─ API ──────────────────────────────────────────╮  │
│  │ Status:   ✓ Verbunden                          │  │
│  │ Provider: anthropic                            │  │
│  │ Model:    [claude-sonnet-4-6 ▼]                │  │
│  │ Key:      sk-ant-...***xyz                     │  │
│  │ [API testen]                                   │  │
│  ╰────────────────────────────────────────────────╯  │
│                                                      │
│  ╭─ CLI-Agents ───────────────────────────────────╮  │
│  │ ✓ claude   /usr/local/bin/claude               │  │
│  │ ✓ codex    /home/milan/.local/bin/codex        │  │
│  │ ✗ qwen     nicht installiert                   │  │
│  │ ✗ glm      nicht installiert                   │  │
│  ╰────────────────────────────────────────────────╯  │
│                                                      │
│  ╭─ Defaults ─────────────────────────────────────╮  │
│  │ Fach:        [Deutsch ▼]                       │  │
│  │ Schulstufe:  [Oberstufe ▼]                     │  │
│  ╰────────────────────────────────────────────────╯  │
│                                                      │
│  [Konfigurationsdatei öffnen]  [Esc] Schließen      │
╰──────────────────────────────────────────────────────╯
```

---

## API-Modus als Default (deine Entscheidung 3)

Da API-Modus jetzt der primaere Weg ist:

1. **Beim Start:** Pruefe ob `ANTHROPIC_API_KEY` gesetzt ist und `anthropic`-Paket installiert ist
2. **Wenn ja:** API ist aktiv, wird im Header angezeigt (`API: ✓`)
3. **Wenn nein:** Header zeigt `API: ✗` in gelb, beim Start einmaliger Hinweis-Dialog mit Setup-Anleitung
4. **CLI-Agents** sind weiterhin als Fallback verfuegbar, aber im Settings-Dialog versteckt (nicht im Hauptmenue)
5. **"Welcher Agent?"-Auswahl entfaellt komplett.** `a` startet sofort die Analyse via API.
6. Falls API nicht verfuegbar UND CLI-Agents vorhanden: einmalige Auswahl, dann persistent in Config

### Setup-Hinweis-Dialog (nur beim ersten Start ohne API)

```
╭─ API-Modus einrichten ──────────────────────────────╮
│                                                      │
│  NATASCHA nutzt standardmäßig die Anthropic API     │
│  für Korrekturen. Diese ist nicht eingerichtet.     │
│                                                      │
│  So aktivierst du sie:                               │
│                                                      │
│  1. API-Key besorgen:                                │
│     https://console.anthropic.com/                   │
│                                                      │
│  2. Paket installieren:                              │
│     pip install anthropic                            │
│                                                      │
│  3. Key als Umgebungsvariable setzen:                │
│     export ANTHROPIC_API_KEY="sk-ant-..."            │
│                                                      │
│  Alternativ kannst du auch CLI-Agents verwenden     │
│  (claude, codex, qwen, glm), wenn sie installiert    │
│  sind.                                               │
│                                                      │
│  [API einrichten]  [CLI-Agent verwenden]  [Später]  │
╰──────────────────────────────────────────────────────╯
```

---

## Wichtigste Textual-Patterns die du brauchst

### Widget-IDs sicher generieren

DAS war der Bug beim ersten Versuch. Loesung:

```python
import hashlib

def safe_id(prefix: str, raw: str) -> str:
    """Erzeugt eine gueltige Textual-ID aus beliebigem String."""
    digest = hashlib.md5(raw.encode()).hexdigest()[:8]
    return f"{prefix}-{digest}"
```

Dann statt `id=f"cb-{filename}"` immer `id=safe_id("cb", filename)`.

Mapping zwischen Hash und Original-Dateiname in einem Dict speichern.

### Reactive State

Nutze `reactive` Attribute fuer den App-State:

```python
from textual.reactive import reactive

class NataschaApp(App):
    selected_file: reactive[Path | None] = reactive(None)
    files_data: reactive[dict] = reactive({})

    def watch_selected_file(self, old, new):
        # Wird automatisch aufgerufen wenn sich selected_file aendert
        self.update_middle_panel()
        self.update_preview_panel()
```

### Async Workers fuer API-Calls

```python
from textual import work

class NataschaApp(App):
    @work(thread=True)
    def analyze_file(self, path: Path) -> None:
        # Laeuft im Thread, blockiert UI nicht
        result = run_anthropic_api(prompt, model)
        self.call_from_thread(self.update_after_analysis, path, result)
```

### Modal Screens

```python
from textual.screen import ModalScreen

class ReviewScreen(ModalScreen):
    BINDINGS = [
        ("escape", "dismiss", "Schließen"),
        ("e", "edit_json", "Editieren"),
        ("d", "generate_docx", "DOCX"),
    ]

    def compose(self) -> ComposeResult:
        yield Container(
            # ... Inhalt ...
        )
```

### CSS

Externe `.tcss`-Datei statt inline. Erstelle `natascha.tcss`:

```css
/* Layout */
#main-container {
    layout: horizontal;
    height: 1fr;
}

#files-panel {
    width: 25%;
    border: solid $primary;
    padding: 1;
}

#middle-panel {
    width: 40%;
    border: solid $primary;
    padding: 1;
}

#preview-panel {
    width: 35%;
    border: solid $primary;
    padding: 1;
}

/* Status-Indikatoren */
.status-done {
    color: $success;
}

.status-progress {
    color: $accent;
}

.status-pending {
    color: $text-muted;
}

.status-error {
    color: $error;
}

/* ... */
```

---

## Datei-Struktur nach diesem Schritt

```
natascha.py              # Neue Hauptdatei (Textual-Dashboard)
natascha_core.py         # Geteilte Logik-Funktionen (aus natascha_tui.py)
natascha_wizard.py       # Bisherige TUI (umbenannt, bleibt als Fallback)
natascha.tcss            # Textual CSS
natascha_config.toml     # Unverändert
generate_feedback.py     # Unverändert
feedback_schema.json     # Unverändert
rubrics/                 # Unverändert
tests/                   # Unverändert
```

CLI-Aufruf:
- `python natascha.py` → neues Dashboard
- `python natascha_wizard.py` → alter Wizard (Fallback)

---

## Lieferumfang

| Datei | Aktion |
|-------|--------|
| `natascha.py` | Neu erstellen (Textual App) |
| `natascha_core.py` | Neu erstellen (extrahierte Logik) |
| `natascha_wizard.py` | Umbenennen von natascha_tui.py |
| `natascha.tcss` | Neu erstellen (Styling) |
| `requirements_tui.txt` | Aktualisieren (textual statt rich+InquirerPy als Hauptabhängigkeit) |
| `INTEGRATION_NOTES.md` | Aktualisieren |
| `CHANGELOG.md` | Eintrag für v0.4.0 |

## Nicht ändern

- `generate_feedback.py`
- `feedback_schema.json`
- `natascha_config.toml` (außer wenn neue Settings nötig sind)
- `rubrics/*`
- `tests/*`

---

## Wichtige Lessons Learned aus dem ersten Textual-Versuch

1. **NIE Dateinamen oder andere User-Inputs als Widget-IDs verwenden.** Immer hashen oder sequentielle IDs nehmen.
2. **Reactive State statt Screen-Hopping.** Ein Dashboard, kein Wizard mit fünf Screens.
3. **Async Workers für alles was länger als 100ms dauert.** API-Calls, Datei-I/O, Subprocess.
4. **CSS in eigene Datei.** Inline-Styles werden schnell unübersichtlich.
5. **Bindings im Footer anzeigen lassen.** Textual macht das automatisch wenn man `BINDINGS = [...]` definiert.

---

*Dashboard-Prompt für GLM 5.1*
*Erstellt: 2026-04-10, Claude Opus via claude.ai*
