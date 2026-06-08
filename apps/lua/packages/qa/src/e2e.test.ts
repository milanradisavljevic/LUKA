import { describe, it, expect } from 'vitest';
import { runPipeline } from './glue.js';
import { DocumentSchema } from '@lehrunterlagen/schema';
import { mockLlmProvider, detectBlockTyp } from './__mocks__/mock-llm-provider.js';
import lueckentext from './fixtures/lueckentext.json' assert { type: 'json' };
import matching from './fixtures/matching.json' assert { type: 'json' };
import multipleChoice from './fixtures/multipleChoice.json' assert { type: 'json' };
import offeneVerstaendnisfrage from './fixtures/offeneVerstaendnisfrage.json' assert { type: 'json' };
import offeneSchreibaufgabe from './fixtures/offeneSchreibaufgabe.json' assert { type: 'json' };
import markieraufgabe from './fixtures/markieraufgabe.json' assert { type: 'json' };
import wordScramble from './fixtures/wordScramble.json' assert { type: 'json' };
import kategorisierung from './fixtures/kategorisierung.json' assert { type: 'json' };
import tabelle from './fixtures/tabelle.json' assert { type: 'json' };
import stiluebung from './fixtures/stiluebung.json' assert { type: 'json' };
import songanalyse from './fixtures/songanalyse.json' assert { type: 'json' };
import type { DocumentV1, Meta, QuellText } from '@lehrunterlagen/schema';

const isDocx = (buf: Buffer) =>
  buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

const ALL_FIXTURES: DocumentV1[] = [
  lueckentext as DocumentV1,
  matching as DocumentV1,
  multipleChoice as DocumentV1,
  offeneVerstaendnisfrage as DocumentV1,
  offeneSchreibaufgabe as DocumentV1,
  markieraufgabe as DocumentV1,
  wordScramble as DocumentV1,
  kategorisierung as DocumentV1,
  tabelle as DocumentV1,
  stiluebung as DocumentV1,
  songanalyse as DocumentV1,
];

const mockLlmOutput = DocumentSchema.parse(lueckentext);

describe('Mock-Provider: detectBlockTyp', () => {
  it('erkennt wordScramble aus System-Prompt', () => {
    const typ = detectBlockTyp([{ role: 'system', content: 'Erzeuge eine wordScramble-Aufgabe.' }]);
    expect(typ).toBe('wordScramble');
  });

  it('erkennt kategorisierung', () => {
    const typ = detectBlockTyp([{ role: 'user', content: 'Bitte eine Kategorisierung erstellen.' }]);
    expect(typ).toBe('kategorisierung');
  });

  it('erkennt songanalyse', () => {
    const typ = detectBlockTyp([{ role: 'user', content: 'Songanalyse: AnnenMayKantereit' }]);
    expect(typ).toBe('songanalyse');
  });

  it('Fallback auf lueckentext bei unbekanntem Typ', () => {
    const typ = detectBlockTyp([{ role: 'user', content: 'Irgendwas Unbekanntes' }]);
    expect(typ).toBe('lueckentext');
  });
});

describe('Mock-Provider: liefert valide JSON fuer alle 11 Typen', () => {
  for (const fixture of ALL_FIXTURES) {
    it(`Fixture ${fixture.bloecke[0]!.typ} parst mit DocumentSchema`, () => {
      expect(() => DocumentSchema.parse(fixture)).not.toThrow();
    });
  }
});

describe('Glue: runPipeline (mock)', () => {
  it('gibt Fehler zurueck, wenn Provider nicht existiert', async () => {
    const result = await runPipeline(
      {
        meta: mockLlmOutput.meta,
        quelltexte: mockLlmOutput.quelltexte,
        bloecke: [{ typ: 'lueckentext', punkte: 8, anzahlLuecken: 3, wortbank: false, distraktoren: 0 }],
      },
      { provider: 'unbekannt' as any },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fehler).toContain('noch nicht implementiert');
    }
  });

  it('gibt Fehler zurueck, wenn API-Key fehlt', async () => {
    const result = await runPipeline(
      {
        meta: mockLlmOutput.meta,
        quelltexte: mockLlmOutput.quelltexte,
        bloecke: [{ typ: 'lueckentext', punkte: 8, anzahlLuecken: 3, wortbank: false, distraktoren: 0 }],
      },
      { provider: 'openai' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fehler).toContain('API_KEY fehlt');
    }
  });
});

