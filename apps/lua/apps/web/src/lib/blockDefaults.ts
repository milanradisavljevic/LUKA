import type { Meta, Block } from '@lehrunterlagen/schema';
import { isWortbankEnabled } from './constants';

let _counter = 0;
function nextId(): string {
  _counter++;
  return `b${_counter}`;
}

export function createDefaultBlock(typ: Block['typ'], meta?: Meta): Block {
  const id = nextId();
  const base = { id, punkte: 6, arbeitsanweisung: '', quelleId: undefined, clue: undefined };

  switch (typ) {
    case 'lueckentext':
      return {
        ...base,
        typ: 'lueckentext',
        config: {
          anzahlLuecken: 6,
          wortbank: meta ? isWortbankEnabled(meta.stufe) : false,
          distraktoren: meta && isWortbankEnabled(meta.stufe) ? 3 : 0,
          distraktorWoerter: meta && isWortbankEnabled(meta.stufe) ? ['falsch', 'auch falsch', 'noch einer'] : undefined,
        },
        loesung: { luecken: [] },
      } as Block;
    case 'matching':
      return {
        ...base,
        typ: 'matching',
        config: {
          items: [{ nr: 1, prompt: '' }, { nr: 2, prompt: '' }],
          optionen: [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }],
        },
        loesung: { zuordnung: {} },
      } as Block;
    case 'multipleChoice':
      return {
        ...base,
        typ: 'multipleChoice',
        config: {
          fragen: [{
            nr: 1, frage: '',
            optionen: [
              { key: 'A', text: '' },
              { key: 'B', text: '' },
              { key: 'C', text: '' },
              { key: 'D', text: '' },
            ],
            mehrfach: false,
          }],
        },
        loesung: { antworten: {} },
      } as Block;
    case 'offeneVerstaendnisfrage':
      return {
        ...base,
        typ: 'offeneVerstaendnisfrage',
        config: {
          fragen: [{ nr: 1, frage: '', zeilen: 4 }],
        },
        loesung: { antworten: {} },
      } as Block;
    case 'offeneSchreibaufgabe':
      return {
        ...base,
        typ: 'offeneSchreibaufgabe',
        punkte: 30,
        config: {
          situation: '',
          textsorte: '',
          umfangWorte: { min: 200, max: 300 },
          aspekte: [''],
        },
        loesung: { musterloesung: '', erwartungshorizont: { inhalt: '', struktur: '', ausdruck: '', sprachrichtigkeit: '' } },
      } as Block;
    case 'markieraufgabe':
      return {
        ...base,
        typ: 'markieraufgabe',
        config: { quelleId: '', anweisung: '' },
        loesung: { stellen: [] },
      } as Block;
    case 'wordScramble':
      return {
        ...base,
        typ: 'wordScramble',
        config: { wort: 'Der Hund läuft im Park', anzahlWoerter: 5, loesungsreihenfolge: [1, 2, 3, 4, 5] },
        loesung: { korrektAnordnung: ['Der', 'Hund', 'läuft', 'im', 'Park'] },
      } as Block;
    case 'kategorisierung':
      return {
        ...base,
        typ: 'kategorisierung',
        config: {
          items: [
            { nr: 1, text: 'Begriff A', optionen: ['Kat 1', 'Kat 2'] },
            { nr: 2, text: 'Begriff B', optionen: ['Kat 1', 'Kat 2'] },
          ],
          kategorien: [
            { name: 'Kategorie 1', anzahlItems: 1 },
            { name: 'Kategorie 2', anzahlItems: 1 },
          ],
        },
        loesung: { zuordnung: { '1': ['Kategorie 1'], '2': ['Kategorie 2'] } },
      } as Block;
    case 'tabelle':
      return {
        ...base,
        typ: 'tabelle',
        punkte: 8,
        config: {
          spalten: [
            { titel: 'Spalte 1', breiteProzent: 50 },
            { titel: 'Spalte 2', breiteProzent: 50 },
          ],
          zeilen: [{ nr: 1, zellen: [{ text: '' }, { luecke: true }] }],
        },
        loesung: { zellen: {} },
      } as Block;
    case 'stiluebung':
      return {
        ...base,
        typ: 'stiluebung',
        config: {
          ausgangstext: 'Der Typ war echt cool drauf.',
          zielniveau: 'gehoben',
          transformation: 'verdeutlichen',
        },
        loesung: { umformulierung: '', begruendung: '' },
      } as Block;
    case 'songanalyse':
      return {
        ...base,
        typ: 'songanalyse',
        punkte: 12,
        config: {
          interpret: '',
          titel: '',
          medium: 'song',
          lyrics: '',
          aufgabe: 'inhaltsangabe',
        },
        loesung: { ergebnis: '', zitate: [], analysepunkte: [] },
      } as Block;
    case 'kreuzwortraetsel':
      return {
        ...base,
        typ: 'kreuzwortraetsel',
        config: {
          anzahlWoerter: 6,
          eintraege: Array.from({ length: 6 }, () => ({ wort: '', hinweis: '' })),
        },
      } as Block;
    case 'wortgitter':
      return {
        ...base,
        typ: 'wortgitter',
        punkte: 5,
        config: { anzahlWoerter: 6, woerter: Array.from({ length: 6 }, () => '') },
      } as Block;
    case 'vokabeluebung':
      return {
        ...base,
        typ: 'vokabeluebung',
        config: {
          richtung: 'de_fremd',
          anzahlVokabeln: 6,
          vokabeln: Array.from({ length: 6 }, () => ({ deutsch: '', fremdsprache: '' })),
        },
      } as Block;
  }
}

