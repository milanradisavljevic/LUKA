import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewKategorisierung({ block, showSolution }: Props) {
  if (block.typ !== 'kategorisierung') return null;

  return (
    <div
      role="region"
      aria-label="Kategorisierung Vorschau"
      style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}
    >
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <table
        role="table"
        aria-label="Kategorisierungs-Tabelle"
        style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem' }}
      >
        <thead>
          <tr>
            <th style={{ border: '1px solid var(--color-text-muted)', padding: '0.5rem', background: 'var(--color-bg-hover)', textAlign: 'left', width: '50%' }}>
              Begriff
            </th>
            <th style={{ border: '1px solid var(--color-text-muted)', padding: '0.5rem', background: 'var(--color-bg-hover)', textAlign: 'left', width: '50%' }}>
              Kategorie
            </th>
          </tr>
        </thead>
        <tbody>
          {block.config.items.map((item) => {
            const kat = showSolution ? (block.loesung.zuordnung[String(item.nr)] ?? []).join(', ') : '';
            return (
              <tr key={item.nr}>
                <td style={{ border: '1px solid var(--color-text-muted)', padding: '0.5rem' }}>{item.text}</td>
                <td style={{ border: '1px solid var(--color-text-muted)', padding: '0.5rem', fontStyle: showSolution ? 'italic' : 'normal', color: showSolution ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                  {kat || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)' }}>
        Verfügbare Kategorien: {block.config.kategorien.map((k) => k.name).join(', ')}
      </p>
    </div>
  );
}
