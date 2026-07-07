#!/usr/bin/env node
// Transform-Pipeline für Task 2:
// Liest <fach>_<stufe>.json-Dateien (Lehrplan-Recherche) und erzeugt daraus
// Deskriptor[] + StoffItem-Gerüst für apps/web/src/lib/stoffkatalog/<fach>.ts.
//
// Aufruf:
//   node scripts/generate-stoffkatalog-from-research.mjs              # stdout
//   node scripts/generate-stoffkatalog-from-research.mjs --write      # Dateien schreiben
//   node scripts/generate-stoffkatalog-from-research.mjs --check      # nur validieren
//
// Erwartetes Eingabe-JSON pro Datei (Ziel-Schema nach Qwen-Revision):
// {
//   "fach": "deutsch",
//   "stufe": "unterstufe|oberstufe",
//   "quelleUrl": "https://…",   // oder "quelle": "…"
//   "bereiche": [
//     {
//       "bereich": "<exakter Name aus KOMPETENZBEREICHE[fach]>",
//       "deskriptoren": [
//         { "id?": "at-de-un-…", "code": "…" | "", "text": "…", "quelle?": "…" }
//       ]
//     }
//   ]
// }
//
// Sind id/quelle auf Deskriptor-Ebene vorhanden, werden sie übernommen;
// sonst werden sie generiert (id) bzw. aus der Datei-Quelle (quelleUrl/quelle) geerbt.

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// @ts-ignore – built schema
const { KOMPETENZBEREICHE, FACH_META, stufeFromSchulstufe } = await import('../packages/schema/dist/index.js');

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const FACH_CODE = {
  deutsch: 'de',
  englisch: 'en',
  franzoesisch: 'fr',
  spanisch: 'sp',
  italienisch: 'it',
  latein: 'la',
  geschichte: 'ge',
  geographie: 'gw',
  religion: 're',
  ethik: 'et',
  psychologie: 'ps',
  philosophie: 'ph',
  mediendemokratie: 'md',
  informatikki: 'ik',
};

const STUFE_ABBR = { unterstufe: 'un', oberstufe: 'ob' };
const STUFE_LABEL = { unterstufe: 'Unterstufe', oberstufe: 'Oberstufe' };

// 1–2 sinnvolle BlockTyp-Werte pro Kompetenzbereich. Fallback: offeneVerstaendnisfrage.
const DEFAULT_AUFGABENTYPEN = {
  'Schreiben': ['offeneSchreibaufgabe'],
  'Hören': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Lesen': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Zuhören & Sprechen': ['roleplay', 'offeneSchreibaufgabe'],
  'An Gesprächen teilnehmen': ['roleplay', 'multipleChoice'],
  'Zusammenhängend sprechen': ['roleplay', 'offeneSchreibaufgabe'],
  'Sprachmittlung': ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'],
  'Wortschatz': ['vokabeluebung', 'kreuzwortraetsel'],
  'Grammatik': ['fehlerkorrektur', 'multipleChoice'],
  'Sprachbewusstsein': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Literarische Bildung': ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'],
  'Historische Fragekompetenz': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Historische Methodenkompetenz': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Historische Orientierungskompetenz': ['kategorisierung', 'multipleChoice'],
  'Historische Sachkompetenz': ['multipleChoice', 'kategorisierung'],
  'Politische Bildung': ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'],
  'Wahrnehmungs- & Orientierungskompetenz': ['kategorisierung', 'multipleChoice'],
  'Methodenkompetenz': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Synthesekompetenz': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Wirtschaftliche Bildung': ['multipleChoice', 'offeneSchreibaufgabe'],
  'Wahrnehmen & Beschreiben': ['offeneSchreibaufgabe', 'multipleChoice'],
  'Analysieren & Argumentieren': ['offeneSchreibaufgabe', 'roleplay'],
  'Urteilen & Reflektieren': ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'],
  'Perspektivenwechsel': ['roleplay', 'offeneSchreibaufgabe'],
  'Begriffs- & Theoriekompetenz': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Argumentations- & Reflexionskompetenz': ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'],
  'Anwendung & Transfer': ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'],
  'Sprachkompetenz': ['lueckentext', 'multipleChoice'],
  'Textkompetenz': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Kulturkompetenz': ['multipleChoice', 'kategorisierung'],
  'Wahrnehmen & Verstehen': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Deuten & Urteilen': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Reflektieren & Kommunizieren': ['offeneSchreibaufgabe', 'roleplay'],
  'Gestalten & Handeln': ['offeneSchreibaufgabe', 'multipleChoice'],
  'Fachwissen': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Methoden- & Erkenntniskompetenz': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Reflexions- & Urteilskompetenz': ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'],
};

