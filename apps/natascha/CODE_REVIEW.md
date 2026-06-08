# CODE REVIEW — NATASCHA

**Datum:** 2026-05-29 | **Version:** 0.7.3
**Umfang:** `natascha.py`, `natascha_core.py`, `generate_feedback.py`, `natascha_db.py`,
`natascha_wizard.py` (Legacy). Werkzeuge: `ruff 0.x` (live ausgeführt), manuelle Analyse.
**Charakter:** Befund + Empfehlungen. **Update 2026-05-29:** Die Empfehlungen wurden in
dieser Session umgesetzt (Ausnahme: DSGVO-Anonymisierung vor den API-Calls — siehe
`SECURITY_AUDIT.md` DSGVO-2 — wird zuletzt gemacht, da sie die API-Calls direkt verändert).

## Umsetzungsstatus (2026-05-29)

- ✅ **NameError-Bugs behoben:** `import logging` in `natascha.py` + `generate_feedback.py`.
- ✅ **Dead Code entfernt:** ungenutzte Imports/Variablen (ruff F401/F841), f-strings (F541),
  lambda→def (E731), Importordnung (I001) — `ruff check . --ignore E501` ist bis auf **1**
  bewusst belassenes W291 (Logo-ASCII-Art, `natascha.py:153`) sauber.
- ✅ **Stille `except` geloggt:** alle breiten `except Exception: pass` (13 in `natascha.py`,
  je 1 in core/generate_feedback) mit `logging.debug/warning(..., exc_info=True)` versehen.
  Narrow/intentionale Fälle (ImportError-Fallback, `list.remove` ValueError) bewusst belassen.
- ✅ **Orphan-CSS `ApiSetupScreen` entfernt.**
- ✅ **Tests ergänzt:** `tests/test_db.py` (12 Tests) + `tests/test_grading.py` (6 Tests) →
  **65 Tests grün** (vorher 47).
- ✅ **Zwei weitere Bugs beim Testen gefunden & behoben:**
  (1) `natascha_db.get_fehler_heatmap_detail()` referenzierte im `aufgabe`-Zweig das nicht
  existierende `abgabe.vorname` → `OperationalError`; jetzt korrekt `LEFT JOIN schueler`.
  (2) **Packaging-Lücke:** `natascha_db` fehlte in `pyproject.toml` `py-modules` → bei
  `pip install` nicht mitinstalliert; ergänzt.
- ✅ **Dependencies:** `pillow>=12.2.0`, `lxml>=6.1.0` gepinnt (requirements + pyproject),
  Umgebung aktualisiert; pip-audit für beide nun sauber.
- ✅ **Doku-Drift behoben:** `AGENTS.md`/`ARCHITECTURE.md` auf 9 Footer-Buttons + neues
  DB-Modul + 3 neue Screens aktualisiert.
- 🟡 **E501 (kosmetisch):** echte Code-Zeilen umgebrochen (20 Stück); bewusst belassen wurden
  LLM-Prompt-String-Literale, offizielle SRDP-Beschreibungstexte, Legacy-Wizard-ASCII-Art und
  inline Test-JSON (63 Rest-Treffer, alle in diesen Kategorien). Empfehlung bleibt: `ruff` als
  Pre-Commit-Hook.


## Gesamtbild

Solide, gut strukturierte Codebasis mit klarer Modultrennung (UI / Logik / DOCX / DB) und
sinnvollen Konventionen (`from __future__ import annotations` in **allen** Modulen, snake_case,
deutsche Docstrings). Zwei **echte latente Bugs** und Lücken bei Tests/Doku sind die
wichtigsten Punkte. `ruff check .` meldet **108 Findings** (überwiegend Stil).