export const BLOCK_ARBEITSANWEISUNG_PLACEHOLDER: Record<Block['typ'], string> = {
  lueckentext: 'Lies den Text. Setze die fehlenden Begriffe ein.',
  matching: 'Ordne die Begriffe der richtigen Beschreibung zu.',
  multipleChoice: 'Kreuze die richtige Antwort an.',
  offeneVerstaendnisfrage: 'Beantworte die folgende Frage in ganzen Sätzen.',
  offeneSchreibaufgabe: 'Schreibe einen Text zu folgender Situation.',
  markieraufgabe: 'Markiere die passenden Stellen im Text.',
  wordScramble: 'Bringe die Wörter in die richtige Reihenfolge.',
  kategorisierung: 'Ordne die Begriffe der richtigen Kategorie zu.',
  tabelle: 'Fülle die Tabelle aus.',
  stiluebung: 'Formuliere den Text im geforderten Stilniveau um.',
  songanalyse: 'Analysiere den Songtext.',
  kreuzwortraetsel: 'Löse das Kreuzworträtsel mithilfe der Hinweise.',
  wortgitter: 'Finde die versteckten Wörter im Buchstabengitter und markiere sie.',
  vokabeluebung: 'Übersetze die Vokabeln.',
};

const BLOCK_LABELS: Record<Block['typ'], string> = {
  lueckentext: 'Lückentext',
  matching: 'Matching',
  multipleChoice: 'Multiple Choice',
  offeneVerstaendnisfrage: 'Verständnisfrage',
  offeneSchreibaufgabe: 'Schreibaufgabe',
  markieraufgabe: 'Markieraufgabe',
  wordScramble: 'Wörter ordnen',
  kategorisierung: 'Kategorisierung',
  tabelle: 'Tabelle',
  stiluebung: 'Stilübung',
  songanalyse: 'Songanalyse',
  kreuzwortraetsel: 'Kreuzworträtsel',
  wortgitter: 'Wortgitter',
  vokabeluebung: 'Vokabelübung',
};

export function getBlockLabel(typ: Block['typ']): string {
  return BLOCK_LABELS[typ];
}
