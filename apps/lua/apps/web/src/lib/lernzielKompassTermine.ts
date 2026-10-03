import type { EinsatzRecord } from './einsatz';

export type LernzielTermin = Pick<EinsatzRecord, 'id' | 'status' | 'einsatzArt' | 'geplantAm' | 'eingesetztAm' | 'titelSnapshot'>;

export function isoDatum(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

export function ausgangsstundenOptions(lessons: LernzielTermin[], today: string): LernzielTermin[] {
  return lessons.filter((lesson) => {
    if (!['geplant', 'eingesetzt'].includes(lesson.status) || String(lesson.einsatzArt) === 'ausgefallen') return false;
    const date = isoDatum(lesson.status === 'eingesetzt' ? lesson.eingesetztAm ?? lesson.geplantAm : lesson.geplantAm);
    return !!date && (lesson.status === 'eingesetzt' || date >= today);
  }).sort((a, b) => {
    const dateA = isoDatum(a.status === 'eingesetzt' ? a.eingesetztAm ?? a.geplantAm : a.geplantAm) ?? '';
    const dateB = isoDatum(b.status === 'eingesetzt' ? b.eingesetztAm ?? b.geplantAm : b.geplantAm) ?? '';
    return dateB.localeCompare(dateA);
  });
}

export function spaetereCheckStunden(lessons: LernzielTermin[], basisDatum: string | null, today: string): LernzielTermin[] {
  const basis = isoDatum(basisDatum);
  return lessons.filter((lesson) => {
    if (lesson.status !== 'geplant' || String(lesson.einsatzArt) === 'ausgefallen') return false;
    const date = isoDatum(lesson.geplantAm);
    return !!date && date > today && (!basis || date > basis);
  }).sort((a, b) => (isoDatum(a.geplantAm) ?? '').localeCompare(isoDatum(b.geplantAm) ?? ''));
}

function plusTage(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function vorgeschlageneCheckStunde(
  lessons: LernzielTermin[], basisDatum: string | null, today: string,
): LernzielTermin | undefined {
  const basis = isoDatum(basisDatum);
  if (!basis) return undefined;
  const candidates = spaetereCheckStunden(lessons, basis, today);
  const von = plusTage(basis, 7);
  const bis = plusTage(basis, 14);
  return candidates.find((lesson) => {
    const date = isoDatum(lesson.geplantAm);
    return !!date && date >= von && date <= bis;
  });
}
