import { describe, expect, it } from 'vitest';
import { zentriereInPane } from './paneScroll';

/** Pane beginnt bei top 100 und ist 600 hoch -> sichtbarer Bereich 112 … 688. */
const PANE = { top: 100, height: 600 };

function zentriert(zielTop: number, zielHoehe = 20, scrollTop = 0) {
  return zentriereInPane(PANE, { top: zielTop, height: zielHoehe }, scrollTop, PANE.height);
}

/** Nach dem Sprung: Liegt die Fundstelle mittig im sichtbaren Bereich?
 *  viewport = paneTop + (Inhaltsoffset - scrollTop) */
function springtMittig(zielTop: number, zielHoehe: number, scrollTop: number): boolean {
  const neu = zentriereInPane(PANE, { top: zielTop, height: zielHoehe }, scrollTop, PANE.height);
  if (neu === null) return true;
  const inhalt = scrollTop + (zielTop - PANE.top);
  const viewport = PANE.top + (inhalt - neu);
  return Math.abs(viewport + zielHoehe / 2 - (PANE.top + PANE.height / 2)) < 0.001;
}

describe('zentriereInPane – unveränderte Leseposition', () => {
  it('lässt ein vollständig sichtbares Ziel in Ruhe', () => {
    expect(zentriert(400)).toBeNull();
    expect(zentriert(120)).toBeNull();
    expect(zentriert(660)).toBeNull();
  });

  it('lässt ein Ziel exakt am Rand in Ruhe', () => {
    expect(zentriert(112)).toBeNull();
    expect(zentriert(668, 20)).toBeNull();
  });

  it('lässt die Position beim Blättern unverändert, solange das Ziel passt', () => {
    // Dasselbe Ziel, drei Scrollstände: es wird nie gerutscht
    for (const s of [0, 400, 1200]) {
      expect(zentriert(400, 20, s)).toBeNull();
    }
  });
});

describe('zentriereInPane – Sprungziel stimmt', () => {
  it('holt ein Ziel unterhalb des Sichtbereichs nach oben in den Text', () => {
    const neu = zentriert(1000);
    expect(neu).toBe(900 - 290);
    expect(springtMittig(1000, 20, 0)).toBe(true);
  });

  it('holt ein Ziel oberhalb des Sichtbereichs nach unten', () => {
    const neu = zentriert(100, 20, 900);
    expect(neu).toBe(900 + 0 - 290);
    expect(springtMittig(100, 20, 900)).toBe(true);
  });

  it('rechnet den aktuellen Scrollstand korrekt ein', () => {
    // gleiche Fundstelle, unterschiedlich weit gescrollt -> gleicher Sprungweg
    expect(zentriert(1000, 20, 0)! - 0).toBe(zentriert(1000, 20, 700)! - 700);
  });

  it('scrollt auch bei teilweise sichtbarem Ziel', () => {
    expect(zentriert(108)).not.toBeNull();
    expect(zentriert(670, 20)).not.toBeNull();
  });

  it('holt ein langes Ziel mittig, solange es in den Pane passt', () => {
    expect(springtMittig(300, 400, 0)).toBe(true);
    expect(springtMittig(300, 560, 0)).toBe(true);
  });
});

describe('zentriereInPane – Grenzfälle', () => {
  it('scrollt nie über den Anfang hinaus', () => {
    expect(zentriert(100, 20, 0)).toBe(0);
  });

  it('zeigt bei einem Ziel, das höher ist als der Pane, den Anfang', () => {
    // 800 hoch in einem 600 hohen Pane: Zentrieren würde den Schluss ausblenden
    const neu = zentriert(900, 800, 0);
    const inhalt = 0 + (900 - PANE.top);
    const viewport = PANE.top + (inhalt - neu!);
    expect(viewport).toBe(112);
    expect(viewport + 800).toBeGreaterThan(PANE.top + PANE.height);
  });

  it('rechnet einen Seitenversatz des Pane korrekt ein', () => {
    const pane = { top: 300, height: 400 };
    expect(zentriereInPane(pane, { top: 1000, height: 20 }, 0, pane.height)).toBe(700 - 190);
  });

  it('liefert in einem winzigen Pane eine Position statt zu raten', () => {
    expect(zentriereInPane({ top: 0, height: 0 }, { top: 0, height: 0 }, 0, 0)).not.toBeNull();
    expect(zentriereInPane({ top: 0, height: 10 }, { top: 500, height: 10 }, 0, 10)).not.toBeNull();
  });
});
