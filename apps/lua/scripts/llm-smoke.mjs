// Echter End-to-End-Smoke-Test: Quelltext → LLM-Generierung → Zod-Validierung → 2x DOCX.
// Prüft die neuen/relevanten Aufgabentypen über den ECHTEN Pfad (kein Mock).
//
// Aufruf:   pnpm smoke           (lädt src-tauri/.env.local automatisch)
// Provider/Modell per Env steuerbar:
//   LLM_PROVIDER=deepseek|mistral|anthropic|openai|qwen   LLM_MODEL=<modellname>
// Default: deepseek (günstig). Keys werden aus src-tauri/.env.local gelesen.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDocument } from '../packages/llm/dist/index.js';
import { renderDocument } from '../packages/renderer/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

// API-Keys aus src-tauri/.env.local laden (alle LLM-Keys liegen dort).
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
const model = process.env.LLM_MODEL; // wenn leer: Anbieter-Default greift

// Quelltext bewusst mit LEEREM titel + herkunft 'eingabe' (Direkteingabe-Fall, der zuletzt crashte).
const meta = {
  stufe: 'oberstufe', fach: 'deutsch',
  thema: 'Anthropic und die Politik',
  datum: '2026-06-05', klasse: '7A', notizen: '',
  schwierigkeit: 'mittel',
};
const quelltexte = [{
  id: 'q1',
  titel: '',
  inhalt:
    'Das KI-Unternehmen Anthropic sucht verstärkt den Dialog mit der Politik. ' +
    'Das Unternehmen will Gespräche mit politischen Entscheidungsträgern führen, um die Regulierung ' +
    'künstlicher Intelligenz mitzugestalten. Anthropic betont, dass Sicherheit und Transparenz im ' +
    'Mittelpunkt der Entwicklung stehen müssen. Kritiker warnen jedoch, dass große Technologiekonzerne ' +
    'durch Lobbyarbeit zu viel Einfluss auf Gesetze gewinnen könnten. Befürworter halten dagegen, dass ' +
    'gerade die Fachkenntnis der Unternehmen für sinnvolle Regeln unverzichtbar sei. Die Debatte zeigt, ' +
    'wie eng technologische Entwicklung und gesellschaftliche Verantwortung inzwischen miteinander verflochten sind.',
  herkunft: { typ: 'eingabe', ref: '' },
}];

const bloecke = [
  { typ: 'wordScramble', punkte: 6, quelleId: 'q1', anzahlWoerter: 6 },
  // wortbank nur bei Unterstufe erlaubt → hier (Oberstufe) false. Siehe Schema-Refinement.
  { typ: 'lueckentext', punkte: 5, quelleId: 'q1', anzahlLuecken: 5, wortbank: false, distraktoren: 0 },
  { typ: 'matching', punkte: 8, quelleId: 'q1', anzahlItems: 4 },
  { typ: 'offeneSchreibaufgabe', punkte: 20, quelleId: 'q1',
    textsorte: 'Kommentar', umfangWorte: { min: 150, max: 200 }, aspekte: ['Inhaltliche Auseinandersetzung', 'eigene Meinung'] },
  { typ: 'kreuzwortraetsel', punkte: 6, quelleId: 'q1', anzahlWoerter: 5 },
  { typ: 'wortgitter', punkte: 5, quelleId: 'q1', anzahlWoerter: 5 },
];

console.log(`\n▶ Smoke-Test  provider=${provider}  model=${model ?? '(Anbieter-Default)'}`);
console.log(`  Blöcke: ${bloecke.map((b) => b.typ).join(', ')}\n`);

const cfg = { provider, kreativitaet: 0.4, ...(model ? { model } : {}) };
const t0 = Date.now();
const res = await generateDocument({ meta, quelltexte, bloecke }, cfg);
const dauer = ((Date.now() - t0) / 1000).toFixed(1);

if (!res.ok) {
  console.error(`✗ Generierung FEHLGESCHLAGEN nach ${res.versuche} Versuch(en), ${dauer}s`);
  console.error('  Fehler:\n  ' + String(res.fehler).split('\n').join('\n  '));
  console.error('\n--- ROHANTWORT (erste 1500 Zeichen) ---\n' + (res.rohText ?? '').slice(0, 1500));
  process.exit(1);
}

const doc = res.document;
console.log(`✓ Generierung OK  (${res.versuche} Versuch(e), ${dauer}s)`);
console.log(`  Blöcke erzeugt: ${doc.bloecke.length}`);
for (const b of doc.bloecke) {
  // kompakter Inhalts-Check pro Typ
  let info = '';
  if (b.typ === 'wordScramble') info = `wort="${b.config.wort}" → ${b.loesung.korrektAnordnung.length} Teile`;
  else if (b.typ === 'lueckentext') info = `${b.loesung.luecken.length} Lücken, wortbank=${b.config.wortbank}`;
  else if (b.typ === 'matching') info = `${Object.keys(b.loesung.zuordnung).length} Zuordnungen`;
  else if (b.typ === 'offeneSchreibaufgabe') info = `Musterlösung ${b.loesung.musterloesung.length} Zeichen`;
  else if (b.typ === 'kreuzwortraetsel') info = `${b.config.eintraege.length} Wörter`;
  else if (b.typ === 'wortgitter') info = `${b.config.woerter.length} Wörter`;
  console.log(`    • ${b.typ.padEnd(22)} ${b.punkte}P  ${info}`);
}

const { schueler, loesung } = await renderDocument(doc);
const sPath = join(OUT, 'smoke_schueler.docx');
const lPath = join(OUT, 'smoke_loesung.docx');
writeFileSync(sPath, schueler);
writeFileSync(lPath, loesung);
console.log(`\n✓ DOCX geschrieben:\n  ${sPath}  (${schueler.length} B)\n  ${lPath}  (${loesung.length} B)\n`);
