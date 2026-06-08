# NATASCHA v0.8 — Masterprompt

Dieses Dokument enthält alle offenen Änderungen, priorisiert und
nach Arbeitspaketen gruppiert. Jedes Paket ist eigenständig umsetzbar.

---

## PAKET 1: Kritische Korrekturfehler beheben

### 1A: Großschreibung in Überschriften nicht als R-Fehler werten

**Problem:** "Geschlechtsneutrale Kleidung" in einer Überschrift wird
als Fehler markiert ("Adjektive schreibt man klein"), obwohl das erste
Wort eines Titels/einer Überschrift immer großgeschrieben wird.

**Fix:** In `natascha_core.py`, in `verify_fehler_against_text()` oder
als neuen Nachbearbeitungsschritt: Wenn ein Fehler vom Typ "R" ist und
das beanstandete Wort das erste Wort eines Absatzes ist, diesen Fehler
entfernen.

```python
def filter_title_false_positives(fehler_list: list, schuelertext: str) -> list:
    """Entfernt falsche R-Fehler bei Großschreibung am Satz-/Absatzanfang."""
    paragraphs = [p.strip() for p in schuelertext.split("\n") if p.strip()]
    first_words = set()
    for para in paragraphs:
        words = para.split()
        if words:
            first_words.add(words[0].lower())
    
    filtered = []
    for f in fehler_list:
        if f.get("typ") == "R" and "klein" in f.get("erklaerung", "").lower():
            zitat_first = f.get("zitat", "").split()[0].lower() if f.get("zitat") else ""
            if zitat_first in first_words:
                continue  # Falsch-Positiv: Wort steht am Absatzanfang
        filtered.append(f)
    return filtered
```

### 1B: Beistrichfehler nur als Kommentar, nicht inline korrigieren

**Problem:** Bei Kommafehlern wird der ganze Abschnitt rot durchgestrichen
und grün neu geschrieben. Das zerstört die Lesbarkeit.

**Fix:** Die bestehende `is_punctuation_only_fix()`-Heuristik prüfen.
Wenn sie funktioniert: sicherstellen dass bei reinen Zeichensetzungsfehlern
NUR ein grünes Komma eingefügt wird (kein Durchstreichen des Originals).
Wenn sie nicht greift: Komma-Fehler komplett aus der Inline-Markierung
ausnehmen und NUR als Randkommentar anzeigen.

```python
# In _attach_word_level_comments, bei Fehler-Typ "Z":
if fehler.typ == "Z":
    # NUR Kommentar am Rand, KEINE Inline-Änderung
    add_comment(para, matched_runs[0], 
                f"[Z] {fehler.korrektur} — {fehler.erklaerung}", 
                author, comment_id)
    comment_id += 1
    continue  # Kein Durchstreichen, kein grüner Text
```

### 1C: Kursiven Text bei der Extraktion erkennen

**Problem:** Wenn Schüler kursiv schreiben (z. B. für Buchtitel), geht
diese Information bei der Textextraktion verloren.

**Fix:** In `extract_text_from_docx()` kursive Runs markieren, z. B.
durch Sternchen: `*Ist geschlechtsneutrale Kleidung die Mode der Zukunft?*`

```python
def extract_text_from_docx(path: Path, preserve_italic: bool = True) -> str:
    doc = DocxDocument(str(path))
    paragraphs = []
    for para in doc.paragraphs:
        parts = []
        for run in para.runs:
            text = run.text
            if preserve_italic and run.italic and text.strip():
                text = f"*{text}*"
            parts.append(text)
        paragraphs.append("".join(parts))
    return "\n".join(paragraphs)
```

### 1D: Halluzinierte Fehler filtern

Falls noch nicht umgesetzt aus dem vorherigen Hotfix:
`verify_fehler_against_text()` MUSS nach jedem LLM-Call laufen.
Jedes Zitat das nicht im Originaltext vorkommt wird entfernt.

