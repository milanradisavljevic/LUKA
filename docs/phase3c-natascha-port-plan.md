# Phase 3c — NATASCHA vollständig in die LUA-UX portieren (Bauplan)

> **Status: freigegeben (voller Port aller Screens).** Erster Bau-Schritt =
> Welle 0: Phase 2 (gemeinsame DB, `phase2-shared-db.md`). Dieser Plan ergänzt
> `phase3-correction-ui.md` (Wege A/B/C); hier ist Weg C = voller Port.

## Context

Ziel: NATASCHAs Funktionsweise nativ in die LUA-Oberfläche bringen, statt sie als
separate Terminal-App zu betreiben — „eine App, ein Erlebnis", für Endnutzer
nachvollziehbarer. Entscheidung: **voller Port aller ~15 Screens**, die TUI wird
langfristig abgelöst (bleibt bis dahin via Weg A / „Korrektur (NATASCHA)" als
Fallback erreichbar). Auslieferung inkrementell in mergebaren Wellen.

## Kernarchitektur — Python-Core behalten, nur UI neu bauen

NATASCHA ≈ 12.821 LOC, davon (laut Screen-/Code-Inventar):
- **~30–35 % reine TUI** (`natascha.py`, 15 ModalScreens + 3-Spalten-Dashboard) → **ersetzt**.
- **~65–70 % wiederverwendbare Logik** → **bleibt Python**, headless aufgerufen:
  - `natascha_core.py` (~2.840) — LLM-Pipeline (`run_llm_analysis`), Benotung
    (`berechne_note_srdp`/`_unterstufe`), Prompt-/Rubrik-/Config-Loader.
  - `natascha_db.py` (~1.932) — Aggregat-Queries (`get_klassen_feedback`,
    `get_schueler_laengsschnitt`, `get_fehler_heatmap`, Kalibrierung, Trend).
  - `generate_feedback.py` (~1.992) — Feedback-DOCX (python-docx, plattformneutral).

**Tauri kann kein Python im selben Prozess.** Daher Python als **headless Sidecar**
(CLI: Datei + Config rein → Analyse-JSON raus), aus Rust via `Command::new(python)`.
Getestete Logik bleibt erhalten; neu gebaut wird **nur die Oberfläche** in React.

**Kritische Voraussetzung:** Die React-Korrektur-UI liest Klassen/Schüler/Heatmaps
und schreibt Bewertungen → nur über die **gemeinsame DB (Phase 2)** möglich. Weg C
ist daher auf Phase 2 angewiesen.

## Was konkret zu bauen ist

**1. Headless-Python-Layer (`apps/natascha/natascha_cli.py`, neu):**
Dünner Wrapper um `nc.run_llm_analysis(...)`: nimmt Dateipfad + Klasse/Aufgabe +
Config, gibt Analyse-Dict als JSON auf stdout, schreibt via `save_analysis_to_db`
in die gemeinsame DB. Entkoppelt die Pipeline vom `FileInfo`/TUI-State (heute
verzahnt — der einzige echte „Logik"-Aufwand). Sub-Commands: `analyze`,
`srdp-detail`, `klassen-briefing`, `schueler-profil`, `feedback-docx`,
`heatmap-docx` (rufen vorhandene `nc.*`/`gf.*`-Funktionen).

**2. Tauri-Rust-Commands (Muster `commands/bridge.rs` / `natascha.rs`):**
`natascha_analyze(file, klasse, aufgabe)`, `natascha_feedback_docx(abgabeId)`,
`natascha_db_query(...)` — rufen die CLI als Sidecar, reichen JSON durch.
Langläufer (LLM) als Tauri-Event-Stream für Fortschritt (analog ProgressScreen).

**3. React-Views (Hauptaufwand) — gemappt auf NATASCHAs Screens:**

| Prio | LUA-View (neu) | ersetzt NATASCHA-Screen(s) | nutzt |
|---|---|---|---|
| P1 | „Korrektur"-Dashboard (Datei-Liste + Vorschau) | NataschaApp (3-Spalten) | DB + `natascha_analyze` |
| P1 | Analyse-/Review-Ansicht (Note, Kriterien, Fehler) | ReviewScreen | Analyse-JSON, `feedback-docx` |
| P1 | Lehrer-Note/Kommentar-Eingabe | Collapsible „Echte Note" | `lehrer_feedback`-Tabelle |
| P2 | „Meine Klassen": Feedback/Heatmap/Statistik (Tabs + Charts) | KlassenFeedbackScreen | `get_klassen_feedback` etc. |
| P2 | Schülerverwaltung + Längsschnitt/Profil | SchuelerVerwaltung/-Detail | `get_schueler_laengsschnitt` |
| P3 | Aufgabe/Klasse anlegen, Rubrik-Editor, Einstellungen, EH-Generator | Add*/Rubrik/Settings/EH | Config-TOML, `nc.generate_*` |

Heatmaps/Statistik brauchen ein **Chart-Lib** (z. B. Recharts) — neu in LUA.
DOCX-Vorschau/Inline-Kommentare bleiben in der Python-DOCX-Erzeugung.

**4. Packaging:** Echter Installer braucht Python + Deps als **PyInstaller-Sidecar**
(Tauri `externalBin`). Im Dev/kopierten Repo reicht `apps/natascha` (relativ
gefunden, wie schon bei `launch_natascha`).

## Bau-Reihenfolge (Wellen — jede mergebar)

0. **Welle 0 — Phase 2 (gemeinsame DB).** Pflicht-Unterbau, `phase2-shared-db.md`.
1. **Welle 1 — Headless-Core + Sidecar.** `natascha_cli.py` + Tauri-Commands +
   Python-Sidecar-Packaging.
2. **Welle 2 — P1 Korrektur-Kernfluss** (Dashboard, Analyse/Review, Note/Kommentar).
3. **Welle 3 — P2 Klassen-/Schüler-Ansichten** (Feedback/Heatmap/Statistik + Charts,
   Schülerverwaltung/Längsschnitt/Profil).
4. **Welle 4 — P3 Setup** (Aufgabe/Klasse anlegen, Rubrik-Editor, Einstellungen,
   Erwartungshorizont-Generator) → TUI abgelöst, Weg A entfällt.

## Aufwand & Risiken (grob)

- Headless-Core + Sidecar: ~1–2 Wochen. React-UI P1: ~3–4 Wochen. P2: ~3–4 Wochen.
  P3: ~2–3 Wochen. Charts/Polish/Tests: ~2 Wochen. **Gesamt ≈ ~3 Monate** (+ Phase 2).
- Risiken: (a) Pipeline-Entkopplung vom TUI-State; (b) Python-Sidecar-Packaging
  plattformübergreifend; (c) Langläufer-LLM-Fortschritt im UI; (d) DOCX-Inline-
  Kommentare bleiben Python-seitig (kein TS-Äquivalent nötig).

## Verifikation

- Headless-CLI: `python natascha_cli.py analyze <docx> --klasse TEST-7a --aufgabe SA2`
  → valides Analyse-JSON + DB-Eintrag (gegen `seed_testdaten.py`).
- Tauri: `cargo check`; in der App „Korrektur" → Datei → analysieren → Note/Fehler →
  Feedback-DOCX.
- Closed-Loop mit Phase 2: Analyse in der App → „Meine Klassen"/Heatmap → speist die
  Phase-1-Übungsgenerierung — alles in einer App.
- `pnpm -r test` grün; Headless-CLI mit Smoke-Test abgedeckt.
