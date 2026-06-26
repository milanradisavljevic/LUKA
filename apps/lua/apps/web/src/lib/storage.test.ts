import { beforeEach, describe, expect, it } from 'vitest';
import type { AppState, HistoryEntry, SavedDocument } from './types';
import {
  DEFAULT_SETTINGS,
  appendHistoryEntry,
  clearHistory,
  loadDocuments,
  loadHistory,
  loadSettings,
  saveDocuments,
  saveSettings,
  snapshotFromState,
  upsertDocument,
  hydrateCache,
} from './storage';

function installLocalStorage() {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  } as Storage;
}

function makeDoc(id: string, overrides: Partial<SavedDocument> = {}): SavedDocument {
  return {
    id,
    title: `Doc ${id}`,
    savedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isFavorite: false,
    isDeleted: false,
    deletedAt: null,
    snapshot: {
      auftrag: null,
      meta: {} as never,
      quelltexte: [],
      bloecke: [],
      generiertesDokument: null,
      llmProvider: null,
      modelName: '',
      kreativitaet: 0.4,
      ausgabeSprache: 'de',
      renderTemplate: 'klassisch',
    },
    ...overrides,
  };
}

describe('storage — Dokumente', () => {
  beforeEach(() => {
    installLocalStorage();
    hydrateCache();
  });

  it('liefert [] bei leerem Storage und bei kaputtem JSON', () => {
    expect(loadDocuments()).toEqual([]);
    localStorage.setItem('lehrunterlagen-documents', '{nicht valide');
    expect(loadDocuments()).toEqual([]);
  });

  it('saveDocuments + loadDocuments sind roundtrip-fähig', () => {
    const docs = [makeDoc('a'), makeDoc('b')];
    saveDocuments(docs);
    expect(loadDocuments()).toHaveLength(2);
  });

  it('upsertDocument ersetzt bei gleicher id statt zu duplizieren', () => {
    upsertDocument(makeDoc('a', { title: 'Erst' }));
    const after = upsertDocument(makeDoc('a', { title: 'Neu' }));
    expect(after).toHaveLength(1);
    expect(after[0]!.title).toBe('Neu');
  });
});

describe('storage — Verlauf', () => {
  beforeEach(() => {
    installLocalStorage();
    hydrateCache();
  });

  const entry = (id: string): HistoryEntry => ({
    id,
    timestamp: `2026-01-0${id}T00:00:00.000Z`,
    thema: 'T',
    fach: 'deutsch',
    stufe: 'oberstufe',
    llmProvider: 'claude',
    modelName: 'Sonnet 4.6',
    blockCount: 2,
    totalPunkte: 10,
    exportedFiles: ['a.docx'],
    savedDocumentId: null,
  });

  it('appendHistoryEntry stellt neue Einträge an den Anfang', () => {
    appendHistoryEntry(entry('1'));
    const after = appendHistoryEntry(entry('2'));
    expect(after.map((e) => e.id)).toEqual(['2', '1']);
  });

  it('clearHistory leert das Protokoll', () => {
    appendHistoryEntry(entry('1'));
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});

describe('storage — Standard-Vorgaben', () => {
  beforeEach(() => {
    installLocalStorage();
    hydrateCache();
  });

  it('liefert DEFAULT_SETTINGS bei leerem/kaputtem Storage', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem('lehrunterlagen-settings', '{kaputt');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('mergt Teil-Settings über die Defaults', () => {
    localStorage.setItem('lehrunterlagen-settings', JSON.stringify({ defaultKreativitaet: 0.9 }));
    hydrateCache();
    const s = loadSettings();
    expect(s.defaultKreativitaet).toBe(0.9);
    expect(s.defaultProvider).toBe(DEFAULT_SETTINGS.defaultProvider);
  });

  it('saveSettings + loadSettings sind roundtrip-fähig', () => {
    saveSettings({
      defaultProvider: 'deepseek',
      defaultModel: 'DeepSeek V4 Pro',
      defaultKreativitaet: 0.2,
      defaultAusgabeSprache: 'en',
      judgeEnabled: false,
      ambientMuralsEnabled: false,
      reduceMotion: true,
      reduceBackgroundEffects: true,
      nataschaInboxDir: '',
      nataschaDir: '',
      pythonCommand: '',
    });
    expect(loadSettings()).toEqual({
      defaultProvider: 'deepseek',
      defaultModel: 'DeepSeek V4 Pro',
      defaultKreativitaet: 0.2,
      defaultAusgabeSprache: 'en',
      judgeEnabled: false,
      ambientMuralsEnabled: false,
      reduceMotion: true,
      reduceBackgroundEffects: true,
      nataschaInboxDir: '',
      nataschaDir: '',
      pythonCommand: '',
    });
  });
});

describe('storage — snapshotFromState', () => {
  it('uebernimmt nur die persistierbaren Felder (ohne step / aktuelleDokumentId)', () => {
    const state = {
      step: 'generate',
      aktuelleDokumentId: 'x',
      auftrag: null,
      meta: { thema: 'Test' },
      quelltexte: [],
      bloecke: [],
      generiertesDokument: null,
      llmProvider: 'claude',
      modelName: 'Sonnet 4.6',
      kreativitaet: 0.7,
      ausgabeSprache: 'de',
    } as unknown as AppState;
    const snap = snapshotFromState(state);
    expect(snap).not.toHaveProperty('step');
    expect(snap).not.toHaveProperty('aktuelleDokumentId');
    expect(snap.kreativitaet).toBe(0.7);
    expect(snap.modelName).toBe('Sonnet 4.6');
  });
});
