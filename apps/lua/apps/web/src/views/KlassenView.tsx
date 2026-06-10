import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Users, BarChart3, AlertTriangle, TrendingUp, Download, Wand2, Sparkles, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import type { KlasseInfo } from '../lib/storage';
import { useNatascha } from '../hooks/useNatascha';
import type { KlassenBriefingRow } from '../hooks/useNatascha';
import { KATEGORIE_TO_BLOCKTYPEN, type NataschaPrefill } from '../lib/nataschaBridge';
import type { BlockTyp } from '@lehrunterlagen/schema';
import { ViewShell } from './_ViewShell';

interface Props {
  /** Closed Loop: aus der Heatmap ein Übungsblatt im LUA-Generator starten. */
  onGenerateUebung?: (prefill: NataschaPrefill) => void;
}

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

const HEATMAP_COLORS: Record<string, string> = { R: '#e74c3c', G: '#27ae60', Z: '#3498db', A: '#f39c12' };
const HEATMAP_LABELS: Record<string, string> = { R: 'Rechtschreibung', G: 'Grammatik', Z: 'Zeichensetzung', A: 'Ausdruck' };
const FEHLER_LABELS = HEATMAP_LABELS;
const FEHLER_COLORS: Record<string, string> = { R: '#e74c3c', G: '#27ae60', Z: '#3498db', A: '#f39c12' };

type Tab = 'uebersicht' | 'statistik';

