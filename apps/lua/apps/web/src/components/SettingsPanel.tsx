import { useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, Loader2, Save, ShieldCheck, Trash2, Wifi } from 'lucide-react';
import type { LlmProvider } from '../lib/types';
import { LLM_PROVIDERS } from '../lib/constants';
import {
  classifyProviderTestError,
  ensurePrimaryProviderKey,
  getPrimaryProviderKeyId,
  getProviderTestModel,
  markProviderSetupVerified,
  PROVIDER_ONBOARDING,
  unmarkProviderSetupVerified,
  type ProviderTestStatus,
} from '../lib/providerSetup';
import { ProviderLogo } from './ProviderLogos';

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

interface SettingsPanelProps {
  mode?: 'settings' | 'firstRun';
  onKeySaved?: () => void;
  onVerifiedContinue?: () => void;
}

const KEY_HINTS: Record<string, { placeholder: string; prefix?: string; label: string }> = {
  claude: { placeholder: 'sk-ant-...', prefix: 'sk-ant-', label: 'Claude-Keys beginnen meist mit sk-ant-' },
  chatgpt: { placeholder: 'sk-...', prefix: 'sk-', label: 'OpenAI-Keys beginnen meist mit sk-' },
  deepseek: { placeholder: 'sk-...', prefix: 'sk-', label: 'DeepSeek-Keys beginnen meist mit sk-' },
  mistral: { placeholder: 'Mistral API-Key eingeben', label: 'Mistral-Keys haben je nach Konto kein stabiles Prefix.' },
  qwen: { placeholder: 'sk-...', prefix: 'sk-', label: 'Qwen-Keys beginnen meist mit sk-' },
  kimi: { placeholder: 'sk-...', prefix: 'sk-', label: 'Kimi/Moonshot-Keys beginnen meist mit sk-' },
};

