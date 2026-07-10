import type { LlmProvider } from './types';
import { LLM_PROVIDERS, PROVIDER_KEY_IDS } from './constants';
import { MODELS, getModelInfo } from './models';

export type ProviderTestStatus =
  | 'idle'
  | 'saving'
  | 'testing'
  | 'success'
  | 'invalid-key'
  | 'network-error'
  | 'rate-limit-or-credit'
  | 'model-error'
  | 'provider-error';

export interface ProviderOnboardingInfo {
  setupUrl: string;
  recommended: boolean;
  shortReason: string;
  privacyHint: string;
  costHint: string;
  testModel: string;
}

export interface ProviderTestPayload {
  provider: string;
  model: string;
  system: string;
  messages: Array<{ role: 'user'; content: string }>;
  kreativitaet: number;
}

export const PROVIDER_SETUP_VERIFIED_KEY = 'luka-provider-setup-verified';

export const PROVIDER_ONBOARDING: Record<LlmProvider, ProviderOnboardingInfo> = {
  claude: {
    setupUrl: 'https://console.anthropic.com/settings/keys',
    recommended: false,
    shortReason: 'Sehr gute Qualität für komplexe Aufgaben.',
    privacyHint: 'US-Anbieter, keine DSGVO-Garantie.',
    costHint: 'Teurer als Mistral/DeepSeek, stark bei anspruchsvollen Texten.',
    testModel: 'claude-haiku-4-5-20251001',
  },
  chatgpt: {
    setupUrl: 'https://platform.openai.com/api-keys',
    recommended: false,
    shortReason: 'Bekannter Allrounder mit guter Qualität.',
    privacyHint: 'US-Anbieter, keine DSGVO-Garantie.',
    costHint: 'Je nach Modell mittlere bis höhere Kosten.',
    testModel: 'gpt-5.4-nano',
  },
  deepseek: {
    setupUrl: 'https://platform.deepseek.com/api_keys',
    recommended: false,
    shortReason: 'Sehr günstig, gut für unkritische Tests.',
    privacyHint: 'Chinesischer Anbieter, nur für selbst verfasste Inhalte.',
    costHint: 'Sehr niedrige Token-Kosten.',
    testModel: 'deepseek-v4-flash',
  },
  mistral: {
    setupUrl: 'https://console.mistral.ai/api-keys/',
    recommended: true,
    shortReason: 'Empfohlen für den Start: EU-Anbieter und gute Allround-Qualität.',
    privacyHint: 'EU-Anbieter mit DSGVO-freundlicher Ausgangslage.',
    costHint: 'Günstiger Einstieg mit kleinen Modellen, solide Pilot-Kosten.',
    testModel: 'mistral-small-2603',
  },
  qwen: {
    setupUrl: 'https://bailian.console.aliyun.com/?tab=model#/api-key',
    recommended: false,
    shortReason: 'Stark bei langen Kontexten und mehrsprachigen Aufgaben.',
    privacyHint: 'Chinesischer Anbieter, nur für selbst verfasste Inhalte.',
    costHint: 'Günstig bis mittel, abhängig vom Modell.',
    testModel: 'qwen3.5-plus',
  },
  kimi: {
    setupUrl: 'https://platform.moonshot.ai/console/api-keys',
    recommended: false,
    shortReason: 'Gut für lange Kontexte und unkritische Experimente.',
    privacyHint: 'Chinesischer Anbieter, nur für selbst verfasste Inhalte.',
    costHint: 'Günstig bis mittel, abhängig vom Modell.',
    testModel: 'moonshot-v1-8k',
  },
};

export function getVerifiedProviders(): LlmProvider[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(PROVIDER_SETUP_VERIFIED_KEY);
    if (!raw || raw === '1') return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(LLM_PROVIDERS.map((provider) => provider.id));
    return parsed.filter((provider): provider is LlmProvider => typeof provider === 'string' && valid.has(provider as LlmProvider));
  } catch {
    return [];
  }
}

export function isProviderSetupVerified(provider: LlmProvider): boolean {
  return getVerifiedProviders().includes(provider);
}

export function markProviderSetupVerified(provider: LlmProvider): void {
  try {
    const verified = new Set(getVerifiedProviders());
    verified.add(provider);
    localStorage.setItem(PROVIDER_SETUP_VERIFIED_KEY, JSON.stringify([...verified]));
  } catch {
    // Best effort only; the current successful test still closes the active gate.
  }
}

export function unmarkProviderSetupVerified(provider: LlmProvider): void {
  try {
    const verified = getVerifiedProviders().filter((entry) => entry !== provider);
    localStorage.setItem(PROVIDER_SETUP_VERIFIED_KEY, JSON.stringify(verified));
  } catch {
    // Best effort only.
  }
}

