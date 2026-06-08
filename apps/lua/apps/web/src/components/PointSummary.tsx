interface Props {
  totalPoints: number;
  blockCount: number;
}

export function PointSummary({ totalPoints, blockCount }: Props) {
  return (
    <div style={{
      display: 'flex', gap: '1.5rem', padding: '0.75rem 1rem',
      background: 'var(--color-bg-base)', borderRadius: 'var(--radius)',
      marginBottom: '1rem', fontSize: '0.8125rem',
    }}>
      <span>
        <strong>{blockCount}</strong> {blockCount === 1 ? 'Aufgabenblock' : 'Aufgabenblöcke'}
      </span>
      <span>
        <strong>{totalPoints}</strong> Gesamtpunkte
      </span>
    </div>
  );
}
