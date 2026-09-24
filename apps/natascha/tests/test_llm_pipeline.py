"""Tests für die LLM-Analyse-Pipeline in natascha_core."""

from __future__ import annotations

import json
import sys
import threading
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc

FIXTURES = Path(__file__).parent / "fixtures"


# =====================================================================
# Helpers
# =====================================================================

def _load_config() -> dict:
    return nc.load_config()


def _load_beispiel_fixture() -> dict:
    return json.loads(
        (FIXTURES / "beispiel_deutsch_mit_fehlern.json").read_text(encoding="utf-8")
    )


def test_run_llm_api_dispatches_qwen_openai_compatible(monkeypatch) -> None:
    monkeypatch.setenv("QWEN_API_KEY", "test-key")
    config = _load_config()
    config["api"]["provider"] = "qwen"
    config["api"]["model"] = "qwen-plus"

    calls = []

    def fake_call(base_url, api_key, model, prompt, timeout, **kwargs):
        calls.append((base_url, api_key, model, prompt, kwargs))
        return "OK"

    monkeypatch.setattr(nc, "_call_openai_compat", fake_call)

    assert nc.run_llm_api("Ping", config) == "OK"
    base_url, api_key, model, prompt, kwargs = calls[0]
    assert base_url == "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    assert api_key == "test-key"
    assert model == "qwen-plus"
    assert prompt == "Ping"
    assert kwargs["extra_body"] == {"enable_thinking": False}


def test_run_llm_api_dispatches_mistral_openai_compatible(monkeypatch) -> None:
    monkeypatch.setenv("MISTRAL_API_KEY", "test-mistral-key")
    config = _load_config()
    config["api"]["provider"] = "mistral"
    config["api"]["model"] = "mistral-large-latest"

    calls = []

    def fake_call(base_url, api_key, model, prompt, timeout, **kwargs):
        calls.append((base_url, api_key, model, prompt, kwargs))
        return "OK"

    monkeypatch.setattr(nc, "_call_openai_compat", fake_call)

    assert nc.run_llm_api("Ping", config) == "OK"
    base_url, api_key, model, prompt, kwargs = calls[0]
    assert base_url == "https://api.mistral.ai/v1"
    assert api_key == "test-mistral-key"
    assert model == "mistral-large-latest"
    assert prompt == "Ping"
    assert kwargs["extra_body"] == {"response_format": {"type": "json_object"}}


def test_run_llm_api_dispatches_deepseek_with_thinking_disabled_and_dynamic_budget(monkeypatch) -> None:
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-deepseek-key")
    config = _load_config()
    config["api"]["provider"] = "deepseek"
    config["api"]["model"] = "deepseek-flash"

    calls = []

    def fake_call(base_url, api_key, model, prompt, timeout, **kwargs):
        calls.append((base_url, api_key, model, prompt, kwargs))
        return "OK"

    monkeypatch.setattr(nc, "_call_openai_compat", fake_call)

    assert nc.run_llm_api("Ping", config) == "OK"
    base_url, api_key, model, prompt, kwargs = calls[0]
    assert base_url == "https://api.deepseek.com/v1"
    assert api_key == "test-deepseek-key"
    assert model == "deepseek-flash"
    assert prompt == "Ping"
    assert kwargs["extra_body"] == {
        "response_format": {"type": "json_object"},
        "thinking": {"type": "disabled"},
    }
    assert kwargs["max_tokens"] == 8192


class _FakeOpenAICompatResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps(self._payload).encode("utf-8")


def test_reasoning_content_fallback(monkeypatch) -> None:
    payload = {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "content": "",
                    "reasoning_content": "Gedankengang",
                },
            }
        ]
    }

    def fake_urlopen(req, timeout=None):
        return _FakeOpenAICompatResponse(payload)

    monkeypatch.setattr(nc.urllib.request, "urlopen", fake_urlopen)

    result = nc._call_openai_compat(
        "https://api.deepseek.com/v1",
        "test-key",
        "deepseek-reasoner",
        "Ping",
        timeout=5,
    )

    assert result == "Gedankengang"


def test_length_error_when_answer_missing(monkeypatch) -> None:
    payload = {
        "choices": [
            {
                "finish_reason": "length",
                "message": {"content": "", "reasoning_content": ""},
            }
        ]
    }

    def fake_urlopen(req, timeout=None):
        return _FakeOpenAICompatResponse(payload)

    monkeypatch.setattr(nc.urllib.request, "urlopen", fake_urlopen)

    result = nc._call_openai_compat(
        "https://api.deepseek.com/v1",
        "test-key",
        "deepseek-reasoner",
        "Ping",
        timeout=5,
    )

    assert result.startswith("FEHLER: [output_truncated]")


def test_truncated_partial_answer_is_not_returned_as_valid_result(monkeypatch) -> None:
    payload = {"choices": [{"finish_reason": "length", "message": {"content": '{"note":'}}]}
    monkeypatch.setattr(nc.urllib.request, "urlopen", lambda req, timeout=None: _FakeOpenAICompatResponse(payload))
    result = nc._call_openai_compat("https://api.deepseek.com/v1", "key", "deepseek-flash", "Ping", timeout=5)
    assert result.startswith("FEHLER: [output_truncated]")
    assert "note" not in result


def test_rate_limit_is_not_retried_and_raw_body_is_hidden(monkeypatch) -> None:
    from urllib.error import HTTPError

    calls = []

    def fail_with_429(req, timeout=None):
        calls.append(1)
        raise HTTPError(req.full_url, 429, "limited", {}, None)

    monkeypatch.setattr(nc.urllib.request, "urlopen", fail_with_429)
    result = nc._call_openai_compat("https://api.deepseek.com/v1", "key", "deepseek-flash", "Ping", timeout=5)
    assert result.startswith("FEHLER: [rate_limited]")
    assert calls == [1]


# =====================================================================
# extract_json_from_llm
# =====================================================================

