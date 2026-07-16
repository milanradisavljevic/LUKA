import { describe, expect, it } from 'vitest';
import { isKorrekturReady, korrekturStatusTone, type KorrekturStatus } from './korrekturStatus';

const bundled: KorrekturStatus = {
  available: true,
  mode: 'bundled',
  code: 'ready_bundled',
  label: 'Einsatzbereit — Korrektur eingebaut',
};

describe('Korrektur-Status', () => {
  it('marks bundled and Python modes as ready', () => {
    expect(isKorrekturReady(bundled)).toBe(true);
    expect(isKorrekturReady({ ...bundled, mode: 'python', code: 'ready_python' })).toBe(true);
    expect(korrekturStatusTone(bundled)).toBe('success');
  });

  it('keeps missing and unstartable modules blocked', () => {
    expect(isKorrekturReady({ ...bundled, available: false, mode: 'unavailable', code: 'sidecar_missing' })).toBe(false);
    expect(korrekturStatusTone({ ...bundled, available: false, mode: 'unavailable', code: 'sidecar_unstartable' })).toBe('error');
    expect(korrekturStatusTone(null)).toBe('pending');
  });
});
