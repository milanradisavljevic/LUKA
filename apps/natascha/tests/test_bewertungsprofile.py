"""Synthetische Profilprüfungen ohne Netzaufruf oder Produktivdatenbank."""

from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import bewertungsprofile as bp
import generate_feedback as gf
import natascha_core as nc
import natascha_db as db

ROOT = Path(__file__).resolve().parent.parent
RASTER = (ROOT / "rubrics/srdp_englisch_b2.md").read_text(encoding="utf-8")
TEXT = " ".join(["synthetisch"] * 100)
SCHLUESSEL = {"bestaetigt": True, "grenzen": [
    {"note": note, "abProzent": prozent}
    for note, prozent in enumerate([90, 80, 65, 50, 0], 1)
]}


def analyse(punkte=6, veto=False):
    return {
        "datei": "synthetisch.txt", "textsorte": "article", "fach": "Englisch",
        "schulstufe": "Oberstufe", "rubrik": "srdp_englisch_b2.md", "fehler": [],
        "bewertung": {k: {"stufe": 0 if veto else punkte, "punkte": 0 if veto else punkte,
                          "staerken": [], "schwaechen": [], "vorschlaege": []}
                      for k in (("task_achievement",) if veto else bp.KRITERIEN)},
        "srdp_veto": {"aufgabe_verfehlt": veto, "begruendung": "Synthetischer Aufgabenbeleg."},
    }


@pytest.mark.parametrize("punkte", [0, 1, 5, 6, 10])
@pytest.mark.parametrize("level", ["b1", "b2"])
def test_eigene_skala_und_kein_stiller_notenschluessel(punkte, level):
    raster = (ROOT / f"rubrics/srdp_englisch_{level}.md").read_text(encoding="utf-8")
    profil = bp.profil_fuer_raster(raster, "englisch")
    schema = nc.load_schema_for_mode(nc.load_config(), "benotet", raster, "englisch")
    data = analyse(punkte)
    assert nc.validate_against_schema(data, schema) == []
    result = bp.werte_profil_aus(data, profil, TEXT, 100)
    assert result["punkte"] == punkte * 4
    assert "notenempfehlung" not in data
    assert data["bewertungsprofil"]["skala_max"] == 10


def test_keine_profilwahl_aus_dateiname_oder_falschem_fach():
    assert bp.profil_fuer_raster("srdp_englisch_b2.md", "englisch") is None
    assert bp.profil_fuer_raster(RASTER, "Deutsch") is None
    assert bp.profil_fuer_raster(RASTER, "englisch", "de") is None


@pytest.mark.parametrize("delta,abzug", [(10, 0), (11, 1), (-10, 0), (-11, 1)])
def test_wortzahlgrenze_und_einmaliger_abzug(delta, abzug):
    data = analyse(8)
    result = bp.werte_profil_aus(data, "at-srdp-en-b2", "wort " * (100 + delta), 100)
    assert result["wortzahl_abzug"] == abzug
    assert result["punkte"] == 32 - abzug
    assert data["bewertung"]["task_achievement"]["punkte"] == 8


@pytest.mark.parametrize("punkte,note", [(0, 5), (5, 4), (6, 4), (8, 2), (10, 1)])
def test_individueller_bestaetigter_schluessel(punkte, note):
    data = analyse(punkte)
    bp.werte_profil_aus(data, "at-srdp-en-b2", TEXT, 100, SCHLUESSEL)
    assert data["notenempfehlung"]["note"] == note


@pytest.mark.parametrize("key", [
    {}, {**SCHLUESSEL, "bestaetigt": False},
    {"bestaetigt": True, "grenzen": [{"note": n, "abProzent": 50} for n in range(1, 6)]},
    {"bestaetigt": True, "grenzen": [{"note": n, "abProzent": float("nan")} for n in range(1, 6)]},
])
def test_ungueltige_schluessel_werden_abgewiesen(key):
    with pytest.raises(ValueError):
        bp.pruefe_notenschluessel(key)


