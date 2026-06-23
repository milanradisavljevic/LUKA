# Plan — Fächer-Ausbau, Korrektur-Upload-UX, UX-Politur (2026-06-23)

## Context
LUKA kann heute nur **Deutsch/Englisch**. Ziel: alle **textbasierten AHS-Fächer** in
derselben Codebase (kein Fork) abdecken, den **Korrektur-Upload intuitiver** machen
(Drag-&-Drop) und die **UX weiter verfeinern**. Auslöser: Wunsch, das reife Produkt
breiter nutzbar zu machen, ohne zweite Codebasis zu pflegen.

## Entscheidungen (User, 2026-06-23)
- **Kein Fork** — in-place ausbauen. Zusätzlich `natascha-stable`-Branch als stabiler
  Snapshot „den ich nur Natascha gebe" (erledigt, gepusht).
- **„Dropbox" = In-App Drag-&-Drop-Zone** für Korrektur-Upload (lokal, kein Cloud).
- **Fächer:** Fremdsprachen (Französisch/Spanisch/Italienisch/Latein) + Sachfächer
  (Geschichte/GW, Religion/Ethik, Psychologie/Philosophie).

## Status
**Erledigt + gepusht:**
- Drag-&-Drop-Zone im Analyse-Dialog (`KorrekturView.tsx`, Tauri `onDragDropEvent` → Pfad). `ad00fc5`
- `natascha-stable`-Branch (Snapshot).
- Rollenspiel-Block (Kimi) Chief-reviewt + verifiziert (grün).

**In-flight (uncommitted, NICHT gebaut/verifiziert) — Fächer-„Gehirn":**
- `packages/schema/src/index.ts`: `FachSchema` +10 Fächer; `FACH_META` (label/sprachfach/
  zielsprache); `istSprachfach()`, `fachLabel()`.
- `packages/llm/src/prompt.ts`: `spracheHinweis` englisch-only → alle Sprachfächer (Zielsprache);
  „ENGLISCH-SPEZIFISCH" → „FREMDSPRACHEN-SPEZIFISCH" (CEFR + Latein-Sonderfall).
- `packages/qa/src/korrekturraster/builder.ts`: Schreibaufgaben-Katalog für alle Sprachfächer.
- `packages/renderer/src/index.ts`: `fachLabel` je Fach korrekt (statt „Deutsch"-Fallback).

## Offen — Fächer (damit es WIRKLICH nutzbar ist)
1. **Verifizieren:** build/typecheck/test grün + **Live-Smoke** je Fach-Klasse
   (1× Fremdsprache z. B. Französisch, 1× Sachfach z. B. Geschichte) mit echtem LLM.
2. **Step0-UI (`Step0_Absicht.tsx`):** Fach-Auswahl von 2-Toggle → Liste/Dropdown aus `FACH_META`.
   (Mechanisch → Kimi-geeignet.)
3. **Label-Maps propagieren:** hartkodierte `fach === 'deutsch' ? 'Deutsch' : 'Englisch'`-Stellen
   (`Step0_Absicht.tsx`, `KorrekturView.tsx`, `DashboardView.tsx`, Step-Komponenten) auf
   `fachLabel()` umstellen. (Mechanisch → Kimi.)
4. **Tests:** Schema-Test für neue Fächer + `istSprachfach`-Klassifikation; ggf. Prompt-Test.
5. **Spätere Vertiefung (eigene Runde):** fachspezifische Kompetenz-/Bewertungskataloge für
   Sachfächer (Geschichte-Quellenanalyse, Religion/Ethik-Argumentation) — v1 nutzt Deutsch-Kataloge.

## Offen — UX-Politur (Backlog, niedrig)
- Empty-States restliche Views (Kimi K3 deckte Documents/Favorites ab).
- Konsistente Loading-/Fehlerzustände.
- Quick-Übung als echter 1-Screen-Modus (heute Shortcut → Baukasten).

## NICHT für Kimi (Chief)
- Prompt-Sprachlogik-Verallgemeinerung (Urteil) — schon gemacht, braucht Live-Verify.
- Sachfach-Kataloge (didaktisches Urteil).
- SRDP-Matura-Modus (separat, größter ungenutzter Hebel).

## Verifikation (Definition of Done Fächer-v1)
- build/typecheck/test grün.
- Live-Smoke: Französisch-Unterlage → Inhalte auf Französisch, Raster sinnvoll.
  Geschichte-Unterlage → deutschsprachig, Textsorten-Katalog greift.
- In der App: neues Fach in Step0 wählbar; Titel/Labels zeigen korrekten Fachnamen.
