# NATASCHA: Dead-Code-Bereinigung

## Ziel
Alten Code entfernen der nach der fehler-Array-Migration nicht mehr
aktiv genutzt wird. Reduziert Verwirrung und verhindert Regressions.

## Änderungen

### 1. `add_student_text_section()` vereinfachen

Die gesamte `fehler_detail`-basierte Markierungslogik in dieser Funktion
entfernen. Die Funktion soll NUR den Schülertext als Absätze rendern.

Entfernen:
- Den Block `all_fehler: list[tuple[str, str]] = []` und die Schleife
  die `crit.fehler_detail` durchgeht
- Die `_parse_fehler_detail()`-Aufrufe innerhalb der Funktion
- Die gesamte Fehler-Matching-Logik (das `for fehler_text, korrektur_text`
  innerhalb der Absatz-Schleife)
- Den "Nicht zugeordnete Korrekturen"-Block am Ende
- Die Strikethrough/Grün-Markierung in dieser Funktion

Behalten:
- Die Absatz-Rendering-Logik (Text als Absätze einfügen)
- Die Titel-Erkennung (erster kurzer Absatz = bold)
- Die Rückgabe der `paragraphs_added`-Liste

### 2. Kriterien-Rendering: `fehler_detail`-Blöcke entfernen

In `build_feedback_document()` den Block entfernen:
```python
if criterion.key == "sprachrichtigkeit" and criterion.fehler_detail:
    render_list_section(doc, "Fehler im Detail:", ...)
    render_list_section(doc, "Fehlerschwerpunkte:", ...)
```

Und analog für Englisch:
```python
elif criterion.key == "grammatical_range_accuracy" and criterion.fehler_detail:
    render_list_section(doc, "Fehler im Detail:", ...)
```

Diese Daten kommen jetzt aus dem `fehler`-Array und werden im
Fehlerprotokoll gerendert.

### 3. `_parse_fehler_detail()` kann bleiben

Die Funktion selbst schadet nicht und könnte theoretisch für
Abwärtskompatibilität mit alten JSONs nützlich sein. Nicht entfernen,
aber auch nicht mehr aktiv aufrufen.

### 4. `add_document_header()` prüfen

Prüfen ob `add_document_header()` noch irgendwo aufgerufen wird
(außerhalb von `build_feedback_document`). Falls nicht: als deprecated
markieren oder entfernen. `add_korrektur_header()` ist der aktive
Header.

### 5. `CriterionFeedback`-Dataclass

Die Felder `fehler_detail` und `fehlerschwerpunkte` in der Dataclass
belassen (für JSON-Parsing alter Dateien), aber die Rendering-Stellen
die darauf zugreifen entfernen (siehe Punkt 2).

## Dateien

| Datei | Änderung |
|-------|----------|
| `generate_feedback.py` | Punkte 1-4 |

## Testplan

1. DOCX-Export einer neuen Analyse: Schülertext wird korrekt gerendert,
   Fehlermarkierungen kommen nur aus dem `fehler`-Array
2. DOCX-Export einer ALTEN Analyse (ohne `fehler`-Array): Text wird
   ohne Markierungen gerendert (akzeptabel, da Neuanalyse nötig)
3. Keine Absatz-Kommentare an willkürlichen Stellen
