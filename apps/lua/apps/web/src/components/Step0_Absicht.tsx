import { useState, useCallback, useMemo } from 'react';
import { ArrowRight, Clock, FolderOpen, BookOpen, ClipboardCheck } from 'lucide-react';
import type { AppState, AppAction } from '../lib/types';
import { BLOCK_TYPE_DEFS, SCHWIERIGKEIT_RULES } from '../lib/constants';
import { buildSkelett, type Auftrag } from '@lehrunterlagen/schema';
import { EXAMPLE_ABSICHTEN } from '../lib/exampleAbsichten';
import { loadDocuments } from '../lib/storage';
import { getDefaultTemplate } from '@lehrunterlagen/renderer';
import {
  parseBridgeExport,
  mapBridgeToPrefill,
  type BridgeExportMeta,
} from '../lib/nataschaBridge';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onNavigateToTemplates?: () => void;
}

const UNTERLAGENTYPEN = [
  { id: 'hausuebung' as const, label: 'Hausübung', beschreibung: 'Kurz, niedrige Stakes, ~15 Min, ~12 Pkte' },
  { id: 'test' as const, label: 'Test / Stundenwiederholung', beschreibung: 'Mittel, Punkte + einfacher Schlüssel, ~25 Min, ~24 Pkte' },
  { id: 'schuluebung' as const, label: 'Schulübung', beschreibung: 'Übungsaufgaben ohne Punkte/Noten, ~20 Min' },
  { id: 'schularbeit' as const, label: 'Schularbeit / Klassenarbeit', beschreibung: 'Lang, hohe Stakes, Maturastruktur, ~50 Min, ~48 Pkte' },
];

const SCHWIERIGKEITEN = [
  { id: 'leicht' as const, label: 'Leicht' },
  { id: 'mittel' as const, label: 'Mittel' },
  { id: 'schwer' as const, label: 'Schwer' },
];

function getLastDocumentDefaults() {
  const docs = loadDocuments();
  if (docs.length === 0) return null;
  const last = docs.reduce((a, b) =>
    new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
  );
  return last;
}

