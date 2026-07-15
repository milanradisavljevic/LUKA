import { Download, Loader2, RotateCw, X } from 'lucide-react';
import type { UseUpdaterReturn } from '../hooks/useUpdater';
import { parseMiniMarkdown, type InlineSegment, type MiniMarkdownBlock } from '../lib/miniMarkdown';

interface Props {
  updater: UseUpdaterReturn;
}

function renderSegments(segments: InlineSegment[]) {
  return segments.map((seg, i) => {
    if (seg.code) {
      return (
        <code
          key={i}
          style={{
            fontSize: '0.75rem',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '3px',
            padding: '0 0.25rem',
          }}
        >
          {seg.text}
        </code>
      );
    }
    return seg.bold ? <strong key={i}>{seg.text}</strong> : <span key={i}>{seg.text}</span>;
  });
}

function ReleaseNotes({ body }: { body: string }) {
  const blocks: MiniMarkdownBlock[] = parseMiniMarkdown(body);
  if (blocks.length === 0) return null;

  return (
    <div style={{ fontSize: '0.8125rem', lineHeight: 1.55, color: 'var(--color-text-primary)' }}>
      {blocks.map((block, i) => {
        if (block.type === 'list') {
          return (
            <ul key={i} style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.25rem' }}>
              {block.items.map((seg, j) => (
                <li key={j} style={{ marginBottom: '0.125rem' }}>{renderSegments(seg)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ margin: '0 0 0.5rem 0' }}>{renderSegments(block.segments)}</p>
        );
      })}
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Eigener Update-Dialog im App-Design (statt nativer Tauri-Dialoge).
 * Konsumiert `useUpdater()` — reine Anzeige, keine eigene Update-Logik.
 */
export function UpdateDialog({ updater }: Props) {
  const { state, install, relaunchNow, dismiss } = updater;

  if (state.phase === 'idle') return null;

  const canDismissViaBackdrop = state.phase !== 'downloading';

  return (
    <div
      role="presentation"
      onClick={() => canDismissViaBackdrop && dismiss()}
      style={{
        position: 'fixed', inset: 0, background: 'var(--color-overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 4500, padding: '1rem',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440, maxWidth: '100%', maxHeight: '82vh', overflow: 'auto',
          background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border)', boxShadow: '0 4px 24px var(--color-shadow)',
          padding: '1.5rem',
        }}
      >
        {state.phase === 'available' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h2 id="update-dialog-title" style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                Version {state.version} ist verfügbar
              </h2>
              <button className="btn-secondary" onClick={dismiss} aria-label="Schließen" style={{ padding: '0.25rem 0.4rem', display: 'inline-flex' }}>
                <X size={16} />
              </button>
            </div>
            {state.currentVersion && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Installiert: Version {state.currentVersion}
              </p>
            )}
            {state.body && state.body.trim() && (
              <>
                <h3 className="font-script" style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
                  Was ist neu
                </h3>
                <ReleaseNotes body={state.body} />
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={dismiss}>Später</button>
              <button className="btn-primary" onClick={() => void install()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <Download size={14} /> Jetzt installieren
              </button>
            </div>
          </>
        )}

        {state.phase === 'downloading' && (
          <>
            <h2 id="update-dialog-title" style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 size={16} className="spin" /> Update wird heruntergeladen …
            </h2>
            <div
              role="progressbar"
              aria-valuenow={state.progress?.total ? Math.round(((state.progress.received ?? 0) / state.progress.total) * 100) : undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                width: '100%', height: 8, borderRadius: 999, background: 'var(--color-bg-hover)',
                overflow: 'hidden', border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: state.progress?.total ? `${Math.min(100, Math.round((state.progress.received / state.progress.total) * 100))}%` : '35%',
                  background: 'var(--color-accent)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
              {state.progress?.total
                ? `${formatBytes(state.progress.received)} von ${formatBytes(state.progress.total)}`
                : state.progress?.received
                  ? `${formatBytes(state.progress.received)} geladen …`
                  : 'Wird vorbereitet …'}
            </p>
          </>
        )}

        {state.phase === 'downloaded' && (
          <>
            <h2 id="update-dialog-title" style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
              Update installiert
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Jetzt neu starten? Ungespeicherte Eingaben im Wizard gehen beim Neustart verloren.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={dismiss}>Beim nächsten Start</button>
              <button className="btn-primary" onClick={() => void relaunchNow()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                <RotateCw size={14} /> Jetzt neu starten
              </button>
            </div>
          </>
        )}

        {state.phase === 'error' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h2 id="update-dialog-title" style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                Update fehlgeschlagen
              </h2>
              <button className="btn-secondary" onClick={dismiss} aria-label="Schließen" style={{ padding: '0.25rem 0.4rem', display: 'inline-flex' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>
              {state.error ?? 'Unbekannter Fehler.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={dismiss}>Schließen</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
