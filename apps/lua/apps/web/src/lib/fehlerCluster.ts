/** Strukturierte Fehler-Cluster für die Closed-Loop-Auswertung.
 * R/G/Z/A bleibt der grobe Rückwärtskompatibilitätsweg; diese Ansicht wird nur
 * aus tatsächlich vorhandenen clusterId/regelMuster-Daten gebildet.
 */

export interface FehlerClusterInput {
  typ: string;
  clusterId?: string | null;
  regelMuster?: string | null;
}

export interface FehlerClusterSummary {
  typ: string;
  clusterId: string;
  label: string;
  anzahl: number;
}

export interface FehlerClusterTrendPunkt {
  aufgabe: string;
  datum: string | null;
  nAbgaben: number;
  fehler: Record<string, number>;
  clusterFehler: Record<string, number>;
  clusterFehlerProAbgabe: Record<string, number>;
  clusterLabels: Record<string, string>;
}

export interface FehlerClusterTrend {
  serien: { id: string; label: string; anzahl: number }[];
  punkte: Array<{ aufgabe: string; datum: string | null; nAbgaben: number; [clusterId: string]: string | number | null }>;
}

export function aggregiereFehlerCluster(rows: FehlerClusterInput[]): FehlerClusterSummary[] {
  const byKey = new Map<string, FehlerClusterSummary>();
  for (const row of rows) {
    const clusterId = row.clusterId?.trim();
    if (!clusterId) continue;
    const key = `${row.typ}::${clusterId}`;
    const current = byKey.get(key);
    if (current) {
      current.anzahl += 1;
      if (current.label === clusterId && row.regelMuster?.trim()) current.label = row.regelMuster.trim();
      continue;
    }
    byKey.set(key, {
      typ: row.typ,
      clusterId,
      label: row.regelMuster?.trim() || clusterId,
      anzahl: 1,
    });
  }
  return [...byKey.values()].sort((a, b) => b.anzahl - a.anzahl || a.label.localeCompare(b.label));
}

/**
 * Baut eine zusätzliche Cluster-Zeitreihe. Ein Cluster erscheint erst, wenn
 * er in mindestens zwei Aufgabenläufen vorkommt. Fehlende Cluster-Metadaten
 * werden bei Aufgaben mit unstrukturierten Fehlern als Lücke statt als Null
 * dargestellt; ein fehlerfreier Lauf ist dagegen ein echter Nullwert.
 */
export function baueFehlerClusterTrend(
  rows: FehlerClusterTrendPunkt[],
  maxSerien = 6,
): FehlerClusterTrend {
  const aggregat = new Map<string, { label: string; anzahl: number; aufgaben: Set<string> }>();
  for (const row of rows) {
    for (const [id, anzahl] of Object.entries(row.clusterFehler ?? {})) {
      const current = aggregat.get(id) ?? {
        label: row.clusterLabels?.[id]?.trim() || id,
        anzahl: 0,
        aufgaben: new Set<string>(),
      };
      current.anzahl += anzahl;
      if (anzahl > 0) current.aufgaben.add(row.aufgabe);
      if (current.label === id && row.clusterLabels?.[id]?.trim()) {
        current.label = row.clusterLabels[id]!.trim();
      }
      aggregat.set(id, current);
    }
  }

  const serien = [...aggregat.entries()]
    .filter(([, value]) => value.aufgaben.size >= 2)
    .map(([id, value]) => ({ id, label: value.label, anzahl: value.anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.label.localeCompare(b.label))
    .slice(0, Math.max(0, maxSerien));
  const punkte = serien.length === 0 ? [] : rows.map((row) => {
    const clusterIds = Object.keys(row.clusterFehler ?? {});
    const fehlerAnzahl = Object.values(row.fehler ?? {}).reduce((sum, value) => sum + value, 0);
    const strukturierteDatenVorhanden = clusterIds.length > 0;
    const werte: Record<string, string | number | null> = {};
    for (const serie of serien) {
      werte[serie.id] = strukturierteDatenVorhanden || fehlerAnzahl === 0
        ? row.clusterFehlerProAbgabe?.[serie.id] ?? 0
        : null;
    }
    return { aufgabe: row.aufgabe, datum: row.datum, nAbgaben: row.nAbgaben, ...werte };
  });

  return { serien, punkte };
}
