import { describe, expect, it } from 'vitest';
import { kriteriumAnzeige } from './kriteriumAnzeige';

describe('kriteriumAnzeige', () => {
  it.each([
    ['analyse', 'Analyse'],
    ['einleitung_aufbau', 'Einleitung & Aufbau'],
    ['interpretation', 'Interpretation'],
    ['sprachrichtigkeit', 'Sprachrichtigkeit'],
  ])('zeigt %s als verständliches Kriterium', (key, label) => {
    expect(kriteriumAnzeige(key)).toBe(label);
  });

  it('ersetzt Trenner in unbekannten Kriterien und erhält gängige Abkürzungen', () => {
    expect(kriteriumAnzeige('k1_textbezug_und_deutung')).toBe('K1 Textbezug und Deutung');
  });

  it('lässt leere Namen leer', () => {
    expect(kriteriumAnzeige('   ')).toBe('');
  });
});
