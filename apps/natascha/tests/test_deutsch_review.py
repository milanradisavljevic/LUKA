"""Synthetische Vertrags-, Pipeline- und Rückfalltests ohne API-Kosten."""

from __future__ import annotations

import copy
import json
import threading
from pathlib import Path

import pytest

import deutsch_review as dr
import natascha_core as nc
from correction_quality import anchor_findings, replacement_context

ROOT = Path(__file__).resolve().parents[1]
TEXT = "Liebe Klasse, wir handeln gemeinsam.\nDas hilft unserer Schule."


def rubric(name="deutsch_unterstufe.md"):
    return (ROOT / "rubrics" / name).read_text(encoding="utf-8")


def rating(level=3):
    return {
        "stufe": level,
        "punkte": level,
        "staerken": ["Konkreter Schulbezug."],
        "schwaechen": [],
        "vorschlaege": [],
    }


def primary():
    return {
        "datei": "synthetisch",
        "rubrik": "Test",
        "fach": "Deutsch",
        "schulstufe": "Unterstufe",
        "textsorte": "Meinungsrede",
        "bewertung": {k: rating() for k in nc.extract_criteria_keys(rubric())},
        "fehler": [],
        "zusammenfassung": "Du begründest deinen Vorschlag.",
        "staerken_global": ["Gemeinsames Handeln."],
        "verbesserungsbereiche": [],
        "hinweise": [],
    }


def basis(name="deutsch_unterstufe.md", land="at", mode="benotet"):
    text = rubric(name)
    h = nc.parse_rubrik_header(text)
    result = {
        "schuelertext": TEXT,
        "textfakten": dr.textfakten(TEXT),
        "rubrik_inhalt": text,
        "rastervertrag": dr.rastervertrag(
            text, land=land, schulstufe=h["schulstufe"], benotet=mode == "benotet"
        ),
    }
    result["hash"] = dr.digest(result)
    return result


def test_language_usage_checks_reach_text_vision_and_review_prompts():
    from correction_quality import german_usage_guidance

    guidance = german_usage_guidance()
    config = nc.load_config()
    text_prompt = nc.build_analysis_prompt(
        TEXT, rubric(), "Deutsch", "Unterstufe", "Meinungsrede", config,
    )
    vision_prompt = nc.build_vision_prompt(
        rubric(), "Deutsch", "Unterstufe", "Meinungsrede", config,
    )
    for prompt in (text_prompt, vision_prompt, dr.review_prompt(basis(), primary())):
        assert guidance in prompt
    foreign_prompt = nc.build_analysis_prompt(
        "We work together.", "Language", "Englisch", "Unterstufe", "Article", config,
    )
    assert guidance not in foreign_prompt


def review_for(data, grundlage):
    evidence = {"belege": ["wir handeln gemeinsam"], "kontextbegruendung": "", "befund_ids": [], "quellenabhaengig": False}
    result = {
        "kriterienpruefung": {
            k: {
                "status": "bestaetigt",
                "bewertung": copy.deepcopy(v),
                "begruendung": "Bezug zur Klasse ist funktional umgesetzt.",
                **evidence,
            }
            for k, v in data["bewertung"].items()
        },
        "befundpruefung": [
            {
                "befund_id": f["befund_id"],
                "status": "bestaetigt",
                "befundart": "normfehler",
                "begruendung": "Norm im Satz geprüft.",
                "ersetzungspruefung": {
                    "status": "bestaetigt",
                    "pruefsumme": (replacement_context(grundlage["schuelertext"], f) or {}).get("pruefsumme"),
                },
            }
            for f in data["fehler"]
        ],
        "aussagenpruefung": {
            k: {"status": "bestaetigt", "wert": copy.deepcopy(data[k]), **evidence}
            for k in ("zusammenfassung", "staerken_global", "verbesserungsbereiche", "hinweise")
        },
        "pruefbedarf": [],
    }
    if grundlage["rastervertrag"]["srdp_detail"]:
        result["srdp_detail"] = {
            g: {
                k: {"stufe": 3, "begruendung": "Auftrag funktional umgesetzt.", **evidence}
                for k in entries
            }
            for g, entries in dr.DETAIL.items()
        }
    return result


DEUTSCH = [
    p
    for p in sorted((ROOT / "rubrics").glob("*.md"))
    if not p.name.startswith("erwartungshorizont_")
    and nc.parse_rubrik_header(p.read_text(encoding="utf-8")).get("fach") == "deutsch"
]


@pytest.mark.parametrize("path", DEUTSCH, ids=lambda p: p.name)
@pytest.mark.parametrize("land", ["at", "de"])
def test_all_german_contracts(path, land):
    text = path.read_text(encoding="utf-8")
    h = nc.parse_rubrik_header(text)
    result = dr.rastervertrag(text, land=land, schulstufe=h["schulstufe"], benotet=True)
    if path.name in {"Zusammenfassung.md", "rhetorische_figuren.md"}:
        assert result["fehler"] and result["verwendung"] != "bewertung"
    else:
        assert not result["fehler"], result["fehler"]
        assert set(result["kriterien"]) == set(nc.extract_criteria_keys(text))
        assert all(set(v["stufen"]) == set("12345") for v in result["kriterien"].values())


@pytest.mark.parametrize(
    "name,land,mode,detail",
    [
        ("meinungsrede.md", "at", "benotet", True),
        ("meinungsrede.md", "de", "benotet", False),
        ("leseverstaendnis.md", "at", "benotet", False),
        ("deutsch_unterstufe.md", "at", "benotet", False),
        ("meinungsrede.md", "at", "unbenotet", False),
        ("AB_Checkliste_Textinterpretation.md", "at", "benotet", False),
    ],
)
def test_only_suitable_profiles_get_srdp_details(name, land, mode, detail):
    assert bool(basis(name, land, mode)["rastervertrag"]["srdp_detail"]) is detail