const args = process.argv.slice(2);
const writeMode = args.includes('--write');
const checkMode = args.includes('--check');
const inputDir = args.find((a, i) => a === '--input' && args[i + 1]) ? args[args.indexOf('--input') + 1] : join(__dirname, '..', '..', '..');
const outputDir = args.find((a, i) => a === '--output' && args[i + 1]) ? args[args.indexOf('--output') + 1] : join(__dirname, '..', 'apps', 'web', 'src', 'lib', 'stoffkatalog');
const onlyArg = args.find((a, i) => a === '--only' && args[i + 1]) ? args[args.indexOf('--only') + 1] : '';
const onlyFaecher = onlyArg ? onlyArg.split(',').map((s) => s.trim()).filter(Boolean) : [];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/&/g, 'und')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function descriptorId(fachCode, stufeAbbr, bereichSlug, index) {
  return `at-${fachCode}-${stufeAbbr}-${bereichSlug}-${index + 1}`;
}

function stoffItemId(fachCode, stufeAbbr, bereichSlug) {
  return `${fachCode}-${bereichSlug}-${stufeAbbr}`;
}

function validateFile(path, data) {
  const errors = [];
  if (!data.fach || !FACH_CODE[data.fach]) {
    errors.push(`Unbekanntes Fach: ${data.fach}`);
  }
  if (!data.stufe || !STUFE_ABBR[data.stufe]) {
    errors.push(`Unbekannte Stufe: ${data.stufe}`);
  }
  if (typeof data.quelleUrl !== 'string' || !data.quelleUrl.startsWith('http')) {
    errors.push(`quelleUrl fehlt oder ungültig`);
  }
  if (!Array.isArray(data.bereiche) || data.bereiche.length === 0) {
    errors.push(`bereiche muss ein nicht-leeres Array sein`);
    return errors;
  }

  const erlaubteBereiche = data.fach ? KOMPETENZBEREICHE[data.fach] ?? [] : [];
  for (const b of data.bereiche) {
    if (!b.bereich) {
      errors.push(`Ein Bereich hat keinen Namen`);
      continue;
    }
    if (!erlaubteBereiche.includes(b.bereich)) {
      errors.push(`Bereich "${b.bereich}" ist nicht in KOMPETENZBEREICHE[${data.fach}]. Erlaubt: ${erlaubteBereiche.join(', ')}`);
    }
    if (!Array.isArray(b.deskriptoren) || b.deskriptoren.length === 0) {
      errors.push(`Bereich "${b.bereich}" hat keine Deskriptoren`);
      continue;
    }
    for (const d of b.deskriptoren) {
      if (typeof d.text !== 'string' || d.text.trim().length === 0) {
        errors.push(`Bereich "${b.bereich}": Deskriptor ohne text`);
      }
    }
  }
  return errors;
}

