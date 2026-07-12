import { describe, it, expect } from 'vitest';
import { parseInlineSegments, parseMiniMarkdown } from './miniMarkdown';

describe('parseInlineSegments', () => {
  it('gibt reinen Text als ein Segment zurück', () => {
    expect(parseInlineSegments('Ein normaler Satz.')).toEqual([
      { text: 'Ein normaler Satz.', bold: false },
    ]);
  });

  it('erkennt **fett** mitten im Text', () => {
    expect(parseInlineSegments('Vorher **fett** nachher')).toEqual([
      { text: 'Vorher ', bold: false },
      { text: 'fett', bold: true },
      { text: ' nachher', bold: false },
    ]);
  });

  it('erkennt mehrere fette Abschnitte', () => {
    expect(parseInlineSegments('**A** und **B**')).toEqual([
      { text: 'A', bold: true },
      { text: ' und ', bold: false },
      { text: 'B', bold: true },
    ]);
  });

  it('leerer String ergibt ein leeres Segment', () => {
    expect(parseInlineSegments('')).toEqual([{ text: '', bold: false }]);
  });
});

describe('parseMiniMarkdown', () => {
  it('trennt Absätze an Leerzeilen', () => {
    const blocks = parseMiniMarkdown('Erster Absatz.\n\nZweiter Absatz.');
    expect(blocks).toEqual([
      { type: 'paragraph', segments: [{ text: 'Erster Absatz.', bold: false }] },
      { type: 'paragraph', segments: [{ text: 'Zweiter Absatz.', bold: false }] },
    ]);
  });

  it('gruppiert aufeinanderfolgende "- "-Zeilen zu einer Liste', () => {
    const blocks = parseMiniMarkdown('Neu:\n- Punkt eins\n- Punkt zwei');
    expect(blocks).toEqual([
      { type: 'paragraph', segments: [{ text: 'Neu:', bold: false }] },
      {
        type: 'list',
        items: [
          [{ text: 'Punkt eins', bold: false }],
          [{ text: 'Punkt zwei', bold: false }],
        ],
      },
    ]);
  });

  it('unterstützt **fett** innerhalb von Listenpunkten', () => {
    const blocks = parseMiniMarkdown('- **Wichtig**: bitte lesen');
    expect(blocks).toEqual([
      {
        type: 'list',
        items: [[
          { text: 'Wichtig', bold: true },
          { text: ': bitte lesen', bold: false },
        ]],
      },
    ]);
  });

  it('beendet eine Liste bei einer Leerzeile und öffnet danach neuen Absatz', () => {
    const blocks = parseMiniMarkdown('- eins\n- zwei\n\nDanach normaler Text.');
    expect(blocks).toEqual([
      {
        type: 'list',
        items: [
          [{ text: 'eins', bold: false }],
          [{ text: 'zwei', bold: false }],
        ],
      },
      { type: 'paragraph', segments: [{ text: 'Danach normaler Text.', bold: false }] },
    ]);
  });

  it('leerer String ergibt keine Blöcke', () => {
    expect(parseMiniMarkdown('')).toEqual([]);
  });

  it('akzeptiert auch "* " als Listenmarker', () => {
    const blocks = parseMiniMarkdown('* Eintrag');
    expect(blocks).toEqual([
      { type: 'list', items: [[{ text: 'Eintrag', bold: false }]] },
    ]);
  });

  it('erkennt Inline-Code mit Backticks', () => {
    expect(parseInlineSegments('Nutze `cargo run` dafür')).toEqual([
      { text: 'Nutze ', bold: false },
      { text: 'cargo run', bold: false, code: true },
      { text: ' dafür', bold: false },
    ]);
  });

  it('rendert "### "-Überschriften als fette Absatzzeile ohne Rauten', () => {
    const blocks = parseMiniMarkdown('### Fixed — Etwas');
    expect(blocks).toEqual([
      { type: 'paragraph', segments: [{ text: 'Fixed — Etwas', bold: true }] },
    ]);
  });

  it('hängt eingerückte Fortsetzungszeilen an den vorigen Listenpunkt an', () => {
    const blocks = parseMiniMarkdown('- **Neu:** erster Teil\n  und die Fortsetzung.');
    expect(blocks).toEqual([
      {
        type: 'list',
        items: [[
          { text: 'Neu:', bold: true },
          { text: ' erster Teil', bold: false },
          { text: ' ', bold: false },
          { text: 'und die Fortsetzung.', bold: false },
        ]],
      },
    ]);
  });

  it('nicht eingerückter Text nach einer Liste bleibt eigener Absatz', () => {
    const blocks = parseMiniMarkdown('- eins\nNormaler Absatz ohne Einrückung? Nein — CHANGELOG rückt Fortsetzungen immer ein.');
    expect(blocks[0]?.type).toBe('list');
    expect(blocks[1]?.type).toBe('paragraph');
  });
});
