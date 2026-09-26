import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap, AlertTriangle, ClipboardCheck,
  ChevronRight, Timer, Files, Clock, Coins,
  Grid3X3, Languages, Pencil, AlignLeft, Repeat, Wand2,
  CalendarDays, ArrowRight, Paperclip, CircleSlash,
} from 'lucide-react';
import { useNatascha } from '../hooks/useNatascha';
import { usePlanung } from '../hooks/usePlanung';
import { useKlassenMeta } from '../hooks/useKlassenMeta';
import { farbListeAusKlassen, klasseFarbStil } from '../lib/klassenFarben';
import { alsStunden } from '../lib/planungAdapter';
import { datumNumerisch, heuteIso, istWochenende, plusTage, wochentag, WOCHENTAGE_KURZ, WOCHENTAGE_LANG } from '../lib/lokalDatum';
import {
  naechsteStunden, relativTagesueberschrift, zeitSpanne,
} from '../lib/stundenMappen';
import { loadDocuments, loadTemplates } from '../lib/storage';
import { loadTeacherProfile } from '../lib/profile';
import { BLOCK_TYPE_DEFS } from '../lib/constants';
import type { SavedDocument, ActiveView } from '../lib/types';
import { FEATURES } from '../lib/features';
import { fachLabel } from '@lehrunterlagen/schema';
import type { Block, Fach } from '@lehrunterlagen/schema';
import { StartActionIllustration } from '../components/ui/StartActionIllustration';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Tile } from '../components/ui/Tile';
import {
  buildPrefillFromHeatmap,
  KATEGORIE_LABEL,
  type NataschaPrefill,
} from '../lib/nataschaBridge';

