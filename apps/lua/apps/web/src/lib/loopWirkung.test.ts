import { describe, it, expect } from 'vitest';
import { folgeuebungWirkung, type LoopWirkungEintrag } from './loopWirkung';
import type { FehlerTrendPunkt, LoopUebungRow } from '../hooks/useNatascha';

function punkt(
  aufgabe: string,
  datum: string,
  fehlerProAbgabe: Record<string, number>,
  nAbgaben = 10,
): FehlerTrendPunkt {
  return {
    aufgabe, datum, nAbgaben, fehler: {}, fehlerProAbgabe,
    clusterFehler: {}, clusterFehlerProAbgabe: {}, clusterLabels: {},
  };
}

function uebung(id: string, created_at: string, titel = 'Fehlerschwerpunkte – SA2 (6i)'): LoopUebungRow {
  return { id, titel, loop_aufgabe: 'SA2', loop_datum: '2026-09-20', created_at };
}

describe('folgeuebungWirkung', () => {
  it('vergleicht letzten Lauf davor mit erstem Lauf danach', () => {
    const punkte = [
      punkt('SA1', '2026-09-10', { R: 2.5, G: 1.2, Z: 3.0, A: 0.8 }),
      punkt('SA2', '2026-09-20', { R: 2.4, G: 1.1, Z: 2.9, A: 0.9 }),
      punkt('SA3', '2026-10-05', { R: 1.0, G: 1.1, Z: 2.9, A: 0.9 }),
    ];
    const result: LoopWirkungEintrag[] = folgeuebungWirkung(punkte, [uebung('u1', '2026-09-23T10:00:00.000Z')]);

    expect(result).toHaveLength(1);
    const e = result[0]!;
    expect(e.vor?.aufgabe).toBe('SA2');
    expect(e.nach?.aufgabe).toBe('SA3');
    const z = e.deltas.find((d) => d.typ === 'Z');
    expect(z).toEqual({ typ: 'Z', vor: 2.9, nach: 2.9, delta: 0 });
    const r = e.deltas.find((d) => d.typ === 'R');
    expect(r?.delta).toBeCloseTo(-1.4);
  });

  it('läuft am selben Tag wie die Übung zählt weder vor noch nach', () => {
    const punkte = [
      punkt('SA2', '2026-09-23', { Z: 2.0 }),
      punkt('SA3', '2026-10-05', { Z: 1.0 }),
    ];
    const result = folgeuebungWirkung(punkte, [uebung('u1', '2026-09-23T08:00:00.000Z')]);
    expect(result).toHaveLength(1);
    const e = result[0]!;
    expect(e.vor).toBeNull();
    expect(e.nach?.aufgabe).toBe('SA3');
    expect(e.deltas).toEqual([]);
  });

  it('kein Lauf danach → nach=null, keine Deltas', () => {
    const punkte = [punkt('SA1', '2026-09-10', { Z: 3.0 })];
    const result = folgeuebungWirkung(punkte, [uebung('u1', '2026-09-23T10:00:00.000Z')]);
    expect(result).toHaveLength(1);
    const e = result[0]!;
    expect(e.vor?.aufgabe).toBe('SA1');
    expect(e.nach).toBeNull();
    expect(e.deltas).toEqual([]);
  });

  it('Läufe ohne Datum oder ohne Abgaben werden ignoriert', () => {
    const punkte = [
      {
        aufgabe: 'SA0', datum: null, nAbgaben: 5, fehler: {}, fehlerProAbgabe: { Z: 9 },
        clusterFehler: {}, clusterFehlerProAbgabe: {}, clusterLabels: {},
      },
      punkt('SA-leer', '2026-09-01', { Z: 9 }, 0),
      punkt('SA1', '2026-09-10', { Z: 3.0 }),
      punkt('SA3', '2026-10-05', { Z: 1.0 }),
    ];
    const result = folgeuebungWirkung(punkte, [uebung('u1', '2026-09-23T10:00:00.000Z')]);
    expect(result).toHaveLength(1);
    const e = result[0]!;
    expect(e.vor?.aufgabe).toBe('SA1');
    expect(e.nach?.aufgabe).toBe('SA3');
  });

  it('mehrfache Übungen → ein Eintrag je Übung, unabhängig von der Reihenfolge', () => {
    const punkte = [
      punkt('SA1', '2026-09-10', { Z: 3.0 }),
      punkt('SA2', '2026-10-10', { Z: 2.0 }),
      punkt('SA3', '2026-11-10', { Z: 1.0 }),
    ];
    const result = folgeuebungWirkung(punkte, [
      uebung('u2', '2026-10-23T10:00:00.000Z'),
      uebung('u1', '2026-09-23T10:00:00.000Z'),
    ]);
    expect(result.map((r) => r.id)).toEqual(['u2', 'u1']);
    const e2 = result[0]!;
    const e1 = result[1]!;
    expect(e1.vor?.aufgabe).toBe('SA1');
    expect(e1.nach?.aufgabe).toBe('SA2');
    expect(e2.vor?.aufgabe).toBe('SA2');
    expect(e2.nach?.aufgabe).toBe('SA3');
  });

  it('Kategorien mit 0 vor und nach werden nicht gelistet', () => {
    const punkte = [
      punkt('SA1', '2026-09-10', { Z: 3.0 }),
      punkt('SA3', '2026-10-05', { Z: 1.0 }),
    ];
    const result = folgeuebungWirkung(punkte, [uebung('u1', '2026-09-23T10:00:00.000Z')]);
    expect(result).toHaveLength(1);
    expect(result[0]!.deltas.map((d) => d.typ)).toEqual(['Z']);
  });

  it('vergleicht wiederkehrende strukturierte Cluster zusätzlich zu R/G/Z/A', () => {
    const vor = punkt('SA1', '2026-09-10', { Z: 2 });
    vor.clusterFehler = { 'Z:relativ': 4 };
    vor.clusterFehlerProAbgabe = { 'Z:relativ': 0.4 };
    vor.clusterLabels = { 'Z:relativ': 'Komma vor Relativsatz' };
    const nach = punkt('SA3', '2026-10-05', { Z: 1 });
    nach.clusterFehler = { 'Z:relativ': 1, 'Z:infinitiv': 2 };
    nach.clusterFehlerProAbgabe = { 'Z:relativ': 0.1, 'Z:infinitiv': 0.2 };
    nach.clusterLabels = { 'Z:relativ': 'Komma vor Relativsatz', 'Z:infinitiv': 'Komma bei Infinitivgruppe' };

    const result = folgeuebungWirkung([vor, nach], [uebung('u1', '2026-09-23T10:00:00.000Z')]);
    expect(result[0]?.clusterDeltas).toEqual([
      { clusterId: 'Z:relativ', label: 'Komma vor Relativsatz', vor: 0.4, nach: 0.1, delta: -0.3 },
      { clusterId: 'Z:infinitiv', label: 'Komma bei Infinitivgruppe', vor: 0, nach: 0.2, delta: 0.2 },
    ]);
  });
});
