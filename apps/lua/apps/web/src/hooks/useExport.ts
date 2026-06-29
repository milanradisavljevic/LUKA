import { useState, useCallback } from 'react';
import type { AppState } from '../lib/types';
import type { DocumentV1 } from '@lehrunterlagen/schema';

import { getBlockLabel } from '../lib/blockDefaults';
import { appendHistoryEntry, loadSettings } from '../lib/storage';
import { computeCoverage } from '../lib/coverage';
import { istEntwurfsQuelle } from '../lib/stoffkatalog';
import { RENDER_TEMPLATES } from '@lehrunterlagen/renderer';

export function useExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnung, setWarnung] = useState<string | null>(null);
  const [lastSavedPaths, setLastSavedPaths] = useState<string[] | null>(null);

  const exportDocxOverride = useCallback(async (state: AppState, doc: DocumentV1, suffix?: string) => {
    setExporting(true);
    setError(null);
    setWarnung(null);
    setLastSavedPaths(null);

    try {
      const { renderDocumentToBlobs } = await import('@lehrunterlagen/renderer');
      const template = RENDER_TEMPLATES[state.renderTemplate];
      const { schueler, loesung } = await renderDocumentToBlobs(doc, template);

      const thema = sanitizeFilename(doc.meta.thema).slice(0, 40);
      const datum = doc.meta.datum;
      const suffixPart = suffix ? `_${suffix}` : '';

      const schuelerName = `${datum}_${thema}${suffixPart}_Schuelerfassung.docx`;
      const loesungName = `${datum}_${thema}${suffixPart}_Loesung.docx`;

      // Nacheinander herunterladen mit Verzögerung, damit der Browser
      // beide Downloads akzeptiert (manche blockieren gleichzeitige Downloads)
      const schuelerPfad = await saveBlob(schueler, schuelerName);
      await delay(600);
      const loesungPfad = await saveBlob(loesung, loesungName);

      const gespeichert = [schuelerPfad, loesungPfad].filter(Boolean);
      setLastSavedPaths(gespeichert.length ? gespeichert : null);

      // Verlaufseintrag protokollieren (read-only Log in der Sidebar)
      appendHistoryEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        thema: doc.meta.thema,
        fach: doc.meta.fach,
        stufe: doc.meta.stufe,
        llmProvider: state.llmProvider,
        modelName: state.modelName,
        blockCount: doc.bloecke.length,
        totalPunkte: doc.bloecke.reduce((sum, b) => sum + (b.punkte ?? 0), 0),
        exportedFiles: [schuelerName, loesungName],
        savedDocumentId: state.aktuelleDokumentId,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Export';
      setError(msg);
      return false;
    } finally {
      setExporting(false);
    }
  }, []);

  const exportDocx = useCallback(async (state: AppState) => {
    if (!state.generiertesDokument) {
      setError('Bitte zuerst Inhalt generieren.');
      return false;
    }
    return exportDocxOverride(state, state.generiertesDokument);
  }, [exportDocxOverride]);

  const exportKorrekturraster = useCallback(async (state: AppState) => {
    if (!state.generiertesDokument) {
      setError('Bitte zuerst Inhalt generieren.');
      return false;
    }
    setExporting(true);
    setError(null);

    try {
      const { buildRaster } = await import('@lehrunterlagen/qa');
      const { renderRasterToBlob } = await import('@lehrunterlagen/renderer');

      const raster = buildRaster(state.generiertesDokument);
      const template = RENDER_TEMPLATES[state.renderTemplate];
      // toBlob statt toBuffer — toBuffer wirft im WebView "nodebuffer is not supported".
      const blob = await renderRasterToBlob(raster, template);

      const thema = state.generiertesDokument.meta.thema.replace(/\s+/g, '_').slice(0, 40);
      const datum = state.generiertesDokument.meta.datum;

      await saveBlob(blob, `${datum}_${thema}_Korrekturraster.docx`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Raster-Export';
      setError(msg);
      return false;
    } finally {
      setExporting(false);
    }
  }, []);

  const exportKompetenzraster = useCallback(async (state: AppState) => {
    if (!state.generiertesDokument) {
      setError('Bitte zuerst Inhalt generieren.');
      return false;
    }
    if (state.generiertesDokument.meta.modus !== 'kompetenz') {
      setError('Kompetenznachweis ist nur im Kompetenz-Modus verfügbar.');
      return false;
    }
    if ((state.generiertesDokument.meta.stoffItemIds?.length ?? 0) === 0) {
      setError('Kompetenznachweis erfordert ein Katalog-Stoff-Item.');
      return false;
    }
    setExporting(true);
    setError(null);
    setWarnung(null);
    setLastSavedPaths(null);

    try {
      const { renderCoverageToBlob } = await import('@lehrunterlagen/renderer');
      const template = RENDER_TEMPLATES[state.renderTemplate];
      const { abgedeckt, fehlend } = computeCoverage(state.generiertesDokument.meta);

      const coverageDeskriptoren = (list: typeof abgedeckt) =>
        list.map((d) => ({ bereich: d.bereich, code: d.code || undefined, text: d.text }));

      // Entwurfs-Vermerk nur, wenn dieser Nachweis (noch) Entwurfs-Deskriptoren enthält.
      const istEntwurf = [...abgedeckt, ...fehlend].some((d) => istEntwurfsQuelle(d.quelle));

      const blob = await renderCoverageToBlob(
        {
          fach: state.generiertesDokument.meta.fach,
          stufe: state.generiertesDokument.meta.stufe,
          thema: state.generiertesDokument.meta.thema,
          datum: state.generiertesDokument.meta.datum,
          klasse: state.generiertesDokument.meta.klasse,
          istEntwurf,
        },
        coverageDeskriptoren(abgedeckt),
        coverageDeskriptoren(fehlend),
        template,
      );

      const thema = sanitizeFilename(state.generiertesDokument.meta.thema).slice(0, 40);
      const datum = state.generiertesDokument.meta.datum;
      const fileName = `${datum}_${thema}_Kompetenznachweis.docx`;

      const gespeichert = await saveBlob(blob, fileName);
      setLastSavedPaths(gespeichert ? [gespeichert] : null);

      const dok = state.generiertesDokument;
      appendHistoryEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        thema: dok.meta.thema,
        fach: dok.meta.fach,
        stufe: dok.meta.stufe,
        llmProvider: state.llmProvider,
        modelName: state.modelName,
        blockCount: dok.bloecke.length,
        totalPunkte: dok.bloecke.reduce((sum, b) => sum + (b.punkte ?? 0), 0),
        exportedFiles: [fileName],
        savedDocumentId: state.aktuelleDokumentId,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Kompetenznachweis-Export';
      setError(msg);
      return false;
    } finally {
      setExporting(false);
    }
  }, []);

  const exportSelbstlern = useCallback(async (state: AppState) => {
    if (!state.generiertesDokument) {
      setError('Bitte zuerst Inhalt generieren.');
      return false;
    }
    setExporting(true);
    setError(null);
    setWarnung(null);
    setLastSavedPaths(null);

    try {
      const { renderSelbstlernToBlob } = await import('@lehrunterlagen/renderer');
      const template = RENDER_TEMPLATES[state.renderTemplate];
      const blob = await renderSelbstlernToBlob(state.generiertesDokument, template);

      const thema = sanitizeFilename(state.generiertesDokument.meta.thema).slice(0, 40);
      const datum = state.generiertesDokument.meta.datum;
      const fileName = `${datum}_${thema}_Uebung-mit-Loesung.docx`;

      const gespeichert = await saveBlob(blob, fileName);
      setLastSavedPaths(gespeichert ? [gespeichert] : null);

      const dok = state.generiertesDokument;
      appendHistoryEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        thema: dok.meta.thema,
        fach: dok.meta.fach,
        stufe: dok.meta.stufe,
        llmProvider: state.llmProvider,
        modelName: state.modelName,
        blockCount: dok.bloecke.length,
        totalPunkte: dok.bloecke.reduce((sum, b) => sum + (b.punkte ?? 0), 0),
        exportedFiles: [fileName],
        savedDocumentId: state.aktuelleDokumentId,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Selbstlern-Export';
      setError(msg);
      return false;
    } finally {
      setExporting(false);
    }
  }, []);

  const exportSelbsteinschaetzung = useCallback(async (state: AppState) => {
    if (!state.generiertesDokument) {
      setError('Bitte zuerst Inhalt generieren.');
      return false;
    }
    setExporting(true);
    setError(null);
    setWarnung(null);
    setLastSavedPaths(null);

    try {
      const { buildRaster } = await import('@lehrunterlagen/qa');
      const { renderSelbsteinschaetzungToBlob } = await import('@lehrunterlagen/renderer');
      const raster = buildRaster(state.generiertesDokument);
      const lernziele = state.generiertesDokument.meta.lernziele ?? [];
      const template = RENDER_TEMPLATES[state.renderTemplate];
      const blob = await renderSelbsteinschaetzungToBlob(raster, lernziele, template);

      const thema = sanitizeFilename(state.generiertesDokument.meta.thema).slice(0, 40);
      const datum = state.generiertesDokument.meta.datum;
      const fileName = `${datum}_${thema}_Selbsteinschaetzung.docx`;

      await saveBlob(blob, fileName);
      setLastSavedPaths([fileName]);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Selbsteinschätzungs-Export';
      setError(msg);
      return false;
    } finally {
      setExporting(false);
    }
  }, []);

  const exportGift = useCallback(async (state: AppState) => {
    if (!state.generiertesDokument) {
      setError('Bitte zuerst Inhalt generieren.');
      return false;
    }
    setExporting(true);
    setError(null);
    setWarnung(null);
    setLastSavedPaths(null);

    try {
      const { toGift } = await import('@lehrunterlagen/export');
      const giftString = toGift(state.generiertesDokument);
      const blob = new Blob([giftString], { type: 'text/plain;charset=utf-8' });

      const thema = sanitizeFilename(state.generiertesDokument.meta.thema).slice(0, 40);
      const datum = state.generiertesDokument.meta.datum;
      const fileName = `${datum}_${thema}_quiz.gift`;

      await saveBlob(blob, fileName);
      setLastSavedPaths([fileName]);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler beim GIFT-Export';
      setError(msg);
      return false;
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportDocx, exportDocxOverride, exportKorrekturraster, exportKompetenzraster, exportSelbstlern, exportSelbsteinschaetzung, exportGift, exporting, error, warnung, lastSavedPaths };
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

/**
 * Speichert ein DOCX. In Tauri über den Rust-Command `export_docx`
 * (Zielordner aus den Einstellungen bzw. „Speichern unter…"-Dialog) — Rückgabe =
 * gespeicherter Pfad, '' bei Abbruch. Im Browser klassischer Download (Rückgabe = Dateiname).
 */
async function saveBlob(blob: Blob, filename: string): Promise<string> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const s = loadSettings();
      const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
      return await invoke<string>('export_docx', {
        dir: s.exportDir ?? '',
        filename,
        bytes,
        ask: s.exportAskEachTime ?? false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ABBRUCH')) return ''; // Dialog abgebrochen → kein Fehler
      throw err;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ersetzt Umlaute und Sonderzeichen für sichere Dateinamen */
function sanitizeFilename(text: string): string {
  return text
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
