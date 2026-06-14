import { Clock } from 'lucide-react';

interface Props {
  totalPoints: number;
  blockCount: number;
  totalMinutes?: [number, number];
}

export function PointSummary({ totalPoints, blockCount, totalMinutes }: Props) {
  return (
    <div style={{
      display: 'flex', gap: '1.5rem', padding: '0.75rem 1rem',
      background: 'var(--color-bg-base)', borderRadius: 'var(--radius)',
      marginBottom: '1rem', fontSize: '0.8125rem', flexWrap: 'wrap',
    }}>
      <span>
        <strong>{blockCount}</strong> {blockCount === 1 ? 'Aufgabenblock' : 'Aufgabenblöcke'}
      </span>
      <span>
        <strong>{totalPoints}</strong> Gesamtpunkte
      </span>
      {totalMinutes && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <Clock size={13} />
          <strong>~{totalMinutes[0]}–{totalMinutes[1]}</strong> Min Bearbeitungszeit
        </span>
      )}
    </div>
  );
}
