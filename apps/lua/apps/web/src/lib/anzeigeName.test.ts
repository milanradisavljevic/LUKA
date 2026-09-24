import { describe, it, expect } from 'vitest';
import { anzeigeName, bereinigeDateiname } from './anzeigeName';

// Die Tests verwenden ausschließlich neutrale technische Platzhalter.
describe('anzeigeName', () => {
  it('bevorzugt vorname+nachname, wenn verknüpft', () => {
    expect(anzeigeName({ vorname: 'TokenA', nachname: 'SuffixA', dateiname: 'Neuer Booktok trend_TokenASuffixA.docx' }))
      .toBe('TokenA SuffixA');
  });

  it('nutzt nur vorname, wenn nachname fehlt', () => {
    expect(anzeigeName({ vorname: 'TokenA', nachname: null, dateiname: 'TokenA SuffixA .docx' })).toBe('TokenA');
  });

  it('fällt auf bereinigten Dateinamen zurück, wenn nicht verknüpft', () => {
    expect(anzeigeName({ vorname: null, nachname: null, dateiname: 'Neuer_Booktok_trend-SchuelerA.docx' }))
      .toBe('Neuer Booktok trend SchuelerA');
  });

  it('funktioniert ohne vorname/nachname-Felder (z. B. FehlerDetailRow)', () => {
    expect(anzeigeName({ dateiname: 'SchuelerB- deutsch schularbeit.docx' }))
      .toBe('SchuelerB deutsch schularbeit');
  });
});

describe('bereinigeDateiname', () => {
  it('entfernt bekannte Dateiendungen', () => {
    expect(bereinigeDateiname('Die neue Literatur.SchuelerC.docx')).toBe('Die neue Literatur.SchuelerC');
  });

  it('ersetzt Unterstriche/Bindestriche durch Leerzeichen', () => {
    expect(bereinigeDateiname('SchuelerD_Schularbeit_Deutsch.docx'))
      .toBe('SchuelerD Schularbeit Deutsch');
  });

  it('kollabiert Mehrfach-Leerzeichen und trimmt', () => {
    expect(bereinigeDateiname('  TokenA  SuffixA  .docx')).toBe('TokenA SuffixA');
  });

  it('gibt den Originalnamen zurück, falls nach Bereinigung nichts übrig bleibt', () => {
    expect(bereinigeDateiname('.docx')).toBe('.docx');
  });
});
