# Test-Trace-Template

> Vor „fertig" für jedes Feature ausfüllen, das Daten transformiert.
> Ziel: Den ganzen Datenfluss von der UI bis zum Export sichtbar machen – nicht nur die gerade angefasste Schicht.

## Feature

Name des Features / der User Story.

## Datenfluss

```
UI:        (Welche Komponente? Welche Interaktion?)
State:     (Welche Actions/Reducer? Welche Felder werden gesetzt?)
Hook:      (useGenerate / useExport / etc. – wie werden die Daten aufbereitet?)
LLM-Prompt:(Wie kommen die Daten in den Prompt? Welche Instruktion bekommt das LLM?)
LLM-Resp:  (Wie sieht die erwartete Antwort aus?)
Normalize: (Leere Strings, Deduplizierung, Fallbacks?)
Schema:    (Welche Felder im Block / Meta?)
Renderer:  (Wie werden die Daten ins DOCX überführt?)
Preview:   (Was sieht die Vorschau?)
Export:    (Welche Datei(en)? Was muss enthalten sein?)
```

## Invarianten für dieses Feature

- [ ] Invariante 1
- [ ] Invariante 2
- [ ] Invariante 3

## Szenarien

| # | Szenario | Erwartetes Ergebnis | Getestet | Status |
|---|----------|---------------------|----------|--------|
| 1 | Happy Path | … | [ ] | offen |
| 2 | Hybrid/Edge | … | [ ] | offen |
| 3 | Sprach-Flip (DE → EN) | … | [ ] | offen |
| 4 | Punkte-Toggle | … | [ ] | offen |
| 5 | Reroll nach Bearbeitung | … | [ ] | offen |

## Bekannte Risiken

- Risiko 1: …
- Risiko 2: …

## Verantwortlich

- Code: …
- Review: …
