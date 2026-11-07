import { describe, expect, it } from 'vitest';
import { correctionSubmissionBlocker, isSubmissionReady } from './correctionSubmission';

const ready = { visionModus: false, visionFaehig: true };
const scan = { visionModus: true, visionFaehig: true };
const input = { files: ['synthetic.pdf'], checks: { 'synthetic.pdf': scan }, readingScan: false, reviewingScan: false, checkingFiles: false };

describe('Freigabe der Korrektur-Abgaben', () => {
  it('kennzeichnet einen lesbaren, unbestaetigten Scan nicht als bereit', () => {
    expect(isSubmissionReady(scan)).toBe(false);
    expect(correctionSubmissionBlocker(input)).toContain('Geprüfte Abschrift verwenden');
  });
  it('gibt die Korrektur erst nach der Uebernahme der Abschrift frei', () => {
    expect(correctionSubmissionBlocker({ ...input, reviewingScan: true })).not.toBeNull();
    const confirmed = { ...input, checks: { 'synthetic.pdf': ready } };
    expect(isSubmissionReady(ready)).toBe(true);
    expect(correctionSubmissionBlocker(confirmed)).toBeNull();
  });
  it('blockiert eine noch offene neue Abschrift auch bei zuvor bestaetigtem Text', () => {
    expect(correctionSubmissionBlocker({ ...input, checks: { 'synthetic.pdf': ready }, reviewingScan: true }))
      .toContain('noch nicht bestätigt');
  });
  it('gibt einen gemischten Stapel erst frei, wenn alle Abschriften bestaetigt sind', () => {
    const mixed = { ...input, files: ['synthetic.pdf', 'synthetic.txt'], checks: { 'synthetic.pdf': scan, 'synthetic.txt': ready } };
    expect(mixed.files.filter(file => isSubmissionReady(mixed.checks[file as keyof typeof mixed.checks]))).toHaveLength(1);
    expect(correctionSubmissionBlocker(mixed)).not.toBeNull();
    expect(correctionSubmissionBlocker({ ...mixed, checks: { 'synthetic.pdf': ready, 'synthetic.txt': ready } })).toBeNull();
  });
  it('verlangt fuer rohe Scans eine Abschrift, auch bei einem reinen Text-Korrekturmodell', () => {
    expect(correctionSubmissionBlocker({ ...input, checks: { 'synthetic.pdf': { visionModus: true, visionFaehig: false } } }))
      .toContain('Abschrift');
  });
  it('laesst fehlende oder noch laufende Dateipruefungen gesperrt', () => {
    expect(isSubmissionReady(null)).toBe(false);
    expect(correctionSubmissionBlocker({ ...input, checks: {} })).not.toBeNull();
    expect(correctionSubmissionBlocker({ ...input, checkingFiles: true })).not.toBeNull();
    expect(correctionSubmissionBlocker({ ...input, readingScan: true })).not.toBeNull();
    expect(correctionSubmissionBlocker({ ...input, files: [] })).not.toBeNull();
  });
});
