"""Tests für natascha_bridge.py — Bridge-Export v2 (Ausgangstext-Durchreichung)."""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_bridge as nb
import natascha_db as ndb


def _stub_feedback(monkeypatch, meta):
    monkeypatch.setattr(
        nb.ndb,
        "get_klassen_feedback",
        lambda *a, **k: {"heatmap": [], "beispiele": [], "empfehlungen": [], "anzahl_abgaben": 3},
    )
    monkeypatch.setattr(nb, "_read_abgabe_meta", lambda *a, **k: meta)


def test_payload_is_v2(monkeypatch):
    _stub_feedback(monkeypatch, {"fach": "deutsch", "schulstufe": "oberstufe"})
    p = nb.build_bridge_payload("x.db", "6i", "SA2")
    assert p["schemaVersion"] == 2


def test_fachnormalisierung_erhaelt_sprach_und_sachfaecher() -> None:
    assert nb._normalize_fach("Geschichte") == "geschichte"
    assert nb._normalize_fach("Französisch") == "franzoesisch"
    assert nb._normalize_fach("Informatik und Künstliche Intelligenz") == "informatikki"
    assert nb._normalize_fach("unbekannt") is None


def test_schulstufe_und_land_normalisierung() -> None:
    assert nb._normalize_schulstufe_nummer("Klasse 7") == 7
    assert nb._normalize_stufe("7", "DE") == "unterstufe"
    assert nb._normalize_stufe("11", "DE") == "oberstufe"
    assert nb._normalize_land("de") == "DE"


def test_ausgangstext_passthrough(monkeypatch):
    _stub_feedback(monkeypatch, {"fach": "deutsch", "schulstufe": "oberstufe"})
    p = nb.build_bridge_payload("x.db", "6i", "SA2", ausgangstext="  Der Originaltext.  ")
    assert p["ausgangstext"] == "Der Originaltext."


def test_ausgangstext_from_abgabe_meta(monkeypatch):
    _stub_feedback(monkeypatch, {"fach": "deutsch", "ausgangstext": "Aus der DB."})
    p = nb.build_bridge_payload("x.db", "6i", "SA2")
    assert p["ausgangstext"] == "Aus der DB."


def test_ausgangstext_omitted_when_absent(monkeypatch):
    _stub_feedback(monkeypatch, {"fach": "englisch"})
    p = nb.build_bridge_payload("x.db", "6i", "SA2")
    assert "ausgangstext" not in p


def test_aufgabe_quelltext_roundtrip(tmp_path):
    db = tmp_path / "t.db"
    ndb.init_db(db)
    ndb.upsert_aufgabe_quelltext(db, "6i", "SA2", "  Mein Ausgangstext.  ")
    assert ndb.get_aufgabe_quelltext(db, "6i", "SA2") == "Mein Ausgangstext."
    ndb.upsert_aufgabe_quelltext(db, "6i", "SA2", "Neu.")  # überschreibt
    assert ndb.get_aufgabe_quelltext(db, "6i", "SA2") == "Neu."
    assert ndb.get_aufgabe_quelltext(db, "6i", "SA9") is None


def test_payload_reads_ausgangstext_from_table(tmp_path, monkeypatch):
    db = tmp_path / "t.db"
    ndb.init_db(db)
    ndb.upsert_aufgabe_quelltext(db, "6i", "SA2", "Aus der Tabelle.")
    monkeypatch.setattr(nb.ndb, "get_klassen_feedback", lambda *a, **k: {"heatmap": []})
    monkeypatch.setattr(nb, "_read_abgabe_meta", lambda *a, **k: {"fach": "deutsch"})
    p = nb.build_bridge_payload(db, "6i", "SA2")
    assert p["ausgangstext"] == "Aus der Tabelle."


def test_read_abgabe_meta_ergaenzt_klassenkontext(tmp_path):
    db = tmp_path / "shared.db"
    ndb.init_db(db)
    with sqlite3.connect(db) as conn:
        conn.execute(
            "CREATE TABLE lua_klassen (name TEXT PRIMARY KEY, fach TEXT, land TEXT, "
            "stufe TEXT, schulstufe INTEGER)"
        )
        conn.execute(
            "INSERT INTO lua_klassen VALUES ('7A', 'geschichte', 'DE', 'unterstufe', 7)"
        )
        conn.execute(
            "INSERT INTO abgabe (klasse, aufgabe, dateiname, datei_hash, fach, schulstufe, textsorte) "
            "VALUES ('7A', 'SA1', 'synthetic.docx', 'synthetic-hash', 'Englisch', '7', 'Comment')"
        )

    meta = nb._read_abgabe_meta(db, "7A", "SA1")
    assert nb._normalize_fach(meta["fach"]) == "englisch"  # konkrete Aufgabe vor Klassenfach
    assert nb._normalize_land(meta["land"]) == "DE"
    assert nb._normalize_schulstufe_nummer(meta["schulstufe"]) == 7
    assert meta["textsorte"] == "Comment"


def test_payload_reicht_fach_land_und_konkrete_schulstufe_durch(monkeypatch):
    _stub_feedback(
        monkeypatch,
        {
            "fach": "Geschichte",
            "land": "de",
            "stufe": "unterstufe",
            "schulstufe_nummer": 7,
        },
    )
    payload = nb.build_bridge_payload("x.db", "7A", "SA1")
    assert payload["fach"] == "geschichte"
    assert payload["land"] == "DE"
    assert payload["schulstufe"] == "unterstufe"
    assert payload["schulstufeNummer"] == 7