class TestExtractJsonFromLlm:
    """Tests für die JSON-Extraktion aus LLM-Rohantworten."""

    def test_plain_json(self) -> None:
        """Reines JSON ohne Formatierung."""
        raw = '{"datei": "test.docx", "notenempfehlung": {"durchschnitt": 3, "note": 3, "bezeichnung": "x", "begruendung": "x"}, "bewertung": {"inhalt": {"stufe": "x", "punkte": 3, "staerken": [], "schwaechen": [], "vorschlaege": []}}}'
        result = nc.extract_json_from_llm(raw)
        assert result["datei"] == "test.docx"

    def test_markdown_fenced_json(self) -> None:
        """JSON in ```json-Block."""
        raw = '```json\n{"datei": "test.docx", "notenempfehlung": {"durchschnitt": 2, "note": 2, "bezeichnung": "x", "begruendung": "x"}, "bewertung": {"inhalt": {"stufe": "x", "punkte": 4, "staerken": [], "schwaechen": [], "vorschlaege": []}}}\n```'
        result = nc.extract_json_from_llm(raw)
        assert result["datei"] == "test.docx"

    def test_json_with_surrounding_text(self) -> None:
        """JSON mit erklärendem Text davor/danach."""
        raw = (
            "Hier ist die Analyse:\n\n"
            '{"datei": "test.docx", "notenempfehlung": {"durchschnitt": 4, "note": 4, "bezeichnung": "x", "begruendung": "x"}, "bewertung": {"inhalt": {"stufe": "x", "punkte": 2, "staerken": [], "schwaechen": [], "vorschlaege": []}}}\n\n'
            "Hoffe das hilft!"
        )
        result = nc.extract_json_from_llm(raw)
        assert result["datei"] == "test.docx"

    def test_raises_on_invalid_json(self) -> None:
        """Ungültiges JSON sollte JSONDecodeError werfen."""
        raw = "Das ist kein JSON"
        import json as _json
        try:
            nc.extract_json_from_llm(raw)
            assert False, "Expected JSONDecodeError"
        except (_json.JSONDecodeError, TypeError):
            pass  # expected

    def test_raises_on_empty_string(self) -> None:
        """Leere Eingabe sollte Fehler werfen."""
        try:
            nc.extract_json_from_llm("")
            assert False, "Expected error"
        except (json.JSONDecodeError, TypeError, IndexError):
            pass  # expected


# =====================================================================
# validate_against_schema
# =====================================================================

class TestValidateAgainstSchema:
    """Tests für die Schema-Validierung."""

    def test_valid_fixture_passes(self) -> None:
        """Synthetisches Fixture sollte ohne Fehler validieren."""
        data = _load_beispiel_fixture()
        schema = nc.load_schema(_load_config())
        errors = nc.validate_against_schema(data, schema)
        assert errors == [], f"Unerwartete Fehler: {errors}"

    def test_missing_required_field_fails(self) -> None:
        """Fehlendes Pflichtfeld sollte Fehler liefern."""
        schema = nc.load_schema(_load_config())
        data = {"datei": "test.docx"}  # fehlt: fach, schulstufe, etc.
        errors = nc.validate_against_schema(data, schema)
        assert len(errors) > 0

    def test_invalid_note_range(self) -> None:
        """Note außerhalb von 1-5 sollte Fehler liefern."""
        data = _load_beispiel_fixture()
        data["notenempfehlung"]["note"] = 7
        schema = nc.load_schema(_load_config())
        errors = nc.validate_against_schema(data, schema)
        assert any("maximum" in e.lower() or "7" in e for e in errors), f"Errors: {errors}"

    def test_no_schema_returns_empty(self) -> None:
        """Ohne Schema sollte die Validierung leer zurückgeben."""
        errors = nc.validate_against_schema({"any": "data"}, {})
        assert errors == []


# =====================================================================
# _build_retry_prompt
# =====================================================================

class TestBuildRetryPrompt:
    """Tests für den Retry-Prompt-Builder."""

    def test_contains_error_message(self) -> None:
        prompt = nc._build_retry_prompt("original", "JSON fehlt", "raw", 1)
        assert "JSON fehlt" in prompt

    def test_contains_attempt_number(self) -> None:
        prompt = nc._build_retry_prompt("original", "err", "raw", 2)
        assert "Versuch 2" in prompt

    def test_contains_raw_response_snippet(self) -> None:
        prompt = nc._build_retry_prompt("original", "err", "sehr lange Antwort XYZ", 1)
        assert "XYZ" in prompt

    def test_truncates_long_raw(self) -> None:
        long_raw = "A" * 5000
        prompt = nc._build_retry_prompt("original", "err", long_raw, 1)
        # Sollte gekürzt sein
        assert len(prompt) < 5000


# =====================================================================
# run_llm_analysis – mit gemocktem API
# =====================================================================

