# Changelog — opencode-1

Append-only. Eintragsformat: `- [YYYY-MM-DD] Beschreibung (Phase X)`.
Nur dieser Agent schreibt in diese Datei.

- [2026-05-31] Datei angelegt, Rolle laut AGENTS.md uebernommen.
- [2026-05-31] AGENTS.md verbessert: Setup-Befehle, Lese-Reihenfolge, DESIGN.md-Referenz, Schutz gegen Ueberschreibung. OPENCODE-1.md als eigene Instruktionsdatei erstellt.
- [2026-05-31] Phase 5, Task 5.1: OpenAI-Adapter (provider-openai.ts) — ChatGPT via fetch, JSON-Response-Format, Default gpt-4o. (Phase 5)
- [2026-05-31] Phase 5, Task 5.2: Kimi-Adapter (provider-kimi.ts) — Datenschutz-Schranke: Kimi nur fuer selbst verfasste Inhalte, keine fremden Quelltexte. (Phase 5)
- [2026-05-31] Provider-Interface erweitert: optionales input-Parameter. Registry: anthropic + openai + kimi. 16 LLM-Tests + 4 Registry-Tests gruen, Build sauber.
