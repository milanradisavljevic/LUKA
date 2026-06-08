# KNOWN ISSUES

> Stand: 2026-05-29 (nach Audit v0.7.3). Neue Befunde aus dem Audit siehe auch
> `SECURITY_AUDIT.md` und `CODE_REVIEW.md`.

---

## [NIEDRIG] docs/ANLEITUNG.md inhaltlich veraltet

**Status:** Offen — Inhalt muss manuell überarbeitet werden
**Problem:** Die Benutzeranleitung (`docs/ANLEITUNG.md`) nennt noch drei separate Footer-
Buttons (🔥 Heatmap, 📊 Feedback, 📈 Statistik), die Taste `t` für Statistik, und enthält
möglicherweise weitere veraltete Infos (Provider-Empfehlungen, Workflows). Seit v0.7.8 gibt
es nur noch einen "👥 Klasse"-Button mit drei Reitern.
**Auswirkung:** Lehrkräfte, die die Anleitung via "📖 Anleitung öffnen" im Hilfe-Dialog
öffnen, sehen veraltete Tastenkürzel und Button-Beschreibungen.
**Geplanter Fix:** Anleitung manuell durchsehen und an die aktuelle Struktur anpassen
(separater Schritt, kein Code-Auftrag).

---

## ~~[HOCH] Latente NameError-Bugs — `logging` nicht importiert~~ — BEHOBEN (2026-05-29)

`import logging` in `natascha.py` und `generate_feedback.py` ergänzt. Zudem wurden alle
breiten `except Exception: pass` mit `logging.debug/warning(..., exc_info=True)` versehen.

---

## [HOCH/DSGVO] Schülerdaten werden unanonymisiert an externe LLM-APIs gesendet

**Status:** Offen — rechtlich/organisatorisch zu klären
**Problem:** Aufsätze (inkl. möglicher Klarnamen) gehen unverändert an den Provider; teils
außerhalb der EU (DeepSeek/Qwen/Kimi). Keine Pseudonymisierung vor Versand.
**Workaround/Maßnahme:** Provider mit AVV/EU-Residenz festlegen, China-Provider für echte
Daten sperren, Pseudonymisierung planen. Details: `SECURITY_AUDIT.md` (DSGVO-2).

---

## [MITTEL] Schüler-DB / Abgaben waren nicht von Git ausgeschlossen — BEHOBEN (Restmaßnahme offen)

**Status:** Quick-Fix angewendet (2026-05-29); Restmaßnahme offen
**Problem:** `natascha_schuljahr.db` (Schülernamen + Noten) und lose `*.docx` im Root waren
nicht gitignored → Risiko eines versehentlichen Commits personenbezogener Daten.
**Fix:** `.gitignore` um `*.db`, `*.sqlite*`, `*.docx`, `*.odt`, `*.pdf` erweitert; verifiziert.
Git-History war sauber (keine Schülerdaten committet).
**Restmaßnahme:** Aufbewahrungs-/Löschkonzept + ggf. DB-Verschlüsselung (`SECURITY_AUDIT.md`).

---

## ~~[MITTEL] Veraltete Dependencies mit bekannten CVEs~~ — BEHOBEN (2026-05-29)

`pillow>=12.2.0` und `lxml>=6.1.0` in `requirements_tui.txt` + `pyproject.toml` gepinnt und
Umgebung aktualisiert (pillow 12.2.0, lxml 6.1.1). `pip-audit` für beide nun sauber.
**Restempfehlung:** `pip-audit` regelmäßig (vor Releases) laufen lassen; verbleibende CVEs
betreffen nur Dev-Tooling (pip/wheel/pytest/pygments/idna).

---

## [MITTEL] Testlücken — `natascha_db.py` und neue Screens — TEILWEISE BEHOBEN (2026-05-29)

**Status:** DB getestet; Screen-Smoke-Tests offen
**Erledigt:** `tests/test_db.py` (12 Tests: CRUD, CSV-Import, Heatmap, Export, save_analysis)
und `tests/test_grading.py` (6 Tests, inkl. Randfall Stufe 3.5) ergänzt → 65 Tests grün.
Dabei wurde ein Bug in `get_fehler_heatmap_detail()` gefunden und behoben (siehe unten).
**Offen:** Smoke-Tests (Mount/Compose via Textual `run_test()`) für die neuen Screens
(Schueler/Heatmap/Retro).

---

## [MITTEL] SRDP-Raster fehlt im DOCX

**Status:** Design dokumentiert; Implementierung ausstehend (v0.8)
**Problem:** DOCX enthält keine offiziellen SRDP-Raster-Tabellen (K1: 8 Sub-Kriterien,
K3/1: 7 Sub-Kriterien).
**Workaround:** Lehrkraft überträgt App-Noten manuell auf das offizielle SRDP-Formular.

