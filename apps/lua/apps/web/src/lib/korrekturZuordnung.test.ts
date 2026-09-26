import { describe, expect, it } from 'vitest';
import { baueFehlerSegmente, primaerStart, type FehlerEingang } from './fehlerSegmente';
import { sortiereFehler, type FehlerAktion } from './korrekturSortierung';

/** Zwei Absätze, absichtlich mit wiederholten Wendungen wie in echten Schülertexten. */
const TEXT = [
  'Neuer Booktok Trend: spannende Bücher.',
  'Insbesondere auf TikTok. Insbesondere auf TikTok.',
  'Der aufsteigende Trend gilt als gute Werbung für Bücher.',
  'Man sollte sich nicht nur auf TikTok verlassen, um Lesbare Bücher zu finden.',
].join('\n');

/** Entspricht einer Zeile aus `fehler_historie` inkl. der von der Sortierung
 *  gebrauchten Vertrauensstufe. */
type Zeile = FehlerEingang & { vertrauensstufe: string | null };

const F = (id: number, zitat: string, typ: string, vertrauensstufe: string | null, aktion: FehlerAktion = null): Zeile =>
  ({ id, zitat, typ, aktion, vertrauensstufe });

/** Die volle Kette, wie die Korrektur-Ansicht sie fährt. */
function verdrahte(fehler: Zeile[], nurUnsichere = false) {
  const segmente = baueFehlerSegmente(TEXT, fehler);
  const gefiltert = nurUnsichere ? fehler.filter(f => f.vertrauensstufe === 'mittel' || f.vertrauensstufe === 'niedrig') : fehler;
  const sortiert = sortiereFehler(gefiltert, 'text', {
    startVon: id => primaerStart(segmente, id),
    aktionVon: id => fehler.find(f => f.id === id)?.aktion ?? null,
  });
  return { segmente, sortiert };
}

const LISTE = [
  F(10, 'Booktok Trend', 'R', 'hoch'),
  F(11, 'Insbesondere auf TikTok', 'A', 'niedrig'),
  F(12, 'aufsteigende', 'A', 'mittel'),
  F(13, 'auf TikTok verlassen', 'G', 'hoch'),
  F(14, 'lesbare Bücher', 'A', null),
];

describe('Korrektur-Zuordnung: Liste und Text zeigen dasselbe', () => {
  it('nummeriert die Vorschläge lückenlos in Textreihenfolge', () => {
    const { sortiert } = verdrahte(LISTE);
    expect(sortiert.zugeordnet.map(f => f.id)).toEqual([10, 11, 12, 13, 14]);
    expect([...sortiert.nummern.values()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('ordnet die Nummern den Fundstellen im Rohtext zu', () => {
    const { sortiert, segmente } = verdrahte(LISTE);
    for (const f of sortiert.zugeordnet) {
      const start = primaerStart(segmente, f.id)!;
      const nr = sortiert.nummern.get(f.id)!;
      const seg = segmente.nachFehler.get(f.id)!.find(s => s.primaer)!;
      // Der <sup> steht hinter dem markierten Text derselben Stelle.
      expect(seg.start).toBe(start);
      expect(nr).toBeGreaterThan(0);
    }
    // Startpositionen der Primärstellen sind streng aufsteigend
    const starts = sortiert.zugeordnet.map(f => primaerStart(segmente, f.id)!);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('zeigt bei einem mehrdeutigen Zitat dieselbe Nummer an allen Fundstellen', () => {
    const { segmente, sortiert } = verdrahte([F(11, 'Insbesondere auf TikTok', 'A', 'niedrig')]);
    const alle = segmente.nachFehler.get(11)!;
    expect(alle.length).toBeGreaterThan(1);
    expect(alle.every(s => s.mehrdeutig)).toBe(true);
    expect(sortiert.nummern.get(11)).toBe(1);
  });

  it('behält die Nummerierung nach dem Filtern lückenlos', () => {
    const { sortiert } = verdrahte(LISTE, true);
    expect(sortiert.zugeordnet.map(f => f.id)).toEqual([11, 12]);
    expect([...sortiert.nummern.values()].sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('legt einen Vorschlag ohne Fundstelle in die eigene Gruppe, ohne eine Lücke zu reißen', () => {
    const mitHalluzination = [...LISTE, F(20, 'der rote Faden', 'G', 'hoch')];
    const { sortiert } = verdrahte(mitHalluzination);
    expect(sortiert.nichtZuordenbar.map(f => f.id)).toEqual([20]);
    expect([...sortiert.nummern.values()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('rekonstruiert den Rohtext lückenlos – die Markierung verändert keinen Buchstaben', () => {
    const { segmente } = verdrahte(LISTE);
    let wiederhergestellt = '';
    let pos = 0;
    for (const s of segmente.segmente) {
      wiederhergestellt += TEXT.slice(pos, s.start) + TEXT.slice(s.start, s.ende);
      pos = s.ende;
    }
    wiederhergestellt += TEXT.slice(pos);
    expect(wiederhergestellt).toBe(TEXT);
  });
});
