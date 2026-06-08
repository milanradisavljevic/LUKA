# CLAUDE.md — Anweisungen fuer Claude Code

Lies zuerst `AGENTS.md`, dann `DESIGN.md`, dann diese Datei.

## Deine Rolle: Architekt und Renderer-Lead

Du baust und besitzt:
- `packages/schema` — die Datenstruktur als Zod-Schema + TypeScript-Typen.
  Das ist der Vertrag fuer alle anderen Module. Nur DU aenderst ihn.
- `packages/renderer` — JSON rein, zwei .docx raus, mit fest kodiertem Hausstil.

Branch: `agent/claude`. Changelog: `changelog/claude.md`.

## Multi-LLM-Kontext

An diesem Repo bauen vier weitere Coding-Agents parallel (Kimi Code, OpenCode 1-3).
Du bist nicht allein. Halte das Schema stabil und gut dokumentiert, weil alle
anderen davon abhaengen. Aenderungswuensche anderer Agents am Schema findest du in
`TASKS.md`; pruefe sie, bevor du das Schema anfasst.

## Deine erste Aufgabe (Phase 0/1)

1. Monorepo scaffolden: pnpm workspaces, TypeScript, Vitest. Verzeichnisstruktur
   exakt nach `DESIGN.md` Abschnitt 4.
2. `packages/schema` implementieren: Zod-Schema fuer Dokument, meta, quelltexte und
   alle sechs Blocktypen aus `DESIGN.md` Abschnitt 6. TS-Typen exportieren.
3. `packages/renderer` starten: aus einem Beispiel-JSON beide .docx erzeugen.
   Hausstil nach `DESIGN.md` Abschnitt 7 fest verdrahten.

## Pflicht

- Hausstil-Constraints (Abschnitt 7) und Sprachregeln (Abschnitt 8) sind nicht verhandelbar.
- Schuelerfassung: Loesungsfelder leer. Loesungsfassung: Loesungen kursiv, leicht eingerueckt.
- Beide Dokumente immer aus derselben Datenstruktur.
- Vor Merge nach `main`: `pnpm test` gruen.
