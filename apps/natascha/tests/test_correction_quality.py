"""Synthetische Regressionen für Export, Texttreue und Anbieterparameter."""
from __future__ import annotations

import copy
import json
import sqlite3
import subprocess
import sys
from pathlib import Path
from zipfile import ZipFile

import pytest
from docx import Document

import natascha_core as nc
import natascha_db as db
import generate_feedback as gf
from correction_quality import anchor_findings, apply_countercheck, deduplicate, find_spans, word_requirement
from model_reasoning import model_options, resolve_reasoning

ROOT = Path(__file__).resolve().parents[1]


def payload() -> dict:
    raw = json.loads((ROOT / "tests/fixtures/beispiel_deutsch_mit_fehlern.json").read_text(encoding="utf-8"))
    for criterion in raw["bewertung"].values():
        criterion["stufe"] = 3
    return raw


@pytest.mark.parametrize("provider,model,selection,expected", [
    ("deepseek", "deepseek-v4-pro", "high", {"thinking": {"type": "enabled"}, "reasoning_effort": "high"}),
    ("openai", "gpt-6.1-sol", "low", {"reasoning_effort": "low"}),
    ("anthropic", "claude-sonnet-5-5", "off", {"thinking": {"type": "between_tools"}}),
    ("qwen", "qwen3.8-max", "medium", {"enable_thinking": True, "reasoning_effort": "medium"}),
    ("mistral", "mistral-small-2603", "off", {"reasoning_effort": "none"}),
    ("kimi", "kimi-k3", "max", {"reasoning_effort": "max"}),
    ("kimi", "kimi-k2.6", "off", {"thinking": {"type": "disabled"}}),
])
def test_native_parameters(provider, model, selection, expected):
    assert resolve_reasoning(provider, model, selection)["parameters"] == expected


@pytest.mark.parametrize("provider,model", [("openai", "gpt-6.1-sol"), ("anthropic", "claude-opus-5-5"), ("kimi", "kimi-k3")])
def test_always_reasoning_models_reject_off(provider, model):
    assert "off" not in {v["id"] for v in model_options(provider, model)["options"]}
    with pytest.raises(ValueError):
        resolve_reasoning(provider, model, "off")


