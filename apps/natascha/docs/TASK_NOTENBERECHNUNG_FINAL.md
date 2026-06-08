# NATASCHA: App-seitige Notenberechnung (SRDP + Unterstufe)

## Ziel

Die Notenberechnung vom LLM in die App verlagern. Das LLM liefert
weiterhin Kriterien-Punkte (1-5) und ggf. SRDP-Detail (15 Unterkriterien).
Die Gesamtnote wird deterministisch in der App berechnet.

Die Note wird als EMPFEHLUNG angezeigt, nicht als verbindliches Urteil.

---

## 1. Neue Funktion: berechne_note_srdp() in natascha_core.py

Für Oberstufe. Verwendet srdp_detail wenn vorhanden, sonst Fallback
auf die 4 Hauptkriterien.

```python
def berechne_note_srdp(bewertung: dict, srdp_detail: dict | None = None) -> dict:
    """SRDP-konforme Notenberechnung für Oberstufe.
    
    Skala: 1-5 (1=nicht erfüllt, 5=sehr gut).
    K1 = Inhalt + Textstruktur, K3 = Stil + Sprachnormen.
    Note = 6 - Stufe (invertiert: Stufe 5 → Note 1).
    """
    if srdp_detail:
        k1_vals = []
        for section in ("k1_inhalt", "k1_textstruktur"):
            for entry in srdp_detail.get(section, {}).values():
                if isinstance(entry, dict) and "stufe" in entry:
                    k1_vals.append(float(entry["stufe"]))
        
        k3_vals = []
        for section in ("k3_stil", "k3_sprachnormen"):
            for entry in srdp_detail.get(section, {}).values():
                if isinstance(entry, dict) and "stufe" in entry:
                    k3_vals.append(float(entry["stufe"]))
        
        k1_stufe = sum(k1_vals) / len(k1_vals) if k1_vals else 3.0
        k3_stufe = sum(k3_vals) / len(k3_vals) if k3_vals else 3.0
    else:
        # Fallback auf Hauptanalyse (4 Kriterien)
        KEY_VARIANTS = {
            "inhalt": ("inhalt", "task_achievement"),
            "textstruktur": ("textstruktur", "aufbau", "organisation_layout"),
            "ausdruck": ("ausdruck", "stil_ausdruck", "lexical_range_accuracy"),
            "sprachrichtigkeit": ("sprachrichtigkeit", "normative_sprachrichtigkeit",
                                  "grammatical_range_accuracy"),
        }
        def _get(variants):
            for k in variants:
                if k in bewertung:
                    val = bewertung[k]
                    return float(val.get("punkte", 3) if isinstance(val, dict) else val)
            return 3.0
        
        inhalt = _get(KEY_VARIANTS["inhalt"])
        struktur = _get(KEY_VARIANTS["textstruktur"])
        ausdruck = _get(KEY_VARIANTS["ausdruck"])
        sprache = _get(KEY_VARIANTS["sprachrichtigkeit"])
        k1_stufe = (inhalt + struktur) / 2
        k3_stufe = (ausdruck + sprache) / 2
    
    # Stufe → Note (invertiert): Note = 6 - Stufe
    k1_note = max(1, min(5, round(6 - k1_stufe)))
    k3_note = max(1, min(5, round(6 - k3_stufe)))
    
    # Sonderregel: "nicht erfüllt" (Stufe <= 1.5) → Note 5
    sonderregel = None
    if k1_stufe <= 1.5:
        sonderregel = "K1_NICHT_ERFUELLT"
        return _srdp_result(5, "Nicht genügend", k1_note=5, k3_note=k3_note,
                            k1_stufe=k1_stufe, k3_stufe=k3_stufe,
                            sonderregel=sonderregel,
                            begruendung=f"K1 nicht erfüllt (Stufe {k1_stufe:.2f}). "
                                        "Automatisch Nicht genügend gemäß SRDP.")
    
    if k3_stufe <= 1.5:
        sonderregel = "K3_NICHT_ERFUELLT"
        return _srdp_result(5, "Nicht genügend", k1_note=k1_note, k3_note=5,
                            k1_stufe=k1_stufe, k3_stufe=k3_stufe,
                            sonderregel=sonderregel,
                            begruendung=f"K3/1 nicht erfüllt (Stufe {k3_stufe:.2f}). "
                                        "Automatisch Nicht genügend gemäß SRDP.")
    
    # Gesamtnote = gerundeter Durchschnitt von K1-Note und K3-Note
    gesamt = round((k1_note + k3_note) / 2)
    gesamt = max(1, min(5, gesamt))
    
    BEZ = {1: "Sehr gut", 2: "Gut", 3: "Befriedigend",
           4: "Genügend", 5: "Nicht genügend"}
    
    return _srdp_result(gesamt, BEZ[gesamt], k1_note=k1_note, k3_note=k3_note,
                        k1_stufe=k1_stufe, k3_stufe=k3_stufe,
                        sonderregel=None,
                        begruendung=f"K1: Note {k1_note} (Stufe {k1_stufe:.2f}), "
                                    f"K3/1: Note {k3_note} (Stufe {k3_stufe:.2f}).")


def _srdp_result(note, bezeichnung, **kwargs) -> dict:
    return {
        "note": note,
        "bezeichnung": bezeichnung,
        "durchschnitt": round((kwargs["k1_stufe"] + kwargs["k3_stufe"]) / 2, 2),
        "k1_note": kwargs["k1_note"],
        "k3_note": kwargs["k3_note"],
        "k1_schnitt": round(kwargs["k1_stufe"], 2),
        "k3_schnitt": round(kwargs["k3_stufe"], 2),
        "sonderregel": kwargs.get("sonderregel"),
        "begruendung": kwargs["begruendung"],
        "quelle": "app",  # Unterscheidung von LLM-Empfehlung
    }
```

