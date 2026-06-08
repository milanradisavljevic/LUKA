"""Tests fuer die Notenberechnung (natascha_core).

Schreibt insbesondere das Rundungsverhalten am Randfall Stufe 3.5 fest
(Python `round()` nutzt round-half-to-even: round(2.5) == 2), damit eine
spaetere Aenderung dieser Heuristik bewusst geschieht (vgl. KNOWN_ISSUES).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc


def _krit(punkte: float) -> dict:
    return {"punkte": punkte}


# ── Unterstufe (gewichteter Durchschnitt) ──────────────────────────────────


def test_unterstufe_klare_faelle() -> None:
    best = {k: _krit(5) for k in ("inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit")}
    assert nc.berechne_note_unterstufe(best)["note"] == 1  # Stufe 5 → Note 1

    schwach = {k: _krit(1) for k in ("inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit")}
    assert nc.berechne_note_unterstufe(schwach)["note"] == 5  # Stufe 1 → Note 5


def test_unterstufe_randfall_stufe_3_5() -> None:
    """Alle Kriterien Stufe 3.5 → Durchschnitt 3.5 → round(6-3.5)=round(2.5)=2."""
    best = {k: _krit(3.5) for k in ("inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit")}
    res = nc.berechne_note_unterstufe(best)
    assert res["durchschnitt"] == 3.5
    assert res["note"] == 2  # banker's rounding (round-half-to-even)


# ── Oberstufe SRDP ─────────────────────────────────────────────────────────


def test_srdp_normalfall() -> None:
    best = {
        "inhalt": _krit(4),
        "textstruktur": _krit(4),
        "ausdruck": _krit(4),
        "sprachrichtigkeit": _krit(4),
    }
    res = nc.berechne_note_srdp(best)
    assert res["note"] == 2  # Stufe 4 → Note round(6-4)=2
    assert res.get("sonderregel") is None


def test_srdp_randfall_k1_stufe_3_5() -> None:
    """K1-Stufe 3.5 (Inhalt 4, Textstruktur 3) → K1-Note round(2.5)=2."""
    best = {
        "inhalt": _krit(4),
        "textstruktur": _krit(3),
        "ausdruck": _krit(4),
        "sprachrichtigkeit": _krit(4),
    }
    res = nc.berechne_note_srdp(best)
    assert res["k1_schnitt"] == 3.5
    assert res["k1_note"] == 2  # round(6-3.5)=round(2.5)=2


def test_srdp_sonderregel_k1_nicht_erfuellt() -> None:
    """K1-Stufe <= 1.5 erzwingt Note 5 (Nicht genügend) unabhaengig von K3."""
    best = {
        "inhalt": _krit(1),
        "textstruktur": _krit(1),
        "ausdruck": _krit(5),
        "sprachrichtigkeit": _krit(5),
    }
    res = nc.berechne_note_srdp(best)
    assert res["note"] == 5
    assert res["sonderregel"] == "K1_NICHT_ERFUELLT"


def test_srdp_sonderregel_k3_nicht_erfuellt() -> None:
    best = {
        "inhalt": _krit(5),
        "textstruktur": _krit(5),
        "ausdruck": _krit(1),
        "sprachrichtigkeit": _krit(1),
    }
    res = nc.berechne_note_srdp(best)
    assert res["note"] == 5
    assert res["sonderregel"] == "K3_NICHT_ERFUELLT"
