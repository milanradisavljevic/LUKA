import { describe, it, expect, vi } from 'vitest';

vi.mock('./storage', () => ({ loadDocuments: () => [] }));

import { baueLoopPrefill, type BaueLoopPrefillArgs, type LoopFehlerDetail } from './loopPrefill';

const detail = (zitat: string, korrektur: string, extra: Partial<LoopFehlerDetail> = {}): LoopFehlerDetail => ({
  zitat, korrektur, erklaerung: null, haeufigkeit: 1, ...extra,
});

function args(over: Partial<BaueLoopPrefillArgs> = {}): BaueLoopPrefillArgs {
  return {
    klasse: '7a',
    aufgabe: 'SA2',
    heatmap: [
      { typ: 'R', anzahl: 2 },
      { typ: 'G', anzahl: 9 },
      { typ: 'Z', anzahl: 7 },
      { typ: 'A', anzahl: 6 },
    ],
    abgaben: [],
    quelltextGet: async () => '',
    getFehlerDetail: async () => [],
    ...over,
  };
}

describe('baueLoopPrefill', () => {
  it('nimmt die Top 3 nach Anzahl, dedupliziert Aufgabenarten und stellt fehlerkorrektur vorn', async () => {
    const p = await baueLoopPrefill(args());
    expect(p?.fokusThemen).toEqual(['Grammatik', 'Zeichensetzung', 'Ausdruck']);
    expect(p?.gewuenschteAufgabenarten).toEqual(['fehlerkorrektur', 'lueckentext', 'markieraufgabe', 'stiluebung']);
    expect(p?.thema).toBe('Übung zu Fehlerschwerpunkten – 7a · SA2');
    expect(p?.loopQuelle).toEqual({ klasse: '7a', aufgabe: 'SA2' });
  });

  it('gibt null zurück, wenn keine Fehler vorhanden sind', async () => {
    expect(await baueLoopPrefill(args({ heatmap: [{ typ: 'R', anzahl: 0 }, { typ: 'G', anzahl: -1 }] }))).toBeNull();
  });

  it('nutzt bei unbekanntem Typ den rohen Code und crasht nicht', async () => {
    const p = await baueLoopPrefill(args({ heatmap: [{ typ: 'X', anzahl: 4 }] }));
    expect(p?.fokusThemen).toEqual(['X']);
    expect(p?.gewuenschteAufgabenarten).toEqual([]);
  });

  it('funktioniert ohne Aufgabe: kein Quelltext-Abruf, Thema ohne Aufgabe', async () => {
    const quelltextGet = vi.fn(async () => 'nie');
    const p = await baueLoopPrefill(args({ aufgabe: null, heatmap: [{ typ: 'Z', anzahl: 3 }], quelltextGet }));
    expect(p?.thema).toBe('Übung zu Fehlerschwerpunkten – 7a');
    expect(p?.ausgangstext).toBeUndefined();
    expect(quelltextGet).not.toHaveBeenCalled();
  });

  it('übernimmt echte Fehlerzitate, überspringt leere/identische/doppelte und begrenzt auf 12', async () => {
    const rows = [
      detail('dass Haus', 'das Haus'),
      detail('dass Haus', 'das Haus'),
      detail('', 'leer'),
      detail('gleich', 'gleich'),
      ...Array.from({ length: 20 }, (_, i) => detail(`fehler${i}`, `korr${i}`, { regelMuster: 'das/dass' })),
    ];
    const p = await baueLoopPrefill(args({ getFehlerDetail: async () => rows }));
    expect(p?.fehler).toHaveLength(12);
    expect(p?.fehler?.[0]).toMatchObject({ typ: 'G', zitat: 'dass Haus', korrektur: 'das Haus' });
    expect(p?.fehler?.filter((f) => f.zitat === 'dass Haus')).toHaveLength(1);
    expect(p?.fehler?.[1]?.regelMuster).toBe('das/dass');
  });

  it('bevorzugt den Material-Quelltext vor dem gespeicherten Quelltext der Aufgabe', async () => {
    const quelltextGet = vi.fn(async () => 'aus Aufgabe');
    const p = await baueLoopPrefill(args({
      abgaben: [{ materialId: 'm1', fach: null, schulstufe: null, textsorte: null }],
      materialQuelltext: () => 'aus Material',
      quelltextGet,
    }));
    expect(p?.ausgangstext).toBe('aus Material');
    expect(quelltextGet).not.toHaveBeenCalled();
  });

  it('nimmt Fach/Land/Schulstufe aus den Klassendaten, sonst aus den Abgaben', async () => {
    const ausKlasse = await baueLoopPrefill(args({
      klasseMeta: { fach: 'englisch', land: 'AT', stufe: 'unterstufe', schulstufe: 7 },
      abgaben: [{ materialId: null, fach: 'deutsch', schulstufe: '11', textsorte: 'Kommentar' }],
    }));
    expect(ausKlasse).toMatchObject({ fach: 'englisch', land: 'AT', stufe: 'unterstufe', schulstufe: 7, textsorte: 'Kommentar' });

    const ausAbgabe = await baueLoopPrefill(args({
      land: 'AT',
      abgaben: [{ materialId: null, fach: 'deutsch', schulstufe: '11', textsorte: null }],
    }));
    expect(ausAbgabe).toMatchObject({ fach: 'deutsch', land: 'AT', stufe: 'oberstufe', schulstufe: 11 });
  });

  it('reicht klasseId an die Fehlerabfrage weiter', async () => {
    const getFehlerDetail = vi.fn(async () => []);
    await baueLoopPrefill(args({ klasseId: 'k-2026', heatmap: [{ typ: 'Z', anzahl: 1 }], getFehlerDetail }));
    expect(getFehlerDetail).toHaveBeenCalledWith('7a', 'Z', 'SA2', 8, 'k-2026');
  });
});
