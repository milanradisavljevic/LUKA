/**
 * Erstellt Test-Fixtures fuer die Parser-Tests.
 * Wird vor dem Testlauf ausgefuehrt.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as docx from 'docx';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// TXT
// ---------------------------------------------------------------------------
const txtContent =
  `Die Nutzung von sozialen Medien hat in den letzten Jahren stark zugenommen.\n\n` +
  `Besonders Jugendliche verbringen mehrere Stunden am Tag auf Plattformen wie Instagram und TikTok.\n` +
  `While some studies show positive effects on social connection, there is growing evidence that excessive screen time can lead to anxiety.\n\n` +
  `Experts recommend setting daily time limits.`;

writeFileSync(join(__dirname, 'sample.txt'), txtContent, 'utf-8');

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------
const doc = new docx.Document({
  sections: [
    {
      properties: {},
      children: [
        new docx.Paragraph({
          children: [new docx.TextRun('Die Nutzung von sozialen Medien')],
        }),
        new docx.Paragraph({
          children: [
            new docx.TextRun(
              'Besonders Jugendliche verbringen mehrere Stunden am Tag auf Plattformen.',
            ),
          ],
        }),
        new docx.Paragraph({
          children: [
            new docx.TextRun(
              'Experts recommend setting daily time limits.',
            ),
          ],
        }),
      ],
    },
  ],
});

const docxBuffer = await docx.Packer.toBuffer(doc);
writeFileSync(join(__dirname, 'sample.docx'), docxBuffer);

// ---------------------------------------------------------------------------
// PDF (mit pdf-lib erstellt)
// ---------------------------------------------------------------------------
const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([612, 792]);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
page.drawText('Die Nutzung von sozialen Medien', {
  x: 100,
  y: 700,
  size: 12,
  font,
});
page.drawText('Besonders Jugendliche verbringen mehrere Stunden am Tag.', {
  x: 100,
  y: 680,
  size: 12,
  font,
});
page.drawText('Experts recommend setting daily time limits.', {
  x: 100,
  y: 660,
  size: 12,
  font,
});
const pdfBytes = await pdfDoc.save();
writeFileSync(join(__dirname, 'sample.pdf'), pdfBytes);

console.log('Fixtures erstellt.');