/** Entscheidet zentral, ob das First-Run-Gate geöffnet werden muss. */
export function shouldOpenProviderSetup(
  storedKeys: Array<{ provider: LlmProvider; key: string } | null>,
  verifiedProviders: LlmProvider[],
): boolean {
  const verified = new Set(verifiedProviders);
  return !storedKeys.some((entry) => entry?.key.trim() && verified.has(entry.provider));
}

export function getPrimaryProviderKeyId(provider: LlmProvider | string): string {
  return PROVIDER_KEY_IDS[provider] ?? provider;
}

export function getProviderKeyLookupIds(provider: LlmProvider | string): string[] {
  const primary = getPrimaryProviderKeyId(provider);
  const legacy = provider === 'claude' ? ['claude'] : [];
  return Array.from(new Set([primary, ...legacy]));
}

export async function loadAvailableProviderKey(
  provider: LlmProvider,
  loadKey: (providerId: string) => Promise<string>,
): Promise<{ key: string; providerId: string } | null> {
  for (const providerId of getProviderKeyLookupIds(provider)) {
    try {
      const key = await loadKey(providerId);
      if (key.trim()) return { key, providerId };
    } catch {
      // Try next alias.
    }
  }
  return null;
}

export async function ensurePrimaryProviderKey(
  provider: LlmProvider,
  loadKey: (providerId: string) => Promise<string>,
  saveKey: (providerId: string, key: string) => Promise<void>,
): Promise<{ key: string; providerId: string } | null> {
  const stored = await loadAvailableProviderKey(provider, loadKey);
  if (!stored) return null;

  const primary = getPrimaryProviderKeyId(provider);
  if (stored.providerId !== primary) {
    try {
      await saveKey(primary, stored.key);
      return { key: stored.key, providerId: primary };
    } catch {
      // Der Legacy-Key bleibt nutzbar, auch wenn die stille Migration scheitert.
      return stored;
    }
  }

  return stored;
}

export function getProviderTestModel(provider: LlmProvider): string {
  const explicit = PROVIDER_ONBOARDING[provider]?.testModel;
  if (explicit) return explicit;

  const candidates = MODELS
    .filter((model) => model.provider === provider)
    .slice()
    .sort((a, b) => {
      const aCost = a.kostenInputProMioToken + a.kostenOutputProMioToken;
      const bCost = b.kostenInputProMioToken + b.kostenOutputProMioToken;
      if (aCost !== bCost) return aCost - bCost;
      return a.apiName.localeCompare(b.apiName);
    });

  const model = candidates[0];
  if (model) return model.apiName;

  const fallbackLabel = LLM_PROVIDERS.find((p) => p.id === provider)?.models[0] ?? '';
  return getModelInfo(fallbackLabel)?.apiName ?? fallbackLabel;
}

export function buildProviderTestPayload(provider: LlmProvider): ProviderTestPayload {
  return {
    provider: getPrimaryProviderKeyId(provider),
    model: getProviderTestModel(provider),
    system: 'Du bist ein Verbindungstest. Antworte extrem kurz als JSON.',
    messages: [
      {
        role: 'user',
        content: 'Antworte nur mit {"ok":true}. Keine Erklaerung.',
      },
    ],
    kreativitaet: 0,
  };
}

export function isProviderTestSuccess(response: string): boolean {
  return response.trim().length > 0;
}

export function classifyProviderTestError(error: unknown): Exclude<ProviderTestStatus, 'idle' | 'saving' | 'testing' | 'success'> {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('model')
    || lower.includes('modell')
    || lower.includes('not found')
    || lower.includes('does not exist')
    || lower.includes('unknown model')
    || lower.includes('invalid model')
    || lower.includes('unsupported')
  ) {
    return 'model-error';
  }

  if (
    lower.includes('401')
    || lower.includes('403')
    || lower.includes('ungueltig')
    || lower.includes('ungültig')
    || lower.includes('invalid api key')
    || lower.includes('unauthorized')
    || lower.includes('auth')
  ) {
    return 'invalid-key';
  }

  if (
    lower.includes('netzwerk')
    || lower.includes('internet')
    || lower.includes('timeout')
    || lower.includes('zeitüberschreitung')
    || lower.includes('zeitueberschreitung')
    || lower.includes('connection')
    || lower.includes('connect')
  ) {
    return 'network-error';
  }

  if (
    lower.includes('429')
    || lower.includes('rate limit')
    || lower.includes('rate-limit')
    || lower.includes('quota')
    || lower.includes('credit')
    || lower.includes('credits')
    || lower.includes('billing')
    || lower.includes('zahlung')
    || lower.includes('guthaben')
  ) {
    return 'rate-limit-or-credit';
  }

  return 'provider-error';
}
