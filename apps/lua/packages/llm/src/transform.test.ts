import { describe, it, expect } from 'vitest';
import { transformToSchema } from './transform.js';

describe('transformToSchema', () => {
  describe('multipleChoice', () => {
    it('transformiert korrekt aus Fragen in loesung.antworten', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'multipleChoice',
          id: 'b1',
          punkte: 4,
          arbeitsanweisung: 'Test',
          config: {
            fragen: [
              {
                nr: 1,
                frage: 'Was ist eine Metapher?',
                optionen: [
                  { key: 'A', text: 'Ein Vergleich ohne "wie"' },
                  { key: 'B', text: 'Eine Übertreibung' }
                ],
                korrekt: ['A'],
                mehrfach: false
              },
              {
                nr: 2,
                frage: 'Was ist eine Alliteration?',
                optionen: [
                  { key: 'A', text: 'Wiederholung des Anfangslautes' },
                  { key: 'B', text: 'Klangmalerei' }
                ],
                korrekt: ['A'],
                mehrfach: false
              }
            ]
          }
        }]
      };

      const result = transformToSchema(input) as any;
      
      expect(result.bloecke[0].loesung.antworten).toEqual({
        '1': ['A'],
        '2': ['A']
      });
      expect(result.bloecke[0].config.fragen[0].korrekt).toBeUndefined();
      expect(result.bloecke[0].config.fragen[1].korrekt).toBeUndefined();
    });

    it('transformiert String-korrekt in Array', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'multipleChoice',
          id: 'b1',
          punkte: 4,
          arbeitsanweisung: 'Test',
          config: {
            fragen: [
              {
                nr: 1,
                frage: 'Test?',
                optionen: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }],
                korrekt: 'A', // String statt Array
                mehrfach: false
              }
            ]
          }
        }]
      };

      const result = transformToSchema(input) as any;
      expect(result.bloecke[0].loesung.antworten).toEqual({ '1': ['A'] });
    });

    it('ueberschreibt nicht existierendes loesung.antworten', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'multipleChoice',
          id: 'b1',
          punkte: 4,
          arbeitsanweisung: 'Test',
          config: {
            fragen: [
              {
                nr: 1,
                frage: 'Test?',
                optionen: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }],
                korrekt: ['A'],
                mehrfach: false
              }
            ]
          },
          loesung: {
            antworten: { '1': ['B'] } // Altes Format
          }
        }]
      };

      const result = transformToSchema(input) as any;
      expect(result.bloecke[0].loesung.antworten).toEqual({ '1': ['B'] }); // Nicht überschrieben
    });
  });

  describe('matching', () => {
    it('transformiert korrekt aus Items in loesung.zuordnung', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'matching',
          id: 'b1',
          punkte: 6,
          arbeitsanweisung: 'Test',
          config: {
            items: [
              { nr: 1, prompt: 'Metapher', korrekt: 'B' },
              { nr: 2, prompt: 'Symbol', korrekt: 'A' }
            ],
            optionen: [
              { key: 'A', text: 'Stellvertretendes Bild' },
              { key: 'B', text: 'Impliziter Vergleich' },
              { key: 'C', text: 'Übertreibung' }
            ]
          }
        }]
      };

      const result = transformToSchema(input) as any;
      
      expect(result.bloecke[0].loesung.zuordnung).toEqual({
        '1': 'B',
        '2': 'A'
      });
      expect(result.bloecke[0].config.items[0].korrekt).toBeUndefined();
      expect(result.bloecke[0].config.items[1].korrekt).toBeUndefined();
    });
  });

  describe('offeneVerstaendnisfrage', () => {
    it('transformiert musterantwort aus Fragen in loesung.antworten', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'offeneVerstaendnisfrage',
          id: 'b1',
          punkte: 8,
          arbeitsanweisung: 'Test',
          config: {
            fragen: [
              {
                nr: 1,
                frage: 'Was ist die Hauptthese?',
                zeilen: 4,
                musterantwort: 'Die Hauptthese ist, dass Medien wichtig sind.'
              },
              {
                nr: 2,
                frage: 'Nenne zwei Vorteile.',
                zeilen: 3,
                musterantwort: '1) Information, 2) Unterhaltung.'
              }
            ]
          }
        }]
      };

      const result = transformToSchema(input) as any;
      
      expect(result.bloecke[0].loesung.antworten).toEqual({
        '1': 'Die Hauptthese ist, dass Medien wichtig sind.',
        '2': '1) Information, 2) Unterhaltung.'
      });
      expect(result.bloecke[0].config.fragen[0].musterantwort).toBeUndefined();
      expect(result.bloecke[0].config.fragen[1].musterantwort).toBeUndefined();
    });
  });

  describe('andere Blocktypen', () => {
    it('laesst lueckentext unveraendert', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'lueckentext',
          id: 'b1',
          punkte: 4,
          arbeitsanweisung: 'Test',
          config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'Test' }] }
        }]
      };

      const result = transformToSchema(input) as any;
      expect(result.bloecke[0]).toEqual(input.bloecke[0]);
    });

    it('laesst offeneSchreibaufgabe unveraendert', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'offeneSchreibaufgabe',
          id: 'b1',
          punkte: 20,
          arbeitsanweisung: 'Test',
          config: {
            situation: 'Test',
            textsorte: 'Kommentar',
            umfangWorte: { min: 270, max: 330 },
            aspekte: ['Argumentation']
          },
          loesung: {
            musterloesung: 'Test',
            erwartungshorizont: {
              inhalt: 'Test',
              struktur: 'Test',
              ausdruck: 'Test',
              sprachrichtigkeit: 'Test'
            }
          }
        }]
      };

      const result = transformToSchema(input) as any;
      expect(result.bloecke[0]).toEqual(input.bloecke[0]);
    });
  });
});
