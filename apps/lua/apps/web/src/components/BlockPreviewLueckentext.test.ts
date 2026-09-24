import { describe, it, expect } from 'vitest';
import { parseCloze } from './BlockPreviewLueckentext';

describe('parseCloze (Lückentext-Vorschau, Regression zum Export-Bug)', () => {
  it('zerlegt einen Cloze-Text in Fließtext und Lücken-Marker', () => {
    const segs = parseCloze('Der Hashtag ist so erfolgreich, dass er sich bereits (1) gemacht hat und (2) werden kann.');
    expect(segs).toEqual([
      { text: 'Der Hashtag ist so erfolgreich, dass er sich bereits ' },
      { nr: 1 },
      { text: ' gemacht hat und ' },
      { nr: 2 },
      { text: ' werden kann.' },
    ]);
  });

  it('schluckt Unterstriche nach dem Marker (LLM schreibt oft "(1) ______")', () => {
    const segs = parseCloze('Die (1) _______ auf TikTok hat weltweit (2)________ Aufrufe.');
    expect(segs.filter((s) => s.nr !== undefined).map((s) => s.nr)).toEqual([1, 2]);
    expect(segs.some((s) => s.text?.includes('_'))).toBe(false);
  });

  it('Text ohne Marker → ein einzelner Fließtext-Segment', () => {
    expect(parseCloze('Einfacher Text ohne Lücken.')).toEqual([{ text: 'Einfacher Text ohne Lücken.' }]);
  });

  it('Marker am Anfang und Ende werden korrekt erfasst', () => {
    const segs = parseCloze('(1) startet und endet mit (2)');
    expect(segs[0]).toEqual({ nr: 1 });
    expect(segs[segs.length - 1]).toEqual({ nr: 2 });
  });
});