class TestRunLlmAnalysis:
    """Integrationstests für run_llm_analysis() mit gemocktem API."""

    def _make_config(self) -> dict:
        config = _load_config()
        config["api"]["provider"] = "openai"
        return config

    def _mock_api_success(self, *args, **kwargs) -> str:
        """Simuliert eine gültige JSON-Antwort."""
        fixture = _load_beispiel_fixture()
        return json.dumps(fixture, ensure_ascii=False)

    def _mock_api_invalid_json(self, *args, **kwargs) -> str:
        """Simuliert eine Antwort ohne JSON."""
        return "Das kann ich leider nicht analysieren."

    def _mock_api_schema_violation(self, *args, **kwargs) -> str:
        """Simuliert JSON, das gegen das Schema verstößt."""
        return json.dumps({
            "datei": "test.docx",
            "notenempfehlung": {"note": 99},  # invalid
        }, ensure_ascii=False)

    def _mock_api_error(self, *args, **kwargs) -> str:
        """Simuliert einen API-Fehler."""
        return "FEHLER: API nicht erreichbar"

    def test_success_on_first_try(self, tmp_path: Path) -> None:
        """Erfolgreiche Analyse beim ersten Versuch."""
        config = self._make_config()
        with patch.object(nc, "run_llm_api", side_effect=self._mock_api_success):
            data, errors = nc.run_llm_analysis(
                docx_text="Testtext",
                rubric_content="Rubrik",
                fach="Deutsch",
                schulstufe="Oberstufe",
                textsorte="Eroerterung",
                config=config,
                max_retries=3,
            )
        assert errors == []
        assert data is not None
        assert data["schueler"] == "TokenA SuffixA"

    def test_note_begruendung_warnung_ist_strukturiert_und_getrennt(self) -> None:
        config = self._make_config()
        fixture = _load_beispiel_fixture()
        fixture["notenempfehlung"] = {"note": 1, "begruendung": "schwache Argumentation"}
        with patch.object(nc, "run_llm_api", return_value=json.dumps(fixture, ensure_ascii=False)):
            data, errors = nc.run_llm_analysis(
                docx_text="Testtext",
                rubric_content="Rubrik",
                fach="Deutsch",
                schulstufe="Oberstufe",
                textsorte="Eroerterung",
                config=config,
                bewertungsmodus="unbenotet",
            )
        assert data is not None
        assert data["qualitaetswarnungen"][0]["code"] == "note_begruendung_widerspruch"
        assert any("Qualitätswarnung:" in error for error in errors)

    def test_direct_ausgangstext_is_kept_in_analysis_prompt(self) -> None:
        """Der aus LUA kommende Textinhalt darf nicht als Dateipfad behandelt werden."""
        config = self._make_config()
        prompts: list[str] = []

        def mock_api(prompt: str, *args, **kwargs) -> str:
            prompts.append(prompt)
            return self._mock_api_success()

        with patch.object(nc, "run_llm_api", side_effect=mock_api):
            data, errors = nc.run_llm_analysis(
                docx_text="Schülertext",
                rubric_content="Rubrik",
                fach="Deutsch",
                schulstufe="Unterstufe",
                textsorte="Kommentar",
                config=config,
                ausgangstext_text="Der zuvor gelesene Ausgangstext.",
                max_retries=1,
            )

        assert data is not None
        assert errors == []
        assert prompts
        assert "Der zuvor gelesene Ausgangstext." in prompts[0]

    def test_retry_on_invalid_json(self, tmp_path: Path) -> None:
        """Retry wenn JSON-Extraktion fehlschlägt."""
        config = self._make_config()
        call_count = [0]

        def mock_with_recovery(*args, **kwargs) -> str:
            call_count[0] += 1
            if call_count[0] < 2:
                return self._mock_api_invalid_json()
            return self._mock_api_success()

        with patch.object(nc, "run_llm_api", side_effect=mock_with_recovery):
            data, errors = nc.run_llm_analysis(
                docx_text="Testtext",
                rubric_content="Rubrik",
                fach="Deutsch",
                schulstufe="Oberstufe",
                textsorte="Eroerterung",
                config=config,
                max_retries=3,
            )
        assert call_count[0] == 3  # 2 Analyse-Versuche + 1 SRDP-Detail-Call
        assert data is not None

    def test_fails_after_max_retries(self, tmp_path: Path) -> None:
        """Scheitert nach maximalen Retry-Versuchen."""
        config = self._make_config()
        with patch.object(nc, "run_llm_api", side_effect=self._mock_api_invalid_json):
            data, errors = nc.run_llm_analysis(
                docx_text="Testtext",
                rubric_content="Rubrik",
                fach="Deutsch",
                schulstufe="Oberstufe",
                textsorte="Eroerterung",
                config=config,
                max_retries=2,
            )
        assert data is None
        assert len(errors) > 0
        assert "schema_invalid" in errors[-1]

    def test_api_error_no_retry(self, tmp_path: Path) -> None:
        """API-Fehler sollte sofort abbrechen (kein Retry)."""
        config = self._make_config()
        call_count = [0]

        def mock_api_error(*args, **kwargs) -> str:
            call_count[0] += 1
            return self._mock_api_error()

        with patch.object(nc, "run_llm_api", side_effect=mock_api_error):
            data, errors = nc.run_llm_analysis(
                docx_text="Testtext",
                rubric_content="Rubrik",
                fach="Deutsch",
                schulstufe="Oberstufe",
                textsorte="Eroerterung",
                config=config,
                max_retries=3,
            )
        assert call_count[0] == 1  # Nur ein Aufruf, kein Retry
        assert data is None
        assert "FEHLER" in errors[0]

    def test_zero_retries_still_runs_the_initial_analysis(self, tmp_path: Path) -> None:
        """0 unterdrückt Wiederholungen, aber niemals den Erstversuch."""
        config = self._make_config()
        call_count = [0]

        def mock_api_error(*args, **kwargs) -> str:
            call_count[0] += 1
            return self._mock_api_error()

        with patch.object(nc, "run_llm_api", side_effect=mock_api_error):
            data, errors = nc.run_llm_analysis(
                docx_text="Testtext",
                rubric_content="Rubrik",
                fach="Englisch",
                schulstufe="Oberstufe",
                textsorte="Essay",
                config=config,
                max_retries=0,
            )

        assert call_count[0] == 1
        assert data is None
        assert "FEHLER" in errors[0]

    def test_cancel_event_stops_analysis(self, tmp_path: Path) -> None:
        """Cancel-Event sollte die Analyse abbrechen."""
        config = self._make_config()
        cancel_event = threading.Event()
        cancel_event.set()  # Sofort abbrechen

        data, errors = nc.run_llm_analysis(
            docx_text="Testtext",
            rubric_content="Rubrik",
            fach="Deutsch",
            schulstufe="Oberstufe",
            textsorte="Eroerterung",
            config=config,
            cancel_event=cancel_event,
        )
        assert data is None
        assert any("abgebrochen" in e.lower() for e in errors)

def test_extract_json_ignores_trailing_brace_text():
    from natascha_core import extract_json_from_llm
    raw = '{"note": 3, "text": "gut"}\n\nHinweis: Wenn das {Feld} fehlt, bitte ergänzen.'
    result = extract_json_from_llm(raw)
    assert result == {"note": 3, "text": "gut"}

def test_extract_json_handles_code_fence():
    from natascha_core import extract_json_from_llm
    raw = '```json\n{"note": 2}\n```'
    assert extract_json_from_llm(raw) == {"note": 2}

