# Implementationsplan: Kompetenz-basierter Übungsgenerator („Kompetenz-Modus")

*Basierend auf:* `docs/konzept-kompetenz-modus.md`  
*Status:* Phase 0 + 1 umgesetzt (Schema + 2 neue Blocktypen full-stack).  
*Verifikation:* `pnpm -r build` und `pnpm -r test` grün.  
*Offen:* Phase 2 (SYSTEM_KOMPETENZ-Prompt + kompetenz-bewusster Judge) → Claude.

---

## Erledigt (Phase 0 + 1)

- `packages/schema/src/index.ts`:
  - `ModusSchema`, `RahmenwerkSchema`, `BewertungsschemaSchema`, `DeskriptorSchema`, `StoffItemSchema`
  - `MetaSchema` + `AuftragSchema` um Kompetenz-Felder erweitert (`modus` ist **optional**, Default `'text'` wird im Code angenommen)
  - `DocumentSchema` mit modus-abhängigem Quelltext-Refinement
  - Neue Blocktypen `umformung` und `fehlerkorrektur` in Schema, Union, Enum, Skelett, Bloom-Matrix
- `packages/llm/src/types.ts`: `GenerateInput.stoffItems?`, neue `BlockRequest`-Varianten
- `packages/renderer/src/index.ts`: `buildUmformung()`, `buildFehlerkorrektur()` + Labels
- `packages/qa/src/korrekturraster/builder.ts`: Neue Typen als geschlossene Blocks behandelt
- `apps/web/src/lib/constants.ts`: Neue Typen in `BLOCK_TYPE_DEFS` + `STUFE_RULES`
- `apps/web/src/lib/blockDefaults.ts`: Defaults für `umformung`/`fehlerkorrektur`
- `apps/web/src/hooks/useGenerate.ts`: `blockToRequest()` erweitert
- `apps/web/src/components/BlockConfigPanel.tsx`: Config-UI für beide Typen
- `apps/web/src/components/BlockPreviewUmformung.tsx` + `BlockPreviewFehlerkorrektur.tsx` + `BlockPreview.tsx`
- `packages/schema/src/schema.test.ts`: Tests für neue Typen, Kompetenz-Modus, Refinement, BlockTyp-Enum

---

## Rest-Stand der Codebase (vor Phase 2)

Wizard = 5-Schritte Text-Modus; Kompetenz-Modus ist schema-seitig möglich, aber noch keine
UI-Einstiegs-Logik und kein Prompt-Switch. NATASCHA-Bridge ist weiterhin error-centric.

---

## Ziel

Zwei komplementäre Modi in LUA:
- **Text-Modus** (heute): Quelltexte → Aufgaben (Inhalt, Analyse, Lesen)
- **Kompetenz-Modus** (neu): Lehrplan-Kompetenz/Stoff-Item → Aufgaben (Grammatik, Wortschatz, Rechtschreibung)

Beide Modi nutzen dieselbe Pipeline (Schema → LLM → Renderer → DOCX), aber unterschiedliche Einstieg, Prompt-Logik und Guards.

---

## Architektur-Entscheidungen (vorab)

1. **Kein Breaking Change.** Text-Modus bleibt Default. Kompetenz-Modus ist opt-in über `meta.modus`.
2. **Schema-first.** `packages/schema` erweitert sich um `Modus`, `StoffItem`, `Deskriptor`. `DocumentSchema.quelltexte` wird von `.min(1)` auf `.optional()` im Kompetenz-Kontext gelockert.
3. **Prompt-Dualität.** Der System-Prompt hat zwei Varianten: `SYSTEM_TEXT` (heute, textgebunden) und `SYSTEM_KOMPETENZ` (erfindet Beispiele, keine Quelltext-Abhängigkeit). `buildMessages()` wählt anhand `meta.modus`.
4. **Proof-Slice zuerst.** Kein voller Lehrplan. Ein Mini-Stoffkatalog (Englisch Tenses, 5–10 Items) als Seed-Daten, um den Generator zu beweisen.
5. **Nur 2 neue Blocktypen.** `umformung` (Satztransformation) und `fehlerkorrektur` (Fehler finden + korrigieren). Satzbildung bleibt optional (Phase 2).

