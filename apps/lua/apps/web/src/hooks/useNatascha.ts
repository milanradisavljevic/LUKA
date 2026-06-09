import { useState, useCallback } from 'react';
import { loadSettings } from '../lib/storage';
import type { KlasseInfo } from '../lib/storage';

interface AbgabeInfo {
  id: number;
  schuelerId: number | null;
  klasse: string;
  aufgabe: string;
  dateiname: string;
  vorname: string | null;
  nachname: string | null;
  note: number | null;
  gesamtstufe: number | null;
  wortanzahl: number | null;
  fach: string | null;
  schulstufe: string | null;
  textsorte: string | null;
  hatLehrerFeedback: boolean;
  noteFinal: number | null;
}

interface KriteriumRow {
  id: number;
  abgabeId: number;
  kriteriumName: string;
  stufe: number | null;
  gewichtung: number | null;
  datum: string | null;
}

interface FehlerRow {
  id: number;
  abgabeId: number;
  zitat: string | null;
  korrektur: string | null;
  typ: string;
  erklaerung: string | null;
}

interface LehrerFeedbackRow {
  id: number;
  noteFinal: number | null;
  noteAppSnapshot: number | null;
  lehrerKommentar: string | null;
  erstelltAm: string | null;
  geaendertAm: string | null;
}

interface AbgabeDetail {
  abgabe: AbgabeInfo;
  kriterien: KriteriumRow[];
  fehler: FehlerRow[];
  lehrerFeedback: LehrerFeedbackRow | null;
}

interface HeatmapEntry {
  typ: string;
  anzahl: number;
  prozent: number;
}

interface Notenverteilung {
  noten: Record<string, number>;
  durchschnitt: number | null;
}

