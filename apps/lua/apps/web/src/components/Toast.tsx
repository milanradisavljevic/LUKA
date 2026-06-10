import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  text: string;
  kind?: 'error' | 'info';
}

interface Props {
  toast: ToastMessage | null;
  onClose: () => void;
  /** Auto-Dismiss in ms (0 = nie). Default 6000. */
  duration?: number;
}

/** Kleiner Toast unten-rechts. Wird u. a. an `setPersistErrorHandler` gekoppelt,
 *  damit stille Speicherfehler sichtbar werden (vorher nur console.error). */
export function Toast({ toast, onClose, duration = 6000 }: Props) {
  useEffect(() => {
    if (!toast || duration <= 0) return;
    const t = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(t);
  }, [toast, duration, onClose]);

  if (!toast) return null;
  const isError = (toast.kind ?? 'error') === 'error';

  return (
    <div
      role="status"
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 10000,
        display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
        maxWidth: 380, padding: '0.75rem 0.875rem',
        background: 'var(--color-bg-elevated)',
        border: `1px solid ${isError ? 'var(--color-danger, #c0392b)' : 'var(--color-border)'}`,
        borderLeft: `4px solid ${isError ? 'var(--color-danger, #c0392b)' : 'var(--color-accent)'}`,
        borderRadius: 'var(--radius)', boxShadow: 'var(--shadow, 0 4px 16px rgba(0,0,0,0.18))',
        fontSize: '0.8125rem', color: 'var(--color-text-primary)',
      }}
    >
      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1, color: isError ? 'var(--color-danger, #c0392b)' : 'var(--color-accent)' }} />
      <span style={{ flex: 1, lineHeight: 1.45 }}>{toast.text}</span>
      <button
        onClick={onClose}
        title="Schließen"
        style={{ flexShrink: 0, padding: 2, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', lineHeight: 0 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
