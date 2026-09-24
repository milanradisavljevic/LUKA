"""Tests für den datensicheren lokalen Benchmark-Runner."""

from __future__ import annotations

import builtins
import importlib.util
import json
import subprocess
from pathlib import Path

import pytest

RUNNER_PATH = Path(__file__).resolve().parent.parent / "benchmarks" / "run_benchmark.py"
SPEC = importlib.util.spec_from_file_location("benchmark_runner", RUNNER_PATH)
assert SPEC is not None and SPEC.loader is not None
benchmark_runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(benchmark_runner)

EVALUATOR_PATH = Path(__file__).resolve().parent.parent / "benchmarks" / "evaluiere.py"
EVALUATOR_SPEC = importlib.util.spec_from_file_location("benchmark_evaluator", EVALUATOR_PATH)
assert EVALUATOR_SPEC is not None and EVALUATOR_SPEC.loader is not None
benchmark_evaluator = importlib.util.module_from_spec(EVALUATOR_SPEC)
EVALUATOR_SPEC.loader.exec_module(benchmark_evaluator)


def test_manifest_erfordert_neutrale_id_und_zulaessige_datenklasse(
    tmp_path: Path, monkeypatch
) -> None:
    cases_dir = tmp_path / "cases"
    cases_dir.mkdir()
    (cases_dir / "case-001.docx").write_bytes(b"synthetic")
    manifest = cases_dir / "manifest.json"
    manifest.write_text(
        json.dumps(
            {"dataClass": "synthetic", "cases": [{"id": "case-001", "file": "case-001.docx"}]}
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(benchmark_runner, "CASES_DIR", cases_dir)

    data_class, cases = benchmark_runner.load_case_manifest(manifest)

    assert data_class == "synthetic"
    assert cases[0]["id"] == "case-001"
    assert cases[0]["path"] == cases_dir / "case-001.docx"


def test_manifest_lehnt_nicht_freigegebene_datenklasse_ab(tmp_path: Path) -> None:
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps({"dataClass": "real", "cases": []}), encoding="utf-8")

    with pytest.raises(ValueError, match="dataClass"):
        benchmark_runner.load_case_manifest(manifest)


def test_cli_aktiviert_pseudonymisierung_und_verwendet_plattformpfad(tmp_path: Path) -> None:
    args = benchmark_runner.build_cli_args(
        tmp_path / "case-001.docx",
        "mistral",
        "mistral-medium-3-5",
        tmp_path / "temporary" / "case.db",
        benchmark_runner.DEFAULT_CONFIG,
        1,
    )

    assert "--keine-pseudonymisierung" not in args
    assert str(tmp_path / "temporary" / "case.db") in args
    assert args[args.index("--land") + 1] == "at"
    assert args[args.index("--benchmark-fehlerdichte-prompt") + 1] == "neutral"

    legacy_args = benchmark_runner.build_cli_args(
        tmp_path / "case-001.docx", "mistral", "mistral-medium-3-5",
        tmp_path / "temporary" / "case-legacy.db", benchmark_runner.DEFAULT_CONFIG, 1,
        prompt_variant="legacy",
    )
    assert legacy_args[legacy_args.index("--benchmark-fehlerdichte-prompt") + 1] == "legacy"


def test_reviewauszug_enthaelt_nur_noetige_prueffelder() -> None:
    review = benchmark_runner.review_data_from_analysis({
        "datei": "private.docx",
        "rohtext": "Vollständiger Schülertext",
        "fehler": [{
            "zitat": "synthetischer Quote", "korrektur": "Korrektur", "typ": "G",
            "erklaerung": "Regel", "interneNotiz": "nicht übernehmen",
        }],
        "notenempfehlung": {
            "note": 2, "bezeichnung": "gut", "begruendung": "plausibel", "secret": "x",
        },
        "zusammenfassung": "Synthetische Zusammenfassung",
    })

    serialized = json.dumps(review, ensure_ascii=False)
    assert "Vollständiger Schülertext" not in serialized
    assert "private.docx" not in serialized
    assert "interneNotiz" not in serialized and "secret" not in serialized
    assert "synthetischer Quote" in serialized


def test_protokollpfad_bleibt_im_ignorierten_benchmark_ordner(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(benchmark_runner, "BENCH_DIR", tmp_path)
    assert benchmark_runner.resolve_protocol_output("ab-neutral.json") == (
        tmp_path / "ab-neutral.json"
    )
    with pytest.raises(ValueError, match="nur lokal"):
        benchmark_runner.resolve_protocol_output(tmp_path.parent / "leak.json")
    with pytest.raises(ValueError, match="Manifest"):
        benchmark_runner.resolve_protocol_output("manifest.json")


def test_protokoll_enthaelt_weder_dateiname_noch_rohe_fehler(tmp_path: Path, monkeypatch) -> None:
    source = tmp_path / "person-name.docx"
    source.write_bytes(b"synthetic")
    monkeypatch.setattr(benchmark_runner, "validate_analysis_schema", lambda _: (True, None))
    monkeypatch.setattr(
        benchmark_runner.subprocess,
        "run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args=args[0],
            returncode=0,
            stdout=json.dumps(
                {"analysis": {"fehler": [], "notenempfehlung": {"note": 2}}, "qualityWarnings": []}
            ),
            stderr="private detail",
        ),
    )

    entry = benchmark_runner.run_single_case(
        {"id": "case-001", "path": source},
        "mistral",
        "mistral-medium-3-5",
        benchmark_runner.DEFAULT_CONFIG,
        1,
    )

    protocol = json.dumps(entry)
    assert entry["status"] == "erfolg"
    assert "person-name" not in protocol
    assert "private detail" not in protocol


def test_timeout_wird_ohne_rohfehler_kategorisiert(tmp_path: Path, monkeypatch) -> None:
    source = tmp_path / "case-001.docx"
    source.write_bytes(b"synthetic")

    def timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(args[0], 300, stderr="private detail")

    monkeypatch.setattr(benchmark_runner.subprocess, "run", timeout)
    entry = benchmark_runner.run_single_case(
        {"id": "case-001", "path": source}, "mistral", "mistral-medium-3-5",
        benchmark_runner.DEFAULT_CONFIG, 1,
    )

    assert entry["status"] == "timeout"
    assert entry["errorCode"] == "timeout"
    assert "private detail" not in json.dumps(entry)


def test_rate_limit_wird_ohne_rohfehler_eindeutig_kategorisiert(
    tmp_path: Path, monkeypatch
) -> None:
    source = tmp_path / "case-001.docx"
    source.write_bytes(b"synthetic")
    monkeypatch.setattr(
        benchmark_runner.subprocess,
        "run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args=args[0], returncode=1, stdout="", stderr="FEHLER: [rate_limited]"
        ),
    )

    entry = benchmark_runner.run_single_case(
        {"id": "case-001", "path": source}, "mistral", "mistral-medium-3-5",
        benchmark_runner.DEFAULT_CONFIG, 0,
    )

    assert entry["status"] == "rate_limited"
    assert entry["errorCode"] == "rate_limited"


