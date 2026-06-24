#!/usr/bin/env node
// Merge-Skript für Sprachfächer:
// Ersetzt Skill-Blöcke (aus Qwen-Recherche) in den bestehenden Stoffkatalog-TS-Dateien,
// behält aber kuratierte Grammatik-/Wortschatz-/Sprachmittlungs-/Literatur-Blöcke bei.
//
// Aufruf:
//   node scripts/merge-language-stoffkatalog.mjs \
//     --generated /tmp/stoffkatalog-lang \
//     --target apps/web/src/lib/stoffkatalog

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// @ts-ignore – built schema
const { KOMPETENZBEREICHE, FACH_META } = await import('../packages/schema/dist/index.js');

const FAECHER = ['deutsch', 'englisch', 'franzoesisch', 'italienisch', 'spanisch'];
const STUFE_ORDER = { unterstufe: 0, oberstufe: 1 };
const STUFE_LABEL = { unterstufe: 'Unterstufe', oberstufe: 'Oberstufe' };

const args = process.argv.slice(2);
const generatedDir = args.find((a, i) => a === '--generated' && args[i + 1]) ? args[args.indexOf('--generated') + 1] : '/tmp/stoffkatalog-lang';
const targetDir = args.find((a, i) => a === '--target' && args[i + 1]) ? args[args.indexOf('--target') + 1] : join(process.cwd(), 'apps', 'web', 'src', 'lib', 'stoffkatalog');

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function parseObjectLines(body) {
  const objects = [];
  const lines = body.split('\n');
  // Q-Helfer aus den Bestandsdateien muss im Eval-Kontext verfügbar sein.
  const Q = (stufe) => `Q('${stufe}')`;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (line.startsWith('{') && line.endsWith('},')) {
      const withoutTrailingComma = line.replace(/,\s*$/, '');
      try {
        const obj = new Function('Q', 'return ' + withoutTrailingComma)(Q);
        objects.push({ obj, index: idx });
      } catch (e) {
        throw new Error(`Fehler beim Parsen der Zeile: ${line}\n${e.message}`);
      }
    }
  }
  return objects;
}

function extractArray(fileText, varName) {
  const regex = new RegExp(`export const ${varName}\\s*:[\\s\\S]*?=\\s*\\[([\\s\\S]*?)\\];`);
  const match = fileText.match(regex);
  if (!match) throw new Error(`Array ${varName} nicht gefunden`);
  return parseObjectLines(match[1]);
}

function extractPreamble(fileText) {
  const match = fileText.match(/(import type[\s\S]*?)(const Q = [\s\S]*?)\nexport const/);
  if (!match) throw new Error('Preamble (import + Q) nicht gefunden');
  return `${match[1].trimEnd()}\n\n${match[2].trimEnd()}`;
}

function serializeValue(v) {
  if (typeof v === 'string' && v.startsWith('Q(') && v.endsWith(')')) {
    return v;
  }
  return `'${escapeStr(v)}'`;
}

function serializeDescriptor(d) {
  return `  { id: '${d.id}', rahmenwerk: '${d.rahmenwerk}', fach: '${d.fach}', stufe: '${d.stufe}', bereich: '${escapeStr(d.bereich)}', code: '${escapeStr(d.code)}', text: '${escapeStr(d.text)}', quelle: ${serializeValue(d.quelle)} },`;
}

function serializeStoffItem(item) {
  const types = (item.defaultAufgabentypen ?? []).map((t) => `'${t}'`).join(', ');
  return `  { id: '${item.id}', rahmenwerk: '${item.rahmenwerk}', titel: '${escapeStr(item.titel)}', fach: '${item.fach}', stufe: '${item.stufe}', kategorie: '${escapeStr(item.kategorie)}', deskriptorIds: [${item.deskriptorIds.map((id) => `'${id}'`).join(', ')}], defaultAufgabentypen: [${types}] },`;
}

function sortByCategoryAndStufe(items, fach, categoryKey) {
  const order = KOMPETENZBEREICHE[fach] ?? [];
  return items.slice().sort((a, b) => {
    const idxA = order.indexOf(a.obj[categoryKey]);
    const idxB = order.indexOf(b.obj[categoryKey]);
    if (idxA !== idxB) return idxA - idxB;
    const stufeA = STUFE_ORDER[a.obj.stufe] ?? 99;
    const stufeB = STUFE_ORDER[b.obj.stufe] ?? 99;
    if (stufeA !== stufeB) return stufeA - stufeB;
    return a.index - b.index;
  });
}

function renderDescriptors(items, fach) {
  const sorted = sortByCategoryAndStufe(items, fach, 'bereich');
  const lines = [];
  let lastCategory = null;
  let lastStufe = null;
  for (const { obj } of sorted) {
    if (obj.bereich !== lastCategory || obj.stufe !== lastStufe) {
      lines.push(`  // ${obj.bereich} — ${STUFE_LABEL[obj.stufe]}`);
      lastCategory = obj.bereich;
      lastStufe = obj.stufe;
    }
    lines.push(serializeDescriptor(obj));
  }
  return lines.join('\n');
}

function renderStoffItems(items, fach) {
  const sorted = sortByCategoryAndStufe(items, fach, 'kategorie');
  const lines = [];
  let lastCategory = null;
  for (const { obj } of sorted) {
    if (obj.kategorie !== lastCategory) {
      lines.push(`  // ${obj.kategorie}`);
      lastCategory = obj.kategorie;
    }
    lines.push(serializeStoffItem(obj));
  }
  return lines.join('\n');
}

function mergeFach(fach) {
  const existingPath = join(targetDir, `${fach}.ts`);
  const generatedPath = join(generatedDir, `${fach}.ts`);
  const existing = readFileSync(existingPath, 'utf8');
  const generated = readFileSync(generatedPath, 'utf8');

  const existingDescriptors = extractArray(existing, `${fach}Deskriptoren`);
  const generatedDescriptors = extractArray(generated, `${fach}Deskriptoren`);
  const existingItems = extractArray(existing, `${fach}StoffItems`);
  const generatedItems = extractArray(generated, `${fach}StoffItems`);

  const skillCategories = new Set(generatedDescriptors.map(({ obj }) => obj.bereich));

  const mergedDescriptors = [
    ...existingDescriptors.filter(({ obj }) => !skillCategories.has(obj.bereich)),
    ...generatedDescriptors,
  ];
  const mergedItems = [
    ...existingItems.filter(({ obj }) => !skillCategories.has(obj.kategorie)),
    ...generatedItems,
  ];

  const label = FACH_META[fach]?.label ?? fach;
  const preamble = extractPreamble(existing);

  const out = `${preamble}

// ${label} — gemischt: gesourcte Skill-Deskriptoren aus Lehrplan-Recherche
// plus erhaltene kuratierte Grammatik-/Wortschatz-/Sprachmittlungs-/Literatur-Blöcke.

export const ${fach}Deskriptoren: Deskriptor[] = [
${renderDescriptors(mergedDescriptors, fach)}
];

export const ${fach}StoffItems: StoffItem[] = [
${renderStoffItems(mergedItems, fach)}
];
`;

  writeFileSync(existingPath, out, 'utf8');
  console.log(`✓ gemerged: ${existingPath} (${skillCategories.size} Skill-Kategorien ersetzt)`);
}

for (const fach of FAECHER) {
  mergeFach(fach);
}
