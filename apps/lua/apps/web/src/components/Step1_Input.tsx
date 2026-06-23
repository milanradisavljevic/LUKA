import { useRef, useState } from 'react';
import { FileText, Upload, ArrowRight } from 'lucide-react';
import type { AppState, AppAction } from '../lib/types';
import { extractHtmlText } from '../lib/importText';
import { istUrlArtig, titelAusUrl } from '../lib/urlTitle';
import { bereinigeQuelltext, fachLabel } from '@lehrunterlagen/schema';
import type { Fach } from '@lehrunterlagen/schema';
import { analysiereQuelltext } from '../lib/quelltextInfo';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;
}

async function readFileAsText(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (lowerName.endsWith('.pdf')) {
    const pdfjsLib = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += `${pageText}\n\n`;
    }

    return fullText.trim();
  }

  if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
    return extractHtmlText(await file.text(), file.name.replace(/\.[^.]+$/, '')).inhalt;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    reader.readAsText(file, 'utf-8');
  });
}

async function fetchUrlText(url: string): Promise<{ titel: string; inhalt: string }> {
  if (!isTauri()) {
    throw new Error('URL-Import ist nur in der Desktop-App verfügbar.');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke<unknown>('fetch_url', { url });

  if (typeof result === 'string') {
    return { titel: url, inhalt: result };
  }

  if (result && typeof result === 'object') {
    const value = result as { titel?: unknown; title?: unknown; inhalt?: unknown; content?: unknown; text?: unknown };
    const titel = String(value.titel ?? value.title ?? url);
    const inhalt = String(value.inhalt ?? value.content ?? value.text ?? '');
    if (inhalt.trim()) return { titel, inhalt };
  }

  throw new Error('Die URL lieferte keinen lesbaren Text.');
}

function formatValue(value: string | undefined): string {
  return value?.trim() ? value : '-';
}

function labelTyp(typ: string | undefined): string {
  const labels: Record<string, string> = {
    hausuebung: 'Hausübung',
    test: 'Test / Stundenwiederholung',
    schularbeit: 'Schularbeit / Klassenarbeit',
  };
  return typ ? labels[typ] ?? typ : '-';
}

function labelFach(fach: Fach): string {
  return fachLabel(fach);
}

function labelStufe(stufe: string): string {
  return stufe === 'oberstufe' ? 'Oberstufe' : 'Unterstufe';
}

function labelSchwierigkeit(value: string | undefined): string {
  const labels: Record<string, string> = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' };
  return value ? labels[value] ?? value : '-';
}

export function Step1_Input({ state, dispatch }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const inhalt = bereinigeQuelltext(await readFileAsText(file));
      const titel = file.name.replace(/\.[^.]+$/, '');
      const id = `q${Date.now()}`;
      dispatch({
        type: 'ADD_QUELLTEXT',
        quelltext: { id, titel, inhalt, herkunft: { typ: 'upload', ref: file.name } },
      });
    } catch {
      alert('Datei konnte nicht gelesen werden. Bitte .txt, .docx, .pdf oder .html hochladen.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlImport = async () => {
    const url = urlInput.trim();
    if (!url) return;

    setUrlLoading(true);
    setUrlError(null);
    try {
      const { titel, inhalt } = await fetchUrlText(url);
      // Echten Seitentitel bevorzugen; fiel fetch_url auf die URL zurück, einen
      // lesbaren Titel aus der URL ableiten (statt "yougov.com/en-us/articles/…").
      const titelSauber =
        titel && titel.trim() !== url && !istUrlArtig(titel)
          ? titel.trim().slice(0, 120)
          : titelAusUrl(url);
      dispatch({
        type: 'ADD_QUELLTEXT',
        quelltext: {
          id: `q${Date.now()}`,
          titel: titelSauber,
          inhalt: bereinigeQuelltext(inhalt),
          herkunft: { typ: 'url', ref: url },
        },
      });
      setUrlInput('');
    } catch (err) {
      // Tauri-invoke rejected mit dem rohen Err-String (kein Error-Objekt) —
      // daher String-Reject explizit behandeln, sonst geht die echte Ursache verloren.
      const msg = typeof err === 'string'
        ? err
        : err instanceof Error
          ? err.message
          : 'URL konnte nicht abgerufen werden.';
      setUrlError(`${msg} Tipp: Seite alternativ als HTML speichern und hochladen.`);
    } finally {
      setUrlLoading(false);
    }
  };

  const addPlaceholderText = () => {
    const id = `q${state.quelltexte.length + 1}`;
    dispatch({
      type: 'ADD_QUELLTEXT',
      quelltext: {
        id,
        titel: '',
        inhalt: '',
        herkunft: { typ: 'eingabe', ref: '' },
      },
    });
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Angaben prüfen</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Diese Angaben kommen aus deiner Absicht und werden beim Generieren verwendet.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => dispatch({ type: 'SET_STEP', step: 'absicht' })}>
          Bearbeiten
        </button>
      </div>

      <section style={{
        padding: '1rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-bg-surface)',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem 1rem' }}>
          {[
            ['Typ', labelTyp(state.meta.typ)],
            ['Fach / Stufe', `${labelFach(state.meta.fach)} · ${labelStufe(state.meta.stufe)}`],
            ['Thema', formatValue(state.meta.thema)],
            ['Klasse', formatValue(state.meta.klasse)],
            ['Datum', formatValue(state.meta.datum)],
            ['Schwierigkeit', labelSchwierigkeit(state.meta.schwierigkeit)],
            ['Lernziele', state.meta.lernziele?.length ? state.meta.lernziele.join(', ') : '-'],
            ['Notizen', formatValue(state.meta.notizen)],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 700, marginBottom: '0.125rem' }}>
                {label}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <h2 style={{ marginBottom: '1rem' }}>Quelltexte</h2>

      {state.quelltexte.length === 0 && (
        <div style={{
          padding: '2rem 1rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-base)',
          borderRadius: 'var(--radius)',
          marginBottom: '1rem',
        }}>
          <div style={{ marginBottom: '0.5rem' }}><FileText size={32} style={{ opacity: 0.5 }} /></div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Noch keine Quelltexte</div>
          <div style={{ fontSize: '0.8125rem', marginBottom: '1rem' }}>
            Lade eine Datei hoch, importiere eine URL oder gib einen Text manuell ein — oder überspringe diesen Schritt, wenn du Aufgaben mit eigenen Inhalten erstellen willst.
          </div>
          <button
            className="btn-secondary"
            onClick={() => dispatch({ type: 'SET_STEP', step: 'baukasten' })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            Ohne Quelltext fortfahren <ArrowRight size={15} />
          </button>
        </div>
      )}

      {state.quelltexte.map((qt, i) => (
        <div key={qt.id} style={{
          padding: '1rem', marginBottom: '0.75rem',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
          background: 'var(--color-bg-surface)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <strong style={{ fontSize: '0.8125rem' }}>
              Quelltext {i + 1}
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                {qt.herkunft.typ === 'url' ? 'URL' : qt.herkunft.typ === 'upload' ? 'Datei' : 'Eingabe'}
              </span>
            </strong>
            <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              onClick={() => dispatch({ type: 'REMOVE_QUELLTEXT', id: qt.id })}>
              Entfernen
            </button>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label>Titel</label>
              <input type="text" value={qt.titel} placeholder="Titel des Quelltexts"
                onChange={(e) => dispatch({ type: 'UPDATE_QUELLTEXT', id: qt.id, quelltext: { titel: e.target.value } })} />
            </div>
            <div>
              <label>Inhalt</label>
              <textarea rows={10} value={qt.inhalt} placeholder="Quelltext hier einfügen…"
                style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                onChange={(e) => dispatch({ type: 'UPDATE_QUELLTEXT', id: qt.id, quelltext: { inhalt: e.target.value } })} />
              {qt.inhalt.trim().length > 0 && (() => {
                const info = analysiereQuelltext(qt.inhalt);
                return (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                    {info.woerter} Wörter · Ø {info.schnittSatzlaenge} W/Satz · {info.hinweis}
                  </p>
                );
              })()}
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Zeilenumbrüche bleiben erhalten. <strong>Leerzeile = neue Strophe/Absatz.</strong>
              </p>
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={addPlaceholderText}>
          + Quelltext manuell eingeben
        </button>
        <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <Upload size={15} /> Datei hochladen (.txt, .docx, .pdf, .html)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.docx,.pdf,.html,.htm"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      <div style={{
        marginTop: '0.875rem',
        padding: '0.875rem',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-bg-surface)',
      }}>
        <label htmlFor="url-import">URL importieren</label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            id="url-import"
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleUrlImport();
            }}
          />
          <button className="btn-secondary" onClick={handleUrlImport} disabled={urlLoading || !urlInput.trim()}>
            {urlLoading ? 'Abruf...' : 'Abrufen'}
          </button>
        </div>
        {urlError && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.5rem' }}>
            {urlError}
          </p>
        )}
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          Dateien werden als Text extrahiert. HTML wird bereinigt, PDF-Dateien werden direkt ausgelesen.
        </p>
      </div>
    </div>
  );
}
