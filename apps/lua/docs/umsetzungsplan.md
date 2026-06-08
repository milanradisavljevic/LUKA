# Umsetzungsplan — Korrekturraster und Iterationen

Stand: 2026-05-31. Ergaenzt die bestehenden Specs:
→ [`korrekturraster.md`](korrekturraster.md) — was gebaut werden soll
→ [`iterationen.md`](iterationen.md) — Reihenfolge und Akzeptanzkriterien

Dieser Plan zeigt den **aktuellen Code-Stand**, was noch fehlt und wer zustaendig ist.

---

## Teil 1: Korrekturraster

### Was bereits existiert

| Datei | Inhalt | Status |
|-------|--------|--------|
| `packages/qa/src/korrekturraster/types.ts` | `RasterKriterium`, `RasterBlock`, `Notenstufe`, `KorrekturrasterDokument` | fertig |
| `packages/qa/src/korrekturraster/builder.ts` | `buildRaster(doc: DocumentV1): KorrekturrasterDokument` | fertig |
| `packages/qa/src/korrekturraster/kataloge.ts` | Kriterienkataloge Deutsch (Eroerterung, Analyse, Zusammenfassung) und Englisch (Open Writing, Reading Comprehension); Skalierungslogik | fertig |
| `packages/qa/src/korrekturraster/notenschluessel.ts` | `berechneNotenschluessel(gesamt): Notenstufe[]` — AHS-Standard | fertig |
| `packages/qa/src/korrekturraster.test.ts` | Tests fuer alle Blocktypen, Notenschluessel, End-to-End | fertig |
| `packages/renderer/src/index.ts` | `renderRaster(raster: RasterInput): Promise<Buffer>` — baut das Raster-DOCX | fertig |

Die gesamte Backend-Logik ist produktionsreif und getestet.

### Offene Punkte (Reihenfolge einhalten)

#### 1. Tippfehler `blloecke` beheben

In `packages/renderer/src/index.ts` (lokal definierter Typ `RasterInput`) und
in `packages/qa/src/korrekturraster/types.ts` (Typ `KorrekturrasterDokument`)
heisst das Feld faelschlicherweise `blloecke` statt `bloecke`.

```typescript
// jetzt (falsch):
interface KorrekturrasterDokument {
  blloecke: RasterBlock[];  // ← doppeltes l
}

// soll:
interface KorrekturrasterDokument {
  bloecke: RasterBlock[];
}
```

Zustaendig: Claude Code + QA-Owner gleichzeitig (beide Pakete anpassen),
dann alle Stellen, die auf `.blloecke` zugreifen, nachziehen.

#### 2. Typen-Duplizierung im Renderer bereinigen

`packages/renderer/src/index.ts` definiert `RasterKriterium`, `RasterBlock`,
`RasterNote`, `RasterInput` lokal — Kopien von dem, was in `@lehrunterlagen/qa` liegt.

Plan nach Fix von Punkt 1:

```typescript
// packages/renderer/src/index.ts
import type { KorrekturrasterDokument } from '@lehrunterlagen/qa';

// lokale Typ-Definitionen loeschen;
// renderRaster() nimmt stattdessen KorrekturrasterDokument entgegen
export async function renderRaster(raster: KorrekturrasterDokument): Promise<Buffer>
```

`packages/renderer/package.json` erhaelt `@lehrunterlagen/qa` als Dependency.
Zustaendig: Claude Code.

#### 3. Web-UI-Anbindung

Drei Stellen in `apps/web`:

**a) Dependency hinzufuegen** (`apps/web/package.json`):
```json
"@lehrunterlagen/qa": "workspace:*"
```

**b) Export-Hook** (`apps/web/src/hooks/useExport.ts`) — neue Funktion:
```typescript
export async function exportRaster(state: AppState): Promise<boolean>
// intern: buildRaster(generiertesDokument) → renderRaster(raster) → Blob → Download
```
Hinweis: benoetigt `state.generiertesDokument` aus Iteration 1 (State-Erweiterung).

