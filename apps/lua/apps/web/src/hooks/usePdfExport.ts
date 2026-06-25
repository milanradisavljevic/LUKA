import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const LAST_DOCX_PATH_KEY = 'lehrunterlagen-last-docx-path';

function getLastDocxPath(): string {
  try { return localStorage.getItem(LAST_DOCX_PATH_KEY) || ''; } catch { return ''; }
}
function setLastDocxPath(path: string) {
  try { localStorage.setItem(LAST_DOCX_PATH_KEY, path); } catch { /* ignore */ }
}

interface PdfExportState {
  converting: boolean;
  pdfPath: string | null;
  error: string | null;
  showPathInput: boolean;
  docxPath: string;
}

export function usePdfExport() {
  const [state, setState] = useState<PdfExportState>({
    converting: false,
    pdfPath: null,
    error: null,
    showPathInput: false,
    docxPath: getLastDocxPath(),
  });
  const [libreOfficeAvailable, setLibreOfficeAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    invoke<boolean>('libreoffice_available')
      .then(setLibreOfficeAvailable)
      .catch(() => setLibreOfficeAvailable(false));
  }, []);

  const startPdfExport = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showPathInput: true,
      error: null,
      pdfPath: null,
    }));
  }, []);

  const setDocxPath = useCallback((path: string) => {
    setState((prev) => ({ ...prev, docxPath: path }));
  }, []);

  const convertToPdf = useCallback(async () => {
    if (!state.docxPath.trim()) {
      setState((prev) => ({ ...prev, error: 'Bitte geben Sie den Pfad zur DOCX-Datei ein.' }));
      return;
    }

    setState((prev) => ({ ...prev, converting: true, error: null, pdfPath: null }));

    try {
      const trimmed = state.docxPath.trim();
      const pdfPath = await invoke<string>('convert_pdf', {
        docxPath: trimmed,
      });
      setLastDocxPath(trimmed);
      setState((prev) => ({ ...prev, converting: false, pdfPath }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF-Erstellung fehlgeschlagen';
      setState((prev) => ({ ...prev, converting: false, error: msg }));
    }
  }, [state.docxPath]);

  const closePathInput = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showPathInput: false,
      error: null,
      pdfPath: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      converting: false,
      pdfPath: null,
      error: null,
      showPathInput: false,
      docxPath: '',
    });
  }, []);

  return {
    ...state,
    libreOfficeAvailable,
    startPdfExport,
    setDocxPath,
    convertToPdf,
    closePathInput,
    reset,
  };
}