---

## [MITTEL] Notenberechnung – Randfall Stufe 3.5

**Status:** Heuristik in Betrieb; empirische Validierung läuft
**Problem:** `Note = 6 − Stufe` (gerundet): Stufe 3.5 → Note 2.5 → gerundet Note 2 (oder 3?).
Erwartungen der Lehrkräfte unterscheiden sich.
**Workaround:** Notenempfehlung ist beratend; Lehrkraft entscheidet final. Ein expliziter
Test sollte das Rundungsverhalten festschreiben (siehe `CODE_REVIEW.md`).

---

## ~~[GERING] Doku-Drift — AGENTS.md / ARCHITECTURE.md veraltet~~ — BEHOBEN (2026-05-29)

Beide Dokumente auf 9 Footer-Buttons aktualisiert; `natascha_db.py` und die Screens
`SchuelerVerwaltungScreen`, `FehlerHeatmapScreen`, `RetroImportScreen` ergänzt.

---

## ~~[GERING] Stille `except Exception: pass` ohne Logging~~ — BEHOBEN (2026-05-29)

Alle breiten `except Exception: pass` (13 in `natascha.py`, je 1 in core/generate_feedback)
loggen jetzt via `logging.debug/warning(..., exc_info=True)`. Schreibende Persistenz-Fehler
(active_klasse/aufgabe) auf `warning`-Level.

---

## ~~[GERING] Orphan-CSS: `ApiSetupScreen`~~ — BEHOBEN (2026-05-29)

Toter CSS-Block aus `natascha.tcss` entfernt (keine solche Python-Klasse vorhanden).

---

## ~~[BUG] `get_fehler_heatmap_detail()` aufgabe-Zweig — OperationalError~~ — BEHOBEN (2026-05-29)

Der `aufgabe`-Zweig referenzierte `abgabe.vorname` (Spalte existiert nicht) → SQL-Fehler.
Jetzt korrekt `LEFT JOIN schueler s … s.vorname`. Regressionstest in `tests/test_db.py`.

---

## ~~[BUG] Packaging — `natascha_db` fehlte in py-modules~~ — BEHOBEN (2026-05-29)

`natascha_db` zu `pyproject.toml` `[tool.setuptools] py-modules` ergänzt; sonst bei
`pip install -e .` nicht mitinstalliert.

---

## [GERING] Robustheit gegen manipulierte DOCX/ODT (XML-/Zip-Bomb)

**Status:** Offen (geringes Risiko, Einzelplatz-Tool)
**Problem:** ODT-Parsing nutzt `zipfile` + `xml.etree` ohne Härtung → theoretisch DoS durch
Entity-Expansion/Decompression-Bomb.
**Fix (optional):** `defusedxml` für ODT; Größe der entpackten `content.xml` prüfen.

---

## [GERING] Ollama kein JSON-Modus

**Status:** Bekannte Einschränkung
**Problem:** Ollama unterstützt keinen `response_format: json_object`-Modus; Bracket-Counting-
Fallback funktioniert nur bei sauberem LLM-Output.
**Workaround:** Anthropic/OpenAI/Qwen für Produktionsbetrieb; Ollama nur für lokale Tests.

---

## [INFO] .venv-Pfad falsch (WSL)

**Status:** Dokumentiert
**Problem:** `.venv` wurde auf anderem Rechner angelegt. `python3` (System) statt
`.venv/bin/python` verwenden.
**Workaround:** `python3 -m pytest tests/`.

---

## ~~[GERING] Bild-/PDF-Größe nicht geprüft~~ — BEHOBEN

Größencheck existiert (`natascha_core.py:251-255`): 32 MB (PDF) / 20 MB (Bild) vor dem
API-Call mit klarer Fehlermeldung (`ValueError: Datei zu groß: … KB (Limit: …)`).

---

## ~~[NIEDRIG] Statistik las aus JSON-Dateien statt DB~~ — BEHOBEN (2026-05-30)

`StatisticsScreen` als eigenständiger Screen entfernt. Der **Statistik-Tab** in
`KlassenFeedbackScreen` liest ausschließlich aus der SQLite-DB via
`ndb.get_klassen_statistik()` (reuse: `get_notenverteilung`, `get_kriterien_durchschnitt`,
`get_klassen_trend`). Lehrer-Feedback und Seed-Daten werden korrekt berücksichtigt.

---

## ~~[KRITISCH] fehler-Array nicht befüllt~~ — BEHOBEN

`additionalProperties: false` auf dem `kriterium`-Schema verhindert `fehler_detail` in
Kriterien; ACHTUNG-Hinweis in `build_analysis_prompt()` + `build_vision_prompt()`. Deutsches
Fixture `tests/fixtures/beispiel_deutsch_kommentar.json` (13 Fehler) vorhanden.
