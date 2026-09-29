import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, AlertTriangle, Copy, Check, FileText } from 'lucide-react';
import { useNatascha } from '../hooks/useNatascha';
import type { KlasseInfo } from '../lib/storage';
import { ViewShell } from './_ViewShell';
import { InfoDot } from '../components/ui/InfoDot';

export function ErwartungshorizontView() {
  const { listKlassen, listAufgaben, generateErwartungshorizont, saveErwartungshorizont, quelltextGet } = useNatascha();

  const [klassen, setKlassen] = useState<KlasseInfo[]>([]);
  const [klasse, setKlasse] = useState('');
  const [aufgaben, setAufgaben] = useState<string[]>([]);
  const [aufgabe, setAufgabe] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Quelltext: der Text, aus dem die Aufgabenstellung entsteht.
  const [quelltext, setQuelltext] = useState('');
  const [quelltextDatei, setQuelltextDatei] = useState('');
  const [gespeicherterQuelltext, setGespeicherterQuelltext] = useState('');

  const pickQuelltextDatei = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: false, filters: [{ name: 'Quelltext', extensions: ['docx', 'txt', 'md'] }] });
      if (typeof selected === 'string') { setQuelltextDatei(selected); setQuelltext(''); }
    } catch {
      const value = prompt('Pfad zum Quelltext:');
      if (value) { setQuelltextDatei(value); setQuelltext(''); }
    }
  }, []);

  const baseName = (p: string) => p.split(/[/\\]/).pop() || p;

  // Rubrik-Editor: eigenes Thema mit eigenem Reiter, siehe BewertungsrasterView.
  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaving(true); setSaveMsg(null);
    try {
      const r = await saveErwartungshorizont(klasse.trim(), aufgabe.trim(), result);
      setSaveMsg(`Gespeichert (${r.datei}) — wird bei der Korrektur von ${r.klasse} · ${r.aufgabe} automatisch genutzt.`);
    } catch (e) {
      setSaveMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }, [result, klasse, aufgabe, saveErwartungshorizont]);

  useEffect(() => { listKlassen().then(setKlassen); }, [listKlassen]);
  useEffect(() => {
    if (klasse) listAufgaben(klasse).then(setAufgaben);
    else setAufgaben([]);
  }, [klasse, listAufgaben]);

  // Zuletzt bei einer Korrektur benutzten Quelltext anbieten, statt ihn neu
  // einfuegen zu lassen. Nur ein Hinweis — die Lehrkraft entscheidet.
  useEffect(() => {
    let aktiv = true;
    if (!klasse.trim() || !aufgabe.trim()) { setGespeicherterQuelltext(''); return; }
    quelltextGet(klasse.trim(), aufgabe.trim())
      .then(text => { if (aktiv) setGespeicherterQuelltext(text); })
      .catch(() => { if (aktiv) setGespeicherterQuelltext(''); });
    return () => { aktiv = false; };
  }, [klasse, aufgabe, quelltextGet]);

  const handleGenerate = useCallback(async () => {
    if (!klasse.trim() || !aufgabe.trim()) { setError('Bitte Klasse und Aufgabe angeben.'); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      // Eine gewaehlte Datei schlaegt eingefuegten Text; ohne beides sucht die
      // Python-Seite selbst weiter (Ordner `ausgangstext/`, gespeicherter
      // Quelltext der Aufgabe) — dann ist das Feld bewusst optional.
      const text = await generateErwartungshorizont(
        klasse.trim(), aufgabe.trim(), undefined, undefined,
        quelltextDatei || undefined, quelltext.trim() || undefined,
      );
      setResult(text);
    } catch (e) {
      setError(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Generierung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }, [klasse, aufgabe, quelltextDatei, quelltext, generateErwartungshorizont]);

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
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
          Woran gemessen wird, steht im Reiter <strong>Bewertungsraster</strong> — dort werden
          die Raster gepflegt und ausgewählt. Hier entsteht nur, was eine gute Antwort
          enthält.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,1fr) minmax(160px,1fr) auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Klasse</label>
            <select value={klasse} onChange={(e) => setKlasse(e.target.value)} style={{ width: '100%' }}>
              <option value="">— wählen —</option>
              {klassen.map((k) => <option key={k.klasse} value={k.klasse}>{k.klasse}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              Aufgabe
              <InfoDot text="Erzeugt aus Angabe + Textbeilage einen Erwartungsraster als Korrekturgrundlage — ein KI-Entwurf, den du vor der Verwendung prüfen solltest." />
            </label>
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

      <section style={cardStyle}>
        <label style={labelStyle}>
          Quelltext
          <InfoDot text="Der Text, aus dem die Aufgabenstellung entsteht — z. B. ein Romanauszug. Wird der Erwartungshorizont daraus erzeugt, ist er damit die Grundlage für die Korrektur." />
        </label>
        <textarea
          value={quelltextDatei ? baseName(quelltextDatei) : quelltext}
          onChange={(e) => { setQuelltext(e.target.value); setQuelltextDatei(''); }}
          readOnly={!!quelltextDatei}
          placeholder="Text hier einfügen (z. B. Kapitel 1 aus Die Verwandlung) — oder eine Datei wählen"
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: '7rem',
            fontFamily: 'inherit', fontSize: '0.8125rem', lineHeight: 1.5, resize: 'vertical',
            background: 'var(--color-bg-base)', padding: '0.75rem', borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)', color: 'var(--color-text-primary)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={pickQuelltextDatei}>
            <FileText size={14} /> Datei wählen
          </button>
          {quelltextDatei && (
            <button type="button" className="btn-ghost" onClick={() => setQuelltextDatei('')} style={{ fontSize: '0.75rem' }}>
              Datei entfernen
            </button>
          )}
          {!quelltextDatei && quelltext.trim() && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {quelltext.trim().split(/\s+/).length} Wörter
            </span>
          )}
        </div>
        {gespeicherterQuelltext && !quelltextDatei && !quelltext.trim() && (
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Für {klasse} · {aufgabe} ist ein Quelltext gespeichert ({gespeicherterQuelltext.split(/\s+/).length} Wörter) — er wird ohne Eingabe verwendet.{' '}
            <button type="button" className="btn-ghost" onClick={() => setQuelltext(gespeicherterQuelltext)} style={{ fontSize: '0.75rem' }}>
              anzeigen und bearbeiten
            </button>
          </p>
        )}
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
          Optional: ohne Eingabe sucht LUKA den Text im Ordner <code>ausgangstext/</code> der Aufgabe.
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>Ergebnis — {klasse} · {aufgabe} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>(bearbeitbar)</span></h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={copy}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.3rem 0.6rem',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-base)', cursor: 'pointer' }}
              >
                {copied ? <><Check size={13} /> Kopiert</> : <><Copy size={13} /> Kopieren</>}
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
                title="Speichert den Erwartungshorizont und verknüpft ihn mit der Aufgabe (wird bei der Korrektur genutzt)"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
              >
                <Check size={13} /> {saving ? 'Speichere …' : 'Akzeptieren & speichern'}
              </button>
            </div>
          </div>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%', boxSizing: 'border-box', minHeight: '40vh', maxHeight: '60vh',
              fontFamily: 'inherit', fontSize: '0.8125rem', lineHeight: 1.5, resize: 'vertical',
              background: 'var(--color-bg-base)', padding: '1rem', borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)', color: 'var(--color-text-primary)',
            }}
          />
          {saveMsg && (
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
              {saveMsg.startsWith('Gespeichert') && <Check size={13} aria-hidden="true" style={{ color: 'var(--color-success)' }} />}
              {saveMsg}
            </p>
          )}
        </section>
      )}
    </ViewShell>
  );
}
