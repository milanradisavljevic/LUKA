# Benchmarks

Lokaler Benchmark-Ordner für die qualitative Evaluation der KI-Korrekturen.

## Enthalten

- `cases/` — Deutsch-Satz; das Manifest gibt ausschließlich sechs synthetische Fälle frei. Weitere Dateien in diesem Ordner werden vom Runner nicht verwendet.
- `cases_en/` — Englisch-Satz: synthetische DOCX + `manifest.json` mit Per-Case-Config
  (`fach`/`land`/`aufgabe`/`schulstufe`/`rubric`/`textsorte` überschreiben den globalen Default)
- `cases/manifest.json` bzw. `cases_en/manifest.json` — lokale Freigabe mit neutralen IDs (`case-...`) und `dataClass`
- `cases/reference_findings.json` — getrennte lokale Referenzbefunde für die Lehrkraftprüfung; wird nie an den Analyseaufruf übergeben
- `evaluation.json` — Auswertungsprotokoll (wird nicht committed); enthält je Fall
  `klasse`, `fach`, `textsorte`, `rubric` (Mischtabelle)

## Sicherheit

- **Nicht in Git:** Fälle, Manifeste und Auswertungen sind gitignored; nur Runner, Auswertungsskript und diese Anleitung sind versioniert
- **Keine echten Namen:** Nur synthetische oder nachweislich pseudonymisierte Fälle
- **Keine API-Schlüssel:** Werden hier nicht gespeichert
- **Prüfauszüge nur lokal:** Mit `--include-review-data` werden Fehlerzitate,
  Korrekturen und Notenbegründungen für die Lehrkraftprüfung gespeichert — nie
  der vollständige Schülertext. Diese Auszüge bleiben im gitignorierten Ordner.
- **Keine Modellantworten in Git:** Protokolle und Prüfauszüge werden nicht committed

## Nutzung

```bash
# Fälle und Manifest nur lokal ablegen (nie committen). Das Manifest muss
# dataClass "synthetic" oder "pseudonymized" ausweisen; der Runner akzeptiert
# keine anderen Datenklassen.

# Das formale Gate zählt nur synthetische DeepSeek-Flash-Läufe. V4-Pro- und
# pseudonymisierte Läufe sind dafür ungültig. Erst Ablauf ohne API-Aufruf prüfen.
python benchmarks/run_benchmark.py --provider deepseek --model deepseek-flash --dry-run

# Englisch-Satz (Per-Case-Config greift pro Fall):
python benchmarks/run_benchmark.py --provider deepseek --model deepseek-flash --manifest benchmarks/cases_en/manifest.json --dry-run

# Die sechs deutschen synthetischen DOCX-Fixtures bei Bedarf ergänzen:
python benchmarks/build_synthetic_de_cases.py

# Nur freigegebene synthetische Fälle an DeepSeek senden. Für die spätere
# Lehrkraftprüfung den lokalen Prüfauszug ausdrücklich aktivieren.
python benchmarks/run_benchmark.py --provider deepseek --model deepseek-flash --include-review-data --output evaluation.json
# Für eine Modellfreigabe zwei vollständige, separat protokollierte Läufe und
# anschließend die Lehrkraftbewertung durchführen. Der zweite Lauf wird nur
# beim Gate genannt, nicht in das erste Protokoll kopiert:
python benchmarks/run_benchmark.py --provider deepseek --model deepseek-flash --include-review-data --output zweiter-lauf.json
python benchmarks/evaluiere.py --input evaluation.json
python benchmarks/evaluiere.py --zweiter-lauf zweiter-lauf.json --gate-only

# Zusätzlicher, rein lokaler Abgleich gegen bekannte Referenzbefunde. Er ersetzt
# die Lehrkraftprüfung nicht und trifft keine Modellfreigabeentscheidung.
python benchmarks/evaluiere.py --input evaluation.json \
  --reference-findings cases/reference_findings.json --gate-only

# A/B der Fehlerdichte-Regel: identisches Manifest/Modell, getrennte Protokolle.
# Die Legacy-Variante ist nur für diesen expliziten Promptvergleich verfügbar;
# der normale Korrekturpfad und Benchmark-Default bleiben neutral.
python benchmarks/run_benchmark.py --provider deepseek --model deepseek-flash --prompt-variant legacy --run-label ab-legacy --include-review-data --output ab-legacy.json
python benchmarks/run_benchmark.py --provider deepseek --model deepseek-flash --prompt-variant neutral --run-label ab-neutral --include-review-data --output ab-neutral.json

# Beide Protokolle separat und ohne die Variantenbezeichnung im Bewertungsdialog
# beurteilen. Je Fall zusätzlich tatsächliche Eingriffe einstufen: keine,
# einzelne Änderungen oder wesentliche Überarbeitung. Danach gepaart vergleichen.
python benchmarks/evaluiere.py --a-b --input ab-legacy.json
python benchmarks/evaluiere.py --a-b --input ab-neutral.json --vergleich ab-legacy.json
```


