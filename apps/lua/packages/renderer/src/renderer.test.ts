import { describe, it, expect } from 'vitest';
import { renderDocument, renderDocumentToBlobs, renderSelbstlernToBlob } from './index.js';
import type { DocumentV1 } from '@lehrunterlagen/schema';

// ZIP magic bytes — every .docx starts with PK\x03\x04
const isDocx = (buf: Buffer) =>
  buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

// ---------------------------------------------------------------------------
// Minimal fixture helpers
// ---------------------------------------------------------------------------

const baseMeta = (stufe: 'oberstufe' | 'unterstufe' = 'oberstufe'): DocumentV1['meta'] => ({
  stufe,
  fach: 'deutsch',
  thema: 'Medienkonsum und Jugendliche',
  datum: '2026-05-30',
  klasse: '7A',
  notizen: '',
});

const baseQuelltext: DocumentV1['quelltexte'] = [
  {
    id: 'q1',
    titel: 'Quelltext',
    inhalt: 'Dies ist ein Beispieltext fuer den Renderer.',
    herkunft: { typ: 'upload', ref: 'test.pdf' },
  },
];

function makeDoc(bloecke: DocumentV1['bloecke'], stufe: 'oberstufe' | 'unterstufe' = 'oberstufe'): DocumentV1 {
  return { schemaVersion: '0.1.0', meta: baseMeta(stufe), quelltexte: baseQuelltext, bloecke };
}

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------

