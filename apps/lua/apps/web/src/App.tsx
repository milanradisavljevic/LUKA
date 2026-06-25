import { useState, useEffect, useCallback } from 'react';
import { Save, Command, ArrowLeft, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import type { AppAction, ActiveView, SavedDocument } from './lib/types';
import { STEP_DESCRIPTIONS } from './lib/types';
import { fachLabel } from '@lehrunterlagen/schema';
import type { Meta, Block } from '@lehrunterlagen/schema';
import { useWizard } from './hooks/useWizard';
import { useTheme } from './hooks/useTheme';
import { useZoom } from './hooks/useZoom';
import { WizardStepper } from './components/WizardStepper';
import { Step0_Absicht } from './components/Step0_Absicht';
import { Step1_Input } from './components/Step1_Input';
import { Step2_Baukasten } from './components/Step2_Baukasten';
import { Step3_LLMOptions } from './components/Step3_LLMOptions';
import { Step4_Generate } from './components/Step4_Generate';
import { TemplateManager } from './components/TemplateManager';
import { CommandPalette } from './components/CommandPalette';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { KlassenView } from './views/KlassenView';
import { DocumentsView } from './views/DocumentsView';
import { FavoritesView } from './views/FavoritesView';
import { TrashView } from './views/TrashView';
import { HistoryView } from './views/HistoryView';
import { TemplatesView } from './views/TemplatesView';
import { HelpView } from './views/HelpView';
import { SettingsView } from './views/SettingsView';
import { KorrekturView } from './views/KorrekturView';
import { SchuelerView } from './views/SchuelerView';
import { DashboardView } from './views/DashboardView';
import { ErwartungshorizontView } from './views/ErwartungshorizontView';
import { KompetenzView } from './views/KompetenzView';
import { QuickExerciseView } from './views/QuickExerciseView';
import { setPendingUebung } from './lib/korrekturBridge';
import { createDefaultBlock } from './lib/blockDefaults';
import type { NataschaPrefill } from './lib/nataschaBridge';
import { loadDocuments, upsertDocument, snapshotFromState, saveTemplate, deleteTemplate, loadTemplates, hydrateCache, isHydrated, setPersistErrorHandler } from './lib/storage';
import { Toast, type ToastMessage } from './components/Toast';
import { SettingsPanel } from './components/SettingsPanel';
import { FEATURES } from './lib/features';
import { PROVIDER_KEY_IDS } from './lib/constants';
import './App.css';

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

/** Seitentitel je Ansicht — ersetzt die Marken-Dopplung im Header. */
const VIEW_TITLES: Record<ActiveView, string> = {
  dashboard: 'Übersicht',
  wizard: 'Neue Unterlage',
  kompetenz: 'Kompetenz-Übung',
  quick: 'Schnell-Übung',
  documents: 'Meine Unterlagen',
  klassen: 'Meine Klassen',
  korrektur: 'Korrektur',
  schueler: 'Schüler',
  erwartungshorizont: 'Erwartungshorizont',
  templates: 'Vorlagen',
  history: 'Verlauf',
  favorites: 'Favoriten',
  trash: 'Papierkorb',
  settings: 'Einstellungen',
  help: 'Hilfe',
};

export default function App() {
  const [hydrating, setHydrating] = useState(!isHydrated());

  useEffect(() => {
    if (!isHydrated()) {
      hydrateCache().then(() => setHydrating(false));
    }
  }, []);

  const { state, dispatch, goNext, goBack, goToStep, currentIndex } = useWizard();
  const { resolved: theme, toggle: toggleTheme } = useTheme();
  const { zoom, reset: resetZoom } = useZoom();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  // Cross-Nav: aus der Korrektur zu einem bestimmten Schüler springen.
  const [pendingSchueler, setPendingSchueler] = useState<{ klasse: string; id: number } | null>(null);
  // First-Run-Onboarding: mindestens ein API-Key nötig, bevor die App bedienbar ist.
  const [keyGateOpen, setKeyGateOpen] = useState(false);

  // Stille DB-Write-Fehler sichtbar machen (vorher nur console.error).
  useEffect(() => {
    setPersistErrorHandler((cmd) => {
      setToast({ id: Date.now(), text: `Speichern fehlgeschlagen (${cmd}). Änderung evtl. nicht gesichert.`, kind: 'error' });
    });
    return () => setPersistErrorHandler(null);
  }, []);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // First-Run-Onboarding: bei 0 hinterlegten Keys das Key-Gate zeigen.
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const keyIds = [...new Set(Object.values(PROVIDER_KEY_IDS))];
        const keys = await Promise.all(
          keyIds.map((id) => invoke<string>('load_api_key', { provider: id }).catch(() => '')),
        );
        if (!cancelled && keys.every((k) => !k)) {
          setKeyGateOpen(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if (e.key === 'Escape' && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paletteOpen]);

  const handlePaletteActions = useCallback((actions: AppAction | AppAction[]) => {
    const arr = Array.isArray(actions) ? actions : [actions];
    for (const action of arr) {
      if (action.type === 'REMOVE_BLOCK' && action.id === '__last__') {
        const blocks = state.bloecke;
        if (blocks.length > 0) {
          dispatch({ type: 'REMOVE_BLOCK', id: blocks[blocks.length - 1]!.id });
        }
      } else if (action.type === 'UPDATE_BLOCK' && action.id === '__last__') {
        const blocks = state.bloecke;
        if (blocks.length > 0) {
          dispatch({ type: 'UPDATE_BLOCK', id: blocks[blocks.length - 1]!.id, block: action.block });
        }
      } else if (action.type === 'SET_META' && typeof action.meta.notizen === 'string' && action.meta.notizen.startsWith('__TEMPLATE_')) {
        const parts = action.meta.notizen.split(':');
        if (parts[0] === '__TEMPLATE_SAVE' && parts[1]) {
          const name = parts.slice(1).join(':');
          try {
            const tpl = {
              id: `tpl_${name.replace(/ /g, '_')}`,
              name, meta: state.meta,
              bloecke: state.bloecke.map((b) => ({
                typ: b.typ, punkte: b.punkte,
                arbeitsanweisung: b.arbeitsanweisung, clue: b.clue, config: b.config,
              })),
              savedAt: new Date().toISOString(),
            };
            saveTemplate(tpl);
          } catch { /* ignore */ }
        }
      } else {
        dispatch(action);
      }
    }
  }, [dispatch, state.bloecke, state.meta]);

  const handlePaletteExport = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: 'generate' });
  }, [dispatch]);

  const handleLoadTemplate = (meta: Meta, bloecke: Block[]) => {
    dispatch({ type: 'SET_META', meta });
    dispatch({ type: 'REORDER_BLOCKS', bloecke });
    setActiveView('wizard');
    goToStep('baukasten');
  };

  const handleSaveDocument = useCallback(() => {
    const existing = state.aktuelleDokumentId
      ? loadDocuments().find((d) => d.id === state.aktuelleDokumentId)
      : undefined;
    const now = new Date().toISOString();
    const id = existing?.id ?? crypto.randomUUID();
    const doc: SavedDocument = {
      id,
      title: state.meta.thema?.trim() || 'Unbenannt',
      savedAt: existing?.savedAt ?? now,
      updatedAt: now,
      isFavorite: existing?.isFavorite ?? false,
      isDeleted: false,
      deletedAt: null,
      snapshot: snapshotFromState(state),
    };
    upsertDocument(doc);
    if (state.aktuelleDokumentId !== id) {
      dispatch({ type: 'SET_DOCUMENT_ID', id });
    }
    setSaveMsg('Gespeichert');
    window.setTimeout(() => setSaveMsg(null), 2000);
  }, [state, dispatch]);

  const handleOpenDocument = useCallback((doc: SavedDocument) => {
    const hasWork = state.bloecke.length > 0 || state.generiertesDokument !== null;
    if (hasWork && !window.confirm('Aktuellen Stand verwerfen und das gespeicherte Dokument laden?')) {
      return;
    }
    dispatch({ type: 'LOAD_SNAPSHOT', snapshot: doc.snapshot, documentId: doc.id });
    setActiveView('wizard');
  }, [state.bloecke.length, state.generiertesDokument, dispatch]);

  const handleNewDocument = useCallback(() => {
    const hasWork = state.bloecke.length > 0 || state.generiertesDokument !== null;
    if (hasWork && !window.confirm('Aktuellen Stand verwerfen und ein neues Dokument beginnen?')) {
      return;
    }
    dispatch({ type: 'RESET_STATE' });
    setActiveView('wizard');
  }, [state.bloecke.length, state.generiertesDokument, dispatch]);

  const handleStartQuickExercise = useCallback((config: { fach: 'deutsch' | 'englisch'; stufe: 'unterstufe' | 'oberstufe'; typ: Block['typ']; thema: string }) => {
    const hasWork = state.bloecke.length > 0 || state.generiertesDokument !== null;
    if (hasWork && !window.confirm('Aktuellen Stand verwerfen und eine schnelle Übung beginnen?')) {
      return;
    }
    const heute = new Date().toISOString().slice(0, 10);
    const meta: Meta = {
      stufe: config.stufe,
      fach: config.fach,
      thema: config.thema,
      datum: heute,
      klasse: '',
      notizen: '',
      typ: 'schuluebung',
      punkteAusblenden: true,
      schwierigkeit: 'mittel',
    };
    const block = createDefaultBlock(config.typ, meta);
    dispatch({ type: 'RESET_STATE' });
    dispatch({ type: 'SET_META', meta });
    dispatch({ type: 'ADD_BLOCK', block });
    dispatch({ type: 'SET_STEP', step: 'baukasten' });
    setActiveView('wizard');
  }, [state.bloecke.length, state.generiertesDokument, dispatch]);

  // Closed Loop: aus der Korrektur-Heatmap ein Übungsblatt im Generator starten.
  const handleGenerateUebung = useCallback((prefill: NataschaPrefill) => {
    const hasWork = state.bloecke.length > 0 || state.generiertesDokument !== null;
    if (hasWork && !window.confirm('Aktuellen Stand verwerfen und ein Übungsblatt zu den Fehlerschwerpunkten beginnen?')) {
      return;
    }
    setPendingUebung(prefill);
    dispatch({ type: 'RESET_STATE' });
    setActiveView('wizard');
  }, [state.bloecke.length, state.generiertesDokument, dispatch]);

  // Cross-Nav: Klick auf einen Schülernamen in der Korrektur → Schüler-Ansicht.
  const handleOpenSchueler = useCallback((klasse: string, id: number) => {
    setPendingSchueler({ klasse, id });
    setActiveView('schueler');
  }, []);

  const renderStep = () => {
    switch (state.step) {
      case 'absicht':
        return <Step0_Absicht state={state} dispatch={dispatch} onNavigateToTemplates={() => setActiveView('templates')} onNavigateToKompetenz={() => setActiveView('kompetenz')} />;
      case 'input':
        return <Step1_Input state={state} dispatch={dispatch} />;
      case 'baukasten':
        return <Step2_Baukasten state={state} dispatch={dispatch} />;
      case 'llm':
        return <Step3_LLMOptions state={state} dispatch={dispatch} onNavigateToSettings={() => setActiveView('settings')} />;
      case 'generate':
        return <Step4_Generate state={state} dispatch={dispatch} />;
    }
  };

  const renderView = () => {
    const nataschaViews: ActiveView[] = ['klassen', 'korrektur', 'schueler', 'erwartungshorizont'];
    if (!FEATURES.natascha && nataschaViews.includes(activeView)) {
      return <DashboardView onNavigate={(v) => setActiveView(v)} onStartQuickExercise={handleStartQuickExercise} />;
    }

    switch (activeView) {
      case 'wizard':
if (hydrating) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
        <span style={{ marginLeft: '0.75rem', fontSize: '0.9375rem' }}>Datenbank wird geladen …</span>
      </div>
    );
  }

  return (
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <WizardStepper currentStep={state.step} onStepClick={goToStep} />
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Schritt {currentIndex + 1}/5 — {STEP_DESCRIPTIONS[state.step]}
            </p>
            <div style={{ marginTop: '1.25rem' }}>{renderStep()}</div>
          </div>
        );
      case 'dashboard':
        return <DashboardView onNavigate={(v) => setActiveView(v)} onStartQuickExercise={handleStartQuickExercise} />;
      case 'documents':
        return <DocumentsView onOpenDocument={handleOpenDocument} onNavigate={(v) => setActiveView(v)} />;
      case 'favorites':
        return <FavoritesView onOpenDocument={handleOpenDocument} onNavigate={(v) => setActiveView(v)} />;
      case 'trash':
        return <TrashView onCreateNew={handleNewDocument} />;
      case 'history':
        return <HistoryView onCreateNew={handleNewDocument} />;
      case 'templates':
        return <TemplatesView meta={state.meta} bloecke={state.bloecke} onLoad={handleLoadTemplate} />;
      case 'korrektur':
        return <KorrekturView onOpenSchueler={handleOpenSchueler} />;
      case 'schueler':
        return <SchuelerView preselect={pendingSchueler} onConsumePreselect={() => setPendingSchueler(null)} onGenerateUebung={handleGenerateUebung} />;
      case 'klassen':
        return <KlassenView onGenerateUebung={handleGenerateUebung} />;
      case 'kompetenz':
        return (
          <KompetenzView
            state={state}
            dispatch={dispatch}
            onNavigateToWizard={() => setActiveView('wizard')}
          />
        );
      case 'erwartungshorizont':
        return <ErwartungshorizontView />;
      case 'quick':
        return <QuickExerciseView dispatch={dispatch} onDone={() => setActiveView('wizard')} />;
      case 'settings':
        return <SettingsView />;
      case 'help':
        return <HelpView />;
    }
  };

  const isWizard = activeView === 'wizard';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {!isMobile && (
        <Sidebar
          currentView={activeView}
          onViewChange={setActiveView}
          onNewDocument={handleNewDocument}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Kopfleiste */}
        <header className="paper" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                {VIEW_TITLES[activeView]}
              </h1>
            </div>
            <button
              className="badge badge-context"
              onClick={() => { setActiveView('wizard'); goToStep('absicht'); }}
              title="Zur Absicht (Fach, Stufe, Klasse \u00E4ndern)"
              style={{ border: 'none', cursor: 'pointer' }}
            >
              <BookOpen size={12} />
              {fachLabel(state.meta.fach)}
              {' '}&middot;{' '}
              {state.meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'}
              {state.meta.klasse ? ` \u00B7 ${state.meta.klasse}` : ''}
              {state.meta.modus === 'kompetenz' ? ' \u00B7 Kompetenz' : ''}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {saveMsg && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>{saveMsg}</span>
            )}
            <button className="btn-secondary" onClick={() => setPaletteOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
              title="Befehl eingeben (Ctrl+K)">
              <Command size={14} /> Befehle
            </button>
            {isWizard && (
              <>
                <button className="btn-secondary" onClick={handleSaveDocument}
                  disabled={state.bloecke.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
                  title={state.bloecke.length === 0 ? 'Erst Blöcke anlegen' : 'Dokument speichern'}>
                  <Save size={14} /> Speichern
                </button>
                <TemplateManager meta={state.meta} bloecke={state.bloecke} onLoad={handleLoadTemplate} />
              </>
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {/* Hauptbereich */}
        <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: 'var(--color-bg-base)' }}>
          {renderView()}
        </main>

        {/* Footer-Navigation (nur im Assistenten) */}
        {isWizard && (
          <footer style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1.25rem',
            background: 'var(--color-bg-surface)',
            borderTop: '1px solid var(--color-border)',
          }}>
            {currentIndex > 0 ? (
              <button className="btn-secondary" onClick={goBack}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <ArrowLeft size={16} /> Zurück
              </button>
            ) : <div />}
            {currentIndex < 4 && (
              <button className="btn-primary" onClick={goNext}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                Weiter <ArrowRight size={16} />
              </button>
            )}
          </footer>
        )}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onActions={handlePaletteActions}
        onNavigate={(dir) => dir === 'next' ? goNext() : goBack()}
        onExport={handlePaletteExport}
        blockCount={state.bloecke.length}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* First-Run-Onboarding: API-Key-Gate */}
      {keyGateOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--color-bg-base)',
          zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
          <div style={{
            maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto',
            background: 'var(--color-bg-surface)', borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)', padding: '1.5rem', boxShadow: 'var(--shadow)',
          }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Willkommen bei LUKA</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              Um die KI-Funktionen nutzen zu können, hinterlege mindestens einen API-Key.
              Der Schlüssel bleibt lokal im System-Keyring und verlässt niemals den Rechner.
            </p>
            <SettingsPanel onKeySaved={() => setKeyGateOpen(false)} />
          </div>
        </div>
      )}

      {/* Zoom-Anzeige */}
      {zoom !== 1.0 && (
        <div style={{
          position: 'fixed', top: 52, right: 12,
          padding: '4px 10px', borderRadius: 'var(--radius)',
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          fontSize: '0.75rem', color: 'var(--color-text-secondary)',
          boxShadow: 'var(--shadow)', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          Zoom: {Math.round(zoom * 100)}%
          <button onClick={resetZoom} className="btn-secondary" style={{ fontSize: '0.6875rem', padding: '2px 6px' }}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
