import type { AppSettings, AppState, DocumentSnapshot, HistoryEntry, SavedDocument } from './types';

const DOCS_KEY = 'lehrunterlagen-documents';
const HISTORY_KEY = 'lehrunterlagen-history';
const SETTINGS_KEY = 'lehrunterlagen-settings';
const TEMPLATES_KEY = 'lehrunterlagen-templates';
const MIGRATED_KEY = 'lehrunterlagen-migrated';

export const DEFAULT_SETTINGS: AppSettings = {
  defaultProvider: 'mistral',
  defaultModel: 'Mistral Medium 3.5',
  defaultKreativitaet: 0.4,
  defaultAusgabeSprache: 'de',
  judgeEnabled: true,
  ambientMuralsEnabled: true,
  reduceMotion: false,
  reduceBackgroundEffects: false,
  nataschaInboxDir: '',
  nataschaDir: '',
  pythonCommand: '',
  exportDir: '',
  exportAskEachTime: false,
};

export interface DbLoadAllResult {
  documents: SavedDocument[];
  history: HistoryEntry[];
  settings: AppSettings;
  templates: TemplateEntry[];
  klassen: KlasseInfo[];
  dbPath: string;
}

export interface KlasseInfo {
  klasse: string;
  anzahlAbgaben: number;
}

export interface TemplateEntry {
  id: string;
  name: string;
  meta: unknown;
  bloecke: unknown;
  savedAt: string;
}

let hydrated = false;
let cache: DbLoadAllResult | null = null;

function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

/** Fire-and-forget DB-Write. Schlägt er fehl, wird der Fehler geloggt (statt dass
 *  Cache und DB still auseinanderlaufen). Optionaler Hook für UI-Toasts. */
let onPersistError: ((cmd: string, error: unknown) => void) | null = null;
export function setPersistErrorHandler(fn: ((cmd: string, error: unknown) => void) | null): void {
  onPersistError = fn;
}
function persist(cmd: string, args?: Record<string, unknown>): void {
  void invoke(cmd, args).catch((e) => {
    console.error(`[storage] DB-Write '${cmd}' fehlgeschlagen:`, e);
    onPersistError?.(cmd, e);
  });
}

/** Hydratisiert den Cache aus der SQLite-Datenbank. Beim ersten Start wird
 *  ggf. localStorage in die DB migriert (einmalig). */
export async function hydrateCache(): Promise<void> {
  if (!isTauri()) {
    hydrateFromLocalStorage();
    return;
  }

  await migrateFromLocalStorageIfNeeded();
  const result = await invoke<DbLoadAllResult>('db_load_all');
  cache = {
    documents: result.documents.map(deserializeDoc),
    history: result.history.map(deserializeHistory),
    settings: { ...DEFAULT_SETTINGS, ...(result.settings ?? {}) },
    templates: (result.templates as any[] ?? []).map(deserializeTemplate),
    klassen: result.klassen ?? [],
    dbPath: result.dbPath ?? '',
  };
  hydrated = true;
}

export function isHydrated(): boolean {
  return hydrated;
}

export function getCache(): DbLoadAllResult {
  if (!cache) throw new Error('Cache not hydrated — call hydrateCache() first');
  return cache;
}

export function getDbPath(): string {
  return cache?.dbPath ?? '';
}

// --- Fallback: localStorage (im Browser oder vor Migration) ---

function hydrateFromLocalStorage(): void {
  const docs = loadDocumentsFromLS();
  const history = loadHistoryFromLS();
  const settings = loadSettingsFromLS();
  const templates = loadTemplatesFromLS();
  cache = {
    documents: docs,
    history: history,
    settings: settings,
    templates: templates,
    klassen: [],
    dbPath: '',
  };
  hydrated = true;
}

// --- Migration: localStorage → SQLite (einmalig) ---

async function migrateFromLocalStorageIfNeeded(): Promise<void> {
  const migrated = localStorage.getItem(MIGRATED_KEY);
  if (migrated) return;

  const docs = localStorage.getItem(DOCS_KEY);
  const history = localStorage.getItem(HISTORY_KEY);
  const settings = localStorage.getItem(SETTINGS_KEY);
  const templates = localStorage.getItem(TEMPLATES_KEY);

  if (!docs && !history && !settings && !templates) {
    localStorage.setItem(MIGRATED_KEY, '1');
    return;
  }

  const payload: Record<string, unknown> = {};
  if (docs) payload.documents = JSON.parse(docs);
  if (history) payload.history = JSON.parse(history);
  if (settings) payload.settings = JSON.parse(settings);
  if (templates) payload.templates = JSON.parse(templates);

  await invoke('db_migrate_from_localstorage', { payloadJson: JSON.stringify(payload) });
  localStorage.setItem(MIGRATED_KEY, '1');
}

// --- Dokumente (sync reads, async writes) ---

export function loadDocuments(): SavedDocument[] {
  return cache?.documents ?? loadDocumentsFromLS();
}

export function saveDocuments(docs: SavedDocument[]): void {
  if (cache) cache.documents = docs;
  persistUpsertDocuments(docs);
}

