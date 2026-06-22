import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewRoleplay({ block, showSolution }: Props) {
  if (block.typ !== 'roleplay') return null;

  return (
    <div
      role="region"
      aria-label="Rollenspiel Vorschau"
      style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}
    >
      <p style={{ marginBottom: '0.5rem' }}>
        <strong>Situation:</strong> {block.config.situation}
      </p>
      <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
        {block.config.setting}
      </p>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Ziel:</strong> {block.config.ziel} · <strong>Zeit:</strong> {block.config.zeitMinuten} Min.
      </p>

      {block.config.redemittel.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <strong>Redemittel:</strong>
          <ul style={{ paddingLeft: '1.25rem', margin: '0.25rem 0 0' }}>
            {block.config.redemittel.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '0.75rem' }}>
        {block.config.rollen.map((rolle, i) => (
          <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
            <strong>{rolle.name || `Rolle ${i + 1}`}</strong>
            <p style={{ margin: '0.25rem 0', fontSize: '10pt' }}>{rolle.beschreibung}</p>
            <p style={{ margin: '0.25rem 0', fontSize: '10pt' }}><strong>Aufgabe:</strong> {rolle.aufgabe}</p>
            {rolle.redemittel.length > 0 && (
              <ul style={{ paddingLeft: '1rem', margin: '0.25rem 0 0', fontSize: '10pt' }}>
                {rolle.redemittel.map((r, j) => <li key={j}>{r}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      {showSolution && (
        <div style={{ padding: '0.5rem', background: 'var(--color-bg-hover)', borderRadius: 4 }}>
          <strong>Musterdialog:</strong>
          {block.loesung.musterdialog.split('\n').map((line, i) => (
            <p key={i} style={{ margin: '0.25rem 0', fontStyle: 'italic' }}>{line}</p>
          ))}
          <p style={{ marginTop: '0.5rem', fontSize: '10pt' }}><strong>Hinweise:</strong> {block.loesung.hinweise}</p>
        </div>
      )}
    </div>
  );
}
