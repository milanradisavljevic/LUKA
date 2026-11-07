// Extrahiert den obersten Versionsabschnitt aus CHANGELOG.md (alles zwischen
// der ersten "## "-Überschrift und der nächsten) und schreibt ihn als
// Multiline-Output `body` nach $GITHUB_OUTPUT.
//
// Wird vom Release-Workflow (.github/workflows/release.yml) VOR der
// tauri-action ausgeführt; der Text geht dort als `releaseBody` rein.
// tauri-action schreibt ihn als `notes` in latest.json, der In-App-Updater
// liefert das dann als `update.body` an den Update-Dialog
// (apps/lua/apps/web/src/components/UpdateDialog.tsx).
//
// Erwartet CHANGELOG.md im aktuellen Arbeitsverzeichnis (Repo-Root).
import { readFileSync, appendFileSync } from 'node:fs';
import { extractReleaseNotes } from '../../apps/lua/apps/web/releaseNotes.mjs';

const FALLBACK_NOTES = 'Details im CHANGELOG.';

function main() {
  const changelogText = readFileSync('CHANGELOG.md', 'utf8');
  const notes = extractReleaseNotes(changelogText) || FALLBACK_NOTES;

  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    throw new Error('GITHUB_OUTPUT ist nicht gesetzt — Skript läuft nicht in GitHub Actions?');
  }

  const delimiter = `RELEASE_NOTES_${Date.now()}`;
  appendFileSync(outputPath, `body<<${delimiter}\n${notes}\n${delimiter}\n`);

  console.log('Release-Notes extrahiert:\n' + notes);
}

main();
