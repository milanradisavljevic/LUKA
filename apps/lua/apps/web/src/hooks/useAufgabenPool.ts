import { useState, useCallback, useEffect } from 'react';
import type { PoolEntry, PoolFilter, PoolEntryInput } from '../lib/pool';

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export function useAufgabenPool() {
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (filter?: PoolFilter) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<PoolEntry[]>('pool_list', { filter: filter ?? null });
      setEntries(result);
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

  const get = useCallback(async (id: string): Promise<PoolEntry | null> => {
    try {
      return await invoke<PoolEntry | null>('pool_get', { id });
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
  };
}
