import { describe, expect, it } from 'vitest';
import type { Block, QuellText } from '@lehrunterlagen/schema';
import { isKuratiert, parsePoolTags, poolEntryToDocument, remapPoolContentForInsert, type PoolEntry } from './pool';

const source: QuellText = {
  id: 'q1',
  titel: 'Lesekarte',
  inhalt: 'Eine knappe Materialkarte.',
  herkunft: { typ: 'url', ref: 'https://example.org/source' },
};

const quellenanalyse: Extract<Block, { typ: 'quellenanalyse' }> = {
  id: 'b1',
  typ: 'quellenanalyse',
  punkte: 2,
  arbeitsanweisung: 'Arbeite mit dem Material.',
  quelleId: 'q1',
  config: {
    quelleId: 'q1',
    quellentyp: 'text',
    auftraege: [{ nr: 1, operator: 'beschreiben', frage: 'Was steht im Material?', zeilen: 2 }],
  },
  loesung: { antworten: [{ nr: 1, erwartung: 'Eine belegte Angabe.', belege: ['Die Karte nennt sie.'] }] },
};

describe('Pool-Herkunft', () => {
  it('erkennt redaktionell kuratierte Fachpaket-Aufgaben am Tag', () => {
    expect(isKuratiert(['redaktionell-kuratiert', 'startpaket-v1'])).toBe(true);
    expect(isKuratiert(['fachpaket-medien-demokratie-v2', 'redaktionell-kuratiert'])).toBe(true);
  });

  it('markiert selbst gespeicherte Wizard-Aufgaben ohne das Tag nicht als kuratiert', () => {
    expect(isKuratiert([])).toBe(false);
    expect(isKuratiert(['irgendein-anderes-tag'])).toBe(false);
  });

  it('kombiniert sich mit parsePoolTags auf beliebigem tags-String', () => {
    expect(isKuratiert(parsePoolTags('["redaktionell-kuratiert"]'))).toBe(true);
    expect(isKuratiert(parsePoolTags(null))).toBe(false);
    expect(isKuratiert(parsePoolTags('kaputt-kein-json'))).toBe(false);
  });
});

describe('Quelltexte in Pool-Aufgaben', () => {
  it('übernimmt Quelltexte beim direkten Dokumentexport', () => {
    const entry: PoolEntry = {
      id: 'pool-1', fach: 'geschichte', stufe: 'unterstufe', schulstufe: 6,
      thema: 'Quellenarbeit', aufgabentyp: 'quellenanalyse', tags: '[]',
      blockJson: JSON.stringify(quellenanalyse), quelltexte: [source],
      quelleHinweis: null, createdAt: '2026-10-04T00:00:00.000Z',
    };
    expect(poolEntryToDocument(entry)?.quelltexte).toEqual([source]);
  });

  it('remappt kollidierende Quell-IDs und alle Blockverweise', () => {
    const result = remapPoolContentForInsert(quellenanalyse, [source], [source]);
    expect(result.quelltexte[0]?.id).toBe('q1-2');
    if (result.block.typ !== 'quellenanalyse') throw new Error('Expected a Quellenanalyse block');
    expect(result.block.quelleId).toBe('q1-2');
    expect(result.block.config.quelleId).toBe('q1-2');
  });
});
