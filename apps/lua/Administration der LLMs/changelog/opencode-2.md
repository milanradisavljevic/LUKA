# Changelog — opencode-2

Append-only. Eintragsformat: `- [YYYY-MM-DD] Beschreibung (Phase X)`.
Nur dieser Agent schreibt in diese Datei.

- [2026-05-31] Datei angelegt, Rolle laut AGENTS.md uebernommen.
- [2026-05-31] Task 4.1: Vier-Schritte-Flow als Wizard (Input -> Baukasten -> LLM -> Generate) mit React Context + useReducer, Schritt-Indikator, Navigation. (Phase 4)
- [2026-05-31] Task 4.2: Baukasten-Step mit Drag-and-Drop (@dnd-kit), Punkte pro Block editierbar, Gesamtpunkte-Zaehler, Block-Reordering. (Phase 4)
- [2026-05-31] Task 4.3: Block-Konfigurationspanel pro Typ — dynamische UI fuer lueckentext, matching, multipleChoice, offeneVerstaendnisfrage, offeneSchreibaufgabe, markieraufgabe mit allen config-Feldern. (Phase 4)
- [2026-05-31] Task 4.4: Stufenabhaengige Optionen — wortbank=true nur in unterstufe, distraktoren deaktiviert wenn wortbank=false, offeneSchreibaufgabe nur in oberstufe. (Phase 4)
- [2026-05-31] Task 4.3 (Rev): ConfigPanel mit Inline-Validierung — Matching items<optionen, Lückentext distraktoren>=1 bei wortbank, Schreibaufgabe min<=max. Entfernen-Buttons für Arrays. (Phase 4)
- [2026-05-31] Task 4.5: Zweispaltige editierbare Vorschau — BlockPreview-Komponenten für alle 6 Typen mit visuellem HTML-Layout (Lückenlinien, Matching-Tabelle, MC-Checkboxen, Schreiblinien >=9mm, Markierliste). Export via renderDocument() aus @lehrunterlagen/renderer. Schüler links / Lösung rechts. (Phase 4)
- [2026-05-31] Task 4.6: Vorlagen speichern/laden — localStorage-Persistenz, JSON-Export/Import, Modal-Dialog im App-Header. (Phase 4)
- [2026-05-31] Task 5.4: Sprach-/Tippbefehl zu Dokument — CommandPalette (Ctrl+K), Regex-basierter Parser für Navigation, Metadaten, Block-Management, Export und Vorlagen. Web Speech API für Spracheingabe (deutsch). Integriert in App-Shell mit Hotkey-Listener. (Phase 5)
