// Live-Smoke: Kompetenz-Modus für ein Sachfach (Geschichte) — deutschsprachig.
//   pnpm exec node --import ./scripts/_reg.mjs scripts/kompetenz-geschichte-smoke.mjs

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDocument } from '../packages/llm/dist/index.js';
import { renderDocument } from '../packages/renderer/dist/index.js';

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

const stoffItem = {
  id: 'gesch-quellenkritik-ob', rahmenwerk: 'at-lehrplan', titel: 'Quellenkritische Analyse',
  fach: 'geschichte', stufe: 'oberstufe', kategorie: 'Historische Methodenkompetenz', deskriptorIds: [],
};
const meta = {
  stufe: 'oberstufe', fach: 'geschichte', thema: 'Industrielle Revolution', datum: '2026-06-24',
  klasse: '7A', notizen: '', schwierigkeit: 'mittel', modus: 'kompetenz',
  rahmenwerk: 'at-lehrplan', stoffItemIds: [stoffItem.id], kompetenzNiveau: 'standard', punkteAusblenden: true,
};
const bloecke = [
  { typ: 'offeneVerstaendnisfrage', punkte: 8, anzahlFragen: 2 },
  { typ: 'multipleChoice', punkte: 6, anzahlFragen: 3, mehrfach: false },
];

console.log(`\n▶ Kompetenz-Smoke Geschichte  provider=${cfg.provider}\n`);
const t0 = Date.now();
const res = await generateDocument({ meta, quelltexte: [], bloecke, stoffItems: [stoffItem] }, cfg);
const dt = ((Date.now() - t0) / 1000).toFixed(1);
if (!res.ok) { console.error(`✗ Fehlgeschlagen (${dt}s): ${String(res.fehler).slice(0, 300)}`); process.exit(1); }
const doc = res.document;
const probe = (doc.bloecke.map((b) => b.arbeitsanweisung).join(' | ') + ' ' + JSON.stringify(doc.bloecke)).slice(0, 3000);
console.log(`✓ OK (${dt}s) · ${doc.bloecke.length} Blöcke · ${doc.bloecke.map((b)=>b.arbeitsanweisung).join(' | ')}`);
await renderDocument(doc);
const deutsch = /[äöüß]|\b(der|die|das|und|beantworte|erkläre|nenne|warum|Quelle|Revolution)\b/i.test(probe);
if (!deutsch) { console.error('✗ Inhalt wirkt nicht deutsch.'); process.exit(1); }
console.log('✓ Kompetenz-Pfad Sachfach: deutschsprachig, rendert.\n');
