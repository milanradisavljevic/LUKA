# NATASCHA Sidecar-Build

Ziel dieser Etappe ist ein Windows-Binary fuer `natascha_cli.py`, damit LUA NATASCHA spaeter ohne lokale Python-Installation der Lehrkraft starten kann.

## Wahl: one-file

Der Standard-Build nutzt PyInstaller `--onefile`. Das startet etwas langsamer, ist fuer Tauri aber robuster: `externalBin` erwartet ein ausfuehrbares Sidecar-Artefakt, und ein einzelnes `natascha-cli-x86_64-pc-windows-msvc.exe` laesst sich sauber neben der App buendeln. `--onedir` bleibt als Diagnoseoption im Skript erhalten, falls native Abhaengigkeiten spaeter einfacher inspiziert werden muessen.

## Build

```powershell
cd apps/natascha
.\build_sidecar.ps1
```

Das Skript installiert PyInstaller sowie `requirements_cli.txt` und
`requirements_tui.txt` in die gewaehlte Python-Umgebung und erzeugt:

```text
apps/natascha/dist/natascha-cli/natascha-cli-x86_64-pc-windows-msvc.exe
```

Für den macOS-Universal-Build:

```bash
cd apps/natascha
bash ./build_sidecar.sh
```

Dabei werden ARM- und Intel-Binaries gebaut, mit `lipo` zu einem universellen
Sidecar verbunden und unter
`dist/natascha-cli/natascha-cli-universal-apple-darwin` abgelegt.

## Optionale Tauri-Integration

Der normale Generator-only-Build referenziert das Sidecar nicht und bleibt ohne Binary baubar. Fuer einen spaeteren NATASCHA-Build kann die Zusatzkonfiguration verwendet werden:

```powershell
cd apps/lua
pnpm tauri build --config src-tauri/tauri.natascha-sidecar.conf.json
```

Diese Datei setzt `bundle.externalBin` auf
`../../natascha/dist/natascha-cli/natascha-cli`. Tauri ergänzt je Plattform den
Target-Suffix. Der Release-Workflow baut das Sidecar vor `tauri-action` und
verwendet diese Konfiguration automatisch.

## Smoke-Test

```powershell
apps\natascha\dist\natascha-cli\natascha-cli-x86_64-pc-windows-msvc.exe --help
```

## Lokaler E2E-Test ohne vendored Dependencies

Die Tests verwenden keine im Repository abgelegten Abhängigkeiten. Auf
Windows wird ein lokales virtuelles Environment empfohlen:

```powershell
cd apps/natascha
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements_cli.txt -r requirements_tui.txt pytest
.\.venv\Scripts\python.exe -m pytest -q
```

Auf Linux/macOS entsprechend `python3.11 -m venv .venv` und
`.venv/bin/python -m pytest -q` verwenden. `.pytest_deps` und andere
vendored Dependency-Verzeichnisse gehören nicht ins Repository.

## Abnahmekriterien für die spätere Aktivierung

Die separate `tauri.natascha-sidecar.conf.json` bleibt bis zur Freigabe des
vollständigen NATASCHA-Rollouts der einzige Sidecar-Build. Vor einer
Reaktivierung von `FEATURES.natascha` müssen auf einem sauberen Windows-System
ohne Python-Installation nachgewiesen sein:

- Installation und Start der gebündelten CLI ohne Python.
- Analyse einer einzelnen und mehrerer Abgaben.
- Abbruch stoppt nach der aktuell laufenden Datei und setzt kein weiteres
  Batch-Element an.
- Progress-, Timeout-, Abbruch- und Fehlermeldungen sind im UI sichtbar.
- Feedback-DOCX wird erzeugt und kann geöffnet werden.
- Der gemeinsame Rust-definierte DB-Pfad wird auch bei Seed und Sidecar
  verwendet.
