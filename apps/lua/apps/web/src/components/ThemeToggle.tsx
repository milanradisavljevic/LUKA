import { Sun, Moon } from 'lucide-react';

interface Props {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Helles Theme aktivieren' : 'Dunkles Theme aktivieren'}
      title={theme === 'dark' ? 'Helles Theme' : 'Dunkles Theme'}
      className="btn-secondary"
      style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
