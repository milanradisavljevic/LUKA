import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewWordScramble({ block, showSolution }: Props) {
  if (block.typ !== 'wordScramble') return null;
  const saetze = block.config.saetze ?? [];

  return (
    <div
      role="region"
      aria-label="Wörter ordnen Vorschau"
      style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}
    >
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      {saetze.map((satz, idx) => {
        const woerter = satz.wort.split(/\s+/).filter((w) => w.length > 0);
        const gemischt = [...woerter].reverse();
        return (
          <div key={idx} style={{ marginBottom: '0.75rem' }}>
            {saetze.length > 1 && (
              <p style={{ fontWeight: 600, fontSize: '10pt', marginBottom: '0.25rem' }}>{idx + 1}.</p>
            )}
            <div
              role="group"
              aria-label={`Begriffe in zufälliger Reihenfolge, Satz ${idx + 1}`}
              style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 4 }}
            >
              <p style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '9pt', color: 'var(--color-text-secondary)' }}>
                Begriffe (durcheinander):
              </p>
              <p style={{ fontSize: '12pt', letterSpacing: '0.05em' }}>{gemischt.join('  |  ')}</p>
            </div>
            {showSolution && (
              <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: 'var(--color-bg-hover)', borderRadius: 4 }}>
                <strong style={{ fontSize: '10pt' }}>Korrekte Anordnung:</strong>
                <p style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>{satz.wort}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
