import { describe, expect, it } from 'vitest';
import type { Block } from '@lehrunterlagen/schema';
import { istDeterministischPruefbar, pruefeDigitaleAntworten } from './selbstkontrolle';

const mcBlock: Block = {
  id: 'mc-1', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'Kreuze an.',
  config: {
    fragen: [
      { nr: 1, frage: 'Eine?', optionen: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }, { key: 'C', text: 'C' }, { key: 'D', text: 'D' }], mehrfach: false },
      { nr: 2, frage: 'Mehrere?', optionen: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }, { key: 'C', text: 'C' }, { key: 'D', text: 'D' }], mehrfach: true },
    ],
  },
  loesung: { antworten: { '1': ['B'], '2': ['A', 'C'] } },
};

describe('pruefeDigitaleAntworten', () => {
  it('prüft MC-Antworten deterministisch und ignoriert Reihenfolge bei Mehrfachantworten', () => {
    const result = pruefeDigitaleAntworten(mcBlock, { '1': ' b ', '2': ['c', 'A'] });
    expect(result).toMatchObject({ automatisch: true, status: 'richtig', richtig: 2, gesamt: 2 });
    expect(result.hinweis).toContain('kein KI-Aufruf');
  });

  it('markiert fehlende Antworten als unvollständig statt als falsch', () => {
    const result = pruefeDigitaleAntworten(mcBlock, { '1': 'B' });
    expect(result.status).toBe('unvollständig');
    expect(result.items).toEqual([
      { key: '1', status: 'richtig' },
      { key: '2', status: 'unvollständig' },
    ]);
  });

  it('verweigert MC bei leerem, unzulässigem oder unvollständigem Lösungsschlüssel', () => {
    const noCorrectAnswer = {
      ...mcBlock,
      loesung: { antworten: { '1': [], '2': ['A', 'C'] } },
    } as Block;
    const invalidOption = {
      ...mcBlock,
      loesung: { antworten: { '1': ['Z'], '2': ['A', 'C'] } },
    } as Block;
    const missingQuestion = {
      ...mcBlock,
      loesung: { antworten: { '1': ['B'] } },
    } as Block;

    expect(istDeterministischPruefbar(noCorrectAnswer)).toBe(false);
    expect(istDeterministischPruefbar(invalidOption)).toBe(false);
    expect(istDeterministischPruefbar(missingQuestion)).toBe(false);
  });

  it('normalisiert Lückentext-Antworten und prüft Textblöcke lokal', () => {
    const block = {
      id: 'l-1', typ: 'lueckentext' as const, punkte: 2, arbeitsanweisung: 'Setze ein.',
      config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Das Haus' }, { nr: 2, wort: 'steht' }] },
    } as Block;
    expect(istDeterministischPruefbar(block)).toBe(true);
    expect(pruefeDigitaleAntworten(block, { '1': ' das   haus ', '2': 'steht' }).status).toBe('richtig');
  });

  it('vergleicht Mehrfachzuordnungen ohne Reihenfolge', () => {
    const block = {
      id: 'k-1', typ: 'kategorisierung' as const, punkte: 2, arbeitsanweisung: 'Ordne zu.',
      config: {
        items: [{ nr: 1, text: 'x', optionen: ['A', 'B'] }, { nr: 2, text: 'y', optionen: ['A', 'B'] }],
        kategorien: [{ name: 'A', anzahlItems: 1 }, { name: 'B', anzahlItems: 1 }],
      },
      loesung: { zuordnung: { '1': ['A', 'B'], '2': ['B'] } },
    } as Block;
    expect(pruefeDigitaleAntworten(block, { '1': ['b', 'a'], '2': ['B'] }).status).toBe('richtig');
  });

  it('verweigert Tabellen mit fehlenden oder überzähligen Lösungseinträgen', () => {
    const table = {
      id: 't-1', typ: 'tabelle' as const, punkte: 2, arbeitsanweisung: 'Ergänze.',
      config: {
        spalten: [{ titel: 'A', breiteProzent: 50 }, { titel: 'B', breiteProzent: 50 }],
        zeilen: [
          { nr: 1, zellen: [{ text: 'x' }, { luecke: true as const }] },
          { nr: 2, zellen: [{ luecke: true as const }, { text: 'y' }] },
        ],
      },
      loesung: { zellen: { '1,1': 'a' } },
    } as Block;
    expect(istDeterministischPruefbar(table)).toBe(false);
    if (table.typ === 'tabelle') table.loesung.zellen['2,0'] = 'b';
    expect(istDeterministischPruefbar(table)).toBe(true);
    if (table.typ === 'tabelle') table.loesung.zellen['9,9'] = 'extra';
    expect(istDeterministischPruefbar(table)).toBe(false);
  });

  it('verweigert Vokabeln und Fehlerkorrekturen mit nur teilweise passendem Schlüssel', () => {
    const vocab = {
      id: 'v-1', typ: 'vokabeluebung' as const, punkte: 2, arbeitsanweisung: 'Übersetze.',
      config: {
        richtung: 'de_fremd' as const,
        vokabeln: [
          { deutsch: 'Haus', fremdsprache: 'house' },
          { deutsch: 'Baum', fremdsprache: 'tree' },
        ],
      },
      loesung: { antworten: { '1': 'house' } },
    } as Block;
    const corrections = {
      id: 'f-1', typ: 'fehlerkorrektur' as const, punkte: 2, arbeitsanweisung: 'Korrigiere.',
      config: {
        saetze: [
          { nr: 1, satz: 'Ich gehen.', anzahlFehler: 1 },
          { nr: 2, satz: 'Du kommen.', anzahlFehler: 1 },
        ],
      },
      loesung: {
        korrekturen: [{ nr: 1, korrigierterSatz: 'Ich gehe.', fehler: [] }],
      },
    } as Block;

    expect(istDeterministischPruefbar(vocab)).toBe(false);
    expect(istDeterministischPruefbar(corrections)).toBe(false);
  });

  it('bewertet offene und sachfachliche Blöcke nie heuristisch', () => {
    const block = {
      id: 'o-1', typ: 'offeneVerstaendnisfrage' as const, punkte: 2, arbeitsanweisung: 'Antworte.',
      config: { fragen: [{ nr: 1, frage: 'Warum?', zeilen: 3 }] },
      loesung: { antworten: { '1': 'Weil …' } },
    } as Block;
    const result = pruefeDigitaleAntworten(block, { '1': 'Weil …' });
    expect(result).toMatchObject({ automatisch: false, status: 'nicht_automatisch', gesamt: 0 });
    expect(istDeterministischPruefbar(block)).toBe(false);
  });
});
