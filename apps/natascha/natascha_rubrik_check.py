"""Pruefung der Rubrik-Dateien in ``rubrics/``.

Eine Rubrik ist kein Formalismus, sondern ein Vertrag: Die Schluessel aus
``## JSON-Kriterien`` gehen als verbindliche Vorgabe an das LLM, und
``## Gewichtung`` entscheidet ueber die Note. Ein Tippfehler an beiden Stellen
faellt zunaechst nicht auf, sondern spaeter als falsche Note auf.

Deshalb wird jede mitgelieferte Rubrik geprueft — nicht beim Schreiben, sondern
in der Testsuite ueber *alle* Dateien, damit auch nachtraeglich geaenderte
Fachpakete und Rubriken abgesichert sind.

Zwei Stufen, weil der Bestand bewusst uneinheitlich ist:

``HARTE_BEFUNDE``
    Echte Fehler. Duerfen nie auftreten und blockieren die Testsuite. Beispiel:
    eine Gewichtung, die sich auf keinen Schluessel der Rubrik aufloesen laesst —
    der Anteil fiele dann still mit der Mittelstufe 3.0 aus der Note.

``BESTANDSBEFUNDE``
    Bekannte Schwaechen mitgelieferter Raster, die eine Entscheidung brauchen
    und den Bestand nicht blockieren. Sie stehen in ``KNOWN_BEFUNDE`` namentlich,
    damit sie nicht still verschwinden.
"""

from __future__ import annotations

from pathlib import Path

from natascha_core import (
    extract_criteria_keys,
    parse_gewichtung,
    parse_rubrik_header,
    rubric_area_keys,
)

# Die vier SRDP-Kanon-Keys. Ein eigenes Kriterium darf diese Worte nicht als
# Teilstring enthalten: ``textstruktur_ausgangstext`` enthaelt "textstruktur" und
# wuerde in aelteren Parsern auf den Kanon `textstruktur` gemappt -- ein Schluessel,
# den es in dieser Rubrik gar nicht gibt. Ergebnis war eine stille 3.0.
KANON_KEYS = ("inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit")

# Raster ohne `## JSON-Kriterien` nennen ihre Kriterien nicht verbindlich; fuer sie
# bleiben die Notfall-Gewichte der vier Kanonen in Kraft (siehe parse_gewichtung).
KANNON_GEWICHTUNG = set(KANON_KEYS)


class Befund:
    """Ein Pruefergebnis fuer eine Rubrik: harte Fehler und benannte Hinweise."""

    __slots__ = ("datei", "fehler", "hinweise")

    def __init__(self, datei: str, fehler: list[str], hinweise: list[str]) -> None:
        self.datei = datei
        self.fehler = fehler
        self.hinweise = hinweise

    @property
    def ok(self) -> bool:
        return not self.fehler

    def __repr__(self) -> str:  # pragma: no cover - nur fuer Fehlersuche
        return f"<Befund {self.datei} fehler={len(self.fehler)} hinweise={len(self.hinweise)}>"


def _ist_aufgaben_vorgabe(dateiname: str) -> bool:
    """Erwartungshorizont-Dateien sind Aufgaben-Vorgaaben, keine Bewertungsraster.

    ``cmd_erwartungshorizont_save`` schreibt sie unter dem Praefix
    `erwartungshorizont_`; sie tragen zwar einen Rubrik-Header, aber weder
    JSON-Kriterien noch Gewichtung. Der Dateiname ist hier die richtige
    Unterscheidung — der Inhalt ist es nicht, der Header beiden.
    """
    return dateiname.startswith("erwartungshorizont_")