def test_extract_json_handles_nested_braces():
    from natascha_core import extract_json_from_llm
    raw = '{"bewertung": {"inhalt": {"punkte": 3}}}'
    result = extract_json_from_llm(raw)
    assert result["bewertung"]["inhalt"]["punkte"] == 3


    def test_retry_on_schema_violation_then_success(self, tmp_path: Path) -> None:
        """Schema-Verletzung beim ersten Mal, dann Erfolg beim Retry."""
        config = self._make_config()
        call_count = [0]

        def mock_schema_then_success(*args, **kwargs) -> str:
            call_count[0] += 1
            if call_count[0] == 1:
                return self._mock_api_schema_violation()
            return self._mock_api_success()

        with patch.object(nc, "run_llm_api", side_effect=mock_schema_then_success):
            data, errors = nc.run_llm_analysis(
                docx_text="Testtext",
                rubric_content="Rubrik",
                fach="Deutsch",
                schulstufe="Oberstufe",
                textsorte="Eroerterung",
                config=config,
                max_retries=3,
            )
        assert call_count[0] == 3  # 2 Analyse-Versuche + 1 SRDP-Detail-Call
        assert data is not None
        assert data["schueler"] == "TokenA SuffixA"

    def test_srdp_detail_wird_fuer_englisch_uebersprungen(self) -> None:
        """L3: Der deutschlehrkraft-spezifische SRDP-Zweitcall läuft nicht für EN."""
        config = self._make_config()
        api_calls = [0]

        def mock_api(*args, **kwargs) -> str:
            api_calls[0] += 1
            fixture = _load_beispiel_fixture()
            fixture["fach"] = "Englisch"
            fixture["schulstufe"] = "Oberstufe"
            return json.dumps(fixture, ensure_ascii=False)

        with patch.object(nc, "run_llm_api", side_effect=mock_api):
            with patch.object(nc, "generate_srdp_detail") as srdp_mock:
                data, errors = nc.run_llm_analysis(
                    docx_text="Testtext",
                    rubric_content="Rubrik",
                    fach="Englisch",
                    schulstufe="Oberstufe",
                    textsorte="Essay",
                    config=config,
                    max_retries=3,
                )

        srdp_mock.assert_not_called()
        assert api_calls[0] == 1  # nur die Hauptanalyse, kein Zweitcall
        assert data is not None
        assert data.get("srdp_detail") is None
        # Note kommt aus den Kriterien (KRITERIUM_KEY_VARIANTS-Fallback)
        assert data.get("notenempfehlung", {}).get("note") is not None
        assert data.get("fach") == "Englisch"
        assert errors is not None

    def test_srdp_detail_laeuft_fuer_deutsch_weiterhin(self) -> None:
        """AT-Deutsch behält den SRDP-Zweitcall (Benchmark-Baseline)."""
        config = self._make_config()
        with patch.object(nc, "run_llm_api", side_effect=self._mock_api_success):
            with patch.object(nc, "generate_srdp_detail", return_value=None) as srdp_mock:
                data, errors = nc.run_llm_analysis(
                    docx_text="Testtext",
                    rubric_content="Rubrik",
                    fach="Deutsch",
                    schulstufe="Oberstufe",
                    textsorte="Eroerterung",
                    config=config,
                    max_retries=3,
                )
        srdp_mock.assert_called_once()
        assert data is not None


# =====================================================================
# Prompt-Didaktik-Audit P2 (docs/AUDIT-prompts-didaktik.md)
# =====================================================================

class TestFehlerAnweisungen:
    """_fehler_anweisungen: fach-konditioniert + längengekoppelt (N3/N4/N5)."""

    def test_deutsch_enthaelt_austriazismen_schutz_und_checkliste(self) -> None:
        text = nc._fehler_anweisungen("Deutsch", wortanzahl=300)
        assert "ÖSTERREICHISCHES STANDARDDEUTSCH" in text
        assert "Jänner" in text
        assert "bin gesessen" in text
        assert "das/dass-Unterscheidung" in text
        # Wortzahl-Info ohne numerischen Fehler-Anker
        assert "etwa 300 Wörter" in text
        assert "KEIN Maß dafür" in text
        assert "je 25–40 Wörter" not in text
        # kanonisches A-Label (N3)
        assert "A=Ausdruck/Stil" in text

    def test_fehlerdichte_ab_variante_ist_explizit_und_produktionsdefault_neutral(self) -> None:
        neutral = nc._fehler_anweisungen("Deutsch", wortanzahl=300)
        legacy = nc._fehler_anweisungen(
            "Deutsch", wortanzahl=300, dichte_prompt_variante="legacy"
        )

        assert "je 25–40 Wörter" not in neutral
        assert "Beginne ohne erwartete Fehlerzahl" in neutral
        assert "je 25–40 Wörter" in legacy
        assert "je 25–40 Wörter" not in nc._fehler_anweisungen("Deutsch")

    def test_unbekannte_fehlerdichte_ab_variante_wird_abgelehnt(self) -> None:
        with pytest.raises(ValueError, match="Promptvariante"):
            nc._fehler_anweisungen("Deutsch", dichte_prompt_variante="unbekannt")

    def test_englisch_ohne_deutsche_checkliste(self) -> None:
        text = nc._fehler_anweisungen("Englisch", wortanzahl=250)
        assert "3rd person" in text
        assert "False Friends" in text
        assert "das/dass" not in text
        assert "ÖSTERREICHISCHES STANDARDDEUTSCH" not in text

    def test_weitere_sprachfaecher_bekommen_eigene_checklisten(self) -> None:
        franz = nc._fehler_anweisungen("Französisch")
        span = nc._fehler_anweisungen("Spanisch")
        ital = nc._fehler_anweisungen("Italienisch")
        latein = nc._fehler_anweisungen("Latein")

        assert "Akzente" in franz and "Genus und Numerus" in franz
        assert "ser/estar" in span and "por/para" in span
        assert "Doppelkonsonanten" in ital
        assert "Kasusfunktionen" in latein and "Ablativkonstruktionen" in latein
        assert "das/dass" not in franz
        assert "ÖSTERREICHISCHES STANDARDDEUTSCH" not in latein

    def test_weitere_sprachfaecher_erhalten_textsorten_hinweis(self) -> None:
        prompt = nc._sprachfach_prompt_hinweis("Französisch", "Article")
        assert "Französisch" in prompt
        assert "Article" in prompt
        assert "nicht nach einem deutschen Textsortenmuster" in prompt

        latin_prompt = nc._sprachfach_prompt_hinweis("Latein", "Übersetzung")
        assert "kein CEFR-Fach" in latin_prompt
        assert "Übersetzungsgenauigkeit" in latin_prompt

    def test_weitere_sprachfach_hinweis_ist_im_analyseprompt_enthalten(self) -> None:
        prompt = nc.build_analysis_prompt(
            "Je suis ici.",
            "## JSON-Kriterien\n- `aufgabenerfuellung`",
            "Französisch",
            "Oberstufe",
            "Article",
            {"paths": {"schema": "feedback_schema.json"}},
        )
        assert "SPRACHFACH-HINWEIS: Dies ist Französisch" in prompt
        assert "Akzente, Genus/Numerus" in prompt

    def test_prompt_ohne_wortanzahl_erlaubt_fehlerfreien_text(self) -> None:
        text = nc._fehler_anweisungen("Deutsch")
        assert "Ein fehlerfreier Text ist möglich" in text
        assert "auffällig wenige Fehler" not in text
        assert "Wörter. Faustregel" not in text


