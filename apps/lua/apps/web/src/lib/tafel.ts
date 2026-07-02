import type { Block, QuellText } from '@lehrunterlagen/schema';

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

export function clampFontScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const clamped = Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value));
  const snapped = FONT_SCALE_MIN + Math.round((clamped - FONT_SCALE_MIN) / FONT_SCALE_STEP) * FONT_SCALE_STEP;
  return Number(Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, snapped)).toFixed(2));
}