### 1E: SRDP-Detail muss Textsorte kennen

`generate_srdp_detail()` bekommt die Textsorte als Parameter.
Im Prompt: "Bewerte die Arbeit ALS KOMMENTAR" (nicht Erörterung).

---

## PAKET 2: Hausübungsmodus (HÜ) — DOCX ohne Bewertung

### Problem
Im HÜ-Modus darf die Lehrkraft keine Punkte/Noten vergeben (rechtlich).
Die Schüler sollen das Feedback-DOCX bekommen, aber ohne Bewertungsteil.

### Was im HÜ-DOCX bleiben soll
- Kopfbereich (Schüler, Klasse, Textsorte, Wortanzahl)
- Korrigierter Schülertext mit Inline-Markierungen und Kommentaren
- Fehlerprotokoll (Tabelle mit allen Fehlern)
- Feedback-Text pro Kriterium (Stärken, Schwächen, Verbesserungsvorschläge)
  ABER: ohne Punkte, ohne Stufen, ohne Bewertungszahl

### Was im HÜ-DOCX NICHT erscheinen darf
- Notenempfehlung (komplett weg)
- Punkte-Tabelle (die "Inhalt: 3 [3 Punkte]"-Zeilen)
- SRDP-Raster (nur für Schularbeiten)
- Prozent-Gewichtungen

### Umsetzung in `generate_feedback.py`

```python
def build_feedback_document(data, ..., bewertungsmodus="benotet"):
    ...
    # Kriterienfeedback OHNE Punkte im HÜ-Modus
    for criterion in data.bewertung:
        if bewertungsmodus == "benotet":
            add_criterion_with_score(doc, criterion)  # wie bisher
        else:
            add_criterion_feedback_only(doc, criterion)  # NUR Text, keine Zahlen
    
    # Fehlerprotokoll — immer anzeigen
    add_fehlerprotokoll(doc, data.fehler)
    
    # SRDP-Raster — NUR bei benotet
    if bewertungsmodus == "benotet" and data.srdp_detail:
        add_srdp_raster(doc, data.srdp_detail)
    
    # Notenempfehlung — NUR bei benotet
    if bewertungsmodus == "benotet":
        add_notenempfehlung(doc, data.notenempfehlung)
```

```python
def add_criterion_feedback_only(doc, criterion):
    """Kriterien-Feedback ohne Punkte/Bewertung."""
    add_section_header(doc, criterion.label.upper())
    # KEINE "Bewertung: 3 [3 Punkte]"-Zeile
    if criterion.staerken:
        render_list_section(doc, "Stärken:", criterion.staerken)
    if criterion.schwaechen:
        render_list_section(doc, "Verbesserungsbereiche:", criterion.schwaechen)
    if criterion.vorschlaege:
        render_list_section(doc, "Tipps:", criterion.vorschlaege)
    add_divider(doc)
```

Der `bewertungsmodus` wird aus der Config geladen und an alle
relevanten Funktionen durchgereicht.

---

## PAKET 3: ODT-Support

### Neue Funktion in natascha_core.py

```python
def extract_text_from_odt(path: Path) -> str:
    import zipfile
    from xml.etree import ElementTree as ET
    with zipfile.ZipFile(path) as z:
        with z.open("content.xml") as f:
            tree = ET.parse(f)
    ns = {"text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0"}
    paragraphs = tree.findall(".//text:p", ns)
    return "\n".join("".join(el.itertext()) for el in paragraphs).strip()
```

### Textextraktion-Router

```python
def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return extract_text_from_docx(path)
    elif suffix == ".odt":
        return extract_text_from_odt(path)
    else:
        raise ValueError(f"Nicht unterstütztes Format: {suffix}")
```

Alle Aufrufe von `extract_text_from_docx()` durch `extract_text()` ersetzen.

### Dateifilter in natascha.py erweitern

```python
SUPPORTED_EXTENSIONS = {".docx", ".odt"}
```

---

