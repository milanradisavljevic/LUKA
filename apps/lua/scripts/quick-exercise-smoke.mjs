// Echter End-to-End-Smoke-Test: Schnelle Übung OHNE Quelltext, mit manuellen Einträgen.
// Simuliert den neuen Pfad: Dashboard-Shortcut / Step0 "Schnell ohne Quelltext".
//
// Aufruf: pnpm exec node scripts/quick-exercise-smoke.mjs
// Provider/Modell per Env: LLM_PROVIDER=deepseek LLM_MODEL=deepseek-chat

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDocument } from '../packages/llm/dist/index.js';
import { renderDocument } from '../packages/renderer/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv(join(__dirname, '..', 'src-tauri', '.env.local'));
loadEnv(join(__dirname, '..', '.env'));

const provider = process.env.LLM_PROVIDER ?? 'deepseek';
const model = process.env.LLM_MODEL;

const meta = {
  stufe: 'unterstufe',
  fach: 'deutsch',
  thema: 'Demokratie',
  datum: '2026-06-18',
  klasse: '7A',
  notizen: '',
  schwierigkeit: 'mittel',
  typ: 'schuluebung',
  punkteAusblenden: true,
};

const MANUAL_KREUZWORT = { wort: 'DEMOKRATIE', hinweis: 'Staatsform, in der das Volk mitentscheidet' };

const bloecke = [
  {
    typ: 'kreuzwortraetsel',
    punkte: 0,
    quelleId: undefined,
    anzahlWoerter: 4,
    eintraege: [MANUAL_KREUZWORT],
  },
];

console.log(`\n▶ Quick-Exercise Smoke-Test (KEIN Quelltext)  provider=${provider}  model=${model ?? '(Anbieter-Default)'}`);
console.log('  Thema: Demokratie · Block: kreuzwortraetsel · Manuelles Wort: DEMOKRATIE\n');

const cfg = { provider, kreativitaet: 0.4, ...(model ? { model } : {}) };
const t0 = Date.now();
const res = await generateDocument({ meta, quelltexte: [], bloecke }, cfg);
const dauer = ((Date.now() - t0) / 1000).toFixed(1);

if (!res.ok) {
  console.error(`✗ Generierung FEHLGESCHLAGEN nach ${res.versuche} Versuch(en), ${dauer}s`);
  console.error('  Fehler:\n  ' + String(res.fehler).split('\n').join('\n  '));
  console.error('\n--- ROHANTWORT (erste 2000 Zeichen) ---\n' + (res.rohText ?? '').slice(0, 2000));
  process.exit(1);
}

const doc = res.document;
console.log(`✓ Generierung OK  (${res.versuche} Versuch(e), ${dauer}s)`);
console.log(`  Blöcke erzeugt: ${doc.bloecke.length}`);

const kreuz = doc.bloecke.find((b) => b.typ === 'kreuzwortraetsel');
if (!kreuz) {
  console.error('✗ Kein Kreuzworträtsel-Block im generierten Dokument.');
  process.exit(1);
}

const woerter = kreuz.config.eintraege.map((e) => e.wort);
const hinweise = kreuz.config.eintraege.map((e) => e.hinweis);
console.log(`  • ${kreuz.config.eintraege.length} Kreuzwort-Einträge`);
console.log('    Wörter:', woerter.join(', '));

let fehler = [];
if (!woerter.includes(MANUAL_KREUZWORT.wort)) {
  fehler.push(`Manuelles Wort "${MANUAL_KREUZWORT.wort}" fehlt`);
}
if (!hinweise.includes(MANUAL_KREUZWORT.hinweis)) {
  fehler.push('Manueller Hinweis fehlt');
}
if (kreuz.config.eintraege.length < 2) {
  fehler.push('KI hat keine ergänzenden Einträge generiert');
}

if (fehler.length > 0) {
  console.error('\n✗ Fehler:');
  for (const f of fehler) console.error('  - ' + f);
  process.exit(1);
}

console.log('\n✓ Manuelle Einträge erhalten und KI hat ergänzt.');

const { schueler, loesung } = await renderDocument(doc);
const sPath = join(OUT, 'quick_exercise_schueler.docx');
const lPath = join(OUT, 'quick_exercise_loesung.docx');
writeFileSync(sPath, schueler);
writeFileSync(lPath, loesung);
console.log(`\n✓ DOCX geschrieben:\n  ${sPath}  (${schueler.length} B)\n  ${lPath}  (${loesung.length} B)\n`);
