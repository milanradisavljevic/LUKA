import { Loader2 } from 'lucide-react';

interface Props {
  text?: string;
  size?: number;
}

export function LoadingSpinner({ text = 'Laden …', size = 18 }: Props) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
      <Loader2 size={size} className="spin" style={{ flexShrink: 0 }} />
      {text}
    </span>
  );
}