| Kategorie | Schwere | Anzahl |
|-----------|---------|--------|
| Latente NameError-Bugs (`logging` nicht importiert) | 🔴 hoch | 2 |
| Stille `except Exception: pass` (kein Logging) | 🟠 mittel | ≥10 |
| Dead Code (ungenutzte Imports/Variablen) | 🟡 gering | 8 |
| Orphan-CSS (`ApiSetupScreen`) | 🟡 gering | 1 |
| Testlücken (`natascha_db.py`, neue Screens) | 🟠 mittel | — |
| Tests gesamt (alle grün) | ✅ | 47 |
| Doku-Drift | 🟡 gering | — |
| Stil (E501/I001/…) | ⚪ kosmetisch | ~96 |

---

## 1. Latente Bugs — 🔴 HOCH (ruff F821)

In zwei Fehler-Handlern wird `logging` verwendet, das Modul ist aber **nicht importiert**.
Tritt der jeweilige Fehler auf, wirft der Handler `NameError: name 'logging' is not defined`
und **verschluckt/verfälscht den eigentlichen Fehler** — der Schutz, den `try/except` bieten
soll, kehrt sich ins Gegenteil.

- `natascha.py:2519` — `logging.exception("Panel update failed: ...")` (kein `import logging`
  in `natascha.py`).
- `generate_feedback.py:1113` — `logging.warning("Fehler-Markierung übersprungen: ...")`
  (kein `import logging` in `generate_feedback.py`).

**Fix (je 1 Zeile):** `import logging` am Dateikopf ergänzen. **Empfehlung:** zusätzlich
einen Test, der den jeweiligen Except-Pfad triggert, damit solche Regressionen auffallen.

---

## 2. Error-Handling — 🟠 mittel