def test_unknown_custom_keys_and_missing_weights_do_not_become_middle_grades():
    text = "## JSON-Kriterien\n- `meinkriterium` — Meine Kriterien\n"
    assert dr.rastervertrag(text, land="at", schulstufe="Oberstufe", benotet=True)["fehler"]
    assert dr.rastervertrag(text, land="de", schulstufe="Unterstufe", benotet=True)["fehler"]


def test_review_applies_justified_changes_and_preserves_first_judgment():
    data = primary()
    initial = copy.deepcopy(data)
    b = basis()
    review = review_for(data, b)
    review["kriterienpruefung"]["inhalt"].update(status="korrigiert", bewertung=rating(4))
    dr.apply_review(data, review, b)
    assert data["bewertung"]["inhalt"]["punkte"] == 4
    assert data["bewertung_urspruenglich"] == initial["bewertung"]
    assert not data["notenempfehlung_vorlaeufig"]


@pytest.mark.parametrize(
    "fault",
    ["unbelegt", "teilwort", "uneindeutig", "widerspruch", "offen", "falsche_stufe", "fehlend"],
)
def test_incomplete_or_contradictory_checks_remain_provisional(fault):
    data = primary()
    b = basis()
    r = review_for(data, b)
    entry = r["kriterienpruefung"]["inhalt"]
    if fault == "unbelegt":
        entry["belege"] = []
    elif fault == "teilwort":
        entry["belege"] = ["handeln gemeinsa"]
    elif fault == "uneindeutig":
        b["schuelertext"] += " wir handeln gemeinsam"
    elif fault == "widerspruch":
        entry["bewertung"] = rating(4)
    elif fault == "offen":
        entry["status"] = "ungeklaert"
    elif fault == "falsche_stufe":
        entry["bewertung"]["punkte"] = 0
    else:
        del r["kriterienpruefung"]["inhalt"]
    dr.apply_review(data, r, b)
    assert data["notenempfehlung_vorlaeufig"]
    assert data["bewertung"]["inhalt"]["punkte"] == 3


def test_absent_elements_can_be_explained_without_fabricated_quotes():
    data = primary()
    b = basis()
    r = review_for(data, b)
    entry = r["kriterienpruefung"]["inhalt"]
    entry.update(
        status="korrigiert",
        bewertung=rating(2),
        belege=[],
        kontextbegruendung="Der zweite Arbeitsauftrag verlangt eine Gegenposition. Diese fehlt im gesamten Text.",
    )
    dr.apply_review(data, r, b)
    assert data["bewertung"]["inhalt"]["punkte"] == 2


def test_style_variant_is_not_a_confirmed_norm_error_or_teacher_decision():
    data = primary()
    data["fehler"] = anchor_findings(
        [
            {
                "zitat": "handeln gemeinsam",
                "korrektur": "agieren gemeinsam",
                "typ": "A",
                "befundart": "normfehler",
            }
        ],
        TEXT,
    )
    b = basis()
    r = review_for(data, b)
    r["befundpruefung"][0].update(
        status="korrigiert",
        befundart="stilalternative",
        begruendung="Zulässige Formulierung; nur ein Stilvorschlag.",
    )
    dr.apply_review(data, r, b)
    assert data["fehler"][0]["befundart"] == "stilalternative"
    assert "lehrkraft_aktion" not in data["fehler"][0]


@pytest.mark.parametrize(
    "provider,model",
    [
        ("deepseek", "deepseek-v4-pro"),
        ("openai", "gpt-6.1-sol"),
        ("anthropic", "claude-sonnet-5-5"),
        ("mistral", "mistral-large-4"),
        ("qwen", "qwen3.8-max"),
        ("kimi", "kimi-k3"),
    ],
)
@pytest.mark.parametrize(
    "name,land,mode",
    [
        ("deutsch_unterstufe.md", "de", "benotet"),
        ("meinungsrede.md", "at", "benotet"),
        ("leseverstaendnis.md", "at", "benotet"),
        ("deutsch_unterstufe.md", "at", "unbenotet"),
    ],
)
def test_two_calls_share_one_basis_and_native_configuration(
    monkeypatch, provider, model, name, land, mode
):
    text = rubric(name)
    stage = nc.parse_rubrik_header(text)["schulstufe"].title()
    first = primary()
    first["bewertung"] = {k: rating() for k in nc.extract_criteria_keys(text)}
    calls = []
    config = nc.load_config()
    config["classes"] = {}
    config["api"] = {"provider": provider, "model": model}

    def answer(prompt, cfg, **kwargs):
        calls.append((prompt, copy.deepcopy(cfg["api"])))
        if len(calls) == 1:
            return json.dumps(first)
        b = json.loads(prompt.split("<grundlage>\n")[1].split("\n</grundlage>")[0])
        return json.dumps(review_for(first, b))

    monkeypatch.setattr(nc, "run_llm_api", answer)
    result, errors = nc.run_llm_analysis(
        TEXT,
        text,
        "Deutsch",
        stage,
        "Meinungsrede",
        config,
        land=land,
        bewertungsmodus=mode,
        persist=False,
        pseudonymisierung=False,
        max_retries=1,
        ausgangstext_text="QUELLE_EINMAL",
    )
    assert result, errors
    assert len(calls) == 2 and calls[0][1] == calls[1][1]
    bases = [json.loads(p.split("<grundlage>\n")[1].split("\n</grundlage>")[0]) for p, _ in calls]
    assert bases[0] == bases[1]
    assert calls[0][0].count("QUELLE_EINMAL") == 1
    assert bases[0]["textfakten"]["wortzahl"] == 9 and bases[0]["textfakten"]["absatzanzahl"] == 2
    assert not result["notenempfehlung_vorlaeufig"]
    assert not nc.validate_against_schema(
        result, nc.load_schema_for_mode(config, mode, text, "Deutsch", land)
    )
    if mode == "unbenotet":
        assert "notenempfehlung" not in result


