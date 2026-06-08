import type { Block } from '@lehrunterlagen/schema';
import { baueKreuzwortgitter } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewKreuzwortraetsel({ block, showSolution }: Props) {
  if (block.typ !== 'kreuzwortraetsel') return null;
  const gitter = baueKreuzwortgitter(block.config.eintraege ?? []);

  const waag = gitter.platzierungen.filter((p) => p.richtung === 'waagrecht');
  const senk = gitter.platzierungen.filter((p) => p.richtung === 'senkrecht');

  const CELL = 26; // px

  return (
    <div role="region" aria-label="Kreuzworträtsel Vorschau" style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      {gitter.zeilen === 0 ? (
        <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          (Noch keine gültigen Einträge — mindestens zwei Wörter mit ≥ 2 Buchstaben nötig.)
        </p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {Array.from({ length: gitter.zeilen }).map((_, r) => (
                <tr key={r}>
                  {Array.from({ length: gitter.spalten }).map((_, c) => {
                    const letter = gitter.belegung[r]?.[c] ?? null;
                    const num = gitter.nummern[r]?.[c] ?? null;
                    if (letter === null) {
                      return <td key={c} style={{ width: CELL, height: CELL, border: 'none' }} />;
                    }
                    return (
                      <td key={c} style={{
                        position: 'relative', width: CELL, height: CELL,
                        border: '1px solid var(--color-text-primary)', textAlign: 'center', verticalAlign: 'middle',
                        fontSize: '11pt', fontWeight: 700, background: '#fff',
                      }}>
                        {num !== null && (
                          <span style={{ position: 'absolute', top: 0, left: 1, fontSize: '6pt', fontWeight: 400, lineHeight: 1 }}>{num}</span>
                        )}
                        {showSolution ? letter : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '10pt' }}>
        {waag.length > 0 && (
          <div>
            <strong>Waagrecht:</strong>
            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
              {waag.map((p) => <li key={`w${p.nr}`}>{p.nr}. {p.hinweis}{showSolution ? ` (${p.wort})` : ''}</li>)}
            </ul>
          </div>
        )}
        {senk.length > 0 && (
          <div>
            <strong>Senkrecht:</strong>
            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
              {senk.map((p) => <li key={`s${p.nr}`}>{p.nr}. {p.hinweis}{showSolution ? ` (${p.wort})` : ''}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