## PAKET 4: Rubrics-Struktur und Textsorten

### 4A: Ordnerstruktur für Rubrics

```
rubrics/
  oberstufe/
    kommentar.md
    eroerterung.md
    leserbrief.md
    meinungsrede.md
    textanalyse.md
    textinterpretation.md
    zusammenfassung.md
    srdp_deutsch_oberstufe.md
  unterstufe/
    deutsch_unterstufe.md
    eroerterung_us.md
    (weitere nach Bedarf)
  englisch/
    englisch_a2.md
    srdp_englisch_b1.md
    srdp_englisch_b2.md
  erwartungshorizonte/
    erwartungshorizont_sa2_thema1_genderneutral.md
    erwartungshorizont_sa2_thema2_booktok.md
```

Die Config-Pfade müssen angepasst werden:
`rubric = "oberstufe/kommentar.md"` statt `rubric = "kommentar.md"`.

Bestehende Configs mit den alten Pfaden müssen weiterhin funktionieren
(Fallback: wenn die Datei nicht im Unterordner gefunden wird, im
Root-Ordner suchen).

### 4B: Fehlende Textsorten-Rubrics erstellen

Für die Oberstufe fehlen noch:
- `leserbrief.md`
- `meinungsrede.md`
- `textanalyse.md`
- `textinterpretation.md`
- `zusammenfassung.md`

Struktur analog zu `kommentar.md` und `eroerterung.md`:
- Textsorte-Definition
- Schreibhandlungen
- Gliederung (Einleitung, Hauptteil, Schluss)
- Sprachliche Besonderheiten
- Bewertungskriterien
- Typische Fehler

Inhalt aus dem ÖBV-Leitfaden (Maturatextsorten in drei Schritten)
ableiten — die Informationen sind bereits in diesem Chat vorhanden
(aus dem PDF das Milan am Anfang hochgeladen hat).

---

## PAKET 5: Notenberechnung überarbeiten

### 5A: Oberstufe — SRDP-basiert in der App

Die Note wird aus den SRDP-Detailwerten berechnet, NICHT aus der
Hauptanalyse (die ist zu großzügig).

```python
def berechne_note_srdp(srdp_detail: dict) -> dict:
    """Berechnet Note aus den 15 SRDP-Unterkriterien."""
    k1_inhalt_keys = ["schreibhandlung", "arbeitsauftraege", "textbeilage", "sachlich", "qualitaet"]
    k1_struktur_keys = ["kohaerenz", "bezugnahme", "kohaesion"]
    k3_stil_keys = ["situationsadaequat", "wortwahl", "satzstrukturen", "eigenstaendigkeit"]
    k3_norm_keys = ["orthografie", "zeichensetzung", "grammatik"]
    
    def avg(section, keys):
        vals = [section.get(k, {}).get("stufe", 0) for k in keys]
        return sum(vals) / len(vals) if vals else 0
    
    k1_i = avg(srdp_detail.get("k1_inhalt", {}), k1_inhalt_keys)
    k1_s = avg(srdp_detail.get("k1_textstruktur", {}), k1_struktur_keys)
    k3_st = avg(srdp_detail.get("k3_stil", {}), k3_stil_keys)
    k3_no = avg(srdp_detail.get("k3_sprachnormen", {}), k3_norm_keys)
    
    k1 = (k1_i + k1_s) / 2
    k3 = (k3_st + k3_no) / 2
    gesamt = (k1_i + k1_s + k3_st + k3_no) / 4
    
    # Sonderregel K1
    if k1 < 1.0:
        return {"note": 5, "bezeichnung": "Nicht genügend",
                "begruendung": f"K1 nicht erfüllt (Schnitt {k1:.2f})",
                "durchschnitt": round(gesamt, 2),
                "k1": round(k1, 2), "k3": round(k3, 2)}
    
    # Sonderregel K3
    if k3 < 1.0:
        note = max(4, _note_from_schnitt(gesamt))
        return {"note": note, "bezeichnung": _bez(note),
                "begruendung": f"K3/1 unter 1.0 → Deckelung",
                "durchschnitt": round(gesamt, 2),
                "k1": round(k1, 2), "k3": round(k3, 2)}
    
    note = _note_from_schnitt(gesamt)
    return {"note": note, "bezeichnung": _bez(note),
            "durchschnitt": round(gesamt, 2),
            "begruendung": f"K1={k1:.2f}, K3/1={k3:.2f}, Gesamt={gesamt:.2f}",
            "k1": round(k1, 2), "k3": round(k3, 2)}

def _note_from_schnitt(s):
    if s >= 3.50: return 1
    if s >= 2.50: return 2
    if s >= 1.50: return 3
    if s >= 0.50: return 4
    return 5

def _bez(n):
    return {1:"Sehr gut",2:"Gut",3:"Befriedigend",4:"Genügend",5:"Nicht genügend"}[n]
```

