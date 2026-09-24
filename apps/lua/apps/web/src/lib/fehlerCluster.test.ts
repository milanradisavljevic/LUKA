import { describe, expect, it } from 'vitest';
import { aggregiereFehlerCluster, baueFehlerClusterTrend } from './fehlerCluster';

describe('aggregiereFehlerCluster', () => {
  it('aggregiert nur strukturierte Cluster und hält R/G/Z/A als Typ sichtbar', () => {
    const result = aggregiereFehlerCluster([
      { typ: 'G', clusterId: 'g-konjunktiv', regelMuster: 'Konjunktiv-II-Form' },
      { typ: 'G', clusterId: 'g-konjunktiv', regelMuster: 'Konjunktiv-II-Form' },
      { typ: 'Z', clusterId: 'z-komma', regelMuster: 'Komma im Nebensatz' },
      { typ: 'R', clusterId: null, regelMuster: 'ohne Cluster' },
    ]);
    expect(result).toEqual([
      { typ: 'G', clusterId: 'g-konjunktiv', label: 'Konjunktiv-II-Form', anzahl: 2 },
      { typ: 'Z', clusterId: 'z-komma', label: 'Komma im Nebensatz', anzahl: 1 },
    ]);
  });
});

describe('baueFehlerClusterTrend', () => {
  it('zeigt wiederkehrende Cluster und lässt unstrukturierte Läufe als Lücke stehen', () => {
    const trend = baueFehlerClusterTrend([
      {
        aufgabe: 'SA1', datum: '2026-01-10', nAbgaben: 10,
        fehler: { Z: 10 }, clusterFehler: { 'Z:relativ': 4 },
        clusterFehlerProAbgabe: { 'Z:relativ': 0.4 },
        clusterLabels: { 'Z:relativ': 'Komma vor Relativsatz' },
      },
      {
        aufgabe: 'SA2', datum: '2026-03-10', nAbgaben: 10,
        fehler: { Z: 8 }, clusterFehler: { 'Z:relativ': 2, 'Z:infinitiv': 3 },
        clusterFehlerProAbgabe: { 'Z:relativ': 0.2, 'Z:infinitiv': 0.3 },
        clusterLabels: { 'Z:relativ': 'Komma vor Relativsatz', 'Z:infinitiv': 'Komma bei Infinitivgruppe' },
      },
      {
        aufgabe: 'SA3', datum: '2026-05-10', nAbgaben: 10,
        fehler: { Z: 5 }, clusterFehler: {}, clusterFehlerProAbgabe: {}, clusterLabels: {},
      },
    ]);

    expect(trend.serien).toEqual([
      { id: 'Z:relativ', label: 'Komma vor Relativsatz', anzahl: 6 },
    ]);
    expect(trend.punkte.map((row) => row['Z:relativ'])).toEqual([0.4, 0.2, null]);
  });

  it('verlangt Wiederkehr in mindestens zwei Aufgabenläufen', () => {
    const trend = baueFehlerClusterTrend([{
      aufgabe: 'SA1', datum: '2026-01-10', nAbgaben: 10, fehler: { Z: 1 },
      clusterFehler: { 'Z:einmal': 1 }, clusterFehlerProAbgabe: { 'Z:einmal': 0.1 },
      clusterLabels: { 'Z:einmal': 'Einmaliges Muster' },
    }]);
    expect(trend.serien).toEqual([]);
    expect(trend.punkte).toEqual([]);
  });
});