---

## Phasen & Aufgabenverteilung

### Phase 0 — Schema-Erweiterung (Fundament) ✅

**Claude** — Architektur & Typen-Design:
- `packages/schema/src/index.ts`:
  - `ModusSchema = z.enum(['text', 'kompetenz'])` (optional in Meta/Auftrag, Default `'text'` im Code)
  - `RahmenwerkSchema = z.enum(['at-lehrplan', 'ib-dp'])`
  - `BewertungsschemaSchema = z.enum(['at-1-5', 'ib-1-7'])`
  - `MetaSchema` erweitert um `modus?`, `rahmenwerk?`, `stoffItemIds?`, `kompetenzNiveau?`, `bewertungsschema?`
  - `DeskriptorSchema`: `{ id, rahmenwerk, fach, stufe, bereich, code, text, quelle }`
  - `StoffItemSchema`: `{ id, rahmenwerk, titel, fach, stufe, kategorie, deskriptorIds[], defaultAufgabentypen[] }`
    - `defaultAufgabentypen` ist `string[]` (semantisch BlockTyp), um Vorwärtsverweis auf `BlockTypSchema` zu vermeiden
  - `DocumentSchema.quelltexte` mit modus-abhängigem Refinement
  - `BlockTypSchema` erweitert um `'umformung' | 'fehlerkorrektur'`
  - `BLOOM_TYP_ABGERATEN` für neue Typen (keine Einträge nötig)
- `packages/llm/src/types.ts`:
  - `BlockRequest` um `umformung` und `fehlerkorrektur` erweitern
  - `GenerateInput` um `stoffItems?: StoffItem[]` erweitern

**Kimi** — Implementierung & Wiring:
- Neue Schemata in `index.ts` implementiert
- `packages/schema/src/schema.test.ts` erweitert
- `pnpm -r build` ausgeführt und grün
- `apps/web/src/lib/constants.ts`: `BLOCK_TYPE_DEFS` + `STUFE_RULES` um neue Typen ergänzt
- `apps/web/src/lib/blockDefaults.ts`: `createDefaultBlock()` um `umformung`/`fehlerkorrektur` erweitert

### Phase 1 — Neue Blocktypen: Umformung & Fehlerkorrektur ✅

**Claude** — Schema-Design der neuen Blocktypen:
- `UmformungBlockSchema`:
  - `config.aufgaben: Array<{ nr, ausgangssatz, anweisung, zielstruktur }>`
  - `loesung: { loesungen: Array<{ nr, umformulierung, erklaerung? }> }`
- `FehlerkorrekturBlockSchema`:
  - `config.saetze: Array<{ nr, satz, anzahlFehler }>`
  - `loesung: { korrekturen: Array<{ nr, korrigierterSatz, fehler: Array<{ stelle, art: 'R'|'G'|'Z'|'A', erklaerung? }> }> }`

**Kimi** — Full-Stack Implementierung:
- `packages/schema/src/index.ts`: Schemas + Union + `buildSkelett()`-Cases
- `apps/web/src/components/BlockConfigPanel.tsx`: Config-UI für beide Typen
- `apps/web/src/components/BlockPreviewUmformung.tsx`: Preview
- `apps/web/src/components/BlockPreviewFehlerkorrektur.tsx`: Preview
- `apps/web/src/components/BlockPreview.tsx`: Switch-Cases
- `apps/web/src/hooks/useGenerate.ts`: `blockToRequest()` erweitert
- `packages/renderer/src/index.ts`: `buildUmformung()`, `buildFehlerkorrektur()` + Labels
- `packages/qa/src/korrekturraster/builder.ts`: Neue Typen als geschlossene Blocks behandelt
- Tests: `schema.test.ts` erweitert; `regression-neue-typen.test.ts` / `normalize.test.ts` folgen mit Phase 2

