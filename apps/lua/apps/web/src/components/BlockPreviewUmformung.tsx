import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewUmformung({ block, showSolution }: Props) {
  if (block.typ !== 'umformung') return null;

  return (
    <div
      role="region"
      aria-label="Umformung Vorschau"
      style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}
    >
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
        {block.config.aufgaben.map((a) => (
          <li key={a.nr} style={{ marginBottom: '0.5rem' }}>
            <span style={{ display: 'block', fontStyle: 'italic' }}>{a.ausgangssatz}</span>
            <span style={{ display: 'block', fontSize: '10pt', color: 'var(--color-text-secondary)' }}>
              → {a.anweisung} ({a.zielstruktur})
            </span>
            {showSolution && (
              <span style={{ display: 'block', marginTop: '0.25rem', padding: '0.25rem 0.5rem', background: 'var(--color-bg-hover)', borderRadius: 4 }}>
                Lösung: {block.loesung.loesungen.find((l) => l.nr === a.nr)?.umformulierung ?? '—'}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
