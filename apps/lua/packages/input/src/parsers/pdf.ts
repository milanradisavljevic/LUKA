import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import PDFParser from 'pdf2json';
import type { ParseResult } from '../types.js';

/**
 * Parst eine PDF-Datei und extrahiert den reinen Text.
 * Verwendet pdf2json (reines JavaScript, keine externen Binaer-Abhaengigkeiten).
 */
export async function parsePdf(filePath: string): Promise<ParseResult> {
  const buffer = await readFile(filePath);

  const text = await new Promise<string>((resolve, reject) => {
    const parser = new PDFParser();

    parser.on('pdfParser_dataReady', (pdfData) => {
      // pdf2json liefert Text als Array von Seiten-Objekten
      const pages = pdfData.Pages || [];
      const lines: string[] = [];

      for (const page of pages) {
        const texts = page.Texts || [];
        for (const t of texts) {
          const textParts = t.R || [];
          for (const part of textParts) {
            // pdf2json kodiert Text als URI-komponente
            const decoded = decodeURIComponent(part.T || '');
            if (decoded) lines.push(decoded);
          }
        }
      }

      resolve(lines.join(' '));
    });

    parser.on('pdfParser_dataError', (err) => {
      reject(new Error('parserError' in err && err.parserError ? String(err.parserError) : 'PDF parsing failed'));
    });

    parser.parseBuffer(buffer);
  });

  // Normalisiere Zeilenumbrueche
  let inhalt = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Entferne ueberfluessige Leerzeilen
  inhalt = inhalt.replace(/\n{3,}/g, '\n\n');
  inhalt = inhalt.trim();

  const titel = basename(filePath, '.pdf');

  return { inhalt, titel };
}
