import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { generateDocument } from '@lehrunterlagen/llm';
import { renderDocument } from '@lehrunterlagen/renderer';
import { writeFileSync, mkdirSync } from 'fs';

const input = {
  meta: {
    stufe: 'oberstufe' as const,
    fach: 'deutsch' as const,
    thema: 'Medienkonsum und Jugendliche',
    datum: '2026-05-30',
    klasse: '7A',
    notizen: '',
  },
  quelltexte: [
    {
      id: 'q1',
      titel: 'Social Media und das Wohlbefinden',
      inhalt: 'Die Nutzung von sozialen Medien hat in den letzten Jahren stark zugenommen. Besonders Jugendliche verbringen jeden Tag mehrere Stunden auf Plattformen wie Instagram und TikTok. Einige Studien zeigen positive Effekte auf soziale Kontakte, doch es gibt auch Hinweise auf Angst und ein geringeres Selbstwertgefuehl.',
      herkunft: { typ: 'upload' as const, ref: 'text.txt' },
    },
  ],
  bloecke: [
    { typ: 'lueckentext' as const, punkte: 8, quelleId: 'q1', anzahlLuecken: 4, wortbank: false, distraktoren: 0 },
    { typ: 'multipleChoice' as const, punkte: 4, quelleId: 'q1', anzahlFragen: 2, mehrfach: false },
    { typ: 'matching' as const, punkte: 6, quelleId: 'q1', anzahlItems: 3 },
  ],
};

console.log('Starte API-Call (lueckentext + MC + matching)...');
const gen = await generateDocument(input, { provider: 'anthropic' });

if (!gen.ok) {
  console.error('FEHLER:', gen.fehler);
  // Versuche das JSON zu parsen und anzuzeigen
  try {
    const { extractJson } = await import('@lehrunterlagen/llm');
    const json = extractJson(gen.rohText ?? '');
    const parsed = JSON.parse(json);
    const mc = parsed.bloecke?.find((b: any) => b.typ === 'multipleChoice');
    if (mc) {
      console.error('MC loesung:', JSON.stringify(mc.loesung, null, 2));
    }
  } catch (e) {
    console.error('Rohtext (2000 Zeichen):', gen.rohText?.slice(0, 2000));
  }
  process.exit(1);
}

console.log('Dokument generiert, rendere...');
const { schueler, loesung } = await renderDocument(gen.document);

mkdirSync('output', { recursive: true });
writeFileSync('output/schueler_3blocks.docx', schueler);
writeFileSync('output/loesung_3blocks.docx', loesung);

console.log('Fertig! Dateien in packages/qa/output/');
console.log('Schueler:', schueler.length, 'Bytes');
console.log('Loesung:', loesung.length, 'Bytes');
