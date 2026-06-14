import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LineRuleType,
  PageNumber,
  HeightRule,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  UnderlineType,
  convertMillimetersToTwip,
} from 'docx';
import type { DocumentV1, Block, QuellText } from '@lehrunterlagen/schema';
import type { RenderTemplate } from './template.js';
import { RENDER_TEMPLATES, getDefaultTemplate } from './template.js';
import { baueWortbank, shuffle, baueKreuzwortgitter, baueWortgitter, bereinigeQuelltext } from '@lehrunterlagen/schema';

const DEFAULT_TEMPLATE = RENDER_TEMPLATES.klassisch;

function thinBorder(template: RenderTemplate) {
  return { style: BorderStyle.SINGLE, size: template.borderWidth, color: template.borderColor };
}

function headingProps(template: RenderTemplate) {
  switch (template.headingStyle) {
    case 'bold': return { bold: true };
    case 'bold-underline': return { bold: true, underline: { type: UnderlineType.SINGLE } };
    case 'accent': return { bold: true, color: template.color.accent };
  }
}

// Invisible border for non-bordered cells
const NO_BORDER = { style: BorderStyle.NIL, size: 0, color: 'FFFFFF' } as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RenderResult {
  schueler: Buffer;
  loesung: Buffer;
}

export interface RenderResultBlobs {
  schueler: Blob;
  loesung: Blob;
}


// ---------------------------------------------------------------------------
// Korrekturraster types (lokal, spiegelt packages/qa/src/korrekturraster/types.ts)
// Kein Import aus qa — qa → renderer-Abhaengigkeit wuerde Kreis erzeugen.
// ---------------------------------------------------------------------------

export interface RasterKriterium {
  kriterium: string;
  beschreibung: string;
  maxPunkte: number;
  erreichtePunkte: number | null;
  anmerkung: string;
}

export interface RasterBlock {
  blockId: string;
  blockNr: number;
  typ: string;
  aufgabeLabel: string;
  kriterien: RasterKriterium[];
  maxPunkte: number;
}

export interface Notenstufe {
  note: 1 | 2 | 3 | 4 | 5;
  bezeichnung: string;
  minProzent: number;
  maxProzent: number;
  minPunkte: number;
  maxPunkte: number;
}

export interface KorrekturrasterDokument {
  meta: { fach: string; stufe: string; thema: string; datum: string; klasse: string };
  bloecke: RasterBlock[];
  gesamtPunkte: number;
  notenschluessel: Notenstufe[];
}

export async function renderDocument(doc: DocumentV1, template: RenderTemplate = DEFAULT_TEMPLATE): Promise<RenderResult> {
  const [schueler, loesung] = await Promise.all([
    buildDocxPacked(Packer.toBuffer.bind(Packer), doc, 'schueler', template),
    buildDocxPacked(Packer.toBuffer.bind(Packer), doc, 'loesung', template),
  ]);
  return { schueler, loesung };
}

/** Browser-native export — returns Blobs suitable for URL.createObjectURL(). */
export async function renderDocumentToBlobs(doc: DocumentV1, template: RenderTemplate = DEFAULT_TEMPLATE): Promise<RenderResultBlobs> {
  const [schueler, loesung] = await Promise.all([
    buildDocxPacked(Packer.toBlob.bind(Packer), doc, 'schueler', template),
    buildDocxPacked(Packer.toBlob.bind(Packer), doc, 'loesung', template),
  ]);
  return { schueler, loesung };
}

// ---------------------------------------------------------------------------
// Kompetenznachweis (Coverage) — welche Lehrplan-Deskriptoren deckt die Uebung ab?
// Renderer bleibt datenquellen-agnostisch: bekommt fertige Deskriptor-Arrays
// (kein Import des Web-Stoffkatalogs).
// ---------------------------------------------------------------------------

export interface CoverageDeskriptor {
  bereich: string;
  code?: string;
  text: string;
}

export interface CoverageMeta {
  fach: string;
  stufe: string;
  thema: string;
  datum: string;
  klasse?: string;
}

function buildCoverageDoc(
  meta: CoverageMeta,
  abgedeckt: CoverageDeskriptor[],
  fehlend: CoverageDeskriptor[],
  template: RenderTemplate,
): Document {
  const children: (Paragraph | Table)[] = [
    ...buildCoverageHeader(meta, abgedeckt.length, fehlend.length, template),
    buildCoverageTabelle(abgedeckt, fehlend, template),
  ];
  return new Document({
    sections: [
      {
        properties: { page: { margin: template.margin } },
        headers: { default: buildPageHeader(template) },
        footers: { default: buildPageFooter(template) },
        children,
      },
    ],
  });
}

/** Kompetenznachweis als DOCX-Buffer (Node, z. B. Smoke-Skript). */
export async function renderCoverage(
  meta: CoverageMeta,
  abgedeckt: CoverageDeskriptor[],
  fehlend: CoverageDeskriptor[],
  template: RenderTemplate = DEFAULT_TEMPLATE,
): Promise<Buffer> {
  return Packer.toBuffer(buildCoverageDoc(meta, abgedeckt, fehlend, template));
}

/** Kompetenznachweis als Blob (Browser-Export). */
export async function renderCoverageToBlob(
  meta: CoverageMeta,
  abgedeckt: CoverageDeskriptor[],
  fehlend: CoverageDeskriptor[],
  template: RenderTemplate = DEFAULT_TEMPLATE,
): Promise<Blob> {
  return Packer.toBlob(buildCoverageDoc(meta, abgedeckt, fehlend, template));
}

function buildCoverageHeader(
  meta: CoverageMeta,
  anzahlAbgedeckt: number,
  anzahlFehlend: number,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const fachLabel = meta.fach.charAt(0).toUpperCase() + meta.fach.slice(1);
  const stufeLabel = meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe';
  const gesamt = anzahlAbgedeckt + anzahlFehlend;

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        run(`Kompetenznachweis — ${fachLabel} — ${meta.thema}`, {
          font: template.font, size: template.fontSize.h1, ...headingProps(template),
        }),
      ],
    }),
    new Paragraph({
      children: [
        run(
          `${stufeLabel}${meta.klasse ? ` · Klasse ${meta.klasse}` : ''} · ${formatDatum(meta.datum)}`,
          { font: template.font, size: template.fontSize.body, color: template.color.gray },
        ),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        run(
          `Diese Übung deckt ${anzahlAbgedeckt} von ${gesamt} Lehrplan-Deskriptoren des Bereichs ab` +
            (anzahlFehlend > 0 ? ` — ${anzahlFehlend} noch offen.` : '.'),
          { font: template.font, size: template.fontSize.body, bold: true },
        ),
      ],
      spacing: { after: 200 },
    }),
  ];
}

function buildCoverageTabelle(
  abgedeckt: CoverageDeskriptor[],
  fehlend: CoverageDeskriptor[],
  template: RenderTemplate,
): Table {
  const border = thinBorder(template);
  const cell = (text: string, widthPct: number, opts?: { bold?: boolean; center?: boolean; color?: string }) => {
    const runOpts: Parameters<typeof run>[1] = { font: template.font, size: template.fontSize.body };
    if (opts?.bold) runOpts.bold = true;
    if (opts?.color) runOpts.color = opts.color;
    return new TableCell({
      borders: { top: border, bottom: border, left: border, right: border },
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [run(text, runOpts)],
        }),
      ],
    });
  };

  const headerRow = new TableRow({
    children: [cell('Bereich', 22, { bold: true }), cell('Deskriptor', 63, { bold: true }), cell('Status', 15, { bold: true, center: true })],
  });

  const datenRow = (d: CoverageDeskriptor, status: 'ab' | 'off') => {
    const text = d.code ? `${d.code} — ${d.text}` : d.text;
    return new TableRow({
      children: [
        cell(d.bereich, 22),
        cell(text, 63),
        cell(status === 'ab' ? '✓ abgedeckt' : '— offen', 15, { center: true, color: status === 'ab' ? template.color.accent : template.color.gray }),
      ],
    });
  };

  const rows = [
    headerRow,
    ...abgedeckt.map((d) => datenRow(d, 'ab')),
    ...fehlend.map((d) => datenRow(d, 'off')),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

// ---------------------------------------------------------------------------
// Korrekturraster: Drittes Dokument (Lehrerinstrument)
// ---------------------------------------------------------------------------

export async function renderRaster(raster: KorrekturrasterDokument, template: RenderTemplate = DEFAULT_TEMPLATE): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    ...buildRasterHeader(raster, template),
    ...raster.bloecke.flatMap((block) => buildRasterBlock(block, template)),
    buildGesamtzeile(raster.gesamtPunkte, template),
    buildNotenschluessel(raster.notenschluessel, template),
    ...buildFreitextfeld(template),
  ];

  const document = new Document({
    sections: [
      {
        properties: { page: { margin: template.margin } },
        headers: { default: buildPageHeader(template) },
        footers: { default: buildPageFooter(template) },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

function buildRasterHeader(raster: Pick<KorrekturrasterDokument, 'meta'>, template: RenderTemplate): (Paragraph | Table)[] {
  const fachLabel = raster.meta.fach.charAt(0).toUpperCase() + raster.meta.fach.slice(1);
  const stufeLabel = raster.meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe';

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        run(`Korrekturraster — ${fachLabel} — ${raster.meta.thema}`, {
          font: template.font, size: template.fontSize.h1, ...headingProps(template),
        }),
      ],
    }),
    new Paragraph({
      children: [
        run(
          `${stufeLabel} · Klasse ${raster.meta.klasse} · ${formatDatum(raster.meta.datum)}`,
          { font: template.font, size: template.fontSize.body, color: template.color.gray },
        ),
      ],
      spacing: { after: 200 },
    }),
    // Kopfzeile: Klasse / Name / Datum
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
              width: { size: 15, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [run('Klasse:', { font: template.font, size: template.fontSize.body })] })],
            }),
            new TableCell({
              borders: { top: thinBorder(template), bottom: thinBorder(template), left: NO_BORDER, right: thinBorder(template) },
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [run('', { font: template.font, size: template.fontSize.body })] })],
            }),
            new TableCell({
              borders: { top: thinBorder(template), bottom: thinBorder(template), left: NO_BORDER, right: thinBorder(template) },
              width: { size: 12, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [run('Name:', { font: template.font, size: template.fontSize.body })] })],
            }),
            new TableCell({
              borders: { top: thinBorder(template), bottom: thinBorder(template), left: NO_BORDER, right: thinBorder(template) },
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [run('', { font: template.font, size: template.fontSize.body })] })],
            }),
            new TableCell({
              borders: { top: thinBorder(template), bottom: thinBorder(template), left: NO_BORDER, right: thinBorder(template) },
              width: { size: 12, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [run('Datum:', { font: template.font, size: template.fontSize.body })] })],
            }),
            new TableCell({
              borders: { top: thinBorder(template), bottom: thinBorder(template), left: NO_BORDER, right: thinBorder(template) },
              width: { size: 18, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [run('', { font: template.font, size: template.fontSize.body })] })],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  ];
}

