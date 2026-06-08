import { useState, useEffect, useCallback } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'lehrunterlagen-theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getResolvedTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? getSystemTheme() : preference;
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ThemePreference) || 'system';
    } catch {
      return 'system';
    }
  });

  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    getResolvedTheme(preference)
  );

  useEffect(() => {
    const resolved = getResolvedTheme(preference);
    setResolved(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch { /* ignore */ }
  }, [preference]);

  // System-Änderungen live überwachen
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolved(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  const toggle = useCallback(() => {
    setResolved((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      setPreference(next);
      return next;
    });
  }, []);

  return { preference, resolved, setPreference, toggle };
}
