/**
 * Heuristik-basierte Quelltext-Aufbereitung:
 * Kuerzt einen langen Text auf ein fuer Schularbeiten angemessenes Lesetempo.
 *
 * Regeln:
 * - Erster Absatz immer behalten (Einstieg)
 * - Letzten Absatz immer behalten (Schluss)
 * - Mittlere Absaetze: nach jedem Absatz pruefen, ob Wortlimit erreicht;
 *   wenn ja, "[…]" einfuegen und abbrechen
 * - Keine Satz-Zerschneidung innerhalb eines Absatzes
 */

export interface TruncateOptions {
  /** Ziel-Maximalwoerter (Default: 1200) */
  maxWoerter?: number;
  /** Stufe: unterstufe = 800–1200, oberstufe = 1200–1800 */
  stufe?: 'unterstufe' | 'oberstufe';
}

export interface TruncateResult {
  /** Gekuerzter Text */
  text: string;
  /** Urspruengliche Wortanzahl */
  originalWoerter: number;
  /** Gekuerzte Wortanzahl */
  resultWoerter: number;
  /** Wie viel gekuerzt wurde */
  gekuerzt: number;
  /** Ob gekuerzt wurde */
  wasTruncated: boolean;
}

export function truncateText(input: string, options: TruncateOptions = {}): TruncateResult {
  const maxWoerter =
    options.maxWoerter ??
    (options.stufe === 'unterstufe' ? 1000 : 1500);

  // Normalisiere Zeilenumbrueche und splitte in Absaetze
  const absaetze = input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  const originalWoerter = countWords(input);

  if (originalWoerter <= maxWoerter) {
    return {
      text: input.trim(),
      originalWoerter,
      resultWoerter: originalWoerter,
      gekuerzt: 0,
      wasTruncated: false,
    };
  }

  // Nur ein Absatz: kuerze nicht (wir wollen keine Satz-Zerschneidung)
  if (absaetze.length === 1) {
    return {
      text: input.trim(),
      originalWoerter,
      resultWoerter: originalWoerter,
      gekuerzt: 0,
      wasTruncated: false,
    };
  }

  const result: string[] = [];
  let currentWords = 0;

  // Ersten Absatz immer behalten
  const erster = absaetze[0];
  if (erster) {
    result.push(erster);
    currentWords += countWords(erster);
  }

  // Letzten Absatz reservieren (immer behalten)
  const letzter = absaetze[absaetze.length - 1];
  const letzterWoerter = letzter ? countWords(letzter) : 0;
  const limitFuerMittlere = maxWoerter - letzterWoerter;

  // Mittlere Absaetze: nur bis limitFuerMittlere
  let mittlereHinzugefuegt = 0;
  for (let i = 1; i < absaetze.length - 1; i++) {
    const absatz = absaetze[i]!;
    const w = countWords(absatz);

    if (currentWords + w > limitFuerMittlere) {
      result.push('[…]');
      break;
    }

    result.push(absatz);
    currentWords += w;
    mittlereHinzugefuegt++;
  }

  // Letzten Absatz immer hinzufuegen (auch wenn Limit leicht ueberschritten)
  if (letzter) {
    result.push(letzter);
    currentWords += letzterWoerter;
  }

  const text = result.join('\n\n');
  const resultWoerter = countWords(text);

  return {
    text,
    originalWoerter,
    resultWoerter,
    gekuerzt: originalWoerter - resultWoerter,
    wasTruncated: true,
  };
}

function countWords(text: string): number {
  // Entferne Satzzeichen und zaehre Worte
  const cleaned = text
    .replace(/[\[\]…]/g, '')
    .replace(/[^\w\säöüÄÖÜß-]/g, ' ')
    .trim();

  if (cleaned.length === 0) return 0;
  return cleaned.split(/\s+/).length;
}
