"""Texttreue, Befundarten und nachvollziehbare Gegenprüfung ohne Netzaufrufe."""
from __future__ import annotations

import hashlib
import json
import re

KINDS = {"normfehler", "ausdrucksproblem", "stilalternative", "ungeklaert"}
PROMPT_VERSION = "korrektur-2026-11-04-v2"


def inline_replacement_safe(quote: str, replacement: str) -> bool:
    """Große Umformulierungen kleiner Anker als Kommentar belassen, nicht einfügen.

    Das ist eine konservative Bereichsprüfung, kein sprachlicher Wahrheitsbeweis.
    Vollständige Satzänderungen brauchen einen entsprechend vollständigen Anker.
    """
    old, new = quote.split(), replacement.split()
    if not old or not new or quote.strip() == replacement.strip():
        return False
    if len(new) > max(len(old) * 2, len(old) + 3):
        return False
    if "\n" in replacement or re.match(r"(?i)\s*(optional|vorschlag)\s*[:;,]", replacement):
        return False
    if re.search(r"[.!?](?:\s|$)", replacement) and not re.search(r"[.!?](?:\s|$)", quote):
        return False
    return True


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def word_requirement(source: str, rubric: str, explicit: int | None) -> tuple[str, str]:
    def ranges(value: str) -> list[tuple[int, int]]:
        return [(int(a), int(b)) for a, b in re.findall(r"(\d{2,4})\s*(?:[-–]|bis|und)\s*(\d{2,4})\s*W[öo]rter", value, re.I)]
    source_ranges = ranges(source)
    rubric_ranges = ranges(rubric)
    if explicit is not None:
        target = (explicit, explicit)
    elif len(set(source_ranges)) == 1:
        target = source_ranges[0]
    else:
        warning = "Mehrere unterschiedliche Umfangsvorgaben in der Aufgabe: bitte bestätigen." if len(set(source_ranges)) > 1 else ""
        return "", warning
    label = f"{target[0]} Wörter" if target[0] == target[1] else f"{target[0]}–{target[1]} Wörter"
    conflict = any(value != target for value in rubric_ranges) or any(value != target for value in source_ranges)
    return label, (f"Umfangsvorgaben widersprechen sich. Verbindliche Aufgabenangabe: {label}; allgemeine Rasterangaben haben keinen Vorrang." if conflict else "")


def find_spans(text: str, quote: str) -> list[tuple[int, int]]:
    """Exakte Schreibung; nur Abstände dürfen sich unterscheiden. Keine Teilwörter."""
    words = quote.strip().split()
    if not words:
        return []
    pattern = r"\s+".join(re.escape(word) for word in words)
    if words[0][0].isalnum() or words[0][0] == "_":
        pattern = r"(?<!\w)" + pattern
    if words[-1][-1].isalnum() or words[-1][-1] == "_":
        pattern += r"(?!\w)"
    return [(match.start(), match.end()) for match in re.finditer(pattern, text)]


def textstellen(text: str) -> list[dict]:
    """Stabile Kennungen der nichtleeren Originalzeilen, ohne Textnormalisierung."""
    return [{"id": f"S{i}", "start": match.start(), "end": match.end(), "text": match.group()}
            for i, match in enumerate((m for m in re.finditer(r"[^\r\n]+", text) if m.group().strip()), 1)]


def finding_spans(text: str, finding: dict) -> list[tuple[int, int]]:
    source_id = finding.get("textstelle_id")
    if not isinstance(finding.get("zitat"), str):
        return []
    if source_id is None:
        return find_spans(text, finding.get("zitat", ""))
    source = next((s for s in textstellen(text) if s["id"] == source_id), None)
    if not source:
        return []
    return [(source["start"] + a, source["start"] + b)
            for a, b in find_spans(source["text"], finding.get("zitat", ""))]


