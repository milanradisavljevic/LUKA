# Design-Doc: Wortebene-Kommentare (hinweise)

## Status: GEPLANT — noch nicht implementiert

---

## Problem

Die aktuellen `hinweise` sind einfache Strings, die als Word-Balloon-Kommentare
an ganze Absätze gehängt werden. Der Lehrer/die Lehrerin kann nicht sehen,
auf welches Wort oder welche Phrase sich ein Kommentar bezieht.

---

## Lösung: `{zitat, kommentar}` Schema

### Schema-Änderung in `feedback_schema.json`

**Aktuell:**
```json
"hinweise": {
  "type": "array",
  "items": { "type": "string" }
}
```

**Neu:**
```json
"hinweise": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["zitat", "kommentar"],
    "properties": {
      "zitat": {
        "type": "string",
        "description": "Exaktes Wort oder exakte Phrase aus dem Schülertext (wortgetreu)."
      },
      "kommentar": {
        "type": "string",
        "description": "Kurzer Lehrerkommentar zu diesem Wort/dieser Phrase."
      }
    },
    "additionalProperties": false
  }
}
```

### LLM-Prompt-Ergänzung in `natascha_core.py`

```python
"- 'hinweise': Liste von 2–4 Kommentaren. Jeder Eintrag hat:\n"
"  'zitat': ein exaktes Wort oder eine exakte Phrase aus dem Schülertext\n"
"  'kommentar': kurze direkte Anmerkung dazu, wie eine Randnotiz einer Lehrerin\n"
"  Beispiel: {\"zitat\": \"mega geil\", \"kommentar\": \"Register überdenken — zu umgangssprachlich\"}\n"
```

### DOCX-Änderung in `generate_feedback.py`

Neue Logik in `_attach_word_comments()` (oder neue Funktion `_attach_word_level_comments()`):

```python
def _attach_word_level_comments(doc, hinweise_list, author="Natascha"):
    """
    Verankert Word-Kommentare auf Run-Ebene (einzelne Wörter/Phrasen).
    
    Für jeden Hinweis:
    1. Suche alle Absätze nach dem Zitat-Text
    2. Finde den/die Run(s) der das Zitat enthält
    3. Splitte den Run falls nötig (Zitat kann mitten in einem Run sein)
    4. Füge commentRangeStart vor dem Zitat-Run und commentRangeEnd danach ein
    5. Füge commentReference ans Ende des letzten Zitat-Runs
    """
    ...
```

Die lxml-XML-Manipulation bleibt gleich wie in `_attach_word_comments()`,
aber statt auf `paragraph.runs[-1]` wird auf den spezifischen Wort-Run verankert.

---

## Token-Schätzung

| Komponente | Aktuell | Neu (Wortebene) | Differenz |
|---|---|---|---|
| `hinweise` im Output | ~4 × 80 Zeichen = ~100 Token | ~4 × (20 Zitat + 60 Kommentar) = ~110 Token | **+10 Token** |
| `hinweise` im Schema (tool_use) | ~20 Token | ~60 Token | **+40 Token** |
| `hinweise` im Prompt-Instruction | ~30 Token | ~60 Token | **+30 Token** |
| **Gesamt extra pro Analyse** | — | — | **~+80 Token** |

Bei 4.000 Token Gesamtkosten pro Analyse macht das **~2 % Mehrkosten** —
vernachlässigbar.

---

## Migrations-Hinweis

Bestehende JSON-Analysen haben `hinweise` als `[string, ...]`.
`parse_feedback_data()` in `generate_feedback.py` muss rückwärtskompatibel bleiben:

```python
# Migration: string → {zitat: "(kein Zitat)", kommentar: string}
for item in raw_hinweise:
    if isinstance(item, str):
        hinweise.append({"zitat": "", "kommentar": item})
    elif isinstance(item, dict):
        hinweise.append(item)
```

---

## Dateien zu ändern

1. `feedback_schema.json` — `hinweise.items` von string zu object
2. `natascha_core.py` — Prompt-Instruction für `hinweise` in `build_analysis_prompt()` und `build_vision_prompt()`
3. `generate_feedback.py` — `parse_feedback_data()` (Migration), `_attach_word_comments()` → `_attach_word_level_comments()`
