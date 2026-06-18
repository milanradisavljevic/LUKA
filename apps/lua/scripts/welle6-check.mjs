// Live-Check Welle 6b: Schreibaufgaben-Situation variiert (nicht immer Schülerzeitung)?
// + Regression: Generierung läuft end-to-end nach den Prompt-Änderungen.
// Aufruf:  LLM_PROVIDER=deepseek node scripts/welle6-check.mjs   (Keys aus src-tauri/.env.local)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDocument } from '../packages/llm/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
const cfg = { provider, kreativitaet: 0.5, ...(model ? { model } : {}) };

// Drei verschiedene Themen → schaut, ob die Schreibsituation variiert.
const THEMEN = [
  { thema: 'Social Media und Jugendliche', quelle: 'Soziale Medien praegen den Alltag Jugendlicher stark. Befuerworter sehen Vernetzung und Information, Kritiker warnen vor Sucht und Vergleichsdruck.' },
  { thema: 'Klimawandel und Verkehr', quelle: 'Der Verkehr verursacht einen grossen Teil der Treibhausgase. Massnahmen wie Tempolimits oder Ausbau des oeffentlichen Verkehrs werden kontrovers diskutiert.' },
  { thema: 'Kuenstliche Intelligenz in der Schule', quelle: 'KI-Werkzeuge halten Einzug in den Unterricht. Einige sehen Lernchancen, andere fuerchten Taeuschung und Verlust eigener Faehigkeiten.' },
];

console.log(`\n▶ Welle-6b-Check  provider=${provider}\n`);
let varianten = [];
for (const t of THEMEN) {
  const input = {
    meta: { stufe: 'oberstufe', fach: 'deutsch', thema: t.thema, datum: '2026-06-16', klasse: '7A', notizen: '', schwierigkeit: 'mittel' },
    quelltexte: [{ id: 'q1', titel: '', inhalt: t.quelle, herkunft: { typ: 'eingabe', ref: '' } }],
    bloecke: [
      { typ: 'matching', punkte: 8, quelleId: 'q1', anzahlItems: 4 },
      { typ: 'offeneSchreibaufgabe', punkte: 20, quelleId: 'q1', textsorte: 'Kommentar', umfangWorte: { min: 200, max: 300 }, aspekte: ['eigene Position', 'Argumente aus dem Text'] },
    ],
  };
  const res = await generateDocument(input, cfg);
  if (!res.ok) { console.error(`✗ FEHLER (${t.thema}): ${String(res.fehler).slice(0, 300)}`); continue; }
  const schreib = res.document.bloecke.find((b) => b.typ === 'offeneSchreibaufgabe');
  const match = res.document.bloecke.find((b) => b.typ === 'matching');
  const situation = schreib?.config?.situation ?? '(keine)';
  varianten.push(situation);
  console.log(`■ ${t.thema}`);
  console.log(`   Situation: ${situation}`);
  console.log(`   matching: 1 Block, ${match?.config?.items?.length ?? 0} Paare\n`);
}

const schuelerzeitung = varianten.filter((s) => /sch(ü|ue)lerzeitung/i.test(s)).length;
console.log(`Schülerzeitung-Treffer: ${schuelerzeitung}/${varianten.length}  (Ziel: niedrig/variiert)`);
