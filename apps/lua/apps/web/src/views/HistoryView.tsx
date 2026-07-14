import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, History, Plus, Trash2 } from 'lucide-react';
import { fachLabel } from '@lehrunterlagen/schema';
import type { SavedDocument } from '../lib/types';
import { loadHistory, clearHistory } from '../lib/storage';
import { useDocuments } from '../hooks/useDocuments';
import { useEinsatz, type EinsatzMetaInput, type EinsatzRecord, type RueckblickStatus } from '../hooks/useEinsatz';
import { useKlassenMeta, type KlasseMeta } from '../hooks/useKlassenMeta';
import {
  EINSATZ_ART_LABELS,
  EINSATZ_ART_OPTIONS,
  EINSATZ_STATUS_LABELS,
  RUECKBLICK_STATUS_LABELS,
  RUECKBLICK_STATUS_OPTIONS,
  einsatzAnzeigeDatum,
  formatEinsatzDatum,
  labelEinsatzArt,
  labelEinsatzStatus,
  labelRueckblickStatus,
  sortEinsaetze,
} from '../lib/einsatz';
import { ViewShell } from './_ViewShell';
import { EmptyState } from './_EmptyState';

const STUFE_LABEL: Record<string, string> = { oberstufe: 'Oberstufe', unterstufe: 'Unterstufe' };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatHistoryDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

interface EinsatzFormProps {
  dokument: SavedDocument;
  klassen: KlasseMeta[];
  onSave: (meta: EinsatzMetaInput) => Promise<boolean>;
  onCancel: () => void;
}

function EinsatzForm({ dokument, klassen, onSave, onCancel }: EinsatzFormProps) {
  const [klasseId, setKlasseId] = useState('');
  const [einsatzArt, setEinsatzArt] = useState<EinsatzMetaInput['einsatzArt']>('nur_geplant');
  const [datum, setDatum] = useState(todayIso);
  const [status, setStatus] = useState<EinsatzMetaInput['status']>('geplant');
  const [notiz, setNotiz] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const klasse = klassen.find((k) => k.id === klasseId);
    if (!klasse) return;
    setBusy(true);
    const ok = await onSave({
      materialId: dokument.id,
      klasseId: klasse.id,
      klasseNameSnapshot: klasse.name,
      titelSnapshot: dokument.title,
      status,
      einsatzArt,
      geplantAm: status === 'geplant' ? datum : null,
      eingesetztAm: status === 'eingesetzt' ? datum : null,
      lernzieleSnapshot: JSON.stringify(dokument.snapshot.meta.lernziele ?? []),
      notiz,
    });
    setBusy(false);
    if (ok) onCancel();
  };

  return (
    <div style={{ marginTop: '0.625rem', padding: '0.75rem', background: 'var(--color-bg-base)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.72rem' }}>
          Klasse
          <select value={klasseId} onChange={(e) => setKlasseId(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 3 }}>
            <option value="">Klasse auswählen …</option>
            {klassen.map((klasse) => <option key={klasse.id ?? klasse.name} value={klasse.id ?? ''}>{klasse.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: '0.72rem' }}>
          Art
          <select value={einsatzArt} onChange={(e) => setEinsatzArt(e.target.value as EinsatzMetaInput['einsatzArt'])} style={{ display: 'block', width: '100%', marginTop: 3 }}>
            {EINSATZ_ART_OPTIONS.map((art) => <option key={art} value={art}>{EINSATZ_ART_LABELS[art]}</option>)}
          </select>
        </label>
        <label style={{ fontSize: '0.72rem' }}>
          Datum
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 3, boxSizing: 'border-box' }} />
        </label>
        <label style={{ fontSize: '0.72rem' }}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as EinsatzMetaInput['status'])} style={{ display: 'block', width: '100%', marginTop: 3 }}>
            {Object.entries(EINSATZ_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <label style={{ display: 'block', fontSize: '0.72rem', marginTop: '0.5rem' }}>
        Notiz (optional)
        <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={2} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 3 }} />
      </label>
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
        <button className="btn-primary" onClick={submit} disabled={!klasseId || busy} style={{ fontSize: '0.75rem' }}>{busy ? 'Speichere …' : 'Einsatz vermerken'}</button>
        <button className="btn-secondary" onClick={onCancel} disabled={busy} style={{ fontSize: '0.75rem' }}>Abbrechen</button>
      </div>
      {klassen.length === 0 && <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>Lege zuerst eine aktive Klasse an. Archivierte Klassen werden hier nicht angeboten.</p>}
    </div>
  );
}

