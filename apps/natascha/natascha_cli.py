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
import hashlib
import json
import sys
import time
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


def _progress(stage: str, message: str) -> None:
    print(json.dumps({"stage": stage, "message": message}, ensure_ascii=False), file=sys.stderr)


def cmd_analyze(args):
    _progress("start", "Analyse wird vorbereitet")
    nc, ndb, config, db_path = _load_env_and_config()
    file_path = Path(args.file).resolve()
    args.klasse = ndb.normalize_klasse(args.klasse)
    args.aufgabe = ndb.normalize_aufgabe(args.aufgabe)
    if not file_path.is_file():
        print(f"Datei nicht gefunden: {file_path}", file=sys.stderr)
        return 1

    _progress("input", "Rubrik und Abgabe werden gelesen")
    rubric = (
        nc.load_rubric(args.rubric, config)
        if args.rubric
        else nc.load_rubric_for_aufgabe(config, args.klasse, args.aufgabe)
    )
    docx_text = nc.read_docx_text(file_path)

    # Fehlt fach/schulstufe/textsorte, aus der Aufgaben-Config ableiten — so wirkt
    # eine in der App angelegte Aufgabe (inkl. Rubrik) direkt bei der Korrektur.
    auf_cfg = nc.get_aufgabe_cfg(config, args.klasse, args.aufgabe) or {}
    fach = args.fach or auf_cfg.get("fach", "")
    schulstufe = args.schulstufe or auf_cfg.get("schulstufe", "")
    textsorte = args.textsorte or auf_cfg.get("textsorte", "")
    rubric_name = args.rubric or auf_cfg.get("rubric", "")
    if not rubric_name:
        rubric_name = nc.default_rubric_for(fach, schulstufe, config)
    if not rubric_name:
        rubric_name = (nc.list_all_rubrics(config) or [""])[0]
    rubric_path = nc.resolve_path(config, "rubrics") / rubric_name if rubric_name else None
    rubric_header = nc.parse_rubrik_header(rubric_path.read_text(encoding="utf-8")) if rubric_path and rubric_path.exists() else {}
    rubrik_titel = rubric_header.get("titel", "") or rubric_name
    auftrag_key = "|".join([
        args.klasse, args.aufgabe, rubric_name,
        args.einsatz_id or "", args.material_id or "",
    ])
    korrekturauftrag_id = "ka-" + hashlib.sha256(auftrag_key.encode("utf-8")).hexdigest()[:24]
    erwartungshorizont_text = nc.load_erwartungshorizont(config, args.klasse, args.aufgabe) or ""

    ausgangstext_path = None
    if args.ausgangstext_file or args.ausgangstext:
        ausgangstext_path = Path(args.ausgangstext_file or args.ausgangstext).resolve()

    # Der Text aus dem LUA-Dialog ist Inhalt, kein Dateipfad. Der alte
    # --ausgangstext-Schalter bleibt als kompatibler Dateipfad erhalten;
    # neue Aufrufer verwenden die eindeutig benannten Varianten.
    ausgangstext_text = args.ausgangstext_text

    cancel_event = None
    if args.cancel_timeout:
        import threading
        cancel_event = threading.Event()
        threading.Timer(args.cancel_timeout, cancel_event.set).start()

    started = time.monotonic()
    _progress("llm", "LLM-Analyse läuft")
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
        ausgangstext_text=ausgangstext_text,
        klasse=args.klasse,
        aufgabe=args.aufgabe,
        erwartungshorizont_name=args.erwartungshorizont or "",
        rubric_name=rubric_name,
        pseudonymisierung=not args.keine_pseudonymisierung,
        db_path_override=db_path,
        bestaetigte_schueler_id=args.schueler_id,
        unterrichtseinsatz_id=args.einsatz_id,
        material_id=args.material_id,
        korrekturauftrag_id=korrekturauftrag_id,
        rubrik_inhalt=rubric,
        rubrik_titel=rubrik_titel,
        erwartungshorizont=erwartungshorizont_text,
    )

    if data is None:
        print("Analyse fehlgeschlagen:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 1

    _progress("done", f"Analyse abgeschlossen ({time.monotonic() - started:.1f}s)")
    if not args.quiet:
        for e in errors:
            print(f"Hinweis: {e}", file=sys.stderr)

    result = {"analysis": data, "errors": errors}
    if data.get("_abgabe_id"):
        result["abgabe_id"] = data["_abgabe_id"]
    _json_out(result)
    return 0


def cmd_personen_vorschau(args):
    """Redaktionsvorschau: welche Personenangaben würden ersetzt (ohne LLM-Call)."""
    nc, ndb, config, db_path = _load_env_and_config()
    import pseudonymisierung as pseu

    file_path = Path(args.file).resolve()
    args.klasse = ndb.normalize_klasse(args.klasse)
    if not file_path.is_file():
        print(f"Datei nicht gefunden: {file_path}", file=sys.stderr)
        return 1

    vision = nc.is_vision_file(file_path)
    api_cfg = config.get("api", {})
    provider = str(api_cfg.get("provider", "anthropic"))
    model = str(api_cfg.get("model", ""))
    text = ""
    if not vision:
        try:
            text = nc.read_docx_text(file_path)
        except Exception as e:
            print(f"Datei nicht lesbar: {e}", file=sys.stderr)
            return 1

    roster = ndb.get_schueler_by_klasse(db_path, args.klasse)
    funde = pseu.erkenne_personenangaben(text, file_path.name, args.schueler or "", roster)
    _json_out(
        {
            "funde": [
                {
                    "schuelerId": f["schueler_id"],
                    "anzeige": f["anzeige"],
                    "alias": f["alias"],
                    "vorkommenText": f["vorkommen_text"],
                    "imDateinamen": f["im_dateinamen"],
                }
                for f in funde
            ],
            "visionModus": vision,
            "visionFaehig": (not vision) or nc.is_vision_capable(provider, model, file_path),
            "klassenlisteLeer": len(roster) == 0,
        }
    )
    return 0


def cmd_srdp_detail(args):
    nc, ndb, config, db_path = _load_env_and_config()
    data_row = ndb.get_abgabe_by_id(db_path, args.abgabe_id)
    if not data_row:
        print(f"Abgabe-ID {args.abgabe_id} nicht gefunden", file=sys.stderr)
        return 1

    result = nc.generate_srdp_detail(
        schuelertext=data_row.get("rohtext", ""),
        hauptanalyse={"bewertung": {}},
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


def _reconstruct_feedback_from_db(db_path, abgabe_id, abgabe):
    """Baut FeedbackData direkt aus DB-Tabellen, wenn kein JSON auf Platte liegt.
    Kriterien-Texte (Staerken/Schwaachen/Vorschlaege) sind leer — nur Struktur."""
    import sqlite3
    import generate_feedback as gf

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    krit_rows = conn.execute(
        "SELECT kriterium_name, stufe, gewichtung FROM kriterium_historie WHERE abgabe_id = ?",
        (abgabe_id,),
    ).fetchall()
    fehler_rows = conn.execute(
        "SELECT zitat, korrektur, typ, erklaerung FROM fehler_historie WHERE abgabe_id = ?",
        (abgabe_id,),
    ).fetchall()

    schueler_name = None
    if abgabe.get("schueler_id"):
        s = conn.execute(
            "SELECT vorname, nachname FROM schueler WHERE id = ?",
            (abgabe["schueler_id"],),
        ).fetchone()
        if s:
            schueler_name = f"{s['vorname']} {s['nachname'] or ''}".strip()

    conn.close()

    if not krit_rows:
        return None

    bewertung = [
        gf.CriterionFeedback(
            key=gf.canonical_key(k["kriterium_name"]),
            stufe=str(k["stufe"] or 0),
            punkte=float(k["stufe"] or 0),
            gewicht=float(k["gewichtung"]) if k["gewichtung"] is not None else None,
            staerken=[],
            schwaechen=[],
            vorschlaege=[],
        )
        for k in krit_rows
    ]

    fehler = [
        gf.SprachFehler(
            zitat=str(f["zitat"] or ""),
            korrektur=str(f["korrektur"] or ""),
            typ=str(f["typ"] or "G"),
            erklaerung=str(f["erklaerung"] or ""),
        )
        for f in fehler_rows
    ]

    note = abgabe.get("note")
    gesamtstufe = abgabe.get("gesamtstufe")
    notenempfehlung = None
    if note is not None:
        notenempfehlung = gf.GradeRecommendation(
            durchschnitt=float(gesamtstufe or note),
            note=int(note),
            bezeichnung="",
            begruendung="",
        )

    return gf.FeedbackData(
        datei=abgabe.get("dateiname", ""),
        schueler=schueler_name,
        klasse=abgabe.get("klasse", ""),
        textsorte=abgabe.get("textsorte", ""),
        fach=abgabe.get("fach", "Deutsch"),
        schulstufe=abgabe.get("schulstufe", "Oberstufe"),
        rubrik=abgabe.get("rubrik", ""),
        bewertung=bewertung,
        notenempfehlung=notenempfehlung,
        hinweise=[],
        fehler=fehler or None,
    )


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
        data = _reconstruct_feedback_from_db(db_path, abgabe_id, abgabe)
        if data is None:
            print("Kein Feedback-JSON und keine Kriterien in der DB fuer diese Abgabe", file=sys.stderr)
            return 1

    # Lehrkraft-Name aus dem LUKA-Profil hat Vorrang vor dem Config-Default:
    # Kommentare/Metadaten der DOCX sollen die tatsächliche Lehrkraft ausweisen.
    if getattr(args, "lehrer", None) and args.lehrer.strip():
        config.setdefault("docx", {})["teacher_name"] = args.lehrer.strip()

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
    fach = args.fach or config.get("defaults", {}).get("fach", "")
    schulstufe = args.schulstufe or config.get("defaults", {}).get("schulstufe", "")
    filenames = nc.rubric_options_for(args.fach or "", args.schulstufe or "", config)
    rubrics_dir = nc.resolve_path(config, "rubrics")
    rubrics = []
    for filename in filenames:
        path = rubrics_dir / filename
        header = nc.parse_rubrik_header(path.read_text(encoding="utf-8")) if path.exists() else {}
        rubrics.append({"filename": filename, **header})
    _json_out({
        "rubrics": rubrics,
        "defaultRubric": nc.default_rubric_for(fach, schulstufe, config),
    })
    return 0


def _is_safe_rubric_name(name: str) -> bool:
    """Verhindert Pfad-Traversal: nur einfacher Dateiname, Endung .md."""
    if not name or "/" in name or "\\" in name or ".." in name:
        return False
    return name.endswith(".md")


def cmd_list_rubric_files(args):
    """Listet alle Rubrik-Markdown-Dateien (roh) für den Editor."""
    nc, ndb, config, db_path = _load_env_and_config()
    rubrics_dir = nc.resolve_path(config, "rubrics")
    files = sorted(p.name for p in rubrics_dir.glob("*.md")) if rubrics_dir.is_dir() else []
    _json_out(files)
    return 0


def cmd_read_rubric(args):
    """Liest den Roh-Markdown einer Rubrik."""
    nc, ndb, config, db_path = _load_env_and_config()
    if not _is_safe_rubric_name(args.name):
        print("Ungültiger Rubrik-Name", file=sys.stderr)
        return 1
    path = nc.resolve_path(config, "rubrics") / args.name
    if not path.is_file():
        print(f"Rubrik nicht gefunden: {args.name}", file=sys.stderr)
        return 1
    _json_out({"name": args.name, "content": path.read_text(encoding="utf-8")})
    return 0


def cmd_quelltext_get(args):
    """Liest den gespeicherten Ausgangstext einer Aufgabe (für die In-App-Übung)."""
    nc, ndb, config, db_path = _load_env_and_config()
    text = ndb.get_aufgabe_quelltext(db_path, args.klasse, args.aufgabe)
    _json_out({"klasse": args.klasse, "aufgabe": args.aufgabe, "ausgangstext": text or ""})
    return 0


def cmd_save_rubric(args):
    """Speichert (überschreibt/legt an) eine Rubrik aus stdin."""
    nc, ndb, config, db_path = _load_env_and_config()
    if not _is_safe_rubric_name(args.name):
        print("Ungültiger Rubrik-Name (muss auf .md enden, kein Pfad)", file=sys.stderr)
        return 1
    text = sys.stdin.read()
    if not text.strip():
        print("Kein Rubrik-Inhalt übergeben (stdin leer)", file=sys.stderr)
        return 1
    rubrics_dir = nc.resolve_path(config, "rubrics")
    rubrics_dir.mkdir(parents=True, exist_ok=True)
    (rubrics_dir / args.name).write_text(text, encoding="utf-8")
    _json_out({"name": args.name, "bytes": len(text.encode("utf-8"))})
    return 0


def cmd_retro_import(args):
    """Importiert bestehende *_analysis.json (aus output/.../feedback_data) in die DB,
    damit alte Korrekturen in Heatmap/Statistik/Längsschnitt erscheinen.

    Ohne --aufgabe werden alle Aufgaben der Klasse durchlaufen. Duplikate (gleicher
    Datei-Hash der JSON) werden übersprungen. rohtext bleibt leer (kein DOCX vorhanden).
    """
    nc, ndb, config, db_path = _load_env_and_config()
    klasse = args.klasse
    slugs = [args.aufgabe] if args.aufgabe else nc.list_aufgaben(config, klasse)

    imported = 0
    skipped = 0
    results: list[dict] = []
    for slug in slugs:
        paths = nc.build_project_paths(config, klasse, slug)
        fb_dir = paths.feedback_data_dir
        if not fb_dir.is_dir():
            continue
        for json_path in sorted(fb_dir.glob("*.json")):
            try:
                data = json.loads(json_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                skipped += 1
                continue
            if not (isinstance(data, dict) and "notenempfehlung" in data and "bewertung" in data):
                skipped += 1
                continue
            try:
                abgabe_id = ndb.save_analysis_to_db(
                    db_path=db_path,
                    data=data,
                    file_path=json_path,  # Hash/Dateiname-Quelle (DOCX evtl. nicht mehr da)
                    klasse=klasse,
                    aufgabe=slug,
                    rohtext="",
                    feedback_json_path=str(json_path),
                )
                if abgabe_id and abgabe_id > 0:
                    imported += 1
                    results.append({"datei": data.get("datei", json_path.name), "aufgabe": slug, "id": abgabe_id})
                else:
                    skipped += 1  # Duplikat
            except Exception as e:  # noqa: BLE001 — Import darf nie ganz abbrechen
                skipped += 1
                print(f"Übersprungen ({json_path.name}): {e}", file=sys.stderr)

    _json_out({"klasse": klasse, "imported": imported, "skipped": skipped, "results": results})
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
    p_analyze.add_argument("--ausgangstext", default=None, help=argparse.SUPPRESS)
    p_analyze.add_argument("--ausgangstext-text", default=None)
    p_analyze.add_argument("--ausgangstext-file", default=None)
    p_analyze.add_argument("--einsatz-id", default=None)
    p_analyze.add_argument("--material-id", default=None)
    p_analyze.add_argument("--erwartungshorizont", default="")
    p_analyze.add_argument("--rubric", default="")
    p_analyze.add_argument("--max-retries", type=int, default=3)
    p_analyze.add_argument("--cancel-timeout", type=int, default=None)
    p_analyze.add_argument("--quiet", action="store_true")
    p_analyze.add_argument(
        "--schueler-id",
        type=int,
        default=None,
        help="Von der Lehrkraft bestätigte Schüler-ID; hat Vorrang vor der "
        "Namensheuristik und legt nie neue Schüler an.",
    )
    p_analyze.add_argument(
        "--keine-pseudonymisierung",
        action="store_true",
        help="Personenangaben aus der Klassenliste NICHT durch Aliasse ersetzen "
        "(Standard ist Ersetzen vor dem LLM-Versand).",
    )

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
    p_docx.add_argument(
        "--lehrer",
        default=None,
        help="Name der Lehrkraft für Kommentare/Metadaten der DOCX "
        "(überschreibt docx.teacher_name aus der Config; kommt in LUKA aus dem Lehrerprofil).",
    )

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

    # Rubrik-Editor
    sub.add_parser("list-rubric-files", help="Alle Rubrik-Markdown-Dateien (roh) auflisten")
    p_rr = sub.add_parser("read-rubric", help="Roh-Markdown einer Rubrik lesen")
    p_rr.add_argument("--name", required=True)
    p_sr = sub.add_parser("save-rubric", help="Rubrik (stdin) speichern/überschreiben")
    p_sr.add_argument("--name", required=True)

    # Ausgangstext einer Aufgabe lesen (In-App-Übung-Vorbefüllung)
    p_qg = sub.add_parser("quelltext-get", help="Gespeicherten Ausgangstext einer Aufgabe lesen")
    p_qg.add_argument("--klasse", required=True)
    p_qg.add_argument("--aufgabe", required=True)

    # Retro-Import bestehender Analyse-JSONs
    p_ri = sub.add_parser("retro-import", help="Bestehende *_analysis.json in die DB importieren")
    p_ri.add_argument("--klasse", required=True)
    p_ri.add_argument("--aufgabe", default=None)

    # Redaktionsvorschau: welche Personenangaben würden ersetzt (kein LLM-Call)
    p_pv = sub.add_parser(
        "personen-vorschau",
        help="Zeigt, welche Namen aus der Klassenliste vor dem LLM-Versand ersetzt würden",
    )
    p_pv.add_argument("file", help="Pfad zur Abgabe (DOCX/PDF/TXT)")
    p_pv.add_argument("--klasse", required=True)
    p_pv.add_argument("--schueler", default="")


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
        "list-rubric-files": cmd_list_rubric_files,
        "read-rubric": cmd_read_rubric,
        "save-rubric": cmd_save_rubric,
        "quelltext-get": cmd_quelltext_get,
        "retro-import": cmd_retro_import,
        "personen-vorschau": cmd_personen_vorschau,
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
