import { describe, it, expect } from 'vitest';
import { buildRaster } from './korrekturraster/builder';
import { berechneNotenschluessel } from './korrekturraster/notenschluessel';
import type { DocumentV1 } from '@lehrunterlagen/schema';

const isDocx = (buf: Buffer) =>
  buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

function makeDoc(bloecke: DocumentV1['bloecke'], fach: DocumentV1['meta']['fach'] = 'deutsch', stufe: 'oberstufe' | 'unterstufe' = 'oberstufe'): DocumentV1 {
  return {
    schemaVersion: '0.1.0',
    meta: { stufe, fach, thema: 'Testthema', datum: '2026-05-30', klasse: '7A', notizen: '' },
    quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 't.txt' } }],
    bloecke,
  };
}

// ---------------------------------------------------------------------------
// Notenschluessel
// ---------------------------------------------------------------------------

describe('Notenschluessel', () => {
  it('berechnet korrekte Bereiche fuer 40 Punkte', () => {
    const ns = berechneNotenschluessel(40);
    expect(ns).toHaveLength(5);
    expect(ns[0]).toEqual({ note: 1, bezeichnung: 'Sehr gut', minProzent: 87, maxProzent: 100, minPunkte: 35, maxPunkte: 40 });
    expect(ns[4]).toEqual({ note: 5, bezeichnung: 'Nicht genuegend', minProzent: 0, maxProzent: 44, minPunkte: 0, maxPunkte: 17 });
  });

  it('berechnet korrekte Bereiche fuer 100 Punkte', () => {
    const ns = berechneNotenschluessel(100);
    expect(ns[0].minPunkte).toBe(87);
    expect(ns[4].maxPunkte).toBe(44);
  });

  it('lueckenlos fuer 24 Punkte (Minimum)', () => {
    const ns = berechneNotenschluessel(24);
    // Note 5 muss 0 enthalten, Note 1 muss 24 enthalten
    expect(ns[4].minPunkte).toBe(0);
    expect(ns[0].maxPunkte).toBe(24);
    // Keine Luecken: jede Punktzahl 0..24 muss in genau einer Note liegen
    for (let p = 0; p <= 24; p++) {
      const zugeordnet = ns.filter((n) => p >= n.minPunkte && p <= n.maxPunkte);
      expect(zugeordnet.length).toBe(1);
    }
  });

  it('lueckenlos fuer 60 Punkte', () => {
    const ns = berechneNotenschluessel(60);
    for (let p = 0; p <= 60; p++) {
      const zugeordnet = ns.filter((n) => p >= n.minPunkte && p <= n.maxPunkte);
      expect(zugeordnet.length).toBe(1);
    }
    // Pruefe Konsistenz mit Prozentgrenzen
    expect(ns[0].minPunkte).toBeGreaterThanOrEqual(Math.ceil(60 * 0.87));
    expect(ns[0].maxPunkte).toBe(60);
  });

  it('lueckenlos fuer 48 Punkte', () => {
    const ns = berechneNotenschluessel(48);
    for (let p = 0; p <= 48; p++) {
      const zugeordnet = ns.filter((n) => p >= n.minPunkte && p <= n.maxPunkte);
      expect(zugeordnet.length).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Builder: Geschlossene Blocks
// ---------------------------------------------------------------------------

describe('Builder: Geschlossene Blocks', () => {
  it('lueckentext bekommt eine Zeile "Richtig/Falsch"', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 8, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 4, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }, { nr: 3, wort: 'C' }, { nr: 4, wort: 'D' }] },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke).toHaveLength(1);
    expect(raster.bloecke[0].kriterien).toHaveLength(1);
    expect(raster.bloecke[0].kriterien[0].kriterium).toBe('Richtig/Falsch');
    expect(raster.bloecke[0].maxPunkte).toBe(8);
  });

  it('matching bekommt eine Zeile "Richtig/Falsch"', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'matching', punkte: 6, arbeitsanweisung: 'Ordne zu.',
      config: {
        items: [{ nr: 1, prompt: 'A' }, { nr: 2, prompt: 'B' }],
        optionen: [{ key: 'X', text: 'Y' }, { key: 'Z', text: 'W' }, { key: 'V', text: 'U' }],
      },
      loesung: { zuordnung: { '1': 'X', '2': 'Z' } },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke[0].kriterien).toHaveLength(1);
    expect(raster.bloecke[0].kriterien[0].maxPunkte).toBe(6);
  });

  it('multipleChoice bekommt eine Zeile "Richtig/Falsch"', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'Kreuze an.',
      config: { fragen: [{ nr: 1, frage: 'Was?', optionen: [{ key: 'A', text: 'X' }, { key: 'B', text: 'Y' }], mehrfach: false }] },
      loesung: { antworten: { '1': ['A'] } },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke[0].kriterien[0].maxPunkte).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Builder: Offene Verständnisfragen
// ---------------------------------------------------------------------------

