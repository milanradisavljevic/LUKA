/**
 * Sehr kleines Markdown-Subset für Update-Release-Notes (`update.body`).
 * Unterstützt bewusst nur: Absätze (Leerzeile trennt), `- `-Listenpunkte
 * (inkl. eingerückter Fortsetzungszeilen), `**fett**`, `` `code` `` und
 * `### `-Überschriften (als fette Zeile). Kein npm-Paket nötig —
 * Release-Notes sind kurze, kontrollierte Texte aus dem eigenen CHANGELOG.
 */

export interface InlineSegment {
  text: string;
  bold: boolean;
  code?: boolean;
}

export type MiniMarkdownBlock =
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'list'; items: InlineSegment[][] };

/** Zerlegt eine Zeile in fett/code/normal-Segmente (`**...**`, `` `...` ``). */
export function parseInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true });
    } else {
      segments.push({ text: match[2] ?? '', bold: false, code: true });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }
  if (segments.length === 0) {
    segments.push({ text: '', bold: false });
  }
  return segments;
}

/** Parst Release-Notes-Text in Absatz-/Listen-Blöcke für das Rendering. */
export function parseMiniMarkdown(source: string): MiniMarkdownBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: MiniMarkdownBlock[] = [];
  let currentList: InlineSegment[][] | null = null;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      blocks.push({ type: 'list', items: currentList });
    }
    currentList = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      if (!currentList) currentList = [];
      currentList.push(parseInlineSegments(listMatch[1] ?? ''));
      continue;
    }
    // Eingerückte Zeile direkt unter einem Listenpunkt = Fortsetzung des
    // Punkts (CHANGELOG bricht lange Bullets mit Einrückung um).
    if (currentList && currentList.length > 0 && /^\s{2,}/.test(rawLine)) {
      const last = currentList[currentList.length - 1];
      if (last) {
        last.push({ text: ' ', bold: false }, ...parseInlineSegments(line));
      }
      continue;
    }
    flushList();
    const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'paragraph',
        segments: [{ text: headingMatch[1] ?? '', bold: true }],
      });
      continue;
    }
    blocks.push({ type: 'paragraph', segments: parseInlineSegments(line) });
  }
  flushList();
  return blocks;
}
