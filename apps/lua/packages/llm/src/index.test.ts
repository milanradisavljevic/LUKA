import { describe, it, expect } from 'vitest';
import { getProvider } from './index.js';

describe('Provider-Registry', () => {
  it('liefert anthropic-Provider', () => {
    const p = getProvider('anthropic');
    expect(p.id).toBe('anthropic');
    expect(typeof p.complete).toBe('function');
  });

  it('liefert openai-Provider', () => {
    const p = getProvider('openai');
    expect(p.id).toBe('openai');
    expect(typeof p.complete).toBe('function');
  });

  it('liefert kimi-Provider', () => {
    const p = getProvider('kimi');
    expect(p.id).toBe('kimi');
    expect(typeof p.complete).toBe('function');
  });

  it('wirft bei unbekanntem Provider', () => {
    expect(() => getProvider('unbekannt' as any)).toThrow('noch nicht implementiert');
  });
});
