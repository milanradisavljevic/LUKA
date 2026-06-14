import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  /** Optionaler Hilfetext unter dem Label. */
  hint?: ReactNode;
  /** Markiert das Feld als Pflichtfeld (* in Fehlerfarbe). */
  required?: boolean;
}

/**
 * Abschnitts-Label im Wizard — ersetzt das ~10× wiederholte
 * `fontWeight:600, fontSize:0.875rem`-Label in Step0 & Co.
 */
export function SectionLabel({ children, hint, required }: SectionLabelProps) {
  return (
    <>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: hint ? '0.25rem' : '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
        {children}
        {required && <span style={{ color: 'var(--color-error)' }}> *</span>}
      </label>
      {hint && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
          {hint}
        </p>
      )}
    </>
  );
}
