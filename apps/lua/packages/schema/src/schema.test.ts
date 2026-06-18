import { describe, it, expect } from 'vitest';
import {
  DocumentSchema,
  migrateDocument,
  CURRENT_SCHEMA_VERSION,
  MetaSchema,
  QuellTextSchema,
  LueckentextBlockSchema,
  MatchingBlockSchema,
  MultipleChoiceBlockSchema,
  OffeneVerstaendnisfrageBlockSchema,
  OffeneSchreibaufgabeBlockSchema,
  MarkieraufgabeBlockSchema,
  WordScrambleBlockSchema,
  KategorisierungBlockSchema,
  TabelleBlockSchema,
  StiluebungBlockSchema,
  SonganalyseBlockSchema,
  UmformungBlockSchema,
  FehlerkorrekturBlockSchema,
  BlockSchema,
  UnterlagentypSchema,
  BlockTypSchema,
  AuftragSchema,
  PROFILE,
  buildSkelett,
  baueWortbank,
  type DocumentV1,
  type Meta,
  type QuellText,
  type LueckentextBlock,
  type MatchingBlock,
  type MultipleChoiceBlock,
  type OffeneVerstaendnisfrageBlock,
  type OffeneSchreibaufgabeBlock,
  type MarkieraufgabeBlock,
  type WordScrambleBlock,
  type KategorisierungBlock,
  type TabelleBlock,
  type StiluebungBlock,
  type SonganalyseBlock,
  type UmformungBlock,
  type FehlerkorrekturBlock,
  type Block,
  type Auftrag,
  type TypProfil,
  type Abgabe,
  type Bewertung,
} from './index.js';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

