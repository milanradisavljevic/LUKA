import { describe, it, expect } from 'vitest';
import { transformiereLeicht, transformiereSchwer, istOffenerBlock, findeOffeneBlockIds, metaFuerSchwereVariante, erstelleSichereSchwereVariante } from './niveauTransform';
import type { DocumentV1 } from '@lehrunterlagen/schema';

function makeDoc(blocks: any[]): DocumentV1 {
  return {
    schemaVersion: '0.1.0',
    meta: { titel: 'Test', fach: 'deutsch', stufe: '9', schulstufe: 'Oberstufe', thema: '', datum: '', klasse: '', notizen: '' },
    bloecke: blocks.map((b, i) => ({ id: `b${i}`, punkte: 10, ...b })),
    quelltexte: [],
  } as unknown as DocumentV1;
}

describe('metaFuerSchwereVariante', () => {
  it('hebt Schwierigkeit und Kompetenzniveau gemeinsam an', () => {
    const meta = metaFuerSchwereVariante({
      fach: 'deutsch',
      stufe: 'unterstufe',
      schwierigkeit: 'leicht',
      kompetenzNiveau: 'basis',
    } as DocumentV1['meta']);
    expect(meta.schwierigkeit).toBe('schwer');
    expect(meta.kompetenzNiveau).toBe('erweitert');
    expect(meta.fach).toBe('deutsch');
    expect(meta.stufe).toBe('unterstufe');
  });
});

