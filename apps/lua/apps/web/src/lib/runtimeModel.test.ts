import { describe, expect, it } from 'vitest';
import { scanRuntime, correctionRuntime } from './runtimeModel';

describe('Auslesung unabhaengig von der Korrektur', () => {
  it('sendet fuer Mistral stets den OCR-Dienst, auch bei geerbter Auswahl', () => {
    expect(scanRuntime('mistral', 'Mistral Large 4', { provider: 'openai', model: 'gpt-5.4' }))
      .toEqual({ provider: 'mistral', model: 'mistral-ocr-latest' });
    expect(scanRuntime('', '', { provider: 'mistral', model: 'mistral-medium-3-5' }))
      .toEqual({ provider: 'mistral', model: 'mistral-ocr-latest' });
  });
  it('behaelt das ausdruecklich gewaehlte OpenAI-Auslesemodell', () => {
    expect(scanRuntime('chatgpt', 'GPT-5.4', { provider: 'deepseek', model: 'deepseek-v4-pro' }))
      .toEqual({ provider: 'openai', model: 'gpt-5.4' });
  });
});


it('bindet den gespeicherten Denkmodus an Anbieter und API-Modell', () => {
  const settings = {defaultKreativitaet:0.5,defaultAusgabeSprache:'de',ambientMuralsEnabled:false,reduceMotion:false,reduceBackgroundEffects:false,defaultProvider:'deepseek',defaultModel:'DeepSeek V4 Pro',correctionReasoning:{'deepseek:deepseek-v4-pro':'high'}} as import('./types').AppSettings;
  expect(correctionRuntime(settings)).toEqual({provider:'deepseek',model:'deepseek-v4-pro',reasoning:'high'});
  expect(correctionRuntime({...settings,defaultProvider:'kimi',defaultModel:'Kimi K3'}).reasoning).toBeUndefined();
});
