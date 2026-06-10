#!/usr/bin/env python3
"""
NATASCHA CLI — Headless-Interface fuer LUA-Integration.

Sub-Commands:
  analyze <docx>           LLM-Analyse einer Schuelerabgabe
  srdp-detail <abgabe-id>  SRDP-Detail fuer eine bestehende Analyse
  schueler-profil          LLM-Schuelerprofil (benoetigt --schueler-id)
  klassen-briefing         LLM-Klassenbriefing (benoetigt --klasse)
  feedback-docx <abgabe-id> Feedback-DOCX generieren
  erwartungshorizont       Erwartungshorizont generieren

Lese-Abfragen (Klassen/Heatmap/Statistik/…) laufen NICHT hier, sondern direkt
über den Rust-Read-Layer in LUA (natascha_read.rs). Diese CLI deckt nur ab, was
echten Python-Code braucht: LLM-Analyse, Benotung, DOCX, Prompts.

Globale Option: --db-path <pfad> (muss VOR dem Sub-Command stehen) — gemeinsame
DB mit LUA. Alle Ausgabe als JSON auf stdout, Fehler auf stderr.
Exit-Code 0 = Erfolg, 1 = Fehler.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent

# Von --db-path gesetzt (gemeinsame DB mit LUA). Überschreibt den Config-Pfad,
# damit LUA als Single Source of Truth den DB-Pfad vorgeben kann.
_DB_PATH_OVERRIDE = None


def _load_env_and_config():
    sys.path.insert(0, str(PROJECT_ROOT))
    import natascha_core as nc
    import natascha_db as ndb
    nc._load_dotenv()
    config = nc.load_config()
    if _DB_PATH_OVERRIDE:
        db_path = Path(_DB_PATH_OVERRIDE).expanduser()
    else:
        db_path = ndb.get_db_path(config)
    ndb.init_db(db_path)
    return nc, ndb, config, db_path


def _json_out(data):
    json.dump(data, sys.stdout, ensure_ascii=False, indent=2, default=str)
    sys.stdout.write("\n")


def cmd_analyze(args):
    nc, ndb, config, db_path = _load_env_and_config()
    file_path = Path(args.file).resolve()
    if not file_path.is_file():
        print(f"Datei nicht gefunden: {file_path}", file=sys.stderr)
        return 1

    rubric = nc.load_rubric_for_aufgabe(config, args.klasse, args.aufgabe)
    docx_text = nc.read_docx_text(file_path)

    # Fehlt fach/schulstufe/textsorte, aus der Aufgaben-Config ableiten — so wirkt
    # eine in der App angelegte Aufgabe (inkl. Rubrik) direkt bei der Korrektur.
    auf_cfg = nc.get_aufgabe_cfg(config, args.klasse, args.aufgabe) or {}
    fach = args.fach or auf_cfg.get("fach", "")
    schulstufe = args.schulstufe or auf_cfg.get("schulstufe", "")
    textsorte = args.textsorte or auf_cfg.get("textsorte", "")

    ausgangstext_path = None
    if args.ausgangstext:
        ausgangstext_path = Path(args.ausgangstext).resolve()

    cancel_event = None
    if args.cancel_timeout:
        import threading
        cancel_event = threading.Event()

    data, errors = nc.run_llm_analysis(
        docx_text=docx_text,
        rubric_content=rubric,
        fach=fach,
        schulstufe=schulstufe,
        textsorte=textsorte,
        config=config,
        schueler=args.schueler or "",
        cancel_event=cancel_event,
        max_retries=args.max_retries,
        file_path=file_path,
        bewertungsmodus=args.bewertungsmodus,
        ausgangstext_path=ausgangstext_path,
        klasse=args.klasse,
        aufgabe=args.aufgabe,
        erwartungshorizont_name=args.erwartungshorizont or "",
        rubric_name=args.rubric or "",
    )

    if data is None:
        print("Analyse fehlgeschlagen:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 1

    if not args.quiet:
        for e in errors:
            print(f"Hinweis: {e}", file=sys.stderr)

    result = {"analysis": data, "errors": errors}
    if data.get("_abgabe_id"):
        result["abgabe_id"] = data["_abgabe_id"]
    _json_out(result)
    return 0


def cmd_srdp_detail(args):
    nc, ndb, config, db_path = _load_env_and_config()
    abgabe = ndb.get_abgaben_by_klasse_aufgabe(db_path, "", "")
    data_row = None
    for row in abgabe:
        if row["id"] == args.abgabe_id:
            data_row = row
            break
    if not data_row:
        from natascha_db import get_abgabe_by_hash
        print(f"Abgabe-ID {args.abgabe_id} nicht gefunden", file=sys.stderr)
        return 1

    import threading
    result = nc.generate_srdp_detail(
        schuelertext=data_row.get("rohtext", ""),
        hauptanalyse={},
        config=config,
        cancel_event=None,
        textsorte=data_row.get("textsorte", ""),
    )
    if result is None:
        print("SRDP-Detail-Generierung fehlgeschlagen", file=sys.stderr)
        return 1
    _json_out(result)
    return 0


def cmd_schueler_profil(args):
    nc, ndb, config, db_path = _load_env_and_config()
    laengsschnitt = ndb.get_schueler_laengsschnitt(db_path, args.schueler_id)
    if not laengsschnitt or laengsschnitt.get("anzahl_abgaben", 0) == 0:
        print(f"Kein Laengsschnitt fuer Schueler-ID {args.schueler_id}", file=sys.stderr)
        return 1
    prompt = nc.build_schueler_profil_prompt(laengsschnitt)
    effective_config = _apply_provider_override(config, args)
    try:
        result_text = nc.run_llm_api(prompt, effective_config)
    except Exception as e:
        print(str(e), file=sys.stderr)
        return 1
    modell = effective_config.get("api", {}).get("model", "")
    profil_id = ndb.save_schueler_profil(
        db_path, args.schueler_id,
        {"text": result_text},
        basis_anzahl_abgaben=laengsschnitt.get("anzahl_abgaben", 0),
        modell=modell,
    )
    _json_out({"id": profil_id, "schueler_id": args.schueler_id, "text": result_text, "modell": modell})
    return 0


def cmd_klassen_briefing(args):
    nc, ndb, config, db_path = _load_env_and_config()
    feedback = ndb.get_klassen_feedback(db_path, args.klasse, args.aufgabe)
    k1k3 = ndb.get_klassen_k1_k3(db_path, args.klasse, args.aufgabe)
    notenvert = ndb.get_notenverteilung(db_path, args.klasse, args.aufgabe)
    kalib = ndb.get_klassen_kalibrierung(db_path, args.klasse, args.aufgabe)
    trend = ndb.get_klassen_trend(db_path, args.klasse)
    aggregat = {
        **feedback,
        "k1k3": k1k3,
        "notenverteilung": notenvert,
        "kalibrierung": kalib,
        "trend": trend,
    }
    prompt = nc.build_klassen_briefing_prompt(aggregat)
    effective_config = _apply_provider_override(config, args)
    try:
        result_text = nc.run_llm_api(prompt, effective_config)
    except Exception as e:
        print(str(e), file=sys.stderr)
        return 1
    modell = effective_config.get("api", {}).get("model", "")
    briefing_id = ndb.save_klassen_briefing(
        db_path, args.klasse, args.aufgabe or None,
        {"text": result_text},
        basis_anzahl_abgaben=feedback.get("anzahl_abgaben", 0),
        basis_anzahl_fehler=feedback.get("anzahl_fehler", 0),
        modell=modell,
    )
    _json_out({"id": briefing_id, "klasse": args.klasse, "aufgabe": args.aufgabe or None,
               "text": result_text, "modell": modell})
    return 0


def _apply_provider_override(config: dict, args) -> dict:
    """Gibt config mit überschriebenem provider/model zurück (falls --provider/--model gesetzt)."""
    provider = getattr(args, "provider", "") or ""
    model = getattr(args, "model", "") or ""
    if not provider and not model:
        return config
    cfg = dict(config)
    cfg["api"] = dict(config.get("api", {}))
    if provider:
        cfg["api"]["provider"] = provider
    if model:
        cfg["api"]["model"] = model
    return cfg


def cmd_feedback_docx(args):
    nc, ndb, config, db_path = _load_env_and_config()
    import generate_feedback as gf
    import sqlite3

    abgabe_id = args.abgabe_id
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM abgabe WHERE id = ?", (abgabe_id,)).fetchone()
    conn.close()
    if row is None:
        print(f"Abgabe-ID {abgabe_id} nicht gefunden", file=sys.stderr)
        return 1
    abgabe = dict(row)

    feedback_json_path = abgabe.get("feedback_json_path", "")
    if feedback_json_path and Path(feedback_json_path).is_file():
        data = gf.load_feedback_json(Path(feedback_json_path))
    else:
        print("Kein Feedback-JSON fuer diese Abgabe", file=sys.stderr)
        return 1

    doc = gf.build_feedback_document(data, config=config, bewertungsmodus=args.bewertungsmodus)
    output = args.output or str(Path.cwd() / f"feedback_{abgabe_id}.docx")
    doc.save(output)
    _json_out({"path": output, "abgabe_id": abgabe_id})
    return 0


def cmd_erwartungshorizont(args):
    nc, ndb, config, db_path = _load_env_and_config()
    try:
        text = nc.generate_erwartungshorizont(
            config=config,
            klasse=args.klasse,
            aufgabe=args.aufgabe,
            provider=args.provider or "",
            model=args.model or "",
        )
    except (ValueError, RuntimeError) as e:
        print(str(e), file=sys.stderr)
        return 1
    _json_out({"erwartungshorizont": text})
    return 0


def cmd_erwartungshorizont_save(args):
    """Speichert den (ggf. bearbeiteten) Erwartungshorizont-Text (von stdin) als
    rubrics/erwartungshorizont_<klasse>_<aufgabe>.md und verlinkt ihn in der Config,
    sodass ihn die Korrektur automatisch nutzt."""
    nc, ndb, config, db_path = _load_env_and_config()
    text = sys.stdin.read()
    if not text.strip():
        print("Kein Erwartungshorizont-Text übergeben (stdin leer)", file=sys.stderr)
        return 1
    auf = (
        config.get("classes", {}).get(args.klasse, {})
        .get("aufgaben", {}).get(args.aufgabe)
    )
    if auf is None:
        print(
            f"Aufgabe '{args.aufgabe}' in Klasse '{args.klasse}' nicht in der Config — "
            "bitte zuerst die Aufgabe anlegen.",
            file=sys.stderr,
        )
        return 1
    rubrics_dir = nc.resolve_path(config, "rubrics")
    rubrics_dir.mkdir(parents=True, exist_ok=True)
    fname = f"erwartungshorizont_{_slugify(args.klasse)}_{_slugify(args.aufgabe)}.md"
    (rubrics_dir / fname).write_text(text, encoding="utf-8")
    nc.save_erwartungshorizont_to_config(args.klasse, args.aufgabe, fname)
    _json_out({"klasse": args.klasse, "aufgabe": args.aufgabe, "datei": fname})
    return 0


def _slugify(text):
    import re
    s = re.sub(r"[^a-zA-Z0-9]+", "_", (text or "").strip()).strip("_")
    return s or "aufgabe"


def cmd_add_klasse(args):
    nc, ndb, config, db_path = _load_env_and_config()
    name = (args.name or "").strip()
    if not name:
        print("Klassenname darf nicht leer sein", file=sys.stderr)
        return 1
    if name in config.get("classes", {}):
        print(f"Klasse '{name}' existiert bereits", file=sys.stderr)
        return 1
    nc.add_class_to_config(name, f"input/{name}", f"output/{name}")
    _json_out({"klasse": name})
    return 0


def cmd_add_aufgabe(args):
    nc, ndb, config, db_path = _load_env_and_config()
    klasse = (args.klasse or "").strip()
    label = (args.label or "").strip()
    if not klasse or not label:
        print("Klasse und Aufgaben-Bezeichnung sind erforderlich", file=sys.stderr)
        return 1
    if klasse not in config.get("classes", {}):
        print(f"Klasse '{klasse}' existiert nicht — zuerst anlegen", file=sys.stderr)
        return 1
    slug = (args.slug or "").strip() or _slugify(label)
    fach = args.fach or ""
    schulstufe = args.schulstufe or ""
    rubric = args.rubric or nc.default_rubric_for(fach, schulstufe, config)
    nc.add_aufgabe_to_config(klasse, slug, label, fach, schulstufe, args.textsorte or "", rubric)
    _json_out({"klasse": klasse, "aufgabe": slug, "label": label, "rubric": rubric})
    return 0


def cmd_list_rubrics(args):
    nc, ndb, config, db_path = _load_env_and_config()
    rubrics = nc.rubric_options_for(args.fach or "", args.schulstufe or "", config)
    _json_out(rubrics)
    return 0


# Hinweis: Reine Lese-Befehle (klassen-liste/aufgaben/abgaben/heatmap/
# notenverteilung/statistik) wurden entfernt — LUA liest direkt über den
# Rust-Read-Layer (natascha_read.rs, db_*). Eine Read-Quelle statt zwei.


def main():
    global _DB_PATH_OVERRIDE
    parser = argparse.ArgumentParser(
        prog="natascha_cli",
        description="NATASCHA Headless-CLI — Sub-Commands fuer LUA-Integration",
    )
    parser.add_argument(
        "--db-path",
        default=None,
        help="Überschreibt den DB-Pfad (gemeinsame DB mit LUA). Muss VOR dem Sub-Command stehen.",
    )
    sub = parser.add_subparsers(dest="command", help="Verfuegbare Befehle")

    # analyze
    p_analyze = sub.add_parser("analyze", help="LLM-Analyse einer Schuelerabgabe")
    p_analyze.add_argument("file", help="Pfad zur DOCX/PDF-Datei")
    p_analyze.add_argument("--klasse", required=True)
    p_analyze.add_argument("--aufgabe", required=True)
    p_analyze.add_argument("--fach", default="")
    p_analyze.add_argument("--schulstufe", default="")
    p_analyze.add_argument("--textsorte", default="")
    p_analyze.add_argument("--schueler", default="")
    p_analyze.add_argument("--bewertungsmodus", default="benotet", choices=["benotet", "formativ"])
    p_analyze.add_argument("--ausgangstext", default=None)
    p_analyze.add_argument("--erwartungshorizont", default="")
    p_analyze.add_argument("--rubric", default="")
    p_analyze.add_argument("--max-retries", type=int, default=3)
    p_analyze.add_argument("--cancel-timeout", type=int, default=None)
    p_analyze.add_argument("--quiet", action="store_true")

    # srdp-detail
    p_srdp = sub.add_parser("srdp-detail", help="SRDP-Detail fuer bestehende Analyse")
    p_srdp.add_argument("abgabe_id", type=int)

    # schueler-profil
    p_profil = sub.add_parser("schueler-profil", help="KI-Schuelerprofil generieren + speichern")
    p_profil.add_argument("--schueler-id", type=int, required=True)
    p_profil.add_argument("--provider", default="")
    p_profil.add_argument("--model", default="")

    # klassen-briefing
    p_briefing = sub.add_parser("klassen-briefing", help="KI-Klassenbriefing generieren + speichern")
    p_briefing.add_argument("--klasse", required=True)
    p_briefing.add_argument("--aufgabe", default=None)
    p_briefing.add_argument("--provider", default="")
    p_briefing.add_argument("--model", default="")

    # feedback-docx
    p_docx = sub.add_parser("feedback-docx", help="Feedback-DOCX generieren")
    p_docx.add_argument("abgabe_id", type=int)
    p_docx.add_argument("--output", default=None)
    p_docx.add_argument("--bewertungsmodus", default="benotet")

    # erwartungshorizont
    p_eh = sub.add_parser("erwartungshorizont", help="Erwartungshorizont generieren")
    p_eh.add_argument("--klasse", required=True)
    p_eh.add_argument("--aufgabe", required=True)
    p_eh.add_argument("--provider", default="")
    p_eh.add_argument("--model", default="")
    p_ehs = sub.add_parser("erwartungshorizont-save", help="Erwartungshorizont (stdin) speichern + verlinken")
    p_ehs.add_argument("--klasse", required=True)
    p_ehs.add_argument("--aufgabe", required=True)

    # Welle 4: Setup (Klasse/Aufgabe/Rubrik)
    p_addk = sub.add_parser("add-klasse", help="Neue Klasse in der Config anlegen")
    p_addk.add_argument("name")
    p_adda = sub.add_parser("add-aufgabe", help="Neue Aufgabe (mit Rubrik) anlegen")
    p_adda.add_argument("klasse")
    p_adda.add_argument("label")
    p_adda.add_argument("--slug", default="")
    p_adda.add_argument("--fach", default="")
    p_adda.add_argument("--schulstufe", default="")
    p_adda.add_argument("--textsorte", default="")
    p_adda.add_argument("--rubric", default="")
    p_lr = sub.add_parser("list-rubrics", help="Verfuegbare Rubriken auflisten")
    p_lr.add_argument("--fach", default="")
    p_lr.add_argument("--schulstufe", default="")


    args = parser.parse_args()
    _DB_PATH_OVERRIDE = args.db_path
    if not args.command:
        parser.print_help()
        return 1

    commands = {
        "analyze": cmd_analyze,
        "srdp-detail": cmd_srdp_detail,
        "schueler-profil": cmd_schueler_profil,
        "klassen-briefing": cmd_klassen_briefing,
        "feedback-docx": cmd_feedback_docx,
        "erwartungshorizont": cmd_erwartungshorizont,
        "erwartungshorizont-save": cmd_erwartungshorizont_save,
        "add-klasse": cmd_add_klasse,
        "add-aufgabe": cmd_add_aufgabe,
        "list-rubrics": cmd_list_rubrics,
    }

    handler = commands.get(args.command)
    if handler is None:
        parser.print_help()
        return 1

    try:
        return handler(args)
    except Exception as e:
        print(f"Fehler: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())