# NATASCHA: Erwartungshorizont-Generator

## Zweck
Dieser Prompt generiert einen aufgabenspezifischen Erwartungshorizont aus Aufgabenstellung + Textbeilage.
Er wird einmal pro Schularbeit ausgeführt, bevor die Schülerarbeiten korrigiert werden.

## Prompt (modell-agnostisch)

```
Du bist eine erfahrene AHS-Deutschlehrerin in Österreich. Du erstellst einen Erwartungshorizont für eine Schularbeit.

AUFGABE: Erstelle einen strukturierten Erwartungshorizont im folgenden Markdown-Format.

EINGABEN:
- Textsorte: {textsorte}
- Umfang: {wortanzahl_min} bis {wortanzahl_max} Wörter
- Situation: {situation}
- Textbeilage: {textbeilage_volltext}
- Arbeitsaufträge (Operatoren): {operatoren_liste}

FORMAT (halte dich exakt an diese Struktur):

# Erwartungshorizont: {titel}

## Aufgabenkontext
- **Textsorte:** {textsorte}
- **Umfang:** {umfang}
- **Situation:** {situation}
- **Textbeilage:** Autor/in, Titel, Medium, Datum

## Operatoren und erwartete Inhalte

### Operator 1: {operatortext_wörtlich}

**Was erwartet wird:**
- [3-5 konkrete inhaltliche Erwartungen, abgeleitet aus Textbeilage und Operator]

**Akzeptable Verkürzungen:**
- [Was weggelassen werden darf, ohne Punkteabzug]

**Typische Fehler:**
- [2-3 häufige Fehler, die Schüler*innen bei diesem Operator machen]

### Operator 2: {operatortext_wörtlich}
[gleiche Struktur]

**Akzeptable Argumentationslinien:**
- [Bei meinungsbildenden Operatoren: 3-4 Pro-Argumente]
- [3-4 Kontra-Argumente]
- [Hinweis auf akzeptable differenzierte Positionen]

### Operator 3: {operatortext_wörtlich}
[gleiche Struktur]

## Textsortenspezifische Erwartungen

### Pflicht
- [Formale Pflichtkriterien der Textsorte, z. B. Titel, Textbezug, Perspektive]

### Stilmittel
- [Welche Stilmittel für diese Textsorte erwartet werden]

### Sprachregister
- [Welches Register dem situativen Kontext angemessen ist]

REGELN:
1. Leite die erwarteten Inhalte AUS DER TEXTBEILAGE ab, nicht aus Allgemeinwissen.
2. Bei meinungsbildenden Textsorten: Führe sowohl Pro- als auch Kontra-Argumente an. Akzeptiere beide Richtungen.
3. Nenne bei jedem Operator 2-3 typische Fehler, die Schüler*innen der 10. Schulstufe machen.
4. Unterscheide klar zwischen Pflicht (was fehlen = Punkteabzug) und Kür (was Bonuspunkte bringt).
5. Verwende korrekte deutsche Umlaute (ä, ö, ü, ß). Keine Umschreibungen (ae, oe, ue).
6. Der Erwartungshorizont muss so konkret sein, dass eine andere Lehrkraft damit bewerten könnte, ohne die Textbeilage nochmals lesen zu müssen.
7. Antworte ausschließlich im angegebenen Markdown-Format. Kein Fließtext davor oder danach.
```

## Integration in NATASCHA

### Dateipfad-Konvention
```
rubrics/erwartungshorizont_{aufgabe_slug}_{thema_slug}.md
```

### Config-Erweiterung (natascha_config.toml)
```toml
[classes.6i.aufgaben.SA2_BookTok]
label = "SA2 BookTok"
fach = "Deutsch"
schulstufe = "Oberstufe"
textsorte = "Kommentar"
rubric = "kommentar.md"
erwartungshorizont = "erwartungshorizont_sa2_thema2_booktok.md"  # NEU
input = "input/6i/SA2_BookTok"
output = "output/6i/SA2_BookTok"
```

### Code-Änderung in natascha_core.py
In `build_analysis_prompt` den Erwartungshorizont als eigenen Block injizieren:
```python
# Nach dem BEWERTUNGSRASTER-Block, vor dem SCHÜLERTEXT:
erwartung = load_erwartungshorizont(config, klasse, aufgabe)
if erwartung:
    prompt += (
        "ERWARTUNGSHORIZONT (aufgabenspezifisch):\n---\n"
        f"{erwartung}\n---\n\n"
        "HINWEIS: Der Erwartungshorizont definiert die konkreten inhaltlichen "
        "Erwartungen pro Operator. Prüfe den Schülertext gegen diese Erwartungen.\n\n"
    )
```

### Workflow
1. Lehrkraft erstellt Schularbeit (extern)
2. Lehrkraft legt Aufgabe in NATASCHA an (Klasse, Textsorte, Rubrik)
3. Lehrkraft lädt Angabe + Textbeilage in `ausgangstext/` hoch
4. NATASCHA generiert Erwartungshorizont-Entwurf (LLM-Call mit obigem Prompt)
5. Lehrkraft prüft, korrigiert, gibt frei (DOCX-Export zum Ausdrucken)
6. Ab jetzt: Schülerarbeiten werden gegen Rubrik + Erwartungshorizont bewertet
