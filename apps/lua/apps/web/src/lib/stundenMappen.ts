import {
  schulfreiAm, type FerienZeit, type SchulfreiTag, type SchulfreiInfo,
} from './ferien';
import {
  datumLang, datumNumerisch, heuteIso, kalenderwoche, MONATE_LANG, plusTage, tageZwischen,
  wochenStart, wochentag, type IsoDatum,
} from './lokalDatum';

/** Eine feste Wochenstunde — der wiederkehrende Baustein (`stundenraster`). */
export interface RasterSlot {
  id: string;
  klasseId: string | null;
  klasseName: string;
  wochentag: number;      // 1 = Montag … 7 = Sonntag
  startZeit: string;      // "HH:MM"
  endeZeit: string;
  bezeichnung: string;
  schuljahr: number | null;
  aktiv: boolean;
}

/** Eine konkrete geplante Stunde — eine Zeile in `unterrichtseinsatz`. */
export interface GeplanteStunde {
  id: string;
  klasseId: string | null;
  klasseName: string;
  datum: IsoDatum;
  startZeit: string | null;
  endeZeit: string | null;
  titel: string;
  status: string;
  einsatzArt: string;
  rasterId: string | null;
  notiz: string;
  anzahlMaterialien: number;
}

/** Die Angaben, die für Ferien- und Pausenentscheidungen gebraucht werden. */
export interface KalenderRahmen {
  land: string;
  region: string;
  ferien: FerienZeit[];
  pausen: SchulfreiTag[];
}

export const LEERER_RAHMEN: KalenderRahmen = { land: 'AT', region: '', ferien: [], pausen: [] };

/** Ein Tag im Kalender. `slots` ist die wiederkehrende Form (das Raster),
 *  `stunden` sind die konkreten Termine – zwei verschiedene Dinge, deshalb
 *  zwei Felder und kein vermischtes. */
export interface Tageszelle {
  datum: IsoDatum;
  wochentag: number;
  /** Gehört der Tag zum gerade gewählten Zeitraum? Im Monatsraster gehören
   *  die Randtage aus dem Vormonat dazu, nur grau. */
  imZeitraum: boolean;
  slots: RasterSlot[];
  stunden: GeplanteStunde[];
  schulfrei: SchulfreiInfo | null;
}

export function schulfrei(
  datum: IsoDatum, rahmen: KalenderRahmen, klasse?: string,
): SchulfreiInfo | null {
  return schulfreiAm(datum, rahmen.land, rahmen.region, rahmen.ferien, rahmen.pausen, klasse);
}

export function slotsAmTag(raster: readonly RasterSlot[], tag: number, schuljahr?: number | null): RasterSlot[] {
  return raster
    .filter(s => s.aktiv
      && s.wochentag === tag
      // Ohne Jahresfilter zählt der Altbestand (Slot ohne Schuljahr) mit.
      && (schuljahr === undefined || s.schuljahr === null || s.schuljahr === schuljahr))
    .sort((a, b) => a.startZeit.localeCompare(b.startZeit));
}

export type ZeitraumModus = 'woche' | 'monat';

function zelle(
  datum: IsoDatum, raster: readonly RasterSlot[], stunden: readonly GeplanteStunde[],
  rahmen: KalenderRahmen, schuljahr: number | null | undefined, imZeitraum: boolean,
): Tageszelle {
  const tag = wochentag(datum);
  const eigene = sortiereStunden(stunden.filter(s => s.datum === datum));
  return {
    datum,
    wochentag: tag,
    imZeitraum,
    slots: slotsAmTag(raster, tag, schuljahr),
    stunden: eigene,
    schulfrei: schulfrei(datum, rahmen, eigene[0]?.klasseName),
  };
}

export function wochenRaster(
  montag: IsoDatum, raster: readonly RasterSlot[] = [], stunden: readonly GeplanteStunde[] = [],
  rahmen: KalenderRahmen = LEERER_RAHMEN, schuljahr?: number | null,
): Tageszelle[] {
  return Array.from({ length: 7 }, (_, i) => zelle(plusTage(montag, i), raster, stunden, rahmen, schuljahr, true));
}

/** Der Monat mit seinem vollen Umlauf: 6 Kalenderwochen. */
export interface Monatsraster {
  start: IsoDatum;      // Montag der Woche, in der der 1. liegt
  ersterTag: IsoDatum;
  letzterTag: IsoDatum;
  wochen: IsoDatum[];
}

