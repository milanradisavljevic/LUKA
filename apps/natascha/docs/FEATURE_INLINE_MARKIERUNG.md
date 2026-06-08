# NATASCHA: Inline-Fehlermarkierung im Feedback-DOCX

## Ziel

Sprachfehler aus dem `fehler`-Array direkt IM Schülertext markieren:
- Farbige Hinterlegung (Highlight) der fehlerhaften Stelle
- Word-Kommentar (Randbemerkung) mit Korrektur und Erklärung

Das bestehende Fehlerprotokoll (Tabelle am Ende) kann bleiben.

## Farbschema

| Typ | Bedeutung       | Word Highlight Color |
|-----|-----------------|---------------------|
| R   | Rechtschreibung | BLUE (WdColorIndex 2) |
| G   | Grammatik       | RED (WdColorIndex 6)  |
| Z   | Zeichensetzung  | YELLOW (WdColorIndex 7) |
| A   | Ausdruck        | GRAY_25 (WdColorIndex 16) |

In python-docx: `from docx.enum.text import WD_COLOR_INDEX`
Highlight setzen: `run.font.highlight_color = WD_COLOR_INDEX.YELLOW`

## Algorithmus für generate_feedback.py

### Schritt 1: Schülertext mit Fehlermarkierungen rendern

```python
def render_schuelertext_with_errors(doc, schuelertext: str, fehler: list[dict]):
    """Fügt den Schülertext als Absätze ein, mit Inline-Fehlermarkierungen."""
    
    # Farbzuordnung
    HIGHLIGHT_MAP = {
        "R": WD_COLOR_INDEX.BLUE,
        "G": WD_COLOR_INDEX.RED,
        "Z": WD_COLOR_INDEX.YELLOW,
        "A": WD_COLOR_INDEX.GRAY_25,
    }
    
    # Kommentar-Zähler für Referenzen
    comment_id = 100  # Startwert, damit keine Kollision mit anderen IDs
    
    for para_text in schuelertext.split("\n"):
        p = doc.add_paragraph()
        remaining = para_text
        
        # Fehler in diesem Absatz finden und nach Position sortieren
        matches = []
        for f in fehler:
            zitat = f["zitat"]
            idx = remaining.lower().find(zitat.lower())
            if idx >= 0:
                matches.append((idx, idx + len(zitat), f))
        
        matches.sort(key=lambda m: m[0])
        
        # Überlappungen entfernen (erste Treffer gewinnt)
        filtered = []
        last_end = 0
        for start, end, f in matches:
            if start >= last_end:
                filtered.append((start, end, f))
                last_end = end
        
        # Text mit Markierungen rendern
        pos = 0
        for start, end, f in filtered:
            # Unmarkierter Text davor
            if start > pos:
                p.add_run(remaining[pos:start])
            
            # Markierter Text
            marked_run = p.add_run(remaining[start:end])
            marked_run.font.highlight_color = HIGHLIGHT_MAP.get(f["typ"], WD_COLOR_INDEX.YELLOW)
            
            # Word-Kommentar anhängen (siehe unten)
            kommentar_text = f"[{f['typ']}] {f['korrektur']}"
            if f.get("erklaerung"):
                kommentar_text += f" — {f['erklaerung']}"
            add_comment(p, marked_run, kommentar_text, "NATASCHA", comment_id)
            comment_id += 1
            
            pos = end
        
        # Rest des Absatzes
        if pos < len(remaining):
            p.add_run(remaining[pos:])
```

### Schritt 2: Word-Kommentare via oxml

Word-Kommentare sind nicht in der python-docx High-Level API, aber über XML machbar.
Hier die bewährte Implementierung:

