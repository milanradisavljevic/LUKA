# AGENTS.md — Gemeinsame Regeln fuer alle Coding-Agents

Diese Datei lesen ALLE Agents zuerst (Claude Code, Kimi Code, OpenCode 1-3).
Danach: `DESIGN.md`. Danach die agenteneigene Datei:
- Claude Code -> `CLAUDE.md`
- Kimi Code -> `KIMI.md`
- OpenCode #1 -> `OPENCODE-1.md`
- OpenCode #2 -> `OPENCODE.md` (Abschnitt "OpenCode #2")
- OpenCode #3 -> `OPENCODE.md` (Abschnitt "OpenCode #3")

Achtung: `AGENTS.md` ist eine gemeinsame Datei. Nur OpenCode #3 darf sie am Ende
einer Phase aktualisieren. Andere Agenten aendern sie nicht.

## Wichtig: Hier bauen mehrere LLMs gleichzeitig

An diesem Repo arbeiten parallel fuenf Coding-Agents von verschiedenen Anbietern:

| Agent       | Anbieter   | Eigene Datei | Branch            |
|-------------|------------|--------------|-------------------|
| Claude Code | Anthropic  | CLAUDE.md    | agent/claude      |
| Kimi Code   | Moonshot   | KIMI.md      | agent/kimi        |
| OpenCode #1 | (frei)     | OPENCODE-1.md | agent/opencode-1  |
| OpenCode #2 | (frei)     | AGENTS.md    | agent/opencode-2  |
| OpenCode #3 | (frei)     | AGENTS.md    | agent/opencode-3  |

Du bist EINER von mehreren. Gehe nie davon aus, dass du allein im Repo bist.
Vor jeder Arbeitssitzung: `git pull --rebase`. Halte Commits klein.

## Erstmaliges Setup (einmalig, vor dem ersten Agenten-Start)

```bash
git init
git add -A
git commit -m "chore: projekt-geruest und designdokument [setup]"
for b in claude kimi opencode-1 opencode-2 opencode-3; do git branch agent/$b; done
```

Danach muss Claude Code zuerst Phase 0 abschliessen (Task 0.1: Monorepo scaffolden),
bevor andere Agenten in ihren Modulen arbeiten koennen. Ohne `packages/schema` gibt
es keinen Vertrag zum Importieren.

## Modul-Ownership (verhindert Kollisionen)

Jeder Agent besitzt ein Modul. Du editierst NUR dein eigenes Modul. Willst du eine
Aenderung in einem fremden Modul, traegst du sie als Aufgabe in `TASKS.md` ein und
ueberlaesst sie dem Owner.

| Modul                | Owner       | Zweck                                   |
|----------------------|-------------|-----------------------------------------|
| packages/schema      | Claude Code | Datenstruktur (Zod + Typen), der Vertrag|
| packages/renderer    | Claude Code | JSON -> 2x .docx, Hausstil              |
| packages/input       | Kimi Code   | Quelltexte parsen + Drive lesen         |
| packages/llm         | OpenCode #1 | Anbieter-Adapter, erzwingt JSON         |
| apps/web             | OpenCode #2 | Baukasten-UI + Vorschau                 |
| packages/qa          | OpenCode #3 | Fixtures, Integrationstests, Raster     |

Sonderregel Schema: `packages/schema` ist der Vertrag zwischen allen Modulen.
Nur Claude Code aendert es. Alle anderen importieren es und melden Aenderungswuensche
ueber `TASKS.md`.

## Goldene Regeln

1. `DESIGN.md` ist die Quelle der Wahrheit. Bei Widerspruch gewinnt `DESIGN.md`.
2. Inhalt und Layout strikt trennen. Hausstil gehoert in den Renderer-Code, nie ins Prompt.
3. Editiere nur dein Modul. Fremde Aenderung -> `TASKS.md`.
4. Vor Arbeitsbeginn `git pull --rebase`, danach kleine Commits.
5. Jede LLM-Ausgabe wird gegen das Zod-Schema validiert, bevor sie gerendert wird.
6. Keine Schuelerdaten verarbeiten. Datenschutz-Hinweise in `DESIGN.md` Abschnitt 9 beachten.

## Schlueszel-Abschnitte in DESIGN.md

| Abschnitt | Thema | Wann lesen |
|-----------|-------|------------|
| 4 | Tech-Stack & Monorepo-Layout | Zu Beginn, um die Verzeichnisstruktur zu verstehen |
| 5 | Datenstruktur (JSON-Schema) | Beim Arbeiten an Schema, Validierung oder Input |
| 6 | Block-Katalog (6 Typen) | Beim Implementieren von Adaptern, Renderern oder UI |
| 7 | Hausstil | Nur Renderer-Owner (Claude Code); andere nur lesen |
| 8 | Sprachregeln | Beim Bauen von Prompts oder UI-Texten |
| 9 | Datenschutz | Vor dem Verarbeiten von Quelltexten |

## Aufgaben uebernehmen (Claim)

`TASKS.md` ist das Aufgabenbrett. Bevor du eine Aufgabe startest:
- setze in `TASKS.md` deinen Namen und Status `in Arbeit` in die Zeile.
- committe diese Aenderung zuerst (so sehen die anderen, dass die Aufgabe vergeben ist).
- nach Fertigstellung Status `fertig`.

## Branch- und Commit-Konvention

- Branch pro Agent (siehe Tabelle oben). `main` ist nur fuer integrierte, getestete Staende.
- Conventional Commits mit Agent-Tag, z. B.:
  `feat(renderer): lueckentext-block mit linien rendern [claude]`
  `fix(input): pdf-parser umlaute korrigieren [kimi]`
- Vor Merge nach `main`: Tests gruen (`pnpm test`).

## Changelog-Protokoll

Damit nicht alle in dieselbe Datei schreiben und Konflikte entstehen:
- jeder Agent schreibt NUR in seine eigene Datei `changelog/<agent>.md` (append-only).
- Eintragsformat: `- [YYYY-MM-DD] kurze Beschreibung (Phase X)`.
- Am Ende jeder Phase rollt OpenCode #3 die Eintraege in `CHANGELOG.md` zusammen.

## Definition of Done pro Aufgabe

- Code im eigenen Modul, gegen Schema getippt.
- Tests vorhanden und gruen.
- Eintrag in `changelog/<agent>.md`.
- Status in `TASKS.md` auf `fertig`.
