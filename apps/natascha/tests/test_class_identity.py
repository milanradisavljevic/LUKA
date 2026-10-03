"""Migrations for stable class identities must leave uncertain legacy rows reviewable."""

import sqlite3

import natascha_db as db


def _insert_legacy_rows(path, class_name="7A"):
    with sqlite3.connect(path) as conn:
        conn.execute(
            "INSERT INTO schueler (klasse, vorname, nachname) VALUES (?, 'Mia', 'Beispiel')",
            (class_name,),
        )
        conn.execute(
            "INSERT INTO abgabe (klasse, aufgabe, dateiname, datei_hash) VALUES (?, 'SA1', 'arbeit.docx', 'hash-1')",
            (class_name,),
        )


def test_incomplete_legacy_class_is_reviewable_and_migration_is_idempotent(tmp_path):
    path = tmp_path / "shared.db"
    db.init_db(path)
    _insert_legacy_rows(path)

    db.init_db(path)
    with sqlite3.connect(path) as conn:
        first_id = conn.execute("SELECT id FROM klasse_stammdaten WHERE name='7A'").fetchone()[0]
        student = conn.execute("SELECT klasse, klasse_id FROM schueler").fetchone()
        submission = conn.execute("SELECT klasse, klasse_id FROM abgabe").fetchone()
        membership_count = conn.execute("SELECT COUNT(*) FROM schueler_klassen").fetchone()[0]
        review_count = conn.execute("SELECT COUNT(*) FROM legacy_klasse_pruefung WHERE legacy_name='7A'").fetchone()[0]

    assert student == ("7A", None)
    assert submission == ("7A", None)
    assert membership_count == 0
    assert review_count == 1

    db.init_db(path)
    with sqlite3.connect(path) as conn:
        ids = conn.execute("SELECT id FROM klasse_stammdaten WHERE name='7A'").fetchall()
    assert ids == [(first_id,)]


def test_reused_legacy_name_is_not_assigned_to_either_school_year(tmp_path):
    path = tmp_path / "shared.db"
    db.init_db(path)
    with sqlite3.connect(path) as conn:
        conn.executemany(
            "INSERT INTO klasse_stammdaten (id,name,fach,schuljahr) VALUES (?,?,?,?)",
            [("class-1", "7A", "deutsch", "2025/26"), ("class-2", "7A", "deutsch", "2026/27")],
        )
        conn.execute("INSERT INTO schueler (klasse, vorname) VALUES ('7A', 'Mia')")
        conn.execute(
            "INSERT INTO abgabe (klasse, aufgabe, dateiname, datei_hash) VALUES ('7A', 'SA1', 'arbeit.docx', 'hash-2')"
        )

    db.init_db(path)
    with sqlite3.connect(path) as conn:
        memberships = conn.execute("SELECT COUNT(*) FROM schueler_klassen").fetchone()[0]
        student_id = conn.execute("SELECT klasse_id FROM schueler").fetchone()[0]
        submission_id = conn.execute("SELECT klasse_id FROM abgabe").fetchone()[0]
        review_flags = conn.execute(
            "SELECT SUM(pruefung_noetig) FROM klasse_stammdaten WHERE name='7A'"
        ).fetchone()[0]
        snapshot = conn.execute("SELECT klasse FROM abgabe").fetchone()[0]

    assert memberships == 0
    assert student_id is None
    assert submission_id is None
    assert review_flags == 2
    assert snapshot == "7A"


def test_explicitly_removed_membership_stays_inactive_after_migration(tmp_path):
    path = tmp_path / "shared.db"
    db.init_db(path)
    with sqlite3.connect(path) as conn:
        conn.execute(
            "INSERT INTO klasse_stammdaten (id,name,fach,schuljahr) VALUES ('class-7a','7A','deutsch','2026/27')"
        )
        conn.execute("INSERT INTO schueler (klasse,vorname) VALUES ('7A','Mia')")
        student_id = conn.execute("SELECT id FROM schueler WHERE vorname='Mia'").fetchone()[0]
        conn.execute(
            "INSERT INTO schueler_klassen (schueler_id,klasse_id,status) VALUES (?,'class-7a','inaktiv')",
            (student_id,),
        )

    db.init_db(path)
    db.init_db(path)
    with sqlite3.connect(path) as conn:
        membership = conn.execute(
            "SELECT status FROM schueler_klassen WHERE schueler_id=? AND klasse_id='class-7a'",
            (student_id,),
        ).fetchone()
        student_class_id = conn.execute(
            "SELECT klasse_id FROM schueler WHERE id=?", (student_id,)
        ).fetchone()[0]

    assert membership == ("inaktiv",)
    assert student_class_id is None
