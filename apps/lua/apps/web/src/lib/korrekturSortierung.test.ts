import { describe, expect, it } from 'vitest';
import { SORTIER_MODI, sortiereFehler, type FehlerAktion, type SortierModus } from './korrekturSortierung';

interface F {
  id: number;
  typ: string;
  vertrauensstufe: string | null;
  aktion: FehlerAktion;
  start: number | null;
}

function mk(id: number, start: number | null, typ = 'A', vertrauensstufe: string | null = 'hoch', aktion: FehlerAktion = null): F {
  return { id, typ, vertrauensstufe, aktion, start };
}

function ids(fehler: readonly F[]): number[] {
  return fehler.map(f => f.id);
}

function sortiere(liste: F[], modus: SortierModus) {
  return sortiereFehler(liste, modus, {
    startVon: id => liste.find(f => f.id === id)?.start ?? null,
    aktionVon: id => liste.find(f => f.id === id)?.aktion ?? null,
  });
}

describe('sortiereFehler – Reihenfolge im Text', () => {
  it('sortiert nach der ersten Fundstelle im Rohtext', () => {
    const r = sortiere([mk(1, 80), mk(2, 10), mk(3, 40)], 'text');
    expect(ids(r.zugeordnet)).toEqual([2, 3, 1]);
  });

  it('behält die Lesereihenfolge innerhalb gleicher Positionen', () => {
    const r = sortiere([mk(9, 10), mk(4, 10), mk(7, 10)], 'text');
    expect(ids(r.zugeordnet)).toEqual([4, 7, 9]);
  });

  it('legt Vorschläge ohne Fundstelle in die eigene Gruppe am Ende', () => {
    const r = sortiere([mk(1, null), mk(2, 50), mk(3, null)], 'text');
    expect(ids(r.zugeordnet)).toEqual([2]);
    expect(ids(r.nichtZuordenbar)).toEqual([1, 3]);
  });

  it('nummeriert ab 1, nur die im Text auffindbaren Vorschläge', () => {
    const r = sortiere([mk(1, 80), mk(2, 10), mk(3, null)], 'text');
    expect([...r.nummern]).toEqual([[2, 1], [1, 2]]);
  });
});

describe('sortiereFehler – Fehlerart', () => {
  it('folgt der fachlichen Reihenfolge R, G, Z, A statt alphabetisch', () => {
    const r = sortiere([mk(1, 0, 'A'), mk(2, 0, 'Z'), mk(3, 0, 'G'), mk(4, 0, 'R')], 'typ');
    expect(ids(r.zugeordnet)).toEqual([4, 3, 2, 1]);
  });

  it('sortiert innerhalb einer Art nach Textposition', () => {
    const r = sortiere([mk(1, 90, 'G'), mk(2, 20, 'G'), mk(3, 60, 'R')], 'typ');
    expect(ids(r.zugeordnet)).toEqual([3, 2, 1]);
  });

  it('schiebt unbekannte Fehlerarten ans Ende statt sie zu verlieren', () => {
    const r = sortiere([mk(1, 0, 'X'), mk(2, 0, 'R')], 'typ');
    expect(ids(r.zugeordnet)).toEqual([2, 1]);
  });
});

describe('sortiereFehler – Unsicherheit zuerst', () => {
  it('stellt niedrig vor mittel vor hoch', () => {
    const r = sortiere([mk(1, 0, 'A', 'hoch'), mk(2, 0, 'A', 'niedrig'), mk(3, 0, 'A', 'mittel')], 'sicherheit');
    expect(ids(r.zugeordnet)).toEqual([2, 3, 1]);
  });

  it('legt Vorschläge ohne Einstufung ans Ende', () => {
    const r = sortiere([mk(1, 0, 'A', null), mk(2, 0, 'A', 'hoch')], 'sicherheit');
    expect(ids(r.zugeordnet)).toEqual([2, 1]);
  });
});

describe('sortiereFehler – Offene zuerst', () => {
  it('stellt offene vor übernommen, geändert und verworfen', () => {
    const r = sortiere([
      mk(1, 0, 'A', 'hoch', 'verworfen'),
      mk(2, 0, 'A', 'hoch', 'uebernommen'),
      mk(3, 0, 'A', 'hoch', null),
      mk(4, 0, 'A', 'hoch', 'geaendert'),
    ], 'status');
    expect(ids(r.zugeordnet)).toEqual([3, 2, 4, 1]);
  });
});

describe('sortiereFehler – Robustheit', () => {
  it('verändert die Eingabeliste nicht', () => {
    const liste = [mk(1, 80), mk(2, 10)];
    const vorher = ids(liste);
    sortiere(liste, 'text');
    expect(ids(liste)).toEqual(vorher);
  });

  it('überlebt leere Listen', () => {
    const r = sortiere([], 'text');
    expect(r.zugeordnet).toEqual([]);
    expect(r.nichtZuordenbar).toEqual([]);
    expect(r.nummern.size).toBe(0);
  });

  it('ist für jeden Modus stabil und eindeutig', () => {
    const liste = [mk(3, 30, 'G', 'mittel', 'uebernommen'), mk(1, 10, 'R', 'niedrig'), mk(2, 20, 'A', 'hoch', 'verworfen')];
    for (const modus of ['text', 'typ', 'sicherheit', 'status'] as const) {
      const r = sortiere(liste, modus);
      expect(new Set(ids(r.zugeordnet)).size).toBe(3);
    }
  });

  it('nummeriert in jedem Modus lückenlos ab 1', () => {
    const liste = [mk(1, 10, 'R', 'hoch'), mk(2, 20, 'A', 'niedrig'), mk(3, 30, 'G', 'mittel')];
    for (const modus of ['text', 'typ', 'sicherheit', 'status'] as const) {
      const r = sortiere(liste, modus);
      expect([...r.nummern.values()].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    }
  });

  it('vergibt keine Nummer an Vorschläge ohne Fundstelle', () => {
    const r = sortiere([mk(1, 0), mk(2, null)], 'typ');
    expect(r.nummern.has(2)).toBe(false);
    expect(r.nummern.get(1)).toBe(1);
  });
});

describe('SORTIER_MODI', () => {
  it('deckt alle vier Sortierungen ab und hat eindeutige Werte', () => {
    expect(SORTIER_MODI.map(m => m.wert)).toEqual(['text', 'typ', 'sicherheit', 'status']);
    expect(new Set(SORTIER_MODI.map(m => m.wert)).size).toBe(SORTIER_MODI.length);
  });

  it('hat für jeden Modus ein Label und einen erklärenden Hinweis', () => {
    for (const modus of SORTIER_MODI) {
      expect(modus.label.length).toBeGreaterThan(3);
      expect(modus.hinweis.length).toBeGreaterThan(20);
    }
  });
});
