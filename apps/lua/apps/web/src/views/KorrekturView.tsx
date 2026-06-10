import { useState, useEffect, useCallback, useMemo } from 'react';
import { SpellCheck, FileText, GraduationCap, Save, AlertTriangle, Loader2, Upload, FileDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { loadSettings } from '../lib/storage';
import { useNatascha } from '../hooks/useNatascha';
import { ViewShell } from './_ViewShell';

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

export function KorrekturView() {
  const { analyze, analyzing, analyzeError, listKlassen, listAufgaben, getAbgaben, getAbgabeDetail, upsertLehrerFeedback, generateFeedbackDocx } = useNatascha();

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
  const [analyzeSuccess, setAnalyzeSuccess] = useState<string | null>(null);

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

  const handleAnalyze = useCallback(async () => {
    if (!analyzeFile || !analyzeKlasse || !analyzeAufgabe) return;
    setError(null);
    setAnalyzeSuccess(null);
    const result = await analyze(analyzeFile, analyzeKlasse, analyzeAufgabe);
    if (result) {
      setAnalyzeSuccess('Analyse abgeschlossen — Daten gespeichert.');
      setAnalyzeOpen(false);
      setAnalyzeFile('');
      setAnalyzeAufgabe('');
      const refreshed = await listKlassen();
      setKlassen(refreshed);
      if (analyzeKlasse) {
        await loadAufgaben(analyzeKlasse);
      }
    } else {
      setError(analyzeError ?? 'Analyse fehlgeschlagen');
    }
  }, [analyze, analyzeFile, analyzeKlasse, analyzeAufgabe, analyzeError, listKlassen, loadAufgaben]);

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

  const cardStyle = {
    padding: '1.25rem', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
  } as const;

  const schuelerName = (a: AbgabeDetail['abgabe']) => [a.vorname, a.nachname].filter(Boolean).join(' ') || a.dateiname;

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
          NATASCHA-TUI
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
            Startet die NATASCHA-TUI in einem Terminalfenster. Für die native Korrektur den Reiter „Native" wählen.
          </p>
          <button className="btn-primary" onClick={starteNatascha} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <SpellCheck size={16} /> NATASCHA öffnen
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
                Noch keine Daten. Starte eine Analyse oder öffne NATASCHA.
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
                <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>Abgaben ({abgaben.length})</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Schüler/in</th>
                        <th style={{ textAlign: 'center', padding: '0.375rem 0.5rem' }}>KI-Note</th>
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
                          <td style={{ padding: '0.375rem 0.5rem' }}>{schuelerName(a)}</td>
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
                    {schuelerName(selectedAbgabe.abgabe)} — {selectedAbgabe.abgabe.aufgabe}
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
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Gesamtstufe</div>
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
                  Keine Abgaben für diese Aufgabe. Starte eine neue Analyse oder importiere Daten über NATASCHA.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {analyzeOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--color-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setAnalyzeOpen(false)}>
          <div style={{ ...cardStyle, width: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem' }}>Neue Analyse starten</h3>

            <div style={{ marginBottom: '0.75rem' }}>
              <label>Datei (DOCX/PDF/TXT)</label>
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

            <div style={{ marginBottom: '0.75rem' }}>
              <label>Klasse</label>
              <input type="text" value={analyzeKlasse} onChange={(e) => setAnalyzeKlasse(e.target.value)} placeholder="z.B. 7a" />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label>Aufgabe</label>
              <input type="text" value={analyzeAufgabe} onChange={(e) => setAnalyzeAufgabe(e.target.value)} placeholder="z.B. SA2" />
            </div>

            {analyzeError && <p style={{ color: 'var(--color-error)', fontSize: '0.8125rem' }}>{analyzeError}</p>}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => setAnalyzeOpen(false)}>Abbrechen</button>
              <button className="btn-primary" onClick={handleAnalyze} disabled={analyzing || !analyzeFile || !analyzeKlasse || !analyzeAufgabe} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                {analyzing ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                {analyzing ? 'Analysiere …' : 'Analyse starten'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ViewShell>
  );
}