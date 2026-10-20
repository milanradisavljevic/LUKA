import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CopyPlus, Loader2 } from 'lucide-react';
import type { AppAction, AppState, SavedDocument } from '../lib/types';
import { loadDocuments, saveDocumentConfirmed, snapshotFromState } from '../lib/storage';
import { getBlockLabel } from '../lib/blockDefaults';
import {
  bereiteParallelversionVor,
  findeWiederverwendung,
  istWortschatzUnterlage,
  type ParallelBezeichnung,
} from '../lib/parallelversion';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const BEZEICHNUNGEN: { id: ParallelBezeichnung; label: string; beschreibung: string }[] = [
  { id: 'keine', label: 'Neue Übung', beschreibung: 'Gleiche Aufgaben, anderer Inhalt.' },
  { id: 'gruppe-b', label: 'Gruppe B', beschreibung: 'Gleiche Punkte und gleiches Raster wie Gruppe A.' },
  { id: 'nachschreibtermin', label: 'Nachschreibtermin', beschreibung: 'Für Schüler/innen, die gefehlt haben.' },
];

/** Sichert das aktuelle Dokument, damit das Original beim Wechsel erhalten bleibt. */
async function sichereOriginal(state: AppState): Promise<string> {
  const existing = state.aktuelleDokumentId
    ? loadDocuments().find((d) => d.id === state.aktuelleDokumentId)
    : undefined;
  const now = new Date().toISOString();
  const doc: SavedDocument = {
    id: existing?.id ?? crypto.randomUUID(),
    title: state.meta.thema?.trim() || 'Unbenannt',
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
    isFavorite: existing?.isFavorite ?? false,
    isDeleted: false,
    deletedAt: null,
    snapshot: snapshotFromState(state),
  };
  await saveDocumentConfirmed(doc);
  return doc.id;
}

