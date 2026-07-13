import {
  ABITUR_DEUTSCH_AUFGABENARTEN,
  ABITUR_DEUTSCH_UMFANG_MINDEST,
  DocumentSchema,
  SRDP_DEUTSCH_EINZELAUFGABE_UMFANG,
  SRDP_DEUTSCH_TEXTSORTEN,
  type DocumentV1,
  type QuellText,
} from '@lehrunterlagen/schema';
import { normalizeDocument } from './normalize.js';
import { transformToSchema } from './transform.js';
import { runQualityChecks, type QualityIssue, type LlmJudgeResult } from './quality.js';
import type { ChatMessage } from './types.js';

export interface ValidationResult {
  ok: boolean;
  document?: DocumentV1;
  fehler?: string;
  qualityIssues?: QualityIssue[];
  judge?: LlmJudgeResult;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function validateSrdpDeutschTraining(document: DocumentV1): string | undefined {
  // land = DE nutzt das Abitur-Pendant (validateAbiturDeutschTraining).
  if (document.meta.typ !== 'matura' || document.meta.fach !== 'deutsch' || document.meta.stufe !== 'oberstufe' || document.meta.land === 'DE') return undefined;
  if (document.bloecke.length !== 1 || document.bloecke[0]?.typ !== 'offeneSchreibaufgabe') {
    return 'SRDP-Deutsch-Training erwartet genau einen Block vom Typ offeneSchreibaufgabe.';
  }

  const block = document.bloecke[0];
  if (!block || block.typ !== 'offeneSchreibaufgabe') return 'SRDP-Deutsch-Training: Schreibaufgabe fehlt.';
  if (!SRDP_DEUTSCH_TEXTSORTEN.includes(block.config.textsorte as (typeof SRDP_DEUTSCH_TEXTSORTEN)[number])) {
    return `SRDP-Deutsch-Training: Textsorte muss eine der kuratierten SRDP-Textsorten sein (${SRDP_DEUTSCH_TEXTSORTEN.join(', ')}).`;
  }
  if (
    block.config.umfangWorte.min !== SRDP_DEUTSCH_EINZELAUFGABE_UMFANG.min
    || block.config.umfangWorte.max !== SRDP_DEUTSCH_EINZELAUFGABE_UMFANG.max
  ) {
    return `SRDP-Deutsch-Training: Wortumfang muss ${SRDP_DEUTSCH_EINZELAUFGABE_UMFANG.min}–${SRDP_DEUTSCH_EINZELAUFGABE_UMFANG.max} Wörter betragen.`;
  }
  if (!block.quelleId || !document.quelltexte.some((q) => q.id === block.quelleId)) {
    return 'SRDP-Deutsch-Training: Die Schreibaufgabe muss auf genau eine vorhandene Textbeilage verweisen.';
  }

  // Tolerantes Matching: Modelle variieren die Labels („Schreibhandlungen"
  // statt „Schreibhandlung(en)", „Wortwahl/Ausdruck", „Orthographie") —
  // geprüft wird deshalb ein normalisierter Kernbegriff je Subkriterium,
  // nicht der wörtliche Label-String.
  const subkriterien: Record<keyof typeof block.loesung.erwartungshorizont, readonly { label: string; kern: string }[]> = {
    inhalt: [
      { label: 'Schreibhandlung(en)', kern: 'schreibhandlung' },
      { label: 'Arbeitsaufträge', kern: 'arbeitsauftr' },
      { label: 'Textbeilage(n)', kern: 'textbeilage' },
      { label: 'Sachliche Richtigkeit', kern: 'sachlich' },
      { label: 'Qualität der Auseinandersetzung', kern: 'auseinandersetzung' },
    ],
    struktur: [
      { label: 'Kohärenz', kern: 'kohärenz' },
      { label: 'Bezugnahme auf Textbeilage(n)', kern: 'bezugnahme' },
      { label: 'Kohäsionsmittel', kern: 'kohäsion' },
    ],
    ausdruck: [
      { label: 'Situationsadäquatheit', kern: 'situationsadäquat' },
      { label: 'Wortwahl / Ausdruck', kern: 'wortwahl' },
      { label: 'Satzstrukturen', kern: 'satzstruktur' },
      { label: 'Eigenständigkeit', kern: 'eigenständig' },
    ],
    sprachrichtigkeit: [
      { label: 'Orthografie', kern: 'orthogra' },
      { label: 'Zeichensetzung', kern: 'zeichensetzung' },
      { label: 'Grammatik', kern: 'grammatik' },
    ],
  };
  for (const [dimension, kriterien] of Object.entries(subkriterien) as [keyof typeof subkriterien, readonly { label: string; kern: string }[]][]) {
    const erwartung = block.loesung.erwartungshorizont[dimension].toLowerCase();
    const fehlend = kriterien.filter((k) => !erwartung.includes(k.kern)).map((k) => k.label);
    if (fehlend.length > 0) {
      return `SRDP-Deutsch-Training: Im Erwartungshorizont-Feld "${dimension}" fehlen die Subkriterien: ${fehlend.join(', ')}. Jedes Subkriterium muss namentlich mit einem konkreten Erwartungssatz vorkommen.`;
    }
  }
  return undefined;
}

function validateAbiturDeutschTraining(document: DocumentV1): string | undefined {
  if (document.meta.typ !== 'matura' || document.meta.fach !== 'deutsch' || document.meta.stufe !== 'oberstufe' || document.meta.land !== 'DE') return undefined;
  if (document.bloecke.length !== 1 || document.bloecke[0]?.typ !== 'offeneSchreibaufgabe') {
    return 'Abitur-Deutsch-Training erwartet genau einen Block vom Typ offeneSchreibaufgabe.';
  }

  const block = document.bloecke[0];
  if (!block || block.typ !== 'offeneSchreibaufgabe') return 'Abitur-Deutsch-Training: Schreibaufgabe fehlt.';

  // Aufgabenart tolerant matchen (Modelle variieren Wortlaut/Umlaute) —
  // der Kernbegriff einer der sechs KMK-Aufgabenarten muss vorkommen.
  const aufgabenartKerne = ['interpretation', 'analyse', 'erörterung', 'eroerterung', 'materialgestützt', 'materialgestuetzt'];
  const textsorte = block.config.textsorte.toLowerCase();
  if (!aufgabenartKerne.some((kern) => textsorte.includes(kern))) {
    return `Abitur-Deutsch-Training: config.textsorte muss eine der KMK-Aufgabenarten sein (${ABITUR_DEUTSCH_AUFGABENARTEN.join(', ')}).`;
  }
  if (block.config.umfangWorte.min < ABITUR_DEUTSCH_UMFANG_MINDEST) {
    return `Abitur-Deutsch-Training: umfangWorte.min muss mindestens ${ABITUR_DEUTSCH_UMFANG_MINDEST} Wörter betragen — ein Abitur-Schreibauftrag ist kein Kurztext.`;
  }
  if (!block.quelleId || !document.quelltexte.some((q) => q.id === block.quelleId)) {
    return 'Abitur-Deutsch-Training: Die Schreibaufgabe muss auf genau eine vorhandene Textbeilage verweisen.';
  }

  // Erwartungshorizont: inhalt muss die Anforderungsbereiche explizit staffeln.
  // Tolerant: "AFB" oder "Anforderungsbereich" plus die Stufe III (I und II sind
  // in jeder ernsthaften Staffelung enthalten; Bereichs-Notation "AFB I–III" bleibt gültig).
  const inhalt = block.loesung.erwartungshorizont.inhalt.toLowerCase();
  const nenntAfb = /(afb|anforderungsbereich)/.test(inhalt);
  const nenntStufeDrei = /\biii\b|\b3\b/.test(inhalt);
  if (!nenntAfb || !nenntStufeDrei) {
    return 'Abitur-Deutsch-Training: Das Erwartungshorizont-Feld "inhalt" muss die Verstehensleistung den Anforderungsbereichen zuordnen (AFB I, AFB II, AFB III namentlich, je Arbeitsauftrag ein konkreter Erwartungssatz).';
  }
  return undefined;
}

// Holt das JSON-Objekt aus der Modellantwort heraus, auch wenn versehentlich
// Markdown-Zaeune oder Begleittext mitgeliefert wurden.
export function extractJson(raw: string): string {
  let s = raw.trim();
  // ```json ... ``` oder ``` ... ``` entfernen
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) s = fence[1].trim();