export function Step0_Absicht({ state, dispatch, onNavigateToTemplates }: Props) {
  const lastDoc = useMemo(() => getLastDocumentDefaults(), []);
  const lastMeta = lastDoc?.snapshot.meta;

  const [typ, setTyp] = useState<NonNullable<Auftrag['typ']>>(lastMeta?.typ ?? 'schularbeit');
  const [fach, setFach] = useState<NonNullable<Auftrag['fach']>>(lastMeta?.fach ?? 'deutsch');
  const [stufe, setStufe] = useState<NonNullable<Auftrag['stufe']>>(lastMeta?.stufe ?? 'oberstufe');
  const [thema, setThema] = useState(lastMeta?.thema ?? '');
  const [datum, setDatum] = useState(lastMeta?.datum ?? new Date().toISOString().slice(0, 10));
  const [klasse, setKlasse] = useState(lastMeta?.klasse ?? '');
  const [dauerMinuten, setDauerMinuten] = useState<number | ''>('');
  const [schwierigkeit, setSchwierigkeit] = useState<NonNullable<Auftrag['schwierigkeit']>>(lastMeta?.schwierigkeit ?? 'mittel');
  const [gewuenschteAufgabenarten, setGewuenschteAufgabenarten] = useState<string[]>([]);
  const [gesamtpunkteZiel, setGesamtpunkteZiel] = useState<number | ''>('');
  const [notizen, setNotizen] = useState(lastMeta?.notizen ?? '');
  const [lernzieleRaw, setLernzieleRaw] = useState(lastMeta?.lernziele?.join(', ') ?? '');
  const [fokusThemen, setFokusThemen] = useState<string[]>(lastMeta?.fokusThemen ?? []);
  const [fehler, setFehler] = useState<string | null>(null);

  // NATASCHA-Datei-Brücke (Phase 1)
  const [nataschaExports, setNataschaExports] = useState<BridgeExportMeta[] | null>(null);
  const [nataschaBusy, setNataschaBusy] = useState(false);
  const [nataschaInfo, setNataschaInfo] = useState<string | null>(null);

  const handleContinueLast = useCallback(() => {
    if (!lastDoc) return;
    dispatch({ type: 'LOAD_SNAPSHOT', snapshot: lastDoc.snapshot, documentId: lastDoc.id });
  }, [lastDoc, dispatch]);

  const toggleAufgabenart = useCallback((id: string) => {
    setGewuenschteAufgabenarten((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const ladeNataschaExporte = useCallback(async () => {
    setNataschaInfo(null);
    setNataschaBusy(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const list = await invoke<BridgeExportMeta[]>('list_bridge_exports', { dir: '' });
      setNataschaExports(list);
      if (list.length === 0) {
        setNataschaInfo(
          'Keine NATASCHA-Exporte gefunden. Exportiere zuerst in NATASCHA eine korrigierte Klasse für das Übungs-Tool.',
        );
      }
    } catch (err) {
      setNataschaInfo(
        err instanceof Error
          ? err.message
          : 'NATASCHA-Exporte konnten nicht geladen werden (läuft die App in Tauri?).',
      );
    } finally {
      setNataschaBusy(false);
    }
  }, []);

  const uebernehmeNataschaExport = useCallback(
    async (meta: BridgeExportMeta) => {
      setNataschaInfo(null);
      setNataschaBusy(true);
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const raw = await invoke<string>('read_bridge_export', { path: meta.pfad });
        const ex = parseBridgeExport(raw);
        const p = mapBridgeToPrefill(ex);
        setTyp('schuluebung');
        setFach(p.fach);
        setStufe(p.stufe);
        dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(p.stufe).id });
        setThema(p.thema);
        setKlasse(ex.klasse);
        setNotizen(p.notizen);
        setFokusThemen(p.fokusThemen);
        setGewuenschteAufgabenarten(p.gewuenschteAufgabenarten);
        setNataschaExports(null);
        setNataschaInfo(
          `Übernommen: ${ex.klasse} · ${ex.aufgabe}. Du kannst alles unten anpassen, dann „Erstellen".`,
        );
      } catch (err) {
        setNataschaInfo(
          err instanceof Error ? err.message : 'Export konnte nicht übernommen werden.',
        );
      } finally {
        setNataschaBusy(false);
      }
    },
    [dispatch],
  );

  const handleErstellen = useCallback(() => {
    setFehler(null);

    if (!thema.trim()) {
      setFehler('Bitte gib ein Thema ein.');
      return;
    }

    const auftrag: Auftrag = {
      typ,
      fach,
      stufe,
      thema: thema.trim(),
      datum,
      klasse: klasse.trim() || undefined,
      quelltexte: state.quelltexte,
      dauerMinuten: dauerMinuten !== '' ? Number(dauerMinuten) : undefined,
      schwierigkeit,
      gewuenschteAufgabenarten: gewuenschteAufgabenarten.length > 0 ? gewuenschteAufgabenarten as Auftrag['gewuenschteAufgabenarten'] : undefined,
      gesamtpunkteZiel: gesamtpunkteZiel !== '' ? Number(gesamtpunkteZiel) : undefined,
      notizen: notizen.trim() || undefined,
      lernziele: lernzieleRaw.split(',').map((s) => s.trim()).filter(Boolean) || undefined,
      fokusThemen: fokusThemen.length > 0 ? fokusThemen : undefined,
    };

    try {
      const bloecke = buildSkelett(auftrag);
      dispatch({ type: 'SET_AUFTRAG', auftrag });
      // Ersetze vorhandene Blöcke durch das Skelett
      for (const b of [...state.bloecke]) {
        dispatch({ type: 'REMOVE_BLOCK', id: b.id });
      }
      for (const b of bloecke) {
        dispatch({ type: 'ADD_BLOCK', block: b });
      }
      // Meta synchronisieren
      dispatch({
        type: 'SET_META',
        meta: {
          stufe,
          fach,
          thema: thema.trim(),
          datum,
          klasse: klasse.trim(),
          notizen: notizen.trim(),
          typ,
          schwierigkeit,
          lernziele: lernzieleRaw.split(',').map((s) => s.trim()).filter(Boolean) || undefined,
          fokusThemen: fokusThemen.length > 0 ? fokusThemen : undefined,
        },
      });
      dispatch({ type: 'SET_STEP', step: 'input' });
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Fehler beim Erstellen des Skeletts.');
    }
  }, [typ, fach, stufe, thema, datum, klasse, dauerMinuten, schwierigkeit, gewuenschteAufgabenarten, gesamtpunkteZiel, notizen, lernzieleRaw, fokusThemen, state.quelltexte, state.bloecke, dispatch]);

  const fachLabel = fach === 'deutsch' ? 'Deutsch' : 'Englisch';
  const stufeLabel = stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe';

  return (
    <div>
      <h2 style={{ margin: '0 0 0.5rem' }}>Neue Unterlage — Absicht erfassen</h2>
      <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 1.25rem', fontSize: '0.875rem' }}>
        Beschreibe, was du brauchst. Die App baut daraus automatisch das passende Skelett.
      </p>

      {/* Kontinuität — Weitermachen & Vorlagen */}
      {(lastDoc || onNavigateToTemplates) && (
        <section style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {lastDoc && (
            <button
              onClick={handleContinueLast}
              style={{
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                border: '2px solid var(--color-accent)',
                background: 'var(--color-highlight-bg)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px var(--color-shadow)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                <Clock size={16} /> Weitermachen
              </span>
              <span style={{ fontWeight: 600 }}>{lastDoc.title}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {lastDoc.snapshot.meta.fach === 'deutsch' ? 'Deutsch' : 'Englisch'} · {lastDoc.snapshot.meta.stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'} · zuletzt {new Date(lastDoc.updatedAt).toLocaleDateString('de-AT')}
              </span>
            </button>
          )}
          {onNavigateToTemplates && (
            <button
              onClick={onNavigateToTemplates}
              style={{
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-surface)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-highlight-bg)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px var(--color-shadow)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-surface)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                <FolderOpen size={16} /> Aus Vorlage starten
              </span>
              <span style={{ fontWeight: 600 }}>Gespeicherte Vorlagen</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Wähle aus deinen gespeicherten Konfigurationen.
              </span>
            </button>
          )}
        </section>
      )}

      {/* NATASCHA-Korrektur → gezielte Übungen (Datei-Brücke Phase 1) */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Aus NATASCHA-Korrektur
        </label>
        {nataschaExports && nataschaExports.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {nataschaExports.map((ex) => (
              <button
                key={ex.pfad}
                disabled={nataschaBusy}
                onClick={() => uebernehmeNataschaExport(ex)}
                style={{
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-surface)',
                  cursor: nataschaBusy ? 'wait' : 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-highlight-bg)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-surface)';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                  <ClipboardCheck size={16} /> {ex.klasse} · {ex.aufgabe}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {ex.anzahlAbgaben > 0 ? `${ex.anzahlAbgaben} Abgaben · ` : ''}{ex.datum}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            disabled={nataschaBusy}
            onClick={ladeNataschaExporte}
            style={{
              textAlign: 'left',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-surface)',
              cursor: nataschaBusy ? 'wait' : 'pointer',
              fontSize: '0.8125rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              width: '100%',
              maxWidth: '420px',
            }}
            onMouseEnter={(e) => {
              if (nataschaBusy) return;
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-highlight-bg)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-surface)';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-accent)', fontWeight: 600 }}>
              <ClipboardCheck size={16} /> {nataschaBusy ? 'Lädt …' : 'Aus NATASCHA-Korrektur generieren'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Erzeugt Übungen zu den Fehlerschwerpunkten einer korrigierten Klasse.
            </span>
          </button>
        )}
        {nataschaInfo && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            {nataschaInfo}
          </p>
        )}
      </section>

      {/* Schnellstart — Beispiel-Absichten */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Schnellstart
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
          {EXAMPLE_ABSICHTEN.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setTyp(ex.auftrag.typ);
                setFach(ex.auftrag.fach);
                setStufe(ex.auftrag.stufe);
                dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(ex.auftrag.stufe).id });
                setThema(ex.auftrag.thema);
                setDauerMinuten(ex.auftrag.dauerMinuten ?? '');
                setSchwierigkeit(ex.auftrag.schwierigkeit ?? 'mittel');
                setLernzieleRaw(ex.auftrag.lernziele?.join(', ') ?? '');
                setNotizen(ex.auftrag.notizen ?? '');
                // Optional: gleich Skelett erstellen
                // handleErstellen();
              }}
              style={{
                textAlign: 'left',
                padding: '0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-surface)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-highlight-bg)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-surface)';
              }}
            >
              <span style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--color-accent)' }}>
                <ex.Icon size={22} />
              </span>
              <strong style={{ fontSize: '0.875rem' }}>{ex.label}</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                {ex.beschreibung}
              </span>
            </button>
          ))}
        </div>
      </section>

      {fehler && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          borderRadius: 'var(--radius)',
          marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          {fehler}
        </div>
      )}

      {/* Typ */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Unterlagentyp
        </label>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {UNTERLAGENTYPEN.map((u) => (
            <button
              key={u.id}
              onClick={() => setTyp(u.id)}
              style={{
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                border: typ === u.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                background: typ === u.id ? 'var(--color-highlight-bg)' : 'var(--color-bg-surface)',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <strong>{u.label}</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.125rem' }}>
                {u.beschreibung}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Fach & Stufe */}
      <section style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fach</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['deutsch', 'englisch'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFach(f)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: 'var(--radius)',
                  border: fach === f ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                  background: fach === f ? 'var(--color-highlight-bg)' : 'var(--color-bg-surface)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {f === 'deutsch' ? 'Deutsch' : 'Englisch'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Stufe</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['unterstufe', 'oberstufe'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStufe(s);
                  dispatch({ type: 'SET_RENDER_TEMPLATE', template: getDefaultTemplate(s).id });
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: 'var(--radius)',
                  border: stufe === s ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                  background: stufe === s ? 'var(--color-highlight-bg)' : 'var(--color-bg-surface)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {s === 'oberstufe' ? 'Oberstufe' : 'Unterstufe'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Thema */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Thema <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          type="text"
          value={thema}
          onChange={(e) => setThema(e.target.value)}
          placeholder="z. B. Medienkonsum und Jugendliche"
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
          }}
        />
      </section>

      {/* Datum & Klasse */}
      <section style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Datum</label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Klasse (optional)</label>
          <input
            type="text"
            value={klasse}
            onChange={(e) => setKlasse(e.target.value)}
            placeholder="z. B. 7A"
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </section>

      {/* Dauer & Schwierigkeit & Punkte */}
      <section style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Dauer (Min, opt.)</label>
          <input
            type="number"
            min={1}
            value={dauerMinuten}
            onChange={(e) => setDauerMinuten(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="~50"
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Schwierigkeit</label>
          <select
            value={schwierigkeit}
            onChange={(e) => setSchwierigkeit(e.target.value as NonNullable<Auftrag['schwierigkeit']>)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              background: 'var(--color-bg-surface)',
            }}
          >
            {SCHWIERIGKEITEN.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Punkte (opt.)</label>
          <input
            type="number"
            min={1}
            value={gesamtpunkteZiel}
            onChange={(e) => setGesamtpunkteZiel(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="~48"
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </section>

      {/* Optionale Aufgabenarten */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Gewünschte Aufgabenarten (optional)
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
          Wenn du nichts auswählst, entscheidet die App anhand des Typ-Profils.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {BLOCK_TYPE_DEFS.map((bt) => {
            const aktiv = gewuenschteAufgabenarten.includes(bt.id);
            const isDiscouraged = (SCHWIERIGKEIT_RULES[schwierigkeit].discouraged as readonly string[]).includes(bt.id);
            return (
              <button
                key={bt.id}
                onClick={() => toggleAufgabenart(bt.id)}
                title={isDiscouraged ? SCHWIERIGKEIT_RULES[schwierigkeit].hinweis : undefined}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: aktiv ? '2px solid var(--color-accent)' : isDiscouraged ? '1px dashed var(--color-text-secondary)' : '1px solid var(--color-border)',
                  background: aktiv ? 'var(--color-highlight-bg)' : 'var(--color-bg-surface)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: isDiscouraged && !aktiv ? 0.6 : 1,
                }}
              >
                <bt.Icon size={15} style={{ color: bt.color, opacity: isDiscouraged && !aktiv ? 0.5 : 1 }} />
                <span>{bt.label}</span>
                {isDiscouraged && !aktiv && (
                  <span style={{ fontSize: '0.625rem', color: 'var(--color-warning, #f59e0b)' }}>⚠</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Lernziele */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Lernziele (optional)
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
          Kommagetrennt, z. B. "Hauptgedanke erfassen, Stilmittel erkennen"
        </p>
        <input
          type="text"
          value={lernzieleRaw}
          onChange={(e) => setLernzieleRaw(e.target.value)}
          placeholder="Hauptgedanke erfassen, Stilmittel erkennen ..."
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
          }}
        />
      </section>

      {/* Notizen */}
      <section style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Notizen (optional)</label>
        <textarea
          value={notizen}
          onChange={(e) => setNotizen(e.target.value)}
          placeholder="Besondere Wünsche, Hinweise, Schwerpunkte ..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
        />
      </section>

      {/* Zusammenfassung */}
      <div style={{
        padding: '1rem',
        background: 'var(--color-bg-hover)',
        borderRadius: 'var(--radius)',
        marginBottom: '1.25rem',
        fontSize: '0.875rem',
      }}>
        <strong>Vorschau:</strong>{' '}
        {UNTERLAGENTYPEN.find((u) => u.id === typ)?.label} · {fachLabel} · {stufeLabel}
        {thema ? ` · „${thema}"` : ''}
        {klasse ? ` · ${klasse}` : ''}
      </div>

      {/* Haupt-Aktion */}
      <button
        onClick={handleErstellen}
        style={{
          width: '100%',
          padding: '0.875rem',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'var(--color-accent)',
          color: 'white',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        }}
      >
        Skelett erstellen und fortfahren <ArrowRight size={17} />
      </button>
    </div>
  );
}
