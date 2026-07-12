import type { Provider, ProviderId } from './types.js';
import { anthropicProvider } from './provider-anthropic.js';
import { openaiProvider } from './provider-openai.js';
import { kimiProvider } from './provider-kimi.js';
import { deepseekProvider, mistralProvider, qwenProvider } from './provider-openai-compat.js';

const PROVIDERS: Partial<Record<ProviderId, Provider>> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  deepseek: deepseekProvider,
  mistral: mistralProvider,
  qwen: qwenProvider,
  kimi: kimiProvider,
};

export function getProvider(id: ProviderId): Provider {
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new Error(
      `Anbieter '${id}' ist noch nicht implementiert. Verfuegbare Anbieter: ${Object.keys(PROVIDERS).join(', ')}.`,
    );
  }
  return provider;
}
