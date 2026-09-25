import { useCallback, useEffect, useRef, useState } from 'react';
import type { Update } from '@tauri-apps/plugin-updater';
import { flushPersistence } from '../lib/storage';
import { flushDrafts, hasActiveWork } from '../lib/workSession';

export type UpdaterPhase = 'idle' | 'checking' | 'available' | 'uptodate' | 'downloading' | 'ready' | 'installing' | 'installed' | 'verified' | 'error';
export interface UpdaterState { phase: UpdaterPhase; version: string | null; currentVersion: string | null; body: string | null; progress: { received: number; total: number | null } | null; error: string | null; /** Update gefunden — überlebt dismiss(), steuert den Hinweispunkt am Sidebar-Button. */ notified: boolean; }
const IDLE: UpdaterState = { phase:'idle', version:null, currentVersion:null, body:null, progress:null, error:null, notified:false };
const PENDING = 'luka-update-pending';
const LATER = 'luka-update-later';
export function useUpdater() {
  const [state,setState] = useState<UpdaterState>(IDLE);
  const updateRef = useRef<Update | null>(null);
  const busy = useRef(false);
  const manualBusy = useRef(false);
  // Einzige Prüf-Logik — Start-Effekt (auto) und Sidebar-Button (manual) teilen sie.
  // manual=true: ignoriert die 24h-Sperre, quittiert jedes Ergebnis als Phase.
  const runCheck = useCallback(async (manual: boolean, shouldAbort?: () => boolean) => {
    if (!(window as any).__TAURI_INTERNALS__) { if (manual) setState(IDLE); return; }
    try {
      const { getVersion } = await import('@tauri-apps/api/app');
      const current = await getVersion();
      if (shouldAbort?.()) return;
      const pending = localStorage.getItem(PENDING);
      if (pending) {
        localStorage.removeItem(PENDING);
        setState({ ...IDLE, phase:pending === current ? 'verified' : 'error', currentVersion:current, version:pending,
          error:pending === current ? null : 'Das Update wurde nicht abgeschlossen. LUKA läuft weiterhin mit Version ' + current + '. Bitte die reguläre Installation prüfen und das Update erneut laden.' });
        return;
      }
      if (manual) localStorage.removeItem(LATER);
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check({ timeout:30000 });
      if (shouldAbort?.()) { await update?.close(); return; }
      if (!update) {
        // Manuell geprüft, kein Befund: kurze „aktuell"-Quittierung, Sperre/Punkt zurücksetzen.
        if (manual) setState(s => s.phase === 'checking' ? { ...IDLE, phase:'uptodate', currentVersion:current } : { ...s, notified:false });
        return;
      }
      const later = JSON.parse(localStorage.getItem(LATER) || 'null');
      if (!manual && later?.version === update.version && later.until > Date.now()) { await update.close(); return; }
      updateRef.current = update;
      setState({ ...IDLE, notified:true, phase:'available', version:update.version, currentVersion:update.currentVersion, body:update.body ?? null });
    } catch {
      // Automatische Prüfung darf offline nicht unterbrechen; manuelle stumm auf idle.
      if (manual) setState(s => s.phase === 'checking' ? { ...IDLE, notified:s.notified } : s);
    }
  },[]);
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => void runCheck(false, () => cancelled), 5000);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [runCheck]);
  // „LUKA ist auf dem neuesten Stand" nach ~4 s wieder ausblenden.
  useEffect(() => {
    if (state.phase !== 'uptodate') return;
    const t = window.setTimeout(() => setState(s => s.phase === 'uptodate' ? { ...s, phase:'idle' } : s), 4000);
    return () => window.clearTimeout(t);
  }, [state.phase]);
  const checkNow = useCallback(async () => {
    if (manualBusy.current) return;
    manualBusy.current = true;
    try {
      setState(s => ({ ...s, phase:'checking', error:null }));
      await runCheck(true);
    } finally { manualBusy.current = false; }
  }, [runCheck]);
  const download = useCallback(async () => {
    if (!updateRef.current || busy.current) return;
    busy.current = true;
    setState(s => ({...s,phase:'downloading',error:null,progress:{received:0,total:null}}));
    let received=0;
    try {
      await updateRef.current.download(event => {
        if(event.event === 'Started') { received=0; setState(s=>({...s,progress:{received:0,total:event.data.contentLength ?? null}})); }
        if(event.event === 'Progress') { received+=event.data.chunkLength; setState(s=>({...s,progress:{received,total:s.progress?.total ?? null}})); }
        // Finished bestätigt nur den Download, niemals die Installation.
      });
      setState(s=>({...s,phase:'ready'}));
    } catch { setState(s=>({...s,phase:'error',error:'Das Update konnte nicht heruntergeladen oder geprüft werden. Bitte erneut versuchen.'})); }
    finally { busy.current=false; }
  }, []);
  const install = useCallback(async () => {
    if (!updateRef.current || busy.current) return;
    if (hasActiveWork()) { setState(s=>({...s,error:'Bitte zuerst den laufenden Auftrag abschließen oder abbrechen.'})); return; }
    busy.current=true;
    try {
      flushDrafts(); await flushPersistence();
      localStorage.setItem(PENDING,updateRef.current.version);
      setState(s=>({...s,phase:'installing',error:null,notified:false}));
      await updateRef.current.install();
      // NSIS auf Windows kann die laufende EXE nicht ersetzen.
      // install() startet den NSIS-Updater im Hintergrund.
      // Die App MUSS sofort exiten, damit der Updater die Dateien ersetzen kann.
      const { exit } = await import('@tauri-apps/plugin-process');
      await exit(0);
    } catch(e) {
      localStorage.removeItem(PENDING);
      setState(s=>({...s,phase:'ready',error:e instanceof Error ? e.message : 'Installation fehlgeschlagen. Bitte erneut versuchen.'}));
    } finally { busy.current=false; }
  }, []);
  const relaunchNow = useCallback(async () => {
    try { if(hasActiveWork()) throw new Error('Bitte zuerst den laufenden Auftrag beenden.'); flushDrafts(); await flushPersistence(); const { relaunch }=await import('@tauri-apps/plugin-process'); await relaunch(); }
    catch(e) { setState(s=>({...s,error:e instanceof Error ? e.message : 'Neustart fehlgeschlagen. Bitte LUKA manuell neu öffnen.'})); }
  }, []);
  const retry = useCallback(async () => {
    try { if(hasActiveWork()) throw new Error('Bitte zuerst den laufenden Auftrag beenden.'); flushDrafts(); await flushPersistence(); window.location.reload(); }
    catch(e) { setState(s=>({...s,error:e instanceof Error ? e.message : 'Erneutes Prüfen fehlgeschlagen.'})); }
  }, []);
  const dismiss = useCallback(() => {
    if(busy.current) return;
    if(state.phase==='available' && state.version) localStorage.setItem(LATER,JSON.stringify({version:state.version,until:Date.now()+86400000}));
    setState(s=>({...IDLE,notified:s.notified}));
  },[state.phase,state.version]);
  return {state,download,install,relaunchNow,dismiss,retry,checkNow};
}
export type UseUpdaterReturn = ReturnType<typeof useUpdater>;
