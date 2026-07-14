from __future__ import annotations

from natascha_core import parse_rubrik_header, strip_rubrik_header


def test_parse_rubrik_header_reads_all_fields() -> None:
    text = """<!-- luka-rubrik
titel: SRDP Deutsch Oberstufe
fach: deutsch
schulstufe: oberstufe
textsorte: alle
-->

# Bewertungsraster
"""

    assert parse_rubrik_header(text) == {
        "titel": "SRDP Deutsch Oberstufe",
        "fach": "deutsch",
        "schulstufe": "oberstufe",
        "textsorte": "alle",
    }


def test_parse_rubrik_header_keeps_legacy_rubrics_usable() -> None:
    assert parse_rubrik_header("# Eigene Rubrik\n") == {
        "titel": "",
        "fach": "",
        "schulstufe": "",
        "textsorte": "",
    }


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
