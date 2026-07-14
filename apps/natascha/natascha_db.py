#!/usr/bin/env python3
"""
NATASCHA DB – SQLite-Persistenz für Schüler-Tracking, Historie und Heatmaps.

Nur stdlib sqlite3, kein ORM. Eine .db-Datei pro Schuljahr.
"""

from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
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

CREATE INDEX IF NOT EXISTS idx_abgabe_hash ON abgabe(datei_hash);
CREATE INDEX IF NOT EXISTS idx_abgabe_klasse ON abgabe(klasse);
CREATE INDEX IF NOT EXISTS idx_abgabe_aufgabe ON abgabe(aufgabe);
CREATE INDEX IF NOT EXISTS idx_abgabe_schueler ON abgabe(schueler_id);
CREATE INDEX IF NOT EXISTS idx_fehler_typ ON fehler_historie(typ);
CREATE INDEX IF NOT EXISTS idx_fehler_abgabe ON fehler_historie(abgabe_id);

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

CREATE INDEX IF NOT EXISTS idx_lf_abgabe ON lehrer_feedback(abgabe_id);
CREATE INDEX IF NOT EXISTS idx_lf_klasse ON lehrer_feedback(klasse);
CREATE INDEX IF NOT EXISTS idx_lf_aufgabe ON lehrer_feedback(aufgabe);

CREATE TABLE IF NOT EXISTS schueler_profil (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schueler_id INTEGER NOT NULL REFERENCES schueler(id) ON DELETE CASCADE,
    profil_json TEXT NOT NULL,
    basis_anzahl_abgaben INTEGER NOT NULL,
    modell TEXT,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profil_schueler ON schueler_profil(schueler_id);

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

CREATE INDEX IF NOT EXISTS idx_briefing_klasse ON klassen_briefing(klasse);
CREATE INDEX IF NOT EXISTS idx_briefing_klasse_aufgabe ON klassen_briefing(klasse, aufgabe);

CREATE TABLE IF NOT EXISTS aufgabe_quelltext (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    klasse TEXT NOT NULL,
    aufgabe TEXT NOT NULL,
    ausgangstext TEXT NOT NULL,
    erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    geaendert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(klasse, aufgabe)
);
"""

# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------


def get_db_path(config: dict[str, Any]) -> Path:
    """Ermittelt den DB-Pfad aus der Config oder nutzt Default.
    Unterstuetzt jetzt ~/-Pfade (expanduser) fuer den gemeinsamen Bridge-Ordner."""
    db_cfg = config.get("database", {})
    raw = db_cfg.get("path", "natascha_schuljahr.db")
    p = Path(raw).expanduser()
    if p.is_absolute():
        return p
    # Relative Pfade: im PyInstaller-Bundle wäre __file__ das flüchtige
    # _MEIPASS-Temp-Verzeichnis — dann persistentes Datenverzeichnis nutzen
    # (gleiche Konvention wie natascha_core.PROJECT_ROOT).
    if getattr(sys, "frozen", False):
        return Path.home() / "lehr-suite-bridge" / "natascha" / raw
    return Path(__file__).resolve().parent / raw


def init_db(db_path: Path | str) -> None:
    """Erstellt alle Tabellen und Indizes, falls sie nicht existieren.
    Aktiviert WAL-Modus und Foreign Keys fuer gleichzeitigen Zugriff mit LUA."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.executescript(SCHEMA_SQL)
        columns = {row[1] for row in conn.execute("PRAGMA table_info(abgabe)")}
        for column in ("unterrichtseinsatz_id", "material_id"):
            if column not in columns:
                conn.execute(f"ALTER TABLE abgabe ADD COLUMN {column} TEXT")
        conn.commit()


def _file_hash(path: Path) -> str:
    """SHA-256 einer Datei (fuer Duplikat-Erkennung)."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Schüler CRUD
# ---------------------------------------------------------------------------


def insert_schueler(
    db_path: Path | str,
    klasse: str,
    vorname: str,
    nachname: str = "",
) -> int:
    """Fügt einen Schüler hinzu und gibt die neue ID zurück."""
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            "INSERT INTO schueler (klasse, vorname, nachname) VALUES (?, ?, ?)",
            (klasse, vorname, nachname),
        )
        conn.commit()
        return int(cur.lastrowid)  # type: ignore[arg-type]


def get_schueler_by_klasse(db_path: Path | str, klasse: str) -> list[dict[str, Any]]:
    """Alle Schüler einer Klasse, sortiert nach Vorname."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM schueler WHERE klasse = ? ORDER BY vorname, nachname",
            (klasse,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_schueler_by_name(
    db_path: Path | str, klasse: str, vorname: str, nachname: str = ""
) -> dict[str, Any] | None:
    """Sucht einen Schüler exakt nach Name (case-insensitive)."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM schueler WHERE klasse = ? AND LOWER(vorname) = LOWER(?)"
            " AND LOWER(COALESCE(nachname,'')) = LOWER(?)",
            (klasse, vorname, nachname),
        ).fetchone()
        return dict(row) if row else None


def get_schueler_by_id(db_path: Path | str, schueler_id: int) -> dict[str, Any] | None:
    """Holt einen einzelnen Schüler über seine ID, oder None."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM schueler WHERE id = ?", (schueler_id,)
        ).fetchone()
        return dict(row) if row else None


def delete_schueler(db_path: Path | str, schueler_id: int) -> None:
    """Löscht einen Schüler (Abgaben bleiben mit NULL in schueler_id erhalten)."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute("DELETE FROM schueler WHERE id = ?", (schueler_id,))
        conn.commit()


def import_schueler_csv(
    db_path: Path | str,
    csv_path: Path,
    klasse: str,
    vorname_col: str = "vorname",
    nachname_col: str = "nachname",
) -> int:
    """
    Importiert Schüler aus einer CSV-Datei.

    Erwartete Spalten: vorname, nachname (Spaltennamen konfigurierbar).
    Gibt die Anzahl der importierten Schüler zurück.
    """
    count = 0
    with csv_path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            vorname = row.get(vorname_col, "").strip()
            nachname = row.get(nachname_col, "").strip()
            if not vorname:
                continue
            # Duplikat-Check
            existing = get_schueler_by_name(db_path, klasse, vorname, nachname)
            if existing is None:
                insert_schueler(db_path, klasse, vorname, nachname)
                count += 1
    return count


# ---------------------------------------------------------------------------
# Abgabe + Duplikat-Erkennung
# ---------------------------------------------------------------------------


def insert_abgabe(
    db_path: Path | str,
    schueler_id: int | None,
    klasse: str,
    aufgabe: str,
    dateiname: str,
    datei_hash: str,
    rohtext: str = "",
    note: float | None = None,
    gesamtstufe: float | None = None,
    feedback_json_path: str = "",
    wortanzahl: int | None = None,
    fach: str = "",
    schulstufe: str = "",
    textsorte: str = "",
    rubrik: str = "",
) -> int:
    """Speichert eine Abgabe in der DB und gibt die ID zurueck."""
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            """
            INSERT INTO abgabe
            (schueler_id, klasse, aufgabe, dateiname, datei_hash,
             rohtext, note, gesamtstufe, feedback_json_path, wortanzahl,
             fach, schulstufe, textsorte, rubrik)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                schueler_id,
                klasse,
                aufgabe,
                dateiname,
                datei_hash,
                rohtext,
                note,
                gesamtstufe,
                feedback_json_path,
                wortanzahl,
                fach,
                schulstufe,
                textsorte,
                rubrik,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)  # type: ignore[arg-type]


def get_abgabe_by_hash(db_path: Path | str, datei_hash: str) -> dict[str, Any] | None:
    """Prueft, ob eine Datei schon analysiert wurde (Duplikat-Erkennung)."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM abgabe WHERE datei_hash = ?", (datei_hash,)
        ).fetchone()
        return dict(row) if row else None


def get_abgabe_by_id(db_path: Path | str, abgabe_id: int) -> dict[str, Any] | None:
    """Liest eine einzelne Abgabe per Primaerschluessel."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM abgabe WHERE id = ?", (abgabe_id,)).fetchone()
        return dict(row) if row else None


