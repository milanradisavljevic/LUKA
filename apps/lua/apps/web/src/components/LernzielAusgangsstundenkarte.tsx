import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { useLernzielKompass, type AbrufCheck, type LernzielFokus } from '../hooks/useLernzielKompass';
import { formatEinsatzDatum } from '../lib/einsatz';

interface Props {
  einsatzId: string;
  klasseId: string | null;
  onOpenCheck: (klasseId: string, abrufcheckId: string) => void;
}

function zeitraum(von: string | null, bis: string | null): string {
  if (!von && !bis) return 'Zeitraum unbekannt';
  const start = von ? formatEinsatzDatum(von) : '';
  const ende = bis ? formatEinsatzDatum(bis) : '';
  return start && ende && start !== ende ? `${start} bis ${ende}` : start || ende;
}

export function LernzielAusgangsstundenkarte({ einsatzId, klasseId, onOpenCheck }: Props) {
  const { listFokus, listChecks } = useLernzielKompass();
  const [fokus, setFokus] = useState<LernzielFokus[]>([]);
  const [checks, setChecks] = useState<AbrufCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!klasseId) { setFokus([]); setChecks([]); setError(null); return; }
    setLoading(true); setError(null);
    void Promise.all([listFokus(klasseId), listChecks(klasseId)]).then(([goals, retrievals]) => {
      if (!active) return;
      setFokus(goals.filter((item) => item.ausgangseinsatzId === einsatzId));
      setChecks(retrievals);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : String(cause));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [einsatzId, klasseId, listFokus, listChecks]);

  const linked = fokus.filter((item) => item.ausgangseinsatzId === einsatzId);
  if (!klasseId || (!loading && !error && linked.length === 0)) return null;

  return <section className="planung-abschnitt" aria-label="Lernziele aus dieser Stunde">
    <h5 style={{ display: 'flex', alignItems: 'center', gap: '.375rem' }}><CheckCircle2 size={14} /> Lernziele aus dieser Stunde</h5>
    {loading && <p><Loader2 size={14} className="spin" style={{ verticalAlign: -2, marginRight: 5 }} />Lernziele werden geladen …</p>}
    {error && <p role="alert" style={{ color: 'var(--color-danger, #a93226)' }}>{error}</p>}
    {!loading && linked.map((item) => {
      const relatedChecks = checks.filter((check) => check.fokusId === item.id);
      return <article key={item.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '.65rem', marginTop: '.5rem' }}>
        <strong>{item.lernziel}</strong>
        <div style={{ fontSize: '.75rem', color: 'var(--color-text-secondary)', margin: '.2rem 0' }}>
          Korrekturquelle „{item.aufgabeSnapshot}“ · {item.fehlerAnzahl} von {item.antwortAnzahl} Abgaben mit diesem Fehlermuster · {zeitraum(item.zeitraumVon, item.zeitraumBis)}
        </div>
        {relatedChecks.map((check) => <button key={check.id} className="btn-secondary" onClick={() => onOpenCheck(klasseId, check.id)} style={{ fontSize: '.75rem', display: 'inline-flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
          <ExternalLink size={13} /> Check vom {formatEinsatzDatum(check.faelligAm)} öffnen
        </button>)}
      </article>;
    })}
  </section>;
}
