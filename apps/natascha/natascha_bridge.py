"""Datei-Brücke NATASCHA → LUA (Phase 1).

Exportiert die klassenweiten Korrekturdaten einer Klasse/Aufgabe (Fehler-Heatmap,
echte Fehlerbeispiele, LLM-Empfehlungen) als JSON in den geteilten Inbox-Ordner.
Das Lehrunterlagen-Tool (LUA) liest die Datei in Step0 und generiert daraus
gezielte Übungen zu den Fehlerschwerpunkten der Klasse.

Vertrag: ../../bridge/schema.json (schemaVersion 1).

CLI:
    python natascha_bridge.py <klasse> <aufgabe> [--inbox <dir>]
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import tempfile
from datetime import date
from pathlib import Path
from typing import Any

import natascha_db as ndb

SCHEMA_VERSION = 2

# NATASCHA kennt nur diese vier groben Fehlerkategorien (fehler_historie.typ).
_TYP_KATEGORIE = {
    "R": "Rechtschreibung",
    "G": "Grammatik",
    "Z": "Zeichensetzung",
    "A": "Ausdruck/Stil",
}


def default_inbox_dir() -> Path:
    """Standard-Inbox — identisch zur LUA-Seite (home-basiert, außerhalb des Repos,
    damit keine Schüler-Echtdaten im Git-Baum landen)."""
    home = os.environ.get("USERPROFILE") or os.environ.get("HOME") or "."
    return Path(home) / "lehr-suite-bridge" / "inbox"


def _resolve_inbox_dir(config: dict[str, Any], inbox_dir: str | os.PathLike | None) -> Path:
    if inbox_dir:
        return Path(inbox_dir)
    bridge_cfg = config.get("bridge", {}) if isinstance(config, dict) else {}
    raw = bridge_cfg.get("inbox_dir") if isinstance(bridge_cfg, dict) else None
    return Path(raw) if raw else default_inbox_dir()


def _normalize_fach(fach: str | None) -> str | None:
    if not fach:
        return None
    f = fach.strip().casefold().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
    f = re.sub(r"\s+", " ", f.replace("ß", "ss"))
    alias = {
        "franzoesisch": "franzoesisch",
        "spanisch": "spanisch",
        "italienisch": "italienisch",
        "latein": "latein",
        "geschichte": "geschichte",
        "geographie": "geographie",
        "geo": "geographie",
        "religion": "religion",
        "ethik": "ethik",
        "psychologie": "psychologie",
        "philosophie": "philosophie",
        "medien und demokratie": "mediendemokratie",
        "mediendemokratie": "mediendemokratie",
        "informatik und kuenstliche intelligenz": "informatikki",
        "informatikki": "informatikki",
    }
    erlaubte_faecher = {
        "deutsch", "englisch", "franzoesisch", "spanisch", "italienisch", "latein",
        "geschichte", "geographie", "religion", "ethik", "psychologie", "philosophie",
        "mediendemokratie", "informatikki",
    }
    kanonisch = alias.get(f, f)
    return kanonisch if kanonisch in erlaubte_faecher else None


def _normalize_land(land: str | None) -> str | None:
    if not land:
        return None
    kanonisch = land.strip().upper()
    return kanonisch if kanonisch in {"AT", "DE", "CH"} else None


def _normalize_schulstufe_nummer(schulstufe: Any) -> int | None:
    if schulstufe is None:
        return None
    match = re.search(r"(?<!\d)(1[0-3]|[5-9])(?!\d)", str(schulstufe).strip())
    return int(match.group(1)) if match else None


def _normalize_stufe(schulstufe: str | None, land: str | None = None) -> str | None:
    if not schulstufe:
        return None
    s = schulstufe.strip().lower()
    if "ober" in s or "sek ii" in s:
        return "oberstufe"
    if "unter" in s or "sek i" in s:
        return "unterstufe"
    nummer = _normalize_schulstufe_nummer(s)
    if nummer is not None:
        grenze = 10 if _normalize_land(land) == "DE" else 8
        return "unterstufe" if nummer <= grenze else "oberstufe"
    return None


def _read_abgabe_meta(db_path: Path | str, klasse: str, aufgabe: str) -> dict[str, Any]:
    """Liest Aufgabenkontext und ergänzt fehlende Werte aus LUA-Klassenmetadaten."""
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT fach, schulstufe, textsorte FROM abgabe"
            " WHERE klasse = ? AND aufgabe = ? ORDER BY datum DESC LIMIT 1",
            (klasse, aufgabe),
        ).fetchone()
        result = dict(row) if row else {}
        table_exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='lua_klassen'"
        ).fetchone()
        if table_exists:
            columns = {
                column[1] for column in conn.execute("PRAGMA table_info(lua_klassen)").fetchall()
            }
            wanted = [
                name for name in ("fach", "land", "stufe", "schulstufe") if name in columns
            ]
            if wanted:
                query = "SELECT " + ", ".join(wanted) + " FROM lua_klassen WHERE name=?"
                class_row = conn.execute(query, (klasse,)).fetchone()
                if class_row:
                    class_meta = dict(class_row)
                    if not result.get("fach"):
                        result["fach"] = class_meta.get("fach")
                    if not result.get("stufe"):
                        result["stufe"] = class_meta.get("stufe")
                    # Die konkrete Klassenschulstufe ist präziser als ein bloßes
                    # "Oberstufe" in einer älteren Abgabe.
                    if _normalize_schulstufe_nummer(result.get("schulstufe")) is None:
                        if class_meta.get("schulstufe") is not None:
                            result["schulstufe_nummer"] = class_meta["schulstufe"]
                        if class_meta.get("stufe"):
                            result["schulstufe"] = class_meta["stufe"]
                    result["land"] = class_meta.get("land")
    return result


def build_bridge_payload(
    db_path: Path | str,
    klasse: str,
    aufgabe: str,
    *,
    max_beispiele: int = 12,
    ausgangstext: str | None = None,
) -> dict[str, Any]:
    """Baut das Bridge-Payload gemäß bridge/schema.json (schemaVersion 2).

    `ausgangstext` (optional): Ausgangstext/Arbeitsauftrag der Originalarbeit. Wird
    mitgeschrieben, damit LUA den Quelltext der Übung vorbefüllen kann. Fällt zurück
    auf ein evtl. in der Abgabe gespeichertes Feld.
    """
    feedback = ndb.get_klassen_feedback(db_path, klasse, aufgabe)
    abgabe_meta = _read_abgabe_meta(db_path, klasse, aufgabe)

    heatmap: list[dict[str, Any]] = []
    for h in feedback.get("heatmap", []):
        typ = h.get("typ", "")
        heatmap.append(
            {
                "typ": typ,
                "kategorie": _TYP_KATEGORIE.get(typ, typ),
                "anzahl": int(h.get("anzahl", 0)),
                "prozent": float(h.get("prozent", 0.0)),
            }
        )

    beispiele: list[dict[str, Any]] = []
    for b in feedback.get("beispiele", [])[:max_beispiele]:
        eintrag: dict[str, Any] = {
            "typ": b.get("typ", ""),
            "zitat": b.get("zitat", ""),
            "korrektur": b.get("korrektur", ""),
        }
        if b.get("erklaerung"):
            eintrag["erklaerung"] = b["erklaerung"]
        if b.get("haeufigkeit"):
            eintrag["haeufigkeit"] = int(b["haeufigkeit"])
        if b.get("cluster_id") or b.get("clusterId"):
            eintrag["clusterId"] = b.get("cluster_id") or b.get("clusterId")
        if b.get("regel_muster") or b.get("regelMuster"):
            eintrag["regelMuster"] = b.get("regel_muster") or b.get("regelMuster")
        beispiele.append(eintrag)

    empfehlungen = [
        e.get("text", "")
        for e in feedback.get("empfehlungen", [])
        if isinstance(e, dict) and e.get("text")
    ]

    payload: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "klasse": klasse,
        "aufgabe": aufgabe,
        "fach": _normalize_fach(abgabe_meta.get("fach")) or "deutsch",
        "datum": date.today().isoformat(),
        "anzahlAbgaben": int(feedback.get("anzahl_abgaben", 0)),
        "heatmap": heatmap,
        "beispiele": beispiele,
        "empfehlungen": empfehlungen,
    }
    land = _normalize_land(abgabe_meta.get("land"))
    if land:
        payload["land"] = land
    schulstufe_nummer = (
        _normalize_schulstufe_nummer(abgabe_meta.get("schulstufe_nummer"))
        or _normalize_schulstufe_nummer(abgabe_meta.get("schulstufe"))
    )
    stufe = _normalize_stufe(abgabe_meta.get("schulstufe"), land)
    if not stufe:
        stufe = _normalize_stufe(abgabe_meta.get("stufe"), land)
    if stufe:
        payload["schulstufe"] = stufe
    if schulstufe_nummer:
        payload["schulstufeNummer"] = schulstufe_nummer
    if abgabe_meta.get("textsorte"):
        payload["textsorte"] = abgabe_meta["textsorte"]
    quelle = (
        ausgangstext
        or ndb.get_aufgabe_quelltext(db_path, klasse, aufgabe)
        or abgabe_meta.get("ausgangstext")
        or ""
    ).strip()
    if quelle:
        payload["ausgangstext"] = quelle
    return payload


def _safe_segment(s: str) -> str:
    seg = "".join(c if c.isalnum() else "_" for c in (s or "").strip()).strip("_")
    return seg or "x"


def export_klassen_bridge(
    db_path: Path | str,
    klasse: str,
    aufgabe: str,
    *,
    inbox_dir: str | os.PathLike | None = None,
    config: dict[str, Any] | None = None,
    ausgangstext: str | None = None,
) -> Path:
    """Schreibt den Bridge-Export atomar in die Inbox und gibt den Zielpfad zurück."""
    config = config or {}
    inbox = _resolve_inbox_dir(config, inbox_dir)
    inbox.mkdir(parents=True, exist_ok=True)

    payload = build_bridge_payload(db_path, klasse, aufgabe, ausgangstext=ausgangstext)
    fname = f"{_safe_segment(klasse)}_{_safe_segment(aufgabe)}_{payload['datum']}.json"
    target = inbox / fname

    # Atomar schreiben: temp-Datei im selben Verzeichnis, dann os.replace().
    fd, tmp_path = tempfile.mkstemp(dir=str(inbox), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, target)
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
    return target


def _load_config() -> dict[str, Any]:
    """Lädt natascha_config.toml (best effort) für den DB-Pfad."""
    cfg_path = Path(__file__).resolve().parent / "natascha_config.toml"
    if not cfg_path.is_file():
        return {}
    try:
        import tomllib  # Python 3.11+
    except ModuleNotFoundError:  # pragma: no cover
        return {}
    with open(cfg_path, "rb") as f:
        return tomllib.load(f)


def _main(argv: list[str]) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="NATASCHA → LUA Bridge-Export")
    parser.add_argument("klasse")
    parser.add_argument("aufgabe")
    parser.add_argument("--inbox", default=None, help="Inbox-Ordner (Default: ~/lehr-suite-bridge/inbox)")
    parser.add_argument(
        "--ausgangstext-file",
        default=None,
        help="Textdatei mit dem Ausgangstext/Arbeitsauftrag der Originalarbeit. "
             "Wird in den Export (v2) übernommen, damit LUA den Quelltext vorbefüllt.",
    )
    args = parser.parse_args(argv)

    config = _load_config()
    db_path = ndb.get_db_path(config)
    if not Path(db_path).is_file():
        print(f"DB nicht gefunden: {db_path}\n"
              f"Tipp: zuerst 'python seed_testdaten.py' ausführen.")
        return 1

    ausgangstext = None
    if args.ausgangstext_file:
        ausgangstext = Path(args.ausgangstext_file).read_text(encoding="utf-8")

    target = export_klassen_bridge(
        db_path, args.klasse, args.aufgabe, inbox_dir=args.inbox, config=config,
        ausgangstext=ausgangstext,
    )
    print(f"Bridge-Export geschrieben: {target}")
    return 0


if __name__ == "__main__":
    import sys

    raise SystemExit(_main(sys.argv[1:]))
