import { describe, expect, it } from 'vitest';
import { createCorrectionRunSnapshot, shouldShowCorrectionRunError } from './correctionRun';

describe('CorrectionRunSnapshot', () => {
  it('friert ausgewählten Anbieter, Modell, Datenschutz und Grundlage ein', () => {
    const snapshot = createCorrectionRunSnapshot({
      provider: 'deepseek',
      model: 'deepseek-flash',
      pseudonymization: true,
      startedAt: '2026-09-23T10:00:00.000Z',
      basis: {
        klasse: 'TEST-6A',
        aufgabe: 'Kommentar',
        rubrik: 'synthetic-rubric',
        ausgangstext: '',
        unterrichtseinsatzId: null,
        materialId: null,
      },
    });
    expect(snapshot.provider).toBe('deepseek');
    expect(snapshot.model).toBe('deepseek-flash');
    expect(snapshot.privacyMode).toBe('pseudonymisiert');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.basis)).toBe(true);
  });

  it('zeigt Analysefehler ausschließlich in Schritt 5', () => {
    expect([1, 2, 3, 4].some(shouldShowCorrectionRunError)).toBe(false);
    expect(shouldShowCorrectionRunError(5)).toBe(true);
  });
});