function buildRasterBlock(block: RasterBlock, template: RenderTemplate): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  result.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        run(`${block.aufgabeLabel}  (${block.maxPunkte} ${block.maxPunkte === 1 ? 'Punkt' : 'Punkte'})`, {
          font: template.font, size: template.fontSize.h2, ...headingProps(template),
        }),
      ],
      spacing: { before: 240, after: 100 },
    }),
  );

  // Kriterien-Tabelle
  const headerRow = new TableRow({
    children: ['Kriterium', 'Beschreibung', 'Max.', 'Erreicht', 'Anmerkung'].map(
      (text, i) =>
        new TableCell({
          borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
          width: { size: [30, 40, 12, 10, 8][i] ?? 30, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [run(text, { font: template.font, size: template.fontSize.body, bold: true })],
            }),
          ],
        }),
    ),
  });

  const dataRows = block.kriterien.map(
    (k) =>
      new TableRow({
        children: [
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [run(k.kriterium, { font: template.font, size: template.fontSize.body })] })],
          }),
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [run(k.beschreibung, { font: template.font, size: template.fontSize.body })] })],
          }),
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            width: { size: 12, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(k.maxPunkte), { font: template.font, size: template.fontSize.body })] })],
          }),
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [run('', { font: template.font, size: template.fontSize.body })] })],
          }),
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            width: { size: 8, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [run('', { font: template.font, size: template.fontSize.body })] })],
          }),
        ],
      }),
  );

  result.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    }),
  );

  return result;
}

function buildGesamtzeile(gesamtPunkte: number, template: RenderTemplate): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
      insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: thinBorder(template), bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            width: { size: 12, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [run('Gesamt:', { font: template.font, size: template.fontSize.body, bold: true })] })],
          }),
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            width: { size: 10, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('', { font: template.font, size: template.fontSize.body })] })],
          }),
          new TableCell({
            borders: { top: { style: BorderStyle.NIL, size: 0, color: 'FFFFFF' }, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [run(`/ ${gesamtPunkte} Punkte`, { font: template.font, size: template.fontSize.body, bold: true })] })],
          }),
          new TableCell({
            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            width: { size: 48, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [] })],
          }),
        ],
      }),
    ],
  });
}

function buildNotenschluessel(noten: Notenstufe[], template: RenderTemplate): Table {
  const headerRow = new TableRow({
    children: ['Note', 'Bezeichnung', 'Punktebereich'].map(
      (text) =>
        new TableCell({
          borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(text, { font: template.font, size: template.fontSize.body, bold: true })],
            }),
          ],
        }),
    ),
  });

  const dataRows = noten.map(
    (n) =>
      new TableRow({
        children: [
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(n.note), { font: template.font, size: template.fontSize.body })] })],
          }),
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            children: [new Paragraph({ children: [run(n.bezeichnung, { font: template.font, size: template.fontSize.body })] })],
          }),
          new TableCell({
            borders: { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`${n.minPunkte}–${n.maxPunkte}`, { font: template.font, size: template.fontSize.body })] })],
          }),
        ],
      }),
  );

  return new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function buildFreitextfeld(template: RenderTemplate): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [
    new Paragraph({
      children: [run('Allgemeine Anmerkungen:', { font: template.font, size: template.fontSize.body, bold: true })],
      spacing: { before: 240, after: 80 },
    }),
  ];

  for (let i = 0; i < 4; i++) {
    result.push(writingLine(i < 3, template));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Document builder
// ---------------------------------------------------------------------------

type Mode = 'schueler' | 'loesung';

async function buildDocxPacked<T>(
  packer: (doc: Document) => Promise<T>,
  doc: DocumentV1,
  mode: Mode,
  template: RenderTemplate,
): Promise<T> {
  const quelltextMap = new Map<string, QuellText>(
    doc.quelltexte.map((q) => [q.id, q]),
  );

  const hidePunkte = doc.meta.punkteAusblenden === true;
  const children: (Paragraph | Table)[] = [
    ...buildDocumentHeader(doc, mode, template),
    buildSchuelerkopf(doc.meta, template),
    ...(hidePunkte ? [] : buildPunkteUebersicht(doc.bloecke, template, doc.meta.fach)),
    ...buildMerkkasten(doc.didaktik?.merkkasten, template),
    ...buildQuelltexte(doc.quelltexte, template),
    ...doc.bloecke.flatMap((block, i) =>
      buildBlock(block, i + 1, mode, quelltextMap, template, hidePunkte, doc.meta.fach),
    ),
    ...(doc.didaktik?.transferaufgabe?.trim()
      ? buildTransferaufgabe(doc.didaktik.transferaufgabe.trim(), mode, template, doc.meta.fach)
      : []),
  ];

  const document = new Document({
    sections: [
      {
        properties: { page: { margin: template.margin } },
        headers: { default: buildPageHeader(template) },
        footers: { default: buildPageFooter(template) },
        children,
      },
    ],
  });

  return packer(document);
}

// ---------------------------------------------------------------------------
// Page header / footer
// ---------------------------------------------------------------------------

function buildPageHeader(template: RenderTemplate): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          run('', { font: template.font, size: template.fontSize.body, color: template.color.gray }),
        ],
        spacing: { after: 0 },
      }),
    ],
  });
}

function buildPageFooter(template: RenderTemplate): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          run('Seite ', { font: template.font, size: template.fontSize.body, color: template.color.gray }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: template.font, size: template.fontSize.body, color: template.color.gray,
          }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Document title area
// ---------------------------------------------------------------------------

function buildDocumentHeader(doc: DocumentV1, mode: Mode, template: RenderTemplate): Paragraph[] {
  const { meta } = doc;
  const isEnglish = meta.fach === 'englisch';
  const fachLabel = isEnglish ? 'English' : 'Deutsch';
  const stufeLabel = meta.stufe === 'oberstufe' ? (isEnglish ? 'Upper level' : 'Oberstufe') : (isEnglish ? 'Lower level' : 'Unterstufe');
  const modeLabel = mode === 'loesung' ? (isEnglish ? ' – Solution' : ' – Lösungsfassung') : '';

  // Sprechender Arbeitsblatt-Titel (didaktischer Rahmen) hat Vorrang; Fach/Thema
  // rutschen dann in die Unterzeile.
  const sprechenderTitel = doc.didaktik?.arbeitsblattTitel?.trim();
  const titel = sprechenderTitel ? `${sprechenderTitel}${modeLabel}` : `${fachLabel} – ${meta.thema}${modeLabel}`;
  const subParts = [
    ...(sprechenderTitel ? [`${fachLabel} · ${meta.thema}`] : []),
    stufeLabel + (meta.klasse ? ` · Klasse ${meta.klasse}` : '') + ` · ${formatDatum(meta.datum)}`,
    ...(meta.notizen ? [meta.notizen] : []),
  ];

  const result = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        run(titel, { font: template.font, size: template.fontSize.h1, ...headingProps(template) }),
      ],
    }),
    new Paragraph({
      children: [
        run(subParts.join('  |  '), { font: template.font, size: template.fontSize.body, color: template.color.gray }),
      ],
      spacing: { after: doc.didaktik?.einleitung ? 120 : 200 },
    }),
  ];

  // Schülergerichtete Einleitung (1-2 Sätze, kursiv) direkt unter dem Kopf.
  if (doc.didaktik?.einleitung?.trim()) {
    result.push(new Paragraph({
      children: [run(doc.didaktik.einleitung.trim(), { font: template.font, size: template.fontSize.body, italics: true })],
      spacing: { after: 200 },
    }));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Didaktischer Rahmen: Merkkasten + Transferaufgabe (primär Kompetenz-Modus)
// ---------------------------------------------------------------------------

/** Hilfs-Run mit kursiver Objektsprache: Wörter in *Sternchen* werden kursiv gerendert. */
function runWithItalics(text: string, opts: Omit<RunOpts, 'font' | 'size'> & { baseItalics?: boolean }, template: RenderTemplate): TextRun[] {
  const { baseItalics = false, ...runOpts } = opts;
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return run(part.slice(1, -1), { ...runOpts, italics: true, font: template.font, size: template.fontSize.body });
    }
    return run(part, { ...runOpts, italics: baseItalics, font: template.font, size: template.fontSize.body });
  });
}

