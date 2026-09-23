import { useLocalDraft, beginActivity } from '../lib/workSession';
import { uniqueTextAnchor } from '../lib/textAnchors';
import { correctionRuntime, MODEL_MAP } from '../lib/runtimeModel';
import { LLM_PROVIDERS, PROVIDER_KEY_IDS } from '../lib/constants';
import { SRDP_DEUTSCH_TEXTSORTEN } from '@lehrunterlagen/schema';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GraduationCap, Save, AlertTriangle, Loader2, Upload, FolderOpen, FileDown, ChevronRight, Eye, EyeOff, Files, XCircle, CheckCircle2, ShieldCheck, RefreshCw, Check, X, Pencil, Undo2 } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { loadDocuments, loadSettings, subscribeSettings } from '../lib/storage';
import { useNatascha, type PersonenVorschau, type RubrikListe, type SchuelerInfo, type KorrekturKontext } from '../hooks/useNatascha';
import { useEinsatz, type EinsatzRecord } from '../hooks/useEinsatz';
import { useKlassenMeta } from '../hooks/useKlassenMeta';
import { einsatzAnzeigeDatum, formatEinsatzDatum } from '../lib/einsatz';
import { ViewShell } from './_ViewShell';
import { anzeigeName } from '../lib/anzeigeName';
import { gruppiereRubriken, rubrikLabel } from '../lib/rubrikAuswahl';
import { InfoDot } from '../components/ui/InfoDot';
import { isKorrekturReady, type KorrekturStatus } from '../lib/korrekturStatus';
import { averageVertrauensstufe, VERTRAUENS_COLORS, VERTRAUENS_LABELS } from '../lib/vertrauensstufe';

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

interface FehlerRow { id: number; zitat: string | null; korrektur: string | null; typ: string; erklaerung: string | null; vertrauensstufe: string | null; lehrkraftAktion: string | null; lehrkraftKorrektur: string | null }

interface AbgabeDetail {
  abgabe: {
    id: number;
    schuelerId: number | null;
    unterrichtseinsatzId: string | null;
    materialId: string | null;
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
    rohtext: string | null;
  };
  kriterien: { id: number; kriteriumName: string; stufe: number | null; gewichtung: number | null }[];
  fehler: FehlerRow[];
  lehrerFeedback: { id: number; noteFinal: number | null; noteAppSnapshot: number | null; lehrerKommentar: string | null; erstelltAm: string | null; geaendertAm: string | null } | null;
}

interface KlasseInfo { klasse: string; anzahlAbgaben: number; }

interface AnalyseKlasseOption {
  name: string;
  label: string;
  fach: string;
  schulstufe: string;
}

function isVisionPath(path: string): boolean {
  return /\.(pdf|jpe?g|png)$/i.test(path);
}

