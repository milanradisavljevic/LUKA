"""Lokale, revisionsgebundene Scan-Pruefung. Keine implizite Lehrerfreigabe."""
from __future__ import annotations
import copy
import difflib
import hashlib
import json
import os
import sys
import re
from datetime import datetime
from pathlib import Path

import natascha_core as nc


def progress(stage, message):
    print(json.dumps({"stage":stage,"message":message}, ensure_ascii=False), file=sys.stderr, flush=True)


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, default=str).encode()).hexdigest()


def folder(config):
    result = nc.resolve_path(config, "output") / "ocr" / "reviews"
    result.mkdir(parents=True, exist_ok=True)
    return result


def location(config, session_id):
    if not re.fullmatch(r"[a-f0-9]{64}", session_id):
        raise ValueError("Ungueltige Pruefsitzung.")
    return folder(config) / (session_id + ".json")


def save(session, config):
    target = location(config, session["id"])
    # Kurze Betriebssystem-Sperre; wird auch nach einem Prozessabbruch freigegeben.
    with target.with_suffix(".lock").open("a+b") as lock:
        lock.seek(0)
        if os.name == "nt":
            import msvcrt
            if lock.read(1) == b"":
                lock.write(b"0"); lock.flush()
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            if target.exists():
                current = json.loads(target.read_text(encoding="utf-8"))
                if current["revision"] != session.get("_storedRevision"):
                    raise ValueError("Die Pruefsitzung wurde zwischenzeitlich geaendert. Bitte neu laden.")
            session["revision"] = max(session["revision"], (session.get("_storedRevision", -1)) + 1)
            temporary = target.with_suffix(".tmp")
            payload = {k:v for k,v in session.items() if k != "_storedRevision"}
            temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            temporary.replace(target)
            session["_storedRevision"] = session["revision"]
        finally:
            if os.name == "nt":
                lock.seek(0); msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def load(config, session_id):
    session = json.loads(location(config, session_id).read_text(encoding="utf-8"))
    if hashlib.sha256(Path(session["source"]).read_bytes()).hexdigest() != session["sourceHash"]:
        raise ValueError("Das Original wurde veraendert. Bitte neu vorbereiten.")
    session["_storedRevision"] = session["revision"]
    return session


def open_issues(session):
    return [i for i in session["issues"] if i["status"] in ("open", "unreadable")]


def public(session):
    return {k: v for k, v in session.items() if k not in ("args", "_storedRevision", "checkedRegions")}


def text(session):
    return "\n\n".join(p["text"] for p in session["pages"])


def region_image(source, page_number, box=None, expanded=False):
    """Direkt aus dem Original rendern; nie die UI-Vorschau vergroessern."""
    import base64
    import io
    from PIL import Image
    if source.suffix.lower() == ".pdf":
        import pypdfium2 as pdfium
        with pdfium.PdfDocument(str(source)) as document:
            page = document[page_number - 1]
            width,height=page.get_size()
            if width <= 0 or height <= 0 or width*height*(300/72)**2 > 50_000_000:
                page.close()
                raise ValueError("Die Originalseite ist fuer die Bildpruefung zu gross. Bitte einen kleineren Scan verwenden.")
            bitmap = page.render(scale=300 / 72)
            image = bitmap.to_pil().convert("RGB")
            bitmap.close()
            page.close()
    else:
        with Image.open(source) as original:
            if original.width*original.height > 50_000_000:
                raise ValueError("Das Originalbild ist zu gross. Bitte einen kleineren Scan verwenden.")
            image = original.convert("RGB")
    try:
        if box:
            x0, y0, x1, y1 = box
            margin = .06 if expanded else .025
            bounds = (max(0, x0-margin)*image.width, max(0, y0-margin)*image.height,
                      min(1, x1+margin)*image.width, min(1, y1+margin)*image.height)
            cropped = image.crop(tuple(round(x) for x in bounds))
            image.close()
            image = cropped
        with io.BytesIO() as out:
            image.save(out, format="JPEG", quality=95)
            data = base64.b64encode(out.getvalue()).decode()
        return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}}
    finally:
        image.close()