interface KlassenStatistik {
  anzahlAbgaben: number;
  notenverteilung: Notenverteilung;
  kriterien: { name: string; durchschnitt: number; anzahl: number }[];
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

export function useNatascha() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const analyze = useCallback(async (
    filePath: string,
    klasse: string,
    aufgabe: string,
    opts?: { fach?: string; schulstufe?: string; textsorte?: string; schueler?: string; bewertungsmodus?: string },
  ) => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const settings = loadSettings();
      const result = await invoke<string>('natascha_analyze', {
        dir: settings.nataschaDir ?? '',
        python: settings.pythonCommand ?? '',
        filePath,
        klasse,
        aufgabe,
        fach: opts?.fach,
        schulstufe: opts?.schulstufe,
        textsorte: opts?.textsorte,
        schueler: opts?.schueler,
        bewertungsmodus: opts?.bewertungsmodus,
      });
      return JSON.parse(result);
    } catch (e) {
      const msg = typeof e === 'string' ? e : e instanceof Error ? e.message : 'Analyse fehlgeschlagen';
      setAnalyzeError(msg);
      return null;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const listKlassen = useCallback(async (): Promise<KlasseInfo[]> => {
    try {
      const result = await invoke<DbLoadAllResult>('db_load_all');
      return result.klassen ?? [];
    } catch {
      return [];
    }
  }, []);

  const listAufgaben = useCallback(async (klasse: string): Promise<string[]> => {
    return invoke<string[]>('db_list_aufgaben', { klasse });
  }, []);

  const getAbgaben = useCallback(async (klasse: string, aufgabe?: string): Promise<AbgabeInfo[]> => {
    return invoke<AbgabeInfo[]>('db_get_abgaben', { klasse, aufgabe: aufgabe ?? null });
  }, []);

  const getHeatmap = useCallback(async (klasse: string, aufgabe?: string): Promise<HeatmapEntry[]> => {
    return invoke<HeatmapEntry[]>('db_get_fehler_heatmap', { klasse, aufgabe: aufgabe ?? null });
  }, []);

  const getNotenverteilung = useCallback(async (klasse: string, aufgabe?: string): Promise<Notenverteilung> => {
    return invoke<Notenverteilung>('db_get_notenverteilung', { klasse, aufgabe: aufgabe ?? null });
  }, []);

  const getKlassenStatistik = useCallback(async (klasse: string, aufgabe?: string): Promise<KlassenStatistik> => {
    return invoke<KlassenStatistik>('db_get_klassen_statistik', { klasse, aufgabe: aufgabe ?? null });
  }, []);

  const generateFeedbackDocx = useCallback(async (abgabeId: number, output?: string): Promise<{ path: string; abgabe_id: number } | null> => {
    try {
      const settings = loadSettings();
      const result = await invoke<string>('natascha_feedback_docx', {
        dir: settings.nataschaDir ?? '',
        python: settings.pythonCommand ?? '',
        abgabeId,
        output: output ?? null,
      });
      return JSON.parse(result);
    } catch (e) {
      return null;
    }
  }, []);

  const generateErwartungshorizont = useCallback(async (klasse: string, aufgabe: string, provider?: string, model?: string): Promise<string | null> => {
    try {
      const settings = loadSettings();
      const result = await invoke<string>('natascha_erwartungshorizont', {
        dir: settings.nataschaDir ?? '',
        python: settings.pythonCommand ?? '',
        klasse,
        aufgabe,
        provider: provider ?? null,
        model: model ?? null,
      });
      return result;
    } catch (e) {
      return null;
    }
  }, []);

  const getAbgabeDetail = useCallback(async (abgabeId: number): Promise<AbgabeDetail | null> => {
    try {
      return await invoke<AbgabeDetail>('db_get_abgabe_detail', { abgabeId });
    } catch {
      return null;
    }
  }, []);

  const upsertLehrerFeedback = useCallback(async (
    abgabeId: number,
    klasse: string,
    aufgabe: string,
    noteFinal: number | null,
    lehrerKommentar: string | null,
    schuelerId: number | null,
  ): Promise<boolean> => {
    try {
      await invoke('db_upsert_lehrer_feedback', {
        abgabeId,
        klasse,
        aufgabe,
        noteFinal,
        lehrerKommentar,
        schuelerId,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const listSchueler = useCallback(async (klasse: string): Promise<SchuelerInfo[]> => {
    try {
      return await invoke<SchuelerInfo[]>('db_list_schueler', { klasse });
    } catch {
      return [];
    }
  }, []);

  const insertSchueler = useCallback(async (klasse: string, vorname: string, nachname: string | null): Promise<number> => {
    return invoke<number>('db_insert_schueler', { klasse, vorname, nachname });
  }, []);

  // --- Welle 4: Setup (Klasse/Aufgabe/Rubrik via Sidecar) ---
  const addKlasse = useCallback(async (name: string): Promise<void> => {
    const s = loadSettings();
    await invoke('natascha_add_klasse', { dir: s.nataschaDir ?? '', python: s.pythonCommand ?? '', name });
  }, []);

  const addAufgabe = useCallback(async (
    klasse: string, label: string,
    opts?: { fach?: string; schulstufe?: string; textsorte?: string; rubric?: string },
  ): Promise<{ klasse: string; aufgabe: string; rubric: string }> => {
    const s = loadSettings();
    const result = await invoke<string>('natascha_add_aufgabe', {
      dir: s.nataschaDir ?? '', python: s.pythonCommand ?? '',
      klasse, label, fach: opts?.fach, schulstufe: opts?.schulstufe, textsorte: opts?.textsorte, rubric: opts?.rubric,
    });
    return JSON.parse(result);
  }, []);

  const listRubrics = useCallback(async (fach?: string, schulstufe?: string): Promise<string[]> => {
    const s = loadSettings();
    try {
      const result = await invoke<string>('natascha_list_rubrics', {
        dir: s.nataschaDir ?? '', python: s.pythonCommand ?? '', fach, schulstufe,
      });
      return JSON.parse(result);
    } catch { return []; }
  }, []);

  const deleteSchueler = useCallback(async (schuelerId: number): Promise<void> => {
    await invoke('db_delete_schueler', { schuelerId });
  }, []);

  const getSchuelerLaengsschnitt = useCallback(async (schuelerId: number): Promise<SchuelerLaengsschnitt | null> => {
    try {
      return await invoke<SchuelerLaengsschnitt>('db_get_schueler_laengsschnitt', { schuelerId });
    } catch {
      return null;
    }
  }, []);

  const getKlassenTrend = useCallback(async (klasse: string): Promise<TrendPoint[]> => {
    try {
      return await invoke<TrendPoint[]>('db_get_klassen_trend', { klasse });
    } catch {
      return [];
    }
  }, []);

  const getKlassenKalibrierung = useCallback(async (klasse: string, aufgabe?: string): Promise<KalibrierungResult | null> => {
    try {
      return await invoke<KalibrierungResult>('db_get_klassen_kalibrierung', { klasse, aufgabe: aufgabe ?? null });
    } catch {
      return null;
    }
  }, []);

  const getFehlerDetail = useCallback(async (klasse: string, typ: string, aufgabe?: string, limit?: number): Promise<FehlerDetailRow[]> => {
    try {
      return await invoke<FehlerDetailRow[]>('db_get_fehler_detail', { klasse, typ, aufgabe: aufgabe ?? null, limit: limit ?? null });
    } catch {
      return [];
    }
  }, []);

  const exportNotenCsv = useCallback(async (klasse: string, aufgabe?: string): Promise<string | null> => {
    try {
      return await invoke<string>('db_export_noten_csv', { klasse, aufgabe: aufgabe ?? null });
    } catch {
      return null;
    }
  }, []);

  return {
    analyzing,
    analyzeError,
    analyze,
    listKlassen,
    listAufgaben,
    getAbgaben,
    getHeatmap,
    getNotenverteilung,
    getKlassenStatistik,
    generateFeedbackDocx,
    generateErwartungshorizont,
    getAbgabeDetail,
    upsertLehrerFeedback,
    listSchueler,
    insertSchueler,
    deleteSchueler,
    addKlasse,
    addAufgabe,
    listRubrics,
    getSchuelerLaengsschnitt,
    getKlassenTrend,
    getKlassenKalibrierung,
    getFehlerDetail,
    exportNotenCsv,
  };
}

interface DbLoadAllResult {
  documents: unknown[];
  history: unknown[];
  settings: unknown;
  templates: unknown[];
  klassen: KlasseInfo[];
  dbPath: string;
}

interface SchuelerInfo {
  id: number;
  klasse: string;
  vorname: string;
  nachname: string | null;
  createdAt: string | null;
}

interface LaengsschnittEintrag {
  abgabeId: number;
  aufgabe: string;
  datum: string | null;
  noteApp: number | null;
  noteLehrer: number | null;
  kriterien: Record<string, number | null>;
  k1: number | null;
  k3: number | null;
}

interface TrendEintrag {
  start: number | null;
  ende: number | null;
  richtung: string;
}

interface Fehlerschwerpunkt {
  typ: string;
  label: string;
  anzahl: number;
  beispiele: { zitat: string | null; korrektur: string | null }[];
}

interface Kalibrierung {
  paare: number;
  mittlereAbweichung: number | null;
  tendenz: string;
}

interface SchuelerLaengsschnitt {
  schueler: SchuelerInfo;
  anzahlAbgaben: number;
  verlauf: LaengsschnittEintrag[];
  trend: Record<string, TrendEintrag>;
  fehlerschwerpunkte: Fehlerschwerpunkt[];
  kalibrierung: Kalibrierung;
}

interface TrendPoint {
  aufgabe: string;
  datum: string | null;
  n: number;
  avgNoteApp: number | null;
  avgNoteLehrer: number | null;
  nMitFeedback: number;
}

interface KalibrierungResult {
  appAvg: number | null;
  lehrerAvg: number | null;
  diff: number | null;
  nMitFeedback: number;
  nGesamt: number;
  tendenz: string;
}

interface FehlerDetailRow {
  zitat: string | null;
  korrektur: string | null;
  erklaerung: string | null;
  vorname: string | null;
  dateiname: string;
}