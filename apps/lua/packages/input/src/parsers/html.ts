import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseHTML } from 'linkedom';
import type { ParseResult } from '../types.js';

/**
 * Tags, die komplett entfernt werden (kein Text extrahiert).
 */
const STRIP_TAGS = new Set([
  'script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript',
  'svg', 'canvas', 'iframe', 'embed', 'object', 'audio', 'video',
]);

/**
 * Parst eine HTML-Datei und extrahiert sauberen Text.
 * Entfernt Boilerplate (Navigation, Footer, Scripts, etc.).
 */
export async function parseHtml(filePath: string): Promise<ParseResult> {
  const raw = await readFile(filePath, 'utf-8');
  return parseHtmlString(raw, basename(filePath, '.html'));
}

/**
 * Parst einen HTML-String und extrahiert sauberen Text.
 * Wird auch vom URL-Parser verwendet.
 */
export function parseHtmlString(html: string, fallbackTitel?: string): ParseResult {
  const { document } = parseHTML(html);

  // 1. Entferne strip-Tags komplett
  for (const tagName of STRIP_TAGS) {
    for (const el of Array.from(document.getElementsByTagName(tagName))) {
      el.remove();
    }
  }

  // 2. Versuche Titel zu extrahieren
  const titleEl = document.querySelector('title');
  const h1El = document.querySelector('h1');
  const titel =
    titleEl?.textContent?.trim() ||
    h1El?.textContent?.trim() ||
    fallbackTitel;

  // 3. Finde den Hauptinhalt
  const root = document.querySelector('article') ||
               document.querySelector('main') ||
               document.querySelector('[role="main"]') ||
               document.body ||
               document.documentElement;

  // 4. Extrahiere Text mit getTextContent
  let inhalt = getTextContent(root);

  // 5. Post-Processing
  inhalt = inhalt
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n\n');

  inhalt = inhalt.replace(/\n{3,}/g, '\n\n');
  inhalt = inhalt.trim();

  return titel !== undefined ? { inhalt, titel } : { inhalt };
}

/**
 * Extrahiert Text aus einem Element, behandelt Block-Elemente.
 */
function getTextContent(node: Element | Node): string {
  if (node.nodeType === 3) {
    return node.textContent || '';
  }

  if (node.nodeType !== 1) return '';

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();

  if (STRIP_TAGS.has(tagName)) return '';

  const isBlock = isBlockElement(tagName);
  const parts: string[] = [];

  for (const child of Array.from(el.childNodes)) {
    const childText = getTextContent(child);
    if (childText) {
      parts.push(childText);
    }
  }

  let text = parts.join(isBlock ? '\n' : ' ');

  // Fuege Zeilenumbruch nach block-level Elementen hinzu
  if (isBlock && text) {
    text += '\n';
  }

  return text;
}

function isBlockElement(tagName: string): boolean {
  return [
    'article', 'main', 'section', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'li', 'ul', 'ol', 'blockquote', 'pre', 'figcaption', 'td', 'th', 'tr',
    'br',
  ].includes(tagName);
}