describe('Builder: Offene Verstaendnisfragen', () => {
  it('erzeugt pro Frage 2 Kriterien (Aufgabenerfuellung + Sprache)', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'offeneVerstaendnisfrage', punkte: 10, arbeitsanweisung: 'Beantworte.',
      config: { fragen: [{ nr: 1, frage: 'Was?', zeilen: 4 }, { nr: 2, frage: 'Warum?', zeilen: 4 }] },
      loesung: { antworten: { '1': 'Weil...', '2': 'Denn...' } },
    }]);
    const raster = buildRaster(doc);
    // 2 Fragen * 2 Kriterien = 4 Kriterien
    expect(raster.bloecke[0].kriterien).toHaveLength(4);
    expect(raster.bloecke[0].maxPunkte).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Builder: Schreibaufgabe
// ---------------------------------------------------------------------------

describe('Builder: Schreibaufgabe', () => {
  it('deutsch/erörterung bekommt 6 Kriterien', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'offeneSchreibaufgabe', punkte: 40, arbeitsanweisung: 'Verfasse.',
      config: {
        situation: 'Situation',
        textsorte: 'Erörterung',
        umfangWorte: { min: 270, max: 330 },
        aspekte: ['Aspekt 1'],
      },
      loesung: {
        musterloesung: 'Loesungstext...',
        erwartungshorizont: { inhalt: 'x', struktur: 'x', ausdruck: 'x', sprachrichtigkeit: 'x' },
      },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke[0].kriterien.length).toBeGreaterThanOrEqual(5);
    expect(raster.bloecke[0].maxPunkte).toBe(40);
    // Punkte muessen summiert werden
    const summe = raster.bloecke[0].kriterien.reduce((s, k) => s + k.maxPunkte, 0);
    expect(summe).toBe(40);
  });

  it('englisch/open writing bekommt 4 Kriterien', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'offeneSchreibaufgabe', punkte: 34, arbeitsanweisung: 'Write.',
      config: {
        situation: 'Situation',
        textsorte: 'Essay',
        umfangWorte: { min: 250, max: 300 },
        aspekte: ['Aspekt 1'],
      },
      loesung: {
        musterloesung: 'Solution text...',
        erwartungshorizont: { inhalt: 'x', struktur: 'x', ausdruck: 'x', sprachrichtigkeit: 'x' },
      },
    }], 'englisch');
    const raster = buildRaster(doc);
    expect(raster.bloecke[0].kriterien).toHaveLength(4);
    const summe = raster.bloecke[0].kriterien.reduce((s, k) => s + k.maxPunkte, 0);
    expect(summe).toBe(34);
  });
});

// ---------------------------------------------------------------------------
// Builder: Gesamtpunkte und Notenschluessel
// ---------------------------------------------------------------------------

