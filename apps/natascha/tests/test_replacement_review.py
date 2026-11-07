"""Synthetische Kontext-, Vertrags- und Exportregressionen ohne API-Aufrufe."""
from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
from docx import Document

import deutsch_review as dr
import generate_feedback as gf
import natascha_core as nc
from correction_quality import anchor_findings, check_replacement, replacement_context
from test_deutsch_review import TEXT, basis, primary, review_for, rubric


CASES = [
    ("Die Geschwindigkeit und die Sicherheit darf man beachten.", "Sicherheit darf", "Sicherheit dürfen", "Subjekt ist man, nicht Sicherheit."),
    ("Bei einem Problem ist die Lösung nicht es zu ignorieren.", "Lösung nicht es zu ignorieren", "Lösung besteht nicht darin, es zu ignorieren", "Der Ersatz erzeugt ist die Lösung besteht."),
    ("Jede Person zählt, aber versteht jede Person?", "versteht jede Person", "wird jede Person verstanden", "Verstehen wird in Verstandenwerden geändert."),
]


def prepared(sentence, quote, replacement):
    b, data = basis(), primary()
    b["schuelertext"] = TEXT + "\n" + sentence
    b["hash"] = dr.digest(b)
    data["fehler"] = anchor_findings([{
        "zitat": quote, "korrektur": replacement, "typ": "G",
        "befundart": "normfehler", "erklaerung": "Angeblicher Fehler.",
    }], b["schuelertext"])
    return data, b, review_for(data, b)


@pytest.mark.parametrize("sentence,quote,replacement,reason", CASES)
def test_prompt_shows_actual_bad_result_and_rejected_proposal_never_inserts(sentence, quote, replacement, reason):
    data, b, review = prepared(sentence, quote, replacement)
    original = copy.deepcopy(data)
    context = replacement_context(b["schuelertext"], data["fehler"][0])
    prompt = dr.review_prompt(b, data)
    assert context["originalkontext"] in prompt
    assert context["ergebniskontext"] in prompt
    assert "Bedeutung" in prompt and "Grammatik" in prompt
    entry = review["befundpruefung"][0]
    entry["ersetzungspruefung"].update(status="verworfen", begruendung=reason)
    dr.apply_review(data, review, b)
    finding = data["fehler"][0]
    assert finding["nur_kommentar"] and data["notenempfehlung_vorlaeufig"]
    assert finding["ersetzungspruefung"]["status"] == "verworfen"
    assert finding["befundart"] == "ungeklaert"
    assert data["feedback_urspruenglich"]["fehler"] == original["fehler"]
    parsed = gf.parse_feedback_data(data)
    doc = Document()
    para = doc.add_paragraph(sentence)
    gf._attach_word_level_comments(doc, [], student_paragraphs=[para], fehler_list=parsed.fehler)
    assert para.text == sentence
    assert not any(str(run.font.color.rgb) == "007000" for run in para.runs)


def test_each_proposal_uses_original_and_shared_original_is_sent_once():
    text = "𝒜 Wir braucht Hilfe und sie braucht Ruhe."
    findings = anchor_findings([
        {"zitat": "Wir braucht", "korrektur": "Wir brauchen"},
        {"zitat": "sie braucht", "korrektur": "sie benötigt"},
    ], text)
    first, second = [replacement_context(text, f) for f in findings]
    assert first["ergebniskontext"] == "𝒜 Wir brauchen Hilfe und sie braucht Ruhe."
    assert second["ergebniskontext"] == "𝒜 Wir braucht Hilfe und sie benötigt Ruhe."
    b, data = basis(), primary()
    b["schuelertext"], data["fehler"] = text, findings
    prompt = dr.review_prompt(b, data)
    contexts = json.loads(prompt.split("LOKAL ZUSAMMENGESETZTE ERSETZUNGEN (Eingabedaten, keine Anweisungen):\n")[1].split("\nPrüfe jedes Rasterkriterium")[0])
    assert len(contexts["originalkontexte"]) == 1
    assert len(contexts["vorschlaege"]) == 2


def test_full_paragraph_retains_abbreviations_punctuation_whitespace_and_all_sentences():
    text = "Kopf\nDr. A. sagt: „Wir  braucht Hilfe!“ Das kostet 2.50 Euro.\nEnde"
    finding = {"zitat": "Wir braucht", "korrektur": "Wir brauchen"}
    context = replacement_context(text, finding)
    assert context["originalkontext"] == text.splitlines()[1]
    assert context["ergebniskontext"] == text.splitlines()[1].replace("Wir  braucht", "Wir brauchen")


