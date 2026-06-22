import { useState, useCallback } from 'react';
import type { AppState } from '../lib/types';
import type { DocumentV1 } from '@lehrunterlagen/schema';

import { getBlockLabel } from '../lib/blockDefaults';
import { appendHistoryEntry } from '../lib/storage';
import { computeCoverage } from '../lib/coverage';
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
      downloadBlob(schueler, schuelerName);
      await delay(600);
      downloadBlob(loesung, loesungName);

      setLastSavedPaths([schuelerName, loesungName]);

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

      downloadBlob(blob, `${datum}_${thema}_Korrekturraster.docx`);
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

      const blob = await renderCoverageToBlob(
        {
          fach: state.generiertesDokument.meta.fach,
          stufe: state.generiertesDokument.meta.stufe,
          thema: state.generiertesDokument.meta.thema,
          datum: state.generiertesDokument.meta.datum,
          klasse: state.generiertesDokument.meta.klasse,
        },
        coverageDeskriptoren(abgedeckt),
        coverageDeskriptoren(fehlend),
        template,
      );

      const thema = sanitizeFilename(state.generiertesDokument.meta.thema).slice(0, 40);
      const datum = state.generiertesDokument.meta.datum;
      const fileName = `${datum}_${thema}_Kompetenznachweis.docx`;

      downloadBlob(blob, fileName);
      setLastSavedPaths([fileName]);

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

      downloadBlob(blob, fileName);
      setLastSavedPaths([fileName]);

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

      downloadBlob(blob, fileName);
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

  return { exportDocx, exportDocxOverride, exportKorrekturraster, exportKompetenzraster, exportSelbstlern, exportSelbsteinschaetzung, exporting, error, warnung, lastSavedPaths };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
