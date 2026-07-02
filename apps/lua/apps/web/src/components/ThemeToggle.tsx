import { Moon, Monitor, Sun } from 'lucide-react';
import type { ThemePreference } from '../hooks/useTheme';

interface Props {
  preference: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  onToggle: () => void;
}

const LABELS: Record<ThemePreference, string> = {
  light: 'Hell',
  dark: 'Dunkel',
  system: 'System',
};

export function ThemeToggle({ preference, resolvedTheme, onToggle }: Props) {
  const label = LABELS[preference];
  const Icon = preference === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <button
      onClick={onToggle}
      aria-label={`Theme wechseln. Aktuell: ${label}`}
      title={`Theme: ${label}`}
      className="btn-secondary"
      style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon size={16} />
    </button>
  );
}
