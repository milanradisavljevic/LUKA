import { useState } from 'react';
import type { HistoryEntry } from '../lib/types';
import { clearHistory, loadHistory } from '../lib/storage';
import { fachLabel } from '@lehrunterlagen/schema';
import { ViewShell } from './_ViewShell';
const STUFE_LABEL: Record<string, string> = { oberstufe: 'Oberstufe', unterstufe: 'Unterstufe' };

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function HistoryView() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory());

  const sorted = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const handleClear = () => {
    if (window.confirm('Den gesamten Export-Verlauf löschen?')) {
      clearHistory();
      setEntries([]);
    }
  };

  return (
    <ViewShell
      title="Verlauf"
      description="Protokoll abgeschlossener Exporte (nur lokal, schreibgeschützt)."
      action={
        sorted.length > 0 ? (
          <button className="btn-danger" onClick={handleClear} style={{ fontSize: '0.8125rem' }}>
            Verlauf löschen
          </button>
        ) : undefined
      }
    >
      {sorted.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem 1rem', fontSize: '0.875rem' }}>
          Noch keine Exporte. Der Verlauf füllt sich, sobald du ein Dokument als DOCX exportierst.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {sorted.map((e) => (
            <div
              key={e.id}
              style={{
                padding: '0.875rem 1rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                background: 'var(--color-bg-surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '0.9375rem' }}>{e.thema || 'Unbenannt'}</strong>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {formatDate(e.timestamp)}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.25rem 0 0' }}>
                {fachLabel(e.fach)} · {STUFE_LABEL[e.stufe] ?? e.stufe}
                {' · '}{e.blockCount} Block{e.blockCount !== 1 ? 'e' : ''}
                {' · '}{e.totalPunkte} Punkte
                {e.llmProvider ? ` · ${e.llmProvider}${e.modelName ? ` (${e.modelName})` : ''}` : ''}
              </p>
              {e.exportedFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                  {e.exportedFiles.map((f) => (
                    <span
                      key={f}
                      style={{
                        fontSize: '0.6875rem',
                        background: 'var(--color-bg-base)',
                        color: 'var(--color-text-secondary)',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ViewShell>
  );
}
