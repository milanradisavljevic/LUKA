import type { CSSProperties } from 'react';

/** Peppiger Farbverlauf der Marke (Indigo → Violett → Pink). */
const BRAND_GRADIENT = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%)';

/** Wortmarke „LUA" mit Verlaufsschrift — für Überschriften. */
export const WORDMARK_STYLE: CSSProperties = {
  fontWeight: 800,
  letterSpacing: '0.06em',
  background: BRAND_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
};

/** Abgerundetes Logo-Quadrat mit „LUA" im Farbverlauf. */
export function LogoChip({ size = 36 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.round(size * 0.28),
        background: BRAND_GRADIENT,
        boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 800,
        letterSpacing: '0.01em',
        fontSize: Math.round(size * 0.34),
        lineHeight: 1,
      }}
    >
      LUA
    </div>
  );
}
