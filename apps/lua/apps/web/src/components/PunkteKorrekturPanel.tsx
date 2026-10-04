import { useEffect, useMemo, useState } from 'react';
import type { Block } from '@lehrunterlagen/schema';
import { loadDocuments } from '../lib/storage';
import {
  bewerteDigitaleAntwortenMitPunkten,
  istDeterministischPruefbar,
  type DigitaleAntworten,
  type PunkteBlockErgebnis,
} from '../lib/selbstkontrolle';
import type { PunkteBewertung } from '../hooks/useNatascha';

interface Antwortfeld {
  key: string;
  label: string;
  options?: string[];
  multiple?: boolean;
}

interface DokumentOption {
  id: string;
  title: string;
  bloecke: Block[];
  nichtAutomatisch: number;
}

interface Props {
  abgabeId: number;
  materialId: string | null;
  aufgabe: string;
  getPunktebewertung: (abgabeId: number) => Promise<PunkteBewertung | null>;
  savePunktebewertung: (record: Omit<PunkteBewertung, 'geaendertAm'>) => Promise<PunkteBewertung>;
}

function felderFuer(block: Block): Antwortfeld[] {
  switch (block.typ) {
    case 'multipleChoice':
      return block.config.fragen.map((frage) => ({
        key: String(frage.nr), label: `Frage ${frage.nr}: ${frage.frage}`,
        options: frage.optionen.map((option) => option.key), multiple: frage.mehrfach,
      }));
    case 'lueckentext':
      return block.loesung.luecken.map((luecke) => ({ key: String(luecke.nr), label: `Lücke ${luecke.nr}` }));
    case 'matching':
      return block.config.items.map((item) => ({
        key: String(item.nr), label: `Zuordnung ${item.nr}: ${item.prompt}`,
        options: block.config.optionen.map((option) => option.key),
      }));
    case 'kategorisierung':
      return block.config.items.map((item) => ({
        key: String(item.nr), label: `Kategorie ${item.nr}: ${item.text}`,
        options: item.optionen.length > 0
          ? item.optionen.filter((option) => block.config.kategorien.some((category) => category.name === option))
          : block.config.kategorien.map((category) => category.name),
        multiple: true,
      }));
    case 'tabelle':
      return Object.keys(block.loesung.zellen).map((key) => ({ key, label: `Tabellenzelle ${key}` }));
    case 'wordScramble':
      return block.config.saetze.map((_, index) => ({ key: String(index + 1), label: `Satz ${index + 1}` }));
    case 'vokabeluebung':
      return Object.keys(block.loesung?.antworten ?? {}).map((key) => ({ key, label: `Vokabel ${key}` }));
    case 'fehlerkorrektur':
      return block.loesung.korrekturen.map((entry) => ({ key: String(entry.nr), label: `Korrigierter Satz ${entry.nr}` }));
    default:
      return [];
  }
}

function dokumentOptionen(): DokumentOption[] {
  return loadDocuments()
    .filter((document) => !document.isDeleted)
    .flatMap((document) => {
      const generated = document.snapshot.generiertesDokument;
      if (!generated) return [];
      const bloecke = generated.bloecke.filter(istDeterministischPruefbar);
      return bloecke.length ? [{
        id: document.id,
        title: document.title,
        bloecke,
        nichtAutomatisch: generated.bloecke.filter((block) => !istDeterministischPruefbar(block)).length,
      }] : [];
    });
}

