import { describe, it, expect } from 'vitest';
import type { Block } from '@lehrunterlagen/schema';
import {
  GESPIEGELTE_FELDER,
  NUR_ERGEBNIS_FELDER,
  spiegeleBlockEinstellungen,
} from './einstellungenSpiegeln';

const FRAGE_ANFORDERUNG = { nr: 1, frage: 'a', zeilen: 3 };
const FRAGE_ERGEBNIS = { nr: 1, frage: 'generiert', zeilen: 3 };

// Kein Spread eines anderen Blocks: der wuerde "typ" auf die ganze Union aufweiten und
// TS koennte die Discriminate nicht mehr pruefen.
const anforderung = (id: string, punkte: number, hinweis?: string): Block => ({
  id,
  typ: 'offeneVerstaendnisfrage',
  punkte,
  hinweis,
  quelleId: 'q1',
  arbeitsanweisung: '',
  config: { fragen: [FRAGE_ANFORDERUNG] },
  loesung: { antworten: { '1': 'b' } },
});

/** Liest die erste Frage aus einem Block, ohne durch die Block-Union zu navigieren. */
const ersteFrage = (b?: Block) =>
  (b?.config as { fragen?: Array<{ frage: string }> } | undefined)?.fragen?.[0]?.frage;

describe('einstellungenSpiegeln — was das Modell ueberhaupt bekommt', () => {
  it('gespiegelt werden nur punkte und hinweis', () => {
    expect([...GESPIEGELTE_FELDER]).toEqual(['punkte', 'hinweis']);
  });

  it('arbeitsanweisung und clue sind als nur-Ergebnis ausgewiesen', () => {
    // Deckt sich mit blockToRequest: nur punkte/quelleId/hinweis gehen in die Anforderung.
    expect([...NUR_ERGEBNIS_FELDER]).toEqual(['arbeitsanweisung', 'clue']);
  });
});

describe('spiegeleBlockEinstellungen', () => {
  it('spiegelt geaenderte Punkte zurueck', () => {
    const vorher = [anforderung('b1', 4), anforderung('b2', 6)];
    const nachher = spiegeleBlockEinstellungen('b1', { punkte: 9 }, vorher);
    expect(nachher).not.toBeNull();
    expect(nachher?.[0]?.punkte).toBe(9);
    expect(nachher?.[1]?.punkte).toBe(6);
  });

  it('spiegelt den KI-Hinweis zurueck', () => {
    const vorher = [anforderung('b1', 4)];
    const nachher = spiegeleBlockEinstellungen('b1', { hinweis: 'Nur Absatz 2 verwenden' }, vorher);
    expect(nachher?.[0]?.hinweis).toBe('Nur Absatz 2 verwenden');
  });

  it('spiegelt beides in einem Rutsch', () => {
    const vorher = [anforderung('b1', 4)];
    const nachher = spiegeleBlockEinstellungen('b1', { punkte: 8, hinweis: 'Kurz halten' }, vorher);
    expect(nachher?.[0]?.punkte).toBe(8);
    expect(nachher?.[0]?.hinweis).toBe('Kurz halten');
  });

  it('spiegelt nicht die erzeugte config zurueck (die ist ein Ergebnis)', () => {
    const vorher = [anforderung('b1', 4)];
    const nachher = spiegeleBlockEinstellungen('b1', { punkte: 9 }, vorher);
    expect(ersteFrage(nachher?.[0])).toBe('a');
  });

  it('gibt null zurueck, wenn nichts geaendert wurde', () => {
    expect(spiegeleBlockEinstellungen('b1', { punkte: 4 }, [anforderung('b1', 4)])).toBeNull();
  });

  it('gibt null zurueck, wenn der Block nicht in der Anforderung steht', () => {
    // Z.B. eine aus dem Aufgaben-Pool geladene oder geoeffnete Unterlage.
    expect(spiegeleBlockEinstellungen('b1', { punkte: 9 }, [anforderung('b2', 4)])).toBeNull();
    expect(spiegeleBlockEinstellungen('b1', { punkte: 9 }, [])).toBeNull();
  });

  it('veraendert die uebergebene Anforderungsliste nicht', () => {
    const vorher = [anforderung('b1', 4)];
    spiegeleBlockEinstellungen('b1', { punkte: 9 }, vorher);
    expect(vorher[0]?.punkte).toBe(4);
  });

  it('behaelt die uebrigen Bloecke unveraendert', () => {
    const vorher = [anforderung('b1', 4), anforderung('b2', 6, 'Hinweis 2')];
    const nachher = spiegeleBlockEinstellungen('b2', { punkte: 11 }, vorher);
    expect(nachher?.[0]).toEqual(vorher[0]);
    expect(nachher?.[1]?.punkte).toBe(11);
    expect(nachher?.[1]?.hinweis).toBe('Hinweis 2');
  });

  it('loescht einen Hinweis aus dem Baukasten NICHT, wenn das Ergebnis keinen traegt', () => {
    // Realer Fall: das Modell gibt "hinweis" im fertigen Block nicht zurueck. Ohne diese
    // Regel wuerde ein Klick auf "Punkte" in der Vorschau die Vorgabe aus dem Baukasten loeschen.
    const vorher = [anforderung('b1', 4, 'Nur Absatz 2')];
    const nachher = spiegeleBlockEinstellungen('b1', { punkte: 9 }, vorher);
    expect(nachher?.[0]?.hinweis).toBe('Nur Absatz 2');
    expect(nachher?.[0]?.punkte).toBe(9);
  });
});
