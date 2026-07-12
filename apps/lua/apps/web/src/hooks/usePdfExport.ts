import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface PdfExportState {
  converting: boolean;
  pdfPath: string | null;
  error: string | null;
}

function formatPdfError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'PDF-Erstellung fehlgeschlagen');
  if (/libreoffice|soffice/i.test(raw)) {
    return 'LibreOffice wurde nicht gefunden oder konnte nicht gestartet werden. Installiere LibreOffice und versuche es erneut; alternativ kannst du die DOCX-Datei in Word oder LibreOffice Writer als PDF speichern.';
  }
  return raw || 'PDF-Erstellung fehlgeschlagen.';
}

export function buildPdfFilename(datum: string, thema: string): string {
  const sicher = thema
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return `${datum}_${sicher || 'LUKA_Dokument'}.pdf`;
}

export function usePdfExport() {
  const [state, setState] = useState<PdfExportState>({
    converting: false,
    pdfPath: null,
    error: null,
  });
  const [libreOfficeAvailable, setLibreOfficeAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    invoke<boolean>('libreoffice_available')
      .then(setLibreOfficeAvailable)
      .catch(() => setLibreOfficeAvailable(false));
  }, []);

  const startPdfExport = useCallback(async (docxPath: string | null, defaultPath: string) => {
    if (!docxPath?.trim()) {
      setState((prev) => ({ ...prev, error: 'Bitte zuerst die Schülerfassung als DOCX exportieren.' }));
      return;
    }

    setState((prev) => ({ ...prev, error: null, pdfPath: null }));

    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const selected = await save({
        title: 'PDF speichern',
        defaultPath,
        filters: [{ name: 'PDF-Dokument', extensions: ['pdf'] }],
      });
      if (typeof selected !== 'string') return;

      setState((prev) => ({ ...prev, converting: true, error: null, pdfPath: null }));
      const pdfPath = await invoke<string>('convert_pdf', {
        docxPath: docxPath.trim(),
        outputPath: selected,
      });
      setState((prev) => ({ ...prev, converting: false, pdfPath }));
    } catch (error) {
      setState((prev) => ({ ...prev, converting: false, error: formatPdfError(error) }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ converting: false, pdfPath: null, error: null });
  }, []);

  return {
    ...state,
    libreOfficeAvailable,
    startPdfExport,
    reset,
  };
}
