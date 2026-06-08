import { describe, it, expect } from 'vitest';
import { parseAndValidate } from './validate.js';
import { buildMessages } from './prompt.js';
import type { Meta } from '@lehrunterlagen/schema';

// Sichert den ECHTEN Generierungspfad (prompt → normalize → transform → Zod) für die
// 5 neuen Aufgabentypen ab — ohne Mock-Provider (im Gegensatz zur QA-Suite).

const meta: Meta = {
  stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-06-05', klasse: '7A', notizen: '',
};
const quelltexte = [
  { id: 'q1', titel: 'Quelle', inhalt: 'Ein ausreichend langer Quelltext zum Thema.', herkunft: { typ: 'upload' as const, ref: 'x.txt' } },
];

async function expectOk(raw: string) {
  const res = await parseAndValidate(raw, meta, quelltexte);
  if (!res.ok) throw new Error('parseAndValidate fehlgeschlagen: ' + res.fehler);
  return res.document!;
}

describe('Neue Typen: echter parseAndValidate-Pfad', () => {
  it('wordScramble validiert', async () => {
    const doc = await expectOk(JSON.stringify([{
      id: 'b1', typ: 'wordScramble', punkte: 4, quelleId: 'q1', arbeitsanweisung: 'Ordne.',
      config: { wort: 'Die Katze schlaeft tief', anzahlWoerter: 4, loesungsreihenfolge: [1, 2, 3, 4] },
      loesung: { korrektAnordnung: ['Die', 'Katze', 'schlaeft', 'tief'] },
    }]));
    expect(doc.bloecke[0]?.typ).toBe('wordScramble');
  });

  it('wordScramble: normalize ergänzt fehlende loesungsreihenfolge + korrektAnordnung', async () => {
    const doc = await expectOk(JSON.stringify([{
      id: 'b1', typ: 'wordScramble', punkte: 4, quelleId: 'q1', arbeitsanweisung: 'Ordne.',
      config: { wort: 'Die Katze schlaeft tief', anzahlWoerter: '4' }, // String + fehlende Felder
    }]));
    const b = doc.bloecke[0];
    expect(b?.typ === 'wordScramble' && b.config.loesungsreihenfolge).toEqual([1, 2, 3, 4]);
  });

  it('kategorisierung validiert UND koerced zuordnung-String → Array', async () => {
    const doc = await expectOk(JSON.stringify([{
      id: 'b1', typ: 'kategorisierung', punkte: 4, quelleId: 'q1', arbeitsanweisung: 'Ordne zu.',
      config: {
        kategorien: [{ name: 'Verdauung', anzahlItems: 1 }, { name: 'Atmung', anzahlItems: 1 }],
        items: [{ nr: 1, text: 'Magen', optionen: ['Verdauung', 'Atmung'] }, { nr: 2, text: 'Lunge', optionen: ['Verdauung', 'Atmung'] }],
      },
      loesung: { zuordnung: { '1': 'Verdauung', '2': 'Atmung' } }, // String statt Array → normalize fixt
    }]));
    const b = doc.bloecke[0];
    expect(b?.typ === 'kategorisierung' && b.loesung.zuordnung['1']).toEqual(['Verdauung']);
  });

  it('tabelle validiert (echte Lücken)', async () => {
    const doc = await expectOk(JSON.stringify([{
      id: 'b1', typ: 'tabelle', punkte: 6, quelleId: 'q1', arbeitsanweisung: 'Fuelle aus.',
      config: {
        spalten: [{ titel: 'Epoche', breiteProzent: 50 }, { titel: 'Zeitraum', breiteProzent: 50 }],
        zeilen: [{ nr: 1, zellen: [{ text: 'Klassik' }, { luecke: true }] }],
      },
      loesung: { zellen: { '1,1': '1786-1832' } },
    }]));
    expect(doc.bloecke[0]?.typ).toBe('tabelle');
  });

  it('stiluebung validiert', async () => {
    const doc = await expectOk(JSON.stringify([{
      id: 'b1', typ: 'stiluebung', punkte: 4, quelleId: 'q1', arbeitsanweisung: 'Formuliere um.',
      config: { ausgangstext: 'Der Typ war cool.', zielniveau: 'gehoben', transformation: 'verdeutlichen' },
      loesung: { umformulierung: 'Der junge Mann trat souveraen auf.', begruendung: 'Register angehoben.' },
    }]));
    expect(doc.bloecke[0]?.typ).toBe('stiluebung');
  });

  it('songanalyse validiert (zitate-String wird zu Array)', async () => {
    const doc = await expectOk(JSON.stringify([{
      id: 'b1', typ: 'songanalyse', punkte: 10, quelleId: 'q1', arbeitsanweisung: 'Analysiere.',
      config: { interpret: 'Band', titel: 'Lied', medium: 'song', aufgabe: 'sprachanalyse', lyrics: 'Erste Zeile.' },
      loesung: { ergebnis: 'Analyse.', zitate: 'Erste Zeile.', analysepunkte: [{ aspekt: 'Bild', befund: 'Metapher' }] },
    }]));
    expect(doc.bloecke[0]?.typ).toBe('songanalyse');
  });
});

