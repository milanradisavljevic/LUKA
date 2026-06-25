import { describe, it, expect } from 'vitest';
import type { Deskriptor, StoffItem } from '@lehrunterlagen/schema';
import { computeCoverageFrom, computeCoverage } from './coverage';
import { getAllDeskriptoren, getAllStoffItems } from './stoffkatalog';

// ---------------------------------------------------------------------------
// Fixtures (entkoppelt vom echten Stoffkatalog) — fixierte Erwartungswerte.
// ---------------------------------------------------------------------------

const D = (id: string): Deskriptor => ({
  id, rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe',
  bereich: 'Grammatik', code: '', text: `Deskriptor ${id}`, quelle: '',
});

const universum = [D('d1'), D('d2'), D('d3'), D('d4')];

const items: StoffItem[] = [
  { id: 'i1', rahmenwerk: 'at-lehrplan', titel: 'Item 1', fach: 'englisch', stufe: 'oberstufe',
    kategorie: 'grammatik', deskriptorIds: ['d1', 'd2'], defaultAufgabentypen: [] },
  { id: 'i2', rahmenwerk: 'at-lehrplan', titel: 'Item 2', fach: 'englisch', stufe: 'oberstufe',
    kategorie: 'grammatik', deskriptorIds: ['d2', 'd3'], defaultAufgabentypen: [] },
];

describe('computeCoverageFrom — Mengenlogik', () => {
  it('abgedeckt = Vereinigung der deskriptorIds gewählter Items, fehlend = Rest', () => {
    const res = computeCoverageFrom(['i1'], items, universum);
    expect(res.abgedeckt.map((d) => d.id)).toEqual(['d1', 'd2']);
    expect(res.fehlend.map((d) => d.id)).toEqual(['d3', 'd4']);
  });

  it('vereinigt über mehrere Items ohne Dubletten', () => {
    const res = computeCoverageFrom(['i1', 'i2'], items, universum);
    expect(res.abgedeckt.map((d) => d.id)).toEqual(['d1', 'd2', 'd3']); // d2 nur einmal
    expect(res.fehlend.map((d) => d.id)).toEqual(['d4']);
  });

  it('leere Auswahl → nichts abgedeckt, ganzes Universum fehlend', () => {
    const res = computeCoverageFrom([], items, universum);
    expect(res.abgedeckt).toHaveLength(0);
    expect(res.fehlend.map((d) => d.id)).toEqual(['d1', 'd2', 'd3', 'd4']);
  });

  it('errt SICHER: deskriptorId außerhalb des Universums wird NICHT als abgedeckt gezählt', () => {
    const fremd: StoffItem = { ...items[0]!, id: 'iX', deskriptorIds: ['d1', 'fremd-999'] };
    const res = computeCoverageFrom(['iX'], [fremd], universum);
    // 'fremd-999' liegt nicht im Universum → keine falsche Abdeckungs-Behauptung.
    expect(res.abgedeckt.map((d) => d.id)).toEqual(['d1']);
    expect(res.fehlend.map((d) => d.id)).toEqual(['d2', 'd3', 'd4']);
  });

  it('unbekannte StoffItem-id wird ignoriert (kein Crash)', () => {
    const res = computeCoverageFrom(['gibtsnicht'], items, universum);
    expect(res.abgedeckt).toHaveLength(0);
    expect(res.items).toHaveLength(0);
  });

  it('items-Aufschlüsselung listet je Item die Universums-Deskriptoren', () => {
    const res = computeCoverageFrom(['i2'], items, universum);
    expect(res.items).toEqual([
      { id: 'i2', titel: 'Item 2', deskriptoren: [universum[1], universum[2]] },
    ]);
  });
});

describe('computeCoverage — App-Variante gegen echten Stoffkatalog', () => {
  it('liefert konsistente Mengen (abgedeckt ⊆ Universum, kein Überlapp)', () => {
    const res = computeCoverage({
      fach: 'englisch', stufe: 'oberstufe', rahmenwerk: 'at-lehrplan',
      stoffItemIds: ['en-h-ren-ob'],
    });
    const abIds = new Set(res.abgedeckt.map((d) => d.id));
    expect(res.abgedeckt.length).toBeGreaterThan(0);
    for (const d of res.fehlend) expect(abIds.has(d.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// KRITISCH (C-Guard): referentielle Integrität des Stoffkatalogs.
// Toter deskriptorId oder doppelte id verschluckt Coverage still.
// ---------------------------------------------------------------------------

describe('Stoffkatalog — Integrität', () => {
  const deskriptoren = getAllDeskriptoren();
  const stoffItems = getAllStoffItems();
  const deskriptorIds = new Set(deskriptoren.map((d) => d.id));

  it('kein dangling deskriptorId in StoffItems', () => {
    for (const item of stoffItems) {
      for (const did of item.deskriptorIds) {
        expect(deskriptorIds.has(did), `StoffItem '${item.id}' verweist auf unbekannten Deskriptor '${did}'`).toBe(true);
      }
    }
  });

  it('keine doppelten Deskriptor-ids', () => {
    expect(deskriptorIds.size).toBe(deskriptoren.length);
  });

  it('keine doppelten StoffItem-ids', () => {
    const ids = new Set(stoffItems.map((i) => i.id));
    expect(ids.size).toBe(stoffItems.length);
  });

  it('jeder verwendete Deskriptor liegt in Fach/Stufe seines Items (sonst Coverage-Unterzählung)', () => {
    const byId = new Map(deskriptoren.map((d) => [d.id, d]));
    for (const item of stoffItems) {
      for (const did of item.deskriptorIds) {
        const d = byId.get(did);
        if (!d) continue;
        expect(d.fach, `Item '${item.id}': Deskriptor '${did}' hat anderes Fach`).toBe(item.fach);
        expect(d.stufe, `Item '${item.id}': Deskriptor '${did}' hat andere Stufe`).toBe(item.stufe);
      }
    }
  });
});
