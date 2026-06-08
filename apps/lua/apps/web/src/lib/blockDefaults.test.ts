import { describe, it, expect } from 'vitest';
import { BLOCK_ARBEITSANWEISUNG_PLACEHOLDER, getBlockLabel, createDefaultBlock } from './blockDefaults';

const BLOCK_TYPES = [
  'lueckentext', 'matching', 'multipleChoice', 'offeneVerstaendnisfrage',
  'offeneSchreibaufgabe', 'markieraufgabe',
  'wordScramble', 'kategorisierung', 'tabelle', 'stiluebung', 'songanalyse',
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
      expect(block.punkte).toBeGreaterThan(0);
    }
  });

  it('offeneSchreibaufgabe hat 30 Punkte', () => {
    const block = createDefaultBlock('offeneSchreibaufgabe');
    expect(block.punkte).toBe(30);
  });

  it('andere Blocktypen haben 6 Punkte', () => {
    for (const typ of BLOCK_TYPES) {
      if (typ === 'offeneSchreibaufgabe' || typ === 'tabelle' || typ === 'songanalyse') continue;
      const block = createDefaultBlock(typ);
      expect(block.punkte).toBe(6);
    }
  });

  it('tabelle hat 8 Punkte, songanalyse hat 12 Punkte', () => {
    expect(createDefaultBlock('tabelle').punkte).toBe(8);
    expect(createDefaultBlock('songanalyse').punkte).toBe(12);
  });
});