/** „Neue Version mit anderem Inhalt“ in Schritt 5 (Akkordeon wie Differenzierung). */
export function ParallelversionPanel({ state, dispatch }: Props) {
  const [offen, setOffen] = useState(false);
  const [bezeichnung, setBezeichnung] = useState<ParallelBezeichnung>(
    state.meta.typ === 'schularbeit' || state.meta.typ === 'test' ? 'gruppe-b' : 'keine',
  );
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gleicherWortschatz, setGleicherWortschatz] = useState(
    () => (state.generiertesDokument ? istWortschatzUnterlage(state.generiertesDokument) : false),
  );
  const dokument = state.generiertesDokument;
  if (!dokument) return null;

  const vorbereiten = async () => {
    setBusy(true);
    setFehler(null);
    try {
      await sichereOriginal(state);
      const { snapshot, brauchtNeuenQuelltext } = bereiteParallelversionVor(
        state, dokument, bezeichnung, gleicherWortschatz ? 'wortschatz' : 'standard',
      );
      dispatch({ type: 'LOAD_SNAPSHOT', snapshot, documentId: null });
      if (brauchtNeuenQuelltext) dispatch({ type: 'SET_STEP', step: 'input' });
    } catch {
      setFehler('Das Original ließ sich nicht speichern. Bitte zuerst manuell speichern.');
    } finally {
      setBusy(false);
    }
  };

  const textModus = (state.meta.modus ?? 'text') === 'text' && state.quelltexte.length > 0;

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-expanded={offen}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '0.6rem 0.85rem', fontSize: '0.875rem', color: 'var(--color-text-primary)',
          display: 'flex', alignItems: 'center', gap: '0.4rem' }}
      >
        {offen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <CopyPlus size={15} /> Neue Version mit anderem Inhalt
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Gruppe B · Nachschreibtermin</span>
      </button>
      {offen && (
        <div style={{ padding: '0 0.85rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
            LUKA übernimmt Aufgabenarten, Anzahl und Punkte dieser Unterlage in den Baukasten. Dort kannst du
            weitere Aufgaben ergänzen oder streichen. Die KI erstellt anschließend neue Sätze und Inhalte und
            vermeidet die des Originals. Das Original wird vorher gespeichert.
          </p>
          {BEZEICHNUNGEN.map((b) => (
            <label key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', fontSize: '0.8125rem', cursor: 'pointer', lineHeight: 1.4 }}>
              <input type="radio" name="parallel-bezeichnung" checked={bezeichnung === b.id} onChange={() => setBezeichnung(b.id)}
                style={{ width: 16, height: 16, flexShrink: 0, margin: '0.1rem 0 0', padding: 0, accentColor: 'var(--color-accent)' }} />
              <span>
                <strong>{b.label}</strong>
                <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{b.beschreibung}</span>
              </span>
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', fontSize: '0.8125rem', cursor: 'pointer', lineHeight: 1.4 }}>
            <input type="checkbox" checked={gleicherWortschatz} onChange={(e) => setGleicherWortschatz(e.target.checked)}
              style={{ width: 16, height: 16, flexShrink: 0, margin: '0.1rem 0 0', padding: 0, accentColor: 'var(--color-accent)' }} />
            <span>
              <strong>Gleicher Wortschatz</strong>
              <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                Für Vokabelübungen: dieselben Wörter und Wendungen in neuen Sätzen. Ohne Häkchen bleibt das Phänomen
                (z. B. die Grammatik), die Wörter sind neu.
              </span>
            </span>
          </label>
          {textModus && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
              Diese Unterlage beruht auf einem Quelltext. Du landest zuerst bei den Quelltexten: Ersetze dort den
              Text durch einen neuen, damit sich auch die Aufgaben ändern.
            </p>
          )}
          <button
            className="btn-secondary"
            onClick={vorbereiten}
            disabled={busy}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', borderStyle: 'dashed',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {busy ? <><Loader2 size={15} className="spin" /> Original wird gespeichert …</> : <><CopyPlus size={15} /> Im Baukasten vorbereiten</>}
          </button>
          {fehler && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <AlertTriangle size={13} /> {fehler}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Warnt, wenn eine erzeugte Parallelversion Inhalte des Originals wiederholt. */
export function WiederverwendungsHinweis({ state }: { state: AppState }) {
  const treffer = useMemo(
    () => (state.generiertesDokument ? findeWiederverwendung(state.bloecke, state.generiertesDokument) : []),
    [state.bloecke, state.generiertesDokument],
  );
  if (treffer.length === 0) return null;
  return (
    <div
      role="status"
      style={{
        marginBottom: '1.5rem', padding: '0.625rem 0.75rem', fontSize: '0.8125rem',
        borderLeft: '3px solid var(--color-warning, #b45309)',
        background: 'var(--color-bg-subtle, transparent)', lineHeight: 1.6,
      }}
    >
      <strong>Bitte prüfen.</strong>{' '}
      Die neue Version weicht hier von der Vorgabe ab. Erstelle die Aufgabe in der Vorschau neu oder passe sie an:
      <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem' }}>
        {treffer.map((t) => {
          const block = state.generiertesDokument!.bloecke.find((b) => b.id === t.blockId);
          return (
            <li key={t.blockId}>
              {block ? getBlockLabel(block.typ) : t.blockId}:{' '}
              {t.inhalte.length > 0 && (
                <>wiederholt {t.inhalte.slice(0, 3).map((s) => `„${s}“`).join(', ')}
                  {t.inhalte.length > 3 ? ` und ${t.inhalte.length - 3} weitere` : ''}</>
              )}
              {t.inhalte.length > 0 && t.fehlend && '; '}
              {t.fehlend && (
                <>es fehlen {t.fehlend.slice(0, 6).map((s) => `„${s}“`).join(', ')}
                  {t.fehlend.length > 6 ? ` und ${t.fehlend.length - 6} weitere` : ''}</>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
