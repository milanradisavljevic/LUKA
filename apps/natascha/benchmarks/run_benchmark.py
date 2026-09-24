#!/usr/bin/env python3
"""Datensicherer LUKA-Benchmark-Runner.

Der Runner akzeptiert ausschliesslich lokale, synthetische oder nachweislich
pseudonymisierte Faelle aus einem ignorierten Manifest. Standardprotokolle
enthalten nur Fall-IDs und Kennzahlen. Ein expliziter Opt-in speichert eng
begrenzte Fehlerzitate/Korrekturen und Notenbegründung zur lokalen Lehrkraft-
Prüfung; vollständige Schülertexte, Namen, Pfade und CLI-Ausgaben werden nie
übernommen.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

BENCH_DIR = Path(__file__).resolve().parent
CASES_DIR = BENCH_DIR / "cases"
EVAL_FILE = BENCH_DIR / "evaluation.json"
NATASCHA_ROOT = BENCH_DIR.parent
MANIFEST_FILE = CASES_DIR / "manifest.json"
CASE_ID_PATTERN = re.compile(r"^case-[a-z0-9][a-z0-9-]{0,62}$")
ALLOWED_DATA_CLASSES = {"synthetic", "pseudonymized"}

# Per-Case-Config (4C.1): Ein Fall darf diese Felder über den globalen
# DEFAULT_CONFIG überschreiben — z. B. für den Englisch-Satz. Alles andere
# bleibt beim neutralen Globalwert (Datensicherheit: Whitelist).
ALLOWED_CONFIG_KEYS = {
    "klasse", "aufgabe", "fach", "land", "schulstufe", "textsorte", "rubric",
    "bewertungsmodus",
}

# Neutrale Konfiguration fuer synthetische Referenzfaelle. Reale Klassen- und
# Aufgabenbezeichnungen gehoeren weder in den Runner noch ins Protokoll.
DEFAULT_CONFIG = {
    "klasse": "benchmark",
    "aufgabe": "synthetic",
    "fach": "Deutsch",
    "land": "at",
    "schulstufe": "Unterstufe",
    "textsorte": "kommentar",
    "rubric": "kommentar_unterstufe.md",
    "bewertungsmodus": "benotet",
}


def load_case_manifest(manifest_path: Path = MANIFEST_FILE) -> tuple[str, list[dict[str, object]]]:
    """Validiert das lokale Fall-Manifest und gibt sichere Fallbeschreibungen zurueck."""
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("Benchmark-Manifest fehlt oder ist ungueltig.") from error

    data_class = manifest.get("dataClass") if isinstance(manifest, dict) else None
    if data_class not in ALLOWED_DATA_CLASSES:
        raise ValueError("Manifest muss dataClass 'synthetic' oder 'pseudonymized' ausweisen.")
    raw_cases = manifest.get("cases") if isinstance(manifest, dict) else None
    if not isinstance(raw_cases, list) or not raw_cases:
        raise ValueError("Manifest muss mindestens einen Fall enthalten.")

    cases: list[dict[str, object]] = []
    seen_ids: set[str] = set()
    # DOCX-Dateien liegen neben dem Manifest (cases/ oder cases_en/).
    cases_root = manifest_path.resolve().parent
    for raw_case in raw_cases:
        if not isinstance(raw_case, dict):
            raise ValueError("Jeder Manifest-Fall muss ein Objekt sein.")
        case_id = raw_case.get("id")
        filename = raw_case.get("file")
        if not isinstance(case_id, str) or not CASE_ID_PATTERN.fullmatch(case_id):
            raise ValueError("Fall-IDs muessen neutral im Format case-... sein.")
        if case_id in seen_ids:
            raise ValueError("Fall-IDs muessen eindeutig sein.")
        if not isinstance(filename, str) or Path(filename).suffix.lower() != ".docx":
            raise ValueError("Jeder Fall muss auf eine DOCX-Datei verweisen.")
        docx_path = (cases_root / filename).resolve()
        if docx_path.parent != cases_root or not docx_path.is_file():
            raise ValueError("Manifest verweist auf keinen zulaessigen lokalen DOCX-Fall.")
        per_case_config: dict[str, str] = {}
        raw_config = raw_case.get("config")
        if raw_config is not None:
            if not isinstance(raw_config, dict):
                raise ValueError("Fall-Config muss ein Objekt sein.")
            for key, value in raw_config.items():
                if key not in ALLOWED_CONFIG_KEYS:
                    raise ValueError(f"Fall-Config-Feld nicht erlaubt: {key}")
                if not isinstance(value, str) or not value.strip():
                    raise ValueError(f"Fall-Config-Wert muss nichtleerer String sein: {key}")
                per_case_config[key] = value.strip()
        seen_ids.add(case_id)
        cases.append({"id": case_id, "path": docx_path, "config": per_case_config})
    return data_class, cases


def build_cli_args(
    docx_path: Path,
    provider: str,
    model: str,
    db_path: Path,
    config: dict[str, str],
    max_retries: int,
    prompt_variant: str = "neutral",
) -> list[str]:
    """Baut den Analyse-Aufruf; Pseudonymisierung bleibt bewusst aktiviert."""
    if prompt_variant not in {"neutral", "legacy"}:
        raise ValueError("Unbekannte Fehlerdichte-Promptvariante.")
    return [
        sys.executable,
        str(NATASCHA_ROOT / "natascha_cli.py"),
        "--db-path", str(db_path),
        "--provider", provider,
        "--model", model,
        "analyze",
        str(docx_path),
        "--klasse", config["klasse"],
        "--aufgabe", config["aufgabe"],
        "--fach", config["fach"],
        "--land", config.get("land", "at"),
        "--schulstufe", config["schulstufe"],
        "--textsorte", config["textsorte"],
        "--rubric", config["rubric"],
        "--bewertungsmodus", config["bewertungsmodus"],
        "--max-retries", str(max_retries),
        "--benchmark-fehlerdichte-prompt", prompt_variant,
        "--quiet",
    ]


def validate_analysis_schema(analysis: object) -> tuple[bool, str | None]:
    """Prueft gegen das produktive Feedback-Schema ohne Details zu speichern."""
    if not isinstance(analysis, dict):
        return False, "analysis_missing"
    try:
        from jsonschema import Draft202012Validator
    except ImportError:
        return False, "schema_validator_missing"
    try:
        schema = json.loads((NATASCHA_ROOT / "feedback_schema.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False, "schema_unavailable"
    errors = list(Draft202012Validator(schema).iter_errors(analysis))
    return not errors, (None if not errors else "schema_invalid")


def review_data_from_analysis(analysis: dict) -> dict[str, object]:
    """Erzeugt einen lokalen Prüfauszug ohne Rohtext, Pfade oder Personenfelder."""
    fehler = analysis.get("fehler", [])
    notenempfehlung = analysis.get("notenempfehlung", {})
    limits = {"zitat": 200, "korrektur": 200, "typ": 40, "erklaerung": 500}
    return {
        "fehler": [
            {
                key: item[key][:limits[key]] if isinstance(item[key], str) else item[key]
                for key in limits if key in item
            }
            for item in fehler if isinstance(item, dict)
        ] if isinstance(fehler, list) else [],
        "notenempfehlung": {
            key: (
                notenempfehlung[key][:1000]
                if key == "begruendung" and isinstance(notenempfehlung[key], str)
                else notenempfehlung[key]
            )
            for key in ("note", "bezeichnung", "begruendung", "durchschnitt")
            if key in notenempfehlung
        } if isinstance(notenempfehlung, dict) else {},
        "zusammenfassung": (
            analysis.get("zusammenfassung", "")[:1000]
            if isinstance(analysis.get("zusammenfassung", ""), str) else ""
        ),
    }


def resolve_protocol_output(raw_path: str | Path) -> Path:
    """Protokolle bleiben direkte JSON-Kinder des lokalen Benchmark-Ordners."""
    candidate = Path(raw_path).expanduser()
    if not candidate.is_absolute():
        candidate = BENCH_DIR / candidate
    output = candidate.resolve()
    try:
        output.relative_to(BENCH_DIR.resolve())
    except ValueError as error:
        raise ValueError(
            "Benchmark-Protokolle dürfen nur lokal im Benchmark-Ordner liegen."
        ) from error
    if output.parent != BENCH_DIR.resolve() or output.suffix.lower() != ".json":
        raise ValueError("Protokoll muss eine JSON-Datei direkt im Benchmark-Ordner sein.")
    if output.name == "manifest.json":
        raise ValueError("Ein Benchmark-Manifest darf nicht als Protokoll überschrieben werden.")
    return output


def classify_cli_error(stderr: str) -> str:
    """Ordnet lokale CLI-Fehler zu, ohne ihren Inhalt ins Protokoll zu uebernehmen."""
    text = stderr.lower()
    if "429" in text or "rate limit" in text or "rate_limited" in text:
        return "rate_limited"
    if "api-fehler" in text or "anbieter" in text:
        return "api_error"
    return "cli_exit"


def run_single_case(
    case: dict[str, object],
    provider: str,
    model: str,
    config: dict[str, str],
    max_retries: int,
    dry_run: bool = False,
    prompt_variant: str = "neutral",
    include_review_data: bool = False,
) -> dict[str, object]:
    """Fuehrt einen einzelnen sicheren Benchmark-Fall aus."""
    if prompt_variant not in {"neutral", "legacy"}:
        raise ValueError("Unbekannte Fehlerdichte-Promptvariante.")
    case_id = str(case["id"])
    docx_path = Path(case["path"])
    # Per-Case-Config (4C.1): Whitelist-Override schlaegt den globalen Wert.
    case_config = {**config, **dict(case.get("config") or {})}
    entry: dict[str, object] = {
        "caseId": case_id,
        "klasse": case_config["klasse"],
        "aufgabe": case_config["aufgabe"],
        "fach": case_config["fach"],
        "land": case_config.get("land", "at"),
        "schulstufe": case_config["schulstufe"],
        "textsorte": case_config["textsorte"],
        "rubric": case_config["rubric"],
        "bewertungsmodus": case_config["bewertungsmodus"],
        "laufzeitMs": None,
        "status": "nicht_gelaufen",
        "fehlerAnzahl": None,
        "note": None,
        "schemaValid": None,
        "qualityWarningCount": 0,
        "promptVariant": prompt_variant,
        "errorCode": None,
    }

    if dry_run:
        entry["status"] = "dry_run"
        print(f"  -> {case_id} [DRY-RUN]")
        return entry

    print(f"  -> {case_id} ...", end="", flush=True)
    start = time.monotonic()
    try:
        # Funktioniert auf Windows und Unix; DB, WAL und SHM verschwinden
        # nach jedem Fall automatisch mit dem Verzeichnis.
        with tempfile.TemporaryDirectory(prefix="luka_bench_") as temp_dir:
            db_path = Path(temp_dir) / f"{uuid.uuid4().hex}.db"
            args = build_cli_args(
                docx_path, provider, model, db_path, case_config, max_retries, prompt_variant
            )
            proc = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=300,
                cwd=str(NATASCHA_ROOT),
            )
        elapsed_ms = int((time.monotonic() - start) * 1000)
        entry["laufzeitMs"] = elapsed_ms

        if proc.returncode != 0:
            entry["errorCode"] = classify_cli_error(proc.stderr)
            entry["status"] = (
                "rate_limited" if entry["errorCode"] == "rate_limited" else "fehler"
            )
            print(f" FEHLER ({elapsed_ms}ms, {entry['errorCode']})")
            return entry

        stdout = proc.stdout.strip()
        if not stdout:
            entry["status"] = "fehler"
            entry["errorCode"] = "empty_stdout"
            print(" FEHLER (leer)")
            return entry

        result = json.loads(stdout)
        analysis = result.get("analysis") if isinstance(result, dict) else None
        schema_valid, schema_error = validate_analysis_schema(analysis)
        if isinstance(analysis, dict):
            fehler_list = analysis.get("fehler", [])
            note = (analysis.get("notenempfehlung") or {}).get("note")
            entry["fehlerAnzahl"] = len(fehler_list) if isinstance(fehler_list, list) else None
            entry["note"] = note
        entry["schemaValid"] = schema_valid
        warnings = result.get("qualityWarnings", []) if isinstance(result, dict) else []
        entry["qualityWarningCount"] = len(warnings) if isinstance(warnings, list) else 0
        if include_review_data:
            entry["reviewData"] = (
                review_data_from_analysis(analysis) if isinstance(analysis, dict) else {}
            )

        if not schema_valid:
            entry["status"] = "schema_fehler"
            entry["errorCode"] = schema_error
            print(" SCHEMA-FEHLER")
        else:
            entry["status"] = "erfolg"
            print(f" OK ({elapsed_ms}ms, {entry['fehlerAnzahl']} Fehler, Note {entry['note']})")
    except subprocess.TimeoutExpired:
        entry["status"] = "timeout"
        entry["errorCode"] = "timeout"
        print(" TIMEOUT")
    except json.JSONDecodeError:
        entry["status"] = "fehler"
        entry["errorCode"] = "json_parse"
        print(" JSON-FEHLER")
    except Exception:
        entry["status"] = "fehler"
        entry["errorCode"] = "unexpected"
        print(" FEHLER")
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(description="LUKA Benchmark-Runner")
    parser.add_argument("--provider", default="mistral")
    parser.add_argument("--model", default="mistral-medium-3-5")
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument(
        "--dry-run", action="store_true", help="Manifest und Ablauf ohne API-Aufruf pruefen"
    )
    parser.add_argument("--config", default=None, help="Pfad zu Alternativ-Config (JSON)")
    parser.add_argument(
        "--manifest", default=str(MANIFEST_FILE), help="Lokales Fall-Manifest (JSON)"
    )
    parser.add_argument(
        "--output", default=str(EVAL_FILE), help="Lokales Auswertungsprotokoll (JSON)"
    )
    parser.add_argument(
        "--run-label", default=None, help="Neutrale Kennung fuer einen Wiederholungslauf"
    )
    parser.add_argument(
        "--prompt-variant", choices=("neutral", "legacy"), default="neutral",
        help="Fehlerdichte-Prompt fuer den lokalen A/B-Benchmark",
    )
    parser.add_argument(
        "--include-review-data", action="store_true",
        help=(
            "Lokale Fehlerzitate/Korrekturen und Notenbegründung "
            "für die Lehrkraftprüfung speichern"
        ),
    )
    args = parser.parse_args()

    config = dict(DEFAULT_CONFIG)
    if args.config:
        config.update(json.loads(Path(args.config).read_text(encoding="utf-8")))

    try:
        data_class, cases = load_case_manifest(Path(args.manifest))
    except ValueError as error:
        print(f"Fehler: {error}", file=sys.stderr)
        return 1

    print(f"Benchmark: {len(cases)} Faelle, Provider={args.provider}, Model={args.model}")
    if args.dry_run:
        print("(Dry-Run — keine API-Aufrufe)")

    runs = [
        run_single_case(
            case, args.provider, args.model, config, args.max_retries,
            dry_run=args.dry_run, prompt_variant=args.prompt_variant,
            include_review_data=args.include_review_data,
        )
        for case in cases
    ]
    erfolg = sum(1 for run in runs if run["status"] == "erfolg")
    fehler = sum(1 for run in runs if run["status"] == "fehler")
    rate_limited = sum(1 for run in runs if run["status"] == "rate_limited")
    timeout = sum(1 for run in runs if run["status"] == "timeout")
    schema_fehler = sum(1 for run in runs if run["status"] == "schema_fehler")
    print(
        f"\nErgebnis: {erfolg} OK, {fehler} Fehler, {rate_limited} Rate-Limits, {timeout} Timeout, "
        f"{schema_fehler} Schema-Fehler"
    )

    evaluation = {
        "metadata": {
            "date": datetime.now(timezone.utc).isoformat(),
            "provider": args.provider,
            "model": args.model,
            "dataClass": data_class,
            "densityPromptVariant": args.prompt_variant,
            "containsReviewExcerpts": args.include_review_data,
            "runLabel": args.run_label or f"run-{uuid.uuid4().hex[:12]}",
            "runId": str(uuid.uuid4()),
        },
        "runs": runs,
        "gate": {
            "kritischeHalluzinationen": None,
            "zitateBelegbarProzent": None,
            "verwendbarProzent": None,
            "entscheidung": None,
        },
    }
    try:
        output_file = resolve_protocol_output(args.output)
    except ValueError as error:
        print(f"Fehler: {error}", file=sys.stderr)
        return 1
    output_file.write_text(
        json.dumps(evaluation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Protokoll geschrieben: {output_file}")
    return 0 if fehler == 0 and rate_limited == 0 and timeout == 0 and schema_fehler == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