interface EinsatzRowProps {
  einsatz: EinsatzRecord;
  onDelete: (einsatz: EinsatzRecord) => Promise<void>;
  onRueckblick: (einsatz: EinsatzRecord, status: RueckblickStatus, notiz: string) => Promise<void>;
}

function EinsatzRow({ einsatz, onDelete, onRueckblick }: EinsatzRowProps) {
  const [status, setStatus] = useState<RueckblickStatus>(einsatz.rueckblick?.status ?? 'offen');
  const [notiz, setNotiz] = useState(einsatz.rueckblick?.notiz ?? '');
  const [busy, setBusy] = useState(false);
  const datum = einsatzAnzeigeDatum(einsatz);

  const saveRueckblick = async () => {
    setBusy(true);
    await onRueckblick(einsatz, status, notiz);
    setBusy(false);
  };

  return (
    <div style={{ padding: '0.625rem 0', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
        <div>
          <strong style={{ fontSize: '0.8rem' }}>{einsatz.klasseNameSnapshot || 'Klasse offen'}</strong>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.72rem', marginLeft: '0.5rem' }}>{formatEinsatzDatum(datum)}</span>
        </div>
        <button className="btn-danger" onClick={() => onDelete(einsatz)} title="Einsatz löschen" style={{ padding: '0.2rem 0.35rem' }}><Trash2 size={13} /></button>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
        {labelEinsatzArt(einsatz.einsatzArt)} · {labelEinsatzStatus(einsatz.status)} · Rückblick: {labelRueckblickStatus(einsatz.rueckblick?.status ?? 'offen')}
      </div>
      {einsatz.notiz && <p style={{ fontSize: '0.75rem', margin: '0.3rem 0', whiteSpace: 'pre-wrap' }}>{einsatz.notiz}</p>}
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'end', marginTop: '0.4rem', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.68rem' }}>
          Rückblick
          <select value={status} onChange={(e) => setStatus(e.target.value as RueckblickStatus)} style={{ display: 'block', marginTop: 2 }}>
            {RUECKBLICK_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{RUECKBLICK_STATUS_LABELS[value]}</option>)}
          </select>
        </label>
        <input value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Kurze Rückmeldung" aria-label="Rückblick-Notiz" style={{ flex: 1, minWidth: 160 }} />
        <button className="btn-secondary" onClick={saveRueckblick} disabled={busy} style={{ fontSize: '0.7rem' }}>{busy ? '…' : 'Rückblick speichern'}</button>
      </div>
    </div>
  );
}

interface MaterialCardProps {
  dokument: SavedDocument;
  klassen: KlasseMeta[];
  einsaetze: EinsatzRecord[];
  onRefresh: () => Promise<void>;
  upsert: (meta: EinsatzMetaInput) => Promise<EinsatzRecord | null>;
  remove: (id: string) => Promise<boolean>;
  upsertRueckblick: (id: string, status: RueckblickStatus, notiz: string) => Promise<boolean>;
}

function MaterialCard({ dokument, klassen, einsaetze, onRefresh, upsert, remove, upsertRueckblick }: MaterialCardProps) {
  const [formOpen, setFormOpen] = useState(false);
  const save = async (meta: EinsatzMetaInput) => {
    const created = await upsert(meta);
    if (created) await onRefresh();
    return created !== null;
  };
  const deleteEinsatz = async (einsatz: EinsatzRecord) => {
    if (!window.confirm(`Einsatz „${einsatz.titelSnapshot || dokument.title}" endgültig löschen?`)) return;
    if (await remove(einsatz.id)) await onRefresh();
  };
  const saveRueckblick = async (einsatz: EinsatzRecord, status: RueckblickStatus, notiz: string) => {
    if (await upsertRueckblick(einsatz.id, status, notiz)) await onRefresh();
  };

  return (
    <article style={{ padding: '0.875rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
        <strong style={{ fontSize: '0.9rem' }}>{dokument.title || 'Unbenannt'}</strong>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>{formatEinsatzDatum(dokument.updatedAt)}</span>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0.5rem' }}>
        {fachLabel(dokument.snapshot.meta.fach)} · {STUFE_LABEL[dokument.snapshot.meta.stufe] ?? dokument.snapshot.meta.stufe}
      </p>
      {sortEinsaetze(einsaetze).map((einsatz) => <EinsatzRow key={einsatz.id} einsatz={einsatz} onDelete={deleteEinsatz} onRueckblick={saveRueckblick} />)}
      {einsaetze.length === 0 && !formOpen && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.35rem 0' }}>Noch kein Einsatz vermerkt.</p>}
      {formOpen ? (
        <EinsatzForm dokument={dokument} klassen={klassen} onSave={save} onCancel={() => setFormOpen(false)} />
      ) : (
        <button className="btn-secondary" onClick={() => setFormOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', marginTop: '0.35rem' }}>
          <Plus size={13} /> Einsatz vermerken
        </button>
      )}
    </article>
  );
}

interface Props {
  onCreateNew?: () => void;
}

export function HistoryView({ onCreateNew }: Props) {
  const { documents } = useDocuments();
  const { klassen } = useKlassenMeta();
  const { list, upsert, remove, upsertRueckblick } = useEinsatz();
  const [einsaetzeByMaterial, setEinsaetzeByMaterial] = useState<Record<string, EinsatzRecord[]>>({});
  const [history, setHistory] = useState(() => loadHistory());
  const activeDocuments = useMemo(() => documents.filter((d) => !d.isDeleted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [documents]);
  const activeKlassen = useMemo(() => klassen.filter((klasse) => !klasse.archiviert && !!klasse.id), [klassen]);

  const refreshMaterial = useCallback(async (materialId: string) => {
    const entries = await list({ materialId });
    setEinsaetzeByMaterial((prev) => ({ ...prev, [materialId]: entries }));
  }, [list]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(activeDocuments.map(async (dokument) => [dokument.id, await list({ materialId: dokument.id })] as const))
      .then((entries) => {
        if (!cancelled) setEinsaetzeByMaterial(Object.fromEntries(entries));
      });
    return () => { cancelled = true; };
  }, [activeDocuments, list]);

  const sortedHistory = [...history].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const handleClear = () => {
    if (window.confirm('Den gesamten Export-Verlauf löschen?')) {
      clearHistory();
      setHistory([]);
    }
  };

  return (
    <ViewShell
      title="Verlauf"
      description="Gespeicherte Unterlagen mit Unterrichtseinsätzen und der lokale Export-Verlauf."
      action={sortedHistory.length > 0 ? <button className="btn-danger" onClick={handleClear} style={{ fontSize: '0.8125rem' }}>Verlauf löschen</button> : undefined}
    >
      <section aria-labelledby="einsatz-materialien" style={{ marginBottom: '1.25rem' }}>
        <h2 id="einsatz-materialien" style={{ fontSize: '1rem', margin: '0 0 0.625rem', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarClock size={17} /> Unterrichtseinsätze</h2>
        {activeDocuments.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Noch keine gespeicherten Unterlagen" description="Speichere eine Unterlage, um sie hier einer Klasse zuzuordnen und ihren Einsatz festzuhalten." actionLabel={onCreateNew ? 'Neue Übung erstellen' : undefined} onAction={onCreateNew} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {activeDocuments.map((dokument) => <MaterialCard key={dokument.id} dokument={dokument} klassen={activeKlassen} einsaetze={einsaetzeByMaterial[dokument.id] ?? []} onRefresh={() => refreshMaterial(dokument.id)} upsert={upsert} remove={remove} upsertRueckblick={upsertRueckblick} />)}
          </div>
        )}
      </section>

      <section aria-labelledby="export-verlauf">
        <h2 id="export-verlauf" style={{ fontSize: '1rem', margin: '0 0 0.625rem', display: 'flex', alignItems: 'center', gap: 6 }}><History size={17} /> Export-Verlauf</h2>
        {sortedHistory.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Noch kein Export protokolliert.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {sortedHistory.map((e) => (
              <div key={e.id} style={{ padding: '0.875rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '0.9375rem' }}>{e.thema || 'Unbenannt'}</strong>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{formatHistoryDate(e.timestamp)}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                  {fachLabel(e.fach)} · {STUFE_LABEL[e.stufe] ?? e.stufe} · {e.blockCount} Block{e.blockCount !== 1 ? 'e' : ''} · {e.totalPunkte} Punkte
                  {e.llmProvider ? ` · ${e.llmProvider}${e.modelName ? ` (${e.modelName})` : ''}` : ''}
                </p>
                {e.exportedFiles.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>{e.exportedFiles.map((f) => <span key={f} style={{ fontSize: '0.6875rem', background: 'var(--color-bg-base)', color: 'var(--color-text-secondary)', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>{f}</span>)}</div>}
              </div>
            ))}
          </div>
        )}
      </section>
    </ViewShell>
  );
}
