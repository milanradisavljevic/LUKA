"""Tests fuer natascha_db.py – SQLite-Persistenz (Schueler, Abgaben, Heatmap, Export).

Nutzt eine temporaere Datei-DB pro Test (kein :memory:, da jede Funktion eine eigene
Connection oeffnet und die Daten ueber Aufrufe hinweg persistieren muessen).
"""

from __future__ import annotations

import sys
import sqlite3
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_db as db


def test_init_db_migrates_old_abgabe_link_columns(tmp_path: Path) -> None:
    p = tmp_path / "old.db"
    with sqlite3.connect(p) as conn:
        conn.execute(
            """CREATE TABLE abgabe (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                schueler_id INTEGER, klasse TEXT NOT NULL, aufgabe TEXT NOT NULL,
                dateiname TEXT NOT NULL, datei_hash TEXT UNIQUE NOT NULL,
                datum TIMESTAMP DEFAULT CURRENT_TIMESTAMP, rohtext TEXT, note REAL,
                gesamtstufe REAL, feedback_json_path TEXT, wortanzahl INTEGER,
                fach TEXT, schulstufe TEXT, textsorte TEXT, rubrik TEXT
            )"""
        )
    db.init_db(p)
    with sqlite3.connect(p) as conn:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(abgabe)")}
    assert {"unterrichtseinsatz_id", "material_id"} <= columns


@pytest.fixture()
def db_path(tmp_path: Path) -> Path:
    p = tmp_path / "test_schuljahr.db"
    db.init_db(p)
    return p


# ── Schueler CRUD ──────────────────────────────────────────────────────────


