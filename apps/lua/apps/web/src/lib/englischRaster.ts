export interface EnglischRasterEntwurf {
  wortanzahl: string;
  grenzen: string[];
  bestaetigt: boolean;
}

export interface EnglischRasterOptionen {
  sollWortanzahl?: number;
  notenschluessel?: {
    id: 'individuell';
    bestaetigt: true;
    grenzen: { note: number; abProzent: number }[];
  };
}

export const LEERER_ENGLISCH_ENTWURF: EnglischRasterEntwurf = {
  wortanzahl: '', grenzen: ['', '', '', '', '0'], bestaetigt: false,
};

/** Kein stiller Standardschlüssel: erst explizite Auswahl und Bestätigung. */
export function englischRasterOptionen(entwurf: EnglischRasterEntwurf): EnglischRasterOptionen {
  const text = entwurf.wortanzahl.trim();
  const sollWortanzahl = text ? Number(text) : undefined;
  if (text && (!/^\d+$/.test(text) || !Number.isSafeInteger(sollWortanzahl)
    || sollWortanzahl! < 1 || sollWortanzahl! > 10000)) {
    throw new Error('Bitte eine vorgegebene Wortanzahl zwischen 1 und 10000 eingeben.');
  }
  if (!entwurf.bestaetigt) return { sollWortanzahl };
  if (!sollWortanzahl) throw new Error('Vor der Notenempfehlung bitte die vorgegebene Wortanzahl eingeben.');
  if (entwurf.grenzen.length !== 5) throw new Error('Bitte alle fünf Notengrenzen eingeben.');
  let vorher = 101;
  const grenzen = entwurf.grenzen.map((eingabe, index) => {
    const wert = eingabe.trim().replace(',', '.');
    const abProzent = Number(wert);
    if (!wert || !Number.isFinite(abProzent) || abProzent < 0 || abProzent > 100 || abProzent >= vorher) {
      throw new Error('Mindestprozente müssen von Note 1 bis Note 5 streng fallen (0 bis 100).');
    }
    vorher = abProzent;
    return { note: index + 1, abProzent };
  });
  if (grenzen[4]?.abProzent !== 0) throw new Error('Note 5 beginnt bei 0 Prozent.');
  return { sollWortanzahl, notenschluessel: { id: 'individuell', bestaetigt: true, grenzen } };
}