function validateStufenFile(path, data) {
  const errors = [];
  if (!data.fach || !FACH_CODE[data.fach]) {
    errors.push(`Unbekanntes Fach: ${data.fach}`);
  }
  if (!Array.isArray(data.stufen) || data.stufen.length === 0) {
    errors.push(`stufen muss ein nicht-leeres Array sein`);
    return errors;
  }
  const erlaubteBereiche = data.fach ? KOMPETENZBEREICHE[data.fach] ?? [] : [];
  for (const st of data.stufen) {
    if (!Number.isInteger(st.schulstufe) || st.schulstufe < 5 || st.schulstufe > 12) {
      errors.push(`Ungültige schulstufe: ${st.schulstufe}`);
      continue;
    }
    if (!Array.isArray(st.bereiche) || st.bereiche.length === 0) {
      errors.push(`schulstufe ${st.schulstufe}: bereiche fehlt`);
      continue;
    }
    for (const b of st.bereiche) {
      if (!b.bereich) {
        errors.push(`Ein Bereich hat keinen Namen`);
        continue;
      }
      if (!erlaubteBereiche.includes(b.bereich)) {
        errors.push(`Bereich "${b.bereich}" ist nicht in KOMPETENZBEREICHE[${data.fach}]`);
      }
      if (!Array.isArray(b.deskriptoren) || b.deskriptoren.length === 0) {
        errors.push(`Bereich "${b.bereich}": keine Deskriptoren`);
        continue;
      }
      for (const d of b.deskriptoren) {
        if (typeof d.text !== 'string' || d.text.trim().length === 0) {
          errors.push(`Bereich "${b.bereich}": Deskriptor ohne text`);
        }
      }
    }
  }
  return errors;
}

function loadInputs() {
  const files = readdirSync(inputDir);
  const byFach = {};

  // 1) Neue _stufen.json-Dateien (präferiert)
  const stufenFiles = files.filter((f) => {
    const ext = extname(f);
    if (ext !== '.json') return false;
    const name = basename(f, ext);
    const parts = name.split('_');
    return parts.length === 2 && parts[1] === 'stufen' && parts[0] in FACH_CODE;
  });

  for (const f of stufenFiles) {
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
    if (!byFach[fach]) byFach[fach] = {};
    byFach[fach].__stufen = data;
  }

  // 2) Legacy <fach>_<stufe>.json-Dateien (nur wenn keine _stufen.json vorhanden)
  const legacyFiles = files.filter((f) => {
    const ext = extname(f);
    if (ext !== '.json') return false;
    const name = basename(f, ext);
    const parts = name.split('_');
    if (parts.length !== 2) return false;
    const [fach, stufe] = parts;
    return fach in FACH_CODE && stufe in STUFE_ABBR && !byFach[fach]?.__stufen;
  });

  for (const f of legacyFiles) {
    const [fach, stufe] = basename(f, '.json').split('_');
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
    data.stufe = stufe;
    if (!byFach[fach]) byFach[fach] = {};
    byFach[fach][stufe] = data;
  }

  return byFach;
}

