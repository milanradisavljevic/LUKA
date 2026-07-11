#!/usr/bin/env node
// Validiert Fachpaket-Pool-Dateien (samples/fachpakete/*.json) gegen das
// LUA-Block-Schema. Der Rust-Import prüft blockJson NICHT — Fehler in den
// Aufgaben-Blöcken fallen sonst erst beim Laden in der App auf.
//
// Nutzung:
//   node scripts/validate-fachpakete.mjs                # alle samples/fachpakete/*.json
//   node scripts/validate-fachpakete.mjs pfad/zu/x.json  # nur diese Datei(en)
//
// Voraussetzung: packages/schema muss gebaut sein (dist/index.js vorhanden),
// z. B. mit `pnpm --filter "./packages/*" build` in apps/lua.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const schemaDistIndex = path.resolve(
  repoRoot,
  'apps/lua/packages/schema/dist/index.js',
);

let BlockSchema;
try {
  ({ BlockSchema } = await import(pathToFileURL(schemaDistIndex)));
} catch (err) {
  console.error(
    `Konnte packages/schema nicht laden (${schemaDistIndex}).\n` +
      `Vermutlich ist das Paket nicht gebaut. Ausführen: ` +
      `cd apps/lua && pnpm --filter "./packages/*" build\n\nDetails: ${err.message}`,
  );
  process.exit(1);
}

const REQUIRED_FIELDS = [
  'id',
  'fach',
  'stufe',
  'schulstufe',
  'thema',
  'aufgabentyp',
  'tags',
  'blockJson',
  'quelleHinweis',
  'createdAt',
];

function resolveInputFiles(argv) {
  if (argv.length > 0) {
    return argv.map((p) => path.resolve(process.cwd(), p));
  }
  const dir = path.resolve(repoRoot, 'samples/fachpakete');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => path.join(dir, f));
}

// Prüft, ob bei einer multipleChoice-Aufgabe mit mehreren Fragen jede Frage
// dieselbe (einzelne) Lösungs-Option hat — typisches Rate-Muster ("immer A").
function checkMcSameKeyPattern(block) {
  const fragen = block.config?.fragen;
  const antworten = block.loesung?.antworten;
  if (!Array.isArray(fragen) || fragen.length < 2 || !antworten) return null;

  const keys = [];
  for (const f of fragen) {
    const ans = antworten[String(f.nr)];
    if (!Array.isArray(ans) || ans.length !== 1) return null; // Mehrfachantwort o.Ä. → Muster nicht eindeutig
    keys.push(ans[0]);
  }
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size === 1) {
    return `Alle ${fragen.length} Fragen haben dieselbe Lösung "${keys[0]}" — leicht erratbar, Lösungen mischen.`;
  }
  return null;
}

// Prüft, ob bei einer matching-Aufgabe die Zuordnung exakt der Reihenfolge
// von items/optionen folgt (1→A, 2→B, 3→C, …) — ebenfalls erratbar.
function checkMatchingSequentialPattern(block) {
  const items = block.config?.items;
  const optionen = block.config?.optionen;
  const zuordnung = block.loesung?.zuordnung;
  if (!Array.isArray(items) || !Array.isArray(optionen) || !zuordnung) return null;
  if (items.length < 2) return null;

  const sortedItems = [...items].sort((a, b) => a.nr - b.nr);
  const isSequential = sortedItems.every((item, i) => {
    const opt = optionen[i];
    return opt && zuordnung[String(item.nr)] === opt.key;
  });
  if (isSequential) {
    return `Zuordnung folgt exakt der Reihenfolge der Optionen (1→${optionen[0]?.key}, 2→${optionen[1]?.key}, …) — leicht erratbar, Zuordnung mischen.`;
  }
  return null;
}