def get_abgaben_by_schueler(
    db_path: Path | str, schueler_id: int
) -> list[dict[str, Any]]:
    """Alle Abgaben eines Schülers, chronologisch."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM abgabe WHERE schueler_id = ? ORDER BY datum",
            (schueler_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_abgaben_by_klasse_aufgabe(
    db_path: Path | str, klasse: str, aufgabe: str
) -> list[dict[str, Any]]:
    """Alle Abgaben einer Klasse fuer eine bestimmte Aufgabe."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM abgabe WHERE klasse = ? AND aufgabe = ? ORDER BY datum",
            (klasse, aufgabe),
        ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Kriterien + Fehler
# ---------------------------------------------------------------------------


def insert_kriterium(
    db_path: Path | str,
    abgabe_id: int,
    kriterium_name: str,
    stufe: float | None,
    gewichtung: float | None,
) -> None:
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            "INSERT INTO kriterium_historie (abgabe_id, kriterium_name, stufe, gewichtung)"
            " VALUES (?, ?, ?, ?)",
            (abgabe_id, kriterium_name, stufe, gewichtung),
        )
        conn.commit()


def insert_fehler(
    db_path: Path | str,
    abgabe_id: int,
    zitat: str,
    korrektur: str,
    typ: str,
    erklaerung: str = "",
) -> None:
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            "INSERT INTO fehler_historie (abgabe_id, zitat, korrektur, typ, erklaerung)"
            " VALUES (?, ?, ?, ?, ?)",
            (abgabe_id, zitat, korrektur, typ, erklaerung),
        )
        conn.commit()


# ---------------------------------------------------------------------------
# Fehler-Heatmap (klassenweit)
# ---------------------------------------------------------------------------


def get_fehler_heatmap(
    db_path: Path | str,
    klasse: str,
    aufgabe: str | None = None,
    min_vorkommen: int = 1,
) -> list[dict[str, Any]]:
    """
    Aggregiert Fehler nach typ fuer eine Klasse (optional gefiltert nach Aufgabe).

    Gibt zurueck:
        [{"typ": "Z", "anzahl": 42, "prozent": 35.0}, ...]
    sortiert nach Anzahl absteigend.
    """
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        if aufgabe:
            total_row = conn.execute(
                "SELECT COUNT(*) FROM fehler_historie fh"
                " JOIN abgabe a ON fh.abgabe_id = a.id"
                " WHERE a.klasse = ? AND a.aufgabe = ?",
                (klasse, aufgabe),
            ).fetchone()
            rows = conn.execute(
                """
                SELECT fh.typ, COUNT(*) as anzahl
                FROM fehler_historie fh
                JOIN abgabe a ON fh.abgabe_id = a.id
                WHERE a.klasse = ? AND a.aufgabe = ?
                GROUP BY fh.typ
                HAVING anzahl >= ?
                ORDER BY anzahl DESC
                """,
                (klasse, aufgabe, min_vorkommen),
            ).fetchall()
        else:
            total_row = conn.execute(
                "SELECT COUNT(*) FROM fehler_historie fh"
                " JOIN abgabe a ON fh.abgabe_id = a.id"
                " WHERE a.klasse = ?",
                (klasse,),
            ).fetchone()
            rows = conn.execute(
                """
                SELECT fh.typ, COUNT(*) as anzahl
                FROM fehler_historie fh
                JOIN abgabe a ON fh.abgabe_id = a.id
                WHERE a.klasse = ?
                GROUP BY fh.typ
                HAVING anzahl >= ?
                ORDER BY anzahl DESC
                """,
                (klasse, min_vorkommen),
            ).fetchall()

        total = total_row[0] if total_row else 0
        result: list[dict[str, Any]] = []
        for r in rows:
            d = dict(r)
            d["prozent"] = round((d["anzahl"] / total) * 100, 1) if total else 0.0
            result.append(d)
        return result


def get_fehler_heatmap_detail(
    db_path: Path | str,
    klasse: str,
    typ: str,
    aufgabe: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Die konkreten Fehler-Zitate eines bestimmten Typs fuer eine Klasse.
    Nuetzlich, um nach der Heatmap zu sehen: *welche* Kommafehler machen alle?
    """
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        if aufgabe:
            rows = conn.execute(
                """
                SELECT fh.zitat, fh.korrektur, fh.erklaerung,
                       s.vorname, a.dateiname
                FROM fehler_historie fh
                JOIN abgabe a ON fh.abgabe_id = a.id
                LEFT JOIN schueler s ON a.schueler_id = s.id
                WHERE a.klasse = ? AND fh.typ = ? AND a.aufgabe = ?
                ORDER BY fh.zitat
                LIMIT ?
                """,
                (klasse, typ, aufgabe, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT fh.zitat, fh.korrektur, fh.erklaerung,
                       s.vorname, a.dateiname
                FROM fehler_historie fh
                JOIN abgabe a ON fh.abgabe_id = a.id
                LEFT JOIN schueler s ON a.schueler_id = s.id
                WHERE a.klasse = ? AND fh.typ = ?
                ORDER BY fh.zitat
                LIMIT ?
                """,
                (klasse, typ, limit),
            ).fetchall()
        return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# JSON-Import (retroaktiv aus bestehenden feedback_data/*.json)
# ---------------------------------------------------------------------------


