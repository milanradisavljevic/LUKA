# Phase 2 — Gemeinsame SQLite-Datenbank (ausführbares Design)

> Status: **geplant, nicht gebaut.** Voraussetzung: Phase 1 ist live im GUI
> getestet (NATASCHA-Export erscheint in LUA Step0). Erst dann starten.

## Ziel

Beide Apps nutzen **eine** SQLite-DB. LUA zeigt Klassen/Schüler/Heatmap/Noten-
verlauf an; NATASCHA schreibt wie bisher. Die Datei-Brücke (Phase 1) bleibt als
entkoppelter Fallback bestehen.

## Wasserscheide: sync → async

`apps/lua/apps/web/src/lib/storage.ts` ist heute **synchron** (localStorage) und
wird von 8 Stellen genutzt: `App.tsx`, `Step0_Absicht.tsx`, `hooks/useExport.ts`,
`hooks/useDocuments.ts`, `hooks/useWizard.ts`, `hooks/useGenerate.ts`,
`views/HistoryView.tsx`, `views/SettingsView.tsx`.

SQLite läuft über **async** Tauri-Rust-Commands. Zwei Wege:

- **A (empfohlen): Hydrate-Cache, sync-API erhalten.** Beim App-Start einmal
  `await invoke('db_load_all')` → In-Memory-Cache. `loadDocuments()` etc. bleiben
  synchron (lesen aus Cache); Schreibfunktionen aktualisieren Cache **und**
  feuern `invoke('db_save_*')` (fire-and-forget mit Fehler-Toast). Minimal-invasiv
  für die 8 Caller, kein API-Bruch.
- **B: API auf async umstellen.** Sauberer, aber berührt alle Caller + deren
  React-Flows. Nur wählen, wenn A am Datenvolumen scheitert (unwahrscheinlich für
  Einzel-Lehrer).

→ **Plan: Weg A.** `storage.ts`-Signaturen unverändert lassen, Implementierung
gegen den Hydrate-Cache + Tauri-Persistenz tauschen.

## Schema

Basis = bestehende NATASCHA-Tabellen (`schueler`, `abgabe`, `fehler_historie`,
`kriterium_historie`, `klassen_briefing`, `schueler_profil`) — siehe
`apps/natascha/natascha_db.py`. **NATASCHA ist Schema-Eigentümer.** LUA migriert
nur additiv dagegen:

```sql
-- Von LUA erzeugte Unterlagen (ersetzt den localStorage-Key 'lehrunterlagen-documents')
CREATE TABLE IF NOT EXISTS generated_materials (
  id           TEXT PRIMARY KEY,          -- SavedDocument.id
  title        TEXT NOT NULL,
  klasse       TEXT,                       -- lose Kopplung an abgabe.klasse
  aufgabe      TEXT,
  snapshot_json TEXT NOT NULL,             -- kompletter DocumentSnapshot als JSON
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_materials_klasse ON generated_materials(klasse);
```

History (`lehrunterlagen-history`) und Settings (`lehrunterlagen-settings`)
analog als `lua_history` / `lua_settings` (oder Settings in einer key/value-Tabelle).

## Rust-Command-Oberfläche (`src-tauri/src/commands/db.rs`)

Neue Dep: `rusqlite` (Cargo). Commands (alle `Result<_, String>`):
`db_load_all() -> { documents, history, settings }`, `db_upsert_document(json)`,
`db_delete_document(id)`, `db_append_history(json)`, `db_clear_history()`,
`db_save_settings(json)`. Registrieren wie `commands/bridge.rs` (in `mod.rs` +
`main.rs`). DB-Pfad als gemeinsame Konvention (Default `~/lehr-suite-bridge/…`
oder via Settings), **identisch** zu NATASCHAs `[database] path`.

## Migration & Sicherheit

- **Backup-Pflicht** vor erstem LUA-Schreibzugriff: DB-Datei kopieren
  (`<db>.bak-<datum>`).
- Einmal-Migration: vorhandene localStorage-Inhalte beim ersten Start nach
  SQLite übernehmen, dann localStorage als „migriert" markieren.
- Schema-Migrationen idempotent (`CREATE TABLE IF NOT EXISTS`).

## Liefergegenstand

LUA-Ansicht „Meine Klassen": Schülerliste + Heatmap + Notenverlauf, gelesen über
neue read-only Commands auf NATASCHAs Tabellen (z. B. `get_klassen_feedback`-
Äquivalent in Rust oder via Python-Headless-Call).

## Verifikation

- Rust: `cd apps/lua/src-tauri && cargo check`.
- Roundtrip-Test: Dokument in LUA anlegen → App neu starten → Dokument noch da
  (kommt jetzt aus SQLite, nicht localStorage).
- Gegenprobe: NATASCHA schreibt eine Abgabe → erscheint in LUAs „Meine Klassen".
- Keine Regression: `pnpm -r test` grün (storage-Tests in
  `apps/web/src/lib/storage.test.ts` müssen weiter passen).
