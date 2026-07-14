import { useCallback, useState } from 'react';
import type {
  EinsatzArt,
  EinsatzRecord,
  EinsatzStatus,
  RueckblickStatus,
} from '../lib/einsatz';

export type { EinsatzArt, EinsatzRecord, EinsatzStatus, RueckblickStatus } from '../lib/einsatz';
export type { EinsatzRueckblick } from '../lib/einsatz';

export interface EinsatzMetaInput {
  id?: string | null;
  materialId?: string | null;
  klasseId?: string | null;
  klasseNameSnapshot?: string;
  titelSnapshot?: string;
  status?: EinsatzStatus;
  einsatzArt?: EinsatzArt;
  geplantAm?: string | null;
  eingesetztAm?: string | null;
  lernzieleSnapshot?: string;
  notiz?: string;
}

export interface EinsatzFilter {
  klasseId?: string;
  materialId?: string;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export function useEinsatz() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (filter?: EinsatzFilter): Promise<EinsatzRecord[]> => {
    setLoading(true);
    setError(null);
    try {
      return await invoke<EinsatzRecord[]>('einsatz_list', { filter: filter ?? null });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const upsert = useCallback(async (meta: EinsatzMetaInput): Promise<EinsatzRecord | null> => {
    setError(null);
    try {
      return await invoke<EinsatzRecord>('einsatz_upsert', { meta });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    try {
      await invoke('einsatz_delete', { id });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const upsertRueckblick = useCallback(async (
    einsatzId: string,
    status: RueckblickStatus,
    notiz: string,
  ): Promise<boolean> => {
    setError(null);
    try {
      await invoke('rueckblick_upsert', { einsatzId, status, notiz });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  return { loading, error, list, upsert, remove, upsertRueckblick };
}
