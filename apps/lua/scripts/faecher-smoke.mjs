// Live-Smoke: neue Fächer. Französisch (Sprachfach → Inhalt französisch) +
// Geschichte (Sachfach → deutschsprachig). Aufruf:
//   pnpm exec node --import ./scripts/_reg.mjs scripts/faecher-smoke.mjs

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
const provider = process.env.LLM_PROVIDER ?? 'deepseek';
const cfg = { provider, kreativitaet: 0.4 };

let fail = 0;

async function run(name, meta, bloecke, check) {
  process.stdout.write(`\n▶ ${name} (fach=${meta.fach})\n`);
  const t0 = Date.now();
  const res = await generateDocument({ meta, quelltexte: [], bloecke }, cfg);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) { console.error(`✗ Generierung fehlgeschlagen (${dt}s): ${String(res.fehler).slice(0, 200)}`); fail++; return; }
  const doc = res.document;
  const aw = doc.bloecke.map((b) => b.arbeitsanweisung).join(' | ');
  console.log(`✓ OK (${dt}s) · arbeitsanweisung(en): ${aw}`);
  await renderDocument(doc); // wirft, wenn Render kaputt
  const problem = check(doc, aw);
  if (problem) { console.error(`✗ ${problem}`); fail++; } else { console.log('✓ Sprach-/Inhaltscheck bestanden.'); }
}

// Französisch: Inhalt französisch
await run('Französisch', {
  stufe: 'oberstufe', fach: 'franzoesisch', thema: 'Les réseaux sociaux',
  datum: '2026-06-23', klasse: '6A', notizen: '', schwierigkeit: 'mittel', typ: 'schuluebung',
}, [
  { typ: 'offeneVerstaendnisfrage', punkte: 8, anzahlFragen: 2 },
  { typ: 'vokabeluebung', punkte: 6, anzahlVokabeln: 5, richtung: 'de_fremd' },
], (_doc, aw) => {
  const frz = /\b(le|la|les|des|une|dans|vous|votre|écri|lis|répond|complét|texte|réseaux|sur)\b/i.test(aw);
  return frz ? null : `arbeitsanweisung wirkt nicht französisch: "${aw}"`;
});

// Geschichte: deutschsprachig
await run('Geschichte', {
  stufe: 'oberstufe', fach: 'geschichte', thema: 'Industrielle Revolution',
  datum: '2026-06-23', klasse: '7A', notizen: '', schwierigkeit: 'mittel', typ: 'schuluebung',
}, [
  { typ: 'offeneVerstaendnisfrage', punkte: 8, anzahlFragen: 2 },
], (_doc, aw) => {
  const deutsch = /[äöüß]|\b(der|die|das|und|beantworte|erkläre|nenne|beschreibe|warum|wie)\b/i.test(aw);
  return deutsch ? null : `arbeitsanweisung wirkt nicht deutsch: "${aw}"`;
});

console.log(fail === 0 ? '\n✓ Alle Fächer-Smokes bestanden.\n' : `\n✗ ${fail} Fehler.\n`);
process.exit(fail === 0 ? 0 : 1);
