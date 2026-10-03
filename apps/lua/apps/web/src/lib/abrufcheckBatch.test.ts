import { describe, expect, it } from 'vitest';
import { vorbereiteteAbrufcheckAntworten, type AbrufcheckZeile } from './abrufcheckBatch';

const roster: AbrufcheckZeile[] = [
  { schuelerId: 1, status: 'offen', antwort: null, ergebnis: null },
  { schuelerId: 2, status: 'abwesend', antwort: null, ergebnis: null },
  { schuelerId: 3, status: 'anwesend', antwort: 'Gleich geblieben', ergebnis: 'teilweise' },
];

describe('Antworten eines Klassenchecks vorbereiten', () => {
  it('nimmt vollständige, geänderte und anwesende offene Antworten auf', () => {
    expect(vorbereiteteAbrufcheckAntworten('offen', roster, {
      1: '  Ein Beispielsatz.  ', 2: 'diese Antwort wird ignoriert', 3: 'Gleich geblieben',
    }, { 1: 'richtig', 3: 'richtig' })).toEqual([
      { schuelerId: 1, antwort: 'Ein Beispielsatz.', ergebnis: 'richtig' },
      { schuelerId: 3, antwort: 'Gleich geblieben', ergebnis: 'richtig' },
    ]);
  });

  it('überspringt unveränderte Antworten und verlangt eine ausdrückliche Lehrkraftauswertung', () => {
    const saved: AbrufcheckZeile[] = [roster[2]!];
    expect(vorbereiteteAbrufcheckAntworten('offen', saved, {}, {})).toEqual([]);
    expect(vorbereiteteAbrufcheckAntworten('offen', roster, { 1: 'Neue Antwort' }, {})).toEqual([]);
    expect(vorbereiteteAbrufcheckAntworten('offen', roster, { 1: 'Neue Antwort' }, { 1: 'teilweise' })).toEqual([
      { schuelerId: 1, antwort: 'Neue Antwort', ergebnis: 'teilweise' },
    ]);
  });

  it('lässt geschlossene Antworten lokal auswerten und speichert keine Lehrkrafteinstufung mit', () => {
    expect(vorbereiteteAbrufcheckAntworten('auswahl', roster, { 1: 'Antwort A' }, { 1: 'richtig' })).toEqual([
      { schuelerId: 1, antwort: 'Antwort A', ergebnis: null },
    ]);
  });
});