export function upsertDocument(doc: SavedDocument): SavedDocument[] {
  const docs = loadDocuments();
  const next = [...docs.filter((d) => d.id !== doc.id), doc];
  if (cache) cache.documents = next;
  persistUpsertDocuments(next);
  return next;
}

// --- Verlauf (sync reads, async writes) ---

export function loadHistory(): HistoryEntry[] {
  return cache?.history ?? loadHistoryFromLS();
}

export function saveHistory(entries: HistoryEntry[]): void {
  if (cache) cache.history = entries;
  persist('db_clear_history');
}

export function appendHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const entries = [entry, ...(cache?.history ?? loadHistoryFromLS())];
  if (cache) cache.history = entries;
  persist('db_append_history', { entryJson: JSON.stringify(entry) });
  return entries;
}

export function clearHistory(): void {
  if (cache) cache.history = [];
  persist('db_clear_history');
}

// --- Standard-Vorgaben (sync reads, async writes) ---

export function loadSettings(): AppSettings {
  return cache?.settings ?? loadSettingsFromLS();
}

const settingsListeners = new Set<(settings: AppSettings) => void>();

export function subscribeSettings(listener: (settings: AppSettings) => void): () => void {
  settingsListeners.add(listener);
  return () => settingsListeners.delete(listener);
}

export function saveSettings(settings: AppSettings): void {
  if (cache) cache.settings = settings;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
  settingsListeners.forEach((listener) => listener(settings));
  persist('db_save_settings', { settingsJson: JSON.stringify(settings) });
}

// --- Templates ---

export function loadTemplates(): TemplateEntry[] {
  return cache?.templates ?? loadTemplatesFromLS();
}

export function saveTemplate(tpl: TemplateEntry): void {
  if (cache) {
    const idx = cache.templates.findIndex((t) => t.name === tpl.name);
    if (idx >= 0) cache.templates[idx] = tpl;
    else cache.templates.push(tpl);
  }
  persist('db_save_template', { templateJson: JSON.stringify(tpl) });
}

export function deleteTemplate(name: string): void {
  if (cache) cache.templates = cache.templates.filter((t) => t.name !== name);
  persist('db_delete_template', { name });
}

// --- Helfer ----------------------------------------------------------------

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

// --- Fire-and-forget async persisters ---

function persistUpsertDocuments(docs: SavedDocument[]): void {
  for (const doc of docs) {
    persist('db_upsert_document', {
      docJson: JSON.stringify({
        ...doc,
        klasse: (doc as any).klasse ?? '',
        aufgabe: (doc as any).aufgabe ?? '',
      }),
    });
  }
}

// --- localStorage fallback (browser & pre-hydration) ---

function loadDocumentsFromLS(): SavedDocument[] {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as SavedDocument[]) : [];
  } catch { return []; }
}

function loadHistoryFromLS(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch { return []; }
}

function loadSettingsFromLS(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function loadTemplatesFromLS(): TemplateEntry[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as TemplateEntry[]) : [];
  } catch { return []; }
}

// --- Row deserialization (DB rows → app types) ---

function deserializeDoc(row: any): SavedDocument {
  const snapshot = typeof row.snapshotJson === 'string'
    ? JSON.parse(row.snapshotJson)
    : row.snapshotJson ?? row.snapshot_json;
  return {
    id: row.id,
    title: row.title,
    savedAt: row.createdAt ?? row.created_at ?? row.savedAt ?? '',
    updatedAt: row.updatedAt ?? row.updated_at ?? '',
    isFavorite: row.isFavorite ?? row.is_favorite ?? false,
    isDeleted: row.isDeleted ?? row.is_deleted ?? false,
    deletedAt: row.deletedAt ?? row.deleted_at ?? null,
    snapshot,
  };
}

function deserializeHistory(row: any): HistoryEntry {
  const exportedFiles = typeof row.exportedFilesJson === 'string'
    ? JSON.parse(row.exportedFilesJson)
    : row.exportedFilesJson ?? row.exported_files_json ?? [];
  return {
    id: row.id,
    timestamp: row.timestamp,
    thema: row.thema ?? '',
    fach: row.fach ?? '',
    stufe: row.stufe ?? '',
    llmProvider: row.llmProvider ?? row.llm_provider ?? null,
    modelName: row.modelName ?? row.model_name ?? null,
    blockCount: row.blockCount ?? row.block_count ?? 0,
    totalPunkte: row.totalPunkte ?? row.total_punkte ?? 0,
    exportedFiles: Array.isArray(exportedFiles) ? exportedFiles : [],
    savedDocumentId: row.savedDocumentId ?? row.saved_document_id ?? null,
  };
}

function deserializeTemplate(row: any): TemplateEntry {
  const meta = typeof row.metaJson === 'string' ? JSON.parse(row.metaJson) : (row.metaJson ?? row.meta ?? row.meta_json ?? {});
  const bloecke = typeof row.bloeckeJson === 'string' ? JSON.parse(row.bloeckeJson) : (row.bloeckeJson ?? row.bloecke ?? row.bloecke_json ?? []);
  return {
    id: row.id ?? `tpl_${(row.name ?? '').replace(/ /g, '_')}`,
    name: row.name ?? '',
    meta,
    bloecke,
    savedAt: row.savedAt ?? row.saved_at ?? '',
  };
}
