import { useRef, useState } from 'react';
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react';
import type { Meta } from '@lehrunterlagen/schema';
import type { AppAction, AppState } from '../lib/types';
import { readFileAsText } from '../lib/dateiText';
import { erkenneMuster, musterAlsParallelversion } from '../lib/musterImport';
import { PROVIDER_KEY_IDS } from '../lib/constants';
import { MODEL_MAP } from '../lib/runtimeModel';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  /** Fach, Stufe usw. aus Schritt 0 — gelten auch für die neue Unterlage. */
  basisMeta: Meta;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;
}

/**
 * „Aus vorhandener Unterlage“: Word/PDF hochladen, die KI überträgt die
 * Aufgaben in LUKA-Blöcke, danach geht es im Baukasten weiter (ergänzen,
 * streichen) und LUKA erzeugt eine Fassung mit neuem Inhalt.
 */
export function MusterImportKarte({ state, dispatch, basisMeta }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const hochladen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!isTauri()) {
      setFehler('Das Übertragen mit KI ist nur in der Desktop-App verfügbar.');
      return;
    }
    setBusy(true);
    setFehler(null);
    try {
      const dateiText = await readFileAsText(file, { zeilen: true });
      const { invoke } = await import('@tauri-apps/api/core');
      const uiProvider = state.llmProvider ?? 'deepseek';
      const provider = PROVIDER_KEY_IDS[uiProvider] ?? uiProvider;
      const model = MODEL_MAP[state.modelName] ?? state.modelName;
      const ergebnis = await erkenneMuster(dateiText, file.name, basisMeta, (system, messages) =>
        invoke<string>('llm_complete', { provider, model, system, messages, kreativitaet: 0.1 }));
      const { snapshot, brauchtNeuenQuelltext } = musterAlsParallelversion(state, ergebnis);
      dispatch({ type: 'LOAD_SNAPSHOT', snapshot, documentId: null });
      if (brauchtNeuenQuelltext) dispatch({ type: 'SET_STEP', step: 'input' });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Unbekannter Fehler.';
      setFehler(`Die Unterlage ließ sich nicht übertragen. ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ marginBottom: '1.25rem', padding: '0.875rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <FileUp size={18} color="var(--color-accent)" />
        <strong style={{ fontSize: '0.9375rem' }}>Aus vorhandener Unterlage</strong>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 0.6rem', lineHeight: 1.5 }}>
        Lade ein Arbeitsblatt oder eine Schularbeit als Word- oder PDF-Datei hoch. LUKA übernimmt die Aufgabenarten
        in den Baukasten; dort kannst du Aufgaben ergänzen oder streichen. Danach erstellt die KI eine neue Fassung
        mit anderen Sätzen und Inhalten. Fach und Stufe von oben gelten auch hier. Die Datei geht an den gewählten
        KI-Anbieter, lade daher keine Schülertexte oder Namen hoch.
      </p>
      <input ref={inputRef} type="file" accept=".docx,.pdf" onChange={hochladen} style={{ display: 'none' }} />
      <button
        type="button"
        className="btn-secondary"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
      >
        {busy ? <><Loader2 size={15} className="spin" /> Aufgaben werden übertragen …</> : <><FileUp size={15} /> Word- oder PDF-Datei wählen</>}
      </button>
      {fehler && (
        <p role="alert" style={{ fontSize: '0.8125rem', color: 'var(--color-error)', margin: '0.5rem 0 0', display: 'flex', alignItems: 'flex-start', gap: '0.375rem' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '0.15rem' }} /> {fehler}
        </p>
      )}
    </section>
  );
}
