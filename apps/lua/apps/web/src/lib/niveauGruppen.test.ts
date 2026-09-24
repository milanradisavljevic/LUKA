import { describe, expect, it } from 'vitest';
import { ermittleNiveaugruppen, kompetenzNiveauFuerGruppe, neuesteBestaetigteNoten } from './niveauGruppen';

const noten = (count: number) => Array.from({ length: count }, (_, i) => ({
  schuelerId: i + 1,
  noteFinal: (i % 6) + 1,
  datum: '2026-09-24',
}));

describe('ermittleNiveaugruppen', () => {
  it('bildet unter sechs Schülern keine automatische Gruppierung', () => {
    expect(ermittleNiveaugruppen(noten(5))).toEqual([]);
  });

  it('bildet bei 6 bis 11 Schülern zwei ausgewogene Gruppen', () => {
    const result = ermittleNiveaugruppen(noten(7));
    expect(result.map((g) => g.id)).toEqual(['vertiefung', 'foerder']);
    expect(result.map((g) => g.schuelerIds.length)).toEqual([4, 3]);
    expect(result[0]?.schwierigkeit).toBe('schwer');
    expect(result[1]?.schwierigkeit).toBe('leicht');
  });

  it('bildet ab zwölf Schülern drei Gruppen und verwendet je Schüler nur die letzte Note', () => {
    const result = ermittleNiveaugruppen([
      ...noten(12),
      { schuelerId: 1, noteFinal: 6, datum: '2026-09-25' },
    ]);
    expect(result.map((g) => g.id)).toEqual(['vertiefung', 'basis', 'foerder']);
    expect(result.map((g) => g.schuelerIds.length)).toEqual([4, 4, 4]);
    expect(result[2]?.schuelerIds).toContain(1);
    expect(result[0]?.schuelerIds).not.toContain(1);
  });

  it('ordnet Schweizer Noten mit 6 als stärkster Note in umgekehrter Richtung', () => {
    const result = ermittleNiveaugruppen(noten(12), 'CH');
    expect(result.map((g) => g.id)).toEqual(['vertiefung', 'basis', 'foerder']);
    expect(result[0]?.notenbereich).toEqual({ min: 5, max: 6 });
    expect(result[2]?.notenbereich).toEqual({ min: 1, max: 2 });
  });

  it('behält ohne Land die bisherige AT/DE-Notenrichtung bei', () => {
    const result = ermittleNiveaugruppen(noten(12));
    expect(result[0]?.notenbereich).toEqual({ min: 1, max: 2 });
    expect(result[2]?.notenbereich).toEqual({ min: 5, max: 6 });
  });

  it('übersetzt Gruppen deterministisch in Kompetenzniveaus', () => {
    const result = ermittleNiveaugruppen(noten(12));
    expect(result.map(kompetenzNiveauFuerGruppe)).toEqual(['erweitert', 'standard', 'basis']);
  });

  it('nimmt bei gleichem oder unlesbarem Datum die Abgabe mit der höchsten ID', () => {
    const neueste = neuesteBestaetigteNoten([
      { schuelerId: 1, noteFinal: 2, datum: 'unbekannt', abgabeId: 8 },
      { schuelerId: 1, noteFinal: 4, datum: 'unbekannt', abgabeId: 9 },
      { schuelerId: 2, noteFinal: 3, datum: '2026-09-24T10:00:00Z', abgabeId: 10 },
      { schuelerId: 2, noteFinal: 5, datum: '2026-09-24T10:00:00Z', abgabeId: 11 },
    ]);
    expect(neueste).toEqual([
      { schuelerId: 1, noteFinal: 4, datum: 'unbekannt', abgabeId: 9 },
      { schuelerId: 2, noteFinal: 5, datum: '2026-09-24T10:00:00Z', abgabeId: 11 },
    ]);
  });
});
