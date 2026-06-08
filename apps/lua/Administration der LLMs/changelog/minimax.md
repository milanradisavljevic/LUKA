# Changelog — minimax

Append-only. Eintragsformat: `- [YYYY-MM-DD] Beschreibung (Phase X)`.
Nur dieser Agent schreibt in diese Datei.

- [2026-06-04] Konsolidierung Kimi + Qwen + GLM + Minimax abgeschlossen. 5 neue Aufgabentypen (wordScramble, kategorisierung, tabelle, stiluebung, songanalyse) vollstaendig implementiert ueber alle Schichten:
  - **Schema** (`packages/schema/src/index.ts`): 5 neue Block-Schemas (WordScramble/Kategorisierung/Tabelle/Stiluebung/Songanalyse) mit `refine`-Constraints; BlockSchema-Discriminated-Union und BlockTypSchema-Enum erweitert; Tests in `schema.test.ts` (+10 Tests, gesamt 84 gruen).
  - **Renderer** (`packages/renderer/src/index.ts`): 5 neue `build*`-Funktionen (wordScramble mit shuffled Anzeige + Schreiblinien; kategorisierung als 2-Spalten-Tabelle; tabelle mit Header + Loesungsfeldern; stiluebung mit Ausgangstext + Ziel-Transformation; songanalyse mit Interpret/Titel/Lyrics + Analysepunkten); Tests in `renderer.test.ts` (+5 Tests, gesamt 23 gruen).
  - **QA** (`packages/qa/src/`):
    - 5 neue Fixtures (`wordScramble.json`, `kategorisierung.json`, `tabelle.json`, `stiluebung.json`, `songanalyse.json`).
    - 5 neue Kataloge (`WORD_SCRAMBLE`, `KATEGORISIERUNG`, `TABELLE`, `STILUEBUNG`, `SONGANYLYSE`) in `korrekturraster/kataloge.ts`; `waehleKatalog` in `builder.ts` erweitert.
    - Vollstaendiger Mock-LLM-Provider in `__mocks__/mock-llm-provider.ts` mit `detectBlockTyp()` (Keyword-Erkennung) + 11 Fixture-Mappings; `runPipeline` akzeptiert optional `customProvider`-Parameter.
    - 12+12+11 E2E/Integration/Fixture-Tests reaktiviert; gesamt 94 QA-Tests gruen (vorher 37).
  - **Web** (`apps/web/src/`):
    - 5 neue BlockPreview-Komponenten (BlockPreviewWordScramble, BlockPreviewKategorisierung, BlockPreviewTabelle, BlockPreviewStiluebung, BlockPreviewSonganalyse) mit ARIA `role="region"` und `aria-label`.
    - BlockConfigPanel.tsx: 5 neue Sektionen (Switch-Cases fuer die 5 neuen Typen).
    - BlockPreview.tsx: Switch-Case erweitert; TemplateManager.tsx: `getEmptyLoesung` fuer 5 neue Typen; constants.ts: `BLOCK_TYPE_DEFS` und `STUFE_RULES` um 5 neue Typen erweitert.
    - blockDefaults.ts: `createDefaultBlock`, `BLOCK_ARBEITSANWEISUNG_PLACEHOLDER`, `BLOCK_LABELS` fuer 5 neue Typen; tests +1 (gesamt 7 gruen).
  - **GLM-Lanes uebernommen und abgehakt**: Preise verifiziert (bereits in `models.ts` mit Quellen), Anbieter-Logos als Inline-SVGs in `ProviderLogos.tsx` (alle 6 Anbieter), Tippfehler "Aufgabenblockoecke" bereits in Claudes Iteration 1+2 behoben, Akzentfarbe violett bereits in Kimis Phase 4 umgesetzt, Vitest-Config in `packages/input/` bereits vorhanden, Blocktyp-Platzhalter pro Blocktyp neu hinzugefuegt.
  - **Qwen-Scope**: Nichts (per User-Anweisung); `src-tauri/` unveraendert; `cargo test` kompiliert gruen (0 Tests, keine Regressionen).
  - **Tests gesamt**: 302 gruen (Schema 84, Renderer 23, LLM 69, Input 17, QA 94, Web 15). Typecheck sauber in allen 6 Packages.
  - **Doku**: `docs/aufgabentypen-erweiterung.md` Status auf "vollstaendig umgesetzt" gesetzt, Vertrag-Update dokumentiert (Abweichung bei wordScramble/kategorisierung).
  (Audit-Konsolidierung)
