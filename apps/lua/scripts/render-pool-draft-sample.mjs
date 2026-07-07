#!/usr/bin/env node
// Einmaliger Render-Test fuer 1-2 grenzwertige Eintraege aus einem Aufgabenpool-Draft
// (docs/REVIEW-aufgabenpool-neue-faecher-2026-07.md). Nimmt fertige PoolEntry-Blocks aus
// einer Draft-Datei (scripts/out/*.json), baut ein minimales DocumentV1 drumherum und
// rendert es echt ueber packages/renderer (kein Mock) zu DOCX, um zu pruefen, ob der
// Renderer mit den generierten Bloecken sauber umgeht.
//
// Aufruf: node scripts/render-pool-draft-sample.mjs <draft.json> <poolEntryId...>

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { renderDocument } from '../packages/renderer/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

const [draftPath, ...ids] = process.argv.slice(2);
if (!draftPath || ids.length === 0) {
  console.error('Aufruf: node scripts/render-pool-draft-sample.mjs <draft.json> <poolEntryId...>');
  process.exit(1);
}

const resolvedDraftPath = existsSync(draftPath) ? draftPath : join(OUT, basename(draftPath));
const entries = JSON.parse(readFileSync(resolvedDraftPath, 'utf8'));

for (const id of ids) {
  const entry = entries.find((e) => e.id === id || e.id.startsWith(id));
  if (!entry) {
    console.error(`✗ PoolEntry "${id}" nicht gefunden in ${draftPath}`);
    continue;
  }
  const block = JSON.parse(entry.blockJson);
  const doc = {
    meta: {
      stufe: entry.stufe,
      fach: entry.fach,
      thema: entry.thema,
      datum: new Date().toISOString().slice(0, 10),
      klasse: '',
      notizen: '',
      modus: 'kompetenz',
      rahmenwerk: 'at-lehrplan',
      schulstufe: entry.schulstufe,
      kompetenzNiveau: 'standard',
      bewertungsschema: 'at-1-5',
    },
    quelltexte: block.quelleId
      ? [{ id: block.quelleId, titel: 'Quelltext (Pool-Entwurf)', inhalt: '(siehe Original-Kombi im Skript)', herkunft: { typ: 'eingabe', ref: '' } }]
      : [],
    bloecke: [block],
  };

  console.log(`\n▶ Render-Test  ${entry.fach} · ${entry.thema} · ${entry.aufgabentyp}  (id=${entry.id.slice(0, 8)})`);
  try {
    const { schueler, loesung } = await renderDocument(doc);
    const base = `pool-sample_${entry.fach}_${entry.aufgabentyp}`;
    const sPath = join(OUT, `${base}_schueler.docx`);
    const lPath = join(OUT, `${base}_loesung.docx`);
    writeFileSync(sPath, schueler);
    writeFileSync(lPath, loesung);
    console.log(`  ✓ geschrieben: ${sPath} (${schueler.length} B), ${lPath} (${loesung.length} B)`);
  } catch (e) {
    console.error(`  ✗ Render fehlgeschlagen: ${e instanceof Error ? e.stack : String(e)}`);
  }
}
