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


def test_follow_up_docx_nur_mit_verknuepftem_existierendem_schuelerexport(
    tmp_path: Path,
) -> None:
    db_path = tmp_path / "shared.db"
    with sqlite3.connect(db_path) as conn:
        conn.executescript(
            """
            CREATE TABLE generated_materials (
                id TEXT PRIMARY KEY, title TEXT, is_deleted INTEGER,
                loop_klasse TEXT, loop_aufgabe TEXT, updated_at TEXT
            );
            CREATE TABLE lua_history (
                id TEXT PRIMARY KEY, timestamp TEXT,
                exported_files_json TEXT, saved_document_id TEXT
            );
            """
        )
        conn.execute(
            "INSERT INTO generated_materials VALUES (?, ?, 0, ?, ?, ?)",
            ("material-1", "Kommas sicher setzen", "CLI-TEST", "SA1", "2026-09-24"),
        )

    abgabe = {"klasse": "CLI-TEST", "aufgabe": "SA1"}
    unexported = cli._follow_up_from_loop_material(db_path, abgabe)
    assert unexported.status == "in_luka"
    assert unexported.material_id == "material-1"

    # Eine gespeicherte Lösungsdatei allein ist keine Beilage für Schüler/innen.
    solution = tmp_path / "uebung_Loesung.docx"
    solution.write_bytes(b"synthetic")
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "INSERT INTO lua_history VALUES (?, ?, ?, ?)",
            (
                "history-solution",
                "2026-09-24T10:00:00Z",
                json.dumps([str(solution)]),
                "material-1",
            ),
        )
    solution_only = cli._follow_up_from_loop_material(db_path, abgabe)
    assert solution_only.status == "in_luka"

    student_file = tmp_path / "uebung_Schuelerfassung.docx"
    student_file.write_bytes(b"synthetic")
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "INSERT INTO lua_history VALUES (?, ?, ?, ?)",
            (
                "history-student",
                "2026-09-24T10:01:00Z",
                json.dumps([str(student_file)]),
                "material-1",
            ),
        )
    attached = cli._follow_up_from_loop_material(db_path, abgabe)
    assert attached.status == "beigelegt"
    assert attached.material_id == "material-1"
    assert attached.dateiname == student_file.name
    assert str(tmp_path) not in attached.dateiname

    student_file.unlink()
    assert cli._follow_up_from_loop_material(db_path, abgabe).status == "in_luka"


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


# ── Fix: JSON-Pfad (Produktionsfall) respektiert Lehrkraft-Aktionen ─


def _analyse_payload() -> dict:
    """Minimal gueltiger Analyse-Payload wie ihn run_llm_analysis auf Platt legt."""
    return {
        "datei": "json-path.docx",
        "textsorte": "Kommentar",
        "fach": "Deutsch",
        "schulstufe": "Oberstufe",
        "rubrik": "srdp_deutsch_oberstufe.md",
        "bewertung": {
            "inhalt": {
                "stufe": 3,
                "punkte": 3,
                "gewicht": 1.0,
                "staerken": ["s"],
                "schwaechen": ["w"],
                "vorschlaege": ["v"],
            }
        },
        "fehler": [
            {"zitat": "offen", "korrektur": "KI-A", "typ": "G", "erklaerung": "e1"},
            {"zitat": "raus", "korrektur": "KI-B", "typ": "R", "erklaerung": "e2"},
            {"zitat": "geaendert", "korrektur": "KI-C", "typ": "Z", "erklaerung": "e3"},
        ],
    }


def test_merge_lehrkraft_aktionen_json_pfad(tmp_path: Path) -> None:
    db_path = tmp_path / "natascha.db"
    db.init_db(db_path)
    json_path = tmp_path / "analysis.json"
    json_path.write_text(json.dumps(_analyse_payload()), encoding="utf-8")
    abgabe_id = db.insert_abgabe(
        db_path,
        None, "CLI-TEST", "SA1", "json-path.docx", "h-json-pfad",
        feedback_json_path=str(json_path),
        fach="Deutsch", schulstufe="Oberstufe", textsorte="Kommentar",
        rubrik="srdp_deutsch_oberstufe.md",
    )
    db.insert_kriterium(db_path, abgabe_id, "inhalt", 3.0, 0.5)
    korrekturen = {"offen": "KI-A", "raus": "KI-B", "geaendert": "KI-C"}
    typen = {"offen": "G", "raus": "R", "geaendert": "Z"}
    for zitat in ("offen", "raus", "geaendert"):
        db.insert_fehler(db_path, abgabe_id, zitat, korrekturen[zitat], typen[zitat])
    with sqlite3.connect(db_path) as conn:
        ids = [r[0] for r in conn.execute(
            "SELECT id FROM fehler_historie WHERE abgabe_id=? ORDER BY id", (abgabe_id,)
        )]
    db.update_fehler_status(db_path, ids[1], "verworfen")
    db.update_fehler_status(db_path, ids[2], "geaendert", "Lehrkraft-Text")

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    cli._merge_lehrkraft_aktionen(db_path, abgabe_id, payload)
    zitate = {f["zitat"]: f for f in payload["fehler"]}
    assert zitate["offen"].get("lehrkraft_aktion") is None
    assert zitate["raus"]["lehrkraft_aktion"] == "verworfen"
    assert zitate["geaendert"]["lehrkraft_aktion"] == "geaendert"
    assert zitate["geaendert"]["lehrkraft_korrektur"] == "Lehrkraft-Text"