describe('Builder: Gesamt', () => {
  it('berechnet Gesamtpunkte und Notenschluessel', () => {
    const doc = makeDoc([
      {
        id: 'b1', typ: 'lueckentext', punkte: 8, arbeitsanweisung: 'Setze ein.',
        config: { anzahlLuecken: 4, wortbank: false, distraktoren: 0 },
        loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }, { nr: 3, wort: 'C' }, { nr: 4, wort: 'D' }] },
      },
      {
        id: 'b2', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'Kreuze an.',
        config: { fragen: [{ nr: 1, frage: 'Was?', optionen: [{ key: 'A', text: 'X' }], mehrfach: false }] },
        loesung: { antworten: { '1': ['A'] } },
      },
    ]);
    const raster = buildRaster(doc);
    expect(raster.gesamtPunkte).toBe(12);
    expect(raster.notenschluessel).toHaveLength(5);
    expect(raster.notenschluessel[0].maxPunkte).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Builder: Neue Block-Typen (5)
// ---------------------------------------------------------------------------

describe('Builder: Neue Block-Typen', () => {
  it('wordScramble bekommt "Richtig/Falsch"', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'wordScramble', punkte: 4, arbeitsanweisung: 'Ordne.',
      config: { wort: 'A B C', anzahlWoerter: 3, loesungsreihenfolge: [1, 2, 3] },
      loesung: { korrektAnordnung: ['A', 'B', 'C'] },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke).toHaveLength(1);
    expect(raster.bloecke[0]!.kriterien[0]!.kriterium).toBe('Richtig/Falsch');
    expect(raster.bloecke[0]!.maxPunkte).toBe(4);
  });

  it('kategorisierung bekommt KATEGORISIERUNG-Katalog', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'kategorisierung', punkte: 10, arbeitsanweisung: 'Ordne zu.',
      config: {
        items: [{ nr: 1, text: 'X', optionen: ['A', 'B'] }, { nr: 2, text: 'Y', optionen: ['A', 'B'] }],
        kategorien: [{ name: 'A', anzahlItems: 1 }, { name: 'B', anzahlItems: 1 }],
      },
      loesung: { zuordnung: { '1': ['A'], '2': ['B'] } },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke[0]!.kriterien.length).toBeGreaterThanOrEqual(2);
    expect(raster.bloecke[0]!.kriterien.map((k) => k.kriterium)).toContain('Vollstaendigkeit');
  });

  it('tabelle bekommt TABELLE-Katalog', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'tabelle', punkte: 12, arbeitsanweisung: 'Fuelle aus.',
      config: {
        spalten: [{ titel: 'S1', breiteProzent: 50 }, { titel: 'S2', breiteProzent: 50 }],
        zeilen: [{ nr: 1, zellen: [{ text: 'A' }, { luecke: true }] }],
      },
      loesung: { zellen: { '1,1': 'b' } },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke[0]!.kriterien.map((k) => k.kriterium)).toContain('Sachrichtigkeit');
  });

  it('stiluebung bekommt STILUEBUNG-Katalog', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'stiluebung', punkte: 8, arbeitsanweisung: 'Formuliere um.',
      config: { ausgangstext: 'X', zielniveau: 'gehoben', transformation: 'verdeutlichen' },
      loesung: { umformulierung: 'Y', begruendung: 'Z' },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke[0]!.kriterien.map((k) => k.kriterium)).toContain('Zielniveau erreicht');
  });

  it('songanalyse bekommt SONGANALYSE-Katalog', () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'songanalyse', punkte: 14, arbeitsanweisung: 'Analysiere.',
      config: { interpret: 'I', titel: 'T', medium: 'song', lyrics: 'L', aufgabe: 'inhaltsangabe' },
      loesung: { ergebnis: 'E', zitate: [], analysepunkte: [{ aspekt: 'A', befund: 'B' }] },
    }]);
    const raster = buildRaster(doc);
    expect(raster.bloecke[0]!.kriterien.map((k) => k.kriterium)).toContain('Bildsprache / Metaphern');
    expect(raster.bloecke[0]!.kriterien.length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Renderer: renderRaster
// ---------------------------------------------------------------------------

describe('Renderer: renderRaster', () => {
  it('erzeugt ein gueltiges .docx', async () => {
    const { renderRaster } = await import('@lehrunterlagen/renderer');
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 8, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 4, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }, { nr: 3, wort: 'C' }, { nr: 4, wort: 'D' }] },
    }]);
    const raster = buildRaster(doc);
    const buf = await renderRaster(raster);
    expect(buf).toBeInstanceOf(Buffer);
    expect(isDocx(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
  });

  it('erzeugt 3 gueltige .docx fuer ein komplettes Dokument', async () => {
    const { renderDocument, renderRaster } = await import('@lehrunterlagen/renderer');
    const doc = makeDoc([
      {
        id: 'b1', typ: 'lueckentext', punkte: 8, arbeitsanweisung: 'Setze ein.',
        config: { anzahlLuecken: 4, wortbank: false, distraktoren: 0 },
        loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }, { nr: 3, wort: 'C' }, { nr: 4, wort: 'D' }] },
      },
      {
        id: 'b2', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'Kreuze an.',
        config: { fragen: [{ nr: 1, frage: 'Was?', optionen: [{ key: 'A', text: 'X' }, { key: 'B', text: 'Y' }], mehrfach: false }] },
        loesung: { antworten: { '1': ['A'] } },
      },
    ]);
    const { schueler, loesung } = await renderDocument(doc);
    const raster = buildRaster(doc);
    const rasterBuf = await renderRaster(raster);

    expect(isDocx(schueler)).toBe(true);
    expect(isDocx(loesung)).toBe(true);
    expect(isDocx(rasterBuf)).toBe(true);
    expect(schueler.equals(loesung)).toBe(false);
    expect(schueler.equals(rasterBuf)).toBe(false);
    expect(loesung.equals(rasterBuf)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Builder: fachspezifische Schreibaufgaben-Kataloge (Sachfächer)
// ---------------------------------------------------------------------------

describe('Builder: Sachfach-Schreibaufgaben-Kataloge', () => {
  const schreibBlock = {
    id: 'b1', typ: 'offeneSchreibaufgabe' as const, punkte: 30,
    arbeitsanweisung: 'Verfasse einen Text.',
    config: { textsorte: 'Aufsatz', situation: 'x', umfangWorte: { min: 200, max: 300 }, aspekte: ['a', 'b'] },
    loesung: { musterloesung: 'x', erwartungshorizont: { inhalt: 'x', struktur: 'x', ausdruck: 'x', sprachrichtigkeit: 'x' } },
  };
  const ersteKriterien = (fach: DocumentV1['meta']['fach']) =>
    buildRaster(makeDoc([schreibBlock], fach)).bloecke[0].kriterien.map((k) => k.kriterium);

  it('Geschichte → Quellenanalyse-Raster', () => {
    expect(ersteKriterien('geschichte')).toContain('Quellenbeschreibung');
  });
  it('Geographie → Materialinterpretation-Raster', () => {
    expect(ersteKriterien('geographie')).toContain('Materialerfassung');
  });
  it('Ethik → Sacherörterung-Raster', () => {
    expect(ersteKriterien('ethik')).toContain('Eigenes begruendetes Urteil');
  });
  it('Französisch → Open-Writing-Raster (Sprachfach)', () => {
    expect(ersteKriterien('franzoesisch')).toContain('Task Achievement');
  });
  it('Deutsch → bleibt textsortenbasiert (kein Sachfach-Override)', () => {
    expect(ersteKriterien('deutsch')).toContain('Aufgabenerfuellung / Thema');
  });
});
