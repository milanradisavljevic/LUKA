#!/usr/bin/env python3
"""
Korrektur-Feedback Generator

Erzeugt Feedback-DOCX aus fertigen Analyse-JSONs in /output/feedback_data.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

from sprachregeln import regel_muster

try:
    from lxml import etree as _etree
    _LXML_AVAILABLE = True
except ImportError:
    _LXML_AVAILABLE = False

_W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
_COMMENTS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
_COMMENTS_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"
)

# Farbpalette
C_PRIMARY = RGBColor(0x1F, 0x49, 0x7D)  # Dunkelblau  – Header, Standard
C_HEADER = RGBColor(0x2E, 0x4D, 0x8A)  # Dunkelblau  – Abschnittstitel
C_DIVIDER = RGBColor(0x99, 0x99, 0x99)  # Grau        – Trennlinien
C_STRENGTH = RGBColor(0x00, 0x70, 0x00)  # Dunkelgrün  – Stärken
C_WEAKNESS = RGBColor(0xC0, 0x00, 0x00)  # Dunkelrot   – Schwächen
C_SUGGESTION = RGBColor(0x00, 0x46, 0x7F)  # Blau        – Verbesserungsvorschläge
C_GRADE_1 = RGBColor(0x70, 0xC0, 0x70)  # Hellgrün   – Note 1
C_GRADE_2 = RGBColor(0x00, 0x80, 0x00)  # Dunkelgrün – Note 2
C_GRADE_3 = RGBColor(0xC0, 0xA0, 0x00)  # Gelb       – Note 3
C_GRADE_4 = RGBColor(0xE0, 0x60, 0x00)  # Orange     – Note 4
C_GRADE_5 = RGBColor(0xC0, 0x00, 0x00)  # Rot        – Note 5

# Rückwärtskompatible Aliasse (werden in Tests referenziert)
C_GRADE_GOOD = C_GRADE_2
C_GRADE_OK = C_GRADE_3
C_GRADE_FAIL = C_GRADE_5

_GRADE_COLORS = {1: C_GRADE_1, 2: C_GRADE_2, 3: C_GRADE_3, 4: C_GRADE_4, 5: C_GRADE_5}

_FEHLER_TYP_COLORS: dict[str, RGBColor] = {
    "R": RGBColor(0x1F, 0x49, 0x7D),  # Blau        – Rechtschreibung
    "G": RGBColor(0xC0, 0x00, 0x00),  # Rot         – Grammatik
    "Z": RGBColor(0xE0, 0x60, 0x00),  # Orange      – Zeichensetzung
    "A": RGBColor(0x80, 0x80, 0x80),  # Grau        – Ausdruck
}

SRDP_WORTLAUT: dict[str, dict[int, str]] = {
    "schreibhandlung": {
        1: "nicht erfüllt",
        2: "Schreibhandlung(en) im Sinne der geforderten Textsorte überwiegend realisiert",
        3: "Schreibhandlung(en) im Sinne der geforderten Textsorte weitgehend realisiert",
        4: "Schreibhandlung(en) im Sinne der geforderten Textsorte durchgehend realisiert",
        5: "Schreibhandlung(en) im Sinne der geforderten Textsorte umfassend realisiert",
    },
    "arbeitsauftraege": {
        1: "nicht erfüllt",
        2: "Arbeitsaufträge überwiegend erfüllt",
        3: "Arbeitsaufträge weitgehend erfüllt",
        4: "alle Arbeitsaufträge erfüllt",
        5: "alle Arbeitsaufträge umfassend erfüllt",
    },
    "textbeilage": {
        1: "nicht erfüllt",
        2: "Textbeilage(n) im Sinne der Arbeitsaufträge überwiegend erfasst",
        3: "Textbeilage(n) im Sinne der Arbeitsaufträge weitgehend erfasst",
        4: "Textbeilage(n) im Sinne der Arbeitsaufträge vollständig erfasst",
        5: "Textbeilage(n) im Sinne der Arbeitsaufträge vollständig erfasst",
    },
    "sachlich": {
        1: "nicht erfüllt",
        2: "sachlich überwiegend richtig",
        3: "sachlich weitgehend richtig",
        4: "sachlich richtig",
        5: "sachlich durchgehend richtig",
    },
    "qualitaet": {
        1: "nicht erfüllt",
        2: "oberflächlich / wenig treffsicher / reproduzierend",
        3: "ansatzweise komplex / weitgehend treffsicher / Ansätze zur Eigenständigkeit",
        4: "komplex / treffsicher / merklich eigenständig",
        5: "in hohem Maße komplex / treffsicher / eigenständig; ggf. ideenreich",
    },
    "kohaerenz": {
        1: "nicht erfüllt",
        2: "Text gedanklich und formal überwiegend der Textsorte angemessen strukturiert",
        3: "Text gedanklich und formal weitgehend der Textsorte angemessen strukturiert",
        4: (
            "Text gedanklich und formal durchgehend der Textsorte angemessen "
            "und klar strukturiert"
        ),
        5: (
            "Text gedanklich und formal durchgehend der Textsorte angemessen, "
            "klar, zielgerichtet und ggf. eigenständig strukturiert"
        ),
    },
    "bezugnahme": {
        1: "nicht erfüllt",
        2: (
            "Bezugnahme auf die Textbeilage(n) im Sinne der geforderten Textsorte "
            "überwiegend erkennbar"
        ),
        3: "Bezugnahme auf die Textbeilage(n) im Sinne der geforderten Textsorte realisiert",
        4: "gelungene Verknüpfung mit der/den Textbeilage(n) im Sinne der geforderten Textsorte",
        5: (
            "besonders gelungene Verknüpfung mit der/den Textbeilage(n) im Sinne "
            "der geforderten Textsorte"
        ),
    },
    "kohaesion": {
        1: "nicht erfüllt",
        2: "Einsatz passender Kohäsionsmittel überwiegend erkennbar",
        3: "Einsatz passender Kohäsionsmittel weitgehend erkennbar",
        4: "nahezu durchgehender Einsatz passender Kohäsionsmittel",
        5: "durchgehender Einsatz passender Kohäsionsmittel",
    },
    "situationsadaequat": {
        1: "nicht erfüllt",
        2: "überwiegend schreibhandlungs- und situationsadäquate Sprachverwendung",
        3: "weitgehend schreibhandlungs- und situationsadäquate Sprachverwendung",
        4: "nahezu durchgehend schreibhandlungs- und situationsadäquate Sprachverwendung",
        5: "durchgehend schreibhandlungs- und situationsadäquate Sprachverwendung",
    },
    "wortwahl": {
        1: "nicht erfüllt",
        2: (
            "überwiegend angemessene und semantisch korrekte Ausdrucksweise sowie "
            "geringe Varianz in der Wortwahl"
        ),
        3: (
            "weitgehend angemessene und semantisch korrekte Ausdrucksweise sowie "
            "variantenreiche Wortwahl"
        ),
        4: (
            "durchgehend angemessene und semantisch korrekte Ausdrucksweise sowie "
            "präzise und variantenreiche Wortwahl"
        ),
        5: (
            "durchgehend angemessene und semantisch korrekte Ausdrucksweise sowie "
            "besonders präzise, differenzierte und variantenreiche Wortwahl"
        ),
    },
    "satzstrukturen": {
        1: "nicht erfüllt",
        2: "überwiegend gut verständliche bzw. nur wenig variierende Satzstrukturen",
        3: "weitgehend gut verständliche und variantenreiche Satzstrukturen",
        4: "durchgehend variantenreiche und komplexe bzw. der Textsorte angemessene Satzstrukturen",
        5: "besonders variantenreiche und komplexe bzw. der Textsorte angemessene Satzstrukturen",
    },
    "eigenstaendigkeit": {
        1: "nicht erfüllt",
        2: "viele an die Textbeilage(n) angelehnte oder wörtlich übernommene Formulierungen",
        3: "weitgehend eigenständige Formulierungen",
        4: "nahezu durchgehend eigenständige Formulierungen",
        5: "durchgehend eigenständige Formulierungen",
    },
    "orthografie": {
        1: "nicht erfüllt",
        2: "überwiegend richtige Anwendung der Regeln der Orthografie",
        3: "weitgehend richtige Anwendung der Regeln der Orthografie",
        4: "richtige Anwendung der Regeln der Orthografie; wenige Fehler",
        5: "orthografisch (nahezu) fehlerfrei",
    },
    "zeichensetzung": {
        1: "nicht erfüllt",
        2: "überwiegend richtige Anwendung der Regeln der Zeichensetzung",
        3: "weitgehend richtige Anwendung der Regeln der Zeichensetzung",
        4: "richtige Anwendung der Regeln der Zeichensetzung; wenige Fehler",
        5: "Zeichensetzung (nahezu) fehlerfrei",
    },
    "grammatik": {
        1: "nicht erfüllt",
        2: "überwiegend richtige Anwendung der Regeln der Grammatik",
        3: "weitgehend richtige Anwendung der Regeln der Grammatik",
        4: "richtige Anwendung der Regeln der Grammatik; wenige Fehler",
        5: "grammatikalisch (nahezu) fehlerfrei",
    },
}


def _note_color(note: int) -> RGBColor:
    """Notenfarbe: 1=hellgrün, 2=dunkelgrün, 3=gelb, 4=orange, 5=rot."""
    return _GRADE_COLORS.get(note, C_GRADE_5)


def _set_cell_bg(cell, hex_color: str) -> None:
    """Setzt die Hintergrundfarbe einer Tabellenzelle via XML."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


GERMAN_ORDER = ["inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit"]
ENGLISH_ORDER = [
    "task_achievement",
    "organisation_layout",
    "lexical_range_accuracy",
    "grammatical_range_accuracy",
]

ALIASES = {
    "stil_ausdruck": "ausdruck",
    "normative_sprachrichtigkeit": "sprachrichtigkeit",
    "erfuellung_aufgabenstellung": "task_achievement",
    "aufbau_layout": "organisation_layout",
    "wortschatz": "lexical_range_accuracy",
    "grammatik": "grammatical_range_accuracy",
}


@dataclass(slots=True)
class CriterionFeedback:
    """Bewertungsdaten fuer ein einzelnes Kriterium."""

    key: str
    stufe: str
    punkte: float | None
    staerken: list[str]
    schwaechen: list[str]
    vorschlaege: list[str]
    gewicht: float | None = None
    fehler_detail: list[str] | None = None
    fehlerschwerpunkte: list[str] | None = None
    rhetorische_figuren: list[str] | None = None


@dataclass(slots=True)
class WordLevelHinweis:
    zitat: str
    kommentar: str
    textstelle_id: str | None = None


@dataclass(slots=True)
class SprachFehler:
    zitat: str
    korrektur: str
    typ: str  # "R" | "G" | "Z" | "A"
    erklaerung: str = ""
    befundart: str | None = None
    anker_status: str | None = None
    lehrkraft_aktion: str | None = None
    textstelle_id: str | None = None
    nur_kommentar: bool = False
    ersetzungspruefung: dict | None = None
    teiltypen: list[str] | None = None  # z. B. das/dass + Komma: ["R", "Z"]
    regel_muster: str | None = None


@dataclass(slots=True)
class FolgeuebungHinweis:
    """Wahrheitsgemäßer Verweis auf eine tatsächlich verfügbare Folgeübung."""

    status: str  # "beigelegt" | "in_luka" | "keine"
    titel: str | None = None
    dateiname: str | None = None
    material_id: str | None = None


@dataclass(slots=True)
class GradeRecommendation:
    """Zusammenfassung der Notenempfehlung."""

    durchschnitt: float
    note: int
    bezeichnung: str
    begruendung: str
    k1_note: int | None = None
    k3_note: int | None = None
    k1_schnitt: float | None = None
    k3_schnitt: float | None = None
    # Beschriftung des Kompetenzbereichs aus dem Raster (siehe rubric_area_titel).
    # Leer = die vier Kanonkriterien, dann gilt der bisherige Klartext.
    k1_titel: str = ""
    k3_titel: str = ""
    sonderregel: str | None = None


