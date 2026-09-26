import { describe, expect, it } from 'vitest';
import { baueFehlerSegmente, primaerStart, type FehlerEingang } from './fehlerSegmente';

/** Alle drei Zitate kommen genau einmal vor – für die Grundlagen-Fälle. */
const TEXT = 'Neuer Booktok trend. Insbesondere auf TikTok. Der aufsteigende Trend gilt.';

/** "Insbesondere auf TikTok" steht zweimal im Text. */
const WIEDERHOLT = 'Insbesondere auf TikTok. Insbesondere auf TikTok.';

function f(id: number, zitat: string | null, typ = 'A', aktion: FehlerEingang['aktion'] = null): FehlerEingang {
  return { id, zitat, typ, aktion };
}

describe('baueFehlerSegmente – Grundlagen', () => {
  it('liefert ein Segment je eindeutigem Zitat', () => {
    const e = baueFehlerSegmente(TEXT, [f(1, 'Der aufsteigende Trend gilt')]);
    expect(e.segmente).toHaveLength(1);
    expect(e.segmente[0]).toMatchObject({ fehlerId: 1, typ: 'A', aktion: null, primaer: true, mehrdeutig: false });
    expect(TEXT.slice(e.segmente[0]!.start, e.segmente[0]!.ende)).toBe('Der aufsteigende Trend gilt');
  });

  it('sortiert die Segmente aufsteigend nach Textposition', () => {
    const e = baueFehlerSegmente(TEXT, [f(2, 'Der aufsteigende Trend gilt'), f(1, 'Booktok trend')]);
    expect(e.segmente.map(s => s.fehlerId)).toEqual([1, 2]);
    expect(e.segmente[0]!.start).toBeLessThan(e.segmente[1]!.start);
  });

  it('ignoriert Fehler ohne Zitat oder ohne Fundstelle', () => {
    const e = baueFehlerSegmente(TEXT, [f(1, null), f(2, 'der rote Faden'), f(3, ''), f(4, 'Booktok trend')]);
    expect(e.segmente.map(s => s.fehlerId)).toEqual([4]);
    expect(e.ohnePlatz).toEqual([]);
  });

  it('meldet einen Vorschlag ohne Fundstelle als nicht zuordenbar, nicht als Platzverlust', () => {
    const e = baueFehlerSegmente(TEXT, [f(1, 'Booktok trend'), f(2, 'der rote Faden')]);
    expect(e.anker.get(2)!.status).toBe('keiner');
    expect(e.anker.get(2)!.treffer).toEqual([]);
    expect(e.ohnePlatz).toEqual([]);
    expect(e.nachFehler.has(2)).toBe(false);
  });

  it('reicht Typ und Aktion für die Darstellung durch', () => {
    const e = baueFehlerSegmente(TEXT, [
      f(1, 'Booktok trend', 'Z', 'verworfen'),
      f(2, 'Der aufsteigende Trend gilt', 'G', 'geaendert'),
    ]);
    expect(e.segmente.map(s => [s.fehlerId, s.typ, s.aktion])).toEqual([
      [1, 'Z', 'verworfen'],
      [2, 'G', 'geaendert'],
    ]);
  });
});

describe('baueFehlerSegmente – mehrdeutige Zitate', () => {
  it('markiert alle Fundstellen und weist sie als mehrdeutig aus', () => {
    const e = baueFehlerSegmente(WIEDERHOLT, [f(1, 'Insbesondere auf TikTok')]);
    expect(e.segmente).toHaveLength(2);
    expect(e.segmente.every(s => s.mehrdeutig)).toBe(true);
    expect(e.anker.get(1)!.status).toBe('mehrdeutig');
  });

  it('nimmt als Primärstelle die erste Fundstelle im Text', () => {
    const e = baueFehlerSegmente(WIEDERHOLT, [f(1, 'Insbesondere auf TikTok')]);
    expect(primaerStart(e, 1)).toBe(0);
    expect(e.segmente.filter(s => s.primaer)).toHaveLength(1);
  });

  it('überdeckt auch überlappende Fundstellen desselben Zitats ohne Lücke', () => {
    // "aa" in "aaaa" trifft 0, 1 und 2 – 0|2 und 2|4 ergeben zusammen die ganze Stelle
    const e = baueFehlerSegmente('aaaa', [f(1, 'aa')]);
    expect(e.segmente.map(s => [s.start, s.ende])).toEqual([[0, 2], [2, 4]]);
    expect(e.ohnePlatz).toEqual([]);
  });

  it('meldet normalisierte Treffer nicht als mehrdeutig', () => {
    const e = baueFehlerSegmente(TEXT, [f(1, 'booktok TREND')]);
    expect(e.anker.get(1)!.status).toBe('normalisiert');
    expect(e.segmente.every(s => s.mehrdeutig)).toBe(false);
  });
});

