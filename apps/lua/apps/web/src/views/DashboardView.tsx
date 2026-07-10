import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap, AlertTriangle, Loader2, ClipboardCheck,
  ChevronRight, FileText, Timer, Files, Clock, Coins,
  Grid3X3, Languages, Pencil, AlignLeft, Repeat, Wand2,
} from 'lucide-react';
import { useNatascha } from '../hooks/useNatascha';
import { loadDocuments, loadTemplates } from '../lib/storage';
import { loadTeacherProfile } from '../lib/profile';
import { BLOCK_TYPE_DEFS } from '../lib/constants';
import type { ActiveView } from '../lib/types';
import { FEATURES } from '../lib/features';
import { fachLabel } from '@lehrunterlagen/schema';
import type { Block, Fach } from '@lehrunterlagen/schema';
import { StartActionIllustration } from '../components/ui/StartActionIllustration';
import { Tile } from '../components/ui/Tile';
import {
  buildPrefillFromHeatmap,
  KATEGORIE_LABEL,
  type NataschaPrefill,
} from '../lib/nataschaBridge';

interface DashboardViewProps {
  onNavigate?: (view: ActiveView) => void;
  onStartQuickExercise?: (config: { fach: 'deutsch' | 'englisch'; stufe: 'unterstufe' | 'oberstufe'; typ: Block['typ']; thema: string }) => void;
  onGenerateUebung?: (prefill: NataschaPrefill) => void;
}

interface KlasseStat {
  klasse: string;
  anzahlAbgaben: number;
  durchschnitt: number | null;
  letztesDatum: string | null;
  letzteAufgabe: string | null;
  abgaben: number;
  mitFeedback: number;
}

interface DashboardHeatmapEntry {
  typ: string;
  anzahl: number;
  prozent?: number;
}

interface EmpfehlungDesTages {
  klasse: string;
  aufgabe: string;
  heatmap: DashboardHeatmapEntry[];
  topLabel: string;
  topAnzahl: number;
}

const HANDLUNGSBEDARF_AB = 3.5;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

function trendDatumTime(d: string | null): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
}

const START_ACTIONS = [
  {
    variant: 'quelltext' as const,
    view: 'wizard' as const,
    title: 'Aus Quelltext',
    sub: 'Schularbeit / Test zu einem Text',
    desc: 'Material hochladen oder einfügen; daraus entstehen passende Aufgaben.',
    min: '~5 Min',
    cta: 'Material starten',
    primary: true,
  },
  {
    variant: 'kompetenz' as const,
    view: 'kompetenz' as const,
    title: 'Ohne Quelltext',
    sub: 'Übung aus Kompetenz & Lehrplan',
    desc: 'Fach, Schulstufe und Kompetenz wählen; LUKA baut eine Übung.',
    min: '~2 Min',
    cta: 'Kompetenz wählen',
    primary: false,
  },
  {
    variant: 'schnell' as const,
    view: 'quick' as const,
    title: 'Schnell-Übung',
    sub: 'Ein Aufgabentyp, sofort',
    desc: 'Ein Thema, ein Aufgabentyp, sofort im Baukasten.',
    min: '~1 Min',
    cta: 'Sofort bauen',
    primary: false,
  },
];

