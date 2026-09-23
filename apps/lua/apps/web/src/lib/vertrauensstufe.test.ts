import { describe, expect, it } from 'vitest';
import { averageVertrauensstufe, VERTRAUENS_COLORS, VERTRAUENS_LABELS } from './vertrauensstufe';

describe('averageVertrauensstufe', () => {
  it('returns null for empty or stufenlose lists', () => {
    expect(averageVertrauensstufe([])).toBe(null);
    expect(averageVertrauensstufe([null, undefined, ''])).toBe(null);
    expect(averageVertrauensstufe(['unbekannt'])).toBe(null);
  });

  it('returns the only stufe when all agree', () => {
    expect(averageVertrauensstufe(['hoch', 'hoch', 'hoch'])).toBe('hoch');
    expect(averageVertrauensstufe(['niedrig'])).toBe('niedrig');
    expect(averageVertrauensstufe(['mittel', 'mittel'])).toBe('mittel');
  });

  it('gives majority the win', () => {
    expect(averageVertrauensstufe(['hoch', 'hoch', 'niedrig'])).toBe('hoch');
    expect(averageVertrauensstufe(['niedrig', 'niedrig', 'hoch'])).toBe('niedrig');
    expect(averageVertrauensstufe(['mittel', 'mittel', 'hoch'])).toBe('mittel');
  });

  it('falls back to mittel on ties between different stufen', () => {
    // Regression: 1 hoch + 1 niedrig durfte nicht "hoch" ergeben
    expect(averageVertrauensstufe(['hoch', 'niedrig'])).toBe('mittel');
    expect(averageVertrauensstufe(['hoch', 'mittel'])).toBe('mittel');
    expect(averageVertrauensstufe(['niedrig', 'mittel'])).toBe('mittel');
    expect(averageVertrauensstufe(['hoch', 'mittel', 'niedrig'])).toBe('mittel');
  });

  it('ignores null/undefined mixed in', () => {
    expect(averageVertrauensstufe(['hoch', null, 'hoch'])).toBe('hoch');
    expect(averageVertrauensstufe([null, 'niedrig'])).toBe('niedrig');
  });
});

describe('VERTRAUENS Constants', () => {
  it('covers all three stufen', () => {
    expect(Object.keys(VERTRAUENS_COLORS).sort()).toEqual(['hoch', 'mittel', 'niedrig']);
    expect(Object.keys(VERTRAUENS_LABELS).sort()).toEqual(['hoch', 'mittel', 'niedrig']);
    expect(VERTRAUENS_LABELS.hoch).toContain('Sicherheit');
  });
});