/** Gerahmte Merkbox — neu als strukturierte 2-Spalten-Grammatik-Box. */
function buildMerkkasten(merkkasten: NonNullable<DocumentV1['didaktik']>['merkkasten'], template: RenderTemplate): (Paragraph | Table)[] {
  if (!merkkasten) return [];
  const border = { style: BorderStyle.SINGLE, size: 12, color: template.color.text } as const;
  const title = new Paragraph({
    children: [run(merkkasten.titel, { font: template.font, size: template.fontSize.body, bold: true })],
    spacing: { after: 80 },
  });

  // Legacy-Modus: einfache Punkte (Abwärtskompatibilität).
  if (!merkkasten.items || merkkasten.items.length === 0) {
    if (!merkkasten.punkte || merkkasten.punkte.length === 0) return [];
    const inhalt: Paragraph[] = [
      title,
      ...merkkasten.punkte.map((p, i) => new Paragraph({
        children: [
          run('•  ', { font: template.font, size: template.fontSize.body }),
          ...runWithItalics(p, {}, template),
        ],
        spacing: { after: i === (merkkasten.punkte?.length ?? 0) - 1 ? 0 : 40 },
      })),
    ];
    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: { top: border, bottom: border, left: border, right: border },
                shading: { fill: 'F2F2F2' },
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                children: inhalt,
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ children: [], spacing: { after: 120 } }),
    ];
  }

  // Neu: strukturierte Items als 2-Spalten-Tabelle (Notion | Form/Use/Signal words/Example).
  const headerBorder = { style: BorderStyle.SINGLE, size: 8, color: template.color.text } as const;
  const headerCell = (text: string, width: number) => new TableCell({
    borders: { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder },
    shading: { fill: 'E7E7E7' },
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ children: [run(text, { font: template.font, size: template.fontSize.body, bold: true })] })],
  });

  const bodyCell = (children: TextRun[], width: number) => new TableCell({
    borders: { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder },
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ children })],
  });

  const rows: TableRow[] = [
    new TableRow({ children: [headerCell('Structure', 25), headerCell('How to use it', 75)] }),
  ];

  for (const item of merkkasten.items) {
    const left: TextRun[] = [run(item.notion, { font: template.font, size: template.fontSize.body, bold: true })];
    if (item.form) {
      left.push(run('\n', { font: template.font, size: template.fontSize.body }));
      left.push(...runWithItalics(item.form, { baseItalics: true }, template));
    }

    const right: TextRun[] = [];
    if (item.use && item.use.length > 0) {
      right.push(run(item.use.join(' '), { font: template.font, size: template.fontSize.body }));
      right.push(run(' ', { font: template.font, size: template.fontSize.body }));
    }
    if (item.signalWords && item.signalWords.length > 0) {
      right.push(run('Signal words: ', { font: template.font, size: template.fontSize.body, bold: true }));
      right.push(...item.signalWords.join(', ').split(/(\*[^*]+\*)/g).map((part) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return run(part.slice(1, -1), { font: template.font, size: template.fontSize.body, italics: true });
        }
        return run(part, { font: template.font, size: template.fontSize.body, italics: true });
      }));
      right.push(run(' ', { font: template.font, size: template.fontSize.body }));
    }
    if (item.example) {
      right.push(run('Example: ', { font: template.font, size: template.fontSize.body, bold: true }));
      right.push(run(item.example, { font: template.font, size: template.fontSize.body, italics: true }));
    }
    if (item.tip) {
      right.push(run(' ', { font: template.font, size: template.fontSize.body }));
      right.push(run('💡 Tip: ', { font: template.font, size: template.fontSize.body, bold: true }));
      right.push(...runWithItalics(item.tip, {}, template));
    }

    rows.push(new TableRow({
      children: [bodyCell(left, 25), bodyCell(right.length > 0 ? right : [run('–', { font: template.font, size: template.fontSize.body })], 75)],
    }));
  }

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: { top: border, bottom: border, left: border, right: border },
              shading: { fill: 'F8F8F8' },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [title, new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ children: [], spacing: { after: 120 } }),
  ];
}

/** Freie Produktionsaufgabe zum Abschluss (Transfer auf die eigene Lebenswelt). */
function buildTransferaufgabe(text: string, mode: Mode, template: RenderTemplate, fach: DocumentV1['meta']['fach'] = 'deutsch'): (Paragraph | Table)[] {
  const isEnglish = fach === 'englisch';
  const title = isEnglish ? 'Your turn:' : 'Zum Schluss – jetzt du!';
  // Verhindere doppelte "Your turn:"-Überschriften, wenn der LLM sie bereits in den Text geschrieben hat.
  const cleanedText = text.replace(/^Your turn:\s*/i, '').replace(/^Zum Schluss – jetzt du!\s*/i, '');
  const result: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      keepNext: true,
      border: {
        top:    { style: BorderStyle.SINGLE, size: 6, color: template.color.text },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: template.color.text },
      },
      spacing: { before: 280, after: 120 },
      children: [run(title, { font: template.font, size: template.fontSize.h2, ...headingProps(template) })],
    }),
    new Paragraph({
      keepNext: true,
      children: [run(cleanedText, { font: template.font, size: template.fontSize.body, bold: true })],
      spacing: { after: 120 },
    }),
  ];
  if (mode === 'schueler') {
    for (let i = 0; i < 4; i++) {
      result.push(new Paragraph({ children: [blankLine(95, template)], spacing: { after: 200 } }));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Schülerkopf (Name / Klasse / Datum) — DESIGN.md §7
// ---------------------------------------------------------------------------

function buildSchuelerkopf(meta: DocumentV1['meta'], template: RenderTemplate): Table {
  const isEnglish = meta.fach === 'englisch';
  const cellBorder = {
    top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template),
  };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorder,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  run(isEnglish ? 'Name: ' : 'Name: ', { font: template.font, size: template.fontSize.body, bold: true }),
                  blankLine(28, template),
                  run(isEnglish ? '     Class: ' : '     Klasse: ', { font: template.font, size: template.fontSize.body, bold: true }),
                  // Leere Klasse → Linie zum Eintragen, sonst der Wert.
                  meta.klasse ? run(meta.klasse, { font: template.font, size: template.fontSize.body }) : blankLine(8, template),
                  run(isEnglish ? '     Date: ' : '     Datum: ', { font: template.font, size: template.fontSize.body, bold: true }),
                  run(formatDatum(meta.datum), { font: template.font, size: template.fontSize.body }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Aufgabenübersicht (Punkte je Aufgabe, Gesamtsumme, Note/Unterschrift)
// ---------------------------------------------------------------------------

function buildPunkteUebersicht(bloecke: Block[], template: RenderTemplate, fach: DocumentV1['meta']['fach'] = 'deutsch'): (Paragraph | Table)[] {
  if (bloecke.length === 0) return [];

  const isEnglish = fach === 'englisch';
  const cellBorder = {
    top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template),
  };
  const gesamt = bloecke.reduce((sum, b) => sum + b.punkte, 0);

  const headerCell = (text: string, width: number, align?: typeof AlignmentType[keyof typeof AlignmentType]) =>
    new TableCell({
      borders: cellBorder,
      width: { size: width, type: WidthType.PERCENTAGE },
      shading: { fill: 'D9D9D9' },
      margins: { top: 40, bottom: 40, left: 100, right: 100 },
      children: [new Paragraph({ ...(align ? { alignment: align } : {}), children: [run(text, { font: template.font, size: template.fontSize.body, bold: true })] })],
    });

  const cell = (children: TextRun[], width: number, align?: typeof AlignmentType[keyof typeof AlignmentType], bold = false) =>
    new TableCell({
      borders: cellBorder,
      width: { size: width, type: WidthType.PERCENTAGE },
      margins: { top: 40, bottom: 40, left: 100, right: 100 },
      ...(bold ? { shading: { fill: 'F2F2F2' } } : {}),
      children: [new Paragraph({ ...(align ? { alignment: align } : {}), children })],
    });

  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('Nr.', 10),
        headerCell(isEnglish ? 'Exercise' : 'Aufgabe', 65),
        headerCell(isEnglish ? 'Points' : 'Punkte', 25, AlignmentType.RIGHT),
      ],
    }),
  ];

  bloecke.forEach((b, i) => {
    rows.push(
      new TableRow({
        children: [
          cell([run(String(i + 1), { font: template.font, size: template.fontSize.body })], 10),
          cell([run(blockLabels(fach)[b.typ], { font: template.font, size: template.fontSize.body })], 65),
          cell([blankLine(6, template), run(` / ${b.punkte}`, { font: template.font, size: template.fontSize.body })], 25, AlignmentType.RIGHT),
        ],
      }),
    );
  });

  rows.push(
    new TableRow({
      children: [
        cell([run('', { font: template.font, size: template.fontSize.body })], 10, undefined, true),
        cell([run(isEnglish ? 'TOTAL' : 'GESAMT', { font: template.font, size: template.fontSize.body, bold: true })], 65, undefined, true),
        cell([blankLine(6, template), run(` / ${gesamt}`, { font: template.font, size: template.fontSize.body, bold: true })], 25, AlignmentType.RIGHT, true),
      ],
    }),
  );

  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      keepNext: true,
      children: [run(isEnglish ? 'Overview' : 'Aufgabenübersicht', { font: template.font, size: template.fontSize.h3, ...headingProps(template) })],
      spacing: { before: 160, after: 80 },
    }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
    new Paragraph({
      children: [
        run(isEnglish ? 'Grade: ' : 'Note: ', { font: template.font, size: template.fontSize.body, bold: true }),
        blankLine(20, template),
        run(isEnglish ? '     Signature: ' : '     Unterschrift: ', { font: template.font, size: template.fontSize.body, bold: true }),
        blankLine(24, template),
      ],
      spacing: { before: 120, after: 80 },
    }),
  ];
}

