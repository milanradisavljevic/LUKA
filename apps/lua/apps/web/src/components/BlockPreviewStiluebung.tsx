import { ArrowRight } from 'lucide-react';
import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewStiluebung({ block, showSolution }: Props) {
  if (block.typ !== 'stiluebung') return null;

  return (
    <div
      role="region"
      aria-label="Stilübung Vorschau"
      style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}
    >
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Ausgangstext:</p>
        <blockquote style={{ margin: '0.25rem 0', padding: '0.5rem 0 0.5rem 0.75rem', borderLeft: '3px solid var(--color-border)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          {block.config.ausgangstext}
        </blockquote>
      </div>

      <p style={{ fontSize: '10pt', marginBottom: '0.75rem' }}>
        <strong>Ziel:</strong> {block.config.transformation} <ArrowRight size={13} style={{ verticalAlign: 'middle' }} /> {block.config.zielniveau}
      </p>

      {showSolution ? (
        <div style={{ padding: '0.5rem', background: 'var(--color-bg-hover)', borderRadius: 4 }}>
          <strong style={{ fontSize: '10pt' }}>Musterlösung:</strong>
          <p style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>{block.loesung.umformulierung}</p>
          <p style={{ fontSize: '10pt', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            <strong>Begründung:</strong> {block.loesung.begruendung}
          </p>
        </div>
      ) : (
        <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          (Eigene Umformulierung in das freie Feld schreiben)
        </p>
      )}
    </div>
  );
}
