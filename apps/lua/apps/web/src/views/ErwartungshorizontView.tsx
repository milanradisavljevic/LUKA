import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, AlertTriangle, Copy, Check } from 'lucide-react';
import { useNatascha } from '../hooks/useNatascha';
import type { KlasseInfo } from '../lib/storage';
import { ViewShell } from './_ViewShell';

export function ErwartungshorizontView() {
  const { listKlassen, listAufgaben, generateErwartungshorizont } = useNatascha();

  const [klassen, setKlassen] = useState<KlasseInfo[]>([]);
  const [klasse, setKlasse] = useState('');
  const [aufgaben, setAufgaben] = useState<string[]>([]);
  const [aufgabe, setAufgabe] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { listKlassen().then(setKlassen); }, [listKlassen]);
  useEffect(() => {
    if (klasse) listAufgaben(klasse).then(setAufgaben);
    else setAufgaben([]);
  }, [klasse, listAufgaben]);

  const handleGenerate = useCallback(async () => {
    if (!klasse.trim() || !aufgabe.trim()) { setError('Bitte Klasse und Aufgabe angeben.'); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const text = await generateErwartungshorizont(klasse.trim(), aufgabe.trim());
      setResult(text);
    } catch (e) {
      setError(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Generierung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }, [klasse, aufgabe, generateErwartungshorizont]);

  const copy = () => {
    if (!result) return;
    navigator.clipboard?.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cardStyle = {
    padding: '1.25rem', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)', marginBottom: '1.25rem',
  } as const;
  const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' } as const;

  return (
    <ViewShell
      title="Erwartungshorizont"
      description="KI-generierte Musterlösung / Erwartungshorizont für eine Aufgabe — als Grundlage für die Korrektur."
    >
      <section style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) minmax(160px,1fr) auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Klasse</label>
            <select value={klasse} onChange={(e) => setKlasse(e.target.value)} style={{ width: '100%' }}>
              <option value="">— wählen —</option>
              {klassen.map((k) => <option key={k.klasse} value={k.klasse}>{k.klasse}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Aufgabe</label>
            <input
              list="eh-aufgaben"
              value={aufgabe}
              onChange={(e) => setAufgabe(e.target.value)}
              placeholder="z.B. SA2"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            <datalist id="eh-aufgaben">
              {aufgaben.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>
          <button
            className="btn-primary"
            disabled={busy || !klasse || !aufgabe}
            onClick={handleGenerate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            {busy ? <><Loader2 size={15} className="spin" /> Generiere …</> : <><Sparkles size={15} /> Generieren</>}
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.75rem 0 0' }}>
          Nutzt den Standard-LLM aus den Einstellungen. Die Generierung kann je nach Modell etwas dauern.
        </p>
      </section>

      {error && (
        <div style={{ ...cardStyle, borderColor: 'var(--color-danger, #c0392b)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-danger, #c0392b)', verticalAlign: -3, marginRight: 6 }} />
          <span style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{error}</span>
        </div>
      )}

      {result && (
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Ergebnis — {klasse} · {aufgabe}</h3>
            <button
              onClick={copy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.3rem 0.6rem',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', cursor: 'pointer' }}
            >
              {copied ? <><Check size={13} /> Kopiert</> : <><Copy size={13} /> Kopieren</>}
            </button>
          </div>
          <pre style={{
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'inherit',
            fontSize: '0.8125rem', lineHeight: 1.5, maxHeight: '60vh', overflowY: 'auto',
            background: 'var(--color-bg-base)', padding: '1rem', borderRadius: 'var(--radius)',
          }}>{result}</pre>
        </section>
      )}
    </ViewShell>
  );
}
