// L2: Mengenschätzung für den Korrektur-Stapel VOR dem Start — nach dem
// Rate-Limit-Debakel das Minimum an Planbarkeit (Insights §2). Reine Funktion.

/** Deutsch ≈ 1,3–1,7 Tokens/Wort; konservativ gerundet. */
export const TOKEN_PRO_WORT = 1.5;

/** Dynamisches Antwortbudget der Analyse-Prompts: 4k–12k je Textlänge;
 *  für die Schätzung der Mittelwert. */
export const ANTWORT_TOKENS_PRO_ABGABE = 8000;

export interface BatchSchaetzung {
  dateien: number;
  /** Summe der bekannten Wortzahlen; null, wenn keine Datei gezählt werden konnte. */
  woerter: number | null;
  eingabeTokens: number | null;
  antwortTokens: number;
  gesamtTokens: number | null;
}

export function schaetzeBatch(
  dateien: { woerter?: number | null; visionModus?: boolean }[],
): BatchSchaetzung {
  const gezahlt = dateien.filter((d) => typeof d.woerter === 'number' && (d.woerter ?? 0) > 0);
  const woerter = gezahlt.length > 0
    ? gezahlt.reduce((sum, d) => sum + (d.woerter ?? 0), 0)
    : null;
  const eingabeTokens = woerter !== null ? Math.round(woerter * TOKEN_PRO_WORT) : null;
  const antwortTokens = dateien.length * ANTWORT_TOKENS_PRO_ABGABE;
  return {
    dateien: dateien.length,
    woerter,
    eingabeTokens,
    antwortTokens,
    gesamtTokens: eingabeTokens !== null ? eingabeTokens + antwortTokens : null,
  };
}

export function formatTokenzahl(tokens: number): string {
  return new Intl.NumberFormat('de-AT', { maximumFractionDigits: 0 }).format(tokens);
}
