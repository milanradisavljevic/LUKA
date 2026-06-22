# Next Steps — Kimi-Aufgaben (Stand 2026-06-18)

Repo: **LUKA** (nicht lehr-suite). Branch `main`, **vor jeder Aufgabe `git pull`**.
Nach jeder Aufgabe muss grün sein:

```bash
cd apps/lua && pnpm --filter "./packages/*" build && pnpm -r typecheck && pnpm -r test
```

Danach **lokal committen** (sauberer Commit je Aufgabe). Push erledigt der Chief beim Review.
Hinweis: `apps/lua/scripts/welle6-check.mjs` ist ein Dev-Skript (unversioniert) — nicht anfassen.

## Reihenfolge
1. **F1 — Quelltext-Check** (klein, isoliert) → zuerst.
2. **F3 — Selbstlern-Variante** (Renderer-Refactor) → danach. Chief reviewt eng.

(#2 GIFT/Plugin-Export = später. #4 Aufgaben-Pool = erst gemeinsames Brainstorming, NICHT bauen.)

---

## Aufgabe F1 — Quelltext-Check in Schritt 1 (ohne LLM)

**Ziel:** Beim Hinzufügen eines Quelltexts sofort Wortzahl + grobe Stufen-/Lesbarkeits-Einschätzung
anzeigen, damit die Lehrkraft einen passenden Text wählen kann. Keine KI, reine Heuristik.

**1. Neue Util** `apps/lua/apps/web/src/lib/quelltextInfo.ts`:
```ts
export interface QuelltextInfo {
  woerter: number;
  saetze: number;
  schnittSatzlaenge: number;
  hinweis: string;
}
export function analysiereQuelltext(inhalt: string): QuelltextInfo { /* siehe unten */ }
```
- `woerter`: Tokens über `/\s+/` (leere raus).
- `saetze`: Splits über `/[.!?]+/` (leere raus, mindestens 1).
- `schnittSatzlaenge`: `Math.round(woerter / saetze)`.
- `hinweis` (deskriptiv, KEIN hartes Urteil), kombiniert Satzlänge + Wortzahl, z. B.:
  - schnitt ≤ 12 → „kurze Sätze · eher Unterstufe"
  - 13–18 → „mittlere Satzlänge"
  - > 18 → „lange Sätze · eher Oberstufe"
  - zusätzlich bei woerter < 150 → „· sehr kurz", bei > 1200 → „· sehr lang".

**2. Test** `apps/lua/apps/web/src/lib/quelltextInfo.test.ts` (vitest): je ein Fall für kurze/lange
Sätze + leerer/Einzelsatz-Edge (keine Division durch 0).

**3. Anzeige** in `apps/lua/apps/web/src/components/Step1_Input.tsx`: in der Liste der hinzugefügten
Quelltexte pro Eintrag eine dezente Zeile (Stil wie sekundärer Hinweistext / `--color-text-secondary`):
`{woerter} Wörter · Ø {schnittSatzlaenge} W/Satz · {hinweis}`.

**Akzeptanz:** eingefügter/hochgeladener Text zeigt die Kennzahlen + Hinweis; kein LLM-Call;
util-Test grün; build/typecheck/test grün.

---

## Aufgabe F3 — Selbstlern-Variante (Übung + Lösungsteil in EINEM DOCX)

**Ziel:** Ein DOCX, das die Schülerfassung enthält und am Ende einen Lösungsteil — für
Hausübung/Selbstkontrolle. **Renderer-Refactor — sauber faktorisieren, kein Copy-Paste.**

**1. Renderer** `apps/lua/packages/renderer/src/index.ts`:
- Heute baut `buildDocxPacked(packer, doc, mode, template)` (~Z. 542) pro `Mode = 'schueler' | 'loesung'`
  ein ganzes Dokument. Faktorisiere den **block-bauenden Teil** so heraus, dass die Block-Children
  je Mode als wiederverwendbare Funktion verfügbar sind (z. B. `buildBlockChildren(doc, mode, template)`).
- Neue Funktion `export async function renderSelbstlernToBlob(doc, template = DEFAULT_TEMPLATE): Promise<Blob>`:
  EIN Document = Schüler-Children + `new Paragraph({ children:[new PageBreak()] })` + Heading „Lösungen"
  (HeadingLevel.HEADING_1) + Lösungs-Children. Browser-sicher: `Packer.toBlob` (nicht toBuffer).
- Bestehende `renderDocument`/`renderDocumentToBlobs` unverändert lassen (nur refaktorierte Helfer nutzen).

**2. Export-Hook** `apps/lua/apps/web/src/hooks/useExport.ts`: `exportSelbstlern(state)` analog
`exportDocx` (dynamischer Import von `renderSelbstlernToBlob`), Dateiname
`${datum}_${thema}_Uebung-mit-Loesung.docx`, im Return-Objekt ergänzen.

**3. UI** `apps/lua/apps/web/src/components/Step4_Generate.tsx`: Knopf „Übung mit Lösungsteil"
in der Export-Spalte (sichtbar bei `canExport`), Stil wie die anderen Sekundär-Export-Knöpfe.

**Akzeptanz:** ein DOCX, Seite 1+ = Schülerfassung, danach Seitenumbruch + Lösungsteil; korrekt in
Klassisch/Modern/Freundlich/Abgefahren-Vorlage. `renderer.test` um einen Smoke-Fall ergänzen
(Selbstlern-Doc enthält sowohl Aufgaben- als auch Lösungstexte). build/typecheck/test grün.
**Chief-Review vor Merge zwingend** (Refactor-Korrektheit, keine Regression in renderDocument).

---

## Später (nicht jetzt)
- **#2 GIFT/Moodle-Export** der geschlossenen Aufgaben — wenn Plugin-/LMS-Thema dran ist.
- **#4 Aufgaben-Pool / Frage-Bank** — erst gemeinsames Brainstorming. Offene Fragen: Granularität
  (Blöcke vs. einzelne Fragen) · Speicherort (SQLite-Tabelle vs. localStorage) · Verschlagwortung
  (Fach/Stufe/Thema/Typ/Lernziel) · Einfügen in den Baukasten · Abgrenzung zu „Vorlagen".

## Offen beim Chief/User
- CI-Run nach den jüngsten Pushes auf grün prüfen.
- Live-Testlauf der zuletzt gebauten Features (Korrekturraster-Export, 3-Niveau, Lösungen-prüfen-Badge,
  Punkte-Schalter, Quelltext-Format, Quality-Gate, Tafelgrün, Preserve-Edits).
- Optional: In-App-Angabe-Erfassung (Rust+UI) für den voll-automatischen In-App-Closed-Loop.
