import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewMarkieraufgabe({ block, showSolution }: Props) {
  if (block.typ !== 'markieraufgabe') return null;
  const config = block.config;
  const loesung = block.loesung;
  const stellen: string[] = loesung.stellen ?? [];

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <div style={{ marginBottom: '0.75rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '10pt' }}>
        <p style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '9pt', color: 'var(--color-text-secondary)' }}>
          Markieranweisung:
        </p>
        <p>{config.anweisung}</p>
      </div>

      {showSolution && stellen.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <strong style={{ fontSize: '10pt' }}>Markierte Stellen (Lösung):</strong>
          <ul style={{ margin: '0.375rem 0 0 1.25rem' }}>
            {stellen.map((stelle, i) => (
              <li key={i} style={{
                fontStyle: 'italic', padding: '0.25rem 0',
                borderBottom: '1px solid var(--color-border)',
              }}>
                {stelle}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showSolution && (
        <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '0.5rem' }}>
          (Bitte markiere die entsprechenden Stellen im Quelltext.)
        </p>
      )}
    </div>
  );
}
