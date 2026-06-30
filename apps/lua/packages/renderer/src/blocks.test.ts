import { describe, it, expect } from 'vitest';
import { Paragraph, Table, TableRow, TableCell } from 'docx';
import { RENDER_TEMPLATES } from './template.js';
import {
  buildBlock,
  renderBlockChildren,
  numbersForLines,
  quelltextAbsaetze,
  type RenderBlockCtx,
} from './index.js';
import type { Block, DocumentV1, QuellText } from '@lehrunterlagen/schema';

// ---------------------------------------------------------------------------
// Walker-Helfer: Struktur-Asserts auf dem docx-Objektbaum (kein Zip, keine
// neue Dep). docx 8.6 speichert Children in `root` (Array) und Strings als
// Blätter in `Text`-Knoten — der Walker folgt `root` und sammelt String-Blätter.
// ---------------------------------------------------------------------------

/** Rekursiv gesamten Textinhalt eines docx-Elements (und seiner Children) als String. */
function flattenText(el: unknown): string {
  if (typeof el === 'string') return el;
  if (!el || typeof el !== 'object') return '';
  if (Array.isArray(el)) return el.map((c) => flattenText(c)).join('');
  const root = (el as { root?: unknown[] }).root;
  if (Array.isArray(root)) return root.map((c) => flattenText(c)).join('');
  return '';
}

/** Sucht in einem docx-Subbaum nach einem Knoten mit gegebenem `rootKey`. */
function hasRootKey(el: unknown, key: string): boolean {
  if (!el || typeof el !== 'object') return false;
  if ((el as { rootKey?: string }).rootKey === key) return true;
  const root = (el as { root?: unknown[] }).root;
  if (Array.isArray(root)) return root.some((c) => hasRootKey(c, key));
  return false;
}

/** Eine Paragraph ist eine docx-Überschrift (enthält `w:pStyle`)? */
function isHeading(p: Paragraph): boolean {
  return hasRootKey(p, 'w:pStyle');
}

/** Sammelt alle Instanzen eines docx-Konstruktors im Baum (z. B. alle Tabellen/Zeilen). */
function collect<T>(el: unknown, Ctor: abstract new (...a: any[]) => T): T[] {
  const out: T[] = [];
  const visit = (e: unknown) => {
    if (e instanceof Ctor) out.push(e);
    if (!e || typeof e !== 'object') return;
    const root = (e as { root?: unknown[] }).root;
    if (Array.isArray(root)) root.forEach(visit);
    if (Array.isArray(e)) e.forEach(visit);
  };
  visit(el);
  return out;
}

const tpl = RENDER_TEMPLATES.klassisch;

const baseQuelltext: QuellText = {
  id: 'q1',
  titel: 'Quelltext',
  inhalt: 'Zeile eins\nZeile zwei\n\nStrophe\nZeile drei',
  herkunft: { typ: 'eingabe', ref: '' },
};

