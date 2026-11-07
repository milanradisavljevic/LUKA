import {TeacherReportFile} from "../components/TeacherReportFile";
import {exportTeacherReport} from "../lib/teacherReportExport";
import {inferCorrectionBasis, correctionBasisBlocker} from "../lib/correctionBasisInput";
import {confirmedBasisHashInput, type ConfirmedCorrectionBasis} from "../lib/correctionRun";
import { CorrectionReasoningSelect, correctionReasoningKey, loadCorrectionReasoningOptions } from '../components/CorrectionReasoningSelect';
import { CorrectionProgress } from '../components/CorrectionProgress';
import { SchuelerZuordnung, vorhandenePerson } from '../components/SchuelerZuordnung';
import { ScanReviewPanel } from '../components/ScanReviewPanel';
import type { ScanReviewSession, ScanReviewIssue } from '../lib/scanReview';
import { EnglischRasterOptionen } from "../components/EnglischRasterOptionen";
import { englischRasterOptionen, LEERER_ENGLISCH_ENTWURF, type EnglischRasterEntwurf } from "../lib/englischRaster";
import { useLocalDraft, beginActivity } from '../lib/workSession';
import { baueFehlerSegmente, primaerStart, type FehlerAktion, type SegmentErgebnis } from '../lib/fehlerSegmente';
import { befundPruefstatus, befundGruppe, vorbereiteteBefunde, uebernehmeVorbereiteteBefunde, type BefundPruefung, type BewertungsPruefung, type KriterienEntscheidungen } from '../lib/befundPruefung';
import { sortiereFehler, SORTIER_MODI, type SortierModus } from '../lib/korrekturSortierung';
import { zentriereInPaneWennNoetig } from '../lib/paneScroll';
import { MODEL_MAP, scanRuntime } from '../lib/runtimeModel';
import { LLM_PROVIDERS, PROVIDER_KEY_IDS } from '../lib/constants';
import { textsortenFuer, textsortenHint } from '../lib/textsortenAuswahl';
import { aufgabenSchluessel, entscheideVorfuellung } from '../lib/quelltextVorfuellung';
import { istVerstaendnisRubrik } from '../lib/rubrikAuswahl';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GraduationCap, Save, AlertTriangle, Loader2, Upload, FolderOpen, FileDown, ChevronRight, Eye, EyeOff, Files, XCircle, CheckCircle2, ShieldCheck, RefreshCw, Check, X, Pencil, Undo2, Trash2, Unlink, Wand2 } from 'lucide-react';
import { baueLoopPrefill, materialQuelltextAusBibliothek } from '../lib/loopPrefill';
import type { NataschaPrefill } from '../lib/nataschaBridge';
import { LandSchema } from '@lehrunterlagen/schema';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PunkteKorrekturPanel } from '../components/PunkteKorrekturPanel';
import { loadDocuments, loadSettings, saveSettings, subscribeSettings } from '../lib/storage';
import { useNatascha, type PersonenVorschau, type RubrikListe, type SchuelerInfo, type KorrekturKontext } from '../hooks/useNatascha';
import { useEinsatz, type EinsatzRecord } from '../hooks/useEinsatz';
import { fuegeAnlageHinzuDirekt } from '../hooks/usePlanung';
import { useKlassenMeta } from '../hooks/useKlassenMeta';
import { einsatzAnzeigeDatum, formatEinsatzDatum } from '../lib/einsatz';
import { ViewShell } from './_ViewShell';
import { anzeigeName } from '../lib/anzeigeName';
import { kriteriumAnzeige } from '../lib/kriteriumAnzeige';
import { gruppiereRubriken, rubrikLabel, rubrikPasstZurTextsorte } from '../lib/rubrikAuswahl';
import { InfoDot } from '../components/ui/InfoDot';
import { Notenvorschlag, notenvorschlagText } from '../components/Notenvorschlag';
import { isKorrekturReady, type KorrekturStatus } from '../lib/korrekturStatus';
import { averageVertrauensstufe, VERTRAUENS_COLORS, VERTRAUENS_LABELS } from '../lib/vertrauensstufe';
import { createCorrectionRunSnapshot, correctionTextHash, correctionRunContextKey, shouldShowCorrectionRunError } from '../lib/correctionRun';
import { correctionSubmissionBlocker, isSubmissionReady } from '../lib/correctionSubmission';
import { korrekturLandFuerProfil, korrekturLandHinweis, istGueltigeLehrernote, maxLehrernote } from '../lib/korrekturLand';
import { schaetzeBatch, formatTokenzahl, ANTWORT_TOKENS_PRO_ABGABE } from '../lib/batchSchaetzung';
import { loadTeacherProfile } from '../lib/profile';

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

interface FehlerRow { befund?: BefundPruefung; id: number; zitat: string | null; korrektur: string | null; typ: string; erklaerung: string | null; vertrauensstufe: string | null; lehrkraftAktion: string | null; lehrkraftKorrektur: string | null }

interface AbgabeDetail {
  scanReview?: {openCount:number; numericBlocked:boolean};
  rasterAuswertung?: { bewertungsprofil: string; profil_version: string; punkte: number; max_punkte: number; wortzahl_ist: number; wortzahl_soll: number | null; wortzahl_abzug: number; veto_vorschlag: boolean; pruefung_erforderlich: string[] };
  abgabe: {
    id: number;
    schuelerId: number | null;
    unterrichtseinsatzId: string | null;
    materialId: string | null;
    klasse: string;
    klasseId: string | null;
    aufgabe: string;
    dateiname: string;
    vorname: string | null;
    nachname: string | null;
    note: number | null;
    notenempfehlungVorlaeufig?: boolean;
    gesamtstufe: number | null;
    wortanzahl: number | null;
    fach: string | null;
    schulstufe: string | null;
    textsorte: string | null;
    hatLehrerFeedback: boolean;
    noteFinal: number | null;
    rohtext: string | null;
    revisionId: number | null;
    provider: string | null;
    model: string | null;
  };
  kriterien: { id: number; kriteriumName: string; stufe: number | null; gewichtung: number | null }[];
  fehler: FehlerRow[];
  reasoning?: {selection:string};
  bewertungspruefung?: BewertungsPruefung | null;
  lehrerPruefung?: {version: number; entscheidungen: KriterienEntscheidungen} | null;
  gegenpruefung?: {status: 'pruefung_erforderlich' | 'abgeschlossen'; version: string} | null;
  notenempfehlungVorlaeufig?: boolean;
  lehrerFeedback: { pruefstatus: 'entwurf' | 'freigegeben'; id: number; noteFinal: number | null; noteAppSnapshot: number | null; lehrerKommentar: string | null; erstelltAm: string | null; geaendertAm: string | null } | null;
  revisions: { id: number; revisionNo: number; provider: string; model: string; status: string; isActive: boolean; createdAt: string | null }[];
  qualitaetswarnungen?: { code: string; message: string }[];
}

interface KlasseInfo { klasse: string; anzahlAbgaben: number; }

