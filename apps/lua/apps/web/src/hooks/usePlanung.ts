import { useCallback, useEffect, useState } from 'react';
import { heuteIso, plusTage } from '../lib/lokalDatum';
import { schuljahrFuer } from '../lib/ferien';
import { schuljahrZeitraum } from '../lib/stundenMappen';
import type { FerienZeit, SchulfreiTag } from '../lib/ferien';

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export type MaterialArt = 'ablage' | 'material' | 'verweis';

export type RasterSlotRecord = {
  id: string;
  klasseId: string | null;
  klasseNameSnapshot: string;
  wochentag: number;
  startZeit: string;
  endeZeit: string;
  bezeichnung: string;
  schuljahr: number | null;
  aktiv: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StundenMaterialRecord = {
  id: string;
  einsatzId: string;
  art: MaterialArt;
  materialId: string | null;
  dateiname: string;
  ablagePfad: string | null;
  ziel: string | null;
  label: string;
  notiz: string;
  sortOrder: number;
  /** true, solange die Datei in der Ablage wirklich liegt. */
  dateiVorhanden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FerienRecord = {
  id: string;
  region: string;
  bezeichnung: string;
  von: string;
  bis: string;
  schuljahr: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PauseRecord = {
  id: string;
  bezeichnung: string;
  datum: string;
  klasseName: string;
  notiz: string;
  schuljahr: number | null;
  createdAt: string;
  updatedAt: string;
};

/** Wie `EinsatzRecord` aus `commands/einsatz.rs`, plus Planungsfelder. */
export type GeplanteStundeRecord = {
  id: string;
  materialId: string | null;
  klasseId: string | null;
  klasseNameSnapshot: string;
  titelSnapshot: string;
  status: string;
  einsatzArt: string;
  geplantAm: string | null;
  eingesetztAm: string | null;
  lernzieleSnapshot: string;
  notiz: string;
  startZeit: string | null;
  endeZeit: string | null;
  rasterId: string | null;
  anzahlMaterialien: number;
  rueckblick: { id: string; status: string; notiz: string } | null;
};

export type RasterSlotInput = {
  id?: string | null;
  klasseId?: string | null;
  klasseNameSnapshot?: string;
  wochentag: number;
  startZeit?: string;
  endeZeit?: string;
  bezeichnung?: string;
  schuljahr?: number | null;
  aktiv?: number;
};

export type MaterialInput = {
  id?: string | null;
  einsatzId: string;
  art: MaterialArt;
  materialId?: string | null;
  quellePfad?: string | null;
  ziel?: string | null;
  label?: string | null;
  notiz?: string | null;
};

export type EinsatzInput = {
  id?: string | null;
  materialId?: string | null;
  klasseId?: string | null;
  klasseNameSnapshot?: string;
  titelSnapshot?: string;
  status?: string;
  einsatzArt?: string;
  geplantAm?: string | null;
  lernzieleSnapshot?: string;
  notiz?: string;
  startZeit?: string | null;
  endeZeit?: string | null;
  rasterId?: string | null;
};

export type FerienInput = {
  id?: string | null;
  region?: string | null;
  bezeichnung: string;
  von: string;
  bis: string;
  schuljahr?: number | null;
};

export type PauseInput = {
  id?: string | null;
  bezeichnung: string;
  datum: string;
  klasseName?: string | null;
  notiz?: string | null;
  schuljahr?: number | null;
};

export type EinplanErgebnis = {
  angelegt: string[];
  /** Bereits vorhandene Stunden – damit ein zweiter Klick nicht dupliziert. */
  uebersprungen: string[];
  /** Rasterzeilen ohne Klasse, die Rust bewusst übergangen hat. */
  ohneKlasse: number;
};

/** Feiertagsdaten kommen aus der Datenbank; schuljahresübergreifend, weil eine
 *  Ferienwoche den Monatswechsel kreuzen kann. */
function alsFerien(rohdaten: FerienRecord[]): FerienEintrag[] {
  return rohdaten.map(f => ({
    id: f.id,
    bezeichnung: f.bezeichnung,
    von: f.von,
    bis: f.bis,
    region: f.region,
    schuljahr: f.schuljahr,
  }));
}

function alsPausen(rohdaten: PauseRecord[]): PauseEintrag[] {
  return rohdaten.map(p => ({
    id: p.id,
    bezeichnung: p.bezeichnung,
    datum: p.datum,
    klasseName: p.klasseName,
    notiz: p.notiz,
    schuljahr: p.schuljahr,
  }));
}

/**
 * Unterrichtsplanung: Wochenraster, geplante Stunden, Anlagen und die
 * Ferien-/Pausentage, auf denen nichts stattfindet.
 *
 *  Anders als `useEinsatz` (reiner Command-Wrapper) hält dieser Hook den Zustand
 *  selbst – ein Monatsraster braucht ihn an mehreren Stellen gleichzeitig.
 */
/** Wie FerienZeit, aber mit garantierter id – aus der Datenbank geladen. */
export type FerienEintrag = FerienZeit & { id: string };
/** Wie SchulfreiTag, aber mit garantierter id. */
export type PauseEintrag = SchulfreiTag & { id: string };

/** Hängt eine Anlage an eine Stunde - auch von außerhalb des Hooks.
 *
 *  Nötig, weil `App.tsx` die Unterlage aus dem Termin erzeugt und speichert und
 *  sie danach verknüpfen muss, ohne selbst einen `usePlanung()`-Zustand zu
 *  halten (die Planung hält ihren eigenen, und zwei davon zögen dieselbe
 *  Schuljahr-Liste doppelt).
 *
 *  `einsatzId` kommt bewusst erst hier hinein: der Aufrufer hat sie, und so kann
 *  er sie nicht versehentlich weglassen.
 */
export async function fuegeAnlageHinzuDirekt(
  einsatzId: string, meta: Omit<MaterialInput, 'einsatzId'>,
): Promise<StundenMaterialRecord | null> {
  try {
    return await invoke<StundenMaterialRecord>('material_add', {
      meta: { ...meta, einsatzId },
    });
  } catch {
    return null;
  }
}

export function usePlanung() {
  const [raster, setRaster] = useState<RasterSlotRecord[]>([]);
  const [stunden, setStunden] = useState<GeplanteStundeRecord[]>([]);
  const [ferien, setFerien] = useState<FerienEintrag[]>([]);
  const [pausen, setPausen] = useState<PauseEintrag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Beginnjahr des betrachteten Schuljahres: 2026 = 2026/27. */
  const [schuljahr, setSchuljahr] = useState<number>(() => schuljahrFuer(heuteIso()));

  /** Lädt das ganze Schuljahr auf einmal. Für eine Lehrkraft sind das rund 200
   *  Zeilen – damit springt das Blättern zwischen Woche und Monat ohne Wartezeit
   *  und „Nächste Stunden“ bleibt über das ganze Jahr korrekt. */
  const refresh = useCallback(async (zielJahr?: number) => {
    const jahr = zielJahr ?? schuljahr;
    setLoading(true);
    setError(null);
    try {
      const zeitraum = schuljahrZeitraum(jahr);
      const rand = plusTage(zeitraum.von, -14);
      const ende = plusTage(zeitraum.bis, 14);
      const [slots, stundenListe, ferienListe, pausenListe] = await Promise.all([
        invoke<RasterSlotRecord[]>('raster_list', { klasseId: null }),
        invoke<GeplanteStundeRecord[]>('planung_stunden', {
          datumVon: rand, datumBis: ende, klasseId: null,
        }),
        invoke<FerienRecord[]>('ferien_list', { region: null }),
        invoke<PauseRecord[]>('pause_list', { von: null, bis: null }),
      ]);
      setRaster(slots);
      setStunden(stundenListe);
      setFerien(alsFerien(ferienListe));
      setPausen(alsPausen(pausenListe));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Ohne Tauri (Browser-Entwicklung) leere Listen statt Fehlerschirm.
      setRaster([]);
      setStunden([]);
      setFerien([]);
      setPausen([]);
    } finally {
      setLoading(false);
    }
  }, [schuljahr]);

  useEffect(() => { void refresh(); }, [refresh]);

  /** Schuljahr wechseln: erst merken, dann passend nachladen. */
  const wechsleSchuljahr = useCallback((jahr: number) => {
    setSchuljahr(jahr);
    void refresh(jahr);
  }, [refresh]);

  // ── Wochenraster ────────────────────────────────────────────────────────────

  const speichereRaster = useCallback(async (slot: RasterSlotInput): Promise<boolean> => {
    setError(null);
    try {
      await invoke('raster_upsert', { meta: slot });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  const loescheRaster = useCallback(async (id: string): Promise<boolean> => {
    try {
      await invoke('raster_delete', { id });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  /** Übernimmt die Zeiten aus dem Vorjahr – die Zeiten bleiben, die Klassen
   *  ändert die Lehrkraft danach selbst. */
  const uebernehmeRaster = useCallback(async (
    vonSchuljahr: number | null, nachSchuljahr: number,
  ): Promise<number | null> => {
    setError(null);
    try {
      const anzahl = await invoke<number>('raster_uebernehmen', { vonSchuljahr, nachSchuljahr });
      await refresh();
      return anzahl;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [refresh]);

  // ── Planen ─────────────────────────────────────────────────────────────────

  const plane = useCallback(async (
    vorgaenge: Array<{ rasterId: string; datum: string }>,
  ): Promise<EinplanErgebnis | null> => {
    setError(null);
    try {
      const ergebnis = await invoke<EinplanErgebnis>('woche_einplanen', { vorgaenge });
      await refresh();
      return ergebnis;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [refresh]);

  const speichereStunde = useCallback(async (meta: EinsatzInput): Promise<GeplanteStundeRecord | null> => {
    setError(null);
    try {
      const gespeichert = await invoke<GeplanteStundeRecord>('einsatz_upsert', { meta });
      await refresh();
      return gespeichert;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [refresh]);

  const loescheStunde = useCallback(async (id: string): Promise<boolean> => {
    try {
      await invoke('einsatz_delete', { id });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  // ── Anlagen ────────────────────────────────────────────────────────────────

  const materialien = useCallback(async (einsatzId: string): Promise<StundenMaterialRecord[]> => {
    try {
      return await invoke<StundenMaterialRecord[]>('material_list', { einsatzId });
    } catch {
      return [];
    }
  }, []);

  const fuegeAnlageHinzu = useCallback(async (meta: MaterialInput): Promise<StundenMaterialRecord | null> => {
    setError(null);
    try {
      const angelegt = await invoke<StundenMaterialRecord>('material_add', { meta });
      // Stundenliste neu laden: die Anlagezahl steht direkt in der Stunde.
      await refresh();
      return angelegt;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [refresh]);

  const entferneAnlage = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Der Command liefert den Pfad im Papierkorb zurück (null bei Verweisen).
      await invoke<string | null>('material_delete', { id });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  // ── Ferien und Pausen ──────────────────────────────────────────────────────

  const speichereFerien = useCallback(async (meta: FerienInput): Promise<boolean> => {
    setError(null);
    try {
      await invoke('ferien_upsert', { meta });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  const loescheFerien = useCallback(async (id: string): Promise<boolean> => {
    try {
      await invoke('ferien_delete', { id });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  const speicherePause = useCallback(async (meta: PauseInput): Promise<boolean> => {
    setError(null);
    try {
      await invoke('pause_upsert', { meta });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  const loeschePause = useCallback(async (id: string): Promise<boolean> => {
    try {
      await invoke('pause_delete', { id });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  const ablageOrdner = useCallback(async (): Promise<string | null> => {
    try {
      return await invoke<string>('ablage_pfad');
    } catch {
      return null;
    }
  }, []);

  /** Schreibt einen ganzen Ferienblock in einem Rutsch in die Datenbank. Wird
   *  beim Bestätigen des Verordnungsvorschlags benutzt. */
  const seedFerien = useCallback(async (
    region: string, jahr: number, eintraege: Array<{ bezeichnung: string; von: string; bis: string }>,
  ): Promise<boolean> => {
    setError(null);
    try {
      await invoke('ferien_seed', {
        region,
        schuljahr: jahr,
        eintraege: eintraege.map(e => [e.bezeichnung, e.von, e.bis]),
      });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [refresh]);

  return {
    raster, stunden, ferien, pausen, schuljahr, loading, error, refresh, wechsleSchuljahr,
    speichereRaster, loescheRaster, uebernehmeRaster,
    plane, speichereStunde, loescheStunde,
    materialien, fuegeAnlageHinzu, entferneAnlage, ablageOrdner,
    speichereFerien, loescheFerien, speicherePause, loeschePause, seedFerien,
  };
}
