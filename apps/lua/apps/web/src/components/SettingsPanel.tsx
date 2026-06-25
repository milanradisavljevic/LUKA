import { useState } from 'react';
import { LLM_PROVIDERS, PROVIDER_KEY_IDS } from '../lib/constants';
import { ProviderLogo } from './ProviderLogos';

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

interface SettingsPanelProps {
  onKeySaved?: () => void;
}

export function SettingsPanel({ onKeySaved }: SettingsPanelProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const tauriAvailable = isTauri();

  const handleSave = async (providerId: string) => {
    const key = keys[providerId];
    if (!key || !key.trim()) return;
    setErrors((prev) => ({ ...prev, [providerId]: '' }));
    setSaved((prev) => ({ ...prev, [providerId]: false }));
    setCleared((prev) => ({ ...prev, [providerId]: false }));

    try {
      if (!tauriAvailable) throw new Error('Nur in der Desktop-App verfügbar.');
      const { invoke } = await import('@tauri-apps/api/core');
      const keyId = PROVIDER_KEY_IDS[providerId] ?? providerId;
      await invoke('save_api_key', { provider: keyId, key: key.trim() });
      setSaved((prev) => ({ ...prev, [providerId]: true }));
      setKeys((prev) => ({ ...prev, [providerId]: '' }));
      setLoaded((prev) => ({ ...prev, [providerId]: '' }));
      onKeySaved?.();
    } catch (err) {
      setErrors((prev) => ({ ...prev, [providerId]: err instanceof Error ? err.message : 'Fehler beim Speichern' }));
    }
  };

  const handleLoad = async (providerId: string) => {
    setErrors((prev) => ({ ...prev, [providerId]: '' }));
    setSaved((prev) => ({ ...prev, [providerId]: false }));
    setCleared((prev) => ({ ...prev, [providerId]: false }));

    try {
      if (!tauriAvailable) throw new Error('Nur in der Desktop-App verfügbar.');
      const { invoke } = await import('@tauri-apps/api/core');
      const keyId = PROVIDER_KEY_IDS[providerId] ?? providerId;
      const result = await invoke<string>('load_api_key', { provider: keyId });
      const masked = result.length > 8
        ? `${result.slice(0, 4)}...${result.slice(-4)}`
        : '****';
      setLoaded((prev) => ({ ...prev, [providerId]: masked }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found') || msg.includes('No key')) {
        setLoaded((prev) => ({ ...prev, [providerId]: 'Kein Key gespeichert' }));
      } else {
        setErrors((prev) => ({ ...prev, [providerId]: msg }));
      }
    }
  };

  const handleDelete = async (providerId: string) => {
    setErrors((prev) => ({ ...prev, [providerId]: '' }));
    setSaved((prev) => ({ ...prev, [providerId]: false }));
    setCleared((prev) => ({ ...prev, [providerId]: false }));

    try {
      if (!tauriAvailable) throw new Error('Nur in der Desktop-App verfügbar.');
      const { invoke } = await import('@tauri-apps/api/core');
      const keyId = PROVIDER_KEY_IDS[providerId] ?? providerId;
      await invoke('delete_api_key', { provider: keyId });
      setCleared((prev) => ({ ...prev, [providerId]: true }));
      setLoaded((prev) => ({ ...prev, [providerId]: '' }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [providerId]: err instanceof Error ? err.message : 'Fehler beim Löschen' }));
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1.25rem' }}>API-Schlüssel verwalten</h2>

      {!tauriAvailable && (
        <div style={{
          padding: '1rem', marginBottom: '1rem', background: 'var(--color-warning-bg)', borderRadius: 'var(--radius)',
          border: '1px solid var(--color-warning)', fontSize: '0.875rem',
        }}>
          API-Schlüssel können nur in der Desktop-App verwaltet werden. Starte die App mit <code>pnpm run tauri dev</code>.
        </div>
      )}

      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        Schlüssel werden sicher im System-Keyring gespeichert und verlassen niemals den Rechner.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {LLM_PROVIDERS.map((provider) => (
            <div key={provider.id} style={{
              padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <ProviderLogo providerId={provider.id} label={provider.label} size={24} />
                <strong>{provider.label}</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="password"
                  placeholder="sk-... oder API-Key eingeben"
                  value={keys[provider.id] ?? ''}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                  disabled={!tauriAvailable}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
                <button
                  className="btn-primary"
                  onClick={() => handleSave(provider.id)}
                  disabled={!tauriAvailable || !keys[provider.id]?.trim()}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  Speichern
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleLoad(provider.id)}
                  disabled={!tauriAvailable}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  Prüfen
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(provider.id)}
                  disabled={!tauriAvailable}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  Löschen
                </button>
              </div>

              {saved[provider.id] && (
                <div style={{ color: 'var(--color-success)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  Schlüssel gespeichert.
                </div>
              )}
              {loaded[provider.id] && (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  Hinterlegter Key: <code>{loaded[provider.id]}</code>
                </div>
              )}
              {cleared[provider.id] && (
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  Schlüssel gelöscht.
                </div>
              )}
              {errors[provider.id] && (
                <div style={{ color: 'var(--color-error)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                  {errors[provider.id]}
                </div>
              )}
            </div>
        ))}
      </div>
    </div>
  );
}
