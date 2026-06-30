/**
 * Layout-Achse — orthogonal zur visuellen Formatvorlage (RenderTemplate).
 * Steuert ANORDNUNG/DICHTE (Block-Abstand, Schreibraum, Rahmen), NICHT
 * Farben/Schrift. Bewusst OHNE Mehrspaltigkeit (docx-Spaltenumbrüche sind
 * fragil). `standard` reproduziert exakt das historische Verhalten.
 *
 * `blockSpacingMm` wird im Renderer via `convertMillimetersToTwip` in Twips
 * gewandelt. Für `standard` (4.94 mm) ergibt das `Math.floor(4.94/25.4*1440)`
 * = 280 twips — das historische Literal → byte-identischer Output.
 */
export type RenderLayoutId = 'kompakt' | 'standard' | 'grosszuegig' | 'gerahmt';

export interface RenderLayout {
  id: RenderLayoutId;
  label: string;
  description: string;
  /** Vertikaler Abstand vor jedem Block-Banner (mm). */
  blockSpacingMm: number;
  /** Multiplikator für Schreiblinien/Platz bei offenen Aufgaben (1.0 = Standard). */
  answerLineFactor: number;
  /** Jede Aufgabe in eine 1-zellige Rahmen-Tabelle wrappen. */
  frameBlocks: boolean;
  /** Kurze Default-Beschreibung für die UI. */
  intro?: string;
}

export const RENDER_LAYOUTS: Record<RenderLayoutId, RenderLayout> = {
  kompakt: {
    id: 'kompakt',
    label: 'Kompakt',
    description: 'Wenig Abstand, weniger Schreibraum — spart Papier.',
    blockSpacingMm: 2.5,
    answerLineFactor: 0.5,
    frameBlocks: false,
    intro: 'Papiersparend, dichte Anordnung.',
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    description: 'Ausgewogen — das gewohnte LUKA-Layout.',
    // 4.94 mm → 280 twips (historisches Literal) → bit-identisch zu früher.
    blockSpacingMm: 4.94,
    answerLineFactor: 1.0,
    frameBlocks: false,
    intro: 'Voreinstellung, unverändertes Verhalten.',
  },
  grosszuegig: {
    id: 'grosszuegig',
    label: 'Großzügig',
    description: 'Mehr Abstand und Schreibraum — Platz zum Schreiben.',
    blockSpacingMm: 9,
    answerLineFactor: 1.5,
    frameBlocks: false,
    intro: 'Luftig, viel Platz für handschriftliche Antworten.',
  },
  gerahmt: {
    id: 'gerahmt',
    label: 'Gerahmt',
    description: 'Jede Aufgabe in einer Box — wie eine echte Klausur.',
    blockSpacingMm: 6,
    answerLineFactor: 1.0,
    frameBlocks: true,
    intro: 'Aufgaben optisch abgegrenzt als Rahmen-Boxen.',
  },
};

/** Standard-Layout (NEUTRAL — byte-identisch zum historischen Output). */
export function getDefaultLayout(): RenderLayout {
  return RENDER_LAYOUTS.standard;
}
