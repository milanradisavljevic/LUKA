# Changelog — kimi

Append-only. Eintragsformat: `- [YYYY-MM-DD] Beschreibung (Phase X)`.
Nur dieser Agent schreibt in diese Datei.

- [2026-05-31] Datei angelegt, Rolle laut AGENTS.md uebernommen.
- [2026-05-31] Task 2.4: txt-Parser implementiert — UTF-8, Zeilenumbruch-Normalisierung, Titel aus Dateiname. (Phase 2)
- [2026-05-31] Task 3.1: docx-Parser (mammoth) und pdf-Parser (pdf2json) implementiert. 5 Parser-Tests, alle gruen. (Phase 3)
- [2026-05-31] Task 3.2: html-Upload-Parser (linkedom) — entfernt Boilerplate (nav, footer, script), extrahiert Text aus article/main/section. (Phase 3)
- [2026-05-31] Task 3.3: url-Abruf mit fetch — Timeout 10s, klare Fehlermeldungen bei 403/429/401/Netzwerkfehler. (Phase 3)
- [2026-05-31] Task 3.4: Quelltext-Aufbereitung (truncateText) — heuristik-basiert, behaelt ersten/letzten Absatz, kuerzt mittlere Absaetze auf Lesetempo. 17 Parser-Tests, alle gruen. (Phase 3)
- [2026-05-31] QC-Bericht umgesetzt: Integrations-Risiken behoben (Anbieter/Modell-Mapping, LLM-Verdrahtung in useExport.ts). Akzentfarbe auf Violett (#5b5bd6). LLM-Schritt mit Kreativitaetsregler und Sprachauswahl. Baukasten-Galerie mit Icons und farbigen Badges. Sidebar mit Navigation. Responsive App-Rahmen. Build erfolgreich.
