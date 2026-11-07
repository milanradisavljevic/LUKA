import { useEffect, useRef, useState } from 'react';

export interface ZuordnungsPerson { id: number; vorname: string; nachname: string | null }

export function vorhandenePerson<T extends ZuordnungsPerson>(personen: readonly T[], vorname: string, nachname: string): T | undefined {
  const normal = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');
  const matches = personen.filter(p => normal(p.vorname) === normal(vorname) && normal(p.nachname ?? '') === normal(nachname));
  if (matches.length > 1) throw new Error('Mehrere Personen haben diesen Namen. Bitte den passenden Eintrag in der Liste auswählen.');
  return matches[0];
}

export function SchuelerZuordnung({ personen, value, onChange, onCreate, label, disabled = false }: {
  personen: readonly ZuordnungsPerson[];
  value: number | '';
  onChange: (id: number | '') => void;
  onCreate: (vorname: string, nachname: string) => Promise<number>;
  label: string;
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const save = async () => {
    if (lock.current || disabled || !vorname.trim()) return;
    lock.current = true;
    setBusy(true); setError('');
    try {
      const id = await onCreate(vorname.trim().replace(/\s+/g, ' '), nachname.trim().replace(/\s+/g, ' '));
      if (mounted.current) { onChange(id); setAdding(false); setVorname(''); setNachname(''); }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return <div className="schueler-zuordnung">
    <select aria-label={label} value={value} disabled={disabled || busy} onChange={e => {
      if (e.target.value === 'neu') { setAdding(true); setError(''); }
      else { setAdding(false); onChange(e.target.value ? Number(e.target.value) : ''); }
    }}>
      <option value="">Automatische Zuordnung — bitte prüfen</option>
      {personen.map(p => <option key={p.id} value={p.id}>{[p.vorname, p.nachname].filter(Boolean).join(' ')}</option>)}
      <option value="neu">Namen hinzufügen …</option>
    </select>
    {adding && <div className="schueler-zuordnung-neu" role="group" aria-label={`Namen hinzufügen: ${label}`} onKeyDown={e => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) { e.preventDefault(); void save(); }
      if (e.key === 'Escape' && !busy) { e.stopPropagation(); setAdding(false); }
    }}>
      <label>Vorname oder Bezeichnung
        <input autoFocus value={vorname} maxLength={80} disabled={disabled || busy} onChange={e => setVorname(e.target.value)} />
      </label>
      <label>Nachname (optional)
        <input value={nachname} maxLength={80} disabled={disabled || busy} onChange={e => setNachname(e.target.value)} />
      </label>
      <small>Wird in der Klassenliste gespeichert und dieser Arbeit zugeordnet.</small>
      {error && <p role="alert">{error}</p>}
      <div className="schueler-zuordnung-aktionen">
        <button type="button" className="btn-primary" disabled={disabled || busy || !vorname.trim()} onClick={() => void save()}>{busy ? 'Wird gespeichert …' : 'Speichern & zuordnen'}</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => setAdding(false)}>Abbrechen</button>
      </div>
    </div>}
  </div>;
}
