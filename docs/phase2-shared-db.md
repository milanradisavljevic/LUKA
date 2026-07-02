# Phase 2 — Gemeinsame SQLite-Datenbank (Ist-Architektur)

> Status: **DONE.** Diese Seite dokumentiert den gebauten Stand. Das frühere
> Ausführungsdesign ist umgesetzt; künftige Arbeiten sollten hier nicht erneut
> eine SQLite-Migration planen, sondern auf der vorhandenen gemeinsamen DB
> aufbauen.

## Ziel

Beide Apps nutzen **eine** SQLite-DB:
`~/lehr-suite-bridge/lehr-suite.db`. LUA speichert eigene Unterlagen, Verlauf,
Settings, Vorlagen und Aufgaben-Pool dort; NATASCHA schreibt Korrektur- und
Schülerdaten in dieselbe Datei. Die Datei-Brücke (Phase 1) bleibt als
entkoppelter Import-/Fallback-Weg bestehen.

## Ist-Architektur in 5 Zeilen

- `apps/lua/src-tauri/src/db.rs` löst den DB-Pfad auf, öffnet SQLite mit WAL +
  Foreign Keys und initialisiert beide Schema-Dateien.
- `natascha_schema.sql` spiegelt NATASCHAs Tabellen; Schema-Eigentümer bleibt
  `apps/natascha/natascha_db.py`.
- `lua_schema.sql` ergänzt LUA-Tabellen wie `generated_materials`,
  `lua_history`, `lua_settings`, `lua_templates` und `aufgabe_pool`.
- `apps/lua/apps/web/src/lib/storage.ts` behält synchrone Read-APIs, lädt beim
  Start aber asynchron per `db_load_all` in einen Hydrate-Cache und schreibt per
  Tauri-Commands fire-and-forget zurück.
- NATASCHA-Headless-Sidecar-Aufrufe in `commands/natascha.rs` reichen immer
  `--db-path <resolve_db_path()>` weiter, damit Python und LUA dieselbe Datei
  verwenden.

## Wasserscheide: sync → async

`apps/lua/apps/web/src/lib/storage.ts` war synchron und localStorage-basiert.
Der gebaute Weg ist der ehemals empfohlene **Hydrate-Cache**:

- Beim App-Start ruft `App.tsx` `hydrateCache()` auf.
- In Tauri lädt `db_load_all` Dokumente, Verlauf, Settings, Templates, Klassen
  und `dbPath` aus SQLite.
- `loadDocuments()`, `loadHistory()`, `loadSettings()` und `loadTemplates()`
  bleiben synchron und lesen aus dem Cache.
- Schreibfunktionen aktualisieren sofort den Cache und persistieren anschließend
  über Tauri-Commands (`db_upsert_document`, `db_append_history`, ...).
- Im Browser oder vor Hydration bleibt localStorage als Fallback erhalten.

## Schema

Basis sind die NATASCHA-Tabellen aus `apps/natascha/natascha_db.py`, gespiegelt
in `apps/lua/src-tauri/src/natascha_schema.sql`. **NATASCHA ist
Schema-Eigentümer.** LUA migriert additiv dagegen über
`apps/lua/src-tauri/src/lua_schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS generated_materials (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  klasse       TEXT,
  aufgabe      TEXT,
  snapshot_json TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  is_favorite  INTEGER NOT NULL DEFAULT 0,
  is_deleted   INTEGER NOT NULL DEFAULT 0,
  deleted_at   TEXT
);
```

Weitere LUA-Tabellen: `lua_history`, `lua_settings`, `lua_templates`,
`aufgabe_pool`.

## Rust-Command-Oberfläche

`apps/lua/src-tauri/src/commands/db.rs` stellt die LUA-Persistenz bereit:
`db_load_all`, `db_upsert_document`, `db_delete_document`,
`db_restore_document`, `db_purge_deleted`, `db_toggle_favorite`,
`db_append_history`, `db_clear_history`, `db_save_settings`,
`db_save_template`, `db_delete_template`, `db_migrate_from_localstorage`,
`db_resolve_path`, `db_set_path`.

Read-only Auswertungen auf NATASCHA-Daten liegen in separaten Commands
(`natascha_read.rs`/NATASCHA-Hooks) und speisen Klassenliste, Abgaben,
Heatmap, Notenverteilung und Statistik.

## Migration & Sicherheit

- Einmal-Migration: vorhandene localStorage-Inhalte werden beim ersten Start
  nach SQLite übernommen und mit `lehrunterlagen-migrated` markiert.
- Schema-Migrationen sind idempotent (`CREATE TABLE IF NOT EXISTS`).
- `natascha_schema.sql` ist eine Spiegelung; bei Änderungen an NATASCHAs
  `SCHEMA_SQL` muss die Rust-Spiegelung synchron nachgezogen werden.
- Offener nächster Hardening-Schritt: automatischer Schema-Sync-Wächter in CI.

## Gelieferte UI

- „Meine Klassen" liest Klassen, Aufgaben, Abgaben, Heatmaps,
  Notenverteilungen und Statistiken aus der gemeinsamen DB.
- LUA-Dokumente, Verlauf, Vorlagen und Einstellungen überleben App-Neustarts
  über SQLite statt nur localStorage.
- Einstellungen zeigen den erkannten DB-Pfad an.

## Verifikation

- Rust: `cd apps/lua/src-tauri && cargo check && cargo test`.
- Web: `cd apps/lua && pnpm -r typecheck && pnpm -r test`.
- Roundtrip: Dokument in LUA anlegen → App neu starten → Dokument aus SQLite
  wieder sichtbar.
- Gegenprobe: NATASCHA/Sidecar schreibt mit `--db-path` → Daten erscheinen in
  LUAs „Meine Klassen".
