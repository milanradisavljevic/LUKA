import { describe, expect, it } from 'vitest';
import { findeTextanker, LEERER_ANKER, type Textanker } from './textAnchors';

function orte(text: string, zitat: string | null | undefined): number[] {
  return findeTextanker(text, zitat).treffer.map(t => t.start);
}

describe('findeTextanker – exakte Treffer', () => {
  it('findet ein eindeutiges Zitat', () => {
    const a = findeTextanker('one two three', 'two');
    expect(a.status).toBe('eindeutig');
    expect(a.treffer).toEqual([{ start: 4, laenge: 3 }]);
  });

  it('liegt am Textanfang und am Textende korrekt', () => {
    expect(orte('Booktok ist neu', 'Booktok')).toEqual([0]);
    expect(orte('Booktok ist neu', 'neu')).toEqual([12]);
  });

  it('zählt auch überlappende Vorkommen mehrfach', () => {
    // Regression: "aaaa"/"aa" ist mehrdeutig – es wird nie still die erste Stelle genommen
    const a = findeTextanker('aaaa', 'aa');
    expect(a.status).toBe('mehrdeutig');
    expect(a.treffer.map(t => t.start)).toEqual([0, 1, 2]);
  });

  it('meldet wiederholte Zitate als mehrdeutig, nie als eindeutig', () => {
    const a = findeTextanker('one two one', 'one');
    expect(a.status).toBe('mehrdeutig');
    expect(a.treffer).toEqual([
      { start: 0, laenge: 3 },
      { start: 8, laenge: 3 },
    ]);
  });

  it('ignoriert Gross-/Kleinschreibung nicht (exakt heisst exakt)', () => {
    // "Booktok" != "booktok" -> erst der tolerante Lauf darf zuschlagen
    expect(findeTextanker('Booktok ist neu', 'booktok').status).not.toBe('eindeutig');
  });
});

describe('findeTextanker – normalisierter Lauf', () => {
  it('findet trotz abweichender Gross-/Kleinschreibung', () => {
    const a = findeTextanker('Insbesondere auf TikTok', 'insbesondere auf tiktok');
    expect(a.status).toBe('normalisiert');
    expect(orte('Insbesondere auf TikTok', 'insbesondere auf tiktok')).toEqual([0]);
  });

  it('findet trotz Mehrfach-Leerzeichen', () => {
    const a = findeTextanker('Der   Trend   gilt', 'Der Trend gilt');
    expect(a.status).toBe('normalisiert');
    expect(a.treffer).toEqual([{ start: 0, laenge: 18 }]);
  });

  it('findet trotz Zeilenumbruch innerhalb eines Absatzes', () => {
    const a = findeTextanker('Neuer Booktok\ntrend: spicy', 'Booktok trend');
    expect(a.status).toBe('normalisiert');
    expect(a.treffer).toEqual([{ start: 6, laenge: 13 }]);
    expect('Neuer Booktok\ntrend: spicy'.slice(6, 19)).toBe('Booktok\ntrend');
  });

  it('verwirft Treffer quer ueber eine Absatzgrenze', () => {
    // Zwei Umbrueche = neuer Absatz: da will die Markierung nicht springen
    expect(findeTextanker('Neuer Booktok\n\nBei diesem Trend', 'Booktok Trend').status).toBe('keiner');
  });

  it('schneidet die Markierung nicht in Absatzabstaende hinein', () => {
    const text = 'Trend gilt   als gute Werbung';
    const a = findeTextanker(text, 'Trend gilt');
    expect(a.treffer).toEqual([{ start: 0, laenge: 10 }]);
    expect(text.slice(0, 10)).toBe('Trend gilt');
  });

  it('meldet mehrdeutig, wenn der tolerante Lauf mehrfach zuschlaegt', () => {
    expect(orte('TikTok und TikTok', 'tiktok')).toEqual([0, 11]);
  });

  it('behandelt Umlaute ohne Ersetzung', () => {
    expect(findeTextanker('Übersicht', 'übersicht').treffer).toEqual([{ start: 0, laenge: 9 }]);
  });
});

describe('findeTextanker – ohne Treffer', () => {
  it('liefert den leeren Anker bei Halluzination', () => {
    const a: Textanker = findeTextanker('Booktok ist neu', 'der rote Faden');
    expect(a).toBe(LEERER_ANKER);
    expect(a.status).toBe('keiner');
    expect(a.treffer).toEqual([]);
  });

  it('liefert den leeren Anker bei leerem Text oder Zitat', () => {
    expect(findeTextanker('', 'x').status).toBe('keiner');
    expect(findeTextanker('Ein Text', '').status).toBe('keiner');
    expect(findeTextanker('Ein Text', null).status).toBe('keiner');
    expect(findeTextanker('Ein Text', undefined).status).toBe('keiner');
    expect(findeTextanker('Ein Text', '   ').status).toBe('keiner');
  });
});

describe('findeTextanker – Index-Map stimmt mit dem Originaltext', () => {
  const text = 'Der aufsteigende Trend gilt als gute Werbung für Bücher. Booktok ist neu.';

  it('schneidet jede Fundstelle aus dem Originaltext', () => {
    const a = findeTextanker(text, 'der aufsteigende trend');
    expect(a.treffer.length).toBeGreaterThan(0);
    for (const t of a.treffer) {
      const echtesStueck = text.slice(t.start, t.start + t.laenge);
      // muss zeichenweise dem Zitat entsprechen, nur ohne die Whitespace-Runen
      expect(echtesStueck.toLowerCase().split(/\s+/).join(' ')).toBe('der aufsteigende trend');
    }
  });

  it('sortiert die Fundstellen aufsteigend', () => {
    const a = findeTextanker('a b a b a', 'a');
    expect(a.treffer.map(t => t.start)).toEqual([0, 4, 8]);
  });
});
