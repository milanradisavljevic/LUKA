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
| 3.1 Unsicherheits-Flag | mittel | Gate | ⏳ |
| 3.2 Lehrkraft-Interaktion | groß | 3.1 | ⏳ |

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

1. Soll `vertrauensstufe` im LLM-Prompt angefordert werden oder rein post-hoc berechnet werden?
2. Soll die Ampel-UI in der bestehenden Korrektur-Liste erscheinen oder in einem neuen Review-Modus?
3. Braucht es eine neue DB-Tabelle für Lehrkraft-Edits oder reicht JSON in `feedback_data/`?
4. Soll Phase 3 auf den Gate-Ergebnissen aufbauen (erst wenn Benchmark grün) oder parallel laufen?

## Tests und Release-Gates

- Unit-Tests für Modellwahl ohne Fallback, Token-/Kontextgrenzen, Mistral-Antwortformate, Fehlerklassifikation
- Pipeline-Tests mit gemockten Mistral-Antworten
- Vor jeder Phase: Python-Tests, Web-Typecheck, Rust-Check
