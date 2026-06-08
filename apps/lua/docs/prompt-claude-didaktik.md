# Prompt für Claude (mich) — Didaktik Runde 1: Prompt-Chirurgie + Judge

> Mein eigener Arbeitsplan. Ich führe ihn selbst aus. Kontext: `didaktik-roundtable-plan.md`.

---

## Ziel

Die didaktische Pro-Aufgabe-Qualität an der Wurzel (System-Prompt) heben und den
toten `llmJudgeHook` durch einen echten "solve-then-compare"-Judge ersetzen. Das sind
die heiklen, formulierungssensiblen Teile — daher bei mir.

## Dateien

- `packages/llm/src/prompt.ts` (System-Prompt, 477 Z.)
- `packages/llm/src/quality.ts` (Judge-Stub Z. 293)
- `packages/llm/src/types.ts` (ggf. `LlmJudgeResult`)

## Aufgaben

### 1. Distraktor-Regel für alle geschlossenen Typen (Didaktik #3)
Neue Sektion nach `matching` (Z. 49) und `multipleChoice` (Z. 60): Distraktoren müssen aus
demselben thematischen Wortfeld stammen wie die korrekte Antwort UND ungefähr gleich lang sein
(keine Lösungsverratung durch Textlänge), und typische Schülerfehler abbilden — keine absurden
Optionen. Beispiele in den Prompt (Photosynthese→Zellatmung, nicht →Tisch).

### 2. Terminologie-Konservierung (Didaktik #5a)
Nach Z. 27: Fachbegriffe/Eigennamen/Fachtermini WORTWÖRTLICH aus dem Quelltext übernehmen,
NICHT synonymisieren. Nur Alltagswörter dürfen umformuliert werden. (Zukunftssicher für
Nicht-AHS-Fächer.)

### 3. Bloom-Typ-Logik — Prompt-Seite (Didaktik #2, umdesignt)
**Kein** stiller Typ-Tausch durch das LLM (würde `buildSkelett`/`PROFILE` desynchronisieren).
Stattdessen im Prompt: kognitive Tiefe INNERHALB des angeforderten Typs anheben (z. B. "schweres
MC" → Distraktoren verlangen Analyse, nicht Reproduktion; Stamm fordert Bewertung/Anwendung).
Das eigentliche Gaten der Typen macht Kimi in der UI. Prompt und UI müssen konsistent sein —
mit Kimi abstimmen, welche Typen pro Stufe erlaubt sind.

### 4. Coverage-Prävention (statt Detektion, ersetzt Didaktik #1)
Im Prompt: Absatzstruktur des Quelltexts nutzen und Verteilung verlangen — "Verteile die Aufgaben
über ALLE Abschnitte des Quelltexts, nicht nur den ersten Absatz." Prüfen, ob die Quelltexte dem
LLM bereits absatzweise zugänglich sind; falls nicht, beim Prompt-Bau Absätze nummerieren.

### 5. CEFR-Mapping (Englisch)
Wenn `meta.fach === 'englisch'`: leicht/mittel/schwer im Prompt explizit auf A2/B1/B2 abbilden
(Wortschatz, Satzkomplexität, Textlänge entsprechend). Deutsch bleibt bei Bloom.

### 6. Judge: solve-then-compare (ersetzt Stub Z. 293)
Spezifikation siehe `didaktik-roundtable-plan.md` ("Judge-Spezifikation"):
- Judge bekommt Quelltext + Aufgabe **ohne** Schlüssel, löst selbst, vergleicht.
- Nur Risiko-Typen (`multipleChoice`, `matching`, `lueckentext`, `offeneVerstaendnisfrage`).
- Liefert `QualityIssue[]` (severity `warning`) bei Abweichung.
- Haiku (vgl. `pnpm smoke`-Setup, billig). Über `AppSettings` zuschaltbar.
- Die Verdrahtung in `runQualityChecks` + Settings/UI übernimmt Minimax bzw. Kimi; ich liefere
  die Judge-Funktion + den Judge-Prompt.

## Reihenfolge & Test
1–5 zuerst (reiner Prompt, kein Risiko), dann 6 (Judge). `pnpm smoke` muss nach jedem Schritt
grün bleiben. Prompt-Token-Budget im Auge behalten — neue Regeln knapp halten.

## Abstimmung
- Mit **Kimi**: erlaubte Typen pro Schwierigkeitsstufe (Punkt 3) — gemeinsame Quelle der Wahrheit.
- Mit **Minimax**: Signatur von `llmJudgeHook` / Rückgabe-Shape (Punkt 6).
