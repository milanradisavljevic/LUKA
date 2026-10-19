import { describe, it, expect } from 'vitest';
import type { Block, DocumentV1 } from '@lehrunterlagen/schema';
import { buildMessages, PARALLEL_MARKER } from '@lehrunterlagen/llm';
import {
  bereiteParallelBlockVor,
  bereiteParallelversionVor,
  findeWiederverwendung,
  fuegeNachEin,
  mehrDavonBlock,
  istParallelBlock,
  originalInhalteAusHinweis,
  parallelThema,
  sammleInhalte,
} from './parallelversion';
import { blockToRequest } from '../hooks/useGenerate';
import { getDefaultMeta } from './constants';

const lueckentext = {
  id: 'b1',
  typ: 'lueckentext',
  punkte: 6,
  arbeitsanweisung: 'Setze das richtige Relativpronomen ein.',
  hinweis: 'Nur der/die/das',
  text: 'Das ist der Hund, ___ im Park bellt. Die Frau, ___ dort wohnt, ist nett.',
  config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
  loesung: { luecken: [{ nr: 1, wort: 'der' }, { nr: 2, wort: 'die' }] },
} as unknown as Block;

const kreuzwort = {
  id: 'b2',
  typ: 'kreuzwortraetsel',
  punkte: 4,
  arbeitsanweisung: 'Löse das Rätsel.',
  config: {
    eingabemodus: 'manuell',
    anzahlWoerter: 2,
    eintraege: [
      { wort: 'Apfel', hinweis: 'Rotes oder grünes Obst' },
      { wort: 'Birne', hinweis: 'Gelbes Obst mit Stiel' },
    ],
  },
} as unknown as Block;

function dokument(bloecke: Block[]): DocumentV1 {
  return { schemaVersion: '0.1.0', meta: getDefaultMeta(), quelltexte: [], bloecke } as unknown as DocumentV1;
}

describe('parallelversion', () => {
  it('sammelt Inhalte inklusive Kreuzwort-Umschreibungen, aber keine Kopffelder', () => {
    const inhalte = sammleInhalte(kreuzwort);
    expect(inhalte).toContain('Apfel');
    expect(inhalte).toContain('Rotes oder grünes Obst');
    expect(inhalte).not.toContain('Löse das Rätsel.');
    expect(inhalte).not.toContain('manuell');
  });

  it('ersetzt den Hinweis durch eine lesbare Parallel-Vorgabe und schaltet manuelle Eingaben auf KI', () => {
    const vorbereitet = bereiteParallelBlockVor(kreuzwort) as Block & { config: { eingabemodus: string } };
    expect(istParallelBlock(vorbereitet)).toBe(true);
    expect(vorbereitet.config.eingabemodus).toBe('ki');
    expect(vorbereitet.punkte).toBe(4);
    expect(originalInhalteAusHinweis(vorbereitet.hinweis)).toEqual(
      ['Apfel', 'Rotes oder grünes Obst', 'Birne', 'Gelbes Obst mit Stiel'],
    );
    // Original bleibt unverändert.
    expect((kreuzwort as unknown as { config: { eingabemodus: string } }).config.eingabemodus).toBe('manuell');
  });

  it('übernimmt manuelle Originalwörter nicht als feste Vorgabe in die Anforderung', () => {
    const request = blockToRequest(bereiteParallelBlockVor(kreuzwort));
    expect(request.typ).toBe('kreuzwortraetsel');
    expect('eintraege' in request && request.eintraege).toBeFalsy();
    expect(request.hinweis).toContain(PARALLEL_MARKER);
  });

  it('setzt Gruppe B nur einmal an das Thema', () => {
    expect(parallelThema('Relativsätze', 'gruppe-b')).toBe('Relativsätze (Gruppe B)');
    expect(parallelThema('Relativsätze (Gruppe B)', 'gruppe-b')).toBe('Relativsätze (Gruppe B)');
    expect(parallelThema('Relativsätze (Gruppe B)', 'nachschreibtermin')).toBe('Relativsätze (Nachschreibtermin)');
    expect(parallelThema('Relativsätze (Gruppe B)', 'keine')).toBe('Relativsätze');
  });

  it('bereitet einen neuen, noch nicht erzeugten Zustand mit gleicher Blockfolge vor', () => {
    const meta = { ...getDefaultMeta(), thema: 'Relativsätze', modus: 'kompetenz' as const };
    const { snapshot, brauchtNeuenQuelltext } = bereiteParallelversionVor({
      auftrag: null, meta, quelltexte: [], llmProvider: 'deepseek', modelName: 'DeepSeek V4 Pro',
      kreativitaet: 0.4, ausgabeSprache: 'de', renderTemplate: 'standard' as never, renderLayout: 'standard' as never,
    }, dokument([lueckentext, kreuzwort]), 'gruppe-b');
    expect(brauchtNeuenQuelltext).toBe(false);
    expect(snapshot.generiertesDokument).toBeNull();
    expect(snapshot.meta.thema).toBe('Relativsätze (Gruppe B)');
    expect(snapshot.bloecke.map((b) => [b.id, b.typ, b.punkte])).toEqual([['b1', 'lueckentext', 6], ['b2', 'kreuzwortraetsel', 4]]);
  });

  it('meldet wiederholte Sätze und Rätselwörter, aber keine einzelnen Grammatik-Zielwörter', () => {
    const angefordert = [bereiteParallelBlockVor(lueckentext), bereiteParallelBlockVor(kreuzwort)];
    const neu = dokument([
      { ...lueckentext, text: 'Der Ball, ___ rollt, ist rot.', loesung: { luecken: [{ nr: 1, wort: 'der' }] } } as unknown as Block,
      { ...kreuzwort, config: { anzahlWoerter: 2, eintraege: [{ wort: 'APFEL', hinweis: 'Neu' }, { wort: 'Kiwi', hinweis: 'Grün' }] } } as unknown as Block,
    ]);
    const treffer = findeWiederverwendung(angefordert, neu);
    expect(treffer).toEqual([{ blockId: 'b2', inhalte: ['APFEL'] }]);
  });

  it('ergänzt die Parallel-Regel im Prompt nur bei markierten Blöcken', () => {
    const meta = { ...getDefaultMeta(), thema: 'Relativsätze', modus: 'kompetenz' as const, freieKompetenz: 'Relativsätze' };
    const mit = buildMessages({ meta, quelltexte: [], bloecke: [blockToRequest(bereiteParallelBlockVor(lueckentext))] });
    const ohne = buildMessages({ meta, quelltexte: [], bloecke: [blockToRequest(lueckentext)] });
    const user = (m: typeof mit) => m.find((x) => x.role === 'user')!.content;
    expect(user(mit)).toContain('PARALLELVERSION (Lehrkraft-Vorgabe)');
    expect(user(ohne)).not.toContain('PARALLELVERSION (Lehrkraft-Vorgabe)');
  });

  it('fügt „Mehr davon“ direkt nach dem Vorbild ein, mit eigener ID und Parallel-Hinweis', () => {
    const neu = mehrDavonBlock(kreuzwort, 'b2-mehr');
    expect(neu.id).toBe('b2-mehr');
    expect(istParallelBlock(neu)).toBe(true);
    expect(fuegeNachEin([lueckentext, kreuzwort], 'b1', neu).map((b) => b.id)).toEqual(['b1', 'b2-mehr', 'b2']);
    expect(fuegeNachEin([lueckentext], 'fehlt', neu).map((b) => b.id)).toEqual(['b1', 'b2-mehr']);
  });
});
