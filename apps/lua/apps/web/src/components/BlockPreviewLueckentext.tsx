import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewLueckentext({ block, showSolution, onUpdate }: Props) {
  if (block.typ !== 'lueckentext') return null;
  const config = block.config;
  const loesung = block.loesung;
  const anzahl = config.anzahlLuecken ?? 0;
  const wortbank = config.wortbank ?? false;
  const distraktoren = config.distraktoren ?? 0;
  const luecken = loesung.luecken ?? [];

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.5rem' }}>
        <strong>Arbeitsanweisung:</strong>{' '}
        {onUpdate ? (
          <EditableText value={block.arbeitsanweisung}
            onChange={(v) => onUpdate(block.id, 'arbeitsanweisung', v)} />
        ) : block.arbeitsanweisung}
      </p>

      {block.clue && (
        <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          ({block.clue})
        </p>
      )}

      <div style={{ margin: '1rem 0' }}>
        {Array.from({ length: anzahl }, (_, i) => (
          <span key={i} style={{ display: 'inline-block', marginRight: '1.5rem', marginBottom: '0.5rem' }}>
            ({i + 1}){' '}
            {showSolution ? (
              <span style={{ fontStyle: 'italic', paddingLeft: '0.25rem' }}>
                {luecken.find((l: { nr: number; wort: string }) => l.nr === i + 1)?.wort ?? '______'}
              </span>
            ) : (
              <span style={{ textDecoration: 'underline', paddingLeft: '0.25rem', minWidth: 80, display: 'inline-block' }}>
                &nbsp;{'______'}&nbsp;
              </span>
            )}
          </span>
        ))}
      </div>

      {wortbank && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 4 }}>
          <strong style={{ fontSize: '10pt' }}>Wortbank:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', fontSize: '10pt' }}>
            {luecken.map((l: { nr: number; wort: string }) => (
              <span key={l.nr} style={{
                padding: '0.125rem 0.5rem', border: '1px solid var(--color-border)',
                borderRadius: 3, color: showSolution ? undefined : 'var(--color-text-secondary)',
              }}>
                {showSolution ? l.wort : '________'}
              </span>
            ))}
            {Array.from({ length: distraktoren }, (_, i) => (
              <span key={`d${i}`} style={{
                padding: '0.125rem 0.5rem', border: '1px solid var(--color-border)',
                borderRadius: 3, color: 'var(--color-border)',
              }}>
                ________
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontFamily: 'inherit', fontSize: 'inherit', border: '1px dashed var(--color-border)',
        background: 'transparent', width: 'auto', minWidth: 200, padding: '0.125rem 0.25rem',
      }} />
  );
}
