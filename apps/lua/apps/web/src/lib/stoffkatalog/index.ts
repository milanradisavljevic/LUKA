import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';
import { deutschDeskriptoren, deutschStoffItems } from './deutsch';
import { englischDeskriptoren, englischStoffItems } from './englisch';
import { franzoesischDeskriptoren, franzoesischStoffItems } from './franzoesisch';
import { spanischDeskriptoren, spanischStoffItems } from './spanisch';
import { italienischDeskriptoren, italienischStoffItems } from './italienisch';
import { lateinDeskriptoren, lateinStoffItems } from './latein';
import { geschichteDeskriptoren, geschichteStoffItems } from './geschichte';
import { geographieDeskriptoren, geographieStoffItems } from './geographie';
import { informatikkiDeskriptoren, informatikkiStoffItems } from './informatikki';
import { religionDeskriptoren, religionStoffItems } from './religion';
import { ethikDeskriptoren, ethikStoffItems } from './ethik';
import { mediendemokratieDeskriptoren, mediendemokratieStoffItems } from './mediendemokratie';
import { psychologieDeskriptoren, psychologieStoffItems } from './psychologie';
import { philosophieDeskriptoren, philosophieStoffItems } from './philosophie';
import { deutschDeDeskriptoren, deutschDeStoffItems } from './de/deutsch';
import { englischDeDeskriptoren, englischDeStoffItems } from './de/englisch';
import { geschichteDeDeskriptoren, geschichteDeStoffItems } from './de/geschichte';
import { geographieDeDeskriptoren, geographieDeStoffItems } from './de/geographie';
import { ethikDeDeskriptoren, ethikDeStoffItems } from './de/ethik';
import { franzoesischDeDeskriptoren, franzoesischDeStoffItems } from './de/franzoesisch';
import { spanischDeDeskriptoren, spanischDeStoffItems } from './de/spanisch';
import { italienischDeDeskriptoren, italienischDeStoffItems } from './de/italienisch';
import { lateinDeDeskriptoren, lateinDeStoffItems } from './de/latein';
import { religionDeDeskriptoren, religionDeStoffItems } from './de/religion';
import { psychologieDeDeskriptoren, psychologieDeStoffItems } from './de/psychologie';
import { philosophieDeDeskriptoren, philosophieDeStoffItems } from './de/philosophie';
import { mediendemokratieDeDeskriptoren, mediendemokratieDeStoffItems } from './de/mediendemokratie';
import { informatikkiDeDeskriptoren, informatikkiDeStoffItems } from './de/informatikki';

// ---------------------------------------------------------------------------
// Stoffkatalog für den Kompetenz-Modus (Rahmenwerk at-lehrplan).
// Je Fach eine Datei; hier aggregiert. Neue Fächer: Datei anlegen + unten registrieren.
// Kompetenzbereiche je Fach: siehe KOMPETENZBEREICHE in @lehrunterlagen/schema.
// ---------------------------------------------------------------------------

const DESKRIPTOREN: Deskriptor[] = [
  ...englischDeskriptoren,
  ...deutschDeskriptoren,
  ...franzoesischDeskriptoren,
  ...spanischDeskriptoren,
  ...italienischDeskriptoren,
  ...lateinDeskriptoren,
  ...geschichteDeskriptoren,
  ...geographieDeskriptoren,
  ...informatikkiDeskriptoren,
  ...religionDeskriptoren,
  ...ethikDeskriptoren,
  ...mediendemokratieDeskriptoren,
  ...psychologieDeskriptoren,
  ...philosophieDeskriptoren,
  ...deutschDeDeskriptoren,
  ...englischDeDeskriptoren,
  ...geschichteDeDeskriptoren,
  ...geographieDeDeskriptoren,
  ...ethikDeDeskriptoren,
  ...franzoesischDeDeskriptoren,
  ...spanischDeDeskriptoren,
  ...italienischDeDeskriptoren,
  ...lateinDeDeskriptoren,
  ...religionDeDeskriptoren,
  ...psychologieDeDeskriptoren,
  ...philosophieDeDeskriptoren,
  ...mediendemokratieDeDeskriptoren,
  ...informatikkiDeDeskriptoren,
];

