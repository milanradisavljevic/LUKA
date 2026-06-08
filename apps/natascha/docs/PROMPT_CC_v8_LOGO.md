# NATASCHA TUI v8 – Logo & Wow-Effekt (Claude Code)

## Problem
Aktuelles Logo (pyfiglet block font): "S" zerfaellt visuell, kein Wow-Effekt.

## Aufgabe 1: Hand-gepixeltes Logo statt pyfiglet

Ersetze das pyfiglet-Logo im `NataschaHeader` durch ein handgepixeltes ASCII-Logo. Speichere als Konstante in `natascha.py`:

```python
LOGO_FULL = r"""
███╗   ██╗  █████╗  ████████╗  █████╗  ███████╗  ██████╗ ██╗  ██╗  █████╗
████╗  ██║ ██╔══██╗ ╚══██╔══╝ ██╔══██╗ ██╔════╝ ██╔════╝ ██║  ██║ ██╔══██╗
██╔██╗ ██║ ███████║    ██║    ███████║ ███████╗ ██║      ███████║ ███████║
██║╚██╗██║ ██╔══██║    ██║    ██╔══██║ ╚════██║ ██║      ██╔══██║ ██╔══██║
██║ ╚████║ ██║  ██║    ██║    ██║  ██║ ███████║ ╚██████╗ ██║  ██║ ██║  ██║
╚═╝  ╚═══╝ ╚═╝  ╚═╝    ╚═╝    ╚═╝  ╚═╝ ╚══════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═╝  ╚═╝
"""
```

Das `S` aus Block-Zeichen ist sauber, weil es eckig statt diagonal ist. Verwende `███╗`-Style mit Schatten -- das wirkt 3D und modern.

## Aufgabe 2: Gradient-Faerbung mit rich

Statt einfarbig cyan: Vertikaler Gradient von Magenta → Cyan → Gruen. Das ist der Wow-Effekt.

```python
from rich.text import Text
from rich.color import Color

def render_logo_gradient() -> Text:
    """Logo mit vertikalem Gradient."""
    lines = LOGO_FULL.strip("\n").split("\n")
    colors = ["#ff00ff", "#cc44ff", "#8888ff", "#00aaff", "#00ddff", "#00ffaa"]

    result = Text()
    for line, color in zip(lines, colors):
        result.append(line + "\n", style=f"bold {color}")
    return result
```

Im `NataschaHeader.compose()`:
```python
yield Static(render_logo_gradient(), id="logo")
```

## Aufgabe 3: Akronym-Tagline darunter

Unter dem Logo das vollstaendige Akronym als Tagline:

```
N ormbasierte
A nalyse von
T extproduktionen
A utomatisierte
S chularbeits-
C orrection als
H ilfe-
A gent
```

ODER kompakter, nebeneinander mit Hervorhebung der Anfangsbuchstaben:

```python
def render_acronym() -> Text:
    """Akronym mit hervorgehobenen Anfangsbuchstaben."""
    parts = [
        ("N", "ormbasierte"),
        ("A", "nalyse von"),
        ("T", "extproduktionen"),
        ("•", ""),
        ("A", "utomatisierte"),
        ("S", "chularbeits-"),
        ("C", "orrection als"),
        ("H", "ilfe-"),
        ("A", "gent"),
    ]
    result = Text()
    for letter, rest in parts:
        if letter == "•":
            result.append("  •  ", style="dim cyan")
            continue
        result.append(letter, style="bold #00ddff")
        result.append(rest + " ", style="dim white")
    return result
```

## Aufgabe 4: Header-Layout fixen

Aktuell ueberlappt das Logo mit dem API-Status. Mache den Header hoeher (8 statt 3 Zeilen) und nutze ein Horizontal-Layout:

```python
class NataschaHeader(Widget):
    DEFAULT_CSS = """
    NataschaHeader {
        dock: top;
        height: 9;
        background: #050810;
        padding: 1 2 0 2;
    }
    #logo-container {
        width: 70%;
        align: left top;
    }
    #status-container {
        width: 30%;
        align: right top;
        padding: 1 2;
    }
    #acronym {
        margin-top: 0;
    }
    """

    def compose(self) -> ComposeResult:
        with Horizontal():
            with Vertical(id="logo-container"):
                yield Static(render_logo_gradient(), id="logo")
                yield Static(render_acronym(), id="acronym")
            with Vertical(id="status-container"):
                yield Static(self._render_status(), id="status")
```

## Aufgabe 5: Animierter Status-Indikator

Statt statischem `API: ✗` einen pulsierenden Indikator wenn API nicht verfuegbar:

```python
from textual.timer import Timer

class NataschaHeader(Widget):
    _pulse_state = reactive(0)

    def on_mount(self) -> None:
        self.set_interval(0.8, self._pulse)

    def _pulse(self) -> None:
        self._pulse_state = (self._pulse_state + 1) % 2
        self.query_one("#status", Static).update(self._render_status())

    def _render_status(self) -> Text:
        text = Text(justify="right")
        if self.app.api_available:
            text.append("● API verbunden\n", style="bold #00ffaa")
        else:
            color = "#ff4466" if self._pulse_state else "#882233"
            text.append("● API offline\n", style=f"bold {color}")
        text.append(f"{len(self.app.files)} Dateien\n", style="dim")
        text.append(f"v0.4.0", style="dim italic")
        return text
```

## Aufgabe 6: Responsive Logo

Bei schmalen Terminals (< 100 Spalten) auf eine kompakte Variante umschalten:

```python
LOGO_COMPACT = r"""
▒█▄░▒█ ░█▀▀█ ▀▀█▀▀ ░█▀▀█ ▒█▀▀▀█ ▒█▀▀█ ▒█░▒█ ░█▀▀█
▒█▒█▒█ ▒█▄▄█ ░░█░░ ▒█▄▄█ ░▀▀▀▄▄ ▒█░░░ ▒█▀▀█ ▒█▄▄█
▒█░░▀█ ▒█░▒█ ░░█░░ ▒█░▒█ ▒█▄▄▄█ ▒█▄▄█ ▒█░▒█ ▒█░▒█
"""

def render_logo_gradient(width: int) -> Text:
    logo = LOGO_FULL if width >= 100 else LOGO_COMPACT
    # ... rest
```

In `NataschaHeader.on_resize()` neu rendern.

## Aufgabe 7: Subtile Border-Animation

Beim Wechsel zwischen Panels: kurzer Glow-Effekt am neuen Panel-Border.

```css
#files-panel:focus-within {
    border: round #00ffaa;
    border-title-color: #00ffaa;
    border-title-style: bold;
}

/* Pulsierende Animation beim Fokussieren -- Textual unterstützt das via reactive CSS */
```

Alternativ: Bei Fokus-Wechsel ein kurzer `notify()`-Toast mit Panel-Name (klein, oben rechts).

## Lieferumfang

| Datei | Aenderung |
|-------|-----------|
| natascha.py | NataschaHeader komplett neu, LOGO_FULL/COMPACT Konstanten |
| natascha.tcss | Header-Hoehe 9, Gradient-Hintergrund, Focus-Styles |

## Nicht aendern

- generate_feedback.py, feedback_schema.json, rubrics/*, tests/*, natascha_core.py

---

## Empfehlung an Claude Code

Konzentriere dich auf Aufgabe 1-4 (kritisch fuer den Wow-Effekt). Aufgabe 5-7 sind Bonus, falls Zeit bleibt. Teste das Ergebnis mit `textual run --dev natascha.py` und mache Screenshots.

Wenn der Gradient nicht funktioniert: Pruefe ob Windows Terminal True-Color unterstuetzt (`echo $COLORTERM` muss `truecolor` ergeben).
