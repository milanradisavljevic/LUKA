"""Teilbelege, gezielte Klärung und unveränderte Rohrevisionen."""
import copy
import json
import sqlite3
import pytest
import deutsch_review as dr
import natascha_core as nc
import natascha_db as db
from review_resolution import resolve_criteria, save_review
from test_deutsch_review import primary, basis, review_for, TEXT


def detail_review():
    data, b = primary(), basis("meinungsrede.md")
    review = review_for(data, b)
    return data, b, review


def test_bad_extra_quote_preserves_all_fifteen_details():
    data, b, review = detail_review()
    entry = review["srdp_detail"]["k3_sprachnormen"]["orthografie"]
    entry["belege"] = entry["belege"] + [{"stelle": "S1", "zitat": "wir handelten zusammen"}]
    dr.apply_review(data, review, b)
    assert data["bewertungspruefung"]["status"] == "vollstaendig"
    assert len(data["bewertungspruefung"]["belegdiagnosen"]) == 1
    assert nc._srdp_detail_ist_gueltig(data["srdp_detail"])
    assert len(data["srdp_detail"]["k3_sprachnormen"]["orthografie"]["belege"]) == 1
    assert len(review["srdp_detail"]["k3_sprachnormen"]["orthografie"]["belege"]) == 2


def test_missing_detail_preserves_fourteen_and_can_be_resolved_without_model():
    data, b, review = detail_review()
    del review["srdp_detail"]["k3_sprachnormen"]["orthografie"]
    dr.apply_review(data, review, b)
    assert sum(len(values) for values in data["srdp_detail"].values()) == 14
    untouched = copy.deepcopy(data)
    unresolved = resolve_criteria(data, b, {})
    assert "notenempfehlung" not in unresolved
    key = "k3_sprachnormen.orthografie"
    resolved = resolve_criteria(data, b, {key: {"stufe": 3}})
    assert resolved["notenempfehlung"]["note"] == 3
    assert resolved["bewertungspruefung"]["aufgaben"] == []
    assert data == untouched
    with pytest.raises(ValueError):
        resolve_criteria(data, b, {key: {"stufe": True}})
    import generate_feedback as gf
    doc = gf.build_feedback_document(gf.parse_feedback_data(unresolved),original_text=TEXT)
    table_text = '\n'.join(cell.text for table in doc.tables for row in table.rows for cell in row.cells)
    assert "Offen – Lehrkraftprüfung erforderlich" in table_text
    assert "Stufe 0" not in table_text


