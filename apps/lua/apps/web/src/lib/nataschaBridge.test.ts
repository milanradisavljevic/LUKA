import { describe, it, expect } from 'vitest';
import {
  buildPrefillFromHeatmap,
  parseBridgeExport,
  mapBridgeToPrefill,
  type BridgeExport,
} from './nataschaBridge';

const validExport: BridgeExport = {
  schemaVersion: 1,
  klasse: '6i',
  aufgabe: 'SA2',
  fach: 'deutsch',
  schulstufe: 'oberstufe',
  datum: '2026-05-26',
  anzahlAbgaben: 20,
  heatmap: [
    { typ: 'Z', kategorie: 'Zeichensetzung', anzahl: 42, prozent: 47 },
    { typ: 'G', kategorie: 'Grammatik', anzahl: 28, prozent: 31 },
    { typ: 'R', kategorie: 'Rechtschreibung', anzahl: 0, prozent: 0 },
  ],
  beispiele: [
    { typ: 'Z', zitat: 'Schüler die keine', korrektur: 'Schüler, die keine', haeufigkeit: 7 },
  ],
  empfehlungen: ['Kommasetzung bei Relativsätzen wiederholen.'],
};

describe('parseBridgeExport', () => {
  it('parst ein gültiges Export-Objekt', () => {
    const ex = parseBridgeExport(JSON.stringify(validExport));
    expect(ex.klasse).toBe('6i');
  });

  it('wirft bei unbekannter schemaVersion', () => {
    expect(() => parseBridgeExport(JSON.stringify({ ...validExport, schemaVersion: 99 }))).toThrow(
      /Version 99/,
    );
  });

  it('wirft bei fehlenden Pflichtfeldern', () => {
    expect(() => parseBridgeExport(JSON.stringify({ schemaVersion: 1, klasse: '6i' }))).toThrow(
      /unvollständig/,
    );
  });

  it('wirft bei ungültigem JSON', () => {
    expect(() => parseBridgeExport('{ kaputt')).toThrow(/gültiges JSON/);
  });
});

describe('mapBridgeToPrefill', () => {
  it('nimmt nur Kategorien mit Fehlern, stärkste zuerst', () => {
    const p = mapBridgeToPrefill(validExport);
    // R hat anzahl 0 → fällt raus; Z (42) vor G (28).
    expect(p.fokusThemen).toEqual(['Zeichensetzung', 'Grammatik']);
  });

  it('mappt Kategorien auf Aufgabentypen und dedupliziert', () => {
    const p = mapBridgeToPrefill(validExport);
    // Z → lueckentext, markieraufgabe; G → lueckentext (dup), offeneVerstaendnisfrage, offeneSchreibaufgabe
    expect(p.gewuenschteAufgabenarten).toEqual([
      'lueckentext',
      'markieraufgabe',
      'offeneVerstaendnisfrage',
      'offeneSchreibaufgabe',
    ]);
  });

  it('übernimmt Fach/Stufe und baut Thema; Notizen tragen den Kontext-Satz', () => {
    const p = mapBridgeToPrefill(validExport);
    expect(p.fach).toBe('deutsch');
    expect(p.stufe).toBe('oberstufe');
    expect(p.thema).toBe('Fehlerschwerpunkte – SA2 (6i)');
    // v2: Fehler-Blob nicht mehr in notizen, nur noch der Kontext-Satz.
    expect(p.notizen).toContain('Gezielte Übung zu den Fehlerschwerpunkten');
  });

  it('reicht echte Fehler strukturiert durch (für die Kuration in Step0)', () => {
    const p = mapBridgeToPrefill(validExport);
    expect(p.fehler).toBeDefined();
    expect(p.fehler?.some((f) => f.zitat.includes('Schüler die keine'))).toBe(true);
  });

  it('reicht den Ausgangstext durch (v2)', () => {
    const p = mapBridgeToPrefill({ ...validExport, ausgangstext: '  Der Originaltext.  ' });
    expect(p.ausgangstext).toBe('Der Originaltext.');
  });

  it('nutzt Defaults, wenn Fach/Stufe fehlen', () => {
    const { schulstufe, ...ohneStufe } = validExport;
    void schulstufe;
    const p = mapBridgeToPrefill(ohneStufe as BridgeExport);
    expect(p.stufe).toBe('oberstufe');
  });
});

describe('buildPrefillFromHeatmap', () => {
  it('nimmt Top 3 nach Anzahl und dedupliziert Aufgabenarten', () => {
    const p = buildPrefillFromHeatmap({
      klasse: '7a',
      aufgabe: 'SA2',
      heatmap: [
        { typ: 'R', anzahl: 2 },
        { typ: 'G', anzahl: 9 },
        { typ: 'Z', anzahl: 7 },
        { typ: 'A', anzahl: 6 },
      ],
      ausgangstext: '  Ausgangstext  ',
    });

    expect(p).not.toBeNull();
    expect(p?.fokusThemen).toEqual(['Grammatik', 'Zeichensetzung', 'Ausdruck']);
    expect(p?.gewuenschteAufgabenarten).toEqual([
      'lueckentext',
      'offeneVerstaendnisfrage',
      'offeneSchreibaufgabe',
      'markieraufgabe',
      'stiluebung',
      'wordScramble',
    ]);
    expect(p?.thema).toBe('Übung zu Fehlerschwerpunkten – 7a · SA2');
    expect(p?.ausgangstext).toBe('Ausgangstext');
  });

  it('gibt null zurück, wenn keine Fehler vorhanden sind', () => {
    expect(buildPrefillFromHeatmap({
      klasse: '7a',
      heatmap: [
        { typ: 'R', anzahl: 0 },
        { typ: 'G', anzahl: -1 },
      ],
    })).toBeNull();
  });

  it('nutzt bei unbekanntem Typ den rohen Code und crasht nicht', () => {
    const p = buildPrefillFromHeatmap({
      klasse: '7a',
      aufgabe: 'SA3',
      heatmap: [{ typ: 'X', anzahl: 4 }],
    });

    expect(p).not.toBeNull();
    expect(p?.fokusThemen).toEqual(['X']);
    expect(p?.gewuenschteAufgabenarten).toEqual([]);
    expect(p?.notizen).toContain('Schwerpunkte: X');
  });

  it('funktioniert ohne Aufgabe und Ausgangstext', () => {
    const p = buildPrefillFromHeatmap({
      klasse: '7a',
      heatmap: [{ typ: 'Z', anzahl: 3 }],
    });

    expect(p).not.toBeNull();
    expect(p?.thema).toBe('Übung zu Fehlerschwerpunkten – 7a');
    expect(p?.ausgangstext).toBeUndefined();
  });
});
