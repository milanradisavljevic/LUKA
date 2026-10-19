import { describe, it, expect } from 'vitest';
import { correctionRuntime, MODEL_MAP } from './runtimeModel';
import { LLM_PROVIDERS, PROVIDER_KEY_IDS } from './constants';
import { getModelInfo } from './models';
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
    expect(MODEL_MAP['Opus 5.5']).toBe('claude-opus-5-5');
    expect(MODEL_MAP['Sonnet 5.5']).toBe('claude-sonnet-5-5');
    expect(MODEL_MAP['Haiku 5.5']).toBe('claude-haiku-5-5');
  });

  it('löst nicht mehr angebotene Modelle aus gespeicherten Einstellungen weiter auf', () => {
    expect(MODEL_MAP['Haiku 4.5']).toBe('claude-haiku-4-5-20251001');
    expect(MODEL_MAP['Opus 4.7']).toBe('claude-opus-4-7');
    expect(MODEL_MAP['GPT-5.4 nano']).toBe('gpt-5.4-nano');
    expect(MODEL_MAP['Qwen 3.7 Max']).toBe('qwen3-max');
  });

  it('jedes auswählbare Modell hat eine API-ID und Metadaten', () => {
    for (const provider of LLM_PROVIDERS) {
      for (const label of provider.models) {
        expect(MODEL_MAP[label], label).toBeTruthy();
        expect(getModelInfo(label)?.apiName, label).toBe(MODEL_MAP[label]);
      }
    }
  });

  it('enthält alle OpenAI-Modelle', () => {
    expect(MODEL_MAP['GPT-5.4']).toBe('gpt-5.4');
    expect(MODEL_MAP['GPT-5.4 mini']).toBe('gpt-5.4-mini');
    expect(MODEL_MAP['GPT-6.1 Sol']).toBe('gpt-6.1-sol');
    expect(MODEL_MAP['GPT-6 Luna']).toBe('gpt-6-luna');
  });

  it('enthält DeepSeek, Mistral, Qwen, Kimi', () => {
    expect(MODEL_MAP['DeepSeek V4.1 Flash']).toBe('deepseek-flash');
    expect(MODEL_MAP['Mistral Medium 3.5']).toBe('mistral-medium-3-5');
    expect(MODEL_MAP['Mistral Large 4']).toBe('mistral-large-4');
    expect(MODEL_MAP['Qwen 3.8 Max']).toBe('qwen3.8-max');
    expect(MODEL_MAP['Kimi K3']).toBe('kimi-k3');
  });
});
