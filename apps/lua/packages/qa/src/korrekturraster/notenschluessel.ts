import type { Notenstufe } from './types';

const STANDARD_SCHLUESSEL: Omit<Notenstufe, 'minPunkte' | 'maxPunkte'>[] = [
  { note: 1, bezeichnung: 'Sehr gut', minProzent: 87, maxProzent: 100 },
  { note: 2, bezeichnung: 'Gut', minProzent: 73, maxProzent: 86 },
  { note: 3, bezeichnung: 'Befriedigend', minProzent: 59, maxProzent: 72 },
  { note: 4, bezeichnung: 'Genuegend', minProzent: 45, maxProzent: 58 },
  { note: 5, bezeichnung: 'Nicht genuegend', minProzent: 0, maxProzent: 44 },
];

export function berechneNotenschluessel(gesamtPunkte: number): Notenstufe[] {
  // Kaskadierende Berechnung: jede Note schliesst nahtlos an die naechste an.
  // Note 1 (beste): max = gesamtPunkte
  // Note n: max = minPunkte(n-1) - 1
  // Note 5 (schlechteste): min = 0

  const result: Notenstufe[] = [];
  let prevMin = gesamtPunkte + 1; // Note 1 bekommt max = gesamtPunkte

  for (const s of STANDARD_SCHLUESSEL) {
    const minPunkte = Math.ceil(gesamtPunkte * s.minProzent / 100);
    const maxPunkte = prevMin - 1;

    // Letzte Note (5) bekommt min = 0, damit 0 immer enthalten ist
    const effectiveMin = s.note === 5 ? 0 : Math.min(minPunkte, maxPunkte);

    result.push({
      ...s,
      minPunkte: effectiveMin,
      maxPunkte: Math.max(maxPunkte, effectiveMin),
    });

    prevMin = effectiveMin;
  }

  return result;
}
