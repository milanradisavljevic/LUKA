"""Headless-CLI-E2E-Tests mit synthetischer Temp-DB."""

from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from argparse import Namespace
from pathlib import Path

import natascha_cli as cli
import natascha_db as db

ROOT = Path(__file__).resolve().parent.parent
CLI = ROOT / "natascha_cli.py"


def run_cli(db_path: Path, *args: str) -> dict:
    proc = subprocess.run(
        [sys.executable, str(CLI), "--db-path", str(db_path), *args],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=True,
    )
    return json.loads(proc.stdout)


def test_cli_readonly_commands_against_temp_db(tmp_path: Path) -> None:
    db_path = tmp_path / "natascha.db"

    rubrics = run_cli(db_path, "list-rubrics", "--fach", "Deutsch", "--schulstufe", "Oberstufe")
    assert "srdp_deutsch_oberstufe.md" in [rubric["filename"] for rubric in rubrics["rubrics"]]
    assert rubrics["defaultRubric"] == "srdp_deutsch_oberstufe.md"

    text = run_cli(db_path, "quelltext-get", "--klasse", "CLI-TEST", "--aufgabe", "SA1")
    assert text == {"klasse": "CLI-TEST", "aufgabe": "SA1", "ausgangstext": ""}


def test_cli_feedback_docx_aus_temp_db(tmp_path: Path) -> None:
    db_path = tmp_path / "natascha.db"
    db.init_db(db_path)
    abgabe_id = db.insert_abgabe(
        db_path,
        schueler_id=None,
        klasse="CLI-TEST",
        aufgabe="SA1",
        dateiname="synthetisch.docx",
        datei_hash="cli-e2e-feedback",
        rohtext="Synthetischer Text.",
        note=3.0,
        gesamtstufe=3.0,
        fach="Deutsch",
        schulstufe="Oberstufe",
        textsorte="Kommentar",
        rubrik="srdp_deutsch_oberstufe.md",
    )
    db.insert_kriterium(db_path, abgabe_id, "inhalt", 3.0, 0.25)

    out = tmp_path / "feedback.docx"
    result = run_cli(db_path, "feedback-docx", str(abgabe_id), "--output", str(out))
    assert result["abgabe_id"] == abgabe_id
    assert out.is_file()


def test_srdp_detail_laesst_abgabe_per_id(monkeypatch, tmp_path: Path) -> None:
    db_path = tmp_path / "natascha.db"
    db.init_db(db_path)
    abgabe_id = db.insert_abgabe(
        db_path,
        schueler_id=None,
        klasse="7A",
        aufgabe="SA1",
        dateiname="a.docx",
        datei_hash="srdp-detail",
        rohtext="Das ist der synthetische Schuelertext.",
        textsorte="Kommentar",
    )

    monkeypatch.setattr(cli, "_DB_PATH_OVERRIDE", str(db_path))

    def fake_srdp_detail(**kwargs):
        assert kwargs["schuelertext"] == "Das ist der synthetische Schuelertext."
        assert kwargs["textsorte"] == "Kommentar"
        return {"gesamteindruck": "ok"}

    nc, _, _, _ = cli._load_env_and_config()
    monkeypatch.setattr(nc, "generate_srdp_detail", fake_srdp_detail)

    rc = cli.cmd_srdp_detail(Namespace(abgabe_id=abgabe_id))
    assert rc == 0


# ── Phase 3: _reconstruct_feedback_from_db respektiert Lehrkraft-Aktionen ─


def _seed_fehler_abgabe(db_path: Path) -> tuple[int, int]:
    abgabe_id = db.insert_abgabe(
        db_path,
        schueler_id=None,
        klasse="CLI-TEST",
        aufgabe="SA1",
        dateiname="p3.docx",
        datei_hash="p3-filter",
        rohtext="Text.",
        note=3.0,
        gesamtstufe=3.0,
        fach="Deutsch",
        schulstufe="Oberstufe",
        textsorte="Kommentar",
        rubrik="kommentar.md",
    )
    db.insert_kriterium(db_path, abgabe_id, "inhalt", 3.0, 0.5)
    for zitat, korrektur, typ in [
        ("offen", "KI-A", "G"),
        ("raus", "KI-B", "R"),
        ("geaendert", "KI-C", "Z"),
        ("geaendert-leer", "KI-D", "A"),
    ]:
        db.insert_fehler(db_path, abgabe_id, zitat, korrektur, typ)
    with sqlite3.connect(db_path) as conn:
        ids = [r[0] for r in conn.execute(
            "SELECT id FROM fehler_historie WHERE abgabe_id=? ORDER BY id", (abgabe_id,)
        )]
    db.update_fehler_status(db_path, ids[1], "verworfen")
    db.update_fehler_status(db_path, ids[2], "geaendert", "Lehrkraft-Text")
    db.update_fehler_status(db_path, ids[3], "geaendert", None)
    return abgabe_id, ids[0]


def test_reconstruct_feedback_from_db_filtert_verworfen_und_geaendert(
    tmp_path: Path,
) -> None:
    db_path = tmp_path / "natascha.db"
    db.init_db(db_path)
    abgabe_id, _ = _seed_fehler_abgabe(db_path)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    abgabe = dict(conn.execute(
        "SELECT * FROM abgabe WHERE id=?", (abgabe_id,)
    ).fetchone())
    conn.close()

    result = cli._reconstruct_feedback_from_db(db_path, abgabe_id, abgabe)
    assert result is not None
    assert result.fehler is not None
    zitate = [f.zitat for f in result.fehler]
    # verworfen fehlt
    assert "raus" not in zitate
    # offen und geaendert bleiben
    assert "offen" in zitate
    # geaendert nutzt Lehrkraft-Korrekturtext
    geaendert = next(f for f in result.fehler if f.zitat == "geaendert")
    assert geaendert.korrektur == "Lehrkraft-Text"
    # geaendert ohne Text → KI-Original
    geaendert_leer = next(f for f in result.fehler if f.zitat == "geaendert-leer")
    assert geaendert_leer.korrektur == "KI-D"
    assert len(result.fehler) == 3


def test_reconstruct_feedback_from_db_ohne_kriterien_none(tmp_path: Path) -> None:
    db_path = tmp_path / "natascha.db"
    db.init_db(db_path)
    abgabe_id = db.insert_abgabe(
        db_path, None, "X", "SA1", "a.docx", "h-none",
    )
    # nur Fehler, keine Kriterien → None
    db.insert_fehler(db_path, abgabe_id, "z", "k", "G")
    result = cli._reconstruct_feedback_from_db(db_path, abgabe_id, {"dateiname": "a.docx"})
    assert result is None
