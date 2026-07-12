import { describe, expect, it } from 'vitest';
import { buildPdfFilename } from './usePdfExport';

describe('PDF-Dateiname', () => {
  it('bildet Datum und bereinigten Dokumenttitel ab', () => {
    expect(buildPdfFilename('2026-07-13', 'Medien & Demokratie: Einstieg')).toBe(
      '2026-07-13_Medien_Demokratie_Einstieg.pdf',
    );
  });

  it('verwendet einen sicheren Fallback bei leerem Titel', () => {
    expect(buildPdfFilename('2026-07-13', ' !!! ')).toBe('2026-07-13_LUKA_Dokument.pdf');
  });
});
