"""Gezielte Lehrkraftentscheidungen, ohne neue Modellaufrufe oder neue Notenformel."""
from __future__ import annotations

import copy


def resolve_criteria(analysis: dict, basis: dict, decisions: dict) -> dict:
    from natascha_core import (
        berechne_note_srdp, berechne_note_de, berechne_note_unterstufe,
        parse_gewichtung, _SRDP_DETAIL_KRITERIEN, _srdp_detail_ist_gueltig,
    )

    result = copy.deepcopy(analysis)
    check = result.get("bewertungspruefung")
    if not isinstance(check, dict) or check.get("version") != 1:
        raise ValueError("Diese Korrekturversion besitzt keine gezielt prüfbare Bewertungsgrundlage.")
    if not isinstance(decisions, dict):
        raise ValueError("Ungültige Kriterienentscheidungen.")
    for key, decision in decisions.items():
        if key not in check.get("kriterien", {}) or not isinstance(decision, dict):
            raise ValueError("Die Kriterienentscheidung gehört nicht zu dieser Korrekturversion.")
        level = decision.get("stufe")
        if type(level) is not int or not 1 <= level <= 5:
            raise ValueError("Kriterien benötigen eine ganze Stufe zwischen 1 und 5.")
        reason = decision.get("begruendung", "Von der Lehrkraft geprüft.")
        if not isinstance(reason, str) or not reason.strip():
            raise ValueError("Die Kriterienentscheidung benötigt eine Begründung.")
        if "." in key:
            group, criterion = key.split(".", 1)
            result.setdefault("srdp_detail", {}).setdefault(group, {})[criterion] = {"stufe": level, "begruendung": reason}
        else:
            result["bewertung"][key].update(stufe=level, punkte=level)
        check["kriterien"][key].update(status="lehrkraft", stufe=level, begruendung=reason)
    check["aufgaben"] = [task for task in check.get("aufgaben", []) if task["kriterium"] not in decisions]
    # Auch beschädigte gespeicherte Prüfangaben dürfen keinen Rückfall auf die
    # Hauptkriterien auslösen. Fehlende Detailstufen bleiben gezielt klärbar.
    if check.get("detail_erforderlich") and not _srdp_detail_ist_gueltig(result.get("srdp_detail")):
        detail = result.get("srdp_detail")
        detail = detail if isinstance(detail, dict) else {}
        for group, keys in _SRDP_DETAIL_KRITERIEN.items():
            for key in keys:
                path = f"{group}.{key}"
                entries = detail.get(group)
                entry = entries.get(key, {}) if isinstance(entries, dict) else {}
                if (isinstance(entry, dict) and type(entry.get("stufe")) is int
                        and 1 <= entry["stufe"] <= 5 and isinstance(entry.get("begruendung"), str)
                        and entry["begruendung"].strip()):
                    continue
                check["kriterien"].setdefault(path, {})["status"] = "offen"
                if not any(task["kriterium"] == path for task in check["aufgaben"]):
                    check["aufgaben"].append({"id": f"kriterium:{path}", "kriterium": path,
                        "beschreibung": f"Detailbewertung zu {key} prüfen.", "notenrelevant": True})
    check["status"] = "offen" if check["aufgaben"] else "vollstaendig"
    result["qualitaetswarnungen"] = [warning for warning in result.get("qualitaetswarnungen", []) if not (warning.get("code") == "bewertung_kriterium_offen" and warning.get("kriterium") in decisions)]
    for field in ("notenempfehlung", "notendetail", "notenempfehlung_llm"):
        result.pop(field, None)
    if check["status"] == "vollstaendig" and result.get("bewertungsmodus", "benotet") == "benotet":
        if check.get("detail_erforderlich"):
            if not _srdp_detail_ist_gueltig(result.get("srdp_detail")):
                raise ValueError("Die gespeicherte Detailbewertung passt nicht zum Raster. Bitte die Korrekturversion erneut prüfen.")
            grade = berechne_note_srdp(result["bewertung"], result.get("srdp_detail"))
        elif basis.get("land", "at") == "de":
            grade = berechne_note_de(result["bewertung"], parse_gewichtung(basis.get("rubrik_inhalt", "")))
        elif basis.get("schulstufe", "").lower() in {"oberstufe", "ahs-oberstufe"}:
            areas = basis.get("rastervertrag", {}).get("kompetenzbereiche", {})
            grade = berechne_note_srdp(result["bewertung"], k1_keys=tuple(areas.get("k1", [])), k3_keys=tuple(areas.get("k3", [])))
        else:
            grade = berechne_note_unterstufe(result["bewertung"], parse_gewichtung(basis.get("rubrik_inhalt", "")))
        result["notendetail"] = grade
        result["notenempfehlung"] = {key: grade[key] for key in ("note", "durchschnitt", "bezeichnung", "begruendung")}
        if result.get("notenempfehlung_vorlaeufig"):
            result["notenempfehlung"]["vorlaeufig"] = True
    return result


