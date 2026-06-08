import { describe, it, expect } from 'vitest';
import { baueKreuzwortgitter, baueWortgitter, type KreuzwortEintrag } from './grids.js';

const eintraege: KreuzwortEintrag[] = [
  { wort: 'HAUS', hinweis: 'Gebäude zum Wohnen' },
  { wort: 'GARTEN', hinweis: 'Grünfläche am Haus' },
  { wort: 'BAUM', hinweis: 'Pflanze mit Stamm' },
  { wort: 'TÜR', hinweis: 'Eingang' },
];

describe('baueKreuzwortgitter', () => {
  it('ist deterministisch (gleiche Eingabe → gleiches Gitter)', () => {
    const a = baueKreuzwortgitter(eintraege);
    const b = baueKreuzwortgitter(eintraege);
    expect(a).toEqual(b);
  });

  it('platziert alle (gültigen, eindeutigen) Wörter', () => {
    const g = baueKreuzwortgitter(eintraege);
    const woerter = new Set(g.platzierungen.map((p) => p.wort));
    for (const e of eintraege) expect(woerter.has(e.wort.toUpperCase())).toBe(true);
  });

  it('jede Platzierung trägt eine Nummer > 0 und einen Hinweis', () => {
    const g = baueKreuzwortgitter(eintraege);
    for (const p of g.platzierungen) {
      expect(p.nr).toBeGreaterThan(0);
      expect(p.hinweis.length).toBeGreaterThan(0);
    }
  });

  it('Buchstaben im Gitter stimmen mit den Wörtern überein', () => {
    const g = baueKreuzwortgitter(eintraege);
    for (const p of g.platzierungen) {
      for (let k = 0; k < p.wort.length; k++) {
        const r = p.zeile + (p.richtung === 'senkrecht' ? k : 0);
        const c = p.spalte + (p.richtung === 'waagrecht' ? k : 0);
        expect(g.belegung[r]?.[c]).toBe(p.wort[k]);
      }
    }
  });

  it('mindestens eine echte Kreuzung entsteht', () => {
    const g = baueKreuzwortgitter(eintraege);
    // Eine Kreuzung = eine Zelle, die zu einem waagrechten UND einem senkrechten Eintrag gehört.
    const hatWaag = g.platzierungen.some((p) => p.richtung === 'waagrecht');
    const hatSenk = g.platzierungen.some((p) => p.richtung === 'senkrecht');
    expect(hatWaag && hatSenk).toBe(true);
  });

  it('baut ein dichtes Gitter mit Mehrfachkreuzungen (nicht baumartig)', () => {
    const woerter: KreuzwortEintrag[] = [
      'PHOTOSYNTHESE', 'CHLOROPHYLL', 'SAUERSTOFF', 'ENERGIE',
      'SONNE', 'WASSER', 'BLATT', 'ZUCKER',
    ].map((wort) => ({ wort, hinweis: wort.toLowerCase() }));
    const g = baueKreuzwortgitter(woerter);

    // Kreuzungszellen zählen (Zellen, die zu mehr als einem Wort gehören).
    const cellCount = new Map<string, number>();
    for (const p of g.platzierungen) {
      for (let k = 0; k < p.wort.length; k++) {
        const r = p.zeile + (p.richtung === 'senkrecht' ? k : 0);
        const c = p.spalte + (p.richtung === 'waagrecht' ? k : 0);
        const key = `${r},${c}`;
        cellCount.set(key, (cellCount.get(key) ?? 0) + 1);
      }
    }
    // Wörter, die mindestens zweimal kreuzen (echtes Verzahnen, nicht nur angehängt).
    let mehrfach = 0;
    for (const p of g.platzierungen) {
      let cr = 0;
      for (let k = 0; k < p.wort.length; k++) {
        const r = p.zeile + (p.richtung === 'senkrecht' ? k : 0);
        const c = p.spalte + (p.richtung === 'waagrecht' ? k : 0);
        if ((cellCount.get(`${r},${c}`) ?? 0) >= 2) cr++;
      }
      if (cr >= 2) mehrfach++;
    }
    expect(mehrfach).toBeGreaterThanOrEqual(3);
  });

  it('normalisiert Wörter (Großschreibung, entfernt Nicht-Buchstaben) und Dubletten', () => {
    const g = baueKreuzwortgitter([
      { wort: 'haus', hinweis: 'a' },
      { wort: 'HAUS', hinweis: 'dublette' },
      { wort: 'ba um', hinweis: 'mit Leerzeichen' },
      { wort: 'x', hinweis: 'zu kurz' },
    ]);
    const woerter = g.platzierungen.map((p) => p.wort).sort();
    expect(woerter).toEqual(['BAUM', 'HAUS']);
  });

  it('leere Eingabe → leeres Gitter', () => {
    const g = baueKreuzwortgitter([]);
    expect(g.zeilen).toBe(0);
    expect(g.platzierungen).toHaveLength(0);
  });
});

describe('baueWortgitter', () => {
  const woerter = ['HAUS', 'GARTEN', 'BAUM', 'BLUME', 'SONNE'];

  it('ist deterministisch', () => {
    expect(baueWortgitter(woerter)).toEqual(baueWortgitter(woerter));
  });

  it('platziert alle Wörter und füllt jede Zelle mit einem Buchstaben', () => {
    const g = baueWortgitter(woerter);
    const platziert = new Set(g.platzierungen.map((p) => p.wort));
    for (const w of woerter) expect(platziert.has(w)).toBe(true);
    for (let r = 0; r < g.zeilen; r++) {
      for (let c = 0; c < g.spalten; c++) {
        expect(typeof g.belegung[r]![c]).toBe('string');
        expect(g.belegung[r]![c]!.length).toBe(1);
      }
    }
  });

  it('jede Platzierung steht buchstabengetreu im Gitter', () => {
    const g = baueWortgitter(woerter);
    const delta = { waagrecht: [0, 1], senkrecht: [1, 0], diagonal: [1, 1] } as const;
    for (const p of g.platzierungen) {
      const [dr, dc] = delta[p.richtung];
      for (let n = 0; n < p.wort.length; n++) {
        expect(g.belegung[p.zeile + dr * n]?.[p.spalte + dc * n]).toBe(p.wort[n]);
      }
    }
  });

  it('Gitter ist groß genug für das längste Wort', () => {
    const g = baueWortgitter(['AUSSERGEWOEHNLICH', 'KURZ', 'MITTEL']);
    expect(g.spalten).toBeGreaterThanOrEqual('AUSSERGEWOEHNLICH'.length);
  });

  it('normalisiert und entfernt Dubletten/zu kurze', () => {
    const g = baueWortgitter(['haus', 'HAUS', 'ba um', 'x']);
    expect(new Set(g.woerter)).toEqual(new Set(['HAUS', 'BAUM']));
  });

  it('leere Eingabe → leeres Gitter', () => {
    const g = baueWortgitter([]);
    expect(g.zeilen).toBe(0);
  });
});
