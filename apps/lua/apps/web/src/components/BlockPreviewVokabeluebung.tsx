import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewVokabeluebung({ block, showSolution }: Props) {
  if (block.typ !== 'vokabeluebung') return null;
  const config = block.config;
  const vokabeln = config.vokabeln ?? [];
  const richtung = config.richtung as 'de_fremd' | 'fremd_de';
  const antworten = (block.loesung?.antworten ?? {}) as Record<string, string>;

  const quelleLabel = richtung === 'de_fremd' ? 'Deutsch' : 'Fremdsprache';
  const zielLabel = richtung === 'de_fremd' ? 'Fremdsprache' : 'Deutsch';

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid black' }}>
            <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', fontWeight: 700, width: '8%' }}>Nr.</th>
            <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', fontWeight: 700, width: '46%' }}>{quelleLabel}</th>
            <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', fontWeight: 700, width: '46%' }}>{zielLabel}</th>
          </tr>
        </thead>
        <tbody>
          {vokabeln.map((v: { deutsch: string; fremdsprache: string; kontextsatz?: string }, i: number) => {
            const nr = i + 1;
            const quellText = richtung === 'de_fremd' ? v.deutsch : v.fremdsprache;
            const zielText = richtung === 'de_fremd' ? v.fremdsprache : v.deutsch;
            const loesung = antworten[String(nr)] ?? zielText;
            return (
              <tr key={nr}>
                <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>{nr}.</td>
                <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                  {quellText}
                  {v.kontextsatz && (
                    <span style={{ display: 'block', fontSize: '9pt', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '0.125rem' }}>
                      „{v.kontextsatz}"
                    </span>
                  )}
                </td>
                <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                  {showSolution ? (
                    <span style={{ fontStyle: 'italic', color: '#2e7d32' }}>{loesung}</span>
                  ) : (
                    <span style={{ borderBottom: '1px solid var(--color-border)', display: 'inline-block', minWidth: '8rem', color: 'var(--color-text-secondary)' }}>&nbsp;</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
