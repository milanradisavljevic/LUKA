import type { ReactNode, CSSProperties } from 'react';

interface TileProps {
  /** Markiert die Kachel als ausgewählt (setzt aria-pressed + .tile-selected-Optik). */
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** Icon links neben dem Titel (z. B. <FileText size={18} />). */
  icon?: ReactNode;
  /** Farbe des Icons (Blocktyp-Farbe etc.); default Akzent. */
  iconColor?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Badge oben rechts (z. B. Zeit-/Punkte-Badge). */
  badge?: ReactNode;
  /** Zusätzlicher Inhalt unter Titel/Untertitel (Heatmap-Balken o. Ä.). */
  children?: ReactNode;
  ariaLabel?: string;
  title_?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Auswahl-Kachel — ersetzt das überall kopierte Inline-Button-Muster
 * (border 1px/2px + highlight-bg + onMouseEnter-Hover). Hover/Focus/Selected
 * leben in der CSS-Klasse `.tile` (index.css), nicht in JS.
 */
export function Tile({
  selected = false,
  onClick,
  disabled = false,
  icon,
  iconColor = 'var(--color-accent)',
  title,
  subtitle,
  badge,
  children,
  ariaLabel,
  title_,
  style,
  className,
}: TileProps) {
  const hasHeaderRow = icon || badge;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      title={title_}
      className={`tile${className ? ` ${className}` : ''}`}
      style={style}
    >
      {hasHeaderRow ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon && (
            <span style={{ display: 'inline-flex', color: iconColor, flexShrink: 0 }}>
              {icon}
            </span>
          )}
          <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{title}</span>
          {badge && <span style={{ flexShrink: 0 }}>{badge}</span>}
        </div>
      ) : (
        <span style={{ fontWeight: 600 }}>{title}</span>
      )}
      {subtitle && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          {subtitle}
        </span>
      )}
      {children}
    </button>
  );
}
