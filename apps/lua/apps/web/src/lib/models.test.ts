import { describe, it, expect } from 'vitest';
import { MODELS, getModelInfo } from './models';

const VALID_PROVIDERS = ['claude', 'chatgpt', 'kimi', 'deepseek', 'mistral', 'qwen'] as const;
const BLOCK_TYPES = ['lueckentext', 'matching', 'multipleChoice', 'offeneVerstaendnisfrage', 'offeneSchreibaufgabe', 'markieraufgabe'] as const;

describe('models', () => {
  it('jedes Modell hat einen gueltigen Provider', () => {
    for (const model of MODELS) {
      expect(VALID_PROVIDERS).toContain(model.provider);
    }
  });

  it('kein Preis ist negativ', () => {
    for (const model of MODELS) {
      expect(model.kostenInputProMioToken).toBeGreaterThanOrEqual(0);
      expect(model.kostenOutputProMioToken).toBeGreaterThanOrEqual(0);
    }
  });

  it('getModelInfo findet ein Modell nach Label', () => {
    const sonnet = getModelInfo('Sonnet 4.6');
    expect(sonnet).toBeDefined();
    expect(sonnet!.provider).toBe('claude');
    expect(sonnet!.kostenInputProMioToken).toBe(3);
  });

  it('getModelInfo gibt undefined fuer unbekanntes Label', () => {
    expect(getModelInfo('Unbekanntes Modell')).toBeUndefined();
  });

  it('alle Modelle haben nicht-leere Staerken, Region und Datenschutz', () => {
    for (const model of MODELS) {
      expect(model.staerken.length).toBeGreaterThan(0);
      expect(model.region.length).toBeGreaterThan(0);
      expect(model.datenschutz.length).toBeGreaterThan(0);
    }
  });

  it('alle Modelle haben einen nicht-leeren apiName', () => {
    for (const model of MODELS) {
      expect(model.apiName.length).toBeGreaterThan(0);
    }
  });

  it('6 Anbieter sind vertreten', () => {
    const providers = new Set(MODELS.map((m) => m.provider));
    expect(providers.size).toBe(6);
  });
});