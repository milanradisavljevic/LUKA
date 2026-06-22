// Echter End-to-End-Smoke-Test: Selbsteinschätzungsbogen.
// Generiert ein reales Dokument (DeepSeek) mit Lernzielen + Schreibaufgabe + Verständnisfrage,
// baut das Korrekturraster, rendert den Selbsteinschätzungsbogen und prüft den Inhalt.
//
// Aufruf: pnpm exec node scripts/selbsteinschaetzung-smoke.mjs

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gunzipSync, inflateRawSync } from 'node:zlib';
import { generateDocument } from '../packages/llm/dist/index.js';
import { buildRaster } from '../packages/qa/dist/korrekturraster/builder.js';
import { renderSelbsteinschaetzungToBlob } from '../packages/renderer/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv(join(__dirname, '..', 'src-tauri', '.env.local'));
loadEnv(join(__dirname, '..', '.env'));

const provider = process.env.LLM_PROVIDER ?? 'deepseek';
const model = process.env.LLM_MODEL;

const meta = {
  stufe: 'oberstufe', fach: 'deutsch', thema: 'Soziale Medien und Meinungsbildung',
  datum: '2026-06-18', klasse: '7A', notizen: '', schwierigkeit: 'mittel', typ: 'schularbeit',
  lernziele: ['einen argumentativen Kommentar verfassen', 'zentrale Aussagen eines Textes erkennen'],
};

const bloecke = [
  { typ: 'offeneSchreibaufgabe', punkte: 20, textsorte: 'Kommentar',
    situation: 'Leserbrief an eine Tageszeitung', umfangWorte: { min: 270, max: 330 },
    aspekte: ['eigene Position mit Begründung', 'zwei Argumente', 'sachliche Sprache'] },
  { typ: 'offeneVerstaendnisfrage', punkte: 8, anzahlFragen: 2 },
];

console.log(`\n▶ Selbsteinschätzungs-Smoke  provider=${provider}  model=${model ?? '(Default)'}`);
console.log('  Thema: Soziale Medien · Lernziele: 2 · Blöcke: Schreibaufgabe + Verständnisfrage\n');

const cfg = { provider, kreativitaet: 0.4, ...(model ? { model } : {}) };
const t0 = Date.now();
const res = await generateDocument({ meta, quelltexte: [], bloecke }, cfg);
const dauer = ((Date.now() - t0) / 1000).toFixed(1);

if (!res.ok) {
  console.error(`✗ Generierung FEHLGESCHLAGEN nach ${res.versuche} Versuch(en), ${dauer}s`);
  console.error('  ' + String(res.fehler).split('\n').join('\n  '));
  process.exit(1);
}
const doc = res.document;
console.log(`✓ Generierung OK (${res.versuche} Versuch(e), ${dauer}s) · ${doc.bloecke.length} Blöcke`);

const raster = buildRaster(doc);
const kriterien = [...new Set(raster.bloecke.flatMap((b) => b.kriterien.map((k) => k.kriterium)))];
console.log(`  Raster-Kriterien (eindeutig): ${kriterien.length} → ${kriterien.join(', ')}`);
console.log(`  Lernziele: ${(doc.meta.lernziele ?? []).join(' · ') || '(keine)'}`);

const blob = await renderSelbsteinschaetzungToBlob(raster, doc.meta.lernziele ?? []);
const buf = Buffer.from(await blob.arrayBuffer());
const path = join(OUT, 'selbsteinschaetzung.docx');
writeFileSync(path, buf);

// document.xml aus dem DOCX (ZIP) extrahieren — Central Directory nach Dateinamen durchsuchen.
function extractDocumentXml(zip) {
  // Lokale File-Header durchgehen (Signatur PK\x03\x04).
  let i = 0;
  while ((i = zip.indexOf('PK\x03\x04', i)) !== -1) {
    const method = zip.readUInt16LE(i + 8);
    const compSize = zip.readUInt32LE(i + 18);
    const nameLen = zip.readUInt16LE(i + 26);
    const extraLen = zip.readUInt16LE(i + 28);
    const name = zip.slice(i + 30, i + 30 + nameLen).toString('utf8');
    const dataStart = i + 30 + nameLen + extraLen;
    if (name === 'word/document.xml') {
      const data = zip.slice(dataStart, dataStart + compSize);
      return method === 8 ? inflateRawSync(data).toString('utf8') : data.toString('utf8');
    }
    i = dataStart + compSize;
  }
  return '';
}

const xml = extractDocumentXml(buf);
const fehler = [];
if (!xml.includes('Selbsteinschätzung')) fehler.push('Titel "Selbsteinschätzung" fehlt');
if (!xml.includes('Ich kann:')) fehler.push('Lernziel-Aussage "Ich kann:" fehlt');
if (kriterien.length > 0 && !xml.includes(kriterien[0])) fehler.push(`Kriterium "${kriterien[0]}" fehlt im DOCX`);
if (buf.length < 2000) fehler.push('DOCX verdächtig klein');

if (fehler.length > 0) {
  console.error('\n✗ Fehler:');
  for (const f of fehler) console.error('  - ' + f);
  console.error(`\n  DOCX: ${path} (${buf.length} B)`);
  process.exit(1);
}

console.log(`\n✓ Selbsteinschätzungsbogen enthält Titel + "Ich kann:" + Kriterien.`);
console.log(`✓ DOCX geschrieben: ${path} (${buf.length} B)\n`);