def test_feedback_docx_json_pfad_filtert_nach_lehrkraft(tmp_path: Path) -> None:
    """Produktionspfad: JSON existiert + Aktionen in DB → DOCX ohne verworfene Fehler."""
    import generate_feedback as gf

    db_path = tmp_path / "natascha.db"
    db.init_db(db_path)
    json_path = tmp_path / "analysis.json"
    json_path.write_text(json.dumps(_analyse_payload()), encoding="utf-8")
    abgabe_id = db.insert_abgabe(
        db_path,
        None, "CLI-TEST", "SA1", "json-path.docx", "h-docx-pfad",
        feedback_json_path=str(json_path),
        fach="Deutsch", schulstufe="Oberstufe", textsorte="Kommentar",
        rubrik="srdp_deutsch_oberstufe.md",
    )
    db.insert_kriterium(db_path, abgabe_id, "inhalt", 3.0, 0.5)
    korrekturen = {"offen": "KI-A", "raus": "KI-B", "geaendert": "KI-C"}
    typen = {"offen": "G", "raus": "R", "geaendert": "Z"}
    for zitat in ("offen", "raus", "geaendert"):
        db.insert_fehler(db_path, abgabe_id, zitat, korrekturen[zitat], typen[zitat])
    with sqlite3.connect(db_path) as conn:
        ids = [r[0] for r in conn.execute(
            "SELECT id FROM fehler_historie WHERE abgabe_id=? ORDER BY id", (abgabe_id,)
        )]
    db.update_fehler_status(db_path, ids[1], "verworfen")
    db.update_fehler_status(db_path, ids[2], "geaendert", "Lehrkraft-Text")

    out = tmp_path / "feedback.docx"
    result = run_cli(db_path, "feedback-docx", str(abgabe_id), "--output", str(out))
    assert result["abgabe_id"] == abgabe_id
    assert out.is_file()

    # Gleicher Codepfad wie cmd_feedback_docx: JSON laden + Merge + parse
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    cli._merge_lehrkraft_aktionen(db_path, abgabe_id, payload)
    data = gf.parse_feedback_data(payload)
    assert data.fehler is not None
    zitate = [f.zitat for f in data.fehler]
    assert "raus" not in zitate, "verworfener Fehler darf nicht im DOCX landen"
    geaendert = next(f for f in data.fehler if f.zitat == "geaendert")
    assert geaendert.korrektur == "Lehrkraft-Text"


def test_load_rubric_header_safe_ueberlebt_non_utf8(tmp_path: Path) -> None:
    """R1–R3-Regression: eine kaputte Rubrik-Datei darf list-rubrics nicht
    crashen — der Header wird uebersprungen, der Dateiname bleibt sichtbar."""
    # Ungueltige UTF-8-Sequenz (0xE4 ohne Continuation), die read_text()
    # mit strict-utf-8 abstuerzen wuerde
    bad = tmp_path / "kaputt.md"
    bad.write_bytes(b"<!-- luka-rubrik\ntitel: Andr\xe4\xe4xxx\nfach: deutsch\n-->\n\n# Kaputt\n")
    good = tmp_path / "gut.md"
    good.write_text(
        "<!-- luka-rubrik\n"
        "titel: Saubere Rubrik\n"
        "fach: deutsch\n"
        "schulstufe: unterstufe\n"
        "-->\n\n# Gute Rubrik\n",
        encoding="utf-8",
    )

    import natascha_core as nc

    result_bad = cli._load_rubric_header_safe(nc, bad, bad.name)
    assert result_bad["filename"] == "kaputt.md"
    # roher Text wird mit errors=replace gelesen; Header-Parser darf nicht werfen
    assert isinstance(result_bad.get("titel", ""), str)

    result_good = cli._load_rubric_header_safe(nc, good, good.name)
    assert result_good["filename"] == "gut.md"
    assert result_good["titel"] == "Saubere Rubrik"

    missing = cli._load_rubric_header_safe(nc, tmp_path / "fehlt.md", "fehlt.md")
    assert missing == {"filename": "fehlt.md"}
