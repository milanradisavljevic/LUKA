import { datumTeile, plusTage, type IsoDatum } from './lokalDatum';
import { atBundesland, ferientermine, regionNormalisieren } from './ferienTermine';

/** Region laut Lehrerprofil (`lua_lehrerprofil.region_at/ch/de`). */
export type Region = string;

export interface Feiertag {
  datum: IsoDatum;
  name: string;
}

export interface SchulfreiInfo {
  art: 'ferien' | 'feiertag' | 'pause';
  bezeichnung: string;
  ferien?: FerienZeit;
  feiertag?: Feiertag;
  pause?: SchulfreiTag;
}

export interface FerienZeit {
  id?: string;
  bezeichnung: string;
  von: IsoDatum;
  bis: IsoDatum;
  region: string;
  schuljahr: number | null;
}

/** Ein schulinterner Schließtag: MuT, Fortbildung, Elternabend. */
export interface SchulfreiTag {
  id?: string;
  bezeichnung: string;
  datum: IsoDatum;
  klasseName: string;
  notiz: string;
  schuljahr: number | null;
}

// ── Gesetzliche Feiertage (berechenbar, deshalb immer gültig) ────────────────

function iso(jahr: number, monat: number, tag: number): IsoDatum {
  const mm = monat < 10 ? `0${monat}` : String(monat);
  const tt = tag < 10 ? `0${tag}` : String(tag);
  return `${jahr}-${mm}-${tt}`;
}

/** Ostersonntag nach dem Gregorianischen Algorithmus (Meeus/Jones/Butcher).
 *  Sämtliche beweglichen Feiertage hängen daran. */
export function ostersonntag(jahr: number): IsoDatum {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(jahr, monat, tag);
}

/** Gesetzliche Feiertage für ein Jahr. Für AT ist `region` der Bundesland-Code
 *  1–9 (führende Null egal). Ohne Region gelten die bundesweiten Feiertage.
 *
 *  Bewusst die Ländervarianten weggelassen, die wir nicht belastbar kennen:
 *  DE hat Länderfeiertage, CH kennt 1. Mai und 1. August nur in einzelnen Kantonen. */
export function feiertage(jahr: number, land: string, region: string | null | undefined): Feiertag[] {
  const l = (land ?? 'AT').toUpperCase();
  if (l === 'DE') return feiertageDE(jahr);
  if (l === 'CH') return feiertageCH(jahr);
  return feiertageAT(jahr, region);
}

function feiertageAT(jahr: number, region: string | null | undefined): Feiertag[] {
  const os = ostersonntag(jahr);
  const bl = atBundesland(region);
  // Fronleichnam ist in Österreich nur in sieben Bundesländern gesetzlich, in
  // Niederösterreich und Wien nicht. Vergleich über den Namen, nicht über die
  // alte Nummer: das Profil liefert „Niederösterreich", nicht „3" – sonst
  // hätte LUA in Wien und NÖ am Fronleichnam schulfrei gerechnet.
  const ohneFronleichnam = bl === 'Niederösterreich' || bl === 'Wien';
  const mitFronleichnam = !!bl && !ohneFronleichnam;
  const f: Feiertag[] = [
    { datum: `${jahr}-01-01`, name: 'Neujahr' },
    { datum: plusTage(os, 1), name: 'Ostermontag' },
    { datum: `${jahr}-05-01`, name: 'Staatsfeiertag' },
    { datum: plusTage(os, 39), name: 'Christi Himmelfahrt' },
    { datum: plusTage(os, 50), name: 'Pfingstmontag' },
    { datum: `${jahr}-08-15`, name: 'Mariä Himmelfahrt' },
    { datum: `${jahr}-10-26`, name: 'Nationalfeiertag' },
    { datum: `${jahr}-11-01`, name: 'Allerheiligen' },
    { datum: `${jahr}-12-08`, name: 'Mariä Empfängnis' },
    { datum: `${jahr}-12-25`, name: 'Christtag' },
    { datum: `${jahr}-12-26`, name: 'Stefanitag' },
  ];
  if (mitFronleichnam) f.push({ datum: plusTage(os, 60), name: 'Fronleichnam' });
  return f.sort((a, b) => a.datum.localeCompare(b.datum));
}