describe('baueFehlerSegmente – Überlappungen', () => {
  it('lässt bei gleicher Stelle die längere gewinnen', () => {
    const e = baueFehlerSegmente(TEXT, [f(1, 'Booktok trend'), f(2, 'Neuer Booktok trend. Insbesondere')]);
    expect(e.segmente.map(s => s.fehlerId)).toEqual([2]);
    expect(e.ohnePlatz).toEqual([1]);
  });

  it('ist bei Kollision stabil und unabhängig von der Listenreihenfolge', () => {
    const vorwaerts = baueFehlerSegmente('aaaa', [f(5, 'aa'), f(3, 'aa')]);
    const rueckwaerts = baueFehlerSegmente('aaaa', [f(3, 'aa'), f(5, 'aa')]);
    expect(vorwaerts.segmente.map(s => s.fehlerId)).toEqual(rueckwaerts.segmente.map(s => s.fehlerId));
    expect(vorwaerts.segmente.map(s => s.fehlerId)).toEqual([3, 3]);
  });

  it('vergibt zuerst die Primärstellen und füllt danach die weiteren auf', () => {
    // "Fehler" kommt zweimal vor, "Am Anfang steht" belegt eine eigene Stelle dazwischen.
    const text = 'Fehler ganz hinten. Am Anfang steht ein Fehler.';
    const e = baueFehlerSegmente(text, [f(1, 'Fehler'), f(2, 'Am Anfang steht')]);
    expect(e.nachFehler.get(1)).toHaveLength(2);
    expect(e.nachFehler.get(2)).toHaveLength(1);
    expect(e.nachFehler.get(1)!.filter(s => s.primaer)).toHaveLength(1);
    expect(e.ohnePlatz).toEqual([]);
  });

  it('meldet ehrlich, wenn ein Vorschlag seinen Platz an einen anderen verliert', () => {
    const text = 'TikTok ist neu. TikTok ist neu.';
    const e = baueFehlerSegmente(text, [f(1, 'TikTok'), f(2, 'TikTok ist neu. TikTok')]);
    expect(e.segmente.map(s => s.fehlerId)).toEqual([2]);
    expect(e.ohnePlatz).toEqual([1]);
    expect(primaerStart(e, 1)).toBeNull();
  });

  it('liefert niemals zwei Segmente mit demselben Start', () => {
    const e = baueFehlerSegmente('aaaa', [f(1, 'aa'), f(2, 'aaa'), f(3, 'a')]);
    const starts = e.segmente.map(s => s.start);
    expect(new Set(starts).size).toBe(starts.length);
  });

  it('lässt die Segmente sich nie überschneiden', () => {
    const e = baueFehlerSegmente('aaaa', [f(1, 'aa'), f(2, 'aaa'), f(3, 'a')]);
    for (let i = 1; i < e.segmente.length; i++) {
      expect(e.segmente[i]!.start).toBeGreaterThanOrEqual(e.segmente[i - 1]!.ende);
    }
  });
});

describe('baueFehlerSegmente – leere Eingaben', () => {
  it('überlebt leeren Text', () => {
    const e = baueFehlerSegmente('', [f(1, 'etwas')]);
    expect(e.segmente).toEqual([]);
    expect(e.ohnePlatz).toEqual([]);
    expect(primaerStart(e, 1)).toBeNull();
  });

  it('überlebt leere Fehlerliste', () => {
    const e = baueFehlerSegmente(TEXT, []);
    expect(e.segmente).toEqual([]);
    expect(e.anker.size).toBe(0);
  });
});

describe('primaerStart', () => {
  it('liefert null, wenn der Vorschlag keine gerenderte Stelle hat', () => {
    const e = baueFehlerSegmente('aaaa', [f(1, 'aa'), f(2, 'aa')]);
    expect(primaerStart(e, 1)).toBe(0);
    expect(primaerStart(e, 2)).toBeNull();
    expect(primaerStart(e, 99)).toBeNull();
  });
});

describe('baueFehlerSegmente – Segmentgrenzen sind exakt', () => {
  it('schneidet jedes Segment so, dass der Wortlaut im Text wieder stimmt', () => {
    const e = baueFehlerSegmente(TEXT, [f(1, 'booktok trend'), f(2, 'aufsteigende')]);
    expect(e.segmente.map(s => TEXT.slice(s.start, s.ende))).toEqual(['Booktok trend', 'aufsteigende']);
  });

  it('deckt einen mehrdeutigen Vorschlag an beiden Fundstellen exakt ab', () => {
    const e = baueFehlerSegmente(WIEDERHOLT, [f(1, 'Insbesondere auf TikTok')]);
    expect(e.segmente.map(s => WIEDERHOLT.slice(s.start, s.ende)))
      .toEqual(['Insbesondere auf TikTok', 'Insbesondere auf TikTok']);
  });
});
