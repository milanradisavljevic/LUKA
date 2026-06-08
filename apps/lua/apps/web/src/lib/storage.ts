import type { AppSettings, AppState, DocumentSnapshot, HistoryEntry, SavedDocument } from './types';

const DOCS_KEY = 'lehrunterlagen-documents';
const HISTORY_KEY = 'lehrunterlagen-history';
const SETTINGS_KEY = 'lehrunterlagen-settings';

/** Werkseinstellungen (bisherige Hardcodes aus useWizard). */
export const DEFAULT_SETTINGS: AppSettings = {
  defaultProvider: 'claude',
  defaultModel: 'Sonnet 4.6',
  defaultKreativitaet: 0.4,
  defaultAusgabeSprache: 'de',
  judgeEnabled: true,
  nataschaInboxDir: '',
  nataschaDir: '',
  pythonCommand: '',
};

// --- Dokumente -------------------------------------------------------------

export function loadDocuments(): SavedDocument[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as SavedDocument[]) : [];
  } catch {
    return [];
  }
}

export function saveDocuments(docs: SavedDocument[]): void {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch {
    /* localStorage voll oder nicht verfügbar — bewusst ignoriert */
  }
}

/** Fügt ein Dokument ein oder ersetzt das bestehende mit gleicher id. */
export function upsertDocument(doc: SavedDocument): SavedDocument[] {
  const docs = loadDocuments();
  const next = [...docs.filter((d) => d.id !== doc.id), doc];
  saveDocuments(next);
  return next;
}

// --- Verlauf ---------------------------------------------------------------

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* bewusst ignoriert */
  }
}

export function appendHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const entries = loadHistory();
  const next = [entry, ...entries];
  saveHistory(next);
  return next;
}

export function clearHistory(): void {
  saveHistory([]);
}

// --- Standard-Vorgaben -----------------------------------------------------

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* bewusst ignoriert */
  }
}

// --- Helfer ----------------------------------------------------------------

/** Extrahiert den persistierbaren Snapshot aus dem laufenden Wizard-State. */
export function snapshotFromState(state: AppState): DocumentSnapshot {
  return {
    auftrag: state.auftrag,
    meta: state.meta,
    quelltexte: state.quelltexte,
    bloecke: state.bloecke,
    generiertesDokument: state.generiertesDokument,
    llmProvider: state.llmProvider,
    modelName: state.modelName,
    kreativitaet: state.kreativitaet,
    ausgabeSprache: state.ausgabeSprache,
    renderTemplate: state.renderTemplate,
  };
}
