# NATASCHA v0.7 - Änderungspaket

## Übersicht
Drei Arbeitspakete: (A) Fehlermarkierung verbessern, (B) UI-Verbesserungen, (C) Erwartungshorizont-Integration.

---

## A) FEHLERMARKIERUNG: Exhaustive Sprachfehler-Erkennung

### Problem
Der aktuelle Prompt fordert "2-4 Kommentare auf Wortebene". Bei Arbeiten mit 20+ Grammatik-/Zeichensetzungsfehlern werden daher 80% der Fehler nicht erfasst. Die Lehrkraft bekommt einen fast fehlerfreien Eindruck, obwohl die Arbeit voller Komma- und Grammatikfehler steckt.

### Lösung
Zwei getrennte Arrays im JSON-Output: `hinweise` (pädagogische Randnotizen, 3-5 Stück) und `fehler` (exhaustive Fehlerliste, unbegrenzt).

### 1. JSON-Schema erweitern (`feedback_schema.json`)

Neues Feld `fehler` als Array hinzufügen (neben dem bestehenden `hinweise`):

```json
"fehler": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "zitat": {
        "type": "string",
        "description": "1-6 Wörter aus dem Schülertext, wortgetreu"
      },
      "korrektur": {
        "type": "string",
        "description": "Korrigierte Fassung des Zitats"
      },
      "typ": {
        "type": "string",
        "enum": ["R", "G", "Z", "A"],
        "description": "R=Rechtschreibung, G=Grammatik, Z=Zeichensetzung, A=Ausdruck"
      },
      "erklaerung": {
        "type": "string",
        "description": "Knappe Erklärung der Regel (1 Satz, optional)"
      }
    },
    "required": ["zitat", "korrektur", "typ"]
  },
  "description": "Vollständige Liste aller Sprachfehler (R/G/Z/A). Kein Limit."
}
```

Das Feld `fehler` in `required` des Schemas aufnehmen.

### 2. Prompt anpassen (`natascha_core.py`, Funktion `build_analysis_prompt`)

Im Prompt-String nach dem bestehenden `hinweise`-Block folgenden Abschnitt einfügen:

```
- 'fehler': VOLLSTÄNDIGE Liste aller Sprachfehler im Schülertext. Kein Limit — erfasse JEDEN Fehler.
  Jeder Eintrag ist ein Objekt mit:
  'zitat': GENAU 1–6 Wörter aus dem Schülertext (wortgetreu, exakte Stelle)
  'korrektur': Die korrekte Fassung dieser Stelle
  'typ': Fehlertyp als Buchstabe: R (Rechtschreibung), G (Grammatik), Z (Zeichensetzung), A (Ausdruck/Register)
  'erklaerung': Optionale knappe Erklärung der verletzten Regel (1 Satz)
  
  Beispiele:
  {"zitat": "dem lesen", "korrektur": "dem Lesen", "typ": "R", "erklaerung": "Substantivierter Infinitiv wird großgeschrieben"}
  {"zitat": "Regale die sich spezifisch", "korrektur": "Regale, die sich spezifisch", "typ": "Z", "erklaerung": "Komma vor Relativsatz"}
  {"zitat": "bei Seite legen", "korrektur": "beiseitelegen", "typ": "R", "erklaerung": "Zusammenschreibung bei übertragener Bedeutung"}

  WICHTIG: Markiere ALLE Fehler, nicht nur die auffälligsten. Eine Arbeit mit 25 Kommafehlern braucht 25 Einträge mit typ=Z. Sei gründlich — die Lehrkraft verlässt sich auf Vollständigkeit.
  KEIN LIMIT für die Anzahl der Fehler.
```

Den bestehenden `hinweise`-Block anpassen: "2-4 Kommentare" beibehalten, aber klarstellen dass `hinweise` pädagogische Randnotizen sind (Stärken hervorheben, Stil-Tipps geben), NICHT für Fehlermarkierung zuständig.

### 3. Denselben Abschnitt auch in `build_vision_prompt` einfügen (gleiche Funktion, Vision-Variante).

### 4. DOCX-Generator anpassen (`generate_feedback.py`)

Im DOCX-Output die `fehler` als eigene Sektion rendern:
- Überschrift "Fehlerprotokoll"
- Tabelle mit Spalten: Nr. | Typ | Zitat | Korrektur | Erklärung
- Typ farbcodiert: R=blau, G=rot, Z=orange, A=grau
- Zusammenfassung am Ende: "R: 3 | G: 5 | Z: 12 | A: 2 — Gesamt: 22 Fehler"

---

## B) UI-VERBESSERUNGEN (natascha.py)

### B1: Select All / Deselect All

Zwei neue Keybindings in der App-Klasse:

```python
Binding("ctrl+a", "select_all", "Alle markieren"),
Binding("ctrl+d", "deselect_all", "Alle demarkieren"),
```

Die Action-Methoden sollen alle FileInfo-Objekte im aktuellen View auf markiert/demarkiert setzen und die ListView refreshen.

### B2: Markierungs-Indikator nach vorne