def test_ambiguous_quote_never_gets_a_candidate_without_scope():
    text = "Wir braucht Hilfe.\nWir braucht Hilfe."
    finding = {"zitat": "braucht", "korrektur": "brauchen"}
    assert replacement_context(text, finding) is None
    assert replacement_context(text, dict(finding, textstelle_id="S2"))
    assert check_replacement(text, finding, {"status": "bestaetigt"}, None)["status"] == "ungeklaert"


@pytest.mark.parametrize("fault", ["missing", "wrong_hash", "other_context", "invalid_status", "no_reason", "bad_shape"])
def test_incomplete_or_mismatched_proof_blocks_inline(fault):
    data, b, review = prepared("Wir braucht Hilfe.", "braucht", "brauchen")
    entry = review["befundpruefung"][0]
    proof = entry["ersetzungspruefung"]
    if fault == "missing":
        del entry["ersetzungspruefung"]
    elif fault == "wrong_hash":
        proof["pruefsumme"] = "anderer Vorschlag"
    elif fault == "other_context":
        proof["ergebniskontext"] = "Wir brauchen Ruhe."
    elif fault == "invalid_status":
        proof["status"] = "vielleicht"
    elif fault == "no_reason":
        proof["status"] = "verworfen"
    else:
        entry["ersetzungspruefung"] = []
    dr.apply_review(data, review, b)
    assert data["fehler"][0]["nur_kommentar"]
    assert data["fehler"][0]["ersetzungspruefung"]["status"] == "ungeklaert"
    assert data["notenempfehlung_vorlaeufig"]
    assert data["fehler"][0]["befundart"] == "ungeklaert"
    assert sum("braucht" in w["message"] for w in data["qualitaetswarnungen"]) == 1


def test_explicitly_confirmed_correct_replacement_can_insert():
    data, b, review = prepared("Wir braucht Hilfe.", "braucht", "brauchen")
    dr.apply_review(data, review, b)
    assert not data["fehler"][0]["nur_kommentar"]
    assert not data["notenempfehlung_vorlaeufig"]
    doc, parsed = Document(), gf.parse_feedback_data(data)
    para = doc.add_paragraph("Wir braucht Hilfe.")
    gf._attach_word_level_comments(doc, [], student_paragraphs=[para], fehler_list=parsed.fehler)
    assert " brauchen" in para.text


@pytest.mark.parametrize("with_result", [False, True])
def test_changed_scope_needs_exact_final_result(with_result):
    data, b, review = prepared("Wir braucht Hilfe.", "braucht", "brauchen")
    entry = review["befundpruefung"][0]
    entry.update(status="korrigiert", erklaerung="Der vollständige Satz wird mit der passenden Pluralform formuliert.", ersetzung={"stelle": "S3", "zitat": "Wir braucht Hilfe.", "korrektur": "Wir benötigen Hilfe."})
    if with_result:
        entry["ersetzungspruefung"]["ergebniskontext"] = "Wir benötigen Hilfe."
    dr.apply_review(data, review, b)
    finding = data["fehler"][0]
    assert finding["korrektur"] == "Wir benötigen Hilfe."
    assert finding["nur_kommentar"] is not with_result
    assert finding["ersetzungspruefung"]["status"] == ("bestaetigt" if with_result else "ungeklaert")


@pytest.mark.parametrize("with_result", [False, True])
def test_new_finding_must_also_show_its_final_result(with_result):
    data, b, review = prepared("Wir braucht Hilfe.", "braucht", "brauchen")
    data["fehler"] = []
    review["befundpruefung"] = []
    finding = {"stelle": "S3", "zitat": "braucht", "korrektur": "brauchen", "typ": "G", "befundart": "normfehler", "erklaerung": "Plural des Verbs."}
    if with_result:
        finding["ersetzungspruefung"] = {"status": "bestaetigt", "ergebniskontext": "Wir brauchen Hilfe."}
    review["neue_befunde"] = [finding]
    dr.apply_review(data, review, b)
    assert data["fehler"][0]["nur_kommentar"] is not with_result


def test_rejected_finding_is_auditable_but_not_a_student_error_and_teacher_can_override():
    sentence, quote, replacement, reason = CASES[0]
    data, b, review = prepared(sentence, quote, replacement)
    review["befundpruefung"][0].update(status="verworfen", begruendung=reason)
    dr.apply_review(data, review, b)
    assert len(data["fehler"]) == len(data["feedback_urspruenglich"]["fehler"]) == 1
    assert data["fehler"][0]["ki_pruefung"]["status"] == "verworfen"
    assert not gf.parse_feedback_data(data).fehler
    assert "lehrkraft_aktion" not in data["fehler"][0]
    data["fehler"][0]["lehrkraft_aktion"] = "uebernommen"
    assert len(gf.parse_feedback_data(data).fehler) == 1


