// Live-Smoke: SRDP-Matura-Modus (Deutsch + Englisch).
//   pnpm exec node --import ./scripts/_reg.mjs scripts/srdp-smoke.mjs

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDocument } from '../packages/llm/dist/index.js';
import { renderDocument } from '../packages/renderer/dist/index.js';
import { buildRaster } from '../packages/qa/dist/korrekturraster/builder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv(join(__dirname, '..', 'src-tauri', '.env.local'));
loadEnv(join(__dirname, '..', '.env'));
const cfg = { provider: process.env.LLM_PROVIDER ?? 'deepseek', kreativitaet: 0.4 };
let fail = 0;

async function run(name, fach, quelltext, expectKriterium, sprachprobe) {
  process.stdout.write(`\n▶ Matura SRDP — ${name}\n`);
  const meta = { stufe: 'oberstufe', fach, thema: name, datum: '2026-06-24', klasse: '8A', notizen: '', schwierigkeit: 'schwer', typ: 'matura' };
  const bloecke = [
    { typ: 'offeneVerstaendnisfrage', punkte: 12, anzahlFragen: 2 },
    { typ: 'offeneSchreibaufgabe', punkte: 48, textsorte: fach === 'deutsch' ? 'Erörterung' : 'Argumentative essay', situation: 'SRDP-Klausur', umfangWorte: { min: 405, max: 495 }, aspekte: ['Position', 'Argumente', 'Struktur'] },
  ];
  const t0 = Date.now();
  const res = await generateDocument({ meta, quelltexte: [{ id: 'q1', titel: 'Beilage', inhalt: quelltext, herkunft: { typ: 'eingabe', ref: '' } }], bloecke }, cfg);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) { console.error(`✗ Generierung fehlgeschlagen (${dt}s): ${String(res.fehler).slice(0, 200)}`); fail++; return; }
  const doc = res.document;
  await renderDocument(doc);
  const raster = buildRaster(doc);
  const kriterien = raster.bloecke.flatMap((b) => b.kriterien.map((k) => k.kriterium));
  const aw = doc.bloecke.map((b) => b.arbeitsanweisung).join(' | ');
  console.log(`✓ OK (${dt}s) · ${doc.bloecke.length} Blöcke · Raster-Kriterien: ${[...new Set(kriterien)].join(', ')}`);
  if (!kriterien.includes(expectKriterium)) { console.error(`✗ Erwartetes SRDP-Kriterium "${expectKriterium}" fehlt`); fail++; }
  if (!sprachprobe.test(aw + ' ' + JSON.stringify(doc.bloecke).slice(0, 2000))) { console.error('✗ Sprache unerwartet'); fail++; }
}

await run('Soziale Medien', 'deutsch', 'Soziale Medien prägen den Alltag Jugendlicher zunehmend stark.', 'K1 — Inhalt', /[äöüß]|\b(der|die|und|Quelle|Text|beantworte)\b/i);
await run('Social Media', 'englisch', 'Social media increasingly shapes the daily life of teenagers.', 'Task Achievement', /\b(the|and|read|write|answer|essay|text)\b/i);

console.log(fail === 0 ? '\n✓ SRDP-Smoke bestanden (DE + EN).\n' : `\n✗ ${fail} Fehler.\n`);
process.exit(fail === 0 ? 0 : 1);