@dataclass(slots=True)
class FeedbackData:
    """Vollstaendige Daten fuer ein Feedback-Dokument."""

    datei: str
    schueler: str | None
    klasse: str | None
    textsorte: str
    fach: str
    schulstufe: str
    rubrik: str
    bewertung: list[CriterionFeedback]
    notenempfehlung: GradeRecommendation | None
    hinweise: list[WordLevelHinweis]
    fehler: list[SprachFehler] | None = None
    modell: str | None = None
    zusammenfassung: str | None = None
    staerken_global: list[str] | None = None
    verbesserungsbereiche: list[str] | None = None
    srdp_detail: dict[str, Any] | None = None
    folgeuebung: FolgeuebungHinweis | None = None
    sachfach_bewertung: dict[str, CriterionFeedback] | None = None
    raster_auswertung: dict[str, Any] | None = None
    lehrer_note: float | None = None
    lehrer_kommentar: str | None = None
    pruefstatus: str = "entwurf"
    bewertungsmodus: str = "benotet"
    qualitaetswarnungen: list[str] | None = None
    notenempfehlung_vorlaeufig: bool = False
    aussagenstatus: dict | None = None
    pruefnachweis: dict | None = None


@dataclass(slots=True)
class ProjectPaths:
    """Projektpfade relativ zum Skriptstandort."""

    root: Path
    input_dir: Path
    output_dir: Path
    feedback_data_dir: Path
    fehlerlog: Path


def project_paths() -> ProjectPaths:
    """Ermittelt die Projektpfade relativ zum Skript."""

    root = Path(__file__).resolve().parent
    output_dir = root / "output"
    return ProjectPaths(
        root=root,
        input_dir=root / "input",
        output_dir=output_dir,
        feedback_data_dir=output_dir / "feedback_data",
        fehlerlog=output_dir / "fehlerlog.txt",
    )


def add_heading(doc: Document, text: str, level: int = 1) -> None:
    """Fuegt eine Ueberschrift ein."""

    doc.add_heading(text, level=level)


def add_divider(doc: Document) -> None:
    """Fuegt einen dezenten Trenner ein."""

    paragraph = doc.add_paragraph("-" * 56)
    if paragraph.runs:
        paragraph.runs[0].font.color.rgb = C_DIVIDER
    paragraph.paragraph_format.space_before = Pt(2)
    paragraph.paragraph_format.space_after = Pt(2)


def add_section_header(doc: Document, text: str, color: RGBColor = C_HEADER) -> None:
    """Fuegt einen Abschnittstitel im bestaenden Stil ein."""

    paragraph = doc.add_paragraph()
    run = paragraph.add_run(text)
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = color
    paragraph.paragraph_format.space_before = Pt(8)
    paragraph.paragraph_format.space_after = Pt(2)
    paragraph.paragraph_format.keep_with_next = True


def add_label(doc: Document, label: str, value: str) -> None:
    """Fuegt eine Label-Wert-Zeile ein."""

    paragraph = doc.add_paragraph()
    key_run = paragraph.add_run(f"{label}: ")
    key_run.bold = True
    key_run.font.size = Pt(10)
    value_run = paragraph.add_run(value)
    value_run.font.size = Pt(10)
    paragraph.paragraph_format.space_after = Pt(1)


def add_bullet(
    doc: Document, text: str, indent: int = 1, color: RGBColor | None = None
) -> None:
    """Fuegt einen Listenpunkt ein."""

    paragraph = doc.add_paragraph(style="List Bullet")
    run = paragraph.add_run(text)
    run.font.size = Pt(10)
    if color is not None:
        run.font.color.rgb = color
    paragraph.paragraph_format.left_indent = Inches(0.3 * indent)
    paragraph.paragraph_format.space_after = Pt(1)


def add_body(doc: Document, text: str) -> None:
    """Fuegt einen normalen Absatz ein."""

    paragraph = doc.add_paragraph(text)
    for run in paragraph.runs:
        run.font.size = Pt(10)
    paragraph.paragraph_format.space_after = Pt(2)


def setup_page(doc: Document, config: dict[str, Any] | None = None) -> None:
    """Setzt A4-Seitenformat, Raender, Fusszeile und optionale Kopfzeile."""

    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    footer_run = fp.add_run(
        f"Erstellt mit NATASCHA — {date.today().strftime('%d.%m.%Y')}"
    )
    footer_run.font.size = Pt(8)
    footer_run.font.color.rgb = C_DIVIDER

    if config:
        docx_cfg = config.get("docx", {})
        teacher = docx_cfg.get("teacher_name", "")
        school = docx_cfg.get("school_name", "")
        if teacher or school:
            header = section.header
            header.is_linked_to_previous = False
            parts = [p for p in [teacher, school] if p]
            hp = header.paragraphs[0]
            header_run = hp.add_run(" | ".join(parts))
            header_run.font.size = Pt(8)
            header_run.font.color.rgb = C_DIVIDER


def add_lehrer_kommentar_block(
    doc: Document, data: FeedbackData, bewertungsmodus: str = "benotet"
) -> None:
    """Fügt den holistischen Überblicksblock ein (vor der Kriterien-Aufschlüsselung).

    Die Inhalte sind ein KI-Vorschlag, den die Lehrkraft prüft. Die Überschrift
    schreibt sie deshalb bewusst nicht der Lehrkraft zu.

    Enthält ZUSAMMENFASSUNG, STÄRKEN, VERBESSERUNGSBEREICHE und NOTENEMPFEHLUNG
    als kompakten Überblick vor der detaillierten Kriterien-Aufschlüsselung.
    Wird nur gerendert wenn mindestens ein Feld vorhanden ist.
    """
    if not any([data.zusammenfassung, data.staerken_global, data.verbesserungsbereiche, data.raster_auswertung]):
        return

    add_section_header(doc, "RÜCKMELDUNG IM ÜBERBLICK")
    if data.raster_auswertung:
        raster = data.raster_auswertung
        doc.add_paragraph(
            f"Rasterpunkte: {raster['punkte']} / {raster['max_punkte']} "
            f"({raster['bewertungsprofil']}, Fassung {raster['profil_version']}). "
            "KI-Vorschlag; fachliche Prüfung durch die Lehrkraft erforderlich."
        )
        doc.add_paragraph(
            f"Wortanzahl: {raster['wortzahl_ist']} / "
            f"{raster.get('wortzahl_soll') or 'nicht vorgegeben'}. "
            f"Wortzahlabzug bei Aufgabenerfüllung: {raster.get('wortzahl_abzug', 0)}."
        )
        for hinweis in raster.get("pruefung_erforderlich", []):
            doc.add_paragraph(hinweis)
        if not data.notenempfehlung:
            doc.add_paragraph("Keine automatische Notenempfehlung; Notenschlüssel und Prüfbedarf beachten.")


    def offen_vermerk(field: str) -> None:
        # Nur Lehrkraftansicht: die Schüleransicht blendet offene Felder aus.
        if (data.aussagenstatus or {}).get(field) == "offen":
            run = doc.add_paragraph().add_run(_VERMERK_AUSSAGE_OFFEN)
            run.italic = True
            run.font.size = Pt(9)

    if data.zusammenfassung:
        add_section_header(doc, "ZUSAMMENFASSUNG", color=C_PRIMARY)
        offen_vermerk("zusammenfassung")
        p = doc.add_paragraph(data.zusammenfassung)
        p.runs[0].font.size = Pt(10)
        p.paragraph_format.space_after = Pt(4)

    if data.staerken_global:
        add_section_header(doc, "STÄRKEN", color=C_STRENGTH)
        offen_vermerk("staerken_global")
        for item in data.staerken_global:
            add_bullet(doc, item, color=C_STRENGTH)

    if data.verbesserungsbereiche:
        add_section_header(doc, "VERBESSERUNGSBEREICHE", color=C_WEAKNESS)
        offen_vermerk("verbesserungsbereiche")
        for item in data.verbesserungsbereiche:
            add_bullet(doc, item, color=C_WEAKNESS)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    if data.notenempfehlung and bewertungsmodus == "benotet":
        grade_color = _note_color(data.notenempfehlung.note)
        label_run = p.add_run(
            f"KI-NOTENEMPFEHLUNG – {'VORLÄUFIG – PRÜFUNG ERFORDERLICH' if data.notenempfehlung_vorlaeufig else 'VORSCHLAG'}: {data.notenempfehlung.note} – {data.notenempfehlung.bezeichnung}"
        )
        label_run.bold = True
        label_run.font.size = Pt(11)
        label_run.font.color.rgb = grade_color

        if data.notenempfehlung.k1_note is not None:
            k1_schnitt_str = (
                f" [Stufe {data.notenempfehlung.k1_schnitt:.1f}]"
                if data.notenempfehlung.k1_schnitt is not None
                else ""
            )
            add_body(
                doc,
                f"  K1 (Inhalt + Textstruktur): "
                f"Note {data.notenempfehlung.k1_note}{k1_schnitt_str}",
            )
        if data.notenempfehlung.k3_note is not None:
            k3_schnitt_str = (
                f" [Stufe {data.notenempfehlung.k3_schnitt:.1f}]"
                if data.notenempfehlung.k3_schnitt is not None
                else ""
            )
            add_body(
                doc,
                f"  K3/1 (Stil + Sprachnormen): "
                f"Note {data.notenempfehlung.k3_note}{k3_schnitt_str}",
            )
        if data.notenempfehlung.sonderregel:
            add_body(
                doc,
                f"  Hinweis: Sonderregel – {data.notenempfehlung.sonderregel}",
            )
    else:
        label_run = p.add_run("Bewertung noch offen – keine automatische Note" if bewertungsmodus == "benotet" else "Formatives Feedback – ohne Note")
        label_run.bold = True
        label_run.font.size = Pt(11)
        label_run.font.color.rgb = RGBColor(0x60, 0x60, 0x60)

    add_divider(doc)


def add_korrektur_header(
    doc: Document,
    data: FeedbackData,
    config: dict[str, Any] | None = None,
    word_count: int = 0,
    aufgabe_label: str = "",
) -> None:
    """Fügt den Titel-Header für das Korrigierte-Schülerarbeit-Format ein."""
    docx_cfg = (config or {}).get("docx", {})

    logo_path = docx_cfg.get("logo_path", "")
    if logo_path:
        lp = Path(logo_path)
        if not lp.is_absolute():
            lp = project_paths().root / lp
        if lp.exists():
            doc.add_picture(str(lp), width=Cm(4))
            doc.add_paragraph()

    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run("KORRIGIERTE SCHÜLERARBEIT")
    title_run.bold = True
    title_run.font.size = Pt(14)
    title_run.font.color.rgb = C_PRIMARY

    meta_table = doc.add_table(rows=0, cols=2)
    meta_table.autofit = True
    rows_data: list[tuple[str, str]] = []
    if data.schueler:
        val = data.schueler if not data.klasse else f"{data.schueler}, {data.klasse}"
        rows_data.append(("Schüler/in", val))
    rows_data.append(("Textsorte", data.textsorte))
    rows_data.append(("Fach", data.fach))
    if word_count:
        rows_data.append(("Wortanzahl", str(word_count)))
    rows_data.append(("Korrekturdatum", date.today().strftime("%d.%m.%Y")))
    if aufgabe_label:
        rows_data.append(("Aufgabe", aufgabe_label))
    teacher = docx_cfg.get("teacher_name", "")
    school = docx_cfg.get("school_name", "")
    if teacher:
        rows_data.append(("Lehrkraft", teacher))
    if school:
        rows_data.append(("Schule", school))
    for label, value in rows_data:
        row = meta_table.add_row()
        row.cells[0].text = label
        row.cells[1].text = value
        for cell in row.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(10)

    add_divider(doc)


