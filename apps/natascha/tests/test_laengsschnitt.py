"""Tests für den Schüler-Längsschnitt (Lernverlauf-Aggregation) + DSGVO-Prompt-Entwurf.

Deckt natascha_db.get_schueler_laengsschnitt() (Schicht 1) und
natascha_core.build_schueler_profil_prompt() (Schicht 3, Entwurf) ab.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc
import natascha_db as db


@pytest.fixture()
def db_path(tmp_path: Path) -> Path:
    p = tmp_path / "test_laengsschnitt.db"
    db.init_db(p)
    return p


def _abgabe_mit_kriterien(
    db_path: Path,
    schueler_id: int,
    aufgabe: str,
    datei_hash: str,
    note_app: float,
    kriterien: dict[str, float],
    note_lehrer: float | None = None,
) -> int:
    """Hilfsfunktion: legt Abgabe + Kriterien (+ optional Lehrer-Note) an."""
    aid = db.insert_abgabe(
        db_path, schueler_id, "6A", aufgabe, f"{aufgabe}.docx", datei_hash,
        note=note_app, schulstufe="Oberstufe",
    )
    for name, stufe in kriterien.items():
        db.insert_kriterium(db_path, aid, name, stufe, 0.25)
    if note_lehrer is not None:
        db.upsert_lehrer_feedback(
            db_path, aid, "6A", aufgabe, note_final=note_lehrer,
            note_app_snapshot=note_app, schueler_id=schueler_id,
        )
    return aid


# ── Trend: Kriterien steigend → Note sinkt → "steigt" (Verbesserung) ────────


def test_trend_verbesserung_note_sinkt_ist_steigt(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Test")
    # Drei Arbeiten: Kriterien steigen (3→4→5), App-Note sinkt (4→3→2 = besser)
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 4.0,
                          {"inhalt": 3, "textstruktur": 3, "ausdruck": 3, "sprachrichtigkeit": 3})
    _abgabe_mit_kriterien(db_path, sid, "SA2", "h2", 3.0,
                          {"inhalt": 4, "textstruktur": 4, "ausdruck": 4, "sprachrichtigkeit": 4})
    _abgabe_mit_kriterien(db_path, sid, "SA3", "h3", 2.0,
                          {"inhalt": 5, "textstruktur": 5, "ausdruck": 5, "sprachrichtigkeit": 5})

    ls = db.get_schueler_laengsschnitt(db_path, sid)
    assert ls["anzahl_abgaben"] == 3
    # Note sinkt 4→2 = Verbesserung = "steigt" (Invertierung!)
    assert ls["trend"]["note_app"]["start"] == 4.0
    assert ls["trend"]["note_app"]["ende"] == 2.0
    assert ls["trend"]["note_app"]["richtung"] == "steigt"
    # Kriterien-Stufe steigt 3→5 = Verbesserung = "steigt"
    assert ls["trend"]["inhalt"]["richtung"] == "steigt"
    assert ls["trend"]["k1"]["richtung"] == "steigt"
    assert ls["trend"]["k3"]["richtung"] == "steigt"
    # K1/K3 korrekt gemittelt
    assert ls["verlauf"][0]["k1"] == 3.0
    assert ls["verlauf"][-1]["k3"] == 5.0


def test_trend_verschlechterung_und_stabil(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Test")
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 2.0,
                          {"inhalt": 5, "textstruktur": 5, "ausdruck": 5, "sprachrichtigkeit": 5})
    _abgabe_mit_kriterien(db_path, sid, "SA2", "h2", 4.0,
                          {"inhalt": 3, "textstruktur": 3, "ausdruck": 3, "sprachrichtigkeit": 3})
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    # Note steigt 2→4 = Verschlechterung = "faellt"
    assert ls["trend"]["note_app"]["richtung"] == "faellt"
    # Kriterien sinken 5→3 = Verschlechterung = "faellt"
    assert ls["trend"]["inhalt"]["richtung"] == "faellt"


# ── Kalibrierung (App vs. Lehrer) ───────────────────────────────────────────


def test_kalibrierung_app_strenger(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Test")
    # App benotet strenger (höhere Zahl) als die Lehrkraft
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 4.0,
                          {"inhalt": 3, "textstruktur": 3, "ausdruck": 3, "sprachrichtigkeit": 3},
                          note_lehrer=3.0)
    _abgabe_mit_kriterien(db_path, sid, "SA2", "h2", 3.0,
                          {"inhalt": 4, "textstruktur": 4, "ausdruck": 4, "sprachrichtigkeit": 4},
                          note_lehrer=2.0)
    # Eine Arbeit ohne Lehrer-Note → zählt nicht zu den Paaren
    _abgabe_mit_kriterien(db_path, sid, "SA3", "h3", 2.0,
                          {"inhalt": 5, "textstruktur": 5, "ausdruck": 5, "sprachrichtigkeit": 5})
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    kal = ls["kalibrierung"]
    assert kal["paare"] == 2
    assert kal["mittlere_abweichung"] == 1.0  # |4-3| und |3-2| → Ø 1.0
    assert kal["tendenz"] == "app strenger"
    # note_lehrer im Verlauf vorhanden bzw. None
    assert ls["verlauf"][0]["note_lehrer"] == 3.0
    assert ls["verlauf"][2]["note_lehrer"] is None


def test_kalibrierung_ohne_lehrernoten(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Test")
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 3.0,
                          {"inhalt": 4, "textstruktur": 4, "ausdruck": 4, "sprachrichtigkeit": 4})
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    assert ls["kalibrierung"]["paare"] == 0
    assert ls["kalibrierung"]["mittlere_abweichung"] is None
    assert ls["kalibrierung"]["tendenz"] == "n/a"


# ── Robustheit ──────────────────────────────────────────────────────────────


def test_eine_abgabe_kein_crash(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Solo")
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 3.0,
                          {"inhalt": 4, "textstruktur": 4, "ausdruck": 3, "sprachrichtigkeit": 3})
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    assert ls["anzahl_abgaben"] == 1
    # start == ende, richtung stabil bei n=1
    assert ls["trend"]["note_app"]["start"] == ls["trend"]["note_app"]["ende"] == 3.0
    assert ls["trend"]["note_app"]["richtung"] == "stabil"
    assert ls["trend"]["inhalt"]["richtung"] == "stabil"


def test_fehlende_kriterien_geben_none(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Test")
    # Nur Inhalt + Ausdruck, kein textstruktur/sprachrichtigkeit
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 3.0,
                          {"inhalt": 4, "ausdruck": 3})
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    krit = ls["verlauf"][0]["kriterien"]
    assert krit["inhalt"] == 4.0
    assert krit["textstruktur"] is None
    assert krit["sprachrichtigkeit"] is None
    # k1 = Mittel aus inhalt(4) + textstruktur(None) → 4.0; k3 = ausdruck(3) → 3.0
    assert ls["verlauf"][0]["k1"] == 4.0
    assert ls["verlauf"][0]["k3"] == 3.0


def test_englische_kriteriumsnamen_werden_gemappt(db_path: Path) -> None:
    """KEY_VARIANTS: englische Rubrik-Schlüssel müssen auf die vier Kanon-Kriterien mappen."""
    sid = db.insert_schueler(db_path, "6A", "Test")
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 3.0,
                          {"task_achievement": 5, "organisation_layout": 4,
                           "lexical_range_accuracy": 3, "grammatical_range_accuracy": 2})
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    krit = ls["verlauf"][0]["kriterien"]
    assert krit["inhalt"] == 5.0
    assert krit["textstruktur"] == 4.0
    assert krit["ausdruck"] == 3.0
    assert krit["sprachrichtigkeit"] == 2.0


# ── Fehlerschwerpunkte ──────────────────────────────────────────────────────


def test_fehlerschwerpunkte_sortiert_und_dedupliziert(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6A", "Test")
    aid1 = _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 3.0, {"inhalt": 4})
    aid2 = _abgabe_mit_kriterien(db_path, sid, "SA2", "h2", 3.0, {"inhalt": 4})
    # Z dreimal (einmal dupliziertes Zitat), R einmal
    db.insert_fehler(db_path, aid1, "das Haus", "das Haus,", "Z", "Komma")
    db.insert_fehler(db_path, aid1, "das Haus", "das Haus,", "Z", "Komma")  # Duplikat-Zitat
    db.insert_fehler(db_path, aid2, "im Garten", "im Garten,", "Z", "Komma")
    db.insert_fehler(db_path, aid1, "wahr", "war", "R", "Rechtschreibung")
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    schwerpunkte = ls["fehlerschwerpunkte"]
    assert schwerpunkte[0]["typ"] == "Z"  # häufigster zuerst
    assert schwerpunkte[0]["anzahl"] == 3
    assert schwerpunkte[0]["label"] == "Zeichensetzung"
    # Beispiele nach Zitat dedupliziert (kein doppeltes "das Haus")
    zitate = [b["zitat"] for b in schwerpunkte[0]["beispiele"]]
    assert zitate.count("das Haus") == 1
    assert schwerpunkte[1]["typ"] == "R"


# ── Schicht 3: DSGVO-Regressionstest für den Prompt-Entwurf ─────────────────


def test_profil_prompt_json_schema_keys(db_path: Path) -> None:
    """Neue Prompt-Struktur: kurzbild, staerken, foerderbereiche[].befund/uebung, maturabezug."""
    sid = db.insert_schueler(db_path, "6A", "Test")
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 4.0,
                          {"inhalt": 3, "textstruktur": 3, "ausdruck": 3, "sprachrichtigkeit": 3})
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    prompt = nc.build_schueler_profil_prompt(ls)
    assert "kurzbild" in prompt
    assert "staerken" in prompt
    assert "foerderbereiche" in prompt
    assert "befund" in prompt
    assert "uebung" in prompt
    assert "maturabezug" in prompt
    # Altes Feld 'schwaechen' darf nicht mehr auftauchen
    assert "schwaechen" not in prompt


def test_profil_prompt_enthaelt_keine_personendaten(db_path: Path) -> None:
    sid = db.insert_schueler(db_path, "6i", "Felix", "Müller")
    _abgabe_mit_kriterien(db_path, sid, "SA1", "h1", 4.0,
                          {"inhalt": 3, "textstruktur": 3, "ausdruck": 3, "sprachrichtigkeit": 3},
                          note_lehrer=3.0)
    _abgabe_mit_kriterien(db_path, sid, "SA2", "h2", 3.0,
                          {"inhalt": 4, "textstruktur": 4, "ausdruck": 4, "sprachrichtigkeit": 4})
    db.insert_fehler(db_path, 1, "das Haus", "das Haus,", "Z", "Komma")
    ls = db.get_schueler_laengsschnitt(db_path, sid)
    # Sicherstellen, dass die Identifikatoren tatsächlich im Aggregat stehen …
    assert ls["schueler"]["vorname"] == "Felix"
    assert ls["schueler"]["klasse"] == "6i"
    # … aber NICHT im erzeugten Prompt landen (DSGVO):
    prompt = nc.build_schueler_profil_prompt(ls)
    assert "Felix" not in prompt
    assert "Müller" not in prompt
    assert "6i" not in prompt
    # Aggregierte Inhalte müssen sehr wohl drin sein:
    assert "VERLAUF" in prompt
    assert "Zeichensetzung" in prompt
    assert "JSON" in prompt
