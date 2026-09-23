# LUKA Korrektur: Qualitäts- und Mistral-Fahrplan

## Leitentscheidung

LUKA priorisiert zuerst zuverlässige, nachvollziehbare **Deutsch-DOCX-Korrekturen**.
**Mistral Medium 3.5** wird nach bestandenem Qualitäts-Gate das Standardmodell. Mistral Small 4 bleibt eine bewusst wählbare, günstigere Alternative. PDF-/Bild-OCR ist ausdrücklich verschoben, bis der Text-Korrekturpfad verlässlich ist.

Die vorhandenen bereits pseudonymisierten Korrekturfälle dienen lokal als Benchmark. Sie werden weder committed noch in CI, Test-Reports oder Releases aufgenommen.

## Mistral API — Bestätigte Model-IDs

| Modell | API-ID | Rolling Alias | Context Window | Output Limit | Preis (pro 1M Tokens) |
|--------|--------|---------------|----------------|--------------|----------------------|
| Mistral Medium 3.5 | `mistral-medium-3-5` | `mistral-medium-latest` | 256k | 32k | $1.50 in / $7.50 out |
| Mistral Small 4 | `mistral-small-2603` | `mistral-small-latest` | 256k | 16k | $0.15 in / $0.60 out |

## Benchmark-Fälle

Pfad: `apps/natascha/input/6i/Schularbeit_5/`

11 DOCX-Dateien, alle Kommentar (6i, Schularbeit_5, Thema "BookTok"):

| Datei | Zeichen | Größenordnung |
|-------|---------|---------------|
| BookTok.docx | 3.737 | kurz |
| CeciliaSantosSchenk_Schularbeit_Deutsch.docx | 3.172 | kurz |
| Clara Trautschold- deutsch.docx | 2.842 | kurz |
| Die neue Literatur.SophieKalteis.docx | 3.514 | mittel |
| Emily Pilz .docx | 3.389 | mittel |
| Flora Lex.docx | 3.098 | kurz |
| LouisaHasenrader.Deutschsa.docx | 3.446 | mittel |
| Neuer Booktok trend_TamaraEbner.docx | 2.725 | kurz |
| Schularbeit Kommentar_Eléni.docx | 2.903 | kurz |
| Sophia Dankl Sa.docx | 3.237 | mittel |
| Thema 2 BookTok.docx | 6.897 | lang |

## Umsetzungsreihenfolge

| Schritt | Aufwand | Abhängigkeit | Status |
|---------|---------|--------------|--------|
| Plan speichern | klein | — | ✅ |
| 1.1 Modellwahl strikt | klein | — | ✅ |
| 1.2 Token-Budget | mittel | — | ✅ |
| 1.3 Dynamisches max_tokens | klein | 1.2 | ✅ |
| 1.4 Neue Fehlerkategorien (Rust) | klein | — | ✅ |
| 0.1-0.2 Benchmark-Ordner + EH | klein | — | ✅ |
| 1.7 Model-Map prüfen | klein | — | ✅ |
| A: Batch-Runner | mittel | — | ✅ |
| A2: 11 DOCX kopieren | klein | — | ✅ |
| B1: drop_duplicate_fehler | klein | — | ✅ |
| B2: validate_note_begrundung | klein | — | ✅ |
| B3: verify_fehler_extent | klein | — | ✅ |
| C: evaluiere.py | mittel | A | ✅ |
| D: Gate + CHANGELOG | klein | A+C | ✅ |
| Fix: Duplikat-Check db_path_override | klein | — | ✅ |
| Fix: 429-Retry mit Backoff | klein | — | ✅ |
| **Live-Benchmark laufen lassen** | **groß** | **Rate-Limit Reset** | **⏳ BLOCKIERT** |
| **Lehrkraft-Bewertung durchführen** | **groß** | **Live-Benchmark** | ⏳ |
| **Gate-Entscheidung treffen** | **klein** | **Bewertung** | ⏳ |
| 3.0 Fundament (DB + Types) | klein | — | ✅ |
| 3.1 Vertrauensstufe (post-hoc) | mittel | 3.0 | ✅ |
| 3.2 Lehrkraft-Interaktion (UI) | groß | 3.0+3.1 | ✅ |
| 3.3 DOCX-Filter + Zusammenfassung | mittel | 3.0 | ✅ |
| 3.4 Verifikation | klein | alle | ✅ |

