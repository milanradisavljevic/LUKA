import { FACH_META, type Fach } from '@lehrunterlagen/schema';

export interface RubrikOption {
  filename: string;
  titel?: string;
  fach?: string;
  schulstufe?: string;
  textsorte?: string;
  aufgabenart?: string;
  k1?: string;
  k3?: string;
}

export interface RubrikGruppe {
  fach: string;
  label: string;
  rubriken: RubrikOption[];
}

export function rubrikLabel(rubrik: RubrikOption): string {
  if (rubrik.titel?.trim()) return rubrik.titel.trim();
  return rubrik.filename
    .replace(/\.md$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function fachLabel(fach: string | undefined): string {
  const normalized = fach?.trim().toLowerCase() ?? '';
  if (!normalized) return 'Weitere Raster';
  // Bekannte Fächer aus FACH_META (14) — dieselbe Quelle wie elsewhere.
  const bekannt = FACH_META[normalized as Fach]?.label;
  if (bekannt) return bekannt;
  return normalized.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/**
 * Schulstufe lesbar. `alle` und leer heißen "für beide Stufen" — das ist
 * keine Angabe, deshalb steht dort nichts Falsches im Weg.
 */
export function stufeLabel(stufe: string | undefined): string {
  const normalized = stufe?.trim().toLowerCase() ?? '';
  if (!normalized || normalized === 'alle') return '';
  if (normalized === 'unterstufe') return 'Unterstufe';
  if (normalized === 'oberstufe') return 'Oberstufe';
  return normalized.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

/**
 * Nebenzeile unter der Auswahl: was das Raster gilt, in einer Zeile.
 * Leer, wenn das Raster für alles gilt — das ist der Normalfall bei
 * `textsorte: alle` und soll keine Füllwörter erzeugen.
 */
export function rubrikMetaZeile(rubrik: RubrikOption): string {
  const teile = [fachLabel(rubrik.fach), stufeLabel(rubrik.schulstufe)].filter(Boolean);
  return teile.join(' · ');
}

export function gruppiereRubriken(rubriken: RubrikOption[]): RubrikGruppe[] {
  const groups = new Map<string, RubrikOption[]>();
  for (const rubrik of rubriken) {
    const fach = rubrik.fach?.trim().toLowerCase() || '';
    groups.set(fach, [...(groups.get(fach) ?? []), rubrik]);
  }
  return [...groups.entries()]
    .sort(([fachA], [fachB]) => fachLabel(fachA).localeCompare(fachLabel(fachB), 'de'))
    .map(([fach, entries]) => ({
      fach,
      label: fachLabel(fach),
      rubriken: [...entries].sort((a, b) => rubrikLabel(a).localeCompare(rubrikLabel(b), 'de')),
    }));
}

/**
 * Suchschlüssel-Vergleich, tolerant gegen die Schreibweise der Umlaute.
 *
 * Die Rubrik-Dateien führen Textsorten maschinenlesbar (`leseverstaendnis`),
 * das Auswahlfeld zeigt sie lesbar (`Leseverständnis`). Ohne Normalisierung
 * findet der Vorschlag kein Raster — ä ≠ ae. Gleiche Normalisierung wie in
 * `natascha_core._key_norm`, damit beide Seiten dasselbe meinen.
 */
export function normiereSuchbegriff(wert: string | undefined | null): string {
  return (wert ?? '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

/** Passt die Rubrik-Textsorte zur gewählten Aufgabenart? */
export function rubrikPasstZurTextsorte(
  rubrik: RubrikOption,
  textsorte: string | undefined | null,
): boolean {
  const gesucht = normiereSuchbegriff(textsorte);
  if (!gesucht) return false;
  return normiereSuchbegriff(rubrik.textsorte).includes(gesucht);
}

/**
 * Misst dieses Raster Verstehen statt Schreibfähigkeit?
 *
 * Der Raster-Kopf sagt es über `aufgabenart: verstaendnis`. Das ist der
 * Unterschied, der im Korrekturauftrag vorher nur im Raster-Text stand: ohne
 * Ausgangstext prüft ein solches Raster nicht das Verständnis, sondern nur
 * die Antwort — die Notenempfehlung ist dann nicht aussagekräftig. Die
 * Oberfläche stand dagegen bei „(optional)" und deutete auf
 * Textanalyse/Textinterpretation.
 *
 * Bewusst streng: nur die ausdrückliche Deklaration zählt. Ein Raster ohne
 * `aufgabenart` verhält sich wie bisher, statt still zur Voraussetzung zu
 * werden.
 */
export function istVerstaendnisRubrik(rubrik: RubrikOption | undefined | null): boolean {
  return normiereSuchbegriff(rubrik?.aufgabenart) === 'verstaendnis';
}
