import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, AlertTriangle, Copy, Check, FileText, Save } from 'lucide-react';
import { useNatascha } from '../hooks/useNatascha';
import type { KlasseInfo } from '../lib/storage';
import { ViewShell } from './_ViewShell';
import { InfoDot } from '../components/ui/InfoDot';

export function ErwartungshorizontView() {
  const { listKlassen, listAufgaben, generateErwartungshorizont, saveErwartungshorizont, listRubricFiles, readRubric, saveRubric } = useNatascha();

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

  // Rubrik-Editor
  const [rubricFiles, setRubricFiles] = useState<string[]>([]);
  const [rubricName, setRubricName] = useState('');
  const [rubricContent, setRubricContent] = useState('');
  const [rubricLoading, setRubricLoading] = useState(false);
  const [rubricSaving, setRubricSaving] = useState(false);
  const [rubricMsg, setRubricMsg] = useState<string | null>(null);

  useEffect(() => { listRubricFiles().then(setRubricFiles); }, [listRubricFiles]);

  const loadRubric = useCallback(async (name: string) => {
    setRubricName(name);
    setRubricContent('');
    setRubricMsg(null);
    if (!name) return;
    setRubricLoading(true);
    try {
      setRubricContent(await readRubric(name));
    } catch (e) {
      setRubricMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Laden fehlgeschlagen.');
    } finally {
      setRubricLoading(false);
    }
  }, [readRubric]);

  const handleSaveRubric = useCallback(async () => {
    if (!rubricName) return;
    setRubricSaving(true); setRubricMsg(null);
    try {
      const r = await saveRubric(rubricName, rubricContent);
      setRubricMsg(`Gespeichert (${r.name}, ${r.bytes} Bytes).`);
      await listRubricFiles().then(setRubricFiles);
    } catch (e) {
      setRubricMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    } finally {
      setRubricSaving(false);
    }
  }, [rubricName, rubricContent, saveRubric, listRubricFiles]);

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

      {/* Rubrik-Editor: bestehende Bewertungsraster (Markdown) direkt bearbeiten */}
      <section style={cardStyle}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FileText size={16} /> Rubrik-Editor
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem' }}>
          Bewertungsraster (Markdown) direkt bearbeiten. Änderungen wirken bei der nächsten Korrektur mit dieser Rubrik.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>
              Rubrik
              <InfoDot text="Dateiname der Bewertungsraster-Datei (Ordner rubrics/). Der Name selbst hat keine Bedeutung — entscheidend ist der Inhalt darunter." />
            </label>
            <select value={rubricName} onChange={(e) => loadRubric(e.target.value)} style={{ minWidth: 260 }}>
              <option value="">— wählen —</option>
              {rubricFiles.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          {rubricLoading && <Loader2 size={16} className="spin" style={{ marginBottom: 8 }} />}
        </div>

        {rubricName && !rubricLoading && (
          <>
            <textarea
              value={rubricContent}
              onChange={(e) => setRubricContent(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: '40vh', maxHeight: '60vh',
                marginTop: '0.75rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8125rem', lineHeight: 1.5, resize: 'vertical',
                background: 'var(--color-bg-base)', padding: '1rem', borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)', color: 'var(--color-text-primary)',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                className="btn-primary"
                onClick={handleSaveRubric}
                disabled={rubricSaving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', padding: '0.35rem 0.8rem' }}
              >
                <Save size={14} /> {rubricSaving ? 'Speichere …' : 'Rubrik speichern'}
              </button>
              {rubricMsg && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {rubricMsg.startsWith('Gespeichert') && <Check size={13} aria-hidden="true" style={{ color: 'var(--color-success)' }} />}
                  {rubricMsg}
                </span>
              )}
            </div>
          </>
        )}
        {!rubricName && rubricMsg && (
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0, color: 'var(--color-danger, #c0392b)' }}>{rubricMsg}</p>
        )}
      </section>
    </ViewShell>
  );
}