def test_example_fixture_ist_gepinnt() -> None:
    """N1: Das Live-Prompt-Beispiel bleibt beispiel_deutsch_kommentar.json,
    auch wenn alphabetisch frühere Fixture-Dateien existieren."""
    pinned = (FIXTURES / "beispiel_deutsch_kommentar.json").read_text(encoding="utf-8")
    assert nc.load_example_fixture() == pinned


def test_srdp_detail_prompt_nennt_skalenhinweis(monkeypatch) -> None:
    """N2: Der SRDP-Detail-Call grenzt seine 0-4-Skala explizit von den
    1-5-Rubrikstufen ab."""
    captured: dict = {}

    def fake_api(prompt: str, config: dict, cancel_event=None, **kwargs) -> str:
        captured["prompt"] = prompt
        raise RuntimeError("stop")

    monkeypatch.setattr(nc, "run_llm_api", fake_api)
    nc.generate_srdp_detail("Text", {"bewertung": {}}, {}, textsorte="Kommentar")
    assert "SKALEN-HINWEIS" in captured["prompt"]
    assert "0-4" in captured["prompt"]
    assert "NICHT" in captured["prompt"]


class TestFehlerFilterP2c:
    """Deterministische Filterschicht nach Live-Eval P2b (Modelle umgehen Prompt-Regeln)."""

    def test_drop_nullnummern_case_sensitiv(self) -> None:
        fehler = [
            {"zitat": "Beim lesen", "korrektur": "Beim Lesen", "typ": "R"},   # echte Korrektur (Case!)
            {"zitat": "dort gesessen", "korrektur": "dort gesessen", "typ": "A"},  # Nullnummer
            {"zitat": "leer ist.", "korrektur": "leer  ist.", "typ": "Z"},    # nur Whitespace → Nullnummer
            {"zitat": "", "korrektur": "x", "typ": "R"},                      # leeres Zitat
        ]
        out = nc.drop_unbrauchbare_fehler(fehler)
        assert len(out) == 1
        assert out[0]["korrektur"] == "Beim Lesen"

    def test_z_fehler_ohne_satzzeichen_match_ist_halluzination(self) -> None:
        text = "Wir gehen aus der Region. Das ist gut. Die Lebensmittel die jetzt kommen."
        fehler = [
            # Halluzination: Zitat lässt den Punkt weg, der im Text steht
            {"zitat": "aus der Region Das ist", "korrektur": "aus der Region. Das ist", "typ": "Z"},
            # Legitim: Zitat entspricht dem Text (fehlendes Komma wird ergänzt)
            {"zitat": "Lebensmittel die jetzt", "korrektur": "Lebensmittel, die jetzt", "typ": "Z"},
        ]
        out = nc.verify_fehler_against_text(fehler, text)
        assert len(out) == 1
        assert out[0]["zitat"] == "Lebensmittel die jetzt"

    def test_nicht_z_fehler_behalten_toleranten_fallback(self) -> None:
        text = 'Er sagte "das war super" zu mir.'
        # R-Fehler, Zitat ohne die Anführungszeichen des Texts → toleranter Match bleibt
        fehler = [{"zitat": "das war super", "korrektur": "dass war super", "typ": "R"}]
        assert len(nc.verify_fehler_against_text(fehler, text)) == 1


class TestSatzzeichenAnhaengsel:
    """P2c-Finale: korrektur == zitat + Satzzeichen, das im Text schon steht."""

    TEXT = "Das Buffet ist oft leer. Unsere Schule zeigt heuer, dass es geht. Mehr Auswahl weil alle kommen."

    def test_punkt_steht_schon_im_text(self) -> None:
        fehler = [{"zitat": "ist oft leer", "korrektur": "ist oft leer.", "typ": "Z"}]
        assert nc.drop_satzzeichen_anhaengsel(fehler, self.TEXT) == []

    def test_komma_steht_schon_im_text(self) -> None:
        fehler = [{"zitat": "Schule zeigt heuer", "korrektur": "Schule zeigt heuer,", "typ": "Z"}]
        assert nc.drop_satzzeichen_anhaengsel(fehler, self.TEXT) == []

    def test_legitimes_anhaengsel_vor_wort_bleibt(self) -> None:
        # Nach "Mehr Auswahl" folgt " weil" → angehängtes Komma kann legitim sein
        fehler = [{"zitat": "Mehr Auswahl", "korrektur": "Mehr Auswahl,", "typ": "Z"}]
        assert len(nc.drop_satzzeichen_anhaengsel(fehler, self.TEXT)) == 1

    def test_normale_korrekturen_unberuehrt(self) -> None:
        fehler = [{"zitat": "Auswahl weil", "korrektur": "Auswahl, weil", "typ": "Z"}]
        assert len(nc.drop_satzzeichen_anhaengsel(fehler, self.TEXT)) == 1


class TestDropDuplicateFehler:
    """P2: Doppelte Fehler-Eintraege entfernen."""

    def test_identische_eintraege_entfernt(self) -> None:
        fehler = [
            {"zitat": "geht", "korrektur": "geht gut", "typ": "G"},
            {"zitat": "geht", "korrektur": "geht gut", "typ": "G"},
            {"zitat": "anderes", "korrektur": "besseres", "typ": "R"},
        ]
        result = nc.drop_duplicate_fehler(fehler)
        assert len(result) == 2

    def test_reihenfolge_erhalten(self) -> None:
        fehler = [
            {"zitat": "erster", "korrektur": "verbesserter", "typ": "R"},
            {"zitat": "zweiter", "korrektur": "verbesserter2", "typ": "R"},
            {"zitat": "erster", "korrektur": "verbesserter", "typ": "R"},
        ]
        result = nc.drop_duplicate_fehler(fehler)
        assert len(result) == 2
        assert result[0]["zitat"] == "erster"

    def test_case_insensitive_duplikat(self) -> None:
        fehler = [
            {"zitat": "Geht gut", "korrektur": "geht besser", "typ": "G"},
            {"zitat": "geht gut", "korrektur": "Geht besser", "typ": "G"},
        ]
        result = nc.drop_duplicate_fehler(fehler)
        assert len(result) == 1

    def test_leere_liste(self) -> None:
        assert nc.drop_duplicate_fehler([]) == []