def upsert_aufgabe_quelltext(
    db_path: Path | str, klasse: str, aufgabe: str, ausgangstext: str
) -> None:
    """Speichert den Ausgangstext einer Aufgabe (eine Zeile je klasse/aufgabe).

    Für die LUA-Brücke: LUA befüllt damit den Quelltext der Übung vor.
    Leere Texte werden ignoriert.
    """
    text = (ausgangstext or "").strip()
    if not text or not klasse or not aufgabe:
        return
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO aufgabe_quelltext (klasse, aufgabe, ausgangstext)
            VALUES (?, ?, ?)
            ON CONFLICT(klasse, aufgabe) DO UPDATE SET
                ausgangstext = excluded.ausgangstext,
                geaendert_am = CURRENT_TIMESTAMP
            """,
            (klasse, aufgabe, text),
        )


def get_aufgabe_quelltext(
    db_path: Path | str, klasse: str, aufgabe: str
) -> str | None:
    """Liest den gespeicherten Ausgangstext einer Aufgabe (oder None).

    Defensiv: fehlende DB/Tabelle → None (Export darf nie daran scheitern).
    """
    try:
        with sqlite3.connect(str(db_path)) as conn:
            row = conn.execute(
                "SELECT ausgangstext FROM aufgabe_quelltext WHERE klasse = ? AND aufgabe = ?",
                (klasse, aufgabe),
            ).fetchone()
        return row[0] if row else None
    except sqlite3.Error:
        return None


def import_json_to_db(
    db_path: Path | str,
    json_path: Path,
    klasse: str,
    aufgabe: str,
    file_path: Path | None = None,
) -> int:
    """
    Importiert eine einzelne Feedback-JSON in die DB.

    Gibt die Abgabe-ID zurueck oder -1 bei Fehler.
    """
    try:
        data: dict[str, Any] = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception:
        return -1

    dateiname = data.get("datei", json_path.name)
    schueler_name = data.get("schueler", "")

    # Hash berechnen (falls Originaldatei vorhanden)
    datei_hash = ""
    if file_path and file_path.exists():
        datei_hash = _file_hash(file_path)
    else:
        datei_hash = hashlib.sha256(dateiname.encode()).hexdigest()

    # Duplikat-Check
    existing = get_abgabe_by_hash(db_path, datei_hash)
    if existing:
        return -1

    # Schüler auflösen oder anlegen
    schueler_id: int | None = None
    if schueler_name:
        parts = schueler_name.split(maxsplit=1)
        vn = parts[0] if parts else schueler_name
        nn = parts[1] if len(parts) > 1 else ""
        schueler = get_schueler_by_name(db_path, klasse, vn, nn)
        if schueler is None:
            schueler_id = insert_schueler(db_path, klasse, vn, nn)
        else:
            schueler_id = schueler["id"]

    note_data = data.get("notenempfehlung", {})
    note = note_data.get("note")
    gesamtstufe = note_data.get("durchschnitt")

    abgabe_id = insert_abgabe(
        db_path=db_path,
        schueler_id=schueler_id,
        klasse=klasse,
        aufgabe=aufgabe,
        dateiname=dateiname,
        datei_hash=datei_hash,
        rohtext=data.get("transkription", ""),
        note=float(note) if note is not None else None,
        gesamtstufe=float(gesamtstufe) if gesamtstufe is not None else None,
        feedback_json_path=str(json_path),
        wortanzahl=None,
        fach=data.get("fach", ""),
        schulstufe=data.get("schulstufe", ""),
        textsorte=data.get("textsorte", ""),
        rubrik=data.get("rubrik", ""),
    )

    # Kriterien
    bewertung = data.get("bewertung", {})
    for kriterium_name, k_data in bewertung.items():
        if isinstance(k_data, dict):
            stufe_raw = k_data.get("stufe") or k_data.get("punkte")
            gewicht_raw = k_data.get("gewicht")
            insert_kriterium(
                db_path,
                abgabe_id,
                kriterium_name,
                float(stufe_raw) if stufe_raw is not None else None,
                float(gewicht_raw) / 100 if isinstance(gewicht_raw, (int, float)) else None,
            )

    # Fehler
    for fehler in data.get("fehler", []):
        insert_fehler(
            db_path,
            abgabe_id,
            fehler.get("zitat", ""),
            fehler.get("korrektur", ""),
            fehler.get("typ", ""),
            fehler.get("erklaerung", ""),
        )

    if data.get("ausgangstext"):
        upsert_aufgabe_quelltext(db_path, klasse, aufgabe, data["ausgangstext"])

    return abgabe_id


def import_all_json_in_folder(
    db_path: Path | str,
    feedback_data_dir: Path,
    klasse: str,
    aufgabe: str,
    input_dir: Path | None = None,
) -> tuple[int, int]:
    """
    Importiert alle JSON-Dateien aus einem Ordner retroaktiv.

    Gibt (erfolgreich, übersprungen) zurück.
    """
    erfolgreich = 0
    übersprungen = 0
    for json_path in feedback_data_dir.glob("*.json"):
        # Versuche, die Originaldatei zu finden (fuer echten Hash)
        orig = None
        if input_dir:
            candid = input_dir / json_path.name.replace("_analysis.json", ".docx")
            if candid.exists():
                orig = candid
        abg_id = import_json_to_db(db_path, json_path, klasse, aufgabe, orig)
        if abg_id >= 0:
            erfolgreich += 1
        else:
            übersprungen += 1
    return erfolgreich, übersprungen


# ---------------------------------------------------------------------------
# CSV-Export (Noten)
# ---------------------------------------------------------------------------


def export_noten_csv(
    db_path: Path | str,
    klasse: str,
    aufgabe: str | None = None,
) -> str:
    """
    Exportiert Noten als CSV-String (ASV/Webuntis-kompatibel).

    Spalten: Nachname, Vorname, Aufgabe, Note, Gesamtstufe, Wortanzahl, Datum
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", lineterminator="\n")
    writer.writerow(["Nachname", "Vorname", "Aufgabe", "Note", "Gesamtstufe",
                     "Wortanzahl", "Datum", "Fach", "Textsorte"])

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        if aufgabe:
            rows = conn.execute(
                """
                SELECT s.nachname, s.vorname, a.aufgabe, a.note,
                       a.gesamtstufe, a.wortanzahl, a.datum,
                       a.fach, a.textsorte
                FROM abgabe a
                LEFT JOIN schueler s ON a.schueler_id = s.id
                WHERE a.klasse = ? AND a.aufgabe = ?
                ORDER BY s.nachname, s.vorname, a.datum
                """,
                (klasse, aufgabe),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT s.nachname, s.vorname, a.aufgabe, a.note,
                       a.gesamtstufe, a.wortanzahl, a.datum,
                       a.fach, a.textsorte
                FROM abgabe a
                LEFT JOIN schueler s ON a.schueler_id = s.id
                WHERE a.klasse = ?
                ORDER BY a.aufgabe, s.nachname, s.vorname, a.datum
                """,
                (klasse,),
            ).fetchall()

        for r in rows:
            writer.writerow([
                r["nachname"] or "",
                r["vorname"] or "",
                r["aufgabe"] or "",
                r["note"] or "",
                r["gesamtstufe"] or "",
                r["wortanzahl"] or "",
                r["datum"] or "",
                r["fach"] or "",
                r["textsorte"] or "",
            ])

    return output.getvalue()


# ---------------------------------------------------------------------------
# Glue: Nach erfolgreicher Analyse automatisch speichern
# ---------------------------------------------------------------------------


def save_analysis_to_db(
    db_path: Path | str,
    data: dict[str, Any],
    file_path: Path,
    klasse: str,
    aufgabe: str,
    rohtext: str = "",
    wortanzahl: int | None = None,
    feedback_json_path: str = "",
    bestaetigte_schueler_id: int | None = None,
    unterrichtseinsatz_id: str | None = None,
    material_id: str | None = None,
) -> int:
    """
    Bequemlichkeits-Funktion: Nimmt das validierte JSON-Dict nach der Analyse
    und speichert alles in die DB (inkl. Kriterien und Fehler).

    Verwendet eine einzelne Transaktion fuer atomaren Save.

    bestaetigte_schueler_id: Von der Lehrkraft bestätigte Zuordnung. Hat Vorrang
    vor der Namensheuristik und legt NIE einen neuen Schüler an. Wird nur
    übernommen, wenn der Schüler existiert und zur Klasse gehört — sonst
    Rückfall auf die Heuristik (Schutz gegen veraltete IDs aus der UI).

    Gibt die Abgabe-ID zurueck oder -1 bei Fehler.
    """
    dateiname = data.get("datei", file_path.name)
    datei_hash = _file_hash(file_path)

    existing = get_abgabe_by_hash(db_path, datei_hash)
    if existing:
        return -1  # Duplikat

    schueler_id: int | None = None
    if bestaetigte_schueler_id is not None:
        bestaetigt = get_schueler_by_id(db_path, bestaetigte_schueler_id)
        if bestaetigt is not None and bestaetigt.get("klasse") == klasse:
            schueler_id = int(bestaetigt["id"])

    # Heuristik nur ohne bestätigte Zuordnung. Achtung: data["schueler"] kann
    # aus der LLM-Antwort stammen — die Heuristik kann falsche oder erfundene
    # Namen als Schüler anlegen. Die bestätigte ID ist der bevorzugte Weg.
    schueler_name = data.get("schueler", "")
    if schueler_id is None and schueler_name:
        parts = schueler_name.split(maxsplit=1)
        vn = parts[0] if parts else schueler_name
        nn = parts[1] if len(parts) > 1 else ""
        schueler = get_schueler_by_name(db_path, klasse, vn, nn)
        if schueler is None:
            schueler_id = insert_schueler(db_path, klasse, vn, nn)
        else:
            schueler_id = schueler["id"]

    note_data = data.get("notenempfehlung", {})
    note = note_data.get("note")
    gesamtstufe = note_data.get("durchschnitt")

    # Atomare Transaktion: alles in einer Connection
    db_path_str = str(db_path)
    with sqlite3.connect(db_path_str) as conn:
        conn.execute("PRAGMA foreign_keys=ON")
        cur = conn.execute(
            "INSERT INTO abgabe (schueler_id, unterrichtseinsatz_id, material_id, klasse, aufgabe, dateiname, datei_hash, rohtext, note, gesamtstufe, feedback_json_path, wortanzahl, fach, schulstufe, textsorte, rubrik) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                schueler_id,
                unterrichtseinsatz_id,
                material_id,
                klasse,
                aufgabe,
                dateiname,
                datei_hash,
                rohtext,
                float(note) if note is not None else None,
                float(gesamtstufe) if gesamtstufe is not None else None,
                feedback_json_path,
                wortanzahl,
                data.get("fach", ""),
                data.get("schulstufe", ""),
                data.get("textsorte", ""),
                data.get("rubrik", ""),
            ),
        )
        abgabe_id = cur.lastrowid

        # Kriterien
        bewertung = data.get("bewertung", {})
        for kriterium_name, k_data in bewertung.items():
            if isinstance(k_data, dict):
                stufe_raw = k_data.get("stufe") or k_data.get("punkte")
                gewicht_raw = k_data.get("gewicht")
                conn.execute(
                    "INSERT INTO kriterium_historie (abgabe_id, kriterium_name, stufe, gewichtung) VALUES (?, ?, ?, ?)",
                    (
                        abgabe_id,
                        kriterium_name,
                        float(stufe_raw) if stufe_raw is not None else None,
                        float(gewicht_raw) / 100 if isinstance(gewicht_raw, (int, float)) else None,
                    ),
                )

        # Fehler
        for fehler in data.get("fehler", []):
            conn.execute(
                "INSERT INTO fehler_historie (abgabe_id, zitat, korrektur, typ, erklaerung) VALUES (?, ?, ?, ?, ?)",
                (
                    abgabe_id,
                    fehler.get("zitat", ""),
                    fehler.get("korrektur", ""),
                    fehler.get("typ", ""),
                    fehler.get("erklaerung", ""),
                ),
            )
        conn.commit()

    if data.get("ausgangstext"):
        upsert_aufgabe_quelltext(db_path, klasse, aufgabe, data["ausgangstext"])

    return abgabe_id


# ---------------------------------------------------------------------------
# Klassen-Feedback (regelbasiert – nach Gesamtkorrektur)
# ---------------------------------------------------------------------------


def get_kriterien_durchschnitt(
    db_path: Path | str, klasse: str, aufgabe: str | None = None
) -> dict[str, dict[str, Any]]:
    """
    Berechnet Durchschnitte pro Kriterium fuer eine Klasse (optional gefiltert nach Aufgabe).

    Gibt zurueck:
        {"inhalt": {"avg": 2.8, "count": 18}, ...}
    """
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        if aufgabe:
            rows = conn.execute(
                """
                SELECT k.kriterium_name,
                       AVG(k.stufe) as avg_stufe,
                       COUNT(*) as anzahl
                FROM kriterium_historie k
                JOIN abgabe a ON k.abgabe_id = a.id
                WHERE a.klasse = ? AND a.aufgabe = ? AND k.stufe IS NOT NULL
                GROUP BY k.kriterium_name
                """,
                (klasse, aufgabe),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT k.kriterium_name,
                       AVG(k.stufe) as avg_stufe,
                       COUNT(*) as anzahl
                FROM kriterium_historie k
                JOIN abgabe a ON k.abgabe_id = a.id
                WHERE a.klasse = ? AND k.stufe IS NOT NULL
                GROUP BY k.kriterium_name
                """,
                (klasse,),
            ).fetchall()
        result: dict[str, dict[str, Any]] = {}
        for r in rows:
            d = dict(r)
            result[d["kriterium_name"]] = {
                "avg": round(d["avg_stufe"], 2) if d["avg_stufe"] is not None else None,
                "count": d["anzahl"],
            }
        return result


