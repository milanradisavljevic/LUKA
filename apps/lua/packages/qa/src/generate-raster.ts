import { buildRaster } from './korrekturraster/builder';
import { renderRaster } from '@lehrunterlagen/renderer';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';

const fixtures = [
  'lueckentext', 'matching', 'multipleChoice',
  'offeneVerstaendnisfrage', 'offeneSchreibaufgabe', 'markieraufgabe'
];

mkdirSync('output', { recursive: true });

for (const name of fixtures) {
  const data = JSON.parse(readFileSync(`./src/fixtures/${name}.json`, 'utf-8'));
  const raster = buildRaster(data);
  const buf = await renderRaster(raster);
  writeFileSync(`output/${name}_raster.docx`, buf);
  console.log(`${name}_raster.docx: ${buf.length}B`);
}
console.log('Fertig!');
