import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { X } from 'lucide-react';
import type { Block } from '@lehrunterlagen/schema';
import type { AppState, AppAction } from '../lib/types';
import { BLOCK_TYPE_DEFS, STUFE_RULES, SCHWIERIGKEIT_RULES } from '../lib/constants';
import { createDefaultBlock } from '../lib/blockDefaults';
import { useBlocks } from '../hooks/useBlocks';
import { BlockCard } from './BlockCard';
import { PointSummary } from './PointSummary';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

export function Step2_Baukasten({ state, dispatch }: Props) {
  const { addBlock, removeBlocksByType, reorderBlocks } = useBlocks(dispatch);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const allowedTypes = STUFE_RULES[state.meta.stufe].allowedBlockTypes;
  const availableBlocks = BLOCK_TYPE_DEFS.filter((bt) =>
    (allowedTypes as readonly string[]).includes(bt.id),
  );

  const schwierigkeit = state.meta.schwierigkeit ?? 'mittel';
  const discouragedSet = new Set<string>(SCHWIERIGKEIT_RULES[schwierigkeit].discouraged as readonly string[]);
  const schwierigkeitHinweis = SCHWIERIGKEIT_RULES[schwierigkeit].hinweis;

  const handleAddBlock = (typ: Block['typ']) => {
    const block = createDefaultBlock(typ, state.meta);
    addBlock(block);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = state.bloecke.findIndex((b) => b.id === active.id);
    const newIndex = state.bloecke.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...state.bloecke];
    const [moved] = reordered.splice(oldIndex, 1);
    if (moved) reordered.splice(newIndex, 0, moved);
    reorderBlocks(reordered);
  };

  const totalPoints = state.bloecke.reduce((sum, b) => sum + b.punkte, 0);

  // Zähle Blöcke pro Typ für die Counter-Badges
  const countByType = new Map<string, number>();
  for (const b of state.bloecke) {
    countByType.set(b.typ, (countByType.get(b.typ) ?? 0) + 1);
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.25rem' }}>Aufgabenblöcke zusammenstellen</h2>

      {/* Kartengalerie */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ marginBottom: '0.75rem', display: 'block' }}>Blocktyp hinzufügen</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {availableBlocks.map((bt) => {
            const count = countByType.get(bt.id) ?? 0;
            const hasAny = count > 0;
            const isDiscouraged = discouragedSet.has(bt.id);
            return (
              <div
                key={bt.id}
                role="button"
                tabIndex={0}
                onClick={() => handleAddBlock(bt.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAddBlock(bt.id); }
                }}
                className="btn-secondary"
                title={isDiscouraged ? schwierigkeitHinweis : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  paddingTop: hasAny ? '1.5rem' : '1rem',
                  textAlign: 'center',
                  borderLeft: `4px solid ${bt.color}`,
                  background: hasAny ? `linear-gradient(135deg, white 0%, ${bt.color}12 100%)` : 'var(--color-bg-surface)',
                  borderColor: hasAny ? bt.color : 'var(--color-border)',
                  borderWidth: hasAny ? '2px' : '1px',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  opacity: isDiscouraged ? 0.5 : 1,
                  filter: isDiscouraged ? 'grayscale(0.4)' : 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px var(--color-shadow)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                {/* Counter-Badge (links) */}
                {hasAny && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    left: -8,
                    background: `linear-gradient(135deg, ${bt.color}, ${bt.color}dd)`,
                    color: 'var(--color-bg-surface)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    minWidth: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 2px 8px ${bt.color}66`,
                    border: '2px solid white',
                    zIndex: 2,
                    animation: 'badgePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}>
                    {count}
                  </div>
                )}

                {/* X: ganzen Blocktyp entfernen (rechts) */}
                {hasAny && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeBlocksByType(bt.id); }}
                    aria-label={`Alle ${bt.label}-Blöcke entfernen`}
                    title="Alle entfernen"
                    style={{
                      position: 'absolute', top: -8, right: -8, zIndex: 3,
                      width: 24, height: 24, borderRadius: '50%', padding: 0,
                      border: '2px solid white', background: 'var(--color-bg-surface)',
                      color: 'var(--color-text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 6px var(--color-shadow)',
                    }}
                    onMouseEnter={(e) => {
                      const t = e.currentTarget;
                      t.style.background = 'var(--color-error, #e53935)';
                      t.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      const t = e.currentTarget;
                      t.style.background = 'var(--color-bg-surface)';
                      t.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    <X size={13} />
                  </button>
                )}

                <bt.Icon size={28} style={{ color: bt.color }} />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{bt.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{bt.description}</span>
                {isDiscouraged && (
                  <span style={{
                    fontSize: '0.6875rem',
                    color: 'var(--color-warning, #f59e0b)',
                    fontWeight: 600,
                    marginTop: '0.125rem',
                  }}>
                    {schwierigkeitHinweis}
                  </span>
                )}


                {/* Mini-Hinweis wenn vorhanden */}
                {hasAny && (
                  <span style={{
                    fontSize: '0.6875rem',
                    color: bt.color,
                    fontWeight: 600,
                    marginTop: '0.125rem',
                  }}>
                    {count}x im Baukasten
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <style>{`
          @keyframes badgePop {
            0% { transform: scale(0); }
            80% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>

      <PointSummary totalPoints={totalPoints} blockCount={state.bloecke.length} />

      {state.bloecke.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '3rem 0' }}>
          Noch keine Aufgabenblöcke. Wähle oben einen Blocktyp und füge ihn hinzu.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={state.bloecke.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {state.bloecke.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  dispatch={dispatch}
                  stufe={state.meta.stufe}
                  index={index + 1}
                  isSelected={selectedId === block.id}
                  onSelect={() => setSelectedId(selectedId === block.id ? null : block.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
