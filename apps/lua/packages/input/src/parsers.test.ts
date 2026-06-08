import { describe, it, expect, beforeAll } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTxt, parseDocx, parsePdf } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, '__fixtures__');

describe('parseTxt', () => {
  it('extrahiert Text aus einer UTF-8-Datei', async () => {
    const result = await parseTxt(join(fixtureDir, 'sample.txt'));
    expect(result.inhalt).toContain('Die Nutzung von sozialen Medien');
    expect(result.inhalt).toContain('Instagram und TikTok');
    expect(result.titel).toBe('sample');
  });

  it('normalisiert Zeilenumbrueche und entfernt ueberfluessige Leerzeilen', async () => {
    const result = await parseTxt(join(fixtureDir, 'sample.txt'));
    // Es sollte keine drei aufeinanderfolgenden Zeilenumbrueche geben
    expect(result.inhalt).not.toContain('\n\n\n');
  });
});

describe('parseDocx', () => {
  it('extrahiert Text aus einer .docx-Datei', async () => {
    const result = await parseDocx(join(fixtureDir, 'sample.docx'));
    expect(result.inhalt).toContain('Die Nutzung von sozialen Medien');
    expect(result.inhalt).toContain('Besonders Jugendliche verbringen');
    expect(result.inhalt).toContain('Experts recommend setting daily time limits');
    expect(result.titel).toBe('sample');
  });

  it('entfernt ueberfluessige Leerzeilen aus docx-Text', async () => {
    const result = await parseDocx(join(fixtureDir, 'sample.docx'));
    expect(result.inhalt).not.toContain('\n\n\n');
  });
});

describe('parsePdf', () => {
  it('extrahiert Text aus einer PDF-Datei', async () => {
    const result = await parsePdf(join(fixtureDir, 'sample.pdf'));
    expect(result.inhalt).toContain('Die Nutzung von sozialen Medien');
    expect(result.titel).toBe('sample');
  });
});
