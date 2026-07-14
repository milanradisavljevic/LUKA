import { describe, expect, it } from 'vitest';
import { bewertePrefillQuelle } from './prefillQuelle';

const textMitWoertern = (anzahl: number) =>
  Array.from({ length: anzahl }, (_, i) => `wort${i}`).join(' ');

describe('bewertePrefillQuelle', () => {
  it('meldet fehlenden oder nur aus Leerraum bestehenden Ausgangstext', () => {
    expect(bewertePrefillQuelle(undefined)).toBe('fehlt');
    expect(bewertePrefillQuelle('')).toBe('fehlt');
    expect(bewertePrefillQuelle(' \n\t ')).toBe('fehlt');
  });

  it('meldet einen vorhandenen, aber zu kurzen Ausgangstext', () => {
    expect(bewertePrefillQuelle(textMitWoertern(79))).toBe('zu_kurz');
    expect(bewertePrefillQuelle('  ein   kurzer   Text  ')).toBe('zu_kurz');
  });

  it('akzeptiert genau die Mindestlänge und längere Texte', () => {
    expect(bewertePrefillQuelle(textMitWoertern(80))).toBe('ok');
    expect(bewertePrefillQuelle(textMitWoertern(81))).toBe('ok');
  });
});
