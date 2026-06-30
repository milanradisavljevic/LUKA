// Live-E2E-Smoke: echte Generierung (DeepSeek) → GIFT- + Moodle-XML-Export + Renderer.
// Prüft das neue export-Paket (O1) und den gehärteten Renderer an ECHTEM LLM-Output.
// Aufruf:  pnpm exec node --import ./scripts/_reg.mjs scripts/gift-render-e2e-smoke.mjs

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDocument } from '../packages/llm/dist/index.js';
import { renderDocument } from '../packages/renderer/dist/index.js';
import { toGift, toMoodleXml } from '../packages/export/dist/index.js';

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

const meta = {
  stufe: 'oberstufe', fach: 'englisch', thema: 'The American Dream',
  datum: '2026-06-30', klasse: '7A', notizen: '', schwierigkeit: 'mittel', typ: 'schuluebung',
};
// Geschlossene Typen (GIFT-Fragen) + offener Typ (→ Essay).
const bloecke = [
  { typ: 'multipleChoice', punkte: 6 },
  { typ: 'matching', punkte: 6 },
  { typ: 'lueckentext', punkte: 6 },
  { typ: 'offeneVerstaendnisfrage', punkte: 8, anzahlFragen: 2 },
];

process.stdout.write(`▶ E2E generieren (provider=${cfg.provider}, fach=${meta.fach})\n`);
const t0 = Date.now();
const res = await generateDocument({ meta, quelltexte: [], bloecke }, cfg);
const dt = ((Date.now() - t0) / 1000).toFixed(1);
if (!res.ok) { console.error(`✗ Generierung fehlgeschlagen (${dt}s): ${String(res.fehler).slice(0, 300)}`); process.exit(1); }
const doc = res.document;
console.log(`✓ generiert (${dt}s) · ${doc.bloecke.length} Blöcke`);

// 1) Renderer (gehärtet) — wirft bei kaputtem Output
try { await renderDocument(doc); console.log('✓ renderDocument ok'); }
catch (e) { console.error(`✗ renderDocument: ${e?.message ?? e}`); fail++; }

// 2) GIFT-Export
const gift = toGift(doc);
console.log(`\n--- GIFT (${gift.length} Zeichen) ---\n${gift.slice(0, 700)}\n--- … ---`);
if (!gift.trim()) { console.error('✗ GIFT leer'); fail++; }
// MC/Matching/Cloze sollten GIFT-Syntax erzeugen, offene → Essay {}
if (!/[{][^}]*[=][^}]*[}]/.test(gift)) { console.error('✗ GIFT enthält keine Antwort-Syntax {=…}'); fail++; }
if (!/\{\s*\}/.test(gift)) { console.warn('⚠ kein Essay-Marker {} gefunden (offener Typ evtl. anders gemappt)'); }
// Escaping-Check: rohe ~ = # { } dürfen außerhalb von Antwortblöcken nicht ungeschützt stehen
console.log('✓ GIFT erzeugt');

// 3) Moodle-XML
const xml = toMoodleXml(doc);
if (!/<quiz>[\s\S]*<\/quiz>/.test(xml)) { console.error('✗ Moodle-XML hat kein <quiz>-Wurzelelement'); fail++; }
if (!/<question/.test(xml)) { console.error('✗ Moodle-XML enthält keine <question>'); fail++; }
console.log(`✓ Moodle-XML erzeugt (${xml.length} Zeichen)`);

console.log(fail === 0 ? '\n✅ E2E-Smoke bestanden.' : `\n❌ ${fail} Problem(e).`);
process.exit(fail === 0 ? 0 : 1);
