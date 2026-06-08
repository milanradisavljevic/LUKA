import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewSchreibaufgabe({ block, showSolution }: Props) {
  if (block.typ !== 'offeneSchreibaufgabe') return null;
  const config = block.config;
  const loesung = block.loesung;
  const umfang = config.umfangWorte ?? { min: 200, max: 300 };
  const aspekte: string[] = config.aspekte ?? [];
  const lineHeightPx = Math.round(9 * 3.78);

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <div style={{ marginBottom: '0.75rem', fontSize: '10.5pt' }}>
        <p style={{ marginBottom: '0.25rem' }}>
          <strong>Situation:</strong> {config.situation}
        </p>
        <p style={{ marginBottom: '0.25rem' }}>
          <strong>Textsorte:</strong> {config.textsorte}
        </p>
        <p style={{ marginBottom: '0.25rem' }}>
          <strong>Umfang:</strong> {umfang.min}–{umfang.max} Wörter
        </p>
      </div>

      {aspekte.length > 0 && (
        <div style={{ marginBottom: '0.75rem', fontSize: '10.5pt' }}>
          <strong>Aspekte:</strong>
          <ul style={{ margin: '0.25rem 0 0 1.25rem' }}>
            {aspekte.map((asp, i) => (
              <li key={i}>{asp}</li>
            ))}
          </ul>
        </div>
      )}

      {showSolution && loesung.musterloesung ? (
        <div style={{ marginTop: '1rem' }}>
          <strong style={{ fontSize: '10pt' }}>Musterlösung:</strong>
          <div style={{
            fontStyle: 'italic', padding: '0.5rem', marginTop: '0.25rem',
            borderLeft: '3px solid var(--color-border)', fontSize: '10.5pt',
          }}>
            {loesung.musterloesung}
          </div>
          {'erwartungshorizont' in loesung && loesung.erwartungshorizont && (
            <div style={{ marginTop: '0.75rem', fontSize: '10pt' }}>
              <strong>Erwartungshorizont:</strong>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.25rem' }}>
                <tbody>
                  {Object.entries(loesung.erwartungshorizont as Record<string, string>).map(([key, val]) => (
                    <tr key={key}>
                      <td style={{
                        padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)',
                        fontWeight: 600, width: 140, fontSize: '9pt',
                      }}>
                        {key}
                      </td>
                      <td style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)', fontSize: '9pt' }}>
                        {val}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            (Schreibbereich – ca. {umfang.min}–{umfang.max} Wörter)
          </p>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{
              height: lineHeightPx, borderBottom: '1px solid var(--color-border)',
              marginBottom: '0.125rem',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
