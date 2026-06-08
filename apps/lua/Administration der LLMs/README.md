# Lehrunterlagen-Tool

Generator fuer AHS-Lehrunterlagen (Deutsch und Englisch). Quelltexte rein,
Aufgabenbloecke im Baukasten zusammenstellen, mit waehlbarem LLM Inhalte erzeugen,
zwei druckfertige Word-Dokumente raus: Schueler*innenfassung und Loesung, garantiert
im Hausstil.

## Wo anfangen

1. `DESIGN.md` — das Designdokument mit allen Phasen, der Datenstruktur und dem
   Block-Katalog. Quelle der Wahrheit.
2. `AGENTS.md` — Regeln fuer das Bauen mit mehreren LLM-Agents gleichzeitig.
3. `TASKS.md` — Aufgabenbrett mit Verteilung und Status.

## Multi-Agent-Setup

An diesem Repo bauen fuenf Coding-Agents parallel. Jeder besitzt ein Modul und
einen Branch und liest beim Start seine Datei:

| Agent       | Datei        | Modul             | Branch           |
|-------------|--------------|-------------------|------------------|
| Claude Code | CLAUDE.md    | schema, renderer  | agent/claude     |
| Kimi Code   | KIMI.md      | input             | agent/kimi       |
| OpenCode #1 | OPENCODE.md  | llm               | agent/opencode-1 |
| OpenCode #2 | OPENCODE.md  | web               | agent/opencode-2 |
| OpenCode #3 | OPENCODE.md  | qa                | agent/opencode-3 |

## Erststart (einmalig, durch eine Person)

```bash
git init
git add -A
git commit -m "chore: projekt-geruest und designdokument [setup]"
# danach Branches anlegen:
for b in claude kimi opencode-1 opencode-2 opencode-3; do git branch agent/$b; done
```

Dann jeden Agent in seinem Branch starten und auf seine Datei verweisen.

## Stack

TypeScript, Node 20+, pnpm-Monorepo, `docx` zum Rendern, Zod fuers Schema,
React + Vite fuers Frontend, Vitest fuer Tests.
