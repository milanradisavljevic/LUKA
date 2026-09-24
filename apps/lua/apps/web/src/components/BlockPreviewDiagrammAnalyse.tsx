import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
}

export function BlockPreviewDiagrammAnalyse({ block, showSolution }: Props) {
  if (block.typ !== 'diagrammanalyse') return null;
  const byNr = new Map(block.loesung.antworten.map((a) => [a.nr, a]));
  return (
    <div style={{ display: 'grid', gap: '0.65rem' }}>
      <div style={{ fontWeight: 700 }}>{block.config.titel}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead><tr><th style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)', padding: '0.3rem' }}>Kategorie</th><th style={{ textAlign: 'right', borderBottom: '1px solid var(--color-border)', padding: '0.3rem' }}>Wert{block.config.einheit ? ` (${block.config.einheit})` : ''}</th></tr></thead>
          <tbody>{block.config.daten.map((d) => <tr key={d.label}><td style={{ padding: '0.3rem', borderBottom: '1px solid var(--color-border)' }}>{d.label}</td><td style={{ padding: '0.3rem', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>{d.wert}</td></tr>)}</tbody>
        </table>
      </div>
      {block.config.auftraege.map((a) => {
        const antwort = byNr.get(a.nr);
        return <div key={a.nr} style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: '0.6rem' }}>
          <div><strong>{a.nr}. {a.operator}:</strong> {a.frage}</div>
          {showSolution && antwort ? <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}><em>Erwartung:</em> {antwort.erwartung}<br /><em>Beleg:</em> {antwort.belege.join(' · ')}</div> : <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Antwort in ganzen Sätzen mit konkretem Datenbeleg.</div>}
        </div>;
      })}
    </div>
  );
}