// ---------------------------------------------------------------------------
// Quelltexte section
// ---------------------------------------------------------------------------

// Wandelt einen Quelltext (mit \n-Zeilen und \n\n-Absätzen/Strophen) in echte
// Absatz-Paragraphen um. docx ignoriert \n innerhalb einer TextRun — Zeilenumbrüche
// brauchen TextRun({ break: 1 }), Strophen-/Absatzabstand kommt über eigene Paragraphen.
function quelltextAbsaetze(inhalt: string, template: RenderTemplate): Paragraph[] {
  const zeilen = inhalt.replace(/\r\n/g, '\n').split('\n');

  // Fallback: kein verwertbarer Inhalt → ein leerer Absatz.
  if (zeilen.length === 0 || zeilen.every((z) => z.trim().length === 0)) {
    return [new Paragraph({ children: [run('', { font: template.font, size: template.fontSize.body })] })];
  }

  return zeilen.map((zeile, i) => {
    const text = zeile.replace(/\s+$/g, '');
    const nr = i + 1;
    if (text.trim().length === 0) {
      return new Paragraph({ children: [run('', { font: template.font, size: template.fontSize.body })], spacing: { after: 60 } });
    }
    return new Paragraph({
      children: [
        new TextRun({
          text: `${nr}.`,
          font: template.font,
          size: template.fontSize.small,
          color: template.color.gray,
          bold: false,
        }),
        new TextRun({ text: '  ', font: template.font, size: template.fontSize.body }),
        new TextRun({ text, font: template.font, size: template.fontSize.body }),
      ],
      spacing: { after: 40 },
      indent: { left: 360 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 8, color: template.color.lightGray },
      },
    });
  });
}

function buildQuelltexte(quelltexte: QuellText[], template: RenderTemplate): (Paragraph | Table)[] {
  if (quelltexte.length === 0) return [];

  const result: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        run(quelltexte.length === 1 ? 'Quelltext' : 'Quelltexte', {
          font: template.font, size: template.fontSize.h2, ...headingProps(template),
        }),
      ],
      spacing: { before: 200, after: 120 },
    }),
  ];

  for (const [i, qt] of quelltexte.entries()) {
    result.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        keepNext: true,
        children: [
          run(`Text ${i + 1}: ${qt.titel || `Quelltext ${i + 1}`}`, { font: template.font, size: template.fontSize.h3, ...headingProps(template) }),
        ],
        spacing: { before: 120, after: qt.herkunft.ref ? 20 : 80 },
      }),
    );
    // Quellenangabe nur, wenn es eine echte Referenz gibt (nicht bei Direkteingabe).
    if (qt.herkunft.ref) {
      result.push(
        new Paragraph({
          keepNext: true,
          children: [run(`nach: ${qt.herkunft.ref}`, { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray })],
          spacing: { after: 80 },
        }),
      );
    }
    // Schutznetz: Website-Boilerplate aus dem angezeigten Quelltext entfernen
    // (fängt auch eingefügten Text, der nicht durch den Import-Cleaner lief).
    result.push(...quelltextAbsaetze(bereinigeQuelltext(qt.inhalt), template));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block dispatcher
// ---------------------------------------------------------------------------

const BLOCK_LABELS_DE: Record<Block['typ'], string> = {
  lueckentext: 'Lückentext',
  matching: 'Zuordnung',
  multipleChoice: 'Multiple Choice',
  offeneVerstaendnisfrage: 'Verständnisfragen',
  offeneSchreibaufgabe: 'Schreibaufgabe',
  markieraufgabe: 'Markieraufgabe',
  wordScramble: 'Wörter ordnen',
  kategorisierung: 'Kategorisierung',
  tabelle: 'Tabelle',
  stiluebung: 'Stilübung',
  songanalyse: 'Songanalyse',
  kreuzwortraetsel: 'Kreuzworträtsel',
  wortgitter: 'Wortgitter',
  vokabeluebung: 'Vokabelübung',
  umformung: 'Umformung',
  fehlerkorrektur: 'Fehlerkorrektur',
};

const BLOCK_LABELS_EN: Record<Block['typ'], string> = {
  lueckentext: 'Gap-fill',
  matching: 'Matching',
  multipleChoice: 'Multiple Choice',
  offeneVerstaendnisfrage: 'Reading questions',
  offeneSchreibaufgabe: 'Writing task',
  markieraufgabe: 'Highlighting',
  wordScramble: 'Word order',
  kategorisierung: 'Categorisation',
  tabelle: 'Table',
  stiluebung: 'Style exercise',
  songanalyse: 'Song analysis',
  kreuzwortraetsel: 'Crossword',
  wortgitter: 'Word search',
  vokabeluebung: 'Vocabulary',
  umformung: 'Transformation',
  fehlerkorrektur: 'Error correction',
};

function blockLabels(fach: DocumentV1['meta']['fach']): Record<Block['typ'], string> {
  return fach === 'englisch' ? BLOCK_LABELS_EN : BLOCK_LABELS_DE;
}

