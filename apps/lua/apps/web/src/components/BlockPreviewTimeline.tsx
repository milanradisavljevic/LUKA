import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
}

export function BlockPreviewTimeline({ block, showSolution }: Props) {
  if (block.typ !== 'timeline') return null;
  const byNr = new Map(block.config.ereignisse.map((e) => [e.nr, e]));
  const order = showSolution && block.loesung.reihenfolge.length > 0
    ? block.loesung.reihenfolge
    : block.config.ereignisse.map((e) => e.nr);
  const datierungen = new Map(block.loesung.datierungen.map((d) => [d.nr, d.datum]));
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      {block.config.zeitraum && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{block.config.zeitraum}</div>}
      {order.map((nr, index) => {
        const ereignis = byNr.get(nr);
        if (!ereignis) return null;
        return (
          <div key={`${nr}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1.5rem 1fr', gap: '0.5rem', alignItems: 'start', borderLeft: '3px solid var(--color-accent)', paddingLeft: '0.6rem' }}>
            <strong>{index + 1}.</strong>
            <div>
              <div style={{ fontWeight: 600 }}>{ereignis.titel}{showSolution && datierungen.get(nr) ? ` — ${datierungen.get(nr)}` : ''}</div>
              <div style={{ fontSize: '0.8125rem' }}>{ereignis.beschreibung}</div>
            </div>
          </div>
        );
      })}
      {!showSolution && <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Ordne die Karten zeitlich und notiere die Datierung, falls sie aus dem Quelltext hervorgeht.</div>}
    </div>
  );
}