describe('transformiereLeicht — offene Typen', () => {
  it('offeneVerstaendnisfrage: +2 Zeilen pro Frage', () => {
    const doc = makeDoc([{
      typ: 'offeneVerstaendnisfrage',
      config: { fragen: [{ nr: 1, frage: 'Warum?', zeilen: 4 }, { nr: 2, frage: 'Wie?', zeilen: 6 }] },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.fragen[0].zeilen).toBe(6);
    expect(cfg.fragen[1].zeilen).toBe(8);
  });

  it('offeneSchreibaufgabe: -30% Wortbereich', () => {
    const doc = makeDoc([{
      typ: 'offeneSchreibaufgabe',
      config: { umfangWorte: { min: 100, max: 200 }, aspekte: ['Aspekt 1'] },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0]!.config as any;
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
    const cfg = result.bloecke[0]!.config as any;
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
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.fragen.length).toBe(3);
    expect(cfg.fragen.every((frage: any) => frage.mehfach === false)).toBe(true);
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
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.items.length).toBe(3);
    expect(cfg.optionen.length).toBe(4);
  });

  it('matching ohne items crasht nicht (leere Arrays)', () => {
    const doc = makeDoc([{ typ: 'matching', config: {} }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.items).toEqual([]);
    expect(cfg.optionen).toEqual([]);
  });

  it('kategorisierung ohne items crasht nicht', () => {
    const doc = makeDoc([{ typ: 'kategorisierung', config: {} }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.items).toEqual([]);
    expect(cfg.kategorien).toEqual([]);
  });

  it('fehlerkorrektur ohne saetze crasht nicht', () => {
    const doc = makeDoc([{ typ: 'fehlerkorrektur', config: {} }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.saetze).toEqual([]);
    expect(cfg.anzahlSaetze).toBe(1);
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
    const cfg = result.bloecke[0]!.config as any;
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
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.vokabeln.length).toBe(5);
    expect(cfg.anzahlVokabeln).toBe(5);
    expect(cfg.richtung).toBe('de_fremd');
  });

  it('fehlerkorrektur: max. 3 Sätze', () => {
    const doc = makeDoc([{
      typ: 'fehlerkorrektur',
      config: {
        anzahlSaetze: 5,
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
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.saetze.length).toBe(3);
    expect(cfg.anzahlSaetze).toBe(3);
  });

  it('wordScramble: max. 4 Sätze', () => {
    const doc = makeDoc([{
      typ: 'wordScramble',
      config: { saetze: [{ wort: 'a' }, { wort: 'b' }, { wort: 'c' }, { wort: 'd' }, { wort: 'e' }] },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.saetze.length).toBe(4);
  });

  it('tabelle: max. 3 Zeilen und füllt Lücken über den echten Lösungsschlüssel', () => {
    const doc = makeDoc([{
      typ: 'tabelle',
      config: {
        spalten: [{ titel: 'A', breiteProzent: 50 }, { titel: 'B', breiteProzent: 50 }],
        zeilen: [
          { nr: 1, zellen: [{ luecke: true }, { text: 'B1' }] },
          { nr: 2, zellen: [{ luecke: true }, { text: 'B2' }] },
          { nr: 3, zellen: [{ luecke: true }, { text: 'B3' }] },
          { nr: 4, zellen: [{ luecke: true }, { text: 'B4' }] },
        ],
      },
      loesung: { zellen: { '1,0': 'L1', '2,0': 'L2', '3,0': 'L3', '4,0': 'L4' } },
    }]);
    const result = transformiereLeicht(doc);
    const cfg = result.bloecke[0]!.config as any;
    expect(cfg.zeilen.length).toBe(3);
    expect(cfg.zeilen[0].zellen[0]).toEqual({ text: 'L1' });
    expect(cfg.zeilen[1].zellen[0]).toEqual({ luecke: true });
  });
});

describe('transformiereLeicht — unveränderte Typen', () => {
  it('roleplay bleibt unverändert', () => {
    const doc = makeDoc([{
      typ: 'roleplay',
      config: { situation: 'Sit', rollen: [{ name: 'A', beschreibung: 'B' }] },
    }]);
    const result = transformiereLeicht(doc);
    expect(result.bloecke[0]!.typ).toBe('roleplay');
  });
});

describe('transformiereSchwer — sichere Differenzierung', () => {
  it('reduziert Antwortzeilen und erhöht den Wortumfang offener Aufgaben', () => {
    const result = transformiereSchwer(makeDoc([
      {
        id: 'frage', typ: 'offeneVerstaendnisfrage', punkte: 2,
        arbeitsanweisung: 'Antworte.',
        config: { fragen: [{ nr: 1, frage: 'Warum?', zeilen: 3 }] },
        loesung: { antworten: { '1': 'Weil.' } },
      },
      {
        id: 'schreiben', typ: 'offeneSchreibaufgabe', punkte: 4,
        arbeitsanweisung: 'Schreibe.',
        config: { situation: 'S', textsorte: 'Kommentar', umfangWorte: { min: 100, max: 140 }, aspekte: ['A'] },
        loesung: { musterloesung: 'M', erwartungshorizont: { inhalt: 'I', struktur: 'S', ausdruck: 'A', sprachrichtigkeit: 'R' } },
      },
    ]));
    expect(result.bloecke[0]?.config).toMatchObject({ fragen: [{ zeilen: 2 }] });
    expect(result.bloecke[1]?.config).toMatchObject({ umfangWorte: { min: 125, max: 175 } });
  });

  it('erhöht auch sehr kleine Wortbereiche mindestens um ein Wort', () => {
    const result = transformiereSchwer(makeDoc([{
      id: 'kurz', typ: 'offeneSchreibaufgabe', punkte: 1,
      arbeitsanweisung: 'Schreibe.',
      config: { situation: 'S', textsorte: 'Notiz', umfangWorte: { min: 1, max: 1 }, aspekte: ['A'] },
      loesung: { musterloesung: 'M', erwartungshorizont: { inhalt: 'I', struktur: 'S', ausdruck: 'A', sprachrichtigkeit: 'R' } },
    }]));
    expect(result.bloecke[0]?.config).toMatchObject({ umfangWorte: { min: 2, max: 2 } });
  });

  it('erhöht Lücken nur innerhalb des vorhandenen Lösungsschlüssels', () => {
    const result = transformiereSchwer(makeDoc([{
      id: 'l', typ: 'lueckentext', punkte: 3,
      arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 2, wortbank: true, distraktoren: 1, distraktorWoerter: ['x', 'y', 'z'] },
      loesung: { luecken: [{ nr: 1, wort: 'a' }, { nr: 2, wort: 'b' }, { nr: 3, wort: 'c' }] },
    }]));
    expect(result.bloecke[0]?.config).toMatchObject({ anzahlLuecken: 3, wortbank: false });
  });

  it('gleicht Cloze-Marker nur mit lückenlosen vorhandenen Lösungsschlüsseln ab', () => {
    const result = transformiereSchwer(makeDoc([{
      id: 'cloze', typ: 'lueckentext', punkte: 3,
      arbeitsanweisung: 'Setze ein.',
      text: 'A (1) ___, dann (2) ___ und zuletzt (3) ___.',
      config: { anzahlLuecken: 2, wortbank: true, distraktoren: 1 },
      loesung: { luecken: [{ nr: 1, wort: 'a' }, { nr: 2, wort: 'b' }, { nr: 3, wort: 'c' }] },
    }]));
    expect(result.bloecke[0]?.config).toMatchObject({ anzahlLuecken: 3, wortbank: false });
  });

  it('lässt die Markerzahl bei unvollständigem Lösungsschlüssel unverändert', () => {
    const result = transformiereSchwer(makeDoc([{
      id: 'cloze', typ: 'lueckentext', punkte: 3,
      arbeitsanweisung: 'Setze ein.',
      text: 'A (1) ___, dann (2) ___.',
      config: { anzahlLuecken: 2, wortbank: true, distraktoren: 1 },
      loesung: { luecken: [{ nr: 1, wort: 'a' }] },
    }]));
    expect(result.bloecke[0]?.config).toMatchObject({ anzahlLuecken: 2, wortbank: false });
  });
});

describe('erstelleSichereSchwereVariante', () => {
  it('meldet geschlossene, nicht transformierbare Blöcke als unverändert', () => {
    const result = erstelleSichereSchwereVariante(makeDoc([{
      typ: 'multipleChoice',
      config: { fragen: [{ nr: 1, frage: 'Frage?', mehrfach: false, optionen: [] }] },
      loesung: { antworten: { '1': ['A'] } },
    }]));
    expect(result.geaendert).toBe(false);
  });

  it('erkennt eine sichere Änderung an einem Lückentext', () => {
    const result = erstelleSichereSchwereVariante(makeDoc([{
      typ: 'lueckentext',
      config: { anzahlLuecken: 1, wortbank: true, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Wort' }] },
    }]));
    expect(result.geaendert).toBe(true);
    expect(result.dokument.bloecke[0]?.config).toMatchObject({ wortbank: false });
  });

  it('macht nur Tabellenzellen mit vorhandenem Lösungseintrag zusätzlich zur Lücke', () => {
    const result = erstelleSichereSchwereVariante(makeDoc([{
      typ: 'tabelle',
      config: {
        spalten: [{ titel: 'A', breiteProzent: 50 }, { titel: 'B', breiteProzent: 50 }],
        zeilen: [
          { nr: 1, zellen: [{ text: 'vorhandene Antwort' }, { text: 'bleibt sichtbar' }] },
          { nr: 2, zellen: [{ text: 'keine Lösung vorhanden' }, { text: 'noch eine Antwort' }] },
        ],
      },
      loesung: { zellen: { '1,0': 'vorhandene Antwort', '2,1': 'noch eine Antwort' } },
    }]));
    expect(result.geaendert).toBe(true);
    const zeilen = (result.dokument.bloecke[0]!.config as any).zeilen;
    expect(zeilen[0].zellen).toEqual([{ luecke: true }, { text: 'bleibt sichtbar' }]);
    expect(zeilen[1].zellen).toEqual([{ text: 'keine Lösung vorhanden' }, { luecke: true }]);
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
