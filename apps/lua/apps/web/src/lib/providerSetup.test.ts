import { describe, expect, it, vi } from 'vitest';
import {
  buildProviderTestPayload,
  classifyProviderTestError,
  ensurePrimaryProviderKey,
  getPrimaryProviderKeyId,
  getProviderKeyLookupIds,
  getProviderTestModel,
  getVerifiedProviders,
  isProviderSetupVerified,
  isProviderTestSuccess,
  markProviderSetupVerified,
  PROVIDER_ONBOARDING,
  shouldOpenProviderSetup,
  unmarkProviderSetupVerified,
} from './providerSetup';
import { LLM_PROVIDERS } from './constants';

describe('providerSetup', () => {
  it('loest Claude auf den Runtime-Provider anthropic auf', () => {
    expect(getPrimaryProviderKeyId('claude')).toBe('anthropic');
  });

  it('prueft fuer Claude den neuen und den Legacy-Key', () => {
    expect(getProviderKeyLookupIds('claude')).toEqual(['anthropic', 'claude']);
  });

  it('migriert einen Legacy-Claude-Key auf den Runtime-Provider', async () => {
    const saved: Record<string, string> = { claude: 'sk-ant-legacy' };
    const writes: Array<[string, string]> = [];

    const result = await ensurePrimaryProviderKey(
      'claude',
      async (providerId) => {
        const key = saved[providerId];
        if (!key) throw new Error('missing');
        return key;
      },
      async (providerId, key) => {
        writes.push([providerId, key]);
        saved[providerId] = key;
      },
    );

    expect(result).toEqual({ providerId: 'anthropic', key: 'sk-ant-legacy' });
    expect(writes).toEqual([['anthropic', 'sk-ant-legacy']]);
  });

  it('verwendet den Legacy-Key weiter, wenn seine Migration scheitert', async () => {
    const result = await ensurePrimaryProviderKey(
      'claude',
      async (providerId) => {
        if (providerId === 'claude') return 'sk-ant-legacy';
        throw new Error('missing');
      },
      async () => { throw new Error('keyring locked'); },
    );

    expect(result).toEqual({ providerId: 'claude', key: 'sk-ant-legacy' });
  });

  it('markiert genau Mistral als empfohlenen Pilot-Provider', () => {
    const recommended = LLM_PROVIDERS.filter((provider) => PROVIDER_ONBOARDING[provider.id].recommended);
    expect(recommended.map((provider) => provider.id)).toEqual(['mistral']);
  });

  it('hat vollstaendige Onboarding-Metadaten fuer jeden Provider', () => {
    for (const provider of LLM_PROVIDERS) {
      const info = PROVIDER_ONBOARDING[provider.id];
      expect(info.setupUrl).toMatch(/^https:\/\//);
      expect(info.testModel.length).toBeGreaterThan(0);
      expect(info.shortReason.length).toBeGreaterThan(0);
      expect(info.privacyHint.length).toBeGreaterThan(0);
      expect(info.costHint.length).toBeGreaterThan(0);
    }
  });

  it('nutzt explizite Testmodelle je Provider', () => {
    expect(getProviderTestModel('claude')).toBe('claude-haiku-4-5-20251001');
    expect(getProviderTestModel('chatgpt')).toBe('gpt-5.4-nano');
    expect(getProviderTestModel('mistral')).toBe('mistral-small-2603');
  });

  it('baut einen minimalen Verbindungstest ohne Nutzdaten', () => {
    const payload = buildProviderTestPayload('claude');

    expect(payload).toMatchObject({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      kreativitaet: 0,
    });
    expect(payload.messages).toEqual([
      { role: 'user', content: 'Antworte nur mit {"ok":true}. Keine Erklaerung.' },
    ]);
    expect(JSON.stringify(payload).toLowerCase()).not.toContain('schueler');
    expect(JSON.stringify(payload).toLowerCase()).not.toContain('quelltext');
  });

  it('wertet jede nicht-leere Antwort als erfolgreichen Provider-Test', () => {
    expect(isProviderTestSuccess('{"ok":true}')).toBe(true);
    expect(isProviderTestSuccess('  ')).toBe(false);
  });

  it('klassifiziert haeufige Provider-Testfehler', () => {
    expect(classifyProviderTestError('HTTP 401 invalid api key')).toBe('invalid-key');
    expect(classifyProviderTestError('Netzwerkfehler: timeout')).toBe('network-error');
    expect(classifyProviderTestError('HTTP 429 quota exceeded, add credits')).toBe('rate-limit-or-credit');
    expect(classifyProviderTestError('model does not exist')).toBe('model-error');
    expect(classifyProviderTestError('invalid model')).toBe('model-error');
    expect(classifyProviderTestError('HTTP 500 server exploded')).toBe('provider-error');
  });

  it('merkt einen erfolgreich getesteten Provider lokal', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
    });

    expect(isProviderSetupVerified('mistral')).toBe(false);
    markProviderSetupVerified('mistral');
    expect(isProviderSetupVerified('mistral')).toBe(true);
    expect(getVerifiedProviders()).toEqual(['mistral']);
    unmarkProviderSetupVerified('mistral');
    expect(isProviderSetupVerified('mistral')).toBe(false);

    vi.unstubAllGlobals();
  });

  it('öffnet das First-Run-Gate bis ein Test erfolgreich war', () => {
    const stored = [{ provider: 'mistral' as const, key: 'sk-test' }];
    expect(shouldOpenProviderSetup(stored, [])).toBe(true);
    expect(shouldOpenProviderSetup(stored, ['mistral'])).toBe(false);
  });

  it('öffnet das First-Run-Gate erneut, wenn kein Key mehr vorhanden ist', () => {
    expect(shouldOpenProviderSetup([null, { provider: 'mistral', key: '  ' }], ['mistral'])).toBe(true);
  });
});
