// L2: Land-/Skala-Logik der Korrektur. Das Teacher-Profil kennt AT/CH/DE;
// die Korrektur unterstützt derzeit die AT-SRDP-Skala (1–5) und die deutsche
// Klassenarbeit-Skala (1–6). CH blockiert bewusst im UI, statt still falsch
// zu skalieren (Insights: kein stiller Falsch-Modus).
import type { ProfileLand } from './profile';

export type KorrekturLand = 'at' | 'de';

export function korrekturLandFuerProfil(land: ProfileLand | string | null | undefined): KorrekturLand | null {
  const l = (land ?? 'AT').toString().toLowerCase();
  if (l === 'de') return 'de';
  if (l === 'at') return 'at';
  return null;
}

/** Höchste gültige Lehrernote je Skala (AT/Default 1–5, DE 1–6). */
export function maxLehrernote(land: KorrekturLand | null): number {
  return land === 'de' ? 6 : 5;
}

export function istGueltigeLehrernote(note: number, land: KorrekturLand | null): boolean {
  if (!Number.isFinite(note)) return false;
  return note >= 1 && note <= maxLehrernote(land);
}

/** Sichtbarer Hinweis für das Fach Deutsch im deutschen Schulsystem. */
export function korrekturLandHinweis(land: KorrekturLand | null): string | null {
  return land === 'de'
    ? 'Deutsch-Korrektur im deutschen Schulsystem: Klassenarbeit · Skala 1–6.'
    : null;
}
