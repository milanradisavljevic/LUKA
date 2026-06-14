"""Tests für natascha_bridge.py — Bridge-Export v2 (Ausgangstext-Durchreichung)."""

from __future__ import annotations

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
