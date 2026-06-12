// Echter End-to-End-Smoke für den KOMPETENZ-MODUS: Stoff-Item → LLM erfindet Übung
// (umformung + fehlerkorrektur) OHNE Quelltext → Zod-Validierung → DOCX.
// Aufruf:  node scripts/kompetenz-smoke.mjs     (DeepSeek default)

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDocument } from '../packages/llm/dist/index.js';
import { renderDocument, renderCoverage } from '../packages/renderer/dist/index.js';

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

const stoffItem = {
  id: 's-pastperfect', rahmenwerk: 'at-lehrplan', titel: 'Past Perfect',
  fach: 'englisch', stufe: 'oberstufe', kategorie: 'grammatik', deskriptorIds: [],
};

const meta = {
  stufe: 'oberstufe', fach: 'englisch', thema: 'Travelling',
  datum: '2026-06-11', klasse: '', notizen: '', schwierigkeit: 'mittel',
  modus: 'kompetenz', rahmenwerk: 'at-lehrplan',
  stoffItemIds: [stoffItem.id], kompetenzNiveau: 'standard',
  punkteAusblenden: true,
};

const bloecke = [
  { typ: 'umformung', punkte: 6, anzahlAufgaben: 3 },
  { typ: 'fehlerkorrektur', punkte: 4, anzahlSaetze: 3 },
  { typ: 'lueckentext', punkte: 5, anzahlLuecken: 5, wortbank: true, distraktoren: 2 },
  { typ: 'kategorisierung', punkte: 6, anzahlItems: 6, kategorien: ['Past Simple', 'Present Perfect'] },
];

console.log(`\n▶ KOMPETENZ-Smoke  provider=${provider}  model=${model ?? '(Default)'}`);
console.log(`  Kompetenz: "${stoffItem.titel}"  Blöcke: ${bloecke.map((b) => b.typ).join(', ')}\n`);

const cfg = { provider, kreativitaet: 0.3, ...(model ? { model } : {}) };
// JUDGE=1 aktiviert den grammatik-bewussten Kompetenz-Judge (zusätzliche LLM-Calls).
const judgeCfg = process.env.JUDGE ? { provider, enabled: true } : undefined;
if (judgeCfg) console.log('  (Kompetenz-Judge aktiv)\n');
const t0 = Date.now();
const res = await generateDocument({ meta, quelltexte: [], bloecke, stoffItems: [stoffItem] }, cfg, judgeCfg);
const dauer = ((Date.now() - t0) / 1000).toFixed(1);

if (!res.ok) {
  console.error(`✗ FEHLGESCHLAGEN nach ${res.versuche} Versuch(en), ${dauer}s`);
  console.error('  Fehler:\n  ' + String(res.fehler).split('\n').join('\n  '));
  console.error('\n--- ROHANTWORT (erste 2000 Zeichen) ---\n' + (res.rohText ?? '').slice(0, 2000));
  process.exit(1);
}

const doc = res.document;
console.log(`✓ Generierung OK  (${res.versuche} Versuch(e), ${dauer}s, ${doc.bloecke.length} Blöcke)\n`);
for (const b of doc.bloecke) {
  if (b.typ === 'umformung') {
    console.log(`  ── UMFORMUNG (${b.punkte}P): ${b.arbeitsanweisung}`);
    for (const a of b.config.aufgaben) console.log(`     ${a.nr}. „${a.ausgangssatz}"  → [${a.zielstruktur}]`);
    for (const l of b.loesung.loesungen) console.log(`     ✓ ${l.nr}. „${l.umformulierung}"`);
  } else if (b.typ === 'fehlerkorrektur') {
    console.log(`\n  ── FEHLERKORREKTUR (${b.punkte}P): ${b.arbeitsanweisung}`);
    for (const s of b.config.saetze) console.log(`     ${s.nr}. „${s.satz}"  (${s.anzahlFehler} Fehler)`);
    for (const k of b.loesung.korrekturen) console.log(`     ✓ ${k.nr}. „${k.korrigierterSatz}"  [${k.fehler.map((f) => f.art).join(',')}]`);
  }
}

const { schueler, loesung } = await renderDocument(doc);
writeFileSync(join(OUT, 'kompetenz_schueler.docx'), schueler);
writeFileSync(join(OUT, 'kompetenz_loesung.docx'), loesung);
console.log(`\n✓ DOCX geschrieben (${schueler.length} B / ${loesung.length} B)\n`);

// Kompetenznachweis (Coverage) — Renderer-Pfad end-to-end (A.3). Beispiel-Deskriptoren
// (die Mengenlogik selbst ist in coverage.test.ts unit-getestet).
const abgedeckt = [
  { bereich: 'Grammatik', code: 'EN-OB-2', text: 'Past Perfect: Vorzeitigkeit und Handlungsabfolge korrekt bilden.' },
];
const fehlend = [
  { bereich: 'Grammatik', code: 'EN-OB-3', text: 'Konditionalsätze (Type 1–3) bilden.' },
  { bereich: 'Grammatik', code: 'EN-OB-4', text: 'Passivkonstruktionen in verschiedenen Zeiten umformen.' },
];
const nachweis = await renderCoverage(
  { fach: meta.fach, stufe: meta.stufe, thema: meta.thema, datum: meta.datum, klasse: meta.klasse },
  abgedeckt, fehlend,
);
writeFileSync(join(OUT, 'kompetenz_nachweis.docx'), nachweis);
console.log(`✓ Kompetenznachweis-DOCX geschrieben (${nachweis.length} B): ${abgedeckt.length} abgedeckt / ${fehlend.length} offen\n`);
