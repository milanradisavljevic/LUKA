# Changelog — architekt

Eintraege des Architekten (Orchestrierung, modueluebergreifende Eingriffe).
Eintragsformat: `- [YYYY-MM-DD] Beschreibung (Phase X)`.

- [2026-05-31] packages/llm angelegt: Anbieter-Registry, Anthropic-Adapter (fetch,
  Default-Modell claude-sonnet-4-6), Prompt-Bau mit inhaltlichen Regeln, Zod-Validierung
  der Modellantwort mit einer Korrekturrunde, netzunabhaengiger Test fuer die Validierung.
  Erfuellt 2.1-2.3. OpenCode #1 uebernimmt das Modul und ergaenzt in Phase 5 die Adapter
  fuer ChatGPT und Kimi. (Phase 2)
