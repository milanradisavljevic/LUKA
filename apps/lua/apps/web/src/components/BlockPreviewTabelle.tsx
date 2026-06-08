import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewTabelle({ block, showSolution }: Props) {
  if (block.typ !== 'tabelle') return null;

  return (
    <div
      role="region"
      aria-label="Tabelle Vorschau"
      style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}
    >
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>

      <table
        role="table"
        aria-label="Ausfüll-Tabelle"
        style={{ width: '100%', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr>
            {block.config.spalten.map((s, i) => (
              <th key={i} style={{ border: '1px solid var(--color-text-muted)', padding: '0.5rem', background: 'var(--color-bg-hover)', textAlign: 'left', width: `${s.breiteProzent}%` }}>
                {s.titel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.config.zeilen.map((zeile) => (
            <tr key={zeile.nr}>
              {zeile.zellen.map((zelle, i) => {
                const istLuecke = !('text' in zelle);
                const inhalt = 'text' in zelle
                  ? zelle.text
                  : showSolution
                    ? (block.loesung.zellen[`${zeile.nr},${i}`] ?? '')
                    : '';
                const zeigeLuecke = istLuecke && !showSolution;
                return (
                  <td key={i} style={{ border: '1px solid var(--color-text-muted)', padding: '0.5rem', fontStyle: istLuecke && showSolution ? 'italic' : 'normal', color: istLuecke && showSolution ? 'var(--color-accent)' : istLuecke ? 'var(--color-text-muted)' : '#000' }}>
                    {zeigeLuecke ? '________' : (inhalt || (istLuecke ? '—' : ''))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
