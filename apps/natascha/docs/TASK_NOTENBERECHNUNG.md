# NATASCHA: Notenberechnung in der App (SRDP-konform)

## Ziel

Die Notenberechnung vom LLM in die App verlagern. Das LLM liefert
weiterhin Kriterien-Punkte (0-4 Stufen), aber die Gesamtnote wird
deterministisch in der App berechnet nach SRDP-Regeln.

## Warum

- Verschiedene LLMs rechnen unterschiedlich (GPT vs. Sonnet vs. DeepSeek)
- SRDP hat Sonderregeln die kein LLM zuverlässig anwendet
- Die Berechnung muss transparent und nachvollziehbar sein

## SRDP-Notenberechnung (Regeln)

### Grundprinzip
Zwei Kompetenzbereiche:
- **K1** = Inhalt + Textstruktur (Aufgabenerfüllung)
- **K3/1** = Stil/Ausdruck + Sprachrichtigkeit (sprachliche Kompetenz)

Jedes Kriterium wird auf einer Skala von 0-4 bewertet:
- 0 = nicht erfüllt
- 1 = das Wesentliche überwiegend erfüllt
- 2 = das Wesentliche zur Gänze erfüllt
- 3 = über das Wesentliche hinausgehend erfüllt
- 4 = weit über das Wesentliche hinausgehend erfüllt

### Sonderregeln
1. **K1 nicht erfüllt → automatisch Nicht genügend.**
   Wenn der Durchschnitt von Inhalt + Textstruktur unter 1.0 liegt,
   ist die Gesamtnote 5, unabhängig von K3/1.

2. **K3/1 nicht erfüllt → Deckelung auf Genügend.**
   Wenn der Durchschnitt von Ausdruck + Sprachrichtigkeit unter 1.0
   liegt, kann die Gesamtnote maximal 4 sein.

### Notengrenzen (Gesamtdurchschnitt aller 4 Kriterien)
- 3.50 - 4.00 → Note 1 (Sehr gut)
- 2.50 - 3.49 → Note 2 (Gut)
- 1.50 - 2.49 → Note 3 (Befriedigend)
- 0.50 - 1.49 → Note 4 (Genügend)
- 0.00 - 0.49 → Note 5 (Nicht genügend)

## Implementierung

### 1. Neue Funktion in `natascha_core.py`

```python
def berechne_note_srdp(bewertung: dict) -> dict:
    """Berechnet die Gesamtnote nach SRDP-Regeln.
    
    Args:
        bewertung: Dict mit Kriterien-Keys und Objekten die 'punkte' enthalten.
                   Erwartet: inhalt, textstruktur (oder aufbau), ausdruck, sprachrichtigkeit
    
    Returns:
        Dict mit: durchschnitt, note, bezeichnung, begruendung,
                  k1_schnitt, k3_schnitt, sonderregel (str oder None)
    """
    # Kriterien-Mapping (flexible Keys)
    INHALT_KEYS = ("inhalt", "task_achievement")
    STRUKTUR_KEYS = ("textstruktur", "aufbau", "organisation_layout")
    AUSDRUCK_KEYS = ("ausdruck", "stil_ausdruck", "lexical_range_accuracy")
    SPRACHE_KEYS = ("sprachrichtigkeit", "normative_sprachrichtigkeit", "grammatical_range_accuracy")
    
    def _get_punkte(keys):
        for k in keys:
            if k in bewertung:
                val = bewertung[k]
                if isinstance(val, dict):
                    return float(val.get("punkte", 0))
                return float(val)
        return 0.0
    
    inhalt = _get_punkte(INHALT_KEYS)
    struktur = _get_punkte(STRUKTUR_KEYS)
    ausdruck = _get_punkte(AUSDRUCK_KEYS)
    sprache = _get_punkte(SPRACHE_KEYS)
    
    k1 = (inhalt + struktur) / 2
    k3 = (ausdruck + sprache) / 2
    gesamt = (inhalt + struktur + ausdruck + sprache) / 4
    
    sonderregel = None
    
    # Sonderregel 1: K1 nicht erfüllt
    if k1 < 1.0:
        return {
            "durchschnitt": round(gesamt, 2),
            "note": 5,
            "bezeichnung": "Nicht genügend",
            "begruendung": (
                f"K1 (Inhalt + Textstruktur) nicht erfüllt (Schnitt {k1:.2f}). "
                f"Gemäß SRDP automatisch Nicht genügend."
            ),
            "k1_schnitt": round(k1, 2),
            "k3_schnitt": round(k3, 2),
            "sonderregel": "K1_NICHT_ERFUELLT",
        }
    
    # Notenzuordnung nach Gesamtdurchschnitt
    if gesamt >= 3.50:
        note, bez = 1, "Sehr gut"
    elif gesamt >= 2.50:
        note, bez = 2, "Gut"
    elif gesamt >= 1.50:
        note, bez = 3, "Befriedigend"
    elif gesamt >= 0.50:
        note, bez = 4, "Genügend"
    else:
        note, bez = 5, "Nicht genügend"
    
    # Sonderregel 2: K3/1 nicht erfüllt → Deckelung
    if k3 < 1.0 and note < 4:
        sonderregel = "K3_DECKELUNG"
        note = 4
        bez = "Genügend"
    
    return {
        "durchschnitt": round(gesamt, 2),
        "note": note,
        "bezeichnung": bez,
        "begruendung": (
            f"Durchschnitt {gesamt:.2f} aus "
            f"Inhalt ({inhalt:.0f}), Textstruktur ({struktur:.0f}), "
            f"Ausdruck ({ausdruck:.0f}), Sprachrichtigkeit ({sprache:.0f})."
            + (f" Sonderregel: {sonderregel}." if sonderregel else "")
        ),
        "k1_schnitt": round(k1, 2),
        "k3_schnitt": round(k3, 2),
        "sonderregel": sonderregel,
    }
```

