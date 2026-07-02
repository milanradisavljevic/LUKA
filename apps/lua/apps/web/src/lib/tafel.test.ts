import { describe, expect, it } from 'vitest';
import type { Block, QuellText } from '@lehrunterlagen/schema';
import { buildTafelSlides, clampFontScale } from './tafel';

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
    expect(clampFontScale(0.1)).toBe(0.85);
    expect(clampFontScale(2)).toBe(1.6);
  });

  it('rastet in 0.15er-Schritten ein', () => {
    expect(clampFontScale(1.07)).toBe(1);
    expect(clampFontScale(1.09)).toBe(1.15);
  });
});
