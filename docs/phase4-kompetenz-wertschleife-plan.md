# Implementationsplan: Kompetenz-Wertschleife schließen (Phase 4 + Judge-Aktivierung + Stoffkatalog)

## Ziel

Der Kompetenz-Modus in `apps/lua` generiert bereits Übungen (Phase 0–2 + Kimis Phase 1b UI-Wiring). Dieser Plan schließt die **Wertschleife**: Die App soll nachweisen können, welche Lehrplan-Deskriptoren eine Übung abdeckt, der Judge im Live-App-Pfad aktiv wird, und der Stoffkatalog wird für den realen Unterrichtsgebrauch erweitert.

> **Scope:** Keine Breaking Changes am Text-Modus. Alle Änderungen sind additiv oder modus-gated.

---

## Ausgangslage / Gap-Analyse

| # | Lücke | Auswirkung |
|---|-------|------------|
| 1 | **Phase 4 Coverage-Export fehlt** — kein `coverage.ts`, kein `buildCoverage` im Renderer. | Der administrative Payoff fehlt: Lehrkräfte können nicht belegen, welche Lehrplan-Kompetenzen eine Übung abdeckt. |
| 2 | **Judge im App-Pfad inaktiv** — `useGenerate.ts` ruft `parseAndValidate(...)` nur mit 4 Argumenten auf; `judgeComplete` (5.) und `stoffItems` (6.) fehlen. | `runKompetenzJudge` läuft im App-Pfad nie; keine inhaltliche Prüfung der Kompetenz-Generierung. |
| 3 | **Stoffkatalog ist ein Proof-Slice** — 8 Items, alle englisch/oberstufe/at-lehrplan. | Deutsch und Unterstufe sind nicht abgedeckt; Coverage-Nachweis wirkt dünn. |

---

## Workstream A — Phase 4: Coverage / Kompetenznachweis-Export

**Owner:** Claude (Kern-Architektur)  
**Datenfluss:** `doc.meta.stoffItemIds` → `StoffItem[]` → `deskriptorIds[]` → `Deskriptor[]` = abgedeckt. Universum = alle Deskriptoren für `(rahmenwerk, fach, stufe)`. Fehlend = Universum − abgedeckt.

> **Design-Regel:** Coverage-Logik lebt im Web-Layer (`apps/web/src/lib/coverage.ts`). Der Renderer bleibt datenquellen-agnostisch und bekommt fertige Deskriptor-Arrays.

### A.1 Stoffkatalog-Lookup erweitern

**Datei:** `apps/web/src/lib/stoffkatalog.ts`