```python
from docx.oxml.ns import qn, nsmap
from docx.oxml import OxmlElement
from datetime import datetime

def add_comment(paragraph, run, comment_text, author, comment_id):
    """Fügt einen Word-Kommentar an einen Run an."""
    
    # 1. Comment-Element im comments.xml erstellen (falls noch nicht vorhanden)
    #    Das muss beim ersten Aufruf initialisiert werden
    
    # 2. Kommentar-Referenz im Dokument setzen
    comment_ref_start = OxmlElement("w:commentRangeStart")
    comment_ref_start.set(qn("w:id"), str(comment_id))
    
    comment_ref_end = OxmlElement("w:commentRangeEnd")
    comment_ref_end.set(qn("w:id"), str(comment_id))
    
    comment_reference = OxmlElement("w:commentReference")
    comment_reference.set(qn("w:id"), str(comment_id))
    
    # Start vor dem Run, Ende nach dem Run
    run._element.addprevious(comment_ref_start)
    run._element.addnext(comment_ref_end)
    
    # CommentReference-Run nach dem Ende
    ref_run = OxmlElement("w:r")
    ref_run_props = OxmlElement("w:rPr")
    ref_run_style = OxmlElement("w:rStyle")
    ref_run_style.set(qn("w:val"), "CommentReference")
    ref_run_props.append(ref_run_style)
    ref_run.append(ref_run_props)
    ref_run.append(comment_reference)
    comment_ref_end.addnext(ref_run)
    
    # 3. Comment-Part befüllen
    comments_part = _ensure_comments_part(paragraph.part)
    
    comment_elem = OxmlElement("w:comment")
    comment_elem.set(qn("w:id"), str(comment_id))
    comment_elem.set(qn("w:author"), author)
    comment_elem.set(qn("w:date"), datetime.now().strftime("%Y-%m-%dT%H:%M:%S") + "Z")
    
    comment_para = OxmlElement("w:p")
    comment_run = OxmlElement("w:r")
    comment_text_elem = OxmlElement("w:t")
    comment_text_elem.text = comment_text
    comment_run.append(comment_text_elem)
    comment_para.append(comment_run)
    comment_elem.append(comment_para)
    
    comments_part.append(comment_elem)


def _ensure_comments_part(document_part):
    """Stellt sicher, dass das Dokument einen comments.xml-Part hat."""
    # Prüfen ob comments.xml schon existiert
    from docx.opc.constants import RELATIONSHIP_TYPE as RT
    
    comments_part_name = "/word/comments.xml"
    
    for rel in document_part.rels.values():
        if "comments" in rel.reltype:
            return rel.target_part.element
    
    # Neu anlegen
    from docx.opc.part import Part
    from lxml import etree
    
    comments_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
        ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '</w:comments>'
    )
    
    comments_element = etree.fromstring(comments_xml.encode("utf-8"))
    
    # Als Part zum Dokument hinzufügen
    content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"
    part = Part(
        partname=comments_part_name,
        content_type=content_type,
        element=comments_element,
        package=document_part.package
    )
    
    document_part.relate_to(
        part,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
    )
    
    return comments_element
```

### Wichtige Hinweise für die Implementierung

1. **Die Word-Kommentar-Implementierung über oxml ist fragil.**
   Es gibt eine bewährte Alternative: das Paket `python-docx-comments`
   (`pip install python-docx-comments`). Falls verfügbar, bevorzugt verwenden.
   Falls nicht: die oxml-Variante oben funktioniert, muss aber getestet werden.

2. **Fallback ohne Kommentare:** Falls die Kommentar-Implementierung Probleme
   macht, als Zwischenlösung die Korrektur inline in eckigen Klammern nach
   dem markierten Text einfügen:
   ```
   [markiert]bei Seite legen[/markiert] [→ beiseitelegen, R]
   ```
   Das ist in python-docx trivial: einfach ein Run mit kleiner Schrift + Farbe.

3. **Legende:** Am Anfang der Schülertext-Sektion eine kleine Legende einfügen:
   "Farbcode: ROT = Grammatik | BLAU = Rechtschreibung | GELB = Zeichensetzung | GRAU = Ausdruck"

4. **Fehler-Matching:** Das Zitat-Matching muss case-insensitive sein und
   mit Whitespace-Normalisierung arbeiten (mehrere Leerzeichen → eins,
   Zeilenumbrüche ignorieren). Manche LLMs liefern leicht abweichende Zitate.

5. **Reihenfolge im DOCX:** 
   a) Kopfbereich (Schüler, Klasse, Textsorte)
   b) Zusammenfassung + Stärken/Schwächen
   c) Schülertext MIT Inline-Markierungen (NEU)
   d) Bewertung pro Kriterium
   e) Fehlerprotokoll-Tabelle (bleibt als Referenz)
   f) Notenempfehlung

## Dateien

| Datei | Änderung |
|-------|----------|
| `generate_feedback.py` | `render_schuelertext_with_errors()` + `add_comment()` hinzufügen, in DOCX-Generierung einbauen |
| `requirements.txt` | Optional: `python-docx-comments` hinzufügen |

## Testplan

1. Eine Arbeit mit bekannter Fehleranzahl neu analysieren
2. DOCX exportieren
3. In Word/LibreOffice öffnen: Highlights und Kommentare prüfen
4. Prüfen ob alle Fehler aus dem JSON auch im Text markiert sind
5. Prüfen ob das Dokument in Word UND LibreOffice korrekt angezeigt wird
