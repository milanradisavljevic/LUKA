import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';
import { deutschDeskriptoren, deutschStoffItems } from './deutsch';
import { englischDeskriptoren, englischStoffItems } from './englisch';

// ---------------------------------------------------------------------------
// Stoffkatalog für den Kompetenz-Modus (Rahmenwerk at-lehrplan).
// Je Fach eine Datei; hier aggregiert. Neue Fächer: Datei anlegen + unten registrieren.
// Kompetenzbereiche je Fach: siehe KOMPETENZBEREICHE in @lehrunterlagen/schema.
// ---------------------------------------------------------------------------

const DESKRIPTOREN: Deskriptor[] = [
  ...englischDeskriptoren,
  ...deutschDeskriptoren,
  // + neue Fächer hier registrieren (z. B. ...franzoesischDeskriptoren)
];

const STOFF_ITEMS: StoffItem[] = [
  ...englischStoffItems,
  ...deutschStoffItems,
  // + neue Fächer hier registrieren (z. B. ...franzoesischStoffItems)
];

// ---------------------------------------------------------------------------
// Lookups (Signaturen unverändert gegenüber der früheren stoffkatalog.ts)
// ---------------------------------------------------------------------------

export function listStoffItems(
  fach: StoffItem['fach'],
  stufe: StoffItem['stufe'],
  rahmenwerk?: StoffItem['rahmenwerk'],
): StoffItem[] {
  return STOFF_ITEMS.filter(
    (item) =>
      item.fach === fach &&
      item.stufe === stufe &&
      (rahmenwerk === undefined || item.rahmenwerk === rahmenwerk),
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

/**
 * Alle Deskriptoren ("Universum") für eine Fach/Stufe(/Rahmenwerk)-Kombination.
 * Basis für die Coverage-Berechnung: fehlend = Universum − abgedeckt.
 */
export function listDeskriptoren(
  fach: Deskriptor['fach'],
  stufe: Deskriptor['stufe'],
  rahmenwerk?: Deskriptor['rahmenwerk'],
): Deskriptor[] {
  return DESKRIPTOREN.filter(
    (d) =>
      d.fach === fach &&
      d.stufe === stufe &&
      (rahmenwerk === undefined || d.rahmenwerk === rahmenwerk),
  );
}
