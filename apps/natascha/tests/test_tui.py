from __future__ import annotations

import builtins
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha
from natascha_core import (
    check_agent_availability,
    default_rubric_for,
    humanize_agent_error,
    is_vision_capable,
    load_config,
    rubric_options_for,
    run_agent_sync,
)


def test_default_rubric_for_uses_configured_mapping() -> None:
    config = load_config()

    assert (
        default_rubric_for("Deutsch", "Oberstufe", config)
        == "srdp_deutsch_oberstufe.md"
    )
    assert default_rubric_for("Englisch", "Unterstufe", config) == "englisch_a2.md"
    assert default_rubric_for("Englisch", "Oberstufe", config) == "srdp_englisch_b2.md"


def test_rubric_options_for_english_upper_stage_offers_b2_and_b1() -> None:
    config = load_config()

    options = rubric_options_for("Englisch", "Oberstufe", config)
    assert "srdp_englisch_b2.md" in options
    assert "srdp_englisch_b1.md" in options


def test_rubric_options_filter_stage_specific_files_but_keep_generic() -> None:
    config = load_config()

    upper = rubric_options_for("Deutsch", "Oberstufe", config)
    lower = rubric_options_for("Deutsch", "Unterstufe", config)

    assert "srdp_deutsch_oberstufe.md" in upper
    assert "deutsch_unterstufe.md" not in upper
    assert "englisch_a2.md" not in upper
    assert "kommentar.md" in upper

    assert "deutsch_unterstufe.md" in lower
    assert "srdp_deutsch_oberstufe.md" not in lower
    assert "srdp_englisch_b2.md" not in lower
    assert "kommentar.md" in lower


def test_rubric_options_exclude_erwartungshorizont_files() -> None:
    config = load_config()

    options = rubric_options_for("Deutsch", "Oberstufe", config)

    assert all(not option.startswith("erwartungshorizont_") for option in options)


def test_run_agent_sync_transports_prompt_via_stdin() -> None:
    prompt = "erste zeile\nquote ' bleibt erhalten"

    output = run_agent_sync("cat", prompt, timeout=5)

    assert output.strip() == prompt


def test_humanize_agent_error_nicht_gefunden() -> None:
    msg = humanize_agent_error("FEHLER: Befehl nicht gefunden: claude", "claude")
    assert "nicht installiert" in msg


def test_humanize_agent_error_timeout() -> None:
    msg = humanize_agent_error("FEHLER: Timeout nach 120s", "claude")
    assert "zu lange gebraucht" in msg


def test_humanize_agent_error_api_key() -> None:
    msg = humanize_agent_error("FEHLER: API key nicht gesetzt", "api")
    assert "API-Schluessel" in msg


def test_check_agent_availability_returns_dict() -> None:
    config = load_config()
    availability = check_agent_availability(config)
    assert isinstance(availability, dict)
    for name in config.get("agent", {}).get("commands", {}):
        assert name in availability


def test_is_vision_capable_returns_false_for_mistral() -> None:
    assert not is_vision_capable("mistral", "mistral-small-latest")


def test_init_image_asset_exists() -> None:
    assert natascha.INIT_IMAGE_PATH.exists()


def test_render_init_image_returns_none_without_pillow(monkeypatch) -> None:
    original_import = builtins.__import__

    def fake_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "PIL":
            raise ImportError("blocked for test")
        return original_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    natascha.render_init_image.cache_clear()
    try:
        assert natascha.render_init_image(120) is None
    finally:
        natascha.render_init_image.cache_clear()


def test_render_brand_art_falls_back_to_ascii_logo(monkeypatch) -> None:
    monkeypatch.setattr(natascha, "render_init_image", lambda width=120: None)

    brand_art = natascha.render_brand_art(120)
    logo_art = natascha.render_logo_gradient(120)

    assert brand_art.plain == logo_art.plain


def test_logo_compact_used_below_120_cols():
    from natascha import LOGO_COMPACT, render_logo_gradient
    logo = render_logo_gradient(119)
    compact_lines = LOGO_COMPACT.strip("\n").split("\n")
    rendered = str(logo).rstrip("\n").split("\n")
    assert len(rendered) == len(compact_lines), "should use LOGO_COMPACT below 120 cols"


# ── _safe_select_value ────────────────────────────────────────────────────


def test_safe_select_value_known_value_returned() -> None:
    opts = [("Anthropic", "anthropic"), ("OpenAI", "openai"), ("DeepSeek", "deepseek")]
    assert natascha._safe_select_value("openai", opts) == "openai"


def test_safe_select_value_unknown_falls_back_to_default() -> None:
    opts = [("Anthropic", "anthropic"), ("OpenAI", "openai")]
    assert natascha._safe_select_value("mistral", opts, "anthropic") == "anthropic"


def test_safe_select_value_unknown_no_default_returns_first() -> None:
    opts = [("Anthropic", "anthropic"), ("OpenAI", "openai")]
    assert natascha._safe_select_value("mistral", opts) == "anthropic"


def test_safe_select_value_empty_options_returns_empty() -> None:
    assert natascha._safe_select_value("anthropic", []) == ""


def test_eh_screen_providers_cover_all_settings_providers() -> None:
    """EH-Screen-_PROVIDERS muss alle Provider aus SettingsScreen enthalten."""
    eh_values = {v for _, v in natascha.ErwartungshorizontGeneratorScreen._PROVIDERS}
    settings_values = {v for _, v in natascha.SettingsScreen._PROVIDERS}
    missing = settings_values - eh_values
    assert not missing, f"EH-Screen fehlen Provider: {missing}"


def test_logo_full_used_at_120_cols():
    from natascha import LOGO_FULL, render_logo_gradient
    logo = render_logo_gradient(120)
    full_lines = LOGO_FULL.strip("\n").split("\n")
    rendered = str(logo).rstrip("\n").split("\n")
    assert len(rendered) == len(full_lines), "should use LOGO_FULL at 120+ cols"