function letzterTagVon(jahr: number, monat: number): IsoDatum {
  const naechsterMonat = monat === 12 ? 1 : monat + 1;
  const jahrDesFolgemonats = monat === 12 ? jahr + 1 : jahr;
  return plusTage(`${jahrDesFolgemonats}-${String(naechsterMonat).padStart(2, '0')}-01`, -1);
}

export function monatsRaster(jahr: number, monat: number): Monatsraster {
  const ersterTag = `${jahr}-${String(monat).padStart(2, '0')}-01`;
  const start = wochenStart(ersterTag);
  const letzterTag = letzterTagVon(jahr, monat);
  // 6 Wochen = 42 Tage und decken damit jeden Monat ab (höchstens 31 Tage plus
  // je bis zu 6 Tage Vorspann).
  const wochen = Array.from({ length: 6 }, (_, i) => plusTage(start, 7 * i));
  return { start, ersterTag, wochen, letzterTag };
}

export function monatsRasterFuer(anker: IsoDatum, raster: readonly RasterSlot[] = [], stunden: readonly GeplanteStunde[] = [], rahmen: KalenderRahmen = LEERER_RAHMEN, schuljahr?: number | null): Tageszelle[] {
  const jahr = Number(anker.slice(0, 4));
  const monat = Number(anker.slice(5, 7));
  const { wochen, ersterTag, letzterTag } = monatsRaster(jahr, monat);
  return wochen.flatMap(woche => wochenRaster(woche, raster, stunden, rahmen, schuljahr)
    // Beide Grenzen prüfen: sonst zählen die Tage vor dem Monatsersten
    // (Vormonat) fälschlich als „im Zeitraum".
    .map(z => ({ ...z, imZeitraum: z.datum >= ersterTag && z.datum <= letzterTag })));
}

export function tageImZeitraum(
  modus: ZeitraumModus, anker: IsoDatum, raster: readonly RasterSlot[], stunden: readonly GeplanteStunde[],
  rahmen: KalenderRahmen, schuljahr?: number | null,
): Tageszelle[] {
  return modus === 'woche'
    ? wochenRaster(wochenStart(anker), raster, stunden, rahmen, schuljahr)
    : monatsRasterFuer(anker, raster, stunden, rahmen, schuljahr);
}

export function monatLabel(jahr: number, monat: number): string {
  return `${MONATE_LANG[monat - 1]} ${jahr}`;
}

export function monatAusAnker(anker: IsoDatum): { jahr: number; monat: number } {
  return { jahr: Number(anker.slice(0, 4)), monat: Number(anker.slice(5, 7)) };
}

export function zeitraumBeschriftung(modus: ZeitraumModus, anker: IsoDatum): string {
  if (modus === 'monat') {
    const { jahr, monat } = monatAusAnker(anker);
    return monatLabel(jahr, monat);
  }
  return wochenBeschriftung(wochenStart(anker));
}

export function zeitraumVerschieben(modus: ZeitraumModus, anker: IsoDatum, richtung: -1 | 1): IsoDatum {
  if (modus === 'woche') return plusTage(anker, 7 * richtung);
  const { jahr, monat } = monatAusAnker(anker);
  const ziel = monat + richtung;
  const j = ziel < 1 ? jahr - 1 : ziel > 12 ? jahr + 1 : jahr;
  const m = ziel < 1 ? 12 : ziel > 12 ? 1 : ziel;
  return `${j}-${String(m).padStart(2, '0')}-01`;
}

export function zeitraumNormalisieren(modus: ZeitraumModus, anker: IsoDatum): IsoDatum {
  return modus === 'monat' ? `${anker.slice(0, 7)}-01` : wochenStart(anker);
}

export interface RasterVorkommen {
  datum: IsoDatum;
  slot: RasterSlot;
  schulfrei: SchulfreiInfo | null;
}

export function rasterVorkommen(
  raster: readonly RasterSlot[], montag: IsoDatum, rahmen: KalenderRahmen, schuljahr?: number | null,
): RasterVorkommen[] {
  const out: RasterVorkommen[] = [];
  for (const tag of wochenRaster(montag, raster, [], rahmen, schuljahr)) {
    for (const slot of tag.slots) {
      out.push({ datum: tag.datum, slot, schulfrei: schulfrei(tag.datum, rahmen, slot.klasseName) });
    }
  }
  return out.sort((a, b) =>
    a.datum.localeCompare(b.datum) || a.slot.startZeit.localeCompare(b.slot.startZeit));
}

