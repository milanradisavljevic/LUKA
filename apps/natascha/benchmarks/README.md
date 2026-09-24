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

# Erst Ablauf und Manifest ohne Cloud-Aufruf prüfen.
python benchmarks/run_benchmark.py --dry-run

# Englisch-Satz (Per-Case-Config greift pro Fall):
python benchmarks/run_benchmark.py --manifest benchmarks/cases_en/manifest.json --dry-run

# Die sechs deutschen synthetischen DOCX-Fixtures bei Bedarf ergänzen:
python benchmarks/build_synthetic_de_cases.py

# Ein Live-Lauf erfordert eine separate Freigabe für den verwendeten Anbieter.
# Für die spätere Lehrkraftprüfung den lokalen Prüfauszug ausdrücklich aktivieren.
python benchmarks/run_benchmark.py --include-review-data --output evaluation.json
# Für eine Modellfreigabe zwei vollständige, separat protokollierte Läufe und
# anschließend die Lehrkraftbewertung durchführen. Der zweite Lauf wird nur
# beim Gate genannt, nicht in das erste Protokoll kopiert:
python benchmarks/run_benchmark.py --include-review-data --output zweiter-lauf.json
python benchmarks/evaluiere.py --input evaluation.json
python benchmarks/evaluiere.py --zweiter-lauf zweiter-lauf.json --gate-only

# Zusätzlicher, rein lokaler Abgleich gegen bekannte Referenzbefunde. Er ersetzt
# die Lehrkraftprüfung nicht und trifft keine Modellfreigabeentscheidung.
python benchmarks/evaluiere.py --input evaluation.json \
  --reference-findings cases/reference_findings.json --gate-only

# A/B der Fehlerdichte-Regel: identisches Manifest/Modell, getrennte Protokolle.
# Die Legacy-Variante ist nur für diesen expliziten Promptvergleich verfügbar;
# der normale Korrekturpfad und Benchmark-Default bleiben neutral.
python benchmarks/run_benchmark.py --prompt-variant legacy --run-label ab-legacy --include-review-data --output ab-legacy.json
python benchmarks/run_benchmark.py --prompt-variant neutral --run-label ab-neutral --include-review-data --output ab-neutral.json

# Beide Protokolle separat und ohne die Variantenbezeichnung im Bewertungsdialog
# beurteilen. Je Fall zusätzlich tatsächliche Eingriffe einstufen: keine,
# einzelne Änderungen oder wesentliche Überarbeitung. Danach gepaart vergleichen.
python benchmarks/evaluiere.py --a-b --input ab-legacy.json
python benchmarks/evaluiere.py --a-b --input ab-neutral.json --vergleich ab-legacy.json
```
