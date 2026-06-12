import { DocumentSchema, type DocumentV1, type QuellText } from '@lehrunterlagen/schema';
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
