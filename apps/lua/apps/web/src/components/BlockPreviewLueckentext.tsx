import type { Block } from '@lehrunterlagen/schema';
import { shuffle } from '@lehrunterlagen/schema';

interface Props {
  block: Block;
  showSolution: boolean;
  solutionStep?: number;
  onUpdate?: (id: string, field: string, value: unknown) => void;
}

/** Cloze-Text in Segmente zerlegen: Fließtext + Lücken-Marker "(1)" (ggf. mit
 *  bereits enthaltenen Unterstrichen, die der Marker-Match schluckt). Spiegelbildlich
 *  zum DOCX-Renderer (buildLueckentext): Mit Text wird NUR der Cloze-Text gezeigt,
 *  ohne Text fallen die nummerierten Lückenzeilen als Fallback zurück. */
interface ClozeSeg {
  text?: string;
  nr?: number;
}

const LUECKE_RE = /\((\d+)\)(?:\s*_{2,})?/g;

export function parseCloze(text: string): ClozeSeg[] {
  const segs: ClozeSeg[] = [];
  let last = 0;
  for (const m of text.matchAll(LUECKE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) segs.push({ text: text.slice(last, idx) });
    segs.push({ nr: Number(m[1]) });
    last = idx + m[0].length;
  }
  if (last < text.length) segs.push({ text: text.slice(last) });
  return segs;
}

export function BlockPreviewLueckentext({ block, showSolution, solutionStep, onUpdate }: Props) {
  if (block.typ !== 'lueckentext') return null;
  const config = block.config;
  const loesung = block.loesung;
  const anzahl = config.anzahlLuecken ?? 0;
  const wortbank = config.wortbank ?? false;
  const luecken = loesung.luecken ?? [];

  const isRevealed = (index: number) =>
    solutionStep !== undefined ? index < solutionStep : showSolution;

  const wortFuer = (nr: number) => luecken.find((l: { nr: number; wort: string }) => l.nr === nr)?.wort;

  // Wortbank wie im DOCX-Export: Lösungswörter (+ Distraktoren-Liste), seed-stabil
  // gemischt mit seed = block.id — vorher stand sie hier wie gedruckt in der
  // Lückenreihenfolge (Bug-Report v1.5.0 „durcheinander anführen"). Die Bank ist
  // Lösungshilfe und gehört sichtbar aufs Blatt (deckungsgleich mit dem Druck);
  // die Reveal-Logik gilt weiterhin nur für die Lücken im Text.
  const bankWoerter = wortbank
    ? shuffle(
        [...luecken.map((l: { nr: number; wort: string }) => l.wort), ...(config.distraktorWoerter ?? [])],
        block.id,
      )
    : [];

  // Cloze-Text vorhanden → Inline-Darstellung (wie im Export), nicht die nackten
  // Lückenzeilen. Reveal funktioniert pro Lücke (Tafel-Modus „Lösung 2/5").
  const clozeSegs = block.text ? parseCloze(block.text) : null;

  return (
    <div style={{ fontFamily: 'var(--font)', fontSize: '11pt', lineHeight: 1.6 }}>
      <p style={{ marginBottom: '0.5rem' }}>
        <strong>Arbeitsanweisung:</strong>{' '}
        {onUpdate ? (
          <EditableText value={block.arbeitsanweisung}
            onChange={(v) => onUpdate(block.id, 'arbeitsanweisung', v)} />
        ) : block.arbeitsanweisung}
      </p>

      {block.clue && (
        <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
          ({block.clue})
        </p>
      )}

      {clozeSegs ? (
        <div style={{ whiteSpace: 'pre-wrap', margin: '1rem 0' }}>
          {clozeSegs.map((seg, i) =>
            seg.nr !== undefined ? (
              isRevealed(seg.nr - 1) ? (
                <span key={i} style={{ fontStyle: 'italic', fontWeight: 600 }}>
                  {' '}{wortFuer(seg.nr) ?? '______'}{' '}
                </span>
              ) : (
                <span key={i} style={{ textDecoration: 'underline', paddingLeft: '0.25rem', paddingRight: '0.25rem', minWidth: 80, display: 'inline-block' }}>
                  &nbsp;______&nbsp;
                </span>
              )
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>
      ) : (
        <div style={{ margin: '1rem 0' }}>
          {Array.from({ length: anzahl }, (_, i) => (
            <span key={i} style={{ display: 'inline-block', marginRight: '1.5rem', marginBottom: '0.5rem' }}>
              ({i + 1}){' '}
              {isRevealed(i) ? (
                <span style={{ fontStyle: 'italic', paddingLeft: '0.25rem' }}>
                  {wortFuer(i + 1) ?? '______'}
                </span>
              ) : (
                <span style={{ textDecoration: 'underline', paddingLeft: '0.25rem', minWidth: 80, display: 'inline-block' }}>
                  &nbsp;{'______'}&nbsp;
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {wortbank && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 4 }}>
          <strong style={{ fontSize: '10pt' }}>Wortbank:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', fontSize: '10pt' }}>
            {bankWoerter.map((w, i) => (
              <span key={`${i}-${w}`} style={{
                padding: '0.125rem 0.5rem', border: '1px solid var(--color-border)',
                borderRadius: 3,
              }}>
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableText({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontFamily: 'inherit', fontSize: 'inherit', border: '1px dashed var(--color-border)',
        background: 'transparent', width: 'auto', minWidth: 200, padding: '0.125rem 0.25rem',
      }} />
  );
}
