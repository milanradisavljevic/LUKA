"""Tests für die bestätigte Schülerzuordnung beim Speichern einer Analyse.

Hintergrund: data["schueler"] kann aus der LLM-Antwort stammen — die alte
Namensheuristik konnte dadurch falsche oder erfundene Schüler anlegen.
Die bestätigte ID hat Vorrang und legt nie neue Schüler an.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_db as ndb


def _abgabe_datei(tmp_path: Path, name: str = "abgabe.docx") -> Path:
    f = tmp_path / name
    f.write_bytes(b"dummy-inhalt " + name.encode())
    return f


def _setup_db(tmp_path: Path) -> Path:
    db = tmp_path / "test.db"
    ndb.init_db(db)
    return db


def test_bestaetigte_id_hat_vorrang_vor_llm_namen(tmp_path):
    db = _setup_db(tmp_path)
    sid = ndb.insert_schueler(db, "7A", "Mia", "Muster")

    abgabe_id = ndb.save_analysis_to_db(
        db_path=db,
        data={"schueler": "Fantasie Person", "notenempfehlung": {"note": 2}},
        file_path=_abgabe_datei(tmp_path),
        klasse="7A",
        aufgabe="SA1",
        bestaetigte_schueler_id=sid,
    )
    assert abgabe_id > 0

    abgabe = ndb.get_abgabe_by_id(db, abgabe_id)
    assert abgabe["schueler_id"] == sid
    # Heuristik wurde übersprungen: kein "Fantasie Person" angelegt.
    alle = ndb.get_schueler_by_klasse(db, "7A")
    assert len(alle) == 1


def test_id_aus_falscher_klasse_faellt_auf_heuristik_zurueck(tmp_path):
    db = _setup_db(tmp_path)
    fremd_sid = ndb.insert_schueler(db, "8B", "Noah", "Nachbar")

    abgabe_id = ndb.save_analysis_to_db(
        db_path=db,
        data={"schueler": "Mia Muster"},
        file_path=_abgabe_datei(tmp_path),
        klasse="7A",
        aufgabe="SA1",
        bestaetigte_schueler_id=fremd_sid,
    )
    assert abgabe_id > 0

    abgabe = ndb.get_abgabe_by_id(db, abgabe_id)
    # Nicht der klassenfremde Schüler; Heuristik hat "Mia Muster" in 7A angelegt.
    assert abgabe["schueler_id"] != fremd_sid
    mia = ndb.get_schueler_by_name(db, "7A", "Mia", "Muster")
    assert mia is not None
    assert abgabe["schueler_id"] == mia["id"]


def test_ohne_bestaetigung_bleibt_altes_verhalten(tmp_path):
    db = _setup_db(tmp_path)
    abgabe_id = ndb.save_analysis_to_db(
        db_path=db,
        data={"schueler": "Mia Muster"},
        file_path=_abgabe_datei(tmp_path),
        klasse="7A",
        aufgabe="SA1",
    )
    assert abgabe_id > 0
    mia = ndb.get_schueler_by_name(db, "7A", "Mia", "Muster")
    assert mia is not None