def add_legende(doc: Document) -> None:
    """Fügt die Korrektur-Legende ein."""
    p = doc.add_paragraph()
    run = p.add_run("LEGENDE:")
    run.bold = True
    run.font.size = Pt(9)
    run.font.color.rgb = C_DIVIDER
    p.paragraph_format.space_after = Pt(1)

    items = [
        ("durchgestrichen", "Fehler im Original", C_WEAKNESS),
        ("grün + fett", "Korrektur/Verbesserung", C_STRENGTH),
        ("orange unterstrichen", "Beistrichstelle, ohne Randkommentar", _FEHLER_TYP_COLORS["Z"]),
        ("Balloon-Kommentare rechts", "Hinweise der Lehrkraft", C_PRIMARY),
    ]
    for mark, meaning, color in items:
        leg_p = doc.add_paragraph()
        leg_p.paragraph_format.space_after = Pt(1)
        leg_p.paragraph_format.left_indent = Inches(0.2)
        mark_run = leg_p.add_run(f"• {mark}")
        mark_run.font.size = Pt(9)
        mark_run.font.color.rgb = color
        sep_run = leg_p.add_run(f" = {meaning}")
        sep_run.font.size = Pt(9)
        sep_run.font.color.rgb = C_DIVIDER

    # Fehler-Kommentar-Legende (Track-Changes-Stil)
    tc_p = doc.add_paragraph()
    tc_p.paragraph_format.space_after = Pt(1)
    tc_p.paragraph_format.left_indent = Inches(0.2)
    tc_hdr = tc_p.add_run("• Fehler-Kommentare: ")
    tc_hdr.font.size = Pt(9)
    tc_hdr.font.color.rgb = C_DIVIDER
    for typ, label, color in [
        ("R", "Rechtschreibung", _FEHLER_TYP_COLORS["R"]),
        ("G", "Grammatik", _FEHLER_TYP_COLORS["G"]),
        ("Z", "Zeichensetzung", _FEHLER_TYP_COLORS["Z"]),
        ("A", "Ausdruck", _FEHLER_TYP_COLORS["A"]),
    ]:
        r = tc_p.add_run(f"[{typ}]={label}  ")
        r.font.size = Pt(9)
        r.font.color.rgb = color

    add_divider(doc)


def _parse_fehler_detail(entry: str) -> tuple[str, str] | None:
    """Parst einen fehler_detail-String 'Fehler: X -> Korrektur: Y' in (fehler, korrektur)."""
    # Normalisiere Pfeil-Varianten
    normalized = entry.replace("->", "→").replace("–>", "→")
    if "→" not in normalized:
        return None

    left, right = normalized.split("→", 1)

    def _extract(part: str, keyword: str) -> str:
        """Entfernt 'Fehler:' / 'Korrektur:'-Prefix und Anführungszeichen."""
        # Entferne bekannte Prefixe
        for kw in (keyword, "Fehler", "Korrektur", "Error", "Correction"):
            idx = part.lower().find(kw.lower())
            if idx != -1:
                part = part[idx + len(kw):]
        # Entferne führende Sonderzeichen und Anführungszeichen
        return part.strip().strip(":").strip().strip("'\"").strip().rstrip("'\".,")

    fehler = _extract(left, "Fehler")
    korrektur = _extract(right, "Korrektur")
    if fehler and korrektur:
        return fehler, korrektur
    return None


def add_student_text_section(
    doc: Document, original_text: str, data: FeedbackData
) -> list[Any]:
    """Fügt den Originaltext mit Inline-Korrekturen ein. Gibt die Text-Paragraphen zurück."""
    add_section_header(doc, "ORIGINALTEXT")

    paragraphs_added: list[Any] = []
    raw_paragraphs = original_text.split("\n")

    for para_idx, raw_para in enumerate(raw_paragraphs):
        para = doc.add_paragraph()
        para.paragraph_format.space_after = Pt(4)

        is_title = (
            para_idx == 0
            and len(raw_para) <= 80
            and not raw_para.rstrip().endswith((".", "!", "?", ",", ";", ":"))
        )

        r = para.add_run(raw_para)
        r.font.size = Pt(12 if is_title else 10)
        r.bold = is_title

        paragraphs_added.append(para)

    add_divider(doc)
    return paragraphs_added


def _attach_word_comments(
    doc: Document,
    paragraph_comment_pairs: list[tuple[Any, str]],
    author: str = "Lehrkraft",
) -> None:
    """Hängt Word-Balloon-Kommentare an Absätze via direkter XML-Manipulation."""
    if not _LXML_AVAILABLE or not paragraph_comment_pairs:
        return

    try:
        from docx.opc.packuri import PackURI
        from docx.opc.part import Part
    except ImportError:
        return

    root = _etree.Element(f"{{{_W_NS}}}comments", nsmap={"w": _W_NS})

    for idx, (para, comment_text) in enumerate(paragraph_comment_pairs):
        c_el = _etree.SubElement(root, f"{{{_W_NS}}}comment")
        c_el.set(f"{{{_W_NS}}}id", str(idx))
        c_el.set(f"{{{_W_NS}}}author", author)
        c_el.set(f"{{{_W_NS}}}date", f"{date.today().isoformat()}T00:00:00Z")
        c_el.set(f"{{{_W_NS}}}initials", "".join(w[0] for w in author.split()[:2] if w))

        c_p = _etree.SubElement(c_el, f"{{{_W_NS}}}p")
        c_pPr = _etree.SubElement(c_p, f"{{{_W_NS}}}pPr")
        c_pStyle = _etree.SubElement(c_pPr, f"{{{_W_NS}}}pStyle")
        c_pStyle.set(f"{{{_W_NS}}}val", "CommentText")
        c_r = _etree.SubElement(c_p, f"{{{_W_NS}}}r")
        c_rPr = _etree.SubElement(c_r, f"{{{_W_NS}}}rPr")
        c_rStyle = _etree.SubElement(c_rPr, f"{{{_W_NS}}}rStyle")
        c_rStyle.set(f"{{{_W_NS}}}val", "CommentReference")
        c_t = _etree.SubElement(c_r, f"{{{_W_NS}}}t")
        c_t.text = comment_text
        c_t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")

        p_xml = para._p
        # commentRangeStart vor dem ersten Child
        crs = OxmlElement("w:commentRangeStart")
        crs.set(qn("w:id"), str(idx))
        p_xml.insert(0, crs)
        # commentRangeEnd und commentReference am Ende
        cre = OxmlElement("w:commentRangeEnd")
        cre.set(qn("w:id"), str(idx))
        p_xml.append(cre)
        r_ref = OxmlElement("w:r")
        rPr_ref = OxmlElement("w:rPr")
        rStyle_ref = OxmlElement("w:rStyle")
        rStyle_ref.set(qn("w:val"), "CommentReference")
        rPr_ref.append(rStyle_ref)
        r_ref.append(rPr_ref)
        cr = OxmlElement("w:commentReference")
        cr.set(qn("w:id"), str(idx))
        r_ref.append(cr)
        p_xml.append(r_ref)

    xml_bytes = _etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)
    comments_part = Part(
        PackURI("/word/comments.xml"),
        _COMMENTS_CONTENT_TYPE,
        xml_bytes,
    )
    doc.part.relate_to(comments_part, _COMMENTS_REL)


def is_punctuation_only_fix(original: str, korrektur: str) -> bool:
    """True wenn sich Original und Korrektur nur durch Satzzeichen unterscheiden."""

    def strip_punct(s: str) -> str:
        return re.sub(r"[,;:\.!\?\-–]", "", s).strip()

    return bool(original) and strip_punct(original) == strip_punct(korrektur)


def _find_inserted_punct(original: str, korrektur: str) -> str:
    """Gibt die in korrektur neu eingefügten Satzzeichen zurück (vs. original)."""
    orig_chars = re.findall(r"[,;:\.!\?\-–]", original)
    korr_chars = re.findall(r"[,;:\.!\?\-–]", korrektur)
    extra = list(korr_chars)
    for c in orig_chars:
        try:
            extra.remove(c)
        except ValueError:
            pass
    return "".join(extra) or ","


def _find_zitat_in_paragraph(para, zitat_text: str):
    """Find a quote within a paragraph, handling cross-run boundaries.

    Returns (start_run_idx, end_run_idx, char_offset_in_start, char_end_in_end) or None.
    """
    runs = para.runs
    if not runs:
        return None

    full_text = "".join(r.text for r in runs)
    pos = full_text.find(zitat_text)
    if pos == -1:
        return None

    end_pos = pos + len(zitat_text)

    start_run_idx = 0
    char_offset = 0
    accumulated = 0
    for i, run in enumerate(runs):
        if accumulated + len(run.text) > pos:
            start_run_idx = i
            char_offset = pos - accumulated
            break
        accumulated += len(run.text)

    end_run_idx = start_run_idx
    accumulated = 0
    for i, run in enumerate(runs):
        if accumulated + len(run.text) >= end_pos:
            end_run_idx = i
            break
        accumulated += len(run.text)

    char_end_in_end = end_pos - sum(len(runs[j].text) for j in range(end_run_idx))

    return (start_run_idx, end_run_idx, char_offset, char_end_in_end)


def _split_run_at(run, offset: int):
    """Split a run at the given character offset. Returns (before_run, after_run)."""
    if offset <= 0 or offset >= len(run.text):
        return None, None

    before_text = run.text[:offset]
    after_text = run.text[offset:]

    run.text = before_text

    new_run = OxmlElement("w:r")
    rpr = run._r.find(f"{{{_W_NS}}}rPr")
    if rpr is not None:
        import copy
        new_run.append(copy.deepcopy(rpr))

    t_el = OxmlElement("w:t")
    t_el.text = after_text
    t_el.set(qn("xml:space"), "preserve")
    new_run.append(t_el)

    run._r.addnext(new_run)

    from docx.text.run import Run
    after_r = Run(new_run, run._parent)

    return run, after_r


def _make_comment_reference_element(comment_id: int) -> OxmlElement:
    """Create a w:commentReference element wrapped in a w:r with CommentReference style."""
    r_ref = OxmlElement("w:r")
    rPr_ref = OxmlElement("w:rPr")
    rStyle_ref = OxmlElement("w:rStyle")
    rStyle_ref.set(qn("w:val"), "CommentReference")
    rPr_ref.append(rStyle_ref)
    r_ref.append(rPr_ref)
    cr = OxmlElement("w:commentReference")
    cr.set(qn("w:id"), str(comment_id))
    r_ref.append(cr)
    return r_ref


def _attach_word_level_comments(
    doc: Document,
    hinweise_list: list[WordLevelHinweis],
    extra_strings: list[str] | None = None,
    author: str = "Lehrkraft",
    student_paragraphs: list | None = None,
    fehler_list: list[SprachFehler] | None = None,
) -> None:
    if not _LXML_AVAILABLE:
        return
    from feedback_annotations import attach_comments
    attach_comments(doc, hinweise_list, fehler_list, student_paragraphs, extra_strings, author)


def parse_args() -> argparse.Namespace:
    """Liest die CLI-Argumente ein."""

    parser = argparse.ArgumentParser(
        description="Erzeugt Feedback-DOCX aus JSON-Dateien."
    )
    parser.add_argument(
        "--file", help="Verarbeitet nur eine JSON-Datei aus /output/feedback_data."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ueberschreibt bestehende _feedback.docx-Dateien.",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Zeigt nur, was verarbeitet wuerde."
    )
    return parser.parse_args()


def canonical_key(raw_key: str) -> str:
    """Normalisiert Kriterienschluessel."""

    return ALIASES.get(raw_key, raw_key)