## 2. Neue Funktion: berechne_note_unterstufe() in natascha_core.py

Einfache Logik: gewichteter Durchschnitt, Stufe → Note invertiert.

```python
def berechne_note_unterstufe(bewertung: dict, gewichtung: dict | None = None) -> dict:
    """Notenberechnung für Unterstufe. Gewichteter Durchschnitt der 4 Kriterien."""
    if not gewichtung:
        gewichtung = {"inhalt": 0.25, "textstruktur": 0.25,
                      "ausdruck": 0.25, "sprachrichtigkeit": 0.25}
    
    total = 0.0
    details = {}
    for key, weight in gewichtung.items():
        val = bewertung.get(key, {})
        stufe = float(val.get("punkte", 3) if isinstance(val, dict) else 3)
        total += stufe * weight
        details[key] = stufe
    
    note = max(1, min(5, round(6 - total)))
    BEZ = {1: "Sehr gut", 2: "Gut", 3: "Befriedigend",
           4: "Genügend", 5: "Nicht genügend"}
    
    detail_str = ", ".join(f"{k}: Stufe {v:.0f}" for k, v in details.items())
    
    return {
        "note": note,
        "bezeichnung": BEZ[note],
        "durchschnitt": round(total, 2),
        "begruendung": f"Gewichteter Durchschnitt {total:.2f} ({detail_str}).",
        "quelle": "app",
    }
```

## 3. Gewichtung aus Rubric parsen

```python
def parse_gewichtung(rubric_text: str) -> dict[str, float]:
    """Liest die Gewichtung aus dem '## Gewichtung'-Abschnitt."""
    gewichtung = {}
    in_section = False
    for line in rubric_text.split("\n"):
        if line.strip().startswith("## Gewichtung"):
            in_section = True
            continue
        if in_section and line.strip().startswith("- "):
            match = re.match(r'-\s*(\w[\w\s]*?):\s*(\d+)\s*%', line)
            if match:
                key = match.group(1).strip().lower()
                # Key-Mapping: "Inhalt und Argumentation" → "inhalt"
                for canon in ("inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit"):
                    if canon in key:
                        key = canon
                        break
                pct = int(match.group(2)) / 100
                gewichtung[key] = pct
        elif in_section and line.strip().startswith("##"):
            break
    return gewichtung or {"inhalt": 0.25, "textstruktur": 0.25,
                          "ausdruck": 0.25, "sprachrichtigkeit": 0.25}
```

## 4. Integration nach dem LLM-Call

In `run_llm_analysis()` (oder wo das JSON vom LLM zurückkommt),
NACH Schema-Validierung und Metadaten-Override:

