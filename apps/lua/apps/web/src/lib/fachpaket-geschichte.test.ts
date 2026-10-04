import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BlockSchema, QuellTextSchema, type Block, type DocumentV1 } from '@lehrunterlagen/schema';
import { renderDocument } from '@lehrunterlagen/renderer';
import { validatePoolEntries } from './poolValidation';
import type { PoolEntry } from './pool';

const entries = JSON.parse(readFileSync(
  new URL('../../../../../../samples/fachpakete/luka-fachpaket-geschichte-ahs-v1.json', import.meta.url),
  'utf8',
)) as PoolEntry[];

function referencedSourceIds(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => referencedSourceIds(item, result));
  else if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'quelleId' && typeof nested === 'string') result.add(nested);
      else referencedSourceIds(nested, result);
    }
  }
  return result;
}

describe('Geschichte-AHS-Fachpaket', () => {
  it('enthält genau elf eindeutige Aufgaben über die Schulstufen 6 bis 12', () => {
    expect(entries).toHaveLength(11);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(11);
    expect(entries.map((entry) => entry.schulstufe)).toEqual([6, 7, 8, 9, 9, 10, 10, 11, 11, 12, 12]);
    expect(entries.every((entry) => entry.fach === 'geschichte')).toBe(true);
    expect(entries.every((entry) => entry.stufe === (entry.schulstufe! <= 8 ? 'unterstufe' : 'oberstufe'))).toBe(true);
  });

  it('hat gültige Blöcke, Quellen und auflösbare Quellenverweise', () => {
    expect(validatePoolEntries(entries).valid).toBe(true);
    for (const entry of entries) {
      const block = JSON.parse(entry.blockJson) as unknown;
      expect(BlockSchema.safeParse(block).success).toBe(true);
      expect(typeof entry.quelleHinweis).toBe('string');
      expect(entry.quelleHinweis).toContain('AMTLICHER LEHRPLAN');
      expect(entry.quelleHinweis).toContain('LUKA-AUFBEREITUNG');
      expect(entry.quelleHinweis).toContain('ris.bka.gv.at');

      const sources = entry.quelltexte ?? [];
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.every((source) => QuellTextSchema.safeParse(source).success)).toBe(true);
      expect(new Set(sources.map((source) => source.id)).size).toBe(sources.length);
      const sourceIds = new Set(sources.map((source) => source.id));
      expect([...referencedSourceIds(block)].every((id) => sourceIds.has(id))).toBe(true);
    }
  });

  it('deckt alle vorgesehenen Oberstufensemester ab und nutzt die vorhandenen Aufgabentypen', () => {
    const tags = entries.flatMap((entry) => JSON.parse(entry.tags ?? '[]') as string[]);
    for (let semester = 1; semester <= 8; semester++) {
      expect(tags).toContain(`semester-${semester}`);
    }
    const types = entries.map((entry) => entry.aufgabentyp);
    expect(types).toEqual([
      'quellenanalyse', 'quellenanalyse', 'offeneSchreibaufgabe', 'quellenanalyse', 'timeline',
      'quellenanalyse', 'diagrammanalyse', 'diagrammanalyse', 'quellenanalyse',
      'offeneSchreibaufgabe', 'offeneSchreibaufgabe',
    ]);
  });

  it('rendert Schüler- und Lösungsfassung für alle elf Aufgaben', async () => {
    for (const entry of entries) {
      const document: DocumentV1 = {
        schemaVersion: '0.1.0',
        meta: {
          fach: 'geschichte',
          stufe: entry.stufe as DocumentV1['meta']['stufe'],
          thema: entry.thema ?? 'Geschichte',
          datum: '2026-10-04',
          klasse: '',
          notizen: entry.quelleHinweis ?? '',
          schulstufe: entry.schulstufe ?? undefined,
        },
        quelltexte: entry.quelltexte ?? [],
        bloecke: [JSON.parse(entry.blockJson) as Block],
      };
      const rendered = await renderDocument(document);
      expect(rendered.schueler.byteLength, `${entry.id} Schülerfassung`).toBeGreaterThan(0);
      expect(rendered.loesung.byteLength, `${entry.id} Lösungsfassung`).toBeGreaterThan(0);
      expect(rendered.schueler.equals(rendered.loesung), `${entry.id} should render distinct outputs`).toBe(false);
      expect(rendered.schueler.subarray(0, 4).toString('hex')).toBe('504b0304');
      expect(rendered.loesung.subarray(0, 4).toString('hex')).toBe('504b0304');
    }
  });
});