def get_klassen_feedback(
    db_path: Path | str, klasse: str, aufgabe: str | None = None
) -> dict[str, Any]:
    """
    Generiert regelbasiertes Feedback fuer die Lehrkraft nach einer Gesamtkorrektur.

    Analysiert:
      - Fehler-Heatmap (dominante Fehlertypen)
      - Kriterien-Durchschnitte (schwache Bereiche)
      - Konkrete Beispiel-Zitate (häufigste Fehler)

    Gibt ein Dict zurueck:
    {
        "klasse": "6i",
        "aufgabe": "SA2",
        "anzahl_abgaben": 20,
        "gesamt_fehler": 45,
        "heatmap": [...],
        "kriterien": {...},
        "empfehlungen": [
            {"typ": "fehler", "prio": "hoch",
             "text": "Mehr als 40% aller Fehler betreffen die Zeichensetzung."
             " Wiederholung empfohlen: Kommas bei Neben- und Relativsätzen."},
            ...
        ],
        "beispiele": [
            {"zitat": "Schüler die keine", "korrektur": "Schüler, die keine",
             "typ": "Z", "haeufigkeit": 7},
            ...
        ],
    }
    """
    # Grunddaten sammeln
    heatmap = get_fehler_heatmap(db_path, klasse, aufgabe)
    kriterien = get_kriterien_durchschnitt(db_path, klasse, aufgabe)

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        # Anzahl Abgaben
        if aufgabe:
            count_row = conn.execute(
                "SELECT COUNT(*) FROM abgabe WHERE klasse = ? AND aufgabe = ?",
                (klasse, aufgabe),
            ).fetchone()
        else:
            count_row = conn.execute(
                "SELECT COUNT(*) FROM abgabe WHERE klasse = ?",
                (klasse,),
            ).fetchone()
        anzahl_abgaben = count_row[0] if count_row else 0

        # Gesamt-Fehler
        if aufgabe:
            total_fehler_row = conn.execute(
                "SELECT COUNT(*) FROM fehler_historie fh"
                " JOIN abgabe a ON fh.abgabe_id = a.id"
                " WHERE a.klasse = ? AND a.aufgabe = ?",
                (klasse, aufgabe),
            ).fetchone()
        else:
            total_fehler_row = conn.execute(
                "SELECT COUNT(*) FROM fehler_historie fh"
                " JOIN abgabe a ON fh.abgabe_id = a.id"
                " WHERE a.klasse = ?",
                (klasse,),
            ).fetchone()
        gesamt_fehler = total_fehler_row[0] if total_fehler_row else 0

    empfehlungen: list[dict[str, Any]] = []
    beispiele: list[dict[str, Any]] = []

    # Schwellenwerte
    FEHLER_SCHWELLE_HOCH = 35.0   # % der Fehler eines Typs → hohe Priorität
    FEHLER_SCHWELLE_MITTEL = 20.0  # % → mittlere Priorität
    KRITERIUM_SCHWELLE = 2.5       # Ø Stufe darunter → Wiederholung empfohlen

    # 1. Fehler-basierte Empfehlungen
    typ_labels = {
        "R": "Rechtschreibung",
        "G": "Grammatik",
        "Z": "Zeichensetzung",
        "A": "Ausdruck / Stil",
    }
    typ_tips = {
        "R": "Gezielte Übung zu Groß-/Kleinschreibung und Getrennt-/Zusammenschreibung empfohlen.",
        "G": "Grammatische Basiskompetenzen (Kasus, Satzgliedstellung, Konjugation) wiederholen.",
        "Z": "Kommasetzung bei Neben- und Relativsätzen sowie Einschüben wiederholen.",
        "A": "Registerbewusstsein und präziseres Formulieren üben.",
    }

    for row in heatmap:
        typ = row["typ"]
        pct = row["prozent"]
        label = typ_labels.get(typ, typ)
        if pct >= FEHLER_SCHWELLE_HOCH:
            empfehlungen.append({
                "typ": "fehler",
                "prio": "hoch",
                "text": (
                    f"{pct:.0f}% aller Fehler betreffen die {label}. "
                    f"{typ_tips.get(typ, 'Wiederholung empfohlen.')}"
                ),
            })
        elif pct >= FEHLER_SCHWELLE_MITTEL:
            empfehlungen.append({
                "typ": "fehler",
                "prio": "mittel",
                "text": (
                    f"{pct:.0f}% der Fehler sind {label}-Fehler. "
                    f"{typ_tips.get(typ, 'Wiederholung empfohlen.')}"
                ),
            })

    # 2. Kriterien-basierte Empfehlungen
    kriterium_labels = {
        "inhalt": "Inhalt",
        "aufbau": "Aufbau / Textstruktur",
        "ausdruck": "Ausdruck",
        "sprachrichtigkeit": "Sprachliche Richtigkeit",
        "textstruktur": "Textstruktur",
        "organisation_layout": "Organisation",
        "lexical_range_accuracy": "Wortschatz",
        "task_achievement": "Aufgabenerfüllung",
        "stil_ausdruck": "Stil",
    }
    kriterium_tips = {
        "inhalt": "Arbeiten mit Belegen und Gegenargumenten üben.",
        "aufbau": "Einleitung-Schluss-Bogen und Absatzübergänge wiederholen.",
        "textstruktur": "Einleitung-Schluss-Bogen und Absatzübergänge wiederholen.",
        "ausdruck": "Synonyme, Register und treffende Formulierungen üben.",
        "stil_ausdruck": "Synonyme, Register und treffende Formulierungen üben.",
        "sprachrichtigkeit": "Sprachliche Basiskompetenzen (Kommasetzung, Genitiv, Großschreibung) stärken.",
        "organisation_layout": "Gliederung und Übersichtlichkeit von Texten üben.",
        "lexical_range_accuracy": "Wortschatz und Wortfelder erweitern.",
        "task_achievement": "Aufgabenanalyse und Adressatenbezug schärfen.",
    }

    for k_name, k_data in kriterien.items():
        avg = k_data.get("avg")
        if avg is not None and avg < KRITERIUM_SCHWELLE:
            label = kriterium_labels.get(k_name, k_name.replace("_", " ").title())
            empfehlungen.append({
                "typ": "kriterium",
                "prio": "hoch" if avg < 2.0 else "mittel",
                "text": (
                    f"Das Kriterium '{label}' liegt im Klassendurchschnitt"
                    f" bei Stufe {avg:.1f}. {kriterium_tips.get(k_name, 'Wiederholung empfohlen.')}"
                ),
            })

    # 3. Konkrete Beispiel-Zitate (Top-Fehler)
    if heatmap:
        top_typ = heatmap[0]["typ"]
        with sqlite3.connect(str(db_path)) as conn:
            conn.row_factory = sqlite3.Row
            if aufgabe:
                rows = conn.execute(
                    """
                    SELECT fh.zitat, fh.korrektur, fh.erklaerung, COUNT(*) as haeufigkeit
                    FROM fehler_historie fh
                    JOIN abgabe a ON fh.abgabe_id = a.id
                    WHERE a.klasse = ? AND a.aufgabe = ? AND fh.typ = ?
                    GROUP BY fh.zitat
                    ORDER BY haeufigkeit DESC, fh.zitat
                    LIMIT 5
                    """,
                    (klasse, aufgabe, top_typ),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT fh.zitat, fh.korrektur, fh.erklaerung, COUNT(*) as haeufigkeit
                    FROM fehler_historie fh
                    JOIN abgabe a ON fh.abgabe_id = a.id
                    WHERE a.klasse = ? AND fh.typ = ?
                    GROUP BY fh.zitat
                    ORDER BY haeufigkeit DESC, fh.zitat
                    LIMIT 5
                    """,
                    (klasse, top_typ),
                ).fetchall()
            for r in rows:
                beispiele.append({
                    "zitat": r["zitat"],
                    "korrektur": r["korrektur"],
                    "typ": top_typ,
                    "haeufigkeit": r["haeufigkeit"],
                    "erklaerung": r["erklaerung"],
                })

    return {
        "klasse": klasse,
        "aufgabe": aufgabe or "Alle Aufgaben",
        "anzahl_abgaben": anzahl_abgaben,
        "gesamt_fehler": gesamt_fehler,
        "heatmap": heatmap,
        "kriterien": kriterien,
        "empfehlungen": empfehlungen,
        "beispiele": beispiele,
    }


# ---------------------------------------------------------------------------
# Klassen-Aggregationen (K1/K3, Noten, Kalibrierung, Trend)
# ---------------------------------------------------------------------------


def get_klassen_k1_k3(
    db_path: Path | str, klasse: str, aufgabe: str | None = None
) -> dict[str, Any]:
    """Berechnet klassenweite K1- und K3-Durchschnitte über alle Abgaben.

    Normalisiert Kriteriumnamen via KRITERIUM_KEY_VARIANTS (reuse, nicht dupliziert).
    K1 = Mittel(inhalt, textstruktur) pro Abgabe, dann Ø über alle Abgaben.
    K3 = Mittel(ausdruck, sprachrichtigkeit) pro Abgabe, dann Ø über alle Abgaben.

    Returns:
        {
            "k1": {"avg": float|None, "count": int},
            "k3": {"avg": float|None, "count": int},
        }
    """
    from natascha_core import KRITERIUM_KEY_VARIANTS

    where = "a.klasse = ?"
    params: list[Any] = [klasse]
    if aufgabe:
        where += " AND a.aufgabe = ?"
        params.append(aufgabe)

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            f"""
            SELECT a.id, k.kriterium_name, k.stufe
            FROM abgabe a
            JOIN kriterium_historie k ON k.abgabe_id = a.id
            WHERE {where} AND k.stufe IS NOT NULL
            ORDER BY a.id
            """,
            params,
        ).fetchall()

    # Pro Abgabe gruppieren
    abgaben_kriterien: dict[int, list[Any]] = {}
    for r in rows:
        abgaben_kriterien.setdefault(r["id"], []).append(r)

    k1_werte: list[float] = []
    k3_werte: list[float] = []
    for kriterien_rows in abgaben_kriterien.values():
        norm = _normalisiere_kriterien(kriterien_rows, KRITERIUM_KEY_VARIANTS)
        k1 = _mittel([norm["inhalt"], norm["textstruktur"]])
        k3 = _mittel([norm["ausdruck"], norm["sprachrichtigkeit"]])
        if k1 is not None:
            k1_werte.append(k1)
        if k3 is not None:
            k3_werte.append(k3)

    return {
        "k1": {
            "avg": round(sum(k1_werte) / len(k1_werte), 2) if k1_werte else None,
            "count": len(k1_werte),
        },
        "k3": {
            "avg": round(sum(k3_werte) / len(k3_werte), 2) if k3_werte else None,
            "count": len(k3_werte),
        },
    }


def get_notenverteilung(
    db_path: Path | str, klasse: str, aufgabe: str | None = None
) -> dict[int, int]:
    """Notenverteilung für eine Klasse (optional gefiltert nach Aufgabe).

    Bevorzugt Lehrer-Note (note_final aus lehrer_feedback), falls vorhanden,
    sonst App-Note (note aus abgabe).
    """
    where = "a.klasse = ?"
    params: list[Any] = [klasse]
    if aufgabe:
        where += " AND a.aufgabe = ?"
        params.append(aufgabe)

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            f"""
            SELECT a.note, lf.note_final
            FROM abgabe a
            LEFT JOIN lehrer_feedback lf ON lf.abgabe_id = a.id
            WHERE {where}
            """,
            params,
        ).fetchall()

    verteilung: dict[int, int] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in rows:
        note = r["note_final"] if r["note_final"] is not None else r["note"]
        if note is not None:
            note_int = int(round(float(note)))
            if 1 <= note_int <= 5:
                verteilung[note_int] += 1
    return verteilung


def get_klassen_kalibrierung(
    db_path: Path | str, klasse: str, aufgabe: str | None = None
) -> dict[str, Any]:
    """Vergleicht App-Note vs. Lehrer-Note auf Klassenebene.

    Returns:
        {
            "app_avg": float|None,
            "lehrer_avg": float|None,
            "diff": float|None,           # lehrer_avg - app_avg
            "tendenz": "app strenger|app milder|deckungsgleich|n/a",
            "n_mit_feedback": int,
            "n_gesamt": int,
        }
    """
    where_a = "a.klasse = ?"
    params: list[Any] = [klasse]
    if aufgabe:
        where_a += " AND a.aufgabe = ?"
        params.append(aufgabe)

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            f"""
            SELECT
                COUNT(*) as n_mit_feedback,
                AVG(lf.note_app_snapshot) as app_avg,
                AVG(lf.note_final) as lehrer_avg
            FROM lehrer_feedback lf
            JOIN abgabe a ON a.id = lf.abgabe_id
            WHERE {where_a} AND lf.note_final IS NOT NULL
            """,
            params,
        ).fetchone()

        n_mit = row["n_mit_feedback"] or 0
        app_avg = row["app_avg"]
        lehrer_avg = row["lehrer_avg"]

        where_total = where_a.replace("a.", "")
        total_row = conn.execute(
            f"SELECT COUNT(*) FROM abgabe WHERE {where_total}", params
        ).fetchone()
        n_gesamt = total_row[0] if total_row else 0

    diff: float | None = None
    if app_avg is not None and lehrer_avg is not None:
        diff = round(lehrer_avg - app_avg, 2)

    tendenz = "n/a"
    if diff is not None:
        if diff < -0.3:
            tendenz = "app milder"
        elif diff > 0.3:
            tendenz = "app strenger"
        else:
            tendenz = "deckungsgleich"

    return {
        "app_avg": round(app_avg, 2) if app_avg is not None else None,
        "lehrer_avg": round(lehrer_avg, 2) if lehrer_avg is not None else None,
        "diff": diff,
        "n_mit_feedback": n_mit,
        "n_gesamt": n_gesamt,
        "tendenz": tendenz,
    }


def get_klassen_trend(
    db_path: Path | str, klasse: str
) -> list[dict[str, Any]]:
    """Trend über alle Aufgaben einer Klasse (chronologisch).

    Returns:
        [
            {
                "aufgabe": "SA1",
                "datum": "2026-01-15",
                "n": 18,
                "avg_note_app": 3.2,
                "avg_note_lehrer": 3.0|None,
                "n_mit_feedback": 5,
            },
            ...
        ]
    """
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT
                a.aufgabe,
                a.datum,
                COUNT(*) as n,
                AVG(a.note) as avg_note_app
            FROM abgabe a
            WHERE a.klasse = ?
            GROUP BY a.aufgabe, a.datum
            ORDER BY a.datum, a.id
            """,
            (klasse,),
        ).fetchall()

        lf_rows = conn.execute(
            """
            SELECT
                a.aufgabe,
                AVG(lf.note_final) as avg_note_lehrer,
                COUNT(*) as n_mit_feedback
            FROM lehrer_feedback lf
            JOIN abgabe a ON a.id = lf.abgabe_id
            WHERE a.klasse = ? AND lf.note_final IS NOT NULL
            GROUP BY a.aufgabe
            """,
            (klasse,),
        ).fetchall()

    lehrer_map: dict[str, dict[str, Any]] = {
        r["aufgabe"]: {"avg": r["avg_note_lehrer"], "n": r["n_mit_feedback"]}
        for r in lf_rows
    }

    result: list[dict[str, Any]] = []
    for r in rows:
        aufgabe = r["aufgabe"]
        lf = lehrer_map.get(aufgabe, {})
        result.append(
            {
                "aufgabe": aufgabe,
                "datum": r["datum"],
                "n": r["n"],
                "avg_note_app": (
                    round(r["avg_note_app"], 2)
                    if r["avg_note_app"] is not None
                    else None
                ),
                "avg_note_lehrer": (
                    round(lf["avg"], 2) if lf.get("avg") is not None else None
                ),
                "n_mit_feedback": lf.get("n", 0),
            }
        )
    return result


