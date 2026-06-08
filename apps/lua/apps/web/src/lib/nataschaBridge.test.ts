import { describe, it, expect } from 'vitest';
import {
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

  it('übernimmt Fach/Stufe und baut Thema + Notizen mit echten Fehlern', () => {
    const p = mapBridgeToPrefill(validExport);
    expect(p.fach).toBe('deutsch');
    expect(p.stufe).toBe('oberstufe');
    expect(p.thema).toBe('Fehlerschwerpunkte – SA2 (6i)');
    expect(p.notizen).toContain('Schüler die keine');
    expect(p.notizen).toContain('Kommasetzung bei Relativsätzen');
  });

  it('nutzt Defaults, wenn Fach/Stufe fehlen', () => {
    const { schulstufe, ...ohneStufe } = validExport;
    void schulstufe;
    const p = mapBridgeToPrefill(ohneStufe as BridgeExport);
    expect(p.stufe).toBe('oberstufe');
  });
});
