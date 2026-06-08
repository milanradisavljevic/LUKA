import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { generateDocument } from '@lehrunterlagen/llm';
import { renderDocument } from '@lehrunterlagen/renderer';
import { writeFileSync, mkdirSync } from 'fs';
import { parseAndValidate } from '@lehrunterlagen/llm';

// Alle 6 Fixture-JSONs laden
import lueckentext from './fixtures/lueckentext.json';
import matching from './fixtures/matching.json';
import multipleChoice from './fixtures/multipleChoice.json';
import offeneVerstaendnisfrage from './fixtures/offeneVerstaendnisfrage.json';
import offeneSchreibaufgabe from './fixtures/offeneSchreibaufgabe.json';
import markieraufgabe from './fixtures/markieraufgabe.json';

const fixtures = [
  { name: 'lueckentext', data: lueckentext },
  { name: 'matching', data: matching },
  { name: 'multipleChoice', data: multipleChoice },
  { name: 'offeneVerstaendnisfrage', data: offeneVerstaendnisfrage },
  { name: 'offeneSchreibaufgabe', data: offeneSchreibaufgabe },
  { name: 'markieraufgabe', data: markieraufgabe },
];

mkdirSync('output', { recursive: true });

for (const { name, data } of fixtures) {
  console.log(`\n=== ${name} ===`);
  try {
    const { schueler, loesung } = await renderDocument(data as any);
    writeFileSync(`output/${name}_schueler.docx`, schueler);
    writeFileSync(`output/${name}_loesung.docx`, loesung);
    console.log(`OK: Schueler ${schueler.length}B, Loesung ${loesung.length}B`);
  } catch (e) {
    console.error(`FEHLER: ${(e as Error).message}`);
  }
}

console.log('\nAlle Dateien in packages/qa/output/');