# ---------------------------------------------------------------------------
# Lehrer-Feedback CRUD
# ---------------------------------------------------------------------------


def upsert_lehrer_feedback(
    db_path: Path | str,
    abgabe_id: int,
    klasse: str,
    aufgabe: str,
    note_final: float | None,
    note_app_snapshot: float | None = None,
    lehrer_kommentar: str = "",
    pdf_pfad: str = "",
    schueler_id: int | None = None,
) -> int:
    """Legt Lehrer-Feedback an oder aktualisiert es (Upsert ueber abgabe_id).

    Gibt die lehrer_feedback-id zurueck. geaendert_am wird bei Update neu gesetzt.
    schueler_id und note_app_snapshot werden bei UPDATE nur ueberschrieben,
    wenn sie nicht None sind (COALESCE-Logik).
    """
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT INTO lehrer_feedback
            (abgabe_id, schueler_id, klasse, aufgabe, note_final,
             note_app_snapshot, lehrer_kommentar, pdf_pfad)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(abgabe_id) DO UPDATE SET
                note_final = excluded.note_final,
                lehrer_kommentar = excluded.lehrer_kommentar,
                pdf_pfad = excluded.pdf_pfad,
                schueler_id = COALESCE(excluded.schueler_id, lehrer_feedback.schueler_id),
                note_app_snapshot = COALESCE(excluded.note_app_snapshot,
                    lehrer_feedback.note_app_snapshot),
                geaendert_am = CURRENT_TIMESTAMP
            """,
            (
                abgabe_id,
                schueler_id,
                klasse,
                aufgabe,
                note_final,
                note_app_snapshot,
                lehrer_kommentar,
                pdf_pfad,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT id FROM lehrer_feedback WHERE abgabe_id = ?",
            (abgabe_id,),
        ).fetchone()
        return int(row[0]) if row else -1  # type: ignore[arg-type]


def get_lehrer_feedback(db_path: Path | str, abgabe_id: int) -> dict[str, Any] | None:
    """Holt das Lehrer-Feedback zu einer Abgabe, oder None."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM lehrer_feedback WHERE abgabe_id = ?",
            (abgabe_id,),
        ).fetchone()
        return dict(row) if row else None


