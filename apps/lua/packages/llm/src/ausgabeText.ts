// Wache fuer den vom Modell gelieferten "ausgabeText" (Quelltext-Aufbereitung).
//
// Hintergrund: meta.quelltextFormatieren laesst das Modell eine druckfertige
// Fassung des Quelltextes mitschicken. QuellText.inhalt bleibt dabei unangetastet
// (Hoheit der Lehrkraft, Grundlage fuer Korrektur/ Folgeuebung). Damit die
// aufbereitete Fassung nicht zum Ausgangspunkt fuer erfundenen Text wird, wird sie
// gegen den bereinigten Originalinhalt geprueft und im Zweifel verworfen.
//
// Erlaubt ist ausschliesslich: Absaetze/Umbrueche neu setzen und offensichtliche
// Website-Reste streichen. Wortlaut muss erhalten bleiben, es darf nichts
// hinzukommen. Deshalb: Multiset-Teilmenge der Tokens, keine Normalisierung des
// Wortlauts, keine Aehnlichkeits-Heuristik.

import { bereinigeQuelltext, type QuellText } from '@lehrunterlagen/schema';

/** Ein Wort-Token: Buchstaben/Ziffern inkl. Umlauten, Rest wird als Trenner behandelt. */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}

/** Multiset-Vergleich: ist `kandidat` eine Token-Teilmenge von `referenz`? */
function istTokenTeilmenge(kandidat: string[], referenz: string[]): boolean {
  const rest = new Map<string, number>();
  for (const t of referenz) rest.set(t, (rest.get(t) ?? 0) + 1);
  for (const t of kandidat) {
    const n = rest.get(t) ?? 0;
    if (n === 0) return false;
    rest.set(t, n - 1);
  }
  return true;
}

// HTML-/Markdown-Reste, die das Modell trotz Anweisung mitliefern koennte. Bei
// Treffer wird der Text verworfen - Renderer und Import rechnen mit reinem Text.
const HTML_REST = /<\/?[a-z][^>]*>|\[\[?[^\]]*\]\]?\(|`{1,3}|\*\*|__[^_]/i;

export type AusgabeTextUrteil =
  | { ok: true; text: string }
  | { ok: false; grund: 'leer' | 'html' | 'wortlaut' | 'unvollstaendig' };

/**
 * Prueft die vom Modell gelieferte Aufbereitung eines Quelltextes.
 * `referenzInhalt` ist der Originalinhalt (bereinigt intern verglichen).
 */
export function pruefeAusgabeText(ausgabeText: unknown, referenzInhalt: string): AusgabeTextUrteil {
  if (typeof ausgabeText !== 'string') return { ok: false, grund: 'leer' };
  const text = ausgabeText.replace(/\r\n/g, '\n').trim();
  if (text.length === 0) return { ok: false, grund: 'leer' };
  if (HTML_REST.test(text)) return { ok: false, grund: 'html' };

  const referenz = bereinigeQuelltext(referenzInhalt);
  const referenzTokens = tokens(referenz);
  if (referenzTokens.length === 0) return { ok: false, grund: 'leer' };

  // Nichts hinzuerfinden: jedes Token muss im Original vorkommen.
  if (!istTokenTeilmenge(tokens(text), referenzTokens)) return { ok: false, grund: 'wortlaut' };

  // Nichts weglassen. Die Referenz ist bereits boilerplate-bereinigt, ein Verlust
  // von mehr als der Haelfte ist also Inhaltsverlust und keine Restentfernung.
  // Unterhalb von 12 Tokens faellt die Quote nicht aussagekraeftig — dann zaehlt
  // allein die Token-Teilmenge oben.
  const kandidatTokens = tokens(text);
  if (referenzTokens.length >= 12 && kandidatTokens.length / referenzTokens.length < 0.5) {
    return { ok: false, grund: 'unvollstaendig' };
  }

  return { ok: true, text };
}

export interface UebernahmeErgebnis {
  quelltexte: QuellText[];
  /** Quelltext-IDs, deren Aufbereitung verworfen wurde (Rückfall auf `inhalt`). */
  verworfen: string[];
}

/**
 * Übernimmt `ausgabeText` aus der Modellantwort — ausschließlich dieses Feld.
 * `id`, `titel`, `inhalt` und `herkunft` stammen weiterhin aus `quelltexte`
 * (die vom Aufrufer gelieferten Originale). Unbekannte IDs werden ignoriert.
 */
export function uebernehmenAusgabeTexte(
  quelltexte: QuellText[],
  modellQuelltexte: unknown,
): UebernahmeErgebnis {
  const verworfen: string[] = [];
  if (!Array.isArray(modellQuelltexte)) return { quelltexte, verworfen };

  const angebot = new Map<string, unknown>();
  for (const eintrag of modellQuelltexte) {
    if (eintrag && typeof eintrag === 'object' && typeof (eintrag as { id?: unknown }).id === 'string') {
      angebot.set((eintrag as { id: string }).id, (eintrag as { ausgabeText?: unknown }).ausgabeText);
    }
  }
  if (angebot.size === 0) return { quelltexte, verworfen };

  const quelltexteMitAusgabe = quelltexte.map((q) => {
    if (!angebot.has(q.id)) return q;
    const urteil = pruefeAusgabeText(angebot.get(q.id), q.inhalt);
    if (!urteil.ok) {
      verworfen.push(q.id);
      return q;
    }
    return { ...q, ausgabeText: urteil.text };
  });

  return { quelltexte: quelltexteMitAusgabe, verworfen };
}
