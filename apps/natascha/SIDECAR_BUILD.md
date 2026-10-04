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

Beim fertigen Tauri-Installer wird dieses Sidecar unter Windows als
`natascha-cli.exe` neben der Anwendung abgelegt (macOS: `natascha-cli`). Die
Laufzeitprüfung verwendet deshalb den konfigurierten Basisnamen und akzeptiert
den Target-Suffix nur noch als Entwicklungs-Fallback.

Für den macOS-Universal-Build:

```bash
cd apps/natascha
bash ./build_sidecar.sh
```

Dabei werden ARM- und Intel-Binaries gebaut, mit `lipo` zu einem universellen
Sidecar verbunden und unter
`dist/natascha-cli/natascha-cli-universal-apple-darwin` abgelegt.

## Tauri-Pilotbuild mit Korrektur-Modul

Der allgemeine Generator-Build referenziert das Sidecar nicht und bleibt ohne Binary baubar. Ein installierter Pilot mit Korrekturen braucht dagegen beide Schritte: zuerst das Sidecar bauen, dann LUA mit der Sidecar-Konfiguration paketieren.

```powershell
cd apps\natascha
.\build_sidecar.ps1
cd ..\lua
pnpm tauri:build:sidecar
```

Der Befehl `tauri:build:sidecar` setzt `bundle.externalBin` auf
`../../natascha/dist/natascha-cli/natascha-cli`. Tauri ergänzt beim Einbinden
den Target-Suffix und legt das Sidecar für die Laufzeit neben der Anwendung ab.
Fehlt das vorgebaute Sidecar, schlägt der Paketbau fehl, statt eine Installation
ohne Korrektur-Modul zu erzeugen. Der Release-Workflow baut das Sidecar vor
`tauri-action` und verwendet dieselbe Konfiguration automatisch.

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
