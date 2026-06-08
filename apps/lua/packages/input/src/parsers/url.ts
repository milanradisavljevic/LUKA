import type { ParseResult } from '../types.js';
import { parseHtmlString } from './html.js';

export class InputError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'InputError';
  }
}

/**
 * Ruft eine URL ab, parst das HTML und extrahiert sauberen Text.
 *
 * Fehlerbehandlung (kein stilles Scheitern):
 * - 403/429/503 → "Seite blockiert automatische Abrufe → als HTML speichern und hochladen"
 * - 401 → "Login erforderlich → als HTML speichern und hochladen"
 * - Network-Fehler → "Seite nicht erreichbar → URL pruefen"
 */
export async function parseUrl(url: string): Promise<ParseResult> {
  let response: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new InputError(
        'Zeitueberschreitung beim Abruf. Die Seite antwortet nicht. Speichere die Seite als HTML und lade sie hoch.',
        'TIMEOUT',
      );
    }
    throw new InputError(
      'Die Seite ist nicht erreichbar. Pruefe die URL und deine Internetverbindung.',
      'NETWORK_ERROR',
    );
  }

  if (response.status === 401) {
    throw new InputError(
      'Diese Seite erfordert einen Login. Speichere die Seite als HTML und lade sie hoch.',
      'LOGIN_REQUIRED',
    );
  }

  if (response.status === 403 || response.status === 429 || response.status === 503) {
    throw new InputError(
      'Diese Seite blockiert automatische Abrufe. Speichere die Seite als HTML und lade sie hoch.',
      'BLOCKED',
    );
  }

  if (!response.ok) {
    throw new InputError(
      `Fehler beim Abruf: HTTP ${response.status}. Speichere die Seite als HTML und lade sie hoch.`,
      `HTTP_${response.status}`,
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    // Trotzdem versuchen zu parsen, aber warnen
  }

  const html = await response.text();

  if (html.trim().length === 0) {
    throw new InputError(
      'Die Seite lieferte keinen Inhalt. Speichere die Seite als HTML und lade sie hoch.',
      'EMPTY',
    );
  }

  return parseHtmlString(html, url);
}
