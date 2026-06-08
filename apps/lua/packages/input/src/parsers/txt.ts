import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { ParseResult } from '../types.js';

/**
 * Parst eine UTF-8-Textdatei.
 * Entfernt ueberfluessige Leerzeilen und normalisiert Zeilenumbrueche zu \n.
 */
export async function parseTxt(filePath: string): Promise<ParseResult> {
  const raw = await readFile(filePath, 'utf-8');

  // Normalisiere Zeilenumbrueche (CRLF -> LF)
  let inhalt = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Entferne ueberfluessige Leerzeilen (mehr als zwei aufeinanderfolgende)
  inhalt = inhalt.replace(/\n{3,}/g, '\n\n');

  // Trim
  inhalt = inhalt.trim();

  const titel = basename(filePath, '.txt');

  return { inhalt, titel };
}
