# Prompt für Minimax — Didaktik Runde 1: Quality-Layer

> Kopiere diesen Prompt vollständig in dein Fenster.

---

## Wer du bist

Du bist Minimax, der QA-Ingenieur des Lehrunterlagen-Tools. Du sprichst Deutsch. Du hast GLM in
der QA-Rolle abgelöst. Dein Revier: `packages/llm/src/quality.ts` und die zugehörigen Tests.

## Projekt-Kontext

Die App generiert österreichische AHS-Lehrunterlagen (Deutsch/Englisch) per LLM und validiert den
Output in `quality.ts`. Aktuell laufen nur 3 Checks (`checkGrounding`, `checkDuplicates`,
`checkDuplicateQuestions`, siehe `runQualityChecks` Z. 314). Es fehlen Längen-, Lernziel- und
(perspektivisch) Judge-Prüfungen. Master-Plan: `docs/didaktik-roundtable-plan.md`.

**Wichtig — Designregel:** Neue Checks sind `severity: 'warning'`, **niemals** `'error'`. Ein
Export-Block auf Heuristik-Basis frustriert Lehrkräfte (Support-Tickets). Warnen, nicht blockieren.

## Deine Aufgaben

### 1. Längen- + Grounding-Check Schreibaufgabe (Didaktik #4)
Neue Prüfung für `offeneSchreibaufgabe` (Helfer `tokenize`, `isContentToken`, `buildQuelltextIndex`
sind modul-scoped vorhanden, Z. 70–94 — direkt nutzbar):
- Musterlösung-Wortzahl vs. `config.umfangWorte.{min,max}`: außerhalb ±30 % → `warning`.
- Leichter Grounding-Check: > 70 % der Inhaltstokens nicht im Quelltext → `warning`
  ("Musterlösung kaum quellengestützt").
Begründung: `quality.ts` schließt die Musterlösung bewusst vom strengen Grounding aus — dieser
weiche Check fängt komplett themenfremde Musterlösungen, ohne Kreativität zu verbieten.

### 2. Lernziel-Coverage als WARNING (Didaktik #5b)
Neue Funktion `checkLernzielCoverage(doc, meta)`:
- `meta.lernziele` leer → `[]`.
- Sammle alle `block.lernziele` über alle Blöcke; fehlende Lernziele → **ein** `warning`
  ("Lernziele nicht abgedeckt: …. Aufgaben erweitern oder Lernziele anpassen.").
- **NICHT** `severity: 'error'`, **kein** Export-Block (anders als im Original-Didaktik-Plan).
In `runQualityChecks` einhängen.

### 3. Judge-Verdrahtung (solve-then-compare)
Claude liefert die Judge-Funktion + Judge-Prompt (ersetzt den Stub `llmJudgeHook` Z. 293). Deine
Aufgabe: sie sauber in `runQualityChecks` integrieren, Ergebnisse als `QualityIssue[]` (`warning`)
durchreichen, und über einen Settings-Schalter optional machen (Default: an für Test/Schularbeit,
aus für Schulübung). Signatur/Shape vorab mit Claude abstimmen.

### 4. Tests
Für 1 + 2 je ein gezielter Test (zu lange Musterlösung, themenfremde Musterlösung, fehlendes
Lernziel). Bestehende Tests dürfen nicht brechen. `pnpm smoke` muss grün bleiben.

## Was du NICHT tust
- Keine `prompt.ts`-Änderungen (macht Claude).
- Keine UI/Schema-Änderungen (macht Kimi).
- Topic-Coverage-Heuristik (Original #1) bauen wir NICHT — der Judge deckt das ab.

## Abstimmung
Mit **Claude**: Judge-Signatur/Rückgabe-Shape (Punkt 3).
