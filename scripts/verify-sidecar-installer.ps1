param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,
  [Parameter(Mandatory = $true)]
  [string]$InstallDirectory
)

$ErrorActionPreference = 'Stop'
# Eine echte Installation verändert Verknüpfungen/Registry: nur isolierte Runner.
if ($env:CI -ne 'true') {
  throw 'Installer-Abnahme nur in einer isolierten CI-/Windows-Testumgebung. Auf dem Arbeitsrechner würde sie die reguläre Installation verändern.'
}
$installer = (Resolve-Path -LiteralPath $InstallerPath).Path
$target = [System.IO.Path]::GetFullPath($InstallDirectory)

if (Test-Path -LiteralPath $target) {
  throw "Test-Installationsordner existiert bereits: $target"
}
New-Item -ItemType Directory -Force -Path $target | Out-Null

Write-Host "Installiere $installer nach $target"
$process = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$target") -WindowStyle Hidden -Wait -PassThru
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

$fixture = Join-Path $target 'smoke-data'
New-Item -ItemType Directory -Path $fixture | Out-Null
$database = Join-Path $fixture 'synthetisch.db'
$report = Join-Path $fixture 'lehrkraftbericht.docx'
$sourceRoot = Join-Path $PSScriptRoot '../apps/natascha'
$ids = @'
import json
from pathlib import Path
import sqlite3
import sys

from docx import Document

sys.path.insert(0, sys.argv[1])
import natascha_db as db

database = Path(sys.argv[2])
source = database.with_suffix(".docx")
text = "Wir lernen gemeinsam und arbeiten innovatiff."
doc = Document()
doc.add_paragraph(text)
doc.save(source)
db.init_db(database)
payload = {
    "datei": source.name, "fach": "Deutsch", "schulstufe": "Oberstufe",
    "textsorte": "Meinungsrede", "rubrik": "meinungsrede.md", "bewertung": {},
    "pruefumfang": "sprache", "bewertungsmodus": "unbenotet",
    "fehler": [{"zitat": "innovatiff", "korrektur": "innovativ", "typ": "R",
                "erklaerung": "Das Wort endet auf v.", "befundart": "normfehler"}],
}
abgabe = db.save_analysis_to_db(database, payload, source, "TEST", "Rede", rohtext=text)
with sqlite3.connect(database) as conn:
    revision = conn.execute(
        "SELECT id FROM korrektur_revision WHERE abgabe_id = ? AND is_active = 1", (abgabe,),
    ).fetchone()[0]
print(json.dumps({"abgabe": abgabe, "revision": revision}))
'@ | python - $sourceRoot $database | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $ids.revision) {
  throw 'Die synthetische Korrektur konnte nicht vorbereitet werden.'
}
$result = & $sidecar --db-path $database feedback-docx $ids.abgabe --revision-id $ids.revision --ansicht lehrkraft --output $report | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $result.abgabe_id -ne $ids.abgabe -or -not (Test-Path -LiteralPath $report)) {
  throw 'Der installierte Sidecar konnte den Lehrkraftbericht nicht exportieren.'
}
@'
import sys
from zipfile import ZipFile
from xml.etree import ElementTree as ET

from docx import Document

path = sys.argv[1]
assert any("Wir lernen gemeinsam" in p.text for p in Document(path).paragraphs)
namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
with ZipFile(path) as report:
    comments = ET.fromstring(report.read("word/comments.xml"))
    document = ET.fromstring(report.read("word/document.xml"))
    assert comments.find(namespace + "comment") is not None
    assert next(document.iter(namespace + "commentReference"), None) is not None
'@ | python - $report
if ($LASTEXITCODE -ne 0) {
  throw 'Originaltext oder verankerter Kommentar fehlt im Lehrkraftbericht.'
}

Write-Host "Sidecar-Installer-Smoke erfolgreich: $sidecar"
