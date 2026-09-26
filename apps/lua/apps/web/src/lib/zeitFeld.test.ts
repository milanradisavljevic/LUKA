import { describe, expect, it } from 'vitest';
import { formatiereDatumDE, istGueltigeZeit, parseDatumDE, zeitOptionen, zeitRaster } from './zeitFeld';

describe('zeitRaster', () => {
  it('deckt den ganzen Tag in 24h ab', () => {
    const raster = zeitRaster();
    expect(raster[0]).toBe('00:00');
    expect(raster[raster.length - 1]).toBe('23:55');
    expect(raster).toHaveLength(288);
  });

  it('enthält keine 12-Stunden-Notation und kein AM/PM', () => {
    expect(zeitRaster().every(z => /^([01]\d|2[0-3]):[0-5]\d$/.test(z))).toBe(true);
  });

  it('lässt sich in 15-Minuten-Schritten erzeugen', () => {
    expect(zeitRaster(15)).toHaveLength(96);
    expect(zeitRaster(15)).toContain('08:45');
  });
});

describe('zeitOptionen', () => {
  it('behält einen Wert, der nicht auf dem Raster liegt', () => {
    // 08:45 liegt nicht auf einem 5-Minuten-Raster; es darf nicht verloren gehen.
    const optionen = zeitOptionen('08:45', 15);
    expect(optionen).toContain('08:45');
    expect([...optionen].sort()).toEqual(optionen);
  });

  it('nimmt einen Wert auf dem Raster nicht doppelt auf', () => {
    const optionen = zeitOptionen('08:30', 15);
    expect(optionen.filter(z => z === '08:30')).toHaveLength(1);
  });

  it('verträgt leere und unsinnige Werte', () => {
    expect(zeitOptionen(null)).toEqual(zeitRaster());
    expect(zeitOptionen('')).toEqual(zeitRaster());
    expect(zeitOptionen('   ')).toEqual(zeitRaster());
    expect(zeitOptionen('keine Uhrzeit')).toEqual(zeitRaster());
  });
});

describe('istGueltigeZeit', () => {
  it('lässt Stunden 0 bis 23 und Minuten 0 bis 59 zu', () => {
    expect(istGueltigeZeit('00:00')).toBe(true);
    expect(istGueltigeZeit('23:59')).toBe(true);
    expect(istGueltigeZeit('8:00')).toBe(true);
  });

  it('weist Unsinn ab', () => {
    expect(istGueltigeZeit('24:00')).toBe(false);
    expect(istGueltigeZeit('12:60')).toBe(false);
    expect(istGueltigeZeit('12')).toBe(false);
    expect(istGueltigeZeit('12:30 PM')).toBe(false);
    expect(istGueltigeZeit('')).toBe(false);
  });
});

describe('parseDatumDE', () => {
  it('liest TT.MM.JJJJ', () => {
    expect(parseDatumDE('07.09.2026')).toBe('2026-09-07');
    expect(parseDatumDE('7.9.2026')).toBe('2026-09-07');
  });

  it('weist das US-Format ab', () => {
    // Genau die Schreibweise, die das native Datumsfeld geliefert hat.
    expect(parseDatumDE('09/21/2026')).toBeNull();
  });

  it('weist Tage ab, die es nicht gibt', () => {
    expect(parseDatumDE('31.02.2026')).toBeNull();
    expect(parseDatumDE('31.04.2026')).toBeNull();
    expect(parseDatumDE('00.09.2026')).toBeNull();
    expect(parseDatumDE('07.13.2026')).toBeNull();
  });

  it('kennt das Schaltjahr', () => {
    expect(parseDatumDE('29.02.2028')).toBe('2028-02-29');
    expect(parseDatumDE('29.02.2027')).toBeNull();
  });

  it('weist Müll ab, ohne zu raten', () => {
    expect(parseDatumDE('')).toBeNull();
    expect(parseDatumDE('2026-09-07')).toBeNull();
    expect(parseDatumDE('7.9.26')).toBeNull();
  });
});

describe('formatiereDatumDE', () => {
  it('zeigt ISO als TT.MM.JJJJ', () => {
    expect(formatiereDatumDE('2026-09-07')).toBe('07.09.2026');
  });

  it('lässt unerwartete Werte unverändert, statt sie zu leeren', () => {
    expect(formatiereDatumDE('')).toBe('');
    expect(formatiereDatumDE(null)).toBe('');
    expect(formatiereDatumDE('offen')).toBe('offen');
  });
});