### 2. Integration nach dem LLM-Call

In der Analyse-Funktion (wo das JSON vom LLM zurückkommt und validiert wird),
NACH der Schema-Validierung und NACH dem Metadaten-Override:

```python
# LLM-Notenempfehlung aufheben (als Vergleichswert)
if "notenempfehlung" in result:
    result["notenempfehlung_llm"] = result["notenempfehlung"]

# App-Notenberechnung (SRDP-konform)
if result.get("bewertung"):
    app_note = berechne_note_srdp(result["bewertung"])
    result["notenempfehlung"] = {
        "durchschnitt": app_note["durchschnitt"],
        "note": app_note["note"],
        "bezeichnung": app_note["bezeichnung"],
        "begruendung": app_note["begruendung"],
    }
```

### 3. UI: Abweichungs-Hinweis

In der Detailansicht (center panel), wenn App-Note und LLM-Note abweichen:

```
Note: 3 - Befriedigend (App-Berechnung)
⚠ LLM empfiehlt: 2 - Gut (Abweichung)
```

Nur anzeigen wenn `notenempfehlung_llm` existiert UND die Note abweicht.

### 4. DOCX: Keine Änderung nötig

`generate_feedback.py` liest `notenempfehlung` — da dieses Feld jetzt
die App-berechnete Note enthält, stimmt der Output automatisch.

Optional: Im Notenempfehlungs-Abschnitt einen Vermerk einfügen:
"Berechnung nach SRDP-Standard (K1: {k1}, K3/1: {k3})."

### 5. Nur im Schularbeitsmodus

Die App-Notenberechnung nur ausführen wenn `bewertungsmodus == "benotet"`.
Im Hausaufgabenmodus bleibt alles wie bisher (keine Note).

## Dateien

| Datei | Änderung |
|-------|----------|
| `natascha_core.py` | `berechne_note_srdp()` + Integration nach LLM-Call |
| `natascha.py` | Abweichungs-Hinweis in Detailansicht |

## Testfälle

| Inhalt | Struktur | Ausdruck | Sprache | Erwartet |
|--------|----------|----------|---------|----------|
| 4 | 4 | 3 | 3 | Note 1 (Schnitt 3.50) |
| 3 | 3 | 3 | 3 | Note 2 (Schnitt 3.00) |
| 2 | 2 | 2 | 2 | Note 3 (Schnitt 2.00) |
| 1 | 1 | 1 | 1 | Note 4 (Schnitt 1.00) |
| 0 | 0 | 0 | 0 | Note 5 (Schnitt 0.00) |
| 0 | 1 | 4 | 4 | Note 5 (K1=0.5, Sonderregel) |
| 3 | 3 | 0 | 0 | Note 4 (K3=0.0, Deckelung) |
| 2 | 3 | 2 | 1 | Note 3 (Schnitt 2.00, normal) |