def ensure_list(value: Any, field_name: str) -> list[str]:
    """Stellt sicher, dass ein Feld eine String-Liste ist."""

    if value is None:
        return []
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f"Feld '{field_name}' muss eine Liste aus Strings sein.")
    return value


def parse_criterion(key: str, payload: dict[str, Any], allow_open: bool = False) -> CriterionFeedback:
    """Validiert ein einzelnes Kriterium."""

    required = {"stufe", "punkte", "staerken", "schwaechen", "vorschlaege"}
    missing = sorted(required - payload.keys())
    if missing:
        raise ValueError(f"Kriterium '{key}' fehlt: {', '.join(missing)}")

    stufe = payload["stufe"]
    if not isinstance(stufe, (str, int, float)) and not (allow_open and stufe is None):
        raise ValueError(f"Kriterium '{key}' hat eine ungueltige Stufe.")

    punkte = payload["punkte"]
    if not isinstance(punkte, (int, float)) and not (allow_open and punkte is None):
        raise ValueError(f"Kriterium '{key}' hat ungueltige Punkte.")

    gewicht = payload.get("gewicht")
    if gewicht is not None and not isinstance(gewicht, (int, float)):
        raise ValueError(f"Kriterium '{key}' hat ein ungueltiges Gewicht.")

    return CriterionFeedback(
        key=canonical_key(key),
        stufe=str(stufe) if stufe is not None else "Offen – Lesestellen klaeren",
        punkte=float(punkte) if punkte is not None else None,
        gewicht=float(gewicht) if gewicht is not None else None,
        staerken=ensure_list(payload["staerken"], f"{key}.staerken"),
        schwaechen=ensure_list(payload["schwaechen"], f"{key}.schwaechen"),
        vorschlaege=ensure_list(payload["vorschlaege"], f"{key}.vorschlaege"),
        fehler_detail=ensure_list(payload.get("fehler_detail"), f"{key}.fehler_detail")
        or None,
        fehlerschwerpunkte=ensure_list(
            payload.get("fehlerschwerpunkte"), f"{key}.fehlerschwerpunkte"
        )
        or None,
        rhetorische_figuren=ensure_list(
            payload.get("rhetorische_figuren"), f"{key}.rhetorische_figuren"
        )
        or None,
    )


def parse_feedback_data(payload: dict[str, Any]) -> FeedbackData:
    """Validiert die JSON-Struktur und wandelt sie in Dataklassen um."""

    required = {
        "datei",
        "textsorte",
        "fach",
        "schulstufe",
        "rubrik",
        "bewertung",
    }
    missing = sorted(required - payload.keys())
    if missing:
        raise ValueError(f"Feedback-Datensatz fehlt: {', '.join(missing)}")

    language_only = payload.get("pruefumfang") == "sprache"
    if not isinstance(payload["bewertung"], dict) or (not payload["bewertung"] and not language_only):
        raise ValueError("Feld 'bewertung' muss ein nicht-leeres Objekt sein.")

    notenempfehlung: GradeRecommendation | None = None
    note_raw = None if language_only else payload.get("notenempfehlung")
    if note_raw and isinstance(note_raw, dict):
        note_required = {"durchschnitt", "note", "bezeichnung", "begruendung"}
        note_missing = sorted(note_required - note_raw.keys())
        if note_missing:
            raise ValueError(f"Notenempfehlung fehlt: {', '.join(note_missing)}")
        if not isinstance(note_raw["durchschnitt"], (int, float)):
            raise ValueError("'notenempfehlung.durchschnitt' muss numerisch sein.")
        if not isinstance(note_raw["note"], int):
            raise ValueError("'notenempfehlung.note' muss eine ganze Zahl sein.")
        if not isinstance(note_raw["bezeichnung"], str) or not isinstance(
            note_raw["begruendung"], str
        ):
            raise ValueError(
                "'notenempfehlung.bezeichnung' und 'begruendung' muessen Strings sein."
            )
        notenempfehlung = GradeRecommendation(
            durchschnitt=float(note_raw["durchschnitt"]),
            note=note_raw["note"],
            bezeichnung=note_raw["bezeichnung"],
            begruendung=note_raw["begruendung"],
        k1_note=note_raw.get("k1_note"),
        k3_note=note_raw.get("k3_note"),
        k1_schnitt=note_raw.get("k1_schnitt"),
        k3_schnitt=note_raw.get("k3_schnitt"),
        k1_titel=note_raw.get("k1_titel") or "",
        k3_titel=note_raw.get("k3_titel") or "",
        sonderregel=note_raw.get("sonderregel"),
    )

    criteria = [] if language_only else [
        parse_criterion(key, value, bool(payload.get("scan_review", {}).get("numericBlocked"))) for key, value in payload["bewertung"].items()
    ]

    sachfach_bewertung: dict[str, CriterionFeedback] | None = None
    raw_sachfach = None if language_only else payload.get("sachfach_bewertung")
    if raw_sachfach is not None:
        if not isinstance(raw_sachfach, dict):
            raise ValueError("Feld 'sachfach_bewertung' muss ein Objekt sein.")
        sachfach_bewertung = {
            key: parse_criterion(key, value, bool(payload.get("scan_review", {}).get("numericBlocked")))
            for key, value in raw_sachfach.items()
            if isinstance(value, dict)
        } or None

    raw_hinweise = payload.get("hinweise", [])
    hinweise: list[WordLevelHinweis] = []
    for item in raw_hinweise:
        if isinstance(item, str):
            hinweise.append(WordLevelHinweis(zitat="", kommentar=item))
        elif isinstance(item, dict):
            hinweise.append(WordLevelHinweis(
                zitat=str(item.get("zitat", "")),
                kommentar=str(item.get("kommentar", "")),
                textstelle_id=item.get("textstelle_id"),
            ))

    raw_fehler = payload.get("fehler", [])
    fehler: list[SprachFehler] = []
    for e in raw_fehler:
        if not isinstance(e, dict):
            continue
        # Phase 3: Lehrkraft-Entscheidungen respektieren
        if e.get("lehrkraft_aktion") == "verworfen":
            continue
        # Zurückgewiesene Beanstandungen bleiben im Analyse-JSON nachvollziehbar.
        if (isinstance(e.get("ki_pruefung"), dict) and e["ki_pruefung"].get("status") == "verworfen"
                and e.get("lehrkraft_aktion") not in {"uebernommen", "geaendert"}):
            continue
        korrektur = str(e.get("korrektur", ""))
        if e.get("lehrkraft_aktion") == "geaendert" and e.get("lehrkraft_korrektur"):
            korrektur = str(e["lehrkraft_korrektur"])
        fehler.append(SprachFehler(
            zitat=str(e.get("zitat", "")),
            korrektur=korrektur,
            typ=str(e.get("typ", "G")),
            erklaerung=str(e.get("erklaerung", "")),
            befundart=e.get("befundart"), anker_status=e.get("anker_status"),
            lehrkraft_aktion=e.get("lehrkraft_aktion"),
            textstelle_id=e.get("textstelle_id"), nur_kommentar=bool(e.get("nur_kommentar")),
            ersetzungspruefung=e.get("ersetzungspruefung"),
            teiltypen=[t for t in e["teiltypen"] if t in {"R", "G", "Z", "A"}] or None
            if isinstance(e.get("teiltypen"), list) else None,
            regel_muster=e.get("regel_muster") if isinstance(e.get("regel_muster"), str) else None,
        ))

    # Folgeübungen werden nicht aus Analyse-JSON übernommen. Nur der CLI-Pfad
    # kann den Hinweis nach Abgleich mit Material-ID und Exportdatei setzen.
    folgeuebung: FolgeuebungHinweis | None = None

    return FeedbackData(
        datei=str(payload["datei"]),
        schueler=str(payload["schueler"]) if payload.get("schueler") else None,
        klasse=str(payload["klasse"]) if payload.get("klasse") else None,
        textsorte=str(payload["textsorte"]),
        fach=str(payload["fach"]),
        schulstufe=str(payload["schulstufe"]),
        rubrik=str(payload["rubrik"]),
        bewertung=criteria,
        notenempfehlung=notenempfehlung,
        hinweise=hinweise,
        fehler=fehler or None,
        modell=str(payload["modell"]) if payload.get("modell") else None,
        zusammenfassung=str(payload["zusammenfassung"]) if payload.get("zusammenfassung") else None,
        staerken_global=ensure_list(payload.get("staerken_global"), "staerken_global") or None,
        verbesserungsbereiche=(
            ensure_list(payload.get("verbesserungsbereiche"), "verbesserungsbereiche") or None
        ),
        srdp_detail=(
            payload.get("srdp_detail") if not language_only and isinstance(payload.get("srdp_detail"), dict) else None
        ),
        folgeuebung=folgeuebung,
        bewertungsmodus="unbenotet" if language_only else payload.get("bewertungsmodus", "benotet"),
        qualitaetswarnungen=[str(w.get("message", "")) for w in payload.get("qualitaetswarnungen", []) if isinstance(w, dict) and w.get("message")],
        notenempfehlung_vorlaeufig=bool(payload.get("notenempfehlung_vorlaeufig") or (isinstance(note_raw, dict) and note_raw.get("vorlaeufig"))),
        aussagenstatus=payload.get("bewertungspruefung", {}).get("aussagen") if isinstance(payload.get("bewertungspruefung"), dict) else None,
        pruefnachweis={"bewertung": payload["bewertungspruefung"], "befunde": payload.get("fehler", []),
            "gegenpruefung": payload.get("gegenpruefung", {}), "reasoning": payload.get("reasoning", {})}
            if isinstance(payload.get("bewertungspruefung"), dict) else None,
        sachfach_bewertung=sachfach_bewertung,
        raster_auswertung=(payload.get("notendetail") if not language_only and isinstance(payload.get("notendetail"), dict)
                           and payload["notendetail"].get("bewertungsprofil") else None),
    )


def load_feedback_json(path: Path) -> FeedbackData:
    """Laedt und validiert eine JSON-Datei."""

    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Die JSON-Wurzel muss ein Objekt sein.")
    return parse_feedback_data(data)


def criterion_label(data: FeedbackData, key: str) -> str:
    """Liefert den Anzeige-Namen eines Kriteriums."""

    german_labels = {
        "inhalt": "INHALT",
        "textstruktur": "TEXTSTRUKTUR",
        "ausdruck": "STIL UND AUSDRUCK"
        if data.schulstufe == "Oberstufe"
        else "AUSDRUCK",
        "sprachrichtigkeit": "NORMATIVE SPRACHRICHTIGKEIT"
        if data.schulstufe == "Oberstufe"
        else "SPRACHRICHTIGKEIT",
        "operator_erfuellung": "OPERATOR-ERFÜLLUNG",
        "inhaltliche_genauigkeit": "INHALTLICHE GENAUIGKEIT",
        "fachbegriffe": "FACHBEGRIFFE",
        "erwartungshorizont_bezug": "ERWARTUNGSHORIZONT-BEZUG",
    }
    english_labels = {
        "coherence_cohesion": "COHERENCE AND COHESION",
        "lexical_structural_range": "LEXICAL AND STRUCTURAL RANGE",
        "lexical_structural_accuracy": "LEXICAL AND STRUCTURAL ACCURACY",
        "task_achievement": "TASK ACHIEVEMENT",
        "organisation_layout": "ORGANISATION AND LAYOUT",
        "lexical_range_accuracy": "LEXICAL RANGE AND ACCURACY",
        "grammatical_range_accuracy": "GRAMMATICAL RANGE AND ACCURACY",
    }
    labels = english_labels if data.fach.casefold() == "englisch" else german_labels
    return labels.get(key, key.replace("_", " ").upper())