```python
# LLM-Notenempfehlung aufheben
if "notenempfehlung" in result:
    result["notenempfehlung_llm"] = result.pop("notenempfehlung")

# App-Notenberechnung
if bewertungsmodus == "benotet" and result.get("bewertung"):
    if schulstufe.lower() in ("oberstufe", "ahs-oberstufe"):
        srdp = result.get("srdp_detail")
        app_note = berechne_note_srdp(result["bewertung"], srdp)
    else:
        gew = parse_gewichtung(rubric_content) if rubric_content else None
        app_note = berechne_note_unterstufe(result["bewertung"], gew)
    
    result["notenempfehlung"] = {
        "durchschnitt": app_note["durchschnitt"],
        "note": app_note["note"],
        "bezeichnung": app_note["bezeichnung"],
        "begruendung": app_note["begruendung"],
    }
    # Zusatzinfos für UI (nicht im DOCX)
    result["notendetail"] = app_note
```

## 5. UI-Anzeige: Empfehlung mit Transparenz

In der Detailansicht (center panel) statt nur "Note: 3 - Befriedigend":

```
Notenempfehlung: 3 - Befriedigend (App-Berechnung)
  K1 (Inhalt + Textstruktur): Note 3 [Stufe 3.2]
  K3 (Stil + Sprachnormen):   Note 4 [Stufe 2.1]
```

Wenn LLM-Note abweicht:
```
  ⚠ LLM empfiehlt: 2 - Gut (Abweichung)
```

Wenn Sonderregel greift:
```
  ⚠ Sonderregel: K1 nicht erfüllt → automatisch Nicht genügend
```

## 6. DOCX-Anzeige

Im Notenempfehlungs-Abschnitt des DOCX:

```
NOTENEMPFEHLUNG (SRDP-basiert)

Empfohlene Note: 3 - Befriedigend

K1 (Inhalt + Textstruktur): Note 3
K3/1 (Stil + Sprachnormen): Note 4

Berechnung: K1 Stufe 3.2, K3/1 Stufe 2.1
             Gesamtdurchschnitt → Note 3

Hinweis: Diese Empfehlung wurde nach SRDP-Standard berechnet.
Die endgültige Note liegt im Ermessen der Lehrkraft.
```

Für Unterstufe:
```
NOTENEMPFEHLUNG

Empfohlene Note: 3 - Befriedigend

Inhalt: Stufe 3 | Textstruktur: Stufe 4 | Ausdruck: Stufe 3 | Sprachrichtigkeit: Stufe 2
Gewichteter Durchschnitt: 3.00

Hinweis: Die endgültige Note liegt im Ermessen der Lehrkraft.
```

## Dateien

| Datei | Änderung |
|-------|----------|
| `natascha_core.py` | `berechne_note_srdp()`, `berechne_note_unterstufe()`, `parse_gewichtung()`, Integration nach LLM-Call |
| `natascha.py` | Detailansicht: K1/K3-Transparenz, LLM-Abweichung |
| `generate_feedback.py` | DOCX-Notenabschnitt mit K1/K3-Aufschlüsselung |

## Testfälle

| K1-Stufe | K3-Stufe | Erwartete Note | Begründung |
|----------|----------|----------------|------------|
| 4.5 | 4.0 | 1 (Sehr gut) | K1=Note 2, K3=Note 2, Schnitt=2→? Nein: 6-4.5=1.5→2, 6-4=2, (2+2)/2=2. Note 2. |
| 3.5 | 3.5 | 2 (Gut) | 6-3.5=2.5→3, (3+3)/2=3. Note 3? Nein, round(2.5)=2, (2+2)/2=2. Note 2. |
| 3.0 | 3.0 | 3 (Befriedigend) | 6-3=3, (3+3)/2=3. |
| 2.0 | 2.5 | 4 (Genügend) | 6-2=4, 6-2.5=3.5→4, (4+4)/2=4. |
| 1.0 | 3.0 | 5 (Nicht genügend) | K1 ≤ 1.5 → Sonderregel. |
| 3.0 | 1.0 | 5 (Nicht genügend) | K3 ≤ 1.5 → Sonderregel. |
| 1.5 | 1.5 | 5 (Nicht genügend) | Beide ≤ 1.5. |
| 2.0 | 2.0 | 4 (Genügend) | 6-2=4, (4+4)/2=4. |
