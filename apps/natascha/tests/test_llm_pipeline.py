"""Tests für die LLM-Analyse-Pipeline in natascha_core."""

from __future__ import annotations

import json
import sys
import threading
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc

FIXTURES = Path(__file__).parent / "fixtures"


# =====================================================================
# Helpers
# =====================================================================

def _load_config() -> dict:
    return nc.load_config()


def _load_tamara_fixture() -> dict:
    return json.loads(
        (FIXTURES / "mia_feedback.json").read_text(encoding="utf-8")
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


def test_run_llm_api_dispatches_deepseek_reasoner_with_more_tokens(monkeypatch) -> None:
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-deepseek-key")
    config = _load_config()
    config["api"]["provider"] = "deepseek"
    config["api"]["model"] = "deepseek-reasoner"

    calls = []

    def fake_call(base_url, api_key, model, prompt, timeout, **kwargs):
        calls.append((base_url, api_key, model, prompt, kwargs))
        return "OK"

    monkeypatch.setattr(nc, "_call_openai_compat", fake_call)

    assert nc.run_llm_api("Ping", config) == "OK"
    base_url, api_key, model, prompt, kwargs = calls[0]
    assert base_url == "https://api.deepseek.com/v1"
    assert api_key == "test-deepseek-key"
    assert model == "deepseek-reasoner"
    assert prompt == "Ping"
    assert kwargs["extra_body"] is None
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

    assert result.startswith("FEHLER: Antwort abgeschnitten")


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
        """Tamara-Fixture sollte ohne Fehler validieren."""
        data = _load_tamara_fixture()
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
        data = _load_tamara_fixture()
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
        fixture = _load_tamara_fixture()
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
        assert data["schueler"] == "Mia Muster"

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
        assert "fehlgeschlagen" in errors[-1].lower()

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
        assert data["schueler"] == "Mia Muster"
