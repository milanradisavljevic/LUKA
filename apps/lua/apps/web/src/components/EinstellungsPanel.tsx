// Einstellungs-Panel fuer die Vorschau (Schritt 4).
//
// Warum es das gibt: Nach der Erstellung liegen Anforderung (Baukasten, Schritt 2) und
// Ergebnis (Dokument) getrennt vor. Wer an einer Aufgabe etwas aendern will, musste zwei
// Schritte zurueck — und dort die Platzhalter statt der fertigen Aufgabe sehen. Dieses
// Panel steht neben dem Blatt: Aufgabe links im Papier, ihre Einstellungen rechts.
//
// Es bearbeitet ausschliesslich das ERGEBNIS (UPDATE_GENERIERTER_BLOCK) und spiegelt die
// Felder zurueck, die das Modell bei einer Neugenerierung wiederbekommt. Der Inhalt der
// Aufgabe selbst wird bewusst NICHT hier editiert — dafuer ist die Bearbeitung direkt im
// Papier da (BlockPreview onUpdate), sonst gabe es zwei Editoren fuer dieselben Felder.

import { Settings2, X, AlertTriangle } from 'lucide-react';
import type { Block, Meta } from '@lehrunterlagen/schema';
import { getBlockLabel } from '../lib/blockDefaults';
import { NUR_ERGEBNIS_FELDER } from '../lib/einstellungenSpiegeln';
import { BlockConfigPanel } from './BlockConfigPanel';
import { PunkteFeld, BlockTextfelder } from './BlockKopfFelder';

interface Props {
  block: Block;
  stufe: Meta['stufe'];
  onChange: (field: string, value: unknown) => void;
  onConfigChange: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

/** Typen, bei denen nach der Erstellung nur noch der Inhalt selbst interessiert. */
const OHNE_ERGEBNIS_EINSTELLUNGEN = new Set(['lueckentext', 'offeneSchreibaufgabe']);

export function EinstellungsPanel({ block, stufe, onChange, onConfigChange, onClose }: Props) {
  const ohneFelder = OHNE_ERGEBNIS_EINSTELLUNGEN.has(block.typ);

  return (
    <div style={{ fontSize: '0.8125rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Settings2 size={15} style={{ marginTop: '0.15rem', flexShrink: 0, color: 'var(--color-accent)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: '0.875rem', display: 'block' }}>{getBlockLabel(block.typ)}</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Einstellungen der erzeugten Aufgabe
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Einstellungen schließen"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'var(--color-text-secondary)' }}
        >
          <X size={15} />
        </button>
      </div>

      {ohneFelder ? (
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
          Bei dieser Aufgabenart steckt alles im erzeugten Text selbst. Den bearbeitest du
          direkt im Blatt — auf die Aufgabe klicken, dann lassen sich Fragen, Lücken und
          Optionen ändern. Zähler wie „Anzahl Lücken“ wirken nur vor der Erstellung.
        </p>
      ) : (
        <>
          <PunkteFeld block={block} onChange={onChange} />
          <BlockTextfelder block={block} onChange={onChange} />
          <BlockConfigPanel block={block} stufe={stufe} onConfigChange={onConfigChange} ansicht="ergebnis" />
        </>
      )}

      <p
        style={{
          marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)',
          fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.6,
          display: 'flex', gap: '0.375rem', alignItems: 'flex-start',
        }}
      >
        <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <span>
          {NUR_ERGEBNIS_FELDER.join(' und ').replace('arbeitsanweisung', 'Arbeitsanweisung').replace('clue', 'Clue')}
          {' '}gelten nur für dieses Dokument. Punkte und der KI-Hinweis werden übernommen, wenn du
          die Unterlage später neu erstellst.
        </span>
      </p>
    </div>
  );
}
