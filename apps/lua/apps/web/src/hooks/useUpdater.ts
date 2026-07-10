import { useCallback, useEffect, useRef, useState } from 'react';
import type { Update } from '@tauri-apps/plugin-updater';

export type UpdaterPhase = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

export interface UpdaterProgress {
  /** Bisher geladene Bytes. */
  received: number;
  /** Gesamtgröße in Bytes, falls vom Server bekannt (sonst unbestimmt). */
  total: number | null;
}

export interface UpdaterState {
  phase: UpdaterPhase;
  version: string | null;
  currentVersion: string | null;
  /** Release-Notes aus `update.body` (latest.json → `notes`), falls vorhanden. */
  body: string | null;
  progress: UpdaterProgress | null;
  /** Kurze deutsche Fehlermeldung — nur bei Fehlern WÄHREND des aktiven Downloads. */
  error: string | null;
}

const IDLE_STATE: UpdaterState = {
  phase: 'idle',
  version: null,
  currentVersion: null,
  body: null,
  progress: null,
  error: null,
};

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;
}

/**
 * State-Maschine für den Update-Dialog (siehe `components/UpdateDialog.tsx`).
 *
 * Prüft ~5s nach App-Start still auf Updates (GitHub Releases, signiert).
 * Fehler beim Check (offline, Endpoint nicht erreichbar) werden bewusst
 * verschluckt (nur console.warn) — ein fehlgeschlagener Check darf den
 * Unterricht nie stören. Fehler beim aktiven Download werden dagegen im
 * Dialog angezeigt, damit die Lehrkraft weiß, dass nichts passiert ist.
 */
export function useUpdater() {
  const [state, setState] = useState<UpdaterState>(IDLE_STATE);
  const updateRef = useRef<Update | null>(null);

  const checkNow = useCallback(async () => {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) return;
      updateRef.current = update;
      setState({
        phase: 'available',
        version: update.version,
        currentVersion: update.currentVersion,
        body: update.body ?? null,
        progress: null,
        error: null,
      });
    } catch (err) {
      // Bewusst still — siehe Docstring oben.
      console.warn('Update-Check fehlgeschlagen', err);
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const t = window.setTimeout(() => {
      void checkNow();
    }, 5000);
    return () => window.clearTimeout(t);
  }, [checkNow]);

  const install = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;

    setState((s) => ({ ...s, phase: 'downloading', progress: { received: 0, total: null }, error: null }));
    let received = 0;

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          received = 0;
          setState((s) => ({ ...s, progress: { received: 0, total: event.data.contentLength ?? null } }));
        } else if (event.event === 'Progress') {
          received += event.data.chunkLength;
          setState((s) => ({ ...s, progress: { received, total: s.progress?.total ?? null } }));
        } else if (event.event === 'Finished') {
          setState((s) => ({ ...s, phase: 'downloaded' }));
        }
      });
      // Sicherheitsnetz, falls 'Finished' aus irgendeinem Grund nicht feuert.
      setState((s) => (s.phase === 'downloading' ? { ...s, phase: 'downloaded' } : s));
    } catch (err) {
      console.warn('Update-Download fehlgeschlagen', err);
      setState((s) => ({
        ...s,
        phase: 'error',
        error: 'Download fehlgeschlagen. Bitte später erneut versuchen.',
      }));
    }
  }, []);

  const relaunchNow = useCallback(async () => {
    try {
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      console.warn('Neustart fehlgeschlagen', err);
    }
  }, []);

  const dismiss = useCallback(() => {
    setState(IDLE_STATE);
  }, []);

  return { state, install, relaunchNow, dismiss };
}

export type UseUpdaterReturn = ReturnType<typeof useUpdater>;
