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
  if (normalized === 'deutsch') return 'Deutsch';
  if (normalized === 'englisch') return 'Englisch';
  return normalized ? normalized.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase()) : 'Weitere Raster';
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
