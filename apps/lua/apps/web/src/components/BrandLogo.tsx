import type { CSSProperties } from 'react';

/** Markenfarben „Tinte & Papier" — kein Verlauf, kein Violett. */
const INK = '#2C4A6E';        // Tintenblau
const PARCHMENT = '#F4ECD8';  // warmes Pergament (konstant in beiden Themes)
const BRASS = '#E6C36A';      // Messing-Akzent (wie die Türklinken)

/**
 * Wortmarke „Luka" als Tinten-Signatur (Playwrite-Schreibschrift).
 * Bewusst OHNE feste Farbe → erbt die Textfarbe des Kontexts (Sidebar hell/dunkel),
 * damit sie in beiden Themes lesbar bleibt. Die Markenfarbe trägt die Feder-Kachel.
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
 * eine Tinten-Federspitze unter einem dezenten Punkte-Bogen — der „pädagogische
 * Kreislauf". Mono Tinte auf Pergament-Kachel, ein Messing-Punkt als Akzent.
 */
export function NibMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Pergament-Kachel (konstant → in jedem Theme lesbar, dient auch als App-Icon) */}
      <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill={PARCHMENT} stroke="rgba(44,74,110,0.18)" strokeWidth="1.5" />
      {/* Kreislauf-Bogen: fünf Punkte, der mittlere in Messing */}
      <circle cx="13" cy="15" r="1.6" fill={INK} />
      <circle cx="18" cy="10.6" r="1.9" fill={INK} />
      <circle cx="24" cy="8.9" r="2.3" fill={BRASS} />
      <circle cx="30" cy="10.6" r="1.9" fill={INK} />
      <circle cx="35" cy="15" r="1.6" fill={INK} />
      {/* Federspitze (nach unten zulaufendes Blatt) */}
      <path d="M24 41 L30.5 22 Q24 18.3 17.5 22 Z" fill={INK} />
      {/* Mittelschlitz */}
      <line x1="24" y1="24.4" x2="24" y2="37.5" stroke={PARCHMENT} strokeWidth="1.4" strokeLinecap="round" />
      {/* Luftloch */}
      <circle cx="24" cy="24" r="1.7" fill={PARCHMENT} />
    </svg>
  );
}

/**
 * Marken-Signatur: Feder-Mark + handgeschriebenes „Luka".
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
      <NibMark size={size} />
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