def read_image(source, region, provider, model, expanded=False):
    if provider not in ("openai", "mistral") or not model or model.startswith("mistral-ocr"):
        raise ValueError("Fuer diesen Anbieter ist die direkte Bildpruefung noch nicht freigegeben.")
    key = os.environ.get(provider.upper() + "_API_KEY", "")
    if not key:
        raise ValueError("Bitte den API-Schluessel des Auslese-Anbieters hinterlegen.")
    image = region_image(source, region["page"], region.get("box"), expanded)
    prompt = ('Lies ausschliesslich den Schuelertext im Bild wortgetreu. Bewahre alle '
              'Rechtschreibfehler, Grossschreibung, Satzzeichen, Absaetze und Streichungen. '
              'Keine Verbesserung, keine Bewertung, keine Aufgaben oder Lehrermarkierungen. '
              'Unsicheres niemals ergaenzen. JSON: {"text":"...", "unreadable":false}. '
              'Setze unreadable=true bei jeder nicht eindeutig lesbaren Stelle.')
    base = os.environ.get(provider.upper()+"_BASE_URL", "https://api."+provider+".ai/v1" if provider == "mistral" else "https://api.openai.com/v1")
    if region.get("box"):
        x0,y0,x1,y1=region["box"]
        margin=.06 if expanded else .025
        left,top,right,bottom=max(0,x0-margin),max(0,y0-margin),min(1,x1+margin),min(1,y1+margin)
        target=[round((x0-left)/(right-left),4),round((y0-top)/(bottom-top),4),round((x1-left)/(right-left),4),round((y1-top)/(bottom-top),4)]
        prompt += " Lies nur den Zielbereich mit normierten Koordinaten [links,oben,rechts,unten] " + json.dumps(target) + ". Der Aussenbereich dient nur als Lesekontext und gehoert nicht zur Abschrift."
    raw = nc._call_openai_compat(base, key, model, prompt, 120,
        extra_body={"response_format": {"type": "json_object"}}, vision_content=[image])
    if raw.startswith("FEHLER"):
        raise ValueError(raw)
    result = nc.extract_json_from_llm(raw)
    if not isinstance(result, dict) or not isinstance(result.get("text"), str) or not isinstance(result.get("unreadable"), bool):
        raise ValueError("Die Bildpruefung lieferte kein gueltiges Ergebnis.")
    return result


def regions(session, findings):
    result = []
    for page in session["pages"]:
        blocks = page.get("blocks") or []
        ranked = sorted([b for b in blocks if isinstance(b.get("confidence_scores"), dict)],
            key=lambda b: b["confidence_scores"].get("minimum_content_confidence_score") or 0)[:2]
        candidates = []
        for block in blocks:
            content = block.get("content", "")
            if not isinstance(content, str) or not content.strip():
                continue
            relevant = any(f.get("zitat") and f["zitat"] in content for f in findings)
            if relevant or block in ranked or "[unleserlich]" in content.lower():
                dims = page.get("dimensions") or {}
                w, h = dims.get("width", 0), dims.get("height", 0)
                box = None
                if w and h:
                    values = [block.get(k) for k in ("top_left_x", "top_left_y", "bottom_right_x", "bottom_right_y")]
                    if all(isinstance(v, (int, float)) for v in values):
                        box = [values[0]/w, values[1]/h, values[2]/w, values[3]/h]
                        if not (0 <= box[0] < box[2] <= 1 and 0 <= box[1] < box[3] <= 1):
                            box = None
                if box and page["text"].count(content) == 1:
                    candidates.append({"page": page["seite"], "old": content, "box": box})
        # Fehlende oder mehrdeutige Positionen niemals als Wortausschnitt ausgeben.
        covered = "\n".join(c["old"] for c in candidates)
        unmatched = any(f.get("zitat") and f["zitat"] in page["text"] and f["zitat"] not in covered for f in findings)
        if unmatched or ("[unleserlich]" in page["text"].lower() and not candidates):
            candidates = [{"page": page["seite"], "old": page["text"], "box": None}]
        result.extend(candidates)
    return result