function ctx(over: Partial<RenderBlockCtx> = {}): RenderBlockCtx {
  return {
    template: tpl,
    modus: 'schueler',
    index: 1,
    quelltextMap: new Map<string, QuellText>([['q1', baseQuelltext]]),
    fach: 'deutsch',
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Fixtures (strukturkompatibel zu Block; spiegeln renderer.test.ts)
// ---------------------------------------------------------------------------

const lueckentextCloze: Block = {
  id: 'b1', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Setze ein.',
  text: 'Der (1) ist (2) Text.',
  config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
  loesung: { luecken: [{ nr: 1, wort: 'Sonne' }, { nr: 2, wort: 'kurzer' }] },
};
const lueckentextNoText: Block = {
  id: 'b2', typ: 'lueckentext', punkte: 4, arbeitsanweisung: 'Setze ein.',
  config: { anzahlLuecken: 4, wortbank: false, distraktoren: 0 },
  loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }, { nr: 3, wort: 'C' }, { nr: 4, wort: 'D' }] },
};
const lueckentextWortbank: Block = {
  id: 'b3', typ: 'lueckentext', punkte: 5, arbeitsanweisung: 'Setze ein.',
  config: { anzahlLuecken: 2, wortbank: true, distraktoren: 2, distraktorWoerter: ['X', 'Y'] },
  loesung: { luecken: [{ nr: 1, wort: 'A' }, { nr: 2, wort: 'B' }] },
};
const matching: Block = {
  id: 'b4', typ: 'matching', punkte: 6, arbeitsanweisung: 'Ordne zu.',
  config: {
    items: [{ nr: 1, prompt: 'Begriff A' }, { nr: 2, prompt: 'Begriff B' }, { nr: 3, prompt: 'Begriff C' }],
    optionen: [{ key: 'A', text: 'Def 1' }, { key: 'B', text: 'Def 2' }, { key: 'C', text: 'Def 3' }, { key: 'D', text: 'Def 4' }],
  },
  loesung: { zuordnung: { '1': 'C', '2': 'A', '3': 'B' } },
};
const multipleChoice: Block = {
  id: 'b5', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'Kreuze an.',
  config: {
    fragen: [{
      nr: 1, frage: 'Was ist X?', mehrfach: false,
      optionen: [{ key: 'A', text: 'Eins' }, { key: 'B', text: 'Zwei' }, { key: 'C', text: 'Drei' }, { key: 'D', text: 'Vier' }],
    }],
  },
  loesung: { antworten: { '1': ['B'] } },
};
const offeneVerstaendnisfrage: Block = {
  id: 'b6', typ: 'offeneVerstaendnisfrage', punkte: 10, quelleId: 'q1',
  arbeitsanweisung: 'Beantworte.', config: { fragen: [{ nr: 1, frage: 'Warum?', zeilen: 3 }] },
  loesung: { antworten: { '1': 'Weil das so ist.' } },
};
const offeneSchreibaufgabe: Block = {
  id: 'b7', typ: 'offeneSchreibaufgabe', punkte: 30, arbeitsanweisung: 'Verfasse einen Kommentar.',
  config: { situation: 'Du liest einen Artikel.', textsorte: 'Kommentar', umfangWorte: { min: 200, max: 300 }, aspekte: ['Erkläre.', 'Stimme zu.'] },
  loesung: { musterloesung: 'Musterkommentar.', erwartungshorizont: { inhalt: 'i', struktur: 's', ausdruck: 'a', sprachrichtigkeit: 'r' } },
};
const markieraufgabe: Block = {
  id: 'b8', typ: 'markieraufgabe', punkte: 5, quelleId: 'q1',
  arbeitsanweisung: 'Markiere alle Metaphern.',
  config: { quelleId: 'q1', anweisung: 'Markiere alle Metaphern.' },
  loesung: { stellen: ['das Leben ist ein Fluss'] },
};
const wordScramble: Block = {
  id: 'b9', typ: 'wordScramble', punkte: 4,
  arbeitsanweisung: 'Bringe die Wörter in Reihenfolge.',
  config: { saetze: [{ wort: 'Der Hund läuft im Park' }, { wort: 'Die Katze schläft' }] },
};
const kategorisierung: Block = {
  id: 'b10', typ: 'kategorisierung', punkte: 6, arbeitsanweisung: 'Ordne zu.',
  config: {
    items: [{ nr: 1, text: 'Magen', optionen: ['Verdauung', 'Atmung'] }, { nr: 2, text: 'Lunge', optionen: ['Verdauung', 'Atmung'] }],
    kategorien: [{ name: 'Verdauung', anzahlItems: 1 }, { name: 'Atmung', anzahlItems: 1 }],
  },
  loesung: { zuordnung: { '1': ['Verdauung'], '2': ['Atmung'] } },
};
const tabelle: Block = {
  id: 'b11', typ: 'tabelle', punkte: 8, arbeitsanweisung: 'Fülle aus.',
  config: {
    spalten: [{ titel: 'Begriff', breiteProzent: 40 }, { titel: 'Definition', breiteProzent: 60 }],
    zeilen: [{ nr: 1, zellen: [{ text: 'A1' }, { luecke: true }] }, { nr: 2, zellen: [{ text: 'A2' }, { luecke: true }] }],
  },
  loesung: { zellen: { '1,1': 'X', '2,1': 'Y' } },
};
const stiluebung: Block = {
  id: 'b12', typ: 'stiluebung', punkte: 6, arbeitsanweisung: 'Formuliere gehoben.',
  config: { ausgangstext: 'Der Typ war cool.', zielniveau: 'gehoben', transformation: 'verdeutlichen' },
  loesung: { umformulierung: 'Der Mann war souverän.', begruendung: 'Umgangssprache ersetzt.' },
};
const songanalyse: Block = {
  id: 'b13', typ: 'songanalyse', punkte: 12, arbeitsanweisung: 'Analysiere.',
  config: { interpret: 'AMK', titel: 'Pocahontas', medium: 'song', genre: 'Indie', lyrics: 'Und sie tanzt allein.', aufgabe: 'wirkungsanalyse' },
  loesung: { ergebnis: 'Einsamkeit.', zitate: ['tanzt allein'], analysepunkte: [{ aspekt: 'Bild', befund: 'Mond', zitat: 'Mond' }] },
};
const roleplay: Block = {
  id: 'b14', typ: 'roleplay', punkte: 0, arbeitsanweisung: 'Spielt die Situation.',
  config: { situation: 'Im Restaurant', setting: 'Du gehst essen.', ziel: 'Bestellen.', zeitMinuten: 5, redemittel: ['Ich hätte gerne …'], rollen: [{ name: 'Gast', beschreibung: 'Hungrig', aufgabe: 'Bestelle.', redemittel: [] }, { name: 'Kellner', beschreibung: 'Freundlich', aufgabe: 'Nimm auf.', redemittel: ['Guten Appetit!'] }], bewertung: ['Höflich bleiben'] },
  loesung: { musterdialog: 'Gast: Hallo.\\nKellner: Willkommen!', hinweise: 'Höflichkeitsformen.' },
};
const rollenkartenSet: Block = {
  id: 'b15', typ: 'rollenkartenSet', punkte: 0, arbeitsanweisung: 'Spielt nach Karten.',
  config: {
    eingabemodus: 'ki',
    rahmen: 'Marktgespräch',
    zeitMinuten: 8,
    rollen: [
      { name: 'Käufer', rollenhinweis: 'Verhandle', inhaltsLabel: 'Inhalt', sprachhinweis: '' },
      { name: 'Verkäufer', rollenhinweis: 'Biete', inhaltsLabel: 'Inhalt', sprachhinweis: '' },
    ],
    szenarien: [
      { nummer: 1, titel: 'Szenario 1', fakten: '', rollenInhalte: [
        { untertitel: '', punkte: ['Stichpunkt A'] },
        { untertitel: '', punkte: ['Stichpunkt B'] },
      ] },
    ],
    schnittlinie: true,
    teamFeld: true,
  },
  loesung: { hinweise: 'Gleichmäßig verteilen.' },
};
const umformung: Block = {
  id: 'b16', typ: 'umformung', punkte: 6, arbeitsanweisung: 'Forme um.',
  config: { aufgaben: [{ nr: 1, ausgangssatz: 'Sie geht.', anweisung: 'In Akkusativ.', zielstruktur: 'Akkusativ' }] },
  loesung: { loesungen: [] },
};
const fehlerkorrektur: Block = {
  id: 'b17', typ: 'fehlerkorrektur', punkte: 6, arbeitsanweisung: 'Korrigiere.',
  config: { saetze: [{ nr: 1, satz: 'Wir gehe school.', anzahlFehler: 2 }] },
  loesung: { korrekturen: [] },
};
const vokabeluebung: Block = {
  id: 'b18', typ: 'vokabeluebung', punkte: 6, arbeitsanweisung: 'Übersetze.',
  config: { eingabemodus: 'ki', richtung: 'de_fremd', anzahlVokabeln: 2 },
};
const kreuzwortraetsel: Block = {
  id: 'b19', typ: 'kreuzwortraetsel', punkte: 8, arbeitsanweisung: 'Löse das Rätsel.',
  config: { eintraege: [{ wort: 'HUND', hinweis: 'Haustier' }, { wort: 'KATZE', hinweis: 'Samtpfote' }] },
};
const wortgitter: Block = {
  id: 'b20', typ: 'wortgitter', punkte: 6, arbeitsanweisung: 'Finde die Wörter.',
  config: { woerter: ['HAUS', 'BUCH'] },
};

