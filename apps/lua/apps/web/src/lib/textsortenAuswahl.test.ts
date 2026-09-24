import { describe, expect, it } from 'vitest';
import {
  ENGLISCH_UNTERSTUFE_TEXTSORTEN,
  SRDP_DEUTSCH_TEXTSORTEN,
  SRDP_ENGLISCH_TEXTSORTEN,
  SPRACHFACH_TEXTSORTEN,
} from '@lehrunterlagen/schema';
import { istEnglischFach, istOberstufe, istWeitereSprachfach, textsortenFuer, textsortenHint } from './textsortenAuswahl';

describe('EN-Textsorten (Schema, L3)', () => {
  it('SRDP_ENGLISCH_TEXTSORTEN hat 8 Elemente', () => {
    expect(SRDP_ENGLISCH_TEXTSORTEN).toHaveLength(8);
    expect([...SRDP_ENGLISCH_TEXTSORTEN]).toEqual([
      'Article', 'Blog', 'Email', 'Essay', 'Letter', 'Proposal', 'Report', 'Review',
    ]);
  });

  it('ENGLISCH_UNTERSTUFE_TEXTSORTEN hat 6 Elemente', () => {
    expect(ENGLISCH_UNTERSTUFE_TEXTSORTEN).toHaveLength(6);
    expect([...ENGLISCH_UNTERSTUFE_TEXTSORTEN]).toEqual([
      'Email', 'Blog', 'Story', 'Description', 'Report', 'Review',
    ]);
  });

  it('Unterstufe-Liste ist eine Teilmenge der Oberstufen-Optionen (außer Story/Description)', () => {
    for (const ts of ENGLISCH_UNTERSTUFE_TEXTSORTEN) {
      if (ts === 'Story' || ts === 'Description') continue;
      expect(SRDP_ENGLISCH_TEXTSORTEN).toContain(ts);
    }
  });
});

describe('textsortenFuer', () => {
  it('englisch + oberstufe → EN-SRDP-Liste', () => {
    expect(textsortenFuer('englisch', 'oberstufe')).toEqual([...SRDP_ENGLISCH_TEXTSORTEN]);
    expect(textsortenFuer('Englisch', 'Oberstufe')).toEqual([...SRDP_ENGLISCH_TEXTSORTEN]);
  });

  it('englisch + unterstufe → EN-Unterstufen-Liste', () => {
    expect(textsortenFuer('englisch', 'unterstufe')).toEqual([...ENGLISCH_UNTERSTUFE_TEXTSORTEN]);
  });

  it('deutsch + oberstufe → SRDP-Deutsch-Liste', () => {
    expect(textsortenFuer('deutsch', 'oberstufe')).toEqual([...SRDP_DEUTSCH_TEXTSORTEN]);
  });

  it('deutsch + unterstufe → altersgerechte DE-Liste', () => {
    expect(textsortenFuer('deutsch', 'unterstufe')).toEqual([
      'Erzählung', 'Beschreibung', 'Bericht', 'Zusammenfassung', 'Kommentar', 'Leserbrief',
    ]);
  });

  it('leeres/fehlendes Fach → Deutsch-Listen (Default)', () => {
    expect(textsortenFuer('', 'oberstufe')).toEqual([...SRDP_DEUTSCH_TEXTSORTEN]);
    expect(textsortenFuer(undefined, undefined)).toHaveLength(6);
  });

  it('weitere Sprachfächer erhalten eigene Familienlisten', () => {
    expect(textsortenFuer('franzoesisch', 'unterstufe')).toEqual([...SPRACHFACH_TEXTSORTEN.franzoesisch.unterstufe]);
    expect(textsortenFuer('Spanisch', 'Oberstufe')).toEqual([...SPRACHFACH_TEXTSORTEN.spanisch.oberstufe]);
    expect(textsortenFuer('italienisch', 'unterstufe')).toEqual([...SPRACHFACH_TEXTSORTEN.italienisch.unterstufe]);
    expect(textsortenFuer('Latein', 'oberstufe')).toEqual([...SPRACHFACH_TEXTSORTEN.latein.oberstufe]);
  });
});

describe('textsortenHint', () => {
  it('unterscheidet Fach und Stufe', () => {
    expect(textsortenHint('englisch', 'oberstufe')).toContain('Englisch Oberstufe');
    expect(textsortenHint('englisch', 'unterstufe')).toContain('Englisch Unterstufe');
    expect(textsortenHint('deutsch', 'oberstufe')).toContain('SRDP');
    expect(textsortenHint('deutsch', 'unterstufe')).toContain('Unterstufe');
    expect(textsortenHint('franzoesisch', 'oberstufe')).toContain('Französisch');
    expect(textsortenHint('latein', 'oberstufe')).toContain('ohne CEFR');
  });

  it('IST-Helfer sind case-insensitive', () => {
    expect(istEnglischFach('ENGLISCH')).toBe(true);
    expect(istEnglischFach('deutsch')).toBe(false);
    expect(istOberstufe('OBERSTUFE')).toBe(true);
    expect(istWeitereSprachfach('französisch')).toBe(true);
    expect(istWeitereSprachfach('deutsch')).toBe(false);
  });
});
