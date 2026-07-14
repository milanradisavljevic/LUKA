import { describe, expect, it } from 'vitest';
import {
  EINSATZ_ART_LABELS,
  formatEinsatzDatum,
  einsatzAnzeigeDatum,
  labelRueckblickStatus,
  sortEinsaetze,
} from './einsatz';

describe('Einsatzdarstellung', () => {
  it('verwendet eingesetzt_am vor geplant_am und sortiert neueste zuerst', () => {
    const einsaetze = [
      { id: 'alt', geplantAm: '2026-06-01', eingesetztAm: null },
      { id: 'neu', geplantAm: '2026-06-02', eingesetztAm: '2026-06-03' },
      { id: 'mittel', geplantAm: '2026-06-04', eingesetztAm: null },
    ];
    expect(einsatzAnzeigeDatum(einsaetze[1]!)).toBe('2026-06-03');
    expect(sortEinsaetze(einsaetze).map((e) => e.id)).toEqual(['mittel', 'neu', 'alt']);
  });

  it('liefert zentrale Labels ohne UI-eigene Literale', () => {
    expect(EINSATZ_ART_LABELS.hausuebung).toBe('Hausübung');
    expect(labelRueckblickStatus('anpassen')).toBe('Anpassen');
  });

  it('formatiert ISO-Daten und lässt offene Daten erkennbar', () => {
    expect(formatEinsatzDatum('2026-07-14')).toContain('2026');
    expect(formatEinsatzDatum(null)).toBe('Datum offen');
  });
});