function feiertageDE(jahr: number): Feiertag[] {
  const os = ostersonntag(jahr);
  return [
    { datum: `${jahr}-01-01`, name: 'Neujahr' },
    { datum: plusTage(os, -2), name: 'Karfreitag' },
    { datum: plusTage(os, 1), name: 'Ostermontag' },
    { datum: `${jahr}-05-01`, name: 'Tag der Arbeit' },
    { datum: plusTage(os, 39), name: 'Christi Himmelfahrt' },
    { datum: plusTage(os, 50), name: 'Pfingstmontag' },
    { datum: `${jahr}-10-03`, name: 'Tag der Deutschen Einheit' },
    { datum: `${jahr}-12-25`, name: '1. Weihnachtstag' },
    { datum: `${jahr}-12-26`, name: '2. Weihnachtstag' },
  ].sort((a, b) => a.datum.localeCompare(b.datum));
}

function feiertageCH(jahr: number): Feiertag[] {
  const os = ostersonntag(jahr);
  return [
    { datum: `${jahr}-01-01`, name: 'Neujahr' },
    { datum: plusTage(os, -2), name: 'Karfreitag' },
    { datum: plusTage(os, 1), name: 'Ostermontag' },
    { datum: plusTage(os, 39), name: 'Auffahrt' },
    { datum: plusTage(os, 50), name: 'Pfingstmontag' },
    { datum: `${jahr}-12-25`, name: 'Weihnachten' },
    { datum: `${jahr}-12-26`, name: 'Stephanstag' },
  ].sort((a, b) => a.datum.localeCompare(b.datum));
}

export function feiertagAm(isoDatum: IsoDatum, land: string, region: string | null | undefined): Feiertag | null {
  const { jahr } = datumTeile(isoDatum);
  return feiertage(jahr, land, region).find(f => f.datum === isoDatum) ?? null;
}

export function istFeiertag(isoDatum: IsoDatum, land: string, region: string | null | undefined): boolean {
  return feiertagAm(isoDatum, land, region) !== null;
}

// ── Schulferien: Daten aus der Datenbank, nicht Konstanten ──────────────────

/** Der Bundeslandname zu einem Regionswert – oder `null`, wenn unbekannt.
 *
 *  Nimmt Namen **und** alte Nummern (`'5'`) entgegen. Das ist wichtig, weil
 *  `schulferien.region` in der Datenbank ein freier Text ist: dort können
 *  Zeilen aus einer alten Fassung stehen, die die Nummern gespeichert hat. */
export function bundeslandName(region: string | null | undefined): string | null {
  return atBundesland(region);
}

/** Das Schuljahr zu einem Datum: in Österreich beginnt es im September.
 *  Ein 2. Jänner gehört also zum Schuljahr (Jahr − 1). */
export function schuljahrFuer(datum: IsoDatum): number {
  const jahr = datumTeile(datum).jahr;
  return datumTeile(datum).monat >= 9 ? jahr : jahr - 1;
}

export function schuljahrLabel(beginnjahr: number): string {
  return `${beginnjahr}/${String((beginnjahr + 1) % 100).padStart(2, '0')}`;
}

/** Ferie für einen Tag, aus dem geladenen Bestand. Region leer = gilt für alle.
 *
 *  Beide Seiten werden normalisiert: `schulferien.region` ist in der Datenbank
 *  ein freier Text, und aus einer älteren Fassung können dort die
 *  Bundesland-Nummern stehen. Sonst würde eine eingetragene Ferie für „5" nie
 *  zu einem Profil mit „Salzburg" passen. */
export function ferienAm(isoDatum: IsoDatum, ferien: readonly FerienZeit[], region: string | null | undefined): FerienZeit | null {
  const bl = regionNormalisieren(region);
  return ferien.find(f => {
    if (!(isoDatum >= f.von && isoDatum <= f.bis)) return false;
    if (!f.region) return true;
    return regionNormalisieren(f.region) === bl;
  }) ?? null;
}

/** Schulinterner Schließtag an einem Tag. `klasse` filtert auf eine Klasse. */
export function pauseAm(isoDatum: IsoDatum, pausen: readonly SchulfreiTag[], klasse?: string): SchulfreiTag | null {
  return pausen.find(p => p.datum === isoDatum && (!p.klasseName || !klasse || p.klasseName === klasse)) ?? null;
}

