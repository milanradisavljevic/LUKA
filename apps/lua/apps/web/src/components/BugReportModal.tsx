import { useState } from 'react';
import { X, Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'sending' | 'success' | 'error';

export function BugReportModal({ open, onClose }: Props) {
  const [description, setDescription] = useState('');
  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const dialogRef = useDialogFocus(open, () => { if (status !== 'sending') onClose(); });

  if (!open) return null;

  const canSend = description.trim().length >= 10 && status !== 'sending';

  const handleSend = async () => {
    if (!canSend) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await invoke<string>('submit_bug_report', {
        payload: {
          description: description.trim(),
          includeSystemInfo,
          contactEmail: contactEmail.trim() || null,
        },
      });
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setErrorMsg(typeof e === 'string' ? e : e instanceof Error ? e.message : 'Unbekannter Fehler');
    }
  };

  const handleClose = () => {
    if (status === 'sending') return;
    setDescription('');
    setContactEmail('');
    setStatus('idle');
    setErrorMsg('');
    onClose();
  };

  return (
    <div
      role="presentation"
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, background: 'var(--color-overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 4500, padding: '1rem',
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, maxWidth: '100%', maxHeight: '82vh', overflow: 'auto',
          background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border)', boxShadow: '0 4px 24px var(--color-shadow)',
          padding: '1.5rem',
        }}
      >
        {status === 'success' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h2 id="bug-report-title" style={{ fontSize: '1rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} style={{ color: 'var(--color-success, #16a34a)' }} /> Fehlermeldung gesendet
              </h2>
              <button className="btn-secondary" onClick={handleClose} aria-label="Schliessen" style={{ padding: '0.25rem 0.4rem', display: 'inline-flex' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              Vielen Dank! Die Fehlermeldung wurde an uns weitergeleitet. Bei Rueckfragen melden wir uns per E-Mail.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={handleClose}>Schliessen</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h2 id="bug-report-title" style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                Fehler melden
              </h2>
              <button className="btn-secondary" onClick={handleClose} aria-label="Schliessen" style={{ padding: '0.25rem 0.4rem', display: 'inline-flex' }}>
                <X size={16} />
              </button>
            </div>

            <label style={{ display: 'block', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Was ist passiert? *
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={'Was ist passiert? Was hättest du erwartet? Wie lässt es sich nachstellen?'}
                maxLength={4000}
                rows={5}
                style={{
                  width: '100%', resize: 'vertical',
                  background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                  padding: '0.5rem', fontSize: '0.8125rem', fontFamily: 'inherit',
                }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeSystemInfo}
                onChange={(e) => setIncludeSystemInfo(e.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Systeminfos anhängen (Version, Betriebssystem)
              </span>
            </label>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '-0.25rem 0 0.75rem' }}>
              Bitte keine Schülerdaten, Zugangsdaten oder anderen vertraulichen Inhalte eingeben. Dein Bericht wird zur Bearbeitung an LUKA weitergeleitet.
            </p>

            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                E-Mail fuer Rueckfragen (optional)
              </span>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="name@beispiel.de"
                style={{
                  width: '100%',
                  background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                  padding: '0.5rem', fontSize: '0.8125rem',
                }}
              />
            </label>

            {status === 'error' && (
              <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem', borderRadius: 'var(--radius)', background: 'var(--color-error-bg, #fef2f2)', color: 'var(--color-error, #dc2626)', fontSize: '0.8125rem' }}>
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={handleClose} disabled={status === 'sending'}>Abbrechen</button>
              <button className="btn-primary" onClick={handleSend} disabled={!canSend} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                {status === 'sending' ? <Loader2 size={14} className="spin" /> : <Send size={14} />} Absenden
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
