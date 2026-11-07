"""Modellbezogene Denkoptionen des Korrektur-Sidecars (Stand 2026-11-02).

Quellen: api-docs.deepseek.com/guides/thinking_mode/;
developers.openai.com/api/docs/guides/reasoning;
platform.claude.com/docs/en/build-with-claude/thinking;
docs.mistral.ai/studio/conversations/reasoning;
alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions;
platform.kimi.ai/docs/api/models-overview.
Nur dokumentierte Modellfamilien erhalten explizite Optionen. Die Tabelle wird
auch von der App abgefragt; dort gibt es keine zweite Parameter-Zuordnung.
"""
from __future__ import annotations

LABELS = {"default": "Modellstandard", "off": "Aus", "on": "Ein",
          "low": "Gering", "medium": "Mittel", "high": "Hoch",
          "xhigh": "Sehr hoch", "max": "Maximal"}


def model_options(provider: str, model: str) -> dict:
    provider = {"claude": "anthropic", "chatgpt": "openai"}.get(provider, provider)
    levels: list[str] = []
    initial = "default"
    if provider == "deepseek" and model in {"deepseek-flash", "deepseek-v4-pro"}:
        levels, initial = ["off", "low", "high", "max"], "off"
    elif provider == "openai":
        if model.startswith("gpt-6"):
            levels = ["low", "medium", "high", "xhigh", "max"]
        elif model.startswith("gpt-5.4"):
            levels = ["off", "low", "medium", "high", "xhigh"]
    elif provider == "anthropic":
        if model in {"claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5",
                     "claude-opus-4-8", "claude-opus-4-7"}:
            levels = ["low", "medium", "high", "xhigh", "max"]
            if model != "claude-opus-5-5":
                levels.insert(0, "off")
        elif model == "claude-sonnet-4-6":
            levels = ["off", "low", "medium", "high", "max"]
        elif model.startswith("claude-haiku-4-5"):
            levels = ["off", "on"]
    elif provider == "qwen":
        if model.startswith("qwen3.8"):
            levels, initial = ["off", "low", "medium", "xhigh"], "off"
        elif model.startswith(("qwen3.7", "qwen3.5", "qwen3-max")) or model == "qwen-plus":
            levels, initial = ["off", "on"], "off"
    elif provider == "mistral":
        if model.startswith("mistral-large-4"):
            levels = ["low", "medium", "high"]
        elif model in {"mistral-medium-3-5", "mistral-small-2603"}:
            levels = ["off", "high"]
    elif provider == "kimi":
        if model == "kimi-k3":
            levels = ["low", "high", "max"]
        elif model == "kimi-k2.6":
            levels = ["off", "on"]
    return {"provider": provider, "model": model, "default": initial,
            "options": [{"id": value, "label": LABELS[value]} for value in ["default", *levels]]}


def resolve_reasoning(provider: str, model: str, selection: str | None = None) -> dict:
    """Erzeugt native Request-Felder; ungültige Wünsche werden nie still ersetzt."""
    caps = model_options(provider, model)
    provider = caps["provider"]
    value = selection if selection is not None else caps["default"]
    if value not in {option["id"] for option in caps["options"]}:
        raise ValueError(f"Denkmodus '{value}' wird von {model} nicht unterstützt.")
    params: dict = {}
    if value != "default":
        if provider == "deepseek":
            params["thinking"] = {"type": "disabled" if value == "off" else "enabled"}
            if value != "off":
                params["reasoning_effort"] = value
        elif provider in {"openai", "mistral"}:
            params["reasoning_effort"] = "none" if value == "off" else value
        elif provider == "qwen":
            params["enable_thinking"] = value != "off"
            if value not in {"off", "on"}:
                params["reasoning_effort"] = value
            elif value == "on":
                params["thinking_budget"] = 8192
        elif provider == "kimi":
            if model == "kimi-k3":
                params["reasoning_effort"] = value
            else:
                params["thinking"] = {"type": "disabled" if value == "off" else "enabled"}
        elif provider == "anthropic":
            if value == "off":
                params["thinking"] = {"type": "between_tools" if model == "claude-sonnet-5-5" else "disabled"}
            elif value == "on":
                params["thinking"] = {"type": "enabled", "budget_tokens": 8192}
            else:
                params.update(thinking={"type": "adaptive"}, output_config={"effort": value})
    return {"selection": value, "parameters": params,
            "explicit_thinking": value not in {"default", "off"}}