const STOFF_ITEMS: StoffItem[] = [
  ...englischStoffItems,
  ...deutschStoffItems,
  ...franzoesischStoffItems,
  ...spanischStoffItems,
  ...italienischStoffItems,
  ...lateinStoffItems,
  ...geschichteStoffItems,
  ...geographieStoffItems,
  ...informatikkiStoffItems,
  ...religionStoffItems,
  ...ethikStoffItems,
  ...mediendemokratieStoffItems,
  ...psychologieStoffItems,
  ...philosophieStoffItems,
  ...deutschDeStoffItems,
  ...englischDeStoffItems,
  ...geschichteDeStoffItems,
  ...geographieDeStoffItems,
  ...ethikDeStoffItems,
  ...franzoesischDeStoffItems,
  ...spanischDeStoffItems,
  ...italienischDeStoffItems,
  ...lateinDeStoffItems,
  ...religionDeStoffItems,
  ...psychologieDeStoffItems,
  ...philosophieDeStoffItems,
  ...mediendemokratieDeStoffItems,
  ...informatikkiDeStoffItems,
];

// ---------------------------------------------------------------------------
// Lookups (Signaturen unverändert gegenüber der früheren stoffkatalog.ts)
// ---------------------------------------------------------------------------

export function listStoffItems(
  fach: StoffItem['fach'],
  stufe: StoffItem['stufe'],
  rahmenwerk?: StoffItem['rahmenwerk'],
  schulstufe?: number,
): StoffItem[] {
  return STOFF_ITEMS.filter(
    (item) =>
      item.fach === fach &&
      item.stufe === stufe &&
      (rahmenwerk === undefined || item.rahmenwerk === rahmenwerk) &&
      (schulstufe === undefined
        ? true
        : item.schulstufe === schulstufe || (item.schulstufe === undefined && item.stufe === stufe)),
  );
}

export function getStoffItems(ids: string[]): StoffItem[] {
  return ids
    .map((id) => STOFF_ITEMS.find((item) => item.id === id))
    .filter((item): item is StoffItem => item !== undefined);
}

export function getDeskriptoren(ids: string[]): Deskriptor[] {
  return ids
    .map((id) => DESKRIPTOREN.find((d) => d.id === id))
    .filter((d): d is Deskriptor => d !== undefined);
}

export function getAllDeskriptoren(): Deskriptor[] {
  return [...DESKRIPTOREN];
}

export function getAllStoffItems(): StoffItem[] {
  return [...STOFF_ITEMS];
}

/** True, wenn die Quelle einen kuratierten Entwurf bezeichnet (kein offizieller Nachweis). */
export function istEntwurfsQuelle(quelle: string | undefined): boolean {
  return /entwurf/i.test(quelle ?? '');
}

/**
 * True, wenn (mind. ein) Deskriptor des Fachs (optional: der Stufe, optional:
 * des Rahmenwerks) noch ein kuratierter Entwurf ist. Steuert den
 * Entwurfs-Vermerk: voll gesourcte Fächer (z. B. Sachfächer) zeigen ihn nicht
 * mehr. Ohne Rahmenwerk-Filter würden die bewusst als Entwurf gekennzeichneten
 * de-lehrplan-Kataloge den Vermerk auch für AT-Nutzerinnen einschalten.
 */
export function fachHatEntwurf(
  fach: Deskriptor['fach'],
  stufe?: Deskriptor['stufe'],
  rahmenwerk?: Deskriptor['rahmenwerk'],
): boolean {
  return DESKRIPTOREN.some(
    (d) =>
      d.fach === fach &&
      (stufe === undefined || d.stufe === stufe) &&
      (rahmenwerk === undefined || d.rahmenwerk === rahmenwerk) &&
      istEntwurfsQuelle(d.quelle),
  );
}

/**
 * Alle Deskriptoren ("Universum") für eine Fach/Stufe(/Rahmenwerk)-Kombination.
 * Basis für die Coverage-Berechnung: fehlend = Universum − abgedeckt.
 */
export function listDeskriptoren(
  fach: Deskriptor['fach'],
  stufe: Deskriptor['stufe'],
  rahmenwerk?: Deskriptor['rahmenwerk'],
  schulstufe?: number,
): Deskriptor[] {
  return DESKRIPTOREN.filter(
    (d) =>
      d.fach === fach &&
      d.stufe === stufe &&
      (rahmenwerk === undefined || d.rahmenwerk === rahmenwerk) &&
      (schulstufe === undefined
        ? true
        : d.schulstufe === schulstufe || (d.schulstufe === undefined && d.stufe === stufe)),
  );
}
