import { describe, it, expect } from 'vitest';
import { korrekturLandFuerProfil, korrekturLandHinweis, istGueltigeLehrernote, maxLehrernote } from './korrekturLand';

describe('korrekturLandFuerProfil', () => {
  it('mappt AT/DE auf die Korrektur-Skala', () => {
    expect(korrekturLandFuerProfil('AT')).toBe('at');
    expect(korrekturLandFuerProfil('DE')).toBe('de');
    expect(korrekturLandFuerProfil('at')).toBe('at');
  });

  it('CH und Unbekannt → null (UI blockiert klar statt falsch zu skalieren)', () => {
    expect(korrekturLandFuerProfil('CH')).toBeNull();
    expect(korrekturLandFuerProfil('')).toBeNull();
    expect(korrekturLandFuerProfil(undefined)).toBe('at');
  });
});

describe('istGueltigeLehrernote', () => {
  it('AT: 1–5 gültig, 6 ungültig', () => {
    expect(istGueltigeLehrernote(1, 'at')).toBe(true);
    expect(istGueltigeLehrernote(5, 'at')).toBe(true);
    expect(istGueltigeLehrernote(6, 'at')).toBe(false);
    expect(istGueltigeLehrernote(0, 'at')).toBe(false);
  });

  it('DE: 1–6 gültig', () => {
    expect(istGueltigeLehrernote(6, 'de')).toBe(true);
    expect(istGueltigeLehrernote(7, 'de')).toBe(false);
  });

  it('null (z. B. CH blockiert) → AT-Bereich als Fallback', () => {
    expect(maxLehrernote(null)).toBe(5);
    expect(istGueltigeLehrernote(5, null)).toBe(true);
  });

  it('NaN/Infinity ist nie gültig', () => {
    expect(istGueltigeLehrernote(NaN, 'de')).toBe(false);
    expect(istGueltigeLehrernote(Infinity, 'de')).toBe(false);
  });
});

describe('korrekturLandHinweis', () => {
  it('trennt Fach Deutsch und Land Deutschland sichtbar', () => {
    expect(korrekturLandHinweis('de')).toBe(
      'Deutsch-Korrektur im deutschen Schulsystem: Klassenarbeit · Skala 1–6.',
    );
    expect(korrekturLandHinweis('at')).toBeNull();
  });
});