def check(session, config, allow_changes):
    source = Path(session["source"])
    pending = regions(session, session["analysis"].get("fehler", []))
    for number, region in enumerate(pending, 1):
        rid = digest(region)
        if rid in session.get("checkedRegions", []):
            continue
        if any(i.get("decision") and i["page"] == region["page"] and (i.get("replacement") == region["old"] or (i.get("box") is not None and i.get("box") == region.get("box"))) for i in session["issues"]):
            continue
        if any(i["id"] == rid and i.get("decision") for i in session["issues"]):
            continue
        if any(i["id"] == rid and i["status"] == "matched" for i in session["issues"]):
            continue
        progress("scan_verify", f"Original pruefen: Bereich {number} von {len(pending)}")
        first = read_image(source, region, session["ocrProvider"], session["verifyModel"])
        same = first["text"] == region["old"] and not first["unreadable"]
        issue = {**region, "id": rid, "status": "matched" if same else "open", "candidates": [region["old"], first["text"]]}
        if not same and not first["unreadable"]:
            second = read_image(source, region, session["ocrProvider"], session["verifyModel"], True)
            if second["text"] not in issue["candidates"]:
                issue["candidates"].append(second["text"])
            # Erweiterter Kontext muss denselben ganzen Zieltext liefern; sonst Lehrerfrage.
            if allow_changes and not second["unreadable"] and first["text"] == second["text"] and first["text"].strip():
                page = next(p for p in session["pages"] if p["seite"] == region["page"])
                if page["text"].count(region["old"]) == 1:
                    if any(i.get("decision") and i["page"] == region["page"] for i in session["issues"]):
                        allow_this_change = False
                    else:
                        allow_this_change = True
                    if not allow_this_change:
                        issue["status"] = "open"
                    else:
                        page["text"] = page["text"].replace(region["old"], first["text"], 1)
                    if allow_this_change:
                        issue.update(status="corrected", replacement=first["text"])
        new_issues = [issue]
        if issue["status"] == "open" and not first["unreadable"] and first["text"].strip():
            # Nur abweichende Textstellen vorlegen, auch wenn der Bildbezug eine ganze Seite ist.
            old, new = region["old"], first["text"]
            matcher = difflib.SequenceMatcher(None, old, new, autojunk=False)
            spans = []
            for tag, a, b, c, d in matcher.get_opcodes():
                if tag == "equal":
                    continue
                # Mit Kontext bleiben Einfuegungen und wiederholte Einzelzeichen eindeutig.
                left, right = max(0,a-12), min(len(old),b+12)
                if spans and left <= spans[-1][1]:
                    spans[-1] = (spans[-1][0], right)
                else:
                    spans.append((left,right))
            narrowed = []
            for left,right in spans:
                snippet=old[left:right]
                if old.count(snippet) != 1:
                    narrowed=[]
                    break
                changed=snippet
                for tag,a,b,c,d in reversed(matcher.get_opcodes()):
                    if tag != "equal" and left <= a and b <= right:
                        changed=changed[:a-left]+new[c:d]+changed[b-left:]
                narrowed.append({**issue,"id":digest({"region":rid,"left":left,"right":right}),"old":snippet,"candidates":[snippet,changed]})
            if narrowed:
                new_issues=narrowed
        session["issues"] = [i for i in session["issues"] if i["id"] != rid and i["id"] not in {n["id"] for n in new_issues}] + new_issues
        session.setdefault("checkedRegions", []).append(rid)
        session["revision"] += 1
        save(session, config)


