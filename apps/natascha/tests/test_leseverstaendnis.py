"""Tests fuer die Leseverstaendnis-Aufgabenart und den Rubrik-Vertrag.

Drei Interessen:

1. **Vertrag** — `natascha_rubrik_check` haelt alle mitgelieferten Raster in
   Ordnung. Eine Rubrik, deren Gewichtung sich auf keinen Schluessel aufloesen
   laesst, verliert sonst still 25 % der Note.
2. **Regressionsschutz** — der Legacy-Pfad (Raster ohne `k1:`/`k3:`) rechnet
   genauso wie vorher. Das ist der Pfad, den *jede* Oberstufen-Korrektur nimmt.
3. **Ehrlichkeit** — ein Verstaendnisraster unterscheidet Leistung ueber den
   ganzen Notenbereich und beschriftet die Kompetenzbereiche richtig.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc  # noqa: E402
import natascha_rubrik_check as rc  # noqa: E402

RUB_DIR = rc.rubric_dir()
CFG = {"paths": {"rubrics": str(RUB_DIR)}}


def _lade(datei: str) -> str:
    return (RUB_DIR / datei).read_text(encoding="utf-8")


def _bewertung(rubrik_text: str, werte: dict[str, int]) -> dict:
    """LLM-Antwort simulieren: jedes Kriterium bekommt seinen Wert."""
    return {key: {"punkte": werte.get(key, 3)} for key in nc.extract_criteria_keys(rubrik_text)}


# ---------------------------------------------------------------------------
# 1. Rubrik-Vertrag: alle mitgelieferten Raster
# ---------------------------------------------------------------------------


def test_alle_mitgelieferten_rubriken_sind_vertragskonform() -> None:
    """Kein Raster darf einen harten Vertragsbruch haben.

    Der Test listet die Fehler einzeln auf - ein Sammel-`assert not errors`
    ohne Dateinamen waere bei 29 Rastern nicht zu gebrauchen.
    """
    befunde = rc.pruefe_alle(list(RUB_DIR.glob("*.md")))
    assert befunde, "keine Rubrik gefunden - der Test prueft nichts"

    fehlerhafte = [b for b in befunde if b.fehler]
    assert not fehlerhafte, (
        "Rubrik(en) mit Vertragsbruch:\n" + rc.formatiere(fehlerhafte)
    )


def test_leseverstaendnis_ist_ueberhaupt_mitgeliefert() -> None:
    """Die Aufgabenart muss ohne Nacharbeit im Produkt liegen."""
    for datei in ("leseverstaendnis.md", "leseverstaendnis_unterstufe.md"):
        assert (RUB_DIR / datei).is_file(), f"{datei} fehlt"


def test_bekannte_bestandsbefunde_sind_benannt() -> None:
    """Raster ohne auflösbare Gewichtung sind dokumentiert, nicht vergessen.

    `sprachfach_latein.md` und die Englisch-Raster nennen Kriterien, die zu
    keinem der vier Kanonen passen, und haben keinen Gewichtungsabschnitt. Die
    Notenberechnung kann dort keine Leistung unterscheiden. Das ist eine offene
    Produktentscheidung, kein Testfehler - deshalb als Liste festgehalten: faellt
    eine Rubrik weg oder kommt eine neue hinzu, aendert sich die Liste bewusst.
    """
    befunde = {b.datei: b for b in rc.pruefe_alle(list(RUB_DIR.glob("*.md")))}
    erwartet_ununterscheidbar = {
        "englisch_a2.md",
        "srdp_englisch_b1.md",
        "srdp_englisch_b2.md",
        "sprachfach_latein.md",
    }
    tatsaechlich = {
        datei
        for datei, b in befunde.items()
        if any("keine Leistung unterscheiden" in h for h in b.hinweise)
    }
    assert tatsaechlich == erwartet_ununterscheidbar


# ---------------------------------------------------------------------------
# 2. K1/K3-Deklaration im Header
# ---------------------------------------------------------------------------


def test_header_liest_k1_und_k3() -> None:
    header = nc.parse_rubrik_header(_lade("leseverstaendnis.md"))
    assert header["fach"] == "deutsch"
    assert header["schulstufe"] == "oberstufe"
    assert nc.rubric_area_keys(header, "k1") == (
        "sachverstaendnis",
        "detailverstaendnis",
        "schlussfolgern",
        "aufbau_ausgangstext",
        "bedeutungsschicht",
    )
    assert nc.rubric_area_keys(header, "k3") == ("ausdruck", "sprachrichtigkeit")


def test_legacy_raster_bleiben_ohne_deklaration() -> None:
    """Der Normalfall: kein `k1:`/`k3:` - der Kanon-Pfad gilt unveraendert."""
    for datei in ("textinterpretation.md", "kommentar.md", "deutsch_unterstufe.md"):
        header = nc.parse_rubrik_header(_lade(datei))
        assert nc.rubric_area_keys(header, "k1") == (), datei
        assert nc.rubric_area_keys(header, "k3") == (), datei


def test_rubrik_header_for_liest_ohne_den_inhalt_zu_belasten() -> None:
    """`load_rubric` schneidet den Header ab - die K1/K3-Zuordnung braucht ihn trotzdem."""
    assert "luka-rubrik" not in nc.load_rubric("leseverstaendnis.md", CFG)
    header = nc.rubric_header_for("leseverstaendnis.md", CFG)
    assert nc.rubric_area_keys(header, "k1"), "Header nicht lesbar"


def test_rubrik_header_for_ist_robust_gegen_fehlende_datei() -> None:
    """Darf mitten im Korrekturlauf nie werfen."""
    for name in ("", "gibtsnicht.md"):
        header = nc.rubric_header_for(name, CFG)
        assert header["titel"] == ""
        assert nc.rubric_area_keys(header, "k1") == ()


# ---------------------------------------------------------------------------
# 3. Notenberechnung mit deklariertem K1/K3
# ---------------------------------------------------------------------------


K1 = ("sachverstaendnis", "detailverstaendnis", "schlussfolgern",
      "aufbau_ausgangstext", "bedeutungsschicht")
K3 = ("ausdruck", "sprachrichtigkeit")


def _lese_noten(werte: dict[str, int]) -> dict:
    rub = nc.load_rubric("leseverstaendnis.md", CFG)
    header = nc.rubric_header_for("leseverstaendnis.md", CFG)
    return nc.berechne_note_srdp(
        _bewertung(rub, werte),
        k1_keys=nc.rubric_area_keys(header, "k1"),
        k3_keys=nc.rubric_area_keys(header, "k3"),
    )


def test_leseverstaendnis_unterscheidet_ueber_den_ganzen_notenbereich() -> None:
    """Der Kern. Ohne K1/K3-Deklaration ergaebe diese Rubrik konstant Note 3."""
    assert _lese_noten({k: 5 for k in (*K1, *K3)})["note"] == 1
    assert _lese_noten({k: 1 for k in (*K1, *K3)})["note"] == 5


def test_forma_allein_steigert_die_note_nicht_ueber_das_anspruchsniveau() -> None:
    """Bei sauberer Sprache, aber ohne Textverstaendnis, bleibt es 'Nicht genuegend'.

    Genau der Punkt des Rasters: wer den Text nicht verstanden hat, erfuellt die
    Aufgabe nicht, egal wie fehlerfrei er formuliert. Die K1-Sonderregel der SRDP
    greift hier also absichtlich.
    """
    note = _lese_noten({**{k: 1 for k in K1}, **{k: 5 for k in K3}})
    assert note["sonderregel"] == "K1_NICHT_ERFUELLT", note["begruendung"]
    assert note["note"] == 5


def test_verstaendnis_ist_der_gewichtige_teil() -> None:
    """Starke Form bei mittlerem Verstaendnis soll mittelmassig benoten werden.

    Gegenprobe zur Gewichtung: bei 50/50 wuerde dieselbe Arbeit Note 3 ergeben.
    """
    note = _lese_noten({k: 3 for k in K1} | {k: 5 for k in K3})
    assert note["k1_note"] == 3
    assert note["k3_note"] == 1
    assert note["note"] == 2, note["begruendung"]


def test_ohne_deklaration_wuerde_dasselbe_raster_konstante_note_drehen() -> None:
    """Begruendung fuer die Deklaration - als auffaelliger Test dokumentiert."""
    rub = nc.load_rubric("leseverstaendnis.md", CFG)
    assert nc.berechne_note_srdp(_bewertung(rub, {k: 5 for k in K1}))["note"] == 3
    assert nc.berechne_note_srdp(_bewertung(rub, {k: 1 for k in K1}))["note"] == 3


# ---------------------------------------------------------------------------
# 4. Regressionsschutz: der Legacy-Pfad rechnet unveraendert
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "datei",
    [
        "textinterpretation.md",
        "kommentar.md",
        "srdp_deutsch_oberstufe.md",
        "textanalyse.md",
        "leseverstaendnis_unterstufe.md",
    ],
)
def test_legacy_oberstufenpfad_ignoriert_k1_k3(datei: str) -> None:
    """Raster ohne Deklaration: Noten kommen aus dem Kanon, nicht aus k1/k3.

    `leseverstaendnis_unterstufe.md` steht bewusst mit drin: die Unterstufen-
    Variante rechnet ueber `parse_gewichtung`, nicht ueber K1/K3.
    """
    rub = nc.load_rubric(datei, CFG)
    header = nc.rubric_header_for(datei, CFG)
    assert nc.rubric_area_keys(header, "k1") == ()
    bew = _bewertung(rub, {})
    ohne = nc.berechne_note_srdp(bew)
    mit_leeren_keys = nc.berechne_note_srdp(bew, k1_keys=(), k3_keys=())
    assert ohne == mit_leeren_keys


def test_textinterpretation_bleibt_im_konfigurierten_pfad() -> None:
    """Feste Erwartungswerte fuer das Standardraster der Oberstufe.

    Wer `parse_gewichtung` oder `berechne_note_srdp` anfasst, sieht sofort, ob
    eine der beiden Hubel kippt.
    """
    rub = nc.load_rubric("textinterpretation.md", CFG)
    assert nc.parse_gewichtung(rub) == {
        "inhalt": 0.25,
        "textstruktur": 0.25,
        "ausdruck": 0.25,
        "sprachrichtigkeit": 0.25,
    }
    assert nc.berechne_note_srdp(
        {k: {"punkte": 5} for k in nc.extract_criteria_keys(rub)}
    )["note"] == 1
    assert nc.berechne_note_srdp(
        {k: {"punkte": 1} for k in nc.extract_criteria_keys(rub)}
    )["note"] == 5


def test_kommentar_gewichtet_aufbau_jetzt_wirklich() -> None:
    """Regression gegen den Phantom-Key 'aufbau und struktur'.

    Die Gewichtungszeile heisst "Aufbau und Struktur", der JSON-Schluessel
    `aufbau`. Vorher loeste der Kanon-Teilstring "textstruktur" das auf - einen
    Schluessel, den es in dieser Rubrik nicht gibt. Ergebnis: 25 % der Note
    blieben konstant 3.0, egal was das LLM zu `aufbau` meldete.
    """
    rub = nc.load_rubric("kommentar.md", CFG)
    gewichtung = nc.parse_gewichtung(rub)
    assert "aufbau" in gewichtung
    assert "aufbau und struktur" not in gewichtung
    assert abs(sum(gewichtung.values()) - 1.0) < 1e-9

    for wert, erwartet in ((5, 2), (1, 4)):
        note = nc.berechne_note_unterstufe(_bewertung(rub, {"aufbau": wert}), gewichtung)
        assert note["note"] == erwartet, note["begruendung"]


# ---------------------------------------------------------------------------
# 5. Gewichtungsaufloesung
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("beschriftung", "erwartet"),
    [
        ("Sachverstaendnis", "sachverstaendnis"),      # exakt
        ("Sachverständnis", "sachverstaendnis"),       # Umlaute
        ("Aufbau Ausgangstext", "aufbau_ausgangstext"),  # Leerzeichen
        ("`bedeutungsschicht`", "bedeutungsschicht"),  # Backticks
        ("Stil und Ausdruck", "ausdruck"),             # Kanon-Teilstring
    ],
)
def test_gewichtungsbeschriftung_zeigt_auf_den_echten_schluessel(
    beschriftung: str, erwartet: str
) -> None:
    rubrik = (
        "## JSON-Kriterien\n"
        "- `sachverstaendnis`\n- `aufbau_ausgangstext`\n- `bedeutungsschicht`\n"
        "- `ausdruck`\n\n## Gewichtung\n"
        f"- {beschriftung}: 100 %\n"
    )
    assert nc.parse_gewichtung(rubrik) == {erwartet: 1.0}


def test_kanon_teilstring_gewinnt_nur_wenn_es_echter_schluessel_ist() -> None:
    """'Textstruktur' in der Beschriftung, aber `textstruktur` ist kein Schluessel.

    Sonst entstuende wieder ein Phantom-Key, und sein Anteil fiele mit 3.0 aus
    der Note. Stattdessen muss der echte Schluessel `aufbau` aufgeloest werden.
    """
    rubrik = (
        "## JSON-Kriterien\n- `aufbau`\n- `inhalt`\n\n"
        "## Gewichtung\n- Textstruktur und Aufbau: 60 %\n- Inhalt: 40 %\n"
    )
    assert nc.parse_gewichtung(rubrik) == {"aufbau": 0.6, "inhalt": 0.4}


def test_raster_ohne_json_kriterien_behaelt_den_kanonpfad() -> None:
    """Aeltere, frei benannte Raster duerfen nicht anders rechnen.

    Geprueft wird, dass die Aufloesung *unveraendert* beim Kanon-Teilstring
    endet. "Aufbau" und "Sprache" enthalten keinen Kanon und bleiben deshalb als
    eigene Schluessel stehen - das war vor dem Umbau genauso so, und ist hier
    nur deshalb festgehalten, damit eine Aenderung daran auffaellt.
    """
    rubrik = (
        "## Gewichtung\n"
        "- Inhalt und Argumentation: 40 %\n"
        "- Stil und Ausdruck: 20 %\n"
        "- Aufbau: 30 %\n"
        "- Sprache: 10 %\n"
    )
    assert nc.parse_gewichtung(rubrik) == {
        "inhalt": 0.4,          # "Inhalt" ist im Label -> Kanon
        "ausdruck": 0.2,        # "Ausdruck" steckt in "Stil und Ausdruck"
        "aufbau": 0.3,          # kein Kanon -> bleibt eigener Schluessel
        "sprache": 0.1,         # kein Kanon -> bleibt eigener Schluessel
    }


def test_unaufloesbare_beschriftung_wird_nicht_stillschweigend_verworfen(caplog) -> None:
    """Der Anteil muss in der Summe bleiben - mit Warnung, nicht mit Phantomschluessel.

    Verworfen wuerde die Summe verschieben (die Note waere zu gut oder zu
    schlecht); stillschweigend als 3.0 gewertet waere sie falsch und unsichtbar.
    Deshalb: Schluessel beibehalten, laut warnen - und der Validator meldet es
    im Rubrik-Test.
    """
    import logging

    rubrik = (
        "## JSON-Kriterien\n- `inhalt`\n\n## Gewichtung\n"
        "- Inhalt: 50 %\n- Konzept der Autoritaet: 50 %\n"
    )
    with caplog.at_level(logging.WARNING):
        gewichtung = nc.parse_gewichtung(rubrik)

    assert sum(gewichtung.values()) == 1.0, "der Anteil darf nicht aus der Summe fallen"
    assert "inhalt" in gewichtung
    assert any("autoritaet" in r.getMessage().lower() for r in caplog.records), [
        r.getMessage() for r in caplog.records
    ]


def test_phantom_schluessel_wird_vom_validator_gemeldet() -> None:
    """Der Validator ist die zweite Sicherung gegen genau diesen Fall."""
    befund = rc.pruefe_rubrik(
        "beispiel.md",
        "<!-- luka-rubrik\ntitel: T\nfach: deutsch\nschulstufe: oberstufe\n-->\n\n"
        "## JSON-Kriterien\n- `inhalt`\n\n## Gewichtung\n"
        "- Inhalt: 50 %\n- Konzept der Autoritaet: 50 %\n",
    )
    assert any("Autoritaet" in f or "autoritaet" in f.lower() for f in befund.fehler), befund.fehler


# ---------------------------------------------------------------------------
# 6. SRDP-Zweitcall
# ---------------------------------------------------------------------------


def test_zweitcall_entfaellt_bei_eigenem_ka1_k3_mapping() -> None:
    basis = dict(
        bewertungsmodus="benotet",
        hat_text=True,
        vision_modus=False,
        land="at",
        fach="Deutsch",
    )
    assert nc.srdp_detail_noetig(rubrik_mapped=False, **basis) is True
    assert nc.srdp_detail_noetig(rubrik_mapped=True, **basis) is False


@pytest.mark.parametrize(
    "aenderung",
    [
        {"bewertungsmodus": "unbenotet"},
        {"hat_text": False},
        {"vision_modus": True},
        {"land": "de"},
        {"fach": "Englisch"},
    ],
)
def test_zweitcall_voraussetzungen_unveraendert(aenderung: dict) -> None:
    basis = dict(
        bewertungsmodus="benotet",
        hat_text=True,
        vision_modus=False,
        land="at",
        fach="Deutsch",
        rubrik_mapped=False,
    )
    assert nc.srdp_detail_noetig(**{**basis, **aenderung}) is False


# ---------------------------------------------------------------------------
# 7. Beschriftung der Kompetenzbereiche im Feedback
# ---------------------------------------------------------------------------


def test_kompetenzbereich_bekommt_seine_eigene_beschriftung() -> None:
    rub = nc.load_rubric("leseverstaendnis.md", CFG)
    labels = nc.extract_criteria_labels(rub)
    assert labels["sachverstaendnis"] == "Sachverständnis"
    assert labels["aufbau_ausgangstext"] == "Aufbau des Ausgangstextes"

    k1 = nc.rubric_area_keys(nc.rubric_header_for("leseverstaendnis.md", CFG), "k1")
    titel = nc.rubric_area_titel(k1, labels)
    assert "Sachverständnis" in titel
    assert "u. a." in titel, "5 Kriterien muessen gekuerzt werden"
    assert nc.rubric_area_titel(("ausdruck",), labels) == "Ausdruck"


def test_ohne_dokumentierte_beschriftung_bleibt_der_schluessel() -> None:
    """Kein Raster, keine erfundenen Namen: der Klartext-Key ist ehrlicher."""
    assert nc.rubric_area_titel(("bedeutungsschicht",), {}) == "bedeutungsschicht"
    assert nc.rubric_area_titel((), {}) == ""