def test_insert_and_get_schueler(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Sophie", "Huber")
    assert sid > 0
    rows = db.get_schueler_by_klasse(db_path, "6A")
    assert len(rows) == 1
    assert rows[0]["vorname"] == "Sophie"
    assert rows[0]["nachname"] == "Huber"


def test_get_schueler_by_klasse_sorted_and_isolated(db_path: Path) -> None:
    db.insert_schueler(db_path, "6A", "Tom")
    db.insert_schueler(db_path, "6A", "Anna")
    db.insert_schueler(db_path, "6B", "Zoe")
    rows = db.get_schueler_by_klasse(db_path, "6A")
    assert [r["vorname"] for r in rows] == ["Anna", "Tom"]  # nach Vorname sortiert
    assert len(db.get_schueler_by_klasse(db_path, "6B")) == 1


def test_get_schueler_by_name_case_insensitive(db_path: Path) -> None:
    db.insert_schueler(db_path, "6A", "Sophie", "Huber")
    found = db.get_schueler_by_name(db_path, "6A", "sophie", "HUBER")
    assert found is not None
    assert found["vorname"] == "Sophie"
    assert db.get_schueler_by_name(db_path, "6A", "Niemand") is None


def test_delete_schueler(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Max")
    db.delete_schueler(db_path, sid)
    assert db.get_schueler_by_klasse(db_path, "6A") == []


def test_import_schueler_csv(tmp_path: Path, db_path: Path) -> None:
    csv_file = tmp_path / "klasse.csv"
    csv_file.write_text(
        "vorname,nachname\nSophie,Huber\nMax,Mustermann\n,LeerVorname\n",
        encoding="utf-8",
    )
    count = db.import_schueler_csv(db_path, csv_file, "6A")
    assert count == 2  # Zeile ohne Vorname wird uebersprungen
    # Idempotenz: erneuter Import legt keine Duplikate an
    assert db.import_schueler_csv(db_path, csv_file, "6A") == 0
    assert len(db.get_schueler_by_klasse(db_path, "6A")) == 2


# ── Abgabe + Duplikat-Erkennung ────────────────────────────────────────────


def test_insert_abgabe_and_hash_lookup(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Sophie")
    aid = db.insert_abgabe(
        db_path, sid, "6A", "SA1", "sophie.docx", "hash123", note=2.0, gesamtstufe=4.0
    )
    assert aid > 0
    found = db.get_abgabe_by_hash(db_path, "hash123")
    assert found is not None
    assert found["dateiname"] == "sophie.docx"
    assert found["note"] == 2.0
    assert db.get_abgabe_by_hash(db_path, "fehlt") is None


def test_get_abgaben_by_schueler_and_klasse_aufgabe(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Sophie")
    db.insert_abgabe(db_path, sid, "6A", "SA1", "a.docx", "h1")
    db.insert_abgabe(db_path, sid, "6A", "SA2", "b.docx", "h2")
    assert len(db.get_abgaben_by_schueler(db_path, sid)) == 2
    assert len(db.get_abgaben_by_klasse_aufgabe(db_path, "6A", "SA1")) == 1


# ── Kriterien + Fehler + Heatmap ───────────────────────────────────────────


def test_fehler_heatmap_aggregation(db_path: Path) -> None:
    aid = db.insert_abgabe(db_path, None, "6A", "SA1", "x.docx", "hh")
    for typ in ["Z", "Z", "Z", "R", "G"]:
        db.insert_fehler(db_path, aid, "zitat", "korr", typ)
    heat = db.get_fehler_heatmap(db_path, "6A")
    assert heat[0]["typ"] == "Z"  # haeufigster zuerst
    assert heat[0]["anzahl"] == 3
    assert heat[0]["prozent"] == 60.0  # 3 von 5
    # min_vorkommen filtert seltene Typen
    only_frequent = db.get_fehler_heatmap(db_path, "6A", min_vorkommen=2)
    assert [h["typ"] for h in only_frequent] == ["Z"]


def test_fehler_heatmap_detail_with_aufgabe(db_path: Path) -> None:
    """Regressionstest: aufgabe-Zweig referenzierte frueher das nicht existierende
    abgabe.vorname und warf OperationalError."""
    sid = db.insert_schueler(db_path, "6A", "Sophie")
    aid = db.insert_abgabe(db_path, sid, "6A", "SA1", "x.docx", "hh")
    db.insert_fehler(db_path, aid, "das Haus", "das Haus,", "Z", "Komma fehlt")
    detail = db.get_fehler_heatmap_detail(db_path, "6A", "Z", aufgabe="SA1")
    assert len(detail) == 1
    assert detail[0]["vorname"] == "Sophie"
    assert detail[0]["zitat"] == "das Haus"


def test_insert_kriterium(db_path: Path) -> None:
    aid = db.insert_abgabe(db_path, None, "6A", "SA1", "x.docx", "hh")
    db.insert_kriterium(db_path, aid, "Inhalt", 4.0, 0.25)
    # kein Fehler => Insert erfolgreich; Auslesen ueber direkte Connection
    import sqlite3

    with sqlite3.connect(str(db_path)) as conn:
        n = conn.execute("SELECT COUNT(*) FROM kriterium_historie").fetchone()[0]
    assert n == 1


# ── CSV-Export ─────────────────────────────────────────────────────────────


def test_export_noten_csv(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Sophie", "Huber")
    db.insert_abgabe(
        db_path, sid, "6A", "SA1", "s.docx", "h1", note=2.0, gesamtstufe=4.0,
        fach="Deutsch", textsorte="Kommentar",
    )
    csv_str = db.export_noten_csv(db_path, "6A")
    lines = csv_str.strip().split("\n")
    assert lines[0].startswith("Nachname;Vorname;Aufgabe")
    assert "Huber;Sophie;SA1" in lines[1]


# ── End-to-end: save_analysis_to_db ────────────────────────────────────────


def test_save_analysis_to_db(tmp_path: Path, db_path: Path) -> None:
    docx = tmp_path / "sophie.docx"
    docx.write_bytes(b"dummy-inhalt")  # echter Hash wird ueber Dateiinhalt gebildet
    data = {
        "datei": "sophie.docx",
        "schueler": "Sophie Huber",
        "fach": "Deutsch",
        "schulstufe": "Oberstufe",
        "textsorte": "Kommentar",
        "rubrik": "kommentar.md",
        "notenempfehlung": {"note": 2, "durchschnitt": 4.0},
        "bewertung": {"Inhalt": {"stufe": 4, "gewicht": 25}},
        "fehler": [{"zitat": "Haus", "korrektur": "das Haus", "typ": "Z", "erklaerung": ""}],
    }
    aid = db.save_analysis_to_db(db_path, data, docx, "6A", "SA1", rohtext="Text", wortanzahl=120)
    assert aid > 0
    # Schueler wurde angelegt
    assert db.get_schueler_by_name(db_path, "6A", "Sophie", "Huber") is not None
    # Abgabe + Fehler + Kriterium persistiert
    abg = db.get_abgaben_by_klasse_aufgabe(db_path, "6A", "SA1")
    assert len(abg) == 1 and abg[0]["note"] == 2.0
    assert db.get_fehler_heatmap(db_path, "6A")[0]["typ"] == "Z"
    # Duplikat-Schutz: zweiter identischer Aufruf liefert -1
    assert db.save_analysis_to_db(db_path, data, docx, "6A", "SA1") == -1


# ── Lehrer-Feedback CRUD ───────────────────────────────────────────────────


def test_upsert_lehrer_feedback_insert_and_update(db_path: Path) -> None:
    aid = db.insert_abgabe(db_path, None, "6A", "SA1", "test.docx", "hash123")
    # Insert
    lf_id = db.upsert_lehrer_feedback(
        db_path, aid, "6A", "SA1", note_final=3.0, note_app_snapshot=2.0,
        lehrer_kommentar="Gut gemacht", schueler_id=None,
    )
    assert lf_id > 0
    lf = db.get_lehrer_feedback(db_path, aid)
    assert lf is not None
    assert lf["note_final"] == 3.0
    assert lf["note_app_snapshot"] == 2.0
    assert lf["lehrer_kommentar"] == "Gut gemacht"
    # Update dieselbe Zeile (kein zweiter Datensatz)
    lf_id2 = db.upsert_lehrer_feedback(
        db_path, aid, "6A", "SA1", note_final=4.0,
        lehrer_kommentar="Noch besser",
    )
    assert lf_id2 == lf_id
    lf2 = db.get_lehrer_feedback(db_path, aid)
    assert lf2["note_final"] == 4.0
    assert lf2["lehrer_kommentar"] == "Noch besser"


def test_upsert_lehrer_feedback_kommentar_only_laesst_snapshot_stehen(db_path: Path) -> None:
    aid = db.insert_abgabe(db_path, None, "6A", "SA1", "test.docx", "hash456")
    db.upsert_lehrer_feedback(
        db_path, aid, "6A", "SA1", note_final=2.0, note_app_snapshot=2.5,
        lehrer_kommentar="Erste Bewertung",
    )
    # Nur Kommentar ändern, note_app_snapshot=None
    db.upsert_lehrer_feedback(
        db_path, aid, "6A", "SA1", note_final=2.0,
        lehrer_kommentar="Kommentar korrigiert",
    )
    lf = db.get_lehrer_feedback(db_path, aid)
    # Snapshot soll erhalten bleiben (COALESCE)
    assert lf["note_app_snapshot"] == 2.5
    assert lf["lehrer_kommentar"] == "Kommentar korrigiert"


def test_has_lehrer_feedback_for_file_true_false(db_path: Path) -> None:
    aid1 = db.insert_abgabe(db_path, None, "6A", "SA1", "a.docx", "hashA")
    aid2 = db.insert_abgabe(db_path, None, "6A", "SA1", "b.docx", "hashB")
    db.upsert_lehrer_feedback(db_path, aid1, "6A", "SA1", note_final=3.0)
    # Feedback ohne note_final soll False liefern
    db.upsert_lehrer_feedback(db_path, aid2, "6A", "SA1", note_final=None)
    assert db.has_lehrer_feedback_for_file(db_path, "hashA") is True
    assert db.has_lehrer_feedback_for_file(db_path, "hashB") is False
    assert db.has_lehrer_feedback_for_file(db_path, "hashC") is False


def test_get_lehrer_feedback_by_hash(db_path: Path) -> None:
    aid = db.insert_abgabe(db_path, None, "6A", "SA1", "test.docx", "hash789")
    db.upsert_lehrer_feedback(
        db_path, aid, "6A", "SA1", note_final=1.0,
        lehrer_kommentar="Exzellent", note_app_snapshot=1.0,
    )
    lf = db.get_lehrer_feedback_by_hash(db_path, "hash789")
    assert lf is not None
    assert lf["note_final"] == 1.0
    assert lf["lehrer_kommentar"] == "Exzellent"
    assert db.get_lehrer_feedback_by_hash(db_path, "unbekannt") is None


# ── Schueler-Profil CRUD ───────────────────────────────────────────────────


def test_save_schueler_profil_and_load(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Lena", "Mueller")
    profil = {"kurzbild": "Lernt gut", "staerken": ["Lesen"], "foerderbereiche": []}
    pid = db.save_schueler_profil(db_path, sid, profil, basis_anzahl_abgaben=3, modell="test-model")
    assert pid > 0

    loaded = db.get_latest_schueler_profil(db_path, sid)
    assert loaded is not None
    assert loaded["profil"] == profil
    assert loaded["basis_anzahl_abgaben"] == 3
    assert loaded["modell"] == "test-model"
    assert "erstellt_am" in loaded


def test_schueler_profil_historie_neueste_zuerst(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Tom", "Test")
    db.save_schueler_profil(db_path, sid, {"v": 1}, basis_anzahl_abgaben=1)
    db.save_schueler_profil(db_path, sid, {"v": 2}, basis_anzahl_abgaben=2)
    db.save_schueler_profil(db_path, sid, {"v": 3}, basis_anzahl_abgaben=3)

    hist = db.get_schueler_profil_historie(db_path, sid)
    assert len(hist) == 3
    assert [h["profil"]["v"] for h in hist] == [3, 2, 1]

    latest = db.get_latest_schueler_profil(db_path, sid)
    assert latest is not None
    assert latest["profil"]["v"] == 3


def test_schueler_profil_json_roundtrip_umlaute(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "ÄÖÜ", "Tester")
    profil = {
        "kurzbild": "Könnte üben: Äußerung",
        "staerken": ["Überflieger"],
        "foerderbereiche": [{"kategorie": "Äußere Form", "befund": "Öfter", "uebung": "Übung"}],
    }
    db.save_schueler_profil(db_path, sid, profil, basis_anzahl_abgaben=5)
    loaded = db.get_latest_schueler_profil(db_path, sid)
    assert loaded is not None
    assert loaded["profil"]["kurzbild"] == "Könnte üben: Äußerung"
    assert loaded["profil"]["staerken"] == ["Überflieger"]
    assert loaded["profil"]["foerderbereiche"][0]["kategorie"] == "Äußere Form"


def test_get_latest_schueler_profil_none_when_empty(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Leer", "Test")
    assert db.get_latest_schueler_profil(db_path, sid) is None
    assert db.get_schueler_profil_historie(db_path, sid) == []


# ── Klassen-Aggregationen (K1/K3, Noten, Kalibrierung, Trend) ───────────────


def _seed_klassen_data(db_path: Path) -> tuple[int, int, int, int, int]:
    """Erzeugt 2 Schüler, 3 Abgaben, Kriterien, Fehler, Lehrer-Feedback."""
    s1 = db.insert_schueler(db_path, "6A", "Anna", "Test")
    s2 = db.insert_schueler(db_path, "6A", "Ben", "Test")
    # Abgaben
    a1 = db.insert_abgabe(db_path, s1, "6A", "SA1", "a1.docx", "h1", note=3.0)
    a2 = db.insert_abgabe(db_path, s2, "6A", "SA1", "a2.docx", "h2", note=4.0)
    a3 = db.insert_abgabe(db_path, s1, "6A", "SA2", "a3.docx", "h3", note=2.0)
    # Kriterien für a1 (Anna, SA1)
    db.insert_kriterium(db_path, a1, "inhalt", 3.0, 0.3)
    db.insert_kriterium(db_path, a1, "textstruktur", 2.0, 0.3)
    db.insert_kriterium(db_path, a1, "ausdruck", 4.0, 0.2)
    db.insert_kriterium(db_path, a1, "sprachrichtigkeit", 3.0, 0.2)
    # Kriterien für a2 (Ben, SA1)
    db.insert_kriterium(db_path, a2, "inhalt", 4.0, 0.3)
    db.insert_kriterium(db_path, a2, "textstruktur", 4.0, 0.3)
    db.insert_kriterium(db_path, a2, "ausdruck", 2.0, 0.2)
    db.insert_kriterium(db_path, a2, "sprachrichtigkeit", 2.0, 0.2)
    # Kriterien für a3 (Anna, SA2) – interpretation soll auf inhalt mappen
    db.insert_kriterium(db_path, a3, "interpretation", 2.0, 0.3)
    db.insert_kriterium(db_path, a3, "einleitung_aufbau", 3.0, 0.3)
    db.insert_kriterium(db_path, a3, "ausdruck", 3.0, 0.2)
    db.insert_kriterium(db_path, a3, "sprachrichtigkeit", 3.0, 0.2)
    # Fehler
    db.insert_fehler(db_path, a1, "f1", "k1", "Z")
    db.insert_fehler(db_path, a2, "f2", "k2", "G")
    # Lehrer-Feedback (nur a1)
    db.upsert_lehrer_feedback(db_path, a1, "6A", "SA1", note_final=2.0, note_app_snapshot=3.0)
    return s1, s2, a1, a2, a3


def test_get_klassen_k1_k3_berechnet_korrekt(db_path: Path) -> None:
    _seed_klassen_data(db_path)
    result = db.get_klassen_k1_k3(db_path, "6A")
    assert result["k1"]["count"] == 3
    assert result["k3"]["count"] == 3
    # K1: a1=(3+2)/2=2.5, a2=(4+4)/2=4.0, a3=(2+3)/2=2.5 → Ø=3.0
    assert result["k1"]["avg"] == 3.0
    # K3: a1=(4+3)/2=3.5, a2=(2+2)/2=2.0, a3=(3+3)/2=3.0 → Ø=2.83
    assert result["k3"]["avg"] == pytest.approx(2.83, abs=0.01)


def test_get_klassen_k1_k3_mit_aufgabenfilter(db_path: Path) -> None:
    _seed_klassen_data(db_path)
    result = db.get_klassen_k1_k3(db_path, "6A", aufgabe="SA1")
    assert result["k1"]["count"] == 2
    assert result["k3"]["count"] == 2


def test_get_klassen_k1_k3_interpretation_fliesst_in_k1(db_path: Path) -> None:
    """interpretation -> inhalt (K1), einleitung_aufbau -> textstruktur (K1)."""
    _seed_klassen_data(db_path)
    result = db.get_klassen_k1_k3(db_path, "6A", aufgabe="SA2")
    # a3: interpretation=2.0, einleitung_aufbau=3.0 → K1=(2+3)/2=2.5
    assert result["k1"]["avg"] == 2.5
    assert result["k1"]["count"] == 1


def test_get_notenverteilung_mit_lehrer_fallback(db_path: Path) -> None:
    _seed_klassen_data(db_path)
    vert = db.get_notenverteilung(db_path, "6A")
    # a1: lehrer=2.0 (statt app=3.0), a2: app=4.0, a3: app=2.0
    assert vert[2] == 2  # a1 (lehrer) + a3
    assert vert[4] == 1  # a2
    assert vert[1] == 0
    assert vert[3] == 0
    assert vert[5] == 0


def test_get_notenverteilung_mit_aufgabenfilter(db_path: Path) -> None:
    _seed_klassen_data(db_path)
    vert = db.get_notenverteilung(db_path, "6A", aufgabe="SA1")
    # a1: lehrer=2.0, a2: app=4.0
    assert vert[2] == 1
    assert vert[4] == 1


def test_get_klassen_kalibrierung(db_path: Path) -> None:
    _seed_klassen_data(db_path)
    kal = db.get_klassen_kalibrierung(db_path, "6A")
    assert kal["n_mit_feedback"] == 1
    assert kal["n_gesamt"] == 3
    assert kal["app_avg"] == 3.0
    assert kal["lehrer_avg"] == 2.0
    assert kal["diff"] == -1.0
    assert kal["tendenz"] == "app milder"


def test_get_klassen_kalibrierung_mit_aufgabenfilter(db_path: Path) -> None:
    """Regression: a.aufgabe im WHERE muss korrekt auf 'aufgabe' gemappt werden."""
    _seed_klassen_data(db_path)
    kal = db.get_klassen_kalibrierung(db_path, "6A", aufgabe="SA1")
    assert kal["n_mit_feedback"] == 1
    assert kal["n_gesamt"] == 2


def test_get_klassen_trend_chronologisch(db_path: Path) -> None:
    _seed_klassen_data(db_path)
    trend = db.get_klassen_trend(db_path, "6A")
    assert len(trend) == 2
    assert trend[0]["aufgabe"] == "SA1"
    assert trend[0]["n"] == 2
    assert trend[0]["avg_note_app"] == 3.5  # (3+4)/2
    assert trend[0]["avg_note_lehrer"] == 2.0  # nur a1
    assert trend[0]["n_mit_feedback"] == 1
    assert trend[1]["aufgabe"] == "SA2"
    assert trend[1]["n"] == 1
    assert trend[1]["avg_note_app"] == 2.0
    assert trend[1]["avg_note_lehrer"] is None
    assert trend[1]["n_mit_feedback"] == 0


# ── Klassen-Briefing CRUD ──────────────────────────────────────────────────


def test_save_klassen_briefing_and_load(db_path: Path) -> None:
    briefing = {"kurzbild": "Test", "schwerpunkte": []}
    bid = db.save_klassen_briefing(
        db_path, "6A", "SA1", briefing, basis_anzahl_abgaben=10, basis_anzahl_fehler=5
    )
    assert bid > 0
    loaded = db.get_latest_klassen_briefing(db_path, "6A", "SA1")
    assert loaded is not None
    assert loaded["briefing"] == briefing
    assert loaded["basis_anzahl_abgaben"] == 10
    assert loaded["basis_anzahl_fehler"] == 5
    assert loaded["klasse"] == "6A"
    assert loaded["aufgabe"] == "SA1"


def test_klassen_briefing_historie_neueste_zuerst(db_path: Path) -> None:
    db.save_klassen_briefing(db_path, "6A", "SA1", {"v": 1}, 1, 1)
    db.save_klassen_briefing(db_path, "6A", "SA1", {"v": 2}, 2, 2)
    db.save_klassen_briefing(db_path, "6A", "SA1", {"v": 3}, 3, 3)
    hist = db.get_klassen_briefing_historie(db_path, "6A", "SA1")
    assert len(hist) == 3
    assert [h["briefing"]["v"] for h in hist] == [3, 2, 1]


def test_klassen_briefing_json_roundtrip_umlaute(db_path: Path) -> None:
    briefing = {"kurzbild": "Könnte üben: Äußerung", "schwerpunkte": [{"bereich": "Äußere Form"}]}
    db.save_klassen_briefing(db_path, "6A", None, briefing, 5, 3)
    loaded = db.get_latest_klassen_briefing(db_path, "6A")
    assert loaded is not None
    assert loaded["briefing"]["kurzbild"] == "Könnte üben: Äußerung"
    assert loaded["briefing"]["schwerpunkte"][0]["bereich"] == "Äußere Form"


def test_get_latest_klassen_briefing_none_when_empty(db_path: Path) -> None:
    assert db.get_latest_klassen_briefing(db_path, "6A") is None
    assert db.get_klassen_briefing_historie(db_path, "6A") == []


def test_klassen_briefing_filter_by_aufgabe(db_path: Path) -> None:
    db.save_klassen_briefing(db_path, "6A", "SA1", {"a": 1}, 1, 1)
    db.save_klassen_briefing(db_path, "6A", "SA2", {"a": 2}, 2, 2)
    latest_sa1 = db.get_latest_klassen_briefing(db_path, "6A", "SA1")
    latest_sa2 = db.get_latest_klassen_briefing(db_path, "6A", "SA2")
    assert latest_sa1["briefing"]["a"] == 1
    assert latest_sa2["briefing"]["a"] == 2


# ── get_klassen_statistik ─────────────────────────────────────────────────


def test_get_klassen_statistik_leer(db_path: Path) -> None:
    """Leere DB liefert total=0 und progress=[]."""
    result = db.get_klassen_statistik(db_path, "6A")
    assert result["stats"]["total"] == 0
    assert result["stats"]["grade_distribution"] == {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    assert result["stats"]["grade_average"] == 0.0
    assert result["stats"]["criteria_averages"] == {}
    assert result["stats"]["weakest_criterion"] is None
    assert result["stats"]["strongest_criterion"] is None
    assert result["progress"] == []


def test_get_klassen_statistik_notenverteilung(db_path: Path) -> None:
    """3 Abgaben mit Noten 2, 3, 4 → total=3, grade_average korrekt."""
    db.insert_abgabe(db_path, None, "6A", "SA1", "a.docx", "h1", note=2.0)
    db.insert_abgabe(db_path, None, "6A", "SA1", "b.docx", "h2", note=3.0)
    db.insert_abgabe(db_path, None, "6A", "SA1", "c.docx", "h3", note=4.0)

    result = db.get_klassen_statistik(db_path, "6A")
    stats = result["stats"]

    assert stats["total"] == 3
    assert stats["grade_distribution"][2] == 1
    assert stats["grade_distribution"][3] == 1
    assert stats["grade_distribution"][4] == 1
    assert stats["grade_average"] == pytest.approx(3.0, abs=0.01)


def test_get_klassen_statistik_kriterien(db_path: Path) -> None:
    """2 Abgaben mit inhalt- und sprachrichtigkeit-Kriterien → weakest/strongest korrekt."""
    a1 = db.insert_abgabe(db_path, None, "6A", "SA1", "a.docx", "h1", note=3.0)
    a2 = db.insert_abgabe(db_path, None, "6A", "SA1", "b.docx", "h2", note=3.0)
    db.insert_kriterium(db_path, a1, "inhalt", 2.0, 0.3)
    db.insert_kriterium(db_path, a2, "inhalt", 4.0, 0.3)
    db.insert_kriterium(db_path, a1, "sprachrichtigkeit", 1.0, 0.2)
    db.insert_kriterium(db_path, a2, "sprachrichtigkeit", 3.0, 0.2)

    result = db.get_klassen_statistik(db_path, "6A")
    stats = result["stats"]

    assert "inhalt" in stats["criteria_averages"]
    assert "sprachrichtigkeit" in stats["criteria_averages"]
    assert stats["criteria_averages"]["inhalt"]["avg"] == pytest.approx(3.0, abs=0.01)
    assert stats["criteria_averages"]["inhalt"]["count"] == 2
    assert stats["criteria_averages"]["sprachrichtigkeit"]["avg"] == pytest.approx(2.0, abs=0.01)
    assert stats["weakest_criterion"] == "sprachrichtigkeit"
    assert stats["strongest_criterion"] == "inhalt"


def test_get_klassen_statistik_progress(db_path: Path) -> None:
    """Abgaben in 2 Aufgaben → progress hat 2 Einträge mit avg_note und avg_criteria."""
    a1 = db.insert_abgabe(db_path, None, "6A", "SA1", "a.docx", "h1", note=2.0)
    a2 = db.insert_abgabe(db_path, None, "6A", "SA2", "b.docx", "h2", note=4.0)
    db.insert_kriterium(db_path, a1, "inhalt", 4.0, 0.3)
    db.insert_kriterium(db_path, a2, "inhalt", 2.0, 0.3)

    result = db.get_klassen_statistik(db_path, "6A")
    progress = result["progress"]

    assert len(progress) == 2
    aufgaben = [e["aufgabe"] for e in progress]
    assert "SA1" in aufgaben
    assert "SA2" in aufgaben

    sa1 = next(e for e in progress if e["aufgabe"] == "SA1")
    sa2 = next(e for e in progress if e["aufgabe"] == "SA2")

    assert sa1["label"] == "SA1"
    assert sa1["avg_note"] == pytest.approx(2.0, abs=0.01)
    assert sa1["n"] == 1
    assert sa1["avg_criteria"]["inhalt"] == pytest.approx(4.0, abs=0.01)

    assert sa2["label"] == "SA2"
    assert sa2["avg_note"] == pytest.approx(4.0, abs=0.01)
    assert sa2["n"] == 1
    assert sa2["avg_criteria"]["inhalt"] == pytest.approx(2.0, abs=0.01)