def pruefe_rubrik(dateiname: str, text: str) -> Befund:
    """Prueft eine einzelne Rubrik. `text` ist der volle Dateiinhalt."""
    fehler: list[str] = []
    hinweise: list[str] = []
    header = parse_rubrik_header(text)

    for feld in ("titel", "fach", "schulstufe"):
        if not header.get(feld, "").strip():
            fehler.append(f"Header-Feld `{feld}:` fehlt im luka-rubrik-Kommentar")

    kriterien = extract_criteria_keys(text)
    if not kriterien:
        # Ohne verbindliche Schluessel prueft der Rest nichts. Kein Fehler:
        # aeltere Raster (eroetterung, Zusammenfassung) arbeiten so.
        hinweise.append("kein `## JSON-Kriterien` — Kriterien kommen nicht vom Raster")
        return Befund(dateiname, fehler, hinweise)

    doppelt = {k for k in kriterien if kriterien.count(k) > 1}
    if doppelt:
        fehler.append(f"JSON-Schluessel mehrfach genannt: {', '.join(sorted(doppelt))}")

    for key in kriterien:
        for kanon in KANON_KEYS:
            if kanon != key and kanon in key:
                fehler.append(
                    f"JSON-Schluessel `{key}` enthaelt den Kanon `{kanon}` — umbenennen "
                    f"(z. B. `aufbau_ausgangstext`), sonst greift die Kanon-Zuordnung"
                )

    hat_gewichtungsabschnitt = "## Gewichtung" in text
    gewichtung = parse_gewichtung(text)
    kriterien_set = set(kriterien)

    if not hat_gewichtungsabschnitt:
        if not kriterien_set & KANNON_GEWICHTUNG:
            # Genau hier ist sprachfach_latein.md: vier eigene Kriterien, kein
            # Gewichtungsabschnitt → es greift die 4er-Notfallgewichtung, die
            # keines dieser Kriterien trifft → Note ist konstant 3.
            hinweise.append(
                "kein `## Gewichtung`, und die JSON-Schluessel passen zu keinem der vier "
                "Kanonen — die Notenberechnung kann keine Leistung unterscheiden"
            )
        else:
            hinweise.append("kein `## Gewichtung` — es gilt die gleichverteilte Notfallgewichtung")
    else:
        ohne_gewichtung = kriterien_set - set(gewichtung)
        if ohne_gewichtung:
            fehler.append(
                "JSON-Schluessel ohne Gewichtung: " + ", ".join(sorted(ohne_gewichtung))
            )
        phantom = set(gewichtung) - kriterien_set
        if phantom:
            fehler.append(
                "Gewichtung verweist auf Schluessel, die es nicht gibt: "
                + ", ".join(sorted(phantom))
            )
        summe = sum(gewichtung.values())
        if abs(summe - 1.0) > 0.001:
            fehler.append(f"Gewichtung summiert auf {summe * 100:.0f} % statt 100 %")

    k1 = rubric_area_keys(header, "k1")
    k3 = rubric_area_keys(header, "k3")
    if k1 or k3:
        if not k1:
            fehler.append("`k3:` gesetzt, aber `k1:` fehlt")
        if not k3:
            fehler.append("`k1:` gesetzt, aber `k3:` fehlt")
        for key in (*k1, *k3):
            if key not in kriterien_set:
                fehler.append(
                    f"K1/K3 verweist auf `{key}`, das kein JSON-Kriterium dieser Rubrik ist"
                )
        doppelt_bereich = sorted(set(k1) & set(k3))
        if doppelt_bereich:
            fehler.append("in K1 *und* K3: " + ", ".join(doppelt_bereich))
        nirgends = sorted(kriterien_set - set(k1) - set(k3))
        if nirgends:
            fehler.append("JSON-Schluessel in keinem Kompetenzbereich: " + ", ".join(nirgends))

    return Befund(dateiname, fehler, hinweise)


def pruefe_alle(dateipfade: list[Path]) -> list[Befund]:
    """Prueft alle Rubrik-Dateien eines Ordners (README und Aufgaben-Vorgaaben ausgenommen)."""
    befunde: list[Befund] = []
    for path in sorted(dateipfade):
        if path.name.upper().startswith("README") or _ist_aufgaben_vorgabe(path.name):
            continue
        if path.suffix.lower() != ".md":
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        befunde.append(pruefe_rubrik(path.name, text))
    return befunde


def rubric_dir() -> Path:
    """Der mitgelieferte Rubrik-Ordner (relativ zu diesem Modul)."""
    return Path(__file__).resolve().parent / "rubrics"


def formatiere(befunde: list[Befund]) -> str:
    """Lesbare Zusammenfassung fuer Test-Fehlerausgaben und Diagnose."""
    zeilen: list[str] = []
    for b in befunde:
        if not b.fehler and not b.hinweise:
            continue
        zeilen.append(f"\n  {b.datei}")
        zeilen.extend(f"    FEHLER:  {f}" for f in b.fehler)
        zeilen.extend(f"    Hinweis: {h}" for h in b.hinweise)
    return "\n".join(zeilen)


__all__ = [
    "Befund",
    "KANON_KEYS",
    "pruefe_rubrik",
    "pruefe_alle",
    "rubric_dir",
    "formatiere",
]
