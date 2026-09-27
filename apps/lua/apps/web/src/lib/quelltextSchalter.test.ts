import { describe, it, expect } from 'vitest';
import type { DocumentV1, Meta } from '@lehrunterlagen/schema';
import {
  effektiverQuelltextSchalter,
  metaSchalterUpdate,
  quelltextWirdGedruckt,
  quelltextWirdFormatiert,
} from './quelltextSchalter';

const meta: Meta = {
  stufe: 'oberstufe',
  fach: 'deutsch',
  thema: 'T',
  datum: '2026-01-01',
  klasse: '7A',
  notizen: '',
};

const doc = (docMeta: Partial<Meta> = {}): DocumentV1 => ({
  schemaVersion: '0.1.0',
  meta: { ...meta, ...docMeta },
  quelltexte: [],
  bloecke: [{
    id: 'b1',
    typ: 'offeneVerstaendnisfrage',
    punkte: 4,
    quelleId: 'q1',
    arbeitsanweisung: 'Beantworte die Frage.',
    config: { fragen: [{ nr: 1, zeilen: 3, frage: 'Warum?' }] },
    loesung: { antworten: { '1': 'Weil.' } },
  }],
});

describe('quelltextSchalter — Auflösung', () => {
  it('ohne Dokument zählt das Wizard-Meta', () => {
    expect(effektiverQuelltextSchalter(undefined, meta, 'quelltextFormatieren')).toBe(false);
    expect(effektiverQuelltextSchalter(undefined, { ...meta, quelltextFormatieren: true }, 'quelltextFormatieren')).toBe(true);
  });

  it('Dokument-Meta hat Vorrang vor dem Wizard-Meta', () => {
    const dokument = doc({ quelltextFormatieren: false });
    const wizard = { ...meta, quelltextFormatieren: true };
    // Nach der Erstellung zeigt das Dokument den tatsaechlichen Zustand.
    expect(effektiverQuelltextSchalter(dokument, wizard, 'quelltextFormatieren')).toBe(false);
  });

  it('Wird im Dokument das Feld fehlt, greift das Wizard-Meta', () => {
    const dokument = doc();
    expect(effektiverQuelltextSchalter(dokument, { ...meta, quelltextFormatieren: true }, 'quelltextFormatieren')).toBe(true);
  });

  it('fehlende Werte gelten als aus (Default: Formatierung aus, Abdruck an)', () => {
    expect(quelltextWirdFormatiert(undefined, meta)).toBe(false);
    expect(quelltextWirdGedruckt(undefined, meta)).toBe(true);
  });

  it('nur true schaltet — truthy Werte zählen nicht', () => {
    const falsch = { ...meta, quelltextAusblenden: 'ja' as unknown as boolean };
    expect(effektiverQuelltextSchalter(undefined, falsch, 'quelltextAusblenden')).toBe(false);
  });
});

describe('quelltextSchalter — Meta-Update', () => {
  it('ohne Dokument wird nur das Wizard-Meta geliefert', () => {
    const r = metaSchalterUpdate(undefined, false, 'quelltextFormatieren');
    expect(r.meta).toEqual({ quelltextFormatieren: true });
    expect(r.dokument).toBeUndefined();
  });

  it('mit Dokument wandert der Wert auch ins eingefrorene Dokument', () => {
    const dokument = doc();
    const r = metaSchalterUpdate(dokument, false, 'quelltextAusblenden');
    expect(r.meta).toEqual({ quelltextAusblenden: true });
    expect(r.dokument?.meta.quelltextAusblenden).toBe(true);
    // Der Quelltextinhalt und die Bloecke bleiben unberuehrt.
    expect(r.dokument?.bloecke).toBe(dokument.bloecke);
  });

  it('schaltet von true zurueck auf false', () => {
    const dokument = doc({ quelltextFormatieren: true });
    const r = metaSchalterUpdate(dokument, true, 'quelltextFormatieren');
    expect(r.meta).toEqual({ quelltextFormatieren: false });
    expect(r.dokument?.meta.quelltextFormatieren).toBe(false);
  });

  it('das Originaldokument wird nicht veraendert', () => {
    const dokument = doc();
    metaSchalterUpdate(dokument, false, 'quelltextFormatieren');
    expect(dokument.meta.quelltextFormatieren).toBeUndefined();
  });
});
