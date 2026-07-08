import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { ask, message } from '@tauri-apps/plugin-dialog';

/**
 * Prüft beim App-Start still auf Updates (GitHub Releases, signiert).
 * Fragt bei Fund nach, lädt herunter, installiert, bietet Neustart an.
 * Fehler (offline, Endpoint nicht erreichbar) werden bewusst verschluckt —
 * ein fehlgeschlagener Update-Check darf den Unterricht nie stören.
 */
export async function checkForUpdatesSilently(): Promise<void> {
  try {
    const update = await check();
    if (!update) return;

    const willUpdate = await ask(
      `Version ${update.version} ist verfügbar (installiert: ${update.currentVersion}).\n\n` +
        'Jetzt herunterladen und installieren? Die App bleibt währenddessen nutzbar.',
      { title: 'Update verfügbar', kind: 'info', okLabel: 'Installieren', cancelLabel: 'Später' },
    );
    if (!willUpdate) return;

    await update.downloadAndInstall();

    const willRelaunch = await ask(
      'Das Update wurde installiert. Neustart jetzt durchführen?\n\n' +
        'Ungespeicherte Eingaben im Wizard gehen beim Neustart verloren.',
      { title: 'Update installiert', kind: 'info', okLabel: 'Jetzt neu starten', cancelLabel: 'Beim nächsten Start' },
    );
    if (willRelaunch) {
      await relaunch();
    } else {
      await message('Das Update wird beim nächsten Start der App aktiv.', {
        title: 'Update installiert',
        kind: 'info',
      });
    }
  } catch {
    // still scheitern — siehe Docstring
  }
}
