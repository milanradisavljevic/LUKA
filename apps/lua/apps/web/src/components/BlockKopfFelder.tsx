// Kopffelder eines Aufgabenblocks: Punkte, Arbeitsanweisung, Clue, Hinweis fuer die KI.
//
// Sie lagen vorher fest in BlockCard (Baukasten). Die Vorschau braucht dieselben Felder
// neben der erzeugten Aufgabe — deshalb hierher gezogen und von beiden Orten benutzt,
// damit die beiden Bearbeitungswege nicht auseinanderlaufen.

import type { Block } from '@lehrunterlagen/schema';
import { BLOCK_ARBEITSANWEISUNG_PLACEHOLDER } from '../lib/blockDefaults';

interface Props {
  block: Block;
  onChange: (field: string, value: unknown) => void;
  /** Abstand nach unten, damit beide Aufrufer ihr Layout beibehalten koennen. */
  marginBottom?: string;
}

/** Punktefeld. Im Baukasten sitzt es in der Kopfzeile, im Panel in eigener Zeile. */
export function PunkteFeld({ block, onChange, marginBottom }: Props) {
  return (
    <>
      <div style={{ marginBottom: marginBottom ?? '0.5rem' }}>
        <label style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>Punkte</label>
        <input
          type="number"
          min={0}
          value={block.punkte}
          aria-label="Punkte für diesen Block"
          onChange={(e) => onChange('punkte', parseInt(e.target.value) || 0)}
          style={{ width: 64, padding: '0.25rem 0.5rem' }}
        />
      </div>
    </>
  );
}

/** Arbeitsanweisung, Clue und KI-Hinweis — in beiden Ansichten identisch. */
export function BlockTextfelder({ block, onChange, marginBottom }: Props) {
  return (
    <>
      <div style={{ marginBottom: marginBottom ?? '0.75rem' }}>
        <label>Arbeitsanweisung</label>
        <input
          type="text"
          value={block.arbeitsanweisung}
          placeholder={BLOCK_ARBEITSANWEISUNG_PLACEHOLDER[block.typ]}
          onChange={(e) => onChange('arbeitsanweisung', e.target.value)}
        />
      </div>

      <div style={{ marginBottom: marginBottom ?? '0.75rem' }}>
        <label>Clue (optional, kursiv)</label>
        <input
          type="text"
          value={block.clue ?? ''}
          placeholder="Hinweis in Klammern (kursiv)"
          onChange={(e) => onChange('clue', e.target.value || undefined)}
        />
      </div>

      <div style={{ marginBottom: marginBottom ?? '0.75rem' }}>
        <label>Hinweis für KI (optional)</label>
        <input
          type="text"
          value={block.hinweis ?? ''}
          placeholder="z.B. Nimm ausschließlich Wörter aus Absatz 3"
          onChange={(e) => onChange('hinweis', e.target.value || undefined)}
        />
        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
          Individuelle Vorgabe für diesen Block (z.B. Kreuzwort-Quellen)
        </span>
      </div>
    </>
  );
}
