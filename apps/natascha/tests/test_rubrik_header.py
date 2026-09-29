from __future__ import annotations

from natascha_core import parse_rubrik_header, rubric_area_keys, strip_rubrik_header

# `k1`/`k3` sind Teil des Vertrags: ein Raster kann damit selbst sagen, welche
# seiner Kriterien in den SRDP-Kompetenzbereich fallen. Leer heisst "keine
# Angabe" — dann gilt weiter der feste Kanon-Zuordnungspfad. `aufgabenart`
# steuert die Zusatzanweisungen bei der Erwartungshorizont-Generierung.
LEERE_FELDER = {
    "titel": "",
    "fach": "",
    "schulstufe": "",
    "textsorte": "",
    "k1": "",
    "k3": "",
    "aufgabenart": "",
}


def test_parse_rubrik_header_reads_all_fields() -> None:
    text = """<!-- luka-rubrik
titel: SRDP Deutsch Oberstufe
fach: deutsch
schulstufe: oberstufe
textsorte: alle
k1: inhalt, textstruktur
k3: ausdruck, sprachrichtigkeit
aufgabenart: verstaendnis
-->

# Bewertungsraster
"""

    assert parse_rubrik_header(text) == {
        "titel": "SRDP Deutsch Oberstufe",
        "fach": "deutsch",
        "schulstufe": "oberstufe",
        "textsorte": "alle",
        "k1": "inhalt, textstruktur",
        "k3": "ausdruck, sprachrichtigkeit",
        "aufgabenart": "verstaendnis",
    }


def test_parse_rubrik_header_keeps_legacy_rubrics_usable() -> None:
    assert parse_rubrik_header("# Eigene Rubrik\n") == LEERE_FELDER


def test_rubrik_area_keys_zerlegt_die_deklaration() -> None:
    header = parse_rubrik_header(
        "<!-- luka-rubrik\ntitel: T\nk1: sachverstaendnis, schlussfolgern\n"
        "k3: ausdruck\n-->\n"
    )
    assert rubric_area_keys(header, "k1") == ("sachverstaendnis", "schlussfolgern")
    assert rubric_area_keys(header, "k3") == ("ausdruck",)


def test_rubrik_area_keys_vertragt_leere_angabe() -> None:
    """Ohne Deklaration kommen leere Tupel zurueck — nie Keys, die es nicht gibt."""
    assert rubric_area_keys(LEERE_FELDER, "k1") == ()
    assert rubric_area_keys(LEERE_FELDER, "k3") == ()
    assert rubric_area_keys(parse_rubrik_header("<!-- luka-rubrik\nk1:  \n-->\n"), "k1") == ()


def test_rubrik_area_keys_ignoriert_backticks_und_leerraum() -> None:
    """Die Schreibweise aus `## JSON-Kriterien` ist hier ebenfalls erlaubt."""
    header = parse_rubrik_header("<!-- luka-rubrik\nk1: `a`, b ,c\n-->\n")
    assert rubric_area_keys(header, "k1") == ("a", "b", "c")


def test_strip_rubrik_header_removes_only_comment() -> None:
    rubric = """<!-- luka-rubrik
titel: Eigene Rubrik
fach: deutsch
schulstufe: oberstufe
textsorte: kommentar
-->

# Unveränderter Inhalt

Dieser Inhalt geht an das LLM.
"""

    assert strip_rubrik_header(rubric) == "# Unveränderter Inhalt\n\nDieser Inhalt geht an das LLM.\n"
