export type EinsatzStatus = 'geplant' | 'eingesetzt';
export type EinsatzArt = '' | 'verteilt' | 'gemeinsam_bearbeitet' | 'hausuebung' | 'schularbeit' | 'nur_geplant';
export type RueckblickStatus = 'offen' | 'hilfreich' | 'anpassen' | 'nicht_eingesetzt';

export interface EinsatzRueckblick {
  id: string;
  einsatzId: string;
  status: RueckblickStatus;
  notiz: string;
  erstelltAm: string;
}

export interface EinsatzRecord {
  id: string;
  materialId: string | null;
  klasseId: string | null;
  klasseNameSnapshot: string;
  titelSnapshot: string;
  status: EinsatzStatus;
  einsatzArt: EinsatzArt;
  geplantAm: string | null;
  eingesetztAm: string | null;
  lernzieleSnapshot: string;
  notiz: string;
  createdAt: string;
  updatedAt: string;
  rueckblick: EinsatzRueckblick | null;
}

export const EINSATZ_ART_LABELS: Record<EinsatzArt, string> = {
  '': 'Keine Art angegeben',
  verteilt: 'Verteilt',
  gemeinsam_bearbeitet: 'Gemeinsam bearbeitet',
  hausuebung: 'Hausübung',
  schularbeit: 'Schularbeit',
  nur_geplant: 'Nur geplant',
};

export const EINSATZ_STATUS_LABELS: Record<EinsatzStatus, string> = {
  geplant: 'Geplant',
  eingesetzt: 'Eingesetzt',
};

export const RUECKBLICK_STATUS_LABELS: Record<RueckblickStatus, string> = {
  offen: 'Offen',
  hilfreich: 'Hilfreich',
  anpassen: 'Anpassen',
  nicht_eingesetzt: 'Nicht eingesetzt',
};

export const EINSATZ_ART_OPTIONS: EinsatzArt[] = [
  'verteilt',
  'gemeinsam_bearbeitet',
  'hausuebung',
  'schularbeit',
  'nur_geplant',
];

export const RUECKBLICK_STATUS_OPTIONS: RueckblickStatus[] = [
  'offen',
  'hilfreich',
  'anpassen',
  'nicht_eingesetzt',
];

export function einsatzAnzeigeDatum(einsatz: Pick<EinsatzRecord, 'eingesetztAm' | 'geplantAm'>): string | null {
  return einsatz.eingesetztAm || einsatz.geplantAm || null;
}

export function sortEinsaetze<T extends Pick<EinsatzRecord, 'eingesetztAm' | 'geplantAm'>>(einsaetze: T[]): T[] {
  return [...einsaetze].sort((a, b) => {
    const datumA = einsatzAnzeigeDatum(a) ?? '';
    const datumB = einsatzAnzeigeDatum(b) ?? '';
    return datumB.localeCompare(datumA);
  });
}

export function formatEinsatzDatum(value: string | null | undefined): string {
  if (!value) return 'Datum offen';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-DE', { dateStyle: 'medium' });
}

export function labelEinsatzArt(value: string): string {
  return EINSATZ_ART_LABELS[value as EinsatzArt] ?? value;
}

export function labelEinsatzStatus(value: string): string {
  return EINSATZ_STATUS_LABELS[value as EinsatzStatus] ?? value;
}

export function labelRueckblickStatus(value: string): string {
  return RUECKBLICK_STATUS_LABELS[value as RueckblickStatus] ?? value;
}
