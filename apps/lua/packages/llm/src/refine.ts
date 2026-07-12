import type { DocumentV1 } from '@lehrunterlagen/schema';
import { buildRefinementMessages } from './prompt.js';
import { extractJson, parseAndValidate } from './validate.js';
import { getProvider } from './provider-registry.js';
import type { ChatMessage, ProviderConfig, RefineResult } from './types.js';

interface RefinementEnvelope {
  aenderungen: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEnvelope(raw: string): RefinementEnvelope | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (error) {
    return `Qualitätspass: Antwort nicht parsebar: ${(error as Error).message}`;
  }

  if (!isObject(parsed) || !Array.isArray(parsed.aenderungen)) {
    return 'Qualitätspass: Antwort muss ein Objekt mit dem Feld "aenderungen" enthalten.';
  }

  const aenderungen = parsed.aenderungen
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  if (aenderungen.length < 2 || aenderungen.length > 3) {
    return 'Qualitätspass: Es werden genau zwei bis drei kurze Änderungsnotizen erwartet.';
  }

  return { aenderungen };
}

function compareStructure(before: DocumentV1, after: DocumentV1): string | undefined {
  if (before.bloecke.length !== after.bloecke.length) {
    return 'Qualitätspass: Die Anzahl der Aufgabenblöcke wurde verändert.';
  }

  for (let index = 0; index < before.bloecke.length; index++) {
    const original = before.bloecke[index]!;
    const revised = after.bloecke[index]!;
    if (original.id !== revised.id) {
      return `Qualitätspass: Die Block-ID an Position ${index + 1} wurde verändert.`;
    }
    if (original.typ !== revised.typ) {
      return `Qualitätspass: Der Blocktyp von "${original.id}" wurde verändert.`;
    }
    if (original.quelleId !== revised.quelleId) {
      return `Qualitätspass: Die quelleId von "${original.id}" wurde verändert.`;
    }
  }
  return undefined;
}

export type RefineComplete = (messages: ChatMessage[]) => Promise<string>;

/**
 * Prüft und schärft ein bereits validiertes Dokument in genau einem bewussten
 * zusätzlichen Provider-Aufruf. Meta- und Quelltextdaten bleiben Hoheit des
 * Aufrufers; das Modell darf nur die Blockinhalte revidieren.
 */
export async function refineDocument(
  document: DocumentV1,
  cfg: ProviderConfig,
  complete?: RefineComplete,
): Promise<RefineResult> {
  const messages = buildRefinementMessages(document);
  let rohText: string;

  try {
    if (complete) {
      rohText = await complete(messages);
    } else {
      rohText = await getProvider(cfg.provider).complete(messages, cfg);
    }
  } catch (error) {
    return { ok: false, fehler: `Qualitätspass konnte nicht durchgeführt werden: ${(error as Error).message}` };
  }

  const envelope = parseEnvelope(rohText);
  if (typeof envelope === 'string') return { ok: false, fehler: envelope, rohText };

  const validiert = await parseAndValidate(rohText, document.meta, document.quelltexte);
  if (!validiert.ok || !validiert.document) {
    return {
      ok: false,
      fehler: `Qualitätspass: Die überarbeitete Fassung ist nicht gültig.\n${validiert.fehler ?? 'Unbekannter Validierungsfehler.'}`,
      rohText,
    };
  }

  const strukturFehler = compareStructure(document, validiert.document);
  if (strukturFehler) return { ok: false, fehler: strukturFehler, rohText };

  return {
    ok: true,
    document: validiert.document,
    aenderungen: envelope.aenderungen,
    rohText,
  };
}