### Blocker (Stand 2026-09-23)

- **Mistral API Rate-Limit** (code 1300): account-weit, beide Modelle, auch nach 60s Wartezeit. Reset voraussichtlich Mitternacht UTC.
- Benchmark kann erst danach live laufen; Infrastruktur (Runner + Evaluiere) steht.

## Phase 0 – Ausgangslage absichern

- Benchmark-Ordner: `apps/natascha/benchmarks/` (gitignored)
- 11 vorhandene DOCX-Fälle aus `input/6i/Schularbeit_5/`
- Erwartungshorizont für Kommentar 6i erstellen
- Keine echten Namen, Rohtexte, API-Schlüssel oder Modellantworten in Git

## Phase 1 – Mistral technisch zuverlässig machen

### 1.1 Modellwahl strikt
- `_with_model_fallback` für Mistral deaktivieren
- Bei "model not found" → klarer Fehler statt stiler Wechsel
- Datei: `apps/natascha/natascha_core.py`

### 1.2 Token-Budget
- `_estimate_tokens(text)` — grobe Schätzung (1 Token ≈ 4 Zeichen Deutsch)
- `_check_context_budget(provider, model, prompt, ausgangstext)`
- Context Window: 256k (beide Mistral-Modelle)
- Bei Überlauf → klarer Fehler
- Datei: `apps/natascha/natascha_core.py`

### 1.3 Dynamisches max_tokens
- Korrektur-Prompts: 4k-8k Output (kurz), 8k-12k (lang)
- `max_tokens = min(model_max_output, estimated_output_needed * 1.5)`
- Datei: `apps/natascha/natascha_core.py`

### 1.4 Neue Fehlerkategorien (Rust)
- Modell nicht verfügbar → "Modell nicht verfügbar — bitte anderes Modell wählen."
- Kontextlimit → "Text zu lang für dieses Modell — bitte kürzeren Text verwenden."
- Schema-Fehler → "KI-Antwort entspricht nicht dem erwarteten Format."
- Datei: `apps/lua/src-tauri/src/commands/natascha.rs`

### 1.7 Model-Map prüfen
- `mistral-medium-3-5` ✅ korrekt
- `mistral-small-2603` ✅ korrekt

## Phase 2 – Fachliche Qualitäts-Evaluation

### 2.1-2.3 Evaluation
- Evaluationsprotokoll: `benchmarks/evaluation.json` (gitignored)
- 11 Fälle mit Mistral Medium 3.5 laufen lassen
- Lehrkraft-Kriterien: Fehlererkennung, Textzitate, Bewertung/Note, Feedback
- Qualitäts-Gate: 0 kritische Halluzinationen, alle Zitate belegbar, ≥90% verwendbar

### 2.4 Neue Filter
- `drop_duplicate_fehler()` — gleiche Korrektur zweimal
- `validate_note_begrundung()` — Note und Begründung widersprechen sich nicht
- `drop_hallucinated_quotes()` — erweiterte Zitat-Verifikation

## Phase 3 – Vertrauen und Lehrkraft-Workflow

**Ziel:** Die Lehrkraft behält die Kontrolle. Die KI schlägt vor, die Lehrkraft entscheidet.
Kein Ergebnis wird ungeprüft übernommen.

### 3.1 Unsicherheits-Flag (Vertrauensstufe pro Vorschlag)

- Jeder Fehler-Eintrag erhält eine `vertrauensstufe`: `"hoch" | "mittel" | "niedrig"`
- Ableitung:
  - **hoch**: Zitat exakt im Text, Korrektur NICHT im Text, Typ plausibel
  - **mittel**: Zitat nach Normalisierung belegt, aber Kleinkorrekturen nötig
  - **niedrig**: Zitat nicht 100% belegt, oder Korrektur nur Marginalie
- Filter `verify_fehler_extent` liefert bereits Signale → um Vertrauensstufe erweitern
- Schema-Ergänzung: optionales Feld `vertrauensstufe` in `feedback_schema.json`
- UI: Ampel-Anzeige (grün/gelb/rot) am Fehler-Eintrag in der Korrektur-Ansicht
- Dateien: `natascha_core.py`, `feedback_schema.json`, `KorrekturView.tsx`

