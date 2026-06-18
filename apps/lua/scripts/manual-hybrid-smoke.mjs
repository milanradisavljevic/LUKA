// Echter End-to-End-Smoke-Test für manuelle/hybride Eingaben.
// Prüft, dass vom Nutzer vorgegebene Einträge im generierten Dokument erhalten bleiben.
//
// Aufruf: pnpm exec node scripts/manual-hybrid-smoke.mjs
// Provider/Modell per Env: LLM_PROVIDER=deepseek LLM_MODEL=deepseek-chat
// Default: deepseek (günstig). Keys werden aus src-tauri/.env.local oder .env gelesen.

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
const model = process.env.LLM_MODEL;

const meta = {
  stufe: 'unterstufe',
  fach: 'deutsch',
  thema: 'Demokratie',
  datum: '2026-06-18',
  klasse: '7A',
  notizen: '',
  schwierigkeit: 'mittel',
};

const quelltexte = [{
  id: 'q1',
  titel: 'Demokratie',
  inhalt:
    'In einer Demokratie entscheiden die Bürgerinnen und Bürger gemeinsam über ihre Angelegenheiten. ' +
    'Wahlen sind ein zentrales Instrument, um Vertreterinnen und Vertreter zu wählen. ' +
    'Gleichzeitig schützt die Verfassung Minderheiten und garantiert Grundrechte wie Meinungsfreiheit.',
  herkunft: { typ: 'eingabe', ref: '' },
}];

// Manuelle Vorgaben, die das LLM wortgleich übernehmen und nur mit eigenen Einträgen ergänzen soll.
const MANUAL_KREUZWORT = { wort: 'DEMOKRATIE', hinweis: 'Staatsform, in der das Volk mitentscheidet' };
const MANUAL_WORTGITTER = 'BÜRGER';
const MANUAL_VOKABEL = { deutsch: 'Wahl', fremdsprache: 'election', kontextsatz: 'Bei der Wahl entscheiden die Bürger.' };
const MANUAL_FEHLER = { nr: 1, satz: 'In einer Demokratie haben alle Bürgerinnen und Bürger das Recht zu wählen.', anzahlFehler: 0 };
const MANUAL_SCRAMBLE = { wort: 'In einer Demokratie entscheiden die Bürger gemeinsam.' };

const bloecke = [
  {
    typ: 'kreuzwortraetsel',
    punkte: 6,
    quelleId: 'q1',
    anzahlWoerter: 4,
    eintraege: [MANUAL_KREUZWORT],
  },
  {
    typ: 'wortgitter',
    punkte: 5,
    quelleId: 'q1',
    anzahlWoerter: 4,
    woerter: [MANUAL_WORTGITTER],
  },
  {
    typ: 'vokabeluebung',
    punkte: 6,
    quelleId: 'q1',
    anzahlVokabeln: 4,
    richtung: 'de_fremd',
    vokabeln: [MANUAL_VOKABEL],
  },
  {
    typ: 'fehlerkorrektur',
    punkte: 6,
    quelleId: 'q1',
    anzahlSaetze: 3,
    saetze: [MANUAL_FEHLER],
  },
  {
    typ: 'wordScramble',
    punkte: 4,
    quelleId: 'q1',
    anzahlSaetze: 3,
    saetze: [MANUAL_SCRAMBLE],
  },
];

console.log(`\n▶ Manual/Hybrid Smoke-Test  provider=${provider}  model=${model ?? '(Anbieter-Default)'}`);
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
console.log(`  Blöcke erzeugt: ${doc.bloecke.length}\n`);

let fehler = [];

for (const b of doc.bloecke) {
  if (b.typ === 'kreuzwortraetsel') {
    const woerter = b.config.eintraege.map((e) => e.wort);
    const hinweise = b.config.eintraege.map((e) => e.hinweis);
    console.log(`  • ${b.typ}: ${woerter.length} Einträge`);
    if (!woerter.includes(MANUAL_KREUZWORT.wort)) {
      fehler.push(`kreuzwortraetsel: manuelles Wort "${MANUAL_KREUZWORT.wort}" fehlt`);
    }
    if (!hinweise.includes(MANUAL_KREUZWORT.hinweis)) {
      fehler.push(`kreuzwortraetsel: manueller Hinweis fehlt`);
    }
  }

  if (b.typ === 'wortgitter') {
    console.log(`  • ${b.typ}: ${b.config.woerter.length} Wörter`);
    if (!b.config.woerter.includes(MANUAL_WORTGITTER)) {
      fehler.push(`wortgitter: manuelles Wort "${MANUAL_WORTGITTER}" fehlt`);
    }
  }

  if (b.typ === 'vokabeluebung') {
    console.log(`  • ${b.typ}: ${b.config.vokabeln.length} Vokabeln`);
    const gefunden = b.config.vokabeln.some(
      (v) => v.deutsch === MANUAL_VOKABEL.deutsch && v.fremdsprache === MANUAL_VOKABEL.fremdsprache,
    );
    if (!gefunden) {
      fehler.push(`vokabeluebung: manuelle Vokabel "${MANUAL_VOKABEL.deutsch}" fehlt`);
    }
  }

  if (b.typ === 'fehlerkorrektur') {
    console.log(`  • ${b.typ}: ${b.config.saetze.length} Sätze`);
    const gefunden = b.config.saetze.some((s) => s.satz === MANUAL_FEHLER.satz);
    if (!gefunden) {
      fehler.push(`fehlerkorrektur: manueller Satz fehlt`);
    }
  }

  if (b.typ === 'wordScramble') {
    console.log(`  • ${b.typ}: ${b.config.saetze.length} Sätze`);
    const gefunden = b.config.saetze.some((s) => s.wort === MANUAL_SCRAMBLE.wort);
    if (!gefunden) {
      console.log('    Generierte Sätze:', b.config.saetze.map((s) => s.wort));
      fehler.push(`wordScramble: manueller Satz fehlt`);
    }
  }
}

if (fehler.length > 0) {
  console.error('\n✗ Manuelle Einträge wurden nicht vollständig übernommen:');
  for (const f of fehler) console.error('  - ' + f);
  process.exit(1);
}

console.log('\n✓ Alle manuellen Einträge wurden übernommen.');

const { schueler, loesung } = await renderDocument(doc);
const sPath = join(OUT, 'manual_hybrid_schueler.docx');
const lPath = join(OUT, 'manual_hybrid_loesung.docx');
writeFileSync(sPath, schueler);
writeFileSync(lPath, loesung);
console.log(`\n✓ DOCX geschrieben:\n  ${sPath}  (${schueler.length} B)\n  ${lPath}  (${loesung.length} B)\n`);
