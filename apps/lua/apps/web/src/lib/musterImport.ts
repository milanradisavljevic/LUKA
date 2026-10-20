import {
  buildMusterImportMessages,
  buildRepairMessage,
  extractJson,
  parseAndValidate,
  type ChatMessage,
} from '@lehrunterlagen/llm';
import type { DocumentV1, Meta, QuellText } from '@lehrunterlagen/schema';
import type { AppState } from './types';
import { bereiteParallelversionVor, type ParallelVorbereitung } from './parallelversion';

/**
 * Muster-Upload: Ein vorhandenes Arbeitsblatt (Word/PDF) wird von der KI in
 * LUKA-Blöcke übertragen und läuft durch dieselbe Schema-Prüfung wie jede
 * erzeugte Unterlage. Danach ist es eine normale Vorlage für die
 * Parallelversion (siehe parallelversion.ts): gleiche Aufgaben, neuer Inhalt,
 * im Baukasten ergänzbar.
 */

export type MusterArt = 'wortschatz' | 'grammatik' | 'lesen' | 'gemischt';

export interface MusterErkennung {
  thema: string;
  kompetenz: string;
  lesetext: string | null;
  /** Bei "wortschatz" bleiben die Zielwörter, nur die Sätze werden neu. */
  art: MusterArt;
}

const MUSTER_ARTEN: readonly MusterArt[] = ['wortschatz', 'grammatik', 'lesen', 'gemischt'];

export interface MusterImportErgebnis {
  dokument: DocumentV1;
  erkannt: MusterErkennung;
}

/** Ein KI-Aufruf: System-Prompt plus Nachrichten, Antwort als Rohtext. */
export type MusterComplete = (system: string, messages: ChatMessage[]) => Promise<string>;

const MIN_ZEICHEN = 40;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function leseErkennung(raw: string): MusterErkennung {
  try {
    const parsed = JSON.parse(extractJson(raw)) as { erkannt?: Record<string, unknown> };
    const erkannt = parsed?.erkannt ?? {};
    const lesetext = text(erkannt.lesetext);
    const art = text(erkannt.art).toLowerCase() as MusterArt;
    return {
      thema: text(erkannt.thema),
      kompetenz: text(erkannt.kompetenz),
      lesetext: lesetext || null,
      art: MUSTER_ARTEN.includes(art) ? art : 'gemischt',
    };
  } catch {
    return { thema: '', kompetenz: '', lesetext: null, art: 'gemischt' };
  }
}

/** Meta für Prüfung und spätere Erzeugung: mit Lesetext Text-Modus, sonst Kompetenz-Modus. */
export function metaFuerMuster(basis: Meta, erkannt: MusterErkennung): Meta {
  const thema = erkannt.thema || basis.thema || 'Unterlage';
  return erkannt.lesetext
    ? { ...basis, thema, modus: 'text', freieKompetenz: undefined }
    : { ...basis, thema, modus: 'kompetenz', freieKompetenz: erkannt.kompetenz || thema };
}

export async function erkenneMuster(
  dateiText: string,
  dateiname: string,
  basisMeta: Meta,
  complete: MusterComplete,
): Promise<MusterImportErgebnis> {
  if (dateiText.trim().length < MIN_ZEICHEN) {
    throw new Error('In der Datei wurde kaum Text gefunden. Gescannte PDFs ohne Textebene lassen sich noch nicht lesen.');
  }
  const [system, ...rest] = buildMusterImportMessages(dateiText, basisMeta);
  const chat = [...rest];
  let letzterFehler = 'unbekannter Fehler';
  for (let versuch = 1; versuch <= 2; versuch++) {
    const raw = await complete(system?.content ?? '', chat);
    const erkannt = leseErkennung(raw);
    const quelltexte: QuellText[] = erkannt.lesetext
      ? [{ id: 'q1', titel: erkannt.thema || 'Lesetext', inhalt: erkannt.lesetext, herkunft: { typ: 'upload', ref: dateiname } }]
      : [];
    const meta = metaFuerMuster(basisMeta, erkannt);
    const geprueft = await parseAndValidate(raw, meta, quelltexte);
    if (geprueft.ok && geprueft.document) {
      if (geprueft.document.bloecke.length === 0) {
        throw new Error('Auf dem Blatt wurden keine Aufgaben erkannt.');
      }
      return { dokument: geprueft.document, erkannt };
    }
    letzterFehler = geprueft.fehler ?? letzterFehler;
    chat.push({ role: 'assistant', content: raw });
    chat.push(buildRepairMessage(raw, letzterFehler));
  }
  throw new Error(`Die Aufgaben ließen sich nicht sicher übertragen. ${letzterFehler}`);
}

/** Wizard-Zustand für die Parallelversion eines erkannten Musters. */
export function musterAlsParallelversion(
  state: Pick<AppState, 'auftrag' | 'llmProvider' | 'modelName' | 'kreativitaet' | 'ausgabeSprache' | 'renderTemplate' | 'renderLayout'>,
  ergebnis: MusterImportErgebnis,
): ParallelVorbereitung {
  return bereiteParallelversionVor(
    { ...state, auftrag: null, meta: ergebnis.dokument.meta, quelltexte: ergebnis.dokument.quelltexte },
    ergebnis.dokument,
    'keine',
    ergebnis.erkannt.art === 'wortschatz' ? 'wortschatz' : 'standard',
  );
}
