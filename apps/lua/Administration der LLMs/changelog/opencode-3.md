# Changelog — opencode-3

Append-only. Eintragsformat: `- [YYYY-MM-DD] Beschreibung (Phase X)`.
Nur dieser Agent schreibt in diese Datei.

- [2026-05-31] Datei angelegt, Rolle laut AGENTS.md uebernommen.
- [2026-05-31] 6 Fixture-JSONs + Validierungstests erstellt (Task 0.4, Phase 0)
- [2026-05-31] Integrationstest: 6 Fixtures + kombiniertes Dokument rendern zu 2 .docx (Task 1.6, Phase 1)
- [2026-05-31] Glue-Modul (runPipeline) + E2E-Test: LLM -> Renderer -> 2 .docx (Task 2.5, Phase 2)
- [2026-05-31] LLM-Validierung: Normalisierung fuer LLM-Ausgabe (Arrays->Records, korrekt->antwort) (Phase 2)
- [2026-05-31] 12 Fixtures + 2 E2E .docx fuer Natascha generiert (Phase 2 Gate)
- [2026-05-31] Korrekturraster: Builder, Kriterienkataloge, Notenschluessel, renderRaster(), Tests (Task 5.5, Phase 5)
