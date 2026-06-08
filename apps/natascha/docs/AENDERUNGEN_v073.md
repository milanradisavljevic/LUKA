# NATASCHA v0.7.3 — Konsolidiertes Änderungspaket

## A) Beistrich-Korrekturen: Nur den Beistrich grün markieren

### Problem
Bei Kommafehlern wird der gesamte Abschnitt als grüne Korrektur
eingesetzt. Der einzige Unterschied ist aber ein Komma.

### Lösung
Heuristik in `generate_feedback.py`: Wenn sich Original und Korrektur
nur durch eingefügte/entfernte Satzzeichen unterscheiden, dann NUR
das Satzzeichen grün einfügen, Originaltext NICHT durchstreichen.

```python
def is_punctuation_only_fix(original: str, korrektur: str) -> bool:
    """True wenn der Unterschied nur ein eingefügtes/entferntes Satzzeichen ist."""
    strip_punct = lambda s: re.sub(r'[,;:\.!\?\-–]', '', s).strip()
    return strip_punct(original.lower()) == strip_punct(korrektur.lower())
```

Beim Rendern: Wenn `is_punctuation_only_fix` True, den Originaltext
normal belassen und nur das fehlende Zeichen als grünen Run einfügen.

---

## B) Textsorte wird im Zuordnungsmenü nicht beibehalten

Beim Öffnen des Zuordnungsmenüs wird die Textsorte auf den Default
zurückgesetzt. Fix: Vorbelegung aus `auf_cfg.get("textsorte", ...)`.

---

## C) LLM-Anzeige in der UI

Die JSON-Analyse enthält `modell` und `provider`. In der Detailansicht
einer analysierten Datei anzeigen: `Analysiert mit: GPT-4.1 (OpenAI)`.
Nur in der UI, NICHT im DOCX-Export.

---

## D) Schülername-Extraktion verbessern

Zusätzlich zum Dateinamen auch DOCX-Header und erste Zeile prüfen:

```python
def extract_schueler_name(docx_path: Path) -> str:
    name = extract_vorname_from_filename(docx_path.name)
    if name:
        return name
    try:
        doc = DocxDocument(str(docx_path))
        for section in doc.sections:
            for p in section.header.paragraphs:
                text = p.text.strip()
                if text and len(text) < 40:
                    for part in text.split():
                        if re.match(r'^[A-ZÄÖÜ][a-zäöüß]{2,}$', part) and part not in _NAME_BLOCKLIST:
                            return part
        for p in doc.paragraphs[:3]:
            text = p.text.strip()
            if text and len(text) < 40:
                for part in text.split():
                    if re.match(r'^[A-ZÄÖÜ][a-zäöüß]{2,}$', part) and part not in _NAME_BLOCKLIST:
                        return part
    except Exception:
        pass
    return ""
```

---

## E) Metadaten-Override: Klasse aus Ordnerstruktur statt LLM

### Problem
Das LLM halluziniert manchmal die Klasse ("6B" statt "6i").

### Fix
Nach dem LLM-Call bekannte Metadaten hart überschreiben:

```python
result = extract_json_from_llm(llm_response)
result["klasse"] = klasse          # aus Ordnerstruktur
result["fach"] = fach              # aus Config
result["schulstufe"] = schulstufe  # aus Config
result["textsorte"] = textsorte    # aus Config
result["rubrik"] = rubric_name     # aus Config
result["datei"] = filename         # bekannt
if schueler:
    result["schueler"] = schueler
```

---

## F) Konsistenzcheck Fehleranzahl vs. Sprachrichtigkeit-Note

Nach dem LLM-Call prüfen ob die Fehleranzahl zur Note passt:

```python
fehler_count = len(result.get("fehler", []))
sprach_key = next((k for k in result.get("bewertung", {}) 
                    if "sprach" in k.lower()), None)
if sprach_key:
    sprachnote = result["bewertung"][sprach_key].get("punkte", 3)
    if fehler_count > 15 and sprachnote >= 4:
        log.warning(f"Inkonsistenz: {fehler_count} Fehler aber Note {sprachnote}")
```

---

## G) Thema/Ausgangstext-Hinweis im DOCX

Im Kopfbereich des DOCX eine Zeile ergänzen, die das gewählte Thema
bzw. den Ausgangstext zeigt. Quelle: der Dateiname aus dem
`ausgangstext/`-Ordner oder der Aufgabenname aus der Config.

---

## H) Erwartungshorizont-Generator in der UI

### Konzept
Die Lehrkraft soll den Erwartungshorizont direkt in der App generieren
können, mit einem separaten (ggf. stärkeren) LLM.

### UI-Workflow

1. Im Zuordnungsmenü oder als eigener Menüpunkt "Erwartungshorizont":
   - Button "Erwartungshorizont generieren"
   - Dropdown: LLM-Auswahl (unabhängig vom Korrektur-LLM!)
     - z. B. Claude Opus für EH, GPT-4.1 für Korrektur
   - Voraussetzung: Ausgangstext muss im `ausgangstext/`-Ordner liegen
     UND Textsorte + Rubrik müssen zugeordnet sein

2. Beim Klick auf "Generieren":
   - App liest: Ausgangstext, Rubrik, Textsorte, Situation
   - Baut den Erwartungshorizont-Prompt (aus `prompts/PROMPT_ERWARTUNGSHORIZONT.md`)
   - Schickt an das gewählte LLM
   - Speichert das Ergebnis als `rubrics/erwartungshorizont_{aufgabe_slug}.md`
   - Trägt den Dateinamen automatisch in die Config ein