/** Alles, woran an diesem Tag kein Unterricht ist. Reihenfolge: Pause, Ferien, Feiertag –
 *  die Schule selbst hat das zuletzt entschieden, die Verordnung davor. */
export function schulfreiAm(
  isoDatum: IsoDatum,
  land: string,
  region: string | null | undefined,
  ferien: readonly FerienZeit[] = [],
  pausen: readonly SchulfreiTag[] = [],
  klasse?: string,
): SchulfreiInfo | null {
  const pause = pauseAm(isoDatum, pausen, klasse);
  if (pause) return { art: 'pause', bezeichnung: pause.bezeichnung, pause };
  const ferie = ferienAm(isoDatum, ferien, region);
  if (ferie) return { art: 'ferien', bezeichnung: ferie.bezeichnung, ferien: ferie };
  const feiertag = feiertagAm(isoDatum, land, region);
  if (feiertag) return { art: 'feiertag', bezeichnung: feiertag.name, feiertag };
  return null;
}

/** Kurzform: gibt es an diesem Tag Unterricht? */
export function istSchulfrei(
  isoDatum: IsoDatum, land: string, region: string | null | undefined,
  ferien: readonly FerienZeit[] = [], pausen: readonly SchulfreiTag[] = [], klasse?: string,
): boolean {
  return schulfreiAm(isoDatum, land, region, ferien, pausen, klasse) !== null;
}

/** Ferienzeit, die eine Woche (Mo–So) berührt. */
export function ferienDerWoche(
  montag: IsoDatum, land: string, region: string | null | undefined,
  ferien: readonly FerienZeit[] = [],
): FerienZeit | null {
  for (let i = 0; i < 7; i++) {
    const f = ferienAm(plusTage(montag, i), ferien, region);
    if (f) return f;
  }
  return null;
}

/** Hat der Bestand für dieses Bundesland und Schuljahr überhaupt Termine? */
export function hatFerienDaten(ferien: readonly FerienZeit[], region: string | null | undefined, schuljahr: number): boolean {
  const bl = regionNormalisieren(region);
  if (!bl) return false;
  // „Gilt für alle" (leere Region) zählt nicht als Daten für dieses Bundesland:
  // dann fehlen die eigenen Termine noch, und genau das soll gemeldet werden.
  return ferien.some(f => (
    f.schuljahr === schuljahr && !!f.region && regionNormalisieren(f.region) === bl
  ));
}

/** Wie stark der Ferienhinweis auftritt.
 *  `warnung` ist der gelbe Balken, `hinweis` eine stille Zeile. */
export type FerienHinweis = {
  text: string;
  art: 'warnung' | 'hinweis';
  /** Ob LUA amtliche Termine zum Übernehmen anbietet. */
  vorschlag: boolean;
};

/** Wie das Land heißt, damit der Satz nicht „für dein Bundesland" sagt, obwohl
 *  im Profil eines steht. Für Deutschland ist die Region bereits der Name. */
/** Wie die Region im Satz heißt.
 *
 *  Steht im **Nominativ**, weil der Satz „Für ${ort} liegen …" lautet – im
 *  Dativ wurde daraus vorher „Für deinem Bundesland" und „Für der Schweiz". */
function ortBezeichnung(land: string, region: string | null | undefined): string {
  const l = (land ?? 'AT').toUpperCase();
  if (l === 'CH') return 'die Schweiz';
  if (l === 'DE') {
    const reg = (region ?? '').toString().trim();
    return reg || 'Deutschland';
  }
  return atBundesland(region) ?? 'dein Bundesland';
}

/** Fehlende Feriendaten sichtbar machen, statt still zu planen.
 *
 *  Drei Fälle, und sie sind nicht gleich wichtig:
 *
 *  - Die Lehrkraft hat Ferien eingetragen → **kein** Hinweis.
 *  - LUA hat für dieses Schuljahr amtliche Termine, die fehlen in der Datenbank
 *    → **Warnung** mit Übernehmen-Knopf. Das ist Österreich und Deutschland.
 *  - Für das Schuljahr liegen gar keine Termine vor (die Verordnung ist noch
 *    nicht veröffentlicht) oder das Land führt wir keine (Schweiz) →
 *    **stiller Hinweis**. Ein gelber Alarm wäre falsch: LUA kann hier nichts
 *    anbieten, und der Text würde eine Schuld suggerieren, die es nicht gibt.
 */