def test_veto_ist_eigene_pruefpflicht_und_keine_erfundene_restbewertung():
    data = analyse(veto=True)
    schema = nc.load_schema_for_mode(nc.load_config(), "benotet", RASTER, "Englisch")
    assert nc.validate_against_schema(data, schema) == []
    result = bp.werte_profil_aus(data, "at-srdp-en-b2", TEXT, 100, SCHLUESSEL)
    assert result["punkte"] == 0
    assert "notenempfehlung" not in data
    assert result["pruefung_erforderlich"]
    data["bewertung"]["coherence_cohesion"] = analyse()["bewertung"]["coherence_cohesion"]
    assert nc.validate_against_schema(data, schema)


def test_fehlendes_kriterium_und_widerspruch_sind_keine_endwertung():
    schema = nc.load_schema_for_mode(nc.load_config(), "benotet", RASTER, "Englisch")
    data = analyse()
    del data["bewertung"]["coherence_cohesion"]
    assert nc.validate_against_schema(data, schema)
    data = analyse()
    data["bewertung"]["task_achievement"]["stufe"] = 5
    with pytest.raises(ValueError):
        bp.werte_profil_aus(data, "at-srdp-en-b2", TEXT, 100, SCHLUESSEL)


def test_scan_ohne_bestaetigte_abschrift_bekommt_keine_note():
    data = analyse(10)
    bp.werte_profil_aus(data, "at-srdp-en-b2", TEXT, 100, SCHLUESSEL, transkript_geprueft=False)
    assert "notenempfehlung" not in data


def test_serialisierter_produktionsaufruf_und_englisch_routing():
    calls = []
    def api(prompt, config, **kwargs):
        calls.append((prompt, kwargs["schema"]))
        return json.dumps(analyse(8))
    with patch.object(nc, "run_llm_api", side_effect=api), patch.object(nc, "ndb", None):
        result, errors = nc.run_llm_analysis(
            TEXT, RASTER, "Englisch", "Oberstufe", "article", nc.load_config(),
            soll_wortanzahl=100, notenschluessel=SCHLUESSEL,
        )
    assert result is not None, errors
    assert result["notenempfehlung"]["note"] == 2
    assert len(calls) == 1
    assert "ganzzahlige Punkte von 0 bis 10" in calls[0][0]
    assert "keine Werte außerhalb 1–5" not in calls[0][0]
    assert "lexical_range_accuracy" not in calls[0][0]
    assert "abProzent" not in calls[0][0]  # Schlüssel bleibt lokal.


def test_ungueltiger_schluessel_stoppt_vor_api():
    with patch.object(nc, "run_llm_api") as api:
        result, errors = nc.run_llm_analysis(
            TEXT, RASTER, "Englisch", "Oberstufe", "article", nc.load_config(),
            notenschluessel={"bestaetigt": False},
        )
    assert result is None and errors
    api.assert_not_called()


def test_vision_prompt_hat_dasselbe_profilschema():
    prompt = nc.build_vision_prompt(RASTER, "Englisch", "Oberstufe", "article", nc.load_config())
    assert "ganzzahlige Punkte von 0 bis 10" in prompt
    assert "keine Werte außerhalb 1–5" not in prompt


def test_daf_speichert_auch_bei_modellfehler_keine_note():
    data = json.loads((ROOT / "tests/fixtures/beispiel_deutsch_mit_fehlern.json").read_text(encoding="utf-8"))
    assert "notenempfehlung" in data
    with patch.object(nc, "run_llm_api", return_value=json.dumps(data)), patch.object(nc, "ndb", None):
        result, errors = nc.run_llm_analysis(
            TEXT, "Ein formativ verwendetes Sprachraster.", "daf", "Unterstufe", "Übung", nc.load_config(),
        )
    assert result is not None, errors
    assert "notenempfehlung" not in result


