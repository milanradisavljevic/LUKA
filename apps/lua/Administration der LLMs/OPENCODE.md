# OPENCODE.md — Anweisungen fuer die drei OpenCode-Instanzen

OpenCode liest standardmaessig `AGENTS.md`. Diese Datei klaert nur, welche der drei
Instanzen welches Modul besitzt. Starte jede Instanz mit einem klaren Hinweis,
welche Rolle sie hat (1, 2 oder 3).

Lies zuerst `AGENTS.md`, dann `DESIGN.md`, dann den fuer dich passenden Abschnitt hier.

## OpenCode #1 — LLM-Adapter

**Hinweis: OpenCode #1 hat eine eigene Datei `OPENCODE-1.md`. Lies diese statt dieses Abschnitts.**

Besitzt `packages/llm`. Branch: `agent/opencode-1`. Changelog: `changelog/opencode-1.md`.
Aufgabe: gemeinsame Anbieter-Schnittstelle plus Adapter fuer Claude (Anthropic),
ChatGPT (OpenAI), Kimi. Jeder Adapter zwingt das Modell zu JSON, das exakt dem
Schema aus `packages/schema` entspricht. Antwort wird vor Rueckgabe gegen das
Schema validiert (Zod). In Phase 2 zaehlt nur der Claude-Adapter, die anderen
folgen in Phase 5. Architektur aber von Anfang an fuer drei auslegen.

## OpenCode #2 — Frontend
Besitzt `apps/web`. Branch: `agent/opencode-2`. Changelog: `changelog/opencode-2.md`.
Aufgabe: Baukasten-UI nach dem bestehenden Mockup (React + Vite). Vier Schritte:
Input, Baukasten (Drag and Drop, Punkte pro Block, Gesamtpunkte), LLM und Optionen,
Generieren. Zentral in Phase 4: die zweispaltige, pro Block editierbare Vorschau
(Schueler links, Loesung rechts) vor dem Export. Modellnamen aktuell halten
(Opus 4.8 usw.). Stufenabhaengige Optionen automatisch deaktivieren (z. B. Wortbank
nur Unterstufe).

## OpenCode #3 — QA und Integration
Besitzt `packages/qa`. Branch: `agent/opencode-3`. Changelog: `changelog/opencode-3.md`.
Aufgabe: Test-Fixtures (Beispiel-JSON pro Blocktyp), Integrationstests ueber die
ganze Pipeline, Anbindung des Korrekturraster-Skills. Zusatzrolle: am Ende jeder
Phase die per-Agent-Changelogs in `CHANGELOG.md` zusammenrollen.
