import type { ReactNode } from 'react';

interface HeroProps {
  /** Große Schreibschrift-Zeile (Playwrite). */
  greeting: ReactNode;
  /** Untertitel-Frage/Beschreibung. */
  subtitle?: ReactNode;
  /** Rechts oben (z. B. Klassen-Badge). */
  aside?: ReactNode;
  /** Inhalt unter dem Kopf (z. B. die zwei Türen). */
  children?: ReactNode;
  /** Kompaktere Variante für Wizard-Köpfe. */
  compact?: boolean;
  /** Untertitel in Schreibschrift (Playwrite) statt nüchtern. */
  subtitleScript?: boolean;
}

/**
 * Begrüßungs-/Kopf-Block mit Papier-Anmutung und Tinten-Schreibschrift.
 * Genutzt im Dashboard-Hero und (compact) als Wizard-Schrittkopf.
 */
export function Hero({ greeting, subtitle, aside, children, compact = false, subtitleScript = false }: HeroProps) {
  return (
    <div
      className="paper"
      style={{
        padding: compact ? '1.25rem 1.5rem' : '2.5rem 2.5rem 2rem',
        marginBottom: compact ? '1.25rem' : '2rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <h1
          className="font-script ink-underline"
          style={{
            fontSize: compact ? '1.5rem' : '2.25rem',
            fontWeight: 300,
            margin: 0,
            color: 'var(--color-accent)',
            lineHeight: 1.2,
          }}
        >
          {greeting}
        </h1>
        {aside}
      </div>
      {subtitle && (
        <p
          className={subtitleScript ? 'font-script' : undefined}
          style={{
            fontSize: subtitleScript ? (compact ? '1.25rem' : '1.625rem') : (compact ? '0.9375rem' : '1.125rem'),
            color: subtitleScript ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            margin: compact ? '0.5rem 0 0' : '0.5rem 0 1.75rem',
          }}
        >
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
