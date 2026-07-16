-- ⚠️ Eigentümer dieses Schemas ist NATASCHA (apps/natascha/natascha_db.py, SCHEMA_SQL).
-- Diese Datei ist eine 1:1-Spiegelung, damit LUA dieselbe gemeinsame DB
-- (~/lehr-suite-bridge/lehr-suite.db) initialisieren kann. Bei Änderungen an
-- natascha_db.py SCHEMA_SQL hier nachziehen (Spalten/Typen identisch halten),
-- sonst bricht die jeweils andere Seite still. Beide nutzen CREATE TABLE IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS schueler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    klasse TEXT NOT NULL,
    vorname TEXT NOT NULL,
    nachname TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS abgabe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schueler_id INTEGER REFERENCES schueler(id) ON DELETE SET NULL,
    korrekturauftrag_id TEXT,
    unterrichtseinsatz_id TEXT,
    material_id TEXT,
    klasse TEXT NOT NULL,
    aufgabe TEXT NOT NULL,
    dateiname TEXT NOT NULL,
    datei_hash TEXT UNIQUE NOT NULL,
    datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rohtext TEXT,
    note REAL,
    gesamtstufe REAL,
    feedback_json_path TEXT,
    wortanzahl INTEGER,
    fach TEXT,
    schulstufe TEXT,
    textsorte TEXT,
    rubrik TEXT
);

CREATE TABLE IF NOT EXISTS kriterium_historie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    abgabe_id INTEGER NOT NULL REFERENCES abgabe(id) ON DELETE CASCADE,
    kriterium_name TEXT NOT NULL,
    stufe REAL,
    gewichtung REAL,
    datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fehler_historie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    abgabe_id INTEGER NOT NULL REFERENCES abgabe(id) ON DELETE CASCADE,
    zitat TEXT,
    korrektur TEXT,
    typ TEXT NOT NULL,
    erklaerung TEXT
);

CREATE TABLE IF NOT EXISTS lehrer_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    abgabe_id INTEGER NOT NULL REFERENCES abgabe(id) ON DELETE CASCADE,
    schueler_id INTEGER REFERENCES schueler(id) ON DELETE SET NULL,
    klasse TEXT NOT NULL,
    aufgabe TEXT NOT NULL,
    note_final REAL,
    note_app_snapshot REAL,
    lehrer_kommentar TEXT,
    pdf_pfad TEXT,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    geaendert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(abgabe_id)
);

CREATE TABLE IF NOT EXISTS schueler_profil (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schueler_id INTEGER NOT NULL REFERENCES schueler(id) ON DELETE CASCADE,
    profil_json TEXT NOT NULL,
    basis_anzahl_abgaben INTEGER NOT NULL,
    modell TEXT,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS klassen_briefing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    klasse TEXT NOT NULL,
    aufgabe TEXT,
    briefing_json TEXT NOT NULL,
    basis_anzahl_abgaben INTEGER NOT NULL,
    basis_anzahl_fehler INTEGER NOT NULL DEFAULT 0,
    modell TEXT,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aufgabe_quelltext (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    klasse TEXT NOT NULL,
    aufgabe TEXT NOT NULL,
    ausgangstext TEXT NOT NULL,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    geaendert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(klasse, aufgabe)
);

CREATE TABLE IF NOT EXISTS korrekturauftrag (
    id TEXT PRIMARY KEY,
    klasse TEXT NOT NULL,
    aufgabe TEXT NOT NULL,
    titel TEXT NOT NULL DEFAULT '',
    fach TEXT NOT NULL DEFAULT '',
    schulstufe TEXT NOT NULL DEFAULT '',
    textsorte TEXT NOT NULL DEFAULT '',
    aufgabenstellung TEXT NOT NULL DEFAULT '',
    ausgangstext TEXT NOT NULL DEFAULT '',
    rubrik TEXT NOT NULL DEFAULT '',
    rubrik_titel TEXT NOT NULL DEFAULT '',
    rubrik_inhalt TEXT NOT NULL DEFAULT '',
    erwartungshorizont TEXT NOT NULL DEFAULT '',
    unterrichtseinsatz_id TEXT,
    material_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_korrekturauftrag_klasse_aufgabe ON korrekturauftrag(klasse, aufgabe);

CREATE INDEX IF NOT EXISTS idx_abgabe_hash ON abgabe(datei_hash);
CREATE INDEX IF NOT EXISTS idx_abgabe_klasse ON abgabe(klasse);
CREATE INDEX IF NOT EXISTS idx_abgabe_aufgabe ON abgabe(aufgabe);
CREATE INDEX IF NOT EXISTS idx_abgabe_schueler ON abgabe(schueler_id);
CREATE INDEX IF NOT EXISTS idx_fehler_typ ON fehler_historie(typ);
CREATE INDEX IF NOT EXISTS idx_fehler_abgabe ON fehler_historie(abgabe_id);
CREATE INDEX IF NOT EXISTS idx_lf_abgabe ON lehrer_feedback(abgabe_id);
CREATE INDEX IF NOT EXISTS idx_lf_klasse ON lehrer_feedback(klasse);
CREATE INDEX IF NOT EXISTS idx_lf_aufgabe ON lehrer_feedback(aufgabe);
CREATE INDEX IF NOT EXISTS idx_profil_schueler ON schueler_profil(schueler_id);
CREATE INDEX IF NOT EXISTS idx_briefing_klasse ON klassen_briefing(klasse);
CREATE INDEX IF NOT EXISTS idx_briefing_klasse_aufgabe ON klassen_briefing(klasse, aufgabe);
