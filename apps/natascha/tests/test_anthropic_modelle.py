"""Tests für run_anthropic_api mit neueren Claude-Modellen (ohne echten API-Aufruf)."""

from __future__ import annotations

import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc


class _Block:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _fake_anthropic(monkeypatch, content):
    calls: list[dict] = []

    class _Messages:
        def create(self, **kwargs):
            calls.append(kwargs)
            return _Block(content=content)

    class _Client:
        def __init__(self, api_key):
            self.messages = _Messages()

    monkeypatch.setitem(sys.modules, "anthropic", types.SimpleNamespace(Anthropic=_Client))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    return calls


def test_opus_5_5_ohne_erzwungenen_tool_aufruf(monkeypatch):
    calls = _fake_anthropic(
        monkeypatch,
        [_Block(type="thinking", thinking="..."), _Block(type="tool_use", input={"ok": True})],
    )
    out = nc.run_anthropic_api("Bewerte.", "claude-opus-5-5", schema={"type": "object"})
    assert out == '{"ok": true}'
    assert calls[0]["tool_choice"] == {"type": "auto"}
    assert "feedback_result" in calls[0]["messages"][0]["content"]


def test_sonnet_4_6_behaelt_erzwungenen_tool_aufruf(monkeypatch):
    calls = _fake_anthropic(monkeypatch, [_Block(type="tool_use", input={"ok": True})])
    nc.run_anthropic_api("Bewerte.", "claude-sonnet-4-6", schema={"type": "object"})
    assert calls[0]["tool_choice"] == {"type": "tool", "name": "feedback_result"}
    assert calls[0]["messages"][0]["content"] == "Bewerte."


def test_textantwort_ueberspringt_thinking_bloecke(monkeypatch):
    _fake_anthropic(
        monkeypatch,
        [_Block(type="thinking", thinking="..."), _Block(type="text", text="Antwort")],
    )
    assert nc.run_anthropic_api("Frage", "claude-haiku-5-5") == "Antwort"


def test_tool_anweisung_haengt_an_letzten_textblock():
    blocks = [{"type": "image", "source": {}}, {"type": "text", "text": "Prompt"}]
    out = nc._mit_tool_anweisung(blocks)
    assert out[-1]["text"].startswith("Prompt")
    assert "feedback_result" in out[-1]["text"]
    assert blocks[-1]["text"] == "Prompt"


def test_daf_ist_eigenes_sprachfach():
    assert nc.kanonisches_fach("daf") == "DaF"
    hinweis = nc._sprachfach_prompt_hinweis("DaF", "E-Mail")
    assert "Deutsch als Fremdsprache" in hinweis
    assert "GER-Niveau" in hinweis
