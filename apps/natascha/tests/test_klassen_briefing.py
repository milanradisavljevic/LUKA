"""Tests für build_klassen_briefing_prompt und klassen_briefing CRUD.

DSGVO-Regression: Der Prompt darf niemals Schülernamen enthalten,
auch wenn sie in den Rohdaten (z. B. Fehlerzitaten) vorkommen.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc


def test_briefing_prompt_enthaelt_keine_personendaten() -> None:
    """DSGVO-Regression: Keine Namen im Prompt, auch wenn sie in Zitaten stehen."""
    aggregat = {
        "k1k3": {
            "k1": {"avg": 2.81, "count": 13},
            "k3": {"avg": 2.77, "count": 13},
        },
        "notenverteilung": {1: 1, 2: 1, 3: 7, 4: 2, 5: 2},
        "kalibrierung": {
            "app_avg": 3.0,
            "lehrer_avg": 2.0,
            "diff": -1.0,
            "tendenz": "app milder",
            "n_mit_feedback": 2,
            "n_gesamt": 13,
        },
        "trend": [
            {"aufgabe": "SA1", "avg_note_app": 2.5, "avg_note_lehrer": None, "n": 3},
        ],
        "anzahl_abgaben": 13,
        "gesamt_fehler": 30,
        "heatmap": [
            {"typ": "Z", "anzahl": 12, "prozent": 40.0},
        ],
        "beispiele": [
            # Absichtlich ein Zitat mit Schülernamen — darf NICHT im Prompt landen
            {"zitat": "Anna sagt das Haus", "korrektur": "Anna sagt, das Haus", "haeufigkeit": 5},
            {"zitat": "Ben geht nach Hause", "korrektur": "Ben ging nach Hause", "haeufigkeit": 3},
        ],
        "kriterien": {
            "inhalt": {"avg": 2.92, "count": 13},
        },
        "aufgabe": "SA1",
    }
    prompt = nc.build_klassen_briefing_prompt(aggregat)
    # Namen als eigenständige Wörter prüfen (nicht als Substring von "Benenne")
    import re
    assert not re.search(r'\bAnna\b', prompt)
    assert not re.search(r'\bBen\b', prompt)
    # Zitate dürfen gar nicht erst im Prompt erscheinen (DSGVO)
    assert "sagt das Haus" not in prompt
    assert "geht nach Hause" not in prompt


def test_briefing_prompt_kalibrierung_wenige_paare_warnung() -> None:
    """Weniger als 5 Vergleichspaare: Prompt soll Hinweis auf Momentaufnahme enthalten."""
    aggregat = {
        "k1k3": {"k1": {"avg": 3.0, "count": 5}, "k3": {"avg": 2.5, "count": 5}},
        "notenverteilung": {1: 0, 2: 1, 3: 2, 4: 1, 5: 1},
        "kalibrierung": {
            "app_avg": 3.0,
            "lehrer_avg": 2.0,
            "diff": -1.0,
            "tendenz": "app milder",
            "n_mit_feedback": 2,
            "n_gesamt": 5,
        },
        "trend": [],
        "anzahl_abgaben": 5,
        "gesamt_fehler": 10,
        "heatmap": [],
        "beispiele": [],
        "kriterien": {},
        "aufgabe": "SA1",
    }
    prompt = nc.build_klassen_briefing_prompt(aggregat)
    assert "Momentaufnahme" in prompt or "ersten Hinweisen" in prompt
    assert "nur 2 Vergleichspaare" in prompt or "2 Vergleichspaare" in prompt


def test_briefing_prompt_kalibrierung_viele_paare_solide_basis() -> None:
    """5+ Vergleichspaare: Prompt soll 'solide Basis' erwähnen."""
    aggregat = {
        "k1k3": {"k1": {"avg": 3.0, "count": 10}, "k3": {"avg": 2.5, "count": 10}},
        "notenverteilung": {1: 0, 2: 2, 3: 4, 4: 3, 5: 1},
        "kalibrierung": {
            "app_avg": 3.2,
            "lehrer_avg": 2.8,
            "diff": -0.4,
            "tendenz": "app milder",
            "n_mit_feedback": 7,
            "n_gesamt": 10,
        },
        "trend": [],
        "anzahl_abgaben": 10,
        "gesamt_fehler": 20,
        "heatmap": [],
        "beispiele": [],
        "kriterien": {},
        "aufgabe": "SA1",
    }
    prompt = nc.build_klassen_briefing_prompt(aggregat)
    assert "solide Basis" in prompt


def test_briefing_prompt_k1_k3_ausgewogen_keine_spreizung() -> None:
    """K1 und K3 nahe beieinander: Prompt soll 'ausgewogen' erwähnen."""
    aggregat = {
        "k1k3": {"k1": {"avg": 2.81, "count": 10}, "k3": {"avg": 2.77, "count": 10}},
        "notenverteilung": {1: 0, 2: 0, 3: 10, 4: 0, 5: 0},
        "kalibrierung": {"n_mit_feedback": 0, "n_gesamt": 10},
        "trend": [],
        "anzahl_abgaben": 10,
        "gesamt_fehler": 0,
        "heatmap": [],
        "beispiele": [],
        "kriterien": {},
        "aufgabe": "SA1",
    }
    prompt = nc.build_klassen_briefing_prompt(aggregat)
    assert "ausgewogen" in prompt
    assert "mindestens 0.5" in prompt
