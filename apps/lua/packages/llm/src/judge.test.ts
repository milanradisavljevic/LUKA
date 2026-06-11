import { describe, it, expect } from 'vitest';
import { runKompetenzJudge } from './judge.js';
import type { DocumentV1 } from '@lehrunterlagen/schema';

const umformungDoc = (): DocumentV1 => ({
  schemaVersion: '0.1.0',
  meta: {
    stufe: 'oberstufe', fach: 'englisch', thema: 'Past Perfect',
    datum: '2026-06-11', klasse: '', notizen: '', modus: 'kompetenz',
  },
  quelltexte: [],
  bloecke: [{
    id: 'b1', typ: 'umformung', punkte: 6, arbeitsanweisung: 'Setze in Past Perfect.',
    config: { aufgaben: [{ nr: 1, ausgangssatz: 'She finished her homework.', anweisung: 'Put into Past Perfect.', zielstruktur: 'Past Perfect' }] },
    loesung: { loesungen: [{ nr: 1, umformulierung: 'She had finished her homework.', erklaerung: 'had + past participle.' }] },
  }],
});

describe('runKompetenzJudge (Phase 2b)', () => {
  it('keine Issues, wenn der Judge alles als korrekt meldet', async () => {
    const complete = async () => JSON.stringify({ fehler: [] });
    const issues = await runKompetenzJudge(umformungDoc(), { fach: 'englisch', niveau: 'standard' }, complete);
    expect(issues).toHaveLength(0);
  });

  it('macht aus "hart" einen error (loest Reparatur aus)', async () => {
    const complete = async () => JSON.stringify({ fehler: [{ schwere: 'hart', grund: 'Musterloesung ist kein Past Perfect.' }] });
    const issues = await runKompetenzJudge(umformungDoc(), { fach: 'englisch' }, complete);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.message).toContain('Kompetenz-Judge');
  });

  it('macht aus "weich" eine Warnung', async () => {
    const complete = async () => JSON.stringify({ fehler: [{ schwere: 'weich', grund: 'Niveau wirkt zu einfach.' }] });
    const issues = await runKompetenzJudge(umformungDoc(), { niveau: 'erweitert' }, complete);
    expect(issues[0]!.severity).toBe('warning');
  });

  it('Stoff-Item-Titel und Niveau landen im Judge-Prompt', async () => {
    let gesehen = '';
    const complete = async (messages: { role: string; content: string }[]) => {
      gesehen = messages[0]!.content;
      return JSON.stringify({ fehler: [] });
    };
    await runKompetenzJudge(umformungDoc(), { stoffItemTitel: 'Past Perfect', niveau: 'basis', fach: 'englisch' }, complete);
    expect(gesehen).toContain('Past Perfect');
    expect(gesehen).toContain('basis');
  });

  it('prueft nur umformung/fehlerkorrektur (andere Typen werden uebersprungen)', async () => {
    const doc = umformungDoc();
    (doc as any).bloecke = [{ id: 'b1', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'x', config: { fragen: [] } }];
    let called = false;
    const complete = async () => { called = true; return '{}'; };
    const issues = await runKompetenzJudge(doc, {}, complete);
    expect(called).toBe(false);
    expect(issues).toHaveLength(0);
  });

  it('API-Fehler blockiert nicht (Warnung statt Crash)', async () => {
    const complete = async () => { throw new Error('boom'); };
    const issues = await runKompetenzJudge(umformungDoc(), {}, complete);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('warning');
  });
});
