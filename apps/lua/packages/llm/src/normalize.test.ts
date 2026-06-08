import { describe, it, expect } from 'vitest';
import { normalizeDocument } from './normalize.js';

describe('normalizeDocument', () => {
  describe('multipleChoice', () => {
    it('normalisiert verschachteltes Array in antworten', () => {
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
            fragen: [{ nr: 1, frage: 'Test?', optionen: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }], mehrfach: false }]
          },
          loesung: {
            antworten: {
              '1': [['A']], // verschachteltes Array
              '2': [['B', 'C']]
            }
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].loesung.antworten['1']).toEqual(['A']);
      expect(result.bloecke[0].loesung.antworten['2']).toEqual(['B', 'C']);
    });

    it('normalisiert Objekt in antworten zu Array', () => {
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
            fragen: [{ nr: 1, frage: 'Test?', optionen: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }], mehrfach: false }]
          },
          loesung: {
            antworten: {
              '1': { key: 'A' }, // Objekt statt Array
              '2': 'B' // String statt Array
            }
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].loesung.antworten['1']).toEqual(['A']);
      expect(result.bloecke[0].loesung.antworten['2']).toEqual(['B']);
    });

    it('normalisiert flaches Array in loesung.antworten zu Record', () => {
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
            fragen: [{ nr: 1, frage: 'Test?', optionen: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }], mehrfach: false }]
          },
          loesung: {
            antworten: ['A', 'B'] // Array statt Record
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].loesung.antworten).toEqual({ '1': ['A'], '2': ['B'] });
    });
  });

  describe('matching', () => {
    it('normalisiert String-Array in items zu Objekt-Array', () => {
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
            items: ['Item 1', 'Item 2'], // Strings statt Objekte
            optionen: ['Option A', 'Option B', 'Option C']
          },
          loesung: {
            zuordnung: { '1': 'A', '2': 'B' }
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].config.items[0]).toEqual({ nr: 1, prompt: 'Item 1' });
      expect(result.bloecke[0].config.items[1]).toEqual({ nr: 2, prompt: 'Item 2' });
      expect(result.bloecke[0].config.optionen[0]).toEqual({ key: 'A', text: 'Option A' });
      expect(result.bloecke[0].config.optionen[1]).toEqual({ key: 'B', text: 'Option B' });
    });

    it('normalisiert Array in loesung.zuordnung zu Record', () => {
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
            items: [{ nr: 1, prompt: 'Item 1' }, { nr: 2, prompt: 'Item 2' }],
            optionen: [{ key: 'A', text: 'Opt A' }, { key: 'B', text: 'Opt B' }, { key: 'C', text: 'Opt C' }]
          },
          loesung: {
            zuordnung: ['A', 'B'] // Array statt Record
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].loesung.zuordnung).toEqual({ '1': 'A', '2': 'B' });
    });
  });

  describe('offeneVerstaendnisfrage', () => {
    it('normalisiert String-Array in fragen zu Objekt-Array', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'offeneVerstaendnisfrage',
          id: 'b1',
          punkte: 6,
          arbeitsanweisung: 'Test',
          config: {
            fragen: ['Frage 1?', 'Frage 2?'] // Strings statt Objekte
          },
          loesung: {
            antworten: { '1': 'Antwort 1', '2': 'Antwort 2' }
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].config.fragen[0]).toEqual({ nr: 1, frage: 'Frage 1?', zeilen: 3 });
      expect(result.bloecke[0].config.fragen[1]).toEqual({ nr: 2, frage: 'Frage 2?', zeilen: 3 });
    });

    it('normalisiert config.frage (Singular) zu config.fragen', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'offeneVerstaendnisfrage',
          id: 'b1',
          punkte: 6,
          arbeitsanweisung: 'Test',
          config: {
            frage: 'Frage 1?' // Singular statt Array
          },
          loesung: {
            antworten: ['Antwort 1'] // Array statt Record
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].config.fragen).toEqual([{ nr: 1, frage: 'Frage 1?', zeilen: 3 }]);
      expect(result.bloecke[0].config.frage).toBeUndefined();
      expect(result.bloecke[0].loesung.antworten).toEqual({ '1': 'Antwort 1' });
    });
  });

  describe('offeneSchreibaufgabe', () => {
    it('normalisiert String in aspekte zu Array', () => {
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
            aspekte: 'Argumentation' // String statt Array
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

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].config.aspekte).toEqual(['Argumentation']);
    });

    it('normalisiert String in erwartungshorizont zu Objekt', () => {
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
            erwartungshorizont: 'Erwartungstext' // String statt Objekt
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].loesung.erwartungshorizont).toEqual({
        inhalt: 'Erwartungstext',
        struktur: 'Erwartungstext',
        ausdruck: 'Erwartungstext',
        sprachrichtigkeit: 'Erwartungstext'
      });
    });
  });

  describe('markieraufgabe', () => {
    it('normalisiert String in stellen zu Array', () => {
      const input = {
        schemaVersion: '0.1.0',
        meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-01-01', klasse: '7A', notizen: '' },
        quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'test.pdf' } }],
        bloecke: [{
          typ: 'markieraufgabe',
          id: 'b1',
          punkte: 4,
          arbeitsanweisung: 'Test',
          config: {
            quelleId: 'q1',
            anweisung: 'Markiere'
          },
          loesung: {
            stellen: 'Textstelle 1' // String statt Array
          }
        }]
      };

      const result = normalizeDocument(input) as any;
      expect(result.bloecke[0].loesung.stellen).toEqual(['Textstelle 1']);
    });
  });
});
