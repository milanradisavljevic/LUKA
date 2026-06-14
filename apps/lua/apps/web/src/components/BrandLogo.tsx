import type { CSSProperties } from 'react';

/** Tinte & Papier Farbverlauf der Marke (Tintenblau → Bordeaux). */
const BRAND_GRADIENT = 'linear-gradient(135deg, #2C4A6E 0%, #6E2C4A 100%)';

/** Wortmarke „Luka" als Tinten-Signatur (Playwrite-Schreibschrift, Verlauf). */
export const WORDMARK_STYLE: CSSProperties = {
  fontFamily: 'var(--font-script)',
  fontWeight: 400,
  fontStyle: 'italic',
  letterSpacing: '0.01em',
  background: BRAND_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  lineHeight: 1.1,
};

/**
 * Feder-/Tintennib-Marke als Inline-SVG (Tauri-EXE-safe, theme-fähig).
 * Stilisierte Schreibfeder mit Schlitz + Tintenpunkt — passt zu „Tinte & Papier".
 */
export function NibMark({ size = 36 }: { size?: number }) {
  const r = Math.round(size * 0.26);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: r,
        background: BRAND_GRADIENT,
        boxShadow: '0 2px 8px rgba(44,74,110,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* Federspitze: nach unten zulaufendes Blatt */}
        <path
          d="M12 2.5 L17.5 14 Q12 18 6.5 14 Z"
          fill="rgba(255,255,255,0.95)"
        />
        {/* Mittelschlitz */}
        <line x1="12" y1="6" x2="12" y2="14.5" stroke={'#2C4A6E'} strokeWidth="1.1" strokeLinecap="round" />
        {/* Tintenpunkt am Schlitzende */}
        <circle cx="12" cy="15.4" r="1.5" fill="rgba(255,255,255,0.95)" />
        {/* angedeutete Schreiblinie / Tintenstrich */}
        <path d="M7 19 Q12 21.5 17 19" stroke="rgba(255,255,255,0.7)" strokeWidth="1.1" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

/**
 * Marken-Signatur: Feder-Nib + handgeschriebenes „Luka".
 * Einziger Ort der Marke in der App (Sidebar) — Header trägt sie nicht mehr.
 */
export function BrandSignature({
  size = 38,
  tagline = 'Unterricht erstellen',
  showTagline = true,
}: {
  size?: number;
  tagline?: string;
  showTagline?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
      <NibMark size={size} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...WORDMARK_STYLE, fontSize: Math.round(size * 0.62) }}>Luka</div>
        {showTagline && (
          <div
            style={{ fontSize: '0.6875rem', color: 'var(--sidebar-text)', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}
          >
            {tagline}
          </div>
        )}
      </div>
    </div>
  );
}

/** @deprecated Alias für Bestandscode — nutzt jetzt die Feder-Nib-Marke. */
export function LogoChip({ size = 36 }: { size?: number }) {
  return <NibMark size={size} />;
}
