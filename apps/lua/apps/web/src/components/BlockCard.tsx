import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Block, Meta } from '@lehrunterlagen/schema';
import type { AppAction } from '../lib/types';
import { Pencil, X } from 'lucide-react';
import { getBlockLabel, BLOCK_ARBEITSANWEISUNG_PLACEHOLDER } from '../lib/blockDefaults';
import { BLOCK_TYPE_DEFS } from '../lib/constants';

import { BlockConfigPanel } from './BlockConfigPanel';

interface Props {
  block: Block;
  dispatch: React.Dispatch<AppAction>;
  stufe: Meta['stufe'];
  index?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function BlockCard({ block, dispatch, stufe, index, isSelected, onSelect }: Props) {
  const typeDef = BLOCK_TYPE_DEFS.find((bt) => bt.id === block.typ);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) || (isSelected ? 'scale(1.008)' : 'scale(1)'),
    transition: transition || 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
    opacity: isDragging ? 0.5 : 1,
    padding: '1rem',
    border: isSelected
      ? '2px solid var(--color-highlight)'
      : '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    background: isSelected
      ? 'var(--color-highlight-bg)'
      : 'var(--color-bg-surface)',
    boxShadow: isSelected
      ? '0 0 0 4px var(--color-highlight-bg), 0 8px 32px var(--color-shadow), 0 2px 8px var(--color-shadow)'
      : '0 1px 3px var(--color-shadow)',
    position: 'relative',
    zIndex: isSelected ? 10 : 1,
    cursor: 'default',
  };

  const handleRemove = () => dispatch({ type: 'REMOVE_BLOCK', id: block.id });

  const handleChange = (field: string, value: unknown) => {
    dispatch({ type: 'UPDATE_BLOCK', id: block.id, block: { [field]: value } as Partial<Block> });
  };

  const handleConfigChange = (config: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_BLOCK', id: block.id, block: { config } as unknown as Partial<Block> });
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Leuchtende Akzent-Linie links bei Selektion */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 8,
          bottom: 8,
          width: 4,
          borderRadius: '0 4px 4px 0',
          background: 'var(--color-highlight)',
          boxShadow: '0 0 12px var(--color-highlight-bg), 0 0 4px var(--color-highlight-bg)',
        }} />
      )}

      {/* Ribbon-Label oben rechts bei Selektion */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: -1,
          right: 20,
          background: 'var(--color-highlight)',
          color: 'white',
          fontSize: '0.625rem',
          fontWeight: 700,
          padding: '0.15rem 0.6rem',
          borderRadius: '0 0 6px 6px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          boxShadow: '0 2px 8px var(--color-highlight-bg)',
          zIndex: 2,
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        }}>
          <Pencil size={11} /> Bearbeiten
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button {...attributes} {...listeners}
          aria-label={`Block „${getBlockLabel(block.typ)}" verschieben`}
          style={{
            cursor: 'grab', background: 'none', border: 'none', padding: '0.25rem',
            color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1,
          }}
          title="Verschieben">
          <span aria-hidden="true">⠿</span>
        </button>
        {index !== undefined && (
          <span style={{
            background: typeDef?.color ?? 'var(--color-accent)',
            color: 'white',
            padding: '0.125rem 0.5rem', borderRadius: '3px',
            fontSize: '0.75rem', fontWeight: 600,
            minWidth: 24, textAlign: 'center',
          }}>
            {index}
          </span>
        )}
        <span style={{
          background: 'var(--color-bg-selected)', color: 'var(--color-accent)',
          padding: '0.125rem 0.5rem', borderRadius: '3px',
          fontSize: '0.75rem', fontWeight: 600,
        }}>
          {getBlockLabel(block.typ)}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Markieren-Button */}
          {onSelect && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              aria-label={isSelected ? 'Bearbeiten schließen' : 'In Vorschau bearbeiten'}
              title={isSelected ? 'Bearbeiten' : 'In Vorschau bearbeiten'}
              style={{
                background: isSelected ? 'var(--color-accent)' : 'transparent',
                border: isSelected ? 'none' : '1px solid var(--color-border)',
                color: isSelected ? 'white' : 'var(--color-text-secondary)',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-highlight-bg)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-highlight)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-highlight)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
                }
              }}
            >
              <Pencil size={15} />
            </button>
          )}
          <label style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>Punkte</label>
          <input type="number" min={0} value={block.punkte}
            aria-label="Punkte für diesen Block"
            onChange={(e) => handleChange('punkte', parseInt(e.target.value) || 0)}
            style={{ width: 64, padding: '0.25rem 0.5rem' }} />
        </div>
        <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          onClick={handleRemove}
          aria-label={`Block „${getBlockLabel(block.typ)}" entfernen`}
          title="Entfernen">
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label>Arbeitsanweisung</label>
        <input type="text" value={block.arbeitsanweisung}
          placeholder={BLOCK_ARBEITSANWEISUNG_PLACEHOLDER[block.typ]}
          onChange={(e) => handleChange('arbeitsanweisung', e.target.value)} />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <label>Clue (optional, kursiv)</label>
        <input type="text" value={block.clue ?? ''}
          placeholder="Hinweis in Klammern (kursiv)"
          onChange={(e) => handleChange('clue', e.target.value || undefined)} />
      </div>

      <BlockConfigPanel block={block} stufe={stufe} onConfigChange={handleConfigChange} />
    </div>
  );
}
