import { describe, expect, it } from 'vitest';
import {
  gruppiereNachTag, istDieseWoche, monatsRaster, monatAusAnker, naechsteStunden,
  rasterVorkommen, relativTagesueberschrift, schuljahrVorkommen, schuljahrZeitraum,
  slotsAmTag, sortiereStunden, stundenInZeitraum, tageImZeitraum, wochenRaster,
  wochenBeschriftung, zeitraumBeschriftung, zeitraumNormalisieren, zeitraumVerschieben,
  zeitSpanne, type GeplanteStunde, type KalenderRahmen, type RasterSlot,
} from './stundenMappen';
import type { FerienZeit, SchulfreiTag } from './ferien';
import { plusTage, wochenStart } from './lokalDatum';

function slot(
  id: string, wochentag: number, startZeit: string, endeZeit: string,
  klasseId: string | null = 'k-6b', klasseName = '6b', schuljahr: number | null = 2026,
): RasterSlot {
  return { id, klasseId, klasseName, wochentag, startZeit, endeZeit, bezeichnung: '', schuljahr, aktiv: true };
}

function stunde(id: string, datum: string, startZeit: string | null, anzahlMaterialien = 0, klasseName = '6b'): GeplanteStunde {
  return {
    id, klasseId: null, klasseName, datum, startZeit, endeZeit: startZeit ? '09:45' : null,
    titel: `Stunde ${id}`, status: 'geplant', einsatzArt: 'nur_geplant', rasterId: null,
    notiz: '', anzahlMaterialien,
  };
}

const MONTAG = '2026-09-07';
const FERIEN: FerienZeit[] = [
  { bezeichnung: 'Sommerferien', von: '2027-07-01', bis: '2027-09-05', region: 'Wien', schuljahr: 2026 },
];
const PAUSEN: SchulfreiTag[] = [
  { bezeichnung: 'MuT-Tag', datum: '2026-10-30', klasseName: '', notiz: '', schuljahr: 2026 },
];

function rahmen(land = 'AT', region = '9', ferien: FerienZeit[] = FERIEN, pausen: SchulfreiTag[] = PAUSEN): KalenderRahmen {
  return { land, region, ferien, pausen };
}

const RASTER: RasterSlot[] = [
  slot('r1', 1, '08:00', '08:45'),
  slot('r2', 1, '10:15', '11:45', 'k-7a', '7a'),
  slot('r3', 3, '08:00', '08:45'),
  slot('r4', 5, '13:30', '15:00', 'k-7a', '7a'),
  { ...slot('r5', 6, '09:00', '09:45'), aktiv: false },
  // Aus dem Vorjahr: darf im Schuljahr 2026/27 nicht auftauchen
  slot('alt', 2, '07:00', '07:45', 'k-8b', '8b', 2025),
];

describe('slotsAmTag – Jahresfilter', () => {
  it('liefert die aktiven Slots eines Tages nach Uhrzeit', () => {
    expect(slotsAmTag(RASTER, 1).map(s => s.id)).toEqual(['r1', 'r2']);
    expect(slotsAmTag(RASTER, 3).map(s => s.id)).toEqual(['r3']);
  });

  it('lässt inaktive Slots weg', () => {
    expect(slotsAmTag(RASTER, 6)).toEqual([]);
  });

  it('schließt Slots aus anderen Schuljahren aus', () => {
    expect(slotsAmTag(RASTER, 2, 2026).map(s => s.id)).not.toContain('alt');
    expect(slotsAmTag(RASTER, 2, 2025).map(s => s.id)).toEqual(['alt']);
  });

  it('nimmt Altbestand ohne Schuljahr immer mit', () => {
    const altbestand: RasterSlot[] = [{ ...slot('x', 2, '07:00', '07:45'), schuljahr: null }];
    expect(slotsAmTag(altbestand, 2, 2026)).toHaveLength(1);
  });
});