def test_promptvariante_wird_im_lokalen_protokoll_markiert(tmp_path: Path) -> None:
    source = tmp_path / "case-001.docx"
    source.write_bytes(b"synthetic")

    entry = benchmark_runner.run_single_case(
        {"id": "case-001", "path": source}, "mistral", "mistral-medium-3-5",
        benchmark_runner.DEFAULT_CONFIG, 1, dry_run=True, prompt_variant="legacy",
    )

    assert entry["promptVariant"] == "legacy"
    assert entry["status"] == "dry_run"


def test_freigabe_gate_erfordert_zwei_vollstaendige_laeufe() -> None:
    runs = [{
        "lehrkBewertung": {
            "fehlererkennung": "ja",
            "textzitate": "ja",
            "note_plausibel": "ja",
            "feedback_brauchbar": "ja",
        },
        "status": "erfolg",
    }]

    first_gate = benchmark_evaluator.berechne_gate(runs, vollstaendige_laeufe=1)
    second_gate = benchmark_evaluator.berechne_gate(runs, vollstaendige_laeufe=2)

    assert "Zweiter" in first_gate["entscheidung"]
    assert second_gate["entscheidung"] == "Medium 3.5 als Standard freigeben"
    assert second_gate["fehlererkennungProzent"] == 100.0
    assert second_gate["notePlausibelProzent"] == 100.0


def test_gate_beachtet_fehlererkennung_notenplausibilitaet_und_vollstaendige_bewertung() -> None:
    runs = [{
        "status": "erfolg",
        "lehrkBewertung": {
            "fehlererkennung": "ja",
            "textzitate": "ja",
            "note_plausibel": "nein",
            "feedback_brauchbar": "ja",
        },
    }]
    result = benchmark_evaluator.berechne_gate(runs, vollstaendige_laeufe=2)
    assert result["notePlausibelProzent"] == 0.0
    assert result["entscheidung"] == "Nachbesserung erforderlich"

    runs[0]["lehrkBewertung"].pop("fehlererkennung")
    incomplete = benchmark_evaluator.berechne_gate(runs, vollstaendige_laeufe=2)
    assert incomplete["entscheidung"] == "Lehrkraft-Bewertung unvollständig"
    assert incomplete["notePlausibelProzent"] is None


