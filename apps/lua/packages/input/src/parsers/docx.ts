import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import mammoth from 'mammoth';
import type { ParseResult } from '../types.js';

/**
 * Parst eine .docx-Datei und extrahiert den reinen Text.
 * Verwendet mammoth (keine externen Abhaengigkeiten wie LibreOffice).
 */
export async function parseDocx(filePath: string): Promise<ParseResult> {
  const buffer = await readFile(filePath);

  const result = await mammoth.extractRawText({ buffer });

  // Normalisiere Zeilenumbrueche
  let inhalt = result.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Entferne ueberfluessige Leerzeilen
  inhalt = inhalt.replace(/\n{3,}/g, '\n\n');
  inhalt = inhalt.trim();

  const titel = basename(filePath, '.docx');

  return { inhalt, titel };
}
