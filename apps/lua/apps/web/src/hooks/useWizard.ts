import { useReducer, useCallback, useEffect, useRef } from 'react';
import { readDraft, writeDraft } from '../lib/workSession';
import type { AppState, AppAction, StepId } from '../lib/types';
import { getDefaultMeta } from '../lib/constants';
import { getDefaultTemplate } from '@lehrunterlagen/renderer';
import { loadSettings } from '../lib/storage';

const STEPS_ORDER: StepId[] = ['absicht', 'input', 'baukasten', 'llm', 'generate'];

// Actions die keinen Undo-Snapshot erzeugen (Navigation, System)
const NON_UNDOABLE = new Set([
  'SET_STEP', 'RESET_STATE', 'LOAD_SNAPSHOT', 'SET_DOCUMENT_ID',
  'UNDO', 'REDO',
]);

// Actions die den Redo-Stack leeren (neuer Edit nach Undo)
const CLEAR_REDO_ON = new Set([
  'SET_AUFTRAG', 'SET_META',
  'ADD_QUELLTEXT', 'REMOVE_QUELLTEXT', 'UPDATE_QUELLTEXT',
  'ADD_BLOCK', 'UPDATE_BLOCK', 'REMOVE_BLOCK',
  'REMOVE_BLOCKS_BY_TYPE', 'REORDER_BLOCKS',
  'SET_LLM_PROVIDER', 'SET_MODEL_NAME', 'SET_KREATIVITAET',
  'SET_AUSGABE_SPRACHE', 'SET_RENDER_TEMPLATE', 'SET_RENDER_LAYOUT',
  'SET_GENERIERTES_DOKUMENT', 'UPDATE_GENERIERTER_BLOCK',
]);

const MAX_HISTORY = 50;

export function wizardReducer(state: AppState, action: AppAction): AppState {
  if(state.generiertesDokument && ['SET_META','ADD_QUELLTEXT','REMOVE_QUELLTEXT','UPDATE_QUELLTEXT','ADD_BLOCK','UPDATE_BLOCK','REMOVE_BLOCK','REMOVE_BLOCKS_BY_TYPE','REORDER_BLOCKS'].includes(action.type)) state={...state,generatedOutdated:true};
  switch (action.type) {
    case 'SET_STEP':
      // Navigation allein verändert kein bereits erzeugtes Ergebnis.
      return {
        ...state,
        step: action.step,
        generiertesDokument: state.generiertesDokument,
      };
    case 'SET_AUFTRAG':
      return { ...state, auftrag: action.auftrag };
    case 'SET_META':
      return { ...state, meta: { ...state.meta, ...action.meta } };
    case 'ADD_QUELLTEXT':
      return { ...state, quelltexte: [...state.quelltexte, action.quelltext] };
    case 'REMOVE_QUELLTEXT':
      return { ...state, quelltexte: state.quelltexte.filter((q) => q.id !== action.id) };
    case 'UPDATE_QUELLTEXT':
      return {
        ...state,
        quelltexte: state.quelltexte.map((q) =>
          q.id === action.id ? { ...q, ...action.quelltext } : q,
        ),
      };
    case 'ADD_BLOCK':
      return { ...state, bloecke: [...state.bloecke, action.block] };
    case 'UPDATE_BLOCK':
      return {
        ...state,
        bloecke: state.bloecke.map((b) =>
          b.id === action.id ? { ...b, ...action.block } as typeof b : b,
        ),
      };
    case 'REMOVE_BLOCK':
      return { ...state, bloecke: state.bloecke.filter((b) => b.id !== action.id) };
    case 'REMOVE_BLOCKS_BY_TYPE':
      return { ...state, bloecke: state.bloecke.filter((b) => b.typ !== action.typ) };
    case 'REORDER_BLOCKS':
      return { ...state, bloecke: action.bloecke };
    case 'SET_LLM_PROVIDER':
      return { ...state, llmProvider: action.provider };
    case 'SET_MODEL_NAME':
      return { ...state, modelName: action.name };
    case 'SET_KREATIVITAET':
      return { ...state, kreativitaet: action.value };
    case 'SET_AUSGABE_SPRACHE':
      return { ...state, ausgabeSprache: action.value };
    case 'SET_GENERIERTES_DOKUMENT':
      return { ...state, generiertesDokument: action.dokument, generatedOutdated:false };
    case 'SET_RENDER_TEMPLATE':
      return { ...state, renderTemplate: action.template };
    case 'SET_RENDER_LAYOUT':
      return { ...state, renderLayout: action.layout };
    case 'UPDATE_GENERIERTER_BLOCK':
      if (!state.generiertesDokument) return state;
      return {
        ...state,
        generiertesDokument: {
          ...state.generiertesDokument,
          bloecke: state.generiertesDokument.bloecke.map((b) =>
            b.id === action.id ? { ...b, ...action.block } as typeof b : b,
          ),
        },
      };
    case 'RESET_STATE':
      return createInitialState();
    case 'LOAD_SNAPSHOT':
      return {
        ...action.snapshot,
        step: action.snapshot.generiertesDokument ? 'generate' : 'baukasten',
        aktuelleDokumentId: action.documentId,
        renderTemplate: action.snapshot.renderTemplate ?? getDefaultTemplate(action.snapshot.meta.stufe).id,
        renderLayout: action.snapshot.renderLayout ?? 'standard',
      };
    case 'SET_DOCUMENT_ID':
      return { ...state, aktuelleDokumentId: action.id };
    default:
      return state;
  }
}

