import type { Block } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  solutionStep?: number;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

export function BlockPreviewTabelle({ block, showSolution, solutionStep }: Props) {
  if (block.typ !== 'tabelle') return null;

  const lueckenMap = new Map<string, number>();
  let counter = 0;
  for (const zeile of block.config.zeilen ?? []) {
    for (let i = 0; i < (zeile.zellen?.length ?? 0); i++) {
      const zelle = zeile.zellen?.[i];
      if (zelle && !('text' in zelle)) {
        lueckenMap.set(`${zeile.nr},${i}`, counter++);
      }
    }
  }

  const isLueckeRevealed = (key: string) => {
    const idx = lueckenMap.get(key);
    if (idx === undefined) return false;
    return solutionStep !== undefined ? idx < solutionStep : showSolution;
  };

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
                const key = `${zeile.nr},${i}`;
                const revealed = istLuecke && isLueckeRevealed(key);
                const inhalt = 'text' in zelle
                  ? zelle.text
                  : revealed
                    ? (block.loesung.zellen[key] ?? '')
                    : '';
                const zeigeLuecke = istLuecke && !revealed;
                return (
                  <td key={i} style={{ border: '1px solid var(--color-text-muted)', padding: '0.5rem', fontStyle: istLuecke && revealed ? 'italic' : 'normal', color: istLuecke && revealed ? 'var(--color-accent)' : istLuecke ? 'var(--color-text-muted)' : '#000' }}>
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