  // Unterstuetze beide Formate:
  // 1. Array (nur bloecke) — suche erstes [ bis letztes ]
  // 2. Objekt (volles Dokument) — suche erstes { bis letztes }
  const firstBrace = s.indexOf('{');
  const firstBracket = s.indexOf('[');
  const lastBrace = s.lastIndexOf('}');
  const lastBracket = s.lastIndexOf(']');

  const hasObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
  const hasArray = firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;

  if (hasArray && hasObject) {
    // Beides vorhanden — waehle das, was zuerst kommt
    if (firstBracket < firstBrace) {
      s = s.slice(firstBracket, lastBracket + 1);
    } else {
      s = s.slice(firstBrace, lastBrace + 1);
    }
  } else if (hasArray) {
    s = s.slice(firstBracket, lastBracket + 1);
  } else if (hasObject) {
    s = s.slice(firstBrace, lastBrace + 1);
  }

  return s;
}

export async function parseAndValidate(
  raw: string,
  meta?: any,
  quelltexte?: any[],
  judgeCfg?: { provider: string; model?: string; apiKey?: string; enabled?: boolean },
  complete?: (messages: ChatMessage[]) => Promise<string>,
  // Aufgeloeste Stoff-Items (Kompetenz-Modus) — Kontext für den Kompetenz-Judge.
  stoffItems?: { titel: string }[],
): Promise<ValidationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (e) {
    return { ok: false, fehler: `JSON nicht parsebar: ${(e as Error).message}` };
  }

  // Das Modell liefert nur INHALTE (bloecke). meta/quelltexte/schemaVersion sind
  // Hoheit des Aufrufers (Lehrer-Eingabe) — niemals aus der Modellantwort uebernehmen,
  // sonst ueberschreiben halluzinierte Werte (Klasse, Thema, Quelltext) die echten.
  let bloecke: unknown;
  if (Array.isArray(parsed)) {
    bloecke = parsed;
  } else if (isObject(parsed)) {
    // Volles Dokument zurueckgegeben: nur die bloecke herausziehen.
    bloecke = Array.isArray(parsed.bloecke) ? parsed.bloecke : undefined;
  }

  if (bloecke === undefined) {
    return { ok: false, fehler: 'Ungueltiges Format: weder bloecke-Array noch Objekt mit bloecke erhalten.' };
  }

  // Optionaler didaktischer Rahmen (Kompetenz-Modus): liefert das Modell zusaetzlich
  // zu bloecke ein "didaktik"-Objekt (Titel, Einleitung, Merkkasten, Transferaufgabe),
  // wird es uebernommen — meta bleibt unveraendert Hoheit des Aufrufers.
  const didaktik = isObject(parsed) && isObject(parsed.didaktik) ? parsed.didaktik : undefined;

  let docCandidate: unknown;
  if (meta && quelltexte) {
    docCandidate = { schemaVersion: '0.1.0', meta, quelltexte, bloecke, ...(didaktik ? { didaktik } : {}) };
  } else if (isObject(parsed)) {
    // Kein meta/quelltexte vom Aufrufer (z.B. Tests): vorhandenes Dokument nutzen,
    // aber schemaVersion erzwingen, falls das Modell sie ausgelassen hat.
    docCandidate = { schemaVersion: '0.1.0', ...parsed };
  } else {
    return { ok: false, fehler: 'Nur bloecke-Array erhalten, aber meta/quelltexte fehlen zum Zusammensetzen.' };
  }

  const transformed = transformToSchema(docCandidate);
  const normalized = normalizeDocument(transformed);

  const result = DocumentSchema.safeParse(normalized);
  if (!result.success) {
    const fehler = result.error.issues
      .map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    return { ok: false, fehler };
  }

  const document = result.data;

  const srdpFehler = validateSrdpDeutschTraining(document);
  if (srdpFehler) return { ok: false, fehler: srdpFehler };

  const abiturFehler = validateAbiturDeutschTraining(document);
  if (abiturFehler) return { ok: false, fehler: abiturFehler };

  // Umformung ist im Kompetenz-Modus nicht mehr erlaubt (sinnentleerte Transformationen).
  if (document.meta.modus === 'kompetenz' && document.bloecke.some((b) => b.typ === 'umformung')) {
    return { ok: false, fehler: 'Blocktyp "umformung" ist im Kompetenz-Modus nicht mehr erlaubt.' };
  }
  if (!quelltexte) {
    return { ok: true, document, qualityIssues: [], judge: { score: 1, issues: [] } };
  }

  const { issues: qualityIssues, judge } = await runQualityChecks(
    document,
    quelltexte as QuellText[],
    stoffItems ? { ...meta, stoffItems } : meta,
    judgeCfg,
    complete,
  );
  const errors = qualityIssues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    const fehler = errors.map((i) => `- ${i.blockId}: ${i.message}`).join('\n');
    return { ok: false, fehler, qualityIssues, judge };
  }

  return { ok: true, document, qualityIssues, judge };
}
