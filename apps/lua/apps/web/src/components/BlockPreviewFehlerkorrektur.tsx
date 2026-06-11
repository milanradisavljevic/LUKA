import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewFehlerkorrektur({ block, showSolution }: Props) {
  if (block.typ !== 'fehlerkorrektur') return null;

  return (
    <div
      role="region"
      aria-label="Fehlerkorrektur Vorschau"
      style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}
    >
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
        {block.config.saetze.map((s) => (
          <li key={s.nr} style={{ marginBottom: '0.5rem' }}>
            <span style={{ display: 'block' }}>{s.satz}</span>
            <span style={{ display: 'block', fontSize: '10pt', color: 'var(--color-text-secondary)' }}>
              ({s.anzahlFehler} Fehler)
            </span>
            {showSolution && (
              <span style={{ display: 'block', marginTop: '0.25rem', padding: '0.25rem 0.5rem', background: 'var(--color-bg-hover)', borderRadius: 4 }}>
                Korrektur: {block.loesung.korrekturen.find((k) => k.nr === s.nr)?.korrigierterSatz ?? '—'}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
