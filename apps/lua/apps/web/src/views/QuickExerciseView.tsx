import { useState, useMemo, useEffect } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { buildSkelett, FACH_META, fachLabel, type Fach, type Stufe, type Block, type Auftrag } from '@lehrunterlagen/schema';
import { BLOCK_TYPE_DEFS, STUFE_RULES } from '../lib/constants';
import type { AppAction } from '../lib/types';
import { ViewShell } from './_ViewShell';

interface Props {
  dispatch: React.Dispatch<AppAction>;
  onDone: () => void;
}

export function QuickExerciseView({ dispatch, onDone }: Props) {
  const [thema, setThema] = useState('');
  const [fach, setFach] = useState<Fach>('deutsch');
  const [stufe, setStufe] = useState<Stufe>('oberstufe');
  const [typ, setTyp] = useState<Block['typ']>('lueckentext');
  const [fehler, setFehler] = useState<string | null>(null);

  const allowedTypes = useMemo(
    () => BLOCK_TYPE_DEFS.filter((d) => STUFE_RULES[stufe].allowedBlockTypes.some((t) => t === d.id)),
    [stufe],
  );

  // Sicherstellen, dass der gewählte Typ zur neuen Stufe passt.
  useEffect(() => {
    if (!allowedTypes.find((d) => d.id === typ)) {
      setTyp(allowedTypes[0]?.id ?? 'lueckentext');
    }
  }, [allowedTypes, typ]);

  const handleSubmit = () => {
    setFehler(null);
    if (!thema.trim()) {
      setFehler('Bitte gib ein Thema ein.');
      return;
    }

    const auftrag: Auftrag = {
      typ: 'schuluebung',
      fach,
      stufe,
      thema: thema.trim(),
      datum: new Date().toISOString().slice(0, 10),
      quelltexte: [],
      schwierigkeit: 'mittel',
      gewuenschteAufgabenarten: [typ],
      gesamtpunkteZiel: 0,
    };

    try {
      const bloecke = buildSkelett(auftrag);
      dispatch({ type: 'RESET_STATE' });
      dispatch({ type: 'SET_AUFTRAG', auftrag });
      dispatch({
        type: 'SET_META',
        meta: {
          stufe,
          fach,
          thema: thema.trim(),
          datum: auftrag.datum,
          klasse: '',
          notizen: '',
          typ: 'schuluebung',
          punkteAusblenden: true,
          schwierigkeit: 'mittel',
        },
      });
      for (const b of bloecke) {
        dispatch({ type: 'ADD_BLOCK', block: b });
      }
      dispatch({ type: 'SET_STEP', step: 'baukasten' });
      onDone();
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Fehler beim Erstellen der Übung.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    marginBottom: '0.375rem',
  };

  return (
    <ViewShell
      title="Schnell-Übung"
      description="Thema, Fach, Stufe und Aufgabentyp — sofort in den Baukasten."
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Thema</label>
          <input
            type="text"
            value={thema}
            onChange={(e) => setThema(e.target.value)}
            placeholder="z. B. Present Perfect vs. Past Simple"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Fach</label>
            <select
              value={fach}
              onChange={(e) => setFach(e.target.value as Fach)}
              style={inputStyle}
            >
              {(Object.keys(FACH_META) as Fach[]).map((f) => (
                <option key={f} value={f}>{fachLabel(f)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Stufe</label>
            <select
              value={stufe}
              onChange={(e) => setStufe(e.target.value as Stufe)}
              style={inputStyle}
            >
              <option value="unterstufe">Unterstufe</option>
              <option value="oberstufe">Oberstufe</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Aufgabentyp</label>
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value as Block['typ'])}
            style={inputStyle}
          >
            {allowedTypes.map((d) => (
              <option key={d.id} value={d.id}>{d.label} — {d.description}</option>
            ))}
          </select>
        </div>

        {fehler && (
          <p style={{ color: 'var(--color-danger, #c0392b)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {fehler}
          </p>
        )}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Zap size={16} /> Sofort erstellen <ArrowRight size={16} />
        </button>
      </div>
    </ViewShell>
  );
}