function createInitialState(): AppState {
  const settings = loadSettings();
  const meta = getDefaultMeta();
  return {
    step: 'absicht',
    auftrag: null,
    meta,
    quelltexte: [],
    bloecke: [],
    generiertesDokument: null,
    llmProvider: settings.defaultProvider,
    modelName: settings.defaultModel,
    kreativitaet: settings.defaultKreativitaet,
    ausgabeSprache: settings.defaultAusgabeSprache,
    aktuelleDokumentId: null,
    renderTemplate: getDefaultTemplate(meta.stufe).id,
    renderLayout: 'standard',
  };
}

export function useWizard() {
  const [state, rawDispatch] = useReducer(wizardReducer, undefined, () => {
    const initial = createInitialState();
    const draft = readDraft<AppState | null>('wizard', null);
    return draft && draft.meta && Array.isArray(draft.bloecke) && Array.isArray(draft.quelltexte) && STEPS_ORDER.includes(draft.step)
      ? { ...initial, ...draft } : initial;
  });
  useEffect(() => { writeDraft('wizard', state); }, [state]);

  const pastRef = useRef<AppState[]>([]);
  const futureRef = useRef<AppState[]>([]);

  const dispatch = useCallback((action: AppAction) => {
    if (action.type === 'UNDO') {
      if (pastRef.current.length === 0) return;
      const prev = pastRef.current.pop()!;
      futureRef.current.push(state);
      rawDispatch({ type: 'LOAD_SNAPSHOT', snapshot: {
        auftrag: prev.auftrag, meta: prev.meta, quelltexte: prev.quelltexte,
        bloecke: prev.bloecke, generiertesDokument: prev.generiertesDokument,
        generatedOutdated: prev.generatedOutdated, llmProvider: prev.llmProvider,
        modelName: prev.modelName, kreativitaet: prev.kreativitaet,
        ausgabeSprache: prev.ausgabeSprache, renderTemplate: prev.renderTemplate,
        renderLayout: prev.renderLayout,
      }, documentId: prev.aktuelleDokumentId });
      return;
    }
    if (action.type === 'REDO') {
      if (futureRef.current.length === 0) return;
      const next = futureRef.current.pop()!;
      pastRef.current.push(state);
      rawDispatch({ type: 'LOAD_SNAPSHOT', snapshot: {
        auftrag: next.auftrag, meta: next.meta, quelltexte: next.quelltexte,
        bloecke: next.bloecke, generiertesDokument: next.generiertesDokument,
        generatedOutdated: next.generatedOutdated, llmProvider: next.llmProvider,
        modelName: next.modelName, kreativitaet: next.kreativitaet,
        ausgabeSprache: next.ausgabeSprache, renderTemplate: next.renderTemplate,
        renderLayout: next.renderLayout,
      }, documentId: next.aktuelleDokumentId });
      return;
    }

    // Undo-Snapshot vor nicht-System-Actions
    if (!NON_UNDOABLE.has(action.type)) {
      pastRef.current.push(structuredClone(state));
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      if (CLEAR_REDO_ON.has(action.type)) futureRef.current = [];
    }

    rawDispatch(action);
  }, [state]);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);

  const currentIndex = STEPS_ORDER.indexOf(state.step);
  const canGoNext = currentIndex < STEPS_ORDER.length - 1 && !(state.step === 'absicht' && !state.auftrag);
  const canGoBack = currentIndex > 0;

  const goNext = useCallback(() => {
    if (canGoNext) {
      dispatch({ type: 'SET_STEP', step: STEPS_ORDER[currentIndex + 1]! });
    }
  }, [canGoNext, currentIndex, dispatch]);

  const goBack = useCallback(() => {
    if (canGoBack) {
      dispatch({ type: 'SET_STEP', step: STEPS_ORDER[currentIndex - 1]! });
    }
  }, [canGoBack, currentIndex, dispatch]);

  const goToStep = useCallback((step: StepId) => {
    dispatch({ type: 'SET_STEP', step });
  }, [dispatch]);

  return {
    state, dispatch, goNext, goBack, goToStep, currentIndex,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    undo, redo,
  };
}