function validateFile(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (err) {
    console.log(`FAIL Datei nicht lesbar: ${file} (${err.message})`);
    return { fail: 1, warn: 0, count: 0 };
  }

  let entries;
  try {
    entries = JSON.parse(raw);
  } catch (err) {
    console.log(`FAIL Datei kein valides JSON: ${file} (${err.message})`);
    return { fail: 1, warn: 0, count: 0 };
  }
  if (!Array.isArray(entries)) {
    console.log(`FAIL Datei enthält kein Array von PoolEntries: ${file}`);
    return { fail: 1, warn: 0, count: 0 };
  }

  console.log(`\n=== ${path.relative(repoRoot, file)} (${entries.length} Einträge) ===`);

  let fail = 0;
  let warn = 0;
  const seenIds = new Map();

  for (const e of entries) {
    const label = e && typeof e === 'object' && 'id' in e ? e.id : '<ohne id>';

    const missing = REQUIRED_FIELDS.filter((k) => !(k in (e ?? {})));
    if (missing.length) {
      console.log(`FAIL ${label}: fehlende Pflichtfelder: ${missing.join(', ')}`);
      fail++;
      continue;
    }

    if (seenIds.has(e.id)) {
      console.log(
        `FAIL ${e.id}: doppelte id in dieser Datei (erster Eintrag bei Index ${seenIds.get(e.id)}) — ids müssen innerhalb einer Datei eindeutig sein.`,
      );
      fail++;
      continue;
    }
    seenIds.set(e.id, entries.indexOf(e));

    let tags;
    try {
      tags = JSON.parse(e.tags);
    } catch {
      console.log(`FAIL ${e.id}: tags ist kein valides JSON (erwartet ein JSON-Array als String).`);
      fail++;
      continue;
    }
    if (!Array.isArray(tags)) {
      console.log(`FAIL ${e.id}: tags ist kein JSON-Array.`);
      fail++;
      continue;
    }

    let block;
    try {
      block = JSON.parse(e.blockJson);
    } catch (err) {
      console.log(
        `FAIL ${e.id}: blockJson ist kein valides JSON (${err.message}). ` +
          `Häufigste Ursache: Zeilenumbrüche im blockJson-String sind nur einfach ` +
          `escaped ("\\n" statt "\\\\n") — in einer JSON-Datei muss der Backslash ` +
          `selbst nochmal escaped werden, sonst bricht der äußere JSON-Parser ab.`,
      );
      fail++;
      continue;
    }

    const res = BlockSchema.safeParse(block);
    if (!res.success) {
      console.log(`FAIL ${e.id} (${e.aufgabentyp}): blockJson erfüllt das Block-Schema nicht:`);
      for (const issue of res.error.issues.slice(0, 5)) {
        console.log(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
      fail++;
      continue;
    }

    if (block.typ !== e.aufgabentyp) {
      console.log(
        `FAIL ${e.id}: aufgabentyp ("${e.aufgabentyp}") stimmt nicht mit blockJson.typ ("${block.typ}") überein.`,
      );
      fail++;
      continue;
    }

    const warnings = [];
    if (block.typ === 'multipleChoice') {
      const w = checkMcSameKeyPattern(block);
      if (w) warnings.push(w);
    }
    if (block.typ === 'matching') {
      const w = checkMatchingSequentialPattern(block);
      if (w) warnings.push(w);
    }

    for (const w of warnings) {
      console.log(`WARN ${e.id}: ${w}`);
      warn++;
    }

    console.log(`OK   ${e.id} (${e.aufgabentyp}, Stufe ${e.schulstufe}, ${block.punkte} P.)`);
  }

  return { fail, warn, count: entries.length };
}

const files = resolveInputFiles(process.argv.slice(2));
if (files.length === 0) {
  console.error('Keine Fachpaket-Dateien gefunden (samples/fachpakete/*.json).');
  process.exit(1);
}

let totalFail = 0;
let totalWarn = 0;
let totalCount = 0;
for (const file of files) {
  const { fail, warn, count } = validateFile(file);
  totalFail += fail;
  totalWarn += warn;
  totalCount += count;
}

console.log(
  `\n${totalFail === 0 ? 'Alle' : `${totalCount - totalFail} von`} ${totalCount} Einträge valide` +
    `${totalWarn > 0 ? ` (${totalWarn} Warnung${totalWarn === 1 ? '' : 'en'})` : ''}.`,
);
process.exit(totalFail === 0 ? 0 : 1);