- **Positiv:** **kein** bare `except:` im gesamten Code.
- **Problem:** Zahlreiche `except Exception: pass` schlucken Fehler **ohne jegliches
  Logging** (≥10 Stellen in `natascha.py`, u. a. `:137`, `:1064`, `:1075`, `:1085`, `:1934`,
  `:2420`, `:2548`, `:2577`, `:2834`, `:2857`). Das erschwert Diagnose im Schulbetrieb
  erheblich (Fehler „verschwinden" lautlos).
- **Empfehlung:** Mindestens `logging.debug/warning` mit Kontext in jeden Swallow-Block; wo
  möglich die Exception-Typen einengen (z. B. `except (OSError, KeyError)`), statt pauschal
  `Exception`. Einheitlicher `logging`-Setup (siehe Bug 1) als Querschnittsmaßnahme.

---

## 3. Dead Code — 🟡 gering (ruff F401/F841)

Ungenutzte Imports (F401):
- `natascha_db.py:14` — `from datetime import datetime`
- `docx.text.run.Run` (in `generate_feedback.py`)
- `dataclasses.field`

Ungenutzte lokale Variablen (F841): `api_available`, `chart_width`, `at_style`, `auf_cfg`,
`pending` (u. a. `natascha.py:2565`).

**Orphan-CSS:** `natascha.tcss:382-394` stylt `ApiSetupScreen`, aber **keine** solche
Python-Klasse existiert (`grep` über alle `*.py` → leer). Toter CSS-Block — entfernen oder
Screen reaktivieren.

**Legacy:** `natascha_wizard.py` (~1244 Z.) ist nur noch Fallback-CLI und dupliziert Logik.
Empfehlung: explizit als „deprecated/legacy" kennzeichnen oder mittelfristig entfernen, um
doppelte Pflege zu vermeiden.

**Fix:** `ruff check . --fix` entfernt 19 Findings automatisch (inkl. der meisten F401).

---

## 4. Konsistenz & Konventionen — 🟡 gering

- **Gut:** `from __future__ import annotations` in allen 5 Modulen; durchgängig snake_case;
  Type-Hints (`dict[str, Any]`, `Path`) und deutsche Docstrings in `natascha_core.py`/
  `natascha_db.py` vorhanden.
- **Doku-Drift (Finding):** `AGENTS.md` und `ARCHITECTURE.md` beschreiben den Footer mit
  „**7 Buttons**" und listen weder das neue Modul `natascha_db.py` (SQLite-Persistenz) noch
  die drei neuen Screens `SchuelerVerwaltungScreen`, `FehlerHeatmapScreen`,
  `RetroImportScreen`. Die Doku hinkt dem Code hinterher → bei Gelegenheit aktualisieren
  (Footer hat nach Aufgabe 3 nun 9 Buttons).
- **Stil-Debt (kosmetisch):** 80× `E501` (Zeile > 100, das selbstgesetzte Limit), 13× `I001`
  (Importordnung), 3× `F541` (f-String ohne Platzhalter), 1× `W291`, 1× `E731`. Empfehlung:
  `ruff check . --fix` + manuelles Umbrechen der langen Zeilen; danach `ruff` als Pre-Commit-
  Hook etablieren, damit das Limit eingehalten wird.

---

## 5. Testabdeckung — 🟠 mittel

- **Bestand:** 47 Tests (von pytest gesammelt) — `test_llm_pipeline.py` (23),
  `test_tui.py` (14), `test_feedback.py` (10/11). Alle laufen grün (`python3 -m pytest`). Importiert werden nur `natascha_core` und
  `natascha` (Top-Level-Funktionen).
- **Lücke 1 — `natascha_db.py` (20 Funktionen) hat 0 Tests.** Ungetestet bleiben damit:
  SQLite-CRUD (`insert_schueler`, `delete_schueler`), CSV-Import (`import_schueler_csv`),
  Abgabe-/Kriterium-/Fehler-Persistenz und die Heatmap-Query (`get_fehler_heatmap`). Da hier
  **personenbezogene Daten** persistiert werden, ist Testabdeckung doppelt wichtig
  (Datenintegrität). **Empfehlung:** `tests/test_db.py` mit In-Memory-SQLite
  (`:memory:`)-Fixtures — schnell und ohne Seiteneffekte.
- **Lücke 2 — neue Screens (Schueler/Heatmap/RetroImport) ungetestet.** Mindestens
  Smoke-Tests (Mount/Compose) via Textual `run_test()`.
- **Lücke 3 — Benotungs-Randfälle:** Der dokumentierte Randfall „Stufe 3.5 → Note ?" sollte
  einen expliziten Test in `berechne_note_srdp()`/`berechne_note_unterstufe()` bekommen, um
  das Rundungsverhalten festzuschreiben.

---

## 6. Performance — ✅ unkritisch

- `nc.load_config()` wird in `NataschaApp.__init__` (`:2201`) **einmal** geladen und nur nach
  Einstellungs-/Zuordnungs-Änderungen neu geladen (`:2770`, `:2790`, `:2818`) — kein
  Per-Call-Reload, akzeptabel. `tomlkit`-Reparsing (`_load_toml_doc()`) nur bei Schreib-
  vorgängen.
- File-Watcher pollt `input/` alle 10 s (Background-Worker) — vernachlässigbar.
- Große DOCX/Bilder: werden für Vision base64-kodiert im Speicher gehalten, aber durch den
  Größencheck (20/32 MB, `natascha_core.py:251-254`) begrenzt. Kein offensichtlicher
  Bottleneck. **Optional:** sehr große Batch-Läufe sequenziell statt alle JSONs gleichzeitig
  im Speicher halten (aktuell unkritisch bei Klassengrößen ~30).

---

## Empfohlene Reihenfolge der Nacharbeiten

1. **🔴 `import logging`** in `natascha.py` und `generate_feedback.py` (2 Zeilen, behebt
   latente NameError).
2. **🟠** `ruff check . --fix` (Dead Code + Importordnung) und stille `except`-Blöcke loggen.
3. **🟠** `tests/test_db.py` für `natascha_db.py` (personenbezogene Daten → Integrität).
4. **🟡** Orphan-`ApiSetupScreen`-CSS entfernen; `AGENTS.md`/`ARCHITECTURE.md` aktualisieren.
5. **⚪** Lange Zeilen (E501) umbrechen, `ruff` als Pre-Commit-Hook.
