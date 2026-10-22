"""Versionierte Rasterprofile; Punkte und Noten werden lokal getrennt behandelt."""

from __future__ import annotations

import copy
import math
import re
from decimal import Decimal
from typing import Any

KRITERIEN = (
    "task_achievement", "coherence_cohesion",
    "lexical_structural_range", "lexical_structural_accuracy",
)
PROFIL_VERSION = "2023.1"
LEGACY_RASTER_HASHES = {'srdp_englisch_b1.md': 'bbfcbebbacf96d87cbe7aab5841a756fbabfaa864654f3302ad2956f39033f0a', 'srdp_englisch_b2.md': '57c7b39625c64d3e04c3fc3cae71d924ec106bdc756a6ecb6c7d786112d5c027'}
PROFIL_IDS = ("at-srdp-en-b1", "at-srdp-en-b2")


def profil_fuer_raster(raster: str, fach: str, land: str = "at") -> str | None:
    """Nur explizite Rastermetadaten, niemals Dateiname oder Modellantwort."""
    marker = re.search(r"(?mi)^Bewertungsprofil-ID:\s*(at-srdp-en-b[12])\s*$", raster)
    header = re.search(r"(?mi)^bewertungsprofil:\s*(\S+)\s*$", raster)
    if header and (header.group(1) not in PROFIL_IDS or not marker or header.group(1) != marker.group(1)):
        raise ValueError("Rasterkopf und Bewertungsprofil-ID müssen dieselbe unterstützte Profilfassung bezeichnen.")
    if marker and fach.strip().casefold() in ("englisch", "english") and land == "at":
        return marker.group(1)
    return None


def schema_fuer_profil(schema: dict, profil: str | None) -> dict:
    if profil is None:
        return schema
    result = copy.deepcopy(schema)
    result["$defs"]["kriterium"]["properties"]["punkte"].update(minimum=0, maximum=10)
    props = result["properties"]
    props.pop("notenempfehlung", None)
    result["required"] = [k for k in result.get("required", []) if k != "notenempfehlung"]
    props["srdp_veto"] = {
        "type": "object", "required": ["aufgabe_verfehlt", "begruendung"],
        "properties": {"aufgabe_verfehlt": {"type": "boolean"},
                       "begruendung": {"type": "string", "minLength": 1}},
        "additionalProperties": False,
    }
    result["required"].append("srdp_veto")
    props["bewertung"] = {
        "type": "object", "properties": {k: {"$ref": "#/$defs/kriterium"} for k in KRITERIEN},
        "additionalProperties": False,
    }
    result["allOf"] = [
        {"not": {"required": ["notenempfehlung"]}},
        {"if": {"properties": {"srdp_veto": {"properties": {
            "aufgabe_verfehlt": {"const": True}}}}},
         "then": {"properties": {"bewertung": {
             "required": ["task_achievement"], "maxProperties": 1,
             "properties": {"task_achievement": {"properties": {"punkte": {"const": 0}}}},
         }}},
         "else": {"properties": {"bewertung": {"required": list(KRITERIEN)}}}},
    ]
    return result


def skalen_anweisung(profil: str | None) -> str:
    if profil is None:
        return (
            "PUNKTE-SKALA: Vergib für jedes Kriterium GENAU eine ganzzahlige Punktzahl von 1 bis 5 "
            "(1 = nicht erfüllt, 2 = schwach/unzureichend, 3 = ausreichend/befriedigend, "
            "4 = gut, 5 = sehr gut). Orientiere dich strikt an den Stufenbeschreibungen im Raster. "
            "Verwende KEINE Dezimalzahlen, keine Werte außerhalb 1–5.\n"
        )
    return (
        "PUNKTE-SKALA: Jedes der vier unabhängigen Kriterien erhält ganzzahlige Punkte von 0 bis 10. "
        "Verwende die Kriterien des Rasters; 'stufe' ist dieselbe Zahl wie 'punkte'. "
        "Vergib keine Schulnote und kein Feld 'notenempfehlung'. "
        "Prüfe Aufgabenverfehlung gesondert in 'srdp_veto' mit konkreter Begründung. "
        "Eine falsche Textsorte allein ist noch keine Aufgabenverfehlung. Bei Aufgabenverfehlung "
        "bewerte nur 'task_achievement' mit 0; die anderen drei Kriterien entfallen. "
        "Bewerte Task Achievement zunächst OHNE numerischen Wortzahlabzug. "
        "Den Abzug für die Wortanzahl berechnet die App genau einmal aus dem bestätigten Auftrag.\n"
    )