def test_explicit_horizon_wins_once_in_both_calls(monkeypatch, tmp_path):
    (tmp_path / "selected.md").write_text("GEWAEHLTER_EH", encoding="utf-8")
    config = nc.load_config()
    config["paths"]["rubrics"] = str(tmp_path)
    config["classes"] = {}
    prompts = []
    monkeypatch.setattr(
        nc, "run_llm_api", lambda p, *_a, **_kw: prompts.append(p) or json.dumps(primary())
    )
    result, _ = nc.run_llm_analysis(
        TEXT,
        rubric(),
        "Deutsch",
        "Unterstufe",
        "Rede",
        config,
        erwartungshorizont="FALSCHER_STANDARD",
        erwartungshorizont_name="selected.md",
        persist=False,
        pseudonymisierung=False,
        max_retries=1,
    )
    assert result and len(prompts) == 2
    assert all(p.count("GEWAEHLTER_EH") == 1 and "FALSCHER_STANDARD" not in p for p in prompts)


@pytest.mark.parametrize(
    "raw", ["FEHLER: unvollständig", "kein JSON", "{}", "[]", '{"kriterienpruefung": []}']
)
def test_failed_review_retains_feedback_and_provisional_grade(monkeypatch, raw):
    answers = iter([json.dumps(primary()), raw])
    monkeypatch.setattr(nc, "run_llm_api", lambda *_a, **_kw: next(answers))
    result, errors = nc.run_llm_analysis(
        TEXT,
        rubric(),
        "Deutsch",
        "Unterstufe",
        "Rede",
        nc.load_config(),
        persist=False,
        pseudonymisierung=False,
        max_retries=1,
    )
    assert result, errors
    assert "notenempfehlung" not in result
    assert result["bewertungspruefung"]["status"] == "offen"
    assert result["zusammenfassung"] == primary()["zusammenfassung"]
    assert not nc.validate_against_schema(
        result, nc.load_schema_for_mode(nc.load_config(), "benotet", rubric(), "Deutsch")
    )


def test_cancel_in_second_call_does_not_persist(monkeypatch):
    event = threading.Event()
    calls = []

    def answer(*_a, **_kw):
        calls.append(True)
        if len(calls) == 2:
            event.set()
        return json.dumps(primary())

    monkeypatch.setattr(nc, "run_llm_api", answer)
    result, errors = nc.run_llm_analysis(
        TEXT,
        rubric(),
        "Deutsch",
        "Unterstufe",
        "Rede",
        nc.load_config(),
        persist=False,
        pseudonymisierung=False,
        max_retries=1,
        cancel_event=event,
    )
    assert result is None and any("abgebrochen" in e for e in errors)


def test_snapshot_migration_only_replaces_untouched_templates(tmp_path):
    from deutsch_raster_seed import LEGACY_DEUTSCH_HASHES

    name = "deutsch_unterstufe.md"
    bundle = tmp_path / "bundle"
    target = tmp_path / "data"
    (bundle / "rubrics").mkdir(parents=True)
    (target / "rubrics").mkdir(parents=True)
    new = rubric(name)
    old = new.replace("verwendung: bewertung\n", "")
    assert dr.hashlib.sha256(old.encode()).hexdigest() == LEGACY_DEUTSCH_HASHES[name]
    (bundle / "rubrics" / name).write_text(new, encoding="utf-8")
    dest = target / "rubrics" / name
    dest.write_text(old, encoding="utf-8")
    nc._seed_data_dir(bundle, target)
    assert dest.read_text(encoding="utf-8") == new
    dest.write_text(old + "\nEigene Anpassung", encoding="utf-8")
    nc._seed_data_dir(bundle, target)
    assert dest.read_text(encoding="utf-8").endswith("Eigene Anpassung")


def test_review_prompt_separates_source_from_audience_and_uses_full_descriptors():
    b = basis("meinungsrede.md")
    prompt = dr.review_prompt(b, primary())
    assert "KEINE Publikumsansprache" in prompt and "bezugnahme" in prompt
    assert "durch die Rede" in prompt and "Mehrfachabzüge" in prompt
    from generate_feedback import SRDP_WORTLAUT

    for group in b["rastervertrag"]["srdp_detail"].values():
        for key, entry in group.items():
            assert entry["stufen"] == {str(k): v for k, v in SRDP_WORTLAUT[key].items()}


def test_provisional_grade_survives_word_export_without_teacher_grade():
    import generate_feedback as gf

    data = primary()
    data["notenempfehlung"] = {
        "note": 3,
        "bezeichnung": "Befriedigend",
        "durchschnitt": 3,
        "begruendung": "Vorläufig aus den Hauptkriterien.",
    }
    data["notenempfehlung_vorlaeufig"] = True
    data["qualitaetswarnungen"] = [
        {"code": "deutsch_gegenpruefung", "message": "Quelle noch prüfen."}
    ]
    doc = gf.build_feedback_document(gf.parse_feedback_data(data), original_text=TEXT)
    rendered = (
        "\n".join(p.text for p in doc.paragraphs)
        + "\n"
        + "\n".join(c.text for t in doc.tables for row in t.rows for c in row.cells)
    )
    assert "VORLÄUFIG" in rendered and "PRÜFUNG ERFORDERLICH" in rendered
    assert "KI-NOTENEMPFEHLUNG" in rendered and "LEHRERNOTE:" not in rendered
    assert "Liebe Klasse" in rendered and "Quelle noch prüfen" in rendered


def test_formative_word_export_does_not_show_grade_even_when_review_is_open():
    import generate_feedback as gf

    data = primary()
    data["bewertungsmodus"] = "unbenotet"
    data["notenempfehlung_vorlaeufig"] = True
    doc = gf.build_feedback_document(gf.parse_feedback_data(data), original_text=TEXT)
    rendered = "\n".join(p.text for p in doc.paragraphs)
    assert "KI-NOTENEMPFEHLUNG" not in rendered