- Neue Funktion `listDeskriptoren(fach, stufe, rahmenwerk?)` → gibt alle Deskriptoren für die Kombination zurück („Universum").
- `getAllDeskriptoren()` existiert bereits; ggf. intern für `listDeskriptoren` nutzen.

```ts
export function listDeskriptoren(
  fach: Deskriptor['fach'],
  stufe: Deskriptor['stufe'],
  rahmenwerk?: Deskriptor['rahmenwerk'],
): Deskriptor[];
```

### A.2 Coverage-Berechnung

**Datei:** `apps/web/src/lib/coverage.ts` (NEU)

```ts
export interface CoverageResult {
  abgedeckt: Deskriptor[];
  fehlend: Deskriptor[];
  items: Array<{
    id: string;
    titel: string;
    deskriptoren: Deskriptor[];
  }>;
}

export function computeCoverage(
  meta: Meta,
  getStoffItems: (ids: string[]) => StoffItem[],
  listDeskriptoren: (fach, stufe, rahmenwerk?) => Deskriptor[],
): CoverageResult;
```

- `meta.stoffItemIds` auflösen.
- Alle `deskriptorIds` der gewählten Items sammeln = abgedeckt.
- Universum über `listDeskriptoren(meta.fach, meta.stufe, meta.rahmenwerk)` holen.
- Fehlend = Universum-IDs − abgedeckte IDs.
- Pro Item die zugehörigen Deskriptoren auflösen.

### A.3 Renderer: Coverage-Tabelle + DOCX-Export

**Datei:** `packages/renderer/src/index.ts`

- Private Helper `buildCoverageTabelle(meta, abgedeckt[], fehlend[])`:
  - Spalten: **Bereich · Deskriptor · Status** (✓ / −)
  - Styling über bestehende `tableBorder`/Template-Helper (analog `renderRaster`).
- Public Export `renderCoverageToBlob(meta, abgedeckt[], fehlend[], template?)`:
  - `Promise<Blob>`
  - Browser-Export, analog `renderDocumentToBlobs`.
  - Akzeptiert fertige Deskriptor-Arrays — **kein Import des Web-Stoffkatalogs**.

### A.4 Export-Hook erweitern

**Datei:** `apps/web/src/hooks/useExport.ts`

- Neue Funktion `exportKompetenzraster(state)`:
  1. `computeCoverage(state.meta, …)`
  2. `renderCoverageToBlob(state.meta, abgedeckt, fehlend, state.renderTemplate)`
  3. `downloadBlob` → `<datum>_<thema>_Kompetenznachweis.docx`
  4. Verlaufseintrag wie bestehende Exporte.

### A.5 UI: Coverage-Panel in Step4

**Datei:** `apps/web/src/components/Step4_Generate.tsx`

- Nach erfolgreicher Generierung, nur wenn `meta.modus === 'kompetenz'`:
  - Panel **„Kompetenzabdeckung"** anzeigen.
  - Abgedeckte Deskriptoren grün, fehlende grau auflisten (kompakt, scrollbar).
  - Button **„Kompetenznachweis exportieren"** neben den bestehenden Export-Buttons (ca. Z. 168).

---

## Workstream B — Judge im App-Pfad scharfschalten

**Owner:** Claude

### B.1 Judge-Completion bauen

**Datei:** `apps/web/src/hooks/useGenerate.ts` (`runAttempts`)

- `judgeComplete` erstellen:
  - Ruft `invoke<string>('llm_complete', { provider, model, system, messages, kreativitaet: 0.1 })`.
  - System-/Non-System-Nachrichten splitten wie im Haupt-Call (Z. 161).

### B.2 parseAndValidate erweitern

- Aufruf ändern auf:

```ts
parseAndValidate(
  rohText,
  state.meta,
  state.quelltexte,
  judgeCfg,
  modus === 'kompetenz' ? judgeComplete : undefined,
  modus === 'kompetenz' ? input.stoffItems?.map(s => ({ titel: s.titel })) : undefined,
)
```

> **Kosten-Guard:** `judgeComplete` und `stoffItems` nur im Kompetenz-Modus durchreichen. Text-Modus bleibt unverändert — kein zusätzlicher Haiku-Call pro Schularbeit.

### B.3 Verhalten

- Der Judge fügt bei `schwere: 'hart'` einen Fehler hinzu.
- Bestehende Reparaturrunde (Z. 176) wird automatisch ausgelöst.
- Latenz/Kosten: +1 Haiku-Call pro Kompetenz-Generierung.

---

## Workstream C — Stoffkatalog real füllen

**Owner:** Claude entwirft, Kimi/Mensch kuratiert

**Datei:** `apps/web/src/lib/stoffkatalog.ts`

Gleiche Struktur (`Deskriptor[]`, `StoffItem[]`) beibehalten. Erweiterungen:

### C.1 Englisch Unterstufe (at-lehrplan)

- Grundgrammatik-Deskriptoren + ca. 6 StoffItems:
  - Present Simple / Present Continuous
  - Past Simple
  - Going-to-Future
  - Comparison of adjectives/adverbs
  - Some / Any / Much / Many
- `kategorie: 'grammatik'`
- `defaultAufgabentypen`: `['umformung', 'fehlerkorrektur', 'multipleChoice']` etc.

### C.2 Deutsch Unterstufe + Oberstufe (at-lehrplan)

- Grammatik-Deskriptoren + StoffItems:
  - Zeiten / Tempora
  - Aktiv / Passiv
  - Konjunktiv I + II
  - Kommasetzung
  - Satzglieder
  - Wortarten
- Sinnvolle `defaultAufgabentypen` je Item.

### C.3 Quellenangaben

- `quelle`-Feld der Deskriptoren mit RIS/BMBWF-Referenzen füllen.
- Englisch Oberstufe (bestehende 8 Items) bleibt unverändert.

---

## Rollen & Handoff

| Rolle | Verantwortung |
|-------|---------------|
| **Claude** | Workstream A (Coverage-Architektur), Workstream B (Judge-Wiring), Workstream C (Stoffkatalog-Entwurf). |
| **Kimi** | Step4-Panel-Politur/Styling, Stoffkatalog-Endkuratierung gegen Lehrplan, Tests für `coverage.ts`. Pickup nach Claude-Kern. |

---

## Implementationsreihenfolge

1. **Workstream B** zuerst (kleinster Brocken, größter Impact auf Qualität).
2. **Workstream A** danach (Coverage-Logik → Renderer → Hook → UI).
3. **Workstream C** parallel oder abschließend (am besten nach A, damit Coverage sofort realistische Daten zeigt).

---

## Verifikation (end-to-end)

### Automatisiert

```bash
cd apps/lua
pnpm -r build      # alle Pakete grün
pnpm -r test       # keine Regressionen
```

### Neue Tests

| Test | Datei | Was geprüft wird |
|------|-------|------------------|
| Coverage-Logik | `apps/web/src/lib/coverage.test.ts` | `abgedeckt`/`fehlend` korrekt aus `stoffItemIds`; Deskriptoren richtig zugeordnet. |
| Renderer-Coverage | `packages/renderer/src/renderer.test.ts` | `renderCoverageToBlob` liefert Blob > 0 mit Deskriptor-Texten. |
| Judge-Wiring | `packages/llm/src/validate.test.ts` oder Smoke | Bei Kompetenz-Modus mit eingebautem Grammatik-Fehler löst ein hart-Issue die Reparaturrunde aus. |

### Smoke-Skript

**Datei:** `scripts/kompetenz-smoke.mjs` (erweitern)

- Nach Generierung `computeCoverage` aufrufen.
- `renderCoverageToBlob` aufrufen.
- DOCX schreiben und prüfen, dass abgedeckte vs. fehlende Deskriptoren stimmen.

### Manuell

```bash
cd apps/lua
pnpm tauri:dev
```

1. Sidebar → „Kompetenz-Übung"
2. Englisch · Oberstufe · Stoff-Item wählen → generieren
3. Panel „Kompetenzabdeckung" sichtbar
4. Button „Kompetenznachweis exportieren" liefert lesbares DOCX.

---

## Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|--------|---------------|
| Coverage-Aussagekraft hängt am Stoffkatalog. | Workstream A + C zusammen ausliefern; Proof-Slice wird vor Release durch echte Lehrplan-Deskriptoren ersetzt. |
| Judge erhöht Kosten pro Generierung. | Strikter Modus-Guard: nur im Kompetenz-Modus aktiv; Text-Modus unverändert. |
| Renderer importiert versehentlich Web-Stoffkatalog. | Design-Regel durch Code-Review sicherstellen: nur Deskriptor-Arrays als Argumente. |
| Merge-Konflikte zwischen Claude und Kimi. | Klare Datei-Zuordnung (siehe Rollen); Kimi berührt Claude-Dateien nur nach Absprache. |

---

## Akzeptanzkriterien

- [ ] `pnpm -r build` grün.
- [ ] `pnpm -r test` grün, keine Regressionen im Text-Modus.
- [ ] Kompetenz-Generierung im App-Pfad löst bei Fehlern eine Reparaturrunde aus (Judge aktiv).
- [ ] Coverage-Panel zeigt abgedeckte und fehlende Deskriptoren korrekt an.
- [ ] Kompetenznachweis-DOCX ist exportierbar und lesbar.
- [ ] Stoffkatalog deckt Englisch Unterstufe und Deutsch Unterstufe/Oberstufe ab.
- [ ] Manueller Test in `pnpm tauri:dev` erfolgreich.

---

## ⚠️ KRITISCH — Claude baut/kontrolliert (Kimi NICHT allein anfassen)

Diese 4 Stellen schaden **still** (kein Crash, aber falsches Verhalten / falsches
Behördendokument). **Claude** baut bzw. reviewt sie zwingend vor Merge:

1. **B — Judge-Fehlersemantik (höchstes Risiko).** `hart`→`error`, und ein `error` lässt
   die Generierung nach 2 Versuchen **komplett scheitern** (`runAttempts` wirft, Z. 180).
   Judge-Falschalarm/Timeout würde jede Übung blockieren. Pflicht: **Judge-API-/Parse-
   Fehler ⇒ `warning`, nie `error`**; `hart`-Schwelle im Prompt konservativ.
2. **A.2 — Coverage-Mengenlogik (Wahrheitsgehalt eines Nachweisdokuments).** `abgedeckt`/
   `fehlend` über **IDs**, nicht Objektidentität. Ein falscher „abgedeckt"-Eintrag ist
   schlimmer als keiner. Claude besitzt `computeCoverage` + fixierter Unit-Test.
3. **C — Referentielle Integrität.** Jede `StoffItem.deskriptorIds` MUSS in `DESKRIPTOREN`
   existieren — toter Verweis verschluckt Coverage still. Claude baut Integritäts-Guard/
   Test (kein dangling ID, keine `id`-Dublette). Texte/Lehrplan = Kimi/Mensch.
4. **Text-Modus-Regression-Gate.** B + Coverage strikt `modus==='kompetenz'` gegated;
   `pnpm smoke` (Text) unverändert grün, kein Judge-Call im Text-Pfad. Claude prüft.

### Datei-Ownership (Kollisionsvermeidung — zwei Agenten, ein Working Tree)

| Datei | Owner | Hinweis |
|---|---|---|
| `apps/web/src/lib/coverage.ts` (NEU) | **Claude** | Mengenlogik (A.2) — Kimi nicht anfassen |
| `apps/web/src/lib/coverage.test.ts` (NEU) | **Claude** | fixierte Erwartungswerte + Integritäts-Test (C-Guard) |
| `apps/web/src/hooks/useGenerate.ts` | **Claude** | Judge-Wiring (B) + Modus-Gate |
| `packages/renderer/src/index.ts` | **Claude** | `buildCoverageTabelle` + `renderCoverageToBlob` (A.3) |
| `apps/web/src/lib/stoffkatalog.ts` | **geteilt** | Claude: `listDeskriptoren` + Entwurf-Items; **Kimi: Text-Kuratierung NACH Claudes Struktur-Commit** (sonst Konflikt) |
| `apps/web/src/hooks/useExport.ts` | **Kimi** | `exportKompetenzraster` (A.4), spiegelt `exportKorrekturraster` |
| `apps/web/src/components/Step4_Generate.tsx` | **Kimi** | Coverage-Panel + Button (A.5) |

**Reihenfolge gegen Konflikt:** Claude committed zuerst `coverage.ts` + `useGenerate.ts` +
Renderer + `stoffkatalog.ts`-Struktur (`listDeskriptoren` + Entwurf-Items). **Danach** zieht
Kimi und baut darauf `useExport`/`Step4` + Stoffkatalog-Kuratierung.