function punktText(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function statusLabel(status: PunkteBlockErgebnis['items'][number]['status']): string {
  if (status === 'richtig') return 'richtig';
  if (status === 'falsch') return 'falsch';
  return 'offen';
}

export function PunkteKorrekturPanel({ abgabeId, materialId, aufgabe, getPunktebewertung, savePunktebewertung }: Props) {
  const optionen = useMemo(dokumentOptionen, []);
  const [saved, setSaved] = useState<PunkteBewertung | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [antworten, setAntworten] = useState<Record<string, DigitaleAntworten>>({});
  const [ergebnisse, setErgebnisse] = useState<PunkteBlockErgebnis[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const document = optionen.find((candidate) => candidate.id === selectedDocumentId) ?? null;
  const bewertbareBloecke = document?.bloecke ?? [];
  const punkteGesamt = ergebnisse?.reduce((sum, result) => sum + result.erreicht, 0) ?? 0;
  const punkteMax = ergebnisse?.reduce((sum, result) => sum + result.maxPunkte, 0) ?? 0;

  useEffect(() => {
    let active = true;
    setError(null);
    setMessage(null);
    setErgebnisse(null);
    setSaved(null);
    setAntworten({});
    setSelectedDocumentId('');
    void getPunktebewertung(abgabeId).then((record) => {
      if (!active) return;
      setSaved(record);
      if (record) {
        setSelectedDocumentId(record.dokumentId);
        setAntworten(record.antworten);
        setErgebnisse(record.ergebnisse);
      } else {
        const matching = optionen.filter((candidate) => candidate.id === materialId);
        const exactTitle = optionen.filter((candidate) => candidate.title.trim() === aufgabe.trim());
        setSelectedDocumentId(matching[0]?.id ?? (exactTitle.length === 1 ? exactTitle[0]!.id : ''));
      }
    }).catch(() => {
      if (active) setError('Die gespeicherte Punktebewertung konnte nicht geladen werden.');
    });
    return () => { active = false; };
  }, [abgabeId, materialId, aufgabe, getPunktebewertung, optionen]);

  function setSingle(blockId: string, key: string, value: string) {
    setAntworten((current) => ({ ...current, [blockId]: { ...current[blockId], [key]: value } }));
    setErgebnisse(null);
    setMessage(null);
  }

  function toggleMultiple(blockId: string, key: string, option: string, checked: boolean) {
    setAntworten((current) => {
      const previous = current[blockId]?.[key];
      const selected = Array.isArray(previous) ? [...previous] : [];
      const next = checked ? [...selected, option] : selected.filter((value) => value !== option);
      return { ...current, [blockId]: { ...current[blockId], [key]: next } };
    });
    setErgebnisse(null);
    setMessage(null);
  }

  function calculate() {
    if (!document) return;
    setErgebnisse(bewertbareBloecke.map((block) => bewerteDigitaleAntwortenMitPunkten(block, antworten[block.id] ?? {})));
    setMessage(null);
  }

  async function save() {
    if (!document || !ergebnisse) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await savePunktebewertung({
        abgabeId,
        dokumentId: document.id,
        dokumentTitel: document.title,
        antworten,
        ergebnisse,
        bestaetigt: true,
      });
      setSaved(result);
      setMessage('Punktebewertung gespeichert.');
    } catch {
      setError('Die Punktebewertung konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Punkte erfassen" style={{ margin: '0.8rem 0 1rem', padding: '0.85rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-surface-subtle, transparent)' }}>
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>Punkte erfassen</h3>
      <p style={{ margin: '0 0 0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.78rem', lineHeight: 1.45 }}>
        Antworten werden lokal mit dem gespeicherten Lösungsschlüssel verglichen. Teilaufgaben sind gleich gewichtet; offene Aufgaben fließen nicht in die Punktesumme ein.
      </p>
      <label style={{ display: 'block', fontSize: '0.78rem' }}>
        Angabe
        <select aria-label="Angabe für Punktebewertung" value={selectedDocumentId} onChange={(event) => {
          setSelectedDocumentId(event.target.value);
          setAntworten({});
          setErgebnisse(null);
          setSaved(null);
          setMessage(null);
        }} style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.4rem' }}>
          <option value="">Angabe auswählen …</option>
          {optionen.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title}</option>)}
        </select>
      </label>

      {saved && saved.dokumentId !== document?.id && (
        <p style={{ margin: '0.6rem 0', color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>
          Gespeicherte Bewertung zu „{saved.dokumentTitel}“; die zugehörige Angabe ist aktuell nicht verfügbar.
        </p>
      )}

      {document && (
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
          {bewertbareBloecke.map((block, blockIndex) => (
            <fieldset key={block.id} style={{ minWidth: 0, border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '0.65rem' }}>
              <legend style={{ padding: '0 0.25rem', fontSize: '0.78rem', fontWeight: 600 }}>
                Aufgabe {blockIndex + 1} · {block.typ} · {block.punkte} P.
              </legend>
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                {felderFuer(block).map((field) => {
                  const answer = antworten[block.id]?.[field.key];
                  return (
                    <label key={field.key} style={{ display: 'block', fontSize: '0.76rem' }}>
                      <span>{field.label}</span>
                      {field.options && field.multiple ? (
                        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                          {field.options.map((option) => (
                            <span key={option}><input type="checkbox" checked={Array.isArray(answer) && answer.includes(option)} onChange={(event) => toggleMultiple(block.id, field.key, option, event.target.checked)} />{' '}{option}</span>
                          ))}
                        </span>
                      ) : field.options ? (
                        <select aria-label={field.label} value={typeof answer === 'string' ? answer : ''} onChange={(event) => setSingle(block.id, field.key, event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.35rem' }}>
                          <option value="">Bitte wählen …</option>
                          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input aria-label={field.label} type="text" value={typeof answer === 'string' ? answer : ''} onChange={(event) => setSingle(block.id, field.key, event.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.35rem' }} />
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {document && document.nichtAutomatisch > 0 && (
        <p style={{ margin: '0.65rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.76rem' }}>
          Weitere offene oder nicht eindeutig prüfbare Aufgaben sind in dieser Punkteberechnung nicht enthalten.
        </p>
      )}

      {ergebnisse && (
        <div aria-live="polite" style={{ marginTop: '0.75rem', fontSize: '0.78rem' }}>
          <strong>Punktesumme: {punktText(punkteGesamt)} von {punktText(punkteMax)} Punkten</strong>
          {ergebnisse.map((result) => (
            <div key={result.blockId} style={{ marginTop: '0.3rem', color: 'var(--color-text-secondary)' }}>
              Aufgabe {(document?.bloecke.findIndex((block) => block.id === result.blockId) ?? -1) + 1}: {result.automatisch
                ? <>{punktText(result.erreicht)} / {punktText(result.maxPunkte)} P. · {result.items.map((item) => `${statusLabel(item.status)} (${punktText(item.erreicht)}/${punktText(item.maxPunkte)} P.)`).join(', ')}</>
                : 'nicht automatisch bewertbar'}
            </div>
          ))}
          <p style={{ margin: '0.55rem 0 0', color: 'var(--color-text-secondary)' }}>Die Lehrkraft legt die Note fest.</p>
        </div>
      )}

      {error && <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>{error}</p>}
      {message && <p role="status" style={{ color: 'var(--color-success)', fontSize: '0.78rem' }}>{message}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button type="button" className="btn-secondary" disabled={!document || busy} onClick={calculate}>Punkte berechnen</button>
        {ergebnisse && <button type="button" className="btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Speichert …' : 'Prüfen und speichern'}</button>}
      </div>
      {saved?.bestaetigt && <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.72rem' }}>Zuletzt bestätigt {saved.geaendertAm ? `am ${saved.geaendertAm}` : ''}</p>}
    </section>
  );
}