def test_reference_generator_produces_a_safe_manifest_without_teacher_grades(tmp_path):
    import sys

    sys.path.insert(0, str(ROOT / "benchmarks"))
    from deutsch_referenz import create_cases
    from run_benchmark import load_case_manifest

    manifest = create_cases(tmp_path / "references")
    data_class, cases = load_case_manifest(manifest)
    assert data_class == "synthetic" and len(cases) == 6
    expectations = json.loads(
        (manifest.parent / "prueferwartungen.json").read_text(encoding="utf-8")
    )
    assert all(c["notenspanne"] is None for c in expectations["cases"])


def test_german_grade_six_remains_valid_in_app_and_benchmark(monkeypatch):
    import sys

    sys.path.insert(0, str(ROOT / "benchmarks"))
    from run_benchmark import validate_analysis_schema

    data = primary()
    data["bewertung"] = {k: rating(1) for k in data["bewertung"]}
    calls = []

    def answer(prompt, *_a, **_kw):
        calls.append(prompt)
        if len(calls) == 1:
            return json.dumps(data)
        b = json.loads(prompt.split("<grundlage>\n")[1].split("\n</grundlage>")[0])
        return json.dumps(review_for(data, b))

    monkeypatch.setattr(nc, "run_llm_api", answer)
    config = nc.load_config()
    result, errors = nc.run_llm_analysis(
        TEXT,
        rubric(),
        "Deutsch",
        "Unterstufe",
        "Rede",
        config,
        land="de",
        persist=False,
        pseudonymisierung=False,
        max_retries=1,
    )
    assert result, errors
    assert result["notenempfehlung"]["note"] == 6
    assert not nc.validate_against_schema(
        result, nc.load_schema_for_mode(config, "benotet", rubric(), "Deutsch", "de")
    )
    assert validate_analysis_schema(result) == (True, None)


@pytest.mark.parametrize("raster", ["meinungsrede.md", "kommentar.md"])
def test_srdp_main_and_detail_disagreement_is_visible_without_changing_grade_formula(raster):
    b = basis(raster)
    data = primary()
    data["bewertung"] = {k: rating(3) for k in b["rastervertrag"]["kriterien"]}
    r = review_for(data, b)
    for group in r["srdp_detail"].values():
        for entry in group.values():
            entry["stufe"] = 2
    dr.apply_review(data, r, b)
    assert data["notenempfehlung_vorlaeufig"]
    assert any("Haupt- und Detailbewertung" in w["message"] for w in data["qualitaetswarnungen"])
    assert nc.berechne_note_srdp(data["bewertung"], data["srdp_detail"])["note"] == 4


def test_positive_negative_disagreement_is_visible_even_below_one_stage_difference():
    b = basis("meinungsrede.md")
    data = primary()
    data["bewertung"] = {k: rating(2) for k in data["bewertung"]}
    r = review_for(data, b)
    for group in r["srdp_detail"].values():
        for entry in group.values():
            entry["stufe"] = 2
    r["srdp_detail"]["k1_inhalt"]["schreibhandlung"]["stufe"] = 1
    dr.apply_review(data, r, b)
    assert data["notenempfehlung_vorlaeufig"]
    assert nc.berechne_note_srdp(data["bewertung"], data["srdp_detail"])["note"] == 5


@pytest.mark.parametrize("reverse", [False, True])
def test_duplicate_finding_checks_are_never_confirmed_by_last_answer(reverse):
    data = primary()
    data["fehler"] = anchor_findings(
        [
            {
                "zitat": "handeln gemeinsam",
                "korrektur": "agieren gemeinsam",
                "typ": "A",
                "befundart": "normfehler",
            }
        ],
        TEXT,
    )
    b = basis()
    r = review_for(data, b)
    r["befundpruefung"].append({**r["befundpruefung"][0], "status": "ungeklaert"})
    if reverse:
        r["befundpruefung"].reverse()
    dr.apply_review(data, r, b)
    assert data["fehler"][0]["ki_pruefung"]["status"] == "ungeklaert"
    assert data["fehler"][0]["befundart"] == "ungeklaert"
    assert data["notenempfehlung_vorlaeufig"]


def test_second_call_cannot_turn_a_finding_into_an_identical_correction():
    data = primary()
    data["fehler"] = anchor_findings(
        [
            {
                "zitat": "handeln gemeinsam",
                "korrektur": "agieren gemeinsam",
                "typ": "A",
                "befundart": "normfehler",
            }
        ],
        TEXT,
    )
    b = basis()
    r = review_for(data, b)
    r["befundpruefung"][0].update(status="korrigiert", korrektur="handeln gemeinsam")
    dr.apply_review(data, r, b)
    assert data["fehler"][0]["korrektur"] == "agieren gemeinsam"
    assert data["fehler"][0]["befundart"] == "ungeklaert"
    assert data["notenempfehlung_vorlaeufig"]


def test_revised_rule_conflict_is_reflected_in_overall_review_status():
    data = primary()
    data["fehler"] = anchor_findings(
        [
            {
                "zitat": "handeln gemeinsam",
                "korrektur": "Handeln gemeinsam",
                "typ": "R",
                "befundart": "normfehler",
                "erklaerung": "Bezeichnung prüfen.",
            }
        ],
        TEXT,
    )
    b = basis()
    r = review_for(data, b)
    r["befundpruefung"][0].update(
        status="korrigiert", erklaerung="Satzanfänge werden großgeschrieben."
    )
    dr.apply_review(data, r, b)
    assert data["fehler"][0]["kontext_widerspruch"]
    assert data["notenempfehlung_vorlaeufig"]


