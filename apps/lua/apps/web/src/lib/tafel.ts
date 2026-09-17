import type { Block, QuellText } from '@lehrunterlagen/schema';
import { baueKreuzwortgitter, baueWortgitter } from '@lehrunterlagen/schema';

export type TafelSlide =
  | { kind: 'quelltext'; quelltext: QuellText }
  | { kind: 'block'; block: Block };

const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 1.6;
const FONT_SCALE_STEP = 0.15;

export function buildTafelSlides(bloecke: Block[], quelltexte: QuellText[] = []): TafelSlide[] {
  const quelltextSlides: TafelSlide[] = quelltexte
    .filter((quelltext) => quelltext.inhalt.trim().length > 0)
    .map((quelltext) => ({ kind: 'quelltext', quelltext }));

  return [
    ...quelltextSlides,
    ...bloecke.map((block) => ({ kind: 'block' as const, block })),
  ];
}

/**
 * Anzahl lösbarer Einzelitems pro Block-Typ.
 * 0 = ganzer Block (Toggle-Verhalten), 1 = ein Item, >1 = schrittweise aufdeckbar.
 */
export function countSolutions(block: Block): number {
  switch (block.typ) {
    case 'lueckentext':
      return block.loesung.luecken?.length ?? block.config.anzahlLuecken ?? 0;
    case 'multipleChoice':
      return block.config.fragen?.length ?? 0;
    case 'matching':
      return block.config.items?.length ?? 0;
    case 'kategorisierung':
      return block.config.items?.length ?? 0;
    case 'wortgitter': {
      const gitter = baueWortgitter(block.config.woerter ?? []);
      return gitter.woerter.length;
    }
    case 'kreuzwortraetsel': {
      const gitter = baueKreuzwortgitter(block.config.eintraege ?? []);
      return gitter.platzierungen.length;
    }
    case 'tabelle': {
      let count = 0;
      for (const zeile of block.config.zeilen ?? []) {
        for (const zelle of zeile.zellen ?? []) {
          if (!('text' in zelle)) count++;
        }
      }
      return count;
    }
    case 'markieraufgabe':
      return block.loesung.stellen?.length ?? 0;
    case 'wordScramble':
      return block.config.saetze?.length ?? 0;
    case 'offeneVerstaendnisfrage':
      return block.config.fragen?.length ?? 0;
    case 'vokabeluebung':
      return block.config.vokabeln?.length ?? 0;
    case 'fehlerkorrektur':
      return block.config.saetze?.length ?? 0;
    case 'umformung':
      return block.config.aufgaben?.length ?? 0;
    default:
      return 0;
  }
}

export function clampFontScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value));
  const snapped = FONT_SCALE_MIN + Math.round((clamped - FONT_SCALE_MIN) / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Number(Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, snapped)).toFixed(2));
}
