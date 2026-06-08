# NATASCHA: SRDP-Beurteilungsraster im DOCX-Output

## Ziel

Den offiziellen SRDP-Beurteilungsraster als ausgefüllte Tabelle in den
DOCX-Output integrieren. Die Lehrkraft soll die Bewertung direkt vom
DOCX auf das offizielle Papierformular übertragen können.

## Gewünschtes Format

Nach dem Fehlerprotokoll und vor der Notenempfehlung eine neue Sektion
"BEURTEILUNG NACH SRDP-RASTER" einfügen. Aufbau:

### Sektion 1: Gesamteindruck

Ein kurzer Absatz (3-5 Sätze) der die Arbeit zusammenfassend einordnet.
Quelle: `data.zusammenfassung` aus der LLM-Analyse.

### Sektion 2: K1-Tabelle (Inhalt + Textstruktur)

Tabelle mit drei Spalten: Kriterium | Einschätzung | Begründung

Zeilen für K1 Inhalt:
- Schreibhandlung(en)
- Arbeitsaufträge
- Textbeilage(n)
- Sachliche Richtigkeit
- Qualität der Auseinandersetzung

Zeilen für K1 Textstruktur:
- Kohärenz
- Bezugnahme auf Textbeilage(n)
- Kohäsionsmittel

Die "Einschätzung" ist der SRDP-Wortlaut zur jeweiligen Stufe.
Die "Begründung" sind konkrete Textbelege und Beobachtungen.

### Sektion 3: K3/1-Tabelle (Stil/Ausdruck + Sprachnormen)

Zeilen für Stil/Ausdruck:
- Situationsadäquatheit
- Ausdrucksweise / Wortwahl
- Satzstrukturen
- Eigenständigkeit

Zeilen für Sprachnormen:
- Orthografie
- Zeichensetzung
- Grammatik

### Sektion 4: Verbesserungshinweise

Drei Absätze: Inhaltlich, Strukturell, Sprachlich.
Quelle: aus den `vorschlaege`-Feldern der Kriterien zusammengesetzt.

## SRDP-Stufenwortlaut (Mapping)

Die Stufen 0-4 müssen in den offiziellen SRDP-Wortlaut übersetzt werden.
Hier die Mappings pro Kriterium:

```python
SRDP_WORTLAUT = {
    # K1 Inhalt
    "schreibhandlung": {
        0: "nicht erfüllt",
        1: "Schreibhandlung(en) im Sinne der geforderten Textsorte überwiegend realisiert",
        2: "Schreibhandlung(en) im Sinne der geforderten Textsorte weitgehend realisiert",
        3: "Schreibhandlung(en) im Sinne der geforderten Textsorte durchgehend realisiert",
        4: "Schreibhandlung(en) im Sinne der geforderten Textsorte umfassend realisiert",
    },
    "arbeitsauftraege": {
        0: "nicht erfüllt",
        1: "Arbeitsaufträge überwiegend erfüllt",
        2: "Arbeitsaufträge weitgehend erfüllt",
        3: "alle Arbeitsaufträge erfüllt",
        4: "alle Arbeitsaufträge umfassend erfüllt",
    },
    "textbeilage": {
        0: "nicht erfüllt",
        1: "Textbeilage(n) im Sinne der Arbeitsaufträge überwiegend erfasst",
        2: "Textbeilage(n) im Sinne der Arbeitsaufträge weitgehend erfasst",
        3: "Textbeilage(n) im Sinne der Arbeitsaufträge vollständig erfasst",
        4: "Textbeilage(n) im Sinne der Arbeitsaufträge vollständig erfasst",
    },
    "sachlich": {
        0: "nicht erfüllt",
        1: "sachlich überwiegend richtig",
        2: "sachlich weitgehend richtig",
        3: "sachlich richtig",
        4: "sachlich durchgehend richtig",
    },
    "qualitaet": {
        0: "nicht erfüllt",
        1: "oberflächlich / wenig treffsicher / reproduzierend",
        2: "ansatzweise komplex / weitgehend treffsicher / Ansätze zur Eigenständigkeit",
        3: "komplex / treffsicher / merklich eigenständig",
        4: "in hohem Maße komplex / treffsicher / eigenständig; ggf. ideenreich",
    },
    # K1 Textstruktur
    "kohaerenz": {
        0: "nicht erfüllt",
        1: "Text gedanklich und formal überwiegend der Textsorte angemessen strukturiert",
        2: "Text gedanklich und formal weitgehend der Textsorte angemessen strukturiert",
        3: "Text gedanklich und formal durchgehend der Textsorte angemessen und klar strukturiert",
        4: "Text gedanklich und formal durchgehend der Textsorte angemessen, klar, zielgerichtet und ggf. eigenständig strukturiert",
    },
    "bezugnahme": {
        0: "nicht erfüllt",
        1: "Bezugnahme auf die Textbeilage(n) im Sinne der geforderten Textsorte überwiegend erkennbar",
        2: "Bezugnahme auf die Textbeilage(n) im Sinne der geforderten Textsorte realisiert",
        3: "gelungene Verknüpfung mit der/den Textbeilage(n) im Sinne der geforderten Textsorte",
        4: "besonders gelungene Verknüpfung mit der/den Textbeilage(n) im Sinne der geforderten Textsorte",
    },
    "kohaesion": {
        0: "nicht erfüllt",
        1: "Einsatz passender Kohäsionsmittel überwiegend erkennbar",
        2: "Einsatz passender Kohäsionsmittel weitgehend erkennbar",
        3: "nahezu durchgehender Einsatz passender Kohäsionsmittel",
        4: "durchgehender Einsatz passender Kohäsionsmittel",
    },
    # K3/1 Stil
    "situationsadaequat": {
        0: "nicht erfüllt",
        1: "überwiegend schreibhandlungs- und situationsadäquate Sprachverwendung",
        2: "weitgehend schreibhandlungs- und situationsadäquate Sprachverwendung",
        3: "nahezu durchgehend schreibhandlungs- und situationsadäquate Sprachverwendung",
        4: "durchgehend schreibhandlungs- und situationsadäquate Sprachverwendung",
    },
    "wortwahl": {
        0: "nicht erfüllt",
        1: "überwiegend angemessene und semantisch korrekte Ausdrucksweise sowie geringe Varianz in der Wortwahl",
        2: "weitgehend angemessene und semantisch korrekte Ausdrucksweise sowie variantenreiche Wortwahl",
        3: "durchgehend angemessene und semantisch korrekte Ausdrucksweise sowie präzise und variantenreiche Wortwahl",
        4: "durchgehend angemessene und semantisch korrekte Ausdrucksweise sowie besonders präzise, differenzierte und variantenreiche Wortwahl",
    },
    "satzstrukturen": {
        0: "nicht erfüllt",
        1: "überwiegend gut verständliche bzw. nur wenig variierende Satzstrukturen",
        2: "weitgehend gut verständliche und variantenreiche Satzstrukturen",
        3: "durchgehend variantenreiche und komplexe bzw. der Textsorte angemessene Satzstrukturen",
        4: "besonders variantenreiche und komplexe bzw. der Textsorte angemessene Satzstrukturen",
    },
    "eigenstaendigkeit": {
        0: "nicht erfüllt",
        1: "viele an die Textbeilage(n) angelehnte oder wörtlich übernommene Formulierungen",
        2: "weitgehend eigenständige Formulierungen",
        3: "nahezu durchgehend eigenständige Formulierungen",
        4: "durchgehend eigenständige Formulierungen",
    },
    # K3/1 Sprachnormen
    "orthografie": {
        0: "nicht erfüllt",
        1: "überwiegend richtige Anwendung der Regeln der Orthografie",
        2: "weitgehend richtige Anwendung der Regeln der Orthografie",
        3: "richtige Anwendung der Regeln der Orthografie; wenige Fehler",
        4: "orthografisch (nahezu) fehlerfrei",
    },
    "zeichensetzung": {
        0: "nicht erfüllt",
        1: "überwiegend richtige Anwendung der Regeln der Zeichensetzung",
        2: "weitgehend richtige Anwendung der Regeln der Zeichensetzung",
        3: "richtige Anwendung der Regeln der Zeichensetzung; wenige Fehler",
        4: "Zeichensetzung (nahezu) fehlerfrei",
    },
    "grammatik": {
        0: "nicht erfüllt",
        1: "überwiegend richtige Anwendung der Regeln der Grammatik",
        2: "weitgehend richtige Anwendung der Regeln der Grammatik",
        3: "richtige Anwendung der Regeln der Grammatik; wenige Fehler",
        4: "grammatikalisch (nahezu) fehlerfrei",
    },
}
```

## Prompt-Änderung: Detailbewertung pro SRDP-Kriterium

Das LLM muss für JEDES SRDP-Unterkriterium eine eigene Bewertung und
Begründung liefern. Aktuell liefert es nur 4 Kriterien (inhalt,
textstruktur/aufbau, ausdruck, sprachrichtigkeit). Für den SRDP-Raster
brauchen wir 15 Unterkriterien.

### Option A: Separate LLM-Anfrage (empfohlen)

