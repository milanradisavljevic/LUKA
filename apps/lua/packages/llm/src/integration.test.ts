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

// ---------------------------------------------------------------------------
// Quelltext-Aufbereitung: ausschliesslich "ausgabeText" kommt vom Modell
// ---------------------------------------------------------------------------

describe('Integration: Quelltext-Aufbereitung (ausgabeText)', () => {
  const QUELLTEXT = 'Jugendliche verbringen taeglich mehrere Stunden mit digitalen Medien. '
    + 'Viele Eltern machen sich Sorgen um die Folgen fuer Konzentration und Schlaf. '
    + 'Studien zeigen allerdings keinen einfachen Zusammenhang zwischen Nutzungsdauer und Leistung. '
    + 'Fachleute empfehlen stattdessen klare Regeln fuer die Nutzung am Abend.';

  const AUFGEBEREITET = 'Jugendliche verbringen taeglich mehrere Stunden mit digitalen Medien.\n\n'
    + 'Viele Eltern machen sich Sorgen um die Folgen fuer Konzentration und Schlaf.\n\n'
    + 'Studien zeigen allerdings keinen einfachen Zusammenhang zwischen Nutzungsdauer und Leistung.\n\n'
    + 'Fachleute empfehlen stattdessen klare Regeln fuer die Nutzung am Abend.';

  // Eigener Quelltext: die geteilte testQuelltexte-Fixture ist nur ein Platzhalter
  // ("...") und wuerde den Guard grundsaetzlich verwerfen lassen.
  const eigeneQuelltexte = [
    {
      id: 'q1',
      titel: 'Medienkonsum',
      inhalt: QUELLTEXT,
      herkunft: { typ: 'upload' as const, ref: 'test.pdf' },
    },
  ];

  const metaFormatieren = { ...testMeta, quelltextFormatieren: true };

  const docMitQuelltexten = (quelltexte: unknown[]) => ({
    schemaVersion: '0.1.0',
    quelltexte,
    bloecke: [
      {
        id: 'b1',
        typ: 'offeneVerstaendnisfrage',
        punkte: 4,
        quelleId: 'q1',
        arbeitsanweisung: 'Beantworte die Frage.',
        config: { fragen: [{ nr: 1, frage: 'Was empfehlen Fachleute?' }] },
        loesung: { antworten: [{ nr: 1, musterantwort: 'Klare Regeln fuer die Nutzung am Abend.' }] },
      },
    ],
  });

  it('übernimmt ausgabeText, wenn der Schalter gesetzt ist', async () => {
    const raw = JSON.stringify(docMitQuelltexten([{ id: 'q1', titel: 'T', ausgabeText: AUFGEBEREITET }]));
    const res = await parseAndValidate(raw, metaFormatieren, eigeneQuelltexte);
    expect(res.ok).toBe(true);
    expect(res.document?.quelltexte[0]?.ausgabeText).toBe(AUFGEBEREITET);
    // Original der Lehrkraft unveraendert.
    expect(res.document?.quelltexte[0]?.inhalt).toBe(QUELLTEXT);
  });

  it('übernimmt ausgabeText NICHT ohne gesetzten Schalter', async () => {
    const raw = JSON.stringify(docMitQuelltexten([{ id: 'q1', titel: 'T', ausgabeText: AUFGEBEREITET }]));
    const res = await parseAndValidate(raw, testMeta, testQuelltexte);
    expect(res.ok).toBe(true);
    expect(res.document?.quelltexte[0]?.ausgabeText).toBeUndefined();
  });

  it('übernimmt niemals ein vom Modell geändertes inhalt-Feld', async () => {
    const raw = JSON.stringify(docMitQuelltexten([
      { id: 'q1', titel: 'Vom Modell umbenannt', inhalt: 'Ein voellig anderer Text.', ausgabeText: AUFGEBEREITET },
    ]));
    const res = await parseAndValidate(raw, metaFormatieren, eigeneQuelltexte);
    expect(res.ok).toBe(true);
    expect(res.document?.quelltexte[0]?.inhalt).toBe(QUELLTEXT);
    expect(res.document?.quelltexte[0]?.titel).toBe('Medienkonsum');
  });

  it('verwirft umformulierten ausgabeText und meldet die ID', async () => {
    const falsch = 'Jugendliche verbringen jeden Tag viele Stunden mit digitalen Medien.\n\n'
      + 'Viele Eltern machen sich Sorgen um die Folgen fuer Konzentration und Schlaf.\n\n'
      + 'Studien zeigen allerdings keinen einfachen Zusammenhang zwischen Nutzungsdauer und Leistung.\n\n'
      + 'Fachleute empfehlen stattdessen klare Regeln fuer die Nutzung am Abend.';
    const raw = JSON.stringify(docMitQuelltexten([{ id: 'q1', titel: 'T', ausgabeText: falsch }]));
    const res = await parseAndValidate(raw, metaFormatieren, eigeneQuelltexte);
    expect(res.ok).toBe(true);
    expect(res.document?.quelltexte[0]?.ausgabeText).toBeUndefined();
    expect(res.verworfeneAusgabeTexte).toEqual(['q1']);
  });

  it('meldet keine Verwerfung, wenn alles in Ordnung ist', async () => {
    const raw = JSON.stringify(docMitQuelltexten([{ id: 'q1', titel: 'T', ausgabeText: AUFGEBEREITET }]));
    const res = await parseAndValidate(raw, metaFormatieren, eigeneQuelltexte);
    expect(res.verworfeneAusgabeTexte).toBeUndefined();
  });

  it('bleibt gueltig, wenn der Text stark gekuerzt wurde (Rueckfall auf Original)', async () => {
    const zuWenig = 'Jugendliche verbringen taeglich mehrere Stunden mit digitalen Medien.';
    const raw = JSON.stringify(docMitQuelltexten([{ id: 'q1', titel: 'T', ausgabeText: zuWenig }]));
    const res = await parseAndValidate(raw, metaFormatieren, eigeneQuelltexte);
    expect(res.ok).toBe(true);
    expect(res.document?.quelltexte[0]?.ausgabeText).toBeUndefined();
  });

  it('ueberlebt ein blosses bloecke-Array (Antwortform ohne quelltexte)', async () => {
    // Realer Fall aus dem Smoke: das Modell folgt der Standard-Anweisung und
    // antwortet nur mit dem Block-Array. Dann gibt es kein ausgabeText — das
    // Dokument muss gueltig bleiben und den Originalinhalt drucken.
    const raw = JSON.stringify([{
      id: 'b1',
      typ: 'offeneVerstaendnisfrage',
      punkte: 4,
      quelleId: 'q1',
      arbeitsanweisung: 'Beantworte die Frage.',
      config: { fragen: [{ nr: 1, zeilen: 3, frage: 'Was empfehlen Fachleute?' }] },
      loesung: { antworten: { '1': 'Klare Regeln fuer die Nutzung am Abend.' } },
    }]);
    const res = await parseAndValidate(raw, metaFormatieren, eigeneQuelltexte);
    expect(res.ok).toBe(true);
    expect(res.document?.bloecke).toHaveLength(1);
    expect(res.document?.quelltexte[0]?.ausgabeText).toBeUndefined();
    expect(res.verworfeneAusgabeTexte).toBeUndefined();
  });

  it('ignoriert ein Quelltext-Array ganz ohne ausgabeText', async () => {
    const raw = JSON.stringify(docMitQuelltexten([{ id: 'q1', titel: 'Vom Modell', inhalt: 'Anderer Text.' }]));
    const res = await parseAndValidate(raw, metaFormatieren, eigeneQuelltexte);
    expect(res.ok).toBe(true);
    expect(res.document?.quelltexte[0]?.ausgabeText).toBeUndefined();
    expect(res.document?.quelltexte[0]?.inhalt).toBe(QUELLTEXT);
  });
});
