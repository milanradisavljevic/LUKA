# OPENCODE-1.md — Anweisungen fuer OpenCode #1 (LLM-Adapter)

Lies zuerst `AGENTS.md`, dann `DESIGN.md`, dann diese Datei.

## Deine Rolle: LLM-Adapter

Du besitzt `packages/llm`. Branch: `agent/opencode-1`. Changelog: `changelog/opencode-1.md`.

Aufgabe: gemeinsame Anbieter-Schnittstelle plus Adapter fuer Claude (Anthropic),
ChatGPT (OpenAI), Kimi (Moonshot). Jeder Adapter zwingt das Modell zu JSON, das
exakt dem Schema aus `packages/schema` entspricht. Antwort wird vor Rueckgabe
gegen das Schema validiert (Zod).

## Multi-LLM-Kontext

An diesem Repo bauen vier weitere Coding-Agents parallel. Du bist nicht allein.
Du importierst Typen aus `packages/schema` (Owner: Claude Code) und aenderst
dieses Schema nie selbst. Brauchst du eine Schema-Aenderung, trage sie in
`TASKS.md` ein.

## Deine Aufgaben

### Phase 2 — Ein LLM end-to-end (prioritaet)

| ID  | Aufgabe                                      | Status |
|-----|----------------------------------------------|--------|
| 2.1 | Anbieter-Schnittstelle + Claude-Adapter      | offen  |
| 2.2 | JSON erzwingen + Zod-Validierung der Antwort | offen  |
| 2.3 | Prompt-Bau aus Bloecken + Quelltext          | offen  |

### Phase 5 — Ausbau

| ID  | Aufgabe                                      | Status |
|-----|----------------------------------------------|--------|
| 5.1 | ChatGPT-Adapter                              | offen  |
| 5.2 | Kimi-Adapter (mit Datenschutz-Schranke)      | offen  |

Architektur von Anfang an fuer drei Adapter auslegen, auch wenn in Phase 2
nur der Claude-Adapter gezaehlt.

## Technische Vorgaben

- Schema-Vertrag: `packages/schema` — gegen dieses Zod-Schema validieren.
- Anti-Halluzination: LLM-Antwort MUSS validiert werden. Bei Fehler: klare
  Meldung, kein Silent-Fallback.
- Modellnamen aktuell halten (z.B. Claude Opus 4.8, GPT-4o).
- Datenprivacy: Kimi-Adapter nur fuer unkritische, selbst verfasste Inhalte
  vorsehen, nicht fuer fremde Quelltexte. Siehe DESIGN.md Abschnitt 9.

## Definition of Done

- Code in `packages/llm`, gegen Schema getippt.
- Tests vorhanden und gruen (`pnpm test`).
- Eintrag in `changelog/opencode-1.md`.
- Status in `TASKS.md` auf `fertig`.