export function DashboardView({ onNavigate, onStartQuickExercise, onGenerateUebung }: DashboardViewProps = {}) {
  const { listKlassen, getNotenverteilung, getKlassenTrend, getHeatmap, quelltextGet } = useNatascha();
  const [rows, setRows] = useState<KlasseStat[]>([]);
  const [empfehlung, setEmpfehlung] = useState<EmpfehlungDesTages | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadTeacherProfile().then((profil) => {
      if (!cancelled && profil?.displayName?.trim()) {
        setDisplayName(profil.displayName.trim());
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!FEATURES.natascha || !isTauriRuntime()) {
      setRows([]);
      setEmpfehlung(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setEmpfehlung(null);
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
          letzteAufgabe: last?.aufgabe ?? null,
        } as KlasseStat;
      }));

      const newest = stats
        .filter((s) => s.letztesDatum)
        .sort((a, b) => trendDatumTime(b.letztesDatum) - trendDatumTime(a.letztesDatum))[0];

      let nextEmpfehlung: EmpfehlungDesTages | null = null;
      if (newest?.letzteAufgabe) {
        try {
          const heatmap = await getHeatmap(newest.klasse, newest.letzteAufgabe);
          const top = [...heatmap]
            .filter((h) => h.anzahl > 0)
            .sort((a, b) => b.anzahl - a.anzahl)[0];
          if (top) {
            nextEmpfehlung = {
              klasse: newest.klasse,
              aufgabe: newest.letzteAufgabe,
              heatmap,
              topLabel: KATEGORIE_LABEL[top.typ] ?? top.typ,
              topAnzahl: top.anzahl,
            };
          }
        } catch {
          nextEmpfehlung = null;
        }
      }

      if (!cancelled) { setRows(stats); setEmpfehlung(nextEmpfehlung); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [listKlassen, getNotenverteilung, getKlassenTrend, getHeatmap]);

  const lastDocument = useMemo(() => {
    const docs = loadDocuments().filter((d) => !d.isDeleted);
    if (docs.length === 0) return null;
    return docs.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b);
  }, []);

  // Vorlagen für die Schnellzugriff-Reihe (jüngste zuerst, max. 4)
  const vorlagen = useMemo(() => {
    return [...loadTemplates()]
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
      .slice(0, 4)
      .map((t) => {
        const meta = (t.meta ?? {}) as { fach?: string; stufe?: string };
        const bloecke = Array.isArray(t.bloecke)
          ? (t.bloecke as Array<{ typ?: string; punkte?: number }>)
          : [];
        const punkte = bloecke.reduce((s, b) => s + (b.punkte ?? 0), 0);
        const minuten = bloecke.reduce<[number, number]>(
          (acc, b) => {
            const def = BLOCK_TYPE_DEFS.find((d) => d.id === b.typ);
            if (!def) return acc;
            return [acc[0] + def.minuten[0], acc[1] + def.minuten[1]];
          },
          [0, 0],
        );
        return {
          id: t.id,
          name: t.name,
          fach: meta.fach ? fachLabel(meta.fach as Fach) : null,
          stufe: meta.stufe === 'oberstufe' ? 'Oberstufe' : meta.stufe === 'unterstufe' ? 'Unterstufe' : null,
          punkte,
          minuten,
        };
      });
  }, []);

  const gesamtAbgaben = rows.reduce((s, r) => s + r.anzahlAbgaben, 0);
  const handlungsbedarf = rows.filter((r) => r.durchschnitt !== null && r.durchschnitt >= HANDLUNGSBEDARF_AB);

  const fmtDatum = (d: string | null) => {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const typLabel = (typ?: string) => {
    switch (typ) {
      case 'hausuebung': return 'Hausübung';
      case 'test': return 'Test';
      case 'schuluebung': return 'Schulübung';
      case 'schularbeit': return 'Schularbeit';
      case 'matura': return 'Matura';
      default: return typ ?? 'Unterlage';
    }
  };

  const greetTime = () => {
    const h = new Date().getHours();
    const gruss = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
    return displayName ? `${gruss}, ${displayName}.` : `${gruss}.`;
  };

  const handleGenerateEmpfehlung = useCallback(async () => {
    if (!empfehlung || !onGenerateUebung) return;
    let ausgangstext = '';
    try {
      ausgangstext = await quelltextGet(empfehlung.klasse, empfehlung.aufgabe);
    } catch {
      ausgangstext = '';
    }
    const prefill = buildPrefillFromHeatmap({
      klasse: empfehlung.klasse,
      aufgabe: empfehlung.aufgabe,
      heatmap: empfehlung.heatmap,
      ausgangstext,
    });
    if (prefill) onGenerateUebung(prefill);
  }, [empfehlung, onGenerateUebung, quelltextGet]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ═══ HERO: Begrüßung + drei Startwege ═══ */}
      <section className="paper dashboard-start" aria-labelledby="dashboard-start-title">
        <div className="dashboard-start__header">
          <div>
            <h1 id="dashboard-start-title" className="font-script ink-underline dashboard-start__greeting">
              {greetTime()}
            </h1>
            <p className="font-script dashboard-start__subtitle">Was möchtest du vorbereiten?</p>
          </div>
        </div>

        <div className="dashboard-actions">
          {START_ACTIONS.map((d) => (
            <button
              key={d.variant}
              className={`card card-clickable start-action-card start-action-card--${d.variant} ${d.primary ? 'start-action-card--primary' : 'start-action-card--secondary'}`}
              onClick={() => onNavigate?.(d.view)}
              aria-label={`${d.title} — ${d.sub}`}
            >
              <StartActionIllustration variant={d.variant} />
              <div className="start-action-card__body">
                <span className="badge badge-info start-action-card__time">
                  <Timer size={11} /> {d.min} Einrichtung
                </span>
                <h2 className="start-action-card__title">{d.title}</h2>
                <p className="start-action-card__sub">{d.sub}</p>
                <p className="start-action-card__desc">{d.desc}</p>
                <span className="start-action-card__cta">
                  {d.cta} <ChevronRight size={15} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ═══ Schnell-Übungen ═══ */}
      {onStartQuickExercise && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
          }}>
            Schnell-Vorlagen
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
            {([
              { label: 'Kreuzwort', icon: Grid3X3, fach: 'deutsch' as const, stufe: 'unterstufe' as const, typ: 'kreuzwortraetsel' as const, thema: 'Kreuzworträtsel — Thema anpassen' },
              { label: 'Vokabeltest', icon: Languages, fach: 'englisch' as const, stufe: 'unterstufe' as const, typ: 'vokabeluebung' as const, thema: 'Vokabeltest — Thema anpassen' },
              { label: 'Fehlerkorrektur', icon: Pencil, fach: 'deutsch' as const, stufe: 'oberstufe' as const, typ: 'fehlerkorrektur' as const, thema: 'Fehlerkorrektur — Thema anpassen' },
              { label: 'Lückentext', icon: AlignLeft, fach: 'deutsch' as const, stufe: 'unterstufe' as const, typ: 'lueckentext' as const, thema: 'Lückentext — Thema anpassen' },
            ] as const).map((s) => (
              <button
                key={s.label}
                className="tile"
                onClick={() => onStartQuickExercise({ fach: s.fach, stufe: s.stufe, typ: s.typ, thema: s.thema })}
                style={{ fontSize: '0.8125rem', textAlign: 'left', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}
              >
                <s.icon size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Wie zuletzt ═══ */}
      {lastDocument && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
          }}>
            Wie zuletzt
          </p>
          <button
            className="card card-clickable"
            onClick={() => onNavigate?.('wizard')}
            aria-label={`Neue Unterlage wie zuletzt: ${lastDocument.title}`}
            style={{
              padding: '1rem 1.5rem',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              width: '100%',
            }}
          >
            <Repeat size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                Wie zuletzt: {fachLabel(lastDocument.snapshot.meta.fach)}
                {' '}·{' '}
                {lastDocument.snapshot.meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'}
                {' '}·{' '}
                {typLabel(lastDocument.snapshot.meta.typ)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Neue Unterlage mit denselben Einstellungen starten
              </div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          </button>
        </div>
      )}

      {/* ═══ Weiterarbeiten ═══ */}
      {lastDocument && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem',
          }}>
            Weiterarbeiten
          </p>
          <button
            className="card card-clickable"
            onClick={() => onNavigate?.('wizard')}
            aria-label={`Weiterarbeiten an: ${lastDocument.title}`}
            style={{
              padding: '1rem 1.5rem',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              width: '100%',
            }}
          >
            <FileText size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {lastDocument.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {fachLabel(lastDocument.snapshot.meta.fach)}
                {' '}&middot;{' '}
                {lastDocument.snapshot.meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'}
                {' '}&middot;{' '}
                {fmtDatum(lastDocument.updatedAt)}
              </div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          </button>
        </div>
      )}

      {/* ═══ Vorlagen ═══ */}
      {vorlagen.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
            <p style={{
              fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
            }}>
              Vorlagen
            </p>
            <button
              className="btn-secondary"
              onClick={() => onNavigate?.('templates')}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Alle Vorlagen <ChevronRight size={13} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {vorlagen.map((v) => (
              <Tile
                key={v.id}
                onClick={() => onNavigate?.('templates')}
                icon={<Files size={18} />}
                title={v.name}
                ariaLabel={`Vorlage ${v.name} öffnen`}
                subtitle={[v.fach, v.stufe].filter(Boolean).join(' · ') || undefined}
              >
                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  {v.minuten[1] > 0 && (
                    <span className="badge badge-info">
                      <Clock size={11} /> ~{v.minuten[0]}–{v.minuten[1]} Min
                    </span>
                  )}
                  {v.punkte > 0 && (
                    <span className="badge badge-context">
                      <Coins size={11} /> {v.punkte} Pkte
                    </span>
                  )}
                </div>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {/* ═══ NATASCHA-Klassenstats ═══ */}
      {FEATURES.natascha && (loading ? (
        <div className="card" style={{ padding: '1.25rem' }}>
          <Loader2 size={18} className="spin" style={{ verticalAlign: -2, marginRight: 6 }} /> Laden …
        </div>
      ) : rows.length > 0 && (
        <div>
          {empfehlung && onGenerateUebung && (
            <section
              className="card"
              aria-label="Empfehlung des Tages"
              style={{
                padding: '1rem 1.15rem',
                marginBottom: '1.5rem',
                borderColor: 'color-mix(in srgb, var(--color-accent) 38%, var(--color-border))',
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-info-bg) 72%, var(--color-bg-surface)) 0%, var(--color-bg-surface) 72%)',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 240, flex: '1 1 420px' }}>
                  <p style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.35rem',
                  }}>
                    Empfehlung des Tages
                  </p>
                  <h2 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {empfehlung.klasse}: häufigster Fehler in {empfehlung.aufgabe} war {empfehlung.topLabel} ({empfehlung.topAnzahl}×).
                  </h2>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    Ein Klick, und LUKA baut dir ein passendes Übungsblatt.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleGenerateEmpfehlung}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                >
                  <Wand2 size={16} /> Gezielte Übung erstellen
                </button>
              </div>
            </section>
          )}

          <h2 className="ink-underline" style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Klassenübersicht
          </h2>

          {/* Kennzahlen — editoriale Zahlen-Zeile statt Karten-Boxen */}
          <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1, color: 'var(--color-accent)' }}>{rows.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.25rem' }}>
                <GraduationCap size={13} /> Klassen
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1, color: 'var(--color-accent)' }}>{gesamtAbgaben}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.25rem' }}>
                <ClipboardCheck size={13} /> Abgaben gesamt
              </div>
            </div>
            <div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, lineHeight: 1, color: handlungsbedarf.length > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                {handlungsbedarf.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.25rem' }}>
                <AlertTriangle size={13} /> Handlungsbedarf · Ø ≥ {HANDLUNGSBEDARF_AB.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Handlungsbedarf — Klassen mit kritischem Schnitt als Liste */}
          {handlungsbedarf.length > 0 && (
            <div className="card" style={{ padding: '0.5rem 0', marginBottom: '1.25rem', borderColor: 'var(--color-error)' }}>
              <p style={{
                fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-error)',
                textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.5rem 1rem',
              }}>
                Handlungsbedarf
              </p>
              {handlungsbedarf
                .slice()
                .sort((a, b) => (b.durchschnitt ?? 0) - (a.durchschnitt ?? 0))
                .map((r) => {
                  const akut = (r.durchschnitt ?? 0) >= 4.0;
                  return (
                    <button
                      key={r.klasse}
                      onClick={() => onNavigate?.('klassen')}
                      aria-label={`Klasse ${r.klasse} ansehen — Ø ${r.durchschnitt?.toFixed(2)}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                        padding: '0.5rem 1rem', background: 'none', border: 'none',
                        borderRadius: 0, cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{
                        width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                        background: akut ? 'var(--color-error)' : 'var(--color-warning)',
                      }} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.klasse}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', flex: 1 }}>
                        Ø {r.durchschnitt?.toFixed(2)} · {r.anzahlAbgaben} Abgaben
                      </span>
                      <ChevronRight size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    </button>
                  );
                })}
            </div>
          )}

          {/* Klassen-Karten */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {rows.map((r) => {
              const kritisch = r.durchschnitt !== null && r.durchschnitt >= HANDLUNGSBEDARF_AB;
              const feedbackQuote = r.abgaben > 0 ? Math.round((r.mitFeedback / r.abgaben) * 100) : null;
              return (
                <button
                  key={r.klasse}
                  className="card card-clickable"
                  onClick={() => onNavigate?.('klassen')}
                  style={{
                    textAlign: 'left', cursor: onNavigate ? 'pointer' : 'default',
                    borderLeft: `4px solid ${kritisch ? 'var(--color-error)' : 'var(--color-accent)'}`,
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    padding: '1.25rem',
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
                      <div style={{ fontSize: '1.25rem', fontWeight: 600, color: kritisch ? 'var(--color-error)' : undefined }}>
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
        </div>
      ))}
    </div>
  );
}
