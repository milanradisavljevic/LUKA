// Loop-Wirkung (L1): verknüpft Folgeübungen (generated_materials.loop_*) mit dem
// Fehler-Trend der Klasse. Reine Funktion, damit die Vorher/Nachher-Logik testbar
// bleibt — die KlassenView rendert nur noch.
import type { FehlerTrendPunkt, LoopUebungRow } from '../hooks/useNatascha';

/** Kategorien, für die ein Vorher/Nachher-Vergleich gezeigt wird. */
export const LOOP_TYPEN = ['R', 'G', 'Z', 'A'] as const;

export interface LoopWirkungDelta {
  typ: string;
  vor: number;
  nach: number;
  /** nach − vor (negativ = weniger Fehler pro Abgabe). */
  delta: number;
}

export interface LoopWirkungEintrag {
  id: string;
  titel: string;
  erstelltAm: string;
  /** Letzter Korrekturlauf VOR der Übung (null = keine davor). */
  vor: FehlerTrendPunkt | null;
  /** Erster Korrekturlauf NACH der Übung (null = noch keiner). */
  nach: FehlerTrendPunkt | null;
  /** typ → Delta; nur Kategorien, die in mindestens einem Lauf vorkommen. */
  deltas: LoopWirkungDelta[];
  /** Strukturierte Regelmuster; nur bei Daten auf beiden Vergleichsseiten. */
  clusterDeltas: LoopClusterWirkungDelta[];
}

export interface LoopClusterWirkungDelta {
  clusterId: string;
  label: string;
  vor: number;
  nach: number;
  delta: number;
}

/** Korrekturläufe ohne Datum sind nicht verankerbar und werden ignoriert.
 *  Läufe am selben Tag wie die Übung sind mehrdeutig (Reihenfolge unbekannt)
 *  und zählen bewusst weder als „vor" noch als „nach". */
export function folgeuebungWirkung(punkte: FehlerTrendPunkt[], uebungen: LoopUebungRow[]): LoopWirkungEintrag[] {
  const laeufe = punkte
    .filter((p) => p.datum && p.nAbgaben > 0)
    .map((p) => ({ punkt: p, tag: p.datum!.slice(0, 10) }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return uebungen.map((u) => {
    const erstelltTag = (u.created_at || '').slice(0, 10);
    let vor: FehlerTrendPunkt | null = null;
    let nach: FehlerTrendPunkt | null = null;
    for (const lauf of laeufe) {
      if (!erstelltTag) continue;
      if (lauf.tag < erstelltTag) {
        vor = lauf.punkt;
      } else if (lauf.tag > erstelltTag && !nach) {
        nach = lauf.punkt;
      }
    }

    const deltas: LoopWirkungDelta[] = [];
    if (vor && nach) {
      for (const typ of LOOP_TYPEN) {
        const v = vor.fehlerProAbgabe[typ] ?? 0;
        const n = nach.fehlerProAbgabe[typ] ?? 0;
        if (v === 0 && n === 0) continue;
        deltas.push({ typ, vor: v, nach: n, delta: Math.round((n - v) * 100) / 100 });
      }
    }

    const clusterDeltas: LoopClusterWirkungDelta[] = [];
    if (vor && nach
      && Object.keys(vor.clusterFehler ?? {}).length > 0
      && Object.keys(nach.clusterFehler ?? {}).length > 0) {
      const clusterIds = new Set([
        ...Object.keys(vor.clusterFehler),
        ...Object.keys(nach.clusterFehler),
      ]);
      for (const clusterId of clusterIds) {
        const v = vor.clusterFehlerProAbgabe[clusterId] ?? 0;
        const n = nach.clusterFehlerProAbgabe[clusterId] ?? 0;
        if (v === 0 && n === 0) continue;
        clusterDeltas.push({
          clusterId,
          label: vor.clusterLabels[clusterId] ?? nach.clusterLabels[clusterId] ?? clusterId,
          vor: v,
          nach: n,
          delta: Math.round((n - v) * 100) / 100,
        });
      }
      clusterDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.label.localeCompare(b.label));
    }

    return { id: u.id, titel: u.titel, erstelltAm: erstelltTag, vor, nach, deltas, clusterDeltas };
  });
}