def test_criteria_and_teacher_actions_save_atomically_without_rewriting_analysis(tmp_path):
    from docx import Document
    data, b, review = detail_review()
    del review["srdp_detail"]["k3_sprachnormen"]["orthografie"]
    dr.apply_review(data, review, b)
    data.update(datei="synthetisch", bewertungsmodus="benotet")
    data["_correction_context"] = "synthetic"
    data["_basis_snapshot"] = b
    source = tmp_path / "synthetic.docx"
    doc = Document(); doc.add_paragraph(TEXT); doc.save(source)
    path = tmp_path / "test.db"
    db.init_db(path)
    aid = db.save_analysis_to_db(path, data, source, "TEST", "Rede", rohtext=TEXT)
    revision = db.get_korrektur_revision_for_abgabe(path, aid)
    # The production basis is passed explicitly by persistence; keep this test
    # independent of private student fixtures.
    with sqlite3.connect(path) as conn:
        conn.execute("UPDATE korrektur_revision SET basis_json=? WHERE id=?", (json.dumps(b), revision["id"]))
    payload = {"abgabeId": aid, "revisionId": revision["id"], "noteFinal": None, "lehrerKommentar": "", "pruefstatus": "entwurf", "aktionen": [], "kriterienEntscheidungen": {"k3_sprachnormen.orthografie": {"stufe": 3}}}
    save_review(path, payload)
    saved = db.get_korrektur_revision(path, revision["id"])
    assert saved["analysis_json"] == revision["analysis_json"]
    assert saved["note"] == 3
    assert json.loads(saved["lehrer_pruefung_json"])["entscheidungen"] == payload["kriterienEntscheidungen"]
    before = saved.copy()
    payload["aktionen"] = [{"id": 99999, "aktion": "uebernommen"}]
    with pytest.raises(ValueError): save_review(path, payload)
    assert db.get_korrektur_revision(path, revision["id"]) == before

    # Neue CLI-Prozesse lesen ausschließlich die gespeicherten Entscheidungen.
    from test_cli_e2e import run_cli
    payload["aktionen"] = []
    payload["pruefstatus"] = "freigegeben"
    request = tmp_path / "review.json"
    request.write_text(json.dumps(payload), encoding="utf-8")
    assert run_cli(path, "review-save", "--payload-file", str(request)) == {"saved": True}
    student = tmp_path / "student.docx"
    teacher = tmp_path / "teacher.docx"
    run_cli(path, "feedback-docx", str(aid), "--ansicht", "schueler", "--output", str(student))
    run_cli(path, "feedback-docx", str(aid), "--output", str(teacher))
    assert "Note: 3" in "\n".join(p.text for p in Document(student).paragraphs)
    assert "PRÜFNACHWEIS FÜR DIE LEHRKRAFT" in "\n".join(p.text for p in Document(teacher).paragraphs)
    assert db.get_korrektur_revision(path, revision["id"])["analysis_json"] == revision["analysis_json"]
    # Eine veraltete Ansicht darf nach dem Versionswechsel nichts speichern.
    with sqlite3.connect(path) as conn:
        conn.execute("UPDATE korrektur_revision SET is_active=0 WHERE id=?", (revision["id"],))
    with pytest.raises(ValueError, match="Korrekturversion"):
        save_review(path, payload)


def test_student_view_is_short_excludes_unaccepted_and_hides_unreleased_grade():
    import generate_feedback as gf
    from docx import Document
    data = primary()
    data.update(staerken_global=[f"Stärke {i}" for i in range(5)], verbesserungsbereiche=[f"Schritt {i}" for i in range(5)], notenempfehlung={"note":3,"durchschnitt":3,"bezeichnung":"Befriedigend","begruendung":"Test"})
    data["fehler"] = [{"zitat":"handeln","korrektur":"agieren","typ":"A","erklaerung":"Nicht übernommen."}]
    feedback = gf.parse_feedback_data(data)
    doc = gf.build_feedback_document(feedback,original_text=TEXT,ansicht="schueler")
    text = "\n".join(p.text for p in doc.paragraphs)
    assert "Stärke 2" in text and "Stärke 3" not in text
    assert "Schritt 2" in text and "Schritt 3" not in text
    assert "Note:" not in text and "FEHLERPROTOKOLL" not in text
    assert "word/comments.xml" not in [part.partname for part in doc.part.package.parts]
    feedback.pruefstatus = "freigegeben"
    feedback.lehrer_note = 2
    text = "\n".join(p.text for p in gf.build_feedback_document(feedback,original_text=TEXT,ansicht="schueler").paragraphs)
    assert "Note: 2" in text


def test_source_dependent_claims_and_rejected_support_do_not_survive():
    from correction_quality import anchor_findings
    data, b = primary(), basis()
    data["fehler"] = anchor_findings([{"zitat":"handeln", "korrektur":"agieren", "typ":"G", "befundart":"normfehler"}],TEXT)
    review = review_for(data,b)
    review["quellenpruefung"] = {"status":"ungeklaert","begruendung":"Die Beilage widerspricht sich."}
    review["befundpruefung"][0].update(status="verworfen",begruendung="Kein Grammatikfehler.")
    review["kriterienpruefung"]["sprachrichtigkeit"]["befund_ids"] = [data["fehler"][0]["befund_id"]]
    data["bewertung"]["sprachrichtigkeit"]["schwaechen"] = ["Falscher Kongruenzvorwurf."]
    review["aussagenpruefung"]["verbesserungsbereiche"]["quellenabhaengig"] = True
    dr.apply_review(data,review,b)
    assert data["bewertung"]["sprachrichtigkeit"]["schwaechen"] == []
    assert data["verbesserungsbereiche"] == []
    assert data["bewertungspruefung"]["status"] == "offen"


