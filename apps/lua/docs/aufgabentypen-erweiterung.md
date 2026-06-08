# Aufgabentypen-Erweiterung — Arbeitsvertrag (Stand 2026-06-04)

**Status (2026-06-05):** Schema/Renderer/QA/Web von Minimax gebaut (2026-06-04); die LLM-Generierung war dabei NICHT verdrahtet und wurde von Claude (2026-06-05) nachgezogen: BlockRequest, Prompt-Regeln+Beispiele, normalize, blockToRequest, buildSkelett + 2 Schema-Fixes (kategorisierung Mehrfachzuordnung, tabelle echte Lücken) + Determinismus-Fix (kein Math.random). Die neuen Typen sind jetzt end-to-end generierbar (315 Tests grün). **Offen:** ConfigPanel-Bearbeitung für kategorisierung/tabelle/songanalyse (noch read-only); echter LLM-Smoke-Test pro Typ; Phase 2 (Gitter).

**Hinweis Schema-Vertrag:** Maßgeblich ist jetzt das AS-BUILT-Schema in `packages/schema/src/index.ts` (Minimax-Strukturen + Claude-Fixes), nicht mehr die ursprünglichen Vertrags-Felder unten.

**Architekt/Koordination:** Claude · **Team:** Kimi (Schema/Frontend), Minimax (QA/Tests), Qwen (Rust/Backend).
Dies ist die verbindliche Quelle für die neuen Aufgabentypen. Feldnamen hier sind **fix** — wer abweicht, bricht die anderen.

**Hinweis Vertrag-Update:** Das tatsächlich implementierte Schema weicht in zwei Feldern vom ursprünglichen Vertrag ab (Anpassung 2026-06-04):
- `wordScramble.config`: `{ wort, anzahlWoerter, loesungsreihenfolge }` statt `{ modus, items }` (deterministische Wortliste statt flexibler Items).
- `kategorisierung.config.items`: `{ nr, text, optionen }` (optionen als string[] an Item statt nur Kategorienname) — Lehrer kann pro Item Auswahloptionen vorgeben.
Beide Anpassungen sind abwärtskompatibel zur Renderer-Schicht (Renderer nutzt `korrektAnordnung` bzw. `zuordnung`).

## Leitprinzip (nicht verhandelbar)
**Das LLM liefert nur INHALTE** (Wörter, Sätze, Fragen, Aussagen, Lösungen).
**Deterministischer Code baut das LAYOUT** (Verwürfelung, Wortbank-Reihenfolge, Kreuzwort-/Gitter-Anordnung).
Layout-Utils liegen in `packages/schema` und werden von Renderer (`packages/renderer`) UND Web-Vorschau (`apps/web`) importiert.

## Lösungs-Vertrag (Fixierung vom 2026-06-04, beachten!)
- `multipleChoice`, `matching`, `offeneVerstaendnisfrage`: Lösung steht **inline** am Item (`korrekt` / `musterantwort`).
- `lueckentext`, `offeneSchreibaufgabe`, `markieraufgabe` **und alle neuen Typen mit `loesung`-Objekt**: Lösung steht im **`loesung`-Objekt** am Block — und braucht im System-Prompt ein **vollständiges BEISPIEL** (sonst lässt das LLM es weg, vgl. Mistral-Bug).

---

## Reihenfolge & Timing

```
Kimi: Schema + Util eines Typs → main  (Feldnamen ab dann FIX, im Changelog ankündigen)
   └─► Claude: prompt/normalize/renderer   ║   Minimax: fixtures/korrekturraster/tests   (parallel)
        └─► Claude-Review + pnpm -r test grün → nächster Typ
```
Reihenfolge Phase 1: **1a Wortbank → 1b wordScramble → 1c kategorisierung → 1d tabelle → 1e stiluebung → 1f songanalyse**.
Phase 2 (Gitter) erst, wenn Phase 1 grün. Qwen arbeitet unabhängig am Backend; PDF-Tabellen-Test **nach** erstem Renderer-Stand.

**Konvergenzpunkte (Doppelbruch-Gefahr):** (1) Feldnamen Kimi→Claude/Minimax; (2) Util-Signaturen `verwuerfle`/`baueWortbank` (Kimi) & `grids.ts` (Claude) vor Konsum fixieren; (3) Qwens PDF-Test nach Claude-Renderer.

