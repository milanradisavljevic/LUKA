# AGENTS.md — Onboarding für Coding-Agents

Dieses Repo (`lehr-suite`) verschmilzt zwei Lehrer-Desktop-Tools zu einem
**Closed-Loop-System** (Erstellen → Korrigieren → gezielt Üben). Lies das hier,
bevor du Code änderst.

## Goldene Regeln

1. **Changelog pflegen.** Jede substanzielle Änderung kommt in `CHANGELOG.md`
   (oben, mit Datum). Das ist die Übergabe an den nächsten Agent.
2. **Keine Schüler-Echtdaten committen.** DBs (`*.db`), `apps/natascha/output/`,
   `apps/natascha/input/`, „abgegebene Arbeiten", `bridge/inbox/*.json` und
   `.env` sind per `.gitignore` ausgeschlossen — halte es so.
3. **Vor „fertig": verifizieren.** Befehle unten ausführen und Output prüfen,
   nicht raten.
4. **Snapshot-Charakter respektieren.** `apps/lua` und `apps/natascha` sind
   Kopien eigenständiger Apps; sie sollen je für sich lauffähig bleiben.

## Struktur

```
apps/lua/        Lehrunterlagen-Tool — TS + React + Vite + Tauri (pnpm-Monorepo)
                 packages/{schema,llm,input,renderer,qa} + apps/web + src-tauri
apps/natascha/   NATASCHA — Python 3.11+ / Textual-TUI, SQLite
bridge/          Datei-Brücke: schema.json (Vertrag) + README.md + inbox/
```

## Apps bauen / verifizieren

**LUA** (in `apps/lua/`):
```bash
pnpm install
pnpm -r build         # Pakete bauen (web löst @lehrunterlagen/schema über dist/ auf → erst bauen!)
pnpm -r typecheck
pnpm -r test
pnpm smoke            # echter LLM→DOCX Smoke-Test (billiges Haiku) — kostet API
cd src-tauri && cargo check   # Rust-Backend
pnpm tauri:dev        # Desktop-App (braucht Display; real auf Windows)
```

**NATASCHA** (in `apps/natascha/`):
```bash
python3 seed_testdaten.py     # Test-DB (Klasse TEST-7a), braucht keine venv
python3 natascha.py           # Textual-TUI
python3 -m py_compile *.py    # schneller Syntax-Check
```

## Konventionen

- **LUA UI: Icons statt Emojis.** Emojis rendern im gepackten Tauri-EXE
  (WebView2) nicht → `lucide-react`-SVGs verwenden.
- **NATASCHA TUI: Emojis sind ok** (echtes Terminal).
- **Schema-first (LUA):** Typen/Zod liegen in `packages/schema`. Da `apps/web`
  über `dist/` auflöst, nach Schema-Änderungen `pnpm -r build` laufen lassen,
  bevor du Web-Typen prüfst.
- **NATASCHA DB-Zugriff** ist stdlib-only (`sqlite3`); keine schweren Deps in
  `natascha_db.py` einführen.
- **Neue Tauri-Commands**: in `src-tauri/src/commands/*.rs` + in `mod.rs` und
  `main.rs` registrieren (Muster: `commands/bridge.rs`).

## Bridge-Vertrag (Phase 1)

`bridge/schema.json` ist die **Single Source of Truth** des Austauschformats.
Beide Seiten halten sich daran; `schemaVersion` versioniert es. NATASCHA schreibt
nach `~/lehr-suite-bridge/inbox` (Default, home-basiert), LUA liest dort. Details:
`bridge/README.md`.

End-to-End-Smoke (ohne GUI):
```bash
cd apps/natascha && python3 seed_testdaten.py && python3 natascha_bridge.py TEST-7a SA2
# erzeugt ~/lehr-suite-bridge/inbox/TEST_7a_SA2_<datum>.json (schema-konform)
```

## Roadmap

- **Phase 1 — Datei-Brücke (MVP): DONE.** Siehe CHANGELOG 2026-06-08.
- **Phase 2 — Gemeinsame SQLite (geplant).** Ausführbares Design:
  **`docs/phase2-shared-db.md`**. Größter Brocken: LUA von `localStorage`
  (`apps/web/src/lib/storage.ts`) auf SQLite via Tauri-Rust-Command umstellen
  ohne API-Bruch (sync→async: Hydrate-Cache). Schema-Eigentümer: NATASCHA; LUA
  migriert additiv dagegen. Backup-Pflicht vor erstem LUA-Schreibzugriff.
- **Phase 3 — Unified Tauri-Frontend (geplant).** Ein UI, zwei Module; NATASCHAs
  Pipeline headless via `Command::new("python")` aus Tauri. Erst nach Phase 2
  sinnvoll.