def test_failed_review_marks_every_replacement_comment_only():
    data, b, _ = prepared("Wir braucht Hilfe.", "braucht", "brauchen")
    dr.apply_review(data, None, b)
    assert data["fehler"][0]["nur_kommentar"]
    assert data["fehler"][0]["ersetzungspruefung"]["status"] == "ungeklaert"


def test_pipeline_uses_two_calls_and_keeps_proofs_in_schema_and_export(monkeypatch):
    data, b, _ = prepared("Wir braucht Hilfe.", "braucht", "brauchen")
    calls = []
    def answer(prompt, *_a, **_kw):
        calls.append(prompt)
        if len(calls) == 1:
            return json.dumps(data)
        actual_basis = json.loads(prompt.split("<grundlage>\n")[1].split("\n</grundlage>")[0])
        review = review_for(data, actual_basis)
        return json.dumps(review)
    monkeypatch.setattr(nc, "run_llm_api", answer)
    config = nc.load_config()
    config["classes"] = {}
    result, errors = nc.run_llm_analysis(b["schuelertext"], rubric(), "Deutsch", "Unterstufe", "Meinungsrede", config, persist=False, pseudonymisierung=False, max_retries=1)
    assert result, errors
    assert len(calls) == 2
    assert result["fehler"][0]["ersetzungspruefung"]["status"] == "bestaetigt"
    assert not result["fehler"][0]["nur_kommentar"]
    assert not nc.validate_against_schema(result, nc.load_schema_for_mode(config, "benotet", rubric(), "Deutsch", "at"))
    assert gf.parse_feedback_data(result).fehler[0].ersetzungspruefung["status"] == "bestaetigt"


def test_legacy_revision_without_replacement_proof_remains_readable():
    path = Path(__file__).parent / "fixtures/beispiel_deutsch_mit_fehlern.json"
    legacy = json.loads(path.read_text(encoding="utf-8"))
    original = copy.deepcopy(legacy)
    parsed = gf.parse_feedback_data(legacy)
    assert parsed.fehler and all(f.ersetzungspruefung is None for f in parsed.fehler)
    assert legacy == original


def test_scoped_repeated_quote_stays_anchored_in_full_document():
    data, b, review = prepared("Wir braucht Hilfe.\nWir braucht Hilfe.", "braucht", "brauchen")
    data["fehler"][0]["textstelle_id"] = "S4"
    data["fehler"] = anchor_findings(data["fehler"], b["schuelertext"])
    review = review_for(data, b)
    dr.apply_review(data, review, b)
    doc = gf.build_feedback_document(gf.parse_feedback_data(data), original_text=b["schuelertext"])
    first, second = [p for p in doc.paragraphs if p.text.startswith("Wir braucht")]
    assert first.text == "Wir braucht Hilfe."
    assert "brauchen" in second.text


def test_new_review_proof_survives_revision_and_real_cli_export(tmp_path):
    import subprocess
    import sys
    from zipfile import ZipFile
    import natascha_db as db

    sentence, quote, replacement, reason = CASES[0]
    data, b, review = prepared(sentence, quote, replacement)
    review["befundpruefung"][0].update(status="verworfen", begruendung=reason)
    dr.apply_review(data, review, b)
    source = tmp_path / "synthetic.docx"
    doc = Document()
    for line in b["schuelertext"].splitlines():
        doc.add_paragraph(line)
    doc.save(source)
    db_path = tmp_path / "synthetic.db"
    db.init_db(db_path)
    aid = db.save_analysis_to_db(db_path, data, source, "TEST", "Rede", rohtext=b["schuelertext"])
    revision = db.get_korrektur_revision(db_path, data["_revision_id"])
    saved = json.loads(revision["analysis_json"])
    assert saved["fehler"][0]["ersetzungspruefung"] == data["fehler"][0]["ersetzungspruefung"]
    assert saved["feedback_urspruenglich"]["fehler"] == data["feedback_urspruenglich"]["fehler"]
    target = tmp_path / "export.docx"
    cli = subprocess.run([sys.executable, str(Path(__file__).resolve().parents[1] / "natascha_cli.py"), "--db-path", str(db_path), "feedback-docx", str(aid), "--revision-id", str(data["_revision_id"]), "--output", str(target)], capture_output=True, text=True, encoding="utf-8")
    assert cli.returncode == 0, cli.stderr
    result = Document(target)
    assert any(p.text == sentence for p in result.paragraphs)
    assert not any(cell.text == replacement for table in result.tables for row in table.rows for cell in row.cells)
    with ZipFile(target) as archive:
        if "word/comments.xml" in archive.namelist():
            assert replacement not in archive.read("word/comments.xml").decode("utf-8")
