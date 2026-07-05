/**
 * Rendert KI-Schüler-Profil / KI-Klassen-Briefing strukturiert statt als
 * rohes JSON. Root Cause: natascha_cli.py speichert die LLM-Antwort (die der
 * Prompt explizit als JSON anfordert) unverändert als `{"text": <JSON-String>}`
 * — das Frontend zeigte diesen String bislang 1:1 mit whiteSpace:pre-wrap an.
 *
 * Bewusst frontend-only und tolerant: parst `text` als JSON und rendert nur
 * die Felder, die tatsächlich vorhanden sind (Profil- und Briefing-Schema
 * unterscheiden sich). Ist `text` kein JSON (ältere/manuell editierte
 * Einträge) oder hat keines der bekannten Felder, greift der bisherige
 * Prosa-Fallback unverändert.
 */
interface Foerderbereich {
  kategorie?: string;
  befund?: string;
  uebung?: string;
}

interface Schwerpunkt {
  bereich?: string;
  befund?: string;
  empfehlung?: string;
}

interface Unterrichtsempfehlung {
  fokus?: string;
  stundenidee?: string;
  material?: string;
  zielgruppe?: string;
}

interface Geparst {
  kurzbild?: string;
  staerken?: string[];
  foerderbereiche?: Foerderbereich[];
  maturabezug?: string;
  schwerpunkte?: Schwerpunkt[];
  unterrichtsempfehlungen?: Unterrichtsempfehlung[];
  matura_fokus?: string;
}

const KNOWN_KEYS = [
  'kurzbild', 'staerken', 'foerderbereiche', 'maturabezug',
  'schwerpunkte', 'unterrichtsempfehlungen', 'matura_fokus',
] as const;

/** Exportiert für Unit-Tests (kein Component-Testing-Setup im Repo). */
export function parseGeparst(text: string): Geparst | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const hatBekanntesFeld = KNOWN_KEYS.some((k) => k in (raw as Record<string, unknown>));
  return hatBekanntesFeld ? (raw as Geparst) : null;
}

const cardBox: React.CSSProperties = {
  background: 'var(--color-bg-base)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius)',
  padding: '0.75rem 0.875rem',
  marginBottom: '0.625rem',
};

export function KiTextBlock({ text }: { text: string }) {
  const geparst = parseGeparst(text);

  if (!geparst) {
    return (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    );
  }

  const foerderbereiche = geparst.foerderbereiche ?? [];
  const schwerpunkte = geparst.schwerpunkte ?? [];
  const unterrichtsempfehlungen = geparst.unterrichtsempfehlungen ?? [];
  const maturaText = (geparst.maturabezug ?? geparst.matura_fokus ?? '').trim();

  return (
    <div>
      {geparst.kurzbild && (
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>{geparst.kurzbild}</p>
      )}

      {geparst.staerken && geparst.staerken.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>Stärken</strong>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8125rem', lineHeight: 1.6 }}>
            {geparst.staerken.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {foerderbereiche.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>Förderbereiche</strong>
          {foerderbereiche.map((f, i) => (
            <div key={i} style={cardBox}>
              {f.kategorie && <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.15rem' }}>{f.kategorie}</div>}
              {f.befund && <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>{f.befund}</div>}
              {f.uebung && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>
                  Übung: {f.uebung}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {schwerpunkte.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>Schwerpunkte</strong>
          {schwerpunkte.map((s, i) => (
            <div key={i} style={cardBox}>
              {s.bereich && <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.15rem' }}>{s.bereich}</div>}
              {s.befund && <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>{s.befund}</div>}
              {s.empfehlung && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>
                  Empfehlung: {s.empfehlung}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {unterrichtsempfehlungen.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem', color: 'var(--color-text-secondary)' }}>Unterrichtsempfehlungen</strong>
          {unterrichtsempfehlungen.map((u, i) => (
            <div key={i} style={cardBox}>
              {u.fokus && <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.15rem' }}>{u.fokus}</div>}
              {u.stundenidee && <div style={{ fontSize: '0.8125rem', marginBottom: '0.25rem' }}>{u.stundenidee}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                {u.material && <span>Material: {u.material}</span>}
                {u.zielgruppe && <span>Zielgruppe: {u.zielgruppe}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {maturaText && (
        <div style={{ fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
          Matura-Bezug: {maturaText}
        </div>
      )}
    </div>
  );
}
