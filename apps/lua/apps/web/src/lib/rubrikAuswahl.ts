import { FACH_META, type Fach } from '@lehrunterlagen/schema';

export interface RubrikOption {
  filename: string;
  titel?: string;
  fach?: string;
  schulstufe?: string;
  textsorte?: string;
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