interface AnalyseKlasseOption {
  key: string;
  id?: string;
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

const DENK_LABELS: Record<string,string> = {default:'Modellstandard',off:'Aus',on:'Ein',low:'Gering',medium:'Mittel',high:'Hoch',xhigh:'Sehr hoch',max:'Maximal'};
const FEHLER_COLORS: Record<string, string> = { R: '#e74c3c', G: '#27ae60', Z: '#3498db', A: '#f39c12' };
const FEHLER_LABELS: Record<string, string> = { R: 'Rechtschreibung', G: 'Grammatik', Z: 'Zeichensetzung', A: 'Ausdruck' };

const AKTION_LABELS: Record<string, string> = { uebernommen: 'übernommen', geaendert: 'geändert', verworfen: 'verworfen' };

/** Wie die Fundstelle im Text zustande kam – für Tooltips und Kartentitel. */
const ANKER_LABELS: Record<string, string> = {
  eindeutig: 'genau eine Fundstelle',
  mehrdeutig: 'mehrere Fundstellen – bitte alle prüfen',
  normalisiert: 'Schreibweise angeglichen',
};

/** Spricht die KI für sich, wenn ein Zitat nicht (eindeutig) im Text steht. */
const HINWEIS_OHNE_STELLE = 'Dieses Zitat ließ sich nicht eindeutig im Schülertext finden. Bitte den Text an der Fundstelle mit dem Zitat auf der Karte vergleichen.';

/** Wer die Bewegung im System abgeschaltet hat, bekommt kein Springen. */
function respektiereBewegungsreduktion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Rendert den Rohtext mit den Markierungen der Fehlerliste.
 *
 *  Drei Kanäle, die sich nicht ins Gehege kommen: Farbe = Fehlertyp,
 *  Form (Deckkraft/Strich/Lila) = Lehrkraftentscheidung, Ring = aktiver Vorschlag.
 *  Die Nummer ist bewusst farbfrei – bei 40 gleichartigen Markierungen ist sie
 *  das einzige, was Karte und Text zuverlässig zuordnet. */
function renderMarkierungen(
  text: string,
  ergebnis: SegmentErgebnis,
  nummern: Map<number, number>,
  opt: {
    aktiveId: number | null;
    hoverId: number | null;
    zeigeNummern: boolean;
    registriere: (fehlerId: number, el: HTMLElement | null) => void;
    onKlick: (fehlerId: number) => void;
  },
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (const seg of ergebnis.segmente) {
    if (seg.start > pos) nodes.push(text.slice(pos, seg.start));
    const nr = nummern.get(seg.fehlerId);
    const istAktiv = opt.aktiveId === seg.fehlerId;
    const istVorschau = opt.hoverId === seg.fehlerId && !istAktiv;
    const fundstellen = ergebnis.anker.get(seg.fehlerId)?.treffer.length ?? 0;
    const hinweis = [
      nr !== undefined ? `Nr. ${nr}` : null,
      FEHLER_LABELS[seg.typ] ?? seg.typ,
      seg.mehrdeutig ? `${fundstellen} Fundstellen – bitte alle prüfen` : null,
      seg.ankerStatus === 'normalisiert' ? 'Schreibweise angeglichen' : null,
      seg.aktion ? AKTION_LABELS[seg.aktion] : null,
    ].filter(Boolean).join(' · ');

    const stil = seg.aktion === 'verworfen'
      ? { background: '#99999922', borderRadius: '0.2em', padding: '0 0.06em', textDecoration: 'line-through' as const, color: '#777' }
      : seg.aktion === 'geaendert'
        ? { background: '#9b59b628', borderRadius: '0.2em', padding: '0 0.06em' }
        : { background: (FEHLER_COLORS[seg.typ] ?? '#999') + (seg.aktion === 'uebernommen' ? '38' : '28'), borderRadius: '0.2em', padding: '0 0.06em' };

    const klasse = ['mark', istAktiv && 'is-aktiv', istVorschau && 'is-vorschau'].filter(Boolean).join(' ');
    nodes.push(
      <mark
        key={seg.start}
        className={klasse}
        title={hinweis}
        data-mehrdeutig={seg.mehrdeutig ? 'true' : undefined}
        style={stil}
        ref={seg.primaer ? (el: HTMLElement | null) => opt.registriere(seg.fehlerId, el) : undefined}
        onClick={() => opt.onKlick(seg.fehlerId)}
      >
        {text.slice(seg.start, seg.ende)}
        {opt.zeigeNummern && nr !== undefined && (
          <sup style={{ color: seg.aktion === 'verworfen' ? '#999' : FEHLER_COLORS[seg.typ] ?? '#666' }}>{nr}</sup>
        )}
      </mark>,
    );
    pos = seg.ende;
  }
  if (pos < text.length) nodes.push(text.slice(pos));
  return nodes;
}

interface KorrekturViewProps {
  /** Cross-Nav: Klick auf einen Schülernamen → Schüler-Ansicht. */
  onOpenSchueler?: (klasse: string, schuelerId: number, klasseId?: string | null) => void;
  /** Cross-Nav (L1): aus der Klassenansicht direkt in eine konkrete Korrektur springen. */
  preselect?: { abgabeId: number; klasse: string; aufgabe: string } | null;
  onConsumePreselect?: () => void;
  /** Closed Loop: aus der geprüften Schularbeit direkt eine Folgeübung beginnen. */
  onGenerateUebung?: (prefill: NataschaPrefill) => void;
}

export function KorrekturView({ onOpenSchueler, preselect, onConsumePreselect, onGenerateUebung }: KorrekturViewProps = {}) {
  const { getHeatmap, getFehlerDetail, analyze, activeJobId, cancel, analyzing, progressStage, progressMessage, listKlassen, listAufgaben, getAbgaben, getAbgabeDetail, getKorrekturKontext, saveKorrekturReview, getPunktebewertung, savePunktebewertung, updateFehlerStatus, activateKorrekturRevision, deleteKorrekturRevision, previewDeleteKorrekturauftrag, deleteKorrekturauftrag, generateFeedbackDocx, generateErwartungshorizont, sourceText, readRubric, retroImport, personenVorschau, listSchueler, insertSchueler, listRubrics, quelltextGet } = useNatascha();
  const { list: listEinsaetze } = useEinsatz();
  const { klassen: klassenMeta, refresh: refreshKlassenMeta } = useKlassenMeta();

  const [klassen, setKlassen] = useState<KlasseInfo[]>([]);
  // L2: Land/Skala aus dem Lehrerprofil (AT: SRDP 1-5, DE: Klassenarbeit 1-6,
  // CH: bewusst blockiert — keine still falsche Skala). undefined = lädt noch.
  const [profilLand, setProfilLand] = useState<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void loadTeacherProfile().then((p) => {
      if (active) setProfilLand(p?.land ?? 'AT');
    });
    return () => { active = false; };
  }, []);
  const korrekturLand = profilLand === undefined ? 'at' : korrekturLandFuerProfil(profilLand);
  const landHinweis = korrekturLandHinweis(korrekturLand);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  const [aufgaben, setAufgaben] = useState<string[]>([]);
  const [selectedAufgabe, setSelectedAufgabe] = useState<string | null>(null);
  const [abgaben, setAbgaben] = useState<AbgabeDetail['abgabe'][]>([]);
  const [selectedAbgabe, setSelectedAbgabe] = useState<AbgabeDetail | null>(null);
  const [loopBusy, setLoopBusy] = useState(false);
  const [loopHinweis, setLoopHinweis] = useState<string | null>(null);
  const [korrekturKontext, setKorrekturKontext] = useState<KorrekturKontext | null>(null);
  const [teacherNote, setTeacherNote] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisFailure, setAnalysisFailure] = useState<string | null>(null);
  const [revisionOfAbgabeId, setRevisionOfAbgabeId] = useState<number | null>(null);
  const [reanalyzeExisting, setReanalyzeExisting] = useState(false);

  const [showPreview, setShowPreview] = useState(true);

  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [analyzeKlasse, setAnalyzeKlasse] = useLocalDraft('analyzeKlasse', '');
  const [analyzeKlasseId, setAnalyzeKlasseId] = useLocalDraft('analyzeKlasseId', '');
  const [analyzeAufgabe, setAnalyzeAufgabe] = useLocalDraft('analyzeAufgabe', '');
  const [analyzeAufgaben, setAnalyzeAufgaben] = useState<string[]>([]);
  const [analyzeFile, setAnalyzeFile] = useLocalDraft('analyzeFile', '');
  const [rubrikListe, setRubrikListe] = useState<RubrikListe>({ rubrics: [], defaultRubric: '' });
  const [selectedRubrik, setSelectedRubrik] = useLocalDraft('selectedRubrik', '');
  const [englischEntwurf, setEnglischEntwurf] = useLocalDraft<EnglischRasterEntwurf>('englisch-raster', LEERER_ENGLISCH_ENTWURF);
  // Textsorte: kuratierte Auswahl basierend auf Schulstufe
  const [analyzeTextsorte, setAnalyzeTextsorte] = useLocalDraft('analyzeTextsorte', '');
  // Anbieter/Modell pro Auftrag (Default: Settings)
  const [analyzeProvider, setAnalyzeProvider] = useLocalDraft('analyzeProvider', '');
  const [analyzeModel, setAnalyzeModel] = useLocalDraft('analyzeModel', '');
  // Ausgangstext (Angabe/Quelltext der Arbeit). Gehört der Aufgabe: er wird
  // unter Klasse + Aufgabe gespeichert und von Erwartungshorizont wie Korrektur
  // gebraucht. `herkunft` sagt, woher der Text stammt, damit die Lehrkraft eine
  // übernommene Eingabe nicht ungeprüft verwendet.
  const [analyzeAusgangstext, setAnalyzeAusgangstext] = useLocalDraft('analyzeAusgangstext', '');
  const [analyzeAusgangstextDatei, setAnalyzeAusgangstextDatei] = useLocalDraft('analyzeAusgangstextDatei', '');
  const [ausgangstextHerkunft, setAusgangstextHerkunft] = useState('');
  // Für welche Aufgabe schon vorbelegt wurde — verhindert, dass ein bewusst
  // geleertes Feld sofort wieder gefüllt wird.
  const [vorbelegtFuer, setVorbelegtFuer] = useState('');
  const [selectedEinsatzId, setSelectedEinsatzId] = useLocalDraft('selectedEinsatzId', '');
  const [einsatzOptions, setEinsatzOptions] = useState<EinsatzRecord[]>([]);
  const [analyzeSuccess, setAnalyzeSuccess] = useState<string | null>(null);
  // Pseudonymisierung: Redaktionsvorschau + Schalter (Standard AN).
  const [pseudoAktiv, setPseudoAktiv] = useState(true);
  const [pseudoVorschau, setPseudoVorschau] = useState<PersonenVorschau | null>(null);
  const [pseudoVorschauBusy, setPseudoVorschauBusy] = useState(false);
  // Bestätigte Schülerzuordnung: '' = Automatik (Namensheuristik).
  const [klasseSchueler, setKlasseSchueler] = useState<SchuelerInfo[]>([]);
  const [addingStudent, setAddingStudent] = useState(false);
  const studentListRequest = useRef(0);
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
  // L2: „Nur unsichere“-Filter über der Fehlerliste (Ampel-Review-Modus).
  const [nurUnsichere, setNurUnsichere] = useState(false);
  const [fehlerAktionen, setFehlerAktionen] = useState<Record<number, { aktion: string | null; korrektur?: string }>>({});
  const [editFehlerId, setEditFehlerId] = useState<number | null>(null);
  const [editKorrektur, setEditKorrektur] = useState('');
  // Verzahnung Fehlerkarte ↔ markierter Schülertext: welcher Vorschlag ist aktiv,
  // in welcher Reihenfolge wird die Liste gelesen, und tragen die Markierungen Nummern.
  const [sortierung, setSortierung] = useLocalDraft<SortierModus>('korrektur-sortierung', 'text');
  const [zeigeNummern, setZeigeNummern] = useLocalDraft('korrektur-nummern', true);
  const [aktiveFehlerId, setAktiveFehlerId] = useState<number | null>(null);
  const [hoverFehlerId, setHoverFehlerId] = useState<number | null>(null);
  const [ankerHinweis, setAnkerHinweis] = useState<string | null>(null);
  const textPaneRef = useRef<HTMLDivElement | null>(null);
  const fehlerListeRef = useRef<HTMLDivElement | null>(null);
  const markRefs = useRef(new Map<number, HTMLElement>());
  const kartenRefs = useRef(new Map<number, HTMLElement>());
  const detailRequest=useRef(0);
  const saveLock=useRef(false);
  const listRequest=useRef(0);
  const [exportBusy,setExportBusy]=useState(false);
  const exportLock=useRef(false);
  const [assignments,setAssignments]=useLocalDraft<Record<string,number | ''>>('correction-assignments',{});
  const [ocrReview, setOcrReview] = useState<{file: string; text: string; previews: string[]} | null>(null);
  const [scanReview, setScanReview] = useState<ScanReviewSession | null>(null);
  const [scanReviews, setScanReviews] = useState<Record<string,ScanReviewSession>>({});
  const [scanReviewBusy, setScanReviewBusy] = useState(false);
  const [verifyModel, setVerifyModel] = useState('mistral-small-2603');
  const [ocrProvider, setOcrProvider] = useState('');
  const [ocrModel, setOcrModel] = useState('');
  const [ocrPage, setOcrPage] = useState(0);
  const [ocrZoom, setOcrZoom] = useState(100);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [analyzeReasoning, setAnalyzeReasoning] = useState<string | undefined>();
  const [kriterienEntscheidungen, setKriterienEntscheidungen] = useState<KriterienEntscheidungen>({});
  const kriterienDirty = JSON.stringify(kriterienEntscheidungen) !== JSON.stringify(selectedAbgabe?.lehrerPruefung?.entscheidungen ?? {});
  const [basisTask,setBasisTask] = useLocalDraft('basis-task','');
  const [basisAmount,setBasisAmount] = useLocalDraft('basis-amount','keine Vorgabe');
  const [basisSource,setBasisSource] = useLocalDraft('basis-source','offen');
  const [basisEh,setBasisEh] = useLocalDraft('basis-eh','');
  const [basisScope,setBasisScope] = useState<'sprache'|'vollstaendig'>('vollstaendig');
  const [basisConfirmed,setBasisConfirmed] = useState(false);
  const [basisBusy,setBasisBusy] = useState(false);
  const [basisRubric,setBasisRubric] = useState('');
  const [basisLoading,setBasisLoading] = useState(false);
  const [basisLoadError,setBasisLoadError] = useState('');
  const autoBasis = useRef({key:'',task:'',amount:'',hash:'',rubric:''});
  useEffect(() => {setBasisConfirmed(false);}, [basisTask,basisAmount,basisEh,basisScope,analyzeAusgangstext,analyzeAusgangstextDatei,selectedRubrik,analyzeKlasse,analyzeAufgabe]);
  useEffect(()=>{
    let active=true;
    setBasisTask('');setBasisEh('');setBasisAmount('keine Vorgabe');setBasisSource('offen');setBasisRubric('');
    if(analyzeKlasse && analyzeAufgabe) void getKorrekturKontext(analyzeKlasse,analyzeAufgabe).then(context=>{
      if(!active)return;
      try {const b=JSON.parse(context?.grundlageJson??'{}');if(b.version===1){setBasisTask(b.aufgabenstellung??'');setBasisEh(b.erwartungshorizont??'');setBasisAmount(b.umfangsvorgabe??'keine Vorgabe');setBasisSource(b.quellenstatus??'offen');}}
      catch { /* Alte Grundlagen werden nicht still als bestätigt übernommen. */ }
    }).catch(()=>{});
    return ()=>{active=false;};
  },[analyzeKlasse,analyzeAufgabe,getKorrekturKontext]);
  const [sourcePreview, setSourcePreview] = useState<{text: string; sha256: string} | null>(null);
  const [settings,setSettings]=useState(loadSettings);
  const prepareCorrectionRun = async (input: Parameters<typeof createCorrectionRunSnapshot>[0]) => {
    try {
      const options = await loadCorrectionReasoningOptions(input.provider, input.model);
      const reasoning = input.reasoning ?? options.default;
      if (!options.options.some(option => option.id === reasoning)) throw new Error('Der gewählte Denkmodus wird von diesem Modell nicht unterstützt. Bitte die Auswahl prüfen.');
      const source = analyzeAusgangstextDatei ? await sourceText(analyzeAusgangstextDatei) : {text: input.basis.ausgangstext, sha256: await correctionTextHash(input.basis.ausgangstext)};
      const rubricContent = await readRubric(input.basis.rubrik);
      setSourcePreview(source);
      let grundlage: ConfirmedCorrectionBasis | undefined;
      if ((analyseKlasseMeta?.fach ?? '').toLowerCase().startsWith('deutsch')) {
        const problem = correctionBasisBlocker({scope:basisScope,loading:basisLoading,loaded:Boolean(basisRubric && sourcePreview),task:basisTask,amount:basisAmount,confirmed:basisConfirmed});
        if (problem) {setAnalyzeStep(3);throw new Error(problem);}
        if (basisScope === 'vollstaendig' && (sourcePreview?.sha256 !== source.sha256 || basisRubric !== rubricContent)) {setBasisConfirmed(false);setAnalyzeStep(3);throw new Error('Datei oder Bewertungsraster wurden geändert. Bitte die aktualisierte Grundlage in Schritt 3 erneut prüfen.');}
        grundlage = {version:1,pruefumfang:basisScope,aufgabenstellung:basisTask,ausgangstext:source.text,rubrik_inhalt:rubricContent,erwartungshorizont:basisEh,umfangsvorgabe:basisAmount,quellenstatus:basisSource};
        grundlage.bestaetigung_hash = basisConfirmed ? await correctionTextHash(confirmedBasisHashInput(grundlage)) : undefined;
      }
      return createCorrectionRunSnapshot({...input, reasoning, basis: {...input.basis, grundlage, ausgangstext: source.text, ausgangstextHash: source.sha256, rubrikInhalt: rubricContent, rubrikHash: await correctionTextHash(rubricContent)}});
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); return null; }
  };
  useEffect(()=>subscribeSettings(setSettings),[]);
  // Effektiver Runtime: Wizard-Overrides wenn gesetzt, sonst Settings
  const effectiveRuntime = useMemo(() => {
    const pKey = analyzeProvider || settings.defaultProvider;
    const mLabel = analyzeModel || settings.defaultModel;
    return {
      provider: PROVIDER_KEY_IDS[pKey] ?? pKey,
      model: MODEL_MAP[mLabel] ?? mLabel,
      reasoning: analyzeReasoning ?? settings.correctionReasoning?.[correctionReasoningKey(pKey,mLabel)],
    };
  }, [analyzeProvider, analyzeModel, analyzeReasoning, settings.defaultProvider, settings.defaultModel, settings.correctionReasoning]);
  useEffect(() => { setAnalyzeReasoning(undefined); }, [effectiveRuntime.provider, effectiveRuntime.model]);
  const [queueContext,setQueueContext]=useLocalDraft('correction-context','');
  // Misst das gewählte Raster Verstehen statt Schreibfähigkeit? Dann ist der
  // Ausgangstext keine Empfehlung, sondern Voraussetzung — das steht so im
  // Raster, stand aber vorher nur in dessen Text.
  const gewaehltesRubrik = useMemo(
    () => rubrikListe.rubrics.find((r) => r.filename === (selectedRubrik || rubrikListe.defaultRubric)),
    [rubrikListe, selectedRubrik],
  );
  const englischProfil = ['at-srdp-en-b1', 'at-srdp-en-b2'].includes(gewaehltesRubrik?.bewertungsprofil ?? '');
  let englischFehler = '';
  let englischOptionen = {};
  try { if (englischProfil) englischOptionen = englischRasterOptionen(englischEntwurf); }
  catch (e) { englischFehler = (e as Error).message; }
  useEffect(() => {
    setEnglischEntwurf(value => value.bestaetigt ? { ...value, bestaetigt: false } : value);
  }, [analyzeKlasse, analyzeKlasseId, analyzeAufgabe, selectedRubrik, analyzeAusgangstext, analyzeAusgangstextDatei, selectedEinsatzId]);
  const verstaendnisGewaehlt = istVerstaendnisRubrik(gewaehltesRubrik);
  const hatAusgangstext = Boolean(analyzeAusgangstext.trim() || analyzeAusgangstextDatei.trim());
  const contextKey=JSON.stringify([analyzeKlasse,analyzeKlasseId,analyzeAufgabe,selectedRubrik,analyzeAusgangstext,analyzeAusgangstextDatei,selectedEinsatzId,effectiveRuntime.provider,effectiveRuntime.model,effectiveRuntime.reasoning,pseudoAktiv,assignments,revisionOfAbgabeId,reanalyzeExisting,englischProfil,englischEntwurf,basisTask,basisAmount,basisSource,basisEh,basisScope,basisConfirmed,basisRubric,sourcePreview?.sha256,basisLoading]);
  const [fileChecks,setFileChecks]=useState<Record<string,PersonenVorschau | null>>({});
  const [checkingFiles,setCheckingFiles]=useState(false);
  const scanReadingRuntime = scanRuntime(ocrProvider, ocrModel, effectiveRuntime);
  const autoScanProvider = ['openai','mistral'].includes(scanReadingRuntime.provider);
  const automaticScan = autoScanProvider && isVisionPath(analyzeFile);
  const preparationChecks = Object.fromEntries(Object.entries(fileChecks).map(([file,check]) => [file, autoScanProvider && isVisionPath(file) && check ? {...check, visionModus:false,visionFaehig:true} : check]));
  const studentContext = JSON.stringify([analyzeKlasse, analyzeKlasseId, analyzeOpen]);
  const studentContextRef = useRef(studentContext); studentContextRef.current = studentContext;
  const submissionBlocker = addingStudent ? 'Der Name wird noch gespeichert. Bitte kurz warten.' : correctionSubmissionBlocker({ files: batchFiles, checks: preparationChecks, readingScan: ocrBusy, reviewingScan: ocrReview !== null, checkingFiles });
  const readyFileCount = batchFiles.filter(file => isSubmissionReady(preparationChecks[file])).length;
  // Ausblenden veraendert weder den laufenden Auftrag noch seine Grundlage.
  const closeAnalyze = useCallback(() => { setAnalyzeOpen(false); }, []);
  const modalRef=useDialogFocus(analyzeOpen,closeAnalyze,'dialog');
  const queueRunning=analyzing || batchRunning;
  const selectFiles=useCallback((paths:string[])=>{
    const accepted=paths.filter(f=>/\.(docx|pdf|txt|md|odt|jpe?g|png)$/i.test(f));
    if(accepted.length!==paths.length)setError('Einige Dateien wurden nicht übernommen. Unterstützt: DOCX, PDF, TXT, MD, ODT, JPG, PNG.');
    setScanReview(null);setScanReviews({});setBatchFiles(accepted);setAnalyzeFile(accepted[0] ?? '');setBatchResults([]);setAssignments({});
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

  /**
   * Ausgangstext aus dem Speicher der Aufgabe übernehmen.
   *
   * Bisher las nur der Erwartungshorizont-Reiter aus `aufgabe_quelltext`. Ein im
   * Erwartungshorizont-Reiter hinterlegter Text — oder einer aus einer früheren
   * Korrektur — stand im Korrekturauftrag trotzdem auf leer, obwohl er direkt
   * passt. Die eigentliche Entscheidung liegt in `entscheideVorfuellung`, damit
   * sie ohne React prüfbar ist.
   */
  useEffect(() => {
    if (!analyzeKlasse.trim() || !analyzeAufgabe.trim()) return;
    const schluessel = aufgabenSchluessel(analyzeKlasse, analyzeAufgabe);
    // Erste Prüfung ohne den Speicher: sie entscheidet nur, ob ein Laden
    // überhaupt sinnvoll ist.
    const tor = entscheideVorfuellung({
      klasse: analyzeKlasse,
      aufgabe: analyzeAufgabe,
      gespeichert: '',
      eigenerText: analyzeAusgangstext,
      eigeneDatei: analyzeAusgangstextDatei,
      bereitsGefuellt: vorbelegtFuer,
    });
    if (tor.grund === 'bereits_gefuehlt') return;
    if (tor.grund === 'eigene_eingabe') {
      setAusgangstextHerkunft(tor.hinweis);
      return;
    }
    // Der Aufgabenname entsteht durch Tippen: "S", "SA", "SA2". Ohne Verzögerung
    // würde dreimal geladen — und es könnte eine Aufgabe namens "S" treffen.
    // `aktiv` gilt auch nach dem Auslösen: bricht der Effekt während des Ladens
    // ab (Aufgabe weiter getippt), darf die alte Antwort das Feld nicht füllen.
    let aktiv = true;
    const id = setTimeout(() => {
      quelltextGet(analyzeKlasse.trim(), analyzeAufgabe.trim())
        .then((gespeichert) => {
          if (!aktiv) return;
          const ergebnis = entscheideVorfuellung({
            klasse: analyzeKlasse,
            aufgabe: analyzeAufgabe,
            gespeichert,
            eigenerText: analyzeAusgangstext,
            eigeneDatei: analyzeAusgangstextDatei,
            bereitsGefuellt: vorbelegtFuer,
          });
          setVorbelegtFuer(schluessel);
          if (!ergebnis.fuellen) return;
          setAnalyzeAusgangstext(ergebnis.text);
          setAusgangstextHerkunft(ergebnis.hinweis);
        })
        .catch(() => {
          // Kein gespeicherter Text oder Sidecar nicht erreichbar: das Feld
          // bleibt leer. Ein Fehler hier wäre irreführend — der Text ist optional.
          if (aktiv) setVorbelegtFuer(schluessel);
        });
    }, 300);
    return () => { aktiv = false; clearTimeout(id); };
  }, [analyzeKlasse, analyzeAufgabe, analyzeAusgangstext, analyzeAusgangstextDatei, vorbelegtFuer, quelltextGet]);

  const handleEinsatzChange = useCallback((id: string) => {
    setSelectedEinsatzId(id);
    if (!id) return;
    const einsatz = einsatzOptions.find((e) => e.id === id);
    if (!einsatz) return;
    if (einsatz.klasseNameSnapshot) {
      setAnalyzeKlasse(normalizeKlasse(einsatz.klasseNameSnapshot));
      setAnalyzeKlasseId(einsatz.klasseId ?? '');
    }
    let source = '';
    if (einsatz.materialId) {
      const doc = loadDocuments().find((d) => d.id === einsatz.materialId);
      source = doc?.snapshot.quelltexte?.map((q) => q.inhalt).filter(Boolean).join('\n\n') ?? '';
    }
    setAnalyzeAusgangstext(source);
  }, [einsatzOptions, setAnalyzeKlasse, setAnalyzeKlasseId]);

  useEffect(() => {
    listKlassen().then(setKlassen);
  }, [listKlassen]);

  const analyseKlassen = useMemo<AnalyseKlasseOption[]>(() => {
    const result = new Map<string, AnalyseKlasseOption>();
    for (const klasse of klassen) {
      const name = normalizeKlasse(klasse.klasse);
      if (name && !klassenMeta.some((meta) => normalizeKlasse(meta.name) === name)) {
        const key = `legacy:${name}`;
        result.set(key, { key, name, label: klasse.klasse, fach: '', schulstufe: '' });
      }
    }
    for (const meta of klassenMeta) {
      if (meta.archiviert) continue;
      const name = normalizeKlasse(meta.name);
      if (!name) continue;
      const schulstufe = meta.stufe?.trim() || (meta.schulstufe != null
        ? (meta.schulstufe >= 9 ? 'oberstufe' : 'unterstufe')
        : '');
      const key = meta.id || `legacy:${name}`;
      result.set(key, {
        key,
        id: meta.id ?? undefined,
        name,
        label: [meta.name, meta.fach, meta.schuljahr].filter(Boolean).join(' · '),
        fach: meta.fach?.trim() ?? '',
        schulstufe,
      });
    }
    return [...result.values()].sort((a, b) => a.label.localeCompare(b.label, 'de') || a.key.localeCompare(b.key));
  }, [klassen, klassenMeta]);

  const analyseKlasseMeta = useMemo(
    () => analyseKlassen.find((klasse) => klasse.id === analyzeKlasseId)
      ?? (analyseKlassen.filter((klasse) => klasse.name === analyzeKlasse).length === 1
        ? analyseKlassen.find((klasse) => klasse.name === analyzeKlasse) : undefined),
    [analyseKlassen, analyzeKlasse, analyzeKlasseId],
  );
  const isGermanCorrection = (analyseKlasseMeta?.fach ?? '').toLowerCase().startsWith('deutsch');
  const basisBlocker = isGermanCorrection ? correctionBasisBlocker({scope:basisScope,loading:basisLoading,loaded:Boolean(basisRubric && sourcePreview) && !basisLoadError,task:basisTask,amount:basisAmount,confirmed:basisConfirmed}) : null;
  useEffect(()=>{
    if (!analyzeOpen || analyzeStep!==3 || !isGermanCorrection) return;
    let active=true;
    setBasisLoading(true);setBasisLoadError('');
    const rubric = selectedRubrik || rubrikListe.defaultRubric;
    const key = JSON.stringify([analyzeKlasse,analyzeAufgabe,analyzeAusgangstextDatei,analyzeAusgangstext]);
    void Promise.all([
      analyzeAusgangstextDatei ? sourceText(analyzeAusgangstextDatei) : correctionTextHash(analyzeAusgangstext).then(sha256=>({text:analyzeAusgangstext,sha256})),
      readRubric(rubric),
    ]).then(([source,content])=>{
      if(!active)return;
      const inferred=inferCorrectionBasis(source.text);
      const previous=autoBasis.current;
      const amount=inferred.wordChoices.length===1?inferred.wordChoices[0]!:'';
      setBasisTask(value=>previous.key!==key || !value.trim() || value===previous.task ? inferred.task : value);
      setBasisAmount(value=>previous.key!==key || !value.trim() || value===previous.amount ? amount : value);
      if(previous.hash!==source.sha256 || previous.rubric!==content)setBasisConfirmed(false);
      autoBasis.current={key,task:inferred.task,amount,hash:source.sha256,rubric:content};
      setSourcePreview(source);setBasisRubric(content);
    }).catch(error=>{if(active){setSourcePreview(null);setBasisRubric('');setBasisConfirmed(false);setBasisLoadError(error instanceof Error?error.message:String(error));}})
      .finally(()=>{if(active)setBasisLoading(false);});
    return ()=>{active=false;};
  },[analyzeOpen,analyzeStep,isGermanCorrection,analyzeKlasse,analyzeAufgabe,analyzeAusgangstextDatei,analyzeAusgangstext,selectedRubrik,rubrikListe.defaultRubric,sourceText,readRubric]);
  const analyseKlasseKey = analyseKlasseMeta?.key ?? `legacy:${analyzeKlasse}`;

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
    void listRubrics(analyseKlasseMeta?.fach,analyseKlasseMeta?.schulstufe,selectedRubrik||undefined).then(value=>{if(active)setRubrikListe(value);}).catch(e=>{if(active)setError(String(e));});
    return ()=>{active=false;};
  },[analyzeOpen,analyseKlasseMeta?.fach,analyseKlasseMeta?.schulstufe,selectedRubrik,listRubrics]);

  useEffect(()=>{
    if(!analyzeOpen || !analyzeKlasse || queueRunning)return;
    let active=true;setCheckingFiles(true);setFileChecks({});
    void (async()=>{
      const checks:Record<string,PersonenVorschau | null>={};
      for(const file of batchFiles){
        if(!active)return;
        checks[file]=await personenVorschau(file,analyzeKlasse,effectiveRuntime);
        if(active)setFileChecks({...checks});
      }
      if(active)setCheckingFiles(false);
    })();
    return ()=>{active=false;};
  },[analyzeOpen,analyzeKlasse,batchFiles,personenVorschau,effectiveRuntime.provider,effectiveRuntime.model,queueRunning]);

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
        setKriterienEntscheidungen(detail.lehrerPruefung?.entscheidungen ?? {});
        const draft=feedbackRef.current[abgabeId];
        setTeacherNote(draft?.note ?? detail.lehrerFeedback?.noteFinal?.toString() ?? '');
        setTeacherComment(draft?.comment ?? detail.lehrerFeedback?.lehrerKommentar ?? '');
        setSaveMsg(draft ? 'Gesicherter Entwurf — noch nicht freigegeben' : null);
      }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [getAbgabeDetail]);

  // Cross-Nav (L1): aus der Klassenansicht (Abgaben-Tabelle) direkt in die
  // konkrete Korrektur springen — Klasse/Aufgabe/Abgabe laden wie ein Klick
  // durch die drei linken Auswahl-Ebenen.
  const preselectRef = useRef<typeof preselect>(null);
  useEffect(() => {
    if (!preselect || preselectRef.current === preselect) return;
    preselectRef.current = preselect;
    let cancelled = false;
    void (async () => {
      setSelectedKlasse(preselect.klasse);
      await loadAbgaben(preselect.klasse, preselect.aufgabe);
      if (cancelled) return;
      await loadDetail(preselect.abgabeId);
      onConsumePreselect?.();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);

  const handleSaveFeedback = useCallback(async (pruefstatus: 'entwurf' | 'freigegeben' = 'freigegeben') => {
    if (!selectedAbgabe || saveLock.current) return false;
    const note = teacherNote.trim() ? Number(teacherNote) : null;
    if (note !== null && !istGueltigeLehrernote(note, korrekturLand)) {
      setError(`Bitte eine gültige Lehrernote zwischen 1 und ${maxLehrernote(korrekturLand)} eingeben oder das Feld leer lassen.`);
      return false;
    }
    saveLock.current = true; setSaving(true); setSaveMsg(null);
    const finish = beginActivity('Feedback speichern');
    const id = selectedAbgabe.abgabe.id;
    try {
      await saveKorrekturReview({
        abgabeId: id, revisionId: selectedAbgabe.abgabe.revisionId, noteFinal: note,
        lehrerKommentar: teacherComment, pruefstatus,
        aktionen: Object.entries(fehlerAktionen).map(([key, value]) => ({id: Number(key), aktion: value.aktion, korrektur: value.korrektur ?? null})),
        ...(selectedAbgabe.bewertungspruefung ? {kriterienEntscheidungen} : {}),
      });
      const savedFeedback = { id: selectedAbgabe.lehrerFeedback?.id ?? 0, noteFinal: note,
        noteAppSnapshot: selectedAbgabe.abgabe.note, lehrerKommentar: teacherComment || null,
        pruefstatus, erstelltAm: null, geaendertAm: null };
      setSelectedAbgabe(current => current?.abgabe.id === id ? {
        ...current, lehrerFeedback: savedFeedback,
        abgabe: {...current.abgabe, hatLehrerFeedback: pruefstatus === 'freigegeben', noteFinal: note},
        fehler: current.fehler.map(f => {
          const action = fehlerAktionen[f.id];
          return action ? {...f, lehrkraftAktion: action.aktion, lehrkraftKorrektur: action.korrektur ?? null} : f;
        }),
      } : current);
      setAbgaben(rows => rows.map(row => row.id === id ? {...row, hatLehrerFeedback: pruefstatus === 'freigegeben', noteFinal: note} : row));
      setFehlerAktionen({});
      setFeedbackDrafts(previous => { const next = {...previous}; delete next[id]; return next; });
      setSaveMsg(pruefstatus === 'freigegeben' ? 'Freigegeben und gespeichert' : 'Entwurf gespeichert – Prüfung offen');
      await loadDetail(id);
      await loadAbgaben(selectedAbgabe.abgabe.klasse, selectedAbgabe.abgabe.aufgabe);
      return true;
    } catch (e) { setError(String(e)); return false; }
    finally { setSaving(false); saveLock.current = false; finish(); }
  }, [selectedAbgabe, teacherNote, teacherComment, saveKorrekturReview, fehlerAktionen, setFeedbackDrafts, korrekturLand, kriterienEntscheidungen, loadDetail, loadAbgaben]);

  const [retroBusy, setRetroBusy] = useState(false);
  const [deleteAuftragBusy, setDeleteAuftragBusy] = useState(false);
  const handleFolgeuebung = useCallback(async () => {
    if (!onGenerateUebung || !selectedKlasse || !selectedAufgabe) return;
    setLoopBusy(true);
    setLoopHinweis(null);
    try {
      const klasseId = abgaben.find((a) => a.klasseId)?.klasseId ?? null;
      const meta = (klasseId ? klassenMeta.find((m) => m.id === klasseId) : undefined)
        ?? (klassenMeta.filter((m) => m.name === selectedKlasse).length === 1
          ? klassenMeta.find((m) => m.name === selectedKlasse) : undefined);
      const profil = LandSchema.safeParse(profilLand);
      const heatmap = await getHeatmap(selectedKlasse, selectedAufgabe, klasseId);
      const prefill = await baueLoopPrefill({
        klasse: selectedKlasse,
        klasseId,
        aufgabe: selectedAufgabe,
        heatmap,
        abgaben,
        klasseMeta: meta,
        land: profil.success ? profil.data : undefined,
        quelltextGet,
        getFehlerDetail,
        materialQuelltext: materialQuelltextAusBibliothek,
      });
      if (prefill) onGenerateUebung(prefill);
      else setLoopHinweis('Keine bestätigten Fehler in dieser Schularbeit — keine Folgeübung nötig.');
    } catch (e) {
      setLoopHinweis(`Folgeübung konnte nicht vorbereitet werden: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoopBusy(false);
    }
  }, [onGenerateUebung, selectedKlasse, selectedAufgabe, abgaben, klassenMeta, profilLand, getHeatmap, quelltextGet, getFehlerDetail]);

  const handleDeleteAuftrag = async () => {
    if (!selectedKlasse || !selectedAufgabe || queueRunning || retroBusy || saving || exportBusy || deleteAuftragBusy) return;
    const klasse = selectedKlasse; const aufgabe = selectedAufgabe;
    const ids = [...new Set(abgaben.map(item => item.klasseId).filter((id): id is string => Boolean(id)))];
    const klasseId = ids.length === 1 ? ids[0] : undefined;
    setDeleteAuftragBusy(true); setError(null);
    const finish = beginActivity('Korrekturauftrag löschen');
    try {
      const preview = await previewDeleteKorrekturauftrag(klasse, aufgabe, klasseId);
      const message = `Korrekturauftrag „${aufgabe}“ in ${klasse} löschen?\n\n${preview.abgabeIds.length} Arbeiten, ${preview.revisionen} gespeicherte Korrekturversionen und ${preview.lehrkraftRueckmeldungen} aktuelle Lehrkraft-Rückmeldungen werden aus LUKA entfernt. Auch Retro-Importe zu dieser Aufgabe werden erfasst.\n\nOriginaldateien, exportierte Dokumente, Klassen und Schüler bleiben erhalten. Die Löschung kann nicht rückgängig gemacht werden.`;
      if (!window.confirm(message)) return;
      await deleteKorrekturauftrag(klasse, aufgabe, preview.abgabeIds, klasseId);
      setSelectedAbgabe(null); setKorrekturKontext(null); setAbgaben([]);
      if (analyzeKlasse === klasse && analyzeAufgabe === aufgabe) {
        setAnalyzeFile(''); setBatchFiles([]); setBatchResults([]); setAssignments({});
        setAnalyzeAufgabe(''); setAnalyzeAusgangstext(''); setAnalyzeAusgangstextDatei('');
        setRevisionOfAbgabeId(null); setReanalyzeExisting(false); setScanReview(null); setScanReviews({});
      }
      await loadAufgaben(klasse);
      setKlassen(await listKlassen());
      setAnalyzeSuccess(`Korrekturauftrag „${aufgabe}“ gelöscht (${preview.abgabeIds.length} Arbeiten).`);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { finish(); setDeleteAuftragBusy(false); }
  };

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
  const [feedbackAmTermin, setFeedbackAmTermin] = useState(false);

  const handleGenerateDocx = useCallback(async () => {
    if (!selectedAbgabe || exportLock.current) return;
    exportLock.current=true;setExportBusy(true);
    const finish=beginActivity('Feedback exportieren');
    try {
    setError(null);setDocxErfolg(null);setFeedbackAmTermin(false);
    const pending = kriterienDirty || Boolean(feedbackDrafts[selectedAbgabe.abgabe.id]) || Object.keys(fehlerAktionen).length > 0;
    const path = await exportTeacherReport({abgabeId:selectedAbgabe.abgabe.id,revisionId:selectedAbgabe.abgabe.revisionId,
      savePending:pending ? ()=>handleSaveFeedback('entwurf') : undefined,generate:generateFeedbackDocx});
    if (path) setDocxErfolg(path);
    } catch(e) { setError(String(e)); } finally {exportLock.current=false;setExportBusy(false);finish();}
  }, [selectedAbgabe, fehlerAktionen, generateFeedbackDocx, handleSaveFeedback, saving, feedbackDrafts, kriterienDirty]);

  const handleShowDocx = useCallback(async () => {
    if (!docxErfolg) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('show_in_folder', { path: docxErfolg });
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Ordner konnte nicht geöffnet werden.');
    }
  }, [docxErfolg]);

  const handleFeedbackAmTermin = useCallback(async () => {
    const einsatzId = selectedAbgabe?.abgabe.unterrichtseinsatzId;
    if (!einsatzId || !docxErfolg || feedbackAmTermin) return;
    const dateiname = docxErfolg.split(/[/\\]/).pop() || 'Feedback.docx';
    const anlage = await fuegeAnlageHinzuDirekt(einsatzId, {
      art: 'ablage', quellePfad: docxErfolg, label: `Feedback: ${dateiname}`,
    });
    if (anlage) setFeedbackAmTermin(true);
    else setError('Feedback erstellt, aber die Ablage am Termin ist fehlgeschlagen. Bitte erneut versuchen.');
  }, [selectedAbgabe, docxErfolg, feedbackAmTermin]);

  // Karte gehört zur jeweiligen Abgabe — beim Wechsel ausblenden.
  useEffect(() => {
    setDocxErfolg(null);
    setFeedbackAmTermin(false);
    setFehlerAktionen({});
    setEditFehlerId(null);
    setNurUnsichere(false);
    // Auch die Text-Markierung nicht stehen lassen: sie zeigt sonst in die
    // nächste Abgabe hinein, wo es den Vorschlag gar nicht gibt.
    setAktiveFehlerId(null);
    setHoverFehlerId(null);
    setAnkerHinweis(null);
    markRefs.current.clear();
    kartenRefs.current.clear();
  }, [selectedAbgabe?.abgabe.id]);

  const handleOpenAnalyze = useCallback(() => {
    setReanalyzeExisting(false);
    setError(null);
    setAnalysisFailure(null);
    setRevisionOfAbgabeId(null);
    setAnalyzeSuccess(null);
    if (!isKorrekturReady(korrekturStatus)) {
      setError(korrekturStatus?.label ?? 'Korrektur-Modul wird noch geprüft.');
      return;
    }
    if (profilLand !== undefined && korrekturLand === null) {
      setError('Die Korrektur-Skala für dein Profil-Land (Schweiz) folgt in einer kommenden Version. Bitte Profil auf Österreich oder Deutschland setzen.');
      return;
    }
    if(analyzeKlasse || analyzeFile || batchFiles.length){setAnalyzeStep(1);setAnalyzeOpen(true);return;}
    setSelectedEinsatzId('');
    // Beim erneuten Korrigieren derselben Aufgabe die bereits bestätigte
    // Prüfgrundlage wiederverwenden. So muss die Lehrkraft Quelle und Raster
    // nicht bei jeder weiteren Abgabe erneut zusammensuchen.
    if (selectedKlasse) setAnalyzeKlasse(selectedKlasse);
    if (selectedKlasse) {
      const matching = klassenMeta.filter((meta) => normalizeKlasse(meta.name) === normalizeKlasse(selectedKlasse));
      setAnalyzeKlasseId(matching.length === 1 ? matching[0]?.id ?? '' : '');
    }
    if (selectedAufgabe) setAnalyzeAufgabe(selectedAufgabe);
    setSelectedRubrik(korrekturKontext?.rubrik ?? '');
    setAnalyzeAusgangstext(korrekturKontext?.ausgangstext ?? '');
    setAnalyzeAusgangstextDatei('');
    setAusgangstextHerkunft('');
    setVorbelegtFuer('');
    setAnalyzeStep(1);
    setAnalyzeOpen(true);
  }, [korrekturStatus, korrekturKontext, selectedAufgabe, selectedKlasse, analyzeKlasse, analyzeFile, batchFiles.length, profilLand, korrekturLand, klassenMeta, setAnalyzeKlasse, setAnalyzeKlasseId]);

  const handleReanalyze = useCallback(() => {
    if (!selectedAbgabe) return;
    setError(null);
    setAnalysisFailure(null);
    setAnalyzeSuccess(null);
    setRevisionOfAbgabeId(selectedAbgabe.abgabe.id);
    setReanalyzeExisting(true);
    setAnalyzeKlasse(selectedAbgabe.abgabe.klasse);
    setAnalyzeKlasseId(selectedAbgabe.abgabe.klasseId ?? '');
    setAnalyzeAufgabe(selectedAbgabe.abgabe.aufgabe);
    setAnalyzeFile('');
    setBatchFiles([]);
    setBatchResults([]);
    setAssignments({});
    setSelectedRubrik(korrekturKontext?.klasse === selectedAbgabe.abgabe.klasse && korrekturKontext?.aufgabe === selectedAbgabe.abgabe.aufgabe ? korrekturKontext.rubrik : '');
    setAnalyzeAusgangstext(korrekturKontext?.ausgangstext ?? '');
    setAnalyzeAusgangstextDatei('');
    setAusgangstextHerkunft('');
    setVorbelegtFuer('');
    setAnalyzeProvider('');
    setAnalyzeModel('');
    setAnalyzeStep(1);
    setAnalyzeOpen(true);
  }, [selectedAbgabe, korrekturKontext, setAnalyzeKlasse, setAnalyzeAufgabe, setAnalyzeFile, setBatchFiles, setBatchResults, setAssignments, setSelectedRubrik, setAnalyzeAusgangstext, setAnalyzeAusgangstextDatei, setAnalyzeProvider, setAnalyzeModel]);

  const handleActivateRevision = useCallback(async (revisionId: number) => {
    if (!selectedAbgabe) return;
    try {
      await activateKorrekturRevision(selectedAbgabe.abgabe.id, revisionId);
      await loadDetail(selectedAbgabe.abgabe.id);
      setAbgaben(await getAbgaben(selectedAbgabe.abgabe.klasse, selectedAbgabe.abgabe.aufgabe));
    } catch {
      setError('Die Korrekturversion konnte nicht aktiviert werden. Deine bisherigen Daten bleiben erhalten.');
    }
  }, [selectedAbgabe, activateKorrekturRevision, loadDetail, getAbgaben]);

  const handleDeleteRevision = useCallback(async (revisionId: number) => {
    if (!selectedAbgabe) return;
    if (!window.confirm('Diese Korrekturversion samt KI-Ergebnissen und Lehrkraft-Feedback löschen? Schülerprofil und Originaldatei bleiben erhalten.')) return;
    const { id, klasse, aufgabe } = selectedAbgabe.abgabe;
    try {
      const removedAbgabe = await deleteKorrekturRevision(id, revisionId);
      if (removedAbgabe) {
        setSelectedAbgabe(null);
        setTeacherNote('');
        setTeacherComment('');
        const refreshed = await listKlassen();
        setKlassen(refreshed);
        await loadAufgaben(klasse);
      } else {
        await loadDetail(id);
        setAbgaben(await getAbgaben(klasse, aufgabe));
        const refreshed = await listKlassen();
        setKlassen(refreshed);
      }
    } catch {
      setError('Die Korrekturversion konnte nicht gelöscht werden. Es wurden keine Schülerdaten oder Originaldateien entfernt.');
    }
  }, [selectedAbgabe, deleteKorrekturRevision, listKlassen, loadAufgaben, loadDetail, getAbgaben]);

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
      const v = await personenVorschau(analyzeFile, analyzeKlasse.trim(), effectiveRuntime);
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
  }, [analyzeOpen, analyzeFile, analyzeKlasse, personenVorschau, effectiveRuntime.provider, effectiveRuntime.model]);

  // Schülerliste der Klasse für die bestätigte Zuordnung laden.
  useEffect(() => {
    const request = ++studentListRequest.current;
    if (!analyzeOpen || !analyzeKlasse.trim() || !isTauri()) {
      setKlasseSchueler([]);
      return;
    }
    let aktiv = true;
    const t = setTimeout(async () => {
      const rows = await listSchueler(analyzeKlasse.trim(), analyzeKlasseId || null);
      if (aktiv && request === studentListRequest.current) setKlasseSchueler(rows);
    }, 400);
    return () => { aktiv = false; clearTimeout(t); };
  }, [analyzeOpen, analyzeKlasse, analyzeKlasseId, listSchueler]);

  const createAndAssignStudent = useCallback(async (vorname: string, nachname: string): Promise<number> => {
    if (!analyzeKlasse.trim()) throw new Error('Bitte zuerst eine Klasse auswählen.');
    const expectedContext = studentContext;
    ++studentListRequest.current;
    setAddingStudent(true);
    try {
      const classId = analyseKlasseMeta?.id ?? (analyzeKlasseId || null);
      const rows = await listSchueler(analyzeKlasse.trim(), classId);
      if (studentContextRef.current !== expectedContext) throw new Error('Die Klasse wurde gewechselt. Bitte den Namen erneut zuordnen.');
      const existing = vorhandenePerson(rows, vorname, nachname);
      if (existing) { setKlasseSchueler(rows); return existing.id; }
      const id = await insertSchueler(analyzeKlasse.trim(), vorname, nachname || null, classId);
      if (studentContextRef.current !== expectedContext) throw new Error('Der Name wurde in der ursprünglichen Klasse gespeichert. Bitte dort erneut auswählen.');
      setKlasseSchueler([...rows, { id, klasse: analyzeKlasse.trim(), vorname, nachname: nachname || null, createdAt: null }]);
      return id;
    } finally { setAddingStudent(false); }
  }, [analyzeKlasse, analyzeKlasseId, analyseKlasseMeta?.id, studentContext, insertSchueler, listSchueler]);

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

  const handleAnalyze = useCallback(async (commitScan = false) => {
    if (englischFehler) { setError(englischFehler); return; }
    if (!analyzeFile || !analyzeKlasse || !analyzeAufgabe) return;
    if (submissionBlocker || (!automaticScan && !isSubmissionReady(fileChecks[analyzeFile]))) {
      setError(submissionBlocker ?? 'Bitte die ausgewählte Abgabe in Schritt 4 prüfen.');
      setAnalyzeStep(4);
      return;
    }
    setError(null);
    setAnalysisFailure(null);
    setAnalyzeSuccess(null);
    const einsatz = einsatzOptions.find((e) => e.id === selectedEinsatzId);
    let result;
    const correctionRun = await prepareCorrectionRun({
      provider: effectiveRuntime.provider,
      model: effectiveRuntime.model,
      reasoning: effectiveRuntime.reasoning,
      reanalyzeExisting,
      pseudonymization: pseudoAktiv,
      basis: {
        klasse: analyzeKlasse,
        aufgabe: analyzeAufgabe,
        rubrik: selectedRubrik || rubrikListe.defaultRubric || '',
        ausgangstext: analyzeAusgangstextDatei ? '' : analyzeAusgangstext.trim(),
        unterrichtseinsatzId: einsatz?.id ?? null,
        materialId: einsatz?.materialId ?? null,
      },
    });
    if (!correctionRun) return;
    try { result = await analyze(analyzeFile, analyzeKlasse, analyzeAufgabe, { ...englischOptionen,
        scanReview: automaticScan ? {action: commitScan ? 'commit' : 'prepare', session:commitScan ? scanReview?.id : undefined, provider:scanReadingRuntime.provider, model:scanReadingRuntime.model, verifyModel:scanReadingRuntime.provider==='mistral'?verifyModel:scanReadingRuntime.model} : undefined, runtime: { provider: correctionRun.provider, model: correctionRun.model, reasoning: correctionRun.reasoning }, fach: analyseKlasseMeta?.fach || undefined, schulstufe: analyseKlasseMeta?.schulstufe || undefined, textsorte: analyzeTextsorte || undefined, land: korrekturLand ?? 'at', ausgangstext: correctionRun.basis.ausgangstext, grundlageSnapshot: {rubrik_inhalt: correctionRun.basis.rubrikInhalt ?? '', ausgangstext: correctionRun.basis.ausgangstext, grundlage: correctionRun.basis.grundlage}, rubric: correctionRun.basis.rubrik || undefined, reanalyzeExisting: correctionRun.reanalyzeExisting, pseudonymisierung: correctionRun.privacyMode === 'pseudonymisiert', schuelerId: assignments[analyzeFile] || (zuordnungId === '' ? undefined : zuordnungId), einsatzId: correctionRun.basis.unterrichtseinsatzId ?? undefined, materialId: correctionRun.basis.materialId ?? undefined, revisionOfAbgabeId: revisionOfAbgabeId ?? undefined, klasseId: analyseKlasseMeta?.id });
    } catch(e) { setAnalysisFailure(e instanceof Error ? e.message : String(e)); setAnalyzeStep(5); return; }
    if (result?.scan_review) { setScanReview(result.scan_review); setScanReviews(prev=>({...prev,[analyzeFile]:result.scan_review})); setAnalyzeStep(5); return; }
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
      const remaining = {...scanReviews}; delete remaining[analyzeFile]; setScanReviews(remaining);
      const next = Object.keys(remaining)[0];
      setScanReview(next ? remaining[next]! : null);
      if (next) { setAnalyzeFile(next); setAnalyzeStep(5); } else setAnalyzeOpen(false);
      setRevisionOfAbgabeId(null);
      // Die Grundlage bleibt für weitere Abgaben und Wiederaufnahme erhalten.
      const refreshed = await listKlassen();
      setKlassen(refreshed);
      if (analyzeKlasse) {
        await loadAufgaben(analyzeKlasse);
      }
    } else {
      setAnalysisFailure('Analyse fehlgeschlagen. Bitte Anbieter und Modell prüfen und manuell erneut versuchen.');
    }
  }, [scanReviews, automaticScan, scanReview, scanReadingRuntime.provider, scanReadingRuntime.model, verifyModel, englischFehler, englischProfil, englischEntwurf, effectiveRuntime.provider, effectiveRuntime.model, effectiveRuntime.reasoning, revisionOfAbgabeId, reanalyzeExisting, contextKey, rubrikListe.defaultRubric, assignments, analyze, analyzeFile, analyzeKlasse, analyzeKlasseId, analyzeAufgabe, analyseKlasseMeta, analyzeAusgangstext, analyzeAusgangstextDatei, listKlassen, loadAufgaben, submissionBlocker, fileChecks, pseudoAktiv, selectedRubrik, zuordnungId, einsatzOptions, selectedEinsatzId]);

  const resolveScan = async (issue: ScanReviewIssue, choice: string) => {
    if (!scanReview) return;
    setScanReviewBusy(true);
    try {
      const {invoke} = await import('@tauri-apps/api/core'); const cfg=loadSettings();
      const updated=await invoke<ScanReviewSession>('natascha_scan_review', {dir:cfg.nataschaDir??'',python:cfg.pythonCommand??'',session:scanReview.id,revision:scanReview.revision,issue:issue.id,choice}); setScanReview(updated);setScanReviews(prev=>({...prev,[analyzeFile]:updated}));
    } catch(e) { setError(String(e)); } finally {setScanReviewBusy(false);}
  };
  const scanImageCache = useRef(new Map<string,Promise<string>>());
  const scanImage = async (issue:ScanReviewIssue) => {
    const {invoke}=await import('@tauri-apps/api/core');const cfg=loadSettings();
    const key=JSON.stringify([scanReview?.id,issue.page,issue.box]);
    let pending=scanImageCache.current.get(key);
    if(!pending){pending=invoke<string>('natascha_scan_review_image',{dir:cfg.nataschaDir??'',python:cfg.pythonCommand??'',session:scanReview?.id,issue:issue.id});scanImageCache.current.set(key,pending);void pending.catch(()=>scanImageCache.current.delete(key));}
    return pending;
  };

  /** Aktuelle Lehrkraftentscheidung: lokaler Overlay schlägt die gespeicherte Aktion. */
  const aktionVon = useCallback((id: number): FehlerAktion => {
    const f = selectedAbgabe?.fehler.find(x => x.id === id);
    const lokal = fehlerAktionen[id];
    return ((lokal ? lokal.aktion : f?.lehrkraftAktion ?? null) as FehlerAktion);
  }, [selectedAbgabe, fehlerAktionen]);

  // Wer steht wo im Text – und welcher Vorschlag verliert seinen Platz an einen anderen.
  const segmentErgebnis = useMemo<SegmentErgebnis | null>(() => {
    const rohtext = selectedAbgabe?.abgabe.rohtext;
    if (!rohtext || !selectedAbgabe) return null;
    return baueFehlerSegmente(rohtext, selectedAbgabe.fehler.map(f => ({
      id: f.id,
      zitat: f.zitat,
      typ: f.typ,
      aktion: befundPruefstatus(f.befund, aktionVon(f.id)).beanstandungVerworfen ? 'verworfen' : aktionVon(f.id),
    })));
  }, [selectedAbgabe, aktionVon]);

  // Gefilterte und sortierte Liste + Laufnummern. Die Nummern hängen an der
  // sichtbaren Reihenfolge, damit Karte und Text dieselbe Ziffer zeigen.
  // Wichtig: auch ohne gespeicherten Rohtext bleibt die Liste bedienbar –
  // Alt-Datensätze haben keinen Text, aber sehr wohl Vorschläge.
  const sortiert = useMemo(() => {
    if (!selectedAbgabe) return null;
    const gefiltert = nurUnsichere
      ? selectedAbgabe.fehler.filter(f => f.vertrauensstufe === 'mittel' || f.vertrauensstufe === 'niedrig' || f.befund?.befundart === 'ungeklaert' || f.befund?.ki_pruefung?.status === 'widerspruch' || befundPruefstatus(f.befund).ersetzungOffen)
      : selectedAbgabe.fehler;
    return sortiereFehler(gefiltert, sortierung, {
      startVon: id => segmentErgebnis ? primaerStart(segmentErgebnis, id) : null,
      aktionVon,
    });
  }, [selectedAbgabe, segmentErgebnis, nurUnsichere, sortierung, aktionVon]);

  const registriereMarkierung = useCallback((id: number, el: HTMLElement | null) => {
    if (el) markRefs.current.set(id, el);
    else markRefs.current.delete(id);
  }, []);

  /** Karte → Text: aktiv setzen und die Markierung in den sichtbaren Bereich holen. */
  const waehleFehler = useCallback((id: number) => {
    setAktiveFehlerId(id);
    const mark = markRefs.current.get(id);
    const pane = textPaneRef.current;
    if (!mark || !pane) {
      setAnkerHinweis(segmentErgebnis
        ? HINWEIS_OHNE_STELLE
        : 'Zu dieser Abgabe ist kein Schülertext gespeichert. Neu analysieren, damit die Stellen im Text markiert werden.');
      return;
    }
    setAnkerHinweis(null);
    zentriereInPaneWennNoetig(pane, mark, respektiereBewegungsreduktion() ? 'auto' : 'smooth');
  }, [segmentErgebnis]);

  /** Text → Karte: dieselbe Auswahl in die Gegenrichtung. */
  const waehleAusText = useCallback((id: number) => {
    setAktiveFehlerId(id);
    const karte = kartenRefs.current.get(id);
    const liste = fehlerListeRef.current;
    if (!karte || !liste) {
      setAnkerHinweis('Dieser Vorschlag ist im Schülertext markiert, aber auf der Fehlerliste gerade ausgeblendet.');
      return;
    }
    setAnkerHinweis(null);
    zentriereInPaneWennNoetig(liste, karte, respektiereBewegungsreduktion() ? 'auto' : 'smooth');
  }, []);

  const auswahlAufheben = useCallback(() => {
    setAktiveFehlerId(null);
    setHoverFehlerId(null);
    setAnkerHinweis(null);
  }, []);

  // Escape löst die Auswahl – auch aus einem offenen Bearbeitungsfeld heraus.
  useEffect(() => {
    if (aktiveFehlerId === null && hoverFehlerId === null && ankerHinweis === null) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') auswahlAufheben(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [aktiveFehlerId, hoverFehlerId, ankerHinweis, auswahlAufheben]);

  const markierungen = useMemo(() => {
    const rohtext = selectedAbgabe?.abgabe.rohtext;
    if (!rohtext || !segmentErgebnis || !sortiert) return null;
    return renderMarkierungen(rohtext, segmentErgebnis, sortiert.nummern, {
      aktiveId: aktiveFehlerId,
      hoverId: hoverFehlerId,
      zeigeNummern,
      registriere: registriereMarkierung,
      onKlick: waehleAusText,
    });
  }, [selectedAbgabe, segmentErgebnis, sortiert, aktiveFehlerId, hoverFehlerId, zeigeNummern, registriereMarkierung, waehleAusText]);

  const pickFile=useCallback(async()=>{
    try{const {open}=await import('@tauri-apps/plugin-dialog');const paths=await open({multiple:revisionOfAbgabeId === null,filters:[{name:'Abgaben',extensions:['docx','pdf','txt','md','odt','jpg','jpeg','png']}]});if(paths)selectFiles(Array.isArray(paths)?paths:[paths]);}
    catch{setError('Die Dateiauswahl konnte nicht geöffnet werden. Bitte erneut versuchen.');}
  },[selectFiles, revisionOfAbgabeId]);

  const readScan = async (file: string) => {
    setOcrBusy(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const cfg = loadSettings();
      const raw = await invoke<string>('natascha_ocr', {
        dir: cfg.nataschaDir ?? '', python: cfg.pythonCommand ?? '', filePath: file,
        ...scanRuntime(ocrProvider, ocrModel, effectiveRuntime), reviewedText: null,
      });
      const result = JSON.parse(raw) as {transkription: string; preview_pages?: string[]};
      setOcrPage(0);
      setOcrReview({file, text: result.transkription, previews: result.preview_pages ?? []});
    } catch (e) { setError(String(e)); }
    finally { setOcrBusy(false); }
  };
  const adoptScan = async () => {
    if (!ocrReview) return;
    setOcrBusy(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const cfg = loadSettings();
      const raw = await invoke<string>('natascha_ocr', {
        dir: cfg.nataschaDir ?? '', python: cfg.pythonCommand ?? '', filePath: ocrReview.file,
        ...scanRuntime(ocrProvider, ocrModel, effectiveRuntime), reviewedText: ocrReview.text,
      });
      const {path} = JSON.parse(raw) as {path: string};
      const assignment = assignments[ocrReview.file];
      setFileChecks(prev => { const next = {...prev}; delete next[path]; return next; });
      const preview = await personenVorschau(path, analyzeKlasse, effectiveRuntime);
      setFileChecks(prev => ({...prev, [path]: preview}));
      if (analyzeFile === path) setPseudoVorschau(preview);
      if (assignment) setAssignments(prev => ({...prev, [path]: assignment}));
      setOcrReview(null);
    } catch (e) { setError(String(e)); }
    finally { setOcrBusy(false); }
  };

  const pickSourceFile = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: false, filters: [{ name: 'Ausgangsmaterial', extensions: ['docx', 'pdf', 'txt', 'md'] }] });
      if (typeof selected === 'string') {
        setAnalyzeAusgangstextDatei(selected);
        setSourcePreview(await sourceText(selected));
      }
    } catch (error) { setSourcePreview(null); setError(error instanceof Error ? error.message : String(error)); }
  }, [sourceText]);

  const baseName = (p: string) => p.split(/[/\\]/).pop() || p;

  const batchStarting=useRef(false);
  const handleBatchAnalyze = useCallback(async () => {
    if (englischFehler) { setError(englischFehler); return; }
    if (batchStarting.current || batchFiles.length === 0 || !analyzeKlasse || !analyzeAufgabe) return;
    if(submissionBlocker) {setError(submissionBlocker);setAnalyzeStep(4);return;}
    batchStarting.current=true;
    const finishActivity=beginActivity('Korrekturstapel');
    try {
    setError(null);
    setAnalysisFailure(null);
    setAnalyzeSuccess(null);
    setBatchRunning(true);
    setBatchResults([]);
    setBatchCurrent(0);
    batchCancelRef.current = false;

    const visionFiles = batchFiles.filter(isVisionPath);
    if (visionFiles.length > 0 && !autoScanProvider) {
      const visionChecks = await Promise.all(visionFiles.map((file) => personenVorschau(file, analyzeKlasse, effectiveRuntime)));
      if (visionChecks.some((preview) => !isSubmissionReady(preview))) {
        setBatchRunning(false);
        setError('Bitte zuerst alle Scan-Abschriften in Schritt 4 prüfen und bestätigen.');
        return;
      }
    }

    const correctionRun = await prepareCorrectionRun({
      provider: effectiveRuntime.provider,
      model: effectiveRuntime.model,
      reasoning: effectiveRuntime.reasoning,
      reanalyzeExisting,
      pseudonymization: pseudoAktiv,
      basis: {
        klasse: analyzeKlasse,
        aufgabe: analyzeAufgabe,
        rubrik: selectedRubrik || rubrikListe.defaultRubric || '',
        ausgangstext: analyzeAusgangstextDatei ? '' : analyzeAusgangstext.trim(),
        unterrichtseinsatzId: einsatzOptions.find((item) => item.id === selectedEinsatzId)?.id ?? null,
        materialId: einsatzOptions.find((item) => item.id === selectedEinsatzId)?.materialId ?? null,
      },
    });
    if (!correctionRun) return;
    const runContextKey = correctionRunContextKey(contextKey, correctionRun);
    const prepared: Record<string,ScanReviewSession> = {};
    const failedRuns: string[] = [];
    const results: { file: string; ok: boolean; msg: string }[] = queueContext === runContextKey ? batchResults.filter(r=>r.ok && batchFiles.includes(r.file)) : [];
    setQueueContext(runContextKey);
    for (let i = 0; i < batchFiles.length; i++) {
      if (batchCancelRef.current) break;
      const file = batchFiles[i]!;
      if(results.some(r=>r.file===file && r.ok))continue;
      setBatchCurrent(i + 1);
      try {
        const einsatz = einsatzOptions.find((e) => e.id === selectedEinsatzId);
        const result = await analyze(file, analyzeKlasse, analyzeAufgabe, { ...englischOptionen,
          scanReview:autoScanProvider&&isVisionPath(file)?{action:'prepare',provider:scanReadingRuntime.provider,model:scanReadingRuntime.model,verifyModel:scanReadingRuntime.provider==='mistral'?verifyModel:scanReadingRuntime.model}:undefined, runtime: { provider: correctionRun.provider, model: correctionRun.model, reasoning: correctionRun.reasoning }, fach: analyseKlasseMeta?.fach || undefined, schulstufe: analyseKlasseMeta?.schulstufe || undefined, textsorte: analyzeTextsorte || undefined, land: korrekturLand ?? 'at', ausgangstext: correctionRun.basis.ausgangstext, grundlageSnapshot: {rubrik_inhalt: correctionRun.basis.rubrikInhalt ?? '', ausgangstext: correctionRun.basis.ausgangstext, grundlage: correctionRun.basis.grundlage}, rubric: correctionRun.basis.rubrik || undefined, reanalyzeExisting: correctionRun.reanalyzeExisting, pseudonymisierung: correctionRun.privacyMode === 'pseudonymisiert', schuelerId: assignments[file] || undefined, einsatzId: correctionRun.basis.unterrichtseinsatzId ?? undefined, materialId: correctionRun.basis.materialId ?? undefined, klasseId: analyseKlasseMeta?.id });
        if (result?.scan_review) {
          prepared[file]=result.scan_review;
          setScanReviews(prev=>({...prev,[file]:result.scan_review}));
          results.push({file,ok:false,msg:'Vorschau vorbereitet – bitte übernehmen'});
        } else if (result) {
          const note = result?.analysis?.notenempfehlung?.note;
          const provisional = result.analysis?.notenempfehlung_vorlaeufig === true
            || result.analysis?.notenempfehlung?.vorlaeufig === true
            || result.analysis?.gegenpruefung?.status === 'pruefung_erforderlich';
          const resultErrors = analyseHinweise(result);
          const duplicate = resultErrors.some((entry) => /duplikat|bereits analysiert/i.test(entry));
          results.push({ file, ok: !duplicate, msg: duplicate ? 'Übersprungen (bereits analysiert)' : `${notenvorschlagText(note, provisional)}${resultErrors.length ? ` · ${resultErrors.join(' ')}` : ''}` });
        } else {
          failedRuns.push(`${baseName(file)}: Analyse fehlgeschlagen.`);
          results.push({ file, ok: false, msg: 'Nicht abgeschlossen — Details in Schritt 5' });
        }
      } catch (e) {
        failedRuns.push(`${baseName(file)}: ${e instanceof Error ? e.message : 'Analyse fehlgeschlagen.'}`);
        results.push({ file, ok: false, msg: 'Nicht abgeschlossen — Details in Schritt 5' });
      }
      setBatchResults([...results]);
    }

    const firstPrepared=Object.keys(prepared)[0];
    if(firstPrepared){setAnalyzeFile(firstPrepared);setScanReview(prepared[firstPrepared]!);setAnalyzeStep(5);}
    setBatchRunning(false);
    const okCount = results.filter((r) => r.ok).length;
    setAnalyzeSuccess(`Stapel fertig: ${okCount}/${batchFiles.length} erfolgreich${batchCancelRef.current ? ' (abgebrochen)' : ''}.`);
    if (failedRuns.length > 0) {
      setAnalysisFailure(failedRuns.join('\n'));
      setAnalyzeStep(5);
    }
    const refreshed = await listKlassen();
    setKlassen(refreshed);
    if (analyzeKlasse) await loadAufgaben(analyzeKlasse);
    } catch(e) {setAnalysisFailure(e instanceof Error ? e.message : 'Der Korrekturstapel konnte nicht abgeschlossen werden.');setAnalyzeStep(5);}
    finally {setBatchRunning(false);batchStarting.current=false;finishActivity();}
  }, [autoScanProvider, scanReadingRuntime.provider, scanReadingRuntime.model, verifyModel, englischFehler, englischProfil, englischEntwurf, effectiveRuntime.provider, effectiveRuntime.model, effectiveRuntime.reasoning, contextKey, queueContext, rubrikListe.defaultRubric, assignments, batchResults, submissionBlocker, batchFiles, analyzeKlasse, analyzeAufgabe, analyseKlasseMeta, analyzeAusgangstext, analyzeAusgangstextDatei, analyze, personenVorschau, listKlassen, loadAufgaben, pseudoAktiv, selectedRubrik, einsatzOptions, selectedEinsatzId]);

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

      {!analyzeOpen && (batchRunning || analyzing) && <CorrectionProgress reducedMotion={settings.reduceMotion} stage={progressStage} message={progressMessage} current={batchCurrent} total={batchFiles.length} onOpen={()=>setAnalyzeOpen(true)}/>}
      {!analyzeOpen && !queueRunning && scanReview && <div role="status" style={{margin:'1rem 0'}}>Die Scan-Vorschau ist bereit. <button type="button" className="btn-primary" onClick={()=>{setAnalyzeStep(5);setAnalyzeOpen(true);}}>Lesestellen prüfen und Entwurf übernehmen</button></div>}
      <div style={{marginBottom:'1rem'}}><button className="btn-secondary" disabled={queueRunning} onClick={()=>{setBatchFiles([]);setBatchResults([]);setAnalyzeFile('');setAnalyzeKlasse('');setAnalyzeAufgabe('');setSelectedRubrik('');setAnalyzeTextsorte('');setAnalyzeProvider('');setAnalyzeModel('');setAnalyzeAusgangstext('');setAnalyzeAusgangstextDatei('');setSelectedEinsatzId('');setAssignments({});setPseudoAktiv(true);setError(null);setAnalysisFailure(null);setRevisionOfAbgabeId(null);setReanalyzeExisting(false);setAnalyzeSuccess(null);setAnalyzeStep(1);setAnalyzeOpen(true);}}>Neuer Korrekturauftrag</button></div>
      {batchResults.length>0 && !analyzeOpen && <details className="queue-results"><summary>Letzter Auftrag: {batchResults.filter(r=>r.ok).length} abgeschlossen</summary>{batchResults.map(r=><p key={r.file}>{baseName(r.file)} — {r.msg}</p>)}<button className="btn-secondary" onClick={()=>setAnalyzeOpen(true)}>Auftrag öffnen / fehlende Dateien fortsetzen</button></details>}
      <div className="correction-workspace" aria-busy={deleteAuftragBusy} style={{ pointerEvents: deleteAuftragBusy ? 'none' : undefined, opacity: deleteAuftragBusy ? 0.7 : undefined, display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr)', gap: '1.25rem' }}>
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
                    disabled={retroBusy || deleteAuftragBusy || queueRunning || !selectedKlasse}
                    title="Bestehende Analyse-JSONs (output/…/feedback_data) in die Datenbank importieren"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                  >
                    {retroBusy ? <Loader2 size={12} className="spin" /> : <FileDown size={12} style={{ transform: 'rotate(180deg)' }} />} Retro-Import
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => void handleDeleteAuftrag()}
                    disabled={!selectedAufgabe || queueRunning || retroBusy || saving || exportBusy || deleteAuftragBusy}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', padding: '0.25rem 0.6rem', color: 'var(--color-error)' }}>
                    {deleteAuftragBusy ? <Loader2 size={12} className="spin" /> : <Trash2 size={12} />} Auftrag löschen
                  </button>
                  <InfoDot text="Entfernt alle gespeicherten Korrekturen zur ausgewählten Aufgabe, einschließlich Retro-Importen, Korrekturversionen und Lehrkraftnoten. Vorher siehst du die Anzahl und bestätigst die Löschung. Originaldateien und exportierte Dokumente bleiben auf der Festplatte." />
                  {onGenerateUebung && (() => {
                    const geprueft = abgaben.filter((a) => a.hatLehrerFeedback).length;
                    const bereit = !!selectedAufgabe && geprueft > 0;
                    return (
                      <button
                        className="btn-secondary"
                        onClick={() => void handleFolgeuebung()}
                        disabled={loopBusy || !bereit}
                        title={!selectedAufgabe
                          ? 'Erst eine Schularbeit auswählen.'
                          : geprueft === 0
                            ? 'Erst mindestens eine Abgabe prüfen und freigeben.'
                            : `Übung zu den Fehlerschwerpunkten dieser Schularbeit (${geprueft} von ${abgaben.length} Abgaben geprüft). Nur übernommene und geänderte Befunde zählen.`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                      >
                        {loopBusy ? <Loader2 size={12} className="spin" /> : <Wand2 size={12} />} Folgeübung erstellen
                      </button>
                    );
                  })()}
                </div>
                {loopHinweis && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>{loopHinweis}</p>}
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
                          <td style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}><Notenvorschlag note={a.note} vorlaeufig={a.notenempfehlungVorlaeufig} /></td>
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
                        onClick={() => onOpenSchueler(selectedAbgabe.abgabe.klasse, selectedAbgabe.abgabe.schuelerId!, selectedAbgabe.abgabe.klasseId)}
                        title="Zum Schülerprofil (Längsschnitt)"
                        style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'var(--color-accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      >
                        {schuelerName(selectedAbgabe.abgabe)}
                      </button>
                    ) : schuelerName(selectedAbgabe.abgabe)}
                    {' '}— {selectedAbgabe.abgabe.aufgabe}
                  </h4>
                  <button className="btn-secondary" onClick={() => void handleGenerateDocx()} disabled={saving || exportBusy} style={{display:'inline-flex',alignItems:'center',gap:'.4rem'}}>
                    {exportBusy ? <Loader2 size={15} className="animate-spin"/> : <FileDown size={15}/>} {exportBusy?'Lehrkraftbericht wird erstellt …':'Lehrkraftbericht als Word'}
                  </button>
                </div>
                <p style={{fontSize:'.75rem',color:'var(--color-text-secondary)'}}>Der Lehrkraftbericht enthält die Korrektur und den Prüfstand. Ungeprüfte KI-Hinweise bleiben als Vorschläge gekennzeichnet. Der Export gibt keine Schülerfassung frei.</p>
                {docxErfolg && <TeacherReportFile path={docxErfolg} onOpenFolder={()=>void handleShowDocx()} onClose={()=>setDocxErfolg(null)} onAttach={selectedAbgabe.abgabe.unterrichtseinsatzId ? ()=>void handleFeedbackAmTermin() : undefined} attached={feedbackAmTermin}/>}

                <PunkteKorrekturPanel
                  abgabeId={selectedAbgabe.abgabe.id}
                  materialId={selectedAbgabe.abgabe.materialId}
                  aufgabe={selectedAbgabe.abgabe.aufgabe}
                  getPunktebewertung={getPunktebewertung}
                  savePunktebewertung={savePunktebewertung}
                />

                <div className="korrektur-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 440px) 1fr', gap: '1.25rem', alignItems: 'start' }}>
                  {/* Linke Spalte: Analyse-Rail */}
                  <div>
                    <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Notenempfehlung</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                          <Notenvorschlag note={selectedAbgabe.abgabe.note} vorlaeufig={selectedAbgabe.notenempfehlungVorlaeufig || selectedAbgabe.abgabe.notenempfehlungVorlaeufig} />
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
                          {selectedAbgabe.rasterAuswertung ? "Rasterdurchschnitt (0–10)" : "Gesamtstufe"}
                          <InfoDot text={selectedAbgabe.rasterAuswertung ? "Gleichgewichtete Rasterpunkte nach Wortzahlabzug. Die Schulnote erfordert einen bestätigten Notenschlüssel." : "Kompetenzstufe des ursprünglichen Rasters (1–5)."} />
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                          {selectedAbgabe.rasterAuswertung ? (selectedAbgabe.rasterAuswertung.punkte / 4).toFixed(2) : selectedAbgabe.abgabe.gesamtstufe !== null ? selectedAbgabe.abgabe.gesamtstufe.toFixed(2) : '—'}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '0.65rem 0.75rem', marginBottom: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', fontSize: '0.75rem' }}>
                      <strong>KI-Lauf:</strong> {selectedAbgabe.abgabe.provider ?? 'Anbieter unbekannt'} · {selectedAbgabe.abgabe.model ?? 'Modell unbekannt'}
                      {selectedAbgabe.reasoning && <> · Denkmodus: {DENK_LABELS[selectedAbgabe.reasoning.selection] ?? selectedAbgabe.reasoning.selection}</>}
                      {selectedAbgabe.revisions.find((revision) => revision.isActive) && <> · Version {selectedAbgabe.revisions.find((revision) => revision.isActive)?.revisionNo}</>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
                      <button className="btn-secondary" onClick={handleReanalyze} style={{ fontSize: '0.75rem' }}><RefreshCw size={13} /> Neu korrigieren</button>
                    </div>
                    {selectedAbgabe.revisions.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <h5 style={{ fontSize: '0.8125rem', margin: '0 0 0.4rem' }}>Korrekturversionen</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {selectedAbgabe.revisions.map((revision) => (
                            <div key={revision.id} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <button className="btn-secondary" aria-pressed={revision.isActive} disabled={saving || exportBusy} onClick={() => void handleActivateRevision(revision.id)} style={{ flex: 1, textAlign: 'left', fontSize: '0.72rem', borderColor: revision.isActive ? 'var(--color-accent)' : undefined }}>
                                Version {revision.revisionNo} · {revision.provider} · {revision.model}{revision.isActive ? ' · aktiv' : ''}
                              </button>
                              <button className="btn-secondary" disabled={saving || exportBusy} title={`Version ${revision.revisionNo} löschen`} aria-label={`Version ${revision.revisionNo} löschen`} onClick={() => void handleDeleteRevision(revision.id)} style={{ padding: '0.3rem' }}><Trash2 size={13} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedAbgabe.kriterien.length > 0 && (
                      <div style={{ marginBottom: '1.25rem' }}>
                        {selectedAbgabe.rasterAuswertung && <section aria-label="Englisch-Rasterauswertung" style={{ marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
                          <strong>{selectedAbgabe.rasterAuswertung.punkte} / {selectedAbgabe.rasterAuswertung.max_punkte} Rasterpunkte</strong>
                          <p>{selectedAbgabe.rasterAuswertung.bewertungsprofil} · Fassung {selectedAbgabe.rasterAuswertung.profil_version} · Lehrkraftprüfung erforderlich</p>
                          <p>Wortanzahl: {selectedAbgabe.rasterAuswertung.wortzahl_ist} / {selectedAbgabe.rasterAuswertung.wortzahl_soll ?? 'nicht vorgegeben'} · Abzug bei Aufgabenerfüllung: {selectedAbgabe.rasterAuswertung.wortzahl_abzug}</p>
                          {selectedAbgabe.rasterAuswertung.veto_vorschlag && <p>Vorschlag Aufgabenverfehlung: bitte gesondert prüfen. Die übrigen Kriterien sind unbewertet.</p>}
                        </section>}
                        <h5 style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>Kriterien</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.375rem' }}>
                          {selectedAbgabe.kriterien.map((k) => (
                            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius)' }}>
                              <span style={{ fontSize: '0.8125rem' }}>{kriteriumAnzeige(k.kriteriumName)}</span>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                {k.stufe !== null ? `${k.stufe.toFixed(1)}` : '—'}
                                {k.gewichtung !== null ? ` (${(k.gewichtung * 100).toFixed(0)}%)` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedAbgabe.qualitaetswarnungen?.some(w=>w.code==='sprachmodus') && <p role="status">Nur Sprache geprüft · Inhalt und Umfangsabzug nicht beauftragt · keine automatische Gesamtnote.</p>}
                    {selectedAbgabe.scanReview && <p role="status">Bildabgleich durchgeführt · {selectedAbgabe.scanReview.openCount} Lesestellen offen{selectedAbgabe.scanReview.numericBlocked ? ' – qualitative Rückmeldung, keine Rasterpunkte oder automatische Note' : ''}.</p>}
                    {(selectedAbgabe.qualitaetswarnungen?.filter(w => !['bewertung_kriterium_offen','sprachmodus'].includes(w.code)).length ?? 0) > 0 && (
                      <div role="alert" style={{ marginBottom: '1rem', padding: '0.625rem 0.75rem', border: '1px solid color-mix(in srgb, var(--color-warning, #f59e0b) 55%, var(--color-border))', borderRadius: 'var(--radius)', background: 'var(--color-bg-surface, #fffaf0)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                          <AlertTriangle size={14} /> {selectedAbgabe.qualitaetswarnungen?.some(w => w.code === "antwort_technisch_unvollstaendig") ? "Antwort technisch unvollständig" : selectedAbgabe.qualitaetswarnungen?.some(w => ["umfangsvorgabe_pruefen", "bewertungsgrundlage_pruefen"].includes(w.code)) ? "Bewertungsgrundlage offen" : "Fachliche Entscheidung erforderlich"}
                        </div>
                        <details><summary>Weitere Prüfnachweise anzeigen</summary><ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {[...new Set((selectedAbgabe.qualitaetswarnungen ?? []).filter(w => !['bewertung_kriterium_offen','sprachmodus'].includes(w.code)).map(w => w.message))].map(message => <li key={message}>{message}</li>)}
                        </ul></details>
                      </div>
                    )}
                    {selectedAbgabe.fehler.length > 0 && sortiert && (() => {
                      const total = selectedAbgabe.fehler.length;
                      const aktionCount = (a: FehlerAktion) => selectedAbgabe.fehler.filter(f => aktionVon(f.id) === a).length;
                      const verworfen = aktionCount('verworfen');
                      const uebernommen = aktionCount('uebernommen');
                      const geaendert = aktionCount('geaendert');
                      const offen = total - verworfen - uebernommen - geaendert;
                      const avgStufe = averageVertrauensstufe(
                        selectedAbgabe.fehler.map(f => f.vertrauensstufe),
                      );
                      // „Nur unsichere“ (L2): Review-Modus für die Ampel — zeigt
                      // gelb/rot, damit die Lehrkraft gezielt die kritischen
                      // Vorschläge durchgeht.
                      const unsicherCount = selectedAbgabe.fehler.filter(f => f.vertrauensstufe === 'mittel' || f.vertrauensstufe === 'niedrig' || f.befund?.befundart === 'ungeklaert' || f.befund?.ki_pruefung?.status === 'widerspruch' || befundPruefstatus(f.befund).ersetzungOffen).length;
                      const zugeordnet = sortiert.zugeordnet;
                      const vorbereitetIds = new Set(vorbereiteteBefunde(selectedAbgabe.fehler).map(f => f.id));
                      const verwaist = sortiert.nichtZuordenbar;
                      const pill = (an: boolean) => ({
                        background: an ? 'var(--color-accent)' : 'transparent',
                        color: an ? '#fff' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '999px',
                        padding: '0.1rem 0.5rem',
                        fontSize: '0.6875rem',
                        cursor: 'pointer',
                      });
                      const sortierModus = SORTIER_MODI.find(m => m.wert === sortierung);

                      /** Eine Fehlerkarte. Die Kopfzeile ist ein echter Button, dessen
                       *  ::after über die ganze Karte spannt: so ist die Karte per
                       *  Tastatur und mit einem Klick überall erreichbar, ohne die
                       *  Aktionsknöpfe darin zu verschachteln. */
                      const karte = (f: FehlerRow) => {
                        const aktion = aktionVon(f.id);
                        const pruefung = befundPruefstatus(f.befund, aktion);
                        const stufe = f.vertrauensstufe;
                        const effektiveKorrektur = fehlerAktionen[f.id]?.korrektur ?? f.lehrkraftKorrektur ?? f.korrektur;
                        const isEditing = editFehlerId === f.id;
                        const isVerworfen = aktion === 'verworfen' || pruefung.beanstandungVerworfen;
                        const isAktiv = aktiveFehlerId === f.id;
                        const nr = sortiert.nummern.get(f.id);
                        const ankerStatus = segmentErgebnis?.anker.get(f.id)?.status;
                        const ohneStelle = ankerStatus === 'keiner';
                        const verdraengt = segmentErgebnis?.ohnePlatz.includes(f.id) ?? false;
                        const farbe = isVerworfen || f.befund?.befundart === 'ungeklaert' ? '#999' : f.befund?.befundart === 'stilalternative' ? '#346fa1' : FEHLER_COLORS[f.typ] ?? '#999';
                        const sprungTitel = ohneStelle
                          ? 'Zitat nicht im Schülertext auffindbar'
                          : verdraengt
                            ? 'Diese Textstelle ist schon von einem anderen Vorschlag markiert'
                            : `Im Schülertext anzeigen — ${ANKER_LABELS[ankerStatus!] ?? ''}`;
                        return (
                          <div
                            key={f.id}
                            ref={(el) => { if (el) kartenRefs.current.set(f.id, el); else kartenRefs.current.delete(f.id); }}
                            className={`fehler-card${isAktiv ? ' is-aktiv' : ''}${isVerworfen ? ' is-verworfen' : ''}`}
                            onMouseEnter={() => setHoverFehlerId(f.id)}
                            onMouseLeave={() => setHoverFehlerId(h => h === f.id ? null : h)}
                            style={{ padding: '0.5rem 0.75rem', marginBottom: '0.375rem', background: isVerworfen ? 'var(--color-bg-surface, #f5f5f5)' : 'var(--color-bg-base)', borderRadius: 'var(--radius)', borderLeft: `3px solid ${farbe}` }}
                          >
                            <button
                              type="button"
                              className="fehler-sprung"
                              onClick={() => waehleFehler(f.id)}
                              aria-current={isAktiv ? 'true' : undefined}
                              title={sprungTitel}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.375rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', minWidth: 0 }}>
                                  {nr !== undefined && (
                                    <span className="fehler-nummer" style={{ color: farbe }} aria-hidden="true">{nr}</span>
                                  )}
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: farbe, textDecoration: isVerworfen ? 'line-through' : 'none' }}>
                                    {pruefung.beanstandungVerworfen ? 'KI-Beanstandung zurückgewiesen – kein Schülerfehler' : f.befund?.befundart === 'stilalternative' ? 'Stilidee – freiwillig' : f.befund?.befundart === 'ungeklaert' ? 'Offener Befund – bitte prüfen' : FEHLER_LABELS[f.typ] ?? f.typ}
                                  </span>
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  {(ohneStelle || verdraengt) && (
                                    <span role="img" aria-label={ohneStelle ? 'nicht im Schülertext auffindbar' : 'Textstelle bereits belegt'} title={sprungTitel} style={{ display: 'inline-flex' }}>
                                      <Unlink size={12} style={{ color: 'var(--color-text-muted)' }} />
                                    </span>
                                  )}
                                  {stufe && (stufe in VERTRAUENS_LABELS) && (
                                    <span role="img" aria-label={`Textzuordnung: ${VERTRAUENS_LABELS[stufe as keyof typeof VERTRAUENS_LABELS]}`} title={VERTRAUENS_LABELS[stufe as keyof typeof VERTRAUENS_LABELS]} style={{ width: 8, height: 8, borderRadius: '50%', background: VERTRAUENS_COLORS[stufe as keyof typeof VERTRAUENS_COLORS] ?? '#999', flexShrink: 0 }} />
                                  )}
                                  {aktion === 'uebernommen' && <Check size={13} aria-label="übernommen" style={{ color: '#27ae60' }} />}
                                  {aktion === 'geaendert' && <Pencil size={13} aria-label="geändert" style={{ color: '#9b59b6' }} />}
                                  {aktion === 'verworfen' && <X size={13} aria-label="verworfen" style={{ color: '#e74c3c' }} />}
                                </span>
                              </span>
                              {f.zitat && <span style={{ display: 'block', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: '0.125rem', textDecoration: isVerworfen ? 'line-through' : 'none' }}>"{f.zitat}"</span>}
                              {/* Korrektur und Erklärung liegen mit in der Sprungfläche: die ganze
                                  Karte ist eine Fläche – bleibt aber markierbar, und es gibt
                                  genau einen Tabstopp statt drei verschachtelter Bedienelemente. */}
                              {!isEditing && effektiveKorrektur && <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.125rem', color: aktion === 'geaendert' ? '#9b59b6' : undefined }}>→ {effektiveKorrektur}</span>}
                              {f.befund?.ki_pruefung && <span style={{display:'block',fontSize:'0.6875rem'}}>KI-Gegenprüfung: {f.befund.ki_pruefung.status === 'nicht_geprueft' ? 'offen' : f.befund.ki_pruefung.status}{f.befund.ki_pruefung.begruendung ? ` · ${f.befund.ki_pruefung.begruendung}` : ''}</span>}
                              {pruefung.ersetzungOffen && !pruefung.beanstandungVerworfen && <span style={{display:'block',fontSize:'0.6875rem'}}>Ersetzung im Satz prüfen – nur Kommentar.{f.befund?.ersetzungspruefung?.begruendung ? ` ${f.befund.ersetzungspruefung.begruendung}` : ''}</span>}
                              {!isEditing && f.erklaerung && <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{f.erklaerung}</span>}
                            </button>
                            {isEditing && (
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
                            )}
                            {!isEditing && (
                              <div className="fehler-aktionen">
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
                      };

                      return (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                          <h5 style={{ fontSize: '0.8125rem', margin: 0 }}>
                            Fehler ({zugeordnet.length + verwaist.length === total ? total : `${zugeordnet.length + verwaist.length} von ${total}`})
                          </h5>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            <button type="button" aria-pressed={nurUnsichere} onClick={() => setNurUnsichere(v => !v)} style={pill(nurUnsichere)} title="Zeigt Vorschläge mit unsicherer Textzuordnung oder offener Gegenprüfung">
                              Nur unsichere ({unsicherCount})
                            </button>
                            {uebernommen > 0 && <span style={{ color: '#27ae60' }} title={`${uebernommen} übernommen`} aria-label={`${uebernommen} übernommen`}>✓ {uebernommen}</span>}
                            {geaendert > 0 && <span style={{ color: '#9b59b6' }} title={`${geaendert} geändert`} aria-label={`${geaendert} geändert`}>✎ {geaendert}</span>}
                            {verworfen > 0 && <span style={{ color: '#e74c3c' }} title={`${verworfen} verworfen`} aria-label={`${verworfen} verworfen`}>✕ {verworfen}</span>}
                            {offen > 0 && <span style={{ color: 'var(--color-text-secondary)' }} title={`${offen} offen`} aria-label={`${offen} offen`}>○ {offen}</span>}
                            {avgStufe && (
                              <span role="img" aria-label={`Durchschnittliche Textzuordnung: ${VERTRAUENS_LABELS[avgStufe]}`} title={VERTRAUENS_LABELS[avgStufe]} style={{ width: 8, height: 8, borderRadius: '50%', background: VERTRAUENS_COLORS[avgStufe], display: 'inline-block' }} />
                            )}
                          </span>
                        </div>
                        <div className="fehler-kopf-toolbar">
                          <label htmlFor="korrektur-sortierung">Reihenfolge</label>
                          <select
                            id="korrektur-sortierung"
                            className="korrektur-sort"
                            value={sortierung}
                            onChange={(e) => setSortierung(e.target.value as SortierModus)}
                            title={sortierModus?.hinweis}
                          >
                            {SORTIER_MODI.map(m => <option key={m.wert} value={m.wert}>{m.label}</option>)}
                </select>
                {verstaendnisGewaehlt && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-warning, #b8860b)' }}>
                    Dieses Raster prüft Verstehen — dafür wird im nächsten Schritt der Ausgangstext gebraucht.
                  </p>
                )}
                          <button
                            type="button"
                            aria-pressed={zeigeNummern}
                            onClick={() => setZeigeNummern(v => !v)}
                            style={pill(zeigeNummern)}
                            title="Nummern im Schülertext ein- oder ausblenden"
                          >
                            Nr. im Text
                          </button>
                        </div>
                        <p style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
                          Ein Klick auf einen Vorschlag holt die Stelle im Schülertext in den Blick. Die Nummer auf der Karte steht auch am Text.
                        </p>
                        <div ref={fehlerListeRef} style={{ maxHeight: '48vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                          <h6>Zur Übernahme vorbereitet</h6>
                          <button type="button" className="btn-secondary" disabled={saving || exportBusy} onClick={() => {
                            setFehlerAktionen(previous => uebernehmeVorbereiteteBefunde(selectedAbgabe.fehler,previous));
                          }}>Vorbereitete Hinweise gesammelt übernehmen</button>
                          {zugeordnet.filter(f => vorbereitetIds.has(f.id)).map(karte)}
                          <details><summary>Entscheidung erforderlich – offene Hinweise sind im Schülerfeedback zunächst ausgeschlossen</summary>
                            {zugeordnet.filter(f => befundGruppe(f.befund) === 'entscheidung' || (befundGruppe(f.befund) === 'vorbereitet' && !vorbereitetIds.has(f.id))).map(karte)}
                          </details>
                          <details><summary>Optionale Anregungen</summary>{zugeordnet.filter(f => befundGruppe(f.befund) === 'anregung').map(karte)}</details>
                          <details><summary>Zurückgewiesene Beanstandungen</summary>{zugeordnet.filter(f => befundGruppe(f.befund) === 'verworfen').map(karte)}</details>
                          {verwaist.length > 0 && (
                            <>
                              <div className="fehler-gruppe">
                                {segmentErgebnis
                                  ? `nicht im Schülertext auffindbar (${verwaist.length})`
                                  : `kein Schülertext gespeichert – neu analysieren (${verwaist.length})`}
                              </div>
                              {verwaist.map(karte)}
                            </>
                          )}
                        </div>
                        {ankerHinweis && <p className="fehler-liste-hinweis">{ankerHinweis}</p>}
                      </div>
                      );
                    })()}

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                      <h5 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>Lehrkraftprüfung</h5>
                      {(selectedAbgabe.bewertungspruefung?.aufgaben.length ?? 0) > 0 && <div>
                        <p>Nur diese Bewertungskriterien sind noch offen. Gültige Teilbewertungen bleiben erhalten.</p>
                        {selectedAbgabe.bewertungspruefung?.aufgaben.map(task => task.pruefart === "technik" ? <p key={task.id}>Antwort technisch unvollständig. Dieses Kriterium bleibt gesperrt; eine manuelle Reparatur von Befundverweisen ist nicht erforderlich.</p> : <label key={task.id} style={{display:'block',marginBottom:'.75rem'}}>
                          {task.beschreibung}
                          <select disabled={saving || exportBusy} value={kriterienEntscheidungen[task.kriterium]?.stufe ?? ''} onChange={event => {
                            const value = event.target.value;
                            setKriterienEntscheidungen(previous => {const next = {...previous}; if (value) next[task.kriterium] = {stufe:Number(value),begruendung:'Von der Lehrkraft geprüft.'}; else delete next[task.kriterium]; return next;});
                          }}><option value="">Noch offen</option>{[1,2,3,4,5].map(level => <option key={level} value={level}>Stufe {level}{task.stufe === level ? ' – vorgeschlagen' : ''}</option>)}</select>
                        </label>)}
                      </div>}
                      {Object.keys(kriterienEntscheidungen).length > 0 && <details><summary>Eigene Kriterienentscheidungen</summary>
                        {Object.entries(kriterienEntscheidungen).map(([key, decision]) => <label key={key} style={{display:'block'}}>
                          {kriteriumAnzeige(key.split('.').pop() ?? key)}
                          <select value={decision.stufe} disabled={saving || exportBusy} onChange={event => setKriterienEntscheidungen(previous => ({...previous,[key]:{...decision,stufe:Number(event.target.value)}}))}>
                            {[1,2,3,4,5].map(level => <option key={level} value={level}>Stufe {level}</option>)}
                          </select>
                          <button type="button" disabled={saving || exportBusy} onClick={() => setKriterienEntscheidungen(previous => {const next={...previous};delete next[key];return next;})}>Entscheidung zurücksetzen</button>
                        </label>)}
                      </details>}
                      <p style={{fontSize:"0.75rem"}}>Die Lehrernote ist optional. Die Schülerfassung enthält nur übernommene Hinweise; eine Note erscheint erst nach Freigabe. Offene Formulierungsvorschläge müssen nicht einzeln abgearbeitet werden.</p>
                      <p>{selectedAbgabe.lehrerFeedback?.pruefstatus === 'freigegeben' && !kriterienDirty && Object.keys(fehlerAktionen).length === 0 && !feedbackDrafts[selectedAbgabe.abgabe.id] ? 'Freigegeben' : 'KI-Vorschlag — Prüfung offen'}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', alignItems: 'start' }}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: '2' }}>Note</label>
                        <input
                          type="number" min="1" max={maxLehrernote(korrekturLand)} step="0.25"
                          value={teacherNote}
                          disabled={saving || exportBusy}
                          onChange={(e) => changeFeedback(e.target.value,teacherComment)}
                          placeholder="Optional"
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
                        <button className="btn-primary" onClick={() => void handleSaveFeedback()} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
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
                      {markierungen && (
                        <button
                          onClick={() => setShowPreview((v) => !v)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.2rem 0.5rem',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', cursor: 'pointer' }}
                        >
                          {showPreview ? <><EyeOff size={12} /> Verbergen</> : <><Eye size={12} /> Anzeigen</>}
                        </button>
                      )}
                    </div>
                    {!markierungen ? (
                      <div style={{ padding: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius)' }}>
                        Für diese Abgabe ist kein Schülertext gespeichert (Alt-Datensatz).
                        Neu analysieren, um die markierte Vorschau zu sehen.
                      </div>
                    ) : showPreview && (
                      <div
                        ref={textPaneRef}
                        className="textpane"
                        data-fokus={aktiveFehlerId !== null ? 'true' : undefined}
                        onClick={(e) => { if (e.target === e.currentTarget) auswahlAufheben(); }}
                        style={{
                          maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', padding: '2rem', lineHeight: 1.8,
                          fontSize: '0.9rem', fontFamily: 'Georgia, serif',
                          background: '#fff', color: '#222',
                          border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}
                      >
                        {markierungen}
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #ddd', paddingTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          {Object.entries(FEHLER_LABELS).map(([typ, label]) => (
                            <span key={typ} style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 2, background: (FEHLER_COLORS[typ] ?? '#999') + '44', border: `2px solid ${FEHLER_COLORS[typ] ?? '#999'}`, display: 'inline-block' }} />
                              {label}
                            </span>
                          ))}
                          <span style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#99999933', border: '2px dashed #777', display: 'inline-block' }} />
                            mehrdeutig (an allen Fundstellen)
                          </span>
                          <span style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ffffff', border: '2px solid #1F3A5A', boxShadow: '0 0 0 1px #1F3A5A', display: 'inline-block' }} />
                            ausgewählt
                          </span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={closeAnalyze}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="correction-import-title" tabIndex={-1} className="correction-import" style={{ ...cardStyle, width: 760, maxWidth:'calc(100vw - 2rem)', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 id="correction-import-title" style={{ fontSize: '1.2rem', margin: '0 0 0.25rem' }}>Korrekturauftrag</h3>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  {s > 1 && <span style={{ margin: '0 0.125rem' }}>·</span>}
                  <span style={{ fontWeight: analyzeStep === s ? 700 : 400, color: analyzeStep === s ? 'var(--color-text)' : undefined }}>
                    {s}. {s === 1 ? 'Klasse & Aufgabe' : s === 2 ? 'Textsorte & Raster' : s === 3 ? 'Material' : s === 4 ? 'Abgaben' : 'Übersicht'}
                    <InfoDot text={[
                      'Wähle Klasse und Aufgabe. Sie ordnen die Ergebnisse zu. Anbieter, Modell und Denkmodus bestimmen, welche KI diesen Auftrag bearbeitet.',
                      'Wähle die Textsorte und das passende Bewertungsraster. Das Raster legt fest, nach welchen Kriterien die Arbeit beurteilt wird.',
                      'Hinterlege den Ausgangstext mit Arbeitsaufträgen und den Erwartungshorizont. So kann die KI Inhalt und Aufgabenerfüllung am richtigen Material prüfen.',
                      'Füge die Schülerarbeiten hinzu und prüfe die Personenzuordnung. Bei Scans bestätigst du zuerst die Abschrift; offene Lesestellen bleiben als unsicher gekennzeichnet.',
                      'Prüfe Grundlage, Zuordnung und KI-Auswahl vor dem Start. Hier kannst du bereits korrigierte Arbeiten erneut bearbeiten lassen. Ergebnisse bleiben Vorschläge, bis du sie prüfst und freigibst.',
                    ][s - 1]!} />
                  </span>
                </span>
              ))}
            </div>

            {error && <p role="alert" className="session-warning">{error}</p>}
            {queueRunning && <div style={{position:"sticky",top:0,zIndex:2,background:"var(--color-bg-base)"}}><CorrectionProgress reducedMotion={settings.reduceMotion} stage={progressStage} message={progressMessage} current={batchCurrent} total={batchFiles.length}/></div>}
            <fieldset disabled={queueRunning} style={{border:0,padding:0,margin:0,minWidth:0}}>

            {/* ─── Schritt 1: Klasse & Aufgabe + Anbieter/Modell ─── */}
            {analyzeStep === 1 && (<>
              <div style={{ marginBottom: '0.75rem' }}>
                <label>Unterrichtseinsatz <InfoDot text="Verknüpft die Korrektur mit einer gespeicherten Unterlage. Vorhandenes Ausgangsmaterial und Raster können übernommen werden. Ohne Verknüpfung wählst du die Grundlage selbst." /><span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span></label>
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

              {landHinweis && (
                <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                  {landHinweis}
                </div>
              )}

              <div style={{ marginBottom: '0.75rem' }}>
                <label>Klasse</label>
                <select
                  value={analyseKlasseKey}
                  onChange={(e) => {
                    const selected = analyseKlassen.find((klasse) => klasse.key === e.target.value);
                    if (selected) {
                      setAnalyzeKlasse(selected.name);
                      setAnalyzeKlasseId(selected.id ?? '');
                    } else {
                      setAnalyzeKlasse(normalizeKlasse(e.target.value));
                      setAnalyzeKlasseId('');
                    }
                    setAnalyzeAufgabe('');setAssignments({});setSelectedRubrik('');setAnalyzeTextsorte('');setBatchResults([]);
                    // Der Ausgangstext gehört zu EINER Aufgabe. Ohne ihn
                    // mitzuleeren, stuende nach dem Wechsel der Text der
                    // vorigen Aufgabe im Feld — und niemand korrigiert
                    // absichtlich gegen den falschen Text.
                    setAnalyzeAusgangstext('');setAnalyzeAusgangstextDatei('');setAusgangstextHerkunft('');
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">Klasse auswählen</option>
                  {analyseKlassen.map((klasse) => (
                    <option key={klasse.key} value={klasse.key}>{klasse.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label>Aufgabe</label>
                <input
                  type="text"
                  list="korrektur-aufgaben-optionen"
                  value={analyzeAufgabe}
                  onChange={(e) => {
                    setAnalyzeAufgabe(e.target.value);
                    // Beim Tippen zählt jede Änderung als neue Aufgabe: sonst
                    // hinge der Quelltext der ersten drei Buchstaben an der
                    // Aufgabe "SA2" und würde beim Weitertippen mitlaufen.
                    setAnalyzeAusgangstext('');setAnalyzeAusgangstextDatei('');setAusgangstextHerkunft('');
                    setVorbelegtFuer('');
                  }}
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
                    onChange={(e) => { setAnalysisFailure(null); setError(null); setAnalyzeReasoning(undefined); setAnalyzeProvider(e.target.value); setAnalyzeModel(LLM_PROVIDERS.find(p => p.id === e.target.value)?.models[0] ?? ''); }}
                    style={{ flex: 1 }}
                  >
                    {LLM_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <select
                    value={analyzeModel || settings.defaultModel}
                    onChange={(e) => { setAnalysisFailure(null); setError(null); setAnalyzeReasoning(undefined); setAnalyzeModel(e.target.value); }}
                    style={{ flex: 1 }}
                  >
                    {(LLM_PROVIDERS.find(p => p.id === (analyzeProvider || settings.defaultProvider))?.models ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <CorrectionReasoningSelect provider={effectiveRuntime.provider} model={effectiveRuntime.model} value={effectiveRuntime.reasoning} onChange={value => {
                  setAnalyzeReasoning(value);
                  const current = loadSettings();
                  saveSettings({...current, correctionReasoning: {...current.correctionReasoning, [correctionReasoningKey(effectiveRuntime.provider,effectiveRuntime.model)]: value}});
                }} disabled={analyzing || batchRunning} />
                <p>Denkmodus: {DENK_LABELS[effectiveRuntime.reasoning ?? 'default'] ?? effectiveRuntime.reasoning}</p>
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
                      rubrikPasstZurTextsorte(r, e.target.value)
                    );
                    if (matching) setSelectedRubrik(matching.filename);
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">Textsorte auswählen</option>
                  {textsortenFuer(analyseKlasseMeta?.fach, analyseKlasseMeta?.schulstufe)
                    .map((ts) => <option key={ts} value={ts}>{ts}</option>)}
                </select>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                  {textsortenHint(analyseKlasseMeta?.fach, analyseKlasseMeta?.schulstufe)}
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
                    {rubrikListe.rubrics.some(r => rubrikPasstZurTextsorte(r, analyzeTextsorte))
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

            {analyzeStep === 2 && englischProfil && <EnglischRasterOptionen value={englischEntwurf} onChange={setEnglischEntwurf} />}

            {/* ─── Schritt 3: Ausgangsmaterial & Erwartungshorizont ─── */}
            {analyzeStep === 3 && (<>
              <h4>Deine Unterrichtsdatei</h4>
              <p>Eine Datei genügt. Sie kann den Ausgangstext, die Arbeitsaufträge und die Wortzahl gemeinsam enthalten.</p>
              <div style={{display:'flex',gap:'.5rem',alignItems:'center',marginBottom:'.75rem'}}>
                <strong style={{flex:1}}>{analyzeAusgangstextDatei ? baseName(analyzeAusgangstextDatei) : 'Text direkt eingeben'}</strong>
                <button type="button" className="btn-secondary" onClick={pickSourceFile}>{analyzeAusgangstextDatei?'Andere Datei wählen':'Datei wählen'}</button>
                {analyzeAusgangstextDatei && <button type="button" className="btn-ghost" onClick={()=>{setAnalyzeAusgangstextDatei('');setAnalyzeAusgangstext('');setSourcePreview(null);}}>Entfernen</button>}
              </div>
              {!analyzeAusgangstextDatei && <label>Ausgangstext einschließlich Arbeitsauftrag<textarea rows={7} value={analyzeAusgangstext} onChange={e=>{setAnalyzeAusgangstext(e.target.value);setSourcePreview(null);}} placeholder="Text und Aufgabenstellung aus deiner Unterrichtsunterlage"/></label>}
              {basisLoading && <p role="status">Datei und Bewertungsraster werden gelesen …</p>}
              {basisLoadError && <p role="alert">{basisLoadError}</p>}
              {sourcePreview && analyzeAusgangstextDatei && <details open><summary>Ausgelesener Text aus deiner Datei</summary><pre style={{whiteSpace:'pre-wrap',maxHeight:'16rem',overflow:'auto'}}>{sourcePreview.text || 'Kein lesbarer Text gefunden. Du kannst den Unterrichtstext direkt einfügen.'}</pre><button type="button" className="btn-ghost" onClick={()=>{setAnalyzeAusgangstext(sourcePreview.text);setAnalyzeAusgangstextDatei('');setBasisConfirmed(false);}}>Ausgelesenen Text bearbeiten</button></details>}
              {isGermanCorrection && <section aria-label="Bewertungsgrundlage prüfen">
                <h4>Aus dieser Datei übernommen — bitte prüfen</h4>
                <label>Prüfumfang<select value={basisScope} onChange={e=>setBasisScope(e.target.value as 'sprache'|'vollstaendig')}><option value="vollstaendig">Vollständig prüfen</option><option value="sprache">Nur Sprache prüfen</option></select></label>
                {sourcePreview && inferCorrectionBasis(sourcePreview.text).ambiguousTask && <p role="status">Deine Datei enthält mehrere Aufgaben. Übernimm unten nur den Arbeitsauftrag, den die Klasse bearbeitet hat.</p>}
                <label>Arbeitsauftrag aus deiner Datei<textarea value={basisTask} onChange={e=>setBasisTask(e.target.value)} rows={5} placeholder="LUKA übernimmt einen eindeutig erkennbaren Arbeitsauftrag automatisch. Falls er fehlt, kannst du ihn hier ergänzen."/></label>
                <label>Wortzahl aus dem Arbeitsauftrag<input value={basisAmount} onChange={e=>setBasisAmount(e.target.value)} placeholder="z. B. 500–600"/></label>
                {sourcePreview && inferCorrectionBasis(sourcePreview.text).wordChoices.length>1 && <p>Mehrere Angaben gefunden: {inferCorrectionBasis(sourcePreview.text).wordChoices.map(choice=><button type="button" className="btn-secondary" key={choice} onClick={()=>setBasisAmount(choice)}>{choice} Wörter verwenden</button>)}</p>}
                <button type="button" className="btn-ghost" onClick={()=>setBasisAmount('keine Vorgabe')}>Keine Wortzahlvorgabe</button>
                {basisRubric && <details><summary>Bewertungskriterien anzeigen</summary><pre style={{whiteSpace:'pre-wrap',maxHeight:'16rem',overflow:'auto'}}>{basisRubric}</pre></details>}
                <details open={basisEh.trim()?true:undefined} style={{margin:'.75rem 0'}}><summary>Erwartungshorizont ergänzen (optional)</summary>
                  <label>Erwartungshorizont<textarea value={basisEh} onChange={e=>setBasisEh(e.target.value)} rows={4}/></label>
                  <p>Du kannst ohne Erwartungshorizont fortfahren. Ein KI-Vorschlag muss vor der Verwendung geprüft werden.</p>
                  <button type="button" className="btn-secondary" disabled={basisBusy || basisLoading || !basisTask.trim() || !sourcePreview} onClick={async()=>{setBasisBusy(true);try{const result=await generateErwartungshorizont(analyzeKlasse,analyzeAufgabe,effectiveRuntime.provider,effectiveRuntime.model,undefined,basisTask+'\n'+(sourcePreview?.text??''));const proposal=JSON.parse(result);if(typeof proposal.erwartungshorizont!=="string")throw new Error("Der Erwartungshorizont konnte nicht gelesen werden.");setBasisEh(proposal.erwartungshorizont);setBasisConfirmed(false);}catch(e){setError(String(e));}finally{setBasisBusy(false);}}}>Erwartungshorizont vorschlagen (KI-Aufruf)</button>
                  <button type="button" className="btn-ghost" disabled={basisBusy} onClick={async()=>{try{const context=await getKorrekturKontext(analyzeKlasse,analyzeAufgabe);setBasisEh(context?.erwartungshorizont??'');setBasisConfirmed(false);}catch(e){setError(String(e));}}}>Hinterlegten Erwartungshorizont übernehmen</button>
                </details>
                {basisScope==='vollstaendig' ? <label style={{display:'block',margin:'.75rem 0'}}><input type="checkbox" checked={basisConfirmed} disabled={basisLoading || !basisRubric || !sourcePreview || Boolean(basisLoadError) || !basisTask.trim() || Boolean(correctionBasisBlocker({scope:basisScope,loading:false,loaded:true,task:basisTask,amount:basisAmount,confirmed:true}))} onChange={e=>{setBasisSource(sourcePreview?.text.trim()?'bestaetigt':'nicht_noetig');setBasisConfirmed(e.target.checked);setError(null);}}/> Arbeitsauftrag, ausgelesener Text, Wortzahl und Bewertungskriterien stimmen.</label> : <p>Nur Sprachfeedback — Inhalt und Umfangsabzug sind nicht beauftragt. Es gibt keine automatische Gesamtnote.</p>}
                {basisBlocker && !basisLoading && <p role="status">{basisBlocker.replace('Bitte in Schritt 3','Bitte hier')}</p>}
              </section>}
            </>)}
            {/* ─── Schritt 4: Abgaben hinzufügen ─── */}
            {analyzeStep === 4 && (<>
              <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem' }}>Dateien auswählen</h4>
              <button type="button" className="file-drop" onClick={pickFile} style={{width:'100%',padding:'1.25rem',border:'2px dashed var(--color-border)',background:dragActive?'var(--color-bg-selected)':'var(--color-bg-base)',borderRadius:'var(--radius)'}}>
                <Upload size={20}/> Dateien hierher ziehen oder auswählen<br/><small>Eine oder mehrere Abgaben · DOCX, PDF, TXT, MD, ODT, JPG, PNG</small>
              </button>

              <details style={{margin: '0.75rem 0'}}>
                <summary>Auslese-Anbieter (unabhaengig von der Korrektur)</summary>
                <select aria-label="Anbieter fuer die Auslesung" value={ocrProvider} disabled={ocrBusy} onChange={e => {setOcrProvider(e.target.value); setOcrModel(LLM_PROVIDERS.find(p => p.id === e.target.value)?.models[0] ?? '');}}>
                  <option value="">Bevorzugte KI verwenden</option>
                  {LLM_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.id === 'mistral' ? 'Mistral OCR' : p.label}</option>)}
                </select>
                {scanRuntime(ocrProvider, ocrModel, effectiveRuntime).provider === 'mistral' ? <p>Auslesung: Mistral OCR · Bildprüfung <select aria-label="Modell für den Bildabgleich" value={verifyModel} onChange={e=>setVerifyModel(e.target.value)}><option value="mistral-small-2603">Mistral Small 4</option><option value="mistral-medium-3-5">Mistral Medium 3.5</option><option value="mistral-large-4">Mistral Large 4</option></select></p> : ocrProvider && <select aria-label="Modell fuer die Auslesung" value={ocrModel} disabled={ocrBusy} onChange={e => setOcrModel(e.target.value)}>
                  {(LLM_PROVIDERS.find(p => p.id === ocrProvider)?.models ?? []).map(m => <option key={m} value={m}>{m}</option>)}
                </select>}
                <p>Bei Mistral liest der OCR-Dienst die Seiten aus. Die Korrektur verwendet weiterhin das oben gewaehlte Modell. Bilddateien werden zur Auslesung an den Auslese-Anbieter uebertragen.</p>
              </details>
              {ocrBusy && <p role="status">Scan wird verarbeitet ...</p>}
              {ocrReview && <div style={{margin: '1rem 0'}}>
                <h4>Abschrift prüfen: {baseName(ocrReview.file)}</h4>
                <p>Vergleichen Sie die Abschrift mit dem Scan. Lesefehler berichtigen, Fehler des Schülertexts erhalten. Lehrermarkierungen gehören nicht zur Abschrift. Wählen Sie anschließend „Geprüfte Abschrift verwenden“, um die Korrektur freizugeben.</p>
                {ocrReview.previews.length > 0 && <div>
                  <label>Originalseite <select aria-label="Originalseite" value={ocrPage} onChange={e => setOcrPage(Number(e.target.value))}>
                    {ocrReview.previews.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
                  </select></label>
                  <label> Vergroesserung <input aria-label="Original vergroessern" type="range" min="100" max="250" step="25" value={ocrZoom} onChange={e => setOcrZoom(Number(e.target.value))} /> {ocrZoom}%</label>
                </div>}
                <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem'}}>
                <div style={{maxHeight: '32rem', overflow: 'auto'}}>{ocrReview.previews[ocrPage] && <img src={ocrReview.previews[ocrPage]} alt={`Originalscan Seite ${ocrPage + 1}`} style={{width: `${ocrZoom}%`, maxWidth: 'none'}} />}</div>
                <textarea aria-label="Abschrift bearbeiten" value={ocrReview.text}
                  onChange={e => setOcrReview({...ocrReview, text: e.target.value})}
                  style={{width: '100%', minHeight: '32rem'}} />
                </div>
                <button type="button" className="btn-primary" disabled={ocrBusy || !ocrReview.text.trim()} onClick={() => void adoptScan()}>Geprüfte Abschrift verwenden</button>
                <button type="button" className="btn-secondary" disabled={ocrBusy} onClick={() => setOcrReview(null)}>Verwerfen</button>
              </div>}
              {batchFiles.map(file=><div className="correction-file-row" key={file}>
                <div><strong>{baseName(file)}</strong><div>{checkingFiles && !fileChecks[file] ? 'Wird geprüft …' : !fileChecks[file] ? 'Prüfung nicht abgeschlossen' : fileChecks[file]?.visionModus ? 'Scan: bitte zuerst auslesen und Abschrift bestaetigen' : 'Textdatei geprüft'}</div></div>
                <SchuelerZuordnung key={analyseKlasseKey + ':' + file} label={'Schülerzuordnung für '+baseName(file)} personen={klasseSchueler} value={assignments[file] ?? ''} disabled={analyzing || batchRunning || addingStudent} onCreate={createAndAssignStudent} onChange={id=>setAssignments(prev=>({...prev,[file]:id}))} />
                {isVisionPath(file) && !automaticScan && <button type="button" className="btn-secondary" disabled={ocrBusy || analyzing} onClick={() => void readScan(file)}>Scan auslesen und prüfen</button>}
                <button type="button" className="btn-secondary" onClick={()=>selectFiles(batchFiles.filter(p=>p!==file))} aria-label={'Entfernen: '+baseName(file)}>Entfernen</button>
              </div>)}

              {batchFiles.length >= 2 && (() => {
                const aufrufe = analyseKlasseMeta?.fach?.toLowerCase().startsWith('deutsch') ? 2 : 1;
                const sch = schaetzeBatch(batchFiles.map(file => fileChecks[file] ?? {}), aufrufe);
                return (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    <strong style={{ color: 'var(--color-text)' }}>Mengenschätzung:</strong>{' '}
                    {sch.woerter !== null
                      ? <>≈ {formatTokenzahl(sch.gesamtTokens ?? 0)} Tokens gesamt ({sch.dateien} Abgaben, davon ≈ {formatTokenzahl(sch.eingabeTokens ?? 0)} Eingabe)</>
                      : <>{sch.dateien} Abgaben, je ≈ {formatTokenzahl(ANTWORT_TOKENS_PRO_ABGABE * aufrufe)} Antwort-Tokens</>}
                    {aufrufe === 2 && <> · Analyse und Gegenprüfung: zwei Aufrufe je Arbeit, Denkaufwand und Bewertungsgrundlage können den Verbrauch erhöhen.</>}
                    {' '}— bei Ratenlimits den Stapel zeitlich staffeln.
                  </div>
                );
              })()}

              {batchResults.length>0 && <div role="status" className="queue-results"><strong>Letzter Bearbeitungsstand</strong>{batchResults.map(r=><p key={r.file}>{baseName(r.file)} — {r.ok?'KI-Vorschlag vorhanden':'Nicht abgeschlossen'} · {r.msg}</p>)}</div>}

              {/* Bestätigte Zuordnung für Einzeldatei */}
              {batchFiles.length === 0 && analyzeFile && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label>Schüler:in (Zuordnung)</label>
                  <SchuelerZuordnung key={analyseKlasseKey} label="Schülerzuordnung" personen={klasseSchueler} value={zuordnungId} disabled={analyzing || addingStudent} onCreate={createAndAssignStudent}
                    onChange={(id) => {
                      zuordnungTouchedRef.current = true;
                      setZuordnungId(id);
                    }}
                  />
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
              {automaticScan && <p>Scan-Auslesung und Bildabgleich: {scanReadingRuntime.provider} · {scanReadingRuntime.provider==='mistral'?verifyModel:scanReadingRuntime.model}. Die Korrektur wird zuerst als Vorschau vorbereitet.</p>}
              {Object.keys(scanReviews).length>1 && <label>Scan-Vorschau auswählen <select value={analyzeFile} onChange={e=>{setAnalyzeFile(e.target.value);setScanReview(scanReviews[e.target.value]??null);}}>{Object.keys(scanReviews).map(file=><option key={file} value={file}>{baseName(file)}</option>)}</select></label>}
              {scanReview && automaticScan && <ScanReviewPanel session={scanReview} busy={analyzing||scanReviewBusy} onResolve={(i,c)=>void resolveScan(i,c)} onPrepare={()=>void handleAnalyze()} onCommit={()=>void handleAnalyze(true)} onImage={scanImage}/>}

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
                      const hasIssue = !automaticScan && !isSubmissionReady(check);
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
                                : automaticScan ? 'Bereit zur automatischen Scan- und Korrekturvorschau'
                                : check.visionModus ? 'Scan-Abschrift noch nicht bestätigt – bitte in Schritt 4 prüfen und übernehmen'
                                : !check.visionFaehig ? 'KI-Anbieter unterstützt dieses Format nicht'
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

                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" role="switch" checked={reanalyzeExisting} disabled={revisionOfAbgabeId !== null} onChange={event => setReanalyzeExisting(event.target.checked)} />
                    Bereits korrigierte Arbeiten erneut korrigieren
                    <InfoDot text="Erstellt bei bereits vorhandenen Arbeiten eine neue Korrekturversion. Frühere Ergebnisse bleiben erhalten. Diese Auswahl gilt nur für diesen Auftrag." />
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.35rem 0 0' }}>
                    {reanalyzeExisting ? 'Es entstehen neue Korrekturversionen. Bisherige Ergebnisse bleiben erhalten. Es fallen neue KI-Aufrufe an.' : 'Unveränderte Arbeiten mit derselben Korrekturgrundlage werden übersprungen.'}
                  </p>
                </div>

                {/* Was das Ergebnis gut macht – bevor die Lehrkraft startet. */}
                <div
                  style={{ fontSize: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.625rem 0.75rem', background: 'var(--color-bg-base)' }}
                >
                  <strong style={{ display: 'block', marginBottom: '.25rem' }}>Für das beste Ergebnis</strong>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                    {[
                      {
                        ok: Boolean(gewaehltesRubrik),
                        text: gewaehltesRubrik
                          ? `Bewertungsraster: ${rubrikLabel(gewaehltesRubrik)}`
                          : 'Kein Bewertungsraster gewählt – LUKA misst dann nur, was wörtlich passt.',
                      },
                      {
                        ok: hatAusgangstext,
                        text: hatAusgangstext
                          ? 'Ausgangstext hinterlegt – Fehler lassen sich am Original belegen.'
                          : verstaendnisGewaehlt
                            ? 'Ausgangstext fehlt. Dieses Raster prüft Verstehen: ohne Originaltext prüft LUKA nur die Antwort.'
                            : 'Ausgangstext fehlt – die Korrektur stützt sich dann nur auf den Schülertext.',
                      },
                      {
                        ok: batchFiles.length > 0 && readyFileCount === batchFiles.length,
                        text: batchFiles.length > 0
                          ? `${readyFileCount} von ${batchFiles.length} Abgabe(n) bereit`
                          : 'Noch keine Abgabe hinzugefügt.',
                      },
                    ].map((hinweis) => (
                      <li key={hinweis.text} style={{ display: 'flex', gap: '.375rem', alignItems: 'flex-start' }}>
                        {hinweis.ok
                          ? <CheckCircle2 size={13} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '0.1rem' }} />
                          : <AlertTriangle size={13} style={{ color: 'var(--color-warning, #b45309)', flexShrink: 0, marginTop: '0.1rem' }} />}
                        <span style={{ color: hinweis.ok ? 'var(--color-text-secondary)' : 'var(--color-text)' }}>{hinweis.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Runtime + Datenschutz */}
                {submissionBlocker && <div role="status" style={{ fontSize: '0.8125rem', border: '1px solid var(--color-warning, #b45309)', borderRadius: 'var(--radius)', padding: '0.625rem 0.75rem' }}>
                  <p style={{ margin: '0 0 0.5rem' }}>{submissionBlocker}</p>
                  <button type="button" className="btn-secondary" onClick={() => setAnalyzeStep(4)}>Abgaben und Abschrift prüfen</button>
                </div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', padding: '0.5rem 0' }}>
                  <strong>KI-Anbieter:</strong> {LLM_PROVIDERS.find(p => p.id === (analyzeProvider || settings.defaultProvider))?.label ?? effectiveRuntime.provider} · {analyzeModel || settings.defaultModel}
                  {' · '}
                  <strong>Datenschutz:</strong> {batchFiles.some(file => fileChecks[file]?.visionModus) ? 'Originalscans werden zur Auslesung unveraendert uebertragen' : pseudoAktiv ? 'Pseudonymisierung des Texts aktiv' : 'Namen werden uebertragen'}
                </div>
              </div>
            </>)}

            </fieldset>

            {shouldShowCorrectionRunError(analyzeStep) && analysisFailure && <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.8125rem', whiteSpace: 'pre-line' }}>{analysisFailure}</p>}

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', marginTop: '1rem' }}>
              <div>
                {analyzeStep > 1 && !queueRunning && (
                  <button className="btn-secondary" onClick={() => { setAnalysisFailure(null); setError(null); setAnalyzeStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5); }}>
                    Zurück
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {queueRunning ? (
                  <><button type="button" className="btn-secondary" onClick={closeAnalyze}>Im Hintergrund weiterarbeiten</button>
                  <button className="btn-secondary" disabled={!batchRunning && activeJobId===null} onClick={async () => { if(batchRunning){batchCancelRef.current=true;}else if(activeJobId!==null && !await cancel(activeJobId)){setError('Der Auftrag konnte noch nicht abgebrochen werden. Bitte erneut versuchen.');} }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <XCircle size={14} /> {batchRunning ? 'Stapel nach laufender Datei stoppen' : 'Analyse abbrechen'}
                  </button></>
                ) : (
                  <>
                    <button className="btn-secondary" onClick={closeAnalyze}>Entwurf schließen</button>
                    {analyzeStep < 5 ? (
                      <button
                        className="btn-primary"
                        onClick={() => setAnalyzeStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)}
                        disabled={
                          (analyzeStep === 1 && (!analyzeKlasse || !analyzeAufgabe)) ||
                          (analyzeStep === 3 && (Boolean(basisBlocker) || basisBusy)) ||
                          (analyzeStep === 4 && Boolean(submissionBlocker))
                        }
                      >
                        Weiter
                      </button>
                    ) : (
                      <>
                        {batchFiles.length > 1 ? (
                          <button className="btn-primary" onClick={handleBatchAnalyze} disabled={Boolean(basisBlocker) || basisBusy || Boolean(submissionBlocker) || Boolean(englischFehler) || !analyzeKlasse || !analyzeAufgabe} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Files size={14} /> {autoScanProvider ? 'Stapel vorbereiten' : 'Stapel analysieren'} ({batchFiles.length})
                          </button>
                        ) : (
                          <button className="btn-primary" onClick={()=>void handleAnalyze()} disabled={Boolean(basisBlocker) || basisBusy || Boolean(submissionBlocker) || Boolean(englischFehler) || (!automaticScan && !isSubmissionReady(fileChecks[analyzeFile])) || analyzing || !analyzeFile || !analyzeKlasse || !analyzeAufgabe} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            {analyzing ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                            {analyzing ? 'Analysiere …' : analysisFailure ? 'Erneut versuchen' : automaticScan ? 'Scan und Korrektur vorbereiten' : batchFiles.length === 1 ? 'KI-Vorschlag erstellen' : `KI-Vorschlag für ${batchFiles.length} Abgaben erstellen`}
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
