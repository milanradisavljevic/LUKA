# Changelog

## 2026-06-14

### Englisch-Arbeitsblätter: Layout & Didaktik nach Testfeedback verbessert

- **Schema**: `Merkkasten` um strukturierte `items` erweitert (`notion`, `form`, `use`, `signalWords`, `example`, `tip`). Legacy-`punkte` bleibt abwärtskompatibel.
- **Prompt (Kompetenz-Modus)**:
  - Merkkasten wird als 2-Spalten-Box mit Form, Use, kursiven Signalwörtern und Beispiel angefordert.
  - Lückentexte müssen inhaltlich kohärente Mini-Erzählungen sein (keine zeitlichen Widersprüche).
  - Kategorisierung/Matching wird für Print-Format ausgerichtet (kein Drag & Drop).
  - Blocktyp `umformung` ist im Kompetenz-Modus nicht mehr erlaubt.
  - Transferaufgabe heißt „Your turn:“ und enthält Bullet-Point-Scaffolding mit beider Zeitformen + Negationen.
- **Renderer**:
  - Englische Arbeitsblätter verwenden „Exercise N – Gap-fill“ etc. statt „Aufgabe N“.
  - Punkteübersicht und Unterschriftenzeile werden für Englisch übersetzt.
  - `buildMerkkasten` rendert strukturierte Items als übersichtliche 2-Spalten-Tabelle; Objektsprache in `*Sternchen*` oder Signalwörter werden kursiv gedruckt.
  - Matching/Kategorisierung verwenden englische Print-Labels.
- **Web-UI**:
  - `umformung` aus Baukasten, Stoffkatalog-Defaults und Block-Preview entfernt.
  - Vorschau zeigt neuen Merkkasten mit Tabelle an.
- **Validierung**: Generierte Dokumente im Kompetenz-Modus mit `umformung` werden abgelehnt.
- **Tests**: Renderer-Tests für englische Überschriften und strukturierten Merkkasten hinzugefügt; alle Suites grün.
- **Nachbesserungen**: "Word bank", "Correction", "Sentence/Category", "Class/Date", "English/Lower level/Solution" für Englisch; "Your turn:"-Dopplung vermieden; Signalwörter und Beispiele im Merkkasten kursiv.

Betroffene Dateien (Auswahl):
- `lua/packages/schema/src/index.ts`
- `lua/packages/llm/src/prompt.ts`
- `lua/packages/llm/src/validate.ts`
- `lua/packages/renderer/src/index.ts`
- `lua/packages/renderer/src/renderer.test.ts`
- `lua/apps/web/src/lib/constants.ts`
- `lua/apps/web/src/lib/blockDefaults.ts`
- `lua/apps/web/src/lib/stoffkatalog.ts`
- `lua/apps/web/src/components/BlockPreview.tsx`
- `lua/apps/web/src/components/BlockConfigPanel.tsx`
- `lua/apps/web/src/components/PreviewTwoColumn.tsx`
- `lua/apps/web/src/hooks/useGenerate.ts`