/** Die Vorkommen eines ganzen Schuljahres. Freie Tage sind markiert, aber
 *  **nicht** ausgeschlossen: das Entscheiden ist Sache der Lehrkraft. */
export function schuljahrVorkommen(
  raster: readonly RasterSlot[], von: IsoDatum, bis: IsoDatum, rahmen: KalenderRahmen, schuljahr?: number | null,
): RasterVorkommen[] {
  const out: RasterVorkommen[] = [];
  for (let woche = wochenStart(von); tageZwischen(woche, bis) >= 0; woche = plusTage(woche, 7)) {
    for (const v of rasterVorkommen(raster, woche, rahmen, schuljahr)) {
      if (v.datum >= von && v.datum <= bis) out.push(v);
    }
  }
  return out;
}

/** 1. September bis 31. August – in Österreich beginnt das Schuljahr im September,
 *  davon weicht kein Bundesland ab. */
export function schuljahrZeitraum(schuljahr: number): { von: IsoDatum; bis: IsoDatum } {
  return { von: `${schuljahr}-09-01`, bis: `${schuljahr + 1}-08-31` };
}

export function stundenInZeitraum(zellen: readonly Tageszelle[]): number {
  return zellen.filter(z => z.imZeitraum).reduce((sum, z) => sum + z.stunden.length, 0);
}

export function wochenFilterAuf(stunden: readonly GeplanteStunde[], montag: IsoDatum): GeplanteStunde[] {
  const ende = plusTage(montag, 7);
  return sortiereStunden(stunden.filter(s => s.datum >= montag && s.datum < ende));
}

export function sortiereStunden(stunden: readonly GeplanteStunde[]): GeplanteStunde[] {
  return [...stunden].sort((a, b) =>
    a.datum.localeCompare(b.datum) || (a.startZeit ?? '99:99').localeCompare(b.startZeit ?? '99:99'));
}

export function naechsteStunden(stunden: readonly GeplanteStunde[], ab: IsoDatum, anzahl: number): GeplanteStunde[] {
  return sortiereStunden(stunden.filter(s => s.datum >= ab)).slice(0, anzahl);
}

export function ohneUnterlagen(stunden: readonly GeplanteStunde[]): GeplanteStunde[] {
  return stunden.filter(s => s.anzahlMaterialien === 0);
}

export interface Tagesgruppe {
  datum: IsoDatum;
  ueberschrift: string;
  stunden: GeplanteStunde[];
  schulfrei: SchulfreiInfo | null;
}

export function gruppiereNachTag(
  stunden: readonly GeplanteStunde[], rahmen: KalenderRahmen, heute: IsoDatum = heuteIso(),
): Tagesgruppe[] {
  const gruppen = new Map<IsoDatum, GeplanteStunde[]>();
  for (const s of sortiereStunden(stunden)) {
    const liste = gruppen.get(s.datum);
    if (liste) liste.push(s);
    else gruppen.set(s.datum, [s]);
  }
  return [...gruppen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([datum, liste]) => ({
      datum,
      ueberschrift: relativTagesueberschrift(datum, heute),
      stunden: liste,
      schulfrei: schulfrei(datum, rahmen),
    }));
}

export function relativTagesueberschrift(datum: IsoDatum, heute: IsoDatum = heuteIso()): string {
  if (datum === heute) return 'Heute';
  if (datum === plusTage(heute, 1)) return 'Morgen';
  if (datum === plusTage(heute, -1)) return 'Gestern';
  return datumLang(datum);
}

export function zeitSpanne(start: string | null, ende: string | null): string {
  if (!start && !ende) return 'Uhrzeit offen';
  if (start && !ende) return start;
  if (!start && ende) return ende;
  return `${start}–${ende}`;
}

export function sortierSchluessel(stunde: Pick<GeplanteStunde, 'datum' | 'startZeit'>): string {
  return `${stunde.datum} ${stunde.startZeit ?? '99:99'}`;
}

export function wochenBeschriftung(montag: IsoDatum): string {
  return `KW ${kalenderwoche(montag)} · ${datumNumerisch(montag)} – ${datumNumerisch(plusTage(montag, 6))}`;
}

export function istDieseWoche(montag: IsoDatum, heute: IsoDatum = heuteIso()): boolean {
  return wochenStart(heute) === montag;
}
