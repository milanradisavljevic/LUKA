/** Datum ohne Uhrzeit: `YYYY-MM-DD` — die Form, die auch in der DB steht.
 *
 *  Wichtig: `new Date().toISOString().slice(0,10)` liefert den **UTC**-Tag. In
 *  Österreich (MEZ/MESZ) ist das zwischen 00:00 und 02:00 Ortszeit einen Tag zu
 *  früh. Für eine App, die nach *Tagen* plant — „welche Stunde steht morgen an",
 *  „welche Woche plane ich" — ist das kein Detail, sondern ein sichtbarer Bug.
 *  Diese Helfer rechnen ausschließlich mit den lokalen Datumskomponenten. */
export type IsoDatum = string;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Aus einem `Date` den lokalen Kalendertag als `YYYY-MM-DD`. */
export function isoVonDate(d: Date): IsoDatum {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Heute als lokaler `YYYY-MM-DD`. */
export function heuteIso(): IsoDatum {
  return isoVonDate(new Date());
}

/** Zerlegt `YYYY-MM-DD` in Zahlen. Wirft bei ungültiger Eingabe. */
export function datumTeile(iso: IsoDatum): { jahr: number; monat: number; tag: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Ungültiges Datum: ${iso}`);
  const jahr = Number(m[1]);
  const monat = Number(m[2]);
  const tag = Number(m[3]);
  const probe = new Date(jahr, monat - 1, tag);
  // Fängt 2026-02-30 und ähnliches ab, was `new Date` stillschweigend rüberrechnet.
  if (probe.getFullYear() !== jahr || probe.getMonth() !== monat - 1 || probe.getDate() !== tag) {
    throw new Error(`Ungültiges Datum: ${iso}`);
  }
  return { jahr, monat, tag };
}

export function istIsoDatum(wert: unknown): wert is IsoDatum {
  if (typeof wert !== 'string') return false;
  try { datumTeile(wert); return true; } catch { return false; }
}

/** Wie `datumTeile`, aber liefert `null` statt zu werfen. */
export function datumTeileSicher(iso: string | null | undefined): { jahr: number; monat: number; tag: number } | null {
  if (!iso) return null;
  try { return datumTeile(iso); } catch { return null; }
}

/** `Date` in lokaler Mitternacht des angegebenen Tages — die Basis jeder
 *  Tagesrechnung. Mittagszeit als Anker, damit die Sommer-/Winterzeitumstellung
 *  keinen Sprung in der Differenz auslöst. */
export function dateVonIso(iso: IsoDatum): Date {
  const { jahr, monat, tag } = datumTeile(iso);
  return new Date(jahr, monat - 1, tag, 12, 0, 0, 0);
}

/** Verschiebt ein Datum um `tage` Tage. Monats- und Jahreswechsel sind egal. */
export function plusTage(iso: IsoDatum, tage: number): IsoDatum {
  const d = dateVonIso(iso);
  d.setDate(d.getDate() + tage);
  return isoVonDate(d);
}

/** Differenz in ganzen Tagen zwischen zwei ISO-Daten (b - a). */
export function tageZwischen(a: IsoDatum, b: IsoDatum): number {
  const ms = dateVonIso(b).getTime() - dateVonIso(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Wochentag 1..7 mit **Montag als 1** (wie `Date.getDay()` + Umrechnung). */
export function wochentag(iso: IsoDatum): number {
  const js = dateVonIso(iso).getDay(); // 0 = Sonntag
  return js === 0 ? 7 : js;
}

/** Montag der Woche, in der `iso` liegt. */
export function wochenStart(iso: IsoDatum): IsoDatum {
  return plusTage(iso, -(wochentag(iso) - 1));
}

/**
 * Samstag oder Sonntag? Für alles, was ein Schulwochenraster als „kein
 * Unterrichtstag" zeigt. `wochentag` liefert Montag = 1, also Samstag = 6.
 */
export function istWochenende(iso: IsoDatum): boolean {
  return wochentag(iso) >= 6;
}

export const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const WOCHENTAGE_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;
export const MONATE_LANG = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

export const HEUTE_DE = 'Heute';
export const MORGEN_DE = 'Morgen';
export const GESTERN_DE = 'Gestern';

/** „Do, 12.03." — kompakte Beschriftung für Kalenderköpfe und Listen. */
export function datumKurz(iso: IsoDatum): string {
  const { monat, tag } = datumTeile(iso);
  return `${WOCHENTAGE_KURZ[wochentag(iso) - 1]}, ${pad2(tag)}.${pad2(monat)}.`;
}

/** „Donnerstag, 12. März 2026" — für Tooltips und Fließtext. */
export function datumLang(iso: IsoDatum): string {
  const { jahr, monat, tag } = datumTeile(iso);
  return `${WOCHENTAGE_LANG[wochentag(iso) - 1]}, ${tag}. ${MONATE_LANG[monat - 1]} ${jahr}`;
}

/** „12.03.2026" — für Tabellen und Listen. */
export function datumNumerisch(iso: IsoDatum): string {
  const { jahr, monat, tag } = datumTeile(iso);
  return `${pad2(tag)}.${pad2(monat)}.${jahr}`;
}

/** ISO-Kalenderwoche nach der klassischen Regel: Woche 1 ist die Woche mit dem
 *  ersten Donnerstag des Jahres. Genau die Definition, die Österreich und
 *  Deutschland in der Schulverwaltung verwenden. */
export function kalenderwoche(iso: IsoDatum): number {
  const d = dateVonIso(iso);
  // Auf Donnerstag derselben Woche springen.
  d.setDate(d.getDate() + (4 - wochentag(iso)));
  const jahrStart = new Date(d.getFullYear(), 0, 1, 12);
  return Math.ceil((((d.getTime() - jahrStart.getTime()) / 86_400_000) + 1) / 7);
}

/** Jahreswoche der ISO-Kalenderwoche. 1. Jänner kann KW 52/53 des Vorjahres sein. */
export function jahrDerWoche(iso: IsoDatum): number {
  const d = dateVonIso(iso);
  d.setDate(d.getDate() + (4 - wochentag(iso)));
  return d.getFullYear();
}

/** Das Jahr, für das die Schulferien gelten: Für AT liegt die Winterferienzeit
 *  im Jänner/Februar — ein Termin am 2. Jänner gehört also zum Schuljahr,
 *  das im Vorjahr begonnen hat. Wir orientieren uns am Kalenderjahr. */
export function ferienJahr(iso: IsoDatum): number {
  return datumTeile(iso).jahr;
}