def _vollstaendiger_lauf(
    run_id: str,
    label: str,
    cases: tuple[str, ...] = ("case-de-1", "case-en-1"),
) -> dict:
    return {
        "metadata": {
            "provider": "mistral",
            "model": "mistral-medium-3-5",
            "dataClass": "synthetic",
            "densityPromptVariant": "neutral",
            "runId": run_id,
            "runLabel": label,
        },
        "runs": [
            {
                "caseId": case_id, "status": "erfolg", "schemaValid": True,
                "promptVariant": "neutral",
            }
            for case_id in cases
        ],
    }


def test_zweiter_lauf_muss_eigenstaendig_gleiches_modell_und_faelle_abdecken() -> None:
    first = _vollstaendiger_lauf("run-id-1", "run-1")
    second = _vollstaendiger_lauf("run-id-2", "run-2")
    assert benchmark_evaluator.sind_kompatible_laeufe(first, second)
    assert not benchmark_evaluator.sind_kompatible_laeufe(first, first)

    changed_cases = _vollstaendiger_lauf("run-id-3", "run-3", ("case-de-1",))
    assert not benchmark_evaluator.sind_kompatible_laeufe(first, changed_cases)

    changed_model = _vollstaendiger_lauf("run-id-4", "run-4")
    changed_model["metadata"]["model"] = "another-model"
    assert not benchmark_evaluator.sind_kompatible_laeufe(first, changed_model)

    changed_prompt = _vollstaendiger_lauf("run-id-7", "run-7")
    changed_prompt["metadata"]["densityPromptVariant"] = "legacy"
    assert not benchmark_evaluator.sind_kompatible_laeufe(first, changed_prompt)


def test_unvollstaendige_oder_strukturell_ungueltige_protokolle_zaehlen_nicht() -> None:
    assert not benchmark_evaluator.ist_vollstaendiger_lauf([])
    assert not benchmark_evaluator.ist_vollstaendiger_lauf({"runs": []})

    failed_case = _vollstaendiger_lauf("run-id-5", "run-5")
    failed_case["runs"][0]["status"] = "rate_limited"
    assert not benchmark_evaluator.ist_vollstaendiger_lauf(failed_case)

    duplicate_case = _vollstaendiger_lauf("run-id-6", "run-6", ("case-de-1", "case-de-1"))
    assert not benchmark_evaluator.ist_vollstaendiger_lauf(duplicate_case)


def test_per_case_config_wird_auf_globalen_config_gemergt(tmp_path: Path) -> None:
    """4C.1: Whitelist-Override je Fall schlägt DEFAULT_CONFIG (EN-Satz)."""
    source = tmp_path / "case-en.docx"
    source.write_bytes(b"synthetic")
    case = {
        "id": "case-en-a2-essay",
        "path": source,
        "config": {
            "fach": "Englisch",
            "land": "de",
            "aufgabe": "essay-test",
            "schulstufe": "Unterstufe",
            "rubric": "englisch_a2.md",
            "textsorte": "Essay",
            "klasse": "benchmark-en",
        },
    }

    entry = benchmark_runner.run_single_case(
        case, "mistral", "mistral-medium-3-5", benchmark_runner.DEFAULT_CONFIG, 1,
        dry_run=True,
    )

    # Mischtabelle: Klasse/Textsorte/Rubrik je Fall in der Ausgabe
    assert entry["fach"] == "Englisch"
    assert entry["land"] == "de"
    assert entry["aufgabe"] == "essay-test"
    assert entry["rubric"] == "englisch_a2.md"
    assert entry["textsorte"] == "Essay"
    assert entry["klasse"] == "benchmark-en"
    assert entry["schulstufe"] == "Unterstufe"
    assert entry["bewertungsmodus"] == "benotet"
    assert entry["status"] == "dry_run"
    # Globaler Fallback greift für nicht überschriebene Felder
    assert entry["note"] is None