class TestValidateNoteBegruendung:
    """P2: Note und Begruendung duerfen sich nicht widersprechen."""

    def test_note_1_mit_negativer_begruendung_warnt(self) -> None:
        data = {"notenempfehlung": {"note": 1, "begruendung": "schwache Argumentation"}}
        hinweise = nc.validate_note_begrundung(data)
        assert len(hinweise) == 1

    def test_note_5_mit_positiver_begruendung_warnt(self) -> None:
        data = {"notenempfehlung": {"note": 5, "begruendung": "sehr gute Argumentation"}}
        hinweise = nc.validate_note_begrundung(data)
        assert len(hinweise) == 1

    def test_note_4_mit_neutraler_begruendung_ok(self) -> None:
        data = {"notenempfehlung": {"note": 4, "begruendung": "einige Schwächen"}}
        assert nc.validate_note_begrundung(data) == []

    def test_note_4_mit_positiver_begruendung_warnt(self) -> None:
        data = {"notenempfehlung": {"note": 4, "begruendung": "sehr gute Analyse"}}
        hinweise = nc.validate_note_begrundung(data)
        assert len(hinweise) == 1

    def test_kein_notenempfehlung_ok(self) -> None:
        assert nc.validate_note_begrundung({}) == []

    def test_note_3_neutral_ok(self) -> None:
        data = {"notenempfehlung": {"note": 3, "begruendung": "solide Arbeit"}}
        assert nc.validate_note_begrundung(data) == []


class TestVerifyFehlerExtent:
    """P2: Erweiterte Zitat-Pruefung (Laenge, Pseudo-Korrekturen)."""

    TEXT = (
        "Die neue Literatur wird durch Social Media bestimmt. "
        "Viele Jugendliche lesen Bucher die sie auf TikTok entdecken. "
        "Das ist eine positive Entwicklung fuer das Leseverhalten."
    )

    def test_zitat_zu_lang_entfernt(self) -> None:
        zitat = "Die neue Literatur wird durch Social Media bestimmt und das ist wirklich wichtig"
        fehler = [{"zitat": zitat, "korrektur": "besser", "typ": "A"}]
        assert nc.verify_fehler_extent(fehler, self.TEXT) == []

    def test_kurzes_zitat_behalten(self) -> None:
        fehler = [{"zitat": "Bucher die sie", "korrektur": "Bücher, die sie", "typ": "Z"}]
        assert len(nc.verify_fehler_extent(fehler, self.TEXT)) == 1

    def test_korrektur_an_anderer_stelle_laesst_belegten_fehler_stehen(self) -> None:
        text = "Das ist eine gute Entwicklung. Insgesamt ist das eine positive Entwicklung."
        fehler = [{"zitat": "gute Entwicklung", "korrektur": "positive Entwicklung", "typ": "A"}]
        result = nc.verify_fehler_extent(fehler, text)
        assert len(result) == 1
        assert "korrektur_lokal_ambig" not in result[0]

    def test_korrektur_im_selben_satz_wird_nur_markiert(self) -> None:
        text = "Die gute Entwicklung, also eine positive Entwicklung, hilft allen."
        fehler = [{"zitat": "gute Entwicklung", "korrektur": "positive Entwicklung", "typ": "A"}]
        result = nc.verify_fehler_extent(fehler, text)
        assert len(result) == 1
        assert result[0]["korrektur_lokal_ambig"] is True

    def test_tatsaechliche_korrektur_behalten(self) -> None:
        # Korrektur kommt NICHT im Text vor → echte Korrektur
        fehler = [{"zitat": "Bucher die", "korrektur": "Bücher, die", "typ": "Z"}]
        assert len(nc.verify_fehler_extent(fehler, self.TEXT)) == 1

    def test_lokale_ambiguitaet_senkt_vertrauen(self) -> None:
        text = "Die gute Entwicklung, also eine positive Entwicklung, hilft allen."
        fehler = [{"zitat": "gute Entwicklung", "korrektur": "positive Entwicklung", "typ": "A"}]
        filtered = nc.verify_fehler_extent(fehler, text)
        assert nc.compute_vertrauensstufe(filtered, text)[0]["vertrauensstufe"] == "mittel"


class TestComputeVertrauensstufe:
    """Phase 3: post-hoc Vertrauensstufe pro Fehler."""

    TEXT = (
        "Die neue Literatur wird durch Social Media bestimmt. "
        "Viele Jugendliche lesen Bucher die sie auf TikTok entdecken. "
        "Das ist eine positive Entwicklung fuer das Leseverhalten."
    )

    def test_exakter_treffer_kurz_hoch(self) -> None:
        fehler = [{"zitat": "Viele Jugendliche lesen", "korrektur": "Viele Jugendliche lesen auch", "typ": "G"}]
        result = nc.compute_vertrauensstufe(fehler, self.TEXT)
        assert result[0]["vertrauensstufe"] == "hoch"

    def test_satzzeichen_streift_mittel(self) -> None:
        # Zitat mit fehlendem Satzzeichen das im Text steht → Streift-Treffer
        fehler = [{"zitat": "entdecken Das", "korrektur": "entdecken. Das", "typ": "Z"}]
        result = nc.compute_vertrauensstufe(fehler, self.TEXT)
        # Streift-Treffer (ohne Satzzeichen matcht) → mittel
        assert result[0]["vertrauensstufe"] in ("hoch", "mittel")

    def test_langes_zitat_mittel(self) -> None:
        zitat = "Die neue Literatur wird durch Social Media bestimmt und das ist wichtig"
        fehler = [{"zitat": zitat, "korrektur": "besser", "typ": "A"}]
        result = nc.compute_vertrauensstufe(fehler, self.TEXT)
        assert result[0]["vertrauensstufe"] == "mittel"

    def test_korrektur_im_text_runtergestuft(self) -> None:
        # Korrektur kommt im Text vor → Pseudo-Korrektur-Signal → nicht hoch
        fehler = [{"zitat": "positive Entwiklung", "korrektur": "positive Entwicklung", "typ": "R"}]
        result = nc.compute_vertrauensstufe(fehler, self.TEXT)
        assert result[0]["vertrauensstufe"] in ("mittel", "niedrig")

    def test_vision_modus_pauschal_mittel(self) -> None:
        fehler = [{"zitat": "irgendwas", "korrektur": "irgendwasanders", "typ": "G"}]
        result = nc.compute_vertrauensstufe(fehler, None, vision_mode=True)
        assert result[0]["vertrauensstufe"] == "mittel"

    def test_leere_liste(self) -> None:
        assert nc.compute_vertrauensstufe([], self.TEXT) == []

    def test_kein_text_pauschal_mittel(self) -> None:
        fehler = [{"zitat": "test", "korrektur": "test2", "typ": "G"}]
        result = nc.compute_vertrauensstufe(fehler, None)
        assert result[0]["vertrauensstufe"] == "mittel"