@pytest.mark.parametrize("provider,model", [
    ("deepseek", "deepseek-v4-pro"), ("openai", "gpt-6.1-sol"),
    ("anthropic", "claude-sonnet-5-5"), ("qwen", "qwen3.8-max"),
    ("mistral", "mistral-large-4"), ("kimi", "kimi-k3"),
])
def test_dispatch_forwards_selected_parameters_and_budget(monkeypatch, provider, model):
    for key in ("DEEPSEEK_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "QWEN_API_KEY", "MISTRAL_API_KEY", "KIMI_API_KEY"):
        monkeypatch.setenv(key, "synthetic-test-key")
    selected = "medium" if provider == "qwen" else "high"
    config = {"api": {"provider": provider, "model": model, "reasoning": selected}}
    calls = []
    def compat(*args, **kwargs):
        calls.append((args, kwargs)); return "{}"
    monkeypatch.setattr(nc, "_call_openai_compat", compat)
    monkeypatch.setattr(nc, "run_anthropic_api", compat)
    assert nc.run_llm_api("synthetic request", config) == "{}"
    args, kwargs = calls[0]
    native = kwargs.get("reasoning_parameters", kwargs.get("extra_body", {}))
    for key, value in resolve_reasoning(provider, model, selected)["parameters"].items():
        assert native[key] == value
    assert kwargs["max_tokens"] >= 32768
    assert (kwargs.get("timeout") or args[2 if provider == "anthropic" else 4]) >= 300


def test_quotes_preserve_spelling_and_word_boundaries():
    assert not find_spans("unreife Zellen", "reife Zellen")
    assert not find_spans("Das Lesen macht Freude.", "das Lesen")
    assert not find_spans("Hallo, Welt!", "Hallo Welt")
    assert find_spans("Hallo,   Welt!", "Hallo, Welt") == [(0, 13)]
    findings = anchor_findings([{"zitat": "gutes", "korrektur": "Gutes", "typ": "R"}], "🙂 etwas gutes")
    assert findings[0]["textanker"]["start"] == 9
    repeated = anchor_findings([{"zitat": "gut", "typ": "A"}], "gut ist gut")[0]
    assert repeated["anker_status"] == "mehrdeutig" and "textanker" not in repeated


def test_same_changed_span_is_counted_once():
    findings = anchor_findings([
        {"zitat": "etwas gutes", "korrektur": "etwas Gutes", "typ": "R"},
        {"zitat": "gutes", "korrektur": "Gutes", "typ": "R"},
        {"zitat": "er geht", "korrektur": "er ging", "typ": "G"},
    ], "etwas gutes; er geht")
    assert len(deduplicate(findings)) == 2


def test_contained_finding_with_same_change_is_merged_into_larger_replacement():
    text = "Wir glauben das KI hilft. Wir reden über über die Zukunft."
    findings = anchor_findings([
        {"befund_id": "befund-1", "zitat": "glauben das KI", "korrektur": "glauben, dass KI", "typ": "R"},
        {"befund_id": "befund-2", "zitat": "das KI", "korrektur": "dass KI", "typ": "R"},
        {"befund_id": "befund-3", "zitat": "über über", "korrektur": "über", "typ": "G"},
        {"befund_id": "befund-4", "zitat": "über über die", "korrektur": "über die", "typ": "G"},
    ], text)
    kept = deduplicate(findings)
    assert [f["befund_id"] for f in kept] == ["befund-1", "befund-4"]
    assert kept[0]["zusammengefuehrt"] == ["befund-2"]
    assert kept[1]["zusammengefuehrt"] == ["befund-3"]


def test_overlapping_quotes_with_independent_changes_stay_separate():
    text = "Wir glauben das KI hilft."
    findings = anchor_findings([
        {"befund_id": "befund-1", "zitat": "glauben das", "korrektur": "glauben, das", "typ": "Z"},
        {"befund_id": "befund-2", "zitat": "das KI", "korrektur": "dass KI", "typ": "R"},
    ], text)
    assert len(deduplicate(findings)) == 2


def test_verified_finding_wins_over_unverified_overlap():
    text = "Wir hoffen auf etwas neues."
    findings = anchor_findings([
        {"befund_id": "befund-1", "zitat": "etwas neues", "korrektur": "etwas Neues", "typ": "R",
         "befundart": "ungeklaert", "ki_pruefung": {"status": "ungeklaert"}},
        {"befund_id": "befund-2", "zitat": "neues", "korrektur": "Neues", "typ": "R",
         "befundart": "normfehler", "ki_pruefung": {"status": "bestaetigt"},
         "ersetzungspruefung": {"status": "bestaetigt"}},
    ], text)
    kept = deduplicate(findings)
    assert [f["befund_id"] for f in kept] == ["befund-2"]
    assert kept[0]["zusammengefuehrt"] == ["befund-1"]


def test_sentence_start_claim_is_not_a_safe_rule_inside_a_sentence():
    quote="wenn wir gemeinsam handeln"
    finding={"befundart":"normfehler","zitat":quote,"korrektur":"Wenn wir gemeinsam handeln","typ":"R","erklaerung":"Satzanfänge werden großgeschrieben."}
    wrong=anchor_findings([copy.deepcopy(finding)],"Es hilft, wenn wir gemeinsam handeln.")[0]
    assert wrong["befundart"] == "ungeklaert" and wrong["kontext_widerspruch"] is True
    genuine=anchor_findings([copy.deepcopy(finding)],"Wir warten. wenn wir gemeinsam handeln, gelingt es.")[0]
    assert genuine["befundart"] == "normfehler" and not genuine.get("kontext_widerspruch")


def test_task_word_limit_overrides_rubric_with_visible_conflict():
    assert word_requirement("Schreibe 500–600 Wörter.", "Umfang: 300–400 Wörter", None) == (
        "500–600 Wörter", "Umfangsvorgaben widersprechen sich. Verbindliche Aufgabenangabe: 500–600 Wörter; allgemeine Rasterangaben haben keinen Vorrang.")


def test_main_prompt_has_paired_examples_without_foreign_model_essay():
    prompt = nc.build_analysis_prompt("Synthetische Rede.", "Inhalt und Sprache", "Deutsch", "Oberstufe", "Meinungsrede", nc.load_config())
    assert "genau 3" not in prompt and "mega geil" not in prompt and "mega wichtig" not in prompt
    assert "würde-Form ist korrekt" in prompt and "befundart" in prompt


def test_second_call_receives_complete_basis_and_countercheck_contract(monkeypatch):
    captured = []
    monkeypatch.setattr(nc, "run_llm_api", lambda prompt, *_args, **_kw: captured.append(prompt) or "{}")
    basis = {"rubrik": "RUBRIK_SENTINEL", "beilage_und_arbeitsauftraege": "AUFTRAG_SENTINEL", "erwartungshorizont": "ERWARTUNG_SENTINEL", "umfangsvorgabe": "500–600 Wörter"}
    nc.generate_srdp_detail("SCHUELER_SENTINEL", {"fehler": [{"befund_id": "f1", "zitat": "SCHUELER_SENTINEL"}]}, {}, textsorte="Meinungsrede", bewertungsgrundlage=basis)
    assert all(value in captured[0] for value in basis.values())
    assert "SCHUELER_SENTINEL" in captured[0] and "befundpruefung" in captured[0]


def test_countercheck_uncertainty_remains_separate_from_teacher_decision():
    data = {"fehler": [{"befund_id": "f1", "zitat": "handeln würden", "typ": "G", "lehrkraft_aktion": "uebernommen"}]}
    apply_countercheck(data, {"befundpruefung": [{"befund_id": "f1", "status": "widerspruch", "befundart": "stilalternative", "begruendung": "Zulässige Form."}]}, "Wir handeln würden.")
    assert data["fehler"][0]["befundart"] == "stilalternative"
    assert data["fehler"][0]["lehrkraft_aktion"] == "uebernommen"
    assert data["qualitaetswarnungen"]


def test_srdp_wording_uses_one_to_five_everywhere():
    for words in gf.SRDP_WORTLAUT.values():
        assert set(words) == {1, 2, 3, 4, 5}
        assert words[1] == "nicht erfüllt"


def test_model_stage_wording_is_normalized_before_persistence(monkeypatch):
    raw = payload()
    for criterion in raw["bewertung"].values():
        criterion["stufe"] = "das Wesentliche zur Gänze erfüllt"
        criterion["punkte"] = 3
    monkeypatch.setattr(nc, "run_llm_api", lambda *_a, **_kw: json.dumps(raw))
    config = nc.load_config(); config["api"] = {"provider":"deepseek","model":"deepseek-v4-pro"}
    data, errors = nc.run_llm_analysis("Synthetischer Text.", (ROOT / "rubrics/deutsch_unterstufe.md").read_text(encoding="utf-8"), "Deutsch", "Unterstufe", "Meinungsrede", config, land="de", persist=False, pseudonymisierung=False, max_retries=1)
    assert data is not None, errors
    assert all(criterion["stufe"] == 3 for criterion in data["bewertung"].values())
    assert data["stufenwortlaute_llm"]


def test_style_comment_and_comma_marking_are_anchored_without_error_strikethrough():
    raw = payload(); raw["hinweise"] = []
    raw["fehler"] = [
        {"zitat":"bequeme Funktion","korrektur":"praktische Funktion","typ":"A","befundart":"stilalternative"},
        {"zitat":"Ja wir","korrektur":"Ja, wir","typ":"Z","befundart":"normfehler"},
    ]
    doc=gf.build_feedback_document(gf.parse_feedback_data(raw),original_text="Eine bequeme Funktion. Ja wir handeln.")
    assert not doc._element.xpath('.//w:strike')
    assert len(doc._element.xpath('.//w:commentRangeStart')) == 1
    assert any(
        r.text == "Ja wir" and r.font.underline
        for p in doc.paragraphs for r in p.runs
    )
    assert any(p.text == "Eine bequeme Funktion. Ja wir handeln." for p in doc.paragraphs)


def test_original_text_comments_teacher_grade_and_formative_mode(tmp_path):
    raw = payload(); raw["fehler"] = [{"zitat": "gutes", "korrektur": "Gutes", "typ": "R", "erklaerung": "Substantivierung", "befundart": "normfehler"}]
    data = gf.parse_feedback_data(raw)
    data.lehrer_note = 2; data.lehrer_kommentar = "Synthetischer Lehrkraftkommentar."
    original = "Synthetische Rede\n\nWir wollen etwas gutes."
    doc = gf.build_feedback_document(data, original_text=original)
    output = tmp_path / "feedback.docx"; doc.save(output)
    texts = [p.text for p in doc.paragraphs]
    assert "Synthetische Rede" in texts
    original_runs = ["".join(r.text for r in p.runs if r.font.color.rgb != gf.C_STRENGTH) for p in doc.paragraphs]
    assert "Wir wollen etwas gutes." in original_runs
    assert "LEHRERNOTE: 2" in texts and data.lehrer_kommentar in texts
    assert any("KI-NOTENEMPFEHLUNG" in text for text in texts)
    with ZipFile(output) as archive:
        assert "word/comments.xml" in archive.namelist()
    data.bewertungsmodus = "unbenotet"
    formative = gf.build_feedback_document(data, original_text=original)
    assert not any("LEHRERNOTE:" in p.text or "KI-NOTENEMPFEHLUNG" in p.text for p in formative.paragraphs)


def test_cli_exports_selected_revision_without_source_file_or_teacher_grade(tmp_path):
    db_path = tmp_path / "synthetic.db"; db.init_db(db_path)
    source = tmp_path / "synthetic.docx"; source.write_bytes(b"synthetic source hash")
    first = payload(); first["fehler"] = []
    abgabe_id = db.save_analysis_to_db(db_path, first, source, "TEST", "Rede", rohtext="ERSTE TEXTFASSUNG\n\nOriginal.")
    first_revision = first["_revision_id"]
    second = payload(); second["fehler"] = []
    db.save_analysis_to_db(db_path, second, source, "TEST", "Rede", rohtext="ZWEITE TEXTFASSUNG", revision_of_abgabe_id=abgabe_id)
    source.unlink()
    output = tmp_path / "export.docx"
    result = subprocess.run([sys.executable, str(ROOT / "natascha_cli.py"), "--db-path", str(db_path), "feedback-docx", str(abgabe_id), "--revision-id", str(first_revision), "--output", str(output)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    text = "\n".join(p.text for p in Document(output).paragraphs)
    assert "ERSTE TEXTFASSUNG" in text and "ZWEITE TEXTFASSUNG" not in text
    assert "KI-NOTENEMPFEHLUNG" in text
    with sqlite3.connect(db_path) as conn:
        assert conn.execute("SELECT COUNT(*) FROM lehrer_feedback").fetchone()[0] == 0


def test_style_and_open_findings_do_not_enter_confirmed_error_heatmap(tmp_path):
    path = tmp_path / "test.db"; db.init_db(path)
    source = tmp_path / "test.docx"; source.write_bytes(b"synthetic")
    raw = payload(); raw["fehler"] = [
        {"zitat": "gut", "korrektur": "schön", "typ": "A", "befundart": kind}
        for kind in ("normfehler", "stilalternative", "ungeklaert")]
    aid = db.save_analysis_to_db(path, raw, source, "TEST", "Rede", rohtext="gut")
    with sqlite3.connect(path) as conn:
        conn.execute("UPDATE fehler_historie SET lehrkraft_aktion='uebernommen' WHERE abgabe_id=?", (aid,))
        count = conn.execute("SELECT COUNT(*) FROM fehler_historie WHERE COALESCE(befundart,'normfehler') NOT IN ('stilalternative','ungeklaert')").fetchone()[0]
    assert count == 1
    heatmap = db.get_fehler_heatmap(path, "TEST", "Rede")
    assert sum(row["anzahl"] for row in heatmap) == 1


def test_reanalysis_switch_creates_revision_and_default_still_reuses_result(tmp_path, monkeypatch):
    source = tmp_path / "synthetic.docx"; source.write_bytes(b"synthetic submission")
    config = nc.load_config()
    config["api"] = {"provider": "deepseek", "model": "deepseek-v4-pro"}
    config["paths"]["output"] = str(tmp_path / "output")
    config["classes"] = {}
    calls = []
    raw = payload(); raw["fehler"] = []
    def answer(*_args, **_kwargs):
        calls.append(True)
        return json.dumps(raw)
    monkeypatch.setattr(nc, "run_llm_api", answer)
    args = dict(docx_text="Synthetischer Text.", rubric_content=(ROOT / "rubrics/deutsch_unterstufe.md").read_text(encoding="utf-8"), fach="Deutsch",
        schulstufe="Unterstufe", textsorte="Brief", config=config, file_path=source,
        klasse="TEST", aufgabe="Rede", land="de", pseudonymisierung=False,
        db_path_override=tmp_path / "test.db", max_retries=1)
    first, errors = nc.run_llm_analysis(**args)
    assert first is not None, errors
    first_revision = first["_revision_id"]
    count = len(calls)
    cached, errors = nc.run_llm_analysis(**args)
    assert cached["_abgabe_id"] == first["_abgabe_id"] and len(calls) == count
    assert any("Duplikat" in error for error in errors)
    with sqlite3.connect(args["db_path_override"]) as conn:
        conn.execute("INSERT INTO lehrer_feedback (abgabe_id,klasse,aufgabe,note_final,lehrer_kommentar,pruefstatus) VALUES (?,'TEST','Rede',2,'Geprüft','freigegeben')", (first["_abgabe_id"],))
    rerun, errors = nc.run_llm_analysis(**args, reanalyze_existing=True)
    assert rerun is not None, errors
    assert rerun["_abgabe_id"] == first["_abgabe_id"] and len(calls) > count
    assert rerun["_revision_id"] != first_revision
    with sqlite3.connect(args["db_path_override"]) as conn:
        assert conn.execute("SELECT COUNT(*) FROM abgabe").fetchone()[0] == 1
        assert conn.execute("SELECT COUNT(*) FROM korrektur_revision").fetchone()[0] == 2
        previous = conn.execute("SELECT lehrer_note_final,lehrer_kommentar,lehrer_pruefstatus FROM korrektur_revision WHERE id=?", (first_revision,)).fetchone()
        assert previous == (2, "Geprüft", "freigegeben")
        assert conn.execute("SELECT COUNT(*) FROM lehrer_feedback").fetchone()[0] == 0
    count = len(calls)
    nc.run_llm_analysis(**args)
    assert len(calls) == count


@pytest.mark.parametrize("changed", [{"klasse": "ANDERE"}, {"aufgabe": "Andere Aufgabe"}, {"bestaetigte_schueler_id": 999}])
def test_reanalysis_switch_does_not_reassign_existing_work(tmp_path, monkeypatch, changed):
    source = tmp_path / "synthetic.docx"; source.write_bytes(b"synthetic submission")
    path = tmp_path / "test.db"; db.init_db(path)
    aid = db.save_analysis_to_db(path, payload(), source, "TEST", "Rede", rohtext="Original.")
    with sqlite3.connect(path) as conn:
        # Use a valid synthetic person for the existing binding.
        sid = conn.execute("INSERT INTO schueler (klasse,vorname,nachname) VALUES ('TEST','Test','Person')").lastrowid
        conn.execute("UPDATE abgabe SET schueler_id=? WHERE id=?", (sid, aid))
    monkeypatch.setattr(nc, "run_llm_api", lambda *_a, **_k: pytest.fail("Kein Versand bei fremder Zuordnung"))
    config = nc.load_config()
    config["api"] = {"provider": "deepseek", "model": "deepseek-v4-pro"}
    args = dict(docx_text="Original.", rubric_content=(ROOT / "rubrics/deutsch_unterstufe.md").read_text(encoding="utf-8"), fach="Deutsch", schulstufe="Unterstufe", textsorte="Brief",
        config=config, file_path=source,
        klasse="TEST", aufgabe="Rede", land="de", pseudonymisierung=False, db_path_override=path, reanalyze_existing=True)
    args.update(changed)
    result, errors = nc.run_llm_analysis(**args)
    assert result is None and any("Zuordnung" in error for error in errors)
    with sqlite3.connect(path) as conn:
        assert conn.execute("SELECT klasse,aufgabe FROM abgabe WHERE id=?", (aid,)).fetchone() == ("TEST", "Rede")
