"""Tests fuer den Quelltext-Weg in die Erwartungshorizont-Generierung.

Der Ausgangstext ist die Grundlage des Erwartungshorizonts: aus ihm leitet das
Modell die erwarteten Inhalte ab. Vorher kam er ausschliesslich aus dem Ordner
``input/<klasse>/<aufgabe>/ausgangstext/`` — ein Ordner, den die Oberflaeche
nirgends nennt. Ueber die App war die Generierung damit faktisch nur moeglich,
wenn man den Dateisystem-Aufbau kannte.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc  # noqa: E402

AUSZUG = "Als Gregor Samsa eines Morgens aus unruhigen Traeumen erwachte, "


def _config(tmp_path: Path, **aufgabe_cfg) -> dict:
    aufgabe_cfg.setdefault("input", str(tmp_path / "input" / "8B" / "KV"))
    return {
        "paths": {
            "rubrics": str(nc.PROJECT_ROOT / "rubrics"),
            "input": str(tmp_path / "input"),
        },
        "classes": {
            "8B": {
                # absolut, weil build_project_paths gegen PROJECT_ROOT aufloest
                "input": str(tmp_path / "input"),
                "output": str(tmp_path / "output"),
                "aufgaben": {
                    "KV": {"fach": "deutsch", "schulstufe": "oberstufe", **aufgabe_cfg}
                },
            }
        },
        "defaults": {"fach": "Deutsch", "schulstufe": "Oberstufe"},
    }


def _ablege_ausgangstextdatei(tmp_path: Path, klasse: str = "8B", aufgabe: str = "KV") -> Path:
    ordner = tmp_path / "input" / klasse / aufgabe / "ausgangstext"
    ordner.mkdir(parents=True)
    datei = ordner / "kafka.txt"
    datei.write_text(AUSZUG, encoding="utf-8")
    return datei


# ---------------------------------------------------------------------------
# Vorrang der Quellen
# ---------------------------------------------------------------------------


def test_uebergebener_text_hat_vorrang(tmp_path: Path) -> None:
    text, quelle, _eigen = nc._ausgangstext_fuer_erwartungshorizont(
        _config(tmp_path), "8B", "KV", AUSZUG, None, None
    )
    assert text == AUSZUG.strip()
    assert "übergebenen Text" in quelle


def test_leerer_uebergebener_text_zaehlt_nicht(tmp_path: Path) -> None:
    """Nur Whitespace darf den Weg nicht versperren und in den Fehlerlauf fuehren."""
    _ablege_ausgangstextdatei(tmp_path)
    text, _quelle, _eigen = nc._ausgangstext_fuer_erwartungshorizont(
        _config(tmp_path), "8B", "KV", "   \n ", None, None
    )
    assert text == AUSZUG.strip()


def test_datei_hat_vorrang_vor_ordner(tmp_path: Path) -> None:
    _ablege_ausgangstextdatei(tmp_path)
    eigene = tmp_path / "eigener.txt"
    eigene.write_text("Eigener Auszug", encoding="utf-8")
    text, quelle, _eigen = nc._ausgangstext_fuer_erwartungshorizont(
        _config(tmp_path), "8B", "KV", None, eigene, None
    )
    assert text == "Eigener Auszug"
    assert "eigener.txt" in quelle


def test_ordner_wird_gefunden(tmp_path: Path) -> None:
    _ablege_ausgangstextdatei(tmp_path)
    text, quelle, _eigen = nc._ausgangstext_fuer_erwartungshorizont(
        _config(tmp_path), "8B", "KV", None, None, None
    )
    assert text == AUSZUG.strip()
    assert "kafka.txt" in quelle


def test_gespeicherter_quelltext_der_aufgabe_ist_die_letzte_quelle(tmp_path: Path) -> None:
    """Nach einer Korrektur liegt der Ausgangstext in `aufgabe_quelltext`.

    Damit muss die Lehrkraft den Text nicht zweimal einpflegen und nicht den
    Ordner `ausgangstext/` kennen.
    """
    import natascha_db as ndb

    db = tmp_path / "test.db"
    ndb.init_db(db)
    ndb.upsert_aufgabe_quelltext(db, "8B", "KV", AUSZUG)

    text, quelle, _eigen = nc._ausgangstext_fuer_erwartungshorizont(
        _config(tmp_path), "8B", "KV", None, None, db
    )
    assert text == AUSZUG.strip()
    assert "gespeicherten Quelltext" in quelle


def test_ohne_jede_quelle_bleibt_es_leer(tmp_path: Path) -> None:
    text, quelle, _eigen = nc._ausgangstext_fuer_erwartungshorizont(
        _config(tmp_path), "8B", "KV", None, None, None
    )
    assert text is None
    assert quelle == ""


def test_fehlende_datei_meldet_klar(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="nicht gefunden"):
        nc._ausgangstext_fuer_erwartungshorizont(
            _config(tmp_path), "8B", "KV", None, tmp_path / "weg.txt", None
        )


# ---------------------------------------------------------------------------
# Herkunft: nur eine eigene Eingabe darf zurueckgeschrieben werden
# ---------------------------------------------------------------------------


def test_nur_eigene_angabe_wird_als_solche_gemeldet(tmp_path: Path) -> None:
    """Das dritte Rueckgabeelement entscheidet ueber das Abspeichern.

    Ein Text, der schon im Projekt liegt, wird nicht ungefragt zurueckgeschrieben
    — sonst wuerde ein blosses Nachschlagen den Quelltext der Aufgabe ueberschreiben.
    """
    cfg = _config(tmp_path)
    _, _, eigen_text = nc._ausgangstext_fuer_erwartungshorizont(
        cfg, "8B", "KV", AUSZUG, None, None
    )
    assert eigen_text is True

    eigene = tmp_path / "eigener.txt"
    eigene.write_text(AUSZUG, encoding="utf-8")
    _, _, eigen_datei = nc._ausgangstext_fuer_erwartungshorizont(
        cfg, "8B", "KV", None, eigene, None
    )
    assert eigen_datei is True

    _ablege_ausgangstextdatei(tmp_path)
    _, _, eigen_ordner = nc._ausgangstext_fuer_erwartungshorizont(
        cfg, "8B", "KV", None, None, None
    )
    assert eigen_ordner is False


def test_eingefuegter_text_wird_zum_queltext_der_aufgabe(
    tmp_path: Path, monkeypatch
) -> None:
    """Einmal einfuegen genuegt: danach steht der Text auch der Korrektur offen."""
    import natascha_db as ndb

    monkeypatch.setattr(nc, "run_llm_api", lambda p, c, cancel_event=None: "# EH\n")
    db = tmp_path / "test.db"
    ndb.init_db(db)

    nc.generate_erwartungshorizont(
        _config(tmp_path), "8B", "KV", ausgangstext_text=AUSZUG, db_path=db
    )
    assert ndb.get_aufgabe_quelltext(db, "8B", "KV") == AUSZUG.strip()


def test_text_aus_dem_ordner_wird_nicht_zurueckgeschrieben(
    tmp_path: Path, monkeypatch
) -> None:
    """Nachschlagen ist kein Anlass, den gespeicherten Quelltext zu ueberschreiben."""
    import natascha_db as ndb

    monkeypatch.setattr(nc, "run_llm_api", lambda p, c, cancel_event=None: "# EH\n")
    db = tmp_path / "test.db"
    ndb.init_db(db)
    ndb.upsert_aufgabe_quelltext(db, "8B", "KV", "FRUEHERER QUELLTEXT")
    _ablege_ausgangstextdatei(tmp_path)

    nc.generate_erwartungshorizont(_config(tmp_path), "8B", "KV", db_path=db)
    assert ndb.get_aufgabe_quelltext(db, "8B", "KV") == "FRUEHERER QUELLTEXT"


# ---------------------------------------------------------------------------
# Formate
# ---------------------------------------------------------------------------


def test_bild_und_pdf_bekommen_eine_erklaerung_statt_eines_endungsfehlers(tmp_path: Path) -> None:
    """`detect_ausgangstext` findet PDF und Bilder, gelesen werden koennen sie nicht.

    Die alte Meldung nannte nur die Endung. Fuer die Lehrkraft ist die Frage
    relevant, was sie jetzt tun kann — deshalb der Hinweis auf die
    unterstuetzten Formate und auf das Einfuegen.
    """
    bild = tmp_path / "scan.png"
    bild.write_bytes(b"\x89PNG\r\n\x1a\n")
    with pytest.raises(ValueError) as err:
        nc._lies_ausgangstext_datei(bild)
    text = str(err.value)
    assert ".docx" in text and ".txt" in text
    assert "einfügen" in text


def test_md_wird_wie_txt_gelesen(tmp_path: Path) -> None:
    datei = tmp_path / "auszug.md"
    datei.write_text(AUSZUG, encoding="utf-8")
    assert nc._lies_ausgangstext_datei(datei) == AUSZUG.strip()


def test_datei_wird_getrimmt(tmp_path: Path) -> None:
    """Ein abschliessender Zeilenumbruch aus der Datei darf nicht in den Prompt."""
    datei = tmp_path / "auszug.txt"
    datei.write_text(AUSZUG + "\n", encoding="utf-8")
    assert nc._lies_ausgangstext_datei(datei) == AUSZUG.strip()


# ---------------------------------------------------------------------------
# Fehlermeldung und Prompt
# ---------------------------------------------------------------------------


def test_fehlende_quelle_nennt_die_drei_wege(tmp_path: Path) -> None:
    with pytest.raises(ValueError) as err:
        nc.generate_erwartungshorizont(
            _config(tmp_path), "8B", "KV", ausgangstext_text=None
        )
    text = str(err.value)
    assert "Quelltext" in text
    assert "ausgangstext/" in text


def _prompt_fuer(tmp_path: Path, monkeypatch, rubric: str = "", **kwargs) -> str:
    """Ruft die Generierung ohne API auf und liefert den gebauten Prompt."""
    erfasst: list[str] = []

    def _fake(prompt, config, cancel_event=None):
        erfasst.append(prompt)
        return "# Erwartungshorizont\n"

    monkeypatch.setattr(nc, "run_llm_api", _fake)
    nc.generate_erwartungshorizont(
        _config(tmp_path, rubric=rubric), "8B", "KV", **kwargs
    )
    return erfasst[0]


def test_verstaendnisraster_bittet_um_fragen_statt_um_argumente(
    tmp_path: Path, monkeypatch
) -> None:
    """Der alte Prompt verlangte Pro-/Contra-Argumente — bei einem Leseverstaendnis
    wird nicht argumentiert, sondern der Text erschlossen."""
    prompt = _prompt_fuer(
        tmp_path, monkeypatch, rubric="leseverstaendnis.md", ausgangstext_text=AUSZUG
    )
    assert AUSZUG.strip() in prompt
    assert "Verständnisfragen" in prompt
    assert "Fehlverständnisse" in prompt
    assert "Pro- UND Kontra-Argumente" not in prompt


def test_schreibraster_behaelt_die_argumentationsanweisung(
    tmp_path: Path, monkeypatch
) -> None:
    prompt = _prompt_fuer(
        tmp_path, monkeypatch, rubric="kommentar.md", ausgangstext_text=AUSZUG
    )
    assert "Pro- UND Kontra-Argumente" in prompt
    assert "Verständnisfragen" not in prompt


def test_quelle_steht_im_prompt(tmp_path: Path, monkeypatch) -> None:
    """Der Prompt sagt kuenftig, woraus er arbeitet — sonst ist 'die Textbeilage'
    bei mehreren Moeglichkeiten mehrdeutig."""
    eigene = tmp_path / "kafka.txt"
    eigene.write_text(AUSZUG, encoding="utf-8")
    prompt = _prompt_fuer(
        tmp_path, monkeypatch, rubric="leseverstaendnis.md", ausgangstext_path=eigene
    )
    assert "Quelle für der Datei kafka.txt" in prompt
