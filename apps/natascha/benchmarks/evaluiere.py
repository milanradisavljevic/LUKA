#!/usr/bin/env python3
"""LUKA Benchmark-Evaluation: Interaktive Lehrkraft-Bewertung + Gate-Berechnung.

Liest ein lokales Protokoll aus run_benchmark.py, zeigt optionale Prüfauszüge,
fragt die vier Gate-Kriterien ab und berechnet optional den getrennten A/B-Vergleich.

Aufruf:
    python3 benchmarks/evaluiere.py          # interaktiv
    python3 benchmarks/evaluiere.py --auto   # alle Fälle mit "teilweise" bewerten (Testmodus)

Prüfauszüge können lokale Textzitate enthalten; Protokolle bleiben deshalb
auf JSON-Dateien im gitignorierten Benchmark-Ordner beschränkt.
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from pathlib import Path

BENCH_DIR = Path(__file__).resolve().parent
EVAL_FILE = BENCH_DIR / "evaluation.json"

# Vier Lehrkraft-Kriterien
KRITERIEN = [
    ("fehlererkennung", "Sind die erkannten Fehler tatsächlich Fehler im Text?"),
    ("textzitate", "Sind alle Zitate im Originaltext belegbar?"),
    ("note_plausibel", "Ist die Note/Note-Bewertung plausibel?"),
    ("feedback_brauchbar", "Sind die Korrekturvorschläge ohne Neukorrektur brauchbar?"),
]

ANTWORTEN = {"j": "ja", "n": "nein", "t": "teilweise"}


def _normalisiere_vergleichstext(value: object) -> str:
    """Normalisiert nur für lokale Referenzvergleiche, nie für die Anzeige."""
    if not isinstance(value, str):
        return ""
    return " ".join(
        unicodedata.normalize("NFKC", value)
        .replace("„", '"')
        .replace("“", '"')
        .replace("‚", "'")
        .replace("‘", "'")
        .split()
    ).casefold()


def _textstellen_passen(expected: object, actual: object) -> bool:
    """Akzeptiert vollständige und verkürzte, aber noch belegbare Zitate."""
    wanted = _normalisiere_vergleichstext(expected)
    received = _normalisiere_vergleichstext(actual)
    return bool(wanted and received and (wanted in received or received in wanted))


def load_reference_findings(path: Path) -> dict[str, list[dict[str, str]]]:
    """Lädt einen lokalen, synthetischen/pseudonymisierten Referenzsatz.

    Referenzbefunde gehören nicht in das Analyse-Manifest und nie in einen
    Modellaufruf. Die Datei bleibt deshalb unterhalb des gitignorierten
    Benchmark-Ordners und wird ausschließlich vom lokalen Auswerter gelesen.
    """
    candidate = path.expanduser()
    if not candidate.is_absolute():
        candidate = BENCH_DIR / candidate
    candidate = candidate.resolve()
    try:
        candidate.relative_to(BENCH_DIR.resolve())
    except ValueError as error:
        raise ValueError("Referenzbefunde müssen lokal im Benchmark-Ordner liegen.") from error
    if candidate.suffix.lower() != ".json" or not candidate.is_file():
        raise ValueError("Referenzbefunde müssen eine vorhandene lokale JSON-Datei sein.")
    try:
        payload = json.loads(candidate.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("Referenzbefunde sind nicht lesbar oder ungültig.") from error
    if not isinstance(payload, dict) or payload.get("dataClass") not in {
        "synthetic", "pseudonymized",
    }:
        raise ValueError("Referenzbefunde müssen synthetic oder pseudonymized ausweisen.")
    raw_cases = payload.get("cases")
    if not isinstance(raw_cases, dict) or not raw_cases:
        raise ValueError("Referenzbefunde benötigen eine nichtleere Fallzuordnung.")

    references: dict[str, list[dict[str, str]]] = {}
    for case_id, raw_case in raw_cases.items():
        if not isinstance(case_id, str) or not case_id.startswith("case-"):
            raise ValueError("Referenz-Fall-IDs müssen neutral im Format case-... sein.")
        if not isinstance(raw_case, dict):
            raise ValueError("Jeder Referenzfall muss ein Objekt sein.")
        raw_findings = raw_case.get("expectedLanguageFindings")
        if not isinstance(raw_findings, list):
            raise ValueError("Jeder Referenzfall benötigt expectedLanguageFindings als Liste.")
        findings: list[dict[str, str]] = []
        for raw_finding in raw_findings:
            if not isinstance(raw_finding, dict):
                raise ValueError("Jeder Referenzbefund muss ein Objekt sein.")
            finding = {
                key: raw_finding.get(key, "")
                for key in ("quote", "correction", "category")
            }
            if not all(isinstance(value, str) and value.strip() for value in finding.values()):
                raise ValueError("Referenzbefunde benötigen quote, correction und category.")
            findings.append({key: value.strip() for key, value in finding.items()})
        references[case_id] = findings
    return references


def vergleiche_referenzbefunde(
    runs: list[dict], references: dict[str, list[dict[str, str]]]
) -> dict[str, object]:
    """Vergleicht lokale Prüfauszüge mit einem bekannten Referenzsatz.

    Nicht zugeordnete Modellvorschläge werden bewusst nicht als automatische
    Halluzinationen gewertet: Sie benötigen weiterhin die Lehrkraftprüfung.
    """
    successful = [run for run in runs if run.get("status") == "erfolg"]
    case_ids = {run.get("caseId") for run in successful}
    if not case_ids or not all(isinstance(case_id, str) for case_id in case_ids):
        raise ValueError("Referenzabgleich benötigt erfolgreiche Fälle mit neutralen IDs.")
    if case_ids != set(references):
        raise ValueError("Referenzbefunde müssen exakt dieselben erfolgreichen Fälle abdecken.")

    expected_count = matched_count = unmatched_suggestions = 0
    per_case: dict[str, dict[str, int]] = {}
    for run in successful:
        case_id = run["caseId"]
        review = run.get("reviewData")
        if not isinstance(review, dict) or not isinstance(review.get("fehler"), list):
            raise ValueError(
                "Referenzabgleich benötigt einen Lauf mit --include-review-data."
            )
        actual = [item for item in review["fehler"] if isinstance(item, dict)]
        unused_actual = set(range(len(actual)))
        expected = references[case_id]
        matched_here = 0
        for finding in expected:
            match = next(
                (
                    index
                    for index in unused_actual
                    if _textstellen_passen(finding["quote"], actual[index].get("zitat"))
                    and _textstellen_passen(
                        finding["correction"], actual[index].get("korrektur")
                    )
                    and _normalisiere_vergleichstext(finding["category"])
                    == _normalisiere_vergleichstext(actual[index].get("typ"))
                ),
                None,
            )
            if match is not None:
                unused_actual.remove(match)
                matched_here += 1
        expected_count += len(expected)
        matched_count += matched_here
        unmatched_suggestions += len(unused_actual)
        per_case[case_id] = {
            "erwartet": len(expected),
            "zugeordnet": matched_here,
            "fehlend": len(expected) - matched_here,
            "nichtZugeordnet": len(unused_actual),
        }

    return {
        "faelle": len(successful),
        "erwarteteBefunde": expected_count,
        "zugeordneteBefunde": matched_count,
        "fehlendeBefunde": expected_count - matched_count,
        "nichtZugeordneteModellvorschlaege": unmatched_suggestions,
        "erkennungsquoteProzent": (
            round(matched_count / expected_count * 100, 1) if expected_count else None
        ),
        "nachFall": per_case,
        "hinweis": (
            "Nicht zugeordnete Modellvorschläge sind keine automatisch bestätigten "
            "Halluzinationen und müssen von einer Lehrkraft geprüft werden."
        ),
    }


def frage_antwort(frage: str, auto: bool = False) -> str:
    """Fragt eine einzelne Lehrkraft-Frage ab (ja/nein/teilweise)."""
    if auto:
        return "teilweise"
    while True:
        eingabe = input(f"  {frage} [j]a/[n]ein/[t]eilweise: ").strip().lower()
        if eingabe in ANTWORTEN:
            return ANTWORTEN[eingabe]
        print("  Bitte j, n oder t eingeben.")


INTERVENTION_ANTWORTEN = {"0": "keine", "1": "einzelne", "2": "wesentliche"}


def frage_lehrkraftintervention() -> str:
    """Erfasst den tatsächlichen Bearbeitungsaufwand unabhängig von Nutzbarkeit."""
    frage = (
        "Wie stark musstest du das KI-Ergebnis bearbeiten? "
        "0=gar nicht, 1=einzelne Änderungen, 2=wesentliche Überarbeitung"
    )
    while True:
        eingabe = input(f"  {frage} [0/1/2]: ").strip()
        if eingabe in INTERVENTION_ANTWORTEN:
            return INTERVENTION_ANTWORTEN[eingabe]
        print("  Bitte 0, 1 oder 2 eingeben.")


def bewerte_fall(run: dict, auto: bool = False, a_b: bool = False) -> dict:
    """Bewertet einen einzelnen Fall mit den vier Kriterien."""
    case_id = run["caseId"]
    print(f"\n{'='*60}")
    print(f"Fall: {case_id}")
    print(f"{'='*60}")
    review = run.get("reviewData", {})
    if isinstance(review, dict):
        print("Vorschläge der Korrektur (mit dem lokalen Originaltext abgleichen):")
        for item in review.get("fehler", []):
            if isinstance(item, dict):
                print(
                    f"  [{item.get('typ', '?')}] {item.get('zitat', '')!r} "
                    f"→ {item.get('korrektur', '')!r}: {item.get('erklaerung', '')}"
                )
        note = review.get("notenempfehlung", {})
        if isinstance(note, dict):
            print(f"Notenempfehlung: {note.get('note', '—')} · {note.get('begruendung', '')}")
        if review.get("zusammenfassung"):
            print(f"Zusammenfassung: {review['zusammenfassung']}")
    bewertung = {}
    for key, frage in KRITERIEN:
        bewertung[key] = frage_antwort(frage, auto=auto)
    if a_b:
        bewertung["lehrkraftintervention"] = frage_lehrkraftintervention()
    return bewertung


def berechne_gate(runs: list[dict], vollstaendige_laeufe: int) -> dict:
    """Berechnet das Qualitäts-Gate aus allen Bewertungen."""
    erfolgreiche = [r for r in runs if r.get("status") == "erfolg"]
    bewertete = [r for r in erfolgreiche if _bewertung_vollstaendig(r.get("lehrkBewertung"))]
    if not erfolgreiche or len(bewertete) != len(erfolgreiche):
        return {
            "vollstaendigeLaeufe": vollstaendige_laeufe,
            "kritischeHalluzinationen": None,
            "zitateBelegbarProzent": None,
            "fehlererkennungProzent": None,
            "notePlausibelProzent": None,
            "verwendbarProzent": None,
            "entscheidung": "Lehrkraft-Bewertung unvollständig",
        }

    gesamt = len(bewertete)

    # Ein falscher Fehlernachweis oder ein nicht belegbares Zitat ist kritisch.
    halluzinationen = sum(
        1 for r in bewertete
        if r["lehrkBewertung"].get("textzitate") == "nein"
        or r["lehrkBewertung"].get("fehlererkennung") == "nein"
    )

    # Zitate belegbar: textzitate == "ja"
    zitate_ok = sum(
        1 for r in bewertete
        if r["lehrkBewertung"].get("textzitate") == "ja"
    )
    zitate_prozent = round(zitate_ok / gesamt * 100, 1)

    fehler_ok = sum(1 for r in bewertete if r["lehrkBewertung"].get("fehlererkennung") == "ja")
    fehler_prozent = round(fehler_ok / gesamt * 100, 1)

    note_ok = sum(1 for r in bewertete if r["lehrkBewertung"].get("note_plausibel") == "ja")
    note_prozent = round(note_ok / gesamt * 100, 1)

    # Verwendbar: feedback_brauchbar == "ja" ODER "teilweise"
    verwendbar = sum(
        1 for r in bewertete
        if r["lehrkBewertung"].get("feedback_brauchbar") in ("ja", "teilweise")
    )
    verwendbar_prozent = round(verwendbar / gesamt * 100, 1)

    # Gate-Entscheidung
    gate_erfuellt = (
        vollstaendige_laeufe >= 2
        and
        halluzinationen == 0
        and zitate_prozent >= 90.0
        and fehler_prozent >= 90.0
        and note_prozent >= 90.0
        and verwendbar_prozent >= 90.0
    )

    return {
        "vollstaendigeLaeufe": vollstaendige_laeufe,
        "kritischeHalluzinationen": halluzinationen,
        "zitateBelegbarProzent": zitate_prozent,
        "fehlererkennungProzent": fehler_prozent,
        "notePlausibelProzent": note_prozent,
        "verwendbarProzent": verwendbar_prozent,
        "entscheidung": (
            "Medium 3.5 als Standard freigeben"
            if gate_erfuellt
            else (
                "Zweiter vollständiger, separat freigegebener Lauf erforderlich"
                if vollstaendige_laeufe < 2
                else "Nachbesserung erforderlich"
            )
        ),
    }


def _bewertung_vollstaendig(bewertung: object) -> bool:
    return isinstance(bewertung, dict) and all(
        bewertung.get(key) in ("ja", "nein", "teilweise")
        for key, _ in KRITERIEN
    )


def ist_vollstaendiger_lauf(
    evaluation: dict,
    erwarteter_provider: str = "mistral",
    erwartetes_modell: str = "mistral-medium-3-5",
    erwartete_promptvariante: str | None = "neutral",
) -> bool:
    """Nur vollständige Läufe des festgelegten Anbieters/Modells zählen."""
    if not isinstance(evaluation, dict):
        return False
    metadata = evaluation.get("metadata")
    if not isinstance(metadata, dict):
        return False
    if (
        metadata.get("provider") != erwarteter_provider
        or metadata.get("model") != erwartetes_modell
        or metadata.get("dataClass") not in {"synthetic", "pseudonymized"}
        or metadata.get("densityPromptVariant") not in {"neutral", "legacy"}
        or (
            erwartete_promptvariante is not None
            and metadata.get("densityPromptVariant") != erwartete_promptvariante
        )
        or not isinstance(metadata.get("runId"), str)
        or not metadata["runId"].strip()
        or not isinstance(metadata.get("runLabel"), str)
        or not metadata["runLabel"].strip()
    ):
        return False
    runs = evaluation.get("runs", [])
    return bool(runs) and all(
        isinstance(run, dict)
        and isinstance(run.get("caseId"), str)
        and run.get("status") == "erfolg"
        and run.get("schemaValid") is True
        and run.get("promptVariant") == metadata.get("densityPromptVariant")
        for run in runs
    ) and len({run["caseId"] for run in runs}) == len(runs)


def sind_kompatible_laeufe(erster: dict, zweiter: dict) -> bool:
    """Prüft, dass beide Läufe eigenständig dieselben Fälle mit demselben Modell abdecken."""
    if not isinstance(erster, dict) or not isinstance(zweiter, dict):
        return False
    if not ist_vollstaendiger_lauf(erster) or not ist_vollstaendiger_lauf(zweiter):
        return False
    first_metadata = erster["metadata"]
    second_metadata = zweiter["metadata"]
    if (
        first_metadata["runId"] == second_metadata["runId"]
        or first_metadata["runLabel"] == second_metadata["runLabel"]
        or any(
            first_metadata[key] != second_metadata[key]
            for key in ("provider", "model", "dataClass", "densityPromptVariant")
        )
    ):
        return False
    first_cases = {run["caseId"] for run in erster["runs"]}
    second_cases = {run["caseId"] for run in zweiter["runs"]}
    return first_cases == second_cases


def vergleiche_fehlerdichte_ab(erster: dict, zweiter: dict) -> dict:
    """Vergleicht gepaarte Legacy-/Neutral-Läufe ohne Rohtexte oder Modellantworten."""
    if not ist_vollstaendiger_lauf(
        erster, erwartete_promptvariante=None
    ) or not ist_vollstaendiger_lauf(zweiter, erwartete_promptvariante=None):
        raise ValueError("A/B-Vergleich benötigt zwei vollständige, schema-valide Läufe.")
    meta_a, meta_b = erster["metadata"], zweiter["metadata"]
    if meta_a["densityPromptVariant"] == meta_b["densityPromptVariant"]:
        raise ValueError("A/B-Läufe müssen unterschiedliche Promptvarianten verwenden.")
    if {meta_a["densityPromptVariant"], meta_b["densityPromptVariant"]} != {"legacy", "neutral"}:
        raise ValueError("A/B-Vergleich ist nur für legacy und neutral definiert.")
    if any(meta_a[key] != meta_b[key] for key in ("provider", "model", "dataClass")):
        raise ValueError("A/B-Läufe müssen Anbieter, Modell und Datenklasse teilen.")
    if meta_a["runId"] == meta_b["runId"]:
        raise ValueError("A/B-Läufe müssen getrennte Ausführungen sein.")

    runs_a = {run["caseId"]: run for run in erster["runs"]}
    runs_b = {run["caseId"]: run for run in zweiter["runs"]}
    if runs_a.keys() != runs_b.keys():
        raise ValueError("A/B-Läufe müssen exakt dieselben Fall-IDs enthalten.")
    for case_id in runs_a:
        a, b = runs_a[case_id], runs_b[case_id]
        if any(
            a.get(key) != b.get(key)
            for key in (
                "klasse", "aufgabe", "fach", "land", "schulstufe", "textsorte",
                "rubric", "bewertungsmodus",
            )
        ):
            raise ValueError(
                "A/B-Läufe verwenden für mindestens einen Fall verschiedene Einstellungen."
            )
        if not _bewertung_vollstaendig(a.get("lehrkBewertung")) or not _bewertung_vollstaendig(
            b.get("lehrkBewertung")
        ):
            raise ValueError(
                "Für beide Promptvarianten fehlt mindestens eine vollständige Lehrkraftbewertung."
            )
        if any(
            run["lehrkBewertung"].get("lehrkraftintervention")
            not in INTERVENTION_ANTWORTEN.values()
            for run in (a, b)
        ):
            raise ValueError("Für beide Varianten fehlt die explizite Lehrkraftintervention.")
        for run in (a, b):
            for key in ("fehlerAnzahl", "note", "qualityWarningCount"):
                value = run.get(key)
                if not isinstance(value, (int, float)) or isinstance(value, bool):
                    raise ValueError(f"Kennzahl '{key}' fehlt bei mindestens einem Benchmark-Fall.")

    def arm_metrics(rows: dict[str, dict]) -> dict:
        count = len(rows)
        ratings = [row["lehrkBewertung"] for row in rows.values()]
        return {
            "faelle": count,
            "mittlereFehlerAnzahl": round(
                sum(row["fehlerAnzahl"] for row in rows.values()) / count, 2
            ),
            "mittlereNote": round(sum(row["note"] for row in rows.values()) / count, 2),
            "mittlereQualitaetswarnungen": round(
                sum(row["qualityWarningCount"] for row in rows.values()) / count, 2
            ),
            "kritischeHalluzinationen": sum(
                1 for rating in ratings
                if rating["fehlererkennung"] == "nein" or rating["textzitate"] == "nein"
            ),
            "zitateBelegbarProzent": round(
                sum(rating["textzitate"] == "ja" for rating in ratings) / count * 100, 1
            ),
            "fehlererkennungProzent": round(
                sum(rating["fehlererkennung"] == "ja" for rating in ratings) / count * 100, 1
            ),
            "notenplausibelProzent": round(
                sum(rating["note_plausibel"] == "ja" for rating in ratings) / count * 100, 1
            ),
            "ohneNeukorrekturBrauchbarProzent": round(
                sum(rating["feedback_brauchbar"] == "ja" for rating in ratings) / count * 100, 1
            ),
            "lehrkraftintervention": {
                category: sum(
                    rating["lehrkraftintervention"] == category for rating in ratings
                )
                for category in INTERVENTION_ANTWORTEN.values()
            },
        }

    legacy_rows = runs_a if meta_a["densityPromptVariant"] == "legacy" else runs_b
    neutral_rows = runs_a if meta_a["densityPromptVariant"] == "neutral" else runs_b
    legacy = arm_metrics(legacy_rows)
    neutral = arm_metrics(neutral_rows)
    delta_keys = (
        "mittlereFehlerAnzahl", "mittlereNote", "mittlereQualitaetswarnungen",
        "kritischeHalluzinationen", "zitateBelegbarProzent", "fehlererkennungProzent",
        "notenplausibelProzent", "ohneNeukorrekturBrauchbarProzent",
    )
    intervention_delta = {
        category: round(
            neutral["lehrkraftintervention"][category] / neutral["faelle"] * 100
            - legacy["lehrkraftintervention"][category] / legacy["faelle"] * 100,
            2,
        )
        for category in INTERVENTION_ANTWORTEN.values()
    }
    return {
        "vergleich": "neutral_minus_legacy",
        "daten": {
            "provider": meta_a["provider"],
            "model": meta_a["model"],
            "dataClass": meta_a["dataClass"],
        },
        "legacy": legacy,
        "neutral": neutral,
        "deltaNeutralMinusLegacy": {
            key: round(neutral[key] - legacy[key], 2) for key in delta_keys
        },
        "deltaLehrkraftinterventionProzent": intervention_delta,
        "hinweis": (
            "Die Lehrkraftintervention wurde je Fall ausdrücklich eingestuft; der "
            "Kennzahlenvergleich trifft keine automatische Qualitäts- oder Freigabeentscheidung."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="LUKA Benchmark-Evaluation")
    parser.add_argument(
        "--auto", action="store_true", help="Alle Antworten 'teilweise' (Testmodus)"
    )
    parser.add_argument(
        "--gate-only", action="store_true", help="Nur Gate berechnen, nicht interaktiv"
    )
    parser.add_argument(
        "--zweiter-lauf",
        help="Pfad zu einem zweiten, separat freigegebenen Benchmark-Protokoll",
    )
    parser.add_argument(
        "--input", default=str(EVAL_FILE), help="Zu bewertendes lokales Benchmark-Protokoll"
    )
    parser.add_argument(
        "--vergleich", default=None,
        help="Zweites, bereits bewertetes Protokoll der jeweils anderen Promptvariante",
    )
    parser.add_argument(
        "--a-b", action="store_true",
        help="Promptvergleich; Ergebnis zählt ausdrücklich nicht als Modellfreigabe",
    )
    parser.add_argument(
        "--reference-findings",
        default=None,
        help=(
            "Lokaler Referenzsatz mit erwarteten synthetischen/pseudonymisierten "
            "Sprachbefunden; nur zusätzlicher Abgleich, kein automatisches Gate"
        ),
    )
    args = parser.parse_args()
    if args.a_b and args.zweiter_lauf:
        parser.error("--a-b und --zweiter-lauf gehören zu verschiedenen Auswertungen.")
    if args.vergleich and not args.a_b:
        parser.error("--vergleich muss zusammen mit --a-b verwendet werden.")
    if args.a_b and args.auto:
        parser.error("--auto ist nur für Tests gedacht und darf keinen A/B-Vergleich bewerten.")

    input_file = Path(args.input).expanduser()
    if not input_file.is_absolute():
        input_file = BENCH_DIR / input_file
    input_file = input_file.resolve()
    if (
        input_file.parent != BENCH_DIR.resolve()
        or input_file.suffix.lower() != ".json"
        or input_file.name == "manifest.json"
    ):
        parser.error(
            "Das Auswertungsprotokoll muss eine lokale JSON-Datei direkt im Benchmark-Ordner sein."
        )
    if not input_file.exists():
        print(
            f"Fehler: {input_file} nicht gefunden. Zuerst run_benchmark.py ausfuehren.",
            file=sys.stderr,
        )
        return 1

    evaluation = json.loads(input_file.read_text(encoding="utf-8"))
    if not isinstance(evaluation, dict):
        print("Fehler: Benchmark-Protokoll muss ein JSON-Objekt sein.", file=sys.stderr)
        return 1
    runs = evaluation.get("runs", [])
    if not isinstance(runs, list):
        print("Fehler: Benchmark-Protokoll enthält keine gültige Fallliste.", file=sys.stderr)
        return 1
    first_complete = ist_vollstaendiger_lauf(evaluation)
    vollstaendige_laeufe = 1 if first_complete else 0
    if args.zweiter_lauf:
        try:
            zweiter_lauf = json.loads(Path(args.zweiter_lauf).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            print(f"Zweiter Lauf nicht lesbar: {error}", file=sys.stderr)
            return 1
        if not isinstance(zweiter_lauf, dict):
            print("Zweiter Lauf muss ein JSON-Objekt sein.", file=sys.stderr)
            return 1
        if first_complete and sind_kompatible_laeufe(evaluation, zweiter_lauf):
            vollstaendige_laeufe += 1

    erfolgreiche = [
        run for run in runs if isinstance(run, dict) and run.get("status") == "erfolg"
    ]
    print(f"Bewertung: {len(erfolgreiche)} von {len(runs)} Faelle erfolgreich.")

    if not erfolgreiche:
        print("Keine erfolgreichen Faelle zum Bewerten.", file=sys.stderr)
        return 1

    if args.reference_findings:
        try:
            references = load_reference_findings(Path(args.reference_findings))
            reference_check = vergleiche_referenzbefunde(erfolgreiche, references)
        except ValueError as error:
            print(f"Referenzabgleich nicht möglich: {error}", file=sys.stderr)
            return 1
        evaluation["referenceCheck"] = reference_check
        print(
            "Referenzabgleich: "
            f"{reference_check['zugeordneteBefunde']} von "
            f"{reference_check['erwarteteBefunde']} erwarteten Befunden zugeordnet; "
            f"{reference_check['nichtZugeordneteModellvorschlaege']} "
            "Modellvorschläge bleiben für die Lehrkraftprüfung offen."
        )

    if not args.gate_only and not args.auto:
        ohne_pruefauszug = [
            run["caseId"] for run in erfolgreiche
            if not isinstance(run.get("reviewData"), dict)
        ]
        if ohne_pruefauszug:
            print(
                "Für eine Lehrkraftbewertung muss der Benchmark mit "
                "--include-review-data wiederholt werden.",
                file=sys.stderr,
            )
            return 1

    if not args.gate_only:
        for run in runs:
            if run["status"] != "erfolg":
                print(f"\n  [UEBERSPRUNGEN] {run['caseId']} (Status: {run['status']})")
                continue
            run["lehrkBewertung"] = bewerte_fall(run, auto=args.auto, a_b=args.a_b)

    gate = (
        {
            "vollstaendigeLaeufe": 0,
            "kritischeHalluzinationen": None,
            "zitateBelegbarProzent": None,
            "fehlererkennungProzent": None,
            "notePlausibelProzent": None,
            "verwendbarProzent": None,
            "entscheidung": "A/B-Vergleich — keine Modellfreigabe",
        }
        if args.a_b
        else berechne_gate(runs, vollstaendige_laeufe)
    )
    evaluation["gate"] = gate
    evaluation["runs"] = runs

    input_file.write_text(
        json.dumps(evaluation, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if args.a_b:
        print("\nPrompt-A/B-Bewertung: ausdrücklich keine Modellfreigabe.")
    else:
        print(f"\n{'='*60}")
        print("GATE-ERGEBNIS")
        print(f"{'='*60}")
        print(f"  Kritische Halluzinationen: {gate['kritischeHalluzinationen']}")
        print(f"  Zitate belegbar:           {gate['zitateBelegbarProzent']}%")
        print(f"  Fehlererkennung:           {gate['fehlererkennungProzent']}%")
        print(f"  Notenplausibilität:        {gate['notePlausibelProzent']}%")
        print(f"  Ergebnisse verwendbar:     {gate['verwendbarProzent']}%")
        print(f"  Entscheidung:              {gate['entscheidung']}")
        if isinstance(evaluation.get("referenceCheck"), dict):
            print(
                "  Referenz-Erkennungsquote: "
                f"{evaluation['referenceCheck']['erkennungsquoteProzent']}% "
                "(zusätzlich, kein automatisches Gate)"
            )
    print(f"\nProtokoll aktualisiert: {input_file}")

    if args.vergleich:
        try:
            other_path = Path(args.vergleich).expanduser()
            if not other_path.is_absolute():
                other_path = BENCH_DIR / other_path
            other_path = other_path.resolve()
            if (
                other_path.parent != BENCH_DIR.resolve()
                or other_path.suffix.lower() != ".json"
                or other_path.name == "manifest.json"
            ):
                raise ValueError(
                    "Vergleichsprotokoll muss direkt im lokalen Benchmark-Ordner liegen."
                )
            other = json.loads(other_path.read_text(encoding="utf-8"))
            vergleich = vergleiche_fehlerdichte_ab(evaluation, other)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            print(f"A/B-Vergleich nicht möglich: {error}", file=sys.stderr)
            return 1
        print("\nA/B-VERGLEICH (neutral minus legacy; kein automatisches Gate)")
        for arm in ("legacy", "neutral"):
            metric = vergleich[arm]
            print(
                f"  {arm}: {metric['mittlereFehlerAnzahl']} Fehler/Fall, "
                f"{metric['zitateBelegbarProzent']}% belegbare Zitate, "
                f"{metric['notenplausibelProzent']}% plausible Noten, "
                f"Lehrkraft-Eingriffe {metric['lehrkraftintervention']}"
            )
        print(f"  Delta: {vergleich['deltaNeutralMinusLegacy']}")
        print(
            "  Eingriffs-Delta in Prozentpunkten: "
            f"{vergleich['deltaLehrkraftinterventionProzent']}"
        )
        print(f"  Hinweis: {vergleich['hinweis']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