function buildBlock(
  block: Block,
  index: number,
  mode: Mode,
  quelltextMap: Map<string, QuellText>,
  template: RenderTemplate,
  hidePunkte = false,
  fach: DocumentV1['meta']['fach'] = 'deutsch',
): (Paragraph | Table)[] {
  const label = blockLabels(fach)[block.typ];
  const isEnglish = fach === 'englisch';
  const taskLabel = isEnglish ? 'Exercise' : 'Aufgabe';
  // Kreuzworträtsel und Wortgitter sollen auf einer eigenen Seite beginnen,
  // damit sie nicht durch Seitenumbrüche zerrissen werden.
  const needsPageBreak = block.typ === 'kreuzwortraetsel' || block.typ === 'wortgitter';
  // Punkte-Eintragefeld rechtsbündig (___ / X) — entfällt bei punkteAusblenden.
  const punkteRun = hidePunkte ? [] : [
    new TextRun({ children: [new Tab()], font: template.font, size: template.fontSize.body }),
    blankLine(5, template),
    run(` / ${block.punkte}`, { font: template.font, size: template.fontSize.body }),
  ];
  const result: (Paragraph | Table)[] = [
    // Gerahmtes Abschnitts-Banner: Titel links, optional Punkte-Eintragefeld rechtsbündig.
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      keepNext: true,
      pageBreakBefore: needsPageBreak,
      tabStops: [{ type: TabStopType.RIGHT, position: 11906 - template.margin.left - template.margin.right }],
      border: {
        top:    { style: BorderStyle.SINGLE, size: 6, color: template.color.text },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: template.color.text },
      },
      spacing: { before: needsPageBreak ? 0 : 280, after: 120 },
      children: [
        run(`${taskLabel} ${index}  –  ${label}`, {
          font: template.font, size: template.fontSize.h2, ...headingProps(template),
        }),
        ...punkteRun,
      ],
    }),
    new Paragraph({
      keepNext: true,
      children: [run(block.arbeitsanweisung, { font: template.font, size: template.fontSize.body, bold: true })],
      spacing: { after: 100 },
    }),
  ];

  if (block.clue) {
    result.push(
      new Paragraph({
        keepNext: true,
        children: [
          run(`(${block.clue})`, { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray }),
        ],
        spacing: { after: 80 },
      }),
    );
  }

  // Vorgemachtes Beispiel-Item ("0. ... → ...") — demonstriert die Aufgabenstellung.
  if (block.beispiel?.trim()) {
    result.push(
      new Paragraph({
        keepNext: true,
        indent: { left: 360 },
        children: [
          run('Beispiel:  ', { font: template.font, size: template.fontSize.body, bold: true, italics: true }),
          run(block.beispiel.trim(), { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray }),
        ],
        spacing: { after: 120 },
      }),
    );
  }

  switch (block.typ) {
    case 'lueckentext':
      result.push(...buildLueckentext(block, mode, template, fach));
      break;
    case 'matching':
      result.push(...buildMatching(block, mode, template, fach));
      break;
    case 'multipleChoice':
      result.push(...buildMultipleChoice(block, mode, template));
      break;
    case 'offeneVerstaendnisfrage':
      result.push(...buildOffeneVerstaendnisfrage(block, mode, template));
      break;
    case 'offeneSchreibaufgabe':
      result.push(...buildOffeneSchreibaufgabe(block, mode, template));
      break;
    case 'markieraufgabe':
      result.push(...buildMarkieraufgabe(block, mode, quelltextMap, template));
      break;
    case 'wordScramble':
      result.push(...buildWordScramble(block, mode, template));
      break;
    case 'kategorisierung':
      result.push(...buildKategorisierung(block, mode, template, fach));
      break;
    case 'tabelle':
      result.push(...buildTabelle(block, mode, template));
      break;
    case 'stiluebung':
      result.push(...buildStiluebung(block, mode, template));
      break;
    case 'songanalyse':
      result.push(...buildSonganalyse(block, mode, template));
      break;
    case 'kreuzwortraetsel':
      result.push(...buildKreuzwortraetsel(block, mode, template));
      break;
    case 'wortgitter':
      result.push(...buildWortgitter(block, mode, template));
      break;
    case 'vokabeluebung':
      result.push(...buildVokabeluebung(block, mode, template));
      break;
    case 'umformung':
      result.push(...buildUmformung(block, mode, template));
      break;
    case 'fehlerkorrektur':
      result.push(...buildFehlerkorrektur(block, mode, template, fach));
      break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block: umformung
// ---------------------------------------------------------------------------

function buildUmformung(
  block: Extract<Block, { typ: 'umformung' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  // Kein eigener Titel/keine Arbeitsanweisung hier — buildBlock liefert beides bereits.
  const result: (Paragraph | Table)[] = [];
  for (const aufgabe of block.config.aufgaben) {
    const ziel = (aufgabe.anweisung?.trim() || aufgabe.zielstruktur?.trim()) ?? '';
    result.push(new Paragraph({
      indent: { left: 360 },
      children: [
        run(`${aufgabe.nr}. ${aufgabe.ausgangssatz}`, { font: template.font, size: template.fontSize.body }),
        ...(ziel ? [run(`   →  (${ziel})`, { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray })] : []),
      ],
      spacing: { after: mode === 'loesung' ? 40 : 60 },
    }));
    if (mode === 'schueler') {
      result.push(new Paragraph({ indent: { left: 720 }, children: [blankLine(60, template)], spacing: { after: 140 } }));
    } else {
      const loesung = block.loesung.loesungen.find((l) => l.nr === aufgabe.nr);
      if (loesung) {
        result.push(new Paragraph({
          indent: { left: 720 },
          children: [run(`Lösung: ${loesung.umformulierung}`, { font: template.font, size: template.fontSize.body, italics: true })],
          spacing: { after: 100 },
        }));
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Block: fehlerkorrektur
// ---------------------------------------------------------------------------

function buildFehlerkorrektur(
  block: Extract<Block, { typ: 'fehlerkorrektur' }>,
  mode: Mode,
  template: RenderTemplate,
  fach: DocumentV1['meta']['fach'] = 'deutsch',
): (Paragraph | Table)[] {
  // Kein eigener Titel/keine Arbeitsanweisung hier — buildBlock liefert beides bereits.
  const result: (Paragraph | Table)[] = [];
  const isEnglish = fach === 'englisch';
  const correctionLabel = isEnglish ? 'Correction' : 'Korrektur';
  for (const satz of block.config.saetze) {
    result.push(new Paragraph({
      indent: { left: 360 },
      children: [run(`${satz.nr}. ${satz.satz}`, { font: template.font, size: template.fontSize.body })],
      spacing: { after: mode === 'loesung' ? 40 : 60 },
    }));
    if (mode === 'schueler') {
      result.push(new Paragraph({ indent: { left: 720 }, children: [blankLine(60, template)], spacing: { after: 140 } }));
    } else {
      const korrektur = block.loesung.korrekturen.find((k) => k.nr === satz.nr);
      if (korrektur) {
        result.push(new Paragraph({
          indent: { left: 720 },
          children: [run(`${correctionLabel}: ${korrektur.korrigierterSatz}`, { font: template.font, size: template.fontSize.body, italics: true })],
          spacing: { after: 100 },
        }));
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Block: lueckentext
// ---------------------------------------------------------------------------

function buildLueckentext(
  block: Extract<Block, { typ: 'lueckentext' }>,
  mode: Mode,
  template: RenderTemplate,
  fach: DocumentV1['meta']['fach'] = 'deutsch',
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const isEnglish = fach === 'englisch';

  // Wenn der LLM einen Cloze-Text mit Luecken geliefert hat, zeigen wir NUR diesen
  // (keine zusaetzliche Nummern-Tabelle — das ist das schultypische Format).
  const hasText = block.text && block.text.length > 0;

  if (hasText) {
    if (mode === 'schueler') {
      // Inline-Marker (1),(2)… in eine sichtbare Schreiblinie verwandeln, falls der
      // Text nicht ohnehin schon Unterstriche enthaelt.
      const text = block.text!.replace(/\((\d+)\)(?!\s*_)/g, '($1) __________');
      result.push(
        new Paragraph({
          children: [run(text, { font: template.font, size: template.fontSize.body })],
          spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 160 },
        }),
      );
    } else {
      // Loesung: (1),(2)… durch die tatsaechlichen Woerter ersetzen.
      let solutionText = block.text!;
      for (const l of block.loesung.luecken) {
        solutionText = solutionText.replace(`(${l.nr})`, `(${l.nr}) ${l.wort}`);
      }
      result.push(
        new Paragraph({
          indent: { left: 360 },
          children: [run(solutionText, { font: template.font, size: template.fontSize.body, italics: true })],
          spacing: { after: 120 },
        }),
      );
    }
  } else if (mode === 'schueler') {
    // Fallback OHNE Cloze-Text: nummerierte Lueckenzeilen.
    const blanks = Array.from({ length: block.config.anzahlLuecken }, (_, i) => i + 1);
    const rows: TableRow[] = chunkArray(blanks, 4).map(
      (rowNums) =>
        new TableRow({
          children: rowNums.map((nr) =>
            new TableCell({
              borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
              children: [
                new Paragraph({
                  children: [run(`(${nr})  `, { font: template.font, size: template.fontSize.body }), blankLine(80, template)],
                  spacing: { after: 120 },
                }),
              ],
            }),
          ),
        }),
    );
    result.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
      rows,
    }));
  } else {
    // Loesung ohne Cloze-Text: nummerierte Antworten.
    const pairs = block.loesung.luecken.map((l) => `(${l.nr}) ${l.wort}`).join('     ');
    result.push(new Paragraph({
      indent: { left: 360 },
      children: [run(pairs, { font: template.font, size: template.fontSize.body, italics: true })],
      spacing: { after: 120 },
    }));
  }

  // Wortbank als gerahmte Kaestchen (nur Schuelerblatt, wenn aktiviert).
  if (mode === 'schueler' && block.config.wortbank) {
    const loesungsWoerter = block.loesung.luecken.map((l) => l.wort);
    const distraktoren = block.config.distraktorWoerter ?? [];
    const bank = distraktoren.length > 0
      ? baueWortbank(loesungsWoerter, distraktoren, block.id)
      : loesungsWoerter;
    result.push(...buildWortbankBoxen(bank, template, isEnglish ? 'Word bank' : 'Wortbank'));
  }

  return result;
}

/** Wortbank als Reihe gerahmter Kaestchen (schultypisch), 4 pro Zeile. */
function buildWortbankBoxen(woerter: string[], template: RenderTemplate, title: string): (Paragraph | Table)[] {
  if (woerter.length === 0) return [];
  const border = thinBorder(template);
  const perRow = 4;
  const rows: TableRow[] = chunkArray(woerter, perRow).map((group) => {
    const cells = group.map((w) =>
      new TableCell({
        borders: { top: border, bottom: border, left: border, right: border },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        width: { size: Math.floor(100 / perRow), type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(w, { font: template.font, size: template.fontSize.body })] })],
      }),
    );
    // Restzellen ohne Rahmen auffuellen, damit die Tabelle gleichmaessig bleibt.
    while (cells.length < perRow) {
      cells.push(new TableCell({
        borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
        width: { size: Math.floor(100 / perRow), type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [] })],
      }));
    }
    return new TableRow({ children: cells });
  });
  return [
    new Paragraph({ children: [run(title, { font: template.font, size: template.fontSize.body, bold: true })], spacing: { before: 160, after: 60 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
      rows,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Block: matching
// ---------------------------------------------------------------------------

function buildMatching(
  block: Extract<Block, { typ: 'matching' }>,
  mode: Mode,
  template: RenderTemplate,
  fach: DocumentV1['meta']['fach'] = 'deutsch',
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const isEnglish = fach === 'englisch';

  // Items table + options table side by side
  const optionsTable = new Table({
    width: { size: 48, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
      insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
    },
    rows: block.config.optionen.map(
      (opt) =>
        new TableRow({
          children: [
            new TableCell({
              borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
              children: [
                new Paragraph({
                  children: [
                    run(`${opt.key}  `, { font: template.font, size: template.fontSize.body, bold: true }),
                    run(opt.text, { font: template.font, size: template.fontSize.body }),
                  ],
                  spacing: { after: 160 },
                }),
              ],
            }),
          ],
        }),
    ),
  });

  const answerRows = block.config.items.map((item) => {
    const solutionKey = block.loesung.zuordnung[String(item.nr)];
    return new TableRow({
      children: [
        new TableCell({
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [
                run(`${item.nr}.  `, { font: template.font, size: template.fontSize.body, bold: true }),
                run(item.prompt, { font: template.font, size: template.fontSize.body }),
              ],
              spacing: { after: 160 },
            }),
          ],
        }),
        new TableCell({
          borders: {
            top: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
            bottom: thinBorder(template),
          },
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children:
                mode === 'loesung' && solutionKey
                  ? [run(`→  ${solutionKey}`, { font: template.font, size: template.fontSize.body, italics: true })]
                  : [run('→  ', { font: template.font, size: template.fontSize.body })],
              spacing: { after: 160 },
            }),
          ],
        }),
      ],
    });
  });

  result.push(
    new Paragraph({
      keepNext: true,
      children: [run(isEnglish ? 'Options:' : 'Optionen:', { font: template.font, size: template.fontSize.body, bold: true })],
      spacing: { after: 80 },
    }),
    optionsTable,
    new Paragraph({
      keepNext: true,
      children: [run(isEnglish ? 'Your matches:' : 'Deine Zuordnung:', { font: template.font, size: template.fontSize.body, bold: true })],
      spacing: { before: 160, after: 80 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
        insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
      },
      rows: answerRows,
    }),
  );

  return result;
}