Nach der Hauptanalyse einen zweiten, kürzeren LLM-Call für die
SRDP-Detailbewertung:

```python
def generate_srdp_detail(schuelertext: str, hauptanalyse: dict, config: dict) -> dict:
    """Generiert die SRDP-Detailbewertung basierend auf der Hauptanalyse."""
    prompt = f"""
    Du bist eine AHS-Deutschlehrerin. Vor dir liegt eine Schülerarbeit
    und die Hauptanalyse dazu.

    SCHÜLERTEXT:
    ---
    {schuelertext}
    ---

    HAUPTANALYSE (Zusammenfassung):
    {json.dumps(hauptanalyse.get("bewertung", {}), ensure_ascii=False, indent=2)}

    Erstelle eine Detailbewertung nach dem SRDP-Beurteilungsraster.
    Für jedes der folgenden 15 Kriterien:
    - Eine Stufe (0-4)
    - Eine Begründung (2-4 Sätze mit konkreten Textbelegen)

    Antworte als JSON mit diesem Schema:
    {{
      "gesamteindruck": "3-5 Sätze Gesamteinschätzung",
      "k1_inhalt": {{
        "schreibhandlung": {{"stufe": 0-4, "begruendung": "..."}},
        "arbeitsauftraege": {{"stufe": 0-4, "begruendung": "..."}},
        "textbeilage": {{"stufe": 0-4, "begruendung": "..."}},
        "sachlich": {{"stufe": 0-4, "begruendung": "..."}},
        "qualitaet": {{"stufe": 0-4, "begruendung": "..."}}
      }},
      "k1_textstruktur": {{
        "kohaerenz": {{"stufe": 0-4, "begruendung": "..."}},
        "bezugnahme": {{"stufe": 0-4, "begruendung": "..."}},
        "kohaesion": {{"stufe": 0-4, "begruendung": "..."}}
      }},
      "k3_stil": {{
        "situationsadaequat": {{"stufe": 0-4, "begruendung": "..."}},
        "wortwahl": {{"stufe": 0-4, "begruendung": "..."}},
        "satzstrukturen": {{"stufe": 0-4, "begruendung": "..."}},
        "eigenstaendigkeit": {{"stufe": 0-4, "begruendung": "..."}}
      }},
      "k3_sprachnormen": {{
        "orthografie": {{"stufe": 0-4, "begruendung": "..."}},
        "zeichensetzung": {{"stufe": 0-4, "begruendung": "..."}},
        "grammatik": {{"stufe": 0-4, "begruendung": "..."}}
      }},
      "verbesserung_inhaltlich": "2-3 Sätze",
      "verbesserung_strukturell": "2-3 Sätze",
      "verbesserung_sprachlich": "2-3 Sätze"
    }}

    REGELN:
    - Begründungen MÜSSEN konkrete Textzitate enthalten.
    - Verwende den SRDP-Stufenwortlaut in der Begründung.
    - Bewerte STRENG aber FAIR. Stufe 3-4 nur bei erkennbar guter Leistung.
    - Antworte NUR mit dem JSON, kein Text davor oder danach.
    """
    return call_llm(provider, model, prompt, config)
```

### Option B: In die Hauptanalyse integrieren

Alternativ den bestehenden Prompt erweitern. Das macht den Prompt
aber sehr lang und erhöht die Fehlerquote. Option A ist sauberer.

## DOCX-Rendering

In `generate_feedback.py` eine neue Funktion:

