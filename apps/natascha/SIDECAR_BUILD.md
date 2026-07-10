# NATASCHA Sidecar-Build

Ziel dieser Etappe ist ein Windows-Binary fuer `natascha_cli.py`, damit LUA NATASCHA spaeter ohne lokale Python-Installation der Lehrkraft starten kann.

## Wahl: one-file

Der Standard-Build nutzt PyInstaller `--onefile`. Das startet etwas langsamer, ist fuer Tauri aber robuster: `externalBin` erwartet ein ausfuehrbares Sidecar-Artefakt, und ein einzelnes `natascha-cli-x86_64-pc-windows-msvc.exe` laesst sich sauber neben der App buendeln. `--onedir` bleibt als Diagnoseoption im Skript erhalten, falls native Abhaengigkeiten spaeter einfacher inspiziert werden muessen.

## Build

```powershell
cd apps/natascha
.\build_sidecar.ps1
```

Das Skript installiert PyInstaller und `requirements_tui.txt` in die gewaehlte Python-Umgebung und erzeugt:

```text
apps/natascha/dist/natascha-cli/natascha-cli-x86_64-pc-windows-msvc.exe
```

## Optionale Tauri-Integration

Der normale Generator-only-Build referenziert das Sidecar nicht und bleibt ohne Binary baubar. Fuer einen spaeteren NATASCHA-Build kann die Zusatzkonfiguration verwendet werden:

```powershell
cd apps/lua
pnpm tauri build --config src-tauri/tauri.natascha-sidecar.conf.json
```

Diese Datei setzt nur `bundle.externalBin` auf `../../natascha/dist/natascha-cli/natascha-cli`. Tauri ergaenzt fuer Windows den Target-Suffix `-x86_64-pc-windows-msvc.exe`.

## Smoke-Test

```powershell
apps\natascha\dist\natascha-cli\natascha-cli-x86_64-pc-windows-msvc.exe --help
```