### 5B: Unterstufe — Eigener Raster pro Schularbeit

Für die Unterstufe gibt es keinen SRDP-Standard. Die Benotung folgt
einem schularbeitsspezifischen Punkteraster, der im Erwartungshorizont
definiert wird.

Der Erwartungshorizont-Skill muss für Unterstufe um einen
Benotungsraster erweitert werden:

```markdown
## Benotungsraster (Unterstufe)

| Kriterium | Max. Punkte |
|-----------|-------------|
| Inhalt / Operatoren | 12 |
| Aufbau / Gliederung | 8 |
| Ausdruck / Stil | 8 |
| Sprachrichtigkeit | 12 |
| **Gesamt** | **40** |

| Punkte | Note |
|--------|------|
| 36-40 | 1 (Sehr gut) |
| 30-35 | 2 (Gut) |
| 22-29 | 3 (Befriedigend) |
| 14-21 | 4 (Genügend) |
| 0-13 | 5 (Nicht genügend) |
```

Die App muss erkennen ob Ober- oder Unterstufe und den passenden
Berechnungsmodus wählen:

```python
if schulstufe == "Oberstufe":
    note = berechne_note_srdp(srdp_detail)
elif schulstufe in ("Unterstufe", "unterstufe"):
    note = berechne_note_unterstufe(bewertung, erwartungshorizont)
```

Die Funktion `berechne_note_unterstufe()` liest die Punktegrenzen
aus dem Erwartungshorizont (Markdown-Parsing) oder aus der Config.

### 5C: Operatoren-Balance prüfen

Im Prompt für die Hauptanalyse ergänzen:

```
WICHTIG: Prüfe ob der Schülertext ALLE Operatoren gleichmäßig bearbeitet.
Wenn ein Operator nur oberflächlich oder gar nicht behandelt wird,
wirkt sich das STARK negativ auf die Inhaltsbewertung aus.
Ein Text der zu 80% nur den Ausgangstext reproduziert und nur 20%
eigene Argumentation enthält, kann bei Inhalt maximal Stufe 1 erreichen.
```

---

## PAKET 6: Kalibrierung mit Lehrkraft-Korrekturen

### Analyse der hochgeladenen Korrekturen

Die vier PDFs zeigen Nataschas Bewertungsmuster:

**Eric Lienbacher:** ✓ Textbezug, ✓ klare Positionierung, ✓ klarer Aufbau,
○ Argumentation teilw. nicht nachvollziehbar, keine Gegenargumente,
○ sprachl. unpräzise, teilw. ausschweifend und wiederholend.
Fehlertypen: R, A, SZ, G durchgehend markiert. Schätzung: Note 3-4.

**Laurin Kim:** Viele Fehler bei R, A, G, SZ. Ungenaue Argumentation.
DNS statt DNA, Rutowski statt Rutkowski. "Nicht des do Trotz".
"Gelungener Schluss" positiv vermerkt. Schätzung: Note 3-4.

