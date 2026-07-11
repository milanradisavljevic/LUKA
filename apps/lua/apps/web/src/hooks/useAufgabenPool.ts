import { useState, useCallback, useEffect } from 'react';
import type { PoolEntry, PoolFilter, PoolEntryInput, PoolQualityStatus, PoolRecord } from '../lib/pool';
import { loadTeacherProfile, sortPoolByProfileSubjects } from '../lib/profile';

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export function useAufgabenPool() {
  const [entries, setEntries] = useState<PoolRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (filter?: PoolFilter) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<PoolRecord[]>('pool_list', { filter: filter ?? null });
      const profile = await loadTeacherProfile();
      setEntries(sortPoolByProfileSubjects(result, profile?.faecher ?? []));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (input: PoolEntryInput): Promise<boolean> => {
    setError(null);
    try {
      const entry: PoolEntry = {
        id: input.id,
        fach: input.fach,
        stufe: input.stufe,
        schulstufe: input.schulstufe,
        thema: input.thema,
        aufgabentyp: input.aufgabentyp,
        tags: input.tags,
        blockJson: JSON.stringify(input.block),
        quelleHinweis: input.quelleHinweis,
        createdAt: new Date().toISOString(),
      };
      await invoke('pool_add', { entry });
      await refresh();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return false;
    }
  }, [refresh]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const success = await invoke<boolean>('pool_delete', { id });
      if (success) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
      return success;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return false;
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string, isFavorite: boolean): Promise<boolean> => {
    setError(null);
    try {
      const success = await invoke<boolean>('pool_toggle_favorite', { id, isFavorite });
      if (success) setEntries((prev) => prev.map((entry) => entry.id === id ? { ...entry, isFavorite } : entry));
      return success;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return false;
    }
  }, []);

  const setQualityStatus = useCallback(async (id: string, qualityStatus: PoolQualityStatus): Promise<boolean> => {
    setError(null);
    try {
      const success = await invoke<boolean>('pool_set_quality_status', { id, qualityStatus });
      if (success) setEntries((prev) => prev.map((entry) => entry.id === id ? { ...entry, qualityStatus } : entry));
      return success;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return false;
    }
  }, []);

  const markUsed = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      const lastUsedAt = await invoke<string | null>('pool_mark_used', { id });
      if (lastUsedAt) setEntries((prev) => prev.map((entry) => entry.id === id ? { ...entry, lastUsedAt } : entry));
      return Boolean(lastUsedAt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return false;
    }
  }, []);

  const get = useCallback(async (id: string): Promise<PoolRecord | null> => {
    try {
      return await invoke<PoolRecord | null>('pool_get', { id });
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    entries,
    loading,
    error,
    refresh,
    add,
    remove,
    get,
    toggleFavorite,
    setQualityStatus,
    markUsed,
  };
}