function generateFachTs(fach, stufenData) {
  const fachCode = FACH_CODE[fach];
  const label = FACH_META[fach]?.label ?? fach;
  const lines = [
    `import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';`,
    ``,
    `// ${label} — generiert aus Lehrplan-Recherche (Task 2).`,
    `// Deskriptoren sind gesourct (quelle = offizielle URL); StoffItems enthalten`,
    `// vorgeschlagene defaultAufgabentypen je Kompetenzbereich.`,
    ``,
    `const Q = (stufe: string) =>`,
    `  \`Gesourct, angelehnt an offiziellen Lehrplan AHS ${label} \${stufe} — siehe Quell-URL in der Forschungsdatei.\`;`,
    ``,
    `export const ${fach}Deskriptoren: Deskriptor[] = [`,
  ];

  const stoffItems = [];
  const seenIds = new Set();

  for (const stufe of ['unterstufe', 'oberstufe']) {
    const data = stufenData[stufe];
    if (!data) continue;
    const stufeAbbr = STUFE_ABBR[stufe];
    const stufeLabel = STUFE_LABEL[stufe];
    const defaultQuelle = data.quelle ?? data.quelleUrl ?? '';

    for (const bereichObj of data.bereiche) {
      const bereich = bereichObj.bereich;
      const bereichSlug = slugify(bereich);
      const deskriptorIds = [];

      for (let i = 0; i < bereichObj.deskriptoren.length; i++) {
        const d = bereichObj.deskriptoren[i];
        const id = d.id?.trim() || descriptorId(fachCode, stufeAbbr, bereichSlug, i);
        if (seenIds.has(id)) throw new Error(`Doppelte Deskriptor-ID: ${id}`);
        seenIds.add(id);
        deskriptorIds.push(id);
        const quelle = d.quelle?.trim() || defaultQuelle || `Q('${stufeLabel}')`;
        lines.push(
          `  { id: '${id}', rahmenwerk: 'at-lehrplan', fach: '${fach}', stufe: '${stufe}', bereich: '${bereich.replace(/'/g, "\\'")}', code: '${(d.code ?? '').replace(/'/g, "\\'")}', text: '${d.text.replace(/'/g, "\\'")}', quelle: '${quelle.replace(/'/g, "\\'")}' },`,
        );
      }

      const itemId = stoffItemId(fachCode, stufeAbbr, bereichSlug);
      stoffItems.push({
        id: itemId,
        titel: bereich,
        stufe,
        bereich,
        deskriptorIds,
      });
    }
  }

  lines.push(`];`, ``, `export const ${fach}StoffItems: StoffItem[] = [`);
  for (const item of stoffItems) {
    lines.push(
      `  { id: '${item.id}', rahmenwerk: 'at-lehrplan', titel: '${item.titel.replace(/'/g, "\\'")}', fach: '${fach}', stufe: '${item.stufe}', kategorie: '${item.bereich.replace(/'/g, "\\'")}', deskriptorIds: [${item.deskriptorIds.map((id) => `'${id}'`).join(', ')}], defaultAufgabentypen: [${(DEFAULT_AUFGABENTYPEN[item.titel] ?? DEFAULT_AUFGABENTYPEN[item.bereich] ?? ['offeneVerstaendnisfrage']).map((t) => `'${t}'`).join(', ')}] },`,
    );
  }
  lines.push(`];`, ``);

  return lines.join('\n');
}

function generateFachTsFromStufen(fach, data) {
  const fachCode = FACH_CODE[fach];
  const label = FACH_META[fach]?.label ?? fach;
  const defaultQuelle = data.quelle ?? data.quelleUrl ?? '';
  const lines = [
    `import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';`,
    ``,
    `// ${label} — generiert aus Lehrplan-Recherche (_stufen.json).`,
    `// Deskriptoren sind gesourct und mit konkreter Schulstufe (5–12) hinterlegt;`,
    `// StoffItems bleiben grob (Unter-/Oberstufe) und verlinken passende Deskriptoren.`,
    ``,
    `export const ${fach}Deskriptoren: Deskriptor[] = [`,
  ];

  const stoffItemMap = new Map(); // key: `${stufe}|${bereich}`
  const seenIds = new Set();

  for (const st of data.stufen) {
    const schulstufe = st.schulstufe;
    const stufe = stufeFromSchulstufe(schulstufe);
    for (const bereichObj of st.bereiche) {
      const bereich = bereichObj.bereich;
      const key = `${stufe}|${bereich}`;
      if (!stoffItemMap.has(key)) {
        const stufeAbbr = STUFE_ABBR[stufe];
        const bereichSlug = slugify(bereich);
        stoffItemMap.set(key, {
          id: stoffItemId(fachCode, stufeAbbr, bereichSlug),
          titel: bereich,
          stufe,
          bereich,
          deskriptorIds: [],
        });
      }
      const item = stoffItemMap.get(key);

      for (let i = 0; i < bereichObj.deskriptoren.length; i++) {
        const d = bereichObj.deskriptoren[i];
        const id = d.id?.trim() || `${fachCode}-${slugify(bereich)}-s${schulstufe}-${i + 1}`;
        if (seenIds.has(id)) throw new Error(`Doppelte Deskriptor-ID: ${id}`);
        seenIds.add(id);
        item.deskriptorIds.push(id);
        const quelle = d.quelle?.trim() || defaultQuelle || '';
        lines.push(
          `  { id: '${id}', rahmenwerk: 'at-lehrplan', fach: '${fach}', stufe: '${stufe}', schulstufe: ${schulstufe}, bereich: '${bereich.replace(/'/g, "\\'")}', code: '${(d.code ?? '').replace(/'/g, "\\'")}', text: '${d.text.replace(/'/g, "\\'")}', quelle: '${quelle.replace(/'/g, "\\'")}' },`,
        );
      }
    }
  }

  lines.push(`];`, ``, `export const ${fach}StoffItems: StoffItem[] = [`);
  // Sortiere StoffItems nach kanonischer Bereichsreihenfolge und Stufe
  const bereichOrder = KOMPETENZBEREICHE[fach] ?? [];
  const stoffItems = Array.from(stoffItemMap.values()).sort((a, b) => {
    const idxA = bereichOrder.indexOf(a.bereich);
    const idxB = bereichOrder.indexOf(b.bereich);
    if (idxA !== idxB) return idxA - idxB;
    return a.stufe === 'unterstufe' ? -1 : 1;
  });

  for (const item of stoffItems) {
    lines.push(
      `  { id: '${item.id}', rahmenwerk: 'at-lehrplan', titel: '${item.titel.replace(/'/g, "\\'")}', fach: '${fach}', stufe: '${item.stufe}', kategorie: '${item.bereich.replace(/'/g, "\\'")}', deskriptorIds: [${item.deskriptorIds.map((id) => `'${id}'`).join(', ')}], defaultAufgabentypen: [${(DEFAULT_AUFGABENTYPEN[item.titel] ?? DEFAULT_AUFGABENTYPEN[item.bereich] ?? ['offeneVerstaendnisfrage']).map((t) => `'${t}'`).join(', ')}] },`,
    );
  }
  lines.push(`];`, ``);

  return lines.join('\n');
}

