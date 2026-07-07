#!/usr/bin/env node
// Bulk-Aufgabenpool-Pipeline (Phase C, docs/PLAN-neue-faecher-2026-07.md).
//
// Generiert per LLM (Kompetenz-Modus, kein Quelltext-Pflicht) einen kuratierten
// Entwurfs-Pool an Aufgaben für die zwei neuen AHS-Pflichtfächer "Medien und
// Demokratie" (mediendemokratie) und "Informatik und Künstliche Intelligenz"
// (informatikki). Jeder erzeugte Block wird zu einem PoolEntry (siehe
// apps/web/src/lib/pool.ts) mit quelleHinweis "LLM-Entwurf, ungeprüft" und
// landet als JSON-Array in scripts/out/aufgabenpool-draft.json — Review-Pass
// (Milan/Kimi) und anschließendes Seeding (`cargo run --bin seed_pool`) folgen
// AUSSERHALB dieses Skripts.
//
// Aufruf:
//   node scripts/generate-aufgabenpool-draft.mjs                 # echte LLM-Läufe, kostet API
//   node scripts/generate-aufgabenpool-draft.mjs --dry-run        # nur Struktur/Kombis pruefen, keine API-Calls
//   node scripts/generate-aufgabenpool-draft.mjs --only mediendemokratie
//   node scripts/generate-aufgabenpool-draft.mjs --out custom.json
//
// Provider/Modell per Env steuerbar (Muster: scripts/llm-smoke.mjs):
//   LLM_PROVIDER=deepseek|mistral|anthropic|openai|qwen   LLM_MODEL=<modellname>
// Default: deepseek (guenstig). Keys werden aus src-tauri/.env.local gelesen.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateDocument } from '../packages/llm/dist/index.js';
import { stufeFromSchulstufe } from '../packages/schema/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Env laden (Muster: llm-smoke.mjs) -- alle LLM-Keys liegen in src-tauri/.env.local
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// CLI-Argumente
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a, i) => a === '--only' && args[i + 1]) ? args[args.indexOf('--only') + 1] : '';
const onlyFaecher = onlyArg ? onlyArg.split(',').map((s) => s.trim()).filter(Boolean) : [];
const outArg = args.find((a, i) => a === '--out' && args[i + 1]) ? args[args.indexOf('--out') + 1] : 'aufgabenpool-draft.json';
const OUT_DIR = join(__dirname, 'out');
const OUT_PATH = join(OUT_DIR, outArg);

// ---------------------------------------------------------------------------
// Kuratierte Kombis (Phase B aus docs/PLAN-neue-faecher-2026-07.md).
// Jede Kombi kann mehrere Blocktypen in EINEM generateDocument-Aufruf bündeln
// (spart LLM-Calls); das Ergebnisdokument wird danach pro Block in je einen
// eigenen PoolEntry aufgeteilt.
// ---------------------------------------------------------------------------

/** @typedef {{ fach: string, schulstufe: number, thema: string, kategorie: string, bloecke: object[], quelltext?: { titel: string, inhalt: string } }} Kombi */

