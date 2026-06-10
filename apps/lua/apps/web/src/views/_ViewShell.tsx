import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  /** Optionaler Aktionsbereich rechts im Kopf (z. B. „Verlauf löschen"). */
  action?: ReactNode;
  /** Maximale Inhaltsbreite (Default 860). Breitere Ansichten (z. B. Korrektur) heben dies an. */
  maxWidth?: number | string;
  children: ReactNode;
}

/** Gemeinsames Layout für die Nicht-Wizard-Ansichten: Kopf + scrollbarer Inhalt. */
export function ViewShell({ title, description, action, maxWidth = 860, children }: Props) {
  return (
    <div style={{ maxWidth, margin: '0 auto' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: '1rem', marginBottom: '1.25rem',
      }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', margin: 0 }}>{title}</h2>
          {description && (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0.375rem 0 0' }}>
              {description}
            </p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
      {children}
    </div>
  );
}