def test_statistikreihen_trennen_profilversionen_und_nullpunkte(tmp_path):
    path = tmp_path / "synthetisch.db"
    file = tmp_path / "synthetisch.txt"
    file.write_text(TEXT)
    data = analyse(0)
    bp.werte_profil_aus(data, "at-srdp-en-b2", TEXT, 100)
    db.init_db(path)
    abgabe_id = db.save_analysis_to_db(path, data, file, "PILOT", "A1", TEXT)
    with sqlite3.connect(path) as conn:
        rows = conn.execute("SELECT kriterium_name, stufe FROM kriterium_historie WHERE abgabe_id=?", (abgabe_id,)).fetchall()
    assert len(rows) == 4
    assert all(row[0].startswith("at-srdp-en-b2@2023.1::") and row[1] == 0 for row in rows)


def test_feedback_zeigt_profil_punkte_und_fehlenden_schluessel():
    data = analyse(8)
    bp.werte_profil_aus(data, "at-srdp-en-b2", TEXT, 100)
    document = gf.build_feedback_document(gf.parse_feedback_data(data))
    text = "\n".join(p.text for p in document.paragraphs)
    assert "32 / 40" in text
    assert "2023.1" in text
    assert "Keine automatische Notenempfehlung" in text
    assert "LEHRKRAFT-KOMMENTAR" not in text


def test_seed_aktualisiert_nur_unveraenderte_mitgelieferte_raster(tmp_path, monkeypatch):
    bundle = tmp_path / "bundle"
    target = tmp_path / "target"
    for root in (bundle, target):
        (root / "rubrics").mkdir(parents=True)
    name = "srdp_englisch_b2.md"
    monkeypatch.setitem(nc.LEGACY_RASTER_HASHES, name, hashlib.sha256(b"alt\n").hexdigest())
    (bundle / "rubrics" / name).write_text("neu\n")
    (target / "rubrics" / name).write_text("alt\n")
    nc._seed_data_dir(bundle, target)
    assert (target / "rubrics" / name).read_text() == "neu\n"
    (target / "rubrics" / name).write_text("eigene Anpassung\n")
    nc._seed_data_dir(bundle, target)
    assert (target / "rubrics" / name).read_text() == "eigene Anpassung\n"


def test_statistik_mischt_keine_profilfassung_in_legacy_kanon(tmp_path):
    path = tmp_path / "statistik.db"
    db.init_db(path)
    sid = db.insert_schueler(path, "PILOT", "Synthetic")
    for index, version in enumerate([None, "2023.1", "2023.2"]):
        aid = db.insert_abgabe(path, sid, "PILOT", f"A{index}", "synthetisch.txt", f"hash-{index}", note=2)
        key = f"at-srdp-en-b2@{version}::task_achievement" if version else "task_achievement"
        with sqlite3.connect(path) as conn:
            conn.execute("INSERT INTO kriterium_historie (abgabe_id,kriterium_name,stufe) VALUES (?,?,?)", (aid,key,10 if version else 4))
    averages = db.get_kriterien_durchschnitt(path, "PILOT")
    assert len(averages) == 3
    result = db.get_schueler_laengsschnitt(path, sid)
    assert [r["kriterien"]["inhalt"] for r in result["verlauf"]] == [4.0, None, None]
    result = db.get_klassen_statistik(path, "PILOT")
    assert result["stats"]["weakest_criterion"] is None
    assert result["stats"]["strongest_criterion"] is None


def test_json_integerwertige_dezimalzahlen_bleiben_gueltig():
    data = analyse(10.0)
    schema = nc.load_schema_for_mode(nc.load_config(), "benotet", RASTER, "Englisch")
    assert nc.validate_against_schema(data, schema) == []
    assert bp.werte_profil_aus(data, "at-srdp-en-b2", TEXT, 100)["punkte"] == 40


@pytest.mark.parametrize("raster,fach,land", [
    (RASTER.replace("bewertungsprofil: at-srdp-en-b2", "bewertungsprofil: at-srdp-en-b1"), "Englisch", "at"),
    (RASTER, "Deutsch", "at"), (RASTER, "Englisch", "de"),
])
def test_widerspruechliche_profilwahl_stoppt_vor_api(raster,fach,land):
    with patch.object(nc, "run_llm_api") as api:
        data, errors = nc.run_llm_analysis(TEXT,raster,fach,"Oberstufe","article",nc.load_config(),land=land)
    assert data is None and errors
    api.assert_not_called()
