import type { Deskriptor, StoffItem } from '@lehrunterlagen/schema';
import { getStoffItems, listDeskriptoren } from './stoffkatalog';

// ---------------------------------------------------------------------------
// Kompetenz-Coverage: welche Lehrplan-Deskriptoren deckt eine Übung ab?
// KRITISCH (Wahrheitsgehalt eines Nachweisdokuments): Mengenlogik läuft über
// Deskriptor-IDs, nicht Objektidentität. Ein falscher "abgedeckt"-Eintrag ist
// schlimmer als keiner — die Lehrkraft legt das der Inspektion vor.
// ---------------------------------------------------------------------------

export interface CoverageResult {
  /** Deskriptoren des Universums, die von den gewählten Stoff-Items abgedeckt werden. */
  abgedeckt: Deskriptor[];
  /** Deskriptoren des Universums, die (noch) nicht abgedeckt sind. */
  fehlend: Deskriptor[];
  /** Aufschlüsselung pro Stoff-Item (welches Item welche Deskriptoren abdeckt). */
  items: Array<{ id: string; titel: string; deskriptoren: Deskriptor[] }>;
}

interface CoverageMeta {
  fach: Deskriptor['fach'];
  stufe: Deskriptor['stufe'];
  rahmenwerk?: Deskriptor['rahmenwerk'];
  stoffItemIds?: string[];
  schulstufe?: number;
}

/**
 * Reiner Kern — testbar mit Fixtures, ohne den hartkodierten Stoffkatalog.
 *
 * Errt bewusst SICHER: `abgedeckt ⊆ universum`. Ein deskriptorId, das auf ein
 * Item verweist, aber nicht im Universum (Fach/Stufe) liegt, wird NICHT als
 * abgedeckt gezählt → Unterzählung möglich, aber nie eine falsche Abdeckungs-Behauptung.
 */
export function computeCoverageFrom(
  stoffItemIds: string[],
  items: StoffItem[],
  universum: Deskriptor[],
): CoverageResult {
  const universumById = new Map(universum.map((d) => [d.id, d]));
  const abgedeckteIds = new Set<string>();
  const itemBreakdown: CoverageResult['items'] = [];

  for (const id of stoffItemIds) {
    const item = items.find((i) => i.id === id);
    if (!item) continue;
    const deskriptoren: Deskriptor[] = [];
    for (const did of item.deskriptorIds) {
      abgedeckteIds.add(did);
      const d = universumById.get(did);
      if (d) deskriptoren.push(d);
    }
    itemBreakdown.push({ id: item.id, titel: item.titel, deskriptoren });
  }

  const abgedeckt = universum.filter((d) => abgedeckteIds.has(d.id));
  const fehlend = universum.filter((d) => !abgedeckteIds.has(d.id));
  return { abgedeckt, fehlend, items: itemBreakdown };
}

/**
 * App-Variante: löst Stoff-Items und Universum aus dem Stoffkatalog auf.
 * Universum = alle Deskriptoren für (fach, stufe, rahmenwerk) der Meta.
 */
export function computeCoverage(meta: CoverageMeta): CoverageResult {
  const ids = meta.stoffItemIds ?? [];
  const items = getStoffItems(ids);
  const universum = listDeskriptoren(meta.fach, meta.stufe, meta.rahmenwerk, meta.schulstufe);
  return computeCoverageFrom(ids, items, universum);
}
