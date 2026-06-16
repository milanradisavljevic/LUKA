import type { Block, DocumentV1 } from '@lehrunterlagen/schema';

/** Offene Blocktypen, die sich für Leicht/Schwer-Variationen eignen. */
const OFFENE_TYPEN = new Set<Block['typ']>([
  'offeneVerstaendnisfrage',
  'offeneSchreibaufgabe',
  'markieraufgabe',
]);

export function istOffenerBlock(block: Block): boolean {
  return OFFENE_TYPEN.has(block.typ);
}

/**
 * Transformiert ein Dokument in eine LEICHT-Version — ohne LLM.
 * - offeneVerstaendnisfrage: mehr Hilfszeilen
 * - offeneSchreibaufgabe: kürzerer Wortbereich
 * - geschlossene Typen: unverändert
 */
export function transformiereLeicht(doc: DocumentV1): DocumentV1 {
  const bloecke = doc.bloecke.map((block) => {
    if (block.typ === 'offeneVerstaendnisfrage') {
      return {
        ...block,
        config: {
          ...block.config,
          fragen: block.config.fragen.map((f) => ({
            ...f,
            zeilen: f.zeilen + 2,
          })),
        },
      };
    }
    if (block.typ === 'offeneSchreibaufgabe') {
      const min = Math.max(50, Math.round(block.config.umfangWorte.min * 0.7));
      const max = Math.max(min + 20, Math.round(block.config.umfangWorte.max * 0.7));
      return {
        ...block,
        config: {
          ...block.config,
          umfangWorte: { min, max },
        },
      };
    }
    return block;
  });

  return { ...doc, bloecke };
}

/**
 * Liste der offenen Block-IDs in einem Dokument (für Schwer-Reroll).
 */
export function findeOffeneBlockIds(doc: DocumentV1): string[] {
  return doc.bloecke.filter(istOffenerBlock).map((b) => b.id);
}
