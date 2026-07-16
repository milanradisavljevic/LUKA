param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,
  [Parameter(Mandatory = $true)]
  [string]$InstallDirectory
)

$ErrorActionPreference = 'Stop'
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$target = [System.IO.Path]::GetFullPath($InstallDirectory)

if (Test-Path -LiteralPath $target) {
  throw "Test-Installationsordner existiert bereits: $target"
}
New-Item -ItemType Directory -Force -Path $target | Out-Null

Write-Host "Installiere $installer nach $target"
$process = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$target") -Wait -PassThru
if ($process.ExitCode -ne 0) {
  throw "NSIS-Installer beendet sich mit Exit-Code $($process.ExitCode)."
}

$sidecar = Join-Path $target 'natascha-cli.exe'
if (-not (Test-Path -LiteralPath $sidecar -PathType Leaf)) {
  throw "Gebündeltes Korrektur-Sidecar fehlt: $sidecar"
}

$help = & $sidecar analyze --help 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
  throw "Gebündeltes Korrektur-Sidecar konnte nicht gestartet werden (Exit-Code $LASTEXITCODE)."
}
foreach ($flag in @('--einsatz-id', '--material-id')) {
  if ($help -notmatch [regex]::Escape($flag)) {
    throw "Sidecar ist veraltet: Flag $flag fehlt in analyze --help."
  }
}

Write-Host "Sidecar-Installer-Smoke erfolgreich: $sidecar"