def replacement_context(text: str, finding: dict) -> dict | None:
    """Ein einzelner Ersatz im unveränderten Original, inklusive Satzumgebung.

    Ganze Originalabsätze vermeiden falsche Satzgrenzen bei Abkürzungen,
    Dezimalzahlen und Zitaten. Mehrzeilige Anker behalten alle betroffenen Absätze.
    """
    spans = finding_spans(text, finding)
    replacement = finding.get("korrektur")
    if len(spans) != 1 or not isinstance(replacement, str) or not replacement.strip():
        return None
    start, end = spans[0]
    left = text.rfind("\n", 0, start) + 1
    right = text.find("\n", end)
    if right < 0:
        right = len(text)
    original = text[left:right]
    result = text[left:start] + replacement + text[end:right]
    checksum = text_hash(json.dumps([text_hash(text), start, end, replacement], ensure_ascii=False))
    return {"originalkontext": original, "ergebniskontext": result, "pruefsumme": checksum}


def check_replacement(text: str, finding: dict, proof: object, previous: dict | None) -> dict:
    """Prüfung an den tatsächlich freizugebenden Vorschlag binden, ohne Sprachheuristik."""
    current = replacement_context(text, finding)
    result = {"status": "ungeklaert", "begruendung": "Ersetzung nicht ausdrücklich im vollständigen Kontext geprüft."}
    if current:
        result["pruefsumme"] = current["pruefsumme"]
    if not current or not isinstance(proof, dict):
        return result
    # Unveränderte Vorschläge brauchen nur die lokale Kennung zurückzugeben.
    # Bei geänderten/neuen Vorschlägen muss die Antwort das neue Ergebnis zeigen.
    if previous and proof.get("pruefsumme") != previous["pruefsumme"]:
        return result
    if "ergebniskontext" in proof and proof["ergebniskontext"] != current["ergebniskontext"]:
        return result
    if (not previous or current["pruefsumme"] != previous["pruefsumme"]) and proof.get("ergebniskontext") != current["ergebniskontext"]:
        return result
    status = proof.get("status")
    reason = proof.get("begruendung")
    if status not in {"bestaetigt", "verworfen", "ungeklaert"}:
        return result
    if status != "bestaetigt" and (not isinstance(reason, str) or not reason.strip()):
        return result
    result.update(status=status, begruendung=reason if isinstance(reason, str) and reason.strip() else "Grammatik, Ersetzungsbereich und Bedeutung im Ergebniskontext geprüft.")
    return result


