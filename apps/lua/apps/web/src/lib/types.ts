import type { DocumentV1, Meta, QuellText, Block, Auftrag } from '@lehrunterlagen/schema';
import type { RenderTemplateId } from '@lehrunterlagen/renderer';

export type StepId = 'absicht' | 'input' | 'baukasten' | 'llm' | 'generate';

export type LlmProvider = 'claude' | 'chatgpt' | 'kimi' | 'deepseek' | 'mistral' | 'qwen';

/** Welche Hauptansicht in der Sidebar gerade aktiv ist. */
export type ActiveView =
  | 'wizard'
  | 'dashboard'
  | 'documents'
  | 'templates'
  | 'history'
  | 'favorites'
  | 'trash'
  | 'korrektur'
  | 'klassen'
  | 'schueler'
  | 'erwartungshorizont'
  | 'settings'
  | 'help';

/** Persistierte Standard-Vorgaben, die neue Dokumente vorbelegen. */
export interface AppSettings {
  defaultProvider: LlmProvider;
  defaultModel: string;
  defaultKreativitaet: number;
  defaultAusgabeSprache: string;
  judgeEnabled?: boolean;
  /** Ordner, in dem NATASCHA-Korrektur-Exporte liegen. Leer = Default (~/lehr-suite-bridge/inbox). */
  nataschaInboxDir?: string;
  /** Ordner der NATASCHA-App (enthält natascha.py). Leer = Auto-Erkennung (apps/natascha). */
  nataschaDir?: string;
  /** Python-Befehl zum Starten von NATASCHA. Leer = OS-Default (python/python3). */
  pythonCommand?: string;
}

export interface AppState {
  step: StepId;
  auftrag: Auftrag | null;
  meta: Meta;
  quelltexte: QuellText[];
  bloecke: Block[];
  /** Vom LLM befülltes Dokument — null bis "Generieren" geklickt wurde. */
  generiertesDokument: DocumentV1 | null;
  llmProvider: LlmProvider | null;
  modelName: string;
  kreativitaet: number;
  ausgabeSprache: string;
  /** id des aktuell geladenen gespeicherten Dokuments (für Re-Save), sonst null. */
  aktuelleDokumentId: string | null;
  /** Gewählte DOCX-Formatvorlage. */
  renderTemplate: RenderTemplateId;
}

/** Vollständiger Wizard-Zustand ohne UI-/Navigationsfelder — persistierbar. */
export interface DocumentSnapshot {
  auftrag: Auftrag | null;
  meta: Meta;
  quelltexte: QuellText[];
  bloecke: Block[];
  generiertesDokument: DocumentV1 | null;
  llmProvider: LlmProvider | null;
  modelName: string;
  kreativitaet: number;
  ausgabeSprache: string;
  renderTemplate: RenderTemplateId;
}

/** Ein in localStorage gespeichertes Dokument (Wizard-Snapshot + Metadaten). */
export interface SavedDocument {
  id: string;
  title: string;
  savedAt: string;
  updatedAt: string;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  snapshot: DocumentSnapshot;
}

/** Read-only Protokolleintrag nach erfolgreichem Export. */
export interface HistoryEntry {
  id: string;
  timestamp: string;
  thema: string;
  fach: Meta['fach'];
  stufe: Meta['stufe'];
  llmProvider: LlmProvider | null;
  modelName: string;
  blockCount: number;
  totalPunkte: number;
  exportedFiles: string[];
  savedDocumentId: string | null;
}

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'absicht', label: 'Absicht' },
  { id: 'input', label: 'Quelltexte' },
  { id: 'baukasten', label: 'Aufgabenblöcke' },
  { id: 'llm', label: 'KI-Modell' },
  { id: 'generate', label: 'Generieren' },
];

export type AppAction =
  | { type: 'SET_STEP'; step: StepId }
  | { type: 'SET_AUFTRAG'; auftrag: Auftrag | null }
  | { type: 'SET_META'; meta: Partial<Meta> }
  | { type: 'ADD_QUELLTEXT'; quelltext: QuellText }
  | { type: 'REMOVE_QUELLTEXT'; id: string }
  | { type: 'UPDATE_QUELLTEXT'; id: string; quelltext: Partial<QuellText> }
  | { type: 'ADD_BLOCK'; block: Block }
  | { type: 'UPDATE_BLOCK'; id: string; block: Partial<Block> }
  | { type: 'REMOVE_BLOCK'; id: string }
  | { type: 'REMOVE_BLOCKS_BY_TYPE'; typ: string }
  | { type: 'REORDER_BLOCKS'; bloecke: Block[] }
  | { type: 'SET_LLM_PROVIDER'; provider: LlmProvider | null }
  | { type: 'SET_MODEL_NAME'; name: string }
  | { type: 'SET_KREATIVITAET'; value: number }
  | { type: 'SET_AUSGABE_SPRACHE'; value: string }
  | { type: 'SET_GENERIERTES_DOKUMENT'; dokument: DocumentV1 | null }
  | { type: 'UPDATE_GENERIERTER_BLOCK'; id: string; block: Partial<Block> }
  | { type: 'SET_RENDER_TEMPLATE'; template: RenderTemplateId }
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_SNAPSHOT'; snapshot: DocumentSnapshot; documentId: string }
  | { type: 'SET_DOCUMENT_ID'; id: string | null };
