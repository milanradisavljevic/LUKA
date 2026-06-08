# Changelog

Kanonischer, zusammengefuehrter Changelog des Projekts.

Waehrend der Arbeit schreibt jeder Agent NUR in seine eigene Datei unter
`changelog/<agent>.md` (verhindert Merge-Konflikte). Am Ende jeder Phase rollt
OpenCode #3 die Eintraege hier zusammen, gruppiert nach Phase.

Format orientiert an Keep a Changelog. Versionierung nach Phasen (0.x = Phase x).

## [Unveroeffentlicht]

### Phase 0
- Projekt-Geruest und Designdokument angelegt.
- Monorepo scaffold: pnpm workspaces, TypeScript, Vitest (Claude Code).
- Zod-Schema fuer alle 6 Blocktypen + TS-Typen exportiert (Claude Code).
- 6 Fixture-JSONs pro Blocktyp + Validierungstests (OpenCode #3).

### Phase 1
- Renderer: JSON -> 2x .docx mit Hausstil (Claude Code).
- Integrationstest: Fixtures validieren + rendern zu 2 .docx (OpenCode #3).

### Phase 2
- LLM-Adapter: Anbieter-Schnittstelle, Claude-Adapter, Prompt-Bau, Zod-Validierung (Architekt/OpenCode #1).
- txt-Parser (Kimi Code).
- Glue-Modul: runPipeline fuer End-to-end-Lauf Quelltext -> 2 .docx (OpenCode #3).

### Phase 5
- Korrekturraster: Builder, Kriterienkataloge (5 Typen), Notenschluessel, renderRaster() fuer 3. .docx (OpenCode #3).
