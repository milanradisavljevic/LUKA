export type Vertrauensstufe = 'hoch' | 'mittel' | 'niedrig';

export const VERTRAUENS_COLORS: Record<Vertrauensstufe, string> = {
  hoch: '#27ae60',
  mittel: '#f39c12',
  niedrig: '#e74c3c',
};

export const VERTRAUENS_LABELS: Record<Vertrauensstufe, string> = {
  hoch: 'Hohe Sicherheit',
  mittel: 'Mittlere Sicherheit',
  niedrig: 'Niedrige Sicherheit',
};

function isStufe(value: string | null | undefined): value is Vertrauensstufe {
  return value === 'hoch' || value === 'mittel' || value === 'niedrig';
}

/**
 * Aggregiert eine Liste von Vertrauensstufen zu einer Gesamtstufe.
 *
 * Majoritaetswahl: die haeufigste Stufe gewinnt. Bei Gleichstand zwischen
 * verschiedenen Stufen wird konservativ „mittel" zurueckgegeben (nie eine
 * Extremstufe bei geteilter Meinung). Leere oder stufenlose Listen → null.
 */
export function averageVertrauensstufe(
  stufen: ReadonlyArray<string | null | undefined>,
): Vertrauensstufe | null {
  const valid = stufen.filter(isStufe);
  if (valid.length === 0) return null;

  const counts: Record<Vertrauensstufe, number> = { hoch: 0, mittel: 0, niedrig: 0 };
  for (const s of valid) counts[s] += 1;

  const sorted = (Object.keys(counts) as Vertrauensstufe[])
    .map((s) => ({ s, n: counts[s] }))
    .sort((a, b) => b.n - a.n);

  const [first, second] = [sorted[0], sorted[1]];
  if (!first) return null;
  if (second && first.n === second.n) return 'mittel';
  return first.s;
}
