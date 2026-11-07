"""Bestätigte auftragsbezogene Grundlage; ohne Anbieter- oder Datenbankzugriff."""
from __future__ import annotations
import hashlib
import json
import re

FIELDS = ("aufgabenstellung", "ausgangstext", "rubrik_inhalt", "erwartungshorizont", "umfangsvorgabe", "quellenstatus")


def basis_hash(basis: dict) -> str:
    return hashlib.sha256(json.dumps([basis.get(k, "") for k in FIELDS], ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def validate_basis(basis: dict) -> dict:
    if not isinstance(basis, dict) or basis.get("version") != 1:
        raise ValueError("Die Bewertungsgrundlage ist unvollständig.")
    if any(not isinstance(basis.get(k), str) for k in FIELDS):
        raise ValueError("Die Texte der Bewertungsgrundlage sind unvollständig.")
    scope = basis.get("pruefumfang")
    if scope not in {"sprache", "vollstaendig"}:
        raise ValueError("Bitte den Prüfumfang auswählen.")
    if not basis["rubrik_inhalt"].strip():
        raise ValueError("Bitte ein Bewertungsraster auswählen.")
    if scope == "vollstaendig":
        if not basis["aufgabenstellung"].strip():
            raise ValueError("Bitte den gewählten Arbeitsauftrag angeben.")
        if basis["quellenstatus"] not in {"bestaetigt", "nicht_noetig"} or (basis["quellenstatus"] == "bestaetigt" and not basis["ausgangstext"].strip()):
            raise ValueError("Bewertungsgrundlage offen: bitte die Beilage prüfen oder als nicht erforderlich kennzeichnen.")
        amount = basis["umfangsvorgabe"]
        if amount != "keine Vorgabe":
            match = re.fullmatch(r"([1-9][0-9]{0,3})(?:[-–]([1-9][0-9]{0,3}))?", amount)
            if not match or (match[2] and int(match[2]) < int(match[1])):
                raise ValueError("Bitte eine Wortzahl, einen Bereich oder keine Vorgabe bestätigen.")
        if basis.get("bestaetigung_hash") != basis_hash(basis):
            raise ValueError("Die Bewertungsgrundlage wurde geändert. Bitte erneut bestätigen.")
    return basis