/** @type {Kombi[]} */
const KOMBIS = [
  // --- Medien und Demokratie -------------------------------------------------
  {
    fach: 'mediendemokratie',
    schulstufe: 10,
    thema: 'Nationalratsdebatte-Simulation',
    kategorie: 'Politische Bildung & Demokratieverständnis',
    bloecke: [
      { typ: 'rollenkartenSet', punkte: 0, rahmen: 'Plenardebatte im Nationalrat zu einem aktuellen gesellschaftspolitischen Thema', zeitMinuten: 10, anzahlSzenarien: 4 },
    ],
  },
  {
    fach: 'mediendemokratie',
    schulstufe: 11,
    thema: 'Leserbrief zu einem Medienthema',
    kategorie: 'Kommunikation & Meinungsbildung',
    bloecke: [
      {
        typ: 'offeneSchreibaufgabe', punkte: 20, textsorte: 'Leserbrief',
        situation: 'Ein Lokalmedium hat einen kontroversen Artikel zu einem aktuellen Medienthema veröffentlicht.',
        umfangWorte: { min: 200, max: 250 },
        aspekte: ['Eigene Meinung klar vertreten', 'Bezug auf den Anlass-Artikel', 'Sachliche Argumentation'],
      },
    ],
  },
  {
    fach: 'mediendemokratie',
    schulstufe: 9,
    thema: 'Aussagen als Fakt, Meinung oder Fake einordnen',
    kategorie: 'Medienkompetenz & Quellenkritik',
    bloecke: [
      { typ: 'kategorisierung', punkte: 12, anzahlItems: 8, kategorien: ['Fakt', 'Meinung', 'Fake'] },
    ],
  },
  {
    fach: 'mediendemokratie',
    schulstufe: 9,
    thema: 'Politische Institution und ihre Funktion',
    kategorie: 'Politische Bildung & Demokratieverständnis',
    bloecke: [
      { typ: 'matching', punkte: 10, anzahlItems: 6 },
    ],
  },
  {
    fach: 'mediendemokratie',
    schulstufe: 10,
    thema: 'Wahlsystem-Grundlagen',
    kategorie: 'Politische Bildung & Demokratieverständnis',
    bloecke: [
      { typ: 'multipleChoice', punkte: 12, anzahlFragen: 6, mehrfach: false },
    ],
  },
  {
    fach: 'mediendemokratie',
    schulstufe: 12,
    thema: 'Quellenkritik an einem Beispieltext',
    kategorie: 'Medienkompetenz & Quellenkritik',
    quelltext: {
      titel: 'Social-Media-Post (Beispiel)',
      inhalt:
        'Post von @newsflash_at, 08:14 Uhr: "SKANDAL! Die Regierung plant angeblich neue Steuern für ' +
        'alle Familien — das steht so in keinem offiziellen Dokument, aber alle reden davon! Ich finde, ' +
        'das ist typisch für die Politik: erst handeln, dann informieren. Ein Sprecher des Finanzministeriums ' +
        'wollte sich bis Redaktionsschluss nicht äußern. Teilt diesen Post, damit es alle wissen! #Politik #Steuern"',
      ref: '',
    },
    bloecke: [
      { typ: 'markieraufgabe', punkte: 8, anweisung: 'Markiere alle Textstellen, die eine unbelegte Meinung statt eines überprüfbaren Fakts darstellen.' },
      { typ: 'offeneVerstaendnisfrage', punkte: 10, anzahlFragen: 3 },
    ],
  },

  // --- Informatik und Künstliche Intelligenz ---------------------------------
  {
    fach: 'informatikki',
    schulstufe: 9,
    thema: 'Cybersecurity-Begriffe: Phishing, Malware, Verschlüsselung',
    kategorie: 'Datenschutz & Cybersecurity',
    bloecke: [
      { typ: 'multipleChoice', punkte: 10, anzahlFragen: 5, mehrfach: false },
      { typ: 'matching', punkte: 8, anzahlItems: 5 },
    ],
  },
  {
    fach: 'informatikki',
    schulstufe: 9,
    thema: 'Personenbezogene vs. nicht-personenbezogene Daten',
    kategorie: 'Datenschutz & Cybersecurity',
    bloecke: [
      { typ: 'kategorisierung', punkte: 12, anzahlItems: 8, kategorien: ['Personenbezogene Daten', 'Nicht-personenbezogene Daten'] },
    ],
  },
  {
    fach: 'informatikki',
    schulstufe: 11,
    thema: 'Trace-Tabelle: Variablenzustand Schritt für Schritt',
    kategorie: 'Algorithmisches Denken',
    bloecke: [
      // Bewusst reine Werte-Tabelle ohne Code-/Syntax-Highlighting (V2: echter Code-Blocktyp, siehe Plan Phase B).
      { typ: 'tabelle', punkte: 10, spalten: ['Schritt', 'Variable a', 'Variable b', 'Ausgabe'] },
    ],
  },
  {
    fach: 'informatikki',
    schulstufe: 12,
    thema: 'Stellungnahme zu KI-Bias und Deepfakes',
    kategorie: 'KI-Grundlagen & Ethik',
    bloecke: [
      {
        typ: 'offeneSchreibaufgabe', punkte: 20, textsorte: 'Stellungnahme',
        situation: 'In den Medien wird zunehmend über KI-generierte Falschinformationen (Deepfakes) und algorithmische Verzerrung (Bias) diskutiert.',
        umfangWorte: { min: 200, max: 250 },
        aspekte: ['Eigene begründete Position', 'Konkretes Beispiel', 'Gesellschaftliche Auswirkungen'],
      },
    ],
  },
  {
    fach: 'informatikki',
    schulstufe: 11,
    thema: 'Diskussion: KI-Regulierung',
    kategorie: 'KI-Grundlagen & Ethik',
    bloecke: [
      { typ: 'roleplay', punkte: 0, situation: 'Diskussionsrunde zur staatlichen Regulierung Künstlicher Intelligenz', setting: 'Podiumsdiskussion in der Klasse', ziel: 'Pro- und Contra-Positionen zur KI-Regulierung austauschen und begründen', zeitMinuten: 10 },
    ],
  },
  {
    fach: 'informatikki',
    schulstufe: 10,
    thema: 'Diskussion: Datenschutz vs. Bequemlichkeit',
    kategorie: 'Datenschutz & Cybersecurity',
    bloecke: [
      { typ: 'roleplay', punkte: 0, situation: 'Diskussion: Datenschutz versus Bequemlichkeit im digitalen Alltag', setting: 'Kleingruppen-Diskussion', ziel: 'Abwägen zwischen Komfort personalisierter Dienste und dem Schutz persönlicher Daten', zeitMinuten: 10 },
    ],
  },
];

