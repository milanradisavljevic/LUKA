from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import natascha_db as ndb


def _analysis(note: float, criterion: float, quote: str) -> dict:
    return {
        "datei": "abgabe.docx",
        "notenempfehlung": {"note": note, "durchschnitt": criterion},
        "bewertung": {"Inhalt": {"stufe": criterion, "gewicht": 100}},
        "fehler": [{"zitat": quote, "korrektur": "Korrektur", "typ": "G"}],
    }


def test_rerun_keeps_previous_revision_and_moves_active_projection(tmp_path: Path) -> None:
    tmp_path.mkdir(parents=True, exist_ok=True)
    db_path = tmp_path / "corrections.db"
    source = tmp_path / "abgabe.docx"
    source.write_bytes(b"synthetic submission")
    ndb.init_db(db_path)

    first = _analysis(3, 2.5, "v1 quote")
    abgabe_id = ndb.save_analysis_to_db(
        db_path, first, source, "TEST-6A", "Kommentar", provider="mistral",
        model="mistral-medium-3-5", privacy_mode="pseudonymisiert",
        correction_basis={
            "rubrik_name": "synthetic-rubric",
            "erwartungshorizont": "Erste, bestätigte Erwartung.",
            "erwartungshorizont_version": "sha256:first",
        },
        started_at="2026-09-23T10:00:00+02:00",
    )
    assert abgabe_id > 0
    first_revision_id = first["_revision_id"]

    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "INSERT INTO lehrer_feedback "
            "(abgabe_id, klasse, aufgabe, note_final, note_app_snapshot, lehrer_kommentar) "
            "VALUES (?, 'TEST-6A', 'Kommentar', 2.0, 3.0, 'synthetic teacher note')",
            (abgabe_id,),
        )

    second = _analysis(4, 3.5, "v2 quote")
    same_id = ndb.save_analysis_to_db(
        db_path, second, source, "TEST-6A", "Kommentar", provider="deepseek",
        model="deepseek-flash", privacy_mode="pseudonymisiert",
        correction_basis={
            "rubrik_name": "synthetic-rubric-v2",
            "erwartungshorizont": "Überarbeitete Erwartung.",
            "erwartungshorizont_version": "sha256:second",
        },
        revision_of_abgabe_id=abgabe_id,
    )
    assert same_id == abgabe_id

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        revisions = conn.execute(
            "SELECT * FROM korrektur_revision WHERE abgabe_id=? ORDER BY revision_no", (abgabe_id,)
        ).fetchall()
        active = conn.execute(
            "SELECT note, gesamtstufe FROM abgabe WHERE id=?", (abgabe_id,)
        ).fetchone()
        criterion = conn.execute(
            "SELECT stufe FROM kriterium_historie WHERE abgabe_id=?", (abgabe_id,)
        ).fetchone()
        errors = conn.execute(
            "SELECT zitat FROM fehler_historie WHERE abgabe_id=?", (abgabe_id,)
        ).fetchall()

    assert len(revisions) == 2
    assert revisions[0]["id"] == first_revision_id
    assert revisions[0]["provider"] == "mistral"
    assert revisions[0]["model"] == "mistral-medium-3-5"
    assert revisions[0]["lehrer_kommentar"] == "synthetic teacher note"
    assert json.loads(revisions[0]["kriterien_json"])[0]["stufe"] == 2.5
    assert json.loads(revisions[0]["basis_json"])["erwartungshorizont"] == (
        "Erste, bestätigte Erwartung."
    )
    assert json.loads(revisions[0]["basis_json"])["erwartungshorizont_version"] == "sha256:first"
    assert revisions[1]["provider"] == "deepseek"
    assert revisions[1]["model"] == "deepseek-flash"
    assert json.loads(revisions[1]["basis_json"])["rubrik_name"] == "synthetic-rubric-v2"
    assert json.loads(revisions[1]["basis_json"])["erwartungshorizont"] == (
        "Überarbeitete Erwartung."
    )
    assert json.loads(revisions[1]["basis_json"])["erwartungshorizont_version"] == "sha256:second"
    assert revisions[1]["is_active"] == 1
    assert active["note"] == 4
    assert criterion["stufe"] == 3.5
    assert [row["zitat"] for row in errors] == ["v2 quote"]


def test_existing_abgabe_is_backfilled_as_first_revision(tmp_path: Path) -> None:
    tmp_path.mkdir(parents=True, exist_ok=True)
    db_path = tmp_path / "migration.db"
    source = tmp_path / "legacy.docx"
    source.write_bytes(b"synthetic legacy submission")
    ndb.init_db(db_path)
    abgabe_id = ndb.save_analysis_to_db(
        db_path, _analysis(3, 2.0, "old quote"), source, "TEST-6A", "Kommentar"
    )
    with sqlite3.connect(db_path) as conn:
        conn.execute("DROP TABLE korrektur_revision")

    ndb.init_db(db_path)
    revision = ndb.get_korrektur_revision_for_abgabe(db_path, abgabe_id)
    assert revision is not None
    assert revision["revision_no"] == 1
    assert revision["provider"] == "unbekannt"
    assert revision["is_active"] == 1
    assert json.loads(revision["fehler_json"])[0]["zitat"] == "old quote"
