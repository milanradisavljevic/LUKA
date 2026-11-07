"""DeepSeek-Budget am HTTP-Vertrag prüfen, ohne echte Anbieteraufrufe."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import natascha_core as nc


@pytest.mark.parametrize("model", ["deepseek-flash", "deepseek-v4-pro"])
@pytest.mark.parametrize("phase", ["analyse", "gegenpruefung"])
@pytest.mark.parametrize(
    "selection,budget,minimum_timeout,parameters",
    [
        ("off", 32_768, 300, {"thinking": {"type": "disabled"}}),
        ("low", 65_536, 600, {"thinking": {"type": "enabled"}, "reasoning_effort": "low"}),
        ("high", 65_536, 600, {"thinking": {"type": "enabled"}, "reasoning_effort": "high"}),
        ("max", 131_072, 1200, {"thinking": {"type": "enabled"}, "reasoning_effort": "max"}),
        ("default", 65_536, 600, {}),
    ],
)
def test_deepseek_request_keeps_effort_and_sends_sufficient_budget(
    monkeypatch, model, phase, selection, budget, minimum_timeout, parameters,
):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "TEST_KEY")
    requests = []

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def read(self):
            return json.dumps({"model": model, "choices": [
                {"finish_reason": "stop", "message": {"content": '{"ok":true}'}}
            ]}).encode()

    def send(request, timeout):
        requests.append((json.loads(request.data), timeout))
        return Response()

    monkeypatch.setattr(nc.urllib.request, "urlopen", send)
    config = {"api": {"provider": "deepseek", "model": model, "reasoning": selection},
              "agent": {"timeout_seconds": 300}, "_llm_phase": phase}
    assert nc.run_llm_api("Kurzer Testauftrag", config) == '{"ok":true}'
    assert len(requests) == 1
    body, timeout = requests[0]
    assert body["model"] == model
    assert body["max_tokens"] == budget
    assert body["response_format"] == {"type": "json_object"}
    assert timeout >= minimum_timeout
    for key in ("thinking", "reasoning_effort"):
        assert body.get(key) == parameters.get(key)
    receipt = config["_llm_usage"][0]
    assert receipt["max_ausgabetokens"] == budget
    assert receipt["phase"] == phase and receipt["status"] == "antwort_erhalten"


def test_legacy_deepseek_does_not_receive_unsupported_large_budget(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "TEST_KEY")
    calls = []
    monkeypatch.setattr(
        nc, "_call_openai_compat", lambda *args, **kwargs: calls.append(kwargs) or "OK",
    )
    config = {"api": {"provider": "deepseek", "model": "deepseek-chat"}}
    assert nc.run_llm_api("x" * 30_000, config) == "OK"
    assert calls[0]["max_tokens"] == 16_000


def test_configured_longer_timeout_is_preserved(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "TEST_KEY")
    calls = []
    monkeypatch.setattr(
        nc, "_call_openai_compat", lambda *args, **kwargs: calls.append(args) or "OK",
    )
    config = {"api": {"provider": "deepseek", "model": "deepseek-flash", "reasoning": "max"},
              "agent": {"timeout_seconds": 1800}}
    assert nc.run_llm_api("Test", config) == "OK"
    assert calls[0][4] == 1800
