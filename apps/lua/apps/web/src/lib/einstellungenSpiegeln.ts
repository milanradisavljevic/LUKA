// Zurueckspiegeln von Vorschau-Aenderungen in die Anforderungsliste.
//
// Warum es das ueberhaupt braucht: LUKA haelt nach der Erstellung zwei Listen -
// `bloecke` (die Anforderung, im Baukasten) und `generiertesDokument.bloecke` (das
// Ergebnis, in der Vorschau). Beide sind ueber die `id` verbunden, sonst nichts.
// Aendert die Lehrkraft in der Vorschuch "Punkte", aendert das nur das Dokument -
// eine spaetere Neugenerierung laeuft wieder aus der Anforderung und waere weg.
//
// Aber: nur Felder zurueckspiegeln, die das Modell ueberhaupt bekommt.
// `blockToRequest` (useGenerate.ts) schickt als Basis `{ punkte, quelleId, hinweis }`.
// `arbeitsanweisung` und `clue` stehen NICHT in der Anforderung - sie werden nie
// uebermittelt. Sie zu spiegeln waere eine Illusion, darum werden sie als
// "nur Ergebnis" ausgewiesen und in der Vorschau auch so beschriftet.

import type { Block } from '@lehrunterlagen/schema';

/** Geht ans Modell und kann darum in die Anforderung zurueckgespiegelt werden. */
export const GESPIEGELTE_FELDER = ['punkte', 'hinweis'] as const;

/** Wirkt nur auf das fertige Dokument; eine Neugenerierung ueberschreibt es. */
export const NUR_ERGEBNIS_FELDER = ['arbeitsanweisung', 'clue'] as const;

/** Nur die Felder, die diese Funktion kennt und spiegeln darf. */
export interface SpiegelbareWerte {
  punkte?: number;
  hinweis?: string;
}

/**
 * Spiegelt die ueberlebenden Felder einer Aufgabe in die Anforderungsliste.
 * Gibt `null` zurueck, wenn nichts zu tun ist — der Aufrufer spart dann den
 * Dispatch und die Anzeige "gespeicherte Unterlage ist nicht mehr aktuell".
 *
 * Nur Felder, die das Ergebnis WIRKLICH traegt, werden uebernommen. Das Modell schickt
 * z. B. `hinweis` im fertigen Block nicht zurueck — ein unbedachtes Spiegeln wuerde die
 * Vorgabe aus dem Baukasten also loeschen, sobald man nebenan die Punkte aendert.
 */
export function spiegeleBlockEinstellungen(
  id: string,
  werte: SpiegelbareWerte,
  anforderung: Block[],
): Block[] | null {
  const ziel = anforderung.find((b) => b.id === id);
  if (!ziel) return null;

  const aenderung: SpiegelbareWerte = {};
  if (werte.punkte !== undefined && werte.punkte !== ziel.punkte) aenderung.punkte = werte.punkte;
  if (werte.hinweis !== undefined && werte.hinweis !== ziel.hinweis) aenderung.hinweis = werte.hinweis;
  if (Object.keys(aenderung).length === 0) return null;

  return anforderung.map((b) => (b.id === id ? { ...b, ...aenderung } as Block : b));
}
