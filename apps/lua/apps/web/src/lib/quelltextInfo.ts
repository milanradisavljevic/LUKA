export interface QuelltextInfo {
  woerter: number;
  saetze: number;
  schnittSatzlaenge: number;
  hinweis: string;
}

export function analysiereQuelltext(inhalt: string): QuelltextInfo {
  const text = inhalt.trim();
  const woerter = text.split(/\s+/).filter((w) => w.length > 0).length;
  const saetze = Math.max(1, text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);
  const schnittSatzlaenge = Math.round(woerter / saetze);

  let hinweis = '';
  if (schnittSatzlaenge <= 12) {
    hinweis = 'kurze Sätze · eher Unterstufe';
  } else if (schnittSatzlaenge <= 18) {
    hinweis = 'mittlere Satzlänge';
  } else {
    hinweis = 'lange Sätze · eher Oberstufe';
  }

  if (woerter < 150) {
    hinweis += ' · sehr kurz';
  } else if (woerter > 1200) {
    hinweis += ' · sehr lang';
  }

  return { woerter, saetze, schnittSatzlaenge, hinweis };
}