describe('wochenRaster', () => {
  it('erzeugt sieben Tage ab Montag', () => {
    const tage = wochenRaster(MONTAG);
    expect(tage).toHaveLength(7);
    expect(tage[0]!.datum).toBe('2026-09-07');
    expect(tage[6]!.datum).toBe('2026-09-13');
    expect(tage.map(t => t.wochentag)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('trägt Raster und konkrete Stunden getrennt in dieselbe Zelle', () => {
    const tage = wochenRaster(MONTAG, RASTER, [stunde('s1', MONTAG, '08:00')], rahmen());
    const montag = tage[0]!;
    expect(montag.slots.map(s => s.id)).toEqual(['r1', 'r2']);
    expect(montag.stunden.map(s => s.id)).toEqual(['s1']);
    expect(montag.imZeitraum).toBe(true);
  });

  it('markiert einen freien Tag an der Zelle', () => {
    const tage = wochenRaster('2026-10-26', [], [], rahmen());
    expect(tage[0]!.schulfrei?.bezeichnung).toBe('Nationalfeiertag');
    expect(tage[1]!.schulfrei).toBeNull();
  });
});

describe('monatsRaster – vollständiger Umlauf', () => {
  it('deckt jeden Monat mit sechs Wochen ab', () => {
    for (const monat of [1, 2, 4, 6, 9, 12]) {
      expect(monatsRaster(2026, monat).wochen).toHaveLength(6);
    }
  });

  it('beginnt am Montag der Woche des Ersten', () => {
    expect(monatsRaster(2026, 9).start).toBe('2026-08-31');
    expect(wochenStart('2026-09-01')).toBe('2026-08-31');
  });

  it('findet den letzten Tag des Monats korrekt', () => {
    expect(monatsRaster(2026, 2).letzterTag).toBe('2026-02-28');
    expect(monatsRaster(2024, 2).letzterTag).toBe('2024-02-29');
    expect(monatsRaster(2026, 12).letzterTag).toBe('2026-12-31');
  });

  it('enthält jeden Tag des Monats genau einmal', () => {
    const zellen = tageImZeitraum('monat', '2026-09-15', RASTER, [], rahmen());
    const imMonat = zellen.filter(z => z.imZeitraum);
    expect(imMonat).toHaveLength(30);
    expect(new Set(imMonat.map(z => z.datum)).size).toBe(30);
    expect(imMonat.every(z => z.datum.startsWith('2026-09'))).toBe(true);
  });

  it('nimmt Randtage aus dem Nachbarmonat in den Umlauf auf', () => {
    const zellen = tageImZeitraum('monat', '2026-09-15', RASTER, [], rahmen());
    expect(zellen).toHaveLength(42);
    expect(zellen.filter(z => !z.imZeitraum).length).toBe(12);
    expect(zellen.some(z => z.datum === '2026-08-31')).toBe(true);
  });

  it('liest Monat und Jahr aus dem Anker', () => {
    expect(monatAusAnker('2026-09-15')).toEqual({ jahr: 2026, monat: 9 });
  });
});

describe('zeitraumVerschieben und -Normalisieren', () => {
  it('blättert wochenweise und monatsweise', () => {
    expect(zeitraumVerschieben('woche', MONTAG, 1)).toBe('2026-09-14');
    expect(zeitraumVerschieben('woche', MONTAG, -1)).toBe('2026-08-31');
    expect(zeitraumVerschieben('monat', '2026-09-01', 1)).toBe('2026-10-01');
    expect(zeitraumVerschieben('monat', '2026-01-01', -1)).toBe('2025-12-01');
    expect(zeitraumVerschieben('monat', '2026-12-01', 1)).toBe('2027-01-01');
  });

  it('zieht den Monatsanker auf den Ersten und die Woche auf den Montag', () => {
    expect(zeitraumNormalisieren('monat', '2026-09-15')).toBe('2026-09-01');
    expect(zeitraumNormalisieren('woche', '2026-09-10')).toBe('2026-09-07');
  });

  it('beschriftet den Zeitraum passend zum Modus', () => {
    expect(zeitraumBeschriftung('woche', MONTAG)).toBe('KW 37 · 07.09.2026 – 13.09.2026');
    expect(zeitraumBeschriftung('monat', '2026-09-15')).toBe('September 2026');
  });
});

describe('stundenInZeitraum', () => {
  it('zählt nur die Termine des gewählten Zeitraums', () => {
    const zellen = tageImZeitraum('monat', '2026-09-15', RASTER, [
      stunde('drin', '2026-09-15', '08:00'),
      stunde('aussen', '2026-08-31', '08:00'),
    ], rahmen());
    expect(stundenInZeitraum(zellen)).toBe(1);
  });

  it('zeigt eine einmalige Stunde ohne Rasterzeile im Wochenbild', () => {
    // Die Vertretung: eine Stunde für einen Tag, ohne Zeile im Wochenraster.
    // Sie hat `rasterId: null` und darf deshalb nicht verschwinden.
    const zellen = tageImZeitraum('woche', MONTAG, [], [
      stunde('vertretung', MONTAG, '10:00'),
    ], rahmen());
    const montag = zellen.find(z => z.datum === MONTAG);
    expect(montag?.stunden.map(s => s.id)).toEqual(['vertretung']);
    expect(montag?.slots).toEqual([]);
  });

  it('zeigt eine einmalige Stunde auch im Monatsbild', () => {
    const zellen = tageImZeitraum('monat', '2026-09-15', [], [
      stunde('vertretung', '2026-09-17', '10:00'),
    ], rahmen());
    expect(stundenInZeitraum(zellen)).toBe(1);
  });
});

describe('rasterVorkommen – Grundlage fürs Einplanen', () => {
  it('flacht das Raster auf einzelne Tage ab', () => {
    const vorkommen = rasterVorkommen(RASTER, MONTAG, rahmen(), 2026);
    expect(vorkommen.map(v => `${v.datum} ${v.slot.startZeit}`)).toEqual([
      '2026-09-07 08:00',
      '2026-09-07 10:15',
      '2026-09-09 08:00',
      '2026-09-11 13:30',
    ]);
  });

  it('markiert Vorkommen an einem Feiertag, legt sie aber nicht still weg', () => {
    const vorkommen = rasterVorkommen([slot('r', 1, '08:00', '08:45')], '2026-10-26', rahmen());
    expect(vorkommen[0]!.schulfrei?.bezeichnung).toBe('Nationalfeiertag');
    expect(vorkommen).toHaveLength(1);
  });

  it('markiert einen schulinternen Schließtag', () => {
    const vorkommen = rasterVorkommen([slot('r', 5, '08:00', '08:45')], '2026-10-30', rahmen());
    expect(vorkommen[0]!.schulfrei?.bezeichnung).toBe('MuT-Tag');
  });

  it('lässt Schulwochen frei von Markierungen', () => {
    expect(rasterVorkommen(RASTER, MONTAG, rahmen(), 2026).every(v => v.schulfrei === null)).toBe(true);
  });
});

describe('schuljahrVorkommen – der Jahresplan', () => {
  const { von, bis } = schuljahrZeitraum(2026);

  it('läuft vom 1. September bis 31. August', () => {
    expect(von).toBe('2026-09-01');
    expect(bis).toBe('2027-08-31');
  });

  it('erzeugt für jede Schulwoche die Vorkommen des Rasters', () => {
    // 1 Slot/Tag, 35 Kalenderwochen im Schuljahr
    const vorkommen = schuljahrVorkommen([slot('r', 1, '08:00', '08:45')], von, bis, rahmen());
    const wochen = new Set(vorkommen.map(v => v.datum.slice(0, 4) + v.datum.slice(5, 7)));
    expect(vorkommen.length).toBeGreaterThan(30);
    expect(vorkommen.every(v => v.datum >= von && v.datum <= bis)).toBe(true);
  });

  it('schließt die Sommerferien aus – dort plant niemand Unterricht', () => {
    const vorkommen = schuljahrVorkommen([slot('r', 1, '08:00', '08:45')], von, bis, rahmen());
    const imSommer = vorkommen.filter(v => v.datum >= '2027-07-01' && v.datum <= '2027-09-05');
    // Der Slot existiert an jedem Montag, aber die Sommerferien sind gemerkt –
    // sie werden bewusst NICHT entfernt, nur gekennzeichnet.
    expect(imSommer.length).toBeGreaterThan(0);
    expect(imSommer.every(v => v.schulfrei?.bezeichnung === 'Sommerferien')).toBe(true);
  });

  it('kommt ohne Raster mit nichts zurück', () => {
    expect(schuljahrVorkommen([], von, bis, rahmen())).toEqual([]);
  });
});

describe('naechsteStunden', () => {
  it('liefert die nächsten n ab einem Datum', () => {
    const alle = [
      stunde('a', '2026-09-07', '08:00'),
      stunde('b', '2026-09-08', '08:00'),
      stunde('c', '2026-09-09', '08:00'),
      stunde('d', '2026-09-10', '08:00'),
    ];
    expect(naechsteStunden(alle, '2026-09-08', 3).map(s => s.id)).toEqual(['b', 'c', 'd']);
  });

  it('überspringt Tage ohne Stunde', () => {
    expect(naechsteStunden([stunde('a', '2026-09-07', '08:00'), stunde('b', '2026-10-01', '08:00')], '2026-09-08', 5).map(s => s.id)).toEqual(['b']);
  });
});

describe('sortiereStunden', () => {
  it('sortiert nach Tag und Uhrzeit, Stunden ohne Uhrzeit ans Tagesende', () => {
    const liste = sortiereStunden([
      stunde('spaet', '2026-09-07', '13:30'),
      stunde('ohne', '2026-09-07', null),
      stunde('frueh', '2026-09-07', '08:00'),
    ]);
    expect(liste.map(s => s.id)).toEqual(['frueh', 'spaet', 'ohne']);
  });

  it('verändert die Eingabeliste nicht', () => {
    const liste = [stunde('a', '2026-09-08', '08:00'), stunde('b', '2026-09-07', '08:00')];
    sortiereStunden(liste);
    expect(liste.map(s => s.id)).toEqual(['a', 'b']);
  });
});

describe('gruppiereNachTag', () => {
  it('gruppiert, sortiert und setzt den Freientag an die Gruppe', () => {
    const gruppen = gruppiereNachTag([
      stunde('a', '2026-10-30', '13:30'),
      stunde('b', '2026-10-30', '08:00'),
      stunde('c', '2026-09-08', '08:00'),
    ], rahmen(), '2026-09-07');
    expect(gruppen.map(g => g.datum)).toEqual(['2026-09-08', '2026-10-30']);
    expect(gruppen[1]!.stunden.map(s => s.id)).toEqual(['b', 'a']);
    expect(gruppen[1]!.schulfrei?.bezeichnung).toBe('MuT-Tag');
    expect(gruppen[0]!.schulfrei).toBeNull();
  });
});

describe('zeitSpanne und Beschriftungen', () => {
  it('zeigt beide Zeiten, eine oder den offenen Zustand', () => {
    expect(zeitSpanne('08:00', '08:45')).toBe('08:00–08:45');
    expect(zeitSpanne('08:00', null)).toBe('08:00');
    expect(zeitSpanne(null, '08:45')).toBe('08:45');
    expect(zeitSpanne(null, null)).toBe('Uhrzeit offen');
  });

  it('beschriftet eine Woche mit Kalenderwoche', () => {
    expect(wochenBeschriftung(MONTAG)).toBe('KW 37 · 07.09.2026 – 13.09.2026');
  });

  it('nennt relative Tage aus Sicht des übergebenen Tages', () => {
    expect(relativTagesueberschrift('2026-09-07', '2026-09-07')).toBe('Heute');
    expect(relativTagesueberschrift('2026-09-08', '2026-09-07')).toBe('Morgen');
    expect(relativTagesueberschrift('2026-09-06', '2026-09-07')).toBe('Gestern');
    expect(relativTagesueberschrift('2026-09-10', '2026-09-07')).toBe('Donnerstag, 10. September 2026');
  });

  it('erkennt die aktuelle Woche auch für einen Wochentag mitten in der Woche', () => {
    expect(istDieseWoche('2026-09-07', '2026-09-11')).toBe(true);
    expect(istDieseWoche('2026-09-14', '2026-09-11')).toBe(false);
  });
});
