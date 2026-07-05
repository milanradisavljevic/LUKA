CREATE TABLE IF NOT EXISTS generated_materials (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    klasse TEXT,
    aufgabe TEXT,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_materials_klasse ON generated_materials(klasse);
CREATE INDEX IF NOT EXISTS idx_materials_updated ON generated_materials(updated_at);

CREATE TABLE IF NOT EXISTS lua_history (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    thema TEXT NOT NULL DEFAULT '',
    fach TEXT NOT NULL DEFAULT '',
    stufe TEXT NOT NULL DEFAULT '',
    llm_provider TEXT,
    model_name TEXT,
    block_count INTEGER NOT NULL DEFAULT 0,
    total_punkte INTEGER NOT NULL DEFAULT 0,
    exported_files_json TEXT NOT NULL DEFAULT '[]',
    saved_document_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_timestamp ON lua_history(timestamp);

CREATE TABLE IF NOT EXISTS lua_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lua_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}',
    bloecke_json TEXT NOT NULL DEFAULT '[]',
    saved_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS aufgabe_pool (
    id TEXT PRIMARY KEY,
    fach TEXT NOT NULL,
    stufe TEXT NOT NULL,
    schulstufe INTEGER,
    thema TEXT,
    aufgabentyp TEXT NOT NULL,
    tags TEXT,
    block_json TEXT NOT NULL,
    quelle_hinweis TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pool_fach ON aufgabe_pool(fach);
CREATE INDEX IF NOT EXISTS idx_pool_typ ON aufgabe_pool(aufgabentyp);
CREATE INDEX IF NOT EXISTS idx_pool_thema ON aufgabe_pool(thema);

-- LUA-eigene Klassen-Metadaten (Fach/Stufe/Schuljahr) zur Klasse-STRING wie sie
-- in den NATASCHA-Tabellen (abgabe.klasse, schueler.klasse, …) verwendet wird.
-- Bewusst KEIN Fremdschlüssel dorthin: die NATASCHA-Tabellen gehören NATASCHA,
-- dieses Schema wird vom Schema-Sync-Wächter (scripts/check_natascha_schema_sync.py)
-- nicht geprüft. Umbenennen einer Klasse hier ändert NICHTS an existierenden
-- NATASCHA-Datensätzen — die UI muss das kommunizieren.
CREATE TABLE IF NOT EXISTS lua_klassen (
    name TEXT PRIMARY KEY,
    fach TEXT,
    stufe TEXT,
    schulstufe INTEGER,
    schuljahr TEXT,
    notizen TEXT,
    archiviert INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);