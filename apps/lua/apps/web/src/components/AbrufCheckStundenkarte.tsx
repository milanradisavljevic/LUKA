import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardCheck, ExternalLink, Loader2 } from 'lucide-react';
import { useLernzielKompass, type AbrufCheck } from '../hooks/useLernzielKompass';
import { formatEinsatzDatum } from '../lib/einsatz';

interface Props {
  einsatzId: string;
  klasseId: string | null;
  onOpen: (klasseId: string, abrufcheckId: string) => void;
}

export function AbrufCheckStundenkarte({ einsatzId, klasseId, onOpen }: Props) {
  const { listChecks } = useLernzielKompass();
  const [checks, setChecks] = useState<AbrufCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!klasseId) { setChecks([]); setError(null); return; }
    setLoading(true); setError(null);
    void listChecks(klasseId).then((rows) => {
      if (active) setChecks(rows.filter((row) => row.einsatzId === einsatzId));
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [einsatzId, klasseId, listChecks]);

  const linked = checks.filter((check) => check.einsatzId === einsatzId);
  if (!klasseId || (!loading && !error && linked.length === 0)) return null;

  return <section className="planung-abschnitt" aria-label="Zeitversetzte Lernchecks">
    <h5 style={{ display: 'flex', alignItems: 'center', gap: '.375rem' }}><ClipboardCheck size={14} /> Abrufcheck für diese Stunde</h5>
    {loading && <p><Loader2 size={14} className="spin" style={{ verticalAlign: -2, marginRight: 5 }} />Check wird geladen …</p>}
    {error && <p role="alert" style={{ color: 'var(--color-danger, #a93226)' }}>{error}</p>}
    {!loading && linked.map((check) => <article key={check.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '.65rem', marginTop: '.5rem' }}>
      <strong>{check.lernziel}</strong>
      <div style={{ fontSize: '.75rem', color: 'var(--color-text-secondary)', margin: '.2rem 0' }}>
        {formatEinsatzDatum(check.faelligAm)} · {check.antwortAnzahl} Antworten · {check.richtigAnzahl} erreicht · {check.teilweiseAnzahl} teilweise · {check.nochNichtAnzahl} noch nicht gezeigt
        {check.teilnahmelisteSnapshot ? ` · ${check.rosterAnzahl} Schüler/innen im gespeicherten Klassenstand` : ''}
      </div>
      <p style={{ margin: '.35rem 0', fontSize: '.8125rem' }}>{check.frage}</p>
      {!check.terminGueltig && <p role="alert" style={{ margin: '.35rem 0', color: 'var(--color-danger, #a93226)', fontSize: '.75rem', display: 'flex', gap: 4, alignItems: 'center' }}>
        <AlertTriangle size={13} /> Termin liegt vor der Ausgangsstunde oder Korrekturgrundlage; bitte neu planen.
      </p>}
      <button className="btn-secondary" onClick={() => onOpen(klasseId, check.id)} style={{ fontSize: '.75rem', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        <ExternalLink size={13} /> Im Lernziel-Kompass öffnen
      </button>
    </article>)}
    {error && <p style={{ fontSize: '.75rem', color: 'var(--color-text-secondary)' }}>Der Abrufcheck ist weiter im Lernziel-Kompass der Klasse verfügbar.</p>}
  </section>;
}
