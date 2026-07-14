import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SpellCheck, FileText, GraduationCap, Save, AlertTriangle, Loader2, Upload, FileDown, ChevronRight, Eye, EyeOff, Files, XCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { loadSettings } from '../lib/storage';
import { useNatascha, type PersonenVorschau, type SchuelerInfo } from '../hooks/useNatascha';
import { ViewShell } from './_ViewShell';
import { anzeigeName } from '../lib/anzeigeName';
import { InfoDot } from '../components/ui/InfoDot';

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

interface FehlerRow { id: number; zitat: string | null; korrektur: string | null; typ: string; erklaerung: string | null }

interface AbgabeDetail {
  abgabe: {
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
    rohtext: string | null;
  };
  kriterien: { id: number; kriteriumName: string; stufe: number | null; gewichtung: number | null }[];
  fehler: FehlerRow[];
  lehrerFeedback: { id: number; noteFinal: number | null; noteAppSnapshot: number | null; lehrerKommentar: string | null; erstelltAm: string | null; geaendertAm: string | null } | null;
}

interface KlasseInfo { klasse: string; anzahlAbgaben: number; }

const FEHLER_COLORS: Record<string, string> = { R: '#e74c3c', G: '#27ae60', Z: '#3498db', A: '#f39c12' };
const FEHLER_LABELS: Record<string, string> = { R: 'Rechtschreibung', G: 'Grammatik', Z: 'Zeichensetzung', A: 'Ausdruck' };