**c) Button** (`apps/web/src/components/Step4_Generate.tsx`):
```tsx
<button onClick={() => exportRaster(state)}>
  Korrekturraster exportieren
</button>
```

Dateiname-Konvention (aus `korrekturraster.md`):
```
JJJJ-MM-TT_fach_stufe_thema_Raster.docx
```

Zustaendig: Kimi Code (UI-Owner). Wird erst sinnvoll nach Iteration 1
(`state.generiertesDokument` muss existieren).

---

## Teil 2: Iterationen

### Status-Uebersicht

| # | Titel | Stand | Blocker |
|---|-------|-------|---------|
| 1 | Generieren-Schritt + zwei Vorschau-Modi | ❌ offen | keiner (Voraussetzung fuer alles) |
| 2 | Eingabe und Korrektheitsfehler | ⏳ halb | Input-Parser fertig, UI nicht verdrahtet |
| 3 | Alle LLM-Anbieter, Logos, Kosten | ❌ offen | wartet auf Iteration 1 |
| 4 | Korrekturraster + PDF + Uebergabe | ⏳ halb | Raster-Code fertig, UI-Verdrahtung fehlt |

Vollstaendige Beschreibung und Akzeptanzkriterien: [`iterationen.md`](iterationen.md).

---

### Iteration 1 — konkreter Code-Plan

Kernproblem: `PreviewTwoColumn.tsx` rendert `state.bloecke` (das leere Skelett).
Das vom LLM befuellte `DocumentV1` entsteht erst im Export und fliesst nie
in die Vorschau zurueck. Details: `iterationen.md` Abschnitt "Befund".

**Dateien und Aenderungen:**

`apps/web/src/lib/types.ts` — State erweeitern:
```typescript
interface AppState {
  // bisherige Felder bleiben
  generiertesDokument: DocumentV1 | null;  // neu
}
```

`apps/web/src/hooks/useWizard.ts` — Neuer Action-Typ:
```typescript
| { type: 'SET_GENERIERTES_DOKUMENT'; dokument: DocumentV1 | null }
```
Beim Zurueckgehen zu Schritt 2: `generiertesDokument` auf `null` setzen.

`apps/web/src/hooks/useGenerate.ts` — neue Datei:
```typescript
export function useGenerate() {
  // ruft packages/llm auf, speichert Ergebnis als generiertesDokument im State
  // Ladestand + Fehler-State
  generateDocument(state: AppState): Promise<void>
  regenerateBlock(blockId: string, anweisung: string): Promise<void>
}
```

`apps/web/src/hooks/useExport.ts` — Generierung vom Export trennen:
- `generateAndExport()` → `generate()` + `export()`
- Export liest aus `state.generiertesDokument`, nicht aus `state.bloecke`

`apps/web/src/components/Step4_Generate.tsx`:
- Schaltflaeche "Inhalt generieren" (ruft `useGenerate`)
- Schaltflaeche "Dokumente exportieren" (erst nach Generierung aktiv)
- Modus-Toggle Skelett / Inhalt

`apps/web/src/components/PreviewTwoColumn.tsx`:
- Props erhalten `mode: 'skelett' | 'inhalt'`
- `mode === 'inhalt'`: rendert `state.generiertesDokument.bloecke`
- `mode === 'skelett'`: rendert `state.bloecke` (wie bisher)
- Pro-Block-Nachbesserung: Klick auf Block → Textfeld "Anweisung" + "Neu generieren"

Zustaendig: Kimi Code (alle oben genannten Dateien in `apps/web`).
Renderer-Beruehrungen (wenn noetig): Claude Code.

---

### Iteration 2 — konkreter Code-Plan

**Was bereits fertig ist:**
- `packages/input/src/parsers/txt.ts` — `parseTxt(filePath)`
- `packages/input/src/parsers/docx.ts` — `parseDocx(filePath)` via mammoth
- `packages/input/src/parsers/pdf.ts` — `parsePdf(filePath)` via pdf2json

**Was fehlt:**