### 3.2 Lehrkraft-Interaktion (Einzelvorschläge bearbeiten)

- Pro Fehler-Eintrag: **Übernehmen** / **Ändern** / **Verwerfen** / **Prüfen** (offen)
- Änderungen werden protokolliert (`lehrkraftAktion`, `lehrkraftNotiz`)
- Endergebnis = KI-Vorschläge + Lehrkraft-Edits → DOCX-Feedback
- Optionale Markierung „unsicher" durch die Lehrkraft ergänzt Ampel
- Dateien: `KorrekturView.tsx`, `natascha_core.py` (Persistenz)

### 3.3 Zusammenfassung im Korrektur-Dialog

- Zusammenfassung vor DOCX-Erstellung: X Vorschläge, Y übernommen, Z verworfen, Ø Vertrauensstufe
- Option: nur Vorschläge mit Vertrauensstufe „hoch" automatisch vorchecken

## Offene Fragen (vor Implementierung)

1. Soll `vertrauensstufe` im LLM-Prompt angefordert werden oder rein post-hoc berechnet werden? → **ENTSCHEIDEN: post-hoc (umgesetzt, Phase 3.1)**
2. Soll die Ampel-UI in der bestehenden Korrektur-Liste erscheinen oder in einem neuen Review-Modus? → **ENTSCHEIDEN: bestehende Liste (umgesetzt, Phase 3.2)**
3. Braucht es eine neue DB-Tabelle für Lehrkraft-Edits oder reicht JSON in `feedback_data/`? → **ENTSCHEIDEN: DB-Spalten in `fehler_historie` (umgesetzt, Phase 3.0)**
4. Soll Phase 3 auf den Gate-Ergebnissen aufbauen (erst wenn Benchmark grün) oder parallel laufen? → **ENTSCHEIDEN: parallel (umgesetzt)**

## Tests und Release-Gates

- Unit-Tests für Modellwahl ohne Fallback, Token-/Kontextgrenzen, Mistral-Antwortformate, Fehlerklassifikation
- Pipeline-Tests mit gemockten Mistral-Antworten
- Vor jeder Phase: Python-Tests, Web-Typecheck, Rust-Check

## Phase 4 – Härten, Doku & Benchmark-Diversität

**Status:** 4A (Doku) ✅ abgeschlossen 2026-09-23; 4B (Tests & a11y) ✅ abgeschlossen 2026-09-23; 4C–4D offen.
**Voraussetzung:** Live-Benchmark läuft erst nach Rate-Limit-Reset (Mitternacht UTC).

### 4A — Doku-Pflicht (✅ erledigt)

| # | Aufgabe | Datei |
|---|---------|-------|
| 4A.1 | CHANGELOG repariert (Unveröffentlicht oben, Duplikatblock entfernt, 1.5.0 wiederhergestellt) | `CHANGELOG.md` |
| 4A.2 | Phase-3-Eintrag (0.7.10) | `apps/natascha/CHANGELOG.md` |
| 4A.3 | §Korrigieren Schritte 4–5 erweitert (Ampel, Aktionen, Export-Zusammenfassung) | `docs/ANLEITUNG.md` |
| 4A.4 | Szenario 11 „Korrektur-Vertrauensstufe & Lehrkraft-Aktionen" | `docs/szenarien.md` |
| 4A.5 | Invarianten „Korrektur & Feedback-DOCX" (5 Regeln) | `docs/invarianten.md` |
| 4A.6 | KNOWN_ISSUES: Vision-Filter ausgesetzt + Mistral-Vision unsupported | `apps/natascha/KNOWN_ISSUES.md` |
| 4A.7 | Versions-Drift gefixt (pyproject 0.7.10) + Plan-Phase-4-Sektion | `pyproject.toml`, dieser Plan |

### 4B — Testlücken & a11y (Phase-3-Härtung) (✅ erledigt 2026-09-23)

