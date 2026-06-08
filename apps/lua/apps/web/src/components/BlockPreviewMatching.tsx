import { ArrowRight } from 'lucide-react';
import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewMatching({ block, showSolution }: Props) {
  if (block.typ !== 'matching') return null;
  const config = block.config;
  const loesung = block.loesung;
  const items = config.items ?? [];
  const optionen = config.optionen ?? [];
  const zuordnung = loesung.zuordnung ?? {};

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', borderBottom: '1px solid black', fontWeight: 700 }}>
              {block.typ === 'matching' ? 'Items' : ''}
            </th>
            <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', borderBottom: '1px solid black', fontWeight: 700 }}>
              Zuordnung
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: { nr: number; prompt: string }) => (
            <tr key={item.nr}>
              <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)', width: '40%' }}>
                {item.nr}. {item.prompt}
              </td>
              <td style={{ padding: '0.375rem 0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                {showSolution && zuordnung[String(item.nr)] ? (
                  <span style={{ fontStyle: 'italic', color: '#000', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <ArrowRight size={13} /> {zuordnung[String(item.nr)]}
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-border)' }}>(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '0.75rem' }}>
        <strong style={{ fontSize: '10pt' }}>Mögliche Zuordnungen:</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
          {optionen.map((opt: { key: string; text: string }) => (
            <span key={opt.key} style={{
              padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)',
              borderRadius: 3, fontSize: '10pt',
            }}>
              {opt.key}: {opt.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