def weight_percent(data: FeedbackData, criterion: CriterionFeedback) -> str:
    """Anteilswerte für die Ausgabe umrechnen; Bewertungswerte bleiben unverändert."""
    weights = [c.gewicht for c in data.bewertung if c.gewicht is not None]
    factor = 100 if weights and all(0 <= w <= 1 for w in weights) and sum(weights) <= 1.000001 else 1
    return f"{(criterion.gewicht or 0) * factor:g} %"


def ordered_criteria(data: FeedbackData) -> list[CriterionFeedback]:
    """Sortiert Kriterien in einer fachlich passenden Reihenfolge."""

    if data.raster_auswertung:
        from bewertungsprofile import KRITERIEN
        desired = KRITERIEN
    else:
        desired = ENGLISH_ORDER if data.fach.casefold() == "englisch" else GERMAN_ORDER
    rank = {name: index for index, name in enumerate(desired)}
    return sorted(data.bewertung, key=lambda item: rank.get(item.key, len(rank)))


def render_list_section(
    doc: Document,
    title: str,
    entries: list[str] | None,
    color: RGBColor | None = None,
) -> None:
    """Rendert eine farbige Ueberschrift plus Liste oder Platzhalter."""

    paragraph = doc.add_paragraph()
    run = paragraph.add_run(title)
    run.bold = True
    run.font.size = Pt(10)
    if color is not None:
        run.font.color.rgb = color
    paragraph.paragraph_format.space_after = Pt(1)
    paragraph.paragraph_format.keep_with_next = True
    if entries:
        for entry in entries:
            add_bullet(doc, entry, color=color)
    else:
        add_bullet(doc, "Keine Angaben.")


def add_summary_table(
    doc: Document, data: FeedbackData, bewertungsmodus: str = "benotet"
) -> None:
    """Fuegt eine Uebersichtstabelle mit allen Kriterien und der Gesamtnote ein."""

    criteria = ordered_criteria(data)
    extra_rows = 1 if data.notenempfehlung and bewertungsmodus == "benotet" else 0

    table = doc.add_table(rows=1 + len(criteria) + extra_rows, cols=3)
    table.style = "Table Grid"

    header = OxmlElement("w:tblHeader")
    table.rows[0]._tr.get_or_add_trPr().append(header)
    third_col = "Punkte" if bewertungsmodus == "benotet" else "Feedback"
    for cell, text in zip(table.rows[0].cells, ["Kriterium", "Stufe / Bewertung", third_col]):
        p = cell.paragraphs[0]
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        _set_cell_bg(cell, "1F497D")

    for row_idx, crit in enumerate(criteria, start=1):
        cells = table.rows[row_idx].cells
        label = criterion_label(data, crit.key)
        value_col = f"{crit.punkte:g}" if bewertungsmodus == "benotet" else "-"
        for cell, text in zip(cells, [label, crit.stufe, value_col]):
            p = cell.paragraphs[0]
            run = p.add_run(text)
            run.font.size = Pt(9)
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
        if row_idx % 2 == 0:
            for cell in cells:
                _set_cell_bg(cell, "EEF2FF")

    if data.notenempfehlung and bewertungsmodus == "benotet":
        note = data.notenempfehlung.note
        grade_color = _note_color(note)
        grade_cells = table.rows[-1].cells
        for cell, text in zip(
            grade_cells,
            ["KI-Notenempfehlung" + (" – vorläufig, Prüfung erforderlich" if data.notenempfehlung_vorlaeufig else ""), "", f"{note} – {data.notenempfehlung.bezeichnung}"],
        ):
            p = cell.paragraphs[0]
            run = p.add_run(text)
            run.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(3)
            _set_cell_bg(cell, str(grade_color))

    for index, row in enumerate(table.rows):
        row._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
        if len(table.rows) <= 8:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    paragraph.paragraph_format.keep_with_next = index < len(table.rows)-1
    doc.add_paragraph()


def befund_label(fehler: SprachFehler) -> str:
    if fehler.befundart == "stilalternative":
        return "Anregung"
    if fehler.befundart == "ungeklaert":
        return "Zu prüfen"
    if fehler.ersetzungspruefung is not None and fehler.ersetzungspruefung.get("status") != "bestaetigt":
        return "Ersatz prüfen"
    return fehler.typ


def add_fehlerprotokoll(doc: Document, fehler_list: list[SprachFehler]) -> None:
    """Rendert eine Fehlerprotokoll-Tabelle mit allen Sprachfehlern."""
    add_section_header(doc, "FEHLERPROTOKOLL")

    table = doc.add_table(rows=1, cols=5)
    table.style = "Table Grid"

    header_pr = table.rows[0]._tr.get_or_add_trPr()
    repeat_header = OxmlElement("w:tblHeader")
    repeat_header.set(qn("w:val"), "true")
    header_pr.append(repeat_header)

    hdr = table.rows[0].cells
    for i, col_title in enumerate(("Nr.", "Typ", "Zitat", "Korrektur", "Erklärung")):
        p = hdr[i].paragraphs[0]
        run = p.add_run(col_title)
        run.bold = True
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        shading = OxmlElement("w:shd")
        shading.set(qn("w:val"), "clear")
        shading.set(qn("w:fill"), "DDDDDD")
        hdr[i]._tc.get_or_add_tcPr().append(shading)

    for nr, fehler in enumerate(fehler_list, start=1):
        row_object = table.add_row()
        row_object._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
        row = row_object.cells
        row[0].text = str(nr)
        typ_p = row[1].paragraphs[0]
        typ_run = typ_p.add_run(befund_label(fehler))
        typ_run.bold = True
        typ_run.font.color.rgb = _FEHLER_TYP_COLORS.get(fehler.typ, RGBColor(0, 0, 0))
        row[2].text = fehler.zitat
        row[3].text = fehler.korrektur
        row[4].text = fehler.erklaerung

    counts: dict[str, int] = {"R": 0, "G": 0, "Z": 0, "A": 0}
    offen = 0
    for f in fehler_list:
        if f.befundart in {"stilalternative", "ungeklaert"}:
            offen += 1
            continue
        # Ein Befund kann zwei Regeln betreffen (das/dass + Komma).
        for typ in f.teiltypen or [f.typ]:
            counts[typ] = counts.get(typ, 0) + 1
    summary = (
        f"R: {counts['R']} | G: {counts['G']} | Z: {counts['Z']} | A: {counts['A']}"
        f" — {sum(counts.values())} Fehlerhinweise; {offen} Anregungen / offene Befunde"
    )
    if not sum(counts.values()) and fehler_list:
        summary += ". Keine bestätigten Fehler; die offenen Hinweise müssen noch geprüft werden."
    p = doc.add_paragraph()
    run = p.add_run(summary)
    run.bold = True
    run.font.size = Pt(10)


# Deterministische Übungstipps je Fehlertyp (L3, „Nächste Schritte") — schüler-
# freundlich, textsortenneutral, ohne LLM (kein Halluzinationsrisiko).
# Die deutschen Tipps nennen deutsche Regeln/Wörter; andere Fächer bekommen die
# sprachneutrale Fassung (_NAECHSTE_SCHRITTE_TIPPS_NEUTRAL).
_NAECHSTE_SCHRITTE_TIPPS: dict[str, tuple[str, str]] = {
    "R": (
        "Rechtschreibung",
        "Schreibe die drei Wörter, die du am häufigsten falsch schreibst, auf eine "
        "Karte und übe sie täglich kurz — in kleinen Portionen bleibt es am besten hängen.",
    ),
    "G": (
        "Grammatik",
        "Markiere in deinen Sätzen die Satzkerne (Wer tut was?) und prüfe, ob Subjekt, "
        "Verb und Endungen zusammenpassen — lies den Satz danach noch einmal langsam durch.",
    ),
    "Z": (
        "Zeichensetzung",
        "Lies deine Sätze laut: Vor dass, weil, obwohl und vor Relativsätzen "
        "(der, die, das, welcher) gehört ein Komma.",
    ),
    "A": (
        "Ausdruck",
        "Prüfe die im Fehlerprotokoll markierten Wortverbindungen im vollständigen Satz "
        "und benenne möglichst genau, was du ausdrücken möchtest.",
    ),
}

# Deutsch: Tipps je Regel-Etikett (sprachregeln.regel_muster). Fehlende Etiketten
# fallen auf die Tipps je Fehlertyp zurück.
_TIPPS_NACH_MUSTER: dict[str, tuple[str, str]] = {
    "rechtschreibung": _NAECHSTE_SCHRITTE_TIPPS["R"],
    "grammatik": _NAECHSTE_SCHRITTE_TIPPS["G"],
    "zeichensetzung": _NAECHSTE_SCHRITTE_TIPPS["Z"],
    "komma": _NAECHSTE_SCHRITTE_TIPPS["Z"],
    "ausdruck": _NAECHSTE_SCHRITTE_TIPPS["A"],
    "anrede_klein": (
        "Kleinschreibung nach der Anrede",
        "Nach einer Anrede mit Komma schreibst du klein weiter – außer das nächste Wort "
        "ist ein Nomen oder die Höflichkeitsform „Sie“.",
    ),
    "nominalisierung": (
        "Großschreibung von Nominalisierungen",
        "Steht vor einem Adjektiv oder Verb ein Begleiter wie etwas, viel, nichts, das "
        "oder beim, wird es zum Nomen und großgeschrieben: etwas Gutes, beim Lesen.",
    ),
    "gross_klein": (
        "Groß- und Kleinschreibung",
        "Frage dich bei jedem großgeschriebenen Wort: Ist es ein Nomen, ein Name oder ein "
        "Satzanfang? Nur dann schreibst du groß.",
    ),
    "satzanfang": (
        "Großschreibung am Satzanfang",
        "Nach Punkt, Frage- und Ausrufezeichen schreibst du groß – nach einem Doppelpunkt "
        "dann, wenn ein vollständiger Satz folgt.",
    ),
    "eigenname": (
        "Eigennamen",
        "Übernimm Namen von Personen, Orten und Werken genau aus der Vorlage.",
    ),
    "das_dass": (
        "das oder dass",
        "Kannst du das Wort durch dieses, jenes oder welches ersetzen, schreibst du das. "
        "Sonst ist es die Konjunktion dass – davor steht ein Komma.",
    ),
    "komma_infinitiv": (
        "Komma bei Infinitivgruppen",
        "Ein Komma ist nötig, wenn die Gruppe mit zu durch um, ohne, statt, anstatt, außer "
        "oder als eingeleitet wird oder ein Wort wie es, dazu oder daran auf sie verweist.",
    ),
    "komma_nebensatz": (
        "Komma bei Nebensätzen",
        "Nebensätze beginnen oft mit dass, weil, wenn, ob, wie oder einem Relativpronomen. "
        "Trenne sie vorne und hinten durch ein Komma vom Hauptsatz.",
    ),
    "komma_einschub": (
        "Komma bei Einschüben und Zusätzen",
        "Nachgestellte Zusätze und Erläuterungen (zum Beispiel …) trennst du durch Kommas ab.",
    ),
    "bindestrich": (
        "Ergänzungsstrich",
        "Lässt du einen gleichen Wortteil weg, setzt du einen Strich: Lese- und Schreibzeit.",
    ),
    "getrennt_zusammen": (
        "Getrennt- und Zusammenschreibung",
        "Schlage unsichere Verbindungen im Wörterbuch nach: Ist es ein Wort oder sind es zwei?",
    ),
    "kongruenz": (
        "Übereinstimmung von Subjekt und Verb",
        "Suche zu jedem Verb sein Subjekt: Steht das Subjekt in der Mehrzahl, steht auch "
        "das Verb in der Mehrzahl.",
    ),
    "kasus": (
        "Fälle und Endungen",
        "Prüfe, welchen Fall das Verb oder die Präposition verlangt (helfen + Dativ, "
        "wegen + Genitiv), und passe Artikel und Endungen an.",
    ),
    "zeitform": (
        "Zeitformen",
        "Bleib innerhalb eines Abschnitts in einer Zeitform und wechsle nur, wenn sich die "
        "Zeit tatsächlich ändert.",
    ),
    "satzbau": (
        "Satzbau",
        "Lies jeden Satz einzeln: Hat er ein Subjekt und ein vollständiges Prädikat? Teile "
        "Sätze, in denen du selbst den Faden verlierst.",
    ),
    "wortbedeutung": (
        "Wortbedeutung",
        "Prüfe bei den markierten Wörtern, ob sie genau das bedeuten, was du meinst – ein "
        "Wörterbuch hilft bei Wörtern, die ähnlich klingen.",
    ),
}

