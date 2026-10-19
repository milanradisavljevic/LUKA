import { extractHtmlText } from './importText';

export interface DateiTextOptionen {
  /**
   * PDF-Zeilenumbrüche erhalten. Für Arbeitsblätter als Muster wichtig
   * (Aufgaben, Items, Lücken stehen je in eigenen Zeilen); Quelltexte werden
   * dagegen als Fließtext gelesen.
   */
  zeilen?: boolean;
}

/** Liest .docx, .pdf, .html und Textdateien als reinen Text. */
export async function readFileAsText(file: File, optionen: DateiTextOptionen = {}): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (lowerName.endsWith('.pdf')) {
    const pdfjsLib = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str + (optionen.zeilen && item.hasEOL ? '\n' : '') : ''))
        .join(' ');
      fullText += `${pageText}\n\n`;
    }

    return fullText.trim();
  }

  if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    return extractHtmlText(await file.text(), file.name.replace(/\.[^.]+$/, '')).inhalt;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    reader.readAsText(file, 'utf-8');
  });
}