```python
def add_srdp_raster(doc, srdp_detail: dict):
    """Fügt den ausgefüllten SRDP-Beurteilungsraster als Tabellen ein."""
    
    doc.add_page_break()
    add_section_header(doc, "BEURTEILUNG NACH SRDP-RASTER")
    
    # Gesamteindruck
    p = doc.add_paragraph()
    r = p.add_run(srdp_detail.get("gesamteindruck", ""))
    r.font.size = Pt(10)
    r.italic = True
    
    # K1 Inhalt
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("K1 – Inhalt").bold = True
    
    _add_srdp_table(doc, srdp_detail.get("k1_inhalt", {}), [
        ("schreibhandlung", "Schreibhandlung(en)"),
        ("arbeitsauftraege", "Arbeitsaufträge"),
        ("textbeilage", "Textbeilage(n)"),
        ("sachlich", "Sachliche Richtigkeit"),
        ("qualitaet", "Qualität der Auseinandersetzung"),
    ])
    
    # K1 Textstruktur
    p = doc.add_paragraph()
    p.add_run("K1 – Textstruktur").bold = True
    
    _add_srdp_table(doc, srdp_detail.get("k1_textstruktur", {}), [
        ("kohaerenz", "Kohärenz"),
        ("bezugnahme", "Bezugnahme auf Textbeilage(n)"),
        ("kohaesion", "Kohäsionsmittel"),
    ])
    
    # K3/1 Stil
    p = doc.add_paragraph()
    p.add_run("K3/1 – Stil und Ausdruck").bold = True
    
    _add_srdp_table(doc, srdp_detail.get("k3_stil", {}), [
        ("situationsadaequat", "Situationsadäquatheit"),
        ("wortwahl", "Wortwahl / Ausdruck"),
        ("satzstrukturen", "Satzstrukturen"),
        ("eigenstaendigkeit", "Eigenständigkeit"),
    ])
    
    # K3/1 Sprachnormen
    p = doc.add_paragraph()
    p.add_run("K3/1 – Sprachnormen").bold = True
    
    _add_srdp_table(doc, srdp_detail.get("k3_sprachnormen", {}), [
        ("orthografie", "Orthografie"),
        ("zeichensetzung", "Zeichensetzung"),
        ("grammatik", "Grammatik"),
    ])
    
    # Verbesserungshinweise
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("Zentrale Verbesserungshinweise").bold = True
    
    for key, label in [
        ("verbesserung_inhaltlich", "Inhaltlich"),
        ("verbesserung_strukturell", "Strukturell"),
        ("verbesserung_sprachlich", "Sprachlich"),
    ]:
        text = srdp_detail.get(key, "")
        if text:
            p = doc.add_paragraph()
            r = p.add_run(f"{label}: ")
            r.bold = True
            r.font.size = Pt(10)
            r2 = p.add_run(text)
            r2.font.size = Pt(10)


def _add_srdp_table(doc, data: dict, kriterien: list[tuple[str, str]]):
    """Erstellt eine SRDP-Tabelle mit Kriterium | Einschätzung | Begründung."""
    from docx.shared import Cm
    
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    
    # Header
    hdr = table.rows[0].cells
    hdr[0].text = "Kriterium"
    hdr[1].text = "Einschätzung"
    hdr[2].text = "Begründung"
    for cell in hdr:
        for p in cell.paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(9)
    
    # Spaltenbreiten
    table.columns[0].width = Cm(3.5)
    table.columns[1].width = Cm(5.0)
    table.columns[2].width = Cm(8.5)
    
    for key, label in kriterien:
        entry = data.get(key, {})
        stufe = entry.get("stufe", 0)
        begruendung = entry.get("begruendung", "")
        
        # SRDP-Wortlaut nachschlagen
        wortlaut_map = SRDP_WORTLAUT.get(key, {})
        einschaetzung = wortlaut_map.get(stufe, f"Stufe {stufe}")
        
        row = table.add_row()
        
        # Kriterium (fett)
        p = row.cells[0].paragraphs[0]
        r = p.add_run(label)
        r.bold = True
        r.font.size = Pt(9)
        
        # Einschätzung (kursiv, SRDP-Wortlaut)
        p = row.cells[1].paragraphs[0]
        r = p.add_run(einschaetzung)
        r.italic = True
        r.font.size = Pt(9)
        
        # Begründung
        p = row.cells[2].paragraphs[0]
        r = p.add_run(begruendung)
        r.font.size = Pt(9)
```

## Speicherung

Die SRDP-Detailbewertung wird im selben JSON gespeichert:

```python
result["srdp_detail"] = srdp_detail_response
```

## Integration in den Workflow

Im DOCX-Export (`build_feedback_document`), nach dem Fehlerprotokoll:

```python
srdp_detail = data_dict.get("srdp_detail")
if srdp_detail:
    add_srdp_raster(doc, srdp_detail)
```

Die SRDP-Detailbewertung wird automatisch bei jeder Analyse
mitgeneriert (zweiter LLM-Call nach der Hauptanalyse).

## Dateien

| Datei | Änderung |
|-------|----------|
| `natascha_core.py` | `generate_srdp_detail()`, Integration nach Hauptanalyse |
| `generate_feedback.py` | `add_srdp_raster()`, `_add_srdp_table()`, SRDP_WORTLAUT |

## Reihenfolge im DOCX (aktualisiert)

1. Kopfbereich (Schüler/in, Klasse, Textsorte, Wörter, Datum)
2. Zusammenfassung + Stärken
3. Korrigierter Schülertext (mit Inline-Markierungen)
4. Fehlerprotokoll (Tabelle)
5. **SRDP-Beurteilungsraster (NEU)** — K1 + K3/1 Tabellen
6. **Verbesserungshinweise (NEU)** — inhaltlich, strukturell, sprachlich
7. Notenempfehlung