const ALL_BLOCKS: { name: string; block: Block }[] = [
  { name: 'lueckentext', block: lueckentextNoText },
  { name: 'matching', block: matching },
  { name: 'multipleChoice', block: multipleChoice },
  { name: 'offeneVerstaendnisfrage', block: offeneVerstaendnisfrage },
  { name: 'offeneSchreibaufgabe', block: offeneSchreibaufgabe },
  { name: 'markieraufgabe', block: markieraufgabe },
  { name: 'wordScramble', block: wordScramble },
  { name: 'kategorisierung', block: kategorisierung },
  { name: 'tabelle', block: tabelle },
  { name: 'stiluebung', block: stiluebung },
  { name: 'songanalyse', block: songanalyse },
  { name: 'roleplay', block: roleplay },
  { name: 'rollenkartenSet', block: rollenkartenSet },
  { name: 'umformung', block: umformung },
  { name: 'fehlerkorrektur', block: fehlerkorrektur },
  { name: 'vokabeluebung', block: vokabeluebung },
  { name: 'kreuzwortraetsel', block: kreuzwortraetsel },
  { name: 'wortgitter', block: wortgitter },
];

// ---------------------------------------------------------------------------
// Walker-Helfer (Smoke)
// ---------------------------------------------------------------------------

describe('blocks — Walker-Helfer', () => {
  it('flattenText extrahiert Text aus einem Paragraph-Baum', () => {
    const children = renderBlockChildren(matching, ctx());
    const text = children.map((c) => flattenText(c)).join('');
    expect(text).toContain('Optionen');
    expect(text).toContain('Begriff A');
  });
  it('collect zählt Tables/Rows', () => {
    const children = renderBlockChildren(matching, ctx());
    expect(collect(children, Table).length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Pro Blocktyp: wirft nicht, nur Paragraph|Table, GENAU EINE Überschrift
// ---------------------------------------------------------------------------

describe('blocks — pro Blocktyp: Struktur + genau eine Überschrift', () => {
  for (const { name, block } of ALL_BLOCKS) {
    it(`${name}: renderBlockChildren wirft nicht und liefert nur Paragraph|Table`, () => {
      const children = renderBlockChildren(block, ctx());
      for (const c of children) {
        expect(c instanceof Paragraph || c instanceof Table).toBe(true);
      }
    });

    it(`${name}: buildBlock hat GENAU EINE docx-Überschrift (kein Doppelkopf)`, () => {
      const out = buildBlock(block, ctx());
      const headings = collect(out, Paragraph).filter((p) => isHeading(p));
      expect(headings.length).toBe(1);
    });
  }
});

// ---------------------------------------------------------------------------
// matching: ein Block → eine Optionen-Tabelle + eine Zuordnungstabelle
// ---------------------------------------------------------------------------

describe('blocks — matching (Doppelkopf-Wächter)', () => {
  it('ein matching-Block: genau 2 Tabellen (Optionen + Zuordnung), keine wiederholten Köpfe', () => {
    const children = renderBlockChildren(matching, ctx());
    const tables = collect(children, Table);
    expect(tables.length).toBe(2);
    // Zuordnungstabelle hat eine Zeile je Item (3 Items → 3 Zeilen).
    const rows = collect(children, TableRow);
    expect(rows.length).toBe(7); // 4 Optionen + 3 Zuordnungen
    // Labels genau einmal.
    const text = children.map((c) => flattenText(c)).join(' ');
    expect((text.match(/Optionen/g) ?? []).length).toBe(1);
    expect((text.match(/Zuordnung/g) ?? []).length).toBe(1);
    // Keine docx-Überschrift innerhalb der Children (nur das Banner hat eine).
    expect(collect(children, Paragraph).filter((p) => isHeading(p)).length).toBe(0);
  });

  it('mehrere matching-Blöcke nacheinander: jeder Block genau eine Überschrift, keine Kreuz-Kopplung', () => {
    const m2: Block = { ...matching, id: 'b4b' };
    const out1 = buildBlock(matching, ctx({ index: 1 }));
    const out2 = buildBlock(m2, ctx({ index: 2 }));
    expect(collect(out1, Paragraph).filter((p) => isHeading(p)).length).toBe(1);
    expect(collect(out2, Paragraph).filter((p) => isHeading(p)).length).toBe(1);
    const t1 = flattenText(out1[0] ?? null);
    const t2 = flattenText(out2[0] ?? null);
    expect(t1).toContain('Aufgabe 1');
    expect(t2).toContain('Aufgabe 2');
  });
});

// ---------------------------------------------------------------------------
// multipleChoice: A–D + Modus (☑ nur bei Lösung)
// ---------------------------------------------------------------------------

describe('blocks — multipleChoice', () => {
  it('schueler: alle Optionen ☐, kein ☑', () => {
    const children = renderBlockChildren(multipleChoice, ctx({ modus: 'schueler' }));
    const text = children.map((c) => flattenText(c)).join(' ');
    expect(text).toContain('A');
    expect(text).toContain('B');
    expect(text).toContain('C');
    expect(text).toContain('D');
    expect(text).toContain('☐');
    expect(text).not.toContain('☑');
  });
  it('loesung: korrekte Option ☑, andere ☐', () => {
    const children = renderBlockChildren(multipleChoice, ctx({ modus: 'loesung' }));
    const text = children.map((c) => flattenText(c)).join(' ');
    expect((text.match(/☑/g) ?? []).length).toBe(1); // nur B ist korrekt
    expect(text).toContain('☑');
    expect((text.match(/☐/g) ?? []).length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// lueckentext: Cloze vs. Lückentabelle vs. Wortbank
// ---------------------------------------------------------------------------

describe('blocks — lueckentext', () => {
  it('Cloze-Text schueler: Inline-Lücke (__________), keine Lösung', () => {
    const children = renderBlockChildren(lueckentextCloze, ctx({ modus: 'schueler' }));
    const text = children.map((c) => flattenText(c)).join(' ');
    expect(text).toContain('__________');
    expect(text).not.toContain('(1) Sonne');
  });
  it('Cloze-Text loesung: Lösungswörter eingefügt', () => {
    const children = renderBlockChildren(lueckentextCloze, ctx({ modus: 'loesung' }));
    const text = children.map((c) => flattenText(c)).join(' ');
    expect(text).toContain('(1) Sonne');
    expect(text).toContain('(2) kurzer');
  });
  it('ohne Text schueler: eine Lückentabelle mit 4 nummerierten Zellen', () => {
    const children = renderBlockChildren(lueckentextNoText, ctx({ modus: 'schueler' }));
    const tables = collect(children, Table);
    expect(tables.length).toBe(1);
    const text = children.map((c) => flattenText(c)).join(' ');
    expect(text).toContain('(1)');
    expect(text).toContain('(4)');
  });
  it('Wortbank schueler: Wortbank-Label vorhanden', () => {
    const children = renderBlockChildren(lueckentextWortbank, ctx({ modus: 'schueler' }));
    const text = children.map((c) => flattenText(c)).join(' ');
    expect(text).toContain('Wortbank');
  });
});

// ---------------------------------------------------------------------------
// offene Typen + schueler/loesung
// ---------------------------------------------------------------------------

describe('blocks — offene Typen + Modus', () => {
  it('offeneVerstaendnisfrage: schueler hat Schreiblinien (mehr Absätze), loesung die Musterantwort', () => {
    const schueler = renderBlockChildren(offeneVerstaendnisfrage, ctx({ modus: 'schueler' }));
    const loesung = renderBlockChildren(offeneVerstaendnisfrage, ctx({ modus: 'loesung' }));
    expect(collect(schueler, Paragraph).length).toBeGreaterThan(collect(loesung, Paragraph).length);
    expect(flattenText(loesung).includes('Weil das so ist.')).toBe(true);
    expect(flattenText(schueler).includes('Weil das so ist.')).toBe(false);
  });
  it('offeneSchreibaufgabe: Situation/Textsorte/Umfang vorhanden; Musterlösung nur im Lösungsmodus', () => {
    const schueler = renderBlockChildren(offeneSchreibaufgabe, ctx({ modus: 'schueler' }));
    const loesung = renderBlockChildren(offeneSchreibaufgabe, ctx({ modus: 'loesung' }));
    const stext = flattenText(schueler);
    expect(stext).toContain('Situation');
    expect(stext).toContain('Textsorte');
    expect(stext).toContain('Wörter');
    expect(flattenText(loesung).includes('Musterkommentar.')).toBe(true);
    expect(stext.includes('Musterkommentar.')).toBe(false);
  });
  it('markieraufgabe: Quelltext im Schülermodus, Lösungsstellen nur im Lösungsmodus', () => {
    const schueler = renderBlockChildren(markieraufgabe, ctx({ modus: 'schueler' }));
    const loesung = renderBlockChildren(markieraufgabe, ctx({ modus: 'loesung' }));
    expect(flattenText(schueler).includes('Zeile eins')).toBe(true);
    expect(flattenText(loesung).includes('das Leben ist ein Fluss')).toBe(true);
    expect(flattenText(schueler).includes('das Leben ist ein Fluss')).toBe(false);
  });
  it('tabelle: eine Tabelle, Header-Zeile + Datenzeilen, Lösung nur im Lösungsmodus', () => {
    const schueler = renderBlockChildren(tabelle, ctx({ modus: 'schueler' }));
    const loesung = renderBlockChildren(tabelle, ctx({ modus: 'loesung' }));
    expect(collect(schueler, Table).length).toBe(1);
    expect(collect(schueler, TableRow).length).toBe(3); // 1 Header + 2 Daten
    expect(flattenText(loesung).includes('X')).toBe(true);
    expect(flattenText(schueler).includes('X')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Quelltext-Nummerierung (numbersForLines + quelltextAbsaetze)
// ---------------------------------------------------------------------------

describe('blocks — Quelltext-Nummerierung', () => {
  it('numbersForLines: Inhaltszeilen fortlaufend 1..N, Leerzeilen/Überschrift ohne Nummer', () => {
    // Kleingeschriebene Zeilen → sicher keine Zwischenüberschrift (Heuristik fordert Großstart).
    const plan = numbersForLines(['eins', 'zwei', '', 'drei', '', 'vier']);
    const nrs = plan.filter((e) => e.art === 'line').map((e) => (e as { nr: number }).nr);
    expect(nrs).toEqual([1, 2, 3, 4]);
    expect(plan.filter((e) => e.art === 'blank').every((e) => e.nr === null)).toBe(true);
  });
  it('numbersForLines: Leerzeilen lassen die Nummerierung NICHT springen (keine Lücken)', () => {
    const plan = numbersForLines(['a', '', '', 'b', 'c']);
    const nrs = plan.filter((e) => e.art === 'line').map((e) => (e as { nr: number }).nr);
    expect(nrs).toEqual([1, 2, 3]); // fortlaufend, keine Lücke durch die Leerzeilen
  });
  it('numbersForLines: als Zwischenüberschrift erkannte Einzelzeile bekommt keine Nummer', () => {
    // 'Intro' steht allein (Leerzeile davor + danach), kurz, groß → heading.
    // 'Fließtext mit mehr.' hat Satz-Endzeichen → KEINE heading, sondern line.
    const plan = numbersForLines(['', 'Intro', '', 'Fließtext mit mehr.']);
    expect(plan[1]?.art).toBe('heading');
    expect(plan[1]?.nr).toBe(null);
    expect(plan[3]?.art).toBe('line');
    expect((plan[3] as { nr: number }).nr).toBe(1);
  });
  it('quelltextAbsaetze: jede Inhaltszeile wird ein eigener nummerierter Absatz', () => {
    const paras = quelltextAbsaetze('a\nb\nc', tpl);
    expect(paras.length).toBe(3);
    const texts = paras.map((p) => flattenText(p));
    expect(texts[0]?.match(/^1/)).toBeTruthy();
    expect(texts[1]?.match(/^2/)).toBeTruthy();
    expect(texts[2]?.match(/^3/)).toBeTruthy();
  });
  it('quelltextAbsaetze: Leerzeile wird eigener (unnummerierter) Absatz — Nummerierung springt nicht', () => {
    const paras = quelltextAbsaetze('a\n\nb', tpl);
    expect(paras.length).toBe(3);
    expect(flattenText(paras[0] ?? {}).match(/^1/)).toBeTruthy();
    expect(flattenText(paras[1] ?? {}).trim()).toBe('');
    expect(flattenText(paras[2] ?? {}).match(/^2/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Sonderzeichen / Umlaute
// ---------------------------------------------------------------------------

describe('blocks — Sonderzeichen & Umlaute', () => {
  it('Umlaute und Sonderzeichen in Arbeitsanweisung/Text brechen nichts', () => {
    const block: Block = {
      id: 'bs', typ: 'lueckentext', punkte: 4,
      arbeitsanweisung: 'ÄÖÜ äöüß ☑☐→ „Test“ / – —',
      text: 'Ein (1) Gärtchen ☑',
      config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Grünes' }] },
    };
    expect(() => buildBlock(block, ctx())).not.toThrow();
    const text = flattenText(buildBlock(block, ctx()));
    expect(text).toContain('äöüß');
    expect(text).toContain('☑');
  });
  it('Sonderzeichen in matching-Optionen werden erhalten', () => {
    const block: Block = {
      id: 'bm', typ: 'matching', punkte: 4, arbeitsanweisung: 'Zuordnen.',
      config: {
        items: [{ nr: 1, prompt: '„Zitat“ — Ende' }],
        optionen: [{ key: 'A', text: 'Bedeutung ☑' }],
      },
      loesung: { zuordnung: { '1': 'A' } },
    };
    const text = flattenText(renderBlockChildren(block, ctx()));
    expect(text).toContain('„Zitat“');
    expect(text).toContain('— Ende');
    expect(text).toContain('☑');
  });
});

// ---------------------------------------------------------------------------
// End-to-End-Smoke: ganzes DocumentV1 → Packer-Buffer > 0
// ---------------------------------------------------------------------------

describe('blocks — End-to-End-Smoke', () => {
  it('ganzes DocumentV1 mit mehreren Blöcken → renderDocument liefert DOCX-Buffer > 0', async () => {
    const { renderDocument } = await import('./index.js');
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-06-30', klasse: '7A', notizen: '' },
      quelltexte: [baseQuelltext],
      bloecke: [lueckentextCloze, matching, multipleChoice, offeneVerstaendnisfrage, tabelle],
    };
    const result = await renderDocument(doc);
    expect(result.schueler.length).toBeGreaterThan(0);
    expect(result.loesung.length).toBeGreaterThan(0);
    expect(result.schueler[0]).toBe(0x50); // 'P' (ZIP-Magic)
    expect(result.schueler[1]).toBe(0x4b); // 'K'
  });
});