_VERMERK_AUSSAGE_OFFEN = "(KI-Gegenprüfung offen – bitte vor der Weitergabe prüfen.)"


_NAECHSTE_SCHRITTE_TIPPS_NEUTRAL: dict[str, tuple[str, str]] = {
    **_NAECHSTE_SCHRITTE_TIPPS,
    "G": (
        "Grammatik",
        "Markiere in deinen Sätzen die Satzkerne (Wer tut was?) und prüfe die "
        "Zeitformen — lies den Satz danach noch einmal langsam durch.",
    ),
    "Z": (
        "Zeichensetzung",
        "Suche im Fehlerprotokoll die Regel, gegen die du am häufigsten verstoßen "
        "hast, und lies deine Sätze vor der Abgabe gezielt darauf durch.",
    ),
    "A": (
        "Ausdruck",
        "Ersetze allgemeine Wörter durch genauere — ein ein- oder zweisprachiges "
        "Wörterbuch hilft beim präziseren Formulieren.",
    ),
}


def add_naechste_schritte(
    doc: Document, fehler_list: list[SprachFehler], fach: str | None = None
) -> None:
    """Rendert Übungstipps zu den Top-Fehlerschwerpunkten (L3).

    Das Feedback soll nicht bei der Fehlerliste enden: Der Schüler bekommt zu
    seinen 2–3 häufigsten Fehlertypen je einen konkreten Übungstipp. Rein
    deterministisch aus den (bereits lehrkraftgefilterten) Typ-Counts.
    """
    ist_deutsch = (fach or "Deutsch").strip().casefold() == "deutsch"
    # Deutsch gruppiert nach Regel-Etikett, andere Fächer nach Fehlertyp.
    gruppen: dict[str, list[SprachFehler]] = {}
    for f in fehler_list:
        if ist_deutsch:
            key = f.regel_muster or regel_muster(
                {"zitat": f.zitat, "korrektur": f.korrektur, "typ": f.typ, "erklaerung": f.erklaerung}
            )
            key = key if key in _TIPPS_NACH_MUSTER else f.typ
        else:
            key = f.typ
        gruppen.setdefault(key, []).append(f)
    top = sorted(gruppen.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:3]
    if not top:
        return

    tipps = {**_NAECHSTE_SCHRITTE_TIPPS, **_TIPPS_NACH_MUSTER} if ist_deutsch else _NAECHSTE_SCHRITTE_TIPPS_NEUTRAL
    add_section_header(doc, "NÄCHSTE SCHRITTE — WORAN DU ARBEITEN KANNST")
    for key, eintraege in top:
        eintrag = tipps.get(key)
        if not eintrag:
            continue
        label, tipp = eintrag
        p = doc.add_paragraph()
        run = p.add_run(f"{label} ({len(eintraege)}×): ")
        run.bold = True
        p.add_run(tipp)
        beispiel = eintraege[0]
        if ist_deutsch and beispiel.zitat and beispiel.korrektur and "\n" not in beispiel.korrektur:
            p.add_run(f" Beispiel aus deinem Text: „{beispiel.zitat}“ → „{beispiel.korrektur}“.").italic = True
    p = doc.add_paragraph()
    run = p.add_run("Diese Schwerpunkte üben wir gezielt weiter.")
    run.italic = True
    run.font.size = Pt(10)


def add_folgeuebung_hinweis(
    doc: Document, hinweis: FolgeuebungHinweis
) -> None:
    """Zeigt nur einen belegten oder explizit in LUKA vorhandenen Verweis.

    Es werden keine lokalen Pfade ausgegeben. Ein fehlender oder unbekannter
    Status darf nicht als beiliegendes Übungsblatt dargestellt werden.
    """
    if hinweis.status == "keine":
        return

    add_section_header(doc, "FOLGEÜBUNG")
    titel = f" „{hinweis.titel}“" if hinweis.titel else ""
    if hinweis.status == "beigelegt":
        # Nur der Dateiname ist für die Lehrkraft nützlich; Elternverzeichnisse
        # oder absolute Pfade gehören nicht in ein Schülerdokument.
        sichtbarer_name = Path((hinweis.dateiname or "").replace("\\", "/")).name
        add_body(
            doc,
            f"Eine passende Folgeübung{titel} liegt bei: {sichtbarer_name}.",
        )
    elif hinweis.status == "in_luka":
        add_body(
            doc,
            f"Eine passende Folgeübung{titel} wurde in LUKA erzeugt und kann dort geöffnet werden.",
        )


def _add_srdp_table(
    doc: Document,
    data: dict[str, Any],
    kriterien: list[tuple[str, str]],
) -> None:
    """Erstellt eine SRDP-Tabelle mit Kriterium | Einschätzung | Begründung."""
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"

    hdr = table.rows[0].cells
    header = OxmlElement("w:tblHeader")
    table.rows[0]._tr.get_or_add_trPr().append(header)
    for cell, heading in zip(hdr, ("Kriterium", "Einschätzung", "Begründung")):
        cell.text = heading
        for p in cell.paragraphs:
            p.paragraph_format.keep_with_next = True
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(9)

    table.columns[0].width = Cm(3.5)
    table.columns[1].width = Cm(5.0)
    table.columns[2].width = Cm(8.5)

    for key, label in kriterien:
        entry = data.get(key) or {}
        stufe = entry.get("stufe")
        begruendung = str(entry.get("begruendung", ""))
        if type(stufe) is int and 1 <= stufe <= 5:
            einschaetzung = SRDP_WORTLAUT.get(key, {}).get(stufe, f"Stufe {stufe}")
        else:
            einschaetzung = "Offen – Lehrkraftprüfung erforderlich"
            begruendung = "Für dieses Kriterium fehlt eine ausreichend belegte abschließende Bewertung."

        row = table.add_row()
        row._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))

        p = row.cells[0].paragraphs[0]
        r = p.add_run(label)
        r.bold = True
        r.font.size = Pt(9)

        p = row.cells[1].paragraphs[0]
        r = p.add_run(einschaetzung)
        r.italic = True
        r.font.size = Pt(9)

        p = row.cells[2].paragraphs[0]
        r = p.add_run(begruendung)
        r.font.size = Pt(9)


def add_srdp_raster(doc: Document, srdp_detail: dict[str, Any]) -> None:
    """Fügt den ausgefüllten SRDP-Beurteilungsraster als Tabellen ins Dokument ein."""
    # Ein Trenner direkt vor dem Seitenwechsel kann allein auf eine zusätzliche
    # Seite rutschen. Der neue Abschnitt selbst trägt den Seitenwechsel.
    if doc.paragraphs and doc.paragraphs[-1].text == "-" * 56:
        divider = doc.paragraphs[-1]._p
        divider.getparent().remove(divider)
    add_section_header(doc, "BEURTEILUNG NACH SRDP-RASTER")
    doc.paragraphs[-1].paragraph_format.page_break_before = True

    gesamteindruck = srdp_detail.get("gesamteindruck", "")
    if gesamteindruck:
        p = doc.add_paragraph()
        r = p.add_run(gesamteindruck)
        r.font.size = Pt(10)
        r.italic = True

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("K1 – Inhalt").bold = True
    _add_srdp_table(doc, srdp_detail.get("k1_inhalt") or {}, [
        ("schreibhandlung", "Schreibhandlung(en)"),
        ("arbeitsauftraege", "Arbeitsaufträge"),
        ("textbeilage", "Textbeilage(n)"),
        ("sachlich", "Sachliche Richtigkeit"),
        ("qualitaet", "Qualität der Auseinandersetzung"),
    ])

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("K1 – Textstruktur").bold = True
    _add_srdp_table(doc, srdp_detail.get("k1_textstruktur") or {}, [
        ("kohaerenz", "Kohärenz"),
        ("bezugnahme", "Bezugnahme auf Textbeilage(n)"),
        ("kohaesion", "Kohäsionsmittel"),
    ])

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("K3/1 – Stil und Ausdruck").bold = True
    _add_srdp_table(doc, srdp_detail.get("k3_stil") or {}, [
        ("situationsadaequat", "Situationsadäquatheit"),
        ("wortwahl", "Wortwahl / Ausdruck"),
        ("satzstrukturen", "Satzstrukturen"),
        ("eigenstaendigkeit", "Eigenständigkeit"),
    ])

    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("K3/1 – Sprachnormen").bold = True
    _add_srdp_table(doc, srdp_detail.get("k3_sprachnormen") or {}, [
        ("orthografie", "Orthografie"),
        ("zeichensetzung", "Zeichensetzung"),
        ("grammatik", "Grammatik"),
    ])

    if any(srdp_detail.get(key) for key in ("verbesserung_inhaltlich", "verbesserung_strukturell", "verbesserung_sprachlich")):
        doc.add_paragraph()
        p = doc.add_paragraph()
        p.add_run("Zentrale Verbesserungshinweise").bold = True
    for key, label in [
        ("verbesserung_inhaltlich", "Inhaltlich"),
        ("verbesserung_strukturell", "Strukturell"),
        ("verbesserung_sprachlich", "Sprachlich"),
    ]:
        text = srdp_detail.get(key, "")
        if text:
            p = doc.add_paragraph()
            r = p.add_run(f"{label}: ")
            r.bold = True
            r.font.size = Pt(10)
            r2 = p.add_run(text)
            r2.font.size = Pt(10)


def build_student_feedback(data: FeedbackData, config, original_text: str | None, bewertungsmodus: str) -> Document:
    """Kurze, ausschließlich freigegebene Rückmeldung aus denselben Ergebnisdaten."""
    import copy
    data = copy.deepcopy(data)
    if data.aussagenstatus is not None:
        for field in ("zusammenfassung", "staerken_global", "verbesserungsbereiche"):
            if data.aussagenstatus.get(field) not in {"bestaetigt", "korrigiert"}:
                setattr(data, field, None)
    data.fehler = [f for f in data.fehler or [] if f.lehrkraft_aktion in {"uebernommen", "geaendert"}]
    data.hinweise = []
    doc = Document()
    setup_page(doc, config)
    doc.styles["Normal"].font.size = Pt(11)
    for style_name in ("Title", "Heading 1", "Heading 2", "Heading 3"):
        doc.styles[style_name].font.color.rgb = RGBColor(0, 0, 0)
    title = doc.add_paragraph("Rückmeldung zu deiner Arbeit", style="Title")
    for run in title.runs:
        run.font.color.rgb = RGBColor(0, 0, 0)
    if data.schueler:
        doc.add_paragraph(data.schueler)
    if data.pruefstatus != "freigegeben":
        doc.add_paragraph("Entwurf – Lehrkraftprüfung noch offen")
    if data.zusammenfassung:
        doc.add_paragraph(data.zusammenfassung)
    for heading, values in (("Das gelingt dir", data.staerken_global), ("Deine nächsten Schritte", data.verbesserungsbereiche)):
        chosen = list(dict.fromkeys(values or []))[:3]
        if chosen:
            add_heading(doc, heading, level=2)
            for value in chosen:
                add_bullet(doc, value)
    if data.lehrer_kommentar:
        doc.add_paragraph(data.lehrer_kommentar)
    if data.pruefstatus == "freigegeben" and bewertungsmodus == "benotet":
        grade = data.lehrer_note if data.lehrer_note is not None else (data.notenempfehlung.note if data.notenempfehlung else None)
        if grade is not None:
            doc.add_paragraph(f"Note: {grade:g}")
    if original_text and original_text.strip():
        doc.add_page_break()
        doc.add_paragraph("Durchgestrichen: ursprüngliche Formulierung. Grün: übernommener Vorschlag. Orange unterstrichen: Beistrichstelle ohne Randkommentar. Kommentare erläutern die übrigen Hinweise.")
        from correction_quality import finding_spans
        for finding in data.fehler:
            spans = finding_spans(original_text, {"zitat": finding.zitat, "textstelle_id": finding.textstelle_id})
            finding.anker_status = "eindeutig" if len(spans) == 1 else "mehrdeutig"
        paragraphs = add_student_text_section(doc, original_text, data)
        _attach_word_level_comments(doc, [], author=((config or {}).get("docx", {}).get("teacher_name") or "Lehrkraft"), student_paragraphs=paragraphs, fehler_list=data.fehler)
    for element in (doc.styles.element, doc.element):
        for border in list(element.iter(qn("w:pBdr"))):
            border.getparent().remove(border)
    for paragraph in doc.paragraphs:
        if paragraph.style.name.startswith("Heading") or paragraph.text == "ORIGINALTEXT":
            for run in paragraph.runs:
                run.font.color.rgb = RGBColor(0, 0, 0)
    return doc