def qualitative(data, session):
    result = copy.deepcopy(data)
    uncertain = open_issues(session)
    held = list(result.get("scan_review", {}).get("heldFindings", []))
    if uncertain:
        for key in ("notenempfehlung", "notenempfehlung_llm", "notendetail", "srdp_detail"):
            result.pop(key, None)
        for section in ("bewertung", "sachfach_bewertung"):
            for criterion in result.get(section, {}).values():
                if isinstance(criterion, dict):
                    criterion.update(punkte=None, stufe=None)
        for finding in result.get("fehler", []):
            quote = finding.get("zitat", "")
            overlaps = any(quote in i["old"] or i["old"] in quote for i in uncertain)
            verified = any(i["status"] in ("matched", "resolved", "corrected") and quote in i.get("replacement", i["old"]) for i in session["issues"])
            if overlaps or not verified:
                if finding not in held:
                    held.append(finding)
        result["fehler"] = [f for f in result.get("fehler", []) if f not in held]
    result["scan_review"] = {"sessionId": session["id"], "revision": session["revision"],
        "openCount": len(uncertain), "numericBlocked": bool(uncertain), "issues": session["issues"], "heldFindings": held}
    return result


def analyse(session, args, stage="scan_analysis"):
    masked = text(session)
    for issue in open_issues(session):
        masked = masked.replace(issue.get("replacement", issue["old"]), "[Ungeklaerte Lesestelle: nicht bewerten]")
    input_hash = digest(masked)
    if session.get("analysisInputHash") == input_hash and session.get("analysis"):
        return
    progress(stage, "Bewertung mit aktuellen Lesarten aktualisieren" if stage == "scan_reassess" else "Korrekturvorschau vorbereiten")
    data, errors = nc.run_llm_analysis(**{**args, "persist": False, "scan_text": masked})
    if data is None:
        raise ValueError("; ".join(errors))
    session["analysis"] = data
    session["textRevision"] = digest(text(session))
    session["analysisInputHash"] = input_hash
    save(session, args["config"])


