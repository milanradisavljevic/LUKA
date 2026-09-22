import { describe, it, expect } from 'vitest';
import { correctionRuntime, MODEL_MAP } from './runtimeModel';
import { PROVIDER_KEY_IDS } from './constants';
import type { AppSettings } from './types';

describe('correctionRuntime', () => {
  const baseSettings: AppSettings = {
    defaultProvider: 'claude',
    defaultModel: 'Sonnet 4.6',
    nataschaDir: '',
    pythonCommand: '',
  } as AppSettings;

  it('mappt UI-Provider auf Runtime-Provider', () => {
    const result = correctionRuntime(baseSettings);
    expect(result.provider).toBe('anthropic');
  });

  it('mappt UI-Modell-Label auf API-Modell-ID', () => {
    const result = correctionRuntime(baseSettings);
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('liefert leere Strings bei unbekannten Werten', () => {
    const settings = {
      ...baseSettings,
      defaultProvider: 'unknown_provider' as never,
      defaultModel: 'Unknown Model',
    };
    const result = correctionRuntime(settings);
    expect(result.provider).toBe('unknown_provider');
    expect(result.model).toBe('Unknown Model');
  });
});

describe('PROVIDER_KEY_IDS', () => {
  it('hat einen Eintrag fuer jeden LLM_PROVIDER', () => {
    // Alle Provider muessen gemappt werden
    expect(PROVIDER_KEY_IDS.claude).toBe('anthropic');
    expect(PROVIDER_KEY_IDS.chatgpt).toBe('openai');
    expect(PROVIDER_KEY_IDS.deepseek).toBe('deepseek');
    expect(PROVIDER_KEY_IDS.mistral).toBe('mistral');
    expect(PROVIDER_KEY_IDS.qwen).toBe('qwen');
    expect(PROVIDER_KEY_IDS.kimi).toBe('kimi');
  });
});

describe('MODEL_MAP', () => {
  it('enthält alle Claude-Modelle', () => {
    expect(MODEL_MAP['Sonnet 4.6']).toBe('claude-sonnet-4-6');
    expect(MODEL_MAP['Opus 4.8']).toBe('claude-opus-4-8');
    expect(MODEL_MAP['Haiku 4.5']).toBe('claude-haiku-4-5-20251001');
  });

  it('enthält alle OpenAI-Modelle', () => {
    expect(MODEL_MAP['GPT-5.4']).toBe('gpt-5.4');
    expect(MODEL_MAP['GPT-5.4 mini']).toBe('gpt-5.4-mini');
  });

  it('enthält DeepSeek, Mistral, Qwen, Kimi', () => {
    expect(MODEL_MAP['DeepSeek V4.1 Flash']).toBe('deepseek-flash');
    expect(MODEL_MAP['Mistral Medium 3.5']).toBe('mistral-medium-3-5');
    expect(MODEL_MAP['Qwen 3.7 Max']).toBe('qwen3-max');
    expect(MODEL_MAP['Kimi K3']).toBe('kimi-k3');
  });
});
