export interface ExtractedText {
  titel?: string;
  inhalt: string;
}

const STRIP_TAGS = new Set([
  'script',
  'style',
  'nav',
  'header',
  'footer',
  'aside',
  'noscript',
  'svg',
  'canvas',
  'iframe',
  'embed',
  'object',
  'audio',
  'video',
]);

const BLOCK_TAGS = new Set([
  'article',
  'main',
  'section',
  'div',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ul',
  'ol',
  'blockquote',
  'pre',
  'figcaption',
  'td',
  'th',
  'tr',
  'br',
]);

export function extractHtmlText(html: string, fallbackTitel?: string): ExtractedText {
  if (typeof DOMParser === 'undefined') {
    return extractHtmlTextFallback(html, fallbackTitel);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');

  for (const tagName of STRIP_TAGS) {
    for (const el of Array.from(document.getElementsByTagName(tagName))) {
      el.remove();
    }
  }

  const titel =
    document.querySelector('title')?.textContent?.trim() ||
    document.querySelector('h1')?.textContent?.trim() ||
    fallbackTitel;

  const root =
    document.querySelector('article') ||
    document.querySelector('main') ||
    document.querySelector('[role="main"]') ||
    document.body ||
    document.documentElement;

  const inhalt = normalizePlainText(getTextContent(root));
  return titel !== undefined ? { titel, inhalt } : { inhalt };
}

export function normalizePlainText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getTextContent(node: Element | Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as Element;
  const tagName = el.tagName.toLowerCase();
  if (STRIP_TAGS.has(tagName)) return '';

  const isBlock = BLOCK_TAGS.has(tagName);
  const parts = Array.from(el.childNodes)
    .map((child) => getTextContent(child))
    .filter(Boolean);

  const text = parts.join(isBlock ? '\n' : ' ');
  return isBlock && text ? `${text}\n` : text;
}

function extractHtmlTextFallback(html: string, fallbackTitel?: string): ExtractedText {
  let cleaned = html;
  for (const tagName of STRIP_TAGS) {
    cleaned = cleaned.replace(new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi'), '');
    cleaned = cleaned.replace(new RegExp(`<${tagName}\\b[^>]*\\/?>`, 'gi'), '');
  }

  const titel =
    matchTagText(cleaned, 'title') ||
    matchTagText(cleaned, 'h1') ||
    fallbackTitel;

  const inhalt = normalizePlainText(
    cleaned
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|main|h[1-6]|li|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
  );

  return titel !== undefined ? { titel, inhalt } : { inhalt };
}

function matchTagText(html: string, tagName: string): string | undefined {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match?.[1]?.replace(/<[^>]+>/g, ' ').trim() || undefined;
}
