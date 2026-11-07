"""Deterministische Sprachregeln und Befundklassifikation ohne Modellaufruf.

Die Regeln sind bewusst eng: Sie greifen nur dort, wo die Entscheidung ohne
Satzanalyse sicher ist. Alles andere bleibt Aufgabe der Analyse und der
Gegenprüfung.
"""

from __future__ import annotations

import re

from correction_quality import find_spans, finding_spans, replacement_context, textstellen

# Anredeformeln am Textanfang (Rede, Brief). Klein- und Großschreibung des
# Anredeworts selbst spielen keine Rolle („…, liebe Eltern,“).
_ANREDE = re.compile(
    r"(?i)^(?:liebe[rs]?|sehr\s+geehrte[rns]?|geschätzte[rns]?|werte[rns]?|verehrte[rns]?"
    r"|hochverehrte[rns]?|meine\s+(?:sehr\s+)?(?:geehrten|verehrten|lieben)?\s*damen"
    r"|hallo|guten\s+(?:tag|morgen|abend)|grüß\s+gott|servus|hi)\b"
)
# Wörter, die nach einer Anrede nie Nomen sind. Nomen bleiben groß und werden
# deshalb nicht über eine Wortliste, sondern nur über diese Liste erfasst.
_KLEIN_NACH_ANREDE = frozenset(
    """
    der die das den dem des ein eine einen einem einer eines kein keine keinen keinem keiner
    ich du er es wir man mein meine meinen meinem unser unsere unseren unserem euer eure
    dies diese dieser dieses diesen diesem jede jeder jedes alle viele manche einige
    wenn als ob dass weil da und aber oder denn doch sondern nachdem bevor obwohl seit
    wie was wer wo warum wieso weshalb wann welche welcher welches
    heute jetzt nun gerade schon immer oft vielleicht zuerst zunächst hier dort damals
    auch nur gestern bald endlich zum
    habe hast hat haben habt hatte hatten bin bist ist sind seid war waren
    wird werden werdet wurde wurden kann kannst können könnt konnte konnten
    muss musst müssen müsst soll sollst sollen sollt will willst wollen wollt
    darf dürfen dürft möchte möchten möchtet lasst lassen stellt stellen gibt
    """.split()
)
_PERSONALPRONOMEN = frozenset("ich du er sie es wir ihr man".split())
# Höflichkeitsform und Anredepronomen bleiben groß.
_HOEFLICH = frozenset(
    "Sie Ihnen Ihr Ihre Ihren Ihrem Ihrer Ihres Euch Euer Eure Du Dich Dir Dein Deine".split()
)

_ERKLAERUNG_ANREDE = (
    "Nach einer Anrede mit Komma geht der Text kleingeschrieben weiter, außer das "
    "nächste Wort ist ein Nomen oder die Höflichkeitsform „Sie“."
)


def _titelzeile(line: str) -> bool:
    words = line.split()
    return 0 < len(words) <= 5 and not re.search(r"[,.!?:;]", line) and not _ANREDE.match(line)


def _anrede_rest(line: str) -> str | None:
    """Text nach den Anredeteilen einer Zeile; None, wenn die Zeile keine Anrede ist."""
    rest, consumed = line, False
    while True:
        part, comma, after = rest.partition(",")
        if not comma or not _ANREDE.match(part.strip()):
            break
        consumed, rest = True, after
    return rest if consumed else None


def anrede_kleinschreibung(text: str) -> list[dict]:
    """Großschreibung nach einer Anrede mit Komma am Textanfang als Regelbefund."""
    lines = textstellen(text)
    while lines and _titelzeile(lines[0]["text"]):
        lines = lines[1:]
    if not lines:
        return []
    rest = _anrede_rest(lines[0]["text"])
    if rest is None:
        return []
    if rest.strip():
        source, start = lines[0], lines[0]["end"] - len(rest)
    elif len(lines) > 1:
        source, start = lines[1], lines[1]["start"]
    else:
        return []
    # Überspringt Leerraum und öffnende Anführungszeichen vor dem ersten Wort.
    match = re.compile(r"[\s„“\"'(]*(\w+)((?:\s+\S+){0,3})").match(text, start, source["end"])
    if not match:
        return []
    word, following = match.group(1), match.group(2).split()
    nachfolger = re.sub(r"\W", "", following[0]) if following else ""
    if (
        not word[0].isupper()
        or word in _HOEFLICH
        or not (word.casefold() in _KLEIN_NACH_ANREDE or nachfolger in _PERSONALPRONOMEN | {"Sie"})
    ):
        return []
    word_start = match.start(1)
    line_text = source["text"]
    finding = None
    # Kleinster in der Zeile eindeutiger Bereich ab dem Wort.
    for count in range(1, len(following) + 1):
        quote = " ".join([word, *following[:count]])
        if len(find_spans(line_text, quote)) == 1:
            finding = {"zitat": quote, "textstelle_id": source["id"]}
            break
    if finding is None:
        # Rückfall: Anredeende mit einbeziehen (zeilenübergreifend, nur Kommentar).
        anchor_start = text.rfind(",", 0, word_start)
        anchor_start = text.rfind(" ", 0, anchor_start) + 1 if anchor_start >= 0 else word_start
        quote = text[anchor_start:match.end(1)]
        if len(find_spans(text, quote)) != 1:
            return []
        finding = {"zitat": quote, "textstelle_id": None}
    spans = finding_spans(text, finding)
    if len(spans) != 1:
        return []
    span_start, span_end = spans[0]
    original = text[span_start:span_end]
    offset = word_start - span_start
    finding.update(
        korrektur=original[:offset] + word[0].lower() + original[offset + 1:],
        typ="R",
        befundart="normfehler",
        erklaerung=_ERKLAERUNG_ANREDE,
        regel_muster="anrede_klein",
        befund_id="regel-anrede-1",
        ki_pruefung={
            "status": "bestaetigt",
            "begruendung": "Feste Regel: Kleinschreibung nach Anrede mit Komma.",
            "herkunft": "regelpruefung",
        },
    )
    if finding["textstelle_id"] is None:
        finding.pop("textstelle_id")
    context = replacement_context(text, finding)
    finding["ersetzungspruefung"] = {
        "status": "bestaetigt",
        "begruendung": "Feste Regel; die Ersetzung ändert nur den Anfangsbuchstaben.",
        **({"pruefsumme": context["pruefsumme"]} if context else {}),
    }
    finding["nur_kommentar"] = "\n" in finding["korrektur"]
    return [finding]