// ---------------------------------------------------------------------------
// GenerateInput-Aufbau je Kombi (Kompetenz-Modus, wie KompetenzView/useGenerate
// es fuer bestehende Faecher tun: quelltexte leer, ein synthetisches StoffItem
// statt Katalog-Referenz, modus:'kompetenz' + rahmenwerk:'at-lehrplan').
// ---------------------------------------------------------------------------

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function buildInput(kombi) {
  const stufe = stufeFromSchulstufe(kombi.schulstufe);
  const quelltexte = kombi.quelltext
    ? [{ id: 'q1', titel: kombi.quelltext.titel, inhalt: kombi.quelltext.inhalt, herkunft: { typ: 'eingabe', ref: '' } }]
    : [];
  const quelleId = kombi.quelltext ? 'q1' : undefined;

  const meta = {
    stufe,
    fach: kombi.fach,
    thema: kombi.thema,
    datum: heute(),
    klasse: '',
    notizen: '',
    modus: 'kompetenz',
    rahmenwerk: 'at-lehrplan',
    schulstufe: kombi.schulstufe,
    kompetenzNiveau: 'standard',
    bewertungsschema: 'at-1-5',
  };

  const bloecke = kombi.bloecke.map((b) => (quelleId && !b.quelleId ? { ...b, quelleId } : b));

  const stoffItems = [
    {
      id: `pool-entwurf-${kombi.fach}-${kombi.schulstufe}-${kombi.bloecke[0].typ}`,
      rahmenwerk: 'at-lehrplan',
      titel: kombi.thema,
      fach: kombi.fach,
      stufe,
      schulstufe: kombi.schulstufe,
      kategorie: kombi.kategorie,
      deskriptorIds: [],
      defaultAufgabentypen: kombi.bloecke.map((b) => b.typ),
    },
  ];

  return { meta, quelltexte, bloecke, stoffItems };
}

// ---------------------------------------------------------------------------
// PoolEntry-Aufbau: EIN Block aus dem generierten Dokument -> EIN PoolEntry
// (Feldnamen wie apps/web/src/lib/pool.ts PoolEntry).
// ---------------------------------------------------------------------------

function toPoolEntry(kombi, block) {
  return {
    id: randomUUID(),
    fach: kombi.fach,
    stufe: stufeFromSchulstufe(kombi.schulstufe),
    schulstufe: kombi.schulstufe,
    thema: kombi.thema,
    aufgabentyp: block.typ,
    tags: JSON.stringify([kombi.kategorie, 'llm-entwurf', 'neues-fach-2026']),
    blockJson: JSON.stringify(block),
    quelleHinweis: 'LLM-Entwurf, ungeprüft',
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Hauptlauf
// ---------------------------------------------------------------------------

async function main() {
  const kombis = onlyFaecher.length > 0 ? KOMBIS.filter((k) => onlyFaecher.includes(k.fach)) : KOMBIS;
  if (kombis.length === 0) {
    console.error(`Keine Kombis fuer Fach-Filter "${onlyArg}" gefunden. Verfuegbar: ${[...new Set(KOMBIS.map((k) => k.fach))].join(', ')}`);
    process.exit(1);
  }

  console.log(`\n▶ Aufgabenpool-Draft  provider=${provider}  model=${model ?? '(Anbieter-Default)'}  dryRun=${dryRun}`);
  console.log(`  ${kombis.length} Kombi(s): ${kombis.map((k) => `${k.fach}/${k.thema}`).join(' | ')}\n`);

  const cfg = { provider, kreativitaet: 0.5, ...(model ? { model } : {}) };
  const entries = [];
  let ok = 0;
  let fehler = 0;

  for (const kombi of kombis) {
    const input = buildInput(kombi);
    const label = `${kombi.fach} · Schulstufe ${kombi.schulstufe} · ${kombi.thema}`;

    if (dryRun) {
      console.log(`  [dry-run] ${label} -> ${kombi.bloecke.map((b) => b.typ).join(', ')}`);
      ok += 1;
      continue;
    }

    try {
      const res = await generateDocument(input, cfg);
      if (!res.ok) {
        fehler += 1;
        console.error(`  ✗ ${label}: ${res.fehler}`);
        continue;
      }
      for (const block of res.document.bloecke) {
        entries.push(toPoolEntry(kombi, block));
      }
      ok += 1;
      console.log(`  ✓ ${label}: ${res.document.bloecke.length} Block(e) (${res.versuche} Versuch(e))`);
    } catch (e) {
      fehler += 1;
      console.error(`  ✗ ${label}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\n${ok}/${kombis.length} Kombis erfolgreich, ${fehler} fehlgeschlagen, ${entries.length} PoolEntries erzeugt.`);

  if (dryRun) {
    console.log('(dry-run: keine Datei geschrieben, keine API-Calls ausgefuehrt)');
    return;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`✓ geschrieben: ${OUT_PATH}`);
  console.log('  Naechster Schritt: Review-Pass (Milan/Kimi), danach `cargo run --bin seed_pool -- ' + OUT_PATH + '`');

  if (fehler > 0) process.exitCode = 1;
}

main();