`apps/web/src/components/Step1_Input.tsx`:
- Datei-Upload-Element (PDF, DOCX, TXT, HTML)
- URL-Eingabefeld
- Aufruf der entsprechenden Parse-Funktion aus `@lehrunterlagen/input`
- Ergebnis in `state.quelltexte` speichern

Kleine Fixes:
- `apps/web/src/lib/constants.ts` — Arbeitsanweisungs-Platzhalter pro Blocktyp
- `apps/web/src/components/PointSummary.tsx` — Tippfehler "Aufgabenblockoecke" beheben
- `apps/web/src/components/Step3_LLMOptions.tsx` — Kreativitaetsregler Farbe von Rot auf Violett

Zustaendig: Kimi Code.

---

### Iteration 3 — konkreter Code-Plan

**Adapter:**

`packages/llm/src/provider-openai-compatible.ts` — neuer Adapter:
- Basisklasse fuer OpenAI-kompatible APIs (OpenAI, Kimi, Mistral, Qwen, DeepSeek)
- Parameter: `baseUrl`, `apiKey`, `modelName`
- Deckt fuenf Anbieter mit einem Adapter ab

Bestehender Anthropic-Adapter (`provider-anthropic.ts`) bleibt unveraendert.

**Frontend:**

`apps/web/src/lib/models.ts` — neue Datei:
```typescript
export const MODELS = [
  { label: 'Claude Opus 4', provider: 'anthropic', apiName: '...', region: 'USA',
    kostenInputProMioToken: 0,  // TODO: aus anthropic.com/pricing verifizieren
    kostenOutputProMioToken: 0, datenschutz: 'USA' },
  // ... alle 6 Anbieter
]
```
Alle Preise als `0` bis verifiziert (Quellen in `iterationen.md` Abschnitt "Iteration 3").

`apps/web/src/assets/` — Logos als SVG (ein File pro Anbieter)

`apps/web/src/components/Step3_LLMOptions.tsx`:
- Modell-Info-Panel (Staerken, Region, Kosten, Datenschutz-Kennzeichnung)
- EU-Anbieter (Mistral) hervorheben; chinesische Anbieter mit Hinweis

Zustaendig: OpenCode #1 (Adapter im `llm`-Paket), Kimi Code (UI + Assets).

---

### Iteration 4 — konkreter Code-Plan

**Korrekturraster** — siehe Teil 1, Punkt 3 oben.
Vorbedingung: `state.generiertesDokument` aus Iteration 1 muss existieren.

**PDF-Export:**
Entscheidung fuer MVP: Web-App mit manuellem Hinweis (kein technischer PDF-Export).

`apps/web/src/components/Step4_Generate.tsx`:
- Schaltflaeche "Als PDF speichern"
- Oeffnet einen Modal-Dialog:
  > "Oeffnen Sie die heruntergeladene DOCX-Datei in Word oder LibreOffice und
  > drucken Sie als PDF (Datei → Als PDF exportieren)."

**Uebergabe-Gate:**
Natascha baut eine Schularbeit von Grund auf ohne Hilfe. Das ist das Akzeptanzkriterium
fuer Phase 4 (laut DESIGN.md §11 und `iterationen.md` Akzeptanzkriterien).

Zustaendig: Claude Code (renderRaster-Schnittstelle), Kimi Code (UI).

---

## Abhaengigkeitsgraph

```
Iteration 1 — generiertesDokument im State
    │
    ├──▶ Iteration 2 — Eingabe-Verdrahtung (unabhaengig umsetzbar)
    │
    ├──▶ Iteration 3 — Weitere LLM-Anbieter (unabhaengig umsetzbar)
    │
    └──▶ Iteration 4 — Korrekturraster-UI + PDF-Hinweis
              │
              └── Korrekturraster-Backend bereits fertig (packages/qa)
                  Nur UI-Verdrahtung fehlt
```

Iteration 1 ist der einzige sequenzielle Blocker.
Iterationen 2 und 3 koennen parallel nach (oder sogar waehrend) Iteration 1 laufen.
Iteration 4 setzt `state.generiertesDokument` voraus, kann aber Code-seitig vorbereitet werden.