def process(args, config, provider, model, verify_model, action, session_id=None):
    source = args["file_path"]
    identity = {"pipelineVersion": 1, **{k:v for k,v in args.items() if k not in ("docx_text", "cancel_event")}, "ocrProvider": provider, "ocrModel": model, "verifyModel": verify_model}
    sid = digest({"source": hashlib.sha256(source.read_bytes()).hexdigest(), "context": identity})
    if session_id and session_id != sid:
        raise ValueError("Auftrag oder Anbieter wurde geaendert. Bitte Vorschau neu vorbereiten.")
    path = location(config, sid)
    session = load(config, sid) if path.exists() else None
    db_path = args.get("db_path_override") or nc.ndb.get_db_path(config)
    nc.ndb.init_db(db_path)
    if args.get("reanalyze_existing"):
        existing = nc.ndb.get_abgabe_by_hash(db_path, hashlib.sha256(source.read_bytes()).hexdigest())
        if existing:
            nc.ndb.reanalysis_target(existing, args["klasse"], args["aufgabe"], args.get("klasse_id"), args.get("bestaetigte_schueler_id"))
        if action != "commit" and session and session.get("state") == "ready":
            with nc.ndb.sqlite3.connect(db_path) as conn:
                committed = conn.execute("SELECT 1 FROM korrektur_revision WHERE json_extract(analysis_json, '$.scan_review.sessionId')=? AND json_extract(analysis_json, '$.scan_review.revision')=?", (sid, session["revision"])).fetchone()
            if committed:
                # Eine neue Bewertung derselben geprüften Abschrift. Wiederholtes
                # Vorbereiten vor der Übernahme und Commit-Retries bleiben idempotent.
                session.update(state="preparing", revision=session["revision"] + 1, analysisInputHash=None)
    if action == "commit":
        progress("scan_commit", "Freigegebenen Entwurf speichern")
        if not session or session.get("state") != "ready":
            raise ValueError("Bitte zuerst die aktuelle Vorschau vorbereiten.")
        result = qualitative(session["analysis"], session)
        result["_transcript_sha256"] = hashlib.sha256(text(session).encode()).hexdigest()
        result["_original_scan"] = str(source)
        # Idempotenz auch nach Prozessabbruch zwischen DB-Commit und Dateispeicherung.
        db_path = args.get("db_path_override") or nc.ndb.get_db_path(config)
        with nc.ndb.sqlite3.connect(db_path) as conn:
            row = conn.execute("SELECT abgabe_id FROM korrektur_revision WHERE json_extract(analysis_json, '$.scan_review.sessionId')=? AND json_extract(analysis_json, '$.scan_review.revision')=?", (sid, session["revision"])).fetchone()
        if row:
            result["_abgabe_id"] = row[0]
        else:
            nc.approve_scan(source, text(session), config, provider, model)
            context = {**args, "docx_text": text(session), "correction_run": nc.CorrectionRun(
                provider=str(args["config"]["api"]["provider"]), model=str(args["config"]["api"]["model"]),
                privacy_mode="pseudonymisiert" if args.get("pseudonymisierung", True) else "nicht_pseudonymisiert",
                basis_json=json.dumps({**(args.get("correction_basis") or {}), "scan_review": result["scan_review"]}),
                started_at=datetime.now().astimezone().isoformat())}
            # Gleicher Datei-Hash kann eine neue Abschriftfassung haben.
            existing = nc.ndb.get_abgabe_by_hash(db_path, hashlib.sha256(source.read_bytes()).hexdigest())
            if existing:
                context["revision_of_abgabe_id"] = existing["id"]
            nc.persist_analysis_result(result, context)
        return {"analysis": result, "abgabe_id": result.get("_abgabe_id")}
    if session and session.get("state") == "ready":
        return {"scan_review": public(session)}
    if session is None:
        ocr_config = copy.deepcopy(config)
        ocr_config["api"] = {"provider": provider, "model": model}
        progress("scan_ocr", "Scan wird ausgelesen")
        extracted = nc.extract_scan(source, ocr_config)
        session = {"id": sid, "source": str(source), "sourceHash": hashlib.sha256(source.read_bytes()).hexdigest(),
            "pages": extracted["seiten"], "ocrProvider": provider, "verifyModel": verify_model,
            "issues": [], "revision": 0, "state": "preparing"}
        save(session, config)
    before = text(session)
    analyse(session, args)
    check(session, config, not session.get("autoReassessed", False))
    if text(session) != before or open_issues(session):
        session["autoReassessed"] = True
        analyse(session, args, "scan_reassess")
        check(session, config, False)
    session["analysis"] = qualitative(session["analysis"], session)
    progress("scan_ready", "Scan-Vorschau bereit – Lesestellen koennen geprueft werden")
    session["state"] = "ready"
    save(session, config)
    return {"scan_review": public(session)}


def resolve(config, session_id, expected_revision, issue_id, choice):
    session = load(config, session_id)
    if session["revision"] != expected_revision:
        raise ValueError("Die Vorschau wurde zwischenzeitlich geaendert. Bitte neu laden.")
    issue = next(i for i in session["issues"] if i["id"] == issue_id)
    if not isinstance(choice, str) or len(choice) > 100000:
        raise ValueError("Ungueltige Lesart.")
    current = issue.get("replacement", issue["old"])
    page = next(p for p in session["pages"] if p["seite"] == issue["page"])
    if page["text"].count(current) != 1:
        raise ValueError("Die Stelle ist nicht mehr eindeutig zuordenbar. Bitte neu vorbereiten.")
    replacement = choice if choice.strip() else "[unleserlich]"
    page["text"] = page["text"].replace(current, replacement, 1)
    issue.update(replacement=replacement, status="resolved" if choice.strip() else "unreadable", decision=True)
    session.update(state="dirty", revision=session["revision"]+1, autoReassessed=False)
    save(session, config)
    return public(session)