describe('MetaSchema', () => {
  it('accepts valid oberstufe meta', () => {
    const meta: Meta = {
      stufe: 'oberstufe',
      fach: 'deutsch',
      thema: 'Medienkonsum',
      datum: '2026-05-30',
      klasse: '7A',
      notizen: '',
    };
    expect(MetaSchema.safeParse(meta).success).toBe(true);
  });

  it('accepts valid unterstufe meta', () => {
    const meta: Meta = {
      stufe: 'unterstufe',
      fach: 'englisch',
      thema: 'Environment',
      datum: '2026-06-01',
      klasse: '3B',
      notizen: 'Probearbeitsanweisung',
    };
    expect(MetaSchema.safeParse(meta).success).toBe(true);
  });

  it('accepts meta with schwierigkeit', () => {
    const meta: Meta = {
      stufe: 'oberstufe',
      fach: 'deutsch',
      thema: 'Medienkonsum',
      datum: '2026-05-30',
      klasse: '7A',
      notizen: '',
      schwierigkeit: 'schwer',
    };
    expect(MetaSchema.safeParse(meta).success).toBe(true);
  });

  it('rejects invalid schwierigkeit', () => {
    const result = MetaSchema.safeParse({
      stufe: 'oberstufe',
      fach: 'deutsch',
      thema: 'x',
      datum: '2026-01-01',
      klasse: '7A',
      notizen: '',
      schwierigkeit: 'extrem',
    });
    expect(result.success).toBe(false);
  });

  it('accepts meta with lernziele', () => {
    const meta: Meta = {
      stufe: 'oberstufe',
      fach: 'deutsch',
      thema: 'Medienkonsum',
      datum: '2026-05-30',
      klasse: '7A',
      notizen: '',
      lernziele: ['Hauptgedanke erfassen', 'Stilmittel erkennen'],
    };
    expect(MetaSchema.safeParse(meta).success).toBe(true);
  });

  it('rejects empty lernziel strings', () => {
    const result = MetaSchema.safeParse({
      stufe: 'oberstufe',
      fach: 'deutsch',
      thema: 'x',
      datum: '2026-01-01',
      klasse: '7A',
      notizen: '',
      lernziele: ['', 'Stilmittel'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid stufe', () => {
    const result = MetaSchema.safeParse({ stufe: 'mittelschule', fach: 'deutsch', thema: 'x', datum: '2026-01-01', klasse: '1A', notizen: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid fach', () => {
    const result = MetaSchema.safeParse({ stufe: 'oberstufe', fach: 'mathematik', thema: 'x', datum: '2026-01-01', klasse: '5A', notizen: '' });
    expect(result.success).toBe(false);
  });

  it('rejects non-ISO datum', () => {
    const result = MetaSchema.safeParse({ stufe: 'oberstufe', fach: 'deutsch', thema: 'x', datum: '31.05.2026', klasse: '6A', notizen: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty thema', () => {
    const result = MetaSchema.safeParse({ stufe: 'oberstufe', fach: 'deutsch', thema: '', datum: '2026-01-01', klasse: '7A', notizen: '' });
    expect(result.success).toBe(false);
  });

  it('accepts empty klasse (optional — nicht jedes Arbeitsblatt hat eine Klasse)', () => {
    const result = MetaSchema.safeParse({ stufe: 'oberstufe', fach: 'deutsch', thema: 'Thema', datum: '2026-01-01', klasse: '', notizen: '' });
    expect(result.success).toBe(true);
  });

  it('treats modus as optional (default text is assumed by code)', () => {
    const result = MetaSchema.safeParse({ stufe: 'oberstufe', fach: 'deutsch', thema: 'Thema', datum: '2026-01-01', klasse: '7A', notizen: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modus).toBeUndefined();
    }
  });

  it('accepts kompetenz modus with rahmenwerk and stoffItemIds', () => {
    const meta: Meta = {
      stufe: 'oberstufe',
      fach: 'englisch',
      thema: 'Tenses',
      datum: '2026-06-01',
      klasse: '7A',
      notizen: '',
      modus: 'kompetenz',
      rahmenwerk: 'at-lehrplan',
      stoffItemIds: ['en-tenses-present-perfect'],
      kompetenzNiveau: 'standard',
      bewertungsschema: 'at-1-5',
    };
    expect(MetaSchema.safeParse(meta).success).toBe(true);
  });

  it('rejects invalid modus', () => {
    const result = MetaSchema.safeParse({ stufe: 'oberstufe', fach: 'deutsch', thema: 'x', datum: '2026-01-01', klasse: '7A', notizen: '', modus: 'thema' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// QuellText
// ---------------------------------------------------------------------------

describe('QuellTextSchema', () => {
  it('accepts upload source', () => {
    const q: QuellText = {
      id: 'q1',
      titel: 'Social Media',
      inhalt: 'Hier steht der Originaltext.',
      herkunft: { typ: 'upload', ref: 'quelltext_1.pdf' },
    };
    expect(QuellTextSchema.safeParse(q).success).toBe(true);
  });

  it('accepts url source', () => {
    const q: QuellText = {
      id: 'q2',
      titel: 'Artikel',
      inhalt: 'Text...',
      herkunft: { typ: 'url', ref: 'https://example.com/artikel' },
    };
    expect(QuellTextSchema.safeParse(q).success).toBe(true);
  });

  it('accepts drive source', () => {
    const q: QuellText = {
      id: 'q3',
      titel: 'Mein Text',
      inhalt: 'Text...',
      herkunft: { typ: 'drive', ref: 'file-id-abc123' },
    };
    expect(QuellTextSchema.safeParse(q).success).toBe(true);
  });

  it('rejects invalid herkunft typ', () => {
    const result = QuellTextSchema.safeParse({ id: 'q1', titel: 'x', inhalt: 'y', herkunft: { typ: 'email', ref: 'z' } });
    expect(result.success).toBe(false);
  });

  it('rejects empty id', () => {
    const result = QuellTextSchema.safeParse({ id: '', titel: 'x', inhalt: 'y', herkunft: { typ: 'upload', ref: 'f.pdf' } });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// lueckentext
// ---------------------------------------------------------------------------

describe('LueckentextBlockSchema', () => {
  it('accepts valid lueckentext without wortbank', () => {
    const block: LueckentextBlock = {
      id: 'b1',
      typ: 'lueckentext',
      punkte: 8,
      quelleId: 'q1',
      arbeitsanweisung: 'Lies den Text. Setze die fehlenden Begriffe ein.',
      config: { anzahlLuecken: 8, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Medien' }, { nr: 2, wort: 'sozial' }] },
    };
    expect(LueckentextBlockSchema.safeParse(block).success).toBe(true);
  });

  it('accepts wortbank=true for unterstufe in document context', () => {
    // The block itself is valid; stufe-constraint is enforced at document level
    const block = {
      id: 'b1',
      typ: 'lueckentext',
      punkte: 5,
      arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 5, wortbank: true, distraktoren: 2 },
      loesung: { luecken: [{ nr: 1, wort: 'Wort' }] },
    };
    expect(LueckentextBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects wortbank=true with distraktoren=0', () => {
    const result = LueckentextBlockSchema.safeParse({
      id: 'b1',
      typ: 'lueckentext',
      punkte: 5,
      arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 5, wortbank: true, distraktoren: 0 },
      loesung: { luecken: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects anzahlLuecken <= 0', () => {
    const result = LueckentextBlockSchema.safeParse({
      id: 'b1',
      typ: 'lueckentext',
      punkte: 5,
      arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 0, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [] },
    });
    expect(result.success).toBe(false);
  });

  it('accepts distraktorWoerter optional', () => {
    const block = {
      id: 'b1',
      typ: 'lueckentext',
      punkte: 5,
      arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 5, wortbank: true, distraktoren: 3, distraktorWoerter: ['falsch', 'auch falsch', 'noch einer'] },
      loesung: { luecken: [{ nr: 1, wort: 'Wort' }] },
    };
    expect(LueckentextBlockSchema.safeParse(block).success).toBe(true);
  });

  it('accepts punkte = 0', () => {
    const result = LueckentextBlockSchema.safeParse({
      id: 'b1',
      typ: 'lueckentext',
      punkte: 0,
      arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 3, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [] },
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional clue', () => {
    const block = {
      id: 'b1',
      typ: 'lueckentext',
      punkte: 5,
      arbeitsanweisung: 'Setze ein.',
      clue: 'Achte auf den Kontext.',
      config: { anzahlLuecken: 5, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Test' }] },
    };
    expect(LueckentextBlockSchema.safeParse(block).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matching
// ---------------------------------------------------------------------------

describe('MatchingBlockSchema', () => {
  it('accepts valid matching block', () => {
    const block: MatchingBlock = {
      id: 'b2',
      typ: 'matching',
      punkte: 6,
      arbeitsanweisung: 'Ordne die Begriffe den Definitionen zu.',
      config: {
        items: [
          { nr: 1, prompt: 'Metapher' },
          { nr: 2, prompt: 'Hyperbel' },
          { nr: 3, prompt: 'Ironie' },
        ],
        optionen: [
          { key: 'A', text: 'Übertreibung' },
          { key: 'B', text: 'Gegenteil meinen' },
          { key: 'C', text: 'Bildlicher Vergleich ohne wie' },
          { key: 'D', text: 'Vergleich mit wie' },
        ],
      },
      loesung: { zuordnung: { '1': 'C', '2': 'A', '3': 'B' } },
    };
    expect(MatchingBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects when optionen count <= items count', () => {
    const result = MatchingBlockSchema.safeParse({
      id: 'b2',
      typ: 'matching',
      punkte: 4,
      arbeitsanweisung: 'Zuordnen.',
      config: {
        items: [{ nr: 1, prompt: 'A' }, { nr: 2, prompt: 'B' }],
        optionen: [{ key: 'X', text: 'Eins' }, { key: 'Y', text: 'Zwei' }],
      },
      loesung: { zuordnung: { '1': 'X', '2': 'Y' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty items', () => {
    const result = MatchingBlockSchema.safeParse({
      id: 'b2',
      typ: 'matching',
      punkte: 4,
      arbeitsanweisung: 'Zuordnen.',
      config: { items: [], optionen: [{ key: 'A', text: 'Eins' }] },
      loesung: { zuordnung: {} },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// multipleChoice
// ---------------------------------------------------------------------------

describe('MultipleChoiceBlockSchema', () => {
  it('accepts valid multipleChoice block', () => {
    const block: MultipleChoiceBlock = {
      id: 'b3',
      typ: 'multipleChoice',
      punkte: 4,
      arbeitsanweisung: 'Kreuze die richtige Antwort an.',
      config: {
        fragen: [
          {
            nr: 1,
            frage: 'Was ist eine Metapher?',
            optionen: [
              { key: 'A', text: 'Ein Vergleich mit "wie"' },
              { key: 'B', text: 'Ein Bild ohne Vergleichswort' },
              { key: 'C', text: 'Eine Übertreibung' },
              { key: 'D', text: 'Eine Wiederholung' },
            ],
            mehrfach: false,
          },
        ],
      },
      loesung: { antworten: { '1': ['B'] } },
    };
    expect(MultipleChoiceBlockSchema.safeParse(block).success).toBe(true);
  });

  it('accepts mehrfach=true with multiple correct keys', () => {
    const block = {
      id: 'b3',
      typ: 'multipleChoice',
      punkte: 6,
      arbeitsanweisung: 'Kreuze alle richtigen Antworten an.',
      config: {
        fragen: [{
          nr: 1,
          frage: 'Welche sind Stilmittel?',
          optionen: [
            { key: 'A', text: 'Metapher' },
            { key: 'B', text: 'Satz' },
            { key: 'C', text: 'Ironie' },
            { key: 'D', text: 'Anapher' },
          ],
          mehrfach: true,
        }],
      },
      loesung: { antworten: { '1': ['A', 'C'] } },
    };
    expect(MultipleChoiceBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects empty fragen list', () => {
    const result = MultipleChoiceBlockSchema.safeParse({
      id: 'b3',
      typ: 'multipleChoice',
      punkte: 4,
      arbeitsanweisung: 'Kreuze an.',
      config: { fragen: [] },
      loesung: { antworten: {} },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// offeneVerstaendnisfrage
// ---------------------------------------------------------------------------

describe('OffeneVerstaendnisfrageBlockSchema', () => {
  it('accepts valid block', () => {
    const block: OffeneVerstaendnisfrageBlock = {
      id: 'b4',
      typ: 'offeneVerstaendnisfrage',
      punkte: 10,
      quelleId: 'q1',
      arbeitsanweisung: 'Beantworte die Fragen in ganzen Saetzen.',
      config: {
        fragen: [
          { nr: 1, frage: 'Was ist das Hauptthema?', zeilen: 4 },
          { nr: 2, frage: 'Nenne drei Argumente.', zeilen: 6 },
        ],
      },
      loesung: {
        antworten: {
          '1': 'Das Hauptthema ist die Auswirkung von Social Media auf Jugendliche.',
          '2': 'Erstens... Zweitens... Drittens...',
        },
      },
    };
    expect(OffeneVerstaendnisfrageBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects zeilen < 1', () => {
    const result = OffeneVerstaendnisfrageBlockSchema.safeParse({
      id: 'b4',
      typ: 'offeneVerstaendnisfrage',
      punkte: 5,
      arbeitsanweisung: 'Beantworte.',
      config: { fragen: [{ nr: 1, frage: 'Was?', zeilen: 0 }] },
      loesung: { antworten: { '1': 'Antwort' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty fragen', () => {
    const result = OffeneVerstaendnisfrageBlockSchema.safeParse({
      id: 'b4',
      typ: 'offeneVerstaendnisfrage',
      punkte: 5,
      arbeitsanweisung: 'Beantworte.',
      config: { fragen: [] },
      loesung: { antworten: {} },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// offeneSchreibaufgabe
// ---------------------------------------------------------------------------

describe('OffeneSchreibaufgabeBlockSchema', () => {
  it('accepts valid Oberstufe writing task', () => {
    const block: OffeneSchreibaufgabeBlock = {
      id: 'b5',
      typ: 'offeneSchreibaufgabe',
      punkte: 30,
      arbeitsanweisung: 'Verfasse einen Kommentar.',
      config: {
        situation: 'Du hast einen Artikel ueber Social Media gelesen.',
        textsorte: 'Kommentar',
        umfangWorte: { min: 270, max: 330 },
        aspekte: [
          'Erklaere die Auswirkungen auf das Wohlbefinden.',
          'Nimm Stellung zur Verantwortung der Plattformen.',
        ],
      },
      loesung: {
        musterloesung: 'Social Media beeinflusst...',
        erwartungshorizont: {
          inhalt: 'Alle Aspekte angesprochen, eigene Meinung klar.',
          struktur: 'Einleitung, Hauptteil, Schluss erkennbar.',
          ausdruck: 'Treffende Wortwahl, variierter Satzbau.',
          sprachrichtigkeit: 'Keine gravierenden Fehler.',
        },
      },
    };
    expect(OffeneSchreibaufgabeBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects when min > max in umfangWorte', () => {
    const result = OffeneSchreibaufgabeBlockSchema.safeParse({
      id: 'b5',
      typ: 'offeneSchreibaufgabe',
      punkte: 30,
      arbeitsanweisung: 'Verfasse.',
      config: {
        situation: 'Situation.',
        textsorte: 'Brief',
        umfangWorte: { min: 400, max: 300 },
        aspekte: ['Aspekt 1'],
      },
      loesung: {
        musterloesung: 'Loesung.',
        erwartungshorizont: { inhalt: 'x', struktur: 'x', ausdruck: 'x', sprachrichtigkeit: 'x' },
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty aspekte', () => {
    const result = OffeneSchreibaufgabeBlockSchema.safeParse({
      id: 'b5',
      typ: 'offeneSchreibaufgabe',
      punkte: 30,
      arbeitsanweisung: 'Verfasse.',
      config: {
        situation: 'Situation.',
        textsorte: 'Brief',
        umfangWorte: { min: 200, max: 300 },
        aspekte: [],
      },
      loesung: {
        musterloesung: 'Loesung.',
        erwartungshorizont: { inhalt: 'x', struktur: 'x', ausdruck: 'x', sprachrichtigkeit: 'x' },
      },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// markieraufgabe
// ---------------------------------------------------------------------------

describe('MarkieraufgabeBlockSchema', () => {
  it('accepts valid marking task', () => {
    const block: MarkieraufgabeBlock = {
      id: 'b6',
      typ: 'markieraufgabe',
      punkte: 5,
      quelleId: 'q1',
      arbeitsanweisung: 'Markiere alle Metaphern im Text.',
      config: { quelleId: 'q1', anweisung: 'Markiere alle Metaphern.' },
      loesung: { stellen: ['das Leben ist ein Fluss', 'die Zeit rennt davon'] },
    };
    expect(MarkieraufgabeBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects empty stellen in loesung', () => {
    const result = MarkieraufgabeBlockSchema.safeParse({
      id: 'b6',
      typ: 'markieraufgabe',
      punkte: 5,
      arbeitsanweisung: 'Markiere.',
      config: { quelleId: 'q1', anweisung: 'Markiere.' },
      loesung: { stellen: [] },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// wordScramble
// ---------------------------------------------------------------------------

describe('WordScrambleBlockSchema', () => {
  it('accepts valid word scramble (Mehrsatz)', () => {
    const block: WordScrambleBlock = {
      id: 'b7',
      typ: 'wordScramble',
      punkte: 4,
      arbeitsanweisung: 'Bringe die Wörter in die richtige Reihenfolge.',
      config: { saetze: [{ wort: 'Der Hund läuft im Park' }, { wort: 'Die Katze schläft' }] },
    };
    expect(WordScrambleBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects empty saetze array', () => {
    const result = WordScrambleBlockSchema.safeParse({
      id: 'b7',
      typ: 'wordScramble',
      punkte: 4,
      arbeitsanweisung: 'Bringe die Wörter in die richtige Reihenfolge.',
      config: { saetze: [] },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// kategorisierung
// ---------------------------------------------------------------------------

describe('KategorisierungBlockSchema', () => {
  it('accepts valid categorization', () => {
    const block: KategorisierungBlock = {
      id: 'b8',
      typ: 'kategorisierung',
      punkte: 6,
      arbeitsanweisung: 'Ordne die Begriffe der richtigen Kategorie zu.',
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
    };
    expect(KategorisierungBlockSchema.safeParse(block).success).toBe(true);
  });

  it('accepts multiple categories per item (Mehrfachzuordnung)', () => {
    const result = KategorisierungBlockSchema.safeParse({
      id: 'b8',
      typ: 'kategorisierung',
      punkte: 6,
      arbeitsanweisung: 'Ordne zu.',
      config: {
        items: [
          { nr: 1, text: 'Jack', optionen: ['Jack', 'Diane'] },
          { nr: 2, text: 'Beide', optionen: ['Jack', 'Diane'] },
        ],
        kategorien: [{ name: 'Jack', anzahlItems: 2 }, { name: 'Diane', anzahlItems: 1 }],
      },
      loesung: { zuordnung: { '1': ['Jack'], '2': ['Jack', 'Diane'] } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects fewer than 2 items', () => {
    const result = KategorisierungBlockSchema.safeParse({
      id: 'b8',
      typ: 'kategorisierung',
      punkte: 6,
      arbeitsanweisung: 'Ordne zu.',
      config: {
        items: [{ nr: 1, text: 'X', optionen: ['A', 'B'] }],
        kategorien: [{ name: 'A', anzahlItems: 1 }, { name: 'B', anzahlItems: 0 }],
      },
      loesung: { zuordnung: { '1': 'A' } },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tabelle
// ---------------------------------------------------------------------------

describe('TabelleBlockSchema', () => {
  it('accepts valid table block', () => {
    const block: TabelleBlock = {
      id: 'b9',
      typ: 'tabelle',
      punkte: 8,
      arbeitsanweisung: 'Fülle die Tabelle aus.',
      config: {
        spalten: [
          { titel: 'Begriff', breiteProzent: 40 },
          { titel: 'Definition', breiteProzent: 60 },
        ],
        zeilen: [
          { nr: 1, zellen: [{ text: 'Begriff A' }, { luecke: true }] },
          { nr: 2, zellen: [{ text: 'Begriff B' }, { luecke: true }] },
        ],
      },
      loesung: {
        zellen: { '1,1': 'Definition A', '2,1': 'Definition B' },
      },
    };
    expect(TabelleBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects more than 5 spalten', () => {
    const result = TabelleBlockSchema.safeParse({
      id: 'b9',
      typ: 'tabelle',
      punkte: 8,
      arbeitsanweisung: 'Fülle aus.',
      config: {
        spalten: Array.from({ length: 6 }, (_, i) => ({ titel: `S${i}`, breiteProzent: 16 })),
        zeilen: [{ nr: 1, zellen: Array.from({ length: 6 }, () => ({ luecke: true as const })) }],
      },
      loesung: { zellen: {} },
    });
    expect(result.success).toBe(false);
  });

  it('rejects rows whose Zellenzahl != Spaltenzahl', () => {
    const result = TabelleBlockSchema.safeParse({
      id: 'b9',
      typ: 'tabelle',
      punkte: 8,
      arbeitsanweisung: 'Fülle aus.',
      config: {
        spalten: [{ titel: 'A', breiteProzent: 50 }, { titel: 'B', breiteProzent: 50 }],
        zeilen: [{ nr: 1, zellen: [{ text: 'nur eine' }] }],
      },
      loesung: { zellen: {} },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// stiluebung
// ---------------------------------------------------------------------------

describe('StiluebungBlockSchema', () => {
  it('accepts valid stiluebung', () => {
    const block: StiluebungBlock = {
      id: 'b10',
      typ: 'stiluebung',
      punkte: 6,
      arbeitsanweisung: 'Formuliere den Text in gehobener Sprache.',
      config: {
        ausgangstext: 'Der Typ war echt cool drauf.',
        zielniveau: 'gehoben',
        transformation: 'verdeutlichen',
      },
      loesung: {
        umformulierung: 'Der junge Mann zeigte sich überaus souverän.',
        begruendung: 'Umgangssprachliche Wendung durch standardsprachliche ersetzt.',
      },
    };
    expect(StiluebungBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects invalid zielniveau', () => {
    const result = StiluebungBlockSchema.safeParse({
      id: 'b10',
      typ: 'stiluebung',
      punkte: 6,
      arbeitsanweisung: 'Formuliere um.',
      config: { ausgangstext: 'X', zielniveau: 'mittelalter', transformation: 'verdeutlichen' },
      loesung: { umformulierung: 'Y', begruendung: 'Z' },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// songanalyse
// ---------------------------------------------------------------------------

describe('SonganalyseBlockSchema', () => {
  it('accepts valid songanalyse', () => {
    const block: SonganalyseBlock = {
      id: 'b11',
      typ: 'songanalyse',
      punkte: 12,
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
          { aspekt: 'Bildsprache', befund: 'Mondenschein als Sinnbild der Einsamkeit', zitat: 'Mondenschein' },
        ],
      },
    };
    expect(SonganalyseBlockSchema.safeParse(block).success).toBe(true);
  });

  it('requires at least one analysepunkt', () => {
    const result = SonganalyseBlockSchema.safeParse({
      id: 'b11',
      typ: 'songanalyse',
      punkte: 12,
      arbeitsanweisung: 'Analysiere.',
      config: {
        interpret: 'X', titel: 'Y', medium: 'song', lyrics: 'Z', aufgabe: 'inhaltsangabe',
      },
      loesung: { ergebnis: 'X', zitate: [], analysepunkte: [] },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// umformung
// ---------------------------------------------------------------------------

describe('UmformungBlockSchema', () => {
  it('accepts valid umformung block', () => {
    const block: UmformungBlock = {
      id: 'b12',
      typ: 'umformung',
      punkte: 6,
      arbeitsanweisung: 'Forme die Sätze um.',
      config: {
        aufgaben: [
          { nr: 1, ausgangssatz: 'Ich gehe zur Schule.', anweisung: 'Setze in den Konjunktiv II.', zielstruktur: 'Konjunktiv II' },
          { nr: 2, ausgangssatz: 'Er hat Zeit.', anweisung: 'Bilde einen Konditionalsatz.', zielstruktur: 'Konditional' },
        ],
      },
      loesung: {
        loesungen: [
          { nr: 1, umformulierung: 'Ich ginge zur Schule.', erklaerung: 'Konjunktiv II der Gegenwart.' },
          { nr: 2, umformulierung: 'Wenn er Zeit hätte, ...' },
        ],
      },
    };
    expect(UmformungBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects empty aufgaben', () => {
    const result = UmformungBlockSchema.safeParse({
      id: 'b12',
      typ: 'umformung',
      punkte: 4,
      arbeitsanweisung: 'Forme um.',
      config: { aufgaben: [] },
      loesung: { loesungen: [] },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fehlerkorrektur
// ---------------------------------------------------------------------------

describe('FehlerkorrekturBlockSchema', () => {
  it('accepts valid fehlerkorrektur block', () => {
    const block: FehlerkorrekturBlock = {
      id: 'b13',
      typ: 'fehlerkorrektur',
      punkte: 8,
      arbeitsanweisung: 'Finde und korrigiere die Fehler.',
      config: {
        saetze: [
          { nr: 1, satz: 'Der Hund bellt laut.', anzahlFehler: 1 },
          { nr: 2, satz: 'Sie geht schnell.', anzahlFehler: 1 },
        ],
      },
      loesung: {
        korrekturen: [
          {
            nr: 1,
            korrigierterSatz: 'Die Hunde bellen laut.',
            fehler: [{ stelle: 'Der Hund', art: 'G', erklaerung: 'Kongruenz Subjekt/Prädikat' }],
          },
          {
            nr: 2,
            korrigierterSatz: 'Sie gehen schnell.',
            fehler: [{ stelle: 'geht', art: 'G', erklaerung: 'Kongruenz' }],
          },
        ],
      },
    };
    expect(FehlerkorrekturBlockSchema.safeParse(block).success).toBe(true);
  });

  it('rejects invalid fehler art', () => {
    const result = FehlerkorrekturBlockSchema.safeParse({
      id: 'b13',
      typ: 'fehlerkorrektur',
      punkte: 4,
      arbeitsanweisung: 'Korrigiere.',
      config: { saetze: [{ nr: 1, satz: 'X', anzahlFehler: 1 }] },
      loesung: {
        korrekturen: [{
          nr: 1,
          korrigierterSatz: 'Y',
          fehler: [{ stelle: 'X', art: 'Q', erklaerung: '?' }],
        }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty saetze', () => {
    const result = FehlerkorrekturBlockSchema.safeParse({
      id: 'b13',
      typ: 'fehlerkorrektur',
      punkte: 4,
      arbeitsanweisung: 'Korrigiere.',
      config: { saetze: [] },
      loesung: { korrekturen: [] },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DocumentSchema — full document validation
// ---------------------------------------------------------------------------

describe('DocumentSchema', () => {
  const validDoc: DocumentV1 = {
    schemaVersion: '0.1.0',
    meta: {
      stufe: 'oberstufe',
      fach: 'deutsch',
      thema: 'Medienkonsum und Jugendliche',
      datum: '2026-05-30',
      klasse: '7A',
      notizen: '',
      modus: 'text',
    },
    quelltexte: [
      {
        id: 'q1',
        titel: 'Social Media Artikel',
        inhalt: 'Ein langer Text ueber Social Media...',
        herkunft: { typ: 'upload', ref: 'quelltext_1.pdf' },
      },
    ],
    bloecke: [
      {
        id: 'b1',
        typ: 'lueckentext',
        punkte: 8,
        quelleId: 'q1',
        arbeitsanweisung: 'Lies den Text. Setze die fehlenden Begriffe ein.',
        config: { anzahlLuecken: 8, wortbank: false, distraktoren: 0 },
        loesung: { luecken: [{ nr: 1, wort: 'Medien' }] },
      },
    ],
  };

  it('accepts a valid complete document', () => {
    expect(DocumentSchema.safeParse(validDoc).success).toBe(true);
  });

  it('rejects wrong schemaVersion', () => {
    const result = DocumentSchema.safeParse({ ...validDoc, schemaVersion: '1.0.0' });
    expect(result.success).toBe(false);
  });

  it('rejects document with empty quelltexte in text mode', () => {
    const result = DocumentSchema.safeParse({ ...validDoc, quelltexte: [] });
    expect(result.success).toBe(false);
  });

  it('accepts kompetenz modus with empty quelltexte', () => {
    const doc: DocumentV1 = {
      ...validDoc,
      meta: { ...validDoc.meta, modus: 'kompetenz', rahmenwerk: 'at-lehrplan', stoffItemIds: ['de-konjunktiv-ii'] },
      quelltexte: [],
    };
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it('rejects document with empty bloecke', () => {
    const result = DocumentSchema.safeParse({ ...validDoc, bloecke: [] });
    expect(result.success).toBe(false);
  });

  it('accepts wortbank=true in oberstufe document', () => {
    const doc: DocumentV1 = {
      ...validDoc,
      meta: { ...validDoc.meta, stufe: 'oberstufe' },
      bloecke: [{
        id: 'b1',
        typ: 'lueckentext',
        punkte: 5,
        arbeitsanweisung: 'Setze ein.',
        config: { anzahlLuecken: 5, wortbank: true, distraktoren: 2 },
        loesung: { luecken: [{ nr: 1, wort: 'Wort' }] },
      }],
    };
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it('accepts wortbank=true in unterstufe document', () => {
    const doc: DocumentV1 = {
      ...validDoc,
      meta: { ...validDoc.meta, stufe: 'unterstufe' },
      bloecke: [{
        id: 'b1',
        typ: 'lueckentext',
        punkte: 5,
        arbeitsanweisung: 'Setze ein.',
        config: { anzahlLuecken: 5, wortbank: true, distraktoren: 2 },
        loesung: { luecken: [{ nr: 1, wort: 'Wort' }] },
      }],
    };
    expect(DocumentSchema.safeParse(doc).success).toBe(true);
  });

  it('parses and returns typed document', () => {
    const result = DocumentSchema.parse(validDoc);
    expect(result.schemaVersion).toBe('0.1.0');
    expect(result.meta.fach).toBe('deutsch');
    expect(result.bloecke).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// BlockSchema discriminated union
// ---------------------------------------------------------------------------

describe('BlockSchema discriminated union', () => {
  it('correctly narrows to lueckentext', () => {
    const raw = {
      id: 'b1', typ: 'lueckentext', punkte: 5, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 3, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Test' }] },
    };
    const result = BlockSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success && result.data.typ === 'lueckentext') {
      expect(result.data.config.anzahlLuecken).toBe(3);
    }
  });

  it('rejects unknown block typ', () => {
    const result = BlockSchema.safeParse({
      id: 'b1', typ: 'unbekannt', punkte: 5, arbeitsanweisung: 'x',
      config: {}, loesung: {},
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UnterlagentypSchema
// ---------------------------------------------------------------------------

describe('UnterlagentypSchema', () => {
  it('accepts hausuebung', () => {
    expect(UnterlagentypSchema.safeParse('hausuebung').success).toBe(true);
  });
  it('accepts test', () => {
    expect(UnterlagentypSchema.safeParse('test').success).toBe(true);
  });
  it('accepts schularbeit', () => {
    expect(UnterlagentypSchema.safeParse('schularbeit').success).toBe(true);
  });
  it('rejects invalid typ', () => {
    expect(UnterlagentypSchema.safeParse('pruefung').success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BlockTypSchema
// ---------------------------------------------------------------------------

describe('BlockTypSchema', () => {
  it('accepts all block types', () => {
    const types = [
      'lueckentext', 'matching', 'multipleChoice', 'offeneVerstaendnisfrage',
      'offeneSchreibaufgabe', 'markieraufgabe', 'wordScramble', 'kategorisierung',
      'tabelle', 'stiluebung', 'songanalyse', 'kreuzwortraetsel', 'wortgitter',
      'vokabeluebung', 'umformung', 'fehlerkorrektur',
    ];
    for (const t of types) {
      expect(BlockTypSchema.safeParse(t).success).toBe(true);
    }
  });
  it('rejects unknown block type', () => {
    expect(BlockTypSchema.safeParse('unbekannt').success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AuftragSchema
// ---------------------------------------------------------------------------

describe('AuftragSchema', () => {
  it('accepts minimal valid auftrag', () => {
    const auftrag: Auftrag = {
      typ: 'schularbeit',
      fach: 'deutsch',
      stufe: 'oberstufe',
      thema: 'Medienkonsum',
      datum: '2026-06-01',
      quelltexte: [],
    };
    expect(AuftragSchema.safeParse(auftrag).success).toBe(true);
  });

  it('accepts full auftrag with optional fields', () => {
    const auftrag: Auftrag = {
      typ: 'test',
      fach: 'englisch',
      stufe: 'unterstufe',
      thema: 'Environment',
      datum: '2026-06-15',
      klasse: '3B',
      quelltexte: [{ id: 'q1', titel: 'Artikel', inhalt: 'Text...', herkunft: { typ: 'upload', ref: 'f.pdf' } }],
      dauerMinuten: 25,
      schwierigkeit: 'mittel',
      gewuenschteAufgabenarten: ['multipleChoice', 'offeneVerstaendnisfrage'],
      gesamtpunkteZiel: 30,
      notizen: 'Bitte schwerer.',
      lernziele: ['Hauptgedanke erfassen', 'Stilmittel erkennen'],
    };
    expect(AuftragSchema.safeParse(auftrag).success).toBe(true);
  });

  it('accepts auftrag with lernziele', () => {
    const auftrag: Auftrag = {
      typ: 'test',
      fach: 'deutsch',
      stufe: 'unterstufe',
      thema: 'x',
      datum: '2026-01-01',
      quelltexte: [],
      lernziele: ['Leseverstaendnis'],
    };
    expect(AuftragSchema.safeParse(auftrag).success).toBe(true);
  });

  it('rejects invalid typ', () => {
    const result = AuftragSchema.safeParse({
      typ: 'pruefung',
      fach: 'deutsch',
      stufe: 'oberstufe',
      thema: 'x',
      datum: '2026-01-01',
      quelltexte: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid datum format', () => {
    const result = AuftragSchema.safeParse({
      typ: 'hausuebung',
      fach: 'deutsch',
      stufe: 'unterstufe',
      thema: 'x',
      datum: '31.05.2026',
      quelltexte: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts kompetenz modus auftrag', () => {
    const auftrag: Auftrag = {
      typ: 'schuluebung',
      fach: 'englisch',
      stufe: 'unterstufe',
      thema: 'Tenses',
      datum: '2026-06-01',
      quelltexte: [],
      modus: 'kompetenz',
      rahmenwerk: 'at-lehrplan',
      stoffItemIds: ['en-present-perfect'],
      kompetenzNiveau: 'basis',
      gewuenschteAufgabenarten: ['umformung', 'fehlerkorrektur'],
    };
    expect(AuftragSchema.safeParse(auftrag).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PROFILE
// ---------------------------------------------------------------------------

describe('PROFILE', () => {
  it('has entries for all three unterlagentypen', () => {
    expect(PROFILE.hausuebung).toBeDefined();
    expect(PROFILE.test).toBeDefined();
    expect(PROFILE.schularbeit).toBeDefined();
  });

  it('hausuebung has valid standardAufgabenarten summing to ~1.0', () => {
    const sum = PROFILE.hausuebung.standardAufgabenarten.reduce((s, a) => s + a.punkteAnteil, 0);
    expect(sum).toBeCloseTo(1.0, 1);
    expect(PROFILE.hausuebung.rasterErzeugen).toBe(false);
    expect(PROFILE.hausuebung.notenschluesselErzeugen).toBe(false);
  });

  it('test has valid standardAufgabenarten summing to ~1.0', () => {
    const sum = PROFILE.test.standardAufgabenarten.reduce((s, a) => s + a.punkteAnteil, 0);
    expect(sum).toBeCloseTo(1.0, 1);
    expect(PROFILE.test.rasterErzeugen).toBe(true);
  });

  it('schularbeit has valid standardAufgabenarten summing to ~1.0', () => {
    const sum = PROFILE.schularbeit.standardAufgabenarten.reduce((s, a) => s + a.punkteAnteil, 0);
    expect(sum).toBeCloseTo(1.0, 1);
    expect(PROFILE.schularbeit.notenschluesselErzeugen).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildSkelett
// ---------------------------------------------------------------------------

describe('buildSkelett', () => {
  it('builds hausuebung skeleton with default profile blocks', () => {
    const auftrag: Auftrag = {
      typ: 'hausuebung',
      fach: 'deutsch',
      stufe: 'unterstufe',
      thema: 'Medien',
      datum: '2026-06-01',
      quelltexte: [],
    };
    const blocks = buildSkelett(auftrag);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.typ).toBe('lueckentext');
    expect(blocks[1]!.typ).toBe('offeneVerstaendnisfrage');
    const total = blocks.reduce((s, b) => s + b.punkte, 0);
    expect(total).toBe(PROFILE.hausuebung.defaultGesamtpunkte);
  });

  it('builds schularbeit skeleton with default profile blocks', () => {
    const auftrag: Auftrag = {
      typ: 'schularbeit',
      fach: 'deutsch',
      stufe: 'oberstufe',
      thema: 'Umwelt',
      datum: '2026-06-01',
      quelltexte: [],
    };
    const blocks = buildSkelett(auftrag);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.typ).toBe('offeneVerstaendnisfrage');
    expect(blocks[1]!.typ).toBe('offeneSchreibaufgabe');
    const total = blocks.reduce((s, b) => s + b.punkte, 0);
    expect(total).toBe(PROFILE.schularbeit.defaultGesamtpunkte);
  });

  it('uses gewuenschteAufgabenarten when provided', () => {
    const auftrag: Auftrag = {
      typ: 'test',
      fach: 'englisch',
      stufe: 'unterstufe',
      thema: 'Reisen',
      datum: '2026-06-01',
      quelltexte: [],
      gewuenschteAufgabenarten: ['multipleChoice'],
    };
    const blocks = buildSkelett(auftrag);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.typ).toBe('multipleChoice');
    expect(blocks[0]!.punkte).toBe(PROFILE.test.defaultGesamtpunkte);
  });

  it('uses gesamtpunkteZiel when provided', () => {
    const auftrag: Auftrag = {
      typ: 'test',
      fach: 'deutsch',
      stufe: 'oberstufe',
      thema: 'x',
      datum: '2026-06-01',
      quelltexte: [],
      gesamtpunkteZiel: 36,
    };
    const blocks = buildSkelett(auftrag);
    const total = blocks.reduce((s, b) => s + b.punkte, 0);
    expect(total).toBe(36);
  });

  it('sets wortbank=true for unterstufe lueckentext', () => {
    const auftrag: Auftrag = {
      typ: 'hausuebung',
      fach: 'deutsch',
      stufe: 'unterstufe',
      thema: 'x',
      datum: '2026-06-01',
      quelltexte: [],
    };
    const blocks = buildSkelett(auftrag);
    const luecke = blocks.find((b) => b.typ === 'lueckentext');
    expect(luecke).toBeDefined();
    if (luecke && luecke.typ === 'lueckentext') {
      expect(luecke.config.wortbank).toBe(true);
      expect(luecke.config.distraktoren).toBeGreaterThanOrEqual(1);
    }
  });

  it('sets wortbank=false for oberstufe lueckentext', () => {
    const auftrag: Auftrag = {
      typ: 'hausuebung',
      fach: 'deutsch',
      stufe: 'oberstufe',
      thema: 'x',
      datum: '2026-06-01',
      quelltexte: [],
    };
    const blocks = buildSkelett(auftrag);
    const luecke = blocks.find((b) => b.typ === 'lueckentext');
    expect(luecke).toBeDefined();
    if (luecke && luecke.typ === 'lueckentext') {
      expect(luecke.config.wortbank).toBe(false);
    }
  });

  it('every block has positive punkte', () => {
    const auftrag: Auftrag = {
      typ: 'schularbeit',
      fach: 'deutsch',
      stufe: 'oberstufe',
      thema: 'x',
      datum: '2026-06-01',
      quelltexte: [],
    };
    const blocks = buildSkelett(auftrag);
    for (const b of blocks) {
      expect(b.punkte).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns valid BlockSchema objects', () => {
    const auftrag: Auftrag = {
      typ: 'test',
      fach: 'englisch',
      stufe: 'unterstufe',
      thema: 'x',
      datum: '2026-06-01',
      quelltexte: [],
    };
    const blocks = buildSkelett(auftrag);
    for (const b of blocks) {
      const result = BlockSchema.safeParse(b);
      if (!result.success) {
        console.error('Validation failed for block:', b.typ, JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Deterministische Utils
// ---------------------------------------------------------------------------

describe('baueWortbank', () => {
  it('mischt Loesungen und Distraktoren', () => {
    const result = baueWortbank(['Apfel', 'Birne'], ['Kirsche', 'Dattel'], 'seed-1');
    expect(result).toHaveLength(4);
    expect(result).toContain('Apfel');
    expect(result).toContain('Birne');
    expect(result).toContain('Kirsche');
    expect(result).toContain('Dattel');
  });

  it('ist seed-stabil', () => {
    const r1 = baueWortbank(['A', 'B'], ['C', 'D'], 'fixed-seed');
    const r2 = baueWortbank(['A', 'B'], ['C', 'D'], 'fixed-seed');
    expect(r1).toEqual(r2);
  });

  it('gibt leeres Array fuer leere Eingaben', () => {
    const result = baueWortbank([], [], 'seed');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Korrektur-Namespace (Typ-Checks)
// ---------------------------------------------------------------------------

describe('Korrektur-Namespace Typen', () => {
  it('Abgabe can be constructed', () => {
    const abgabe: Abgabe = { dokumentId: 'doc-1', schuelerRef: 's-42' };
    expect(abgabe.dokumentId).toBe('doc-1');
    expect(abgabe.schuelerRef).toBe('s-42');
  });

  it('Bewertung can be constructed', () => {
    const bewertung: Bewertung = {
      dokumentId: 'doc-1',
      proBlock: [{ blockId: 'b1', erreichtePunkte: 5, anmerkung: 'Gut' }],
      gesamtPunkte: 5,
      note: 2,
    };
    expect(bewertung.note).toBe(2);
    expect(bewertung.proBlock).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// migrateDocument (R8 — Schema-Versionierung)
// ---------------------------------------------------------------------------

describe('migrateDocument', () => {
  const base = {
    schemaVersion: '0.1.0',
    meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'T', datum: '2026-05-30', klasse: '7A', notizen: '' },
    quelltexte: [{ id: 'q1', titel: 'Q', inhalt: 'Text', herkunft: { typ: 'upload', ref: 'x.pdf' } }],
    bloecke: [{
      id: 'b1', typ: 'lueckentext', punkte: 8, quelleId: 'q1',
      arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 8, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Medien' }] },
    }],
  };

  it('migriert ein aktuelles Dokument unverändert', () => {
    const doc = migrateDocument(base);
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(doc.bloecke).toHaveLength(1);
  });

  it('ergänzt eine fehlende schemaVersion', () => {
    const { schemaVersion: _omit, ...ohneVersion } = base;
    const doc = migrateDocument(ohneVersion);
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('hebt eine abweichende Version auf die aktuelle an', () => {
    const doc = migrateDocument({ ...base, schemaVersion: '0.0.1' });
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('wirft bei strukturell ungültigem Dokument', () => {
    expect(() => migrateDocument({ ...base, bloecke: [] })).toThrow();
    expect(() => migrateDocument(null)).toThrow();
    expect(() => migrateDocument('nope')).toThrow();
  });
});
