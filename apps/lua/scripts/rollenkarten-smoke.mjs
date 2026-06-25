// Live-Smoke: rollenkartenSet-Modus (differenziertes Rollenkarten-Set).
//   pnpm exec node --import ./scripts/_reg.mjs scripts/rollenkarten-smoke.mjs
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
const cfg = { provider: process.env.LLM_PROVIDER ?? 'deepseek', kreativitaet: 0.5 };

const meta = { stufe: 'oberstufe', fach: 'englisch', thema: 'Disaster Reports', datum: '2026-06-25', klasse: '4B', notizen: '', schwierigkeit: 'mittel', typ: 'schuluebung' };
const bloecke = [{
  typ: 'rollenkartenSet', punkte: 0, rahmen: 'Disaster Reports — live TV news', zeitMinuten: 8, anzahlSzenarien: 4,
  rollen: [
    { name: 'Live Reporter', rollenhinweis: 'Reporter at the scene. You speak first.', inhaltsLabel: 'Report on:', sprachhinweis: 'present continuous · present perfect · past simple' },
    { name: 'Safety Expert', rollenhinweis: 'Studio expert. You speak after the reporter.', inhaltsLabel: 'Advise on:', sprachhinweis: 'should / must · if …, … · imperatives' },
  ],
}];

const t0 = Date.now();
const res = await generateDocument({ meta, quelltexte: [], bloecke }, cfg);
const dt = ((Date.now() - t0) / 1000).toFixed(1);
if (!res.ok) { console.error(`✗ Generierung fehlgeschlagen (${dt}s): ${String(res.fehler).slice(0, 300)}`); process.exit(1); }
const doc = res.document;
const block = doc.bloecke.find((b) => b.typ === 'rollenkartenSet');
let fail = 0;
if (!block) { console.error('✗ kein rollenkartenSet-Block in der Ausgabe'); process.exit(1); }
const sz = block.config.szenarien ?? [];
console.log(`✓ generiert (${dt}s) · Rahmen: "${block.config.rahmen}" · ${block.config.rollen.length} Rollen · ${sz.length} Szenarien`);
for (const s of sz) {
  const ok = s.rollenInhalte.length === block.config.rollen.length && s.rollenInhalte.every((ri) => ri.punkte.length > 0);
  console.log(`   #${s.nummer} ${s.titel} — ${s.rollenInhalte.map((ri) => ri.punkte.length).join('/')} Punkte ${ok ? '' : '⚠'}`);
  if (!ok) fail++;
}
if (sz.length < 2) { console.error('✗ zu wenige Szenarien'); fail++; }

await renderDocument(doc);
const raster = buildRaster(doc); // darf NICHT crashen; rollenkartenSet → keine Kriterien
const rk = raster.bloecke.find((b) => b.typ === 'rollenkartenSet');
if (rk && rk.kriterien.length > 0) { console.error('✗ rollenkartenSet sollte kein Raster haben'); fail++; }
console.log(`✓ gerendert + Raster ok (rollenkartenSet ohne Kriterien)`);

console.log(fail === 0 ? '\n✓ Rollenkarten-Smoke bestanden.\n' : `\n✗ ${fail} Fehler.\n`);
process.exit(fail === 0 ? 0 : 1);
