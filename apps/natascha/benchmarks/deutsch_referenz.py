"""Erzeugt einen kleinen synthetischen Referenzsatz, ohne API-Aufruf.

Die fachlichen Prüferwartungen sind Vorschläge für eine verblindete Prüfung,
keine durch eine Lehrkraft abgenommenen Noten. Die Ausgabe bleibt lokal.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from docx import Document

CASES = [
    {"id": "case-de-rede", "raster": "meinungsrede.md", "stufe": "Oberstufe", "textsorte": "Meinungsrede",
     "text": "Liebe Mitschülerinnen und Mitschüler!\nIn der Beilage steht, dass ein gemeinsamer Schulgarten möglich wäre. Ich unterstütze das: Ein Garten schafft einen Lernort. Im Biologieunterricht könnten wir Pflanzen direkt beobachten.\nManche befürchten mehr Arbeit. Ein freiwilliger Dienstplan könnte sie verteilen. Wenn wir gemeinsam handeln würden, hätten wir mehr Einfluss auf unseren Schulalltag.\nLasst uns mit einem kleinen Beet beginnen!",
     "auftrag": "Schreibe eine kurze Meinungsrede an deine Klasse. Gib den Vorschlag der Beilage wieder, begründe deine Position und formuliere einen Appell. Beilage: Der Elternverein schlägt einen Schulgarten vor; Pflege soll freiwillig organisiert werden.",
     "pruefen": ["Quellenbezug und Publikumsansprache getrennt beurteilen.", "Die würde-Form ist korrekt; mündliche Redehaltung erhalten.", "Keine Matura-Mindestlänge erfinden."]},
    {"id": "case-de-normen", "raster": "deutsch_unterstufe.md", "stufe": "Unterstufe", "textsorte": "Erzählung",
     "text": "Gestern ging ich in den Garten.\nIch sah das die Blumen blühten. Dann haben wir etwas gutes gekocht.\nAm Abend waren wir zufrieden.",
     "auftrag": "Erzähle kurz von einem Gartentag. Keine feste Wortzahl.",
     "pruefen": ["Ich sah das: Komma und dass erforderlich; verschiedene Änderungen getrennt erklären.", "etwas gutes → etwas Gutes.", "Vier Sätze in drei Absätzen; keine fehlenden Absätze behaupten."]},
    {"id": "case-de-verstehen", "raster": "leseverstaendnis.md", "stufe": "Oberstufe", "textsorte": "Leseverständnis",
     "text": "Der Bus fährt am Montag zehn Minuten früher. Damit soll der Anschluss an den Zug gesichert werden.\nFür die Fahrgäste könnte der kürzere Umstieg praktisch sein. Das steht nicht ausdrücklich da, sondern ist meine Schlussfolgerung.",
     "auftrag": "Beilage: Ab Montag fährt die Linie 4 um 7.10 Uhr statt um 7.20 Uhr. Dadurch wird der Anschluss an den Zug um 7.30 Uhr erreicht. Aufgaben: Nenne Änderung und Zweck. Leite eine mögliche Folge für Reisende ab und kennzeichne sie als Schlussfolgerung.",
     "pruefen": ["Verständniskriterien verwenden, keine Meinungsrede oder 15 Schreibkriterien erzwingen.", "Korrekte Zahlen und ausdrücklich gekennzeichnete Schlussfolgerung anerkennen."]},
    {"id": "case-de-quelle-offen", "raster": "kommentar.md", "stufe": "Oberstufe", "textsorte": "Kommentar",
     "text": "Ein Garten für alle\nDer Artikel von Autor A regt einen Schulgarten an. Die Idee überzeugt mich, weil gemeinsames Arbeiten den Schulalltag bereichern kann. Ein Beet reicht für den Anfang.",
     "auftrag": "Schreibe einen kurzen Kommentar zum Schulgarten. Die übermittelte Beilage ist beschädigt: Im Kopf steht Autor B, im abgedruckten Text Autor A. Beide befürworten ein Beet. Die Urheberschaft ist ungeklärt.",
     "pruefen": ["Unklare Urheberschaft als Prüfbedarf anzeigen; kein sicherer Sachfehler allein aus dem Namen."]},
    {"id": "case-de-deutschland", "raster": "deutsch_unterstufe.md", "stufe": "Unterstufe", "textsorte": "Beschreibung", "land": "de",
     "text": "Unser Beet liegt neben dem Eingang. Es ist rechteckig und ungefähr zwei Meter lang.\nLinks wachsen Kräuter. Rechts stehen drei Sonnenblumen. Zwischen beiden Reihen führt ein schmaler Weg hindurch.",
     "auftrag": "Beschreibe das Beet so, dass sich jemand seine Anordnung vorstellen kann. Keine feste Wortzahl.",
     "pruefen": ["Deutschland: bestehende Notenskala 1–6 erhalten.", "Zwei vorhandene Absätze und räumliche Gliederung anerkennen."]},
    {"id": "case-de-formativ", "raster": "leseverstaendnis_unterstufe.md", "stufe": "Unterstufe", "textsorte": "Leseverständnis", "modus": "unbenotet",
     "text": "Die Klasse möchte Kräuter pflanzen. Sie braucht dafür einen sonnigen Platz.\nIch denke, dass die Pflanzen im Schatten schlechter wachsen würden.",
     "auftrag": "Beilage: Die Klasse plant ein Kräuterbeet. Die ausgewählten Pflanzen brauchen viel Sonne. Aufgaben: Was ist geplant? Welche Bedingung ist wichtig? Vermute eine Folge eines schattigen Platzes. Gib nur formative Rückmeldung.",
     "pruefen": ["Auch formative Rückmeldungen gegenprüfen.", "Keine numerische Gesamtnote ausgeben."]},
]


def create_cases(destination: Path) -> Path:
    destination.mkdir(parents=True, exist_ok=False)
    manifest = {"dataClass": "synthetic", "cases": []}
    expectations = {"status": "fachliche Lehrkraftabnahme offen", "cases": []}
    for case in CASES:
        doc = Document()
        for paragraph in case["text"].splitlines():
            doc.add_paragraph(paragraph)
        doc.save(destination / f"{case['id']}.docx")
        source = f"{case['id']}-auftrag.txt"
        (destination / source).write_text(case["auftrag"], encoding="utf-8")
        manifest["cases"].append({"id": case["id"], "file": f"{case['id']}.docx", "config": {
            "fach": "Deutsch", "land": case.get("land", "at"), "schulstufe": case["stufe"],
            "textsorte": case["textsorte"], "rubric": case["raster"], "sourceFile": source,
            "bewertungsmodus": case.get("modus", "benotet")}})
        expectations["cases"].append({"id": case["id"], "prueferwartungen": case["pruefen"], "notenspanne": None})
    for name, content in (("manifest.json", manifest), ("prueferwartungen.json", expectations)):
        (destination / name).write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
    return destination / "manifest.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", default="cases_deutsch_review_v1")
    args = parser.parse_args()
    if not args.name.startswith("cases_") or not all(c.isalnum() or c in "_-" for c in args.name):
        parser.error("Nur ein lokaler Ordnername mit Präfix cases_ ist erlaubt.")
    create_cases(Path(__file__).resolve().parent / args.name)
    print("Sechs synthetische Fälle lokal angelegt. Keine API aufgerufen; fachliche Abnahme offen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