def anchor_findings(findings: list[dict], text: str) -> list[dict]:
    digest = text_hash(text)
    seen_ids: set[str] = set()
    for index, finding in enumerate(findings):
        finding_id = finding.get("befund_id")
        if not isinstance(finding_id, str) or not finding_id.strip() or finding_id in seen_ids:
            finding_id = f"befund-{index + 1}"
            while finding_id in seen_ids:
                finding_id += "-neu"
            finding["befund_id"] = finding_id
        seen_ids.add(finding_id)
        finding.setdefault("befundart", "ungeklaert")
        if finding["befundart"] not in KINDS:
            finding["befundart"] = "ungeklaert"
        finding.setdefault("ki_pruefung", {"status": "nicht_geprueft"})
        spans = finding_spans(text, finding)
        finding["anker_status"] = "eindeutig" if len(spans) == 1 else "mehrdeutig" if spans else "nicht_gefunden"
        finding.pop("textanker", None)
        if len(spans) == 1:
            start, end = spans[0]
            finding["zitat"] = text[start:end]
            # UTF-16-Positionen entsprechen String.slice in der Web-App.
            finding["textanker"] = {"text_hash": digest, "start": len(text[:start].encode("utf-16-le")) // 2,
                                     "end": len(text[:end].encode("utf-16-le")) // 2}
            quote, correction = finding["zitat"], finding.get("korrektur", "")
            # Eine als Satzanfangsregel begründete reine Großschreibung darf
            # nicht an einer Stelle mitten im Satz als sicherer Normfehler gelten.
            # Andere Gründe (z.B. Eigenname) bleiben für die Lehrkraft offen.
            prefix = text[:start].rstrip(' \t\r\n„“\"\'(')
            line_prefix = text[:start].rsplit('\n', 1)[-1].strip()
            sentence_start = not prefix or prefix[-1:] in '.!?:' or not line_prefix
            if (finding.get("typ") == "R" and "satzanf" in finding.get("erklaerung", "").casefold()
                    and quote and quote[0].islower() and correction == quote[0].upper() + quote[1:]
                    and not sentence_start):
                finding["kontext_widerspruch"] = True
                finding["befundart"] = "ungeklaert"
                finding["ki_pruefung"] = {"status": "widerspruch", "begruendung": "Die behauptete Satzanfangsregel passt nicht zur Position im vollständigen Satz. Kein sicherer Normbefund."}
        elif not spans:
            finding["befundart"] = "ungeklaert"
    return findings


def _change_key(finding: dict) -> tuple:
    quote, replacement = finding.get("zitat", ""), finding.get("korrektur", "")
    # Tatsächlich geänderte Spanne bestimmen, nicht die Länge des Modellzitats.
    prefix = 0
    while prefix < min(len(quote), len(replacement)) and quote[prefix] == replacement[prefix]:
        prefix += 1
    suffix = 0
    while suffix < min(len(quote), len(replacement)) - prefix and quote[-suffix-1] == replacement[-suffix-1]:
        suffix += 1
    anchor = finding.get("textanker")
    if anchor:
        delta_start = anchor["start"] + len(quote[:prefix].encode("utf-16-le")) // 2
        delta_end = anchor["end"] - len((quote[len(quote)-suffix:] if suffix else "").encode("utf-16-le")) // 2
        change = (delta_start, delta_end, replacement[prefix:len(replacement)-suffix if suffix else None])
        return (anchor["text_hash"], *change)
    return (quote, replacement, finding.get("typ"))


def _overlaps(a: dict, key_a: tuple, b: dict, key_b: tuple) -> bool:
    """Dieselbe Änderung oder Änderungen, die nicht beide angewendet werden können."""
    if key_a == key_b:
        return True
    anchor_a, anchor_b = a.get("textanker"), b.get("textanker")
    if not anchor_a or not anchor_b or anchor_a["text_hash"] != anchor_b["text_hash"]:
        return False
    for outer, inner in ((a, b), (b, a)):
        o, i = outer["textanker"], inner["textanker"]
        # Ein enthaltener Befund, dessen Ersatz schon in der Gesamtersetzung steckt.
        if (o["start"] <= i["start"] and i["end"] <= o["end"] and inner.get("korrektur")
                and inner.get("korrektur") != inner.get("zitat")
                and inner["korrektur"] in outer.get("korrektur", "")):
            return True
    (start_a, end_a), (start_b, end_b) = key_a[1:3], key_b[1:3]
    if start_a < end_a and start_b < end_b:
        return start_a < end_b and start_b < end_a
    # Einfügung mitten in einer anderen Änderung.
    return start_b < start_a < end_b if start_a == end_a else start_a < start_b < end_a


def _rank(finding: dict) -> int:
    review = (finding.get("ki_pruefung") or {}).get("status")
    if review == "verworfen":
        return 0
    if (finding.get("befundart") in {"normfehler", "ausdrucksproblem"} and review in {"bestaetigt", "korrigiert"}
            and (finding.get("ersetzungspruefung") or {}).get("status") == "bestaetigt"):
        return 2
    return 1


def _span_length(finding: dict) -> int:
    anchor = finding.get("textanker")
    return anchor["end"] - anchor["start"] if anchor else len(finding.get("zitat", ""))


def deduplicate(findings: list[dict]) -> list[dict]:
    """Gleiche oder sich überschneidende Änderungen zusammenführen, unabhängige Fehler behalten.

    Vorrang hat der besser geprüfte Befund, danach die Gesamtersetzung (größere Spanne).
    Zusammengeführte Kennungen bleiben am behaltenen Befund nachvollziehbar.
    """
    kept: list[tuple[tuple, dict]] = []
    for finding in findings:
        key = _change_key(finding)
        index = next((i for i, (other_key, other) in enumerate(kept)
                      if _overlaps(finding, key, other, other_key)), None)
        if index is None:
            kept.append((key, finding))
            continue
        other = kept[index][1]
        if (_rank(finding), _span_length(finding)) > (_rank(other), _span_length(other)):
            winner, loser, kept[index] = finding, other, (key, finding)
        else:
            winner, loser = other, finding
        merged = [loser["befund_id"]] if isinstance(loser.get("befund_id"), str) else []
        merged += loser.get("zusammengefuehrt", [])
        if merged:
            winner["zusammengefuehrt"] = list(dict.fromkeys(winner.get("zusammengefuehrt", []) + merged))
    return [finding for _, finding in kept]


def apply_countercheck(data: dict, detail: dict, text: str) -> None:
    """KI-Prüfung ist keine Lehrkraftentscheidung und keine Wahrheitsgarantie."""
    checks = detail.get("befundpruefung", [])
    by_id = {item.get("befund_id"): item for item in checks if isinstance(item, dict)} if isinstance(checks, list) else {}
    warnings = data.setdefault("qualitaetswarnungen", [])
    missing = {finding.get("befund_id") for finding in data.get("fehler", [])} - set(by_id)
    if missing:
        warnings.append({"code": "befundpruefung_unvollstaendig", "message": "Die KI-Gegenprüfung deckt nicht alle Sprachhinweise ab. Offene Befunde bitte fachlich prüfen."})
    for finding in data.get("fehler", []):
        check = by_id.get(finding.get("befund_id"))
        if not check:
            continue
        status = check.get("status")
        if status not in {"bestaetigt", "widerspruch", "ungeklaert"}:
            continue
        if finding.get("kontext_widerspruch"):
            warnings.append({"code": "regelkontext_pruefen", "message": f"Regelbegründung zur Textstelle nicht abgesichert: {finding.get('zitat', '')}."})
            continue
        finding["ki_pruefung"] = {"status": status, "begruendung": str(check.get("begruendung", ""))}
        if check.get("befundart") in KINDS:
            finding["befundart"] = check["befundart"]
        if status != "bestaetigt":
            if finding["befundart"] != "stilalternative":
                finding["befundart"] = "ungeklaert"
            warnings.append({"code": "befund_gegenpruefung", "message": f"Gegenprüfung offen: {finding.get('zitat', '')}. {check.get('begruendung', '')}"})
    for group in ("k1_inhalt", "k1_textstruktur", "k3_stil", "k3_sprachnormen"):
        for entry in detail.get(group, {}).values():
            if not isinstance(entry, dict):
                continue
            quotes = entry.get("belege", [])
            invalid = not isinstance(quotes, list) or not quotes or any(not isinstance(q, str) or not find_spans(text, q) for q in quotes)
            if entry.get("stufe") == 1 and invalid:
                warnings.append({"code": "negative_bewertung_pruefen", "message": "Eine negative Detailbewertung hat keine eindeutig nachgewiesenen Schülertextbelege. Bitte fachlich prüfen."})
    for message in detail.get("pruefbedarf", []) if isinstance(detail.get("pruefbedarf"), list) else []:
        if isinstance(message, str) and message.strip():
            warnings.append({"code": "bewertungsgrundlage_pruefen", "message": message})


def german_usage_guidance() -> str:
    """Gemeinsamer Ausdrucksprüfauftrag für Analyse und Deutsch-Gegenprüfung."""
    return (
        "SPRACHGEBRAUCH IM KONTEXT: Lies jeden vollständigen Satz auch auf natürliche, "
        "bedeutungsgerechte Formulierung; korrekte Schreibweise allein genügt nicht. "
        "Suche ausdrücklich nach versehentlich doppelten Modalverben oder Satzbausteinen, "
        "Satzabbrüchen und vermischten Konstruktionen. Prüfe außerdem unübliche Wortverbindungen "
        "(Kollokationen), unpassende Wortbedeutungen, widersprüchliche Sprachbilder, unklare Bezüge "
        "und schwer verständliche Nominalketten. "
        "Auch ein noch verständlicher Satz kann ein belegbares Ausdrucksproblem enthalten, "
        "etwa eine in diesem Kontext unübliche Verb-Nomen-Verbindung. "
        "Ordne syntaktische Defekte G/normfehler und belegte unpassende Wortverbindungen "
        "A/ausdrucksproblem zu. Erkläre konkret, welche Konstruktion oder Wortverbindung im "
        "vollständigen Satz nicht passt; 'klingt besser' oder 'unnatürlich' allein genügt nicht. "
        "Zitiere den kleinsten vollständigen Problembereich und ersetze ihn bedeutungstreu. "
        "Bloße Länge, Nominalstil, Wiederholung als rhetorisches Mittel, einfache Sprache oder "
        "persönliche Wortwahl sind für sich keine Fehler. Ist nur eine flüssigere Form möglich, "
        "kennzeichne sie als freiwillige stilalternative; bei unklarer Bedeutung als ungeklaert. "
        "Erhalte österreichisches Standarddeutsch, Textsortenregister und die Stimme der Person. "
        "Prüfe in der Gegenprüfung auch bisher übersehene Ausdrucksprobleme unabhängig von den "
        "vorhandenen Befunden. Keine Mindestanzahl an Fehlern oder Ausdruckshinweisen.\n"
    )


def quality_examples(fach: str, textsorte: str) -> str:
    if not fach.lower().startswith("deutsch"):
        return "Beispiele erläutern ausschließlich die jeweilige Regel; übertrage keine Beispielwörter auf die Arbeit."
    examples = [
        {"eingabe": "Wir hoffen auf etwas gutes.", "befund": {"zitat": "gutes", "korrektur": "Gutes", "typ": "R", "befundart": "normfehler"}},
        {"eingabe": "Wenn wir gemeinsam handeln würden, hätten wir mehr Einfluss.", "befund": None,
         "grund": "Die würde-Form ist korrekt; eine kürzere Form ist kein zwingender Grammatikfehler."},
        {"eingabe": "Liebe Mitschülerinnen und Mitschüler, lasst uns jetzt handeln!", "befund": None,
         "grund": "Adressatenansprache und Appell passen zur Meinungsrede."},
        {"eingabe": "Deshalb sollten die Beteiligten sollten gemeinsam nach Lösungen suchen.",
         "befund": {"zitat": "die Beteiligten sollten", "korrektur": "die Beteiligten", "typ": "G", "befundart": "normfehler"},
         "grund": "Das Modalverb steht versehentlich doppelt; eine Instanz genügt im vollständigen Satz."},
        {"eingabe": "Der Verein ergriff eine Entscheidung über den Termin.",
         "befund": {"zitat": "ergriff eine Entscheidung", "korrektur": "traf eine Entscheidung", "typ": "A", "befundart": "ausdrucksproblem"},
         "grund": "Die Verb-Nomen-Verbindung passt nicht: Eine Entscheidung wird getroffen."},
        {"eingabe": "Der Verein traf eine Entscheidung über den Termin.", "befund": None,
         "grund": "Die Wortverbindung ist passend; 'entschied über den Termin' wäre nur eine Stilalternative."},
    ]
    return (
        german_usage_guidance()
        + f"Kleine Regelbeispiele für {textsorte}; keine Musterbewertung dieser Arbeit:\n"
        + json.dumps(examples, ensure_ascii=False)
    )