# =====================================================================
# Phase 1: Token-Budget, Kontext-Grenzen, Mistral kein Fallback
# =====================================================================


class TestEstimateTokens:
    def test_leerer_text_mindestens_eins(self) -> None:
        assert nc._estimate_tokens("") == 1

    def test_vier_zeichen_gibt_eins(self) -> None:
        assert nc._estimate_tokens("abcd") == 1

    def test_deutscher_text_schaetzung(self) -> None:
        # 400 Zeichen → 100 Tokens
        text = "x" * 400
        assert nc._estimate_tokens(text) == 100


class TestCheckContextBudget:
    def test_kurzer_prompt_ok(self) -> None:
        assert nc._check_context_budget("mistral", "mistral-medium-3-5", "Hallo") is None

    def test_ueber_80_prozent_limit(self) -> None:
        # mistral-medium: 256k * 0.8 = 204_800 safe → 204_801 Tokens = 819_204 Zeichen
        prompt = "x" * (204_801 * 4 + 4)
        err = nc._check_context_budget("mistral", "mistral-medium-3-5", prompt)
        assert err is not None
        assert err.startswith("FEHLER:")
        assert "Text zu lang" in err
        assert "mistral-medium-3-5" in err

    def test_unbekanntes_modell_default_limit(self) -> None:
        # Default 128k * 0.8 = 102_400 → 102_401 Tokens überschreiten
        prompt = "x" * (102_401 * 4 + 4)
        err = nc._check_context_budget("qwen", "gibtsnicht", prompt)
        assert err is not None
        assert "gibtsnicht" in err

    def test_unterhalb_limit_kein_fehler(self) -> None:
        # 100k Tokens unter 204_800 → OK
        prompt = "x" * (100_000 * 4)
        assert nc._check_context_budget("mistral", "mistral-medium-3-5", prompt) is None


class TestDynamicMaxTokens:
    def test_kurzer_prompt_4k(self) -> None:
        assert nc._dynamic_max_tokens("mistral-medium-3-5", "kurz") == 4096

    def test_mittlerer_prompt_8k(self) -> None:
        prompt = "x" * (4000 * 4)  # ~4000 Tokens
        assert nc._dynamic_max_tokens("mistral-medium-3-5", prompt) == 8192

    def test_langer_prompt_12k(self) -> None:
        prompt = "x" * (7000 * 4)  # ~7000 Tokens
        assert nc._dynamic_max_tokens("mistral-medium-3-5", prompt) == 12288

    def test_nie_mehr_als_modell_limit(self) -> None:
        # mistral-small: max_output 16k → 12288 passt; bei Modell mit 8k max → 8k
        prompt = "x" * (7000 * 4)
        assert nc._dynamic_max_tokens("deepseek-chat", prompt) == 16000


class TestMistralKeinFallback:
    """Mistral: model-not-found → klarer Fehler, KEIN stiller Modellwechsel."""

    def test_model_not_found_gibt_klaren_ohne_fallback(self, monkeypatch) -> None:
        monkeypatch.setenv("MISTRAL_API_KEY", "test-key")
        config = _load_config()
        config["api"]["provider"] = "mistral"
        config["api"]["model"] = "mistral-gibts-nicht"

        calls: list[str] = []

        def fake_call(base_url, api_key, model, prompt, timeout, **kwargs):
            calls.append(model)
            return "FEHLER: model_not_found: The model does not exist"

        monkeypatch.setattr(nc, "_call_openai_compat", fake_call)

        result = nc.run_llm_api("Ping", config)
        assert "nicht verfügbar" in result
        assert "mistral-gibts-nicht" in result
        # genau ein Aufruf — kein Fallback auf anderes Modell
        assert calls == ["mistral-gibts-nicht"]

    def test_budget_error_vor_api_call(self, monkeypatch) -> None:
        monkeypatch.setenv("MISTRAL_API_KEY", "test-key")
        config = _load_config()
        config["api"]["provider"] = "mistral"
        config["api"]["model"] = "mistral-medium-3-5"

        calls: list[int] = []

        def fake_call(*args, **kwargs):
            calls.append(1)
            return "OK"

        monkeypatch.setattr(nc, "_call_openai_compat", fake_call)

        riesiger_prompt = "x" * (204_801 * 4 + 4)
        result = nc.run_llm_api(riesiger_prompt, config)
        assert result.startswith("FEHLER:")
        assert "Text zu lang" in result
        # API wurde nie aufgerufen
        assert calls == []


class TestLandKorrektur:
    """L2: land-Durchreiche — AT-Pfad unverändert (Benchmark-Baseline), DE-Variante."""

    @staticmethod
    def _config() -> dict:
        # Minimales Config-Shape für load_schema (resolve_path).
        return {"paths": {"schema": "feedback_schema.json"}}

    def test_at_prompt_unchanged_default(self) -> None:
        """Ohne land-Parameter startet der Prompt wie bisher (österreichisch)."""
        prompt = nc.build_analysis_prompt(
            "Schülertext", "RASTER", "Deutsch", "Oberstufe", "Kommentar", self._config()
        )
        assert prompt.startswith(
            "Du bist ein Korrekturassistent für österreichische Gymnasium-Schularbeiten."
        )
        assert "Klassenarbeit" not in prompt
        assert "ÖSTERREICHISCHES STANDARDDEUTSCH" in prompt

    def test_de_prompt_klassenarbeit(self) -> None:
        prompt = nc.build_analysis_prompt(
            "Schülertext", "RASTER", "Deutsch", "Unterstufe", "Klassenarbeit",
            self._config(), land="de",
        )
        assert prompt.startswith(
            "Du bist ein Korrekturassistent für deutsche Klassenarbeiten (Gymnasium)."
        )
        assert "österreichische Gymnasium-Schularbeiten" not in prompt
        assert "Standardvariante des Deutschen" in prompt

    def test_fehler_anweisungen_land(self) -> None:
        at = nc._fehler_anweisungen("Deutsch", 100)
        de = nc._fehler_anweisungen("Deutsch", 100, land="de")
        assert "ÖSTERREICHISCHES STANDARDDEUTSCH" in at
        assert "ÖSTERREICHISCHES STANDARDDEUTSCH" not in de
        assert "Begriff Klassenarbeiten sind KEIN Maß" in de
        assert "Begriff Schularbeiten sind KEIN Maß" in at

    def test_vision_prompt_land(self) -> None:
        prompt = nc.build_vision_prompt(
            "RASTER", "Deutsch", "Unterstufe", "KA", self._config(), land="de"
        )
        assert prompt.startswith(
            "Du bist ein Korrekturassistent für deutsche Klassenarbeiten (Gymnasium)."
        )


