import { describe, it, expect } from 'vitest';
import { renderDocument } from '@lehrunterlagen/renderer';
import { DocumentSchema } from '@lehrunterlagen/schema';

import lueckentext from './fixtures/lueckentext.json';
import matching from './fixtures/matching.json';
import multipleChoice from './fixtures/multipleChoice.json';
import offeneVerstaendnisfrage from './fixtures/offeneVerstaendnisfrage.json';
import offeneSchreibaufgabe from './fixtures/offeneSchreibaufgabe.json';
import markieraufgabe from './fixtures/markieraufgabe.json';
import wordScramble from './fixtures/wordScramble.json';
import kategorisierung from './fixtures/kategorisierung.json';
import tabelle from './fixtures/tabelle.json';
import stiluebung from './fixtures/stiluebung.json';
import songanalyse from './fixtures/songanalyse.json';

const isDocx = (buf: Buffer) =>
  buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

const fixtures = [
  { name: 'lueckentext', data: lueckentext },
  { name: 'matching', data: matching },
  { name: 'multipleChoice', data: multipleChoice },
  { name: 'offeneVerstaendnisfrage', data: offeneVerstaendnisfrage },
  { name: 'offeneSchreibaufgabe', data: offeneSchreibaufgabe },
  { name: 'markieraufgabe', data: markieraufgabe },
  { name: 'wordScramble', data: wordScramble },
  { name: 'kategorisierung', data: kategorisierung },
  { name: 'tabelle', data: tabelle },
  { name: 'stiluebung', data: stiluebung },
  { name: 'songanalyse', data: songanalyse },
];

describe('Integrationstest: Fixture -> 2 gueltige .docx', () => {
  for (const { name, data } of fixtures) {
    it(`${name}: validiert, rendert zu 2 .docx, Schueler ≠ Loesung`, async () => {
      const parsed = DocumentSchema.parse(data);
      const { schueler, loesung } = await renderDocument(parsed);

      expect(schueler).toBeInstanceOf(Buffer);
      expect(loesung).toBeInstanceOf(Buffer);
      expect(isDocx(schueler)).toBe(true);
      expect(isDocx(loesung)).toBe(true);
      expect(schueler.length).toBeGreaterThan(500);
      expect(loesung.length).toBeGreaterThan(500);
      expect(schueler.equals(loesung)).toBe(false);
    });
  }
});

describe('Integrationstest: Kombiniertes Dokument (alle 11 Blocktypen)', () => {
  it('rendert ein Dokument mit allen Blocktypen zu 2 .docx', async () => {
    const combined = DocumentSchema.parse({
      schemaVersion: '0.1.0',
      meta: {
        stufe: 'oberstufe',
        fach: 'deutsch',
        thema: 'Gesamtschularbeit — Medienkonsum',
        datum: '2026-05-30',
        klasse: '7A',
        notizen: 'Integrations-Test',
      },
      quelltexte: [
        {
          id: 'q1',
          titel: 'Social Media und das Wohlbefinden',
          inhalt: 'Die Nutzung von sozialen Medien hat in den letzten Jahren stark zugenommen. Besonders Jugendliche verbringen mehrere Stunden am Tag auf Plattformen wie Instagram und TikTok.',
          herkunft: { typ: 'upload', ref: 'quelltext_1.pdf' },
        },
      ],
      bloecke: [
        { id: 'b1', typ: 'lueckentext', punkte: 8, quelleId: 'q1', arbeitsanweisung: 'Setze ein.', config: { anzahlLuecken: 3, wortbank: false, distraktoren: 0 }, loesung: { luecken: [{ nr: 1, wort: 'Medien' }, { nr: 2, wort: 'Jugendliche' }, { nr: 3, wort: 'Plattformen' }] } },
        { id: 'b2', typ: 'matching', punkte: 6, arbeitsanweisung: 'Ordne zu.', config: { items: [{ nr: 1, prompt: 'A' }, { nr: 2, prompt: 'B' }], optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }] }, loesung: { zuordnung: { '1': 'A', '2': 'B' } } },
        { id: 'b3', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'Kreuze an.', config: { fragen: [{ nr: 1, frage: '?', mehrfach: false, optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }, { key: 'D', text: 'd' }] }] }, loesung: { antworten: { '1': ['A'] } } },
        { id: 'b4', typ: 'offeneVerstaendnisfrage', punkte: 10, quelleId: 'q1', arbeitsanweisung: 'Beantworte.', config: { fragen: [{ nr: 1, frage: '?', zeilen: 4 }] }, loesung: { antworten: { '1': 'X' } } },
        { id: 'b5', typ: 'offeneSchreibaufgabe', punkte: 30, arbeitsanweisung: 'Schreibe.', config: { situation: 'S', textsorte: 'Kommentar', umfangWorte: { min: 200, max: 300 }, aspekte: ['Aspekt'] }, loesung: { musterloesung: 'M', erwartungshorizont: { inhalt: 'x', struktur: 'x', ausdruck: 'x', sprachrichtigkeit: 'x' } } },
        { id: 'b6', typ: 'markieraufgabe', punkte: 5, quelleId: 'q1', arbeitsanweisung: 'Markiere.', config: { quelleId: 'q1', anweisung: 'Markiere.' }, loesung: { stellen: ['Stelle'] } },
        { id: 'b7', typ: 'wordScramble', punkte: 4, arbeitsanweisung: 'Ordne.', config: { wort: 'A B C', anzahlWoerter: 3, loesungsreihenfolge: [1, 2, 3] }, loesung: { korrektAnordnung: ['A', 'B', 'C'] } },
        { id: 'b8', typ: 'kategorisierung', punkte: 6, arbeitsanweisung: 'Ordne.', config: { items: [{ nr: 1, text: 'X', optionen: ['A', 'B'] }, { nr: 2, text: 'Y', optionen: ['A', 'B'] }], kategorien: [{ name: 'A', anzahlItems: 1 }, { name: 'B', anzahlItems: 1 }] }, loesung: { zuordnung: { '1': ['A'], '2': ['B'] } } },
        { id: 'b9', typ: 'tabelle', punkte: 8, arbeitsanweisung: 'Fuelle.', config: { spalten: [{ titel: 'S1', breiteProzent: 50 }, { titel: 'S2', breiteProzent: 50 }], zeilen: [{ nr: 1, zellen: [{ text: 'X' }, { luecke: true }] }] }, loesung: { zellen: { '1,1': 'b' } } },
        { id: 'b10', typ: 'stiluebung', punkte: 6, arbeitsanweisung: 'Formuliere um.', config: { ausgangstext: 'X', zielniveau: 'gehoben', transformation: 'verdeutlichen' }, loesung: { umformulierung: 'Y', begruendung: 'Z' } },
        { id: 'b11', typ: 'songanalyse', punkte: 12, arbeitsanweisung: 'Analysiere.', config: { interpret: 'I', titel: 'T', medium: 'song', lyrics: 'L', aufgabe: 'inhaltsangabe' }, loesung: { ergebnis: 'E', zitate: [], analysepunkte: [{ aspekt: 'A', befund: 'B' }] } },
      ],
    });

    const { schueler, loesung } = await renderDocument(combined);

    expect(isDocx(schueler)).toBe(true);
    expect(isDocx(loesung)).toBe(true);
    expect(schueler.length).toBeGreaterThan(2000);
    expect(loesung.length).toBeGreaterThan(2000);
    expect(schueler.equals(loesung)).toBe(false);
  });
});
