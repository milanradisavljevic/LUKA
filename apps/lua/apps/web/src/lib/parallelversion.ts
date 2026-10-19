import type { Block, DocumentV1 } from '@lehrunterlagen/schema';
import { PARALLEL_MARKER } from '@lehrunterlagen/llm';
import type { AppState, DocumentSnapshot } from './types';

/**
 * Parallelversion: dieselbe Unterlage mit neuem Inhalt (z. B. Gruppe B,
 * Nachschreibtermin, „noch so eine Übung“).
 *
 * Die Blöcke der Vorlage bleiben im Baukasten erhalten (Typ, Anzahl, Punkte,
 * Arbeitsanweisung). Jeder Block bekommt einen sichtbaren KI-Hinweis mit dem
 * Marker PARALLELVERSION und den Originalinhalten, die nicht wiederkommen
 * dürfen. Der Prompt erkennt den Marker (siehe prompt.ts), die Lehrkraft kann
 * den Hinweis im Baukasten lesen und ändern und weitere Blöcke ergänzen.
 */

const ORIGINAL_PREFIX = 'Originalinhalte, nicht wiederverwenden:';
const MAX_INHALTE_JE_BLOCK = 15;
const MAX_LAENGE_INHALT = 160;

// Kopffelder des Blocks ohne Aufgabeninhalt. Nur auf oberster Ebene: Ein
// Kreuzwort-Eintrag hat ebenfalls ein Feld "hinweis", das ist dort Inhalt.
const BLOCK_KOPF = new Set([
  'id', 'typ', 'punkte', 'quelleId', 'arbeitsanweisung', 'clue', 'hinweis', 'lernziele',
]);

// Steuerwerte und Kennungen innerhalb von config/loesung.
const STEUERFELDER = new Set([
  'eingabemodus', 'richtung', 'key', 'nr', 'nummer', 'mehrfach', 'quellentyp', 'diagrammtyp',
  'einheit', 'zeilen', 'operator', 'anzahlFehler', 'korrekt', 'quelleId',
]);

// Bei diesen Typen ist jedes einzelne Wort Inhalt (keine Grammatik-Zielwörter).
const WORT_TYPEN = new Set<Block['typ']>(['kreuzwortraetsel', 'wortgitter', 'vokabeluebung']);

export type ParallelBezeichnung = 'keine' | 'gruppe-b' | 'nachschreibtermin';

const BEZEICHNUNG_SUFFIX: Record<ParallelBezeichnung, string> = {
  'keine': '',
  'gruppe-b': ' (Gruppe B)',
  'nachschreibtermin': ' (Nachschreibtermin)',
};

function sammle(value: unknown, key: string | null, out: string[]): void {
  if (key && STEUERFELDER.has(key)) return;
  if (typeof value === 'string') {
    const text = value.trim();
    if (text.length >= 2 && /\p{L}/u.test(text)) out.push(text);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) sammle(item, null, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) sammle(v, k, out);
  }
}

/** Alle schülerseitigen Inhalte und Lösungen eines Blocks, ohne Duplikate. */
export function sammleInhalte(block: Block): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(block)) {
    if (!BLOCK_KOPF.has(key)) sammle(value, key, out);
  }
  return [...new Set(out)];
}

