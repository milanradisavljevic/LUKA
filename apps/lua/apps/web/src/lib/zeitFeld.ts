import { datumTeileSicher, type IsoDatum } from './lokalDatum';

/**
 * Uhrzeiten und Datumsfelder, die **immer** im deutschen Format erscheinen.
 *
 *  Warum nicht `<input type="time">`: dessen Anzeige richtet sich nach der
 *  Locale der WebView, nicht nach `<html lang="de">`. Auf einem System mit
 *  US-Locale appeared dort „12:30 PM", und `type="date"` zeigte „09/21/2026".
 *  Beides ist für den Unterricht unbrauchbar und lässt sich nicht per HTML
 *  erzwingen. Deshalb eigene Felder mit festem Format.
 */

/** 24 Stunden in 5-Minuten-Schritten: `00:00` … `23:55`. */
export function zeitRaster(schrittMinuten = 5): string[] {
  const werte: string[] = [];
  for (let minute = 0; minute < 24 * 60; minute += schrittMinuten) {
    werte.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  }
  return werte;
}

/** Prüft `HH:MM` streng: zwei Stellen, Stunde ≤ 23, Minute ≤ 59. */
export function istGueltigeZeit(wert: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(wert.trim());
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

/** Wie `zeitRaster`, aber mit dem aktuellen Wert ergänzt, falls er nicht auf dem
 *  Raster liegt. Sonst würde eine bestehende Zeit wie `08:45` beim Absenden
 *  still auf `08:45 → 08:40/08:50` springen. */
export function zeitOptionen(wert: string | null | undefined, schrittMinuten = 5): string[] {
  const raster = zeitRaster(schrittMinuten);
  const sauber = (wert ?? '').trim();
  if (sauber && istGueltigeZeit(sauber) && !raster.includes(sauber)) {
    return [...raster, sauber].sort();
  }
  return raster;
}

/**
 * Liest `TT.MM.JJJJ` und gibt das ISO-Datum zurück.
 *
 *  Prüft auch, ob der Tag wirklich existiert - der 31. Februar wird abgewiesen
 *  statt still zu einem Märzdatum zu werden.
 */
export function parseDatumDE(wert: string): IsoDatum | null {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(wert.trim());
  if (!m) return null;
  const tag = Number(m[1]);
  const monat = Number(m[2]);
  const jahr = Number(m[3]);
  if (monat < 1 || monat > 12 || tag < 1) return null;
  // `datumTeileSicher` kennt die Monatslängen inklusive Schaltjahr.
  const teile = datumTeileSicher(`${jahr}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`);
  if (!teile || teile.tag !== tag || teile.monat !== monat || teile.jahr !== jahr) return null;
  return `${jahr}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}`;
}

/** `2026-09-07` → `07.09.2026`. Für Werte, die nicht geparst werden können,
 *  kommt der Text unverändert zurück - die Anzeige soll nie leer bleiben. */
export function formatiereDatumDE(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return iso.trim();
  return `${m[3]}.${m[2]}.${m[1]}`;
}
