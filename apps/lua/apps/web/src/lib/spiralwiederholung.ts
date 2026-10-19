import type { SavedDocument } from './types';
import { gleicheKlasse } from './stundenplanCsv';
import { parallelThema } from './parallelversion';

/**
 * Spiralwiederholung: frühere Themen derselben Klasse kurz in eine neue Übung
 * einstreuen. Grundlage sind die gespeicherten Unterlagen; es werden nur
 * Themen genommen, die mindestens `mindestTage` zurückliegen, das jüngste zuerst.
 */
export function spiralThemen(
  dokumente: SavedDocument[],
  klasse: string,
  aktuellesThema: string,
  heute: Date,
  mindestTage = 14,
  max = 2,
): string[] {
  if (!klasse.trim()) return [];
  const grenze = heute.getTime() - mindestTage * 24 * 60 * 60 * 1000;
  const aktuell = aktuellesThema.trim().toLocaleLowerCase('de');
  const themen = dokumente
    .filter((d) => !d.isDeleted && gleicheKlasse(d.snapshot.meta.klasse ?? '', klasse)
      && Date.parse(d.updatedAt) <= grenze)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    // „(Gruppe B)“ und ähnliche Zusätze gehören zum selben Thema.
    .map((d) => parallelThema(d.snapshot.meta.thema ?? '', 'keine'))
    .filter((t) => t && t.toLocaleLowerCase('de') !== aktuell
      && !/^(Wiederholung|Exit-Ticket):/.test(t));
  return [...new Set(themen)].slice(0, max);
}

/** Zusatz für die Notizen an die KI. Eingestreut wird in die vorhandenen Aufgaben. */
export function spiralNotiz(themen: string[]): string {
  if (themen.length === 0) return '';
  return `Spiralwiederholung: Baue in die vorhandenen Aufgaben ein bis zwei kurze Items zu früheren Themen der Klasse ein (${themen.join('; ')}). Das Hauptthema bleibt im Vordergrund.`;
}