def get_lehrer_feedback_by_hash(
    db_path: Path | str, datei_hash: str
) -> dict[str, Any] | None:
    """Holt Lehrer-Feedback ueber den Datei-Hash (fuer die Dateiliste/Status-Marker).

    Joint abgabe (datei_hash) -> lehrer_feedback. Gibt None, wenn keine Abgabe oder
    kein Feedback existiert.
    """
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT lf.* FROM lehrer_feedback lf
            JOIN abgabe a ON lf.abgabe_id = a.id
            WHERE a.datei_hash = ?
            """,
            (datei_hash,),
        ).fetchone()
        return dict(row) if row else None


def has_lehrer_feedback_for_file(db_path: Path | str, datei_hash: str) -> bool:
    """True, wenn fuer die Datei (per Hash) bereits eine note_final eingetragen ist."""
    with sqlite3.connect(str(db_path)) as conn:
        row = conn.execute(
            """
            SELECT 1 FROM lehrer_feedback lf
            JOIN abgabe a ON lf.abgabe_id = a.id
            WHERE a.datei_hash = ? AND lf.note_final IS NOT NULL
            """,
            (datei_hash,),
        ).fetchone()
        return row is not None


# ---------------------------------------------------------------------------
# Schüler-Längsschnitt (Lernverlauf-Aggregation, rein regelbasiert)
# ---------------------------------------------------------------------------

# Menschenlesbare Bezeichnungen der Fehlertypen (vgl. build_analysis_prompt in
# natascha_core: R=Rechtschreibung, G=Grammatik, Z=Zeichensetzung, A=Ausdruck/Register).
FEHLER_TYP_LABELS: dict[str, str] = {
    "R": "Rechtschreibung",
    "G": "Grammatik",
    "Z": "Zeichensetzung",
    "A": "Ausdruck / Stil",
}


def _mittel(werte: list[float | None]) -> float | None:
    """Mittelwert der nicht-leeren Werte, sonst None (z. B. für K1/K3)."""
    vals = [w for w in werte if w is not None]
    return round(sum(vals) / len(vals), 2) if vals else None


def _normalisiere_kriterien(
    rows: list[Any], key_variants: dict[str, tuple[str, ...]]
) -> dict[str, float | None]:
    """Mappt die (variablen) Kriteriumsnamen einer Abgabe auf die vier Hauptkriterien.

    Mehrere Treffer pro Kanon-Kriterium werden gemittelt; fehlt ein Kriterium, ist
    der Wert None (kein Crash).
    """
    buckets: dict[str, list[float]] = {k: [] for k in key_variants}
    for r in rows:
        name = (r["kriterium_name"] or "").strip().lower()
        stufe = r["stufe"]
        if stufe is None:
            continue
        for kanon, variants in key_variants.items():
            if name in variants:
                buckets[kanon].append(float(stufe))
                break
    return {k: (round(sum(v) / len(v), 2) if v else None) for k, v in buckets.items()}


def _trend_eintrag(werte: list[float | None], besser_ist_groesser: bool) -> dict[str, Any]:
    """Vergleicht erste vs. letzte (nicht-leere) Beobachtung einer Kennzahl.

    `besser_ist_groesser`: True für Kriterien-Stufen (5 = beste Stufe), False für
    Schulnoten (1 = beste Note). Die Richtung ist IMMER an die pädagogische
    Verbesserung gekoppelt, nicht an die reine Zahlrichtung — bei Noten bedeutet eine
    SINKENDE Zahl eine Verbesserung ("steigt"). Diese Invertierung ist eine typische
    Fehlerquelle, daher hier explizit.

    Returns {"start": float|None, "ende": float|None, "richtung": "steigt|stabil|faellt"}.
    """
    vorhanden = [w for w in werte if w is not None]
    if not vorhanden:
        return {"start": None, "ende": None, "richtung": "stabil"}
    start, ende = vorhanden[0], vorhanden[-1]
    delta = ende - start
    verbesserung = delta if besser_ist_groesser else -delta  # Noten invertieren
    if abs(delta) < 0.5:
        richtung = "stabil"
    elif verbesserung > 0:
        richtung = "steigt"
    else:
        richtung = "faellt"
    return {"start": round(start, 2), "ende": round(ende, 2), "richtung": richtung}


def _aggregiere_fehlerschwerpunkte(
    conn: sqlite3.Connection,
    abgabe_ids: list[int],
    top_n: int = 4,
    max_beispiele: int = 3,
) -> list[dict[str, Any]]:
    """Aggregiert Fehlertypen über mehrere Abgaben; Beispiele dedupliziert nach Zitat."""
    if not abgabe_ids:
        return []
    placeholders = ",".join("?" * len(abgabe_ids))
    rows = conn.execute(
        f"SELECT typ, zitat, korrektur FROM fehler_historie WHERE abgabe_id IN ({placeholders})",
        abgabe_ids,
    ).fetchall()
    anzahl: dict[str, int] = {}
    beispiele: dict[str, list[dict[str, str]]] = {}
    gesehen: dict[str, set[str]] = {}
    for r in rows:
        typ = r["typ"] or "?"
        anzahl[typ] = anzahl.get(typ, 0) + 1
        zitat = (r["zitat"] or "").strip()
        if zitat and zitat not in gesehen.setdefault(typ, set()) \
                and len(beispiele.get(typ, [])) < max_beispiele:
            gesehen[typ].add(zitat)
            beispiele.setdefault(typ, []).append(
                {"zitat": zitat, "korrektur": (r["korrektur"] or "").strip()}
            )
    top = sorted(anzahl, key=lambda t: anzahl[t], reverse=True)[:top_n]
    return [
        {
            "typ": typ,
            "label": FEHLER_TYP_LABELS.get(typ, typ),
            "anzahl": anzahl[typ],
            "beispiele": beispiele.get(typ, []),
        }
        for typ in top
    ]


def get_schueler_laengsschnitt(
    db_path: Path | str,
    schueler_id: int,
) -> dict[str, Any]:
    """Aggregiert den Lernverlauf EINES Schülers über alle seine Abgaben.

    Liest aus abgabe (Note, Datum, Aufgabe), kriterium_historie (vier Hauptkriterien),
    fehler_historie (Fehlertypen + Zitate) und lehrer_feedback (echte Note).

    Returns ein Dict:
    {
        "schueler": {"id": int, "vorname": str, "nachname": str, "klasse": str},
        "anzahl_abgaben": int,
        "verlauf": [
            {
                "abgabe_id": int,
                "aufgabe": str,
                "datum": str,
                "note_app": float | None,
                "note_lehrer": float | None,     # aus lehrer_feedback, sonst None
                "kriterien": {                    # die vier Hauptkriterien, normalisiert
                    "inhalt": float | None,
                    "textstruktur": float | None,
                    "ausdruck": float | None,
                    "sprachrichtigkeit": float | None,
                },
                "k1": float | None,               # (inhalt + textstruktur) / 2
                "k3": float | None,               # (ausdruck + sprachrichtigkeit) / 2
            },
            ...   # chronologisch sortiert
        ],
        "trend": {                                # Vergleich erste vs. letzte Abgabe
            "note_app": {"start": .., "ende": .., "richtung": "steigt|stabil|faellt"},
            "note_lehrer": {...},                 # zusätzlich, für die App-vs-Lehrer-Ansicht
            "inhalt": {...}, "textstruktur": {...},
            "ausdruck": {...}, "sprachrichtigkeit": {...},
            "k1": {...}, "k3": {...},
        },
        "fehlerschwerpunkte": [                    # über ALLE Abgaben aggregiert
            {"typ": "Z", "label": "Zeichensetzung", "anzahl": int,
             "beispiele": [{"zitat": "...", "korrektur": "..."}]},  # max 3
            ...   # nach Anzahl absteigend, Top 3-4 Typen
        ],
        "kalibrierung": {                          # nur wo Lehrer-Note vorhanden
            "paare": int,                          # Abgaben mit beiden Noten
            "mittlere_abweichung": float | None,   # Ø |note_app - note_lehrer|
            "tendenz": "app strenger|app milder|deckungsgleich|n/a",
        },
    }

    Hinweise:
    - Kriteriumsnamen variieren je Rubrik → KRITERIUM_KEY_VARIANTS (aus natascha_core,
      dieselbe Quelle wie berechne_note_srdp). Fehlt ein Kriterium: None statt Crash.
    - Notenrichtung ist invertiert: kleinere Note = besser, note sinkt = "steigt"
      (Verbesserung). Siehe _trend_eintrag().
    - Robust bei n=1 (start == ende, richtung "stabil") und bei Schülern ganz ohne
      Kriterien-/Fehlerdaten.
    """
    # Lazy-Import, da natascha_core dieses Modul bereits beim Laden importiert
    # (zirkulärer Import beim Modul-Load würde sonst fehlschlagen).
    from natascha_core import KRITERIUM_KEY_VARIANTS

    schueler = get_schueler_by_id(db_path, schueler_id)
    schueler_block = {
        "id": schueler_id,
        "vorname": (schueler or {}).get("vorname", ""),
        "nachname": (schueler or {}).get("nachname") or "",
        "klasse": (schueler or {}).get("klasse", ""),
    }

    verlauf: list[dict[str, Any]] = []
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        abgaben = conn.execute(
            "SELECT * FROM abgabe WHERE schueler_id = ? ORDER BY datum, id",
            (schueler_id,),
        ).fetchall()

        for ab in abgaben:
            abgabe_id = ab["id"]
            krit_rows = conn.execute(
                "SELECT kriterium_name, stufe FROM kriterium_historie WHERE abgabe_id = ?",
                (abgabe_id,),
            ).fetchall()
            kriterien = _normalisiere_kriterien(krit_rows, KRITERIUM_KEY_VARIANTS)
            lf = conn.execute(
                "SELECT note_final FROM lehrer_feedback WHERE abgabe_id = ?",
                (abgabe_id,),
            ).fetchone()
            note_lehrer = lf["note_final"] if lf and lf["note_final"] is not None else None
            verlauf.append(
                {
                    "abgabe_id": abgabe_id,
                    "aufgabe": ab["aufgabe"],
                    "datum": ab["datum"],
                    "note_app": ab["note"],
                    "note_lehrer": note_lehrer,
                    "kriterien": kriterien,
                    "k1": _mittel([kriterien["inhalt"], kriterien["textstruktur"]]),
                    "k3": _mittel([kriterien["ausdruck"], kriterien["sprachrichtigkeit"]]),
                }
            )

        fehlerschwerpunkte = _aggregiere_fehlerschwerpunkte(conn, [ab["id"] for ab in abgaben])

    def _serie(key: str) -> list[float | None]:
        return [v[key] for v in verlauf]

    def _krit_serie(key: str) -> list[float | None]:
        return [v["kriterien"][key] for v in verlauf]

    trend = {
        "note_app": _trend_eintrag(_serie("note_app"), besser_ist_groesser=False),
        "note_lehrer": _trend_eintrag(_serie("note_lehrer"), besser_ist_groesser=False),
        "inhalt": _trend_eintrag(_krit_serie("inhalt"), besser_ist_groesser=True),
        "textstruktur": _trend_eintrag(_krit_serie("textstruktur"), besser_ist_groesser=True),
        "ausdruck": _trend_eintrag(_krit_serie("ausdruck"), besser_ist_groesser=True),
        "sprachrichtigkeit": _trend_eintrag(
            _krit_serie("sprachrichtigkeit"), besser_ist_groesser=True
        ),
        "k1": _trend_eintrag(_serie("k1"), besser_ist_groesser=True),
        "k3": _trend_eintrag(_serie("k3"), besser_ist_groesser=True),
    }

    # Kalibrierung: nur Abgaben mit beiden Noten. note > = größere Zahl = strenger.
    paare = [
        (v["note_app"], v["note_lehrer"])
        for v in verlauf
        if v["note_app"] is not None and v["note_lehrer"] is not None
    ]
    if paare:
        diffs = [app - lehrer for app, lehrer in paare]
        mittlere_abweichung = round(sum(abs(d) for d in diffs) / len(paare), 2)
        avg_diff = sum(diffs) / len(paare)
        if abs(avg_diff) < 0.25:
            tendenz = "deckungsgleich"
        elif avg_diff > 0:
            tendenz = "app strenger"
        else:
            tendenz = "app milder"
    else:
        mittlere_abweichung = None
        tendenz = "n/a"

    return {
        "schueler": schueler_block,
        "anzahl_abgaben": len(verlauf),
        "verlauf": verlauf,
        "trend": trend,
        "fehlerschwerpunkte": fehlerschwerpunkte,
        "kalibrierung": {
            "paare": len(paare),
            "mittlere_abweichung": mittlere_abweichung,
            "tendenz": tendenz,
        },
    }


# ---------------------------------------------------------------------------
# Schüler-Profil (historisch, LLM-gestützte Einschätzung)
# ---------------------------------------------------------------------------


def save_schueler_profil(
    db_path: Path | str,
    schueler_id: int,
    profil: dict[str, Any],
    basis_anzahl_abgaben: int,
    modell: str = "",
) -> int:
    """Speichert ein neues Schülerprofil (historisch, kein Überschreiben).

    profil wird als JSON serialisiert (ensure_ascii=False, damit Umlaute erhalten
    bleiben). Gibt die neue profil-id zurück.
    """
    json_text = json.dumps(profil, ensure_ascii=False)
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            """
            INSERT INTO schueler_profil
            (schueler_id, profil_json, basis_anzahl_abgaben, modell)
            VALUES (?, ?, ?, ?)
            """,
            (schueler_id, json_text, basis_anzahl_abgaben, modell),
        )
        conn.commit()
        return int(cur.lastrowid)  # type: ignore[arg-type]


def get_latest_schueler_profil(
    db_path: Path | str, schueler_id: int
) -> dict[str, Any] | None:
    """Holt das jüngste gespeicherte Profil eines Schülers, oder None.

    Returns ein Dict:
    {
        "id": int,
        "profil": dict,                  # aus profil_json deserialisiert
        "basis_anzahl_abgaben": int,
        "modell": str,
        "erstellt_am": str,
    }
    oder None, wenn noch kein Profil existiert.
    """
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            """
            SELECT * FROM schueler_profil
            WHERE schueler_id = ?
            ORDER BY erstellt_am DESC, id DESC
            LIMIT 1
            """,
            (schueler_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "profil": json.loads(row["profil_json"]),
            "basis_anzahl_abgaben": row["basis_anzahl_abgaben"],
            "modell": row["modell"] or "",
            "erstellt_am": row["erstellt_am"],
        }


def get_schueler_profil_historie(
    db_path: Path | str, schueler_id: int
) -> list[dict[str, Any]]:
    """Alle Profile eines Schülers, neueste zuerst (für spätere Entwicklungsansicht).

    Gibt eine Liste von Dicts wie get_latest_schueler_profil, chronologisch absteigend.
    """
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT * FROM schueler_profil
            WHERE schueler_id = ?
            ORDER BY erstellt_am DESC, id DESC
            """,
            (schueler_id,),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "profil": json.loads(r["profil_json"]),
                "basis_anzahl_abgaben": r["basis_anzahl_abgaben"],
                "modell": r["modell"] or "",
                "erstellt_am": r["erstellt_am"],
            }
            for r in rows
        ]