def add_pruefnachweis(doc: Document, proof: dict) -> None:
    """Vollständiger Nachweis bleibt ausschließlich in der Lehrkraftansicht."""
    doc.add_page_break()
    add_section_header(doc, "PRÜFNACHWEIS FÜR DIE LEHRKRAFT")
    review = proof.get("gegenpruefung", {})
    add_body(doc, f"Gegenprüfung: {review.get('version', 'keine Versionsangabe')}")
    if review.get("grundlage_hash"):
        add_body(doc, f"Laufgrundlage: {review['grundlage_hash']}")
    reasoning = proof.get("reasoning", {})
    if isinstance(reasoning, dict) and reasoning.get("selection"):
        add_body(doc, f"Verwendeter Denkmodus: {reasoning['selection']}")
    check = proof.get("bewertung", {})
    for task in check.get("aufgaben", []):
        add_bullet(doc, f"Offene Prüfaufgabe – {task['kriterium']}: {task['beschreibung']}")
    for key, entry in check.get("kriterien", {}).items():
        add_heading(doc, key, level=3)
        level = f", Stufe {entry['stufe']}" if entry.get("stufe") is not None else ""
        add_body(doc, f"Status: {entry.get('status', 'offen')}{level}")
        if entry.get("begruendung"):
            add_body(doc, entry["begruendung"])
        for quote in entry.get("belege", []):
            text = quote.get("zitat", "") if isinstance(quote, dict) else quote
            add_bullet(doc, f"Verankerter Originalbeleg: {text}")
    for diagnostic in check.get("belegdiagnosen", []):
        quote = diagnostic.get("beleg", "")
        text = quote.get("zitat", "") if isinstance(quote, dict) else str(quote)
        add_bullet(doc, f"Verworfener Beleg ({diagnostic.get('kriterium', '')}): {text}. {diagnostic.get('grund', '')}")
    for field, status in check.get("aussagen", {}).items():
        add_body(doc, f"Rückmeldungsfeld {field}: {status}")
    for finding in proof.get("befunde", []):
        if not isinstance(finding, dict):
            continue
        add_heading(doc, f"Befund {finding.get('befund_id', '')}: {finding.get('zitat', '')}", level=3)
        add_body(doc, f"Art: {finding.get('befundart', 'ungeklärt')}; Anker: {finding.get('anker_status', 'ungeklärt')}; Lehrkraft: {finding.get('lehrkraft_aktion') or 'offen'}")
        for label, key in (("Beanstandung", "ki_pruefung"), ("Ersetzung", "ersetzungspruefung")):
            decision = finding.get(key) or {}
            add_body(doc, f"{label}: {decision.get('status', 'ungeklärt')}. {decision.get('begruendung', '')}")
        replacement = finding.get("lehrkraft_korrektur") if finding.get("lehrkraft_aktion") == "geaendert" else finding.get("korrektur")
        if replacement:
            add_body(doc, f"Vorschlag (Prüfstatus siehe oben): {replacement}")
        if finding.get("erklaerung"):
            add_body(doc, finding["erklaerung"])


def build_feedback_document(
    data: FeedbackData,
    config: dict[str, Any] | None = None,
    original_text: str | None = None,
    source_note: str | None = None,
    aufgabe_label: str = "",
    bewertungsmodus: str = "benotet",
    ansicht: str = "lehrkraft",
) -> Document:
    """Erstellt das DOCX-Dokument im Stil einer authentischen Lehrkraft-Korrektur."""

    if ansicht not in {"schueler", "lehrkraft"}:
        raise ValueError("Ungültige Feedbackansicht.")
    if ansicht == "schueler":
        return build_student_feedback(data, config, original_text, "unbenotet" if data.bewertungsmodus != "benotet" else bewertungsmodus)
    if data.bewertungsmodus != "benotet" or any(c.punkte is None for c in data.bewertung):
        bewertungsmodus = "unbenotet"
    doc = Document()
    setup_page(doc, config)

    cfg = config or {}
    docx_cfg = cfg.get("docx", {})
    teacher_name = docx_cfg.get("teacher_name") or "Lehrkraft"

    word_count = len(original_text.split()) if original_text else 0
    add_korrektur_header(doc, data, config, word_count=word_count, aufgabe_label=aufgabe_label)
    add_legende(doc)

    # Originaltext mit Inline-Korrekturen und Word-Balloons
    text_paragraphs: list[Any] = []
    if original_text and original_text.strip():
        from correction_quality import finding_spans
        for finding in data.fehler or []:
            matches = finding_spans(original_text, {"zitat": finding.zitat, "textstelle_id": finding.textstelle_id})
            finding.anker_status = "eindeutig" if len(matches) == 1 else "mehrdeutig" if matches else "nicht_gefunden"
        text_paragraphs = add_student_text_section(doc, original_text, data)

        # Balloon-Kommentare: hinweise (Wortebene) + vorschläge (Absatz-Ebene)
        extra_comment_strings: list[str] = []
        for crit in ordered_criteria(data):
            for v in (crit.vorschlaege or []):
                extra_comment_strings.append(v)

        _attach_word_level_comments(
            doc, data.hinweise or [], author=teacher_name,
            student_paragraphs=text_paragraphs,
            fehler_list=data.fehler or [],
        )
    else:
        # Kein Originaltext verfügbar → Hinweis (ggf. mit Quelldatei-Info)
        msg = source_note or "(Originaltext nicht verfügbar — Input-DOCX nicht gefunden.)"
        add_body(doc, msg)
        add_divider(doc)

    # Überblick (Zusammenfassung, Stärken, Note)
    if data.qualitaetswarnungen:
        add_section_header(doc, "PRÜFBEDARF")
        for warning in data.qualitaetswarnungen:
            add_bullet(doc, warning)
    add_body(doc, "Lehrkraftprüfung: " + ("freigegeben" if data.pruefstatus == "freigegeben" else "Entwurf – Prüfung offen"))
    if data.lehrer_kommentar:
        add_section_header(doc, "KOMMENTAR DER LEHRKRAFT")
        add_body(doc, data.lehrer_kommentar)
    if data.lehrer_note is not None and bewertungsmodus == "benotet":
        add_body(doc, f"LEHRERNOTE: {data.lehrer_note:g}")
    add_lehrer_kommentar_block(doc, data, bewertungsmodus=bewertungsmodus)

    # Detaillierte Kriterien-Auswertung
    if any(c.punkte is None for c in data.bewertung):
        bewertungsmodus = "unbenotet"
    if bewertungsmodus == "benotet":
        add_summary_table(doc, data, bewertungsmodus=bewertungsmodus)
        add_divider(doc)

    for index, criterion in enumerate(ordered_criteria(data), start=1):
        section_start = len(doc.paragraphs)
        add_section_header(doc, f"{index}. {criterion_label(data, criterion.key)}")
        if bewertungsmodus == "benotet":
            points_text = f"{criterion.punkte:g} Punkte"
            if criterion.gewicht is not None:
                points_text = f"{points_text} | Gewicht: {weight_percent(data, criterion)}"
            add_label(doc, "Bewertung", f"{criterion.stufe} [{points_text}]")
        doc.add_paragraph()

        render_list_section(doc, "Stärken:", criterion.staerken, color=C_STRENGTH)
        for paragraph in doc.paragraphs[section_start:-1]:
            paragraph.paragraph_format.keep_with_next = True
        doc.add_paragraph()

        if criterion.rhetorische_figuren:
            render_list_section(
                doc, "Rhetorische Figuren:", criterion.rhetorische_figuren
            )
            doc.add_paragraph()

        render_list_section(
            doc, "Schwächen / Fehler:", criterion.schwaechen, color=C_WEAKNESS
        )
        doc.add_paragraph()
        render_list_section(
            doc, "Verbesserungsvorschläge:", criterion.vorschlaege, color=C_SUGGESTION
        )
        add_divider(doc)

    if data.sachfach_bewertung:
        add_section_header(doc, "FACHLICHE BEWERTUNG")
        add_body(
            doc,
            "Die fachlichen Kriterien werden getrennt von Sprachrichtigkeit und "
            "Ausdruck betrachtet.",
        )
        for criterion in data.sachfach_bewertung.values():
            add_section_header(doc, criterion_label(data, criterion.key))
            if bewertungsmodus == "benotet":
                add_label(
                    doc,
                    "Bewertung",
                    f"{criterion.stufe} [{criterion.punkte:g} Punkte]",
                )
            doc.add_paragraph()
            render_list_section(doc, "Stärken:", criterion.staerken, color=C_STRENGTH)
            doc.add_paragraph()
            render_list_section(
                doc, "Schwächen / Fehler:", criterion.schwaechen, color=C_WEAKNESS
            )
            doc.add_paragraph()
            render_list_section(
                doc, "Verbesserungsvorschläge:", criterion.vorschlaege, color=C_SUGGESTION
            )
        add_divider(doc)

    if data.fehler:
        add_fehlerprotokoll(doc, data.fehler)
        add_divider(doc)
        regel_fehler = [f for f in data.fehler if f.befundart not in {"stilalternative", "ungeklaert"}]
        if regel_fehler:
            add_naechste_schritte(doc, regel_fehler, data.fach)
        add_divider(doc)

    if data.folgeuebung:
        add_folgeuebung_hinweis(doc, data.folgeuebung)
        if data.folgeuebung.status != "keine":
            add_divider(doc)

    if data.srdp_detail and bewertungsmodus == "benotet":
        add_srdp_raster(doc, data.srdp_detail)
        add_divider(doc)

    if data.notenempfehlung and bewertungsmodus == "benotet":
        grade_start = len(doc.paragraphs)
        has_k1k3 = (
            data.notenempfehlung.k1_note is not None
            or data.notenempfehlung.k3_note is not None
        )
        grade_heading = "KI-NOTENEMPFEHLUNG – VORLÄUFIG" if data.notenempfehlung_vorlaeufig else "KI-NOTENEMPFEHLUNG – VORSCHLAG"
        add_section_header(doc, grade_heading + (" (SRDP-basiert)" if has_k1k3 else ""))
        add_divider(doc)
        if data.srdp_detail:
            add_body(doc, "Die KI-Notenempfehlung wird aus den in diesem Dokument ausgewiesenen SRDP-Detailbewertungen verdichtet. Die vier Hauptkriterien sind eigenständige Gesamteinschätzungen und können davon abweichen.")

        if has_k1k3:
            # Die Bereichsbeschriftung kommt aus dem Raster, sobald es eigene
            # Kriterien deklariert. Fest verdrahtet "Inhalt + Textstruktur" waere
            # bei einem Verstaendnisraster falsch beschriftet: dort tragen
            # Sachverstaendnis, Schlussfolgern und Bedeutungsschicht den K1-Bereich.
            k1_text = f"K1 ({data.notenempfehlung.k1_titel})" if data.notenempfehlung.k1_titel else "K1 (Inhalt + Textstruktur)"
            k3_text = f"K3/1 ({data.notenempfehlung.k3_titel})" if data.notenempfehlung.k3_titel else "K3/1 (Stil + Sprachnormen)"
            if data.notenempfehlung.k1_note is not None:
                k1_schnitt_str = (
                    f" [Stufe {data.notenempfehlung.k1_schnitt:.1f}]"
                    if data.notenempfehlung.k1_schnitt is not None
                    else ""
                )
                add_label(doc, k1_text, f"Note {data.notenempfehlung.k1_note}{k1_schnitt_str}")
            if data.notenempfehlung.k3_note is not None:
                k3_schnitt_str = (
                    f" [Stufe {data.notenempfehlung.k3_schnitt:.1f}]"
                    if data.notenempfehlung.k3_schnitt is not None
                    else ""
                )
                add_label(doc, k3_text, f"Note {data.notenempfehlung.k3_note}{k3_schnitt_str}")
        else:
            for criterion in ordered_criteria(data):
                label = criterion_label(data, criterion.key).title()
                value = f"{criterion.stufe} ({criterion.punkte:g} Punkte)"
                if criterion.gewicht is not None:
                    value = f"{value} x {weight_percent(data, criterion)}"
                add_label(doc, label, value)

        add_label(doc, "Durchschnitt", f"{data.notenempfehlung.durchschnitt:.2f}")

        note_paragraph = doc.add_paragraph()
        note_paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
        note_run = note_paragraph.add_run(
            f"{'Vorläufige KI-Notenempfehlung – Prüfung erforderlich' if data.notenempfehlung_vorlaeufig else 'Empfohlene Note'}: {data.notenempfehlung.note} – {data.notenempfehlung.bezeichnung}"
        )
        note_run.bold = True
        note_run.font.size = Pt(12)
        note_run.font.color.rgb = _note_color(data.notenempfehlung.note)

        if data.notenempfehlung.sonderregel:
            doc.add_paragraph()
            add_body(
                doc,
                f"Sonderregel: {data.notenempfehlung.sonderregel} – automatisch Nicht genügend.",
            )

        add_body(doc, "Begründung:")
        add_body(doc, data.notenempfehlung.begruendung)
        add_body(
            doc,
            "Die Note ist eine Empfehlung; die endgültige Entscheidung trifft die Lehrkraft.",
        )
        for paragraph in doc.paragraphs[grade_start:-1]:
            paragraph.paragraph_format.keep_with_next = True
    else:
        add_section_header(doc, "BEWERTUNG NOCH OFFEN" if bewertungsmodus == "benotet" else "FORMATIVES FEEDBACK – OHNE NOTE")
        add_divider(doc)
        add_body(
            doc,
            "Die erforderlichen Bewertungskriterien sind noch nicht vollständig geklärt. Es wird keine automatische Note ausgegeben." if bewertungsmodus == "benotet" else "Diese Rückmeldung dient dem Lernen. Es wird keine Note ausgegeben.",
        )
        add_divider(doc)
    if data.pruefnachweis:
        add_pruefnachweis(doc, data.pruefnachweis)
    return doc


