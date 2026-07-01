import type { Fach } from '@lehrunterlagen/schema';
import rawThemes from './subjectThemes.json';

export interface SubjectTheme {
  id: string;
  displayName: string;
  /** [paper, wash, mid, ink] — warm→dunkel; treibt den Farb-Wash auch ohne Bild. */
  palette: [string, string, string, string];
  accentColor: string;
}

export const subjectThemes = rawThemes as SubjectTheme[];

export function getSubjectTheme(fach: Fach): SubjectTheme | null {
  return subjectThemes.find((theme) => theme.id === fach) ?? null;
}

/** CSS-Custom-Properties für den Fach-Wash und die SVG-Fachzeichen. */
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
  return vars;
}

/** 'wash' = Fach-Wash + SVG-Fachzeichen, 'off' = ruhiger Standard-Hintergrund. */
export function getMuralMode(fach: Fach, ambientEnabled: boolean): 'wash' | 'off' {
  if (!ambientEnabled) return 'off';
  return getSubjectTheme(fach) ? 'wash' : 'off';
}