# ---------------------------------------------------------------------------
# Klassen-Briefing (historisch, LLM-gestützte Verdichtung)
# ---------------------------------------------------------------------------


def save_klassen_briefing(
    db_path: Path | str,
    klasse: str,
    aufgabe: str | None,
    briefing: dict[str, Any],
    basis_anzahl_abgaben: int,
    basis_anzahl_fehler: int = 0,
    modell: str = "",
) -> int:
    """Speichert ein neues Klassen-Briefing (historisch, kein Überschreiben)."""
    json_text = json.dumps(briefing, ensure_ascii=False)
    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.execute(
            """
            INSERT INTO klassen_briefing
            (klasse, aufgabe, briefing_json, basis_anzahl_abgaben, basis_anzahl_fehler, modell)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (klasse, aufgabe or "", json_text, basis_anzahl_abgaben, basis_anzahl_fehler, modell),
        )
        conn.commit()
        return int(cur.lastrowid)  # type: ignore[arg-type]


def get_latest_klassen_briefing(
    db_path: Path | str, klasse: str, aufgabe: str | None = None
) -> dict[str, Any] | None:
    """Holt das jüngste gespeicherte Briefing einer Klasse, oder None."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        if aufgabe:
            row = conn.execute(
                """
                SELECT * FROM klassen_briefing
                WHERE klasse = ? AND aufgabe = ?
                ORDER BY erstellt_am DESC, id DESC
                LIMIT 1
                """,
                (klasse, aufgabe),
            ).fetchone()
        else:
            row = conn.execute(
                """
                SELECT * FROM klassen_briefing
                WHERE klasse = ? AND (aufgabe IS NULL OR aufgabe = '')
                ORDER BY erstellt_am DESC, id DESC
                LIMIT 1
                """,
                (klasse,),
            ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "klasse": row["klasse"],
            "aufgabe": row["aufgabe"] or None,
            "briefing": json.loads(row["briefing_json"]),
            "basis_anzahl_abgaben": row["basis_anzahl_abgaben"],
            "basis_anzahl_fehler": row["basis_anzahl_fehler"],
            "modell": row["modell"] or "",
            "erstellt_am": row["erstellt_am"],
        }


def get_klassen_briefing_historie(
    db_path: Path | str, klasse: str, aufgabe: str | None = None
) -> list[dict[str, Any]]:
    """Alle Briefings einer Klasse, neueste zuerst."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        if aufgabe:
            rows = conn.execute(
                """
                SELECT * FROM klassen_briefing
                WHERE klasse = ? AND aufgabe = ?
                ORDER BY erstellt_am DESC, id DESC
                """,
                (klasse, aufgabe),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM klassen_briefing
                WHERE klasse = ? AND (aufgabe IS NULL OR aufgabe = '')
                ORDER BY erstellt_am DESC, id DESC
                """,
                (klasse,),
            ).fetchall()
        return [
            {
                "id": r["id"],
                "klasse": r["klasse"],
                "aufgabe": r["aufgabe"] or None,
                "briefing": json.loads(r["briefing_json"]),
                "basis_anzahl_abgaben": r["basis_anzahl_abgaben"],
                "basis_anzahl_fehler": r["basis_anzahl_fehler"],
                "modell": r["modell"] or "",
                "erstellt_am": r["erstellt_am"],
            }
            for r in rows
        ]