/** Annotiert rohtext: findet jedes fehler.zitat und wraps es in ein farbiges <mark>. */
function annotateText(text: string, fehler: FehlerRow[]): React.ReactNode[] {
  type Seg = { start: number; end: number; typ: string };
  const segs: Seg[] = [];
  for (const f of fehler) {
    if (!f.zitat) continue;
    const idx = text.indexOf(f.zitat);
    if (idx === -1) continue;
    segs.push({ start: idx, end: idx + f.zitat.length, typ: f.typ });
  }
  segs.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (const seg of segs) {
    if (seg.start < pos) continue;
    if (seg.start > pos) nodes.push(text.slice(pos, seg.start));
    const col = FEHLER_COLORS[seg.typ] ?? '#999';
    nodes.push(
      <mark key={seg.start} title={`${FEHLER_LABELS[seg.typ] ?? seg.typ}`} style={{ background: col + '28', borderBottom: `2px solid ${col}`, borderRadius: 2, padding: '0 1px' }}>
        {text.slice(seg.start, seg.end)}
      </mark>
    );
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
  const { analyze, analyzing, analyzeError, listKlassen, listAufgaben, getAbgaben, getAbgabeDetail, upsertLehrerFeedback, generateFeedbackDocx, retroImport, personenVorschau, listSchueler } = useNatascha();

  const [mode, setMode] = useState<'tui' | 'native'>('native');
  const [klassen, setKlassen] = useState<KlasseInfo[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  const [aufgaben, setAufgaben] = useState<string[]>([]);
  const [selectedAufgabe, setSelectedAufgabe] = useState<string | null>(null);
  const [abgaben, setAbgaben] = useState<AbgabeDetail['abgabe'][]>([]);
  const [selectedAbgabe, setSelectedAbgabe] = useState<AbgabeDetail | null>(null);
  const [teacherNote, setTeacherNote] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(true);

  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeKlasse, setAnalyzeKlasse] = useState('');
  const [analyzeAufgabe, setAnalyzeAufgabe] = useState('');
  const [analyzeFile, setAnalyzeFile] = useState('');
  // Ausgangstext (Angabe/Quelltext der Arbeit) — optional. Schließt den In-App-Closed-Loop:
  // wird mitanalysiert und kann später die passgenaue Übung vorbefüllen.
  const [analyzeAusgangstext, setAnalyzeAusgangstext] = useState('');
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
  const [batchFiles, setBatchFiles] = useState<string[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchCurrent, setBatchCurrent] = useState(0);
  const [batchResults, setBatchResults] = useState<{ file: string; ok: boolean; msg: string }[]>([]);
  const batchCancelRef = useRef(false);
  // Drag-&-Drop-Ablage: Dateien in den Analyse-Dialog ziehen (Tauri liefert absolute Pfade).
  const [dragActive, setDragActive] = useState(false);

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
            const docs = (p.paths ?? []).filter((f) => /\.(docx|pdf|txt|odt)$/i.test(f));
            if (docs.length === 1) { setAnalyzeFile(docs[0]!); }
            else if (docs.length > 1) { setBatchFiles(docs); setBatchResults([]); }
          }
        });
        if (cancelled) un(); else unlisten = un;
      } catch { /* Drag-&-Drop nicht verfügbar (z. B. Web-Dev) — Picker bleibt */ }
    })();
    return () => { cancelled = true; if (unlisten) unlisten(); setDragActive(false); };
  }, [analyzeOpen]);

  useEffect(() => {
    listKlassen().then(setKlassen);
  }, [listKlassen]);

  const loadAufgaben = useCallback(async (klasse: string) => {
    setSelectedKlasse(klasse);
    setSelectedAufgabe(null);
    setSelectedAbgabe(null);
    setLoading(true);
    try {
      const af = await listAufgaben(klasse);
      setAufgaben(af);
      if (af.length > 0) {
        const first: string | undefined = af[0];
        setSelectedAufgabe(first ?? null);
        const abs = await getAbgaben(klasse, first);
        setAbgaben(abs as AbgabeDetail['abgabe'][]);
      }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [listAufgaben, getAbgaben]);

  const loadAbgaben = useCallback(async (klasse: string, aufgabe: string) => {
    setSelectedAufgabe(aufgabe);
    setSelectedAbgabe(null);
    setLoading(true);
    try {
      const abs = await getAbgaben(klasse, aufgabe);
      setAbgaben(abs as AbgabeDetail['abgabe'][]);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [getAbgaben]);

  const loadDetail = useCallback(async (abgabeId: number) => {
    setLoading(true);
    try {
      const detail = await getAbgabeDetail(abgabeId) as AbgabeDetail | null;
      if (detail) {
        setSelectedAbgabe(detail);
        setTeacherNote(detail.lehrerFeedback?.noteFinal?.toString() ?? '');
        setTeacherComment(detail.lehrerFeedback?.lehrerKommentar ?? '');
      }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [getAbgabeDetail]);

  const handleSaveFeedback = useCallback(async () => {
    if (!selectedAbgabe) return;
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
    if (ok) {
      setSaveMsg('Gespeichert');
      setTimeout(() => setSaveMsg(null), 2000);
      loadDetail(selectedAbgabe.abgabe.id);
    } else {
      setError('Speichern fehlgeschlagen');
    }
    setSaving(false);
  }, [selectedAbgabe, teacherNote, teacherComment, upsertLehrerFeedback, loadDetail]);

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

  const handleGenerateDocx = useCallback(async () => {
    if (!selectedAbgabe) return;
    setError(null);
    const result = await generateFeedbackDocx(selectedAbgabe.abgabe.id);
    if (result) {
      setError(null);
      alert(`Feedback-DOCX erstellt: ${result.path}`);
    } else {
      setError('DOCX-Erstellung fehlgeschlagen');
    }
  }, [selectedAbgabe, generateFeedbackDocx]);

  const starteNatascha = async () => {
    if (mode !== 'tui') return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const settings = loadSettings();
      await invoke('launch_natascha', { dir: settings.nataschaDir ?? '', python: settings.pythonCommand ?? '' });
    } catch (e) {
      setError(String(e));
    }
  };

  // Redaktionsvorschau nachladen, sobald Datei + Klasse feststehen (debounced —
  // der Call spawnt den Python-Sidecar, nicht bei jedem Tastendruck).
  useEffect(() => {
    if (!analyzeOpen || !analyzeFile || !analyzeKlasse.trim() || !isTauri()) {
      setPseudoVorschau(null);
      return;
    }
    let aktiv = true;
    setPseudoVorschauBusy(true);
    const t = setTimeout(async () => {
      const v = await personenVorschau(analyzeFile, analyzeKlasse.trim());
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
  }, [analyzeOpen, analyzeFile, analyzeKlasse, personenVorschau]);

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
  }, [analyzeFile]);

  // Vorschlag aus der Redaktionsvorschau übernehmen (Dateiname-Treffer),
  // solange die Lehrkraft nicht selbst gewählt hat.
  useEffect(() => {
    if (zuordnungTouchedRef.current || !pseudoVorschau) return;
    const dateiTreffer = pseudoVorschau.funde.filter((f) => f.imDateinamen);
    if (dateiTreffer.length === 1) setZuordnungId(dateiTreffer[0]!.schuelerId);
  }, [pseudoVorschau]);

  const handleAnalyze = useCallback(async () => {
    if (!analyzeFile || !analyzeKlasse || !analyzeAufgabe) return;
    setError(null);
    setAnalyzeSuccess(null);
    const result = await analyze(analyzeFile, analyzeKlasse, analyzeAufgabe, { ausgangstext: analyzeAusgangstext.trim() || undefined, pseudonymisierung: pseudoAktiv, schuelerId: zuordnungId === '' ? undefined : zuordnungId });
    if (result) {
      setAnalyzeSuccess('Analyse abgeschlossen — Daten gespeichert.');
      setAnalyzeOpen(false);
      setAnalyzeFile('');
      setAnalyzeAufgabe('');
      setAnalyzeAusgangstext('');
      const refreshed = await listKlassen();
      setKlassen(refreshed);
      if (analyzeKlasse) {
        await loadAufgaben(analyzeKlasse);
      }
    } else {
      setError(analyzeError ?? 'Analyse fehlgeschlagen');
    }
  }, [analyze, analyzeFile, analyzeKlasse, analyzeAufgabe, analyzeAusgangstext, analyzeError, listKlassen, loadAufgaben, pseudoAktiv, zuordnungId]);

  const annotatedNodes = useMemo(() => {
    const rohtext = selectedAbgabe?.abgabe.rohtext;
    if (!rohtext || !selectedAbgabe) return null;
    return annotateText(rohtext, selectedAbgabe.fehler);
  }, [selectedAbgabe]);

  const pickFile = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: false, filters: [{ name: 'Dokumente', extensions: ['docx', 'pdf', 'txt', 'odt'] }] });
      if (selected && typeof selected === 'string') {
        setAnalyzeFile(selected);
      } else if (selected && Array.isArray(selected) && selected.length > 0) {
        setAnalyzeFile(selected[0]);
      }
    } catch {
      setAnalyzeFile(prompt('Dateipfad zur Schülerarbeit:') ?? '');
    }
  }, []);

  const pickFiles = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: true, filters: [{ name: 'Dokumente', extensions: ['docx', 'pdf', 'txt', 'odt'] }] });
      if (Array.isArray(selected)) {
        setBatchFiles(selected);
      } else if (typeof selected === 'string') {
        setBatchFiles([selected]);
      }
      setBatchResults([]);
    } catch {
      /* Dialog nicht verfügbar (z. B. Web-Dev) — Batch braucht den nativen Picker. */
    }
  }, []);

  const baseName = (p: string) => p.split(/[/\\]/).pop() || p;

  const handleBatchAnalyze = useCallback(async () => {
    if (batchFiles.length === 0 || !analyzeKlasse || !analyzeAufgabe) return;
    setError(null);
    setAnalyzeSuccess(null);
    setBatchRunning(true);
    setBatchResults([]);
    setBatchCurrent(0);
    batchCancelRef.current = false;

    const results: { file: string; ok: boolean; msg: string }[] = [];
    for (let i = 0; i < batchFiles.length; i++) {
      if (batchCancelRef.current) break;
      const file = batchFiles[i]!;
      setBatchCurrent(i + 1);
      try {
        const result = await analyze(file, analyzeKlasse, analyzeAufgabe, { ausgangstext: analyzeAusgangstext.trim() || undefined, pseudonymisierung: pseudoAktiv });
        if (result) {
          const note = result?.analysis?.notenempfehlung?.note;
          results.push({ file, ok: true, msg: note != null ? `Note ${note}` : 'OK' });
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
  }, [batchFiles, analyzeKlasse, analyzeAufgabe, analyzeAusgangstext, analyze, analyzeError, listKlassen, loadAufgaben, pseudoAktiv]);

  const cardStyle = {
    padding: '1.25rem', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
  } as const;

  const schuelerName = (a: AbgabeDetail['abgabe']) => anzeigeName(a);

  return (
    <ViewShell
      title="Korrektur"
      description="Schülerabgaben analysieren und bewerten."
      maxWidth={mode === 'native' ? 1400 : 860}
      action={mode === 'native' ? <button className="btn-secondary" onClick={() => setAnalyzeOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}><Upload size={14} /> Neue Analyse</button> : undefined}
    >
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          className={mode === 'tui' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setMode('tui')}
          style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
        >
          <SpellCheck size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Korrektur-TUI
        </button>
        <button
          className={mode === 'native' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setMode('native')}
          style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
        >
          <FileText size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Native
        </button>
      </div>

      {mode === 'tui' ? (
        <section style={cardStyle}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem' }}>
            Startet die Korrektur-TUI in einem Terminalfenster. Für die native Korrektur den Reiter „Native" wählen.
          </p>
          <button className="btn-primary" onClick={starteNatascha} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <SpellCheck size={16} /> Korrektur-TUI öffnen
          </button>
          {error && <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-danger, #c0392b)' }}>{error}</p>}
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.25rem' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <GraduationCap size={16} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '0.875rem', margin: 0 }}>Klasse & Aufgabe</h3>
            </div>

            {klassen.length === 0 && !error && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                Noch keine Daten. Starte eine Analyse oder öffne die Korrektur-TUI.
              </p>
            )}

            {klassen.map((k) => (
              <div key={k.klasse}>
                <button
                  onClick={() => loadAufgaben(k.klasse)}
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

            {loading && <div style={cardStyle}><Loader2 size={18} className="spin" style={{ verticalAlign: -2, marginRight: 6 }} /> Laden …</div>}

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
                          onClick={() => loadDetail(a.id)}
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
                  <button className="btn-secondary" onClick={handleGenerateDocx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                    <FileDown size={14} /> Feedback-DOCX
                  </button>
                </div>

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

                    {selectedAbgabe.fehler.length > 0 && (
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h5 style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem' }}>Fehler ({selectedAbgabe.fehler.length})</h5>
                        <div style={{ maxHeight: '48vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                          {selectedAbgabe.fehler.map((f) => (
                            <div key={f.id} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.375rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius)', borderLeft: `3px solid ${FEHLER_COLORS[f.typ] ?? '#999'}` }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: FEHLER_COLORS[f.typ] ?? '#999' }}>
                                {FEHLER_LABELS[f.typ] ?? f.typ}
                              </span>
                              {f.zitat && <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>"{f.zitat}"</div>}
                              {f.korrektur && <div style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>→ {f.korrektur}</div>}
                              {f.erklaerung && <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{f.erklaerung}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                      <h5 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>Lehrer-Feedback</h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', alignItems: 'start' }}>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: '2' }}>Note</label>
                        <input
                          type="number" min="1" max="5" step="0.25"
                          value={teacherNote}
                          onChange={(e) => setTeacherNote(e.target.value)}
                          placeholder="1 – 5"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                        <label style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: '2' }}>Kommentar</label>
                        <textarea
                          value={teacherComment}
                          onChange={(e) => setTeacherComment(e.target.value)}
                          placeholder="Optional: Bemerkung zum Aufsatz"
                          rows={3}
                          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="btn-primary" onClick={handleSaveFeedback} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Save size={14} /> {saving ? 'Speichern …' : 'Speichern'}
                        </button>
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
                  Keine Abgaben für diese Aufgabe. Starte eine neue Analyse oder importiere Daten über die Korrektur-TUI.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {analyzeOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => { if (!batchRunning) setAnalyzeOpen(false); }}>
          <div style={{ ...cardStyle, width: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>Neue Analyse starten</h3>

            <div style={{ marginBottom: '0.75rem' }}>
              <label>Datei (DOCX/PDF/TXT/ODT)</label>
              {/* Drag-&-Drop-Ablage — Datei aus dem Explorer hierher ziehen (oder klicken) */}
              <button
                type="button"
                onClick={pickFile}
                style={{
                  width: '100%', marginBottom: '0.5rem', padding: '1.1rem 0.75rem', cursor: 'pointer',
                  border: `2px dashed ${dragActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius)',
                  background: dragActive ? 'var(--color-highlight-bg)' : 'var(--color-bg-base)',
                  color: 'var(--color-text-secondary)', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <Upload size={20} style={{ opacity: 0.7 }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                  {dragActive ? 'Loslassen zum Übernehmen' : 'Datei hierher ziehen oder klicken'}
                </span>
                <span style={{ fontSize: '0.7rem' }}>DOCX · PDF · TXT · ODT — mehrere Dateien = Stapel</span>
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={analyzeFile}
                  onChange={(e) => setAnalyzeFile(e.target.value)}
                  placeholder="Dateipfad oder Datei auswählen"
                  style={{ flex: 1 }}
                />
                <button className="btn-secondary" onClick={pickFile} style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
                  Durchsuchen …
                </button>
              </div>
            </div>

            {/* Ausgangstext / Angabe — optional. Schließt den Closed Loop: aus der Korrektur
                kann später eine passgenaue Übung mit genau diesem Quelltext erzeugt werden. */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label>Ausgangstext / Angabe <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                rows={3}
                value={analyzeAusgangstext}
                onChange={(e) => setAnalyzeAusgangstext(e.target.value)}
                placeholder="Quelltext bzw. Angabe der Arbeit hier einfügen — ermöglicht später eine passgenaue Übung aus den Fehlern."
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Batch: mehrere Dateien sequenziell */}
            <div style={{ marginBottom: '0.75rem', padding: '0.625rem 0.75rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Files size={14} /> {batchFiles.length > 0 ? `${batchFiles.length} Dateien für Stapel gewählt` : 'oder ganze Klasse (mehrere Dateien)'}
                </span>
                <button className="btn-secondary" onClick={pickFiles} disabled={batchRunning} style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  Mehrere wählen …
                </button>
              </div>
              {batchFiles.length > 0 && !batchRunning && (
                <button onClick={() => { setBatchFiles([]); setBatchResults([]); }} style={{ marginTop: 6, fontSize: '0.6875rem', border: 'none', background: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  Auswahl verwerfen
                </button>
              )}
              {batchRunning && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: '0.75rem', marginBottom: 4 }}>Analysiere {batchCurrent}/{batchFiles.length} …</div>
                  <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(batchCurrent / batchFiles.length) * 100}%`, background: 'var(--color-accent)', transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}
              {batchResults.length > 0 && (
                <div style={{ marginTop: 8, maxHeight: '22vh', overflowY: 'auto', fontSize: '0.6875rem' }}>
                  {batchResults.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '1px 0' }}>
                      {r.ok ? <CheckCircle2 size={12} style={{ color: 'var(--color-success)', flexShrink: 0 }} /> : <XCircle size={12} style={{ color: 'var(--color-danger, #c0392b)', flexShrink: 0 }} />}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.file}>{baseName(r.file)}</span>
                      <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>{r.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label>Klasse</label>
              <input type="text" value={analyzeKlasse} onChange={(e) => setAnalyzeKlasse(e.target.value)} placeholder="z.B. 7a" />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label>Aufgabe</label>
              <input type="text" value={analyzeAufgabe} onChange={(e) => setAnalyzeAufgabe(e.target.value)} placeholder="z.B. SA2" />
            </div>

            {/* Bestätigte Zuordnung: Vorschlag aus dem Dateinamen, Entscheidung bei
                der Lehrkraft. Automatik = alte Namensheuristik (kann Schüler anlegen). */}
            {batchFiles.length === 0 && klasseSchueler.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
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
                {zuordnungId !== '' && !zuordnungTouchedRef.current && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Automatisch aus dem Dateinamen erkannt — bitte prüfen.
                  </p>
                )}
              </div>
            )}

            {/* Datenschutz: Redaktionsvorschau + Schalter. Kein stilles Versprechen —
                die Karte zeigt konkret, was ersetzt wird (oder dass nichts geht). */}
            <div style={{ marginBottom: '0.75rem', padding: '0.625rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)' }}>
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
              {pseudoAktiv && batchFiles.length === 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {pseudoVorschauBusy && <span>Prüfe Datei auf bekannte Namen …</span>}
                  {!pseudoVorschauBusy && pseudoVorschau?.visionModus && (
                    <span style={{ color: 'var(--color-warning, #b45309)' }}>
                      PDF/Bild: Ersetzen im Dokument nicht möglich — die Datei geht unverändert an den Anbieter.
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
              {pseudoAktiv && batchFiles.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Gilt für alle Dateien im Stapel; erkannte Namen stehen nach der Analyse im Hinweis-Protokoll.
                </div>
              )}
            </div>

            {analyzeError && <p style={{ color: 'var(--color-error)', fontSize: '0.8125rem' }}>{analyzeError}</p>}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              {batchRunning ? (
                <button className="btn-secondary" onClick={() => { batchCancelRef.current = true; }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <XCircle size={14} /> Abbrechen (nach laufender Datei)
                </button>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => setAnalyzeOpen(false)}>Schließen</button>
                  {batchFiles.length > 0 ? (
                    <button className="btn-primary" onClick={handleBatchAnalyze} disabled={!analyzeKlasse || !analyzeAufgabe} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Files size={14} /> Stapel analysieren ({batchFiles.length})
                    </button>
                  ) : (
                    <button className="btn-primary" onClick={handleAnalyze} disabled={analyzing || !analyzeFile || !analyzeKlasse || !analyzeAufgabe} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      {analyzing ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                      {analyzing ? 'Analysiere …' : 'Analyse starten'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </ViewShell>
  );
}