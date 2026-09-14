import { PROVIDER_KEY_IDS } from './constants';
import type { AppSettings } from './types';
export const MODEL_MAP: Record<string, string> = {
  // Anthropic
  'Opus 4.8': 'claude-opus-4-8',
  'Opus 4.7': 'claude-opus-4-7',
  'Sonnet 4.6': 'claude-sonnet-4-6',
  'Haiku 4.5': 'claude-haiku-4-5-20251001',
  // OpenAI
  'GPT-5.4': 'gpt-5.4',
  'GPT-5.4 mini': 'gpt-5.4-mini',
  'GPT-5.4 nano': 'gpt-5.4-nano',
  // DeepSeek
  'DeepSeek V4 Flash': 'deepseek-v4-flash',
  'DeepSeek V4 Pro': 'deepseek-v4-pro',
  // Mistral
  'Mistral Medium 3.5': 'mistral-medium-3-5',
  'Mistral Small 4': 'mistral-small-2603',
  // Qwen
  'Qwen 3.7 Max': 'qwen3-max',
  'Qwen 3.5 Plus': 'qwen3.5-plus',
  // Kimi
  'Moonshot V1 8K': 'moonshot-v1-8k',
  'Kimi K2.6': 'kimi-k2.6',
};
export function correctionRuntime(settings: AppSettings) {
 return { provider: PROVIDER_KEY_IDS[settings.defaultProvider] ?? settings.defaultProvider, model: MODEL_MAP[settings.defaultModel] ?? settings.defaultModel };
}
