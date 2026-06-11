# Übergabe an Claude — Phase 2: Kompetenz-Modus Prompt + Judge

*Von:* Kimi (Phase 0 + 1 abgeschlossen)  
*Datum:* 2026-06-11  
*Repo:* `lehr-suite`, Paket `apps/lua`

---

## Was steht

Phase 0 (Schema) und Phase 1 (2 neue Blocktypen) sind **vollständig umgesetzt und grün**:

- `pnpm -r build` ✅
- `pnpm -r test` ✅ (Schema 118, LLM 114, Renderer 31, Input 17, QA 96, Web 41)

Die Codebase ist bereit für den Prompt-Switch und den kompetenz-bewussten Judge.

---

## Neue Schema-Felder (kurz)

```typescript
// packages/schema/src/index.ts
Modus = 'text' | 'kompetenz'
Rahmenwerk = 'at-lehrplan' | 'ib-dp'
Bewertungsschema = 'at-1-5' | 'ib-1-7'

Meta {
  modus?: Modus            // optional! Default 'text' wird im Code angenommen
  rahmenwerk?: Rahmenwerk
  stoffItemIds?: string[]
  kompetenzNiveau?: 'basis' | 'standard' | 'erweitert'
  bewertungsschema?: Bewertungsschema
}

DocumentSchema {
  quelltexte: QuellText[]   // default []
  // Refinement: Im Text-Modus muss mindestens 1 Quelltext vorhanden sein
}
```

**Wichtig:** `modus` ist bewusst **optional** im Schema, nicht `.default('text')`. Zods `.default()` hätte das Feld im inferred Type required gemacht und tausende bestehende `Meta`/`DocumentV1`-Objekte gebrochen. Im Prompt/Code also immer `meta.modus ?? 'text'` verwenden.

---

## Neue Blocktypen (Schema)

### `umformung`
```typescript
config: {
  aufgaben: Array<{
    nr: number
    ausgangssatz: string
    anweisung: string      // z. B. "Setze in den Konjunktiv II"
    zielstruktur: string   // z. B. "Konjunktiv II"
  }>
}
loesung: {
  loesungen: Array<{
    nr: number
    umformulierung: string
    erklaerung?: string
  }>
}
```

### `fehlerkorrektur`
```typescript
config: {
  saetze: Array<{
    nr: number
    satz: string           // Satz MIT eingebauten Fehlern
    anzahlFehler: number
  }>
}
loesung: {
  korrekturen: Array<{
    nr: number
    korrigierterSatz: string
    fehler: Array<{
      stelle: string
      art: 'R' | 'G' | 'Z' | 'A'
      erklaerung?: string
    }>
  }>
}
```

---

## Was Claude jetzt macht (Phase 2)

### 1. `packages/llm/src/prompt.ts` — Prompt-Dualität

- `SYSTEM_TEXT` = heutiger System-Prompt (bleibt unverändert für `modus === 'text'`).
- `SYSTEM_KOMPETENZ` = neue Variante für `modus === 'kompetenz'`:
  - Entferne: „Leite alle Inhalte strikt aus den Quelltexten ab", „Erfinde keine Fakten", Absatz-Coverage-Regel.
  - Neu: „Du erfindest didaktisch sinnvolle Beispiele zur gegebenen Kompetenz".
  - Neu: Niveau-Steuerung (`basis`/`standard`/`erweitert`) beeinflusst Satzkomplexität, Scaffolding, Distraktoren.
  - Neu: `stoffItems` (Titel, Kategorie, ggf. Deskriptoren) werden in den User-Prompt injiziert.
  - IB-Command-Terms: Wenn `meta.rahmenwerk === 'ib-dp'`, verwende IB-Begriffe (command terms: analyse, evaluate, discuss, etc.).
- `buildMessages()`:
  - Switch `meta.modus === 'kompetenz'` → `SYSTEM_KOMPETENZ`.
  - Bei Kompetenz-Modus: `stoffItems` statt `quelltexte` in den User-Prompt serialisieren.
  - `fokusThemen` bleibt aktiv (NATASCHA-Bridge-Verknüpfung).
