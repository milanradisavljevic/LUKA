"""Klassen-Normalisierung: Leerraum kollabieren, Case erhalten, Lookup tolerant.

Regression: Ein casefold in normalize_klasse hätte neue Abgaben ("7a") neben
Bestandsdaten ("7A") gelegt und das Pseudonymisierungs-Roster von den alten
Zeilen abgeschnitten.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_db as ndb


def test_normalisierung_erhaelt_gross_kleinschreibung():
    assert ndb.normalize_klasse("  7  A ") == "7 A"
    assert ndb.normalize_klasse("7A") == "7A"
    assert ndb.normalize_klasse("6i") == "6i"
    assert ndb.normalize_aufgabe("  SA   2 ") == "SA 2"


def test_roster_lookup_ist_case_insensitiv(tmp_path):
    db = tmp_path / "test.db"
    ndb.init_db(db)
    ndb.insert_schueler(db, "7A", "Mia", "Muster")

    # Bestandsdaten "7A" bleiben über jede Schreibweise erreichbar:
    assert len(ndb.get_schueler_by_klasse(db, "7a")) == 1
    assert len(ndb.get_schueler_by_klasse(db, "7A")) == 1
    assert ndb.get_schueler_by_name(db, "7a", "Mia", "Muster") is not None

    # Gespeichert wird die Original-Schreibweise (kein stilles Kleinschreiben):
    assert ndb.get_schueler_by_klasse(db, "7A")[0]["klasse"] == "7A"
