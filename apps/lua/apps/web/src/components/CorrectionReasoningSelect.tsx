import { useEffect, useId, useState } from 'react';
import { loadSettings } from '../lib/storage';
import { MODEL_MAP } from '../lib/runtimeModel';
import { PROVIDER_KEY_IDS } from '../lib/constants';

export function correctionReasoningKey(provider: string, model: string): string {
  return `${PROVIDER_KEY_IDS[provider] ?? provider}:${MODEL_MAP[model] ?? model}`;
}

interface Options { default: string; options: { id: string; label: string }[] }
export async function loadCorrectionReasoningOptions(provider: string, model: string): Promise<Options> {
  const { invoke } = await import('@tauri-apps/api/core');
  const settings = loadSettings();
  const raw = await invoke<string>('natascha_model_options', {
    dir: settings.nataschaDir ?? '', python: settings.pythonCommand ?? '',
    provider: PROVIDER_KEY_IDS[provider] ?? provider, model: MODEL_MAP[model] ?? model,
  });
  const result: Options = JSON.parse(raw);
  if (!Array.isArray(result.options) || !result.options.some(option => option.id === result.default)) throw new Error('Ungültige Modelloptionen');
  return result;
}


export function CorrectionReasoningSelect({ provider, model, value, onChange, disabled = false }: {
  provider: string; model: string; value?: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setOptions(null); setError('');
    void (async () => {
      try {
        const result = await loadCorrectionReasoningOptions(provider, model);
        if (active) setOptions(result);
      } catch {
        if (active) setError('Denkoptionen konnten nicht geladen werden. Bitte Korrektur-Modul prüfen.');
      }
    })();
    return () => { active = false; };
  }, [provider, model]);
  const selected = value ?? options?.default ?? 'default';
  return <div style={{ marginTop: '0.5rem' }}>
    <label htmlFor={id}>Denkmodus für Korrekturen</label>
    <select id={id} disabled={disabled || !options} value={selected} onChange={event => onChange(event.target.value)}>
      {!options && <option value={selected}>{error ? 'Nicht verfügbar' : 'Wird geladen …'}</option>}
      {options?.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      {options && !options.options.some(option => option.id === selected) && <option value={selected}>Gespeicherte Auswahl nicht unterstützt</option>}
    </select>
    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0' }}>
      {error || 'Mehr Denkaufwand kann länger dauern und mehr kosten. Es werden nur die Möglichkeiten dieses Modells angeboten.'}
    </p>
  </div>;
}
