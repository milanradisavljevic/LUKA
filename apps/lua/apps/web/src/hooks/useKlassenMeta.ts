import { useState, useCallback, useEffect } from 'react';

/** Spiegelt KlasseMeta aus src-tauri/src/commands/klassen.rs (serde camelCase). */
export interface KlasseMeta {
  id?: string | null;
  name: string;
  fach?: string | null;
  stufe?: string | null;
  schulstufe?: number | null;
  schuljahr?: string | null;
  notizen?: string | null;
  archiviert: boolean;
  createdAt: string;
}

export interface KlassenLoeschvorschau {
  klasse: string;
  schueler: number;
  abgaben: number;
  materialien: number;
  briefings: number;
  quelltexte: number;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

/**
 * LUA-eigene Klassen-Metadaten (Fach/Stufe/Schuljahr) zusätzlich zu den reinen
 * Klasse-Strings, die NATASCHA in abgabe/schueler verwendet. Rein additiv —
 * eine Klasse ohne Metadaten bleibt überall nutzbar (siehe klassen.rs-Kommentar).
 */
export function useKlassenMeta() {
  const [klassen, setKlassen] = useState<KlasseMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<KlasseMeta[]>('klassen_meta_list');
      setKlassen(result);
    } catch (e) {
      // Browser-Dev-Modus ohne Tauri: leere Liste statt Fehleranzeige.
      setKlassen([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const upsert = useCallback(async (meta: KlasseMeta): Promise<boolean> => {
    setError(null);
    try {
      await invoke('klassen_meta_upsert', { meta });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  const remove = useCallback(async (name: string): Promise<boolean> => {
    setError(null);
    try {
      await invoke('klassen_meta_delete', { name });
      setKlassen((prev) => prev.filter((k) => k.name !== name));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const archive = useCallback(async (name: string, archiviert: boolean): Promise<boolean> => {
    setError(null);
    try {
      await invoke('db_klasse_archivieren', { klasse: name, archiviert });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  const deletePreview = useCallback(async (name: string): Promise<KlassenLoeschvorschau | null> => {
    setError(null);
    try {
      return await invoke<KlassenLoeschvorschau>('db_klasse_loeschvorschau', { klasse: name });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  const deleteKlasse = useCallback(async (name: string): Promise<KlassenLoeschvorschau | null> => {
    setError(null);
    try {
      const report = await invoke<KlassenLoeschvorschau>('db_klasse_loeschen', { klasse: name });
      await refresh();
      return report;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { klassen, loading, error, refresh, upsert, remove, archive, deletePreview, deleteKlasse };
}
