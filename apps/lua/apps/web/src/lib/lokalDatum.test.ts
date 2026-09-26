import { describe, expect, it } from 'vitest';
import {
  datumKurz, datumLang, datumNumerisch, datumTeile, datumTeileSicher, ferienJahr,
  heuteIso, isoVonDate, istIsoDatum, istWochenende, jahrDerWoche, kalenderwoche,
  plusTage, tageZwischen, wochenStart, wochentag,
} from './lokalDatum';

/** Wie in `lokalDatum.ts` – für die Datumsbildung im Test. */
const pad2 = (n: number) => String(n).padStart(2, '0');

describe('isoVonDate – lokale statt UTC-Datum', () => {
  it('nimmt die lokalen Datumskomponenten, nicht die UTC-Werte', () => {
    // 31. Dezember 2025, 23:30 Ortszeit: in MEZ ist das 31.12., in UTC schon 2026.
    const d = new Date(2025, 11, 31, 23, 30, 0);
    expect(isoVonDate(d)).toBe('2025-12-31');
  });

  it('bildet den Mitternachtsfall korrekt ab (UTC-Fehler von toISOString)', () => {
    // Kern des Bugfixes: um 00:30 Ortszeit darf der Tag nicht zurückspringen.
    const frueh = new Date(2026, 2, 12, 0, 30, 0);
    expect(isoVonDate(frueh)).toBe('2026-03-12');
  });

  it('füllt Monat und Tag zweistellig auf', () => {
    expect(isoVonDate(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
    expect(isoVonDate(new Date(2026, 8, 9, 12))).toBe('2026-09-09');
  });
});

describe('heuteIso', () => {
  it('liefert ein gültiges ISO-Datum', () => {
    expect(istIsoDatum(heuteIso())).toBe(true);
  });

  it('liefert genau das, was isoVonDate(new Date()) liefert', () => {
    // Wenn der Mitternachtsfall eintritt, darf der Wert nicht „repariert" werden.
    expect(heuteIso()).toBe(isoVonDate(new Date()));
  });
});

describe('datumTeile – strikte Prüfung', () => {
  it('zerlegt ein gültiges Datum', () => {
    expect(datumTeile('2026-03-12')).toEqual({ jahr: 2026, monat: 3, tag: 12 });
  });

  it('lehnt ungültige Kalenderdaten ab (kein 30. Februar)', () => {
    expect(() => datumTeile('2026-02-30')).toThrow();
    expect(() => datumTeile('2025-02-29')).toThrow();
    expect(datumTeile('2024-02-29')).toEqual({ jahr: 2024, monat: 2, tag: 29 });
  });

  it('lehnt Formatfehler ab', () => {
    for (const falsch of ['', '2026-3-12', '12.03.2026', '2026/03/12', '2026-03-12T00:00']) {
      expect(() => datumTeile(falsch)).toThrow();
      expect(datumTeileSicher(falsch)).toBeNull();
      expect(istIsoDatum(falsch)).toBe(false);
    }
  });

  it('ist bei null/undefiniert tolerant', () => {
    expect(datumTeileSicher(null)).toBeNull();
    expect(datumTeileSicher(undefined)).toBeNull();
  });
});

describe('plusTage und tageZwischen', () => {
  it('rechnet über Monatsgrenzen', () => {
    expect(plusTage('2026-01-31', 1)).toBe('2026-02-01');
    expect(plusTage('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rechnet über Jahresgrenzen', () => {
    expect(plusTage('2025-12-31', 1)).toBe('2026-01-01');
    expect(plusTage('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('rechnet über die Sommerzeitumstellung hinweg ohne Sprung', () => {
    // 29.03.2026 (letzter Sonntag vor dem Wechsel) auf 30.03. und zurück
    expect(tageZwischen('2026-03-29', '2026-03-30')).toBe(1);
    expect(tageZwischen('2026-03-30', '2026-03-29')).toBe(-1);
    expect(tageZwischen('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('zählt Schalttage korrekt', () => {
    expect(tageZwischen('2024-02-28', '2024-03-01')).toBe(2);
    expect(tageZwischen('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('rechnet ein ganzes Schuljahr', () => {
    expect(tageZwischen('2026-09-01', '2027-09-01')).toBe(365);
  });
});

describe('wochentag – Montag ist 1', () => {
  it('ordnet die Wochentage ISO-konform', () => {
    expect(wochentag('2026-03-09')).toBe(1); // Montag
    expect(wochentag('2026-03-13')).toBe(5); // Freitag
    expect(wochentag('2026-03-14')).toBe(6); // Samstag
    expect(wochentag('2026-03-15')).toBe(7); // Sonntag
  });

  it('findet immer den Montag der Woche', () => {
    expect(wochenStart('2026-03-09')).toBe('2026-03-09');
    expect(wochenStart('2026-03-15')).toBe('2026-03-09'); // Sonntag -> Montag derselben Woche
    expect(wochenStart('2026-03-10')).toBe('2026-03-09');
  });

  it('lässt sieben Tage lang den Wochentag rotieren', () => {
    const start = '2026-03-09';
    const tage = Array.from({ length: 7 }, (_, i) => wochentag(plusTage(start, i)));
    expect(tage).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('erkennt Samstag und Sonntag als Wochenende', () => {
    // Samstag = 6, Sonntag = 7, weil `wochentag` Montag als 1 zählt.
    expect(istWochenende('2026-03-14')).toBe(true); // Sa
    expect(istWochenende('2026-03-15')).toBe(true); // So
    for (const tag of ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13']) {
      expect(istWochenende(tag), tag).toBe(false); // Mo–Fr
    }
  });

  it('findet in jedem Monat vier oder fünf Samstage und ebensoviele Sonntage', () => {
    const tageDesMonats = (monat: string) => {
      const letzter = new Date(Number(monat.slice(0, 4)), Number(monat.slice(5, 7)), 0).getDate();
      return Array.from({ length: letzter }, (_, i) => `${monat}-${pad2(i + 1)}`);
    };
    for (const monat of ['2026-01', '2026-02', '2026-03', '2026-09', '2026-12']) {
      const tage = tageDesMonats(monat);
      const samstage = tage.filter(d => wochentag(d as never) === 6);
      const sonntage = tage.filter(d => wochentag(d as never) === 7);
      // Acht ist die Regel, neun die Ausnahme (Monate mit fünf Samstagen).
      expect(samstage.length, `${monat} Samstage`).toBeGreaterThanOrEqual(4);
      expect(samstage.length, `${monat} Samstage`).toBeLessThanOrEqual(5);
      expect(sonntage.length, `${monat} Sonntage`).toBeGreaterThanOrEqual(4);
      expect(sonntage.length, `${monat} Sonntage`).toBeLessThanOrEqual(5);
      // Und `istWochenende` findet genau diese Tage – nichts darüber hinaus.
      expect(tage.filter(istWochenende).length, monat).toBe(samstage.length + sonntage.length);
    }
  });

  it('kennt den Januar 2026 mit fünf Samstagen', () => {
    // 01.01.2026 ist ein Donnerstag, deshalb liegt der 31. auf einem Samstag.
    expect(wochentag('2026-01-03')).toBe(6);
    expect(wochentag('2026-01-31')).toBe(6);
    expect(wochentag('2026-02-01')).toBe(7);
  });
});

describe('kalenderwoche – Definition über den ersten Donnerstag', () => {
  it('gibt die 1. Jänner Woche 1, wenn dort ein Donnerstag liegt', () => {
    // 2026-01-01 ist ein Donnerstag
    expect(kalenderwoche('2026-01-01')).toBe(1);
    expect(jahrDerWoche('2026-01-01')).toBe(2026);
  });

  it('gibt bei Montag, Dienstag oder Mittwoch als 1. Jänner Woche 1 des neuen Jahres', () => {
    // Die Woche enthält dann den ersten Donnerstag des neuen Jahres.
    // 2029-01-01 = Montag, 2030-01-01 = Dienstag, 2031-01-01 = Mittwoch
    for (const jahr of [2029, 2030, 2031]) {
      const iso = `${jahr}-01-01`;
      expect([1, 2, 3]).toContain(wochentag(iso));
      expect(kalenderwoche(iso)).toBe(1);
      expect(jahrDerWoche(iso)).toBe(jahr);
    }
  });

  it('gibt bei Freitag, Samstag oder Sonntag als 1. Jänner die letzte Vorwoche', () => {
    // Die Woche enthält keinen Donnerstag des neuen Jahres -> Vorjahr.
    // 2027-01-01 = Freitag, 2028-01-01 = Samstag, 2023-01-01 = Sonntag
    expect(kalenderwoche('2027-01-01')).toBe(53);
    expect(jahrDerWoche('2027-01-01')).toBe(2026);
    expect(jahrDerWoche('2028-01-01')).toBe(2027);
    expect(kalenderwoche('2023-01-01')).toBe(52);
    expect(jahrDerWoche('2023-01-01')).toBe(2022);
  });

  it('hält die ganze Woche in derselben Nummer', () => {
    for (let i = 0; i < 7; i++) {
      expect(kalenderwoche(plusTage('2026-09-07', i))).toBe(kalenderwoche('2026-09-07'));
    }
  });

  it('lässt die Woche am Jahreswechsel nicht springen', () => {
    // Die Woche 01.01.2027 (Freitag) und 28.12.2026 gehören zusammen.
    const kW27 = kalenderwoche('2026-12-28');
    expect(kalenderwoche('2027-01-01')).toBe(kW27);
    expect(kalenderwoche('2027-01-03')).toBe(kW27);
    expect(jahrDerWoche('2026-12-28')).toBe(2026);
  });
});

describe('Formatierung', () => {
  it('kurz: Wochentag und Tag.Monat', () => {
    expect(datumKurz('2026-03-12')).toBe('Do, 12.03.');
  });

  it('numerisch mit Punkt', () => {
    expect(datumNumerisch('2026-03-05')).toBe('05.03.2026');
  });

  it('lang mit ausgeschriebenem Monat', () => {
    expect(datumLang('2026-03-12')).toBe('Donnerstag, 12. März 2026');
  });

  it('verwendet österreichische Monatsnamen', () => {
    expect(datumLang('2026-01-05')).toContain('Jänner');
    expect(datumLang('2026-10-05')).toContain('Oktober');
  });
});

describe('ferienJahr', () => {
  it('ist das Kalenderjahr des Datums', () => {
    expect(ferienJahr('2026-01-02')).toBe(2026);
    expect(ferienJahr('2026-12-24')).toBe(2026);
  });
});