Im ListItem-Rendering der Dateiliste: Das Markierungs-Symbol (Checkbox) LINKS vor den Dateinamen setzen, nicht rechts dahinter.

Aktuell (geschätzt): `Flora Lex.docx          ○`
Neu: `☑ Flora Lex.docx` bzw. `☐ Flora Lex.docx`

Die Checkbox soll visuell klar unterscheidbar sein (z. B. via Rich-Markup `[bold green]☑[/]` für markiert, `☐` für nicht markiert).

### B3: Markierungs-Zähler in der Statusleiste

In der Footer-Zeile (oder einer dedizierten Statusleiste unten) einen dritten Zähler hinzufügen:

`Markiert: 4 │ Analysiert: 7 │ Offen: 3`

Dieser Zähler muss reaktiv sein (sich bei jeder Markierungsänderung sofort aktualisieren).

Umsetzung: Ein `reactive`-Property `marked_count` in der App-Klasse, das bei Änderung die Statusleiste neu rendert.

### B4: Markieren via Leertaste verbessern

Falls Space zum Markieren verwendet wird: Sicherstellen, dass nach dem Markieren der Cursor automatisch eine Zeile nach unten springt (wie in Midnight Commander / Total Commander). Das beschleunigt das Durchmarkieren einer Liste erheblich.

---

## C) ERWARTUNGSHORIZONT-INTEGRATION

### C1: Config-Schema erweitern

In `natascha_config.toml` für jede Aufgabe ein optionales Feld `erwartungshorizont` ermöglichen:

```toml
[classes.6i.aufgaben.SA2_BookTok]
label = "SA2 BookTok"
fach = "Deutsch"
schulstufe = "Oberstufe"
textsorte = "Kommentar"
rubric = "kommentar.md"
erwartungshorizont = "erwartungshorizont_sa2_thema2_booktok.md"
input = "input/6i/SA2_BookTok"
output = "output/6i/SA2_BookTok"
```

### C2: Ladefunktion in natascha_core.py

```python
def load_erwartungshorizont(config: dict, klasse: str, aufgabe: str) -> str | None:
    """Lädt den Erwartungshorizont für eine Aufgabe, falls konfiguriert."""
    auf_cfg = get_aufgabe_cfg(config, klasse, aufgabe)
    eh_name = auf_cfg.get("erwartungshorizont", "")
    if not eh_name:
        return None
    eh_path = resolve_path(config, "rubrics") / eh_name
    if not eh_path.exists():
        return None
    return eh_path.read_text(encoding="utf-8")
```

### C3: Prompt-Injection in build_analysis_prompt

Nach dem `BEWERTUNGSRASTER`-Block und nach dem `AUSGANGSTEXT`-Block, vor dem `SCHÜLERTEXT`-Block, einfügen:

```python
# Erwartungshorizont laden (falls konfiguriert)
# Benötigt: klasse und aufgabe als neue Parameter der Funktion
erwartung = load_erwartungshorizont(config, klasse, aufgabe) if klasse and aufgabe else None
if erwartung:
    prompt += (
        "ERWARTUNGSHORIZONT (aufgabenspezifisch):\n---\n"
        f"{erwartung}\n---\n\n"
        "HINWEIS: Der Erwartungshorizont definiert die konkreten inhaltlichen "
        "Erwartungen pro Operator. Prüfe den Schülertext gegen diese konkreten "
        "Erwartungen. Bewerte insbesondere:\n"
        "- Welche der erwarteten Inhalte pro Operator vorhanden sind\n"
        "- Ob typische Fehler aus dem Erwartungshorizont auftreten\n"
        "- Ob die Argumentationslinien nachvollziehbar und im Rahmen des Akzeptablen sind\n\n"
    )
```

Die Funktionssignatur von `build_analysis_prompt` und `build_vision_prompt` muss um `klasse: str = ""` und `aufgabe: str = ""` erweitert werden. Die Aufrufer in `natascha.py` (Dashboard) und `natascha_wizard.py` müssen diese Parameter durchreichen.

### C4: UI - Erwartungshorizont-Dropdown

Im Aufgaben-Setup (dort wo Rubrik gewählt wird) ein optionales Dropdown für den Erwartungshorizont. Liste: alle .md-Dateien aus `rubrics/` die mit `erwartungshorizont_` beginnen, plus "(keiner)".

---

## Dateien die geändert werden müssen

| Datei | Pakete |
|-------|--------|
| `feedback_schema.json` | A |
| `natascha_core.py` | A, C |
| `generate_feedback.py` | A |
| `natascha.py` | B, C |
| `natascha_config.toml` | C (Schema-Beispiel) |

## Testhinweis

Nach den Änderungen mit einer bereits analysierten Arbeit testen:
1. Dieselbe Schülerarbeit nochmals analysieren
2. Prüfen ob `fehler`-Array im JSON vorhanden und vollständig ist
3. Prüfen ob DOCX-Export das Fehlerprotokoll korrekt rendert
4. UI: Ctrl+A, Ctrl+D, Markierungs-Zähler testen
