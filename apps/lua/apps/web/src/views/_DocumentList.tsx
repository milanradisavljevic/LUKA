import { Star, Trash2, X, RotateCcw, FileX, Sparkles } from 'lucide-react';
import { fachLabel } from '@lehrunterlagen/schema';
import type { SavedDocument } from '../lib/types';
const STUFE_LABEL: Record<string, string> = { oberstufe: 'Oberstufe', unterstufe: 'Unterstufe' };

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

interface Props {
  documents: SavedDocument[];
  emptyMessage?: string;
  emptyDescription?: string;
  actionLabel?: string;
  /** Klick auf „Öffnen" — lädt den Snapshot in den Wizard. */
  onOpen?: (doc: SavedDocument) => void;
  /** Favoriten-Stern umschalten. */
  onToggleFavorite?: (id: string) => void;
  /** Soft-Delete (in den Papierkorb). */
  onDelete?: (id: string) => void;
  /** Aus dem Papierkorb wiederherstellen. */
  onRestore?: (id: string) => void;
  /** Endgültig löschen. */
  onPurge?: (id: string) => void;
  /** Leerzustand-Aktion (z. B. „Neu erstellen" oder „Zu Dokumenten"). */
  onAction?: () => void;
}

export function DocumentList({
  documents,
  emptyMessage,
  emptyDescription,
  actionLabel,
  onOpen,
  onToggleFavorite,
  onDelete,
  onRestore,
  onPurge,
  onAction,
}: Props) {
  if (documents.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        color: 'var(--color-text-secondary)',
        background: 'var(--color-bg-base)',
        borderRadius: 'var(--radius)',
        border: '1px dashed var(--color-border)',
      }}>
        <FileX size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
        <p style={{ fontSize: '0.9375rem', margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {emptyMessage ?? 'Keine Einträge.'}
        </p>
        {emptyDescription && (
          <p style={{ fontSize: '0.8125rem', margin: '0 0 0.75rem', maxWidth: 420, marginInline: 'auto' }}>
            {emptyDescription}
          </p>
        )}
        {onAction && actionLabel && (
          <button
            className="btn-secondary"
            onClick={onAction}
            style={{ fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Sparkles size={14} /> {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {documents.map((doc) => {
        const meta = doc.snapshot.meta;
        const blockCount = doc.snapshot.bloecke.length;
        return (
          <div
            key={doc.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              background: 'var(--color-bg-surface)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {doc.isFavorite && (
                  <Star size={14} fill="#f5b301" color="#f5b301" aria-label="Favorit" style={{ flexShrink: 0 }} />
                )}
                <strong style={{ fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title || 'Unbenannt'}
                </strong>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                {fachLabel(meta.fach)} · {STUFE_LABEL[meta.stufe] ?? meta.stufe}
                {' · '}{blockCount} Block{blockCount !== 1 ? 'e' : ''}
                {doc.snapshot.llmProvider ? ` · ${doc.snapshot.llmProvider}` : ''}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: '0.125rem 0 0' }}>
                {doc.isDeleted && doc.deletedAt
                  ? `Gelöscht: ${formatDate(doc.deletedAt)}`
                  : `Geändert: ${formatDate(doc.updatedAt)}`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
              {onOpen && (
                <button className="btn-primary" onClick={() => onOpen(doc)}
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                  Öffnen
                </button>
              )}
              {onToggleFavorite && (
                <button className="btn-secondary" onClick={() => onToggleFavorite(doc.id)}
                  title={doc.isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                  aria-pressed={doc.isFavorite}
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.5rem' }}>
                  <Star size={16} {...(doc.isFavorite ? { fill: '#f5b301', color: '#f5b301' } : {})} />
                </button>
              )}
              {onRestore && (
                <button className="btn-secondary" onClick={() => onRestore(doc.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                  <RotateCcw size={14} /> Wiederherstellen
                </button>
              )}
              {onDelete && (
                <button className="btn-danger" onClick={() => onDelete(doc.id)}
                  title="In den Papierkorb"
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.5rem' }}>
                  <Trash2 size={16} />
                </button>
              )}
              {onPurge && (
                <button className="btn-danger" onClick={() => onPurge(doc.id)}
                  title="Endgültig löschen"
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '0.375rem 0.5rem' }}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
