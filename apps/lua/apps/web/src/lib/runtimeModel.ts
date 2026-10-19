import { PROVIDER_KEY_IDS } from './constants';
import type { AppSettings } from './types';
export const MODEL_MAP: Record<string, string> = {
  // Anthropic
  'Opus 5.5': 'claude-opus-5-5',
  'Sonnet 5.5': 'claude-sonnet-5-5',
  'Haiku 5.5': 'claude-haiku-5-5',
  'Opus 4.8': 'claude-opus-4-8',
  'Sonnet 4.6': 'claude-sonnet-4-6',
  // OpenAI
  'GPT-6.1 Sol': 'gpt-6.1-sol',
  'GPT-6 Luna': 'gpt-6-luna',
  'GPT-5.4': 'gpt-5.4',
  'GPT-5.4 mini': 'gpt-5.4-mini',
  // DeepSeek
  'DeepSeek V4.1 Flash': 'deepseek-flash',
  'DeepSeek V4 Pro': 'deepseek-v4-pro',
  // Mistral
  'Mistral Large 4': 'mistral-large-4',
  'Mistral Medium 3.5': 'mistral-medium-3-5',
  'Mistral Small 4': 'mistral-small-2603',
  // Qwen
  'Qwen 3.8 Max': 'qwen3.8-max',
  'Qwen 3.7 Plus': 'qwen3.7-plus',
  // Kimi
  'Kimi K3': 'kimi-k3',
  'Kimi K2.6': 'kimi-k2.6',
  // Nicht mehr in der Auswahl, aber in gespeicherten Einstellungen möglich.
  'Opus 4.7': 'claude-opus-4-7',
  'Haiku 4.5': 'claude-haiku-4-5-20251001',
  'GPT-5.4 nano': 'gpt-5.4-nano',
  'Qwen 3.7 Max': 'qwen3-max',
  'Qwen 3.5 Plus': 'qwen3.5-plus',
};
export function correctionRuntime(settings: AppSettings) {
 return { provider: PROVIDER_KEY_IDS[settings.defaultProvider] ?? settings.defaultProvider, model: MODEL_MAP[settings.defaultModel] ?? settings.defaultModel };
}
