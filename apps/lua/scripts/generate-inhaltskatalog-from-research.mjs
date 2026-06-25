#!/usr/bin/env node
// Transform-Pipeline für Inhalts-Module:
// Liest docs/lehrplan-quellen/<fach>_module.json und erzeugt
// apps/web/src/lib/inhaltskatalog/<fach>.ts + index.ts.
//
// Aufruf:
//   node scripts/generate-inhaltskatalog-from-research.mjs              # stdout
//   node scripts/generate-inhaltskatalog-from-research.mjs --write      # Dateien schreiben
//   node scripts/generate-inhaltskatalog-from-research.mjs --check      # nur validieren

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// @ts-ignore – built schema
const { FACH_META, stufeFromSchulstufe } = await import('../packages/schema/dist/index.js');

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const args = process.argv.slice(2);
const writeMode = args.includes('--write');
const checkMode = args.includes('--check');
const inputDir = args.find((a, i) => a === '--input' && args[i + 1]) ? args[args.indexOf('--input') + 1] : join(__dirname, '..', '..', '..', 'docs', 'lehrplan-quellen');
const outputDir = args.find((a, i) => a === '--output' && args[i + 1]) ? args[args.indexOf('--output') + 1] : join(__dirname, '..', 'apps', 'web', 'src', 'lib', 'inhaltskatalog');

function loadModuleFiles() {
  const files = readdirSync(inputDir).filter((f) => {
    const ext = extname(f);
    if (ext !== '.json') return false;
    const name = basename(f, ext);
    const parts = name.split('_');
    return parts.length === 2 && parts[1] === 'module' && parts[0] in FACH_META;
  });

  const byFach = {};
  for (const f of files) {
    const fach = basename(f, '.json').split('_')[0];
    const path = join(inputDir, f);
    const raw = readFileSync(path, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`Fehler beim Parsen von ${f}: ${e.message}`);
      process.exit(1);
    }
    data.fach = fach;
    byFach[fach] = data;
  }
  return byFach;
}

function validateModuleFile(data) {
  const errors = [];
  if (!data.fach || !FACH_META[data.fach]) {
    errors.push(`Unbekanntes Fach: ${data.fach}`);
  }
  if (typeof data.quelle !== 'string' || data.quelle.trim().length === 0) {
    errors.push(`quelle fehlt`);
  }
  if (!Array.isArray(data.module) || data.module.length === 0) {
    errors.push(`module muss ein nicht-leeres Array sein`);
    return errors;
  }
  const seenIds = new Set();
  for (const m of data.module) {
    if (!m.id || typeof m.id !== 'string') {
      errors.push(`Modul ohne id`);
      continue;
    }
    if (seenIds.has(m.id)) {
      errors.push(`Doppelte Modul-ID: ${m.id}`);
    }
    seenIds.add(m.id);
    if (!Number.isInteger(m.schulstufe) || m.schulstufe < 5 || m.schulstufe > 12) {
      errors.push(`Modul ${m.id}: ungültige schulstufe ${m.schulstufe}`);
    }
    if (!m.titel || typeof m.titel !== 'string') {
      errors.push(`Modul ${m.id}: titel fehlt`);
    }
    if (typeof m.beschreibung !== 'string') {
      errors.push(`Modul ${m.id}: beschreibung muss String sein`);
    }
  }
  return errors;
}

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function generateFachFile(fach, data) {
  const label = FACH_META[fach]?.label ?? fach;
  const quelle = data.quelle ?? '';
  const module = data.module ?? [];

  const lines = [
    `import type { InhaltsModul } from '@lehrunterlagen/schema';`,
    ``,
    `// ${label} — Inhalts-Module (Themenbereiche), generiert aus Lehrplan-Recherche.`,
    ``,
    `export const ${fach}InhaltsModule: InhaltsModul[] = [`,
  ];

  for (const m of module) {
    const stufe = stufeFromSchulstufe(m.schulstufe);
    lines.push(
      `  {`,
      `    id: '${m.id}',`,
      `    rahmenwerk: 'at-lehrplan',`,
      `    fach: '${fach}',`,
      `    stufe: '${stufe}',`,
      `    schulstufe: ${m.schulstufe},`,
      `    titel: '${escapeStr(m.titel)}',`,
      `    beschreibung: '${escapeStr(m.beschreibung ?? '')}',`,
      `    quelle: '${escapeStr(quelle)}',`,
      `  },`,
    );
  }

  lines.push(`];`, ``);
  return lines.join('\n');
}

function generateIndex(faecher) {
  const imports = faecher
    .map((f) => `import { ${f}InhaltsModule } from './${f}';`)
    .join('\n');

  return `import type { InhaltsModul } from '@lehrunterlagen/schema';
${imports}

const MODULE: InhaltsModul[] = [
${faecher.map((f) => `  ...${f}InhaltsModule,`).join('\n')}
];

export function listInhaltsModule(
  fach: InhaltsModul['fach'],
  stufe: InhaltsModul['stufe'],
  rahmenwerk?: InhaltsModul['rahmenwerk'],
  schulstufe?: number,
): InhaltsModul[] {
  return MODULE.filter(
    (m) =>
      m.fach === fach &&
      m.stufe === stufe &&
      (rahmenwerk === undefined || m.rahmenwerk === rahmenwerk) &&
      (schulstufe === undefined
        ? true
        : m.schulstufe === schulstufe || (m.schulstufe === undefined && m.stufe === stufe)),
  );
}

export function getInhaltsModul(id: string): InhaltsModul | undefined {
  return MODULE.find((m) => m.id === id);
}

export function getAllInhaltsModule(): InhaltsModul[] {
  return [...MODULE];
}
`;
}

function main() {
  const byFach = loadModuleFiles();
  const faecher = Object.keys(byFach).sort();

  if (faecher.length === 0) {
    console.error(`Keine <fach>_module.json-Dateien in ${inputDir} gefunden.`);
    process.exit(1);
  }

  let totalErrors = 0;
  for (const fach of faecher) {
    const errors = validateModuleFile(byFach[fach]);
    if (errors.length > 0) {
      totalErrors += errors.length;
      console.error(`\n${fach}_module.json:`);
      for (const e of errors) console.error(`  ✗ ${e}`);
    }
  }

  if (totalErrors > 0) {
    console.error(`\n${totalErrors} Fehler gefunden.`);
    process.exit(1);
  }

  if (checkMode) {
    console.log(`✓ ${faecher.length} Fächer validiert.`);
    return;
  }

  if (writeMode) {
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  }

  for (const fach of faecher) {
    const ts = generateFachFile(fach, byFach[fach]);
    if (writeMode) {
      const outPath = join(outputDir, `${fach}.ts`);
      writeFileSync(outPath, ts, 'utf8');
      console.log(`✓ geschrieben: ${outPath}`);
    } else {
      console.log(`\n// ============ ${fach}.ts ============\n`);
      console.log(ts);
    }
  }

  if (writeMode) {
    const indexPath = join(outputDir, 'index.ts');
    writeFileSync(indexPath, generateIndex(faecher), 'utf8');
    console.log(`✓ geschrieben: ${indexPath}`);
  }
}

main();
