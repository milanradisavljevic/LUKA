import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  bordered?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  bordered = true,
}: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        color: 'var(--color-text-secondary)',
        background: bordered ? 'var(--color-bg-base)' : 'transparent',
        borderRadius: 'var(--radius)',
        border: bordered ? '1px dashed var(--color-border)' : 'none',
      }}
    >
      <Icon size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
      <p
        style={{
          fontSize: '0.9375rem',
          margin: '0 0 0.25rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            fontSize: '0.8125rem',
            margin: '0 0 0.75rem',
            maxWidth: 420,
            marginInline: 'auto',
          }}
        >
          {description}
        </p>
      )}
      {onAction && actionLabel && (
        <button
          className="btn-secondary"
          onClick={onAction}
          style={{
            fontSize: '0.8125rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <Sparkles size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}
