import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewVerstaendnisfrage({ block, showSolution }: Props) {
  if (block.typ !== 'offeneVerstaendnisfrage') return null;
  const config = block.config;
  const loesung = block.loesung;
  const fragen = config.fragen ?? [];
  const antworten = loesung.antworten ?? {};

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      {fragen.map((frage: { nr: number; frage: string; zeilen: number }) => {
        const lineHeightMm = 9;
        const lineHeightPx = Math.round(lineHeightMm * 3.78);
        const answer = antworten[String(frage.nr)] ?? '';

        return (
          <div key={frage.nr} style={{ marginBottom: '1.25rem' }}>
            <p style={{ marginBottom: '0.375rem', fontWeight: 600, fontSize: '10.5pt' }}>
              {frage.nr}. {frage.frage}
            </p>

            {showSolution && answer ? (
              <div style={{
                fontStyle: 'italic', padding: '0.5rem', marginLeft: '1rem',
                borderLeft: '3px solid var(--color-border)', fontSize: '10.5pt',
              }}>
                {answer}
              </div>
            ) : (
              <div>
                {Array.from({ length: frage.zeilen }, (_, i) => (
                  <div key={i} style={{
                    height: lineHeightPx,
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '0.125rem',
                  }} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