export function ferienWarnung(
  schuljahr: number, land: string, region: string | null | undefined, ferien: readonly FerienZeit[],
): FerienHinweis | null {
  if (hatFerienDaten(ferien, region, schuljahr)) return null;
  const l = (land ?? 'AT').toUpperCase();
  const reg = (region ?? '').trim();
  const ort = ortBezeichnung(l, region);

  if (!reg && (l === 'AT' || l === 'DE')) {
    return {
      // Das Land gehört in den Text: wer in einem deutschen Profil plant, muss
      // sonst raten, ob er das Bundesland im Profil oder in den Einstellungen
      // suchen muss.
      text: l === 'DE'
        ? 'Im Lehrerprofil steht kein Bundesland. Wähle es im Profil, dann trägt '
          + 'LUA die amtlichen Ferien für dieses deutsche Bundesland ein.'
        : 'Im Lehrerprofil steht kein Bundesland. Wähle es im Profil, dann trägt '
          + 'LUA die amtlichen Ferien für dieses Bundesland ein.',
      art: 'hinweis',
      vorschlag: false,
    };
  }

  if (!hatFerienTermine(schuljahr, l, reg)) {
    return {
      text: l === 'CH'
        ? `Für die Schweiz führt LUA keine Schulferien - sie sind kantonal. Trage die Termine für ${schuljahrLabel(schuljahr)} unter „Ferien und Pausen" ein.`
        : `Für ${ort} liegen noch keine amtlichen Termine für ${schuljahrLabel(schuljahr)} vor. Trage die Ferien unter „Ferien und Pausen" ein.`,
      art: 'hinweis',
      vorschlag: false,
    };
  }

  return {
    text: `Für ${ort} sind für ${schuljahrLabel(schuljahr)} noch keine Schulferien eingetragen.`,
    art: 'warnung',
    vorschlag: true,
  };
}

// ── Amtlicher Jahresbestand zum Nachladen ────────────────────────────────────

export interface FerienBestand {
  bezeichnung: string;
  von: IsoDatum;
  bis: IsoDatum;
}

/** Die amtlichen Schulferien eines Bundeslandes als **Vorschlag** zum Nachladen.

 *  Die Werte kommen aus `ferienTermine.ts` – dort stehen die Termine, die das
 *  jeweilige Ministerium veröffentlicht hat. Früher stand hier eine Formel
 *  („Ostermontag + 13 Tage"), und die lieferte für 2026/27 den 29.03.–11.04.
 *  statt der amtlichen 20.03.–29.03.: LUA hätte in den Osterferien Unterricht
 *  geplant. Formeln stehen hier nicht mehr.
 *
 *  **Leer heißt: für dieses Jahr liegen keine Termine vor.** Kein Raten. Fehlt
 *  ein Jahr in der Tabelle, meldet die Oberfläche die Lücke, statt einen
 *  Ferientag zu erfinden, den die Lehrkraft in ihren Stundenplan übernimmt.
 *
 *  Regelbetreuungstage, Feiertagsverschiebungen und abweichende Termine einzelner
 *  Schularten stehen in keiner Schulferien-Verordnung und werden nicht erfunden.
 *  Die Werte sind trotzdem mit der Verordnung abzugleichen – siehe `QUELLEN`.
 */
export function ferienBestandVorschlag(region: string, schuljahr: number, land = 'AT'): FerienBestand[] {
  const termine = ferientermine(schuljahr, land, region);
  return termine ? termine.map(t => ({ ...t })) : [];
}

/** Ob für dieses Schuljahr überhaupt Termine vorliegen. Steuert den Hinweis,
 *  ob die Oberfläche überhaupt einen Übernehmen-Knopf anbietet. */
export function hatFerienTermine(schuljahr: number, land: string, region: string | null | undefined): boolean {
  return ferientermine(schuljahr, land, region) !== null;
}
