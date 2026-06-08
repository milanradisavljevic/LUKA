import { Check } from 'lucide-react';
import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewMultipleChoice({ block, showSolution }: Props) {
  if (block.typ !== 'multipleChoice') return null;
  const config = block.config;
  const loesung = block.loesung;
  const fragen = config.fragen ?? [];
  const antworten = loesung.antworten ?? {};

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      {fragen.map((frage: {
        nr: number; frage: string;
        optionen: Array<{ key: string; text: string }>;
        mehrfach: boolean;
      }) => {
        const correctKeys: string[] = antworten[String(frage.nr)] ?? [];
        return (
          <div key={frage.nr} style={{ marginBottom: '1rem' }}>
            <p style={{ marginBottom: '0.375rem', fontWeight: 600, fontSize: '10.5pt' }}>
              {frage.nr}. {frage.frage}
              {frage.mehrfach && (
                <span style={{ fontWeight: 400, fontSize: '9pt', color: 'var(--color-text-secondary)' }}>
                  {' '}(Mehrfachauswahl möglich)
                </span>
              )}
            </p>
            {frage.optionen.map((opt) => {
              const isCorrect = correctKeys.includes(opt.key);
              return (
                <label key={opt.key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.25rem 0', cursor: 'default', fontSize: '10.5pt',
                }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: frage.mehrfach ? 2 : '50%',
                    border: '1.5px solid var(--color-text-secondary)', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: showSolution && isCorrect ? 'var(--color-bg-selected)' : 'transparent',
                    fontSize: '9pt', fontWeight: 700, flexShrink: 0,
                  }}>
                    {showSolution && isCorrect ? <Check size={12} /> : ''}
                  </span>
                  <span style={{
                    color: showSolution && isCorrect ? '#000' : undefined,
                    fontWeight: showSolution && isCorrect ? 600 : 400,
                  }}>
                    {opt.key}: {opt.text}
                  </span>
                  {showSolution && isCorrect && (
                    <span style={{ fontStyle: 'italic', fontSize: '9pt', color: 'var(--color-text-secondary)' }}>
                      (richtig)
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