def test_frozen_context_is_used_by_real_cli_entrypoint(monkeypatch, tmp_path):
    import natascha_cli as cli
    import sys
    source = tmp_path / "work.txt"
    source.write_text(TEXT,encoding="utf-8")
    frozen = tmp_path / "basis.json"
    frozen_rubric = nc.load_rubric("meinungsrede.md",nc.load_config())
    frozen.write_text(json.dumps({"rubrik_inhalt":frozen_rubric,"ausgangstext":"Verlässliche synthetische Beilage."}),encoding="utf-8")
    config = nc.load_config(); config["classes"] = {}
    path = tmp_path / "synthetic.db"; db.init_db(path)
    monkeypatch.setattr(cli,"_load_env_and_config",lambda:(nc,db,config,path))
    monkeypatch.setattr(nc,"load_rubric",lambda *_a: pytest.fail("Das Raster darf nicht erneut von der Datei gelesen werden."))
    captured = {}
    def analyze(**kwargs): captured.update(kwargs); return primary(),[]
    monkeypatch.setattr(nc,"run_llm_analysis",analyze)
    monkeypatch.setattr(sys,"argv",["natascha_cli.py","analyze",str(source),"--klasse","TEST","--aufgabe","Rede","--fach","Deutsch","--schulstufe","Oberstufe","--textsorte","Meinungsrede","--rubric","meinungsrede.md","--grundlage-snapshot-file",str(frozen)])
    assert cli.main() == 0
    assert captured["rubric_content"] == frozen_rubric
    assert captured["ausgangstext_text"] == "Verlässliche synthetische Beilage."
    assert captured["ausgangstext_path"] is None


def test_inconsistent_saved_detail_metadata_never_falls_back_to_main_grade():
    data, b, review = detail_review()
    dr.apply_review(data, review, b)
    del data["srdp_detail"]["k3_sprachnormen"]["orthografie"]
    assert data["bewertungspruefung"]["status"] == "vollstaendig"
    result = resolve_criteria(data, b, {})
    assert result["bewertungspruefung"]["status"] == "offen"
    assert result["bewertungspruefung"]["aufgaben"][0]["kriterium"] == "k3_sprachnormen.orthografie"
    assert "notenempfehlung" not in result


def test_confirmation_and_changed_level_conflict_opens_one_criterion():
    data, b = primary(), basis()
    review = review_for(data, b)
    review["kriterienpruefung"]["inhalt"]["bewertung"].update(stufe=4, punkte=4)
    dr.apply_review(data, review, b)
    assert [task["kriterium"] for task in data["bewertungspruefung"]["aufgaben"]] == ["inhalt"]
    assert "notenempfehlung" not in resolve_criteria(data, b, {})


def test_changed_category_and_explanation_are_kept_together():
    from correction_quality import anchor_findings
    data, b = primary(), basis()
    data["fehler"] = anchor_findings([{"zitat":"wir handeln", "korrektur":"wir handeln", "typ":"R", "befundart":"normfehler"}], TEXT)
    review = review_for(data, b)
    review["befundpruefung"][0].update(status="korrigiert", typ="A", korrektur="wir agieren", erklaerung="Eine freiwillige Formulierungsvariante.", befundart="stilalternative")
    dr.apply_review(data, review, b)
    finding = data["fehler"][0]
    assert (finding["typ"], finding["korrektur"], finding["erklaerung"]) == ("A", "wir agieren", "Eine freiwillige Formulierungsvariante.")
