import { describe, it, expect } from 'vitest';
import {
  ENGLISCH_UNTERSTUFE_TEXTSORTEN,
  SRDP_DEUTSCH_TEXTSORTEN,
  SRDP_ENGLISCH_TEXTSORTEN,
} from '@lehrunterlagen/schema';

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

describe('SRDP_ENGLISCH_TEXTSORTEN', () => {
  it('hat 8 kuratierte Textsorten (L3)', () => {
    expect(SRDP_ENGLISCH_TEXTSORTEN).toHaveLength(8);
    expect([...SRDP_ENGLISCH_TEXTSORTEN]).toEqual([
      'Article', 'Blog', 'Email', 'Essay', 'Letter', 'Proposal', 'Report', 'Review',
    ]);
  });
});

describe('ENGLISCH_UNTERSTUFE_TEXTSORTEN', () => {
  it('hat 6 altersgerechte Textsorten (L3)', () => {
    expect(ENGLISCH_UNTERSTUFE_TEXTSORTEN).toHaveLength(6);
    expect([...ENGLISCH_UNTERSTUFE_TEXTSORTEN]).toEqual([
      'Email', 'Blog', 'Story', 'Description', 'Report', 'Review',
    ]);
  });

  it('Story und Description sind nur untererlaubt (nicht in der SRDP-Oberstufenliste)', () => {
    expect(SRDP_ENGLISCH_TEXTSORTEN).not.toContain('Story');
    expect(SRDP_ENGLISCH_TEXTSORTEN).not.toContain('Description');
  });
});
