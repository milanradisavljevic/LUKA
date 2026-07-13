import { fachLabel } from '@lehrunterlagen/schema';
import type { Fach } from '@lehrunterlagen/schema';
import type { PoolImportPreview, PoolImportReport } from './pool';
import { formatPoolValidationIssues, validatePoolEntries } from './poolValidation';

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export interface ImportErgebnis {
  abgebrochen: boolean;
  report?: PoolImportReport;
  dateiname?: string;
}

export interface ExportErgebnis {
  anzahl: number;
  pfad: string;
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

  const dateiname = pfad.split(/[\\/]/).pop() ?? pfad;
  const geleseneEintraege = await invoke<unknown>('pool_read_entries', { path: pfad });
  const validierung = validatePoolEntries(geleseneEintraege);
  if (!validierung.valid) {
    await message(
      'Datei: ' + dateiname + '\n\nDas Fachpaket wurde nicht importiert, weil es ' + validierung.issues.length +
        ' Fehler enthält:\n\n' + formatPoolValidationIssues(validierung.issues),
      { title: 'Fachpaket abgelehnt', kind: 'error' },
    );
    return { abgebrochen: true, dateiname };
  }

  const entries = validierung.entries;
  const preview = await invoke<PoolImportPreview>('pool_import_preview_entries', { entries });

  if (preview.gesamt === 0) {
    await message('Die Datei „' + dateiname + '" enthält keine Aufgaben.', { title: 'Fachpaket leer', kind: 'warning' });
    return { abgebrochen: true, dateiname };
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
    { title: 'Fachpaket importieren: ' + dateiname, kind: 'info', okLabel: 'Importieren', cancelLabel: 'Abbrechen' },
  );
  if (!weiter) return { abgebrochen: true, dateiname };

  let ueberschreiben = false;
  if (preview.duplikate > 0) {
    ueberschreiben = await ask(
      `${preview.duplikate} Aufgabe(n) existieren bereits.\n\n` +
        'Vorhandene durch die Paket-Version ersetzen? („Nein" behält deine lokalen Versionen.)',
      { title: 'Duplikate in ' + dateiname, kind: 'warning', okLabel: 'Ersetzen', cancelLabel: 'Behalten' },
    );
  }

  const report = await invoke<PoolImportReport>('pool_import_entries', { entries, ueberschreiben });
  return { abgebrochen: false, report, dateiname };
}

/**
 * Übernimmt die vier mit der App ausgelieferten Fachpakete ("Startpaket", 29
 * Aufgaben) in den lokalen Pool. Kein Dateidialog, keine Vorschau nötig — die
 * Pakete sind fest mit der App gebündelt und bereits geprüft. Bestehende
 * Aufgaben (gleiche ID) werden nie überschrieben.
 *
 * Bei `land === 'DE'` wird zusätzlich das Startpaket Deutschland eingespielt
 * (37 statt 29 Aufgaben).
 */
export async function importStartpaket(land?: string): Promise<PoolImportReport> {
  return invoke<PoolImportReport>('pool_import_startpaket', { land });
}

/** Exportiert den gesamten lokalen Pool als teilbare Fachpaket-Datei. */
export async function exportPoolPaket(): Promise<ExportErgebnis | null> {
  const { save } = await import('@tauri-apps/plugin-dialog');

  const datum = new Date().toISOString().slice(0, 10);
  const pfad = await save({
    title: 'Aufgaben-Pool exportieren (JSON)',
    defaultPath: `luka-fachpaket-${datum}.json`,
    filters: [{ name: 'Fachpaket', extensions: ['json'] }],
  });
  if (typeof pfad !== 'string') return null;

  const anzahl = await invoke<number>('pool_export', { path: pfad });
  return { anzahl, pfad };
}
