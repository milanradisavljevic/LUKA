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
  mathematik: 'ma',
  biologie: 'bi',
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
  'Zahlen und Maße': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Variablen und Funktionen': ['lueckentext', 'offeneVerstaendnisfrage'],
  'Figuren und Körper': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Daten und Zufall': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Algebra und Geometrie': ['offeneVerstaendnisfrage', 'lueckentext'],
  'Funktionale Abhängigkeiten': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Analysis': ['offeneVerstaendnisfrage', 'lueckentext'],
  'Wahrscheinlichkeit und Statistik': ['multipleChoice', 'offeneVerstaendnisfrage'],
  'Wissen aneignen, anwenden und kommunizieren': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Fachwissen aneignen und kommunizieren': ['offeneVerstaendnisfrage', 'multipleChoice'],
  'Erkenntnisse gewinnen': ['offeneVerstaendnisfrage'],
  'Standpunkte begründen und reflektiert handeln': ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'],
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
    errors.push('Unbekanntes Fach: ' + data.fach);
  }
  if (!Array.isArray(data.stufen) || data.stufen.length === 0) {
    errors.push('stufen muss ein nicht-leeres Array sein');
    return errors;
  }

  const quellengestutzteFaecher = new Set(['mathematik', 'biologie']);
  const istQuellengestutzt = quellengestutzteFaecher.has(data.fach);
  if (istQuellengestutzt) {
    if (typeof data.quelle !== 'string' || data.quelle.trim().length === 0) {
      errors.push('quelle fehlt');
    }
    if (typeof data.quelleUrl !== 'string' || !data.quelleUrl.startsWith('https://')) {
      errors.push('quelleUrl fehlt oder ist keine HTTPS-URL');
    }
  }

  const erlaubteBereiche = data.fach ? KOMPETENZBEREICHE[data.fach] ?? [] : [];
  const schulstufen = new Set();
  const bereicheGesamt = new Set();
  const deskriptorIds = new Set();
  const stoffItemIds = new Set();
  for (const st of data.stufen) {
    if (!Number.isInteger(st.schulstufe) || st.schulstufe < 5 || st.schulstufe > 12) {
      errors.push('Ungültige schulstufe: ' + st.schulstufe);
      continue;
    }
    if (schulstufen.has(st.schulstufe)) errors.push('schulstufe ' + st.schulstufe + ': doppelt vorhanden');
    schulstufen.add(st.schulstufe);
    if (!Array.isArray(st.bereiche) || st.bereiche.length === 0) {
      errors.push('schulstufe ' + st.schulstufe + ': bereiche fehlt');
      continue;
    }
    const bereicheDerStufe = new Set();
    for (const b of st.bereiche) {
      if (!b.bereich) {
        errors.push('schulstufe ' + st.schulstufe + ': ein Bereich hat keinen Namen');
        continue;
      }
      if (bereicheDerStufe.has(b.bereich)) errors.push('schulstufe ' + st.schulstufe + ': Bereich "' + b.bereich + '" doppelt vorhanden');
      bereicheDerStufe.add(b.bereich);
      bereicheGesamt.add(b.bereich);
      if (!erlaubteBereiche.includes(b.bereich)) {
        errors.push('Bereich "' + b.bereich + '" ist nicht in KOMPETENZBEREICHE[' + data.fach + ']');
      }
      if (!Array.isArray(b.deskriptoren) || b.deskriptoren.length === 0) {
        errors.push('Bereich "' + b.bereich + '": keine Deskriptoren');
        continue;
      }
      const idsDiesesBereichs = new Set();
      for (const d of b.deskriptoren) {
        if (typeof d.text !== 'string' || d.text.trim().length === 0) {
          errors.push('Bereich "' + b.bereich + '": Deskriptor ohne text');
        }
        if (istQuellengestutzt && (typeof d.id !== 'string' || d.id.trim().length === 0)) {
          errors.push('Bereich "' + b.bereich + '": Deskriptor ohne stabile id');
        }
        if (istQuellengestutzt && (typeof d.quelle !== 'string' || d.quelle.trim().length === 0)) {
          errors.push('Bereich "' + b.bereich + '": Deskriptor ohne konkrete Quellenstelle');
        } else if (istQuellengestutzt && (!d.quelle.includes('Anlage 1') || !d.quelle.includes('gültig ab 01.09.2026') || !d.quelle.includes(data.quelleUrl))) {
          errors.push('Bereich "' + b.bereich + '": Deskriptor-Quelle braucht Titel, Fassung und direkte RIS-URL');
        }
        const id = d.id?.trim();
        if (id) {
          if (deskriptorIds.has(id)) errors.push('Doppelte Deskriptor-ID: ' + id);
          deskriptorIds.add(id);
          idsDiesesBereichs.add(id);
        }
      }

      if (istQuellengestutzt) {
        if (!Array.isArray(b.stoffItems) || b.stoffItems.length === 0) {
          errors.push('schulstufe ' + st.schulstufe + ', Bereich "' + b.bereich + '": konkrete stoffItems fehlen');
          continue;
        }
        for (const item of b.stoffItems) {
          if (typeof item.id !== 'string' || !item.id.trim()) errors.push('Bereich "' + b.bereich + '": StoffItem ohne id');
          else {
            if (stoffItemIds.has(item.id)) errors.push('Doppelte StoffItem-ID: ' + item.id);
            stoffItemIds.add(item.id);
          }
          if (typeof item.titel !== 'string' || !item.titel.trim()) errors.push('Bereich "' + b.bereich + '": StoffItem ohne titel');
          if (!Array.isArray(item.deskriptorIds) || item.deskriptorIds.length === 0) {
            errors.push('Bereich "' + b.bereich + '", StoffItem "' + item.id + '": deskriptorIds fehlt');
            continue;
          }
          for (const id of item.deskriptorIds) {
            if (!idsDiesesBereichs.has(id)) {
              errors.push('schulstufe ' + st.schulstufe + ', Bereich "' + b.bereich + '", StoffItem "' + item.id + '": Deskriptor "' + id + '" fehlt in diesem Bereich');
            }
          }
        }
      }
    }

    if (istQuellengestutzt) {
      let erforderlicheBereiche = erlaubteBereiche;
      if (data.fach === 'mathematik') {
        erforderlicheBereiche = st.schulstufe <= 8
          ? erlaubteBereiche.slice(0, 4)
          : st.schulstufe === 9
            ? erlaubteBereiche.slice(4, 6)
            : erlaubteBereiche.slice(4);
      }
      if (data.fach === 'biologie') {
        erforderlicheBereiche = st.schulstufe <= 8
          ? [erlaubteBereiche[0], erlaubteBereiche[2], erlaubteBereiche[3]]
          : [erlaubteBereiche[1], erlaubteBereiche[2], erlaubteBereiche[3]];
      }
      for (const bereich of erforderlicheBereiche) {
        if (!bereicheDerStufe.has(bereich)) {
          errors.push('schulstufe ' + st.schulstufe + ': Kompetenzbereich "' + bereich + '" fehlt');
        }
      }
    }
  }

  if (istQuellengestutzt) {
    for (let schulstufe = 5; schulstufe <= 12; schulstufe++) {
      if (!schulstufen.has(schulstufe)) errors.push('schulstufe ' + schulstufe + ': Abdeckung fehlt');
    }
    if (typeof data.redaktionellerHinweis !== 'string' || !/LUKA/i.test(data.redaktionellerHinweis)) {
      errors.push('redaktionellerHinweis muss die didaktische LUKA-Aufbereitung kennzeichnen');
    }
    for (const bereich of erlaubteBereiche) {
      if (!bereicheGesamt.has(bereich)) errors.push('Kompetenzbereich "' + bereich + '" ist in keiner Schulstufe abgedeckt');
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
  const hatStufenItems = data.stufen.some((st) => st.bereiche.some((b) => Array.isArray(b.stoffItems) && b.stoffItems.length > 0));
  const lines = [
    "import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';",
    '',
    '// ' + label + ' — generiert aus Lehrplan-Recherche (_stufen.json).',
    '// Deskriptoren sind gesourct und mit konkreter Schulstufe (5–12) hinterlegt;',
    hatStufenItems
      ? '// StoffItem-Titel sind redaktionelle LUKA-Lerninhalte, keine offiziellen Lehrplantitel.'
      : '// StoffItems bleiben grob (Unter-/Oberstufe) und verlinken passende Deskriptoren.',
    '',
    'export const ' + fach + 'Deskriptoren: Deskriptor[] = [',
  ];

  const stoffItemMap = new Map(); // Bestehende Quellen gruppieren weiterhin nach Stufe/Bereich
  const stufenStoffItems = [];
  const seenIds = new Set();
  const tsString = (value) => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');

  for (const st of data.stufen) {
    const schulstufe = st.schulstufe;
    const stufe = stufeFromSchulstufe(schulstufe);
    for (const bereichObj of st.bereiche) {
      const bereich = bereichObj.bereich;
      const expliziteItems = Array.isArray(bereichObj.stoffItems) && bereichObj.stoffItems.length > 0;
      let item;
      if (!expliziteItems) {
        const key = stufe + '|' + bereich;
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
        item = stoffItemMap.get(key);
      }

      for (let i = 0; i < bereichObj.deskriptoren.length; i++) {
        const d = bereichObj.deskriptoren[i];
        const id = d.id?.trim() || fachCode + '-' + slugify(bereich) + '-s' + schulstufe + '-' + (i + 1);
        if (seenIds.has(id)) throw new Error('Doppelte Deskriptor-ID: ' + id);
        seenIds.add(id);
        if (item) item.deskriptorIds.push(id);
        const quelle = d.quelle?.trim() || defaultQuelle || '';
        lines.push(
          "  { id: '" + tsString(id) + "', rahmenwerk: 'at-lehrplan', fach: '" + fach + "', stufe: '" + stufe + "', schulstufe: " + schulstufe + ", bereich: '" + tsString(bereich) + "', code: '" + tsString(d.code ?? '') + "', text: '" + tsString(d.text) + "', quelle: '" + tsString(quelle) + "' },"
        );
      }

      if (expliziteItems) {
        for (const stoffItem of bereichObj.stoffItems) {
          stufenStoffItems.push({
            id: stoffItem.id,
            titel: stoffItem.titel,
            stufe,
            schulstufe,
            bereich,
            deskriptorIds: stoffItem.deskriptorIds,
          });
        }
      }
    }
  }

  lines.push('];', '', 'export const ' + fach + 'StoffItems: StoffItem[] = [');
  const bereichOrder = KOMPETENZBEREICHE[fach] ?? [];
  const stoffItems = [...stoffItemMap.values(), ...stufenStoffItems].sort((a, b) => {
    const idxA = bereichOrder.indexOf(a.bereich);
    const idxB = bereichOrder.indexOf(b.bereich);
    if (idxA !== idxB) return idxA - idxB;
    if (a.schulstufe !== undefined && b.schulstufe !== undefined) return a.schulstufe - b.schulstufe;
    return a.stufe === 'unterstufe' ? -1 : 1;
  });

  for (const item of stoffItems) {
    const types = DEFAULT_AUFGABENTYPEN[item.titel] ?? DEFAULT_AUFGABENTYPEN[item.bereich] ?? ['offeneVerstaendnisfrage'];
    const schulstufe = item.schulstufe === undefined ? '' : 'schulstufe: ' + item.schulstufe + ', ';
    lines.push(
      "  { id: '" + tsString(item.id) + "', rahmenwerk: 'at-lehrplan', titel: '" + tsString(item.titel) + "', fach: '" + fach + "', stufe: '" + item.stufe + "', " + schulstufe + "kategorie: '" + tsString(item.bereich) + "', deskriptorIds: [" + item.deskriptorIds.map((id) => "'" + tsString(id) + "'").join(', ') + "], defaultAufgabentypen: [" + types.map((type) => "'" + tsString(type) + "'").join(', ') + "] },"
    );
  }
  lines.push('];', '');

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
