import { useEffect, useMemo, useState } from 'react';
import type { Block } from '@lehrunterlagen/schema';
import {
  istDeterministischPruefbar,
  pruefeDigitaleAntworten,
  type DigitaleAntworten,
  type SelbstkontrolleErgebnis,
} from '../lib/selbstkontrolle';

interface Antwortfeld {
  key: string;
  label: string;
  hint?: string;
  options?: string[];
  multiple?: boolean;
}

interface Props {
  bloecke: Block[];
}

function felderFuer(block: Block): Antwortfeld[] {
  switch (block.typ) {
    case 'multipleChoice':
      return block.config.fragen.map((frage) => ({
        key: String(frage.nr),
        label: `Frage ${frage.nr}: ${frage.frage}`,
        options: frage.optionen.map((option) => option.key),
        multiple: frage.mehrfach,
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
        options: block.config.kategorien.map((kategorie) => kategorie.name),
        multiple: true,
      }));
    case 'tabelle':
      return Object.keys(block.loesung.zellen).map((key) => ({ key, label: `Tabellenzelle ${key}` }));
    case 'wordScramble':
      return block.config.saetze.map((_, index) => ({ key: String(index + 1), label: `Satz ${index + 1}` }));
    case 'vokabeluebung':
      return Object.keys(block.loesung?.antworten ?? {}).map((key) => ({ key, label: `Vokabel ${key}` }));
    case 'fehlerkorrektur':
      return block.loesung.korrekturen.map((korrektur) => ({ key: String(korrektur.nr), label: `Korrigierter Satz ${korrektur.nr}` }));
    default:
      return [];
  }
}

function statusText(result: SelbstkontrolleErgebnis): string {
  if (result.status === 'richtig') return 'Alle Antworten richtig.';
  if (result.status === 'unvollständig') return 'Noch nicht alle Antworten wurden eingetragen.';
  if (result.status === 'falsch') return `${result.richtig} von ${result.gesamt} Antworten richtig.`;
  return 'Für diesen Block gibt es keine sichere automatische Prüfung.';
}

export function DigitaleSelbstkontrolle({ bloecke }: Props) {
  const pruefbareBloecke = useMemo(() => bloecke.filter(istDeterministischPruefbar), [bloecke]);
  const [blockId, setBlockId] = useState(pruefbareBloecke[0]?.id ?? '');
  const [antworten, setAntworten] = useState<DigitaleAntworten>({});
  const [ergebnis, setErgebnis] = useState<SelbstkontrolleErgebnis | null>(null);
  const block = pruefbareBloecke.find((candidate) => candidate.id === blockId) ?? pruefbareBloecke[0];
  const felder = block ? felderFuer(block) : [];

  useEffect(() => {
    setBlockId(block?.id ?? '');
    setAntworten({});
    setErgebnis(null);
  }, [block]);

  if (!block) {
    return (
      <div style={{ padding: '0.7rem 0', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
        Für diese Unterlage liegt kein vollständiger, lokal prüfbarer Antwortschlüssel vor.
        Offene und sachfachliche Aufgaben werden nicht automatisch bewertet.
      </div>
    );
  }

  const setSingle = (key: string, value: string) => {
    setAntworten((current) => ({ ...current, [key]: value }));
    setErgebnis(null);
  };

  const toggleMultiple = (key: string, option: string, checked: boolean) => {
    const current = Array.isArray(antworten[key]) ? [...antworten[key] as string[]] : [];
    const next = checked ? [...current, option] : current.filter((value) => value !== option);
    setAntworten((previous) => ({ ...previous, [key]: next }));
    setErgebnis(null);
  };

  const changeBlock = (nextId: string) => {
    setBlockId(nextId);
    setAntworten({});
    setErgebnis(null);
  };

  return (
    <div style={{ marginTop: '0.5rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-surface-subtle, transparent)' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.65rem', lineHeight: 1.45 }}>
        Antworten werden ausschließlich lokal mit dem gespeicherten Schlüssel verglichen. Es gibt keinen KI-Aufruf und keinen Upload.
      </div>
      {pruefbareBloecke.length > 1 && (
        <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.6rem' }}>
          Aufgabe
          <select value={block.id} onChange={(event) => changeBlock(event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.35rem' }}>
            {pruefbareBloecke.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.id} · {candidate.typ}</option>)}
          </select>
        </label>
      )}
      <div style={{ display: 'grid', gap: '0.55rem' }}>
        {felder.map((feld) => (
          <label key={feld.key} style={{ display: 'block', fontSize: '0.76rem' }}>
            <span>{feld.label}</span>
            {feld.options && feld.multiple ? (
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', marginTop: '0.25rem' }}>
                {feld.options.map((option) => (
                  <span key={option}>
                    <input
                      type="checkbox"
                      checked={Array.isArray(antworten[feld.key]) && (antworten[feld.key] as string[]).includes(option)}
                      onChange={(event) => toggleMultiple(feld.key, option, event.target.checked)}
                    />{' '}{option}
                  </span>
                ))}
              </span>
            ) : feld.options ? (
              <select value={typeof antworten[feld.key] === 'string' ? antworten[feld.key] as string : ''} onChange={(event) => setSingle(feld.key, event.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.35rem' }}>
                <option value="">Bitte wählen …</option>
                {feld.options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : (
              <input type="text" value={typeof antworten[feld.key] === 'string' ? antworten[feld.key] as string : ''} onChange={(event) => setSingle(feld.key, event.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.35rem' }} />
            )}
          </label>
        ))}
      </div>
      <button type="button" className="btn-secondary" onClick={() => setErgebnis(pruefeDigitaleAntworten(block, antworten))} style={{ marginTop: '0.75rem', fontSize: '0.78rem' }}>
        Antworten lokal prüfen
      </button>
      {ergebnis && (
        <div style={{ marginTop: '0.65rem', fontSize: '0.78rem', color: ergebnis.status === 'richtig' ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
          <strong>{statusText(ergebnis)}</strong>
          <div style={{ color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>{ergebnis.hinweis}</div>
        </div>
      )}
    </div>
  );
}
