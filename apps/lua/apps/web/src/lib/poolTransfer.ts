import { fachLabel } from '@lehrunterlagen/schema';
import type { Fach } from '@lehrunterlagen/schema';
import type { PoolImportPreview, PoolImportReport } from './pool';

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export interface ImportErgebnis {
  abgebrochen: boolean;
  report?: PoolImportReport;
}

/**
 * Fachpaket-Import mit Vorschau: Datei wählen → Rust liest + zählt →
 * Bestätigungsdialog zeigt, was in die lokale DB käme → erst dann Import.
 * Duplikate (gleiche ID) werden nach Rückfrage überschrieben oder übersprungen.
 */
export async function importPoolPaket(): Promise<ImportErgebnis> {
  const { open, ask, message } = await import('@tauri-apps/plugin-dialog');

  const pfad = await open({
    title: 'Fachpaket importieren (JSON)',
    multiple: false,
    filters: [{ name: 'Fachpaket', extensions: ['json'] }],
  });
  if (typeof pfad !== 'string') return { abgebrochen: true };

  const preview = await invoke<PoolImportPreview>('pool_import_preview', { path: pfad });

  if (preview.gesamt === 0) {
    await message('Die Datei enthält keine Aufgaben.', { title: 'Fachpaket leer', kind: 'warning' });
    return { abgebrochen: true };
  }

  const fachZeilen = preview.jeFach
    .map(([fach, n]) => `  • ${fachLabel(fach as Fach)}: ${n}`)
    .join('\n');
  const dupZeile = preview.duplikate > 0
    ? `\n${preview.duplikate} Aufgabe(n) existieren bereits (gleiche ID).`
    : '';
  const weiter = await ask(
    `${preview.gesamt} Aufgabe(n) gefunden:\n${fachZeilen}\n` +
      `${preview.mitQuelle} mit Herkunftsvermerk.${dupZeile}\n\nJetzt importieren?`,
    { title: 'Fachpaket importieren', kind: 'info', okLabel: 'Importieren', cancelLabel: 'Abbrechen' },
  );
  if (!weiter) return { abgebrochen: true };

  let ueberschreiben = false;
  if (preview.duplikate > 0) {
    ueberschreiben = await ask(
      `${preview.duplikate} Aufgabe(n) existieren bereits.\n\n` +
        'Vorhandene durch die Paket-Version ersetzen? („Nein" behält deine lokalen Versionen.)',
      { title: 'Duplikate gefunden', kind: 'warning', okLabel: 'Ersetzen', cancelLabel: 'Behalten' },
    );
  }

  const report = await invoke<PoolImportReport>('pool_import', { path: pfad, ueberschreiben });
  return { abgebrochen: false, report };
}

/** Exportiert den gesamten lokalen Pool als teilbare Fachpaket-Datei. */
export async function exportPoolPaket(): Promise<number | null> {
  const { save } = await import('@tauri-apps/plugin-dialog');

  const datum = new Date().toISOString().slice(0, 10);
  const pfad = await save({
    title: 'Aufgaben-Pool exportieren (JSON)',
    defaultPath: `luka-fachpaket-${datum}.json`,
    filters: [{ name: 'Fachpaket', extensions: ['json'] }],
  });
  if (typeof pfad !== 'string') return null;

  return invoke<number>('pool_export', { path: pfad });
}
