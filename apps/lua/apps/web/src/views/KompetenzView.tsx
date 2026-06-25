import { useState, useMemo } from 'react';
import { ArrowRight, Target, Loader2, Check } from 'lucide-react';
import type { AppState, AppAction } from '../lib/types';
import type { BlockTyp, Fach } from '@lehrunterlagen/schema';
import { FACH_META, fachLabel, KOMPETENZBEREICHE, SCHULSTUFEN, stufeFromSchulstufe } from '@lehrunterlagen/schema';
import { listStoffItems, fachHatEntwurf, getStoffItems } from '../lib/stoffkatalog';
import { listInhaltsModule, getInhaltsModul } from '../lib/inhaltskatalog';
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

const FAECHER = Object.entries(FACH_META).map(([id, m]) => ({ id: id as Fach, label: m.label }));

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
  const [fach, setFach] = useState<Fach>('englisch');
  const [stufe, setStufe] = useState<'oberstufe' | 'unterstufe'>('oberstufe');
  const [schulstufe, setSchulstufe] = useState<number | undefined>(undefined);
  const [stoffItemIds, setStoffItemIds] = useState<string[]>([]);
  const [inhaltsModulId, setInhaltsModulId] = useState<string | undefined>(undefined);
  const [freieKompetenz, setFreieKompetenz] = useState('');
  const [thema, setThema] = useState('');
  const [niveau, setNiveau] = useState<'basis' | 'standard' | 'erweitert'>('standard');
  const [punkteVergeben, setPunkteVergeben] = useState(true);
  const [gewuenschteTypen, setGewuenschteTypen] = useState<BlockTyp[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);

  const { generate, generating, stage, aktiverProvider, error } = useGenerate(dispatch);

  const stoffItems = useMemo(
    () => listStoffItems(fach, stufe, rahmenwerk, schulstufe),
    [fach, stufe, rahmenwerk, schulstufe],
  );

  const inhaltsModule = useMemo(
    () => listInhaltsModule(fach, stufe, rahmenwerk, schulstufe),
    [fach, stufe, rahmenwerk, schulstufe],
  );

  const erlaubteTypen = useMemo(() => {
    return STUFE_RULES[stufe].allowedBlockTypes.filter((t) =>
      BLOCK_TYPE_DEFS.some((def) => def.id === t),
    );
  }, [stufe]);

  const toggleStoffItem = (id: string) => {
    setStoffItemIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const selectedItems = stoffItems.filter((s) => next.includes(s.id));

      // Thema-Prefill nur bei exakt einer Auswahl und leerem Thema
      if (selectedItems.length === 1 && thema.trim() === '') {
        setThema(selectedItems[0]?.titel ?? '');
      }

      // defaultAufgabentypen aller gewählten Items mergen (ohne bestehende zu löschen)
      const mergedTypes = Array.from(
        new Set([
          ...gewuenschteTypen,
          ...selectedItems.flatMap((s) => (s.defaultAufgabentypen ?? []) as BlockTyp[]),
        ]),
      ).filter((t) => (erlaubteTypen as readonly string[]).includes(t));
      setGewuenschteTypen(mergedTypes);

      return next;
    });
  };

  const handleInhaltsModulChange = (id: string) => {
    const nextId = id || undefined;
    setInhaltsModulId(nextId);
    if (nextId) {
      const modul = getInhaltsModul(nextId);
      if (modul && thema.trim() === '') {
        setThema(modul.titel);
      }
    }
  };

  const toggleTyp = (typ: BlockTyp) => {
    setGewuenschteTypen((prev) =>
      prev.includes(typ) ? prev.filter((t) => t !== typ) : [...prev, typ],
    );
  };

  const handleErstellen = async () => {
    setFehler(null);

    const freitext = freieKompetenz.trim();
    const hatFreitext = freitext.length > 0;
    const hatKatalog = stoffItemIds.length > 0;

    if (!hatFreitext && !hatKatalog) {
      setFehler('Bitte eine Kompetenz oder ein Thema eingeben — oder ein Stoff-Item aus dem Katalog wählen.');
      return;
    }
    if (gewuenschteTypen.length === 0) {
      setFehler('Bitte mindestens einen Aufgabentyp wählen.');
      return;
    }

    const themaFinal = thema.trim() || freitext || getStoffItems(stoffItemIds)[0]?.titel || '';
    if (!themaFinal) {
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
      thema: themaFinal,
      stoffItemIds,
      schulstufe,
      inhaltsModulId,
      freieKompetenz: hatFreitext ? freitext : undefined,
      kompetenzNiveau: niveau,
      punkteAusblenden: !punkteVergeben,
      datum: heute,
    };

    dispatch({ type: 'SET_META', meta });

    const auftrag = {
      typ: 'schuluebung' as const,
      fach,
      stufe,
      thema: themaFinal,
      datum: heute,
      quelltexte: [],
      modus: 'kompetenz' as const,
      rahmenwerk,
      stoffItemIds,
      schulstufe,
      inhaltsModulId,
      freieKompetenz: hatFreitext ? freitext : undefined,
      kompetenzNiveau: niveau,
      punkteAusblenden: !punkteVergeben,
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
      title="Übung ohne Quelltext"
      description="Gib eine Kompetenz oder ein Thema frei ein — oder wähle aus dem Lehrplan-Katalog."
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
          <select
            value={fach}
            onChange={(e) => setFach(e.target.value as Fach)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-bg-base)', fontSize: '0.875rem' }}
          >
            <optgroup label="Sprachfächer">
              {FAECHER.filter((f) => FACH_META[f.id].sprachfach).map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </optgroup>
            <optgroup label="Sachfächer">
              {FAECHER.filter((f) => !FACH_META[f.id].sprachfach).map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Schulstufe</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SCHULSTUFEN.map((s) => {
              const aktiv = schulstufe === s;
              return (
                <button
                  key={s}
                  onClick={() => { setSchulstufe(s); setStufe(stufeFromSchulstufe(s)); }}
                  style={aktiv ? activeButtonStyle : buttonStyle}
                >
                  {s}
                </button>
              );
            })}
            <button
              onClick={() => { setSchulstufe(undefined); setStufe('unterstufe'); }}
              style={schulstufe === undefined && stufe === 'unterstufe' ? activeButtonStyle : buttonStyle}
            >
              ganze Unterstufe
            </button>
            <button
              onClick={() => { setSchulstufe(undefined); setStufe('oberstufe'); }}
              style={schulstufe === undefined && stufe === 'oberstufe' ? activeButtonStyle : buttonStyle}
            >
              ganze Oberstufe
            </button>
          </div>
        </div>
      </section>

      {/* Freitext Kompetenz / Thema */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          Kompetenz oder Thema <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(frei eingeben)</span>
        </label>
        <input
          type="text"
          value={freieKompetenz}
          onChange={(e) => setFreieKompetenz(e.target.value)}
          placeholder="z. B. Present Perfect vs Past Simple, questions &amp; negation — oder Urlaub beschreiben"
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            fontSize: '0.875rem',
          }}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.375rem 0 0' }}>
          Freitext genügt — der Katalog darunter ist optional und nur für den formalen Lehrplan-Nachweis nötig.
        </p>
      </section>

      {/* Stoff-Item (optional) */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          …oder aus Lehrplan-Katalog wählen <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(() => {
            // Nach Kompetenzbereich gruppieren (Reihenfolge aus KOMPETENZBEREICHE[fach]).
            const bereiche = KOMPETENZBEREICHE[fach] ?? [];
            const gruppen = bereiche
              .map((b) => ({ bereich: b, items: stoffItems.filter((i) => i.kategorie === b) }))
              .filter((g) => g.items.length > 0);
            const rest = stoffItems.filter((i) => !bereiche.includes(i.kategorie));
            if (rest.length > 0) gruppen.push({ bereich: 'Weitere', items: rest });
            return gruppen.map((g) => (
              <div key={g.bereich}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                  {g.bereich}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {g.items.map((item) => {
                    const aktiv = stoffItemIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleStoffItem(item.id)}
                        aria-pressed={aktiv}
                        title={item.titel}
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
                          textAlign: 'left',
                        }}
                      >
                        {aktiv ? (
                          <Check size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: 14, flexShrink: 0 }} />
                        )}
                        <span>{item.titel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
        {stoffItems.length === 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Für diese Kombination gibt es noch keine Stoff-Items. Du kannst trotzdem oben eine Kompetenz frei eingeben.
          </p>
        )}
        {fachHatEntwurf(fach, stufe) && (
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
            Hinweis: Teile dieses Kompetenzkatalogs sind kuratierte Entwürfe, angelehnt an den BMBWF-Lehrplan — kein offizieller Nachweis.
          </p>
        )}
      </section>

      {/* Inhalts-Modul (nur bei vorhandenen Modul-Daten) */}
      {inhaltsModule.length > 0 && (
        <section style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Inhaltlicher Rahmen <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span>
          </label>
          <select
            value={inhaltsModulId ?? ''}
            onChange={(e) => handleInhaltsModulChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              background: 'var(--color-bg-surface)',
            }}
          >
            <option value="">— kein Inhalt —</option>
            {inhaltsModule.map((modul) => (
              <option key={modul.id} value={modul.id}>{modul.titel}</option>
            ))}
          </select>
          {inhaltsModulId && getInhaltsModul(inhaltsModulId) && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              {getInhaltsModul(inhaltsModulId)?.beschreibung}
            </p>
          )}
        </section>
      )}

      {/* Thema */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Thema / Kontext <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional — wird sonst aus Freitext oder Katalog übernommen)</span></label>
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

      {/* Punkte */}
      <section style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>Bewertung</label>
        <button
          onClick={() => setPunkteVergeben((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.875rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-surface)',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
          aria-pressed={punkteVergeben}
        >
          <span style={{
            width: '2rem',
            height: '1.125rem',
            borderRadius: '999px',
            background: punkteVergeben ? 'var(--color-accent)' : 'var(--color-border)',
            position: 'relative',
            transition: 'background 0.15s ease',
          }}>
            <span style={{
              position: 'absolute',
              top: 2,
              left: punkteVergeben ? 'calc(100% - 1rem - 2px)' : 2,
              width: '0.875rem',
              height: '0.875rem',
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.15s ease',
            }} />
          </span>
          {punkteVergeben ? 'Punkte vergeben' : 'Ohne Punkte'}
        </button>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.375rem 0 0' }}>
          Aus = einfache Übung ohne Punkteangaben, wie aus dem Schulbuch.
        </p>
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
