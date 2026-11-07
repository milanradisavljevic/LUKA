"""Getrennter, lokaler Modell-/Prompt-/Denkvergleich. Ändert niemals ein Gate.

Qualitätszahlen stammen aus einer unabhängigen, verblindeten Prüfung:
qualityReview je Fall: falseErrors, missedErrors, usableSuggestions,
suggestionCount, gradePlausible (bool). Ohne Prüfung bleiben diese Werte offen.
Kosten bleiben offen, sofern kein belegter costUsd-Wert im Fallprotokoll steht.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def compare(first: dict, second: dict, *, allow_pseudonymized: bool = False) -> dict:
    def index(protocol: dict) -> dict:
        if protocol.get("metadata", {}).get("diagnosticOnly"):
            raise ValueError("Ein unvollständiger Diagnoselauf ist kein vollständiger Modellvergleich.")
        if protocol.get("metadata", {}).get("dataClass") not in ({"synthetic", "pseudonymized"} if allow_pseudonymized else {"synthetic"}):
            raise ValueError("Dieser Vergleich verwendet ausschließlich synthetische Fälle.")
        rows = protocol.get("runs", [])
        if not rows or any(row.get("status") != "erfolg" for row in rows):
            raise ValueError("Nur vollständige, erfolgreiche Läufe vergleichen.")
        indexed = {row["caseId"]: row for row in rows}
        if len(indexed) != len(rows):
            raise ValueError("Doppelte Fall-IDs im Protokoll.")
        return indexed
    a, b = index(first), index(second)
    if first.get("metadata", {}).get("dataClass") != second.get("metadata", {}).get("dataClass"):
        raise ValueError("Datenklassen dürfen nicht gemischt werden.")
    if a.keys() != b.keys():
        raise ValueError("Beide Läufe müssen dieselben Fälle enthalten.")
    for case in a:
        if first.get("metadata", {}).get("dataClass") == "pseudonymized" and any(not a[case].get(k) or not b[case].get(k) for k in ("sourceHash", "basisHash", "rubricHash")):
            raise ValueError("Pseudonymisierte Referenzen benötigen Text-, Grundlagen- und Rasterprüfsummen.")
        if not a[case].get("sourceHash") or a[case]["sourceHash"] != b[case].get("sourceHash"):
            raise ValueError("Die Eingabetexte sind nicht nachweislich identisch.")
        if a[case].get("basisHash") != b[case].get("basisHash"):
            raise ValueError("Die Beilagen oder Bewertungsgrundlagen unterscheiden sich.")
        if a[case].get("rubricHash") or b[case].get("rubricHash"):
            if not a[case].get("rubricHash") or a[case]["rubricHash"] != b[case].get("rubricHash"):
                raise ValueError("Die Rasterinhalte sind nicht nachweislich identisch.")
        for key in ("fach", "land", "schulstufe", "textsorte", "rubric", "bewertungsmodus"):
            if a[case].get(key) != b[case].get(key):
                raise ValueError("Die Bewertungsgrundlagen unterscheiden sich.")
    def summary(protocol: dict) -> dict:
        rows = protocol["runs"]
        reviews = [row.get("qualityReview") for row in rows]
        reviewed = all(isinstance(review, dict) and type(review.get("gradePlausible")) is bool
            and all(type(review.get(key)) is int and review[key] >= 0 for key in (
                "falseErrors", "missedErrors", "usableSuggestions", "suggestionCount"))
            and review["usableSuggestions"] <= review["suggestionCount"] for review in reviews)
        def total(key):
            return sum(row[key] for row in rows) if all(isinstance(row.get(key), (int, float)) for row in rows) else None
        extra_reviewed = reviewed and all(all(type(r.get(k)) is int and r[k] >= 0 for k in ("falseReasons", "meaningChanges")) for r in reviews)
        return {"falseReasons": sum(r["falseReasons"] for r in reviews) if extra_reviewed else None,
                "meaningChanges": sum(r["meaningChanges"] for r in reviews) if extra_reviewed else None,
                "safetyAssessment": ("bestanden" if all(r["falseErrors"] == r["falseReasons"] == r["meaningChanges"] == 0 for r in reviews) else "nicht_bestanden") if extra_reviewed else "offen",
                "configuration": {key: protocol.get("metadata", {}).get(key) for key in ("provider", "model", "reasoning", "promptVersion")},
                "durationMs": total("laufzeitMs"), "costUsd": total("costUsd"),
                "apiCalls": sum(len(row.get("apiCalls", [])) for row in rows),
                "falseErrors": sum(r["falseErrors"] for r in reviews) if reviewed else None,
                "missedErrors": sum(r["missedErrors"] for r in reviews) if reviewed else None,
                "usableSuggestions": sum(r["usableSuggestions"] for r in reviews) if reviewed else None,
                "suggestionCount": sum(r["suggestionCount"] for r in reviews) if reviewed else None,
                "plausibleGrades": sum(r["gradePlausible"] is True for r in reviews) if reviewed else None,
                "qualityReviewed": reviewed}
    return {"comparisonOnly": True, "caseCount": len(a), "first": summary(first), "second": summary(second),
            "note": "Keine automatische Modellfreigabe. Fehlende fachliche Prüfung oder Kostendaten bleiben offen."}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("first", type=Path); parser.add_argument("second", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--allow-pseudonymized", action="store_true", help="Lokaler Vergleich freigegebener pseudonymisierter Fälle; kein synthetisches Modellgate")
    args = parser.parse_args()
    from run_benchmark import resolve_protocol_output
    output = resolve_protocol_output(args.output)
    result = compare(json.loads(args.first.read_text(encoding="utf-8")), json.loads(args.second.read_text(encoding="utf-8")), allow_pseudonymized=args.allow_pseudonymized)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Lokaler Vergleich: {output.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
