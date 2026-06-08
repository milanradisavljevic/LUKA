# NATASCHA v0.7.2 — Änderungspaket

## A) Inline-Korrektur: Track-Changes-Stil

### Aktueller Stand
Fehlerhafte Stellen werden farbig hinterlegt, Kommentarblase am Rand zeigt
`[Typ] Korrektur — Erklärung`. Das funktioniert, aber die Korrektur selbst
ist nur in der Blase sichtbar, nicht im Text.

### Gewünschtes Verhalten
Im Text selbst: Fehler rot durchgestrichen + Korrektur grün dahinter.
Kommentarblase behält nur die Erklärung (Regelhinweis).

### Umsetzung in `generate_feedback.py`

In der Funktion `_attach_word_level_comments` (oder der neuen Fehler-Loop),
beim Markieren eines Fehlers:

```python
# 1. Originalen Text: rot + durchgestrichen (KEIN Highlight mehr nötig)
for run in matched_runs:
    run.font.color.rgb = RGBColor(0xCC, 0x00, 0x00)  # Rot
    run.font.strike = True  # Durchgestrichen

# 2. Korrektur-Run direkt nach dem letzten matched_run einfügen
korrektur_run = paragraph.add_run()  # oder via oxml nach dem letzten matched_run
korrektur_run.text = f" {fehler['korrektur']}"
korrektur_run.font.color.rgb = RGBColor(0x00, 0x88, 0x00)  # Grün
korrektur_run.font.size = Pt(9)  # Etwas kleiner
korrektur_run.font.bold = True

# 3. Kommentarblase: NUR Erklärung (nicht mehr die Korrektur)
if fehler.get("erklaerung"):
    kommentar_text = f"[{fehler['typ']}] {fehler['erklaerung']}"
else:
    kommentar_text = f"[{fehler['typ']}]"
# add_comment(...) wie bisher
```

### Hinweis: Run-Einfügung an korrekter Position

`paragraph.add_run()` hängt am Ende an. Für die korrekte Position
(direkt nach dem markierten Run) muss der Korrektur-Run via oxml
eingefügt werden:

```python
from copy import deepcopy
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

# Neuen Run nach dem letzten matched_run einfügen
new_r = OxmlElement("w:r")
rPr = OxmlElement("w:rPr")

# Grüne Farbe
color = OxmlElement("w:color")
color.set(qn("w:val"), "008800")
rPr.append(color)

# Kleinere Schrift
sz = OxmlElement("w:sz")
sz.set(qn("w:val"), "18")  # 9pt = 18 half-points
rPr.append(sz)

# Bold
bold = OxmlElement("w:b")
rPr.append(bold)

new_r.append(rPr)
t = OxmlElement("w:t")
t.set(qn("xml:space"), "preserve")
t.text = f" {fehler['korrektur']}"
new_r.append(t)

# Nach dem letzten matched_run einfügen
last_matched_run._element.addnext(new_r)
```

### Legende aktualisieren

```
Farbcode: Rot durchgestrichen = Fehler | Grün = Korrektur
Kommentare am Rand: [R] Rechtschreibung | [G] Grammatik | [Z] Zeichensetzung | [A] Ausdruck
```

---

## B) UI-Fixes

### B1: Erwartungshorizont in der Stammdaten-Anzeige (Mitte)

In der Info-Ansicht (center panel), wo Klasse, Textsorte, Rubrik etc.
angezeigt werden: ein neues Feld "Erwartungshorizont" hinzufügen.

Wert: Der Dateiname aus der Config (`erwartungshorizont`-Feld der Aufgabe),
oder "(keiner)" wenn nicht gesetzt.

Stelle in `natascha.py` finden wo die Stammdaten gerendert werden
(vermutlich in einer Compose-Methode oder einem update-Handler)
und das Feld ergänzen.

### B2: Zuordnungen: Aktuelle Werte statt Defaults anzeigen

**Problem:** Wenn man das Zuordnungsmenü öffnet, werden immer die
Default-Werte angezeigt statt der aktuell gespeicherten Konfiguration.
Man muss alle Felder erneut durchklicken.

**Fix:** Beim Öffnen des Zuordnungsdialogs die aktuellen Werte aus
der Config laden und als Vorbelegung setzen:

```python
# Pseudocode — beim Öffnen des Zuordnungsdialogs:
auf_cfg = get_aufgabe_cfg(config, current_klasse, current_aufgabe)

# Felder vorbelegen statt Defaults:
textsorte_select.value = auf_cfg.get("textsorte", default_textsorte)
rubric_select.value = auf_cfg.get("rubric", default_rubric)
erwartungshorizont_select.value = auf_cfg.get("erwartungshorizont", "")
fach_select.value = auf_cfg.get("fach", default_fach)
schulstufe_select.value = auf_cfg.get("schulstufe", default_schulstufe)
bewertungsmodus_select.value = auf_cfg.get("bewertungsmodus", "benotet")
```

Das ist vermutlich ein Einzeiler-Fix pro Feld — die Widgets müssen
nur mit dem aktuellen statt dem Default-Wert initialisiert werden.

### B3: Erwartungshorizont im Zuordnungsmenü

Falls das Erwartungshorizont-Dropdown im Zuordnungsmenü noch fehlt
oder nicht immer angezeigt wird: sicherstellen dass es immer sichtbar
ist (auch wenn leer / "(keiner)" ausgewählt).

Liste befüllen mit: allen .md-Dateien aus `rubrics/` die mit
`erwartungshorizont_` beginnen, plus "(keiner)" als erste Option.

### B4: Ctrl+A / Ctrl+D ins Hilfemenü

Im Hilfe-Dialog (vermutlich über `?` oder `F1` erreichbar) die neuen
Shortcuts dokumentieren:

```
Ctrl+A    Alle Dateien markieren
Ctrl+D    Alle Dateien demarkieren
```

An der Stelle einfügen wo die anderen Tastenkürzel aufgelistet sind.

---

## Dateien

| Datei | Änderung |
|-------|----------|
| `generate_feedback.py` | A: Track-Changes-Stil für Fehlermarkierung |
| `natascha.py` | B1-B4: UI-Fixes |

## Testplan

1. DOCX-Export prüfen: rote Durchstreichung + grüne Korrektur sichtbar?
2. Kommentarblasen: nur noch Erklärung, nicht mehr die Korrektur?
3. In Word UND LibreOffice öffnen — beides testen
4. Zuordnungsmenü: aktuelle Werte vorbelegt?
5. Erwartungshorizont in Stammdaten sichtbar?
6. Hilfe: Ctrl+A/D dokumentiert?
