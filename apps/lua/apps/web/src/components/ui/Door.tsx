type DoorVariant = 'quelltext' | 'kompetenz' | 'schnell';

interface DoorProps {
  variant: DoorVariant;
  /** Höhe in px; Breite ergibt sich aus dem Seitenverhältnis. */
  height?: number;
}

/**
 * Inline-SVG-Tür — kein Bild (Tauri-EXE-safe), theme-fähig über CSS-Tokens.
 * Beim Hover/Focus der umschließenden `.door-card` öffnet das Türblatt leicht
 * (siehe index.css). Die Türen unterscheiden sich NUR über ihre Füllfarbe und
 * das Label daneben — bewusst KEIN Symbol auf dem Blatt (rein dekorativ,
 * `aria-hidden`; das Label sitzt am umschließenden <button>).
 */
const DOOR_TOKENS: Record<DoorVariant, { leaf: string; edge: string; handle: string; panel: string }> = {
  quelltext: {
    leaf: 'var(--door-quelltext)',
    edge: 'var(--door-quelltext-edge)',
    handle: '#E6C36A', // Messing
    panel: 'color-mix(in srgb, white 28%, transparent)',
  },
  kompetenz: {
    leaf: 'var(--door-kompetenz)',
    edge: 'var(--door-kompetenz-edge)',
    handle: 'var(--door-kompetenz-edge)',
    panel: 'color-mix(in srgb, var(--door-kompetenz-edge) 40%, transparent)',
  },
  schnell: {
    leaf: 'var(--door-schnell)',
    edge: 'var(--door-schnell-edge)',
    handle: '#E6C36A', // Messing
    panel: 'color-mix(in srgb, var(--door-schnell-edge) 45%, transparent)',
  },
};

export function Door({ variant, height = 150 }: DoorProps) {
  const t = DOOR_TOKENS[variant];
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
            fill={t.leaf} stroke={t.edge} strokeWidth="2" />
          {/* zwei symmetrische Füllungen — schlicht, kein Symbol */}
          <rect x="24" y="24" width="76" height="70" rx="3" fill="none" stroke={t.panel} strokeWidth="2" />
          <rect x="24" y="108" width="76" height="70" rx="3" fill="none" stroke={t.panel} strokeWidth="2" />
          {/* Klinke */}
          <circle cx="98" cy="104" r="4.5" fill={t.handle} />
        </g>
      </svg>
    </div>
  );
}
