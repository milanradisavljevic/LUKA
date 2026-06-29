import type { CSSProperties } from 'react';

/** Markenfarben „Tinte & Papier" — kein Verlauf, kein Violett. */
const NAVY = '#22364F';       // tiefe Tinte (konstante Kachel)
const CREAM = '#F4ECD8';      // Pergament/Creme (das „L")
const PAGE = '#CDBF9B';       // Papier-Ecke (etwas dunkler → abhebbar)

/**
 * Wortmarke „Luka" als Tinten-Signatur (Playwrite-Schreibschrift).
 * Ohne feste Farbe → erbt die Textfarbe des Kontexts (Sidebar hell/dunkel),
 * damit sie in beiden Themes lesbar bleibt. Die Markenfarbe trägt die Kachel.
 */
export const WORDMARK_STYLE: CSSProperties = {
  fontFamily: 'var(--font-script)',
  fontWeight: 400,
  fontStyle: 'italic',
  letterSpacing: '0.01em',
  lineHeight: 1.1,
};

/**
 * Marken-Mark als Inline-SVG (Tauri-EXE-safe, theme-stabil, skaliert zum App-Icon):
 * ein „L"-Monogramm in Creme auf konstanter Tinten-Kachel, mit einer eingelegten
 * Papier-Ecke in der L-Beuge („Lehrunterlagen"). Liest auch bei 16 px (Taskbar/Dock).
 */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Tinten-Kachel (konstant → in jedem Theme lesbar, dient auch als App-Icon) */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill={NAVY} />
      {/* Papier-Ecke in der L-Beuge (Sail mit gewölbter Oberkante) */}
      <path d="M23 16 Q32 17.5 32 27 L32 31 L23 31 Z" fill={PAGE} />
      {/* „L" aus zwei abgerundeten Balken */}
      <rect x="14" y="12" width="7" height="24" rx="3.4" fill={CREAM} />
      <rect x="14" y="29" width="19" height="7" rx="3.4" fill={CREAM} />
    </svg>
  );
}

/**
 * Marken-Signatur: L-Mark + handgeschriebenes „Luka".
 * Einziger Ort der Marke in der App (Sidebar) — der Header trägt sie nicht mehr.
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
      <BrandMark size={size} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...WORDMARK_STYLE, fontSize: Math.round(size * 0.62), color: 'var(--sidebar-text)' }}>Luka</div>
        {showTagline && (
          <div
            style={{ fontSize: '0.6875rem', color: 'var(--sidebar-text)', whiteSpace: 'nowrap', letterSpacing: '0.02em', opacity: 0.7 }}
          >
            {tagline}
          </div>
        )}
      </div>
    </div>
  );
}