- `buildRepairMessage()`: Gleich, aber mit Kompetenz-Kontext.

### 2. `packages/llm/src/validate.ts` — Validierung

- Kompetenz-Modus braucht keinen Quelltext-Check.
- Neuer Judge-Prompt: prüft grammatische Korrektheit + Niveau-Fit statt Text-Abgleich.

### 3. `packages/llm/src/quality.ts` — Quality Checks

- Quelltext-Grounding-Check im Kompetenz-Modus überspringen.
- Neuer Check: Lösungsschlüssel-Konsistenz (billiger Verifier).
- Optional: LLM-Judge für Kompetenz-Aufgaben.

### 4. `apps/web/src/hooks/useGenerate.ts` — Guards

- `guards()` anpassen:
  - Text-Modus: `quelltexte.length > 0` + `MIN_WOERTER` (heute).
  - Kompetenz-Modus: `stoffItemIds.length > 0` statt Quelltext-Check.
- `GenerateInput` zusammenbauen mit `stoffItems`.

### 5. Tests

- `packages/llm/src/prompt.test.ts`: Test für `buildMessages()` im Kompetenz-Modus.
- `packages/llm/src/quality.test.ts`: Tests für Kompetenz-Modus-Checks.
- Smoke-Test mit Proof-Slice-Daten (z. B. Englisch Tenses).

---

## Dateien, die Claude anfassen wird

| Datei | Änderung |
|---|---|
| `packages/llm/src/prompt.ts` | `SYSTEM_KOMPETENZ`, `buildMessages`-Switch |
| `packages/llm/src/validate.ts` | Kompetenz-Modus Guards, Judge-Prompt |
| `packages/llm/src/quality.ts` | Kompetenz-Modus Checks |
| `apps/web/src/hooks/useGenerate.ts` | `guards()`, `GenerateInput`-Bau |
| `packages/llm/src/*.test.ts` | Neue Tests |

---

## Dateien, die Kimi bereits geändert hat (nicht mehr anfassen)

- `packages/schema/src/index.ts`
- `packages/schema/src/schema.test.ts`
- `packages/llm/src/types.ts`
- `packages/renderer/src/index.ts`
- `packages/qa/src/korrekturraster/builder.ts`
- `apps/web/src/lib/constants.ts`
- `apps/web/src/lib/blockDefaults.ts`
- `apps/web/src/hooks/useGenerate.ts` (nur `blockToRequest`)
- `apps/web/src/components/BlockConfigPanel.tsx`
- `apps/web/src/components/BlockPreview*.tsx`
- `apps/web/src/components/BlockPreview.tsx`
- `CHANGELOG.md`
- `docs/implementationsplan-kompetenz-modus.md`

---

## Hinweise / Fallstricke

1. **`modus` ist optional.** Überall `meta.modus ?? 'text'` verwenden.
2. **`stoffItem.defaultAufgabentypen` ist `string[]`.** Semantisch sind das BlockTyp-Werte; ein Cast ist okay.
3. **Renderer und UI existieren schon.** Neue Blocktypen rendern bereits in DOCX und Preview. Kein Doppelbau nötig.
4. **Kein Breaking Change.** Text-Modus läuft unverändert.
5. **Proof-Slice fehlt noch.** Es gibt noch keinen befüllten Stoffkatalog. Für erste Smoke-Tests kann ein hartkodierter Array im Test reichen.

---

## Akzeptanzkriterien für Phase 2

- `buildMessages()` wählt den richtigen System-Prompt nach `meta.modus`.
- Kompetenz-Modus generiert aus `stoffItems` ohne Quelltext (Smoke-Test mit Mock-StoffItem).
- Text-Modus läuft weiterhin unverändert (Regressionstests grün).
- `pnpm -r build && pnpm -r test` grün.
