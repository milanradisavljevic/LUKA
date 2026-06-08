import { ViewShell } from './_ViewShell';

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: 'Strg / Cmd + K', desc: 'Befehlspalette öffnen oder schließen' },
  { keys: 'Esc', desc: 'Befehlspalette schließen' },
  { keys: 'Enter', desc: 'In Eingabefeldern: Aktion bestätigen (z. B. Vorlage speichern)' },
];

const WORKFLOW: { title: string; text: string }[] = [
  {
    title: '1. Absicht',
    text: 'Lege Schulstufe, Fach, Thema und die Art der Unterlage fest. Optionale Notizen fließen als Wünsche in die Generierung ein.',
  },
  {
    title: '2. Quelltexte',
    text: 'Füge die Textgrundlage hinzu — per Direkteingabe, Datei-Upload (TXT, DOCX, PDF, HTML) oder URL-Import. Die Angaben aus Schritt 1 erscheinen hier schreibgeschützt.',
  },
  {
    title: '3. Aufgabenblöcke',
    text: 'Stelle die gewünschten Aufgabentypen zusammen, lege Punkte und Arbeitsanweisungen fest. Beispieldaten sind grau markiert und werden beim Generieren ersetzt.',
  },
  {
    title: '4. KI-Modell',
    text: 'Wähle Anbieter und Modell und stelle den Kreativitätsgrad ein (präzise bis kreativ).',
  },
  {
    title: '5. Generieren',
    text: 'Erzeuge die Inhalte und exportiere Schülerfassung, Lösung und optional das Korrekturraster als DOCX. Jeder Export landet im Verlauf.',
  },
];

export function HelpView() {
  return (
    <ViewShell
      title="Hilfe"
      description="Tastenkürzel und ein kurzer Überblick über den Arbeitsablauf."
    >
      <section style={{ marginBottom: '1.75rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Tastenkürzel</h3>
        <div style={{
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
          overflow: 'hidden', background: 'var(--color-bg-surface)',
        }}>
          {SHORTCUTS.map((s, i) => (
            <div
              key={s.keys}
              style={{
                display: 'flex', gap: '1rem', alignItems: 'center',
                padding: '0.625rem 1rem',
                borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <kbd style={{
                fontSize: '0.75rem', fontFamily: 'monospace',
                background: 'var(--color-bg-base)', border: '1px solid var(--color-border)',
                borderRadius: '4px', padding: '0.1875rem 0.5rem', whiteSpace: 'nowrap',
                minWidth: 140, textAlign: 'center',
              }}>
                {s.keys}
              </kbd>
              <span style={{ fontSize: '0.875rem' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Arbeitsablauf</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {WORKFLOW.map((w) => (
            <div
              key={w.title}
              style={{
                padding: '0.875rem 1rem', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
              }}
            >
              <strong style={{ fontSize: '0.9375rem' }}>{w.title}</strong>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: '0.375rem 0 0' }}>
                {w.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </ViewShell>
  );
}
