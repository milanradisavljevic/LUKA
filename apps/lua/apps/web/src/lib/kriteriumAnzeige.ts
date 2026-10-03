const BEKANNTE_KRITERIEN: Record<string, string> = {
  analyse: 'Analyse',
  einleitung_aufbau: 'Einleitung & Aufbau',
  interpretation: 'Interpretation',
  sprachrichtigkeit: 'Sprachrichtigkeit',
};

const KLEINZUSCHREIBENDE_WOERTER = new Set(['am', 'an', 'auf', 'aus', 'bei', 'der', 'die', 'das', 'des', 'dem', 'den', 'ein', 'eine', 'einer', 'eines', 'für', 'im', 'in', 'mit', 'nach', 'oder', 'und', 'von', 'vor', 'zu', 'zum', 'zur']);

/** Macht technische Raster-Schlüssel in der Korrekturansicht lesbar. */
export function kriteriumAnzeige(name: string): string {
  const roh = name.trim();
  if (!roh) return roh;

  const schluessel = roh.toLocaleLowerCase('de-DE').replace(/[\s-]+/g, '_');
  const bekannt = BEKANNTE_KRITERIEN[schluessel];
  if (bekannt) return bekannt;

  return roh
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((wort, index) => {
      if (/^[A-Z0-9][A-Z0-9./-]*$/.test(wort)) return wort;
      const klein = wort.toLocaleLowerCase('de-DE');
      if (index > 0 && KLEINZUSCHREIBENDE_WOERTER.has(klein)) return klein;
      return klein.charAt(0).toLocaleUpperCase('de-DE') + klein.slice(1);
    })
    .join(' ');
}
