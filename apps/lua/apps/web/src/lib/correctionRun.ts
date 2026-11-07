export type ConfirmedCorrectionBasis = {
  version: 1; pruefumfang: 'sprache' | 'vollstaendig'; aufgabenstellung: string;
  ausgangstext: string; rubrik_inhalt: string; erwartungshorizont: string;
  umfangsvorgabe: string; quellenstatus: string; bestaetigung_hash?: string;
};

export function confirmedBasisHashInput(b: ConfirmedCorrectionBasis): string {
  return JSON.stringify([b.aufgabenstellung,b.ausgangstext,b.rubrik_inhalt,b.erwartungshorizont,b.umfangsvorgabe,b.quellenstatus]);
}

export type CorrectionRunBasis = Readonly<{
  grundlage?: ConfirmedCorrectionBasis;
  klasse: string;
  aufgabe: string;
  rubrik: string;
  ausgangstext: string;
  unterrichtseinsatzId: string | null;
  materialId: string | null;
  rubrikInhalt?: string;
  ausgangstextHash?: string;
  rubrikHash?: string;
}>;

export async function correctionTextHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function correctionRunContextKey(context: string, run: CorrectionRunSnapshot): string {
  return JSON.stringify([context, run.provider, run.model, run.reasoning, run.basis]);
}

export type CorrectionRunSnapshot = Readonly<{
  provider: string;
  model: string;
  reasoning?: string;
  reanalyzeExisting: boolean;
  privacyMode: 'pseudonymisiert' | 'nicht_pseudonymisiert';
  startedAt: string;
  basis: CorrectionRunBasis;
}>;

export function createCorrectionRunSnapshot(input: {
  provider: string;
  model: string;
  reasoning?: string;
  reanalyzeExisting?: boolean;
  pseudonymization: boolean;
  basis: CorrectionRunBasis;
  startedAt?: string;
}): CorrectionRunSnapshot {
  const basis = Object.freeze({ ...input.basis, ...(input.basis.grundlage ? {grundlage: Object.freeze({...input.basis.grundlage})} : {}) });
  return Object.freeze({
    provider: input.provider,
    model: input.model,
    reasoning: input.reasoning,
    reanalyzeExisting: input.reanalyzeExisting ?? false,
    privacyMode: input.pseudonymization ? 'pseudonymisiert' : 'nicht_pseudonymisiert',
    startedAt: input.startedAt ?? new Date().toISOString(),
    basis,
  });
}

export function shouldShowCorrectionRunError(step: number): boolean {
  return step === 5;
}