function main() {
  const byFach = loadInputs();
  const faecher = Object.keys(byFach).sort();

  if (faecher.length === 0) {
    console.error(`Keine <fach>_stufen.json- oder <fach>_<stufe>.json-Dateien in ${inputDir} gefunden.`);
    process.exit(1);
  }

  let totalErrors = 0;
  for (const fach of faecher) {
    const fachData = byFach[fach];
    if (fachData.__stufen) {
      const errors = validateStufenFile(null, fachData.__stufen);
      if (errors.length > 0) {
        totalErrors += errors.length;
        console.error(`\n${fach}_stufen.json:`);
        for (const e of errors) console.error(`  ✗ ${e}`);
      }
      continue;
    }
    for (const stufe of Object.keys(fachData)) {
      const data = fachData[stufe];
      const errors = validateFile(null, data);
      if (errors.length > 0) {
        totalErrors += errors.length;
        console.error(`\n${fach}_${stufe}.json:`);
        for (const e of errors) console.error(`  ✗ ${e}`);
      }
    }
  }

  if (totalErrors > 0) {
    console.error(`\n${totalErrors} Fehler gefunden. Bitte bereich-Namen auf die kanonischen Namen aus KOMPETENZBEREICHE angleichen.`);
    process.exit(1);
  }

  if (checkMode) {
    console.log(`✓ ${faecher.length} Fächer validiert.`);
    return;
  }

  const filteredFaecher = onlyFaecher.length > 0 ? faecher.filter((f) => onlyFaecher.includes(f)) : faecher;
  if (onlyFaecher.length > 0 && filteredFaecher.length === 0) {
    console.error(`Keines der gefilterten Fächer gefunden: ${onlyFaecher.join(', ')}`);
    process.exit(1);
  }

  for (const fach of filteredFaecher) {
    const ts = byFach[fach].__stufen
      ? generateFachTsFromStufen(fach, byFach[fach].__stufen)
      : generateFachTs(fach, byFach[fach]);
    if (writeMode) {
      if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
      const outPath = join(outputDir, `${fach}.ts`);
      writeFileSync(outPath, ts, 'utf8');
      console.log(`✓ geschrieben: ${outPath}`);
    } else {
      console.log(`\n// ============ ${fach}.ts ============\n`);
      console.log(ts);
    }
  }
}

main();
