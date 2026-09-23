import { describe, it, expect } from 'vitest';
import { blockToRequest } from './useGenerate';
import type { Block } from '@lehrunterlagen/schema';

const base = { id: 'b1', punkte: 4, quelleId: 'q1', hinweis: undefined } as const;

describe('blockToRequest — fehlerkorrektur anzahlSaetze', () => {
  it('KI-Modus: config.anzahlSaetze erreicht den Request (nicht saetze.length)', () => {
    const block = {
      ...base,
      typ: 'fehlerkorrektur',
      config: {
        eingabemodus: 'ki',
        anzahlSaetze: 6,
        saetze: [],
      },
    } as unknown as Block;
    const req = blockToRequest(block);
    expect(req).toMatchObject({ typ: 'fehlerkorrektur', anzahlSaetze: 6 });
    expect((req as { saetze?: unknown[] }).saetze).toBeUndefined();
  });

  it('KI-Modus ohne anzahlSaetze faellt auf saetze.length zurueck', () => {
    const block = {
      ...base,
      typ: 'fehlerkorrektur',
      config: {
        eingabemodus: 'ki',
        saetze: [
          { nr: 1, satz: 'A.', anzahlFehler: 1 },
          { nr: 2, satz: 'B.', anzahlFehler: 1 },
        ],
      },
    } as unknown as Block;
    expect(blockToRequest(block)).toMatchObject({ anzahlSaetze: 2 });
  });

  it('Manuell-Modus: gefuellte Saetze werden unveraendert uebernommen', () => {
    const block = {
      ...base,
      typ: 'fehlerkorrektur',
      config: {
        eingabemodus: 'manuell',
        anzahlSaetze: 3,
        saetze: [
          { nr: 1, satz: 'Falsch geschrieben.', anzahlFehler: 1 },
          { nr: 2, satz: '', anzahlFehler: 1 },
        ],
      },
    } as unknown as Block;
    const req = blockToRequest(block) as { anzahlSaetze: number; saetze?: { satz: string }[] };
    expect(req.anzahlSaetze).toBe(3);
    expect(req.saetze).toHaveLength(1);
    expect(req.saetze![0]!.satz).toBe('Falsch geschrieben.');
  });

  it('anzahlSaetze wird auf mindestens 1 begrenzt', () => {
    const block = {
      ...base,
      typ: 'fehlerkorrektur',
      config: { eingabemodus: 'ki', anzahlSaetze: 0, saetze: [] },
    } as unknown as Block;
    expect(blockToRequest(block)).toMatchObject({ anzahlSaetze: 1 });
  });
});
