type DoorVariant = 'quelltext' | 'kompetenz';

interface DoorProps {
  variant: DoorVariant;
  /** Höhe in px; Breite ergibt sich aus dem Seitenverhältnis. */
  height?: number;
}

/**
 * Inline-SVG-Tür — kein Bild (Tauri-EXE-safe), theme-fähig über CSS-Tokens.
 * Beim Hover/Focus der umschließenden `.door-card` öffnet das Türblatt leicht
 * (siehe index.css). Statt eines Icons trägt das Blatt eine eingravierte
 * Plakette — links Text-Zeilen (Quelltext), rechts eine Feder (Kompetenz).
 * Rein dekorativ (`aria-hidden`); Label sitzt am umschließenden <button>.
 */
export function Door({ variant, height = 150 }: DoorProps) {
  const ink = variant === 'quelltext';
  // Eigene Tür-Fülltokens (warm, in beiden Themes gefüllt — nie bg-base).
  const leaf = ink ? 'var(--door-quelltext)' : 'var(--door-kompetenz)';
  const leafEdge = ink ? 'var(--door-quelltext-edge)' : 'var(--door-kompetenz-edge)';
  const panelLine = ink
    ? 'color-mix(in srgb, white 28%, transparent)'
    : 'color-mix(in srgb, var(--door-kompetenz-edge) 40%, transparent)';
  const handle = ink ? '#E6C36A' : 'var(--door-kompetenz-edge)'; // Messing vs. Tinte
  // Gravur: dunkler „Tiefen"-Strich + heller Highlight-Strich, leicht versetzt.
  const engraveDeep = ink ? 'rgba(0,0,0,0.30)' : 'color-mix(in srgb, var(--door-kompetenz-edge) 60%, transparent)';
  const engraveLite = ink ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.55)';
  const width = Math.round(height * 0.62);

  return (
    <div style={{ position: 'relative', width, height, flexShrink: 0 }} aria-hidden="true">
      <svg width={width} height={height} viewBox="0 0 124 200" fill="none" style={{ display: 'block', overflow: 'visible' }}>
        {/* Türrahmen / Zarge */}
        <rect x="2" y="2" width="120" height="196" rx="6"
          fill="var(--color-bg-surface)" stroke="var(--color-border)" strokeWidth="2" />
        {/* Lichtschein im Türrahmen (erscheint beim Öffnen) */}
        <rect className="door-glow" x="10" y="10" width="104" height="184" rx="4"
          fill="color-mix(in srgb, var(--color-info) 22%, transparent)" />
        {/* Türblatt (öffnet sich beim Hover) */}
        <g className="door-leaf">
          <rect x="10" y="10" width="104" height="184" rx="4"
            fill={leaf} stroke={leafEdge} strokeWidth="2" />
          {/* zwei Füllungen */}
          <rect x="24" y="24" width="76" height="58" rx="3" fill="none" stroke={panelLine} strokeWidth="2" />
          <rect x="24" y="120" width="76" height="58" rx="3" fill="none" stroke={panelLine} strokeWidth="2" />

          {/* ── eingravierte Plakette (Mitte) ── */}
          <rect x="34" y="90" width="56" height="20" rx="3"
            fill="none" stroke={engraveDeep} strokeWidth="1.5" />
          <Engraving variant={variant} deep={engraveDeep} lite={engraveLite} />

          {/* Klinke */}
          <circle cx="98" cy="104" r="4.5" fill={handle} />
        </g>
      </svg>
    </div>
  );
}

/** Graviertes Symbol in der Plakette: Tiefenstrich + versetzter Highlight. */
function Engraving({ variant, deep, lite }: { variant: DoorVariant; deep: string; lite: string }) {
  const glyph =
    variant === 'quelltext' ? (
      // drei Text-Zeilen
      <>
        <line x1="44" y1="96" x2="80" y2="96" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="44" y1="100" x2="80" y2="100" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="44" y1="104" x2="68" y2="104" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      // Schreibfeder (Nib) diagonal
      <>
        <path d="M52 105 L66 93 L70 97 L56 109 Z" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <line x1="52" y1="105" x2="56" y2="109" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="68" y1="95" x2="74" y2="100" strokeWidth="1.5" strokeLinecap="round" />
      </>
    );
  return (
    <>
      {/* Highlight-Kopie (1px nach unten/rechts versetzt) → eingelassener Look */}
      <g stroke={lite} transform="translate(0.6,0.8)">{glyph}</g>
      {/* Tiefen-Kopie */}
      <g stroke={deep}>{glyph}</g>
    </>
  );
}
