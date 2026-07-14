"""Tests für die Pseudonymisierung vor dem LLM-Versand (DSGVO-Datenminimierung)."""
import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pseudonymisierung as pseu

ROSTER = [
    {"id": 14, "klasse": "7A", "vorname": "Mia", "nachname": "Muster"},
    {"id": 15, "klasse": "7A", "vorname": "Max", "nachname": "Beispiel"},
    # Zwei Schüler mit gleichem Vornamen → Einzelname "Alex" ist mehrdeutig.
    {"id": 16, "klasse": "7A", "vorname": "Alex", "nachname": "Kurz"},
    {"id": 17, "klasse": "7A", "vorname": "Alex", "nachname": "Lang"},
]


def test_alias_format():
    assert pseu.baue_alias("7A", 14) == "S-7A-014"
    assert pseu.baue_alias("7 a", 3) == "S-7A-003"
    assert pseu.baue_alias("", 5) == "S-X-005"


def test_erkennt_vollen_namen_und_einzelnamen_im_text():
    text = "Mia Muster schreibt. Später schreibt Mia noch einen Absatz über Muster."
    funde = pseu.erkenne_personenangaben(text, "", "", ROSTER)
    assert len(funde) == 1
    f = funde[0]
    assert f["alias"] == "S-7A-014"
    # "Mia Muster" + "Mia" + "Muster" (Vor- und Nachname in der Liste eindeutig)
    assert f["vorkommen_text"] == 3


def test_mehrdeutiger_vorname_wird_nicht_als_einzelname_ersetzt():
    text = "Alex hat gestern mit Alex Kurz gesprochen."
    funde = pseu.erkenne_personenangaben(text, "", "", ROSTER)
    ersetzt = pseu.ersetze_personenangaben(text, funde)
    # Voller Name ersetzt, nackter mehrdeutiger Vorname bleibt stehen.
    assert "Alex Kurz" not in ersetzt
    assert "S-7A-016" in ersetzt
    assert ersetzt.startswith("Alex hat")


def test_ersetzung_ist_wortgrenzen_sicher_und_case_insensitiv():
    text = "MIA MUSTER und die Miamaus. mia muster nochmal."
    funde = pseu.erkenne_personenangaben(text, "", "", ROSTER)
    ersetzt = pseu.ersetze_personenangaben(text, funde)
    assert "MIA" not in ersetzt and "mia muster" not in ersetzt
    assert "Miamaus" in ersetzt  # Teilwort bleibt unangetastet
    assert ersetzt.count("S-7A-014") == 2


def test_dateiname_und_schuelerangabe_werden_erkannt():
    funde = pseu.erkenne_personenangaben(
        "Text ohne Namen.", "MiaMuster_Schularbeit_Deutsch.docx", "Mia Muster", ROSTER
    )
    assert len(funde) == 1
    assert funde[0]["im_dateinamen"] is True
    assert funde[0]["in_schuelerangabe"] is True
    assert pseu.alias_fuer_schuelerangabe("Mia Muster", funde) == "S-7A-014"


def test_leere_klassenliste_ist_noop():
    assert pseu.erkenne_personenangaben("Mia Muster", "x.docx", "", []) == []
    assert pseu.ersetze_personenangaben("Mia Muster", []) == "Mia Muster"


def test_ruecksetzen_ist_rekursiv_und_stellt_zitate_wieder_her():
    text = "Mia Muster schreibt über den Sommer."
    funde = pseu.erkenne_personenangaben(text, "", "", ROSTER)
    ersetzt = pseu.ersetze_personenangaben(text, funde)
    daten = {
        "zusammenfassung": f"{ersetzt.split('.')[0]}.",
        "fehler": [{"zitat": "S-7A-014 schreibt", "typ": "G"}],
        "note": 2,
    }
    zurueck = pseu.ruecksetze_personenangaben(daten, funde)
    assert zurueck["fehler"][0]["zitat"] == "Mia Muster schreibt"
    assert "S-7A-014" not in zurueck["zusammenfassung"]
    assert zurueck["note"] == 2


def test_roundtrip_text_bleibt_identisch():
    text = "Am Montag gab Mia Muster ihre Arbeit ab. Max Beispiel fehlte."
    funde = pseu.erkenne_personenangaben(text, "", "", ROSTER)
    hin = pseu.ersetze_personenangaben(text, funde)
    assert "Mia" not in hin and "Beispiel" not in hin
    zurueck = pseu.ruecksetze_personenangaben(hin, funde)
    assert zurueck == text


def test_dsgvo_regression_kein_klarname_im_prompt(tmp_path):
    """End-to-End: run_llm_analysis darf den Klarnamen NICHT an den Anbieter
    senden (Prompt enthält nur den Alias) und muss die Antwort zurücksetzen."""
    import natascha_core as nc
    import natascha_db as ndb

    db_path = tmp_path / "test.db"
    ndb.init_db(db_path)
    sid = ndb.insert_schueler(db_path, "7A", "Mia", "Muster")
    alias = pseu.baue_alias("7A", sid)

    config = nc.load_config()
    config["api"]["provider"] = "openai"

    fixture = json.loads(
        (Path(__file__).parent / "fixtures" / "mia_feedback.json").read_text(encoding="utf-8")
    )
    fixture["zusammenfassung"] = f"{alias} argumentiert schlüssig."

    prompts: list[str] = []

    def fake_api(prompt, *args, **kwargs):
        prompts.append(prompt)
        return json.dumps(fixture, ensure_ascii=False)

    with patch.object(nc, "run_llm_api", side_effect=fake_api):
        data, errors = nc.run_llm_analysis(
            docx_text="Mia Muster schreibt über den Klimawandel. Mia findet das Thema wichtig.",
            rubric_content="Rubrik",
            fach="Deutsch",
            schulstufe="Oberstufe",
            textsorte="Eroerterung",
            config=config,
            schueler="Mia Muster",
            klasse="7A",
            db_path_override=db_path,
        )

    assert data is not None
    assert prompts, "kein LLM-Call erfolgt"
    for p in prompts:
        assert "Mia" not in p and "Muster" not in p, "Klarname im Prompt gefunden"
        assert alias in p
    # Antwort wurde zurückgesetzt: Lehrkraft sieht den echten Namen.
    assert data["zusammenfassung"] == "Mia Muster argumentiert schlüssig."
    # Übertragung war pseudonymisiert und wurde als Hinweis ausgewiesen.
    assert any("Personenangabe" in e for e in errors)
