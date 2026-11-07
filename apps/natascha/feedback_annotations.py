"""Word-Kommentare zuerst am unveränderten Text verankern, dann Änderungen zeigen."""

from __future__ import annotations

import copy
import re
from datetime import date

from docx.opc.packuri import PackURI
from docx.opc.part import Part
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import RGBColor
from docx.text.run import Run
from lxml import etree

from correction_quality import find_spans, inline_replacement_safe

NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _comma_change(finding) -> bool:
    """Nur Beistrichänderungen erkennen; Wortänderungen behalten ihren Kommentar."""
    if finding.typ != "Z" or finding.zitat == finding.korrektur:
        return False
    if "," not in finding.zitat + finding.korrektur:
        return False

    def without_commas(text):
        # Wortgrenzen erhalten: „in dem“ ist nicht dasselbe wie „indem“.
        return re.findall(r"\w+|[^\w\s,]", text)

    return without_commas(finding.zitat) == without_commas(finding.korrektur)


def attach_comments(doc, hinweise, fehler, paragraphs, extra_strings, author):
    """Sämtliche Fundstellen werden vor dem ersten Texteingriff festgelegt."""
    pool = list(paragraphs if paragraphs is not None else doc.paragraphs)
    originals = [(para, para.text) for para in pool]
    source_ids = {
        id(para): f"S{i}"
        for i, (para, _text) in enumerate(((p, t) for p, t in originals if t.strip()), 1)
    }
    planned = []
    used = set()

    def matches(quote, source_id=None):
        return [
            (para, start, end)
            for para, text in originals
            if source_id is None or source_id == source_ids.get(id(para))
            for start, end in find_spans(text, quote)
        ]

    for hint in hinweise:
        found = (
            matches(hint.zitat, getattr(hint, "textstelle_id", None)) if hint.zitat.strip() else []
        )
        if found:
            # Bestandsnotizen behalten ihre bisherige Zuordnung. Neue Notizen
            # können mit textstelle_id eine bestimmte Originalstelle benennen.
            para, start, end = found[0]
            planned.append([para, start, end, hint.kommentar, None, False])
            used.add(id(para))
    free = [h.kommentar for h in hinweise if not h.zitat.strip()] + list(extra_strings or [])
    for message in free:
        candidate = next(
            ((para, text) for para, text in originals if text.strip() and id(para) not in used),
            None,
        )
        if candidate:
            para, text = candidate
            planned.append([para, 0, len(text), message, None, False])
            used.add(id(para))

    for finding in fehler or []:
        found = matches(finding.zitat, getattr(finding, "textstelle_id", None))
        if len(found) != 1 or finding.anker_status == "mehrdeutig":
            continue
        para, start, end = found[0]
        if _comma_change(finding):
            # Der Originalbereich bleibt sichtbar, auch bei fehlendem Komma.
            # Keine Ersetzung und kein Word-Kommentar; Erklärung im Fehlerprotokoll.
            planned.append([para, start, end, None, None, False])
            continue
        proof = getattr(finding, "ersetzungspruefung", None)
        unverified = proof is not None and (
            not isinstance(proof, dict) or proof.get("status") != "bestaetigt"
        )
        label = (
            "Anregung"
            if finding.befundart == "stilalternative"
            else "Zu prüfen"
            if finding.befundart == "ungeklaert" or unverified
            else finding.typ
        )
        message = f"[{label}] {finding.erklaerung}"
        if finding.korrektur.strip():
            message += f" → {finding.korrektur}"
        inline = (
            finding.typ != "Z"
            and not unverified
            and finding.befundart not in {"stilalternative", "ungeklaert"}
            and not getattr(finding, "nur_kommentar", False)
            and inline_replacement_safe(finding.zitat, finding.korrektur)
        )
        if (
            not inline
            and finding.typ != "Z"
            and finding.befundart not in {"stilalternative", "ungeklaert"}
        ):
            message += " (Vorschlag im Zusammenhang prüfen; keine direkte Einfügung.)"
        planned.append([para, start, end, message, finding.korrektur, inline])

    # Widersprechende Änderungen nicht nach zufälliger Listenreihenfolge anwenden.
    candidates = [item for item in planned if item[5]]
    for item in candidates:
        if any(
            other is not item and other[0] is item[0] and item[1] < other[2] and other[1] < item[2]
            for other in candidates
        ):
            item[5] = False
            item[3] += " (Überlappende Vorschläge gemeinsam prüfen; keine direkte Einfügung.)"

    root = etree.Element(f"{{{NS}}}comments", nsmap={"w": NS})
    for para, _text in originals:
        items = [item for item in planned if item[0] is para]
        boundaries = sorted({p for item in items for p in item[1:3]}, reverse=True)
        for position in boundaries:
            offset = 0
            for run in list(para.runs):
                if offset < position < offset + len(run.text):
                    element = copy.deepcopy(run._r)
                    tail = run.text[position - offset :]
                    run.text = run.text[: position - offset]
                    run._r.addnext(element)
                    Run(element, para).text = tail
                    break
                offset += len(run.text)
        segments = []
        offset = 0
        for run in para.runs:
            if run.text:
                segments.append((offset, offset + len(run.text), run))
            offset += len(run.text)
        # Beistrichmarkierungen zuerst setzen, damit eine überlappende konkrete
        # Wortkorrektur ihre eigene Farbe und Durchstreichung behält.
        for item in sorted(items, key=lambda item: item[3] is not None):
            _, start, end, message, replacement, inline = item
            runs = [run for left, right, run in segments if left >= start and right <= end]
            if not runs:
                continue
            if message is None:
                for run in runs:
                    run.font.color.rgb = RGBColor.from_string("E06000")
                    run.font.underline = True
                continue
            comment_id = str(len(root))
            comment = etree.SubElement(
                root,
                f"{{{NS}}}comment",
                {
                    f"{{{NS}}}id": comment_id,
                    f"{{{NS}}}author": author,
                    f"{{{NS}}}date": f"{date.today().isoformat()}T00:00:00Z",
                    f"{{{NS}}}initials": "".join(w[0] for w in author.split()[:2] if w),
                },
            )
            text = etree.SubElement(
                etree.SubElement(etree.SubElement(comment, f"{{{NS}}}p"), f"{{{NS}}}r"),
                f"{{{NS}}}t",
            )
            text.text = message
            begin, finish = OxmlElement("w:commentRangeStart"), OxmlElement("w:commentRangeEnd")
            begin.set(qn("w:id"), comment_id)
            finish.set(qn("w:id"), comment_id)
            runs[0]._r.addprevious(begin)
            runs[-1]._r.addnext(finish)
            ref = OxmlElement("w:r")
            ref_element = OxmlElement("w:commentReference")
            ref_element.set(qn("w:id"), comment_id)
            ref.append(ref_element)
            finish.addnext(ref)
            if inline:
                for run in runs:
                    run.font.strike = True
                    color = run._r.get_or_add_rPr().find(qn("w:color"))
                    if color is None:
                        color = OxmlElement("w:color")
                        run._r.get_or_add_rPr().append(color)
                    color.set(qn("w:val"), "CC0000")
                addition = OxmlElement("w:r")
                props = OxmlElement("w:rPr")
                for name, value in (("color", "007000"), ("b", None), ("sz", "18")):
                    prop = OxmlElement(f"w:{name}")
                    if value is not None:
                        prop.set(qn("w:val"), value)
                    props.append(prop)
                addition.append(props)
                text = OxmlElement("w:t")
                text.set(qn("xml:space"), "preserve")
                text.text = f" {replacement}"
                addition.append(text)
                runs[-1]._r.addnext(addition)
    if len(root):
        part = Part(
            PackURI("/word/comments.xml"),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml",
            etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True),
        )
        doc.part.relate_to(
            part, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
        )