export function normalisiere(text: string): string {
  return text.toLocaleLowerCase('de').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function istParallelBlock(block: Pick<Block, 'hinweis'>): boolean {
  return block.hinweis?.includes(PARALLEL_MARKER) ?? false;
}

export function parallelHinweis(block: Block): string {
  const inhalte = sammleInhalte(block)
    .filter((s) => s.length <= MAX_LAENGE_INHALT)
    .slice(0, MAX_INHALTE_JE_BLOCK)
    .map((s) => `«${s.replace(/[«»]/g, '"')}»`);
  const anweisung = block.arbeitsanweisung.trim()
    ? ` Original-Arbeitsanweisung: «${block.arbeitsanweisung.trim().replace(/[«»]/g, '"')}».`
    : '';
  return `${PARALLEL_MARKER}: Erstelle diese Aufgabe neu. Gleiche Aufgabenart, gleiche Anzahl, `
    + `gleiches Phänomen und gleiche Schwierigkeit wie im Original, aber mit neuen Sätzen, Wörtern `
    + `und einem neuen Szenario.${anweisung}`
    + (inhalte.length > 0 ? ` ${ORIGINAL_PREFIX} ${inhalte.join(' · ')}` : '');
}

/** Liest die Originalinhalte wieder aus einem Parallel-Hinweis. */
export function originalInhalteAusHinweis(hinweis?: string): string[] {
  if (!hinweis) return [];
  const start = hinweis.indexOf(ORIGINAL_PREFIX);
  if (start < 0) return [];
  return [...hinweis.slice(start + ORIGINAL_PREFIX.length).matchAll(/«([^»]*)»/g)].map((m) => m[1] ?? '');
}

/**
 * Baukasten-Block für die Parallelversion. Struktur und Punkte bleiben, der
 * Hinweis beschreibt das Original. Manuell eingetragene Inhalte werden auf
 * KI-Erzeugung umgestellt, sonst übernähme blockToRequest sie wörtlich.
 */
export function bereiteParallelBlockVor(block: Block): Block {
  const kopie = structuredClone(block) as Block & { config?: Record<string, unknown> };
  kopie.hinweis = parallelHinweis(block);
  if (kopie.config && kopie.config.eingabemodus === 'manuell') {
    kopie.config = { ...kopie.config, eingabemodus: 'ki' };
  }
  return kopie;
}

export function parallelThema(thema: string, bezeichnung: ParallelBezeichnung): string {
  const basis = Object.values(BEZEICHNUNG_SUFFIX)
    .filter(Boolean)
    .reduce((t, suffix) => (t.endsWith(suffix) ? t.slice(0, -suffix.length) : t), thema.trim());
  return basis + BEZEICHNUNG_SUFFIX[bezeichnung];
}

export interface ParallelVorbereitung {
  snapshot: DocumentSnapshot;
  /** Text-Modus mit Quelltext: die Lehrkraft soll zuerst einen neuen Text einsetzen. */
  brauchtNeuenQuelltext: boolean;
}

/**
 * Neuer Wizard-Zustand aus einem fertigen Dokument. Das Original bleibt
 * unberührt gespeichert; das Ergebnis ist ein neues, noch nicht erzeugtes
 * Dokument mit derselben Blockfolge.
 */
export function bereiteParallelversionVor(
  state: Pick<AppState, 'auftrag' | 'meta' | 'quelltexte' | 'llmProvider' | 'modelName' | 'kreativitaet' | 'ausgabeSprache' | 'renderTemplate' | 'renderLayout'>,
  dokument: DocumentV1,
  bezeichnung: ParallelBezeichnung,
): ParallelVorbereitung {
  const modus = state.meta.modus ?? 'text';
  const thema = parallelThema(state.meta.thema ?? '', bezeichnung);
  return {
    snapshot: {
      auftrag: state.auftrag ? { ...state.auftrag, thema } : null,
      meta: { ...state.meta, thema },
      quelltexte: state.quelltexte,
      bloecke: dokument.bloecke.map(bereiteParallelBlockVor),
      generiertesDokument: null,
      generatedOutdated: false,
      llmProvider: state.llmProvider,
      modelName: state.modelName,
      kreativitaet: state.kreativitaet,
      ausgabeSprache: state.ausgabeSprache,
      renderTemplate: state.renderTemplate,
      renderLayout: state.renderLayout,
    },
    brauchtNeuenQuelltext: modus === 'text' && state.quelltexte.length > 0,
  };
}

export interface Wiederverwendung {
  blockId: string;
  inhalte: string[];
}

/**
 * Prüft lokal, ob die erzeugte Parallelversion Inhalte des Originals
 * wiederholt. Gezählt werden Sätze und Wortgruppen ab zwei Wörtern; bei
 * Kreuzworträtsel, Wortgitter und Vokabeln auch einzelne Wörter. Einzelne
 * Grammatik-Zielwörter (z. B. ein Relativpronomen) sind kein Treffer.
 */
export function findeWiederverwendung(angefordert: Block[], erzeugt: DocumentV1): Wiederverwendung[] {
  const treffer: Wiederverwendung[] = [];
  for (const anforderung of angefordert) {
    if (!istParallelBlock(anforderung)) continue;
    const neu = erzeugt.bloecke.find((b) => b.id === anforderung.id);
    if (!neu) continue;
    const wortTyp = WORT_TYPEN.has(neu.typ);
    const relevant = (s: string) => {
      const n = normalisiere(s);
      return n.includes(' ') || (wortTyp && n.length >= 4);
    };
    const original = new Set(originalInhalteAusHinweis(anforderung.hinweis).filter(relevant).map(normalisiere));
    if (original.size === 0) continue;
    const doppelt = sammleInhalte(neu).filter((s) => relevant(s) && original.has(normalisiere(s)));
    if (doppelt.length > 0) treffer.push({ blockId: neu.id, inhalte: doppelt });
  }
  return treffer;
}