def build_statistics_document(
    stats: dict[str, Any],
    config: dict[str, Any] | None = None,
    klasse_name: str = "",
) -> Document:
    """Erstellt ein A4-DOCX-Dokument mit Klassen-Statistiken.

    Args:
        stats: Rückgabewert von compute_statistics()
        config: natascha_config.toml-Dict (optional, für Header/Footer)
        klasse_name: Anzeigename der Klasse (optional)
    """
    _NOTE_LABELS_MAP = {
        1: "Sehr gut",
        2: "Gut",
        3: "Befriedigend",
        4: "Genügend",
        5: "Nicht gen.",
    }
    doc = Document()
    setup_page(doc, config)
    add_heading(doc, "KLASSENAUSWERTUNG", level=1)

    # Meta-Tabelle
    meta = doc.add_table(rows=0, cols=2)
    meta.autofit = True
    today = date.today().strftime("%d.%m.%Y")
    meta_rows: list[tuple[str, str]] = []
    if klasse_name:
        meta_rows.append(("Klasse", klasse_name))
    meta_rows.append(("Datum", today))
    docx_cfg = (config or {}).get("docx", {})
    teacher = docx_cfg.get("teacher_name", "")
    school = docx_cfg.get("school_name", "")
    if teacher:
        meta_rows.append(("Lehrer/in", teacher))
    if school:
        meta_rows.append(("Schule", school))
    for label, value in meta_rows:
        row = meta.add_row()
        row.cells[0].text = label
        row.cells[1].text = value
        for cell in row.cells:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(10)
    doc.add_paragraph()

    # Übersicht
    total = stats.get("total", 0)
    avg = stats.get("grade_average", 0.0)
    p_total = doc.add_paragraph()
    r_total = p_total.add_run(f"Ausgewertete Schüler/innen: {total}")
    r_total.bold = True
    r_total.font.size = Pt(11)
    if total > 0:
        p_avg = doc.add_paragraph()
        r_avg = p_avg.add_run(f"Gesamtdurchschnitt: {avg:.2f}")
        r_avg.bold = True
        r_avg.font.size = Pt(11)
        r_avg.font.color.rgb = _note_color(max(1, min(5, round(avg))))
    doc.add_paragraph()

    # Notenverteilung
    add_heading(doc, "Notenverteilung", level=2)
    dist = stats.get("grade_distribution", {})
    grade_table = doc.add_table(rows=1 + 5, cols=3)
    grade_table.autofit = True
    hrow = grade_table.rows[0]
    hrow.cells[0].text = "Note"
    hrow.cells[1].text = "Bezeichnung"
    hrow.cells[2].text = f"Anzahl (von {total})"
    for cell in hrow.cells:
        for para in cell.paragraphs:
            for run in para.runs:
                run.bold = True
                run.font.size = Pt(10)
                run.font.color.rgb = C_PRIMARY
    for i, note in enumerate(range(1, 6), 1):
        count = dist.get(note, 0)
        pct = (count / total * 100) if total > 0 else 0.0
        row = grade_table.rows[i]
        row.cells[0].text = str(note)
        row.cells[1].text = _NOTE_LABELS_MAP.get(note, "")
        row.cells[2].text = f"{count}  ({pct:.1f}%)"
        color = _note_color(note)
        for cell in row.cells:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(10)
                    run.font.color.rgb = color
    doc.add_paragraph()

    # Kriterien-Auswertung
    crit_avgs = stats.get("criteria_averages", {})
    if crit_avgs:
        add_heading(doc, "Kriterien-Auswertung", level=2)
        weakest = stats.get("weakest_criterion")
        strongest = stats.get("strongest_criterion")
        crit_table = doc.add_table(rows=1 + len(crit_avgs), cols=4)
        crit_table.autofit = True
        hrow = crit_table.rows[0]
        hrow.cells[0].text = "Kriterium"
        hrow.cells[1].text = "Ø Punkte"
        hrow.cells[2].text = "Min"
        hrow.cells[3].text = "Max"
        for cell in hrow.cells:
            for para in cell.paragraphs:
                for run in para.runs:
                    run.bold = True
                    run.font.size = Pt(10)
                    run.font.color.rgb = C_PRIMARY
        for i, (key, vals) in enumerate(
            sorted(crit_avgs.items(), key=lambda x: x[1]["avg"]), 1
        ):
            row = crit_table.rows[i]
            label = key.replace("_", " ").title()
            row.cells[0].text = label
            row.cells[1].text = f"{vals['avg']:.2f}"
            row.cells[2].text = f"{vals['min']:.1f}"
            row.cells[3].text = f"{vals['max']:.1f}"
            if key == weakest:
                highlight = C_GRADE_5
            elif key == strongest:
                highlight = C_GRADE_1
            else:
                highlight = None
            for cell in row.cells:
                for para in cell.paragraphs:
                    for run in para.runs:
                        run.font.size = Pt(10)
                        if highlight:
                            run.font.color.rgb = highlight
                            run.bold = True

    return doc


def output_filename(original_name: str) -> str:
    """Leitet den Zieldateinamen aus der Originaldatei ab."""

    return f"{Path(original_name).stem}_feedback.docx"


def log_error(log_path: Path, message: str) -> None:
    """Schreibt eine Fehlermeldung ins Fehlerlog."""

    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(f"{message}\n")


def collect_json_files(paths: ProjectPaths, selected_file: str | None) -> list[Path]:
    """Bestimmt die zu verarbeitenden JSON-Dateien."""

    if selected_file:
        candidate = Path(selected_file)
        if not candidate.is_absolute():
            candidate = paths.feedback_data_dir / selected_file
        if not candidate.exists():
            raise FileNotFoundError(f"JSON-Datei nicht gefunden: {candidate}")
        return [candidate]
    return sorted(paths.feedback_data_dir.glob("*.json"))


def process_file(
    json_path: Path, paths: ProjectPaths, force: bool = False, dry_run: bool = False
) -> str:
    """Verarbeitet eine einzelne JSON-Datei."""

    raw_payload = json.loads(json_path.read_text(encoding="utf-8"))
    bewertungsmodus: str = (
        raw_payload.get("bewertungsmodus", "benotet")
        if isinstance(raw_payload, dict)
        else "benotet"
    )
    feedback = parse_feedback_data(raw_payload)
    output_path = paths.output_dir / output_filename(feedback.datei)

    if output_path.exists() and not force:
        return f"Übersprungen (existiert bereits): {output_path.name}"

    if dry_run:
        return f"Dry-run: würde {json_path.name} -> {output_path.name} verarbeiten"

    paths.output_dir.mkdir(parents=True, exist_ok=True)

    # Versuche Originaltext aus Input-DOCX zu lesen
    original_text: str | None = None
    input_docx = paths.input_dir / feedback.datei
    if input_docx.exists():
        try:
            from docx import Document as _DocxDoc
            _d = _DocxDoc(str(input_docx))
            original_text = "\n".join(p.text for p in _d.paragraphs)
        except Exception:
            logging.debug("Original-DOCX-Text nicht lesbar: %s", input_docx, exc_info=True)

    document = build_feedback_document(
        feedback, original_text=original_text, bewertungsmodus=bewertungsmodus
    )
    document.save(output_path)
    return f"Gespeichert: {output_path.name}"


def main() -> int:
    """CLI-Einstiegspunkt."""

    args = parse_args()
    paths = project_paths()
    paths.feedback_data_dir.mkdir(parents=True, exist_ok=True)
    paths.output_dir.mkdir(parents=True, exist_ok=True)

    if not args.dry_run:
        paths.fehlerlog.write_text("", encoding="utf-8")

    try:
        json_files = collect_json_files(paths, args.file)
    except Exception as exc:
        log_error(paths.fehlerlog, str(exc))
        print(str(exc))
        return 1

    if not json_files:
        print("Keine JSON-Dateien in /output/feedback_data gefunden.")
        return 0

    failures = 0
    for json_path in json_files:
        try:
            message = process_file(
                json_path, paths, force=args.force, dry_run=args.dry_run
            )
            print(message)
        except Exception as exc:
            failures += 1
            message = f"{json_path.name} - Fehler: {exc}"
            log_error(paths.fehlerlog, message)
            print(message)

    if failures:
        print(f"Abgeschlossen mit {failures} Fehler(n).")
        return 1

    print("Fertig.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