// Nur Leerraum kanonisieren — Groß-/Kleinschreibung bleibt erhalten!
// Kleinschreiben würde neue Abgaben ("7a") neben Bestandsdaten ("7A") legen
// und Heatmap/Roster/Auswertungen in Parallelwelten spalten. Toleranz beim
// Nachschlagen übernimmt die DB-Seite (COLLATE NOCASE im Roster-Lookup).
function normalizeKlasse(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function analyseHinweise(result: unknown): string[] {
  if (!result || typeof result !== 'object') return [];
  const errors = (result as { errors?: unknown }).errors;
  return Array.isArray(errors) ? errors.filter((entry): entry is string => typeof entry === 'string') : [];
}

const FEHLER_COLORS: Record<string, string> = { R: '#e74c3c', G: '#27ae60', Z: '#3498db', A: '#f39c12' };
const FEHLER_LABELS: Record<string, string> = { R: 'Rechtschreibung', G: 'Grammatik', Z: 'Zeichensetzung', A: 'Ausdruck' };

/** Annotiert rohtext: findet jedes fehler.zitat und wraps es in ein farbiges <mark>.
 *  Verworfene Fehler werden grau/durchgestrichen, geaenderte hervorgehoben. */
function annotateText(
  text: string,
  fehler: FehlerRow[],
  aktionen?: Record<number, { aktion: string | null; korrektur?: string }>,
): React.ReactNode[] {
  type Seg = { start: number; end: number; typ: string; aktion: string | null };
  const segs: Seg[] = [];
  for (const f of fehler) {
    if (!f.zitat) continue;
    const aktion = aktionen?.[f.id]?.aktion ?? f.lehrkraftAktion ?? null;
    const idx = uniqueTextAnchor(text, f.zitat);
    if (idx === null) continue;
    segs.push({ start: idx, end: idx + f.zitat.length, typ: f.typ, aktion });
  }
  segs.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (const seg of segs) {
    if (seg.start < pos) continue;
    if (seg.start > pos) nodes.push(text.slice(pos, seg.start));
    const label = FEHLER_LABELS[seg.typ] ?? seg.typ;
    if (seg.aktion === 'verworfen') {
      nodes.push(
        <mark key={seg.start} title={`${label} — verworfen`} style={{ background: '#99999922', borderBottom: '2px solid #999', borderRadius: 2, padding: '0 1px', textDecoration: 'line-through', color: '#999' }}>
          {text.slice(seg.start, seg.end)}
        </mark>,
      );
    } else if (seg.aktion === 'geaendert') {
      nodes.push(
        <mark key={seg.start} title={`${label} — geändert`} style={{ background: '#9b59b628', borderBottom: '2px solid #9b59b6', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(seg.start, seg.end)}
        </mark>,
      );
    } else if (seg.aktion === 'uebernommen') {
      nodes.push(
        <mark key={seg.start} title={`${label} — übernommen`} style={{ background: FEHLER_COLORS[seg.typ] + '38', borderBottom: `2px solid ${FEHLER_COLORS[seg.typ] ?? '#999'}`, borderRadius: 2, padding: '0 1px' }}>
          {text.slice(seg.start, seg.end)}
        </mark>,
      );
    } else {
      const col = FEHLER_COLORS[seg.typ] ?? '#999';
      nodes.push(
        <mark key={seg.start} title={label} style={{ background: col + '28', borderBottom: `2px solid ${col}`, borderRadius: 2, padding: '0 1px' }}>
          {text.slice(seg.start, seg.end)}
        </mark>,
      );
    }
    pos = seg.end;
  }
  if (pos < text.length) nodes.push(text.slice(pos));
  return nodes;
}

interface KorrekturViewProps {
  /** Cross-Nav: Klick auf einen Schülernamen → Schüler-Ansicht. */
  onOpenSchueler?: (klasse: string, schuelerId: number) => void;
}

export function KorrekturView({ onOpenSchueler }: KorrekturViewProps = {}) {
  const { analyze, activeJobId, cancel, analyzing, analyzeError, progressStage, progressMessage, listKlassen, listAufgaben, getAbgaben, getAbgabeDetail, getKorrekturKontext, upsertLehrerFeedback, updateFehlerStatus, generateFeedbackDocx, retroImport, personenVorschau, listSchueler, listRubrics } = useNatascha();
  const { list: listEinsaetze } = useEinsatz();
  const { klassen: klassenMeta, refresh: refreshKlassenMeta } = useKlassenMeta();

  const [klassen, setKlassen] = useState<KlasseInfo[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  const [aufgaben, setAufgaben] = useState<string[]>([]);
  const [selectedAufgabe, setSelectedAufgabe] = useState<string | null>(null);
  const [abgaben, setAbgaben] = useState<AbgabeDetail['abgabe'][]>([]);
  const [selectedAbgabe, setSelectedAbgabe] = useState<AbgabeDetail | null>(null);
  const [korrekturKontext, setKorrekturKontext] = useState<KorrekturKontext | null>(null);
  const [teacherNote, setTeacherNote] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(true);

  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [analyzeKlasse, setAnalyzeKlasse] = useLocalDraft('analyzeKlasse', '');
  const [analyzeAufgabe, setAnalyzeAufgabe] = useLocalDraft('analyzeAufgabe', '');
  const [analyzeAufgaben, setAnalyzeAufgaben] = useState<string[]>([]);
  const [analyzeFile, setAnalyzeFile] = useLocalDraft('analyzeFile', '');
  const [rubrikListe, setRubrikListe] = useState<RubrikListe>({ rubrics: [], defaultRubric: '' });
  const [selectedRubrik, setSelectedRubrik] = useLocalDraft('selectedRubrik', '');
  // Textsorte: kuratierte Auswahl basierend auf Schulstufe
  const [analyzeTextsorte, setAnalyzeTextsorte] = useLocalDraft('analyzeTextsorte', '');
  // Anbieter/Modell pro Auftrag (Default: Settings)
  const [analyzeProvider, setAnalyzeProvider] = useLocalDraft('analyzeProvider', '');
  const [analyzeModel, setAnalyzeModel] = useLocalDraft('analyzeModel', '');
  // Ausgangstext (Angabe/Quelltext der Arbeit) — optional.
  const [analyzeAusgangstext, setAnalyzeAusgangstext] = useLocalDraft('analyzeAusgangstext', '');
  const [analyzeAusgangstextDatei, setAnalyzeAusgangstextDatei] = useLocalDraft('analyzeAusgangstextDatei', '');
  const [selectedEinsatzId, setSelectedEinsatzId] = useLocalDraft('selectedEinsatzId', '');
  const [einsatzOptions, setEinsatzOptions] = useState<EinsatzRecord[]>([]);
  const [analyzeSuccess, setAnalyzeSuccess] = useState<string | null>(null);
  // Pseudonymisierung: Redaktionsvorschau + Schalter (Standard AN).
  const [pseudoAktiv, setPseudoAktiv] = useState(true);
  const [pseudoVorschau, setPseudoVorschau] = useState<PersonenVorschau | null>(null);
  const [pseudoVorschauBusy, setPseudoVorschauBusy] = useState(false);
  // Bestätigte Schülerzuordnung: '' = Automatik (Namensheuristik).
  const [klasseSchueler, setKlasseSchueler] = useState<SchuelerInfo[]>([]);
  const [zuordnungId, setZuordnungId] = useState<number | ''>('');
  const zuordnungTouchedRef = useRef(false);

  // Batch-Korrektur (mehrere Dateien sequenziell)
  const [batchFiles, setBatchFiles] = useLocalDraft<string[]>('correction-files', []);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchCurrent, setBatchCurrent] = useState(0);
  const [batchResults, setBatchResults] = useLocalDraft<{ file: string; ok: boolean; msg: string }[]>('correction-results', []);
  const batchCancelRef = useRef(false);
  const [feedbackDrafts,setFeedbackDrafts] = useLocalDraft<Record<string,{note:string;comment:string}>>('feedback',{});
  const feedbackRef=useRef(feedbackDrafts); feedbackRef.current=feedbackDrafts;
  // Phase 3: Lehrkraft-Aktionen pro Fehler (lokal, bei Freigeben an DB)
  const [fehlerAktionen, setFehlerAktionen] = useState<Record<number, { aktion: string | null; korrektur?: string }>>({});
  const [editFehlerId, setEditFehlerId] = useState<number | null>(null);
  const [editKorrektur, setEditKorrektur] = useState('');
  const detailRequest=useRef(0);
  const saveLock=useRef(false);
  const listRequest=useRef(0);
  const [exportBusy,setExportBusy]=useState(false);
  const exportLock=useRef(false);
  const [assignments,setAssignments]=useLocalDraft<Record<string,number | ''>>('correction-assignments',{});
  const [settings,setSettings]=useState(loadSettings);
  useEffect(()=>subscribeSettings(setSettings),[]);
  const runtime=correctionRuntime(settings);
  // Effektiver Runtime: Wizard-Overrides wenn gesetzt, sonst Settings
  const effectiveRuntime = useMemo(() => {
    const pKey = analyzeProvider || settings.defaultProvider;
    const mLabel = analyzeModel || settings.defaultModel;
    // Sicherheitsnetz: Pruefe ob das Modell zum Provider gehoert
    const providerModels = LLM_PROVIDERS.find(p => p.id === pKey)?.models ?? [];
    const safeMLabel = providerModels.includes(mLabel) ? mLabel : (providerModels[0] ?? mLabel);
    return {
      provider: PROVIDER_KEY_IDS[pKey] ?? pKey,
      model: MODEL_MAP[safeMLabel] ?? safeMLabel,
    };
  }, [analyzeProvider, analyzeModel, settings.defaultProvider, settings.defaultModel]);
  const [queueContext,setQueueContext]=useLocalDraft('correction-context','');
  const contextKey=JSON.stringify([analyzeKlasse,analyzeAufgabe,selectedRubrik,analyzeAusgangstext,analyzeAusgangstextDatei,selectedEinsatzId,runtime.provider,runtime.model,pseudoAktiv,assignments]);
  const [fileChecks,setFileChecks]=useState<Record<string,PersonenVorschau | null>>({});
  const [checkingFiles,setCheckingFiles]=useState(false);
  const modalRef=useDialogFocus(analyzeOpen,()=>{if(!analyzing && !batchRunning)setAnalyzeOpen(false);});
  const queueRunning=analyzing || batchRunning;
  const selectFiles=useCallback((paths:string[])=>{
    const accepted=paths.filter(f=>/\.(docx|pdf|txt|odt|jpe?g|png)$/i.test(f));
    if(accepted.length!==paths.length)setError('Einige Dateien wurden nicht übernommen. Unterstützt: DOCX, PDF, TXT, ODT, JPG, PNG.');
    setBatchFiles(accepted);setAnalyzeFile(accepted[0] ?? '');setBatchResults([]);setAssignments({});
  },[setBatchFiles,setAnalyzeFile,setBatchResults,setAssignments]);
  const changeFeedback=(note:string,comment:string)=>{
    setTeacherNote(note);setTeacherComment(comment);
    if(selectedAbgabe)setFeedbackDrafts(previous=>({...previous,[selectedAbgabe.abgabe.id]:{note,comment}}));
    setSaveMsg('Entwurf auf diesem Gerät gesichert — noch nicht freigegeben');
  };
  // Drag-&-Drop-Ablage: Dateien in den Analyse-Dialog ziehen (Tauri liefert absolute Pfade).
  const [dragActive, setDragActive] = useState(false);
  const [korrekturStatus, setKorrekturStatus] = useState<KorrekturStatus | null>(null);
  const [statusRetry, setStatusRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setKorrekturStatus(null);
    if (!isTauri()) {
      setKorrekturStatus({
        available: false,
        mode: 'unavailable',
        code: 'sidecar_missing',
        label: 'Korrektur nur in der Desktop-App verfügbar',
        diagnostic: 'Die Web-Vorschau besitzt keinen Tauri-Prozess.',
      });
      return () => { active = false; };
    }
    void import('@tauri-apps/api/core').then(({ invoke }) => invoke<KorrekturStatus>('natascha_get_status', {
      dir: loadSettings().nataschaDir ?? '',
      python: loadSettings().pythonCommand ?? '',
      forceRefresh: statusRetry > 0,
    })).then((status) => {
      if (active) setKorrekturStatus(status);
    }).catch((error) => {
      if (active) setKorrekturStatus({
        available: false,
        mode: 'unavailable',
        code: 'sidecar_unstartable',
        label: 'Korrektur-Modul konnte nicht geprüft werden',
        diagnostic: String(error),
      });
    });
    return () => { active = false; };
  }, [statusRetry]);

  useEffect(() => {
    if (!analyzeOpen || !isTauri()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentWebview } = await import('@tauri-apps/api/webview');
        const un = await getCurrentWebview().onDragDropEvent((event) => {
          const p = event.payload as { type: string; paths?: string[] };
          if (p.type === 'enter' || p.type === 'over') setDragActive(true);
          else if (p.type === 'leave') setDragActive(false);
          else if (p.type === 'drop') {
            setDragActive(false);
            if(!queueRunning) selectFiles(p.paths ?? []);
          }
        });
        if (cancelled) un(); else unlisten = un;
      } catch { /* Drag-&-Drop nicht verfügbar (z. B. Web-Dev) — Picker bleibt */ }
    })();
    return () => { cancelled = true; if (unlisten) unlisten(); setDragActive(false); };
  }, [analyzeOpen, queueRunning, selectFiles]);

  useEffect(() => {
    if (!analyzeOpen || !isTauri()) return;
    void refreshKlassenMeta();
    void listKlassen().then(setKlassen);
  }, [analyzeOpen, refreshKlassenMeta, listKlassen]);



  useEffect(() => {
    if (!analyzeOpen || !isTauri()) return;
    let active = true;
    (async () => {
      const rows = await listEinsaetze();
      if (!active) return;
      const archived = new Set(klassenMeta.filter((k) => k.archiviert).map((k) => k.name));
      setEinsatzOptions(rows.filter((e) => !archived.has(e.klasseNameSnapshot)));
    })();
    return () => { active = false; };
  }, [analyzeOpen, listEinsaetze, klassenMeta]);

  const handleEinsatzChange = useCallback((id: string) => {
    setSelectedEinsatzId(id);
    if (!id) return;
    const einsatz = einsatzOptions.find((e) => e.id === id);
    if (!einsatz) return;
    if (einsatz.klasseNameSnapshot) setAnalyzeKlasse(normalizeKlasse(einsatz.klasseNameSnapshot));
    let source = '';
    if (einsatz.materialId) {
      const doc = loadDocuments().find((d) => d.id === einsatz.materialId);
      source = doc?.snapshot.quelltexte?.map((q) => q.inhalt).filter(Boolean).join('\n\n') ?? '';
    }
    setAnalyzeAusgangstext(source);
  }, [einsatzOptions]);

  useEffect(() => {
    listKlassen().then(setKlassen);
  }, [listKlassen]);

  const analyseKlassen = useMemo<AnalyseKlasseOption[]>(() => {
    const result = new Map<string, AnalyseKlasseOption>();
    for (const klasse of klassen) {
      const name = normalizeKlasse(klasse.klasse);
      if (name) result.set(name, { name, label: klasse.klasse, fach: '', schulstufe: '' });
    }
    for (const meta of klassenMeta) {
      if (meta.archiviert) continue;
      const name = normalizeKlasse(meta.name);
      if (!name) continue;
      const schulstufe = meta.stufe?.trim() || (meta.schulstufe != null
        ? (meta.schulstufe >= 9 ? 'oberstufe' : 'unterstufe')
        : '');
      result.set(name, {
        name,
        label: meta.name,
        fach: meta.fach?.trim() ?? '',
        schulstufe,
      });
    }
    return [...result.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'));
  }, [klassen, klassenMeta]);

  const analyseKlasseMeta = useMemo(
    () => analyseKlassen.find((klasse) => klasse.name === analyzeKlasse),
    [analyseKlassen, analyzeKlasse],
  );

  useEffect(() => {
    if (!analyzeOpen || !analyzeKlasse || !isTauri()) {
      setAnalyzeAufgaben([]);
      return;
    }
    let active = true;
    void listAufgaben(analyzeKlasse).then((aufgaben) => {
      if (active) setAnalyzeAufgaben(aufgaben);
    }).catch(() => {
      if (active) setAnalyzeAufgaben([]);
    });
    return () => { active = false; };
  }, [analyzeOpen, analyzeKlasse, listAufgaben]);

  useEffect(()=>{
    if(!analyzeOpen || !isTauri())return;
    let active=true;
    void listRubrics(analyseKlasseMeta?.fach,analyseKlasseMeta?.schulstufe).then(value=>{if(active)setRubrikListe(value);}).catch(e=>{if(active)setError(String(e));});
    return ()=>{active=false;};
  },[analyzeOpen,analyseKlasseMeta?.fach,analyseKlasseMeta?.schulstufe,listRubrics]);

  useEffect(()=>{
    if(!analyzeOpen || !analyzeKlasse || queueRunning)return;
    let active=true;setCheckingFiles(true);setFileChecks({});
    void (async()=>{
      const checks:Record<string,PersonenVorschau | null>={};
      for(const file of batchFiles){
        if(!active)return;
        checks[file]=await personenVorschau(file,analyzeKlasse,runtime);
        if(active)setFileChecks({...checks});
      }
      if(active)setCheckingFiles(false);
    })();
    return ()=>{active=false;};
  },[analyzeOpen,analyzeKlasse,batchFiles,personenVorschau,runtime.provider,runtime.model,queueRunning]);

  const loadAufgaben = useCallback(async (klasse: string) => {
    const request=++listRequest.current;detailRequest.current++;
    setError(null);setAufgaben([]);setAbgaben([]);
    setSelectedKlasse(klasse);
    setSelectedAufgabe(null);
    setSelectedAbgabe(null);
    setLoading(true);
    try {
      const af = await listAufgaben(klasse);
      if(request!==listRequest.current)return;
      setAufgaben(af);
      if (af.length > 0) {
        const first: string | undefined = af[0];
        setSelectedAufgabe(first ?? null);
        const abs = await getAbgaben(klasse, first);
        if(request===listRequest.current)setAbgaben(abs as AbgabeDetail['abgabe'][]);
      }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [listAufgaben, getAbgaben]);

  const loadAbgaben = useCallback(async (klasse: string, aufgabe: string) => {
    const request=++listRequest.current;detailRequest.current++;
    setError(null);setAbgaben([]);
    setSelectedAufgabe(aufgabe);
    setSelectedAbgabe(null);
    setLoading(true);
    try {
      const abs = await getAbgaben(klasse, aufgabe);
      if(request===listRequest.current)setAbgaben(abs as AbgabeDetail['abgabe'][]);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [getAbgaben]);

  useEffect(() => {
    if (!selectedKlasse || !selectedAufgabe) {
      setKorrekturKontext(null);
      return;
    }
    let active = true;
    void getKorrekturKontext(selectedKlasse, selectedAufgabe).then((context) => {
      if (active) setKorrekturKontext(context);
    });
    return () => { active = false; };
  }, [selectedKlasse, selectedAufgabe, getKorrekturKontext]);

  const loadDetail = useCallback(async (abgabeId: number) => {
    const request=++detailRequest.current;
    setError(null);
    setLoading(true);
    try {
      const detail = await getAbgabeDetail(abgabeId) as AbgabeDetail | null;
      if (request !== detailRequest.current) return;
      if (detail) {
        setSelectedAbgabe(detail);
        const draft=feedbackRef.current[abgabeId];
        setTeacherNote(draft?.note ?? detail.lehrerFeedback?.noteFinal?.toString() ?? '');
        setTeacherComment(draft?.comment ?? detail.lehrerFeedback?.lehrerKommentar ?? '');
        setSaveMsg(draft ? 'Gesicherter Entwurf — noch nicht freigegeben' : null);
      }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [getAbgabeDetail]);

  const handleSaveFeedback = useCallback(async () => {
    if (!selectedAbgabe || saveLock.current) return false;
    const note=teacherNote.trim() ? Number(teacherNote) : null;
    if(note === null || !Number.isFinite(note) || note < 1 || note > 5){setError('Bitte eine gültige Lehrernote zwischen 1 und 5 eingeben.');return false;}
    const savedNote=teacherNote, savedComment=teacherComment;
    saveLock.current=true;
    const finish=beginActivity('Feedback speichern');
    setSaving(true);
    setSaveMsg(null);
    const ok = await upsertLehrerFeedback(
      selectedAbgabe.abgabe.id,
      selectedAbgabe.abgabe.klasse,
      selectedAbgabe.abgabe.aufgabe,
      teacherNote ? parseFloat(teacherNote) : null,
      teacherComment || null,
      selectedAbgabe.abgabe.schuelerId ?? null,
    );
    // Phase 3: offene Lehrkraft-Aktionen an DB senden
    let aktionenOk = true;
    if (ok) {
      const pending = Object.entries(fehlerAktionen).filter(([id, a]) => a.aktion !== null);
      for (const [idStr, a] of pending) {
        const saved = await updateFehlerStatus(Number(idStr), a.aktion, a.korrektur);
        if (!saved) aktionenOk = false;
      }
      if (pending.length > 0 && aktionenOk) {
        setSelectedAbgabe(current => {
          if (!current || current.abgabe.id !== selectedAbgabe.abgabe.id) return current;
          return {
            ...current,
            fehler: current.fehler.map(f => {
              const a = fehlerAktionen[f.id];
              if (!a || a.aktion === null) return f;
              return { ...f, lehrkraftAktion: a.aktion, lehrkraftKorrektur: a.korrektur ?? f.lehrkraftKorrektur };
            }),
          };
        });
        setFehlerAktionen({});
      }
    }
    if (ok && aktionenOk) {
      setSaveMsg('Freigegeben und gespeichert');
      setFeedbackDrafts(previous=>{const next={...previous};const draft=next[selectedAbgabe.abgabe.id];if(!draft || (draft.note===savedNote && draft.comment===savedComment))delete next[selectedAbgabe.abgabe.id];return next;});
      setTimeout(() => setSaveMsg(null), 2000);
      const savedFeedback={id:selectedAbgabe.lehrerFeedback?.id ?? 0,noteFinal:note,noteAppSnapshot:selectedAbgabe.abgabe.note,lehrerKommentar:teacherComment || null,erstelltAm:null,geaendertAm:null};
      setSelectedAbgabe(current=>current?.abgabe.id===selectedAbgabe.abgabe.id ? {...current,lehrerFeedback:savedFeedback,abgabe:{...current.abgabe,hatLehrerFeedback:true,noteFinal:note}} : current);
      setAbgaben(rows=>rows.map(row=>row.id===selectedAbgabe.abgabe.id ? {...row,hatLehrerFeedback:true,noteFinal:note}:row));
    } else if (ok) {
      setError('Feedback gespeichert, aber Lehrkraft-Aktionen konnten nicht gespeichert werden — bitte erneut speichern.');
    } else {
      setError('Speichern fehlgeschlagen');
    }
    setSaving(false);saveLock.current=false;finish();
    return ok;
  }, [selectedAbgabe, teacherNote, teacherComment, upsertLehrerFeedback, updateFehlerStatus, fehlerAktionen, loadDetail, saving, setFeedbackDrafts]);

  const [retroBusy, setRetroBusy] = useState(false);
  const handleRetroImport = useCallback(async () => {
    if (!selectedKlasse) return;
    setRetroBusy(true);
    setError(null);
    setAnalyzeSuccess(null);
    const r = await retroImport(selectedKlasse, selectedAufgabe ?? undefined);
    setRetroBusy(false);
    if (r) {
      setAnalyzeSuccess(`Retro-Import: ${r.imported} importiert, ${r.skipped} übersprungen.`);
      const refreshed = await listKlassen();
      setKlassen(refreshed);
      if (selectedAufgabe) await loadAbgaben(selectedKlasse, selectedAufgabe);
    } else {
      setError('Retro-Import fehlgeschlagen (siehe Einstellungen/Python).');
    }
  }, [selectedKlasse, selectedAufgabe, retroImport, listKlassen, loadAbgaben]);

  const [docxErfolg, setDocxErfolg] = useState<string | null>(null);

  const handleGenerateDocx = useCallback(async () => {
    if (!selectedAbgabe || exportLock.current) return;
    // Phase 3: Hinweis wenn Fehler offen/verworfen — Lehrkraft soll wissen,
    // was ins DOCX kommt.
    const total = selectedAbgabe.fehler.length;
    const aktionCount = (a: string) => selectedAbgabe.fehler.filter(f =>
      (fehlerAktionen[f.id]?.aktion ?? f.lehrkraftAktion) === a
    ).length;
    const verworfen = aktionCount('verworfen');
    const offen = total - aktionCount('uebernommen') - aktionCount('geaendert') - verworfen;
    if (verworfen > 0 || offen > 0) {
      const msg = `Vor dem DOCX-Export:\n`
        + `• ${total - verworfen} Vorschläge werden übernommen\n`
        + (verworfen > 0 ? `• ${verworfen} verworfen (nicht im DOCX)\n` : '')
        + (offen > 0 ? `• ${offen} noch nicht geprüft (werden übernommen)\n` : '')
        + `\nFortfahren?`;
      if (!window.confirm(msg)) return;
    }
    exportLock.current=true;setExportBusy(true);
    const finish=beginActivity('Feedback exportieren');
    try {
    if (!await handleSaveFeedback()) return;
    setError(null);
    setDocxErfolg(null);
    const result = await generateFeedbackDocx(selectedAbgabe.abgabe.id);
    if (result) {
      setDocxErfolg(result.path);
    } else {
      setError('DOCX-Erstellung fehlgeschlagen');
    }
    } finally {exportLock.current=false;setExportBusy(false);finish();}
  }, [selectedAbgabe, fehlerAktionen, generateFeedbackDocx, handleSaveFeedback, saving]);

  const handleShowDocx = useCallback(async () => {
    if (!docxErfolg) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('show_in_folder', { path: docxErfolg });
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Ordner konnte nicht geöffnet werden.');
    }
  }, [docxErfolg]);

  // Karte gehört zur jeweiligen Abgabe — beim Wechsel ausblenden.
  useEffect(() => {
    setDocxErfolg(null);
    setFehlerAktionen({});
    setEditFehlerId(null);
  }, [selectedAbgabe?.abgabe.id]);

  const handleOpenAnalyze = useCallback(() => {
    setError(null);
    setAnalyzeSuccess(null);
    if (!isKorrekturReady(korrekturStatus)) {
      setError(korrekturStatus?.label ?? 'Korrektur-Modul wird noch geprüft.');
      return;
    }
    if(analyzeKlasse || analyzeFile || batchFiles.length){setAnalyzeStep(1);setAnalyzeOpen(true);return;}
    setSelectedEinsatzId('');
    // Beim erneuten Korrigieren derselben Aufgabe die bereits bestätigte
    // Prüfgrundlage wiederverwenden. So muss die Lehrkraft Quelle und Raster
    // nicht bei jeder weiteren Abgabe erneut zusammensuchen.
    if (selectedKlasse) setAnalyzeKlasse(selectedKlasse);
    if (selectedAufgabe) setAnalyzeAufgabe(selectedAufgabe);
    setSelectedRubrik(korrekturKontext?.rubrik ?? '');
    setAnalyzeAusgangstext(korrekturKontext?.ausgangstext ?? '');
    setAnalyzeAusgangstextDatei('');
    setAnalyzeStep(1);
    setAnalyzeOpen(true);
  }, [korrekturStatus, korrekturKontext, selectedAufgabe, selectedKlasse, analyzeKlasse, analyzeFile, batchFiles.length]);

  // Redaktionsvorschau nachladen, sobald Datei + Klasse feststehen (debounced —
  // der Call spawnt den Python-Sidecar, nicht bei jedem Tastendruck).
  useEffect(() => {
    if (!analyzeOpen || !analyzeFile || !analyzeKlasse.trim() || !isTauri()) {
      setPseudoVorschau(null);
      return;
    }
    let aktiv = true;
    setPseudoVorschau(null);
    setPseudoVorschauBusy(true);
    const t = setTimeout(async () => {
      const v = await personenVorschau(analyzeFile, analyzeKlasse.trim(), runtime);
      if (aktiv) {
        setPseudoVorschau(v);
        setPseudoVorschauBusy(false);
      }
    }, 600);
    return () => {
      aktiv = false;
      clearTimeout(t);
      setPseudoVorschauBusy(false);
    };
  }, [analyzeOpen, analyzeFile, analyzeKlasse, personenVorschau, runtime.provider, runtime.model]);

  // Schülerliste der Klasse für die bestätigte Zuordnung laden.
  useEffect(() => {
    if (!analyzeOpen || !analyzeKlasse.trim() || !isTauri()) {
      setKlasseSchueler([]);
      return;
    }
    let aktiv = true;
    const t = setTimeout(async () => {
      const rows = await listSchueler(analyzeKlasse.trim());
      if (aktiv) setKlasseSchueler(rows);
    }, 400);
    return () => { aktiv = false; clearTimeout(t); };
  }, [analyzeOpen, analyzeKlasse, listSchueler]);

  // Datei gewechselt → Zuordnung zurücksetzen, Automatik-Vorschlag darf wieder greifen.
  useEffect(() => {
    setZuordnungId('');
    zuordnungTouchedRef.current = false;
  }, [analyzeFile, analyzeKlasse]);

  // Vorschlag aus der Redaktionsvorschau übernehmen (Dateiname-Treffer),
  // solange die Lehrkraft nicht selbst gewählt hat.
  useEffect(() => {
    if (zuordnungTouchedRef.current || !pseudoVorschau) return;
    const dateiTreffer = pseudoVorschau.funde.filter((f) => f.imDateinamen);
    if (dateiTreffer.length === 1) setZuordnungId(dateiTreffer[0]!.schuelerId);
  }, [pseudoVorschau]);

  const handleAnalyze = useCallback(async () => {
    if (!analyzeFile || !analyzeKlasse || !analyzeAufgabe) return;
    if (isVisionPath(analyzeFile) && (!pseudoVorschau || pseudoVorschauBusy)) {
      setError('Die PDF/Bild-Prüfung läuft noch. Bitte kurz warten, bis die Anbieter-Unterstützung geprüft ist.');
      return;
    }
    if (pseudoVorschau?.visionModus && !pseudoVorschau.visionFaehig) {
      setError('Diese PDF/Bild-Abgabe kann mit dem konfigurierten KI-Anbieter nicht analysiert werden. Bitte einen Vision-fähigen Anbieter oder DOCX/TXT verwenden.');
      return;
    }
    setError(null);
    setAnalyzeSuccess(null);
    const einsatz = einsatzOptions.find((e) => e.id === selectedEinsatzId);
    let result;
    try { result = await analyze(analyzeFile, analyzeKlasse, analyzeAufgabe, { runtime: effectiveRuntime, fach: analyseKlasseMeta?.fach || undefined, schulstufe: analyseKlasseMeta?.schulstufe || undefined, textsorte: analyzeTextsorte || undefined, ausgangstext: analyzeAusgangstextDatei ? undefined : (analyzeAusgangstext.trim() || undefined), ausgangstextDatei: analyzeAusgangstextDatei || undefined, rubric: selectedRubrik || rubrikListe.defaultRubric || undefined, pseudonymisierung: pseudoAktiv, schuelerId: assignments[analyzeFile] || (zuordnungId === '' ? undefined : zuordnungId), einsatzId: einsatz?.id, materialId: einsatz?.materialId ?? undefined });
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); return; }
    const resultErrors = analyseHinweise(result);
    const duplicate = resultErrors.some((entry) => /duplikat|bereits analysiert/i.test(entry));
    if (result) {
      if (duplicate) {
        setAnalyzeSuccess(null);
        setError(`Übersprungen (bereits analysiert): ${resultErrors.join(' ')}`);
      } else {
        setAnalyzeSuccess(`Analyse abgeschlossen — Daten gespeichert.${resultErrors.length ? ` Hinweise: ${resultErrors.join(' ')}` : ''}`);
      }
      setQueueContext(contextKey);
      setBatchResults([{file:analyzeFile,ok:!duplicate,msg:duplicate ? 'Bereits analysiert' : 'KI-Vorschlag vorhanden — bitte prüfen'}]);
      setAnalyzeOpen(false);
      // Die Grundlage bleibt für weitere Abgaben und Wiederaufnahme erhalten.
      const refreshed = await listKlassen();
      setKlassen(refreshed);
      if (analyzeKlasse) {
        await loadAufgaben(analyzeKlasse);
      }
    } else {
      setError(analyzeError ?? 'Analyse fehlgeschlagen');
    }
  }, [runtime.provider, runtime.model, contextKey, rubrikListe.defaultRubric, assignments, analyze, analyzeFile, analyzeKlasse, analyzeAufgabe, analyseKlasseMeta, analyzeAusgangstext, analyzeAusgangstextDatei, analyzeError, listKlassen, loadAufgaben, pseudoVorschau, pseudoVorschauBusy, pseudoAktiv, selectedRubrik, zuordnungId, einsatzOptions, selectedEinsatzId]);

  const annotatedNodes = useMemo(() => {
    const rohtext = selectedAbgabe?.abgabe.rohtext;
    if (!rohtext || !selectedAbgabe) return null;
    return annotateText(rohtext, selectedAbgabe.fehler, fehlerAktionen);
  }, [selectedAbgabe, fehlerAktionen]);

  const pickFile=useCallback(async()=>{
    try{const {open}=await import('@tauri-apps/plugin-dialog');const paths=await open({multiple:true,filters:[{name:'Abgaben',extensions:['docx','pdf','txt','odt','jpg','jpeg','png']}]});if(paths)selectFiles(Array.isArray(paths)?paths:[paths]);}
    catch{setError('Die Dateiauswahl konnte nicht geöffnet werden. Bitte erneut versuchen.');}
  },[selectFiles]);

  const pickSourceFile = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: false, filters: [{ name: 'Ausgangsmaterial', extensions: ['docx', 'pdf', 'txt', 'md'] }] });
      if (typeof selected === 'string') setAnalyzeAusgangstextDatei(selected);
    } catch {
      const value = prompt('Pfad zum Ausgangsmaterial:');
      if (value) setAnalyzeAusgangstextDatei(value);
    }
  }, []);

  const baseName = (p: string) => p.split(/[/\\]/).pop() || p;

  const batchStarting=useRef(false);
  const handleBatchAnalyze = useCallback(async () => {
    if (batchStarting.current || batchFiles.length === 0 || !analyzeKlasse || !analyzeAufgabe) return;
    if(checkingFiles || batchFiles.some(file=>!fileChecks[file])) {setError('Bitte zuerst die Dateiprüfung vollständig abschließen.');return;}
    batchStarting.current=true;
    const finishActivity=beginActivity('Korrekturstapel');
    try {
    setError(null);
    setAnalyzeSuccess(null);
    setBatchRunning(true);
    setBatchResults([]);
    setBatchCurrent(0);
    batchCancelRef.current = false;

    const visionFiles = batchFiles.filter(isVisionPath);
    if (visionFiles.length > 0) {
      const visionChecks = await Promise.all(visionFiles.map((file) => personenVorschau(file, analyzeKlasse, runtime)));
      if (visionChecks.some((preview) => !preview || (preview.visionModus && !preview.visionFaehig))) {
        setBatchRunning(false);
        setError('Mindestens eine PDF/Bild-Abgabe kann mit dem konfigurierten KI-Anbieter nicht analysiert werden. Bitte einen Vision-fähigen Anbieter oder DOCX/TXT verwenden.');
        return;
      }
    }

    const results: { file: string; ok: boolean; msg: string }[] = queueContext === contextKey ? batchResults.filter(r=>r.ok && batchFiles.includes(r.file)) : [];
    setQueueContext(contextKey);
    for (let i = 0; i < batchFiles.length; i++) {
      if (batchCancelRef.current) break;
      const file = batchFiles[i]!;
      if(results.some(r=>r.file===file && r.ok))continue;
      setBatchCurrent(i + 1);
      try {
        const einsatz = einsatzOptions.find((e) => e.id === selectedEinsatzId);
        const result = await analyze(file, analyzeKlasse, analyzeAufgabe, { runtime: effectiveRuntime, fach: analyseKlasseMeta?.fach || undefined, schulstufe: analyseKlasseMeta?.schulstufe || undefined, textsorte: analyzeTextsorte || undefined, ausgangstext: analyzeAusgangstextDatei ? undefined : (analyzeAusgangstext.trim() || undefined), ausgangstextDatei: analyzeAusgangstextDatei || undefined, rubric: selectedRubrik || rubrikListe.defaultRubric || undefined, pseudonymisierung: pseudoAktiv, schuelerId: assignments[file] || undefined, einsatzId: einsatz?.id, materialId: einsatz?.materialId ?? undefined });
        if (result) {
          const note = result?.analysis?.notenempfehlung?.note;
          const resultErrors = analyseHinweise(result);
          const duplicate = resultErrors.some((entry) => /duplikat|bereits analysiert/i.test(entry));
          results.push({ file, ok: !duplicate, msg: duplicate ? 'Übersprungen (bereits analysiert)' : `${note != null ? `Note ${note}` : 'OK'}${resultErrors.length ? ` · ${resultErrors.join(' ')}` : ''}` });
        } else {
          results.push({ file, ok: false, msg: analyzeError ?? 'fehlgeschlagen' });
        }
      } catch (e) {
        results.push({ file, ok: false, msg: e instanceof Error ? e.message : String(e) });
      }
      setBatchResults([...results]);
    }

    setBatchRunning(false);
    const okCount = results.filter((r) => r.ok).length;
    setAnalyzeSuccess(`Stapel fertig: ${okCount}/${batchFiles.length} erfolgreich${batchCancelRef.current ? ' (abgebrochen)' : ''}.`);
    const refreshed = await listKlassen();
    setKlassen(refreshed);
    if (analyzeKlasse) await loadAufgaben(analyzeKlasse);
    } catch(e) {setError(e instanceof Error ? e.message : String(e));}
    finally {setBatchRunning(false);batchStarting.current=false;finishActivity();}
  }, [runtime.provider, runtime.model, contextKey, queueContext, rubrikListe.defaultRubric, assignments, batchResults, checkingFiles, fileChecks, batchFiles, analyzeKlasse, analyzeAufgabe, analyseKlasseMeta, analyzeAusgangstext, analyzeAusgangstextDatei, analyze, analyzeError, personenVorschau, listKlassen, loadAufgaben, pseudoAktiv, selectedRubrik, einsatzOptions, selectedEinsatzId]);

  const cardStyle = {
    padding: '1.25rem', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
  } as const;

  const schuelerName = (a: AbgabeDetail['abgabe']) => anzeigeName(a);

  return (
    <ViewShell
      title="Korrektur"
      description="Schülerabgaben analysieren und bewerten."
      maxWidth={1400}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button
          className="btn-primary"
          onClick={handleOpenAnalyze}
          disabled={korrekturStatus === null}
          title={korrekturStatus?.available ? 'Neue Schülerabgabe analysieren' : korrekturStatus?.label}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minHeight: 44, padding: '0.65rem 1rem', fontSize: '0.9375rem' }}
        >
          {korrekturStatus === null ? <Loader2 size={17} className="spin" /> : <Upload size={17} />}
          {korrekturStatus === null ? 'Korrektur wird geprüft …' : 'Neue Analyse'}
        </button>
        {korrekturStatus?.available && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle2 size={15} /> {korrekturStatus.label}
          </span>
        )}
      </div>

      {korrekturStatus && !korrekturStatus.available && (
        <section role="status" style={{ ...cardStyle, borderColor: 'var(--color-danger, #c0392b)', marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-danger, #c0392b)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: '0.875rem' }}>{korrekturStatus.label}</strong>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Die Analyse kann erst gestartet werden, wenn das Korrektur-Modul bereit ist.
            </p>
            {korrekturStatus.diagnostic && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Details für Support</summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0.4rem 0 0', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{korrekturStatus.diagnostic}</pre>
              </details>
            )}
          </div>
          <button className="btn-secondary" onClick={() => setStatusRetry((value) => value + 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
            <RefreshCw size={13} /> Erneut prüfen
          </button>
        </section>
      )}

      {(batchRunning || analyzing) && (
        <div role="status" style={{ marginBottom: '0.75rem' }}>
          {batchRunning ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem' }}>Stapel: Datei {batchCurrent} von {batchFiles.length}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${batchFiles.length > 0 ? (batchCurrent / batchFiles.length) * 100 : 0}%`, background: 'var(--color-accent)', borderRadius: 3, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 16, height: 16, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '0.8125rem' }}>{progressMessage || 'KI-Vorschlag wird erstellt'}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                {['input', 'rubric', 'llm', 'done'].map((phase, i) => {
                  const phaseLabels: Record<string, string> = { input: 'Abgabe lesen', rubric: 'Grundlage laden', llm: 'KI analysiert', done: 'Ergebnis speichern' };
                  const phases = ['input', 'rubric', 'llm', 'done'];
                  const currentIdx = progressStage ? phases.indexOf(progressStage) : -1;
                  const active = i <= currentIdx;
                  return (
                    <span key={phase} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: active ? 'var(--color-accent)' : undefined, fontWeight: active ? 600 : 400 }}>
                      {active ? '\u2713' : '\u25CB'} {phaseLabels[phase]}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}> — du kannst innerhalb von LUKA weiterarbeiten.</span>
        </div>
      )}
      <div style={{marginBottom:'1rem'}}><button className="btn-secondary" disabled={queueRunning} onClick={()=>{setBatchFiles([]);setBatchResults([]);setAnalyzeFile('');setAnalyzeKlasse('');setAnalyzeAufgabe('');setSelectedRubrik('');setAnalyzeTextsorte('');setAnalyzeProvider('');setAnalyzeModel('');setAnalyzeAusgangstext('');setAnalyzeAusgangstextDatei('');setSelectedEinsatzId('');setAssignments({});setPseudoAktiv(true);setError(null);setAnalyzeSuccess(null);setAnalyzeStep(1);setAnalyzeOpen(true);}}>Neuer Korrekturauftrag</button></div>
      {batchResults.length>0 && !analyzeOpen && <details className="queue-results"><summary>Letzter Auftrag: {batchResults.filter(r=>r.ok).length} abgeschlossen</summary>{batchResults.map(r=><p key={r.file}>{baseName(r.file)} — {r.msg}</p>)}<button className="btn-secondary" onClick={()=>setAnalyzeOpen(true)}>Auftrag öffnen / fehlende Dateien fortsetzen</button></details>}
      <div className="correction-workspace" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr)', gap: '1.25rem' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <GraduationCap size={16} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '0.875rem', margin: 0 }}>Klasse & Aufgabe</h3>
            </div>

            {klassen.length === 0 && !error && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Noch keine Daten. Starte eine neue Analyse.
              </p>
            )}

            {klassen.map((k) => (
              <div key={k.klasse}>
                <button
                  disabled={saving || exportBusy} onClick={() => loadAufgaben(k.klasse)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '0.4rem 0.6rem', marginBottom: '0.125rem', fontSize: '0.8125rem',
                    background: selectedKlasse === k.klasse ? 'var(--color-highlight-bg)' : 'none',
                    border: selectedKlasse === k.klasse ? '2px solid var(--color-accent)' : '1px solid transparent',
                    borderRadius: 'var(--radius)', cursor: 'pointer',
                  }}
                >
                  {k.klasse} <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>({k.anzahlAbgaben})</span>
                </button>
                {selectedKlasse === k.klasse && aufgaben.length > 0 && (
                  <div style={{ paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
                    {aufgaben.map((af) => (
                      <button
                        key={af}
                        onClick={() => loadAbgaben(k.klasse, af)}
                        style={{
                          display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                          background: selectedAufgabe === af ? 'var(--color-accent)' : 'none',
                          color: selectedAufgabe === af ? '#fff' : 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)', cursor: 'pointer', marginBottom: '0.125rem',
                        }}
                      >
                        <span>{af}</span>
                        <ChevronRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            {error && <div style={{ ...cardStyle, borderColor: 'var(--color-danger, #c0392b)', marginBottom: '1rem' }}>
              <AlertTriangle size={16} style={{ color: 'var(--color-danger, #c0392b)', verticalAlign: -2, marginRight: 6 }} />
              <span style={{ fontSize: '0.875rem' }}>{error}</span>
            </div>}

            {analyzeSuccess && <div style={{ ...cardStyle, borderColor: 'var(--color-success)', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-success)' }}>{analyzeSuccess}</span>
            </div>}

            {loading && <div style={cardStyle}><LoadingSpinner /></div>}

            {!loading && korrekturKontext && selectedAufgabe && (
              <section style={{ ...cardStyle, marginBottom: '1rem', background: 'var(--color-bg-base)' }} aria-label="Korrekturgrundlage">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Korrekturgrundlage</div>
                    <strong style={{ fontSize: '0.95rem' }}>{korrekturKontext.titel || korrekturKontext.aufgabe}</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{korrekturKontext.fach || 'Fach offen'} · {korrekturKontext.schulstufe || 'Stufe offen'}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', fontSize: '0.76rem' }}>
                  <span className="badge">Quelle: {korrekturKontext.ausgangstext.trim() ? `${korrekturKontext.ausgangstext.trim().split(/\s+/).length} Wörter gespeichert` : 'nicht hinterlegt'}</span>
                  <span className="badge">Raster: {korrekturKontext.rubrikTitel || 'nicht hinterlegt'}</span>
                  <span className="badge">Erwartungshorizont: {korrekturKontext.erwartungshorizont.trim() ? 'vorhanden' : 'nicht hinterlegt'}</span>
                </div>
                <details style={{ marginTop: '0.65rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Prüfgrundlage anzeigen</summary>
                  <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem', fontSize: '0.78rem' }}>
                    {korrekturKontext.ausgangstext.trim() && <div><strong>Ausgangstext</strong><div style={{ maxHeight: 110, overflow: 'auto', whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)' }}>{korrekturKontext.ausgangstext}</div></div>}
                    {korrekturKontext.rubrikInhalt.trim() && <div><strong>Bewertungsraster</strong><div style={{ maxHeight: 110, overflow: 'auto', whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)' }}>{korrekturKontext.rubrikInhalt}</div></div>}
                  </div>
                </details>
              </section>
            )}

            {!loading && klassen.length === 0 && !selectedKlasse && (
              <section style={{ ...cardStyle, minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.75rem' }}>
                <Upload size={30} style={{ color: 'var(--color-accent)', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Noch keine Analysen</h3>
                <p style={{ maxWidth: 430, margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Lade eine Schülerabgabe hoch, wähle Klasse und Aufgabe und starte die erste Korrektur.
                </p>
                <button className="btn-primary" onClick={handleOpenAnalyze} disabled={korrekturStatus === null} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minHeight: 42 }}>
                  <Upload size={16} /> Neue Analyse
                </button>
              </section>
            )}

            {!loading && selectedKlasse && abgaben.length > 0 && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: 0 }}>Abgaben ({abgaben.length})</h4>
                  <button
                    className="btn-secondary"
                    onClick={handleRetroImport}
                    disabled={retroBusy || !selectedKlasse}
                    title="Bestehende Analyse-JSONs (output/…/feedback_data) in die Datenbank importieren"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                  >
                    {retroBusy ? <Loader2 size={12} className="spin" /> : <FileDown size={12} style={{ transform: 'rotate(180deg)' }} />} Retro-Import
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Schüler/in</th>
                        <th style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>
                          KI-Note
                          <InfoDot text="Notenvorschlag der KI-Analyse — ein Ausgangspunkt, keine endgültige Note." />
                        </th>
                        <th style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>Lehrer</th>
                        <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Textsorte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abgaben.map((a) => (
                        <tr
                          key={a.id}
                          aria-disabled={saving || exportBusy} onClick={() => { if(!saving && !exportBusy) void loadDetail(a.id); }}
                          style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', background: selectedAbgabe?.abgabe.id === a.id ? 'var(--color-highlight-bg)' : 'transparent' }}
                        >
                          <td style={{ padding: '0.375rem 0.5rem' }} title={a.dateiname}>{schuelerName(a)}</td>
                          <td style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>{a.note !== null ? a.note.toFixed(1) : '—'}</td>
                          <td style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>
                            {a.hatLehrerFeedback ? <strong>{a.noteFinal !== null ? a.noteFinal.toFixed(1) : '—'}</strong> : '—'}
                          </td>
                          <td style={{ padding: '0.375rem 0.5rem' }}>{a.textsorte ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && selectedAbgabe && (
              <div style={{ ...cardStyle, marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', margin: 0 }}>
                    {onOpenSchueler && selectedAbgabe.abgabe.schuelerId ? (
                      <button
                        onClick={() => onOpenSchueler(selectedAbgabe.abgabe.klasse, selectedAbgabe.abgabe.schuelerId!)}
                        title="Zum Schülerprofil (Längsschnitt)"
                        style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'var(--color-accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      >
                        {schuelerName(selectedAbgabe.abgabe)}
                      </button>
                    ) : schuelerName(selectedAbgabe.abgabe)}
                    {' '}— {selectedAbgabe.abgabe.aufgabe}
                  </h4>
                  <button className="btn-secondary" onClick={handleGenerateDocx} disabled={saving || exportBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                    <FileDown size={14} /> Feedback-DOCX
                  </button>
                </div>

                {docxErfolg && (
                  <div role="status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.5rem 0.75rem', marginBottom: '1rem', border: '1px solid color-mix(in srgb, var(--color-success) 40%, var(--color-border))', borderRadius: 'var(--radius)', background: 'color-mix(in srgb, var(--color-success-bg, #f0fdf4) 60%, var(--color-bg-surface))', fontSize: '0.8125rem' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 180 }}>
                      Feedback-DOCX erstellt: <strong>{docxErfolg.split(/[/\\]/).pop()}</strong>
                    </span>
                    <button className="btn-secondary" onClick={handleShowDocx} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                      Ordner öffnen
                    </button>
                    <button className="btn-secondary" aria-label="Hinweis schließen" title="Schließen" onClick={() => setDocxErfolg(null)} style={{ padding: '0.2rem 0.45rem' }}>
                      ×
                    </button>
                  </div>
                )}

                <div className="korrektur-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 440px) 1fr', gap: '1.25rem', alignItems: 'start' }}>
                  {/* Linke Spalte: Analyse-Rail */}
                  <div>
                    <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>KI-Note</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                          {selectedAbgabe.abgabe.note !== null ? selectedAbgabe.abgabe.note.toFixed(1) : '—'}
                        </div>
                      </div>
                      {selectedAbgabe.lehrerFeedback && (
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Lehrernote</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                            {selectedAbgabe.lehrerFeedback.noteFinal?.toFixed(1) ?? '—'}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          Gesamtstufe
                          <InfoDot text="SRDP-Kompetenzstufe (1–5), nicht die Schulnote — die Note wird daraus berechnet." />
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                          {selectedAbgabe.abgabe.gesamtstufe !== null ? selectedAbgabe.abgabe.gesamtstufe.toFixed(2) : '—'}
                        </div>
                      </div>
                    </div>

                    {selectedAbgabe.kriterien.length > 0 && (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h5 style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>Kriterien</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.375rem' }}>
                          {selectedAbgabe.kriterien.map((k) => (
                            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius)' }}>
                              <span style={{ fontSize: '0.8125rem' }}>{k.kriteriumName}</span>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                {k.stufe !== null ? `${k.stufe.toFixed(1)}` : '—'}
                                {k.gewichtung !== null ? ` (${(k.gewichtung * 100).toFixed(0)}%)` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedAbgabe.fehler.length > 0 && (() => {
                      const total = selectedAbgabe.fehler.length;
                      const aktionCount = (a: string) => selectedAbgabe.fehler.filter(f =>
                        (fehlerAktionen[f.id]?.aktion ?? f.lehrkraftAktion) === a
                      ).length;
                      const verworfen = aktionCount('verworfen');
                      const uebernommen = aktionCount('uebernommen');
                      const geaendert = aktionCount('geaendert');
                      const offen = total - verworfen - uebernommen - geaendert;
                      const avgStufe = averageVertrauensstufe(
                        selectedAbgabe.fehler.map(f => f.vertrauensstufe),
                      );
                      return (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.375rem' }}>
                          <h5 style={{ fontSize: '0.8125rem', margin: 0 }}>Fehler ({total})</h5>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            {uebernommen > 0 && <span style={{ color: '#27ae60' }} title={`${uebernommen} übernommen`} aria-label={`${uebernommen} übernommen`}>✓ {uebernommen}</span>}
                            {geaendert > 0 && <span style={{ color: '#9b59b6' }} title={`${geaendert} geändert`} aria-label={`${geaendert} geändert`}>✎ {geaendert}</span>}
                            {verworfen > 0 && <span style={{ color: '#e74c3c' }} title={`${verworfen} verworfen`} aria-label={`${verworfen} verworfen`}>✕ {verworfen}</span>}
                            {offen > 0 && <span style={{ color: 'var(--color-text-secondary)' }} title={`${offen} offen`} aria-label={`${offen} offen`}>○ {offen}</span>}
                            {avgStufe && (
                              <span role="img" aria-label={`Durchschnittliche Vertrauensstufe: ${VERTRAUENS_LABELS[avgStufe]}`} title={VERTRAUENS_LABELS[avgStufe]} style={{ width: 8, height: 8, borderRadius: '50%', background: VERTRAUENS_COLORS[avgStufe], display: 'inline-block' }} />
                            )}
                          </span>
                        </div>
                        <p style={{fontSize:'0.8rem', margin:'0 0 0.5rem'}}>Nur eindeutig zuordenbare Zitate werden im Text markiert. Wiederholte oder abweichende Formulierungen bitte anhand des Zitats prüfen.</p>
                        <div style={{ maxHeight: '48vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                          {selectedAbgabe.fehler.map((f) => {
                            const aktion = fehlerAktionen[f.id]?.aktion ?? f.lehrkraftAktion ?? null;
                            const stufe = f.vertrauensstufe;
                            const effektiveKorrektur = fehlerAktionen[f.id]?.korrektur ?? f.lehrkraftKorrektur ?? f.korrektur;
                            const isEditing = editFehlerId === f.id;
                            const isVerworfen = aktion === 'verworfen';
                            const cardBg = isVerworfen ? 'var(--color-bg-surface, #f5f5f5)' : 'var(--color-bg-base)';
                            const cardOpacity = isVerworfen ? 0.55 : 1;
                            return (
                            <div key={f.id} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.375rem', background: cardBg, borderRadius: 'var(--radius)', borderLeft: `3px solid ${isVerworfen ? '#999' : FEHLER_COLORS[f.typ] ?? '#999'}`, opacity: cardOpacity, transition: 'opacity 0.15s' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.375rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isVerworfen ? '#999' : FEHLER_COLORS[f.typ] ?? '#999', textDecoration: isVerworfen ? 'line-through' : 'none' }}>
                                  {FEHLER_LABELS[f.typ] ?? f.typ}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  {stufe && (stufe in VERTRAUENS_LABELS) && (
                                    <span role="img" aria-label={`Vertrauensstufe: ${VERTRAUENS_LABELS[stufe as keyof typeof VERTRAUENS_LABELS]}`} title={VERTRAUENS_LABELS[stufe as keyof typeof VERTRAUENS_LABELS]} style={{ width: 8, height: 8, borderRadius: '50%', background: VERTRAUENS_COLORS[stufe as keyof typeof VERTRAUENS_COLORS] ?? '#999', flexShrink: 0 }} />
                                  )}
                                  {aktion === 'uebernommen' && <Check size={13} aria-label="übernommen" style={{ color: '#27ae60' }} />}
                                  {aktion === 'geaendert' && <Pencil size={13} aria-label="geändert" style={{ color: '#9b59b6' }} />}
                                  {aktion === 'verworfen' && <X size={13} aria-label="verworfen" style={{ color: '#e74c3c' }} />}
                                </span>
                              </div>
                              {f.zitat && <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: '0.125rem', textDecoration: isVerworfen ? 'line-through' : 'none' }}>"{f.zitat}"</div>}
                              {isEditing ? (
                                <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.375rem' }}>
                                  <input
                                    value={editKorrektur}
                                    onChange={(e) => setEditKorrektur(e.target.value)}
                                    autoFocus
                                    aria-label="Korrekturtext bearbeiten"
                                    style={{ flex: 1, fontSize: '0.75rem', padding: '0.2rem 0.375rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', minHeight: 24 }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        setFehlerAktionen(prev => ({ ...prev, [f.id]: { aktion: 'geaendert', korrektur: editKorrektur } }));
                                        setEditFehlerId(null);
                                      }
                                      if (e.key === 'Escape') setEditFehlerId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      setFehlerAktionen(prev => ({ ...prev, [f.id]: { aktion: 'geaendert', korrektur: editKorrektur } }));
                                      setEditFehlerId(null);
                                    }}
                                    title="Speichern"
                                    aria-label="Korrektur speichern"
                                    style={{ border: 'none', background: '#9b59b6', color: '#fff', borderRadius: 'var(--radius)', padding: '0.15rem 0.4rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, minHeight: 24 }}
                                  >
                                    <Check size={13} />
                                  </button>
                                  <button
                                    onClick={() => setEditFehlerId(null)}
                                    title="Abbrechen"
                                    aria-label="Bearbeitung abbrechen"
                                    style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius)', padding: '0.15rem 0.4rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, minHeight: 24 }}
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {effektiveKorrektur && <div style={{ fontSize: '0.75rem', marginTop: '0.125rem', color: aktion === 'geaendert' ? '#9b59b6' : undefined }}>→ {effektiveKorrektur}</div>}
                                  {f.erklaerung && <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{f.erklaerung}</div>}
                                </>
                              )}
                              {!isEditing && (
                                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.375rem' }}>
                                  <button
                                    onClick={() => setFehlerAktionen(prev => ({ ...prev, [f.id]: { aktion: aktion === 'uebernommen' ? null : 'uebernommen' } }))}
                                    title={aktion === 'uebernommen' ? 'Zurücksetzen' : 'Übernehmen'}
                                    aria-label={aktion === 'uebernommen' ? 'Übernahme zurücksetzen' : 'Vorschlag übernehmen'}
                                    aria-pressed={aktion === 'uebernommen'}
                                    style={{ border: '1px solid var(--color-border)', background: aktion === 'uebernommen' ? '#27ae6022' : 'var(--color-bg-base)', color: aktion === 'uebernommen' ? '#27ae60' : 'var(--color-text-secondary)', borderRadius: 'var(--radius)', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 24, minWidth: 24 }}
                                  >
                                    <Check size={12} /> Übernehmen
                                  </button>
                                  <button
                                    onClick={() => { setEditFehlerId(f.id); setEditKorrektur(effektiveKorrektur ?? ''); }}
                                    title="Ändern"
                                    aria-label="Korrektur ändern"
                                    aria-pressed={aktion === 'geaendert'}
                                    style={{ border: '1px solid var(--color-border)', background: aktion === 'geaendert' ? '#9b59b622' : 'var(--color-bg-base)', color: aktion === 'geaendert' ? '#9b59b6' : 'var(--color-text-secondary)', borderRadius: 'var(--radius)', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 24, minWidth: 24 }}
                                  >
                                    <Pencil size={12} /> Ändern
                                  </button>
                                  <button
                                    onClick={() => setFehlerAktionen(prev => ({ ...prev, [f.id]: { aktion: aktion === 'verworfen' ? null : 'verworfen' } }))}
                                    title={aktion === 'verworfen' ? 'Wiederherstellen' : 'Verwerfen'}
                                    aria-label={aktion === 'verworfen' ? 'Verwerfung zurücksetzen' : 'Vorschlag verwerfen'}
                                    aria-pressed={aktion === 'verworfen'}
                                    style={{ border: '1px solid var(--color-border)', background: aktion === 'verworfen' ? '#e74c3c22' : 'var(--color-bg-base)', color: aktion === 'verworfen' ? '#e74c3c' : 'var(--color-text-secondary)', borderRadius: 'var(--radius)', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.6875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 24, minWidth: 24 }}
                                  >
                                    <X size={12} /> Verwerfen
                                  </button>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                      );
                    })()}

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                      <h5 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>Lehrkraftprüfung</h5>
                      <p>{selectedAbgabe.lehrerFeedback && !feedbackDrafts[selectedAbgabe.abgabe.id] ? 'Freigegeben' : 'KI-Vorschlag — Prüfung offen'}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', alignItems: 'start' }}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: '2' }}>Note</label>
                        <input
                          type="number" min="1" max="5" step="0.25"
                          value={teacherNote}
                          disabled={saving || exportBusy}
                          onChange={(e) => changeFeedback(e.target.value,teacherComment)}
                          placeholder="1 – 5"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: '2' }}>Kommentar</label>
                        <textarea
                          value={teacherComment}
                          disabled={saving || exportBusy}
                          onChange={(e) => changeFeedback(teacherNote,e.target.value)}
                          placeholder="Optional: Bemerkung zum Aufsatz"
                          rows={3}
                          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="btn-primary" onClick={handleSaveFeedback} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Save size={14} /> {saving ? 'Speichern …' : 'Freigeben'}
                        </button>
                        <button className="btn-secondary" disabled={saving} onClick={async()=>{if(await handleSaveFeedback()){const next=abgaben.find(a=>a.id!==selectedAbgabe?.abgabe.id && !a.hatLehrerFeedback);if(next)await loadDetail(next.id);else setSaveMsg('Alle angezeigten Abgaben sind geprüft.');}}}>Freigeben und nächste</button>
                      {saveMsg && <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>{saveMsg}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Rechte Spalte: A4-Vorschau (sticky) */}
                  <div style={{ position: 'sticky', top: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h5 style={{ fontSize: '0.8125rem', margin: 0 }}>Schülertext mit Markierungen</h5>
                      {annotatedNodes && (
                        <button
                          onClick={() => setShowPreview((v) => !v)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.2rem 0.5rem',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', cursor: 'pointer' }}
                        >
                          {showPreview ? <><EyeOff size={12} /> Verbergen</> : <><Eye size={12} /> Anzeigen</>}
                        </button>
                      )}
                    </div>
                    {!annotatedNodes ? (
                      <div style={{ padding: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius)' }}>
                        Für diese Abgabe ist kein Schülertext gespeichert (Alt-Datensatz).
                        Neu analysieren, um die markierte Vorschau zu sehen.
                      </div>
                    ) : showPreview && (
                      <div style={{
                        maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', padding: '2rem', lineHeight: 1.8,
                        fontSize: '0.9rem', fontFamily: 'Georgia, serif',
                        background: '#fff', color: '#222',
                        border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {annotatedNodes}
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #ddd', paddingTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          {Object.entries(FEHLER_LABELS).map(([typ, label]) => (
                            <span key={typ} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 2, background: (FEHLER_COLORS[typ] ?? '#999') + '44', border: `2px solid ${FEHLER_COLORS[typ] ?? '#999'}`, display: 'inline-block' }} />
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!loading && selectedKlasse && abgaben.length === 0 && selectedAufgabe && (
              <div style={cardStyle}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                  Keine Abgaben für diese Aufgabe. Starte eine neue Analyse oder nutze den technischen TUI-Fallback in den Einstellungen.
                </p>
              </div>
            )}
          </div>
        </div>

      {analyzeOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => { if (!batchRunning && !analyzing) setAnalyzeOpen(false); }}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="correction-import-title" tabIndex={-1} className="correction-import" style={{ ...cardStyle, width: 760, maxWidth:'calc(100vw - 2rem)', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 id="correction-import-title" style={{ fontSize: '1.2rem', margin: '0 0 0.25rem' }}>Korrekturauftrag</h3>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  {s > 1 && <span style={{ margin: '0 0.125rem' }}>·</span>}
                  <span style={{ fontWeight: analyzeStep === s ? 700 : 400, color: analyzeStep === s ? 'var(--color-text)' : undefined }}>
                    {s}. {s === 1 ? 'Klasse & Aufgabe' : s === 2 ? 'Textsorte & Raster' : s === 3 ? 'Material' : s === 4 ? 'Abgaben' : 'Übersicht'}
                  </span>
                </span>
              ))}
            </div>

            {error && <p role="alert" className="session-warning">{error}</p>}
            <fieldset disabled={queueRunning} style={{border:0,padding:0,margin:0,minWidth:0}}>

            {/* ─── Schritt 1: Klasse & Aufgabe + Anbieter/Modell ─── */}
            {analyzeStep === 1 && (<>
              <div style={{ marginBottom: '0.75rem' }}>
                <label>Unterrichtseinsatz <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                <select
                  value={selectedEinsatzId}
                  onChange={(e) => handleEinsatzChange(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Ohne gespeicherte Unterlage</option>
                  {einsatzOptions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {(e.titelSnapshot || 'Unbenannte Unterlage')} · {(e.klasseNameSnapshot || 'Klasse offen')} · {formatEinsatzDatum(einsatzAnzeigeDatum(e))}
                    </option>
                  ))}
                </select>
                {selectedEinsatzId && <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                  Klasse und Ausgangstext wurden aus dem Einsatz vorbefüllt und bleiben bewusst überschreibbar.
                </p>}
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label>Klasse</label>
                <select
                  value={analyzeKlasse}
                  onChange={(e) => {
                    setAnalyzeKlasse(normalizeKlasse(e.target.value));
                    setAnalyzeAufgabe('');setAssignments({});setSelectedRubrik('');setAnalyzeTextsorte('');setBatchResults([]);
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">Klasse auswählen</option>
                  {analyseKlassen.map((klasse) => (
                    <option key={klasse.name} value={klasse.name}>{klasse.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label>Aufgabe</label>
                <input
                  type="text"
                  list="korrektur-aufgaben-optionen"
                  value={analyzeAufgabe}
                  onChange={(e) => setAnalyzeAufgabe(e.target.value)}
                  placeholder={analyzeKlasse ? 'Vorhandene Aufgabe wählen oder neue eingeben' : 'Zuerst Klasse auswählen'}
                  disabled={!analyzeKlasse}
                  style={{ width: '100%' }}
                />
                <datalist id="korrektur-aufgaben-optionen">
                  {analyzeAufgaben.map((aufgabe) => <option key={aufgabe} value={aufgabe} />)}
                </datalist>
              </div>

              {/* KI-Anbieter & Modell */}
              <div style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>KI-Anbieter & Modell</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={analyzeProvider || settings.defaultProvider}
                    onChange={(e) => { setAnalyzeProvider(e.target.value); setAnalyzeModel(LLM_PROVIDERS.find(p => p.id === e.target.value)?.models[0] ?? ''); }}
                    style={{ flex: 1 }}
                  >
                    {LLM_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <select
                    value={analyzeModel || settings.defaultModel}
                    onChange={(e) => setAnalyzeModel(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {(LLM_PROVIDERS.find(p => p.id === (analyzeProvider || settings.defaultProvider))?.models ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                  Standard: {LLM_PROVIDERS.find(p => p.id === settings.defaultProvider)?.label} · {settings.defaultModel}
                </p>
              </div>
            </>)}

            {/* ─── Schritt 2: Textsorte & Bewertungsraster ─── */}
            {analyzeStep === 2 && (<>
              <div style={{ marginBottom: '0.75rem' }}>
                <label>Textsorte</label>
                <select
                  value={analyzeTextsorte}
                  onChange={(e) => {
                    setAnalyzeTextsorte(e.target.value);
                    // Auto-Vorschlag: Passendes Raster basierend auf Textsorte
                    const matching = rubrikListe.rubrics.find(r =>
                      r.textsorte?.toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    if (matching) setSelectedRubrik(matching.filename);
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">Textsorte auswählen</option>
                  {(analyseKlasseMeta?.schulstufe === 'oberstufe'
                    ? [...SRDP_DEUTSCH_TEXTSORTEN]
                    : ['Erzählung', 'Beschreibung', 'Bericht', 'Zusammenfassung', 'Kommentar', 'Leserbrief']
                  ).map((ts) => <option key={ts} value={ts}>{ts}</option>)}
                </select>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                  {analyseKlasseMeta?.schulstufe === 'oberstufe'
                    ? 'Oberstufe: 7 offizielle SRDP-Textsorten + Empfehlung'
                    : 'Unterstufe: altersgerechte Textsorten'}
                </p>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label>Bewertungsraster</label>
                <select
                  value={selectedRubrik || rubrikListe.defaultRubric}
                  onChange={(e) => setSelectedRubrik(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {rubrikListe.rubrics.length === 0 && <option value="">Keine Raster verfügbar</option>}
                  {rubrikListe.rubrics.map((r) => (
                    <option key={r.filename} value={r.filename}>
                      {rubrikLabel(r)}{r.textsorte ? ` (${r.textsorte})` : ''}
                    </option>
                  ))}
                </select>
                {analyzeTextsorte && rubrikListe.rubrics.length > 0 && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    {rubrikListe.rubrics.filter(r => r.textsorte?.toLowerCase().includes(analyzeTextsorte.toLowerCase())).length > 0
                      ? `Raster filtert nach "${analyzeTextsorte}"`
                      : `Kein Raster spezifisch für "${analyzeTextsorte}" — generisches Raster wird verwendet`}
                  </p>
                )}
              </div>

              {/* Vorschau: Was wird analysiert */}
              <div style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Analyse-Kontext</div>
                <div style={{ fontSize: '0.8125rem' }}>
                  <strong>{analyzeKlasse || '—'}</strong>{analyzeAufgabe && <> · {analyzeAufgabe}</>}
                  {analyzeTextsorte && <> · <span style={{ color: 'var(--color-accent)' }}>{analyzeTextsorte}</span></>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Raster: {rubrikLabel(rubrikListe.rubrics.find(r => r.filename === (selectedRubrik || rubrikListe.defaultRubric)) ?? { filename: selectedRubrik || rubrikListe.defaultRubric || '' })}
                </div>
              </div>
            </>)}

            {/* ─── Schritt 3: Ausgangsmaterial & Erwartungshorizont ─── */}
            {analyzeStep === 3 && (<>
              <div style={{ marginBottom: '0.75rem' }}>
                <label>Ausgangsmaterial <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={analyzeAusgangstextDatei ? baseName(analyzeAusgangstextDatei) : analyzeAusgangstext}
                    onChange={(e) => { setAnalyzeAusgangstextDatei(''); setAnalyzeAusgangstext(e.target.value); }}
                    placeholder="Text eingeben oder Datei wählen"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn-secondary" onClick={pickSourceFile} style={{ flexShrink: 0 }}>
                    Datei
                  </button>
                </div>
                {analyzeAusgangstextDatei && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                    Datei: {baseName(analyzeAusgangstextDatei)}
                    <button type="button" className="btn-ghost" onClick={() => setAnalyzeAusgangstextDatei('')} style={{ marginLeft: '0.5rem', fontSize: '0.72rem' }}>entfernen</button>
                  </p>
                )}
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                  Bei textgebundenen Aufgaben (Textanalyse, Textinterpretation) wird der Quelltext empfohlen.
                </p>
              </div>
            </>)}
            {/* ─── Schritt 4: Abgaben hinzufügen ─── */}
            {analyzeStep === 4 && (<>
              <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem' }}>Dateien auswählen</h4>
              <button type="button" className="file-drop" onClick={pickFile} style={{width:'100%',padding:'1.25rem',border:'2px dashed var(--color-border)',background:dragActive?'var(--color-bg-selected)':'var(--color-bg-base)',borderRadius:'var(--radius)'}}>
                <Upload size={20}/> Dateien hierher ziehen oder auswählen<br/><small>Eine oder mehrere Abgaben · DOCX, PDF, TXT, ODT, JPG, PNG</small>
              </button>

              {batchFiles.map(file=><div className="correction-file-row" key={file}>
                <div><strong>{baseName(file)}</strong><div>{checkingFiles && !fileChecks[file] ? 'Wird geprüft …' : !fileChecks[file] ? 'Prüfung nicht abgeschlossen' : fileChecks[file]?.visionModus ? 'PDF/Bild: Datei wird unverändert übertragen' : 'Textdatei geprüft'}</div></div>
                <select aria-label={'Schülerzuordnung für '+baseName(file)} value={assignments[file] ?? ''} onChange={e=>setAssignments(prev=>({...prev,[file]:e.target.value ? Number(e.target.value):''}))}>
                  <option value="">Automatische Zuordnung — bitte prüfen</option>{klasseSchueler.map(person=><option key={person.id} value={person.id}>{person.vorname} {person.nachname}</option>)}
                </select>
                <button type="button" className="btn-secondary" onClick={()=>selectFiles(batchFiles.filter(p=>p!==file))} aria-label={'Entfernen: '+baseName(file)}>Entfernen</button>
              </div>)}

              {batchResults.length>0 && <div role="status" className="queue-results"><strong>Letzter Bearbeitungsstand</strong>{batchResults.map(r=><p key={r.file}>{baseName(r.file)} — {r.ok?'KI-Vorschlag vorhanden':'Nicht abgeschlossen'} · {r.msg}</p>)}</div>}

              {/* Bestätigte Zuordnung für Einzeldatei */}
              {batchFiles.length === 0 && klasseSchueler.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label>Schüler:in (Zuordnung)</label>
                  <select
                    value={zuordnungId === '' ? '' : String(zuordnungId)}
                    onChange={(e) => {
                      zuordnungTouchedRef.current = true;
                      setZuordnungId(e.target.value === '' ? '' : Number(e.target.value));
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="">Automatisch (aus Dateiname erkennen)</option>
                    {klasseSchueler.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.vorname}{s.nachname ? ` ${s.nachname}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Datenschutz */}
              <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    checked={pseudoAktiv}
                    onChange={(e) => setPseudoAktiv(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span style={{ fontSize: '0.8125rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                      <ShieldCheck size={14} /> Personenangaben vor dem Versand ersetzen
                    </span>
                    <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: 2 }}>
                      Namen aus der Klassenliste gehen als Alias (z.&nbsp;B. S-7A-014) an den KI-Anbieter
                      und werden in der Rückmeldung wieder eingesetzt.
                    </span>
                  </span>
                </label>
                {pseudoAktiv && batchFiles.length <= 1 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {pseudoVorschauBusy && <span>Prüfe Datei auf bekannte Namen …</span>}
                    {!pseudoVorschauBusy && pseudoVorschau?.visionModus && (
                      <span style={{ color: 'var(--color-warning, #b45309)' }}>
                        PDF/Bild: Ersetzen im Dokument nicht möglich — die Datei geht unverändert an den Anbieter.
                      </span>
                    )}
                    {!pseudoVorschauBusy && pseudoVorschau?.visionModus && !pseudoVorschau.visionFaehig && (
                      <span style={{ display: 'block', marginTop: 4, color: 'var(--color-danger, #c0392b)', fontWeight: 600 }}>
                        Analyse blockiert: Der konfigurierte KI-Anbieter unterstützt diesen PDF-/Bildtyp nicht.
                      </span>
                    )}
                    {!pseudoVorschauBusy && pseudoVorschau && !pseudoVorschau.visionModus && pseudoVorschau.klassenlisteLeer && (
                      <span>Keine Schülerliste für diese Klasse hinterlegt — es kann nichts erkannt werden.</span>
                    )}
                    {!pseudoVorschauBusy && pseudoVorschau && !pseudoVorschau.visionModus && !pseudoVorschau.klassenlisteLeer && (
                      pseudoVorschau.funde.length === 0
                        ? <span>Keine Namen aus der Klassenliste in Datei/Dateiname gefunden.</span>
                        : (
                          <span>
                            Wird ersetzt:{' '}
                            {pseudoVorschau.funde.map((f, i) => (
                              <span key={f.alias}>
                                {i > 0 && ', '}
                                <strong>{f.anzeige}</strong> → {f.alias}
                                {f.vorkommenText > 0 ? ` (${f.vorkommenText}× im Text)` : ' (im Dateinamen)'}
                              </span>
                            ))}
                          </span>
                        )
                    )}
                  </div>
                )}
                {pseudoAktiv && batchFiles.length > 1 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Gilt für alle Dateien im Stapel; erkannte Namen stehen nach der Analyse im Hinweis-Protokoll.
                  </div>
                )}
              </div>
            </>)}

            {/* ─── Schritt 5: Übersicht & Start ─── */}
            {analyzeStep === 5 && (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Klasse + Aufgabe */}
                <div style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Klasse & Aufgabe</div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                      {analyzeKlasse || '—'}{analyzeAufgabe && <> · {analyzeAufgabe}</>}
                    </div>
                  </div>
                  <button type="button" className="btn-ghost" onClick={() => setAnalyzeStep(1)} style={{ fontSize: '0.75rem' }}>Ändern</button>
                </div>

                {/* Textsorte + Raster */}
                <div style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Textsorte & Raster</div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                      {analyzeTextsorte || '—'} · {rubrikLabel(rubrikListe.rubrics.find(r => r.filename === (selectedRubrik || rubrikListe.defaultRubric)) ?? { filename: selectedRubrik || rubrikListe.defaultRubric || '' })}
                    </div>
                  </div>
                  <button type="button" className="btn-ghost" onClick={() => setAnalyzeStep(2)} style={{ fontSize: '0.75rem' }}>Ändern</button>
                </div>

                {/* Ausgangsmaterial */}
                <div style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Ausgangsmaterial</div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {analyzeAusgangstextDatei
                        ? baseName(analyzeAusgangstextDatei)
                        : analyzeAusgangstext.trim()
                          ? analyzeAusgangstext.trim().slice(0, 80) + (analyzeAusgangstext.trim().length > 80 ? ' …' : '')
                          : <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>Nicht gesetzt</span>
                      }
                    </div>
                  </div>
                  <button type="button" className="btn-ghost" onClick={() => setAnalyzeStep(3)} style={{ fontSize: '0.75rem', flexShrink: 0 }}>Ändern</button>
                </div>

                {/* Abgaben */}
                <div style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Abgaben</div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                      {batchFiles.length === 0
                        ? <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>Keine Dateien ausgewählt</span>
                        : `${batchFiles.length} Datei${batchFiles.length > 1 ? 'en' : ''}`
                      }
                    </div>
                  </div>
                  <button type="button" className="btn-ghost" onClick={() => setAnalyzeStep(4)} style={{ fontSize: '0.75rem' }}>Ändern</button>
                </div>

                {/* Per-file review cards */}
                {batchFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {batchFiles.map(file => {
                      const check = fileChecks[file];
                      const hasIssue = !check || (check.visionModus && !check.visionFaehig);
                      return (
                        <div key={file} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.625rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: hasIssue ? 'var(--color-bg-error, #fef2f2)' : 'var(--color-bg-base)' }}>
                          {hasIssue
                            ? <AlertTriangle size={14} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
                            : <CheckCircle2 size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                          }
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{baseName(file)}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                              {!check ? 'Nicht geprüft'
                                : check.visionModus && !check.visionFaehig ? 'KI-Anbieter unterstützt dieses Format nicht'
                                : assignments[file] || zuordnungId ? `Zugeordnet: ${klasseSchueler.find(s => s.id === Number(assignments[file] || zuordnungId))?.vorname ?? '?'}`
                                : 'Automatische Zuordnung (Namenserkennung)'
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Runtime + Datenschutz */}
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', padding: '0.5rem 0' }}>
                  <strong>KI-Anbieter:</strong> {LLM_PROVIDERS.find(p => p.id === (analyzeProvider || settings.defaultProvider))?.label ?? effectiveRuntime.provider} · {(() => { const pKey = analyzeProvider || settings.defaultProvider; const mLabel = analyzeModel || settings.defaultModel; const models = LLM_PROVIDERS.find(p => p.id === pKey)?.models ?? []; return models.includes(mLabel) ? mLabel : (models[0] ?? mLabel); })()}
                  {' · '}
                  <strong>Datenschutz:</strong> {pseudoAktiv ? 'Pseudonymisierung aktiv' : 'Namen werden übertragen'}
                </div>
              </div>
            </>)}

            </fieldset>

            {analyzeError && <p style={{ color: 'var(--color-error)', fontSize: '0.8125rem' }}>{analyzeError}</p>}

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', marginTop: '1rem' }}>
              <div>
                {analyzeStep > 1 && !queueRunning && (
                  <button className="btn-secondary" onClick={() => setAnalyzeStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)}>
                    Zurück
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {queueRunning ? (
                  <button className="btn-secondary" disabled={!batchRunning && activeJobId===null} onClick={async () => { if(batchRunning){batchCancelRef.current=true;}else if(activeJobId!==null && !await cancel(activeJobId)){setError('Der Auftrag konnte noch nicht abgebrochen werden. Bitte erneut versuchen.');} }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <XCircle size={14} /> {batchRunning ? 'Stapel nach laufender Datei stoppen' : 'Analyse abbrechen'}
                  </button>
                ) : (
                  <>
                    <button className="btn-secondary" onClick={() => setAnalyzeOpen(false)}>Entwurf schließen</button>
                    {analyzeStep < 5 ? (
                      <button
                        className="btn-primary"
                        onClick={() => setAnalyzeStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)}
                        disabled={
                          (analyzeStep === 1 && (!analyzeKlasse || !analyzeAufgabe)) ||
                          (analyzeStep === 4 && batchFiles.length === 0)
                        }
                      >
                        Weiter
                      </button>
                    ) : (
                      <>
                        {batchFiles.length > 1 ? (
                          <button className="btn-primary" onClick={handleBatchAnalyze} disabled={checkingFiles || !analyzeKlasse || !analyzeAufgabe || batchFiles.some(file=>!fileChecks[file] || !fileChecks[file]?.visionFaehig)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Files size={14} /> Stapel analysieren ({batchFiles.length})
                          </button>
                        ) : (
                          <button className="btn-primary" onClick={handleAnalyze} disabled={checkingFiles || !fileChecks[analyzeFile] || analyzing || !analyzeFile || !analyzeKlasse || !analyzeAufgabe || (isVisionPath(analyzeFile) && (pseudoVorschauBusy || !pseudoVorschau || !pseudoVorschau.visionFaehig))} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            {analyzing ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                            {analyzing ? 'Analysiere …' : batchFiles.length === 1 ? 'KI-Vorschlag erstellen' : `KI-Vorschlag für ${batchFiles.length} Abgaben erstellen`}
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ViewShell>
  );
}
