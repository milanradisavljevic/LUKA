import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewSonganalyse({ block, showSolution }: Props) {
  if (block.typ !== 'songanalyse') return null;

  return (
    <div
      role="region"
      aria-label="Songanalyse Vorschau"
      style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}
    >
      <p style={{ marginBottom: '0.5rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <h4 style={{ margin: '0.5rem 0', fontSize: '12pt' }}>
        {block.config.interpret} – {block.config.titel}
        {block.config.genre && <span style={{ fontSize: '10pt', color: 'var(--color-text-secondary)', fontWeight: 400 }}>  ({block.config.genre})</span>}
      </h4>

      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Songtext:</p>
        <blockquote style={{ margin: '0.25rem 0', padding: '0.5rem 0 0.5rem 0.75rem', borderLeft: '3px solid var(--color-border)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          {block.config.lyrics}
        </blockquote>
      </div>

      <p style={{ fontSize: '10pt', marginBottom: '0.5rem' }}>
        <strong>Aufgabe:</strong> {block.config.aufgabe}
      </p>

      {showSolution ? (
        <div style={{ padding: '0.5rem', background: 'var(--color-bg-hover)', borderRadius: 4 }}>
          <strong style={{ fontSize: '10pt' }}>Ergebnis:</strong>
          <p style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>{block.loesung.ergebnis}</p>
          {block.loesung.analysepunkte.length > 0 && (
            <ul style={{ marginTop: '0.5rem', fontSize: '10pt' }}>
              {block.loesung.analysepunkte.map((ap, i) => (
                <li key={i} style={{ marginBottom: '0.25rem' }}>
                  <strong>{ap.aspekt}:</strong> <em>{ap.befund}</em>
                  {ap.zitat && <span style={{ color: 'var(--color-text-secondary)' }}> („{ap.zitat}")</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          (Eigene Analyse in das freie Feld schreiben)
        </p>
      )}
    </div>
  );
}