export function SettingsPanel({ mode = 'settings', onKeySaved, onVerifiedContinue }: SettingsPanelProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Record<string, ProviderTestStatus>>({});
  const [verifiedProvider, setVerifiedProvider] = useState<LlmProvider | null>(null);
  const tauriAvailable = isTauri();
  const firstRun = mode === 'firstRun';
  const recommendedProvider = LLM_PROVIDERS.find((provider) => PROVIDER_ONBOARDING[provider.id].recommended);

  const setProviderStatus = (providerId: string, next: ProviderTestStatus, error = '') => {
    setStatus((prev) => ({ ...prev, [providerId]: next }));
    setErrors((prev) => ({ ...prev, [providerId]: error }));
  };

  const runProviderTest = async (providerId: LlmProvider, key: string) => {
    if (!tauriAvailable) throw new Error('Nur in der Desktop-App verfügbar.');
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke<void>('test_provider_connection', {
      provider: getPrimaryProviderKeyId(providerId),
      model: getProviderTestModel(providerId),
      apiKey: key.trim(),
    });
  };

  const handleSaveAndTest = async (providerId: LlmProvider) => {
    const key = keys[providerId];
    if (!key || !key.trim()) return;
    setProviderStatus(providerId, 'testing');
    setCleared((prev) => ({ ...prev, [providerId]: false }));

    try {
      if (!tauriAvailable) throw new Error('Nur in der Desktop-App verfügbar.');
      const { invoke } = await import('@tauri-apps/api/core');
      const keyId = getPrimaryProviderKeyId(providerId);
      await runProviderTest(providerId, key);
      setProviderStatus(providerId, 'saving');
      await invoke('save_api_key', { provider: keyId, key: key.trim() });

      setProviderStatus(providerId, 'success');
      markProviderSetupVerified(providerId);
      setVerifiedProvider(providerId);
      setKeys((prev) => ({ ...prev, [providerId]: '' }));
      setLoaded((prev) => ({ ...prev, [providerId]: '' }));
      if (!firstRun) onKeySaved?.();
    } catch (err) {
      const kind = classifyProviderTestError(err);
      setProviderStatus(providerId, kind, err instanceof Error ? err.message : String(err));
    }
  };

  const handleShowSaved = async (providerId: LlmProvider) => {
    setProviderStatus(providerId, 'idle');
    setCleared((prev) => ({ ...prev, [providerId]: false }));

    try {
      if (!tauriAvailable) throw new Error('Nur in der Desktop-App verfügbar.');
      const { invoke } = await import('@tauri-apps/api/core');
      const stored = await ensurePrimaryProviderKey(
        providerId,
        (id) => invoke<string>('load_api_key', { provider: id }),
        (id, key) => invoke<void>('save_api_key', { provider: id, key }),
      );
      if (!stored) {
        setLoaded((prev) => ({ ...prev, [providerId]: 'Kein Key gespeichert' }));
        return;
      }
      const masked = stored.key.length > 8
        ? `${stored.key.slice(0, 4)}...${stored.key.slice(-4)}`
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

  const handleTestSaved = async (providerId: LlmProvider) => {
    setProviderStatus(providerId, 'testing');
    setCleared((prev) => ({ ...prev, [providerId]: false }));

    try {
      if (!tauriAvailable) throw new Error('Nur in der Desktop-App verfügbar.');
      const { invoke } = await import('@tauri-apps/api/core');
      const stored = await ensurePrimaryProviderKey(
        providerId,
        (id) => invoke<string>('load_api_key', { provider: id }),
        (id, key) => invoke<void>('save_api_key', { provider: id, key }),
      );
      if (!stored) throw new Error('Kein gespeicherter API-Key gefunden.');

      await runProviderTest(providerId, stored.key);
      setProviderStatus(providerId, 'success');
      markProviderSetupVerified(providerId);
      setVerifiedProvider(providerId);
      if (!firstRun) onKeySaved?.();
    } catch (err) {
      const kind = classifyProviderTestError(err);
      setProviderStatus(providerId, kind, err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (providerId: LlmProvider) => {
    setProviderStatus(providerId, 'idle');
    setCleared((prev) => ({ ...prev, [providerId]: false }));

    try {
      if (!tauriAvailable) throw new Error('Nur in der Desktop-App verfügbar.');
      const { invoke } = await import('@tauri-apps/api/core');
      const keyIds = Array.from(new Set([getPrimaryProviderKeyId(providerId), providerId]));
      let deleted = false;
      for (const keyId of keyIds) {
        try {
          await invoke<string>('load_api_key', { provider: keyId });
          await invoke('delete_api_key', { provider: keyId });
          deleted = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!/not found|no key|nicht gefunden/i.test(message)) throw err;
        }
      }
      if (!deleted) throw new Error('Kein gespeicherter API-Key gefunden.');
      unmarkProviderSetupVerified(providerId);
      if (verifiedProvider === providerId) setVerifiedProvider(null);
      setCleared((prev) => ({ ...prev, [providerId]: true }));
      setLoaded((prev) => ({ ...prev, [providerId]: '' }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [providerId]: err instanceof Error ? err.message : 'Fehler beim Löschen' }));
    }
  };

  const statusMessage = (providerId: string): { text: string; color: string; icon?: ReactNode } | null => {
    const current = status[providerId] ?? 'idle';
    if (current === 'saving') return { text: 'Schlüssel wird gespeichert …', color: 'var(--color-text-secondary)', icon: <Loader2 size={14} className="spin" /> };
    if (current === 'testing') return { text: 'Verbindung wird getestet …', color: 'var(--color-text-secondary)', icon: <Loader2 size={14} className="spin" /> };
    if (current === 'success') return { text: 'Verbindung erfolgreich getestet.', color: 'var(--color-success)', icon: <CheckCircle2 size={14} /> };
    if (current === 'invalid-key') return { text: 'API-Key wurde vom Anbieter abgelehnt.', color: 'var(--color-error)', icon: <AlertTriangle size={14} /> };
    if (current === 'network-error') return { text: 'Netzwerkfehler beim Provider-Test.', color: 'var(--color-error)', icon: <AlertTriangle size={14} /> };
    if (current === 'rate-limit-or-credit') return { text: 'Rate-Limit, Guthaben oder Abrechnung blockiert den Test.', color: 'var(--color-error)', icon: <AlertTriangle size={14} /> };
    if (current === 'model-error') return { text: 'Testmodell beim Anbieter nicht verfügbar.', color: 'var(--color-error)', icon: <AlertTriangle size={14} /> };
    if (current === 'provider-error') return { text: 'Provider-Test fehlgeschlagen.', color: 'var(--color-error)', icon: <AlertTriangle size={14} /> };
    return null;
  };

  if (firstRun && verifiedProvider) {
    const providerLabel = LLM_PROVIDERS.find((provider) => provider.id === verifiedProvider)?.label ?? 'Provider';
    return (
      <div>
        <div style={{
          padding: '1rem',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius)',
          background: 'var(--color-highlight-bg)',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>LUKA ist bereit</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Die Verbindung zu {providerLabel} wurde erfolgreich getestet. Du kannst jetzt die erste Unterlage erstellen.
          </p>
        </div>
        <button className="btn-primary" onClick={onVerifiedContinue} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckCircle2 size={16} />
          Erste Unterlage erstellen
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.25rem' }}>API-Schlüssel verwalten</h2>

      {firstRun && recommendedProvider && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius)',
          background: 'var(--color-highlight-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-accent)' }} />
            <strong>Empfohlen für den Start: {recommendedProvider.label}</strong>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            {PROVIDER_ONBOARDING[recommendedProvider.id].shortReason}
            {' '}
            {PROVIDER_ONBOARDING[recommendedProvider.id].privacyHint}
          </p>
        </div>
      )}

      {!tauriAvailable && (
        <div style={{
          padding: '1rem', marginBottom: '1rem', background: 'var(--color-warning-bg)', borderRadius: 'var(--radius)',
          border: '1px solid var(--color-warning)', fontSize: '0.875rem',
        }}>
          API-Key-Setup und KI-Generierung funktionieren nur in der Desktop-App.
          {import.meta.env.DEV && (
            <>
              {' '}Starte lokal mit <code>pnpm run tauri dev</code>.
            </>
          )}
        </div>
      )}

      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        Schlüssel werden lokal im System-Keyring gespeichert und bei API-Aufrufen direkt an den gewählten Anbieter übertragen.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {LLM_PROVIDERS.map((provider) => {
          const hint = KEY_HINTS[provider.id];
          const info = PROVIDER_ONBOARDING[provider.id];
          const value = keys[provider.id]?.trim() ?? '';
          const currentStatus = status[provider.id] ?? 'idle';
          const busy = currentStatus === 'saving' || currentStatus === 'testing';
          const msg = statusMessage(provider.id);
          const prefixWarning = hint?.prefix && value && !value.startsWith(hint.prefix)
            ? `Hinweis: ${hint.label}. Du kannst trotzdem speichern, falls dein Key anders aussieht.`
            : null;

          return (
            <div key={provider.id} style={{
              padding: '1rem',
              border: info.recommended && firstRun ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <ProviderLogo providerId={provider.id} label={provider.label} size={24} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{provider.label}</strong>
                    {info.recommended && firstRun && (
                      <span className="badge" style={{ fontSize: '0.6875rem', color: 'var(--color-accent)' }}>
                        Empfohlen
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                    {info.shortReason} {info.costHint}
                  </p>
                </div>
                <a
                  href={info.setupUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  API-Key erstellen
                  <ExternalLink size={13} />
                </a>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <label htmlFor={`provider-key-${provider.id}`} className="sr-only">API-Key für {provider.label}</label>
                <input
                  id={`provider-key-${provider.id}`}
                  type="password"
                  autoFocus={firstRun && info.recommended}
                  placeholder={hint?.placeholder ?? 'API-Key eingeben'}
                  value={keys[provider.id] ?? ''}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                  disabled={!tauriAvailable}
                  style={{ flex: '1 1 220px', minWidth: 0, fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
                <button
                  className="btn-primary"
                  onClick={() => handleSaveAndTest(provider.id as LlmProvider)}
                  disabled={!tauriAvailable || !keys[provider.id]?.trim() || busy}
                  aria-label={`API-Key für ${provider.label} speichern und testen`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  {busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  Speichern & testen
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleShowSaved(provider.id as LlmProvider)}
                  disabled={!tauriAvailable || busy}
                  aria-label={`Gespeicherten API-Key für ${provider.label} anzeigen`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <Eye size={14} />
                  Anzeigen
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleTestSaved(provider.id as LlmProvider)}
                  disabled={!tauriAvailable || busy}
                  aria-label={`Verbindung zu ${provider.label} testen`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <Wifi size={14} />
                  Verbindung testen
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(provider.id as LlmProvider)}
                  disabled={!tauriAvailable || busy}
                  aria-label={`API-Key für ${provider.label} löschen`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <Trash2 size={14} />
                  Löschen
                </button>
              </div>

              {(prefixWarning || hint?.label) && (
                <div style={{ color: prefixWarning ? 'var(--color-warning)' : 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                  {prefixWarning ?? hint?.label}
                </div>
              )}
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                {info.privacyHint}
              </div>

              {msg && (
                <div style={{ color: msg.color, fontSize: '0.8125rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {msg.icon}
                  {msg.text}
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
          );
        })}
      </div>
    </div>
  );
}
