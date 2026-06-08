/**
 * Ergebnis eines Parsers: Aufbereiteter Text plus extrahierte Metadaten.
 */
export interface ParseResult {
  /** Der aufbereitete, reine Text (UTF-8). */
  inhalt: string;

  /** Optionaler Titel, z. B. aus Dokument-Metadaten oder Dateiname. */
  titel?: string;
}

/**
 * Funktionssignatur aller Parser.
 */
export type ParserFn = (filePath: string) => Promise<ParseResult>;