3. Vorschau + Freigabe:
   - Der generierte EH wird in der UI als Vorschau angezeigt (Markdown-Render)
   - Button "Übernehmen" speichert final
   - Button "Neu generieren" startet erneut (ggf. mit anderem LLM)
   - Button "DOCX-Export" erstellt die druckbare Lehrkraft-Version

### Technische Umsetzung

#### Neuer Config-Abschnitt:
```toml
[erwartungshorizont]
default_provider = "anthropic"
default_model = "claude-sonnet-4-20250514"
# Oder für maximale Qualität:
# default_provider = "anthropic"
# default_model = "claude-opus-4-20250514"
```

#### Neuer API-Call in natascha_core.py:

```python
def generate_erwartungshorizont(
    config: dict,
    klasse: str,
    aufgabe: str,
    provider: str = "",
    model: str = "",
) -> str:
    """Generiert einen Erwartungshorizont aus Ausgangstext + Rubrik + Textsorte."""
    
    auf_cfg = get_aufgabe_cfg(config, klasse, aufgabe)
    
    # Ausgangstext laden
    ausgangstext = load_ausgangstext(config, klasse, aufgabe)
    if not ausgangstext:
        raise ValueError("Kein Ausgangstext gefunden. "
                        "Bitte zuerst in ausgangstext/ ablegen.")
    
    # Rubrik laden
    rubric = load_rubric_for_aufgabe(config, klasse, aufgabe)
    
    # Prompt aus Template bauen
    prompt_template = (PROJECT_ROOT / "prompts" / "PROMPT_ERWARTUNGSHORIZONT.md").read_text("utf-8")
    
    # Template-Variablen ersetzen
    textsorte = auf_cfg.get("textsorte", "")
    situation = auf_cfg.get("situation", "")  # Optional, aus Config
    
    prompt = (
        "Du bist eine erfahrene AHS-Deutschlehrerin in Österreich.\n"
        "Erstelle einen Erwartungshorizont im Markdown-Format.\n\n"
        f"TEXTSORTE: {textsorte}\n"
        f"SITUATION: {situation}\n\n"
        f"BEWERTUNGSRASTER:\n---\n{rubric}\n---\n\n"
        f"AUSGANGSTEXT + AUFGABENSTELLUNG:\n---\n{ausgangstext}\n---\n\n"
        "AUSGABEFORMAT:\n"
        "Antworte ausschließlich im Markdown-Format gemäß der Vorlage "
        "in prompts/PROMPT_ERWARTUNGSHORIZONT.md.\n"
        "Leite die erwarteten Inhalte AUS DER TEXTBEILAGE ab.\n"
        "Nenne Pro- UND Kontra-Argumente.\n"
        "Nenne typische Fehler pro Operator.\n"
        "Verwende korrekte Umlaute (ä, ö, ü, ß).\n"
    )
    
    # Provider/Model: EH-spezifisch oder Default
    eh_cfg = config.get("erwartungshorizont", {})
    prov = provider or eh_cfg.get("default_provider", "anthropic")
    mod = model or eh_cfg.get("default_model", "claude-sonnet-4-20250514")
    
    # API-Call (dieselbe Infrastruktur wie analyze, aber ohne Schema-Validierung)
    response = call_llm(prov, mod, prompt, config)
    
    return response  # Rohes Markdown
```

#### UI in natascha.py:

Neuer Screen oder Modal, erreichbar über:
- Tastenkürzel `e` (für Erwartungshorizont) im Hauptmenü
- Oder als Untermenüpunkt im Zuordnungsmenü

Der Screen zeigt:
- Aktuelle Aufgabe + Ausgangstext-Status (vorhanden/fehlt)
- LLM-Auswahl (Dropdown: alle konfigurierten Provider+Modelle)
- "Generieren"-Button
- Markdown-Vorschau des Ergebnisses
- "Übernehmen" / "Neu generieren" / "DOCX-Export" Buttons

#### DOCX-Export:

Für den DOCX-Export des Erwartungshorizonts die bestehende
Markdown-zu-DOCX-Logik nutzen oder eine dedizierte Funktion.
Minimalistisches Layout, druckfreundlich, wie in der Lehrunterlagen-
Natascha-Skill-Ästhetik.

### Dateistruktur

```
prompts/
  PROMPT_ERWARTUNGSHORIZONT.md     # Prompt-Template (existiert bereits)
rubrics/
  erwartungshorizont_sa2_thema1.md # Generiert + freigegeben
  erwartungshorizont_sa2_thema2.md # Generiert + freigegeben
```

---

## Priorität

1. **E** — Metadaten-Override (verhindert falsche Klassen im Output)
2. **A** — Beistrich-Fix (Lesbarkeit)
3. **H** — Erwartungshorizont-Generator (neues Kernfeature)
4. **B + C + D** — UI-Quality-of-Life
5. **F + G** — Konsistenzcheck + Thema-Hinweis

## Dateien

| Datei | Änderungen |
|-------|------------|
| `generate_feedback.py` | A, G |
| `natascha_core.py` | D, E, F, H (generate_erwartungshorizont) |
| `natascha.py` | B, C, H (UI-Screen) |
| `natascha_config.toml` | H (erwartungshorizont-Sektion) |
