export type CorrectionRunBasis = Readonly<{
  klasse: string;
  aufgabe: string;
  rubrik: string;
  ausgangstext: string;
  unterrichtseinsatzId: string | null;
  materialId: string | null;
}>;

export type CorrectionRunSnapshot = Readonly<{
  provider: string;
  model: string;
  privacyMode: 'pseudonymisiert' | 'nicht_pseudonymisiert';
  startedAt: string;
  basis: CorrectionRunBasis;
}>;

export function createCorrectionRunSnapshot(input: {
  provider: string;
  model: string;
  pseudonymization: boolean;
  basis: CorrectionRunBasis;
  startedAt?: string;
}): CorrectionRunSnapshot {
  const basis = Object.freeze({ ...input.basis });
  return Object.freeze({
    provider: input.provider,
    model: input.model,
    privacyMode: input.pseudonymization ? 'pseudonymisiert' : 'nicht_pseudonymisiert',
    startedAt: input.startedAt ?? new Date().toISOString(),
    basis,
  });
}

export function shouldShowCorrectionRunError(step: number): boolean {
  return step === 5;
}