| # | Aufgabe | Datei | Status |
|---|---------|-------|--------|
| 4B.1 | Test `update_fehler_status` (Aktionen, Korrektur nur bei geaendert, Migration, insert mit vertrauensstufe) | `tests/test_db.py` | ✅ +5 |
| 4B.2 | Test DOCX-Filterung — JSON-Pfad (`parse_feedback_data`) + DB-Pfad (`_reconstruct_feedback_from_db`) | `tests/test_feedback.py`, `tests/test_cli_e2e.py` | ✅ +6 |
| 4B.3 | `update_fehler_status_impl` extrahiert (Repo-Konvention) + 2 In-Memory-SQLite-Tests | `natascha_read.rs` | ✅ +2 |
| 4B.4 | `_estimate_tokens`, `_check_context_budget` (80%-Limit), `_dynamic_max_tokens`, Mistral-kein-Fallback + Budget-vor-Call | `tests/test_llm_pipeline.py` | ✅ +14 |
| 4B.5 | a11y: `aria-label`/`role=img` auf Ampel-Punkte & Zähler, `aria-pressed` auf ✓/✎/✕, `aria-label` auf Edit-Input, Touch-Targets ≥24px | `KorrekturView.tsx` | ✅ |
| 4B.6 | `averageVertrauensstufe` als Pure Function (Majorität, Gleichstand→mittel) + 6 Tests | `src/lib/vertrauensstufe.ts` + `.test.ts` | ✅ |

**Verifikation 4B:** Python 216 ✅ · Web 232 ✅ · Typecheck OK · Cargo 105+2ignored ✅ · ruff (neue Files) OK.

### 4B-fix — „Bewertungsraster konnten nicht geladen werden" (✅ erledigt 2026-09-23)

| # | Aufgabe | Datei | Status |
|---|---------|-------|--------|
| R1 | stderr in `run_cli_and_capture` puffern → `categorize_cli_error` statt stdout (Tracebacks wieder sichtbar) | `natascha.rs` | ✅ |
| R2 | `listRubrics`-Catch hängt Original-Details an die generische Meldung an | `useNatascha.ts` | ✅ |
| R3 | `cmd_list_rubrics` liest Rubrikdateien mit `errors="replace"` / überspringt unlesbare — eine defekte Datei crasht nicht das gesamte Listing | `natascha_cli.py` | ✅ |
| R4 | Readiness-`probe_command` nutzt `list-rubrics` statt `analyze --help` (Testet Config/DB/Rubriken wirklich) | `natascha.rs` | ✅ |
| R5 | Regression: `_load_rubric_header_safe` mit ungültigem UTF-8 | `tests/test_cli_e2e.py` | ✅ +1 |
| R6 | JSON-Pfad `cmd_feedback_docx`: Lehrkraft-Aktionen aus DB in Analyse-JSON mergen (verworfen/geändert respektiert) + Fixture-Pflichtfelder (`punkte`/`vorschlaege`) | `natascha_cli.py`, `tests/test_cli_e2e.py` | ✅ +2 |

**Verifikation R1–R6:** Python 219 ✅ · Web 232 ✅ · Typecheck OK · Cargo 105+2ignored ✅ · ruff (neue Files) OK.

### 4C — Benchmark-Diversifizierung — offen

| # | Aufgabe | Datei |
|---|---------|-------|
| 4C.1 | Runner: Per-Case-Config (JSON-Override pro Datei statt Single-DEFAULT_CONFIG) | `benchmarks/run_benchmark.py` |
| 4C.2 | Zweiten Benchmark-Satz (TEST-7a Englisch, 4 DOCX) anlegen | `benchmarks/cases_en/` |
| 4C.3 | Mischtabelle: Klasse/Textsorte/Rubrik je Fall | `run_benchmark.py` |

### 4D — Vision/PDF (bewusst verschoben, nach Gate) — offen

Erst nach bestandenem Qualitäts-Gate. Enthält: Mistral-Vision-Modell (Pixtral),
Zitatprüfung gegen `transkription` (OCR), Vision-Filter aktivieren, Pseudonymisierung für Bilder.

## Live-Benchmark (nächster Schritt)

Sobald das Mistral-Rate-Limit zurückgesetzt ist (Mitternacht UTC):
```bash
cd apps/natascha/benchmarks
python3 run_benchmark.py --provider mistral --model mistral-medium-3-5
python3 evaluiere.py          # interaktive Lehrkraft-Bewertung
python3 evaluiere.py --gate-only  # Gate-Entscheidung
```
Gate: 0 kritische Halluzinationen, ≥90% Zitate belegbar, ≥90% verwendbar.
