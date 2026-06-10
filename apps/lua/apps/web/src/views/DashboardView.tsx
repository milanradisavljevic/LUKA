import { useState, useEffect } from 'react';
import { LayoutDashboard, GraduationCap, AlertTriangle, Loader2, ClipboardCheck, ChevronRight } from 'lucide-react';
import { useNatascha } from '../hooks/useNatascha';
import { ViewShell } from './_ViewShell';

interface DashboardViewProps {
  /** Navigation zu einer anderen Ansicht (z. B. Korrektur/Klassen). */
  onNavigate?: (view: 'korrektur' | 'klassen') => void;
}

interface KlasseStat {
  klasse: string;
  anzahlAbgaben: number;
  durchschnitt: number | null;
  letztesDatum: string | null;
  abgaben: number;
  mitFeedback: number;
}

/** Note ab 3.5 (österr.: höher = schlechter) gilt als Handlungsbedarf. */
const HANDLUNGSBEDARF_AB = 3.5;

export function DashboardView({ onNavigate }: DashboardViewProps = {}) {
  const { listKlassen, getNotenverteilung, getKlassenTrend } = useNatascha();
  const [rows, setRows] = useState<KlasseStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ks = await listKlassen();
      const stats = await Promise.all(ks.map(async (k) => {
        const [nv, trend] = await Promise.all([
          getNotenverteilung(k.klasse),
          getKlassenTrend(k.klasse),
        ]);
        const last = trend.length ? trend[trend.length - 1] : null;
        const abgaben = trend.reduce((s, t) => s + t.n, 0);
        const mitFeedback = trend.reduce((s, t) => s + t.nMitFeedback, 0);
        return {
          klasse: k.klasse,
          anzahlAbgaben: k.anzahlAbgaben,
          durchschnitt: nv.durchschnitt,
          letztesDatum: last?.datum ?? null,
          abgaben,
          mitFeedback,
        } as KlasseStat;
      }));
      if (!cancelled) { setRows(stats); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [listKlassen, getNotenverteilung, getKlassenTrend]);

  const cardStyle = {
    padding: '1.25rem', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
  } as const;

  const gesamtAbgaben = rows.reduce((s, r) => s + r.anzahlAbgaben, 0);
  const handlungsbedarf = rows.filter((r) => r.durchschnitt !== null && r.durchschnitt >= HANDLUNGSBEDARF_AB);

  const fmtDatum = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <ViewShell
      title="Übersicht"
      description="Schnellüberblick über Klassen, Korrekturstand und Handlungsbedarf."
      maxWidth={1100}
    >
      {loading ? (
        <div style={cardStyle}><Loader2 size={18} className="spin" style={{ verticalAlign: -2, marginRight: 6 }} /> Laden …</div>
      ) : rows.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
            Noch keine Daten. Starte eine Korrektur, um die Übersicht zu füllen.
          </p>
        </div>
      ) : (
        <>
          {/* Kennzahlen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GraduationCap size={14} /> Klassen
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{rows.length}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <ClipboardCheck size={14} /> Abgaben gesamt
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{gesamtAbgaben}</div>
            </div>
            <div style={{ ...cardStyle, borderColor: handlungsbedarf.length > 0 ? 'var(--color-danger, #c0392b)' : undefined }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={14} /> Handlungsbedarf
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: handlungsbedarf.length > 0 ? 'var(--color-danger, #c0392b)' : undefined }}>
                {handlungsbedarf.length}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Klassen mit Ø ≥ {HANDLUNGSBEDARF_AB.toFixed(1)}</div>
            </div>
          </div>

          {/* Klassen-Karten */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {rows.map((r) => {
              const kritisch = r.durchschnitt !== null && r.durchschnitt >= HANDLUNGSBEDARF_AB;
              const feedbackQuote = r.abgaben > 0 ? Math.round((r.mitFeedback / r.abgaben) * 100) : null;
              return (
                <button
                  key={r.klasse}
                  onClick={() => onNavigate?.('klassen')}
                  style={{
                    ...cardStyle, textAlign: 'left', cursor: onNavigate ? 'pointer' : 'default',
                    borderLeft: `4px solid ${kritisch ? 'var(--color-danger, #c0392b)' : 'var(--color-accent)'}`,
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700 }}>{r.klasse}</span>
                    <ChevronRight size={14} style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Abgaben</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{r.anzahlAbgaben}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Ø KI-Note</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: kritisch ? 'var(--color-danger, #c0392b)' : undefined }}>
                        {r.durchschnitt !== null ? r.durchschnitt.toFixed(2) : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                    Zuletzt: {fmtDatum(r.letztesDatum)}
                    {feedbackQuote !== null && <> · Lehrer-Feedback: {feedbackQuote}%</>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </ViewShell>
  );
}
