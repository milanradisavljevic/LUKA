import { describe, it, expect } from 'vitest';
import { BLOCK_ARBEITSANWEISUNG_PLACEHOLDER, getBlockLabel, createDefaultBlock, hydrateBlockConfig } from './blockDefaults';

const BLOCK_TYPES = [
  'lueckentext', 'matching', 'multipleChoice', 'offeneVerstaendnisfrage',
  'offeneSchreibaufgabe', 'markieraufgabe',
  'wordScramble', 'kategorisierung', 'tabelle', 'stiluebung', 'songanalyse',
  'kreuzwortraetsel', 'wortgitter', 'vokabeluebung', 'umformung', 'fehlerkorrektur', 'roleplay',
] as const;

describe('BLOCK_ARBEITSANWEISUNG_PLACEHOLDER', () => {
  it('hat einen Platzhalter fuer jeden Blocktyp', () => {
    for (const typ of BLOCK_TYPES) {
      expect(BLOCK_ARBEITSANWEISUNG_PLACEHOLDER).toHaveProperty(typ);
      expect(BLOCK_ARBEITSANWEISUNG_PLACEHOLDER[typ].length).toBeGreaterThan(0);
    }
  });

  it('Platzhalter sind unterschiedliche Saetze', () => {
    const values = Object.values(BLOCK_ARBEITSANWEISUNG_PLACEHOLDER);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('getBlockLabel', () => {
  it('liefert ein Label fuer jeden Blocktyp', () => {
    for (const typ of BLOCK_TYPES) {
      const label = getBlockLabel(typ);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe('createDefaultBlock', () => {
  it('erzeugt einen Block fuer jeden Typ', () => {
    for (const typ of BLOCK_TYPES) {
      const block = createDefaultBlock(typ);
      expect(block.typ).toBe(typ);
      expect(block.id).toMatch(/^b\d+$/);
      expect(block.punkte).toBeGreaterThanOrEqual(0);
    }
  });

  it('offeneSchreibaufgabe hat 30 Punkte', () => {
    const block = createDefaultBlock('offeneSchreibaufgabe');
    expect(block.punkte).toBe(30);
  });

  it('andere Blocktypen haben erwartete Punkte', () => {
    const expected: Record<typeof BLOCK_TYPES[number], number> = {
      lueckentext: 6, matching: 6, multipleChoice: 6, offeneVerstaendnisfrage: 6,
      offeneSchreibaufgabe: 30, markieraufgabe: 6, wordScramble: 6, kategorisierung: 6,
      tabelle: 8, stiluebung: 6, songanalyse: 12,
      kreuzwortraetsel: 6, wortgitter: 5, vokabeluebung: 6, umformung: 6, fehlerkorrektur: 6, roleplay: 0,
    };
    for (const typ of BLOCK_TYPES) {
      const block = createDefaultBlock(typ);
      expect(block.punkte).toBe(expected[typ]);
    }
  });
});

describe('hydrateBlockConfig', () => {
  it('ergaenzt fehlende items bei matching aus Defaults', () => {
    const cfg = hydrateBlockConfig('matching', {});
    expect(Array.isArray(cfg.items)).toBe(true);
    expect((cfg.items as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(cfg.optionen)).toBe(true);
  });

  it('ergaenzt fehlende saetze bei fehlerkorrektur aus Defaults', () => {
    const cfg = hydrateBlockConfig('fehlerkorrektur', { anzahlSaetze: 3 });
    expect(cfg.anzahlSaetze).toBe(3);
    expect(Array.isArray(cfg.saetze)).toBe(true);
  });

  it('bevorzugt gespeicherte Werte gegenueber Defaults', () => {
    const cfg = hydrateBlockConfig('matching', {
      items: [{ nr: 1, prompt: 'X' }],
      optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }],
    });
    expect((cfg.items as unknown[]).length).toBe(1);
    expect((cfg.optionen as unknown[]).length).toBe(3);
  });

  it('trotzt undefinierter/fehlender config', () => {
    expect(() => hydrateBlockConfig('kategorisierung', undefined)).not.toThrow();
    const cfg = hydrateBlockConfig('kategorisierung', null);
    expect(Array.isArray(cfg.items)).toBe(true);
  });
});