def test_unknown_review_criteria_are_not_silently_accepted():
    data = primary()
    b = basis()
    r = review_for(data, b)
    r["kriterienpruefung"]["fremdes_kriterium"] = copy.deepcopy(r["kriterienpruefung"]["inhalt"])
    dr.apply_review(data, r, b)
    assert data["notenempfehlung_vorlaeufig"]
    assert "fremdes_kriterium" not in data["bewertung"]


def test_finding_ids_are_unique_and_stable_before_and_after_review():
    findings = anchor_findings(
        [
            {"befund_id": "befund-2", "zitat": "handeln", "korrektur": "agieren"},
            {"befund_id": "befund-2", "zitat": "gemeinsam", "korrektur": "zusammen"},
            {"befund_id": "", "zitat": "Schule", "korrektur": "Klasse"},
        ],
        TEXT,
    )
    ids = [f["befund_id"] for f in findings]
    assert len(set(ids)) == 3 and all(ids)
    assert [f["befund_id"] for f in anchor_findings(findings, TEXT)] == ids


def test_provisional_srdp_grade_roundtrips_through_revision_and_real_cli_export(
    monkeypatch, tmp_path
):
    import subprocess
    import sys
    from docx import Document
    import natascha_db as db

    data = primary()
    calls = []

    def answer(prompt, *_a, **_kw):
        calls.append(prompt)
        if len(calls) == 1:
            return json.dumps(data)
        b = json.loads(prompt.split("<grundlage>\n")[1].split("\n</grundlage>")[0])
        r = review_for(data, b)
        for group in r["srdp_detail"].values():
            for entry in group.values():
                entry["stufe"] = 2
        return json.dumps(r)

    monkeypatch.setattr(nc, "run_llm_api", answer)
    config = nc.load_config()
    config["classes"] = {}
    analysis, errors = nc.run_llm_analysis(
        TEXT,
        rubric("meinungsrede.md"),
        "Deutsch",
        "Oberstufe",
        "Meinungsrede",
        config,
        persist=False,
        pseudonymisierung=False,
        max_retries=1,
    )
    assert analysis, errors
    assert analysis["notenempfehlung"]["note"] == 4 and analysis["notenempfehlung"]["vorlaeufig"]
    source = tmp_path / "synthetic.docx"
    doc = Document()
    doc.add_paragraph(TEXT)
    doc.save(source)
    db_path = tmp_path / "synthetic.db"
    db.init_db(db_path)
    aid = db.save_analysis_to_db(db_path, analysis, source, "TEST", "Rede", rohtext=TEXT)
    output = tmp_path / "export.docx"
    result = subprocess.run(
        [
            sys.executable,
            str(ROOT / "natascha_cli.py"),
            "--db-path",
            str(db_path),
            "feedback-docx",
            str(aid),
            "--revision-id",
            str(analysis["_revision_id"]),
            "--output",
            str(output),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    assert result.returncode == 0, result.stderr
    document = Document(output)
    text = "\n".join(p.text for p in document.paragraphs)
    assert "VORLÄUFIG" in text and "PRÜFUNG ERFORDERLICH" in text
    assert "4 – Genügend" in text and "Haupt- und Detailbewertung" in text
    assert "LEHRERNOTE:" not in text and "Liebe Klasse" in text


@pytest.mark.parametrize("reason", [None, "", "   "])
@pytest.mark.parametrize(
    "quote,replacement,typ,kind",
    [
        ("könnten die Kinder könnten", "könnten die Kinder", "G", "normfehler"),
        ("erstellte eine Entscheidung", "traf eine Entscheidung", "A", "ausdrucksproblem"),
    ],
)
def test_confirmed_findings_accept_empty_optional_reason(reason, quote, replacement, typ, kind):
    data, b = primary(), basis()
    b["schuelertext"] += (
        "\nDafür könnten die Kinder könnten ein Beet vorbereiten."
        "\nDie Gruppe erstellte eine Entscheidung."
    )
    data["fehler"] = anchor_findings([{
        "zitat": quote, "korrektur": replacement, "typ": typ,
        "befundart": kind, "erklaerung": "Konkretes Sprachproblem im Satz.",
    }], b["schuelertext"])
    review = review_for(data, b)
    review["befundpruefung"][0].update(begruendung=reason, befundart=kind)
    dr.apply_review(data, review, b)
    finding = data["fehler"][0]
    assert finding["ki_pruefung"]["status"] == "bestaetigt"
    assert finding["befundart"] == kind
    assert finding["ersetzungspruefung"]["status"] == "bestaetigt"


@pytest.mark.parametrize("status", ["korrigiert", "verworfen", "ungeklaert"])
def test_nonconfirming_finding_decisions_still_require_a_reason(status):
    data, b = primary(), basis()
    data["fehler"] = anchor_findings([{
        "zitat": "wir handeln", "korrektur": "wir arbeiten", "typ": "A",
        "befundart": "stilalternative", "erklaerung": "Freiwillige Alternative.",
    }], b["schuelertext"])
    review = review_for(data, b)
    review["befundpruefung"][0].update(status=status, begruendung="")
    dr.apply_review(data, review, b)
    assert data["fehler"][0]["ki_pruefung"]["status"] == "ungeklaert"


def test_compact_confirmations_keep_original_values():
    data, b = primary(), basis()
    review = review_for(data, b)
    for entry in review["kriterienpruefung"].values():
        entry.pop("bewertung")
    for entry in review["aussagenpruefung"].values():
        entry.pop("wert")
    original = copy.deepcopy(data)
    dr.apply_review(data, review, b)
    assert data["bewertung"] == original["bewertung"]
    assert data["zusammenfassung"] == original["zusammenfassung"]
    assert data["gegenpruefung"]["status"] == "abgeschlossen"


def test_scoped_evidence_disambiguates_repeated_phrase():
    data, b = primary(), basis()
    b["schuelertext"] = "Wir handeln gemeinsam.\nWir handeln gemeinsam."
    review = review_for(data, b)
    for entry in list(review["kriterienpruefung"].values()) + list(
        review["aussagenpruefung"].values()
    ):
        entry["belege"] = [{"stelle": "S2", "zitat": "Wir handeln gemeinsam."}]
    dr.apply_review(data, review, b)
    assert data["gegenpruefung"]["status"] == "abgeschlossen"


def test_review_can_add_a_missed_finding_with_original_anchor():
    data, b = primary(), basis()
    review = review_for(data, b)
    review["neue_befunde"] = [
        {
            "stelle": "S1",
            "zitat": "wir handeln",
            "korrektur": "wir arbeiten",
            "typ": "A",
            "befundart": "stilalternative",
            "erklaerung": "Freiwillige Alternative.",
        }
    ]
    dr.apply_review(data, review, b)
    assert len(data["fehler"]) == 1 and data["fehler"][0]["anker_status"] == "eindeutig"
    assert data["feedback_urspruenglich"]["fehler"] == []
    assert data["fehler"][0]["ki_pruefung"]["herkunft"] == "gegenpruefung"


def test_changed_replacement_scope_must_contain_original_finding():
    data, b = primary(), basis()
    data["fehler"] = anchor_findings(
        [
            {
                "zitat": "wir handeln",
                "korrektur": "wir arbeiten",
                "typ": "A",
                "befundart": "ausdrucksproblem",
            }
        ],
        TEXT,
    )
    review = review_for(data, b)
    entry = review["befundpruefung"][0]
    entry.update(
        status="korrigiert",
        ersetzung={
            "stelle": "S2",
            "zitat": "Das hilft unserer Schule.",
            "korrektur": "Das ist hilfreich.",
        },
    )
    dr.apply_review(data, review, b)
    assert data["fehler"][0]["zitat"] == "wir handeln"
    assert data["fehler"][0]["befundart"] == "ungeklaert"


def test_expanded_scope_and_replacement_are_applied_together():
    data, b = primary(), basis()
    data["fehler"] = anchor_findings(
        [
            {
                "zitat": "wir handeln",
                "korrektur": "wir arbeiten",
                "typ": "A",
                "befundart": "ausdrucksproblem",
            }
        ],
        TEXT,
    )
    review = review_for(data, b)
    review["befundpruefung"][0].update(
        status="korrigiert",
        ersetzung={
            "stelle": "S1",
            "zitat": "Liebe Klasse, wir handeln gemeinsam.",
            "korrektur": "Liebe Klasse, wir arbeiten zusammen.",
        },
        erklaerung="Der vollständige Satz erhält eine passende gemeinsame Formulierung.",
    )
    dr.apply_review(data, review, b)
    finding = data["fehler"][0]
    assert finding["zitat"] == "Liebe Klasse, wir handeln gemeinsam."
    assert finding["korrektur"] == "Liebe Klasse, wir arbeiten zusammen."
    assert finding["textanker"]["start"] == 0


def test_bad_note_does_not_discard_another_reviewed_note():
    data, b = primary(), basis()
    data["hinweise"] = [
        {"zitat": "Liebe Klasse", "kommentar": "Ursprünglich eins."},
        {"zitat": "Schule", "kommentar": "Ursprünglich zwei."},
    ]
    review = review_for(data, b)
    review["aussagenpruefung"]["hinweise"] = {
        "eintraege": [
            {
                "hinweis_id": "hinweis-1",
                "status": "korrigiert",
                "stelle": "S1",
                "zitat": "Liebe Klasse",
                "kommentar": "Geprüft und angepasst.",
            },
            {
                "hinweis_id": "hinweis-2",
                "status": "korrigiert",
                "stelle": "S9",
                "zitat": "Schule",
                "kommentar": "Nicht sicher verankert.",
            },
        ]
    }
    dr.apply_review(data, review, b)
    assert data["hinweise"][0]["kommentar"] == "Geprüft und angepasst."
    assert data["hinweise"][1]["kommentar"] == "Ursprünglich zwei."
    assert data["notenempfehlung_vorlaeufig"]


def test_structured_legacy_review_need_is_not_lost():
    data, b = primary(), basis()
    review = review_for(data, b)
    review["pruefbedarf"] = [{"bereich": "Quelle", "beschreibung": "Fassung klären."}]
    dr.apply_review(data, review, b)
    assert any("Quelle: Fassung klären." in w["message"] for w in data["qualitaetswarnungen"])


@pytest.mark.parametrize("ref", [2, "2", "befund-2", "Befund_2", " Befund-2 "])
def test_reference_variants_are_local_and_preserve_raw(ref):
    data = primary()
    data["fehler"] = anchor_findings([{"befund_id": "befund-2", "zitat": "handeln", "korrektur": "agieren", "typ": "A", "erklaerung": "Test"}], TEXT)
    b = basis()
    r = review_for(data, b)
    for entry in r["kriterienpruefung"].values():
        entry["befund_ids"] = [ref]
    original = copy.deepcopy(r)
    dr.apply_review(data, r, b)
    assert not data["bewertungspruefung"]["aufgaben"]
    assert data["gegenpruefung"]["ergebnis"] == original
    assert r == original


def test_broken_summary_preserves_valid_criteria():
    data = primary(); b = basis(); r = review_for(data, b)
    r["aussagenpruefung"]["zusammenfassung"] = None
    dr.apply_review(data, r, b)
    assert not data["bewertungspruefung"]["aufgaben"]
    # Ursprünglicher Vorschlag bleibt erhalten, ist aber als offen markiert.
    assert data["zusammenfassung"] == "Du begründest deinen Vorschlag."
    assert data["bewertungspruefung"]["aussagen"]["zusammenfassung"] == "offen"


def test_missing_statements_preserves_valid_criteria():
    data = primary(); b = basis(); r = review_for(data, b)
    del r["aussagenpruefung"]
    dr.apply_review(data, r, b)
    assert not data["bewertungspruefung"]["aufgaben"]
    assert data["gegenpruefung"]["verarbeitung"]["status"] == "unvollstaendig"


@pytest.mark.parametrize("ref", [True, 2.0, -2, "unknown", None])
def test_unknown_reference_never_confirms(ref):
    r, diagnostics = dr.normalize_review({"kriterienpruefung": {"x": {"befund_ids": [ref]}}}, [{"befund_id": "befund-2"}])
    assert r["kriterienpruefung"]["x"]["befund_ids"] == [None]
    assert any(d["code"] == "referenz_unbekannt" for d in diagnostics)


def test_alias_collision_and_contradiction_remain_blocked():
    r, diagnostics = dr.normalize_review({"befundpruefung": [{"befund_id": "befund-2", "status": "bestaetigt"}, {"befund_id": "befund-2", "status": "verworfen"}], "kriterienpruefung": {"x": {"befund_ids": ["befund-2"]}}}, [{"befund_id": "befund-2"}])
    assert None in r["kriterienpruefung"]["x"]["befund_ids"]
    assert any(d["code"] == "befund_widerspruechlich" for d in diagnostics)
    r, diagnostics = dr.normalize_review({"befundpruefung": [{"befund_id": 2}]}, [{"befund_id": "befund-2"}, {"befund_id": "Befund_2"}])
    assert r["befundpruefung"][0]["befund_id"] is None
    assert any(d["code"] == "referenz_mehrdeutig" for d in diagnostics)


def test_language_pipeline_ignores_grades_and_stale_expectations(monkeypatch):
    from correction_basis import basis_hash
    b=dict(version=1,pruefumfang="sprache",aufgabenstellung="",ausgangstext="Ungeklärt",rubrik_inhalt=rubric(),erwartungshorizont="",umfangsvorgabe="keine Vorgabe",quellenstatus="offen")
    prompts=[]
    def answer(prompt,*args,**kwargs):
        prompts.append(prompt)
        if len(prompts)==1:return json.dumps(primary())
        d=primary();d["bewertung"]={}
        return json.dumps(review_for(d,basis()))
    monkeypatch.setattr(nc,"run_llm_api",answer)
    result,errors=nc.run_llm_analysis(TEXT,rubric(),"Deutsch","Unterstufe","Rede",nc.load_config(),persist=False,pseudonymisierung=False,max_retries=1,correction_basis={"grundlage":b})
    assert result,errors
    assert result["bewertung"] == {}
    assert result["pruefumfang"] == "sprache"
    assert "notenempfehlung" not in result
    assert not result["bewertungspruefung"]["aufgaben"]
    assert len(prompts)==2


def test_confirmed_empty_horizon_never_loads_config(monkeypatch):
    from correction_basis import basis_hash
    b=dict(version=1,pruefumfang="vollstaendig",aufgabenstellung="Verfasse eine Rede.",ausgangstext="",rubrik_inhalt=rubric(),erwartungshorizont="",umfangsvorgabe="keine Vorgabe",quellenstatus="nicht_noetig")
    b["bestaetigung_hash"]=basis_hash(b)
    monkeypatch.setattr(nc,"load_erwartungshorizont",lambda *args:"STALE_EXPECTATION")
    prompts=[]
    def answer(prompt,*args,**kwargs):
        prompts.append(prompt)
        return json.dumps(primary() if len(prompts)==1 else review_for(primary(),basis()))
    monkeypatch.setattr(nc,"run_llm_api",answer)
    result,errors=nc.run_llm_analysis(TEXT,rubric(),"Deutsch","Unterstufe","Rede",nc.load_config(),persist=False,pseudonymisierung=False,max_retries=1,correction_basis={"grundlage":b})
    assert result,errors
    assert len(prompts)==2
    assert all("STALE_EXPECTATION" not in p for p in prompts)


@pytest.mark.parametrize("status,reason,kind,conflict", [("korrigiert","","normfehler",False),("bestaetigt",None,"ungueltig",False),("bestaetigt","Geprüft","normfehler",True)])
def test_invalid_finding_review_cannot_support_criteria(status,reason,kind,conflict):
    d=primary();b=basis()
    d["fehler"]=anchor_findings([{"befund_id":"befund-2","zitat":"handeln","korrektur":"agieren","typ":"A","erklaerung":"Test","befundart":"normfehler"}],TEXT)
    d["fehler"][0]["kontext_widerspruch"]=conflict
    r=review_for(d,b)
    r["befundpruefung"][0].update(status=status,begruendung=reason,befundart=kind)
    for entry in r["kriterienpruefung"].values():entry["befund_ids"]=[2]
    dr.apply_review(d,r,b)
    assert d["bewertungspruefung"]["status"]=="offen"
    assert all(task["pruefart"]=="technik" for task in d["bewertungspruefung"]["aufgaben"])


def language_basis(text=TEXT):
    b = basis()
    b["schuelertext"] = text
    b["rastervertrag"]["kriterien"] = {}
    b["rastervertrag"]["srdp_detail"] = False
    b["pruefumfang"] = "sprache"
    return b


def language_data():
    d = primary()
    d["bewertung"] = {}
    return d


def warning_codes(data):
    return [w["code"] for w in data.get("qualitaetswarnungen", [])]


def warning_messages(data):
    return [w["message"] for w in data.get("qualitaetswarnungen", [])]


def test_new_review_findings_are_never_self_confirmed():
    data, b = primary(), basis()
    review = review_for(data, b)
    review["neue_befunde"] = [{
        "stelle": "S1", "zitat": "wir handeln", "korrektur": "wir arbeiten", "typ": "A",
        "befundart": "normfehler", "erklaerung": "Test.",
        "ersetzungspruefung": {"status": "bestaetigt", "ergebniskontext": "Liebe Klasse, wir arbeiten gemeinsam."},
    }]
    dr.apply_review(data, review, b)
    finding = data["fehler"][0]
    assert finding["ki_pruefung"]["status"] == "ungeklaert"
    assert finding["ki_pruefung"]["vorgeschlagene_befundart"] == "normfehler"
    assert finding["befundart"] == "ungeklaert"


def test_unclear_finding_decision_is_not_a_technical_failure():
    data, b = primary(), basis()
    data["fehler"] = anchor_findings([{"befund_id": "befund-1", "zitat": "handeln", "korrektur": "Handeln", "typ": "R", "erklaerung": "Test", "befundart": "normfehler"}], TEXT)
    review = review_for(data, b)
    review["befundpruefung"][0].update(status="ungeklaert", befundart="ungeklaert", begruendung="Lesart offen.")
    dr.apply_review(data, review, b)
    assert data["gegenpruefung"]["verarbeitung"]["diagnosen"] == []
    assert "antwort_technisch_unvollstaendig" not in warning_codes(data)
    assert data["fehler"][0]["befundart"] == "ungeklaert"


def test_model_ids_for_new_findings_do_not_break_references():
    data, b = primary(), basis()
    review = review_for(data, b)
    review["neue_befunde"] = [{"befund_id": "neu-1", "stelle": "S1", "zitat": "wir handeln", "korrektur": "wir arbeiten", "typ": "A", "befundart": "stilalternative", "erklaerung": "Alternative."}]
    for entry in review["kriterienpruefung"].values():
        entry["befund_ids"] = ["neu-1", "neu-2"]
    review["aussagenpruefung"]["zusammenfassung"]["befund_ids"] = ["neu-1"]
    dr.apply_review(data, review, b)
    assert data["gegenpruefung"]["verarbeitung"]["diagnosen"] == []
    assert "antwort_technisch_unvollstaendig" not in warning_codes(data)
    assert not data["bewertungspruefung"]["aufgaben"]
    assert data["zusammenfassung"] == "Du begründest deinen Vorschlag."
    assert data["bewertungspruefung"]["aussagen"]["zusammenfassung"] == "bestaetigt"


def test_corrected_statement_without_value_keeps_original_marked_open():
    data, b = primary(), basis()
    review = review_for(data, b)
    review["aussagenpruefung"]["zusammenfassung"]["status"] = "korrigiert"
    del review["aussagenpruefung"]["zusammenfassung"]["wert"]
    dr.apply_review(data, review, b)
    assert data["zusammenfassung"] == "Du begründest deinen Vorschlag."
    assert data["bewertungspruefung"]["aussagen"]["zusammenfassung"] == "offen"


def test_review_prompt_asks_for_value_of_corrected_statements():
    prompt = dr.review_prompt(basis(), primary())
    shape = json.loads(prompt.rsplit("\n", 1)[1])
    assert "wert" in shape["aussagenpruefung"]["zusammenfassung"]


@pytest.mark.parametrize("criteria", ["returned", "missing"])
def test_language_mode_ignores_criteria_section(criteria):
    data, b = language_data(), language_basis()
    review = review_for(data, b)
    if criteria == "returned":
        review["kriterienpruefung"] = {"ausdruck": {"status": "bestaetigt", "befund_ids": ["befund-9"]}}
    else:
        del review["kriterienpruefung"]
    assert dr.review_shape_valid(review, kriterien_erwartet=False)
    dr.apply_review(data, review, b)
    assert data["gegenpruefung"]["verarbeitung"]["diagnosen"] == []
    assert not any("Kriterien" in m for m in warning_messages(data))
    assert "antwort_technisch_unvollstaendig" not in warning_codes(data)


def test_review_need_naming_a_finding_is_attached_to_it():
    data, b = primary(), basis()
    data["fehler"] = anchor_findings([{"befund_id": "befund-1", "zitat": "handeln", "korrektur": "Handeln", "typ": "R", "erklaerung": "Test", "befundart": "normfehler"}], TEXT)
    review = review_for(data, b)
    review["pruefbedarf"] = ["befund-1: Typ sollte A sein.", "Beilage fehlt."]
    dr.apply_review(data, review, b)
    assert data["fehler"][0]["ki_pruefung"]["pruefbedarf"] == ["befund-1: Typ sollte A sein."]
    messages = warning_messages(data)
    assert "Beilage fehlt." in messages
    assert "befund-1: Typ sollte A sein." not in messages


def test_salutation_rule_and_type_check_run_after_review():
    text = "Liebe Klasse,\nDer Plan: wir handeln gemeinsam."
    data, b = language_data(), language_basis(text)
    data["fehler"] = anchor_findings([{"befund_id": "befund-1", "zitat": "handeln gemeinsam", "korrektur": "handeln, gemeinsam", "typ": "G", "erklaerung": "Test", "befundart": "normfehler"}], text)
    dr.apply_review(data, review_for(data, b), b)
    by_quote = {f["zitat"]: f for f in data["fehler"]}
    rule = by_quote["Der Plan:"]
    assert rule["korrektur"] == "der Plan:" and rule["ki_pruefung"]["herkunft"] == "regelpruefung"
    assert rule["regel_muster"] == "anrede_klein"
    typed = by_quote["handeln gemeinsam"]
    assert typed["typ"] == "Z" and typed["typ_vorher"] == "G"
    assert typed["regel_muster"] == "komma"


def test_title_filter_keeps_lowercase_finding_after_salutation_comma():
    finding = {"zitat": "Haben Sie", "korrektur": "haben Sie", "typ": "R", "erklaerung": "Nach der Anrede kleinschreiben."}
    kept = nc.filter_title_false_positives([dict(finding)], "Liebe Klasse,\nHaben Sie Zeit?")
    assert len(kept) == 1
    # Ohne Anrede bleibt der Absatzanfang groß; der Filter greift weiterhin.
    assert nc.filter_title_false_positives([dict(finding)], "Titel\nHaben Sie Zeit?") == []