### Phase 2 — Generator-Pipeline: Kompetenz-Modus

**Claude** — Prompt-Engineering (das riskanteste Stück):
- `packages/llm/src/prompt.ts`:
  - `SYSTEM_KOMPETENZ` erstellen (Variante von `SYSTEM`):
    - ENTFERNT: „Leite alle Inhalte strikt aus den Quelltexten ab"
    - ENTFERNT: „Erfinde keine Fakten"
    - ENTFERNT: Coverage-Regel (Absatz-Verteilung)
    - NEU: „Du erfindest didaktisch sinnvolle Beispiele zur gegebenen Kompetenz"
    - NEU: Niveau-Steuerung (Basis/Standard/Erweitert) beeinflusst Satzkomplexität, Scaffolding, Distraktoren
    - NEU: StoffItem-Kontext wird in den User-Prompt injiziert
  - `buildMessages()`:
    - Switch `meta.modus === 'kompetenz'` → `SYSTEM_KOMPETENZ`
    - Bei Kompetenz-Modus: `stoffItems` statt `quelltexte` in den User-Prompt serialisieren
    - `fokusThemen` bleibt aktiv (verknüpft mit NATASCHA-Bridge)
  - `buildRepairMessage()`: Gleich, aber mit Kompetenz-Kontext
- `packages/llm/src/validate.ts`:
  - Kompetenz-Modus braucht keinen Quelltext-Check
  - Neuer Judge-Prompt: Prüft grammatische Korrektheit + Niveau-Fit statt Text-Abgleich

**Kimi** — Pipeline-Wiring & Guards:
- `packages/llm/src/index.ts` (`generateDocument`): `input.stoffItems` durchreichen
- `apps/web/src/hooks/useGenerate.ts`:
  - `guards()` anpassen:
    - Text-Modus: `quelltexte.length > 0` + `MIN_WOERTER` (heute)
    - Kompetenz-Modus: `stoffItemIds.length > 0` statt Quelltext-Check
  - `GenerateInput` zusammenbauen mit `stoffItems`
- `packages/llm/src/quality.ts`:
  - Kompetenz-Modus: Quelltext-Grounding-Check überspringen
  - Neuer Check: Lösungsschlüssel-Konsistenz (billiger Verifier)
- Tests: Smoke-Test mit Proof-Slice-Daten

### Phase 3 — UI: Modus-Switch & Kompetenz-Einstieg

**Claude** — UI-Konzept & State-Design:
- `apps/web/src/hooks/useWizard.ts`:
  - `AppState` um `modus: 'text' | 'kompetenz'` erweitern
  - `AppState` um `stoffItemIds: string[]` erweitern
  - Actions: `SET_MODUS`, `SET_STOFF_ITEM`
- `apps/web/src/components/Step0_Absicht.tsx`:
  - Modus-Switch: „Aus Quelltext" vs „Aus Kompetenz" (oben, vor dem Formular)
  - Bei Kompetenz: Stoff-Item-Auswahl statt Quelltext-Vorschau
  - Thema bleibt, wird als optionaler Kontext markiert
- Schnell-Einstieg-Screen (neu oder in Step0 integriert):
  - Kompetenz-Auswahl (Baum: Fach → Stufe → Bereich → Stoff-Item)
  - Optional: Thema + Niveau + Aufgabentyp
  - Sofort-Generieren-Button

**Kimi** — UI-Implementierung:
- `apps/web/src/components/Step0_Absicht.tsx`: Modus-Switch implementieren, State-Wiring
- `apps/web/src/components/Step1_Input.tsx`:
  - Bei Kompetenz-Modus: Quelltext-Upload ausblenden oder als optional markieren
  - Stattdessen: Kompetenz-Stack anzeigen (gewählte Stoff-Items)
