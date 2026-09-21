import { describe, it, expect } from 'vitest';
import { transformiereLeicht, istOffenerBlock, findeOffeneBlockIds } from './niveauTransform';
import type { DocumentV1 } from '@lehrunterlagen/schema';

function makeDoc(blocks: any[]): DocumentV1 {
  return {
    schemaVersion: '0.1.0',
    meta: { titel: 'Test', fach: 'Deutsch', stufe: '9', schulstufe: 'Oberstufe' },
    bloecke: blocks.map((b, i) => ({ id: `b${i}`, punkte: 10, ...b })),
  } as DocumentV1;
}

describe('transformiereLeicht — offene Typen', () => {
  it('offeneVerstaendnisfrage: +2 Zeilen pro Frage', () => {
    const doc = makeDoc([{
      typ: 'offeneVerstaendnisfrage',
      config: { fragen: [{ nr: 1, frage: 'Warum?', zeilen: 4 }, { nr: 2, frage: 'Wie?', zeilen: 6 }] },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.fragen[0].zeilen).toBe(6);
    expect(cfg.fragen[1].zeilen).toBe(8);
  });

  it('offeneSchreibaufgabe: -30% Wortbereich', () => {
    const doc = makeDoc([{
      typ: 'offeneSchreibaufgabe',
      config: { umfangWorte: { min: 100, max: 200 }, aspekte: ['Aspekt 1'] },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.umfangWorte.min).toBe(70);
    expect(cfg.umfangWorte.max).toBe(140);
  });
});

describe('transformiereLeicht — geschlossene Typen', () => {
  it('lueckentext: max. 4 Lücken, max. 2 Distraktoren', () => {
    const doc = makeDoc([{
      typ: 'lueckentext',
      config: { anzahlLuecken: 7, wortbank: true, distraktoren: 5 },
      loesung: { luecken: [{ nr: 1, wort: 'a' }, { nr: 2, wort: 'b' }, { nr: 3, wort: 'c' }, { nr: 4, wort: 'd' }, { nr: 5, wort: 'e' }, { nr: 6, wort: 'f' }, { nr: 7, wort: 'g' }] },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.anzahlLuecken).toBe(4);
    expect(cfg.distraktoren).toBe(2);
  });

  it('multipleChoice: max. 3 Fragen, mehfach: false', () => {
    const doc = makeDoc([{
      typ: 'multipleChoice',
      config: {
        fragen: [
          { nr: 1, frage: 'Q1', optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }, { key: 'D', text: 'd' }], mehfach: true },
          { nr: 2, frage: 'Q2', optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }, { key: 'D', text: 'd' }], mehfach: true },
          { nr: 3, frage: 'Q3', optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }, { key: 'D', text: 'd' }], mehfach: true },
          { nr: 4, frage: 'Q4', optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }, { key: 'D', text: 'd' }], mehfach: true },
        ],
      },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.fragen.length).toBe(3);
    // Debug: log actual values
    const mehfachValues = cfg.fragen.map((f: any) => f.mehrfach);
    console.log('mehrfach values:', JSON.stringify(mehrfachValues));
    expect(mehrfachValues.every((v: any) => v === false)).toBe(true);
  });

  it('matching: max. 3 Items, optionen = items + 1', () => {
    const doc = makeDoc([{
      typ: 'matching',
      config: {
        items: [{ nr: 1, prompt: 'A' }, { nr: 2, prompt: 'B' }, { nr: 3, prompt: 'C' }, { nr: 4, prompt: 'D' }],
        optionen: [{ key: '1', text: 'X' }, { key: '2', text: 'Y' }, { key: '3', text: 'Z' }, { key: '4', text: 'W' }, { key: '5', text: 'V' }],
      },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.items.length).toBe(3);
    expect(cfg.optionen.length).toBe(4);
  });

  it('kategorisierung: max. 4 Items, max. 2 Kategorien', () => {
    const doc = makeDoc([{
      typ: 'kategorisierung',
      config: {
        items: [{ nr: 1, text: 'A', kategorie: 'X' }, { nr: 2, text: 'B', kategorie: 'Y' }, { nr: 3, text: 'C', kategorie: 'X' }, { nr: 4, text: 'D', kategorie: 'Y' }, { nr: 5, text: 'E', kategorie: 'X' }],
        kategorien: [{ name: 'X', anzahlItems: 3 }, { name: 'Y', anzahlItems: 2 }, { name: 'Z', anzahlItems: 0 }],
      },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.items.length).toBe(4);
    expect(cfg.kategorien.length).toBe(2);
  });

  it('vokabeluebung: max. 5 Vokabeln, Richtung de_fremd', () => {
    const doc = makeDoc([{
      typ: 'vokabeluebung',
      config: {
        richtung: 'fremd_de',
        anzahlVokabeln: 8,
        vokabeln: Array.from({ length: 8 }, (_, i) => ({ deutsch: `d${i}`, fremdsprache: `f${i}` })),
      },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.vokabeln.length).toBe(5);
    expect(cfg.anzahlVokabeln).toBe(5);
    expect(cfg.richtung).toBe('de_fremd');
  });

  it('fehlerkorrektur: max. 3 Sätze', () => {
    const doc = makeDoc([{
      typ: 'fehlerkorrektur',
      config: {
        saetze: [
          { nr: 1, satz: 'S1', anzahlFehler: 1 },
          { nr: 2, satz: 'S2', anzahlFehler: 1 },
          { nr: 3, satz: 'S3', anzahlFehler: 1 },
          { nr: 4, satz: 'S4', anzahlFehler: 1 },
          { nr: 5, satz: 'S5', anzahlFehler: 1 },
        ],
      },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.saetze.length).toBe(3);
  });

  it('wordScramble: max. 4 Sätze', () => {
    const doc = makeDoc([{
      typ: 'wordScramble',
      config: { saetze: [{ wort: 'a' }, { wort: 'b' }, { wort: 'c' }, { wort: 'd' }, { wort: 'e' }] },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.saetze.length).toBe(4);
  });

  it('tabelle: max. 3 Zeilen', () => {
    const doc = makeDoc([{
      typ: 'tabelle',
      config: {
        spalten: [{ titel: 'A', breiteProzent: 50 }, { titel: 'B', breiteProzent: 50 }],
        zeilen: [
          { nr: 1, zellen: [{ text: 'x' }, { luecke: true, lueckenId: 1 }] },
          { nr: 2, zellen: [{ text: 'y' }, { luecke: true, lueckenId: 2 }] },
          { nr: 3, zellen: [{ text: 'z' }, { luecke: true, lueckenId: 3 }] },
          { nr: 4, zellen: [{ text: 'w' }, { luecke: true, lueckenId: 4 }] },
        ],
      },
      loesung: { zellen: [{ nr: 1, wort: 'L1' }, { nr: 2, wort: 'L2' }, { nr: 3, wort: 'L3' }, { nr: 4, wort: 'L4' }] },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0].config as any;
    expect(cfg.zeilen.length).toBe(3);
  });
});

describe('transformiereLeicht — unveränderte Typen', () => {
  it('roleplay bleibt unverändert', () => {
    const doc = makeDoc([{
      typ: 'roleplay',
      config: { situation: 'Sit', rollen: [{ name: 'A', beschreibung: 'B' }] },
    }]);
    const result = transformiereLeicht(doc);
    expect(result.bloecke[0].typ).toBe('roleplay');
  });
});

describe('istOffenerBlock', () => {
  it('erkennt offene Typen', () => {
    expect(istOffenerBlock({ typ: 'offeneVerstaendnisfrage' } as any)).toBe(true);
    expect(istOffenerBlock({ typ: 'offeneSchreibaufgabe' } as any)).toBe(true);
    expect(istOffenerBlock({ typ: 'markieraufgabe' } as any)).toBe(true);
  });
  it('erkennt geschlossene Typen', () => {
    expect(istOffenerBlock({ typ: 'lueckentext' } as any)).toBe(false);
    expect(istOffenerBlock({ typ: 'multipleChoice' } as any)).toBe(false);
  });
});

describe('findeOffeneBlockIds', () => {
  it('liefert IDs offener Blöcke', () => {
    const doc = makeDoc([
      { typ: 'offeneVerstaendnisfrage' },
      { typ: 'lueckentext' },
      { typ: 'offeneSchreibaufgabe' },
    ]);
    expect(findeOffeneBlockIds(doc)).toEqual(['b0', 'b2']);
  });
});
