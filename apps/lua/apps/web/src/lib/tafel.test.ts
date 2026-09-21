import { describe, expect, it } from 'vitest';
import type { Block, QuellText } from '@lehrunterlagen/schema';
import { buildTafelSlides, clampFontScale, countSolutions } from './tafel';

const block = (id: string): Block => ({
  id,
  typ: 'lueckentext',
  punkte: 4,
  arbeitsanweisung: '',
  config: {},
  loesung: {},
}) as Block;

const quelltext = (id: string, inhalt: string): QuellText => ({
  id,
  titel: id,
  inhalt,
  herkunft: { typ: 'eingabe', ref: '' },
});

describe('buildTafelSlides', () => {
  it('stellt Quelltexte vor Aufgabenblöcke', () => {
    const slides = buildTafelSlides([block('b1'), block('b2')], [quelltext('q1', 'Text')]);

    expect(slides.map((slide) => slide.kind)).toEqual(['quelltext', 'block', 'block']);
    expect(slides[0]).toMatchObject({ kind: 'quelltext', quelltext: { id: 'q1' } });
    expect(slides[1]).toMatchObject({ kind: 'block', block: { id: 'b1' } });
  });

  it('überspringt leere Quelltexte', () => {
    const slides = buildTafelSlides([block('b1')], [
      quelltext('leer', '   \n'),
      quelltext('q1', 'Nutzbarer Text'),
    ]);

    expect(slides).toHaveLength(2);
    expect(slides[0]).toMatchObject({ kind: 'quelltext', quelltext: { id: 'q1' } });
  });

  it('liefert ohne Quelltexte und Blöcke eine leere Liste', () => {
    expect(buildTafelSlides([])).toEqual([]);
  });
});

describe('clampFontScale', () => {
  it('begrenzt auf die erlaubten Schriftgrößen', () => {
    expect(clampFontScale(0.1)).toBe(0.5);
    expect(clampFontScale(3)).toBe(2.5);
  });

  it('rastet in 0.25er-Schritten ein', () => {
    expect(clampFontScale(1.1)).toBe(1);
    expect(clampFontScale(1.2)).toBe(1.25);
  });
});

describe('countSolutions', () => {
  it('lueckentext: nutzt Maximum aus config und loesung', () => {
    const b1 = {
      id: 'b1', typ: 'lueckentext' as const, punkte: 4, arbeitsanweisung: '',
      config: { anzahlLuecken: 5, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'a' }, { nr: 2, wort: 'b' }, { nr: 3, wort: 'c' }] },
    } as Block;
    expect(countSolutions(b1)).toBe(5);

    const b2 = {
      id: 'b2', typ: 'lueckentext' as const, punkte: 4, arbeitsanweisung: '',
      config: { anzahlLuecken: 3, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'a' }, { nr: 2, wort: 'b' }, { nr: 3, wort: 'c' }, { nr: 4, wort: 'd' }, { nr: 5, wort: 'e' }] },
    } as Block;
    expect(countSolutions(b2)).toBe(5);
  });

  it('lueckentext: fallback auf anzahlLuecken wenn loesung leer', () => {
    const b = {
      id: 'b1', typ: 'lueckentext' as const, punkte: 4, arbeitsanweisung: '',
      config: { anzahlLuecken: 6, wortbank: false, distraktoren: 0 },
      loesung: {},
    } as Block;
    expect(countSolutions(b)).toBe(6);
  });
});
