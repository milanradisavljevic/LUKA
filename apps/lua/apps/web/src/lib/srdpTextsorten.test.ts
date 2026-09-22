import { describe, it, expect } from 'vitest';
import { SRDP_DEUTSCH_TEXTSORTEN } from '@lehrunterlagen/schema';

describe('SRDP_DEUTSCH_TEXTSORTEN', () => {
  it('hat 8 Elemente (7 BMB + Empfehlung)', () => {
    expect(SRDP_DEUTSCH_TEXTSORTEN).toHaveLength(8);
  });

  it('enthält die 7 offiziellen BMB-Textsorten', () => {
    const bmb = [
      'Textanalyse',
      'Textinterpretation',
      'Zusammenfassung',
      'Leserbrief',
      'Kommentar',
      'Erörterung',
      'Meinungsrede',
    ];
    for (const ts of bmb) {
      expect(SRDP_DEUTSCH_TEXTSORTEN).toContain(ts);
    }
  });

  it('enthält Empfehlung als zusaetzliche Option', () => {
    expect(SRDP_DEUTSCH_TEXTSORTEN).toContain('Empfehlung');
  });

  it('enthält keine nicht-offiziellen SRDP-Textsorten ausser Empfehlung', () => {
    // Offener Brief ist NICHT in der Liste (nur im Raster als "zusaetzlich")
    expect(SRDP_DEUTSCH_TEXTSORTEN).not.toContain('Offener Brief');
  });
});