def test_erwartungshorizont_version_is_stable_and_whitespace_tolerant() -> None:
    assert nc.erwartungshorizont_version("# EH\nInhalt") == nc.erwartungshorizont_version(
        "  # EH\r\nInhalt  "
    )
    assert nc.erwartungshorizont_version("") == ""
    assert nc.erwartungshorizont_version("# EH\nInhalt").startswith("sha256:")

    def test_sachfach_prompt_trennt_fachliche_bewertung(self) -> None:
        prompt = nc.build_analysis_prompt(
            "Schülertext", "RASTER", "geschichte", "Unterstufe", "Quellenanalyse",
            self._config(),
        )
        assert "sachfach_bewertung" in prompt
        assert "operator_erfuellung" in prompt
        assert "Sprachfehler" in prompt

    def test_sprachfach_prompt_bekommt_keinen_sachfach_block(self) -> None:
        prompt = nc.build_analysis_prompt(
            "Schülertext", "RASTER", "Deutsch", "Unterstufe", "Kommentar",
            self._config(),
        )
        assert "sachfach_bewertung" not in prompt


def test_berechne_note_sachfach_ignoriert_sprachkriterien() -> None:
    note = nc.berechne_note_sachfach(
        {
            "operator_erfuellung": {"punkte": 5},
            "inhaltliche_genauigkeit": {"punkte": 4},
            "fachbegriffe": {"punkte": 3},
            "erwartungshorizont_bezug": {"punkte": 4},
        },
        land="de",
    )
    assert note["note"] == 2
    assert note["bewertungsschema"] == "de-1-6"
    assert note["quelle"] == "app_sachfach"


class TestBerechneNoteDe:
    """L2: deutsche 1-6-Klassenarbeit-Skala."""

    def test_solide_arbeit_note_2(self) -> None:
        bewertung = {k: {"punkte": 4} for k in ("inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit")}
        note = nc.berechne_note_de(bewertung)
        assert note["note"] == 2
        assert note["bezeichnung"] == "gut"
        assert note["bewertungsschema"] == "de-1-6"
        assert note["land"] == "de"

    def test_sehr_gut_note_1(self) -> None:
        bewertung = {"inhalt": {"punkte": 5}, "textstruktur": {"punkte": 5},
                     "ausdruck": {"punkte": 5}, "sprachrichtigkeit": {"punkte": 4}}
        note = nc.berechne_note_de(bewertung)
        assert note["note"] == 1
        assert note["bezeichnung"] == "sehr gut"

    def test_sonderregel_ungenuegend(self) -> None:
        bewertung = {"inhalt": {"punkte": 1}, "textstruktur": {"punkte": 1},
                     "ausdruck": {"punkte": 2}, "sprachrichtigkeit": {"punkte": 1}}
        note = nc.berechne_note_de(bewertung)
        assert note["note"] == 6
        assert note["bezeichnung"] == "ungenügend"
        assert "nicht erfüllt" in note["begruendung"]

    def test_anderthalb_stunden_note_5(self) -> None:
        # Schnitt 2.0 → Note 4 (ausreichend); knapp über der Sonderregel.
        bewertung = {k: {"punkte": 2} for k in ("inhalt", "textstruktur", "ausdruck", "sprachrichtigkeit")}
        note = nc.berechne_note_de(bewertung)
        assert note["note"] == 4
        assert note["bezeichnung"] == "ausreichend"

    def test_gewichtung_wird_verwendet(self) -> None:
        bewertung = {"inhalt": {"punkte": 5}, "textstruktur": {"punkte": 1},
                     "ausdruck": {"punkte": 5}, "sprachrichtigkeit": {"punkte": 5}}
        note = nc.berechne_note_de(bewertung, {"inhalt": 0.7, "textstruktur": 0.1,
                                               "ausdruck": 0.1, "sprachrichtigkeit": 0.1})
        # 0.7*5 + 0.3*1 = 4.6 → Note = round(6 − 4.6) = 1
        assert note["note"] == 1
        assert note["bezeichnung"] == "sehr gut"


class TestKonsistenzwarnungFehlerVsNote:
    """L2: advisory-Check Fehlerliste ↔ Sprachrichtigkeits-Stufe."""

    def _bewertung(self, stufe: int) -> dict:
        return {"sprachrichtigkeit": {"punkte": stufe}}

    def test_viele_fehler_gute_note_warnt(self) -> None:
        fehler = [{"zitat": "x"}] * 20
        warnungen = nc.konsistenzwarnung_fehler_vs_note(fehler, self._bewertung(4), 200)
        assert len(warnungen) == 1
        assert "20 Fehler" in warnungen[0]

    def test_wenige_fehler_gute_note_ok(self) -> None:
        fehler = [{"zitat": "x"}] * 10  # 5/100 Wörter → unter Schwelle
        assert nc.konsistenzwarnung_fehler_vs_note(fehler, self._bewertung(4), 200) == []

    def test_fast_ohne_fehler_schlechte_note_warnt(self) -> None:
        warnungen = nc.konsistenzwarnung_fehler_vs_note([{"zitat": "x"}], self._bewertung(2), 300)
        assert len(warnungen) == 1
        assert "1 Fehler" in warnungen[0]

    def test_ohne_sprachkriterium_kein_check(self) -> None:
        assert nc.konsistenzwarnung_fehler_vs_note([{"zitat": "x"}], {"inhalt": {"punkte": 3}}, 100) == []

    def test_ohne_wortanzahl_kein_check(self) -> None:
        assert nc.konsistenzwarnung_fehler_vs_note([{"zitat": "x"}], self._bewertung(4), 0) == []