export function KlassenView({ onGenerateUebung }: Props) {
  const { listKlassen, listAufgaben, getAbgaben, getHeatmap, getKlassenStatistik, getKlassenTrend, getKlassenKalibrierung, getFehlerDetail, exportNotenCsv, generateKlassenBriefing, getKlassenBriefing } = useNatascha();

  const [tab, setTab] = useState<Tab>('uebersicht');
  const [klassen, setKlassen] = useState<KlasseInfo[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<string | null>(null);
  const [aufgaben, setAufgaben] = useState<string[]>([]);
  const [selectedAufgabe, setSelectedAufgabe] = useState<string | null>(null);
  const [abgaben, setAbgaben] = useState<AbgabeInfo[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [statistik, setStatistik] = useState<KlassenStatistik | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [kalibrierung, setKalibrierung] = useState<KalibrierungResult | null>(null);
  const [fehlerDetail, setFehlerDetail] = useState<{ typ: string; rows: FehlerDetailRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<KlassenBriefingRow | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  useEffect(() => {
    listKlassen().then(setKlassen).catch(() => {
      setError('Datenbank nicht erreichbar.');
    });
  }, [listKlassen]);

  const loadKlasse = useCallback(async (klasse: string) => {
    setSelectedKlasse(klasse);
    setSelectedAufgabe(null);
    setFehlerDetail(null);
    setBriefing(null);
    setBriefingError(null);
    setLoading(true);
    setError(null);
    getKlassenBriefing(klasse).then(setBriefing);
    try {
      const af = await listAufgaben(klasse);
      setAufgaben(af);
      if (af.length > 0) {
        const first: string | null = af[0] ?? null;
        setSelectedAufgabe(first);
        if (first) await loadData(klasse, first);
      } else {
        setAbgaben([]); setHeatmap([]); setStatistik(null);
      }
      const [t, k] = await Promise.all([getKlassenTrend(klasse), getKlassenKalibrierung(klasse)]);
      setTrend(t as TrendPoint[]);
      setKalibrierung(k as KalibrierungResult | null);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [listAufgaben, getKlassenTrend, getKlassenKalibrierung]);

  const loadData = useCallback(async (klasse: string, aufgabe: string) => {
    setLoading(true);
    try {
      const [abs, hm, stat] = await Promise.all([
        getAbgaben(klasse, aufgabe) as Promise<AbgabeInfo[]>,
        getHeatmap(klasse, aufgabe),
        getKlassenStatistik(klasse, aufgabe),
      ]);
      setAbgaben(abs);
      setHeatmap(hm as HeatmapEntry[]);
      setStatistik(stat as KlassenStatistik);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, [getAbgaben, getHeatmap, getKlassenStatistik]);

  useEffect(() => {
    if (selectedKlasse && selectedAufgabe) {
      loadData(selectedKlasse, selectedAufgabe);
    }
  }, [selectedAufgabe]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHeatmapClick = useCallback(async (typ: string) => {
    if (!selectedKlasse) return;
    const rows = await getFehlerDetail(selectedKlasse, typ, selectedAufgabe ?? undefined, 30);
    setFehlerDetail({ typ, rows: rows as FehlerDetailRow[] });
  }, [selectedKlasse, selectedAufgabe, getFehlerDetail]);

  const handleGenerateUebung = useCallback(() => {
    if (!selectedKlasse || heatmap.length === 0) return;
    const top = [...heatmap].filter((h) => h.anzahl > 0).sort((a, b) => b.anzahl - a.anzahl).slice(0, 3);
    const fokusThemen = top.map((h) => HEATMAP_LABELS[h.typ] ?? h.typ);
    const arten: BlockTyp[] = [];
    for (const h of top) {
      for (const t of (KATEGORIE_TO_BLOCKTYPEN[h.typ as 'R' | 'G' | 'Z' | 'A'] ?? [])) {
        if (!arten.includes(t)) arten.push(t);
      }
    }
    const prefill: NataschaPrefill = {
      thema: `Übung zu Fehlerschwerpunkten – ${selectedKlasse}${selectedAufgabe ? ' · ' + selectedAufgabe : ''}`,
      fach: 'deutsch',
      stufe: 'oberstufe',
      fokusThemen,
      gewuenschteAufgabenarten: arten,
      notizen: `Automatisch aus der Korrektur-Heatmap der Klasse ${selectedKlasse} erzeugt. Schwerpunkte: ${fokusThemen.join(', ')}.`,
    };
    onGenerateUebung?.(prefill);
  }, [selectedKlasse, selectedAufgabe, heatmap, onGenerateUebung]);

  const handleGenerateBriefing = useCallback(async () => {
    if (!selectedKlasse) return;
    setBriefingBusy(true);
    setBriefingError(null);
    try {
      const result = await generateKlassenBriefing(selectedKlasse, selectedAufgabe ?? undefined);
      setBriefing({ id: result.id, klasse: result.klasse, aufgabe: result.aufgabe ?? '', text: result.text, modell: result.modell, erstelltAm: '' });
    } catch (e) {
      setBriefingError(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Briefing fehlgeschlagen');
    } finally {
      setBriefingBusy(false);
    }
  }, [selectedKlasse, selectedAufgabe, generateKlassenBriefing]);

  const handleExportCsv = useCallback(async () => {
    if (!selectedKlasse) return;
    const csv = await exportNotenCsv(selectedKlasse, selectedAufgabe ?? undefined);
    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noten_${selectedKlasse}${selectedAufgabe ? '_' + selectedAufgabe : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [selectedKlasse, selectedAufgabe, exportNotenCsv]);

  const cardStyle = {
    padding: '1.25rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    background: 'var(--color-bg-surface)',
  } as const;

  const noteLabel = (n: number | null) => n === null ? '—' : n.toFixed(1);

  return (
    <ViewShell title="Meine Klassen" description="Klassen, Abgaben und Statistiken.">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className={tab === 'uebersicht' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('uebersicht')} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
          Übersicht
        </button>
        <button className={tab === 'statistik' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('statistik')} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}>
          <BarChart3 size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Statistik
        </button>
        {selectedKlasse && (
          <button className="btn-secondary" onClick={handleExportCsv} style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', marginLeft: 'auto' }}>
            <Download size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> CSV-Export
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem' }}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem', fontWeight: 700 }}>
            <GraduationCap size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Klassen
          </h3>
          {klassen.length === 0 && !error && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>Noch keine Klassen.</p>
          )}
          {klassen.map((k) => (
            <button key={k.klasse} onClick={() => loadKlasse(k.klasse)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', marginBottom: '0.25rem',
              background: selectedKlasse === k.klasse ? 'var(--color-highlight-bg)' : 'none',
              border: selectedKlasse === k.klasse ? '2px solid var(--color-accent)' : '1px solid transparent',
              borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.8125rem',
            }}>
              {k.klasse} <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>({k.anzahlAbgaben})</span>
            </button>
          ))}

          {aufgaben.length > 0 && (
            <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: '0 0 0.375rem' }}>Aufgaben</p>
              {aufgaben.map((af) => (
                <button key={af} onClick={() => setSelectedAufgabe(af)} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '0.25rem 0.5rem', fontSize: '0.75rem',
                  background: selectedAufgabe === af ? 'var(--color-accent)' : 'none',
                  color: selectedAufgabe === af ? '#fff' : 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', cursor: 'pointer', marginBottom: '0.125rem',
                }}>
                  {af}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {error && <div style={{ ...cardStyle, borderColor: 'var(--color-danger, #c0392b)', marginBottom: '1rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-danger, #c0392b)', verticalAlign: -3, marginRight: 6 }} />
            <span style={{ fontSize: '0.875rem' }}>{error}</span>
          </div>}

          {loading && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Laden …</p>}

          {tab === 'uebersicht' && statistik && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={cardStyle}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}><BarChart3 size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Notenverteilung</h4>
                  {Object.keys(statistik.notenverteilung.noten).length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Keine Noten.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={Object.entries(statistik.notenverteilung.noten).map(([n, c]) => ({ note: n, anzahl: c }))} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="note" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="anzahl" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  {statistik.notenverteilung.durchschnitt !== null && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                      Durchschnitt: <strong>{statistik.notenverteilung.durchschnitt.toFixed(2)}</strong> · {statistik.anzahlAbgaben} Abgabe{statistik.anzahlAbgaben !== 1 ? 'n' : ''}
                    </p>
                  )}
                </div>

                <div style={cardStyle}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}><AlertTriangle size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Fehler-Heatmap</h4>
                  {heatmap.length === 0 ? (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Keine Fehlerdaten.</p>
                  ) : (
                    heatmap.map((h) => (
                      <div key={h.typ} style={{ marginBottom: '0.5rem', cursor: 'pointer' }} onClick={() => handleHeatmapClick(h.typ)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                          <span>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: HEATMAP_COLORS[h.typ] ?? '#999', marginRight: 6, verticalAlign: 0 }} />
                            {HEATMAP_LABELS[h.typ] ?? h.typ}
                          </span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{h.anzahl} ({h.prozent.toFixed(0)}%)</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-base)', marginTop: 2 }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(h.prozent, 100)}%`, background: HEATMAP_COLORS[h.typ] ?? '#999' }} />
                        </div>
                      </div>
                    ))
                  )}
                  {heatmap.length > 0 && onGenerateUebung && (
                    <button
                      className="btn-primary"
                      onClick={handleGenerateUebung}
                      style={{ marginTop: '0.75rem', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
                      title="Erzeugt ein Übungsblatt zu den häufigsten Fehlern dieser Klasse"
                    >
                      <Wand2 size={15} /> Übungsblatt zu Top-Fehlern generieren
                    </button>
                  )}
                </div>
              </div>

              {fehlerDetail && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem' }}>
                    {FEHLER_LABELS[fehlerDetail.typ] ?? fehlerDetail.typ} — Details ({fehlerDetail.rows.length})
                  </h4>
                  <div style={{ maxHeight: 300, overflow: 'auto' }}>
                    {fehlerDetail.rows.map((f, i) => (
                      <div key={i} style={{ padding: '0.375rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.8125rem' }}>
                        {f.zitat && <span style={{ fontStyle: 'italic' }}>"{f.zitat}"</span>}
                        {f.korrektur && <span> → {f.korrektur}</span>}
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                          {f.vorname ?? f.dateiname}
                        </span>
                        {f.erklaerung && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{f.erklaerung}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {abgaben.length > 0 && (
                <div style={cardStyle}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    <Users size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Abgaben ({abgaben.length})
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Schüler/in</th>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Note</th>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Lehrernote</th>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem' }}>Textsorte</th>
                          <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem' }}>Wörter</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abgaben.map((a) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{[a.vorname, a.nachname].filter(Boolean).join(' ') || a.dateiname}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{noteLabel(a.note)}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{a.hatLehrerFeedback ? <strong>{noteLabel(a.noteFinal)}</strong> : '—'}</td>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{a.textsorte ?? '—'}</td>
                            <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>{a.wortanzahl ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'statistik' && selectedKlasse && (
            <>
              {trend.length > 1 && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                    <TrendingUp size={16} style={{ verticalAlign: -2, marginRight: 6 }} /> Noten-Trend
                  </h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="aufgabe" tick={{ fontSize: 12 }} />
                      <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} reversed />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avgNoteApp" name="KI-Note" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                      <Line type="monotone" dataKey="avgNoteLehrer" name="Lehrernote" stroke="#e74c3c" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {kalibrierung && (
                <div style={{ ...cardStyle, marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem' }}>Kalibrierung (KI vs. Lehrer)</h4>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>KI-Durchschnitt</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                        {kalibrierung.appAvg !== null ? kalibrierung.appAvg.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Lehrer-Durchschnitt</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {kalibrierung.lehrerAvg !== null ? kalibrierung.lehrerAvg.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Tendenz</div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                        {kalibrierung.tendenz === 'app strenger' ? 'KI strenger' :
                         kalibrierung.tendenz === 'app milder' ? 'KI milder' :
                         kalibrierung.tendenz === 'deckungsgleich' ? 'Deckungsgleich' : 'n/a'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Paare</div>
                      <div style={{ fontSize: '1.125rem' }}>{kalibrierung.nMitFeedback} / {kalibrierung.nGesamt}</div>
                    </div>
                  </div>
                </div>
              )}

              {trend.length <= 1 && !loading && (
                <div style={cardStyle}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                    Mindestens zwei Aufgaben mit Noten benötigt für den Trend.
                  </p>
                </div>
              )}

              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.875rem', margin: 0 }}>
                    <Sparkles size={15} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--color-accent)' }} />
                    KI-Klassen-Briefing
                  </h4>
                  <button
                    className="btn-primary"
                    onClick={handleGenerateBriefing}
                    disabled={briefingBusy}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                    title="Generiert ein KI-Briefing zur aktuellen Klassensituation (Fehlerschwerpunkte, Notenverteilung, Trend)"
                  >
                    {briefingBusy ? <><Loader2 size={13} className="spin" /> Generiere …</> : <><Sparkles size={13} /> Briefing generieren</>}
                  </button>
                </div>
                {briefingError && <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger, #c0392b)', margin: '0.25rem 0' }}>{briefingError}</p>}
                {briefing ? (
                  <>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
                      {briefing.erstelltAm && `${briefing.erstelltAm} · `}{briefing.modell || 'Modell unbekannt'}
                    </p>
                    <div style={{ maxHeight: '40vh', overflowY: 'auto', fontSize: '0.8125rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--color-bg-base)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                      {briefing.text}
                    </div>
                  </>
                ) : (
                  !briefingBusy && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>Noch kein Briefing — Button klicken zum Generieren.</p>
                )}
              </div>
            </>
          )}

          {!selectedKlasse && !error && tab === 'uebersicht' && (
            <div style={cardStyle}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0, textAlign: 'center' }}>
                Wähle eine Klasse aus der Liste.
              </p>
            </div>
          )}
        </div>
      </div>
    </ViewShell>
  );
}