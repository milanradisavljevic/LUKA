import { describe, it, expect } from 'vitest';
import { Packer, Paragraph, Table, TableCell } from 'docx';
import { RENDER_TEMPLATES } from './template.js';
import { RENDER_LAYOUTS, getDefaultLayout, type RenderLayoutId } from './layout.js';
import { buildBlock, renderDocument, type RenderBlockCtx } from './index.js';
import type { Block, DocumentV1, QuellText } from '@lehrunterlagen/schema';

const tpl = RENDER_TEMPLATES.klassisch;

function ctx(layoutId: RenderLayoutId, over: Partial<RenderBlockCtx> = {}): RenderBlockCtx {
  return {
    template: tpl,
    modus: 'schueler',
    index: 1,
    quelltextMap: new Map<string, QuellText>(),
    fach: 'deutsch',
    layout: RENDER_LAYOUTS[layoutId],
    ...over,
  };
}

const offen: Block = {
  id: 'b1', typ: 'offeneVerstaendnisfrage', punkte: 10, quelleId: 'q1',
  arbeitsanweisung: 'Beantworte.', config: { fragen: [{ nr: 1, frage: 'Warum?', zeilen: 3 }] },
  loesung: { antworten: { '1': 'Weil das so ist.' } },
} as unknown as Block;

const mc: Block = {
  id: 'b2', typ: 'multipleChoice', punkte: 4, arbeitsanweisung: 'Kreuze an.',
  config: {
    fragen: [{
      nr: 1, frage: 'F?',
      optionen: [{ key: 'A', text: 'Eins' }, { key: 'B', text: 'Zwei' }, { key: 'C', text: 'Drei' }, { key: 'D', text: 'Vier' }],
    }],
  },
  loesung: { antworten: { '1': ['B'] } },
} as unknown as Block;

// --- Walker-Helfer ----------------------------------------------------------
function flatten(nodes: (Paragraph | Table)[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const walk = (arr: (Paragraph | Table)[]) => {
    for (const n of arr) {
      out.push(n);
      if (n instanceof Table) {
        for (const row of (n as any).root.filter((r: any) => r?.constructor?.name === 'TableRow')) {
          for (const cell of (row as any).root.filter((c: any) => c?.constructor?.name === 'TableCell')) {
            walk((cell as any).root.filter((x: any) => x instanceof Paragraph || x instanceof Table));
          }
        }
      }
    }
  };
  walk(nodes);
  return out;
}

function countParagraphs(nodes: (Paragraph | Table)[]): number {
  return flatten(nodes).filter((n) => n instanceof Paragraph).length;
}

/** Sucht im docx-Subbaum nach einem Knoten mit gegebenem rootKey (docx 8.x). */
function hasRootKey(el: unknown, key: string): boolean {
  if (!el || typeof el !== 'object') return false;
  if ((el as { rootKey?: string }).rootKey === key) return true;
  const root = (el as { root?: unknown[] }).root;
  if (Array.isArray(root)) return root.some((c) => hasRootKey(c, key));
  return false;
}

/** Anzahl Überschriften (Paragraph mit w:pStyle) im Baum. */
function countHeadings(nodes: (Paragraph | Table)[]): number {
  return flatten(nodes).filter((n) => n instanceof Paragraph && hasRootKey(n, 'w:pStyle')).length;
}

describe('RenderLayout — Daten', () => {
  it('standard ist neutral (Faktor 1, kein Rahmen)', () => {
    const s = getDefaultLayout();
    expect(s.id).toBe('standard');
    expect(s.answerLineFactor).toBe(1.0);
    expect(s.frameBlocks).toBe(false);
  });

  it('Block-Abstand: kompakt < standard < grosszuegig', () => {
    expect(RENDER_LAYOUTS.kompakt.blockSpacingMm).toBeLessThan(RENDER_LAYOUTS.standard.blockSpacingMm);
    expect(RENDER_LAYOUTS.standard.blockSpacingMm).toBeLessThan(RENDER_LAYOUTS.grosszuegig.blockSpacingMm);
  });

  it('Schreibraum: kompakt < standard < grosszuegig', () => {
    expect(RENDER_LAYOUTS.kompakt.answerLineFactor).toBeLessThan(RENDER_LAYOUTS.standard.answerLineFactor);
    expect(RENDER_LAYOUTS.standard.answerLineFactor).toBeLessThan(RENDER_LAYOUTS.grosszuegig.answerLineFactor);
  });

  it('nur gerahmt setzt frameBlocks', () => {
    expect(RENDER_LAYOUTS.gerahmt.frameBlocks).toBe(true);
    expect(RENDER_LAYOUTS.kompakt.frameBlocks).toBe(false);
    expect(RENDER_LAYOUTS.standard.frameBlocks).toBe(false);
    expect(RENDER_LAYOUTS.grosszuegig.frameBlocks).toBe(false);
  });
});

describe('RenderLayout — Renderer-Wirkung', () => {
  it('Banner-Abstand wirkt sich aufs gerenderte Banner aus (Layouts unterscheiden sich)', () => {
    const k = JSON.stringify(buildBlock(mc, ctx('kompakt')));
    const s = JSON.stringify(buildBlock(mc, ctx('standard')));
    const g = JSON.stringify(buildBlock(mc, ctx('grosszuegig')));
    // verschiedene blockSpacingMm → verschiedene serialisierte Banner (Abstand wird gesetzt)
    expect(k).not.toBe(s);
    expect(s).not.toBe(g);
    expect(k).not.toBe(g);
  });

  it('grosszuegig erzeugt mehr Schreiblinien als kompakt (offener Block)', () => {
    const k = countParagraphs(buildBlock(offen, ctx('kompakt')));
    const g = countParagraphs(buildBlock(offen, ctx('grosszuegig')));
    expect(g).toBeGreaterThan(k);
  });

  it('gerahmt wrappt den Block in GENAU eine Rahmen-Tabelle', () => {
    const out = buildBlock(mc, ctx('gerahmt'));
    expect(out).toHaveLength(1);
    expect(out[0]).toBeInstanceOf(Table);
  });

  it('gerahmt behält genau EINE Block-Überschrift (kein Doppelkopf)', () => {
    expect(countHeadings(buildBlock(mc, ctx('gerahmt')))).toBe(1);
    expect(countHeadings(buildBlock(mc, ctx('standard')))).toBe(1);
  });
});

describe('RenderLayout — End-to-End-Smoke', () => {
  const doc: DocumentV1 = {
    schemaVersion: 1,
    meta: { fach: 'deutsch', stufe: 'oberstufe', thema: 'T', datum: '2026-06-30', typ: 'schuluebung', modus: 'text' },
    quelltexte: [],
    bloecke: [mc, offen],
    didaktik: {},
  } as unknown as DocumentV1;

  for (const id of Object.keys(RENDER_LAYOUTS) as RenderLayoutId[]) {
    it(`rendert ohne Fehler mit Layout '${id}'`, async () => {
      const { schueler } = await renderDocument(doc, tpl, RENDER_LAYOUTS[id]);
      expect(schueler.byteLength).toBeGreaterThan(0);
    });
  }
});
