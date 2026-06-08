# lehr-suite

Zwei Lehrer-Desktop-Tools, zusammengeführt zu einem **Closed-Loop-System**:
**Erstellen → Korrigieren → gezielt Üben**.

```
lehr-suite/
  apps/
    lua/        Lehrunterlagen-Tool — TypeScript + React + Vite + Tauri (pnpm-Monorepo)
                Generiert Unterrichtsmaterialien & Übungen.
    natascha/   NATASCHA — Python 3.11+ / Textual-TUI
                Korrigiert Schülerabgaben, erzeugt Fehler-Heatmaps (SQLite).
  bridge/       Datei-Brücke zwischen beiden Apps (siehe bridge/README.md)
```

Beide Apps wurden als **Snapshot** aus ihren ursprünglichen, eigenständigen Repos
hierher kopiert (sauberer Schnitt, keine Alt-Historie). Die Original-Repos bleiben
unverändert als Backup erhalten.

## Apps starten

**LUA** (in `apps/lua/`):
```bash
pnpm install
pnpm tauri:dev      # Desktop-App
pnpm smoke          # End-to-End LLM→DOCX Smoke-Test (billiges Haiku-Modell)
```

**NATASCHA** (in `apps/natascha/`):
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements_tui.txt
python seed_testdaten.py     # Test-DB mit synthetischen Daten anlegen
python natascha.py           # Textual-TUI
```

## Integration

Phase 1 (Datei-Brücke) ist der erste Integrationsschritt. NATASCHA exportiert nach
einer Korrektur ein JSON nach `bridge/inbox/`, LUA bietet in Step0
„Aus NATASCHA-Korrektur generieren". Details: `bridge/README.md`.

## Datenschutz

Schüler-Echtdaten (DBs, Abgaben, Output, Bridge-Inbox) sind per `.gitignore`
ausgeschlossen und gehören **nicht** ins Repo.
