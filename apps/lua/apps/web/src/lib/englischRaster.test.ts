import { describe, expect, it } from 'vitest';
import { englischRasterOptionen, LEERER_ENGLISCH_ENTWURF } from './englischRaster';

describe('Englisch-Rasteroptionen', () => {
  it('erzeugt ohne ausdrückliche Bestätigung keinen Notenschlüssel', () => {
    expect(englischRasterOptionen(LEERER_ENGLISCH_ENTWURF)).toEqual({ sollWortanzahl: undefined });
    expect(englischRasterOptionen({ wortanzahl: '250', grenzen: ['90', '80', '65', '50', '0'], bestaetigt: false }))
      .toEqual({ sollWortanzahl: 250 });
  });
  it('überträgt den expliziten Schlüssel einschließlich Dezimalgrenze', () => {
    const result = englischRasterOptionen({ wortanzahl: '250', grenzen: ['90', '80', '65,5', '50', '0'], bestaetigt: true });
    expect(result.notenschluessel?.grenzen[2]).toEqual({ note: 3, abProzent: 65.5 });
    expect(result.notenschluessel?.bestaetigt).toBe(true);
  });
  it.each(['0', '10001', '2.5', 'Infinity'])('weist ungültige Wortanzahl %s ab', wortanzahl => {
    expect(() => englischRasterOptionen({ ...LEERER_ENGLISCH_ENTWURF, wortanzahl })).toThrow();
  });
  it('erlaubt ohne Wortanzahl keine Notenempfehlung', () => {
    expect(() => englischRasterOptionen({ wortanzahl: '', grenzen: ['90', '80', '65', '50', '0'], bestaetigt: true })).toThrow();
  });
  it.each([['90', '90', '65', '50', '0'], ['', '80', '65', '50', '0'], ['90', '80', '65', '50', '1']])
    ('weist unvollständige oder widersprüchliche Grenzen ab', (...grenzen) => {
      expect(() => englischRasterOptionen({ wortanzahl: '250', grenzen, bestaetigt: true })).toThrow();
    });
});
