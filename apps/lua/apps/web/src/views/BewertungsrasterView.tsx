import { useState, useEffect, useCallback } from 'react';
import { Loader2, FileText, Save, Check } from 'lucide-react';
import { useNatascha } from '../hooks/useNatascha';
import { ViewShell } from './_ViewShell';
import { InfoDot } from '../components/ui/InfoDot';

/**
 * Bewertungsraster ansehen und bearbeiten.
 *
 * Eigener Reiter neben dem Erwartungshorizont, weil die beiden etwas
 * Verschiedenes sind: ein Erwartungshorizont gilt für *eine* Aufgabe und wird
 * bei jeder Änderung neu erzeugt, ein Bewertungsraster gilt für *viele*
 * Aufgaben und wird gepflegt. Der Gültigkeitsbereich ist der Unterschied —
 * beide im selben Reiter zu führen hieß, dass beim Wechseln das Gefühl
 * entsteht, es gäbe nur ein Objekt.
 *
 * Der Erwartungshorizont wird beim Bearbeiten eines Rasters nicht verändert.
 * Eine Änderung wirkt ab dem nächsten Korrekturauftrag mit diesem Raster;
 * bereits erzeugte Analysen enthalten die alte Bewertung.
 */
export function BewertungsrasterView() {
  const { listRubricFiles, readRubric, saveRubric } = useNatascha();

  const [rubricFiles, setRubricFiles] = useState<string[]>([]);
  const [rubricName, setRubricName] = useState('');
  const [rubricContent, setRubricContent] = useState('');
  const [rubricLoading, setRubricLoading] = useState(false);
  const [rubricSaving, setRubricSaving] = useState(false);
  const [rubricMsg, setRubricMsg] = useState<string | null>(null);

  useEffect(() => {
    listRubricFiles()
      .then(setRubricFiles)
      .catch((e: unknown) => {
        setRubricMsg(`Raster konnten nicht geladen werden: ${e instanceof Error ? e.message : String(e)}`);
      });
  }, [listRubricFiles]);

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

  return (
    <ViewShell
      title="Bewertungsraster"
      description="Woran LUKA eine Klassenleistung misst. Änderungen wirken ab dem nächsten Korrekturauftrag mit diesem Raster."
      maxWidth={1000}
    >
      <section style={cardStyle}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FileText size={16} /> Raster bearbeiten
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>
              Bewertungsraster
              <InfoDot text="Die Auswahl zeigt den Namen aus dem Raster-Kopf. Der Dateiname spielt keine Rolle — entscheidend ist der Inhalt darunter." />
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
              aria-label="Inhalt des Bewertungsrasters"
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
                <Save size={14} /> {rubricSaving ? 'Speichere …' : 'Speichern'}
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

const cardStyle: React.CSSProperties = {
  background: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
  marginBottom: '1.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  marginBottom: '0.25rem',
  color: 'var(--color-text-secondary)',
};
