param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,

  [Parameter(Mandatory = $true)]
  [string]$InstallDirectory
)

$ErrorActionPreference = "Stop"

$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$installRoot = [System.IO.Path]::GetFullPath($InstallDirectory)
if (Test-Path -LiteralPath $installRoot) {
  throw "Das Smoke-Test-Ziel existiert bereits: $installRoot"
}

$installParent = Split-Path -Parent $installRoot
New-Item -ItemType Directory -Force -Path $installParent | Out-Null

# Tauri/NSIS unterstuetzt /D= als Installationsziel; das Testziel liegt in
# RUNNER_TEMP und ist pro Workflow-Lauf eindeutig.
$process = Start-Process -FilePath $installer -ArgumentList @("/S", "/D=$installRoot") -Wait -PassThru
if ($process.ExitCode -ne 0) {
  throw "Der stille NSIS-Installationslauf endete mit Exitcode $($process.ExitCode)."
}
if (-not (Test-Path -LiteralPath $installRoot -PathType Container)) {
  throw "Der Installer hat das erwartete Testverzeichnis nicht angelegt: $installRoot"
}

$appExecutables = Get-ChildItem -LiteralPath $installRoot -Filter "*.exe" -File -Recurse |
  Where-Object { $_.Name -notmatch '^(natascha-cli.*|unins.*)\.exe$' }
if (-not $appExecutables) {
  throw "In der Installation wurde keine LUKA-Anwendung gefunden: $installRoot"
}

# Entspricht den Suchorten in commands/natascha.rs. Der Release-Bundler kann
# die Datei direkt neben der Anwendung oder in einem Ressourcenordner ablegen.
$sidecarNames = @(
  "natascha-cli.exe",
  "natascha-cli-x86_64-pc-windows-msvc.exe"
)
$sidecar = $null
foreach ($app in $appExecutables) {
  $appDirectory = $app.Directory.FullName
  $directories = @(
    $appDirectory,
    (Join-Path $appDirectory "resources"),
    (Join-Path $appDirectory "Resources"),
    (Join-Path $appDirectory "..\Resources")
  )
  foreach ($directory in $directories) {
    foreach ($name in $sidecarNames) {
      $candidate = Join-Path $directory $name
      if (Test-Path -LiteralPath $candidate -PathType Leaf) {
        $sidecar = (Resolve-Path -LiteralPath $candidate).Path
        break
      }
    }
    if ($sidecar) { break }
  }
  if ($sidecar) { break }
}

if (-not $sidecar) {
  $searched = ($appExecutables | ForEach-Object { $_.Directory.FullName } | Sort-Object -Unique) -join ", "
  throw "NATASCHA-Sidecar wurde nicht an einem von LUKA durchsuchten Ort installiert. Gepruefte Anwendungsverzeichnisse: $searched"
}

$help = (& $sidecar analyze --help 2>&1 | Out-String)
$sidecarExitCode = $LASTEXITCODE
if ($sidecarExitCode -ne 0) {
  throw "Der installierte NATASCHA-Sidecar startet nicht (Exitcode $sidecarExitCode): $sidecar"
}
foreach ($requiredFlag in @("--einsatz-id", "--material-id")) {
  if ($help -notmatch [regex]::Escape($requiredFlag)) {
    throw "Der installierte NATASCHA-Sidecar ist veraltet; das Flag $requiredFlag fehlt: $sidecar"
  }
}

Write-Host "Installierter Sidecar-Smoke erfolgreich: $sidecar"
