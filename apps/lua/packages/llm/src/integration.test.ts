import { describe, it, expect } from 'vitest';
import { parseAndValidate } from './validate.js';

const testMeta = {
  stufe: 'oberstufe' as const,
  fach: 'deutsch' as const,
  thema: 'Medienkonsum',
  datum: '2026-06-01',
  klasse: '7A',
  notizen: ''
};

const testQuelltexte = [
  {
    id: 'q1',
    titel: 'Medienkonsum bei Jugendlichen',
    inhalt: 'Jugendliche verbringen taeglich mehrere Stunden mit digitalen Medien...',
    herkunft: { typ: 'upload' as const, ref: 'test.pdf' }
  }
];

describe('Integration Tests: parseAndValidate Pipeline', () => {
  describe('neues Format (nur bloecke Array)', () => {
    it('validiert bloecke-Array mit allen 6 Typen', async () => {
      const raw = JSON.stringify([
        {
          id: 'b1',
          typ: 'lueckentext',
          punkte: 8,
          quelleId: 'q1',
          arbeitsanweisung: 'Lies den Text. Setze die fehlenden Begriffe ein.',
          config: { anzahlLuecken: 8, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'Medien' }] }
        },
        {
          id: 'b2',
          typ: 'matching',
          punkte: 6,
          quelleId: 'q1',
          arbeitsanweisung: 'Ordne die Begriffe den Definitionen zu.',
          config: {
            items: [{ nr: 1, prompt: 'Metapher' }],
            optionen: [{ key: 'A', text: 'Bildlicher Vergleich' }, { key: 'B', text: 'Uebertreibung' }]
          },
          loesung: { zuordnung: { '1': 'A' } }
        },
        {
          id: 'b3',
          typ: 'multipleChoice',
          punkte: 4,
          quelleId: 'q1',
          arbeitsanweisung: 'Kreuze die richtige Antwort an.',
          config: {
            fragen: [{
              nr: 1,
              frage: 'Was ist eine Metapher?',
              optionen: [
                { key: 'A', text: 'Vergleich mit wie' },
                { key: 'B', text: 'Bild ohne Vergleichswort' },
                { key: 'C', text: 'Uebertreibung' },
                { key: 'D', text: 'Wiederholung' },
              ],
              mehrfach: false
            }]
          },
          loesung: { antworten: { '1': ['B'] } }
        },
        {
          id: 'b4',
          typ: 'offeneVerstaendnisfrage',
          punkte: 10,
          quelleId: 'q1',
          arbeitsanweisung: 'Beantworte die Fragen in ganzen Saetzen.',
          config: {
            fragen: [{ nr: 1, frage: 'Was ist das Hauptthema?', zeilen: 4 }]
          },
          loesung: { antworten: { '1': 'Das Hauptthema ist die Auswirkung von Social Media auf Jugendliche.' } }
        },
        {
          id: 'b5',
          typ: 'offeneSchreibaufgabe',
          punkte: 30,
          quelleId: 'q1',
          arbeitsanweisung: 'Verfasse einen Kommentar.',
          config: {
            situation: 'Du hast einen Artikel ueber Social Media gelesen.',
            textsorte: 'Kommentar',
            umfangWorte: { min: 270, max: 330 },
            aspekte: ['Erklaere die Auswirkungen', 'Nimm Stellung']
          },
          loesung: {
            musterloesung: 'Social Media beeinflusst...',
            erwartungshorizont: {
              inhalt: 'Alle Aspekte angesprochen.',
              struktur: 'Einleitung, Hauptteil, Schluss.',
              ausdruck: 'Treffende Wortwahl.',
              sprachrichtigkeit: 'Keine gravierenden Fehler.'
            }
          }
        },
        {
          id: 'b6',
          typ: 'markieraufgabe',
          punkte: 5,
          quelleId: 'q1',
          arbeitsanweisung: 'Markiere alle Metaphern im Text.',
          config: { quelleId: 'q1', anweisung: 'Markiere alle Metaphern.' },
          loesung: { stellen: ['das Leben ist ein Fluss'] }
        }
      ]);

      const result = await parseAndValidate(raw, testMeta, testQuelltexte);

      if (!result.ok) {
        console.log('Validation errors:', result.fehler);
      }

      expect(result.ok).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.bloecke).toHaveLength(6);
      expect(result.document!.meta.thema).toBe('Medienkonsum');
      expect(result.document!.schemaVersion).toBe('0.1.0');
    });

    it('transformiert LLM-Format (korrekt direkt bei Frage/Item)', async () => {
      const raw = JSON.stringify([
        {
          id: 'b1',
          typ: 'multipleChoice',
          punkte: 4,
          quelleId: 'q1',
          arbeitsanweisung: 'Test',
          config: {
            fragen: [
              {
                nr: 1,
                frage: 'Was ist X?',
                optionen: [
                  { key: 'A', text: 'Option A' },
                  { key: 'B', text: 'Option B' },
                  { key: 'C', text: 'Option C' },
                  { key: 'D', text: 'Option D' },
                ],
                korrekt: ['A'], // LLM-Format: korrekt direkt bei Frage
                mehrfach: false
              },
              {
                nr: 2,
                frage: 'Was ist Y?',
                optionen: [
                  { key: 'A', text: 'Option A' },
                  { key: 'B', text: 'Option B' },
                  { key: 'C', text: 'Option C' },
                  { key: 'D', text: 'Option D' },
                ],
                korrekt: ['B'],
                mehrfach: false
              }
            ]
          }
        },
        {
          id: 'b2',
          typ: 'matching',
          punkte: 6,
          quelleId: 'q1',
          arbeitsanweisung: 'Test',
          config: {
            items: [
              { nr: 1, prompt: 'Item 1', korrekt: 'A' }, // LLM-Format: korrekt direkt bei Item
              { nr: 2, prompt: 'Item 2', korrekt: 'B' }
            ],
            optionen: [
              { key: 'A', text: 'Opt A' },
              { key: 'B', text: 'Opt B' },
              { key: 'C', text: 'Opt C' }
            ]
          }
        }
      ]);

      const result = await parseAndValidate(raw, testMeta, testQuelltexte);
      if (!result.ok) {
        console.log('Validation errors (LLM-Format Test):', result.fehler);
      }
      expect(result.ok).toBe(true);
      expect(result.document!.bloecke).toHaveLength(2);
      
      // Prüfe, dass Transformation korrekt war
      const mcBlock = result.document!.bloecke[0];
      if (mcBlock && mcBlock.typ === 'multipleChoice') {
        expect((mcBlock as any).loesung.antworten).toEqual({ '1': ['A'], '2': ['B'] });
      }
      
      const matchBlock = result.document!.bloecke[1];
      if (matchBlock && matchBlock.typ === 'matching') {
        expect((matchBlock as any).loesung.zuordnung).toEqual({ '1': 'A', '2': 'B' });
      }
    });
  });

  describe('altes Format (volles DocumentV1)', () => {
    it('validiert vollstaendiges DocumentV1', async () => {
      const doc = {
        schemaVersion: '0.1.0',
        meta: testMeta,
        quelltexte: testQuelltexte,
        bloecke: [{
          id: 'b1',
          typ: 'lueckentext',
          punkte: 8,
          quelleId: 'q1',
          arbeitsanweisung: 'Lies den Text. Setze ein.',
          config: { anzahlLuecken: 8, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'Medien' }] },
        }]
      };

      const result = await parseAndValidate(JSON.stringify(doc));
      expect(result.ok).toBe(true);
      if (result.document) {
        expect(result.document.bloecke[0]!.typ).toBe('lueckentext');
      }
    });
  });
});
