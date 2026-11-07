"""Datenminimierte Diagnostik ohne echte Anbieteraufrufe."""

from __future__ import annotations

import json
from pathlib import Path
import sys
import threading

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import natascha_core as nc


@pytest.mark.parametrize("provider", ["deepseek", "openai", "anthropic", "mistral", "qwen", "kimi"])
def test_all_providers_record_stage_failure_without_prompt_or_response(monkeypatch, provider):
    config = {"api": {"provider": provider, "model": "test-model"}, "_llm_phase": "gegenpruefung"}
    monkeypatch.setattr(
        nc, "_run_llm_api", lambda *args, **kwargs: "FEHLER: [network] PRIVATE_RESPONSE"
    )
    assert nc.run_llm_api("PRIVATE_PROMPT", config).startswith("FEHLER")
    receipt = config["_llm_usage"][0]
    assert receipt["status"] == "fehlgeschlagen" and receipt["phase"] == "gegenpruefung"
    assert receipt["fehlercode"] == "network" and receipt["dauer_ms"] >= 0
    assert "PRIVATE" not in json.dumps(receipt)


def test_truncated_response_records_budget_and_finish_reason(monkeypatch):
    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def read(self):
            return json.dumps(
                {
                    "choices": [
                        {"finish_reason": "length", "message": {"content": "PRIVATE_RESPONSE"}}
                    ],
                    "usage": {"completion_tokens": 99},
                }
            ).encode()

    monkeypatch.setattr(nc.urllib.request, "urlopen", lambda *args, **kwargs: Response())
    usage = []
    result = nc._call_openai_compat(
        "https://example.invalid/v1",
        "TEST_KEY",
        "test-model",
        "PRIVATE_PROMPT",
        1,
        max_tokens=99,
        usage_sink=usage,
    )
    assert "output_truncated" in result
    assert usage[0]["max_ausgabetokens"] == 99 and usage[0]["abschlussgrund"] == "length"
    assert "PRIVATE" not in json.dumps(usage) and "TEST_KEY" not in json.dumps(usage)


def test_cancelled_call_is_not_logged_as_completed(monkeypatch):
    event = threading.Event()
    event.set()
    monkeypatch.setattr(nc, "_run_llm_api", lambda *args, **kwargs: "FEHLER: Abgebrochen")
    config = {"api": {"model": "test-model"}}
    nc.run_llm_api("unused", config, cancel_event=event)
    assert config["_llm_usage"][0]["status"] == "abgebrochen"