---

## Schema-Verträge (Kimi implementiert exakt so)

Alle Blöcke erben `BlockBaseSchema` (id, punkte, quelleId?, arbeitsanweisung, clue?).

**1a Lückentext-Erweiterung (kein neuer Typ):** `config.distraktorWoerter?: z.array(z.string().min(1)).optional()` ergänzen.
Wortbank = (Lösungswörter ∪ distraktorWoerter), gemischt via `baueWortbank`. `distraktoren` (Zahl) bleibt abwärtskompatibel.

**1b `wordScramble`:**
```
config: { modus: z.enum(['wort','satz']), items: z.array(z.object({ nr: int+, loesung: z.string().min(1) })).min(1) }
loesung: { /* leer/keins nötig — loesung steckt in config.items[].loesung */ }  // KEIN separates loesung-Objekt
```
Anzeige verwürfelt via `verwuerfle(loesung, modus, seed)` — Code, nicht LLM.

**1c `kategorisierung`:**
```
config: { kategorien: z.array(z.string().min(1)).min(2), items: z.array(z.object({ nr: int+, aussage: z.string().min(1) })).min(1) }
loesung: { zuordnung: z.record(z.string(), z.array(z.string().min(1)).min(1)) }   // nr -> [Kategorie(n)], Array erlaubt „beide"
```

**1d `tabelle`:**
```
config: { spalten: z.array(z.string().min(1)).min(2),
          zeilen: z.array(z.object({ zellen: z.array(z.union([ z.object({text:z.string()}), z.object({luecke:z.literal(true)}) ])) })).min(1) }
loesung: { zellen: z.record(z.string(), z.string().min(1)) }   // Key "zeile,spalte" (0-basiert) -> Wert der Lücke
```

**1e `stiluebung`:**
```
config: { aufgabenstellung: z.string().min(1),
          items: z.array(z.object({ nr: int+, ausgangstext: z.string().min(1), zielform: z.string().min(1) })).min(1) }
loesung: { musterloesungen: z.record(z.string(), z.string().min(1)) }   // nr -> Musterlösung
```

**1f `songanalyse`:** (Songtext = Quelltext via `quelleId`)
```
config: { fragen: z.array(z.object({ nr: int+, frage: z.string().min(1),
          fokus: z.enum(['inhalt','stilmittel','interpretation']), zeilen: int+ })).min(1) }
loesung: { antworten: z.record(z.string(), z.string().min(1)), erwartungshorizont: z.string().optional() }
```

**Phase 2** `kreuzwortraetsel` / `wortgitter`: LLM liefert `{wort,hinweis}` bzw. Wortliste; `grids.ts` (Claude) erzeugt Gitter. Schemas werden zu Phase-2-Beginn finalisiert.

## Deterministische Utils (Signaturen)
- Kimi, `packages/schema`: `verwuerfle(text: string, modus: 'wort'|'satz', seed: string): string` · `baueWortbank(loesungen: string[], distraktoren: string[], seed: string): string[]`.
- Claude, `packages/schema/src/grids.ts` (Phase 2): `baueKreuzwortgitter(...)`, `baueWortgitter(...)`.
Seed-stabil: gleicher Seed ⇒ gleiches Ergebnis (Renderer & Preview müssen identisch aussehen).

## Pflicht-Dateien pro Typ (~11)
schema · prompt.ts · normalize.ts · (transform.ts) · quality.ts · renderer · qa/korrekturraster/builder.ts · qa/fixtures/<typ>.json · web/constants.ts · web/blockDefaults.ts · web/BlockPreview(+Dispatch) · web/BlockConfigPanel.

## DoD je Task
`pnpm -r test` + Typechecks grün · Eintrag in `docs/changelog.md` (mit Datum, Agent, Datei, Was+Warum) · Status in `Administration der LLMs/TASKS.md` auf `fertig` · bei Vertrags-Unklarheit Claude fragen, nicht raten.

## Verifikation (offline, ohne API-Kosten)
Fixture → `parseAndValidate` ok:true → `renderDocument` zwei verschiedene DOCX → Util-Unit-Tests (seed-deterministisch) → Korrekturraster lückenlos. Echter LLM-Smoke-Test erst am Schluss; Rohantworten als Offline-Regressionstest sichern (Muster `packages/llm/src/regression-2026-06-04.test.ts`).
