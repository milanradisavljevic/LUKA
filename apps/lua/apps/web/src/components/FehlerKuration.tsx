import { Check } from 'lucide-react';
import type { BridgeBeispiel } from '../lib/nataschaBridge';
import { TYP_FARBE } from '../lib/nataschaBridge';
import { SectionLabel } from './ui/SectionLabel';

/** Ein kuratierbarer Fehler: Brücken-Beispiel + An/Aus-Zustand. */
export interface KurierterFehler extends BridgeBeispiel {
  aktiv: boolean;
}

const TYP_LABEL: Record<BridgeBeispiel['typ'], string> = {
  R: 'Rechtschreibung',
  G: 'Grammatik',
  Z: 'Zeichensetzung',
  A: 'Ausdruck/Stil',
};

interface Props {
  fehler: KurierterFehler[];
  onChange: (next: KurierterFehler[]) => void;
}

/**
 * Editierbare Kurations-Liste der aus der NATASCHA-Korrektur übernommenen
 * Schülerfehler. Lehrkraft wählt aus (an/aus) und kann Zitat/Korrektur anpassen,
 * bevor die Übung generiert wird. Ausgewählte Fehler fließen in den Prompt.
 */
export function FehlerKuration({ fehler, onChange }: Props) {
  if (fehler.length === 0) return null;
  const aktivCount = fehler.filter((f) => f.aktiv).length;

  const patch = (i: number, p: Partial<KurierterFehler>) =>
    onChange(fehler.map((f, idx) => (idx === i ? { ...f, ...p } : f)));

  return (
    <section style={{ marginBottom: '1.25rem' }}>
      <SectionLabel hint="Aus der Korrektur übernommen. Wähle, woran geübt werden soll — Zitat und Korrektur sind anpassbar.">
        Fehler aus der Korrektur ({aktivCount}/{fehler.length} aktiv)
      </SectionLabel>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {fehler.map((f, i) => (
          <div
            key={i}
            className={f.aktiv ? 'tile tile-selected' : 'tile'}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: '0.625rem', cursor: 'default', opacity: f.aktiv ? 1 : 0.6 }}
          >
            {/* Toggle */}
            <button
              type="button"
              aria-pressed={f.aktiv}
              aria-label={f.aktiv ? 'Fehler abwählen' : 'Fehler auswählen'}
              onClick={() => patch(i, { aktiv: !f.aktiv })}
              style={{
                flexShrink: 0, width: 22, height: 22, padding: 0, marginTop: 2,
                borderRadius: 'var(--radius)',
                border: `1px solid ${f.aktiv ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: f.aktiv ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {f.aktiv && <Check size={14} />}
            </button>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <span className="badge" style={{ alignSelf: 'flex-start', background: `${TYP_FARBE[f.typ]}22`, color: TYP_FARBE[f.typ] }}>
                {TYP_LABEL[f.typ]}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                <input
                  value={f.zitat}
                  onChange={(e) => patch(i, { zitat: e.target.value })}
                  placeholder="Fehlerhafte Stelle"
                  aria-label="Fehlerhafte Stelle"
                  style={{ fontSize: '0.8125rem' }}
                />
                <input
                  value={f.korrektur}
                  onChange={(e) => patch(i, { korrektur: e.target.value })}
                  placeholder="Korrektur"
                  aria-label="Korrektur"
                  style={{ fontSize: '0.8125rem' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Baut den Prompt-Zusatz aus den aktiven Fehlern (für auftrag.notizen). */
export function fehlerNotiz(fehler: KurierterFehler[]): string {
  const aktiv = fehler.filter((f) => f.aktiv && f.zitat.trim());
  if (aktiv.length === 0) return '';
  const liste = aktiv
    .map((f) => `„${f.zitat.trim()}" → „${f.korrektur.trim()}" (${TYP_LABEL[f.typ]})`)
    .join('; ');
  return `Berücksichtige diese typischen Schülerfehler aus der Korrektur: ${liste}.`;
}