- `apps/web/src/components/Step2_Baukasten.tsx`:
  - Bei Kompetenz-Modus: Andere Typ-Filterung (mehr geschlossene Typen erlaubt)
  - Neue Typen `umformung`, `fehlerkorrektur` in der Kachel-Auswahl
- `apps/web/src/components/Sidebar.tsx`: Neuer Nav-Punkt „Kompetenz-Übung" (Schnell-Einstieg)
- `apps/web/src/lib/storage.ts`: Kompetenz-Modus in localStorage-Serialisierung
- Stoffkatalog-Data-Layer (neu, z.B. `apps/web/src/lib/stoffkatalog.ts`):
  - Hardcoded Proof-Slice (Englisch Tenses, 5–10 Items)
  - Lookup-Funktionen: `getStoffItems(fach, stufe)`, `getDeskriptoren(ids)`
  - Später: NATASCHA-DB oder JSON-Import

### Phase 4 — Coverage / Nachweis-Export

**Claude** — Datenmodell & Export-Format:
- Coverage-Berechnung: `Block → StoffItem → deskriptorIds[] → Deskriptoren`
- Export-Format: DOCX-Tabelle oder PDF mit Kompetenzraster
- Design: „Diese Schularbeit deckt ab: Deskriptor X, Y, Z — Bereich W fehlt"

**Kimi** — Implementierung:
- `packages/renderer/src/index.ts`: `buildCoverageTabelle()`
- `apps/web/src/components/Step4_Generate.tsx`: Coverage-Anzeige nach Generierung
- Export-Button für Kompetenzraster
- `apps/web/src/lib/coverage.ts`: Logik für Abdeckungsberechnung

### Phase 5 — NATASCHA-Integration (Bridge v2)

**Claude** — Bridge-Schema-Design:
- `bridge/schema.json` v2:
  - Optional: `kompetenzen: Array<{ bereich, k1Schnitt, k3Schnitt, staerken, schwaechen }>`
  - Optional: `srdpDetail: Array<{ kriterium, stufe }>`
- NATASCHA `natascha_bridge.py`: K1/K3-Daten in Bridge-Export aufnehmen

**Kimi** — Implementierung:
- `bridge/schema.json` erweitern (Version 2, backward-compat)
- `apps/natascha/natascha_bridge.py`: K1/K3-Export ergänzen
- `apps/web/src/lib/nataschaBridge.ts`: v2 parsen, Kompetenz-Daten extrahieren
- `apps/web/src/components/Step0_Absicht.tsx`: NATASCHA-Exporte mit Kompetenz-Info anreichern

### Phase 6 — Progressive Kuratierung

**Kimi** — Datenpflege:
- `apps/lua/apps/web/src/data/stoffkatalog/`:
  - `deutsch_unterstufe.json`
  - `deutsch_oberstufe.json`
  - `englisch_unterstufe.json`
  - `englisch_oberstufe.json`
- KI-Entwurf + Mensch-Prüfung gegen RIS/BGBl
- Versionierte Snapshots (ähnlich `bridge/schema.json`)

**Claude** — Qualitätssicherung:
- Prompt-Review für neue Stoff-Items
- Judge-Prompt-Tuning für neue Kompetenzbereiche
- Regression-Tests für Generator-Qualität

---

## Datei-Index (Touch-Points)

