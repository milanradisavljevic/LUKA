import { useState, useMemo } from 'react';
import { ArrowRight, Target, Loader2 } from 'lucide-react';
import type { AppState, AppAction } from '../lib/types';
import type { StoffItem, BlockTyp } from '@lehrunterlagen/schema';
import { listStoffItems } from '../lib/stoffkatalog';
import { BLOCK_TYPE_DEFS, STUFE_RULES } from '../lib/constants';
import { buildSkelett } from '@lehrunterlagen/schema';
import { useGenerate } from '../hooks/useGenerate';
import { ViewShell } from './_ViewShell';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  onNavigateToWizard: () => void;
}

const RAHMENWERKE = [
  { id: 'at-lehrplan' as const, label: 'Österr. Lehrplan' },
  { id: 'ib-dp' as const, label: 'IB Diploma Programme' },
] as const;

const FAECHER = [
  { id: 'deutsch' as const, label: 'Deutsch' },
  { id: 'englisch' as const, label: 'Englisch' },
] as const;

const STUFEN = [
  { id: 'oberstufe' as const, label: 'Oberstufe' },
  { id: 'unterstufe' as const, label: 'Unterstufe' },
] as const;

const NIVEAUS = [
  { id: 'basis' as const, label: 'Basis' },
  { id: 'standard' as const, label: 'Standard' },
  { id: 'erweitert' as const, label: 'Erweitert' },
] as const;

