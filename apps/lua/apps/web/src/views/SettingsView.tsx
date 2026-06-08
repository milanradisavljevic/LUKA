import { useState } from 'react';
import { Check } from 'lucide-react';
import type { AppSettings, LlmProvider } from '../lib/types';
import { LLM_PROVIDERS } from '../lib/constants';
import { CREATIVITY_PRESETS } from '../lib/creativity';
import { loadSettings, saveSettings } from '../lib/storage';
import { SettingsPanel } from '../components/SettingsPanel';
import { ViewShell } from './_ViewShell';

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'Englisch' },
];

export function SettingsView() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [savedHint, setSavedHint] = useState(false);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 1500);
  };

  const handleProviderChange = (provider: LlmProvider) => {
    const def = LLM_PROVIDERS.find((p) => p.id === provider);
    const models = def?.models ?? [];
    const model = models.includes(settings.defaultModel) ? settings.defaultModel : (models[0] ?? '');
    update({ defaultProvider: provider, defaultModel: model });
  };

  const currentProvider = LLM_PROVIDERS.find((p) => p.id === settings.defaultProvider);
  const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' } as const;

  return (
    <ViewShell
      title="Einstellungen"
      description="API-Schlüssel und die Standard-Vorgaben für neue Dokumente."
    >
      {/* Abschnitt 1: Standard-Vorgaben */}
      <section style={{
        padding: '1.25rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Standard-Vorgaben</h3>
          {savedHint && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-success)' }}>
              <Check size={14} /> Gespeichert
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Diese Werte belegen ein <strong>neues</strong> Dokument vor. Bestehende Dokumente bleiben unverändert.
        </p>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div>
            <label style={labelStyle}>Standard-Anbieter</label>
            <select
              value={settings.defaultProvider}
              onChange={(e) => handleProviderChange(e.target.value as LlmProvider)}
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Standard-Modell</label>
            <select
              value={settings.defaultModel}
              onChange={(e) => update({ defaultModel: e.target.value })}
            >
              {(currentProvider?.models ?? []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Ausgabesprache</label>
            <select
              value={settings.defaultAusgabeSprache}
              onChange={(e) => update({ defaultAusgabeSprache: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <label style={labelStyle}>Standard-Kreativität</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CREATIVITY_PRESETS.map((preset) => {
              const active = Math.abs(preset.value - settings.defaultKreativitaet) < 0.001;
              return (
                <button
                  key={preset.id}
                  onClick={() => update({ defaultKreativitaet: preset.value })}
                  title={preset.description}
                  style={{
                    flex: 1, minWidth: 140, textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    border: active ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                    background: active ? 'var(--color-highlight-bg)' : 'var(--color-bg-surface)',
                    borderRadius: 'var(--radius)', cursor: 'pointer',
                  }}
                >
                  <strong style={{ fontSize: '0.8125rem' }}>{preset.label}</strong>
                  <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <label style={labelStyle}>KI-Gegenprüfung der Aufgaben</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => update({ judgeEnabled: !settings.judgeEnabled })}
              style={{
                position: 'relative',
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                background: settings.judgeEnabled ? 'var(--color-accent)' : 'var(--color-border)',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <span style={{
                position: 'absolute',
                top: 2,
                left: settings.judgeEnabled ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              {settings.judgeEnabled ? 'Aktiviert' : 'Deaktiviert'}
              {' — '}
              Prüft generierte Aufgaben per KI auf Mehrdeutigkeiten. Erhöht Generierungszeit leicht.
            </span>
          </div>
        </div>
      </section>

      {/* Abschnitt 2: API-Schlüssel */}
      <section style={{
        padding: '1.25rem', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
      }}>
        <SettingsPanel />
      </section>
    </ViewShell>
  );
}
