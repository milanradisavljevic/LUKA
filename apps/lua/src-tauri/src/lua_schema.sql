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
    deleted_at TEXT,
    -- Closed-Loop-Herkunft (L1): aus welcher NATASCHA-Korrektur diese Unterlage
    -- abgeleitet wurde. NULL = manuell erzeugt. Gefüllt aus snapshot.meta.loopQuelle.
    loop_klasse TEXT,
    loop_aufgabe TEXT,
    loop_datum TEXT
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
    created_at TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    quality_status TEXT NOT NULL DEFAULT 'unbewertet',
    last_used_at TEXT
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
    id TEXT,
    name TEXT PRIMARY KEY,
    fach TEXT,
    land TEXT,
    stufe TEXT,
    schulstufe INTEGER,
    schuljahr TEXT,
    notizen TEXT,
    farbe TEXT,                        -- Farbslot 1..8 im Stundenplan (NULL = automatisch)
    archiviert INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Evidenzschicht zwischen erzeugtem Material, Klasse und späterer Auswertung.
-- Die Identitätsfelder bleiben bewusst nullable und werden im Rust-Code validiert;
-- NATASCHA kennt diese LUA-eigenen Tabellen nicht.
--
-- ZWEI WEGE, eine Unterlage an einen Einsatz zu hängen - nicht verwechseln:
--
--   material_id (hier, 1:1) - "die Unterlage, aus der dieser Einsatz entstanden
--   ist". Gesetzt ausschließlich aus dem Baukasten heraus (`handleEinsatzOffer`
--   in App.tsx) und aus der Historie. Es ist die Grundlage für die Korrektur:
--   NATASCHA braucht den Quelltext dieser Unterlage. Einsatz aus der Planung
--   (`woche_einplanen`) setzt dieses Feld bewusst NICHT.
--
--   stundenmaterial (1:n, siehe unten) - "was habe ich bei dieser Stunde
--   dabei": erzeugte Unterlagen, abgelegte Dateien, Verweise. Das ist der Weg
--   der Planungsansicht, weil er dort sichtbar und über `anzahl_materialien`
--   zählbar ist.
--
-- Beide zeigen auf `generated_materials.id`. Wer sie zusammenführt, verliert
-- entweder die Korrekturgrundlage oder die Anlagenliste.
CREATE TABLE IF NOT EXISTS unterrichtseinsatz (
    id TEXT PRIMARY KEY,
    material_id TEXT,
    klasse_id TEXT,
    klasse_name_snapshot TEXT NOT NULL DEFAULT '',
    titel_snapshot TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'geplant',
    einsatz_art TEXT NOT NULL DEFAULT '',
    geplant_am TEXT,
    eingesetzt_am TEXT,
    lernziele_snapshot TEXT NOT NULL DEFAULT '[]',
    notiz TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_unterrichtseinsatz_material ON unterrichtseinsatz(material_id);
CREATE INDEX IF NOT EXISTS idx_unterrichtseinsatz_klasse ON unterrichtseinsatz(klasse_id);

CREATE TABLE IF NOT EXISTS einsatz_rueckblick (
    id TEXT PRIMARY KEY,
    einsatz_id TEXT NOT NULL REFERENCES unterrichtseinsatz(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'offen',
    notiz TEXT NOT NULL DEFAULT '',
    erstellt_am TEXT NOT NULL,
    UNIQUE(einsatz_id)
);

-- Unterrichtsplanung. Das Wochenraster beschreibt die Form der Woche, die
-- konkreten Stunden sind normale unterrichtseinsatz-Zeilen mit Datum und Uhrzeit.
-- Bewusst KEIN Fremdschlüssel auf lua_klassen: wie beim Einsatz ist der Name der
-- Snapshot-Bezug, die id nur ein weicher Verweis.
CREATE TABLE IF NOT EXISTS stundenraster (
    id TEXT PRIMARY KEY,
    klasse_id TEXT,
    klasse_name_snapshot TEXT NOT NULL DEFAULT '',
    wochentag INTEGER NOT NULL,             -- 1 = Montag … 7 = Sonntag (ISO)
    start_zeit TEXT NOT NULL DEFAULT '08:00', -- "HH:MM"
    ende_zeit TEXT NOT NULL DEFAULT '08:45',
    bezeichnung TEXT NOT NULL DEFAULT '',
    schuljahr INTEGER,                      -- Beginnjahr, 2026 = Schuljahr 2026/27
    aktiv INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stundenraster_klasse ON stundenraster(klasse_id);
CREATE INDEX IF NOT EXISTS idx_stundenraster_tag ON stundenraster(wochentag, aktiv);

-- Anlagen an einer geplanten Stunde. Drei Arten, weil die drei Situationen
-- unterschiedlich zuverlaessig sind:
--   ablage  – Datei liegt in LUA-eigenem Ordner, Öffnen ist garantiert
--   material – Verweis auf eine LUA-Unterlage, die in der App geöffnet wird
--   verweis  – fremder Pfad oder URL, kann von der Datei verschoben werden
CREATE TABLE IF NOT EXISTS stundenmaterial (
    id TEXT PRIMARY KEY,
    einsatz_id TEXT NOT NULL REFERENCES unterrichtseinsatz(id) ON DELETE CASCADE,
    art TEXT NOT NULL,
    material_id TEXT,
    dateiname TEXT NOT NULL DEFAULT '',
    ablage_pfad TEXT,
    ziel TEXT,
    label TEXT NOT NULL DEFAULT '',
    notiz TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stundenmaterial_einsatz ON stundenmaterial(einsatz_id);

-- Schulferien als Daten, nicht als Konstanten im Code. Sie werden von der
-- Behörde veröffentlicht und ändern sich jedes Schuljahr – deshalb gehören sie
-- in die Datenbank und werden je Jahr von der Lehrkraft bestätigt.
-- `region` ist der AT-Bundesland-Code 1..9 (leer = für alle Regionen gültig).
CREATE TABLE IF NOT EXISTS schulferien (
    id TEXT PRIMARY KEY,
    region TEXT NOT NULL DEFAULT '',
    bezeichnung TEXT NOT NULL,
    von TEXT NOT NULL,
    bis TEXT NOT NULL,
    schuljahr INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schulferien_von ON schulferien(von);

-- Schulinterne Schließtage: MuT-Tage, Fortbildungen, Elternabende. Wichtig,
-- weil daran genauso kein Unterricht ist wie in den amtlichen Ferien – und weil
-- sie nirgends nachzuschlagen sind.
CREATE TABLE IF NOT EXISTS schulpause (
    id TEXT PRIMARY KEY,
    bezeichnung TEXT NOT NULL,
    datum TEXT NOT NULL,
    klasse_name TEXT NOT NULL DEFAULT '',
    notiz TEXT NOT NULL DEFAULT '',
    schuljahr INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schulpause_datum ON schulpause(datum);

-- Lokales Lehrerprofil. Singleton (id=1), bewusst ohne Netzwerk-/Account-Bezug.
CREATE TABLE IF NOT EXISTS lua_lehrerprofil (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    display_name TEXT NOT NULL DEFAULT '',
    land TEXT NOT NULL DEFAULT 'AT',
    region_at TEXT NOT NULL DEFAULT '',
    region_ch TEXT NOT NULL DEFAULT '',
    region_de TEXT NOT NULL DEFAULT '',
    schulform TEXT NOT NULL DEFAULT '',
    faecher_json TEXT NOT NULL DEFAULT '[]',
    schulstufen_json TEXT NOT NULL DEFAULT '[]',
    aufgabenformate_json TEXT NOT NULL DEFAULT '[]',
    standard_provider TEXT NOT NULL DEFAULT 'mistral',
    standard_model TEXT NOT NULL DEFAULT 'Mistral Medium 3.5',
    standard_kreativitaet REAL NOT NULL DEFAULT 0.4,
    export_docx INTEGER NOT NULL DEFAULT 1,
    export_pdf INTEGER NOT NULL DEFAULT 0,
    export_loesung INTEGER NOT NULL DEFAULT 1,
    export_erwartungshorizont INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
