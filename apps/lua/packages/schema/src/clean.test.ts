import { describe, it, expect } from 'vitest';
import { bereinigeQuelltext } from './clean.js';

describe('bereinigeQuelltext', () => {
  const dreckig = [
    'Text 1: yougov.com/en-us/articles/54917-american-dream-hard-to-achieve-poll',
    'nach: https://yougov.com/en-us/articles/54917-american-dream-hard-to-achieve-poll',
    '',
    'For many, the American Dream feels unreachable. About half of adult citizens in a recent YouGov poll doubt they will be able to get there.',
    '',
    'Owning a home is part of what constitutes the American Dream to many Americans.',
    '',
    'Methodology: This article includes results from an online survey conducted on January 27 - 30, 2026.',
    'Image: Getty ( AE Pictures Inc. )',
    'Subscribe to the YouGov newsletter',
    'Related content',
    'Big Survey',
    'Article',
    'Big Survey',
    'Report',
    'Big Survey',
    'Sign up here',
  ].join('\n');

  it('entfernt URL-Zeilen, Newsletter, Related-Content und wiederholte Labels', () => {
    const sauber = bereinigeQuelltext(dreckig);
    expect(sauber).not.toMatch(/yougov\.com/);
    expect(sauber).not.toMatch(/Subscribe to/);
    expect(sauber).not.toMatch(/Related content/);
    expect(sauber).not.toMatch(/Big Survey/);
    expect(sauber).not.toMatch(/Methodology:/);
    expect(sauber).not.toMatch(/Image: Getty/);
    expect(sauber).not.toMatch(/Sign up here/);
  });

  it('behält die echten Inhaltsabsätze', () => {
    const sauber = bereinigeQuelltext(dreckig);
    expect(sauber).toMatch(/the American Dream feels unreachable/);
    expect(sauber).toMatch(/Owning a home is part of what constitutes/);
  });

  it('lässt sauberen Text unverändert (bis auf Rand-Trim)', () => {
    const sauber = 'Erster Absatz mit echtem Inhalt.\n\nZweiter Absatz mit mehr Inhalt.';
    expect(bereinigeQuelltext(sauber)).toBe(sauber);
  });

  it('ist robust bei leerem Input', () => {
    expect(bereinigeQuelltext('')).toBe('');
  });
});
