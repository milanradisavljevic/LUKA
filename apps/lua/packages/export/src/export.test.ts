import { describe, it, expect } from 'vitest';
import { toGift, toMoodleXml } from './index.js';
import type { DocumentV1, Block } from '@lehrunterlagen/schema';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const baseMeta: DocumentV1['meta'] = {
  stufe: 'oberstufe',
  fach: 'englisch',
  thema: 'Grammar Test',
  datum: '2026-06-29',
  klasse: '7A',
  notizen: '',
};

function makeDoc(bloecke: Block[]): DocumentV1 {
  return {
    schemaVersion: '0.1.0',
    meta: baseMeta,
    quelltexte: [],
    bloecke,
  };
}

// ---------------------------------------------------------------------------
// GIFT: Multiple Choice
// ---------------------------------------------------------------------------

describe('toGift - multipleChoice', () => {
  it('converts MC with correct/wrong answers', () => {
    const block: Block = {
      id: 'b1',
      typ: 'multipleChoice',
      punkte: 4,
      arbeitsanweisung: 'Choose the correct answer',
      config: {
        fragen: [
          {
            nr: 1,
            frage: 'What is 2+2?',
            optionen: [
              { key: 'A', text: '3' },
              { key: 'B', text: '4' },
              { key: 'C', text: '5' },
              { key: 'D', text: '6' },
            ],
            mehrfach: false,
          },
        ],
      },
      loesung: { antworten: { '1': ['B'] } },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('=4');
    expect(gift).toContain('~3');
    expect(gift).toContain('~5');
    expect(gift).toContain('~6');
  });

  it('escapes GIFT special characters in MC', () => {
    const block: Block = {
      id: 'b1',
      typ: 'multipleChoice',
      punkte: 2,
      arbeitsanweisung: 'Test',
      config: {
        fragen: [
          {
            nr: 1,
            frage: 'Which contains = and { }?',
            optionen: [
              { key: 'A', text: 'a=b' },
              { key: 'B', text: '{test}' },
              { key: 'C', text: 'normal' },
              { key: 'D', text: '~tilde' },
            ],
            mehrfach: false,
          },
        ],
      },
      loesung: { antworten: { '1': ['C'] } },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('\\=');
    expect(gift).toContain('\\{');
    expect(gift).toContain('\\}');
    expect(gift).toContain('\\~');
  });
});

// ---------------------------------------------------------------------------
// GIFT: Matching
// ---------------------------------------------------------------------------

describe('toGift - matching', () => {
  it('converts matching pairs', () => {
    const block: Block = {
      id: 'b1',
      typ: 'matching',
      punkte: 4,
      arbeitsanweisung: 'Match the capitals',
      config: {
        items: [
          { nr: 1, prompt: 'Germany' },
          { nr: 2, prompt: 'France' },
        ],
        optionen: [
          { key: 'A', text: 'Berlin' },
          { key: 'B', text: 'Paris' },
          { key: 'C', text: 'Vienna' },
        ],
      },
      loesung: { zuordnung: { '1': 'Berlin', '2': 'Paris' } },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('=Germany -> Berlin');
    expect(gift).toContain('=France -> Paris');
  });
});

// ---------------------------------------------------------------------------
// GIFT: Lueckentext (Cloze)
// ---------------------------------------------------------------------------

describe('toGift - lueckentext', () => {
  it('converts cloze with placeholders', () => {
    const block: Block = {
      id: 'b1',
      typ: 'lueckentext',
      punkte: 3,
      arbeitsanweisung: 'Fill in the blanks',
      text: 'The capital of Germany is [1]. It has [2] million people.',
      config: {
        anzahlLuecken: 2,
        wortbank: false,
        distraktoren: 0,
      },
      loesung: {
        luecken: [
          { nr: 1, wort: 'Berlin' },
          { nr: 2, wort: '3.5' },
        ],
      },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('{=Berlin}');
    expect(gift).toContain('{=3.5}');
  });

  it('handles empty lueckentext gracefully', () => {
    const block: Block = {
      id: 'b1',
      typ: 'lueckentext',
      punkte: 0,
      arbeitsanweisung: 'Empty',
      config: { anzahlLuecken: 0, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [] },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).not.toContain('{=');
  });
});

// ---------------------------------------------------------------------------
// GIFT: Kategorisierung (as Matching)
// ---------------------------------------------------------------------------

describe('toGift - kategorisierung', () => {
  it('converts to matching format', () => {
    const block: Block = {
      id: 'b1',
      typ: 'kategorisierung',
      punkte: 4,
      arbeitsanweisung: 'Categorize the words',
      config: {
        items: [
          { nr: 1, text: 'apple', optionen: ['Fruit', 'Vegetable'] },
          { nr: 2, text: 'carrot', optionen: ['Fruit', 'Vegetable'] },
        ],
        kategorien: [
          { name: 'Fruit', anzahlItems: 1 },
          { name: 'Vegetable', anzahlItems: 1 },
        ],
      },
      loesung: {
        zuordnung: {
          '1': ['Fruit'],
          '2': ['Vegetable'],
        },
      },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('=apple -> Fruit');
    expect(gift).toContain('=carrot -> Vegetable');
  });
});

// ---------------------------------------------------------------------------
// GIFT: Fehlerkorrektur (as Short-Answer)
// ---------------------------------------------------------------------------

describe('toGift - fehlerkorrektur', () => {
  it('converts to short-answer format', () => {
    const block: Block = {
      id: 'b1',
      typ: 'fehlerkorrektur',
      punkte: 2,
      arbeitsanweisung: 'Correct the sentence',
      config: {
        saetze: [{ nr: 1, satz: 'He go to school.', anzahlFehler: 1 }],
      },
      loesung: {
        korrekturen: [
          {
            nr: 1,
            korrigierterSatz: 'He goes to school.',
            fehler: [{ stelle: 'go', art: 'G', erklaerung: '3rd person singular' }],
          },
        ],
      },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('{=He goes to school.}');
  });
});

// ---------------------------------------------------------------------------
// GIFT: Umformung (as Short-Answer)
// ---------------------------------------------------------------------------

describe('toGift - umformung', () => {
  it('converts to short-answer format', () => {
    const block: Block = {
      id: 'b1',
      typ: 'umformung',
      punkte: 2,
      arbeitsanweisung: 'Transform the sentence',
      config: {
        aufgaben: [
          {
            nr: 1,
            ausgangssatz: 'She is happy.',
            anweisung: 'Change to past tense',
            zielstruktur: 'Past Simple',
          },
        ],
      },
      loesung: {
        loesungen: [
          { nr: 1, umformulierung: 'She was happy.' },
        ],
      },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('{=She was happy.}');
  });
});

// ---------------------------------------------------------------------------
// GIFT: Essay types
// ---------------------------------------------------------------------------

describe('toGift - essay types', () => {
  it('converts offeneVerstaendnisfrage to essay', () => {
    const block: Block = {
      id: 'b1',
      typ: 'offeneVerstaendnisfrage',
      punkte: 5,
      arbeitsanweisung: 'Explain the main theme of the text.',
      config: {
        fragen: [{ nr: 1, frage: 'What is the main theme?', zeilen: 5 }],
      },
      loesung: { antworten: { '1': 'The main theme is...' } },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('{}');
    expect(gift).not.toContain('{=');
  });

  it('converts offeneSchreibaufgabe to essay', () => {
    const block: Block = {
      id: 'b1',
      typ: 'offeneSchreibaufgabe',
      punkte: 10,
      arbeitsanweisung: 'Write an essay about climate change.',
      config: {
        situation: 'You are a journalist.',
        textsorte: 'Essay',
        umfangWorte: { min: 200, max: 300 },
        aspekte: ['Structure', 'Content'],
      },
      loesung: {
        musterloesung: 'Sample essay...',
        erwartungshorizont: {
          inhalt: 'Content criteria',
          struktur: 'Structure criteria',
          ausdruck: 'Expression criteria',
          sprachrichtigkeit: 'Grammar criteria',
        },
      },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('{}');
  });

  it('converts roleplay to essay', () => {
    const block: Block = {
      id: 'b1',
      typ: 'roleplay',
      punkte: 5,
      arbeitsanweisung: 'Roleplay: At the restaurant',
      config: {
        situation: 'Restaurant',
        setting: 'Dinner',
        ziel: 'Order food',
        zeitMinuten: 5,
        redemittel: [],
        rollen: [
          { name: 'Waiter', beschreibung: 'You serve', aufgabe: 'Take order', redemittel: [] },
          { name: 'Guest', beschreibung: 'You eat', aufgabe: 'Order', redemittel: [] },
        ],
        bewertung: [],
      },
      loesung: { musterdialog: 'Sample dialog', hinweise: 'Tips' },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('{}');
  });
});

// ---------------------------------------------------------------------------
// GIFT: Mixed document
// ---------------------------------------------------------------------------

describe('toGift - mixed document', () => {
  it('handles multiple block types', () => {
    const blocks: Block[] = [
      {
        id: 'b1',
        typ: 'multipleChoice',
        punkte: 2,
        arbeitsanweisung: 'MC Question',
        config: {
          fragen: [
            {
              nr: 1,
              frage: 'Test?',
              optionen: [
                { key: 'A', text: 'Correct' },
                { key: 'B', text: 'Wrong' },
                { key: 'C', text: 'Also wrong' },
                { key: 'D', text: 'Still wrong' },
              ],
              mehrfach: false,
            },
          ],
        },
        loesung: { antworten: { '1': ['A'] } },
      },
      {
        id: 'b2',
        typ: 'offeneSchreibaufgabe',
        punkte: 5,
        arbeitsanweisung: 'Write something.',
        config: {
          situation: 'Test',
          textsorte: 'Essay',
          umfangWorte: { min: 100, max: 200 },
          aspekte: ['Quality'],
        },
        loesung: {
          musterloesung: 'Sample',
          erwartungshorizont: {
            inhalt: 'Content',
            struktur: 'Structure',
            ausdruck: 'Expression',
            sprachrichtigkeit: 'Grammar',
          },
        },
      },
    ];

    const gift = toGift(makeDoc(blocks));
    expect(gift).toContain('// Aufgabe 1: multipleChoice');
    expect(gift).toContain('// Aufgabe 2: offeneSchreibaufgabe');
    expect(gift).toContain('=Correct');
    expect(gift).toContain('{}');
  });
});

// ---------------------------------------------------------------------------
// Moodle XML
// ---------------------------------------------------------------------------

describe('toMoodleXml', () => {
  it('generates valid XML structure', () => {
    const block: Block = {
      id: 'b1',
      typ: 'multipleChoice',
      punkte: 2,
      arbeitsanweisung: 'Test',
      config: {
        fragen: [
          {
            nr: 1,
            frage: 'Question?',
            optionen: [
              { key: 'A', text: 'Answer 1' },
              { key: 'B', text: 'Answer 2' },
              { key: 'C', text: 'Answer 3' },
              { key: 'D', text: 'Answer 4' },
            ],
            mehrfach: false,
          },
        ],
      },
      loesung: { antworten: { '1': ['A'] } },
    };

    const xml = toMoodleXml(makeDoc([block]));
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<quiz>');
    expect(xml).toContain('</quiz>');
    expect(xml).toContain('type="multichoice"');
    expect(xml).toContain('fraction="100"');
  });

  it('escapes XML special characters', () => {
    const block: Block = {
      id: 'b1',
      typ: 'offeneSchreibaufgabe',
      punkte: 5,
      arbeitsanweisung: 'Write about <tag> & "quotes"',
      config: {
        situation: 'Test',
        textsorte: 'Essay',
        umfangWorte: { min: 100, max: 200 },
        aspekte: ['Quality'],
      },
      loesung: {
        musterloesung: 'Sample',
        erwartungshorizont: {
          inhalt: 'Content',
          struktur: 'Structure',
          ausdruck: 'Expression',
          sprachrichtigkeit: 'Grammar',
        },
      },
    };

    const xml = toMoodleXml(makeDoc([block]));
    expect(xml).toContain('&lt;tag&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;quotes&quot;');
  });

  it('converts matching to XML', () => {
    const block: Block = {
      id: 'b1',
      typ: 'matching',
      punkte: 4,
      arbeitsanweisung: 'Match items',
      config: {
        items: [
          { nr: 1, prompt: 'Item 1' },
          { nr: 2, prompt: 'Item 2' },
        ],
        optionen: [
          { key: 'A', text: 'Option A' },
          { key: 'B', text: 'Option B' },
          { key: 'C', text: 'Option C' },
        ],
      },
      loesung: { zuordnung: { '1': 'Option A', '2': 'Option B' } },
    };

    const xml = toMoodleXml(makeDoc([block]));
    expect(xml).toContain('type="matching"');
    expect(xml).toContain('<subquestion>');
    expect(xml).toContain('<subanswer>');
  });

  it('converts lueckentext to cloze XML', () => {
    const block: Block = {
      id: 'b1',
      typ: 'lueckentext',
      punkte: 3,
      arbeitsanweisung: 'Fill blanks',
      text: 'The [1] is [2].',
      config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
      loesung: {
        luecken: [
          { nr: 1, wort: 'answer1' },
          { nr: 2, wort: 'answer2' },
        ],
      },
    };

    const xml = toMoodleXml(makeDoc([block]));
    expect(xml).toContain('type="cloze"');
    expect(xml).toContain('{answer1}');
    expect(xml).toContain('{answer2}');
  });

  it('converts essay types to XML', () => {
    const block: Block = {
      id: 'b1',
      typ: 'offeneVerstaendnisfrage',
      punkte: 5,
      arbeitsanweisung: 'Explain something.',
      config: {
        fragen: [{ nr: 1, frage: 'What?', zeilen: 3 }],
      },
      loesung: { antworten: { '1': 'Answer' } },
    };

    const xml = toMoodleXml(makeDoc([block]));
    expect(xml).toContain('type="essay"');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('handles empty document', () => {
    const doc = makeDoc([]);
    const gift = toGift(doc);
    expect(gift).toContain('// GIFT Export');
    expect(gift.split('\n').length).toBeGreaterThan(3);
  });

  it('handles block with empty loesung gracefully', () => {
    const block: Block = {
      id: 'b1',
      typ: 'multipleChoice',
      punkte: 2,
      arbeitsanweisung: 'Test',
      config: {
        fragen: [
          {
            nr: 1,
            frage: 'Question?',
            optionen: [
              { key: 'A', text: 'A' },
              { key: 'B', text: 'B' },
              { key: 'C', text: 'C' },
              { key: 'D', text: 'D' },
            ],
            mehrfach: false,
          },
        ],
      },
      loesung: { antworten: {} },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).toContain('~A');
    expect(gift).toContain('~B');
  });

  it('preserves newlines in text as spaces', () => {
    const block: Block = {
      id: 'b1',
      typ: 'offeneSchreibaufgabe',
      punkte: 5,
      arbeitsanweisung: 'Line 1\nLine 2\nLine 3',
      config: {
        situation: 'Test',
        textsorte: 'Essay',
        umfangWorte: { min: 100, max: 200 },
        aspekte: ['Quality'],
      },
      loesung: {
        musterloesung: 'Sample',
        erwartungshorizont: {
          inhalt: 'Content',
          struktur: 'Structure',
          ausdruck: 'Expression',
          sprachrichtigkeit: 'Grammar',
        },
      },
    };

    const gift = toGift(makeDoc([block]));
    expect(gift).not.toContain('\n\n\n');
  });
});