def test_ab_vergleich_paarung_und_expliziter_lehrkraftintervention() -> None:
    ratings = {
        "fehlererkennung": "ja",
        "textzitate": "ja",
        "note_plausibel": "teilweise",
        "feedback_brauchbar": "teilweise",
        "lehrkraftintervention": "einzelne",
    }

    def evaluation(variant: str, run_id: str) -> dict:
        result = _vollstaendiger_lauf(run_id, run_id)
        result["metadata"]["densityPromptVariant"] = variant
        for index, run in enumerate(result["runs"]):
            run.update({
                "promptVariant": variant,
                "klasse": "benchmark",
                "fach": "Deutsch",
                "textsorte": "Kommentar",
                "rubric": "comment.md",
                "fehlerAnzahl": 2 + index,
                "note": 3 + index,
                "qualityWarningCount": 0,
                "lehrkBewertung": dict(ratings),
            })
        return result

    legacy = evaluation("legacy", "run-legacy")
    neutral = evaluation("neutral", "run-neutral")
    assert not benchmark_evaluator.ist_vollstaendiger_lauf(legacy)
    assert not benchmark_evaluator.sind_kompatible_laeufe(
        legacy, evaluation("legacy", "run-legacy-repeat")
    )
    result = benchmark_evaluator.vergleiche_fehlerdichte_ab(legacy, neutral)

    assert result["deltaNeutralMinusLegacy"]["mittlereFehlerAnzahl"] == 0
    assert result["neutral"]["lehrkraftintervention"] == {
        "keine": 0, "einzelne": 2, "wesentliche": 0,
    }
    assert result["deltaLehrkraftinterventionProzent"]["einzelne"] == 0
    assert "keine automatische" in result["hinweis"]

    missing_intervention = evaluation("legacy", "run-legacy-missing")
    missing_intervention["runs"][0]["lehrkBewertung"].pop("lehrkraftintervention")
    with pytest.raises(ValueError, match="Lehrkraftintervention"):
        benchmark_evaluator.vergleiche_fehlerdichte_ab(missing_intervention, neutral)


def test_ab_bewertung_erfasst_eingriff_ohne_regulaeres_gate_zu_erweitern(monkeypatch) -> None:
    answers = iter(["j", "j", "t", "j", "2"])
    monkeypatch.setattr(builtins, "input", lambda _prompt: next(answers))

    assessment = benchmark_evaluator.bewerte_fall(
        {"caseId": "case-smoke", "reviewData": {}}, a_b=True
    )

    assert assessment["lehrkraftintervention"] == "wesentliche"
    assert benchmark_evaluator._bewertung_vollstaendig(assessment)


def test_manifest_und_docx_liegen_neben_einander(tmp_path: Path) -> None:
    """cases_en/: Pfade relativ zum Manifest-Ordner, nicht nur zu CASES_DIR."""
    cases_en = tmp_path / "cases_en"
    cases_en.mkdir()
    (cases_en / "sample.docx").write_bytes(b"synthetic")
    manifest = cases_en / "manifest.json"
    manifest.write_text(
        json.dumps(
            {"dataClass": "synthetic", "cases": [{"id": "case-en-sample", "file": "sample.docx"}]}
        ),
        encoding="utf-8",
    )

    data_class, cases = benchmark_runner.load_case_manifest(manifest)

    assert data_class == "synthetic"
    assert cases[0]["path"] == cases_en / "sample.docx"


def test_referenzabgleich_ordnet_bekannte_fehler_zu_und_wertet_rest_nicht_automatisch(
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setattr(benchmark_evaluator, "BENCH_DIR", tmp_path)
    reference_path = tmp_path / "reference_findings.json"
    reference_path.write_text(
        json.dumps(
            {
                "dataClass": "synthetic",
                "cases": {
                    "case-001": {
                        "expectedLanguageFindings": [
                            {
                                "quote": "Die Gruppe sollten beginnen.",
                                "correction": "Die Gruppe sollte beginnen.",
                                "category": "G",
                            }
                        ]
                    },
                    "case-002": {"expectedLanguageFindings": []},
                },
            }
        ),
        encoding="utf-8",
    )
    references = benchmark_evaluator.load_reference_findings(reference_path)
    result = benchmark_evaluator.vergleiche_referenzbefunde(
        [
            {
                "caseId": "case-001",
                "status": "erfolg",
                "reviewData": {
                    "fehler": [
                        {
                            "zitat": "Die Gruppe sollten beginnen.",
                            "korrektur": "Die Gruppe sollte beginnen.",
                            "typ": "G",
                        },
                        {
                            "zitat": "Ein weiterer Vorschlag",
                            "korrektur": "Andere Formulierung",
                            "typ": "A",
                        },
                    ]
                },
            },
            {"caseId": "case-002", "status": "erfolg", "reviewData": {"fehler": []}},
        ],
        references,
    )

    assert result["erwarteteBefunde"] == 1
    assert result["zugeordneteBefunde"] == 1
    assert result["fehlendeBefunde"] == 0
    assert result["nichtZugeordneteModellvorschlaege"] == 1
    assert result["erkennungsquoteProzent"] == 100.0
    assert "keine automatisch bestätigten" in result["hinweis"]


def test_referenzabgleich_verlangt_reviewdaten_und_passende_fallmenge() -> None:
    references = {"case-001": []}
    with pytest.raises(ValueError, match="include-review-data"):
        benchmark_evaluator.vergleiche_referenzbefunde(
            [{"caseId": "case-001", "status": "erfolg"}], references
        )
    with pytest.raises(ValueError, match="exakt dieselben"):
        benchmark_evaluator.vergleiche_referenzbefunde(
            [{"caseId": "case-002", "status": "erfolg", "reviewData": {"fehler": []}}],
            references,
        )
