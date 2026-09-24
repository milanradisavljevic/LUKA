param(
  [string]$Python = "python",
  [switch]$OneDir
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetTriple = "x86_64-pc-windows-msvc"
$BaseName = "natascha-cli"
$PyInstallerName = "$BaseName-$TargetTriple"
$OutDir = Join-Path $Root "dist\natascha-cli"

Set-Location $Root

& $Python -m pip install --upgrade pyinstaller
if ($LASTEXITCODE -ne 0) { throw "PyInstaller konnte nicht installiert werden." }
& $Python -m pip install -r requirements_cli.txt -r requirements_tui.txt
if ($LASTEXITCODE -ne 0) { throw "NATASCHA-Build-Abhängigkeiten konnten nicht installiert werden." }

$mode = if ($OneDir) { "--onedir" } else { "--onefile" }

& $Python -m PyInstaller `
  --clean `
  --noconfirm `
  $mode `
  --name $PyInstallerName `
  --add-data "feedback_schema.json;." `
  --add-data "natascha_config.toml;." `
  --add-data "rubrics;rubrics" `
  --add-data "prompts;prompts" `
  --collect-data textual `
  natascha_cli.py
if ($LASTEXITCODE -ne 0) { throw "PyInstaller-Build ist fehlgeschlagen." }

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if ($OneDir) {
  Copy-Item -Recurse -Force -Path (Join-Path $Root "dist\$PyInstallerName") -Destination $OutDir
  Write-Host "NATASCHA Sidecar one-dir gebaut: $OutDir\$PyInstallerName"
} else {
  Copy-Item -Force -Path (Join-Path $Root "dist\$PyInstallerName.exe") -Destination (Join-Path $OutDir "$PyInstallerName.exe")
  Write-Host "NATASCHA Sidecar one-file gebaut: $OutDir\$PyInstallerName.exe"
}
