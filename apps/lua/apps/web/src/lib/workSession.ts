import { useCallback, useEffect, useRef, useState } from 'react';

const flushers = new Set<() => void>();
const activities = new Set<string>();
const pendingDrafts = new Map<string, unknown>();
let draftError: string | null = null;
export function readDraft<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem('luka-draft-' + key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
export function writeDraft(key: string, value: unknown): void {
  pendingDrafts.set(key, value);
  try {
    localStorage.setItem('luka-draft-' + key, JSON.stringify(value));
    pendingDrafts.delete(key);
    if (!pendingDrafts.size) draftError = null;
  } catch {
    draftError = 'Der Entwurf konnte nicht auf diesem Gerät gesichert werden. Bitte Speicherplatz prüfen und LUKA geöffnet lassen.';
  }
  window.dispatchEvent(new Event('luka:session'));
}
export function useLocalDraft<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readDraft(key, fallback));
  const current = useRef(value);
  const change = useCallback((next: T | ((previous: T) => T)) => {
    current.current = typeof next === 'function' ? (next as (previous: T) => T)(current.current) : next;
    writeDraft(key, current.current);
    setValue(current.current);
  }, [key]);
  useEffect(() => {
    const flush = () => writeDraft(key, current.current);
    flushers.add(flush);
    return () => { flush(); flushers.delete(flush); };
  }, [key]);
  return [value, change] as const;
}
export function flushDrafts(): void {
  for (const flush of flushers) flush();
  for (const [key, value] of [...pendingDrafts]) writeDraft(key, value);
  if (draftError) throw new Error(draftError);
}
export function beginActivity(label: string): () => void {
  const id = label + ':' + crypto.randomUUID();
  activities.add(id); window.dispatchEvent(new Event('luka:session'));
  return () => { activities.delete(id); window.dispatchEvent(new Event('luka:session')); };
}
export function hasActiveWork(): boolean { return activities.size > 0; }
export function useSessionStatus() {
  const [, refresh] = useState(0);
  useEffect(() => { const fn = () => refresh(n => n + 1); window.addEventListener('luka:session', fn); return () => window.removeEventListener('luka:session', fn); }, []);
  return { busy: activities.size > 0, error: draftError };
}
