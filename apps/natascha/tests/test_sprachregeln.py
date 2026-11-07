"""Deterministische Sprachregeln ohne Modellaufruf (synthetische Texte)."""

from __future__ import annotations

import pytest

import sprachregeln as sr
from correction_quality import anchor_findings


@pytest.mark.parametrize(
    "text, zitat, korrektur",
    [
        ("Liebe Klasse,\nHaben Sie schon einmal nachgedacht?", "Haben Sie", "haben Sie"),
        ("Liebe Gäste, liebe Eltern,\nHabt ihr euch das überlegt?", "Habt ihr", "habt ihr"),
        ("Liebe Schülerinnen und Schüler,\nSchaffen wir das?", "Schaffen wir", "schaffen wir"),
        ("Rede\nLiebe Klasse, liebe Gäste,\nDer Mensch ist neugierig.", "Der Mensch", "der Mensch"),
        ("Sehr geehrte Gäste, Heute spreche ich über Mut.", "Heute spreche", "heute spreche"),
        ("Guten Tag meine Damen und Herren,\nWir beginnen jetzt.", "Wir beginnen", "wir beginnen"),
    ],
)
def test_capital_after_salutation_comma_is_flagged(text, zitat, korrektur):
    befunde = sr.anrede_kleinschreibung(text)
    assert len(befunde) == 1
    befund = befunde[0]
    assert (befund["zitat"], befund["korrektur"], befund["typ"]) == (zitat, korrektur, "R")
    assert befund["befundart"] == "normfehler"
    assert befund["regel_muster"] == "anrede_klein"
    assert befund["ki_pruefung"]["herkunft"] == "regelpruefung"
    assert befund["ersetzungspruefung"]["status"] == "bestaetigt"
    assert anchor_findings([befund], text)[0]["anker_status"] == "eindeutig"


@pytest.mark.parametrize(
    "text",
    [
        "Liebe Klasse,\nFortschritt ist wichtig.",  # Nomen bleibt groß
        "Liebe Klasse,\nVeränderung macht Angst.",
        "Sehr geehrtes Publikum,\nwie halten wir es damit?",  # schon klein
        "Sehr geehrte Damen und Herren,\nSie wissen es längst.",  # Höflichkeitsform
        "Wir beginnen. Liebe Klasse,\nHaben Sie Zeit?",  # keine Anrede am Textanfang
        "Fortschritt, Haben wir das?",  # kein Anredewort
        "",
    ],
)
def test_salutation_rule_does_not_flag_nouns_polite_form_or_mid_text(text):
    assert sr.anrede_kleinschreibung(text) == []


def test_salutation_rule_skips_when_quote_not_unique_in_line():
    text = "Liebe Klasse,\nHaben wir Zeit? Haben wir Zeit? Haben wir Zeit?"
    befunde = sr.anrede_kleinschreibung(text)
    assert len(befunde) == 1
    assert anchor_findings(befunde, text)[0]["anker_status"] == "eindeutig"


@pytest.mark.parametrize(
    "zitat, korrektur, art",
    [
        ("etwas neues", "etwas Neues", "gross_klein"),
        ("glauben das", "glauben, das", "komma"),
        ("sind wie zum", "sind, wie zum", "komma"),
        ("so das wir", "so dass wir", "das_dass"),
        ("glauben das KI", "glauben, dass KI", "das_dass_komma"),
        ("Medien und", "Medien- und", "bindestrich"),
        ("zu Nutze", "zunutze", "getrennt_zusammen"),
        ("er geht", "er ging", None),
        ("gleich", "gleich", None),
    ],
)
def test_change_kind(zitat, korrektur, art):
    assert sr.aenderungsart(zitat, korrektur) == art


@pytest.mark.parametrize(
    "zitat, korrektur, typ, erwartet, teiltypen",
    [
        ("etwas neues", "etwas Neues", "G", "R", None),
        ("glauben das", "glauben, das", "R", "Z", None),
        ("glauben das KI", "glauben, dass KI", "Z", "R", ["R", "Z"]),
        ("er geht", "er ging", "G", "G", None),
    ],
)
def test_error_type_follows_the_actual_change(zitat, korrektur, typ, erwartet, teiltypen):
    befund = sr.pruefe_fehlertyp({"zitat": zitat, "korrektur": korrektur, "typ": typ})
    assert befund["typ"] == erwartet
    assert befund.get("teiltypen") == teiltypen
    assert befund.get("typ_vorher") == (typ if typ != erwartet else None)


@pytest.mark.parametrize(
    "befund, muster",
    [
        ({"zitat": "etwas neues", "korrektur": "etwas Neues", "typ": "R",
          "erklaerung": "Nominalisiertes Adjektiv nach etwas."}, "nominalisierung"),
        ({"zitat": "glauben das KI", "korrektur": "glauben, dass KI", "typ": "R"}, "das_dass"),
        ({"zitat": "versucht zu", "korrektur": "versucht, zu", "typ": "Z",
          "erklaerung": "Infinitivgruppe mit Verweiswort."}, "komma_infinitiv"),
        ({"zitat": "weiß ob", "korrektur": "weiß, ob", "typ": "Z",
          "erklaerung": "Nebensatz wird abgetrennt."}, "komma_nebensatz"),
        ({"zitat": "viel viel", "korrektur": "viel, viel", "typ": "Z", "erklaerung": ""}, "komma"),
        ({"zitat": "die Kinder spielt", "korrektur": "die Kinder spielen", "typ": "G",
          "erklaerung": "Subjekt im Plural, Verb im Singular."}, "kongruenz"),
        ({"zitat": "wegen dem", "korrektur": "wegen des", "typ": "G",
          "erklaerung": "wegen verlangt den Genitiv."}, "kasus"),
        ({"zitat": "er geht", "korrektur": "er ging", "typ": "G",
          "erklaerung": "Zeitform Präteritum beibehalten."}, "zeitform"),
        ({"zitat": "er geht", "korrektur": "er ging", "typ": "G", "erklaerung": ""}, "grammatik"),
        ({"zitat": "neue Einfälle", "korrektur": "neue Erfindungen", "typ": "A",
          "erklaerung": "Einfall bedeutet Idee."}, "wortbedeutung"),
        ({"zitat": "x", "korrektur": "y", "typ": "A", "erklaerung": ""}, "ausdruck"),
        ({"zitat": "x", "korrektur": "y", "typ": "R", "erklaerung": ""}, "rechtschreibung"),
        ({"zitat": "Haben Sie", "korrektur": "haben Sie", "typ": "R",
          "regel_muster": "anrede_klein"}, "anrede_klein"),
    ],
)
def test_rule_label(befund, muster):
    assert sr.regel_muster(befund) == muster
