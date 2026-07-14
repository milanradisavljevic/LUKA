"""Tests für die persistenten Schreibpfade im PyInstaller-Bundle-Modus.

Hintergrund: Im Onefile-Bundle zeigt __file__ ins flüchtige _MEIPASS-Temp-
Verzeichnis. Ohne Sonderbehandlung landeten Config-Änderungen, gespeicherte
Rubriken und Analyse-JSONs dort und waren nach jedem Neustart verloren.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import natascha_core as nc
import natascha_db as ndb


def _fake_bundle(tmp_path: Path) -> Path:
    bundle = tmp_path / "bundle"
    (bundle / "rubrics").mkdir(parents=True)
    (bundle / "prompts").mkdir()
    (bundle / "natascha_config.toml").write_text("[api]\n", encoding="utf-8")
    (bundle / "feedback_schema.json").write_text("{}", encoding="utf-8")
    (bundle / "rubrics" / "kommentar.md").write_text("# Original", encoding="utf-8")
    (bundle / "prompts" / "haupt.txt").write_text("Prompt", encoding="utf-8")
    return bundle


def test_seed_kopiert_alles_beim_ersten_start(tmp_path):
    bundle = _fake_bundle(tmp_path)
    data = tmp_path / "data"
    nc._seed_data_dir(bundle, data)
    assert (data / "natascha_config.toml").read_text(encoding="utf-8") == "[api]\n"
    assert (data / "feedback_schema.json").is_file()
    assert (data / "rubrics" / "kommentar.md").read_text(encoding="utf-8") == "# Original"
    assert (data / "prompts" / "haupt.txt").is_file()


def test_seed_ueberschreibt_nutzeraenderungen_nie(tmp_path):
    bundle = _fake_bundle(tmp_path)
    data = tmp_path / "data"
    nc._seed_data_dir(bundle, data)
    # Lehrkraft passt Config und Rubrik an …
    (data / "natascha_config.toml").write_text("[api]\nprovider='mistral'\n", encoding="utf-8")
    (data / "rubrics" / "kommentar.md").write_text("# Meine Fassung", encoding="utf-8")
    # … App-Update seedet erneut:
    nc._seed_data_dir(bundle, data)
    assert "mistral" in (data / "natascha_config.toml").read_text(encoding="utf-8")
    assert (data / "rubrics" / "kommentar.md").read_text(encoding="utf-8") == "# Meine Fassung"


def test_seed_liefert_neue_bundle_dateien_nach(tmp_path):
    bundle = _fake_bundle(tmp_path)
    data = tmp_path / "data"
    nc._seed_data_dir(bundle, data)
    # Update bringt eine neue Rubrik mit:
    (bundle / "rubrics" / "neu_geschichte.md").write_text("# Neu", encoding="utf-8")
    nc._seed_data_dir(bundle, data)
    assert (data / "rubrics" / "neu_geschichte.md").is_file()


def test_dev_modus_bleibt_unveraendert():
    # Nicht gefroren → Repo-Verzeichnis (dort liegt diese Datei).
    assert not getattr(sys, "frozen", False)
    assert nc._resolve_project_root() == Path(nc.__file__).resolve().parent


def test_frozen_nutzt_persistentes_datenverzeichnis(tmp_path, monkeypatch):
    bundle = _fake_bundle(tmp_path)
    fake_home = tmp_path / "home"
    fake_home.mkdir()
    monkeypatch.setattr(Path, "home", staticmethod(lambda: fake_home))
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "_MEIPASS", str(bundle), raising=False)

    root = nc._resolve_project_root()
    assert root == fake_home / "lehr-suite-bridge" / "natascha"
    assert (root / "natascha_config.toml").is_file()  # Seed passiert beim Auflösen


def test_db_pfad_relativ_im_frozen_modus(tmp_path, monkeypatch):
    fake_home = tmp_path / "home"
    fake_home.mkdir()
    monkeypatch.setattr(Path, "home", staticmethod(lambda: fake_home))
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    p = ndb.get_db_path({"database": {"path": "test.db"}})
    assert p == fake_home / "lehr-suite-bridge" / "natascha" / "test.db"
    # Absolute Pfade (Normalfall, --db-path/Config) bleiben unangetastet:
    absolut = str(tmp_path / "x.db")
    assert ndb.get_db_path({"database": {"path": absolut}}) == Path(absolut)