# ---------------------------------------------------------------------------
# Klassen-Statistik (gebündelte Aggregation für die UI)
# ---------------------------------------------------------------------------


def get_klassen_statistik(
    db_path: Path | str, klasse: str, aufgabe: str | None = None
) -> dict[str, Any]:
    """Bündelt alle Klassen-Statistiken aus der DB.

    Aggregiert Notenverteilung, Kriterien-Durchschnitte und den Aufgaben-Verlauf
    in einem einzigen Dict, das direkt von der UI (Statistik-Tab) verwendet werden kann.

    Returns:
        {
            "stats": {
                "total": int,
                "grade_distribution": {1..5: int},
                "grade_average": float,
                "criteria_averages": {key: {"avg": float, "count": int}},
                "weakest_criterion": str | None,
                "strongest_criterion": str | None,
            },
            "progress": [
                {
                    "aufgabe": str,
                    "label": str,
                    "avg_note": float | None,
                    "avg_criteria": {key: float},
                    "n": int,
                },
                ...
            ],
        }
    """
    grade_dist = get_notenverteilung(db_path, klasse, aufgabe)
    total = sum(grade_dist.values())

    if total > 0:
        noten_summe = sum(note * anzahl for note, anzahl in grade_dist.items())
        grade_average = round(noten_summe / total, 2)
    else:
        grade_average = 0.0

    criteria_averages = get_kriterien_durchschnitt(db_path, klasse, aufgabe)

    weakest_criterion: str | None = None
    strongest_criterion: str | None = None
    if criteria_averages:
        with_avg = {k: v["avg"] for k, v in criteria_averages.items() if v.get("avg") is not None}
        if with_avg:
            weakest_criterion = min(with_avg, key=lambda k: with_avg[k])
            strongest_criterion = max(with_avg, key=lambda k: with_avg[k])

    stats: dict[str, Any] = {
        "total": total,
        "grade_distribution": grade_dist,
        "grade_average": grade_average,
        "criteria_averages": criteria_averages,
        "weakest_criterion": weakest_criterion,
        "strongest_criterion": strongest_criterion,
    }

    trend_eintraege = get_klassen_trend(db_path, klasse)
    if aufgabe:
        trend_eintraege = [e for e in trend_eintraege if e["aufgabe"] == aufgabe]

    progress: list[dict[str, Any]] = []
    for eintrag in trend_eintraege:
        aufgabe_name: str = eintrag["aufgabe"]
        avg_note_lehrer = eintrag.get("avg_note_lehrer")
        avg_note_app = eintrag.get("avg_note_app")
        avg_note = avg_note_lehrer if avg_note_lehrer is not None else avg_note_app

        krit_avg = get_kriterien_durchschnitt(db_path, klasse, aufgabe_name)
        avg_criteria: dict[str, float] = {
            k: v["avg"] for k, v in krit_avg.items() if v.get("avg") is not None
        }

        progress.append(
            {
                "aufgabe": aufgabe_name,
                "label": aufgabe_name,
                "avg_note": avg_note,
                "avg_criteria": avg_criteria,
                "n": eintrag["n"],
            }
        )

    return {"stats": stats, "progress": progress}


# ---------------------------------------------------------------------------
# io-Import (wird fuer export_noten_csv gebraucht)
# ---------------------------------------------------------------------------

import io  # noqa: E402
