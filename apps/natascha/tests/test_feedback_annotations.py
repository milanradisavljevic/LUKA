"""Regressionen mit synthetischem Text: stabile Anker, keine kaputten Einfügungen."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
import sys
from zipfile import ZipFile

import pytest
from docx import Document
from lxml import etree

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import generate_feedback as gf

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def comments(doc):
    stream = BytesIO()
    doc.save(stream)
    with ZipFile(stream) as z:
        return etree.fromstring(z.read("word/comments.xml"))


def green_text(doc):
    return [
        r.text
        for p in doc.paragraphs
        for r in p.runs
        if r.font.color.rgb is not None and str(r.font.color.rgb) == "007000"
    ]


@pytest.mark.parametrize(
    "original,quote,replacement",
    [
        ("Wir hoffen dass es gelingt.", "hoffen dass", "hoffen, dass"),
        ("Wir, gehen nach Hause.", "Wir, gehen", "Wir gehen"),
        ("Er sagte dass, sie kommt.", "sagte dass, sie", "sagte, dass sie"),
        ("Wenn es regnet bleiben wir daheim.", "regnet bleiben", "regnet, bleiben"),
        ("Wir gehen,.", "gehen,.", "gehen."),
    ],
)
def test_comma_errors_mark_original_text_without_word_comment(original, quote, replacement):
    doc = Document()
    para = doc.add_paragraph(original)
    gf._attach_word_level_comments(
        doc, [], student_paragraphs=[para],
        fehler_list=[gf.SprachFehler(quote, replacement, "Z", "Beistrich prüfen.")],
    )
    assert para.text == original
    marked = [r for r in para.runs if r.font.underline]
    assert "".join(r.text for r in marked) == quote
    assert all(str(r.font.color.rgb) == "E06000" for r in marked)
    assert not para._p.findall("w:commentRangeStart", NS)
    assert not para._p.findall(".//w:commentReference", NS)
    stream = BytesIO()
    doc.save(stream)
    with ZipFile(stream) as archive:
        assert "word/comments.xml" not in archive.namelist()


@pytest.mark.parametrize("reverse", [False, True])
def test_comma_marking_keeps_overlapping_grammar_correction_and_its_comment(reverse):
    doc = Document()
    para = doc.add_paragraph("Wir glaubt dass es hilft.")
    changes = [
        gf.SprachFehler("glaubt", "glauben", "G", "Kongruenz."),
        gf.SprachFehler("glaubt dass", "glaubt, dass", "Z", "Komma vor Nebensatz."),
    ]
    gf._attach_word_level_comments(
        doc, [], student_paragraphs=[para], fehler_list=changes[::-1] if reverse else changes,
    )
    assert len(comments(doc)) == 1
    assert "Kongruenz" in etree.tostring(comments(doc), encoding="unicode")
    assert green_text(doc) == [" glauben"]
    original_verb = next(r for r in para.runs if r.text == "glaubt")
    assert original_verb.font.strike and str(original_verb.font.color.rgb) == "CC0000"
    assert any(r.font.underline and r.text == " dass" for r in para.runs)


def test_word_change_mistyped_as_punctuation_still_has_a_comment():
    doc = Document()
    para = doc.add_paragraph("Wir sehen in dem Fall nach.")
    gf._attach_word_level_comments(
        doc, [], student_paragraphs=[para],
        fehler_list=[gf.SprachFehler("in dem Fall", "indem, Fall", "Z")],
    )
    assert len(comments(doc)) == 1


@pytest.mark.parametrize("view", ["lehrkraft", "schueler"])
def test_both_export_views_mark_commas_without_comments(view):
    data = gf.load_feedback_json(
        Path(__file__).parent / "fixtures/beispiel_deutsch_mit_fehlern.json"
    )
    data.hinweise = []
    data.fehler = [gf.SprachFehler(
        "hoffen dass", "hoffen, dass", "Z", "Komma vor Nebensatz.",
        lehrkraft_aktion="uebernommen",
    )]
    doc = gf.build_feedback_document(
        data, original_text="Wir hoffen dass es gelingt.", ansicht=view,
    )
    para = next(p for p in doc.paragraphs if p.text == "Wir hoffen dass es gelingt.")
    assert any(r.font.underline for r in para.runs)
    assert not doc.element.findall(".//w:commentReference", NS)
    if view == "lehrkraft":
        assert any(
            "Komma vor Nebensatz." in cell.text
            for table in doc.tables for row in table.rows for cell in row.cells
        )


@pytest.mark.parametrize("reverse", [False, True])
def test_comment_survives_another_correction_inside_its_quote(reverse):
    doc = Document()
    para = doc.add_paragraph("Der Wind fehlt.")
    changes = [
        gf.SprachFehler("fehlt", "weht", "G", "Verb korrigieren."),
        gf.SprachFehler("Wind fehlt.", "Wind fehlt?", "Z", "Fragezeichen prüfen."),
    ]
    gf._attach_word_level_comments(
        doc, [], student_paragraphs=[para], fehler_list=changes[::-1] if reverse else changes
    )
    result = comments(doc)
    assert len(result) == 2
    assert "Fragezeichen prüfen" in etree.tostring(result, encoding="unicode")
    assert green_text(doc) == [" weht"]
    assert len(para._p.findall("w:commentRangeStart", NS)) == 2


@pytest.mark.parametrize(
    "quote,replacement",
    [
        (
            "Antworten und Gründe",
            "Alle Beteiligten können gemeinsam sinnvolle Antworten finden und gut begründete Entscheidungen treffen.",
        ),
        ("sagt", "den Menschen im Saal eine ausführliche Geschichte erzählt"),
    ],
)
def test_full_rewrite_for_small_quote_stays_comment(quote, replacement):
    doc = Document()
    para = doc.add_paragraph(f"Hier steht {quote} im Satz.")
    original = para.text
    gf._attach_word_level_comments(
        doc,
        [],
        student_paragraphs=[para],
        fehler_list=[gf.SprachFehler(quote, replacement, "A", "Klarer formulieren.")],
    )
    assert para.text == original and not green_text(doc)
    assert replacement in etree.tostring(comments(doc), encoding="unicode")


def test_overlapping_rewrites_preserve_both_comments_without_inline_replacement():
    doc = Document()
    para = doc.add_paragraph("Wir braucht Hilfe.")
    gf._attach_word_level_comments(
        doc,
        [],
        student_paragraphs=[para],
        fehler_list=[
            gf.SprachFehler("Wir braucht", "Wir brauchen", "G"),
            gf.SprachFehler("braucht Hilfe", "benötigen Unterstützung", "A"),
        ],
    )
    assert para.text == "Wir braucht Hilfe." and len(comments(doc)) == 2
    assert not green_text(doc)


def test_repeated_word_does_not_get_arbitrary_error_anchor():
    doc = Document()
    paragraphs = [doc.add_paragraph("Wir handeln."), doc.add_paragraph("Wir handeln.")]
    gf._attach_word_level_comments(
        doc, [], student_paragraphs=paragraphs, fehler_list=[gf.SprachFehler("Wir", "Sie", "G")]
    )
    assert not green_text(doc)


def test_note_uses_explicit_source_id_even_after_blank_paragraph():
    doc = Document()
    paragraphs = [
        doc.add_paragraph("Wir handeln."),
        doc.add_paragraph(""),
        doc.add_paragraph("Wir handeln."),
    ]
    gf._attach_word_level_comments(
        doc, [gf.WordLevelHinweis("Wir", "Hier prüfen.", "S2")], student_paragraphs=paragraphs
    )
    assert not paragraphs[0]._p.findall("w:commentRangeStart", NS)
    assert len(paragraphs[2]._p.findall("w:commentRangeStart", NS)) == 1


def test_run_styles_and_non_bmp_characters_survive_splitting():
    doc = Document()
    para = doc.add_paragraph()
    para.add_run("𝒜 Wir braucht Hilfe.").italic = True
    gf._attach_word_level_comments(
        doc,
        [],
        student_paragraphs=[para],
        fehler_list=[gf.SprachFehler("braucht", "brauchen", "G")],
    )
    assert para.runs[0].text.startswith("𝒜") and para.runs[0].italic
    assert green_text(doc) == [" brauchen"]


def test_comment_only_metadata_survives_feedback_parser():
    import json
    from pathlib import Path

    data = json.loads(
        (Path(__file__).parent / "fixtures/beispiel_deutsch_mit_fehlern.json").read_text(
            encoding="utf-8"
        )
    )
    data["fehler"] = [
        {
            "zitat": "Wir",
            "korrektur": "Sie",
            "typ": "G",
            "nur_kommentar": True,
            "textstelle_id": "S2",
        }
    ]
    finding = gf.parse_feedback_data(data).fehler[0]
    assert finding.nur_kommentar and finding.textstelle_id == "S2"


@pytest.mark.parametrize("weight", [0.25, 25])
def test_fractional_and_percent_weights_display_as_twenty_five_percent(weight):
    data = gf.load_feedback_json(
        Path(__file__).parent / "fixtures/beispiel_deutsch_mit_fehlern.json"
    )
    original_note = data.notenempfehlung.note
    for criterion in data.bewertung:
        criterion.gewicht = weight
    doc = gf.build_feedback_document(data)
    text = "\n".join(p.text for p in doc.paragraphs)
    assert "Gewicht: 25 %" in text and "0.25 %" not in text
    assert data.notenempfehlung.note == original_note


def test_expression_tip_does_not_invent_unobserved_filler_words():
    doc = Document()
    gf.add_naechste_schritte(
        doc, [gf.SprachFehler("unklare Wendung", "präzise Wendung", "A")], "Deutsch"
    )
    text = "\n".join(p.text for p in doc.paragraphs)
    assert "markierten Wortverbindungen" in text
    assert "Füllwörter" not in text and "sozusagen" not in text


def test_empty_srdp_improvement_heading_is_not_rendered():
    doc = Document()
    gf.add_srdp_raster(doc, {})
    assert "Zentrale Verbesserungshinweise" not in "\n".join(p.text for p in doc.paragraphs)


def test_srdp_page_transition_cannot_leave_a_divider_only_page():
    doc = Document()
    doc.add_paragraph("Vorangehender Feedbackabschnitt.")
    gf.add_divider(doc)
    gf.add_srdp_raster(doc, {})
    heading = next(p for p in doc.paragraphs if p.text == "BEURTEILUNG NACH SRDP-RASTER")
    assert heading.paragraph_format.page_break_before
    assert doc.paragraphs[0].text == "Vorangehender Feedbackabschnitt."
    assert not any(p.text == "-" * 56 for p in doc.paragraphs)
    assert not doc.element.findall('.//w:br[@w:type="page"]', NS)