def pruefe_notenschluessel(schluessel: dict | None) -> list[dict] | None:
    """Explizit bestätigte, streng fallende Mindestprozente; keine Defaultnote."""
    if schluessel is None:
        return None
    if not isinstance(schluessel, dict) or schluessel.get("bestaetigt") is not True:
        raise ValueError("Der Notenschlüssel muss ausdrücklich bestätigt sein.")
    grenzen = schluessel.get("grenzen")
    if not isinstance(grenzen, list) or len(grenzen) != 5:
        raise ValueError("Der Notenschlüssel braucht fünf Notengrenzen.")
    previous = Decimal(101)
    for note, item in enumerate(grenzen, 1):
        if not isinstance(item, dict) or type(item.get("note")) is not int or item.get("note") != note:
            raise ValueError("Die Notengrenzen müssen in der Reihenfolge 1 bis 5 stehen.")
        wert = item.get("abProzent")
        if isinstance(wert, bool) or not isinstance(wert, (int, float)) or not math.isfinite(wert):
            raise ValueError("Die Notengrenzen müssen endliche Prozentwerte sein.")
        value = Decimal(str(wert))
        if not Decimal(0) <= value <= Decimal(100) or value >= previous:
            raise ValueError("Die Mindestprozente müssen von Note 1 bis 5 streng fallen.")
        previous = value
    if previous != 0:
        raise ValueError("Die Grenze für Note 5 muss bei 0 Prozent liegen.")
    return copy.deepcopy(grenzen)


def werte_profil_aus(
    data: dict, profil: str, text: str, soll_wortanzahl: int | None = None,
    notenschluessel: dict | None = None, *, transkript_geprueft: bool = True,
    benotet: bool = True,
) -> dict[str, Any]:
    """Unveränderte Rasterwerte plus nachvollziehbare lokale Auswertung."""
    grenzen = pruefe_notenschluessel(notenschluessel)
    werte = {key: value["punkte"] for key, value in data["bewertung"].items()}
    veto = data["srdp_veto"]["aufgabe_verfehlt"]
    if set(werte) != ({"task_achievement"} if veto else set(KRITERIEN)):
        raise ValueError("Das Raster ist nicht vollständig.")
    if any(isinstance(v, bool) or not isinstance(v, (int, float))
           or not math.isfinite(v) or not 0 <= v <= 10 or int(v) != v for v in werte.values()):
        raise ValueError("Rasterpunkte müssen ganzzahlig zwischen 0 und 10 liegen.")
    werte = {key: int(value) for key, value in werte.items()}
    if veto and werte["task_achievement"] != 0:
        raise ValueError("Ein Veto verlangt Task Achievement mit 0 Punkten.")
    if any(isinstance(data["bewertung"][k].get("stufe"), bool)
           or str(data["bewertung"][k].get("stufe")) not in (str(v), f"{v}.0")
           for k, v in werte.items()):
        raise ValueError("Stufe und Punkte des Rasters widersprechen sich.")
    for value in data["bewertung"].values():
        value["gewicht"] = 25
    ist = len(text.split())
    abzug = int(bool(soll_wortanzahl) and abs(ist - soll_wortanzahl) * 10 > soll_wortanzahl)
    gewertet = dict(werte)
    if not veto:
        gewertet["task_achievement"] = max(0, gewertet["task_achievement"] - abzug)
    punkte = 0 if veto else sum(gewertet.values())
    pruefbedarf = []
    if veto:
        pruefbedarf.append("Aufgabenverfehlung durch die Lehrkraft prüfen; keine automatische Note.")
    if not transkript_geprueft:
        pruefbedarf.append("Abschrift vor einer Bewertung durch die Lehrkraft prüfen.")
    if soll_wortanzahl is None:
        pruefbedarf.append("Vorgegebene Wortanzahl fehlt; Wortzahlregel wurde nicht angewendet.")
    result = {
        "bewertungsprofil": profil, "profil_version": PROFIL_VERSION,
        "rasterwerte": werte, "gewertete_rasterwerte": gewertet,
        "punkte": punkte, "max_punkte": 40, "durchschnitt": punkte / 4,
        "wortzahl_ist": ist, "wortzahl_soll": soll_wortanzahl,
        "wortzahl_abzug": abzug if not veto else 0,
        "veto_vorschlag": veto, "pruefung_erforderlich": pruefbedarf,
        "notenschluessel": copy.deepcopy(notenschluessel),
    }
    data.pop("notenempfehlung", None)
    data["bewertungsprofil"] = {"id": profil, "version": PROFIL_VERSION,
                                "skala_min": 0, "skala_max": 10, "pruefstatus": "vorschlag"}
    if benotet and grenzen and not pruefbedarf:
        prozent = Decimal(punkte) * 100 / 40
        note = next(g["note"] for g in grenzen if prozent >= Decimal(str(g["abProzent"])))
        labels = ("Sehr gut", "Gut", "Befriedigend", "Genügend", "Nicht genügend")
        data["notenempfehlung"] = {
            "note": note, "bezeichnung": labels[note - 1], "durchschnitt": punkte / 4,
            "begruendung": f"{punkte}/40 Rasterpunkte; bestätigter individueller Notenschlüssel.",
        }
    data["notendetail"] = result
    return result
