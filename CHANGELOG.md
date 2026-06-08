# Changelog

Alle nennenswerten Änderungen an **lehr-suite** (NATASCHA × LUA Integration).
Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/).
Neueste Einträge oben. Bitte bei jeder substanziellen Änderung hier ergänzen
(auch andere Coding-Agents) — siehe `AGENTS.md`.

## [Unreleased]

### Added
- `docs/phase2-shared-db.md` — ausführbares Design für Phase 2 (gemeinsame
  SQLite). Kernentscheidung dokumentiert: `storage.ts` ist synchron, SQLite-
  über-Tauri ist async → Hydrate-Cache (Weg A), sync-API erhalten.

## 2026-06-08 — Phase 1: Datei-Brücke NATASCHA → LUA (MVP)

### Added
- **Neues Mono-Repo** `lehr-suite/` mit `apps/lua/` (Lehrunterlagen-Tool) und
  `apps/natascha/` (NATASCHA) als sauberer Snapshot ihrer eigenständigen Repos
  (keine Alt-Git-Historie). Original-Repos bleiben als Backup unangetastet.
- **Bridge-Vertrag** `bridge/schema.json` (JSON Schema, `schemaVersion: 1`):
  Heatmap (R/G/Z/A) + echte Fehlerbeispiele (`zitat`/`korrektur`) + Empfehlungen.
  Doku: `bridge/README.md`.
- **NATASCHA** `natascha_bridge.py`: `export_klassen_bridge()` schreibt pro
  Klasse/Aufgabe ein schema-konformes JSON in die Inbox (atomar). Mit CLI
  (`python natascha_bridge.py <klasse> <aufgabe>`).
- **NATASCHA-TUI**: Button „🎯 Für Übungs-Tool" im Heatmap-Tab
  (`natascha.py`, Handler `_export_bridge`). Config-Sektion `[bridge]` in
  `natascha_config.toml` (`inbox_dir`, Default `~/lehr-suite-bridge/inbox`).
- **LUA** `meta.fokusThemen` (+ in `AuftragSchema`) in
  `packages/schema/src/index.ts`. Prompt-Hinweis `fokusThemenHinweis` in
  `packages/llm/src/prompt.ts` (`buildMessages`).
- **LUA** Tauri-Commands `list_bridge_exports` / `read_bridge_export`
  (`src-tauri/src/commands/bridge.rs`, registriert in `main.rs`/`mod.rs`).
- **LUA** Step0-Einstieg „Aus NATASCHA-Korrektur" + Mapping-Helfer
  `apps/web/src/lib/nataschaBridge.ts` (Kategorie → Aufgabentypen, Vorbefüllung).
- **Tests**: `prompt.test.ts` (fokusThemen-Hinweis), `nataschaBridge.test.ts`
  (Parse + Mapping).

### Verified
- `pnpm build`, `pnpm -r typecheck`, `pnpm -r test` — grün.
- `cargo check` (Tauri-Backend) — sauber.
- NATASCHA seed (`seed_testdaten.py`) → Export → `jsonschema.validate` — PASS.

### Noch offen
- Phase 2 (gemeinsame SQLite) und Phase 3 (Unified Tauri-Frontend) — geplant,
  nicht gebaut. Siehe `AGENTS.md` → Roadmap und `docs/phase2-shared-db.md`.

### 2026-06-08 — Live-GUI-Test bestanden
- `pnpm tauri:dev` baut & läuft (Tauri-Backend inkl. `commands/bridge.rs`
  kompiliert in ~1m13s); NATASCHA-Sektion in Step0 sichtbar und funktional.