export function KompetenzView({ state, dispatch, onNavigateToWizard }: Props) {
  const [rahmenwerk, setRahmenwerk] = useState<'at-lehrplan' | 'ib-dp'>('at-lehrplan');
  const [fach, setFach] = useState<'deutsch' | 'englisch'>('englisch');
  const [stufe, setStufe] = useState<'oberstufe' | 'unterstufe'>('oberstufe');
  const [stoffItem, setStoffItem] = useState<StoffItem | null>(null);
  const [thema, setThema] = useState('');
  const [niveau, setNiveau] = useState<'basis' | 'standard' | 'erweitert'>('standard');
  const [gewuenschteTypen, setGewuenschteTypen] = useState<BlockTyp[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);

  const { generate, generating, stage, aktiverProvider, error } = useGenerate(dispatch);

  const stoffItems = useMemo(() => listStoffItems(fach, stufe, rahmenwerk), [fach, stufe, rahmenwerk]);

  const erlaubteTypen = useMemo(() => {
    return STUFE_RULES[stufe].allowedBlockTypes.filter((t) =>
      BLOCK_TYPE_DEFS.some((def) => def.id === t),
    );
  }, [stufe]);

  const handleStoffItemChange = (id: string) => {
    const item = stoffItems.find((s) => s.id === id) ?? null;
    setStoffItem(item);
    if (item && thema.trim() === '') {
      setThema(item.titel);
    }
    if (item?.defaultAufgabentypen && item.defaultAufgabentypen.length > 0) {
      setGewuenschteTypen(item.defaultAufgabentypen as BlockTyp[]);
    } else {
      setGewuenschteTypen([]);
    }
  };

  const toggleTyp = (typ: BlockTyp) => {
    setGewuenschteTypen((prev) =>
      prev.includes(typ) ? prev.filter((t) => t !== typ) : [...prev, typ],
    );
  };

  const handleErstellen = async () => {
    setFehler(null);

    if (!stoffItem) {
      setFehler('Bitte ein Stoff-Item wählen.');
      return;
    }
    if (gewuenschteTypen.length === 0) {
      setFehler('Bitte mindestens einen Aufgabentyp wählen.');
      return;
    }
    if (!thema.trim()) {
      setFehler('Bitte ein Thema eingeben.');
      return;
    }

    const heute = new Date().toISOString().slice(0, 10);
    const meta = {
      ...state.meta,
      modus: 'kompetenz' as const,
      rahmenwerk,
      fach,
      stufe,
      thema: thema.trim(),
      stoffItemIds: [stoffItem.id],
      kompetenzNiveau: niveau,
      datum: heute,
    };

    dispatch({ type: 'SET_META', meta });

    const auftrag = {
      typ: 'schuluebung' as const,
      fach,
      stufe,
      thema: thema.trim(),
      datum: heute,
      quelltexte: [],
      modus: 'kompetenz' as const,
      rahmenwerk,
      stoffItemIds: [stoffItem.id],
      kompetenzNiveau: niveau,
      gewuenschteAufgabenarten: gewuenschteTypen,
    };

    try {
      const bloecke = buildSkelett(auftrag);
      dispatch({ type: 'SET_AUFTRAG', auftrag });
      for (const b of [...state.bloecke]) {
        dispatch({ type: 'REMOVE_BLOCK', id: b.id });
      }
      for (const b of bloecke) {
        dispatch({ type: 'ADD_BLOCK', block: b });
      }

      const nextState: AppState = {
        ...state,
        meta,
        auftrag,
        quelltexte: [],
        bloecke,
      };

      const ok = await generate(nextState);
      if (ok) {
        onNavigateToWizard();
        dispatch({ type: 'SET_STEP', step: 'generate' });
      }
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Fehler beim Erstellen der Übung.');
    }
  };

  const buttonStyle = {
    padding: '0.625rem 1rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-surface)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    textAlign: 'left' as const,
  };

  const activeButtonStyle = {
    ...buttonStyle,
    border: '2px solid var(--color-accent)',
    background: 'var(--color-highlight-bg)',
  };

  return (
    <ViewShell
      title="Kompetenz-Übung"
      description="Übung aus einer Lehrplan-Kompetenz erstellen — ohne Quelltext."
      maxWidth={720}
    >
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

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          borderRadius: 'var(--radius)',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          whiteSpace: 'pre-wrap',
        }}>
          {error}
        </div>
      )}

      {/* Rahmenwerk */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Rahmenwerk</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {RAHMENWERKE.map((r) => (
            <button
              key={r.id}
              onClick={() => setRahmenwerk(r.id)}
              style={rahmenwerk === r.id ? activeButtonStyle : buttonStyle}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {/* Fach & Stufe */}
      <section style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fach</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {FAECHER.map((f) => (
              <button
                key={f.id}
                onClick={() => setFach(f.id)}
                style={fach === f.id ? activeButtonStyle : buttonStyle}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Stufe</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {STUFEN.map((s) => (
              <button
                key={s.id}
                onClick={() => setStufe(s.id)}
                style={stufe === s.id ? activeButtonStyle : buttonStyle}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stoff-Item */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Kompetenz / Stoff-Item</label>
        <select
          value={stoffItem?.id ?? ''}
          onChange={(e) => handleStoffItemChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
            background: 'var(--color-bg-surface)',
          }}
        >
          <option value="">Bitte wählen …</option>
          {stoffItems.map((item) => (
            <option key={item.id} value={item.id}>{item.titel}</option>
          ))}
        </select>
        {stoffItems.length === 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Für diese Kombination gibt es noch keine Stoff-Items. Proof-Slice: Englisch · Oberstufe.
          </p>
        )}
      </section>

      {/* Thema */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Thema / Kontext (optional, aber empfohlen)</label>
        <input
          type="text"
          value={thema}
          onChange={(e) => setThema(e.target.value)}
          placeholder="z. B. Reisen, Klimawandel, Schule"
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
          }}
        />
      </section>

      {/* Niveau */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Niveau</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {NIVEAUS.map((n) => (
            <button
              key={n.id}
              onClick={() => setNiveau(n.id)}
              style={niveau === n.id ? activeButtonStyle : buttonStyle}
            >
              {n.label}
            </button>
          ))}
        </div>
      </section>

      {/* Aufgabentypen */}
      <section style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Aufgabentypen</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {erlaubteTypen.map((typ) => {
            const def = BLOCK_TYPE_DEFS.find((d) => d.id === typ);
            if (!def) return null;
            const aktiv = gewuenschteTypen.includes(typ);
            return (
              <button
                key={typ}
                onClick={() => toggleTyp(typ)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: aktiv ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                  background: aktiv ? 'var(--color-highlight-bg)' : 'var(--color-bg-surface)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                title={def.description}
              >
                <def.Icon size={15} style={{ color: def.color }} />
                <span>{def.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Aktion */}
      <button
        onClick={handleErstellen}
        disabled={generating}
        style={{
          width: '100%',
          padding: '0.875rem',
          borderRadius: 'var(--radius)',
          border: 'none',
          background: 'var(--color-accent)',
          color: 'white',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: generating ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          opacity: generating ? 0.7 : 1,
        }}
      >
        {generating ? (
          <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> {stage} … {aktiverProvider && `(${aktiverProvider})`}</>
        ) : (
          <><Target size={17} /> Übung erstellen <ArrowRight size={17} /></>
        )}
      </button>
    </ViewShell>
  );
}