def apply_saved_resolution(analysis: dict, saved: dict) -> dict:
    """Gespeicherte lokale Auflösung überlagern; Rohantwort bleibt unverändert."""
    result = copy.deepcopy(analysis)
    for key in ("bewertungspruefung", "bewertung", "srdp_detail", "notendetail", "notenempfehlung", "qualitaetswarnungen"):
        if key in saved.get("ergebnis", {}):
            result[key] = copy.deepcopy(saved["ergebnis"][key])
        elif key in {"notendetail", "notenempfehlung"} and saved.get("version") == 1:
            result.pop(key, None)
    return result


def save_review(db_path, payload: dict) -> None:
    """Kriterien, Befundentscheidungen und Freigabe in derselben Transaktion."""
    import json
    import math
    import sqlite3
    import natascha_db as db

    aid, rid = payload.get("abgabeId"), payload.get("revisionId")
    status, note = payload.get("pruefstatus"), payload.get("noteFinal")
    if status not in {"entwurf", "freigegeben"} or (note is not None and (type(note) not in {int, float} or not math.isfinite(note) or not 1 <= note <= 6)):
        raise ValueError("Ungültige Lehrernote oder ungültiger Prüfstatus.")
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute("SELECT * FROM korrektur_revision WHERE abgabe_id=? AND is_active=1", (aid,)).fetchone()
        if row is None or row["id"] != rid:
            raise ValueError("Die Korrekturversion hat sich geändert. Bitte erneut laden.")
        original, basis = json.loads(row["analysis_json"]), json.loads(row["basis_json"])
        if basis.get("land", "at") != "de" and note is not None and note > 5:
            raise ValueError("Die Lehrernote passt nicht zur Notenskala.")
        decisions = payload.get("kriterienEntscheidungen", {})
        result = resolve_criteria(original, basis, decisions)
        for action in payload.get("aktionen", []):
            kind, replacement = action.get("aktion"), action.get("korrektur")
            if kind not in {None, "uebernommen", "geaendert", "verworfen"} or (kind == "geaendert" and (not isinstance(replacement, str) or not replacement.strip())):
                raise ValueError("Ungültige Befundentscheidung.")
            cursor = conn.execute("UPDATE fehler_historie SET lehrkraft_aktion=?,lehrkraft_korrektur=? WHERE id=? AND abgabe_id=?", (kind, replacement if kind == "geaendert" else None, action.get("id"), aid))
            if cursor.rowcount != 1:
                raise ValueError("Ein Befund gehört nicht mehr zu dieser Korrektur.")
        for key, decision in decisions.items():
            if "." not in key:
                conn.execute("UPDATE kriterium_historie SET stufe=? WHERE abgabe_id=? AND kriterium_name=?", (decision["stufe"], aid, key))
        grade = result.get("notendetail", {})
        saved = {"version": 1, "entscheidungen": decisions, "ergebnis": {key: result[key] for key in ("bewertungspruefung", "bewertung", "srdp_detail", "notendetail", "notenempfehlung", "qualitaetswarnungen") if key in result}}
        conn.execute("UPDATE korrektur_revision SET lehrer_pruefung_json=?,note=?,gesamtstufe=? WHERE id=?", (json.dumps(saved, ensure_ascii=False), grade.get("note"), grade.get("durchschnitt"), rid))
        conn.execute("UPDATE abgabe SET note=?,gesamtstufe=? WHERE id=?", (grade.get("note"), grade.get("durchschnitt"), aid))
        conn.execute("""INSERT INTO lehrer_feedback (abgabe_id,klasse,aufgabe,schueler_id,note_final,note_app_snapshot,lehrer_kommentar,pruefstatus)
            SELECT id,klasse,aufgabe,schueler_id,?,note,?,? FROM abgabe WHERE id=?
            ON CONFLICT(abgabe_id) DO UPDATE SET note_final=excluded.note_final,lehrer_kommentar=excluded.lehrer_kommentar,pruefstatus=excluded.pruefstatus,geaendert_am=CURRENT_TIMESTAMP""", (note, payload.get("lehrerKommentar", ""), status, aid))
        db._snapshot_active_revision(conn, aid)
