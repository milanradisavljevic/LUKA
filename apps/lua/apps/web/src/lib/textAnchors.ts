/** Wie gut sich ein Zitat im Schülertext wiederfinden lässt.
 *  - `eindeutig`    exakt, genau eine Fundstelle
 *  - `mehrdeutig`   exakt, mehrere Fundstellen (wird nie als eindeutig ausgegeben)
 *  - `normalisiert` nur nach Kleinschreibung/Whitespace-Kollaps gefunden
 *  - `keiner`       keine Fundstelle -> der Vorschlag bleibt unverortet in der Liste
 */
export type AnkerStatus = 'eindeutig' | 'mehrdeutig' | 'normalisiert' | 'keiner';

/** Eine Fundstelle im Originaltext: `laenge` kann je Fundstelle abweichen,
 *  weil beim Normalisieren Whitespace-Runen zusammenfallen. */
export interface AnkerTreffer {
  start: number;
  laenge: number;
}

export interface Textanker {
  status: AnkerStatus;
  /** aufsteigend, nie leer außer bei `keiner` */
  treffer: AnkerTreffer[];
}

export const LEERER_ANKER: Textanker = Object.freeze({ status: 'keiner', treffer: [] });

const WHITESPACE = /\s/;

function alleVorkommen(text: string, quote: string): number[] {
  const treffer: number[] = [];
  // Schrittweite 1: überlappende Vorkommen zählen mit ("aaaa" / "aa" -> 0, 1, 2).
  let i = text.indexOf(quote);
  while (i >= 0) {
    treffer.push(i);
    i = text.indexOf(quote, i + 1);
  }
  return treffer;
}

/** Kleinschreibung + Whitespace-Runen auf ein Leerzeichen einklappen und dabei
 *  die Index-Map zurückrechnen, damit Fundstellen im Originaltext bleiben. */
function normalisiere(text: string): { text: string; start: number[]; ende: number[] } {
  const zeichen: string[] = [];
  const start: number[] = [];
  const ende: number[] = [];
  let i = 0;
  while (i < text.length) {
    if (WHITESPACE.test(text[i]!)) {
      let j = i;
      while (j < text.length && WHITESPACE.test(text[j]!)) j++;
      zeichen.push(' ');
      start.push(i);
      ende.push(j - 1);
      i = j;
      continue;
    }
    zeichen.push(text[i]!.toLowerCase());
    start.push(i);
    ende.push(i);
    i++;
  }
  return { text: zeichen.join(''), start, ende };
}

/** Tolerant-Modus. Zwei bewusste Grenzen:
 *  - kein Entfernen von Satzzeichen (anders als die Python-Pruefung): die
 *    Markierung muss auf die echte Stelle zeigen, nicht auf eine aehnliche;
 *  - Fundstellen ueber eine Absatzgrenze hinweg (zwei oder mehr Zeilenumbrueche)
 *    werden verworfen. Ein einzelner Umbruch ist nur ein Umbruch im Absatz und
 *    bleibt zulaessig - Rohtexte sind oft hart umgebrochen. */
function normalisierteVorkommen(text: string, quote: string): AnkerTreffer[] {
  const gesucht = quote.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!gesucht) return [];
  const norm = normalisiere(text);
  const treffer: AnkerTreffer[] = [];
  let i = norm.text.indexOf(gesucht);
  while (i >= 0) {
    let start = norm.start[i]!;
    let ende = norm.ende[i + gesucht.length - 1]! + 1;
    // Nie in Whitespace auslaufen: sonst frisst die Markierung Absatzabstaende.
    while (ende > start && WHITESPACE.test(text[ende - 1]!)) ende--;
    while (start < ende && WHITESPACE.test(text[start]!)) start++;
    const abschnitt = text.slice(start, ende);
    if (ende > start && (abschnitt.match(/[\r\n]/g)?.length ?? 0) < 2) {
      treffer.push({ start, laenge: ende - start });
    }
    i = norm.text.indexOf(gesucht, i + 1);
  }
  return treffer;
}

/** Ortet ein KI-Zitat im Schülertext. Mehrdeutige Zitate liefern alle
 *  Fundstellen, statt still die erste zu setzen - die Lehrkraft soll sehen,
 *  dass der Vorschlag an mehreren Stellen stehen koennte. */
export function findeTextanker(text: string, zitat: string | null | undefined): Textanker {
  if (!text || !zitat) return LEERER_ANKER;
  const exakt = alleVorkommen(text, zitat);
  if (exakt.length > 0) {
    return {
      status: exakt.length === 1 ? 'eindeutig' : 'mehrdeutig',
      treffer: exakt.map(start => ({ start, laenge: zitat.length })),
    };
  }
  const weich = normalisierteVorkommen(text, zitat);
  if (weich.length > 0) return { status: 'normalisiert', treffer: weich };
  return LEERER_ANKER;
}