| Datei | Wer | Änderung |
|---|---|---|
| `packages/schema/src/index.ts` | Beide | Modus, StoffItem, Deskriptor, neue Blocktypen |
| `packages/schema/src/schema.test.ts` | Kimi | Tests |
| `packages/llm/src/types.ts` | Claude | BlockRequest, GenerateInput Erweiterungen |
| `packages/llm/src/prompt.ts` | Claude | SYSTEM_KOMPETENZ, buildMessages Switch |
| `packages/llm/src/normalize.ts` | Kimi | normalizeUmformung, normalizeFehlerkorrektur |
| `packages/llm/src/transform.ts` | Kimi | Falls nötig für neue Typen |
| `packages/llm/src/validate.ts` | Claude | Kompetenz-Modus Guards |
| `packages/llm/src/quality.ts` | Kimi | Kompetenz-Modus Checks |
| `packages/llm/src/index.ts` | Kimi | Input-Durchreichung |
| `packages/renderer/src/index.ts` | Kimi | buildUmformung, buildFehlerkorrektur, Coverage |
| `apps/web/src/hooks/useWizard.ts` | Claude | State + Actions für Modus |
| `apps/web/src/hooks/useGenerate.ts` | Kimi | guards, blockToRequest, Input-Bau |
| `apps/web/src/components/Step0_Absicht.tsx` | Kimi | Modus-Switch, Stoff-Item-Auswahl |
| `apps/web/src/components/Step1_Input.tsx` | Kimi | Kompetenz-Modus-Variante |
| `apps/web/src/components/Step2_Baukasten.tsx` | Kimi | Typ-Filterung |
| `apps/web/src/components/BlockConfigPanel.tsx` | Kimi | Config-UI neue Typen |
| `apps/web/src/components/BlockPreview*.tsx` | Kimi | 2 neue Preview-Komponenten |
| `apps/web/src/components/BlockPreview.tsx` | Kimi | Switch-Cases |
| `apps/web/src/components/Sidebar.tsx` | Kimi | Neuer Nav-Punkt |
| `apps/web/src/lib/constants.ts` | Kimi | BLOCK_TYPE_DEFS, STUFE_RULES |
| `apps/web/src/lib/blockDefaults.ts` | Kimi | createDefaultBlock Erweiterung |
| `apps/web/src/lib/types.ts` | Claude | AppState, AppAction Erweiterung |
| `apps/web/src/lib/stoffkatalog.ts` | Kimi | Proof-Slice Daten + Lookup |
| `apps/web/src/lib/nataschaBridge.ts` | Kimi | v2 Parsing |
| `bridge/schema.json` | Kimi | v2 Erweiterung |
| `apps/natascha/natascha_bridge.py` | Kimi | K1/K3 Export |
| `docs/konzept-kompetenz-modus.md` | Kimi | Aktualisieren bei Änderungen |
| `CHANGELOG.md` | Kimi | Jede Phase eintragen |

---

## Reihenfolge-Empfehlung

1. **Phase 0** (Schema) → 2. **Phase 1** (neue Blocktypen) → 3. **Phase 2** (Generator) → 4. **Phase 3** (UI) → 5. **Smoke-Test** → 6. **Phase 4** (Coverage) → 7. **Phase 5** (NATASCHA Bridge v2)

**Kritischer Pfad:** Schema → neue Blocktypen → Prompt → UI-Einstieg → Smoke-Test mit Proof-Slice.

**Parallelisierbar:** Renderer für neue Typen (Phase 1) kann parallel zum Prompt (Phase 2) passieren, sobald die Schema-Struktur fix ist.

---

## Risiko-Mitigation

| Risiko | Maßnahme |
|---|---|
| Generierungsqualität ohne Quelltext | Claude designt Prompt + Judge; Kimi baut Verifier-Durchgang; Mensch prüft Vorschau |
| Breaking Change im Text-Modus | `modus` ist opt-in, Default `'text'`. Alle bestehenden Tests müssen grün bleiben. |
| Schema-Build-Chain | Nach Schema-Änderungen immer `pnpm -r build` vor Web-Test |
| WSL-Rollup-Flake | Build-Tests auf Windows oder mit `CI=true pnpm install` |
| Kuratierungsaufwand | Proof-Slice zuerst (5–10 Items). Voller Lehrplan erst nach Smoke-Test. |