interface DashboardViewProps {
  resumeTitle?: string;
  onResume?: () => void;
  onOpenDocument?: (document: SavedDocument) => void;
  onNavigate?: (view: ActiveView) => void;
  onStartQuickExercise?: (config: { fach: 'deutsch' | 'englisch'; stufe: 'unterstufe' | 'oberstufe'; typ: Block['typ']; thema: string }) => void;
  onGenerateUebung?: (prefill: NataschaPrefill) => void;
  /** Klick auf einen Tag im Streifen: in der Planung genau diesen Tag zeigen. */
  onPlanungTag?: (datum: string) => void;
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

export function DashboardView({ resumeTitle, onResume, onOpenDocument, onNavigate, onStartQuickExercise, onGenerateUebung, onPlanungTag }: DashboardViewProps = {}) {
  const { listKlassen, getNotenverteilung, getKlassenTrend, getHeatmap, quelltextGet } = useNatascha();
  const [rows, setRows] = useState<KlasseStat[]>([]);
  const [empfehlung, setEmpfehlung] = useState<EmpfehlungDesTages | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');

  // „Was steht an" braucht Raster, Stunden und Ferien – derselbe Hook wie in der
  // Planung, aber ohne Schreibaktionen.
  const planung = usePlanung();
  const { klassen: klassenMeta } = useKlassenMeta();
  const farbListe = useMemo(() => farbListeAusKlassen(klassenMeta), [klassenMeta]);
  // „in den nächsten 7 Tagen" – dieselbe Spanne wie der Streifen unten, sonst
  // verspricht die Zahl mehr, als der Streifen zeigt.
  const planungAnzahl = useMemo(
    () => naechsteStunden(alsStunden(planung.stunden), heuteIso(), 40)
      .filter(s => s.datum < plusTage(heuteIso(), TAGE_IM_UEBERBLICK)).length,
    [planung.stunden],
  );

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

      {/* ═══ Begrüßung: kompakt, damit „Was steht an" sofort sichtbar ist ═══ */}
      <header className="dashboard-begruessung">
        <h1 className="font-script ink-underline dashboard-begruessung__titel">{greetTime()}</h1>
        <p className="dashboard-begruessung__wo">
          <ArrowRight size={13} aria-hidden />
          <span>Startseite</span>
          {FEATURES.natascha && (
            <button className="dashboard-begruessung__link" onClick={() => onNavigate?.('korrektur')}>
              Zu den Korrekturen
            </button>
          )}
          {planungAnzahl > 0 && (
            <button className="dashboard-begruessung__link" onClick={() => onNavigate?.('planung')}>
              {planungAnzahl} {planungAnzahl === 1 ? 'Stunde' : 'Stunden'} in den nächsten zwei Wochen
            </button>
          )}
          {planungAnzahl === 0 && (
            <button className="dashboard-begruessung__link" onClick={() => onNavigate?.('planung')}>
              Stundenplan öffnen
            </button>
          )}
        </p>
      </header>

      <section className="resume-work" aria-labelledby="resume-title">
        <div><h2 id="resume-title">Weiterarbeiten</h2><p>Dein Unterricht, deine offenen Aufgaben.</p></div>
        <div className="resume-actions">
          {resumeTitle && <button className="btn-primary" onClick={onResume}>Entwurf fortsetzen: {resumeTitle}</button>}
          {lastDocument && <button className="btn-secondary" onClick={()=>onOpenDocument?.(lastDocument)}>Letzte Unterlage: {lastDocument.title}</button>}
          {/* „Wie zuletzt" stand previously als eigene Kachel weit unten, obwohl
              es dieselbe Information wie „Letzte Unterlage" transportiert. Der
              Knopf ist jetzt hier oben bei seinen Geschwistern. */}
          {lastDocument && (
            <button
              className="btn-secondary"
              onClick={() => onNavigate?.('wizard')}
              title="Neue Unterlage mit denselben Einstellungen starten"
            >
              <Repeat size={13} /> Wie zuletzt: {fachLabel(lastDocument.snapshot.meta.fach)} &middot; {typLabel(lastDocument.snapshot.meta.typ)}
            </button>
          )}
          {FEATURES.natascha && <button className="btn-secondary" onClick={()=>onNavigate?.('korrektur')}>Korrekturen weiterprüfen</button>}
          {!resumeTitle && !lastDocument && <span>Beginne unten mit deiner ersten Unterlage.</span>}
        </div>
      </section>

      {/* ═══ Was steht an: die nächsten sieben Tage und die offenen Aufgaben ═══ */}
      <WochenPlan
        planung={planung}
        onNavigate={onNavigate}
        onTagKlick={onPlanungTag}
        farbListe={farbListe}
      />

      {/* ═══ Startwege ═══ */}
      <section className="paper dashboard-start" aria-labelledby="dashboard-start-title">
        <h2 id="dashboard-start-title" className="font-script dashboard-start__subtitle">
          Was möchtest du vorbereiten?
        </h2>

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

        {/* Die Schnell-Vorlagen standen previously als eigener Abschnitt
            zwischen den Startwegen und der Vorlagenliste - ein Block für vier
            Kacheln, die inhaltlich zu den Startwegen gehören. */}
        {onStartQuickExercise && (
          <>
            <p className="dashboard-start__zwischentitel">Oder direkt mit einem Aufgabentyp loslegen</p>
            <div className="dashboard-schnellvorlagen">
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
          </>
        )}
      </section>

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
          <LoadingSpinner />
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

/**
 * „Was steht an": die nächsten sieben Tage als Streifen plus die Liste der
 * anstehenden Stunden. Rollierend – heute plus sechs Tage, nicht die
 * Kalenderwoche, damit am Freitag nicht plötzlich eine leere Woche dasteht.
 * Bewusst kompakt: die Startseite soll zeigen, was als Nächstes ansteht, nicht
 * den Stundenplan im Vollbild.
 */
const TAGE_IM_UEBERBLICK = 7;

function WochenPlan({
  planung, onNavigate, onTagKlick, farbListe,
}: {
  planung: ReturnType<typeof usePlanung>;
  onNavigate?: (view: ActiveView) => void;
  onTagKlick?: (datum: string) => void;
  farbListe: Map<string, number>;
}) {
  const stunden = useMemo(() => alsStunden(planung.stunden), [planung.stunden]);
  const von = heuteIso();
  const bis = plusTage(von, TAGE_IM_UEBERBLICK);
  const imZeitraum = useMemo(
    () => stunden.filter(s => s.datum >= von && s.datum < bis)
      .sort((a, b) => a.datum.localeCompare(b.datum) || (a.startZeit ?? '99:99').localeCompare(b.startZeit ?? '99:99')),
    [stunden],
  );
  const anstehend = useMemo(() => naechsteStunden(stunden, von, 8), [stunden]);

  const stil = useCallback(
    (klasseName: string) => klasseFarbStil(undefined, klasseName, farbListe),
    [farbListe],
  );

  const tage = useMemo(() => {
    const liste: Array<{ datum: string; anzahl: number; ohne: number; wochenende: boolean }> = [];
    for (let i = 0; i < TAGE_IM_UEBERBLICK; i++) {
      const datum = plusTage(von, i);
      const amTag = imZeitraum.filter(s => s.datum === datum);
      liste.push({
        datum,
        anzahl: amTag.length,
        ohne: amTag.filter(s => s.anzahlMaterialien === 0).length,
        wochenende: istWochenende(datum),
      });
    }
    return liste;
  }, [imZeitraum, von]);

  if (stunden.length === 0) {
    return (
      <section className="start-woche" aria-labelledby="start-standan-leer">
        <h2 id="start-standan-leer" className="start-woche__titel">
          <CalendarDays size={15} /> Was steht an
        </h2>
        <p className="start-woche__leer">
          Du hast noch kein Wochenraster angelegt. Trag deine festen Stunden ein –
          LUA macht daraus einzelne Stunden, die du verschieben, ausfallen lassen
          und mit Unterlagen versehen kannst.
        </p>
        <button className="btn-primary" onClick={() => onNavigate?.('planung')}>
          Stundenplan öffnen <ChevronRight size={15} />
        </button>
      </section>
    );
  }

  return (
    <section className="start-woche" aria-labelledby="start-standan-title">
      <h2 id="start-standan-title" className="start-woche__titel">
        <CalendarDays size={15} /> Was steht an
        <span className="start-woche__zahl">
          {imZeitraum.length} {imZeitraum.length === 1 ? 'Stunde' : 'Stunden'} in den nächsten {TAGE_IM_UEBERBLICK} Tagen
        </span>
        <button className="start-woche__mehr" onClick={() => onNavigate?.('planung')}>
          Stundenplan <ChevronRight size={13} />
        </button>
      </h2>

      <div className="start-woche__streifen">
        {tage.map(t => {
          const wochenende = t.wochenende;
          const beschriftung = wochenende
            ? `${WOCHENTAGE_LANG[wochentag(t.datum) - 1]} ${datumNumerisch(t.datum)} – Wochenende`
            : `${WOCHENTAGE_LANG[wochentag(t.datum) - 1]} ${datumNumerisch(t.datum)}`;
          const inhalt = (
            <>
              <div className="start-tag-kopf">
                <span className="start-tag-wochentag">{WOCHENTAGE_KURZ[wochentag(t.datum) - 1]}</span>
                <span className="start-tag-zahl">{Number(t.datum.slice(8, 10))}</span>
              </div>
              {t.anzahl === 0 ? (
                <span className="start-tag-frei">{wochenende ? '' : '–'}</span>
              ) : (
                <>
                  <div className="start-tag-stunden">
                    {imZeitraum.filter(s => s.datum === t.datum).map(s => (
                      <span
                        key={s.id}
                        className="start-tag-klasse"
                        style={stil(s.klasseName)}
                        title={`${s.klasseName} · ${zeitSpanne(s.startZeit, s.endeZeit)} · ${s.titel || 'Unterricht'}`}
                      >
                        {s.klasseName || 'ohne Klasse'}
                      </span>
                    ))}
                  </div>
                  {t.ohne > 0 && (
                    <span className="start-tag-warnung" title={`${t.ohne} ohne Unterlage`}>
                      <Paperclip size={9} /> {t.ohne}
                    </span>
                  )}
                </>
              )}
            </>
          );
          const klasse = [
            'start-tag',
            t.datum === von ? 'start-tag-ist-heute' : '',
            wochenende ? 'start-tag-ist-wochenende' : '',
            onTagKlick ? 'start-tag-ist-klickbar' : '',
          ].filter(Boolean).join(' ');
          const titel = `${beschriftung}${t.anzahl > 0 ? `, ${t.anzahl} ${t.anzahl === 1 ? 'Stunde' : 'Stunden'}` : ''}${onTagKlick ? ' – im Stundenplan zeigen' : ''}`;

          // Ein Tag ohne Stunden und ohne Klickziel bleibt ein div: ein Button,
          // der nichts tut, ist schlechter als kein Button.
          return onTagKlick ? (
            <button key={t.datum} type="button" className={klasse} title={titel}
              onClick={() => onTagKlick(t.datum)}>
              {inhalt}
            </button>
          ) : (
            <div key={t.datum} className={klasse} title={titel}>{inhalt}</div>
          );
        })}
      </div>

      <div className="start-anstehend">
        <h3>Anstehend</h3>
        {anstehend.length === 0 ? (
          <p className="start-woche__leer">Ab heute ist nichts mehr geplant.</p>
        ) : (
          <ul>
            {anstehend.map(s => (
              <li key={s.id} style={stil(s.klasseName)}>
                <span className="start-anstehend__tag">{relativTagesueberschrift(s.datum)}</span>
                <span className="start-anstehend__klasse">{s.klasseName || 'ohne Klasse'}</span>
                <span className="start-anstehend__zeit">{zeitSpanne(s.startZeit, s.endeZeit)}</span>
                {s.einsatzArt === 'ausgefallen' ? (
                  <span className="start-anstehend__entfallen"><CircleSlash size={11} /> entfällt</span>
                ) : s.anzahlMaterialien === 0 ? (
                  <span className="start-anstehend__fehlt"><Paperclip size={11} /> keine Unterlage</span>
                ) : (
                  <span className="start-anstehend__ok"><Paperclip size={11} /> {s.anzahlMaterialien}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
