import type { Fach } from '@lehrunterlagen/schema';
import philosophieMural from '../assets/murals/philosophie.png';
import rawThemes from './subjectThemes.json';

export interface SubjectTheme {
  id: string;
  displayName: string;
  /** [paper, wash, mid, ink] — warm→dunkel; treibt den Farb-Wash auch ohne Bild. */
  palette: [string, string, string, string];
  accentColor: string;
}

/**
 * Komposit-Mural je Fach: EIN fertiges Bild pro Fach (kein Ebenen-Schnitt).
 * Das Bild ist als breite Komposition mit Motiven an den Rändern und freier
 * Mitte gedacht; CSS federt die Ränder aus und hält die Mitte lesbar.
 *
 * Fächer OHNE Eintrag zeigen nur den sanften Farb-Wash aus `palette`
 * (= das „allgemeine" Mural). Neues Fach-Bild ergänzen = ein Import + ein
 * Eintrag hier; sonst nichts.
 */
export const muralAssets: Partial<Record<Fach, string>> = {
  philosophie: philosophieMural,
};

export const subjectThemes = rawThemes as SubjectTheme[];

export function getSubjectTheme(fach: Fach): SubjectTheme | null {
  return subjectThemes.find((theme) => theme.id === fach) ?? null;
}

export function getMuralAsset(fach: Fach): string | null {
  return muralAssets[fach] ?? null;
}
