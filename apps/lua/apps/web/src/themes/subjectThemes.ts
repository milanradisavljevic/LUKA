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

/** CSS-Custom-Properties für das Mural als Hintergrund von .app-main. */
export function getMuralVars(fach: Fach): Record<string, string> {
  const theme = getSubjectTheme(fach);
  const vars: Record<string, string> = {};
  if (theme) {
    vars['--mural-paper'] = theme.palette[0];
    vars['--mural-wash'] = theme.palette[1];
    vars['--mural-mid'] = theme.palette[2];
    vars['--mural-ink'] = theme.palette[3];
    vars['--mural-accent'] = theme.accentColor;
  }
  const asset = getMuralAsset(fach);
  if (asset) vars['--mural-image'] = `url("${asset}")`;
  return vars;
}

/** 'image' = Bild + Wash, 'wash' = nur Farb-Wash, 'off' = nichts. */
export function getMuralMode(fach: Fach, ambientEnabled: boolean): 'image' | 'wash' | 'off' {
  if (!ambientEnabled) return 'off';
  if (getMuralAsset(fach)) return 'image';
  return getSubjectTheme(fach) ? 'wash' : 'off';
}
