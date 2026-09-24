import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  solutionStep?: number;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewQuellenanalyse({ block, showSolution, solutionStep }: Props) {
  if (block.typ !== 'quellenanalyse') return null;
  const answers = block.loesung.antworten ?? [];
  const isRevealed = (index: number) => solutionStep !== undefined ? index < solutionStep : showSolution;

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.55 }}>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>
      <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
        Quelle: {block.config.quelleId} · {block.config.quellentyp}
      </p>
      {block.config.auftraege.map((auftrag, index) => {
        const answer = answers.find((a) => a.nr === auftrag.nr);
        return (
          <div key={auftrag.nr} style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ marginBottom: '0.35rem' }}>
              <strong>{auftrag.nr}. {auftrag.operator}:</strong> {auftrag.frage}
            </p>
            {!showSolution && solutionStep === undefined ? (
              <div style={{ color: 'var(--color-text-muted)' }}>{'________________________________________________'.repeat(Math.max(1, Math.ceil(auftrag.zeilen / 2)))}</div>
            ) : answer && isRevealed(index) ? (
              <div>
                <p><strong>Erwartung:</strong> {answer.erwartung}</p>
                <p><strong>Belege:</strong> {answer.belege.join(' · ')}</p>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>(Lösung verborgen)</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
