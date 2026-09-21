import type { Block } from '@lehrunterlagen/schema';
import { baueWortgitter } from '@lehrunterlagen/schema';
import { getDefaultLayout, getDefaultTemplate, pruefeRaetselA4 } from '@lehrunterlagen/renderer';
import type { RenderLayout, RenderTemplate } from '@lehrunterlagen/renderer';

interface Props {
  block: Block;
  showSolution: boolean;
  solutionStep?: number;
  onUpdate?: (id: string, field: string, value: unknown) => void;
  template?: RenderTemplate;
  layout?: RenderLayout;
}

const DELTA = { waagrecht: [0, 1], senkrecht: [1, 0], diagonal: [1, 1] } as const;

export function BlockPreviewWortgitter({ block, showSolution, solutionStep, template = getDefaultTemplate(), layout = getDefaultLayout() }: Props) {
  if (block.typ !== 'wortgitter') return null;
  const gitter = baueWortgitter(block.config.woerter ?? []);

  const isRevealed = (wortIndex: number) =>
    solutionStep !== undefined ? wortIndex < solutionStep : showSolution;

  const loesungsZellen = new Set<string>();
  for (let wi = 0; wi < gitter.platzierungen.length; wi++) {
    if (!isRevealed(wi)) continue;
    const p = gitter.platzierungen[wi];
    if (!p) continue;
    const [dr, dc] = DELTA[p.richtung];
    for (let n = 0; n < p.wort.length; n++) loesungsZellen.add(`${p.zeile + dr * n},${p.spalte + dc * n}`);
  }

  const pruefung = pruefeRaetselA4(block, template, layout);
  const CELL = Math.min(24, Math.max(8, Math.floor(pruefung.zellgroesse / 15)));

  return (
    <div role="region" aria-label="Wortgitter Vorschau" style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>Arbeitsanweisung:</strong> {block.arbeitsanweisung}
      </p>
      {!pruefung.passt && (
        <p role="alert" style={{ margin: '0 0 0.75rem', padding: '0.5rem 0.625rem', border: '1px solid var(--color-warning)', color: 'var(--color-warning)', fontSize: '9pt' }}>
          <strong>Nicht A4-tauglich:</strong> {pruefung.grund}
        </p>
      )}

      {gitter.zeilen === 0 ? (
        <p style={{ fontSize: '9pt', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          (Noch keine gültigen Wörter — mindestens zwei Wörter mit ≥ 2 Buchstaben nötig.)
        </p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {gitter.belegung.map((row, r) => (
                <tr key={r}>
                  {row.map((letter, c) => {
                    const markiert = loesungsZellen.has(`${r},${c}`);
                    return (
                      <td key={c} style={{
                        width: CELL, height: CELL, border: '1px solid var(--color-border)',
                        textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt',
                        fontWeight: markiert ? 700 : 400,
                        background: markiert ? 'var(--color-border)' : '#ffffff',
                      }}>
                        {letter}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: '10pt' }}>
        <strong>Finde diese Wörter:</strong> {gitter.woerter.join('  ·  ')}
      </p>
    </div>
  );
}