describe('E2E: Mock-Provider liefert je Block-Typ die richtige Fixture', () => {
  const typToKeyword: Record<string, string> = {
    lueckentext: 'lueckentext',
    matching: 'matching',
    multipleChoice: 'multiple choice',
    offeneVerstaendnisfrage: 'verstaendnisfrage',
    offeneSchreibaufgabe: 'schreibaufgabe',
    markieraufgabe: 'markieraufgabe',
    wordScramble: 'wordScramble',
    kategorisierung: 'kategorisierung',
    tabelle: 'tabelle',
    stiluebung: 'stiluebung',
    songanalyse: 'songanalyse',
  };

  for (const fixture of ALL_FIXTURES) {
    const typ = fixture.bloecke[0]!.typ;
    it(`Mock liefert Fixture ${typ} bei Prompt mit Keyword "${typToKeyword[typ]}"`, async () => {
      const roh = await mockLlmProvider.complete(
        [{ role: 'user', content: `Erzeuge eine ${typToKeyword[typ]}-Aufgabe.` }],
        { provider: 'anthropic' },
      );
      const doc = JSON.parse(roh);
      expect(doc.bloecke[0].typ).toBe(typ);
      expect(() => DocumentSchema.parse(doc)).not.toThrow();
    });
  }
});

describe('E2E: runPipeline mit Mock-Provider fuer lueckentext', () => {
  it('Pipeline liefert 2 DOCX + 1 Raster fuer lueckentext', async () => {
    const result = await runPipeline(
      {
        meta: mockLlmOutput.meta,
        quelltexte: mockLlmOutput.quelltexte,
        bloecke: [{ typ: 'lueckentext', punkte: 8, anzahlLuecken: 3, wortbank: false, distraktoren: 0 }],
      },
      { provider: 'anthropic' },
      mockLlmProvider,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.fehler);

    expect(isDocx(result.schueler)).toBe(true);
    expect(isDocx(result.loesung)).toBe(true);
    expect(isDocx(result.raster)).toBe(true);
    expect(result.schueler.length).toBeGreaterThan(1000);
    expect(result.loesung.length).toBeGreaterThan(1000);
    expect(result.raster.length).toBeGreaterThan(500);
    expect(result.document.bloecke[0]!.typ).toBe('lueckentext');
  });
});

describe('E2E: Renderer-Integration pro Block-Typ (alle 11)', () => {
  for (const fixture of ALL_FIXTURES) {
    const typ = fixture.bloecke[0]!.typ;
    it(`renderDocument erzeugt 2 DOCX fuer ${typ}`, async () => {
      const { renderDocument } = await import('@lehrunterlagen/renderer');
      const { schueler, loesung } = await renderDocument(fixture);
      expect(isDocx(schueler)).toBe(true);
      expect(isDocx(loesung)).toBe(true);
      expect(schueler.length).toBeGreaterThan(500);
      expect(loesung.length).toBeGreaterThan(500);
      expect(schueler.equals(loesung)).toBe(false);
    });
  }
});

describe('Glue: Renderer-Integration (mit fixture)', () => {
  it('renderDocument erzeugt 2 gueltige .docx aus einem validen Dokument', async () => {
    const { renderDocument } = await import('@lehrunterlagen/renderer');
    const { schueler, loesung } = await renderDocument(mockLlmOutput);

    expect(schueler).toBeInstanceOf(Buffer);
    expect(loesung).toBeInstanceOf(Buffer);
    expect(isDocx(schueler)).toBe(true);
    expect(isDocx(loesung)).toBe(true);
    expect(schueler.length).toBeGreaterThan(500);
    expect(loesung.length).toBeGreaterThan(500);
    expect(schueler.equals(loesung)).toBe(false);
  });
});