// ---------------------------------------------------------------------------
// Block: multipleChoice
// ---------------------------------------------------------------------------

function buildMultipleChoice(
  block: Extract<Block, { typ: 'multipleChoice' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  for (const frage of block.config.fragen) {
    const correctKeys = block.loesung.antworten[String(frage.nr)] ?? [];
    result.push(
      new Paragraph({
        keepNext: true,
        children: [
          run(`${frage.nr}.  `, { font: template.font, size: template.fontSize.body, bold: true }),
          run(frage.frage, { font: template.font, size: template.fontSize.body }),
          frage.mehrfach
            ? run('  (Mehrfachantwort möglich)', { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray })
            : new TextRun(''),
        ],
        spacing: { before: 80, after: 60 },
      }),
    );

    for (const opt of frage.optionen) {
      const isCorrect = correctKeys.includes(opt.key);
      const marker = mode === 'loesung' && isCorrect ? '☑' : '☐';
      result.push(
        new Paragraph({
          keepNext: true,
          indent: { left: 360 },
          children: [
            run(`${marker}  ${opt.key}  `, {
              font: template.font, size: template.fontSize.body, bold: mode === 'loesung' && isCorrect,
            }),
            run(opt.text, {
              font: template.font, size: template.fontSize.body,
              italics: mode === 'loesung' && isCorrect,
              bold: mode === 'loesung' && isCorrect,
            }),
          ],
          spacing: { after: 40 },
        }),
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block: offeneVerstaendnisfrage
// ---------------------------------------------------------------------------

function buildOffeneVerstaendnisfrage(
  block: Extract<Block, { typ: 'offeneVerstaendnisfrage' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  for (const frage of block.config.fragen) {
    const musterantwort = block.loesung.antworten[String(frage.nr)];
    result.push(
      new Paragraph({
        keepNext: true,
        children: [
          run(`${frage.nr}.  `, { font: template.font, size: template.fontSize.body, bold: true }),
          run(frage.frage, { font: template.font, size: template.fontSize.body }),
        ],
        spacing: { before: 80, after: 60 },
      }),
    );

    if (mode === 'schueler') {
      for (let i = 0; i < frage.zeilen; i++) {
        result.push(writingLine(i < frage.zeilen - 1, template));
      }
    } else {
      result.push(
        new Paragraph({
          indent: { left: 360 },
          children: [run(musterantwort ?? '', { font: template.font, size: template.fontSize.body, italics: true })],
          spacing: { after: 120 },
        }),
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block: offeneSchreibaufgabe
// ---------------------------------------------------------------------------

function buildOffeneSchreibaufgabe(
  block: Extract<Block, { typ: 'offeneSchreibaufgabe' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const cfg = block.config;

  result.push(
    new Paragraph({
      keepNext: true,
      children: [
        run('Situation:  ', { font: template.font, size: template.fontSize.body, bold: true }),
        run(cfg.situation, { font: template.font, size: template.fontSize.body }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      keepNext: true,
      children: [
        run('Textsorte:  ', { font: template.font, size: template.fontSize.body, bold: true }),
        run(cfg.textsorte, { font: template.font, size: template.fontSize.body }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      keepNext: true,
      children: [
        run('Umfang:  ', { font: template.font, size: template.fontSize.body, bold: true }),
        run(`${cfg.umfangWorte.min}–${cfg.umfangWorte.max} Wörter`, { font: template.font, size: template.fontSize.body }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      keepNext: true,
      children: [run('Aspekte:', { font: template.font, size: template.fontSize.body, bold: true })],
      spacing: { after: 40 },
    }),
  );

  for (const [i, aspekt] of cfg.aspekte.entries()) {
    result.push(
      new Paragraph({
        keepNext: true,
        indent: { left: 360 },
        children: [
          run(`${i + 1}.  `, { font: template.font, size: template.fontSize.body }),
          run(aspekt, { font: template.font, size: template.fontSize.body }),
        ],
        spacing: { after: 40 },
      }),
    );
  }

  if (mode === 'schueler') {
    const lineCount = Math.ceil(cfg.umfangWorte.max / 10);
    for (let i = 0; i < lineCount; i++) {
      result.push(writingLine(i < lineCount - 1, template));
    }
  } else {
    result.push(
      new Paragraph({
        indent: { left: 360 },
        children: [run(block.loesung.musterloesung, { font: template.font, size: template.fontSize.body, italics: true })],
        spacing: { before: 120, after: 120 },
      }),
    );

    const eh = block.loesung.erwartungshorizont;
    result.push(
      new Paragraph({
        keepNext: true,
        children: [run('Erwartungshorizont:', { font: template.font, size: template.fontSize.body, bold: true })],
        spacing: { before: 120, after: 60 },
      }),
      buildEH(eh, template),
    );
  }

  return result;
}

function buildEH(
  eh: { inhalt: string; struktur: string; ausdruck: string; sprachrichtigkeit: string },
  template: RenderTemplate,
): Table {
  const rows = (
    [
      ['Inhalt', eh.inhalt],
      ['Struktur', eh.struktur],
      ['Ausdruck', eh.ausdruck],
      ['Sprachrichtigkeit', eh.sprachrichtigkeit],
    ] as [string, string][]
  ).map(
    ([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: thinBorder(template), bottom: thinBorder(template),
              left: thinBorder(template), right: thinBorder(template),
            },
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [run(label, { font: template.font, size: template.fontSize.body, bold: true })],
              }),
            ],
          }),
          new TableCell({
            borders: {
              top: thinBorder(template), bottom: thinBorder(template),
              left: thinBorder(template), right: thinBorder(template),
            },
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [run(value, { font: template.font, size: template.fontSize.body, italics: true })],
              }),
            ],
          }),
        ],
      }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

// ---------------------------------------------------------------------------
// Block: markieraufgabe
// ---------------------------------------------------------------------------

function buildMarkieraufgabe(
  block: Extract<Block, { typ: 'markieraufgabe' }>,
  mode: Mode,
  quelltextMap: Map<string, QuellText>,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const quelle = quelltextMap.get(block.config.quelleId);

  if (quelle) {
    result.push(
      new Paragraph({
        keepNext: true,
        children: mehrzeiligRuns(quelle.inhalt, { font: template.font, size: template.fontSize.body }),
        spacing: { after: 120 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 8, color: template.color.lightGray },
        },
        indent: { left: 360 },
      }),
    );
  }

  if (mode === 'loesung') {
    result.push(
      new Paragraph({
        keepNext: true,
        children: [run('Zu markierende Stellen:', { font: template.font, size: template.fontSize.body, bold: true })],
        spacing: { before: 80, after: 40 },
      }),
    );
    for (const stelle of block.loesung.stellen) {
      result.push(
        new Paragraph({
          indent: { left: 360 },
          children: [run(`– ${stelle}`, { font: template.font, size: template.fontSize.body, italics: true })],
          spacing: { after: 40 },
        }),
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block: wordScramble
// ---------------------------------------------------------------------------

function buildWordScramble(
  block: Extract<Block, { typ: 'wordScramble' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const woerter = block.config.wort.split(/\s+/).filter((w) => w.length > 0);

  if (mode === 'schueler') {
    // Deterministisch (seed = block.id): Schüler- und Lösungsblatt bleiben konsistent.
    const gemischt = shuffle(woerter, block.id);
    result.push(
      new Paragraph({
        children: [
          run('Begriffe (durcheinander):  ', { font: template.font, size: template.fontSize.body, bold: true }),
          run(gemischt.join('  |  '), { font: template.font, size: template.fontSize.body }),
        ],
        spacing: { after: 120 },
      }),
    );
    result.push(
      new Paragraph({
        children: [run('Satz (richtige Reihenfolge):', { font: template.font, size: template.fontSize.body, bold: true })],
        spacing: { after: 60 },
      }),
    );
    for (let i = 0; i < block.config.anzahlWoerter; i++) {
      result.push(writingLine(true, template));
    }
  } else {
    result.push(
      new Paragraph({
        children: [
          run('Korrekte Anordnung:  ', { font: template.font, size: template.fontSize.body, bold: true }),
          run(block.loesung.korrektAnordnung.join(' '), { font: template.font, size: template.fontSize.body, italics: true }),
        ],
        spacing: { after: 80 },
      }),
    );
    result.push(
      new Paragraph({
        children: [
          run('Reihenfolge:  ', { font: template.font, size: template.fontSize.body, bold: true }),
          run(block.config.loesungsreihenfolge.join(' → '), { font: template.font, size: template.fontSize.body, italics: true }),
        ],
        spacing: { after: 80 },
      }),
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block: kategorisierung
// ---------------------------------------------------------------------------

function buildKategorisierung(
  block: Extract<Block, { typ: 'kategorisierung' }>,
  mode: Mode,
  template: RenderTemplate,
  fach: DocumentV1['meta']['fach'] = 'deutsch',
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const isEnglish = fach === 'englisch';

  const cellBorder = {
    top: thinBorder(template), bottom: thinBorder(template),
    left: thinBorder(template), right: thinBorder(template),
  };
  const cellMargins = { top: 100, bottom: 100, left: 80, right: 80 };

  const defaultBegriff = isEnglish ? 'Sentence' : 'Begriff';
  const defaultKategorie = isEnglish ? 'Category' : 'Kategorie';
  const titelBegriff = block.config.spaltentitelBegriff?.trim() || defaultBegriff;
  const titelKategorie = block.config.spaltentitelKategorie?.trim() || defaultKategorie;
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        borders: cellBorder,
        margins: cellMargins,
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: 'D9D9D9' },
        children: [new Paragraph({ children: [run(titelBegriff, { font: template.font, size: template.fontSize.body, bold: true })] })],
      }),
      new TableCell({
        borders: cellBorder,
        margins: cellMargins,
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { fill: 'D9D9D9' },
        children: [new Paragraph({ children: [run(titelKategorie, { font: template.font, size: template.fontSize.body, bold: true })] })],
      }),
    ],
  });

  const rows: TableRow[] = [headerRow];
  for (const item of block.config.items) {
    const kategorieName = mode === 'loesung' ? (block.loesung.zuordnung[String(item.nr)] ?? []).join(', ') : '';
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            borders: cellBorder,
            margins: cellMargins,
            children: [new Paragraph({ children: [run(item.text, { font: template.font, size: template.fontSize.body })] })],
          }),
          new TableCell({
            borders: cellBorder,
            margins: cellMargins,
            children: [new Paragraph({ children: [run(kategorieName, { font: template.font, size: template.fontSize.body, italics: mode === 'loesung' })] })],
          }),
        ],
      }),
    );
  }

  result.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }),
  );

  if (mode === 'schueler') {
    result.push(
      new Paragraph({
        children: [run((isEnglish ? 'Available categories:  ' : 'Verfügbare Kategorien:  ') + block.config.kategorien.map((k) => k.name).join(', '), { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray })],
        spacing: { before: 80, after: 40 },
      }),
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block: tabelle
// ---------------------------------------------------------------------------

function buildTabelle(
  block: Extract<Block, { typ: 'tabelle' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  const cellBorder = {
    top: thinBorder(template), bottom: thinBorder(template),
    left: thinBorder(template), right: thinBorder(template),
  };
  const cellMargins = { top: 100, bottom: 100, left: 80, right: 80 };

  const headerRow = new TableRow({
    tableHeader: true,
    children: block.config.spalten.map((s) =>
      new TableCell({
        borders: cellBorder,
        margins: cellMargins,
        width: { size: s.breiteProzent, type: WidthType.PERCENTAGE },
        shading: { fill: 'D9D9D9' },
        children: [new Paragraph({ children: [run(s.titel, { font: template.font, size: template.fontSize.body, bold: true })] })],
      }),
    ),
  });

  const rows: TableRow[] = [headerRow];
  for (const zeile of block.config.zeilen) {
    rows.push(
      new TableRow({
        children: zeile.zellen.map((zelle, spaltenIndex) => {
          let text = '';
          let istLuecke = false;
          if ('text' in zelle) {
            text = zelle.text;
          } else {
            // Lücke: im Schüler leer (Unterstrich-Hinweis), in der Lösung der korrekte Wert.
            istLuecke = true;
            text = mode === 'loesung'
              ? (block.loesung.zellen[`${zeile.nr},${spaltenIndex}`] ?? '')
              : '__________';
          }
          return new TableCell({
            borders: cellBorder,
            margins: cellMargins,
            children: [new Paragraph({ children: [run(text, { font: template.font, size: template.fontSize.body, italics: istLuecke && mode === 'loesung' })] })],
          });
        }),
      }),
    );
  }

  result.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }),
  );

  return result;
}

// ---------------------------------------------------------------------------
// Block: stiluebung
// ---------------------------------------------------------------------------

function buildStiluebung(
  block: Extract<Block, { typ: 'stiluebung' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  result.push(
    new Paragraph({
      keepNext: true,
      children: [
        run('Ausgangstext:', { font: template.font, size: template.fontSize.body, bold: true }),
      ],
      spacing: { before: 80, after: 40 },
    }),
  );
  result.push(
    new Paragraph({
      keepNext: true,
      children: mehrzeiligRuns(block.config.ausgangstext, { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray }),
      border: { left: { style: BorderStyle.SINGLE, size: 8, color: template.color.lightGray } },
      indent: { left: 360 },
      spacing: { after: 120 },
    }),
  );

  result.push(
    new Paragraph({
      children: [
        run('Ziel: ', { font: template.font, size: template.fontSize.body, bold: true }),
        run(`${block.config.transformation} → ${block.config.zielniveau}`, { font: template.font, size: template.fontSize.body }),
      ],
      spacing: { after: 100 },
    }),
  );

  if (mode === 'schueler') {
    result.push(
      new Paragraph({
        children: [run('Deine Umformulierung:', { font: template.font, size: template.fontSize.body, bold: true })],
        spacing: { after: 60 },
      }),
    );
    for (let i = 0; i < 6; i++) {
      result.push(writingLine(true, template));
    }
  } else {
    result.push(
      new Paragraph({
        children: [
          run('Musterlösung:  ', { font: template.font, size: template.fontSize.body, bold: true }),
          run(block.loesung.umformulierung, { font: template.font, size: template.fontSize.body, italics: true }),
        ],
        spacing: { after: 80 },
      }),
    );
    result.push(
      new Paragraph({
        children: [
          run('Begründung:  ', { font: template.font, size: template.fontSize.body, bold: true }),
          run(block.loesung.begruendung, { font: template.font, size: template.fontSize.body, italics: true }),
        ],
        spacing: { after: 80 },
      }),
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block: songanalyse
// ---------------------------------------------------------------------------

function buildSonganalyse(
  block: Extract<Block, { typ: 'songanalyse' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  result.push(
    new Paragraph({
      keepNext: true,
      children: [
        run(`${block.config.interpret} – ${block.config.titel}`, { font: template.font, size: template.fontSize.h3, bold: true }),
        ...(block.config.genre ? [run(`  (${block.config.genre})`, { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray })] : []),
      ],
      spacing: { after: 80 },
    }),
  );

  result.push(
    new Paragraph({
      keepNext: true,
      children: [run('Songtext:', { font: template.font, size: template.fontSize.body, bold: true })],
      spacing: { after: 40 },
    }),
  );
  result.push(
    new Paragraph({
      keepNext: true,
      children: mehrzeiligRuns(block.config.lyrics, { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray }),
      border: { left: { style: BorderStyle.SINGLE, size: 8, color: template.color.lightGray } },
      indent: { left: 360 },
      spacing: { after: 120 },
    }),
  );

  result.push(
    new Paragraph({
      children: [
        run('Aufgabe:  ', { font: template.font, size: template.fontSize.body, bold: true }),
        run(block.config.aufgabe, { font: template.font, size: template.fontSize.body }),
      ],
      spacing: { after: 100 },
    }),
  );

  if (mode === 'schueler') {
    for (let i = 0; i < 8; i++) {
      result.push(writingLine(true, template));
    }
  } else {
    result.push(
      new Paragraph({
        children: [
          run('Ergebnis:  ', { font: template.font, size: template.fontSize.body, bold: true }),
          run(block.loesung.ergebnis, { font: template.font, size: template.fontSize.body, italics: true }),
        ],
        spacing: { after: 80 },
      }),
    );
    for (const ap of block.loesung.analysepunkte) {
      result.push(
        new Paragraph({
          children: [
            run(`• ${ap.aspekt}:  `, { font: template.font, size: template.fontSize.body, bold: true }),
            run(ap.befund, { font: template.font, size: template.fontSize.body, italics: true }),
            ...(ap.zitat ? [run(`  („${ap.zitat}")`, { font: template.font, size: template.fontSize.body, italics: true, color: template.color.gray })] : []),
          ],
          spacing: { after: 40 },
        }),
      );
    }
    if (block.loesung.zitate.length > 0) {
      result.push(
        new Paragraph({
          children: [
            run('Wichtige Zitate:  ', { font: template.font, size: template.fontSize.body, bold: true }),
            run(block.loesung.zitate.map((z) => `„${z}"`).join('; '), { font: template.font, size: template.fontSize.body, italics: true }),
          ],
          spacing: { before: 80, after: 60 },
        }),
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Block: kreuzwortraetsel
// ---------------------------------------------------------------------------

function buildKreuzwortraetsel(
  block: Extract<Block, { typ: 'kreuzwortraetsel' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const gitter = baueKreuzwortgitter(block.config.eintraege ?? []);
  if (gitter.zeilen === 0) return result;

  const CELL = 460; // twips (~0.8 cm) je Zelle
  const cellBorder = { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) };
  const leerBorder = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

  const rows: TableRow[] = [];
  for (let r = 0; r < gitter.zeilen; r++) {
    const cells: TableCell[] = [];
    for (let c = 0; c < gitter.spalten; c++) {
      const letter = gitter.belegung[r]?.[c] ?? null;
      const num = gitter.nummern[r]?.[c] ?? null;
      if (letter === null) {
        cells.push(new TableCell({
          width: { size: CELL, type: WidthType.DXA },
          borders: leerBorder,
          children: [new Paragraph({ children: [] })],
        }));
        continue;
      }
      const kinder: TextRun[] = [];
      if (num !== null) {
        kinder.push(new TextRun({ text: String(num), font: template.font, size: 12, superScript: true }));
      }
      // Schülerfassung: Feld leer (nur Nummer). Lösungsfassung: Buchstabe sichtbar.
      if (mode === 'loesung') {
        if (num !== null) kinder.push(new TextRun({ text: ' ', font: template.font, size: template.fontSize.body }));
        kinder.push(run(letter, { font: template.font, size: template.fontSize.body, bold: true }));
      }
      cells.push(new TableCell({
        width: { size: CELL, type: WidthType.DXA },
        borders: cellBorder,
        margins: { top: 20, bottom: 20, left: 40, right: 40 },
        children: [new Paragraph({ children: kinder })],
      }));
    }
    rows.push(new TableRow({ height: { value: CELL, rule: HeightRule.ATLEAST }, children: cells }));
  }

  result.push(new Table({
    rows,
    columnWidths: Array<number>(gitter.spalten).fill(CELL),
    layout: TableLayoutType.FIXED,
  }));

  // Hinweis-Listen unter dem Gitter.
  const waag = gitter.platzierungen.filter((p) => p.richtung === 'waagrecht');
  const senk = gitter.platzierungen.filter((p) => p.richtung === 'senkrecht');

  const hinweisListe = (titel: string, eintraege: typeof gitter.platzierungen) => {
    if (eintraege.length === 0) return;
    result.push(new Paragraph({
      keepNext: true,
      children: [run(titel, { font: template.font, size: template.fontSize.body, bold: true })],
      spacing: { before: 120, after: 40 },
    }));
    for (const p of eintraege) {
      result.push(new Paragraph({
        indent: { left: 240 },
        children: [run(`${p.nr}. ${p.hinweis}`, { font: template.font, size: template.fontSize.body })],
        spacing: { after: 20 },
      }));
    }
  };
  hinweisListe('Waagrecht:', waag);
  hinweisListe('Senkrecht:', senk);

  return result;
}

// ---------------------------------------------------------------------------
// Block: wortgitter
// ---------------------------------------------------------------------------

function buildWortgitter(
  block: Extract<Block, { typ: 'wortgitter' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  const gitter = baueWortgitter(block.config.woerter ?? []);
  if (gitter.zeilen === 0) return result;

  // Zellen, die zu einem versteckten Wort gehören (für die Lösungs-Hervorhebung).
  const loesungsZellen = new Set<string>();
  const delta: Record<string, [number, number]> = { waagrecht: [0, 1], senkrecht: [1, 0], diagonal: [1, 1] };
  for (const p of gitter.platzierungen) {
    const [dr, dc] = delta[p.richtung]!;
    for (let n = 0; n < p.wort.length; n++) loesungsZellen.add(`${p.zeile + dr * n},${p.spalte + dc * n}`);
  }

  const CELL = 420;
  const cellBorder = { top: thinBorder(template), bottom: thinBorder(template), left: thinBorder(template), right: thinBorder(template) };
  const rows: TableRow[] = [];
  for (let r = 0; r < gitter.zeilen; r++) {
    const cells: TableCell[] = [];
    for (let c = 0; c < gitter.spalten; c++) {
      const letter = gitter.belegung[r]?.[c] ?? '';
      const istLoesung = mode === 'loesung' && loesungsZellen.has(`${r},${c}`);
      cells.push(new TableCell({
        width: { size: CELL, type: WidthType.DXA },
        borders: cellBorder,
        ...(istLoesung ? { shading: { fill: 'D9D9D9' } } : {}),
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [run(letter, { font: template.font, size: template.fontSize.body, bold: istLoesung })],
        })],
      }));
    }
    rows.push(new TableRow({ height: { value: CELL, rule: HeightRule.ATLEAST }, children: cells }));
  }
  result.push(new Table({
    rows,
    columnWidths: Array<number>(gitter.spalten).fill(CELL),
    layout: TableLayoutType.FIXED,
  }));

  // Wortliste zum Suchen.
  result.push(new Paragraph({
    keepNext: true,
    children: [run('Finde diese Wörter:', { font: template.font, size: template.fontSize.body, bold: true })],
    spacing: { before: 120, after: 40 },
  }));
  result.push(new Paragraph({
    children: [run(gitter.woerter.join('   ·   '), { font: template.font, size: template.fontSize.body })],
    spacing: { after: 40 },
  }));

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RunOpts {
  font: string;
  size: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
}

function run(text: string, opts: RunOpts): TextRun {
  return new TextRun({
    text,
    font: opts.font,
    size: opts.size,
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
    ...(opts.color !== undefined ? { color: opts.color } : {}),
  });
}

// Wie run(), aber erhält Zeilenumbrüche (\n) als echte docx-Umbrüche (break:1)
// statt sie zu verschlucken. Für eingebettete mehrzeilige Texte (Lyrics, Ausgangstext).
function mehrzeiligRuns(text: string, opts: RunOpts): TextRun[] {
  const zeilen = text.replace(/\r\n/g, '\n').split('\n');
  return zeilen.map(
    (zeile, i) =>
      new TextRun({
        text: zeile,
        font: opts.font,
        size: opts.size,
        bold: opts.bold ?? false,
        italics: opts.italics ?? false,
        ...(opts.color !== undefined ? { color: opts.color } : {}),
        ...(i > 0 ? { break: 1 } : {}),
      }),
  );
}

function blankLine(widthChars = 60, template: RenderTemplate): TextRun {
  return new TextRun({
    text: ' '.repeat(widthChars),
    font: template.font,
    size: template.fontSize.body,
    underline: { type: UnderlineType.SINGLE, color: template.color.text },
  });
}

function writingLine(keepNext = false, template: RenderTemplate): Paragraph {
  return new Paragraph({
    keepNext,
    children: [run(' ', { font: template.font, size: template.fontSize.body })],
    spacing: {
      line: convertMillimetersToTwip(template.lineHeightMm),
      lineRule: LineRuleType.EXACT,
      after: 0,
    },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: template.color.lightGray },
    },
  });
}


// Vokabelübung
// ---------------------------------------------------------------------------

function buildVokabeluebung(
  block: Extract<Block, { typ: 'vokabeluebung' }>,
  mode: Mode,
  template: RenderTemplate,
): (Paragraph | Table)[] {
  const { vokabeln, richtung } = block.config;
  const quelleSpalte = richtung === 'de_fremd' ? 'deutsch' : 'fremdsprache';
  const zielSpalte = richtung === 'de_fremd' ? 'fremdsprache' : 'deutsch';
  const antworten = block.loesung?.antworten as Record<string, string> | undefined;
  const quelleLabel = richtung === 'de_fremd' ? 'Deutsch' : 'Fremdsprache';
  const zielLabel = richtung === 'de_fremd' ? 'Fremdsprache' : 'Deutsch';

  const cellMargins = { top: 80, bottom: 80, left: 60, right: 60 };

  const headerRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 10, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ children: [run('Nr.', { font: template.font, size: template.fontSize.body, bold: true })], alignment: AlignmentType.CENTER })],
        borders: { top: NO_BORDER, bottom: thinBorder(template), left: NO_BORDER, right: NO_BORDER },
      }),
      new TableCell({
        width: { size: 45, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ children: [run(quelleLabel, { font: template.font, size: template.fontSize.body, bold: true })], spacing: { after: 40 } })],
        borders: { top: NO_BORDER, bottom: thinBorder(template), left: NO_BORDER, right: NO_BORDER },
      }),
      new TableCell({
        width: { size: 45, type: WidthType.PERCENTAGE },
        margins: cellMargins,
        children: [new Paragraph({ children: [run(zielLabel, { font: template.font, size: template.fontSize.body, bold: true })], spacing: { after: 40 } })],
        borders: { top: NO_BORDER, bottom: thinBorder(template), left: NO_BORDER, right: NO_BORDER },
      }),
    ],
  });

  const dataRows = (vokabeln ?? []).map((v, i) => {
    const nr = i + 1;
    const quellText = v[quelleSpalte];
    const zielText = v[zielSpalte];
    const loesungText = antworten?.[String(nr)] ?? zielText;

    return new TableRow({
      children: [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [new Paragraph({ children: [run(`${nr}.`, { font: template.font, size: template.fontSize.body })], alignment: AlignmentType.CENTER })],
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [
            new Paragraph({ children: [run(quellText, { font: template.font, size: template.fontSize.body })], spacing: { after: 40 } }),
            v.kontextsatz
              ? new Paragraph({ children: [run(`„${v.kontextsatz}"`, { font: template.font, size: template.fontSize.small, italics: true, color: template.color.gray })], spacing: { after: 40 } })
              : new Paragraph({ children: [] }),
          ],
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
        }),
        new TableCell({
          width: { size: 45, type: WidthType.PERCENTAGE },
          margins: cellMargins,
          children: [
            new Paragraph({
              children:
                mode === 'loesung'
                  ? [run(loesungText, { font: template.font, size: template.fontSize.body, italics: true, color: '#2e7d32' })]
                  : [run('_____________________', { font: template.font, size: template.fontSize.body, color: template.color.lightGray })],
              spacing: { after: 40 },
            }),
          ],
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
        }),
      ],
    });
  });

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
        insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
      },
      rows: [headerRow, ...dataRows],
    }),
  ];
}

function formatDatum(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}


export { RENDER_TEMPLATES, getDefaultTemplate };
export type { RenderTemplate, RenderTemplateId } from './template.js';
