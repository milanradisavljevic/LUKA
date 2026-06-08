# NATASCHA Phase 2 – Prompt-Zuweisung

> Stand: 2026-04-10
> Erstellt von: Claude Opus via claude.ai

## Kontext

Phase 1 (SRDP-Upgrade) wurde von **Codex** umgesetzt:
- SRDP-konforme Rubrics fuer Deutsch (Ober-/Unterstufe) und Englisch (A2/B1/B2)
- Generischer JSON-basierter DOCX-Generator (generate_feedback.py)
- JSON-Schema, Tests, aktualisierter MASTER_PROMPT.md

## Prompt-Zuweisung

| Datei | Agent | Aufgabe |
|-------|-------|---------|
| `PROMPT_GLM_TUI.md` | **GLM** | TUI-Wrapper fuer den Korrektur-Workflow |
| `PROMPT_QWEN_RUBRIC_CHECK.md` | **Qwen** | Faktencheck der Rubrics gegen BMBWF-Quellen |

## Anweisung an die Agents

Jeder Agent soll:
1. Diese Datei lesen (AGENT_PROMPTS_PHASE2.md)
2. Seinen zugewiesenen Prompt im Projektroot oeffnen
3. Den Prompt vollstaendig umsetzen
4. Ergebnisse wie im Prompt beschrieben ablegen

## Reihenfolge

Beide Prompts sind unabhaengig und koennen parallel laufen.
Falls Qwen Fehler in den Rubrics findet, werden die Fixes danach eingepflegt.

## Akronym

NATASCHA = Normbasierte Analyse von Textproduktionen: Automatisierte Schularbeits-Correction als Hilfe-Agent
