export type AbrufcheckErgebnis = 'richtig' | 'teilweise' | 'noch_nicht';

export interface AbrufcheckZeile {
  schuelerId: number;
  status: 'offen' | 'anwesend' | 'abwesend';
  antwort: string | null;
  ergebnis: AbrufcheckErgebnis | null;
}

export interface AbrufcheckBatchEintrag {
  schuelerId: number;
  antwort: string;
  ergebnis: AbrufcheckErgebnis | null;
}

/** Liefert nur vollständige, geänderte und nicht als abwesend markierte Antworten. */
export function vorbereiteteAbrufcheckAntworten(
  modus: 'offen' | 'auswahl',
  zeilen: readonly AbrufcheckZeile[],
  antwortEntwuerfe: Readonly<Record<number, string>>,
  auswertungen: Readonly<Record<number, AbrufcheckErgebnis | undefined>>,
): AbrufcheckBatchEintrag[] {
  const eintraege: AbrufcheckBatchEintrag[] = [];
  for (const zeile of zeilen) {
    if (zeile.status === 'abwesend') continue;
    const antwort = (antwortEntwuerfe[zeile.schuelerId] ?? zeile.antwort ?? '').trim();
    if (!antwort) continue;
    const ergebnis = auswertungen[zeile.schuelerId] ?? zeile.ergebnis;
    if (modus === 'offen' && !ergebnis) continue;
    const unveraendert = zeile.antwort === antwort
      && (modus === 'auswahl' ? zeile.ergebnis !== null : zeile.ergebnis === ergebnis);
    if (unveraendert) continue;
    eintraege.push({
      schuelerId: zeile.schuelerId,
      antwort,
      ergebnis: modus === 'offen' ? ergebnis! : null,
    });
  }
  return eintraege;
}
