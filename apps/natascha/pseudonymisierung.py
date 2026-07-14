"""Pseudonymisierung von Schüler-Personenangaben vor dem LLM-Versand.

Ersetzt bekannte Namen aus der Klassenliste (schueler-Tabelle) durch stabile
Aliasse (S-<KLASSE>-<ID>), bevor Schülertexte an einen externen Anbieter
übertragen werden, und setzt die Aliasse in der LLM-Antwort wieder zurück.

Wichtig für die Einordnung (DSGVO): Pseudonymisierte Daten bleiben
personenbezogene Daten. Dieses Modul ist Datenminimierung bei der Übertragung,
kein Anonymisierungs-Versprechen — die Zuordnungstabelle (Klassenliste) bleibt
lokal.

Grenzen bewusst dokumentiert:
- Erkannt werden nur Namen, die in der Klassenliste stehen. Freie Namen im
  Text (z. B. erwähnte Freunde) werden nicht erkannt.
- Ein einzelner Vor- oder Nachname wird nur ersetzt, wenn er innerhalb der
  Klassenliste eindeutig ist (zwei "Alex" → keine sichere Zuordnung, keine
  Ersetzung; der volle Name wird weiterhin ersetzt).
- Vision-Dateien (PDF/Bild) können nicht textuell ersetzt werden — der
  Aufrufer muss das sichtbar machen statt still zu übertragen.
"""
from __future__ import annotations

import re
from typing import Any

__all__ = [
    "baue_alias",
    "erkenne_personenangaben",
    "ersetze_personenangaben",
    "ruecksetze_personenangaben",
    "alias_fuer_schuelerangabe",
]


def baue_alias(klasse: str, schueler_id: int) -> str:
    """Stabiler Alias pro Schüler:in, z. B. baue_alias("7A", 14) → "S-7A-014"."""
    kl = re.sub(r"[^0-9A-Za-zÄÖÜäöüß]", "", klasse or "").upper() or "X"
    return f"S-{kl}-{int(schueler_id):03d}"


def _wort_regex(variante: str) -> re.Pattern[str]:
    return re.compile(rf"(?<!\w){re.escape(variante)}(?!\w)", re.IGNORECASE)


def _kompakt(s: str) -> str:
    """Kleinbuchstaben ohne Trennzeichen — für Dateinamen wie 'SophieMuster_SA.docx'."""
    return re.sub(r"[^0-9a-zäöüß]", "", (s or "").lower())


def erkenne_personenangaben(
    text: str,
    dateiname: str,
    schueler_angabe: str,
    roster: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Findet Namen aus der Klassenliste in Text, Dateiname und Schüler-Angabe.

    roster: Zeilen der schueler-Tabelle (id, klasse, vorname, nachname).
    Rückgabe: ein Fund pro Schüler:in mit mindestens einem Vorkommen:
      {schueler_id, alias, anzeige, varianten, vorkommen_text,
       im_dateinamen, in_schuelerangabe}
    varianten enthält nur die Schreibweisen, die im TEXT sicher ersetzbar sind
    (voller Name immer; Einzelname nur bei Eindeutigkeit in der Klassenliste).
    """
    if not roster:
        return []

    vornamen: dict[str, int] = {}
    nachnamen: dict[str, int] = {}
    for s in roster:
        v = (s.get("vorname") or "").strip().lower()
        n = (s.get("nachname") or "").strip().lower()
        if v:
            vornamen[v] = vornamen.get(v, 0) + 1
        if n:
            nachnamen[n] = nachnamen.get(n, 0) + 1

    datei_kompakt = _kompakt(dateiname)
    angabe_kompakt = _kompakt(schueler_angabe)
    funde: list[dict[str, Any]] = []

    for s in roster:
        sid = s.get("id")
        if sid is None:
            continue
        v = (s.get("vorname") or "").strip()
        n = (s.get("nachname") or "").strip()
        if not v and not n:
            continue

        varianten: list[str] = []
        if v and n:
            varianten += [f"{v} {n}", f"{n} {v}"]
        if v and vornamen.get(v.lower(), 0) == 1:
            varianten.append(v)
        if n and nachnamen.get(n.lower(), 0) == 1:
            varianten.append(n)
        # Längste zuerst, damit "Mia Muster" vor "Mia" ersetzt wird.
        varianten.sort(key=len, reverse=True)

        # Sequenziell zählen (längste Variante zuerst wegersetzen), sonst würde
        # "Mia" innerhalb von "Mia Muster" doppelt gezählt.
        vorkommen_text = 0
        if text:
            rest = text
            for va in varianten:
                rx = _wort_regex(va)
                vorkommen_text += len(rx.findall(rest))
                rest = rx.sub("", rest)

        namensteile = [t for t in (v, n) if t]
        kompakt_namen = [_kompakt("".join(namensteile))] + [_kompakt(t) for t in namensteile]
        kompakt_namen = [k for k in kompakt_namen if len(k) >= 3]
        im_dateinamen = any(k in datei_kompakt for k in kompakt_namen) if datei_kompakt else False
        in_schuelerangabe = any(k in angabe_kompakt for k in kompakt_namen) if angabe_kompakt else False

        if vorkommen_text > 0 or im_dateinamen or in_schuelerangabe:
            funde.append(
                {
                    "schueler_id": int(sid),
                    "alias": baue_alias(str(s.get("klasse") or ""), int(sid)),
                    "anzeige": " ".join(namensteile),
                    "varianten": varianten,
                    "vorkommen_text": vorkommen_text,
                    "im_dateinamen": im_dateinamen,
                    "in_schuelerangabe": in_schuelerangabe,
                }
            )

    return funde


def ersetze_personenangaben(text: str, funde: list[dict[str, Any]]) -> str:
    """Ersetzt alle Fund-Varianten im Text durch die Aliasse (längste zuerst)."""
    if not text or not funde:
        return text
    paare: list[tuple[str, str]] = []
    for f in funde:
        for va in f.get("varianten", []):
            paare.append((va, f["alias"]))
    paare.sort(key=lambda p: len(p[0]), reverse=True)
    for variante, alias in paare:
        text = _wort_regex(variante).sub(alias, text)
    return text


def alias_fuer_schuelerangabe(schueler_angabe: str, funde: list[dict[str, Any]]) -> str:
    """Alias für die --schueler-Angabe im Prompt; leer, wenn kein sicherer Treffer."""
    if not schueler_angabe:
        return ""
    for f in funde:
        if f.get("in_schuelerangabe"):
            return str(f["alias"])
    return ""


def ruecksetze_personenangaben(obj: Any, funde: list[dict[str, Any]]) -> Any:
    """Ersetzt Aliasse in allen Strings einer JSON-Struktur zurück durch den Namen.

    Nötig für Korrektheit, nicht nur Lesbarkeit: Fehler-Zitate der LLM-Antwort
    stammen aus dem pseudonymisierten Text; der lokal gespeicherte rohtext ist
    aber das Original. Ohne Rücksetzung passen Zitate mit Namen nicht mehr zum
    gespeicherten Text (Annotation in der Korrektur-Ansicht bricht).
    """
    if not funde:
        return obj
    if isinstance(obj, str):
        for f in funde:
            if f["alias"] in obj:
                obj = obj.replace(f["alias"], f["anzeige"])
        return obj
    if isinstance(obj, list):
        return [ruecksetze_personenangaben(x, funde) for x in obj]
    if isinstance(obj, dict):
        return {k: ruecksetze_personenangaben(vv, funde) for k, vv in obj.items()}
    return obj