**Matthias Bachler:** Klare Haltung, eindeutiger Textbezug. Aber:
zu wenig differenzierte Argumentation, stellenweise unsaubere Struktur,
starke Ausdrucksschwächen (umgangssprachlich, holprige Satzkonstruktionen).
Fehler: A, R, SZ, G zahlreich. Schätzung: Note 3.

**Eric Moser Wright:** Eigene Positionierung klar, gelungener Textbezug,
gute Einbindung von Beispielen. ABER: fehlerhafte Basissatzform,
oberflächliche Argumentation ohne Belege, keine Gegenargumente,
viele Fehler (R, SZ, G, Kongruenz, Satzbau). Schätzung: Note 4.

### Kalibrierungs-Prompt für den LLM

Im MASTER_PROMPT.md oder im Erwartungshorizont einen Kalibrierungsblock:

```
KALIBRIERUNG DER BEWERTUNGSSTRENGE:
Die Lehrkraft bewertet nach folgendem Muster:
- Sprachfehler werden STRENG bewertet. Viele R/G/Z-Fehler → Stufe 1 oder 0.
- Inhaltlich wird differenziert: Reproduktion allein reicht nicht.
  Eigenständige Argumentation MIT Gegenargumenten ist für Stufe 3+ nötig.
- Ausdrucksschwächen (Umgangssprache, holprige Sätze) senken Stil auf max. 2.
- Ein "guter Textbezug" allein rettet keine schwache Argumentation.
- Bewerte NICHT großzügig. Im Zweifel die niedrigere Stufe wählen.
```

### Ankersystem (mittelfristig)

Wenn die eingescannten Arbeiten als JSON vorliegen (manuell oder
per Nachanalyse), diese als Few-Shot-Beispiele in den Prompt laden:

```
rubrics/
  anker/
    eric_lienbacher_anker.json   # Note 3-4, mit Lehrkraft-Begründung
    matthias_bachler_anker.json  # Note 3, mit Lehrkraft-Begründung
```

---

## PAKET 7: Analyse-Versionierung

Beim Speichern einer Analyse die vorherige Version archivieren:

```
feedback_data/
  .history/
    Flora_Lex_analysis_20260524_gpt41.json
```

Siehe TASK_VERSIONIERUNG.md für Details.

---

## PAKET 8: Erwartungshorizont-Skill aktualisieren

Der Prompt in `prompts/PROMPT_ERWARTUNGSHORIZONT.md` muss erweitert werden:

### Für Unterstufe:
- Benotungsraster mit Punktegrenzen ins Template aufnehmen
- Einfachere Sprache bei den erwarteten Inhalten
- Weniger Unterkriterien (kein SRDP-Format)

### Für Oberstufe:
- Operatoren-Balance explizit prüfen
- Hinweis auf Bewertungsstrenge der Lehrkraft

---

## Priorität

1. **Paket 1** (Korrekturfehler) — aktive Bugs, untergräbt Vertrauen
2. **Paket 2** (HÜ-Modus) — rechtliche Notwendigkeit
3. **Paket 5** (Notenberechnung) — falsche Noten sind das größte Problem
4. **Paket 3** (ODT) — blockiert aktuell eine Klasse
5. **Paket 4** (Rubrics) — Übersicht und Vollständigkeit
6. **Paket 6** (Kalibrierung) — Qualitätsverbesserung
7. **Paket 7** (Versionierung) — Nice-to-have
8. **Paket 8** (EH-Skill) — wird bei Bedarf aktiviert

## Dateien die geändert werden

| Datei | Pakete |
|-------|--------|
| `natascha_core.py` | 1, 3, 5, 6 |
| `generate_feedback.py` | 1, 2 |
| `natascha.py` | 2, 3, 4 |
| `rubrics/` (Ordnerstruktur) | 4 |
| `prompts/PROMPT_ERWARTUNGSHORIZONT.md` | 8 |
| `MASTER_PROMPT.md` | 6 |