def _norm(value: str) -> str:
    return " ".join(value.split())


def _ohne_komma(value: str) -> str:
    return _norm(re.sub(r"\s*,\s*", " ", value))


def _ohne_dass(value: str) -> str:
    return re.sub(r"\b([Dd])ass\b", r"\1as", value)


def aenderungsart(zitat: str, korrektur: str) -> str | None:
    """Art der tatsächlichen Änderung, nur für eindeutig bestimmbare Fälle."""
    old, new = _norm(zitat or ""), _norm(korrektur or "")
    if not old or not new or old == new:
        return None
    if old.casefold() == new.casefold():
        return "gross_klein"
    if _ohne_komma(old) == _ohne_komma(new):
        return "komma"
    if _ohne_dass(old) == _ohne_dass(new):
        return "das_dass"
    if _ohne_komma(_ohne_dass(old)) == _ohne_komma(_ohne_dass(new)):
        return "das_dass_komma"
    if old.replace("-", "") == new.replace("-", ""):
        return "bindestrich"
    if re.sub(r"\s", "", old).casefold() == re.sub(r"\s", "", new).casefold():
        return "getrennt_zusammen"
    return None


_TYP_NACH_ART = {
    "gross_klein": "R",
    "das_dass": "R",
    "das_dass_komma": "R",
    "bindestrich": "R",
    "getrennt_zusammen": "R",
    "komma": "Z",
}


def pruefe_fehlertyp(finding: dict) -> dict:
    """Fehlertyp an die tatsächliche Änderung binden (R/Z), sonst unverändert."""
    art = aenderungsart(finding.get("zitat", ""), finding.get("korrektur", ""))
    target = _TYP_NACH_ART.get(art)
    if target and finding.get("typ") != target:
        finding["typ_vorher"] = finding.get("typ")
        finding["typ"] = target
    if art == "das_dass_komma":
        finding["teiltypen"] = ["R", "Z"]
    return finding


def _enthaelt(text: str, pattern: str) -> bool:
    return re.search(pattern, text) is not None


def regel_muster(finding: dict) -> str:
    """Kurzes Regel-Etikett für Lerntipps; Fallback ist der Fehlertyp."""
    if finding.get("regel_muster"):
        return finding["regel_muster"]
    art = aenderungsart(finding.get("zitat", ""), finding.get("korrektur", ""))
    erklaerung = (finding.get("erklaerung") or "").casefold()
    typ = finding.get("typ")
    if art == "gross_klein":
        if "anrede" in erklaerung:
            return "anrede_klein"
        if _enthaelt(erklaerung, r"nominal|substantiv"):
            return "nominalisierung"
        if _enthaelt(erklaerung, r"satzanf|doppelpunkt"):
            return "satzanfang"
        if "eigenname" in erklaerung:
            return "eigenname"
        return "gross_klein"
    if art in {"das_dass", "das_dass_komma"}:
        return "das_dass"
    if art in {"bindestrich", "getrennt_zusammen"}:
        return art
    if art == "komma" or typ == "Z":
        if "infinitiv" in erklaerung:
            return "komma_infinitiv"
        if _enthaelt(erklaerung, r"nebensatz|relativ|konjunktion|vergleichssatz"):
            return "komma_nebensatz"
        if _enthaelt(erklaerung, r"einschub|apposition|zusatz|nachgestellt|aufzählung"):
            return "komma_einschub"
        return "komma" if art == "komma" else "zeichensetzung"
    if typ == "G":
        if _enthaelt(erklaerung, r"zeitform|tempus|präteritum|perfekt|futur|präsens"):
            return "zeitform"
        if _enthaelt(erklaerung, r"kongruenz|singular|plural|übereinstimm"):
            return "kongruenz"
        if _enthaelt(erklaerung, r"dativ|akkusativ|genitiv|nominativ|kasus|deklination|rektion"):
            return "kasus"
        if _enthaelt(erklaerung, r"satzbau|satzbruch|unvollständig|wortstellung|satzstellung"):
            return "satzbau"
        return "grammatik"
    if typ == "A":
        if _enthaelt(erklaerung, r"bedeut|gemeint|anglizismus|lehnübersetzung"):
            return "wortbedeutung"
        return "ausdruck"
    return "rechtschreibung"