describe('renderDocument return shape', () => {
  it('returns schueler and loesung buffers', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 4, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Test' }, { nr: 2, wort: 'Wert' }, { nr: 3, wort: 'mehr' }, { nr: 4, wort: 'letzt' }] },
    }]);
    const result = await renderDocument(doc);
    expect(result).toHaveProperty('schueler');
    expect(result).toHaveProperty('loesung');
    expect(result.schueler).toBeInstanceOf(Buffer);
    expect(result.loesung).toBeInstanceOf(Buffer);
  });

  it('both outputs are valid .docx (ZIP magic bytes)', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }] },
    }]);
    const { schueler, loesung } = await renderDocument(doc);
    expect(isDocx(schueler)).toBe(true);
    expect(isDocx(loesung)).toBe(true);
  });

  it('schueler and loesung produce different files', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Antwort' }, { nr: 2, wort: 'Zwei' }] },
    }]);
    const { schueler, loesung } = await renderDocument(doc);
    expect(schueler.equals(loesung)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Block types — all must render without throwing
// ---------------------------------------------------------------------------

describe('renderDocument: alle Blocktypen rendern fehlerfrei', () => {
  it('lueckentext', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 8, quelleId: 'q1',
      arbeitsanweisung: 'Lies den Text. Setze die fehlenden Begriffe ein.',
      config: { anzahlLuecken: 3, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Medien' }, { nr: 2, wort: 'sozial' }, { nr: 3, wort: 'digital' }] },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('lueckentext mit wortbank (unterstufe)', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 5, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 3, wortbank: true, distraktoren: 2 },
      loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }, { nr: 3, wort: 'C' }] },
    }], 'unterstufe');
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('matching', async () => {
    const doc = makeDoc([{
      id: 'b2', typ: 'matching', punkte: 6, arbeitsanweisung: 'Ordne zu.',
      config: {
        items: [{ nr: 1, prompt: 'Begriff A' }, { nr: 2, prompt: 'Begriff B' }, { nr: 3, prompt: 'Begriff C' }],
        optionen: [{ key: 'A', text: 'Def 1' }, { key: 'B', text: 'Def 2' }, { key: 'C', text: 'Def 3' }, { key: 'D', text: 'Def 4' }],
      },
      loesung: { zuordnung: { '1': 'C', '2': 'A', '3': 'B' } },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('multipleChoice', async () => {
    const doc = makeDoc([{
      id: 'b3', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'Kreuze an.',
      config: {
        fragen: [{
          nr: 1, frage: 'Was ist X?', mehrfach: false,
          optionen: [{ key: 'A', text: 'Eins' }, { key: 'B', text: 'Zwei' }, { key: 'C', text: 'Drei' }],
        }],
      },
      loesung: { antworten: { '1': ['B'] } },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('offeneVerstaendnisfrage', async () => {
    const doc = makeDoc([{
      id: 'b4', typ: 'offeneVerstaendnisfrage', punkte: 10, quelleId: 'q1',
      arbeitsanweisung: 'Beantworte in ganzen Saetzen.',
      config: { fragen: [{ nr: 1, frage: 'Was ist das Thema?', zeilen: 4 }] },
      loesung: { antworten: { '1': 'Das Thema ist Medienkonsum.' } },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('offeneSchreibaufgabe', async () => {
    const doc = makeDoc([{
      id: 'b5', typ: 'offeneSchreibaufgabe', punkte: 30, arbeitsanweisung: 'Verfasse einen Kommentar.',
      config: {
        situation: 'Du hast einen Artikel gelesen.',
        textsorte: 'Kommentar',
        umfangWorte: { min: 270, max: 330 },
        aspekte: ['Erklaere die Auswirkungen.', 'Nimm Stellung.'],
      },
      loesung: {
        musterloesung: 'Muster...',
        erwartungshorizont: { inhalt: 'x', struktur: 'x', ausdruck: 'x', sprachrichtigkeit: 'x' },
      },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('markieraufgabe', async () => {
    const doc = makeDoc([{
      id: 'b6', typ: 'markieraufgabe', punkte: 5, quelleId: 'q1',
      arbeitsanweisung: 'Markiere alle Metaphern.',
      config: { quelleId: 'q1', anweisung: 'Markiere alle Metaphern.' },
      loesung: { stellen: ['das Leben ist ein Fluss'] },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('wordScramble (Mehrsatz)', async () => {
    const doc = makeDoc([{
      id: 'b7', typ: 'wordScramble', punkte: 4,
      arbeitsanweisung: 'Bringe die Wörter in die richtige Reihenfolge.',
      config: { saetze: [{ wort: 'Der Hund läuft im Park' }, { wort: 'Die Katze schläft tief' }] },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('kategorisierung', async () => {
    const doc = makeDoc([{
      id: 'b8', typ: 'kategorisierung', punkte: 6,
      arbeitsanweisung: 'Ordne die Begriffe zu.',
      config: {
        items: [
          { nr: 1, text: 'Magen', optionen: ['Verdauung', 'Atmung'] },
          { nr: 2, text: 'Lunge', optionen: ['Verdauung', 'Atmung'] },
        ],
        kategorien: [
          { name: 'Verdauung', anzahlItems: 1 },
          { name: 'Atmung', anzahlItems: 1 },
        ],
      },
      loesung: { zuordnung: { '1': ['Verdauung'], '2': ['Atmung'] } },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('tabelle', async () => {
    const doc = makeDoc([{
      id: 'b9', typ: 'tabelle', punkte: 8,
      arbeitsanweisung: 'Fülle die Tabelle aus.',
      config: {
        spalten: [
          { titel: 'Begriff', breiteProzent: 40 },
          { titel: 'Definition', breiteProzent: 60 },
        ],
        zeilen: [
          { nr: 1, zellen: [{ text: 'A1' }, { luecke: true }] },
          { nr: 2, zellen: [{ text: 'A2' }, { luecke: true }] },
        ],
      },
      loesung: {
        zellen: { '1,1': 'X', '2,1': 'Y' },
      },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('stiluebung', async () => {
    const doc = makeDoc([{
      id: 'b10', typ: 'stiluebung', punkte: 6,
      arbeitsanweisung: 'Formuliere den Text in gehobener Sprache.',
      config: {
        ausgangstext: 'Der Typ war echt cool drauf.',
        zielniveau: 'gehoben',
        transformation: 'verdeutlichen',
      },
      loesung: {
        umformulierung: 'Der junge Mann zeigte sich überaus souverän.',
        begruendung: 'Umgangssprachlich ersetzt.',
      },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('songanalyse', async () => {
    const doc = makeDoc([{
      id: 'b11', typ: 'songanalyse', punkte: 12,
      arbeitsanweisung: 'Analysiere den Songtext.',
      config: {
        interpret: 'AnnenMayKantereit',
        titel: 'Pocahontas',
        medium: 'song',
        genre: 'Indie',
        lyrics: 'Und sie tanzt allein, im Mondenschein...',
        aufgabe: 'wirkungsanalyse',
      },
      loesung: {
        ergebnis: 'Der Song thematisiert Einsamkeit und Sehnsucht.',
        zitate: ['sie tanzt allein'],
        analysepunkte: [
          { aspekt: 'Bildsprache', befund: 'Mondenschein als Sinnbild', zitat: 'Mondenschein' },
        ],
      },
    }]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });

  it('Dokument mit mehreren Bloecken verschiedener Typen', async () => {
    const doc = makeDoc([
      {
        id: 'b1', typ: 'lueckentext', punkte: 4, quelleId: 'q1',
        arbeitsanweisung: 'Setze ein.',
        config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
        loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }] },
      },
      {
        id: 'b2', typ: 'offeneVerstaendnisfrage', punkte: 6, quelleId: 'q1',
        arbeitsanweisung: 'Beantworte.',
        config: { fragen: [{ nr: 1, frage: 'Warum?', zeilen: 3 }] },
        loesung: { antworten: { '1': 'Weil...' } },
      },
    ]);
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// House style: Schülerfassung vs. Lösungsfassung content rules
// ---------------------------------------------------------------------------

describe('renderDocument: Inhalt Schuelerfassung vs Loesungsfassung', () => {
  it('beide Outputs sind gueltige .docx Dateien (nicht leer)', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'offeneVerstaendnisfrage', punkte: 6, quelleId: 'q1',
      arbeitsanweisung: 'Beantworte.',
      config: { fragen: [{ nr: 1, frage: 'Was ist das Thema?', zeilen: 4 }] },
      loesung: { antworten: { '1': 'Das Thema ist Medienkonsum.' } },
    }]);
    const { schueler, loesung } = await renderDocument(doc);
    expect(schueler.length).toBeGreaterThan(1000);
    expect(loesung.length).toBeGreaterThan(1000);
  });

  it('beide Versionen sind valide .docx-Dateien und unterschiedlich', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'offeneVerstaendnisfrage', punkte: 10, quelleId: 'q1',
      arbeitsanweisung: 'Beantworte ausfuehrlich.',
      config: {
        fragen: [
          { nr: 1, frage: 'Frage 1?', zeilen: 6 },
          { nr: 2, frage: 'Frage 2?', zeilen: 6 },
        ],
      },
      loesung: {
        antworten: {
          '1': 'Eine sehr ausfuehrliche Musterantwort auf Frage 1 auf Schuelerniveau.',
          '2': 'Eine weitere ausfuehrliche Musterantwort auf Frage 2 auf Schuelerniveau.',
        },
      },
    }]);
    const { schueler, loesung } = await renderDocument(doc);
    expect(isDocx(schueler)).toBe(true);
    expect(isDocx(loesung)).toBe(true);
    // beide Dateien müssen sich inhaltlich unterscheiden
    expect(schueler.equals(loesung)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Meta in header
// ---------------------------------------------------------------------------

describe('renderDocument: Metadaten', () => {
  it('rendert ohne Fehler fuer englisch/unterstufe', async () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: { stufe: 'unterstufe', fach: 'englisch', thema: 'My School', datum: '2026-06-01', klasse: '3B', notizen: '' },
      quelltexte: [{ id: 'q1', titel: 'Text', inhalt: 'Hello world.', herkunft: { typ: 'upload', ref: 'test.txt' } }],
      bloecke: [{
        id: 'b1', typ: 'lueckentext', punkte: 3, arbeitsanweisung: 'Fill in.',
        config: { anzahlLuecken: 2, wortbank: true, distraktoren: 1 },
        loesung: { luecken: [{ nr: 1, wort: 'school' }, { nr: 2, wort: 'world' }] },
      }],
    };
    await expect(renderDocument(doc)).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// renderDocumentToBlobs — browser-native Blob output
// ---------------------------------------------------------------------------

describe('renderDocumentToBlobs', () => {
  const simpleDoc = makeDoc([{
    id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Setze ein.',
    config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
    loesung: { luecken: [{ nr: 1, wort: 'Antwort' }, { nr: 2, wort: 'Zwei' }] },
  }]);

  it('gibt schueler und loesung als Blob zurück', async () => {
    const { schueler, loesung } = await renderDocumentToBlobs(simpleDoc);
    expect(schueler).toBeInstanceOf(Blob);
    expect(loesung).toBeInstanceOf(Blob);
  });

  it('Blob-MIME-Type ist korrekt (docx)', async () => {
    const { schueler, loesung } = await renderDocumentToBlobs(simpleDoc);
    const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    expect(schueler.type).toBe(docxMime);
    expect(loesung.type).toBe(docxMime);
  });

  it('Blobs sind nicht leer (> 1 kB)', async () => {
    const { schueler, loesung } = await renderDocumentToBlobs(simpleDoc);
    expect(schueler.size).toBeGreaterThan(1000);
    expect(loesung.size).toBeGreaterThan(1000);
  });

  it('schueler !== loesung (unterschiedlicher Inhalt)', async () => {
    const { schueler, loesung } = await renderDocumentToBlobs(simpleDoc);
    expect(schueler.size).not.toBe(loesung.size);
  });
});

// ---------------------------------------------------------------------------
// Dokument-Inhalt prüfen: minimaler ZIP-Extraktor (kein externer Zip-Dep)
// ---------------------------------------------------------------------------

import { inflateRawSync } from 'node:zlib';

// Liest word/document.xml aus einem .docx-Buffer, indem die lokalen ZIP-Header
// gescannt werden (Methode 0 = stored, 8 = deflate). Ausreichend für jszip-Output.
function extractDocumentXml(buf: Buffer): string {
  let off = 0;
  while (off + 4 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const method = buf.readUInt16LE(off + 8);
    const compSize = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const nameStart = off + 30;
    const name = buf.toString('utf8', nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (name === 'word/document.xml') {
      return method === 0 ? data.toString('utf8') : inflateRawSync(data).toString('utf8');
    }
    off = dataStart + compSize;
  }
  throw new Error('word/document.xml nicht gefunden');
}

describe('renderDocument: Dokument-Qualität (Layout)', () => {
  const lyricsDoc = (): DocumentV1 => ({
    schemaVersion: '0.1.0',
    meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Songanalyse', datum: '2026-06-05', klasse: '6i', notizen: '' },
    quelltexte: [{
      id: 'q1', titel: 'Hotel California',
      inhalt: 'Zeile eins\nZeile zwei\nZeile drei\n\nStrophe zwei A\nStrophe zwei B',
      herkunft: { typ: 'eingabe', ref: '' },
    }],
    bloecke: [
      { id: 'b1', typ: 'offeneVerstaendnisfrage', punkte: 12, quelleId: 'q1', arbeitsanweisung: 'Beantworte.',
        config: { fragen: [{ nr: 1, frage: 'Worum geht es?', zeilen: 3 }] },
        loesung: { antworten: { '1': 'Eine ausführliche Musterantwort zur Frage.' } } },
      { id: 'b2', typ: 'lueckentext', punkte: 28, quelleId: 'q1', arbeitsanweisung: 'Setze ein.',
        config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
        loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }] } },
    ],
  });

  it('Quelltext-Zeilen werden als eigene nummerierte Absätze gerendert (nicht zu einer Zeile verschmolzen)', async () => {
    const { schueler } = await renderDocument(lyricsDoc());
    const xml = extractDocumentXml(schueler);
    // Jede Zeile muss als eigener Text vorkommen (nicht zu einer TextRun zusammengezogen).
    for (const z of ['Zeile eins', 'Zeile zwei', 'Zeile drei', 'Strophe zwei A', 'Strophe zwei B']) {
      expect(xml).toContain(z);
    }
    // Zeilennummerierung (Feature): jede Inhaltszeile trägt eine eigene Nummer in einem
    // eigenen Absatz — daher >= 5 Nummern-Runs für 5 Inhaltszeilen.
    const nummern = (xml.match(/<w:t[^>]*>\d+\.<\/w:t>/g) ?? []).length;
    expect(nummern).toBeGreaterThanOrEqual(5);
  });

  it('Schülerkopf enthält Name/Klasse/Datum-Felder', async () => {
    const { schueler } = await renderDocument(lyricsDoc());
    const xml = extractDocumentXml(schueler);
    expect(xml).toContain('Name:');
    expect(xml).toContain('Klasse:');
    expect(xml).toContain('Datum:');
    expect(xml).toContain('6i');
    expect(xml).toContain('05.06.2026');
  });

  it('Aufgabenübersicht enthält GESAMT mit korrekter Punktesumme', async () => {
    const { schueler } = await renderDocument(lyricsDoc());
    const xml = extractDocumentXml(schueler);
    expect(xml).toContain('Aufgabenübersicht');
    expect(xml).toContain('GESAMT');
    expect(xml).toContain('Unterschrift');
    // 12 + 28 = 40
    expect(xml).toContain('/ 40');
  });

  it('Quelltext-Überschrift ist Singular bei einem Text', async () => {
    const { schueler } = await renderDocument(lyricsDoc());
    const xml = extractDocumentXml(schueler);
    expect(xml).toContain('>Quelltext<');
  });

  it('Schüler- und Lösungsfassung bleiben paargleich erzeugt', async () => {
    const { schueler, loesung } = await renderDocument(lyricsDoc());
    expect(isDocx(schueler)).toBe(true);
    expect(isDocx(loesung)).toBe(true);
    expect(schueler.equals(loesung)).toBe(false);
    // Beide tragen denselben Schülerkopf + Übersicht
    expect(extractDocumentXml(loesung)).toContain('Aufgabenübersicht');
  });

  it('Template "freundlich" verwendet Verdana und Akzentfarbe', async () => {
    const { RENDER_TEMPLATES } = await import('./template.js');
    const { schueler } = await renderDocument(lyricsDoc(), RENDER_TEMPLATES.freundlich);
    const xml = extractDocumentXml(schueler);
    expect(xml).toContain('Verdana');
    expect(xml).toContain('c45c26');
  });

  it('Template "modern" verwendet Calibri und blaue Akzentfarbe', async () => {
    const { RENDER_TEMPLATES } = await import('./template.js');
    const { schueler } = await renderDocument(lyricsDoc(), RENDER_TEMPLATES.modern);
    const xml = extractDocumentXml(schueler);
    expect(xml).toContain('Calibri');
    expect(xml).toContain('2b579a');
  });

  it('Template "abgefahren" verwendet Ubuntu und Neon-Indigo', async () => {
    const { RENDER_TEMPLATES } = await import('./template.js');
    const { schueler } = await renderDocument(lyricsDoc(), RENDER_TEMPLATES.abgefahren);
    const xml = extractDocumentXml(schueler);
    expect(xml).toContain('Ubuntu');
    expect(xml).toContain('6366f1');
  });

  it('Englische Dokumente verwenden "Exercise" statt "Aufgabe"', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Fill in the gaps.',
      config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }] },
    }]);
    doc.meta.fach = 'englisch';
    const { schueler } = await renderDocument(doc);
    const xml = extractDocumentXml(schueler);
    expect(xml).toContain('Exercise 1');
    expect(xml).not.toContain('Aufgabe 1');
    expect(xml).toContain('Points');
    expect(xml).toContain('TOTAL');
  });

  it('Merkkasten mit strukturierten items wird als Tabelle gerendert', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }] },
    }]);
    doc.meta.fach = 'englisch';
    doc.didaktik = {
      arbeitsblattTitel: 'Past Simple vs. Present Perfect',
      einleitung: 'Practise the two tenses.',
      merkkasten: {
        titel: 'Remember!',
        items: [
          {
            notion: 'Past simple',
            form: 'verb + -ed',
            use: ['Finished actions at a specific time in the past.'],
            signalWords: ['yesterday', 'last week', 'ago'],
            example: 'I visited the museum yesterday.',
          },
          {
            notion: 'Present perfect',
            form: 'have/has + past participle',
            use: ['Life experiences without a specific time.', 'Past actions relevant now.'],
            signalWords: ['ever', 'never', 'already'],
            example: 'I have never seen such big dinosaurs.',
          },
        ],
      },
      transferaufgabe: 'Your turn: Write three sentences about your last school trip.',
    };
    const { schueler } = await renderDocument(doc);
    const xml = extractDocumentXml(schueler);
    expect(xml).toContain('Remember!');
    expect(xml).toContain('Structure');
    expect(xml).toContain('How to use it');
    expect(xml).toContain('Past simple');
    expect(xml).toContain('Present perfect');
    expect(xml).toContain('Signal words');
    expect(xml).toContain('yesterday');
    expect(xml).toContain('Your turn:');
  });
});

// ---------------------------------------------------------------------------
// Selbstlern-Variante
// ---------------------------------------------------------------------------

describe('renderSelbstlernToBlob', () => {
  it('erzeugt ein gültiges .docx mit Schüler- und Lösungsteil', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Setze die fehlenden Begriffe ein.',
      config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Alpha' }, { nr: 2, wort: 'Beta' }] },
    }]);

    const blob = await renderSelbstlernToBlob(doc);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);

    const buf = Buffer.from(await blob.arrayBuffer());
    expect(isDocx(buf)).toBe(true);

    const xml = extractDocumentXml(buf);
    expect(xml).toContain('Setze die fehlenden Begriffe ein.');
    expect(xml).toContain('Lösungen');
    expect(xml).toContain('Alpha');
    expect(xml).toContain('Beta');
  });

  it('verwendet "Solutions" im Englisch-Modus', async () => {
    const doc = makeDoc([{
      id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Fill in the gaps.',
      config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Gamma' }] },
    }]);
    doc.meta.fach = 'englisch';

    const blob = await renderSelbstlernToBlob(doc);
    const buf = Buffer.from(await blob.arrayBuffer());
    const xml = extractDocumentXml(buf);
    expect(xml).toContain('Solutions');
    expect(xml).toContain('Gamma');
  });
});
