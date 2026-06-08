import { useState } from 'react';
import { SpellCheck, Terminal, ExternalLink } from 'lucide-react';
import { loadSettings } from '../lib/storage';
import { ViewShell } from './_ViewShell';

function isTauri(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
}

export function KorrekturView() {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const starteNatascha = async () => {
    setInfo(null);
    setFehler(null);
    if (!isTauri()) {
      setFehler('Die Korrektur-App lässt sich nur aus der Desktop-App (Tauri) starten.');
      return;
    }
    setBusy(true);
    try {
      const settings = loadSettings();
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('launch_natascha', {
        dir: settings.nataschaDir ?? '',
        python: settings.pythonCommand ?? '',
      });
      setInfo('NATASCHA wurde in einem Terminalfenster gestartet. Dort geht es zum Korrekturmenü.');
    } catch (err) {
      setFehler(typeof err === 'string' ? err : err instanceof Error ? err.message : 'Start fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const cardStyle = {
    padding: '1.25rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    background: 'var(--color-bg-surface)',
    marginBottom: '1.5rem',
  } as const;

  return (
    <ViewShell
      title="Korrektur (NATASCHA)"
      description="Schülerabgaben korrigieren und Fehler-Heatmaps erzeugen — die Basis für gezielte Übungen."
    >
      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
          <SpellCheck size={20} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Korrektur-App öffnen</h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 0 }}>
          NATASCHA ist eine Terminal-Anwendung und öffnet sich in einem eigenen Fenster.
          Nach der Korrektur exportierst du dort im Heatmap-Tab über „🎯 Für Übungs-Tool" —
          der Export erscheint dann hier unter <strong>Neue erstellen → „Aus NATASCHA-Korrektur"</strong>.
        </p>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={starteNatascha}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: busy ? 'wait' : 'pointer' }}
        >
          <Terminal size={16} /> {busy ? 'Starte …' : 'NATASCHA-Korrektur öffnen'}
        </button>
        {info && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-success)' }}>{info}</p>
        )}
        {fehler && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-danger, #c0392b)' }}>{fehler}</p>
        )}
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
          <ExternalLink size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Manuell starten</h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
          Falls der Start fehlschlägt, lässt sich NATASCHA jederzeit direkt starten:
        </p>
        <pre style={{
          marginTop: '0.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
          background: 'var(--color-bg-code, #1e1e1e)', color: '#e6e6e6',
          fontSize: '0.8125rem', overflowX: 'auto',
        }}>cd apps/natascha && python natascha.py</pre>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
          Ordner und Python-Befehl kannst du in den <strong>Einstellungen → „NATASCHA"</strong> festlegen.
        </p>
      </section>
    </ViewShell>
  );
}