describe('Neue Typen: Prompt-Vertrag', () => {
  const system = buildMessages({
    meta, quelltexte,
    bloecke: [{ typ: 'wordScramble', punkte: 4, quelleId: 'q1', anzahlWoerter: 4 }],
  }).find((m) => m.role === 'system')!.content;

  for (const typ of ['wordScramble', 'kategorisierung', 'tabelle', 'stiluebung', 'songanalyse']) {
    it(`System-Prompt enthält Regel + Beispiel für ${typ}`, () => {
      expect(system).toContain(typ);
      expect(system).toContain(`BEISPIEL fuer ${typ}`);
    });
  }

  it('System-Prompt enthält LERNZIELE-Tagging-Regel', () => {
    expect(system).toContain('LERNZIELE');
    expect(system).toContain('meta.lernziele');
  });
});

describe('Lernziel-Tagging (C-A): Block.lernziele', () => {
  const metaMitZielen: Meta = { ...meta, lernziele: ['Textverständnis', 'Stilmittel erkennen'] };

  it('akzeptiert und behält block.lernziele als Array', async () => {
    const res = await parseAndValidate(JSON.stringify([{
      id: 'b1', typ: 'multipleChoice', punkte: 4, quelleId: 'q1', arbeitsanweisung: 'Kreuze an.',
      lernziele: ['Textverständnis'],
      config: { fragen: [{ nr: 1, frage: 'Worum geht es?', optionen: [
        { key: 'A', text: 'Um den Text' }, { key: 'B', text: 'Um nichts' },
        { key: 'C', text: 'Um Zahlen' }, { key: 'D', text: 'Um Bilder' },
      ], korrekt: 'A', mehrfach: false }] },
    }]), metaMitZielen, quelltexte);
    if (!res.ok) throw new Error(res.fehler);
    const b = res.document!.bloecke[0];
    expect(b?.lernziele).toEqual(['Textverständnis']);
  });

  it('koerced block.lernziele von String zu Array', async () => {
    const res = await parseAndValidate(JSON.stringify([{
      id: 'b1', typ: 'multipleChoice', punkte: 4, quelleId: 'q1', arbeitsanweisung: 'Kreuze an.',
      lernziele: 'Stilmittel erkennen',
      config: { fragen: [{ nr: 1, frage: 'Welches Stilmittel?', optionen: [
        { key: 'A', text: 'Metapher' }, { key: 'B', text: 'Keines' },
        { key: 'C', text: 'Ironie' }, { key: 'D', text: 'Vergleich' },
      ], korrekt: 'A', mehrfach: false }] },
    }]), metaMitZielen, quelltexte);
    if (!res.ok) throw new Error(res.fehler);
    expect(res.document!.bloecke[0]?.lernziele).toEqual(['Stilmittel erkennen']);
  });

  it('verträgt fehlende lernziele (optional)', async () => {
    const res = await parseAndValidate(JSON.stringify([{
      id: 'b1', typ: 'multipleChoice', punkte: 4, quelleId: 'q1', arbeitsanweisung: 'Kreuze an.',
      config: { fragen: [{ nr: 1, frage: 'Frage?', optionen: [
        { key: 'A', text: 'Ja' }, { key: 'B', text: 'Nein' },
        { key: 'C', text: 'Vielleicht' }, { key: 'D', text: 'Unklar' },
      ], korrekt: 'A', mehrfach: false }] },
    }]), metaMitZielen, quelltexte);
    if (!res.ok) throw new Error(res.fehler);
    expect(res.document!.bloecke[0]?.lernziele).toBeUndefined();
  });
});
