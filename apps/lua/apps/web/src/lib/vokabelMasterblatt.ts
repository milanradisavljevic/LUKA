import type { Block, Meta } from '@lehrunterlagen/schema';
import { createDefaultBlock } from './blockDefaults';

export const VOCAB_MASTERBLATT_MARKER = 'Vokabel-Masterblatt Englisch (Vorlage)';

const ANZAHL = 10;

/**
 * Erzeugt einen editierbaren Aufgabenmix fuer ein englisches Vokabel-Masterblatt.
 * Die Felder tragen sichtbare Platzhalter statt Leerstrings: das Schema verlangt
 * fuer Vokabeln, Matching und Rätsel mind. 1–2 Zeichen, und eine leere Zeile
 * waere beim Erzeugen nicht mehr sinnvoll fuehrbar.
 */
export function createVokabelMasterblattBlocks(meta: Meta): Block[] {
  const nummeriert = (von: number) => Array.from({ length: ANZAHL }, (_, i) => von + i);

  const vokabel = createDefaultBlock('vokabeluebung', meta);
  if (vokabel.typ === 'vokabeluebung') {
    vokabel.config = {
      ...vokabel.config,
      richtung: 'de_fremd',
      anzahlVokabeln: ANZAHL,
      vokabeln: nummeriert(1).map((nr) => ({ deutsch: `[Deutsch ${nr}]`, fremdsprache: `[English ${nr}]` })),
    };
    vokabel.hinweis = `${VOCAB_MASTERBLATT_MARKER}: Verteile die Vokabelliste über die Aufgabenarten.`;
  }

  const matching = createDefaultBlock('matching', meta);
  if (matching.typ === 'matching') {
    matching.config = {
      items: nummeriert(1).map((nr) => ({ nr, prompt: `[English ${nr}]` })),
      // Eine Distraktor-Option mehr als Items – so bleibt die Aufgabe zuordenbar.
      optionen: Array.from({ length: ANZAHL + 1 }, (_, i) => ({ key: String.fromCharCode(65 + i), text: `[Deutsch ${i + 1}]` })),
    };
  }

  const lueckentext = createDefaultBlock('lueckentext', meta);
  if (lueckentext.typ === 'lueckentext') {
    lueckentext.config = { ...lueckentext.config, anzahlLuecken: ANZAHL };
  }

  const kreuzwort = createDefaultBlock('kreuzwortraetsel', meta);
  if (kreuzwort.typ === 'kreuzwortraetsel') {
    kreuzwort.config = {
      ...kreuzwort.config,
      eingabemodus: 'manuell',
      anzahlWoerter: ANZAHL,
      eintraege: nummeriert(1).map((nr) => ({ wort: `[WORT${nr}]`, hinweis: `[Hinweis ${nr}]` })),
    };
  }

  const wortgitter = createDefaultBlock('wortgitter', meta);
  if (wortgitter.typ === 'wortgitter') {
    wortgitter.config = {
      ...wortgitter.config,
      eingabemodus: 'manuell',
      anzahlWoerter: ANZAHL,
      woerter: nummeriert(1).map((nr) => `[WORT${nr}]`),
    };
  }

  return [vokabel, matching, lueckentext, kreuzwort, wortgitter];
}