## Getrennter Vergleich von Modellen und Denkmodus

`run_benchmark.py --comparison-run --reasoning high --provider deepseek --model deepseek-v4-pro --dry-run`
prüft den Ablauf ohne Versand. Ohne `--dry-run` entstehen kostenpflichtige API-Aufrufe.
`--reasoning` verwendet die modellbezogenen Optionen aus `model-options` (z. B. `off`,
`high`, `max`). Vergleichsläufe zählen ausdrücklich nicht zum bestehenden Flash-Gate.
Für jedes Paar dasselbe Manifest, dieselben Bewertungsgrundlagen und unabhängige Läufe
verwenden. Nur eine Bedingung gleichzeitig ändern. Ein nicht zur Promptentwicklung
verwendeter Teil des synthetischen Referenzsatzes bleibt für die Schlussprüfung zurück.

`compare_runs.py erster-lauf.json zweiter-lauf.json --output vergleich.json` vergleicht
vollständige synthetische Protokolle und prüft gleiche Text-Prüfsummen. Dauer und
API-Verbrauch werden mitgeführt. Fachliche Kennzahlen werden nur nach einer unabhängigen,
verblindeten Prüfung aus `qualityReview` je Fall aggregiert: `falseErrors`, `missedErrors`,
`usableSuggestions`, `suggestionCount`, `gradePlausible` (bool). Fehlende Beurteilungen
bleiben offen. `costUsd` darf nur mit belegten Kosten ergänzt werden; fehlende Kosten
werden nicht aus vermuteten Preisen erfunden. Kein Ergebnis stellt automatisch ein
Standardmodell um oder ersetzt die fachliche Freigabe.


## Deutsch-Gegenprüfung als separater Referenzvergleich

`python deutsch_referenz.py` erzeugt sechs rein synthetische Fälle unter `cases_deutsch_review_v1/`, einschließlich Beilagen und getrennten Prüferwartungen. Vorhandene Ordner werden nicht überschrieben. Die Prüferwartungen enthalten keine vorgetäuschten Lehrkraftnoten: fachliche Abnahme und Notenspannen sind ausdrücklich offen.

Zunächst ohne API testen:

```bash
python benchmarks/run_benchmark.py --manifest benchmarks/cases_deutsch_review_v1/manifest.json --comparison-run --dry-run --model deepseek-v4-pro --reasoning high --output deutsch-review-dryrun.json
```

Den Runner aus `apps/natascha/` aufrufen (`python benchmarks/run_benchmark.py ...`). Für den späteren Promptvergleich dieselben Fälle, Rasterinhalte, Modellkennung und Denkoption verwenden; beide Codefassungen in isolierten Checkouts ausführen und ihre Protokolle mit `compare_runs.py` vergleichen. Promptfingerabdrücke erfassen auch die Deutsch-Gegenprüfung und die in Word verwendeten Detaildeskriptoren. `gradeProvisional` und `reviewStatus` machen offene Prüfungen sichtbar. Protokolle erst nach unabhängiger fachlicher Sichtung mit `qualityReview` ergänzen. Modell- oder Denkmodusänderungen in eigenen Paarvergleichen prüfen. Kein Vergleich gibt automatisch ein Modell oder Release frei.


## Pseudonymisierte Referenzrunde

Lokale Vergleichsläufe können mit `compare_runs.py ... --allow-pseudonymized`
ausdrücklich pseudonymisierte Fälle vergleichen. Datenklassen müssen übereinstimmen;
das synthetische Modellgate bleibt unverändert. `qualityReview.falseReasons` zählt
falsche Begründungen, `meaningChanges` sinnverändernde vorbereitete Ersetzungen.
Fehlende Fachurteile ergeben `safetyAssessment: offen`, niemals eine Freigabe.
Die erste Referenzrunde umfasst drei geprüfte Arbeiten mit identischer bestätigter
Grundlage. Zuerst DeepSeek Flash/max, höchstens sechs Aufrufversuche ohne automatische
Wiederholungsserie. OpenAI und Mistral werden erst nach dieser Auswertung festgelegt.
Referenzurteile und Notenspannen gehören niemals in den Analyseprompt.
