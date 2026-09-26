import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ViewShell } from './_ViewShell';
import {
  HELP_SECTIONS, KAPITEL, P, Steps, Tip,
  verfuegbareKapitel, verfuegbareSektionen,
  type HelpSection, type Kapitel,
} from './helpSections';

const REPO_URL = 'https://github.com/milanradisavljevic/LUKA';

export function HelpView() {
  const sektionen = verfuegbareSektionen();
  const kapitel = verfuegbareKapitel(sektionen);
  const [activeId, setActiveId] = useState(sektionen[0]!.id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-12% 0px -70% 0px', threshold: 0 },
    );
    sektionen.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sektionen]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Das aktive Kapitel ergibt sich aus der aktiven Sektion — der Scroll-Spy
  // beobachtet Abschnitte, nicht Kapitelüberschriften.
  const activeKapitel = sektionen.find((s) => s.id === activeId)?.kapitel ?? kapitel[0]!.id;

  return (
    <ViewShell
      title="Hilfe & Handbuch"
      description="Sechs Kapitel vom ersten API-Schlüssel bis zur Rückmeldung an die Schülerin oder den Schüler."
      maxWidth={1200}
    >
      <div className="help-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Inhaltsverzeichnis (sticky, nach Kapiteln gruppiert) */}
        <nav className="help-toc" style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {kapitel.map((k) => {
            const aktiv = k.id === activeKapitel;
            return (
              <div key={k.id} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button
                  onClick={() => scrollTo(sektionen.find((s) => s.kapitel === k.id)!.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem', textAlign: 'left',
                    padding: '0.3rem 0.4rem', fontSize: '0.75rem', cursor: 'pointer',
                    border: 'none', background: 'none', letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: aktiv ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontWeight: aktiv ? 700 : 600,
                  }}
                >
                  <k.Icon size={13} style={{ flexShrink: 0 }} />
                  {k.label}
                </button>
                {sektionen.filter((s) => s.kapitel === k.id).map((s) => (
                  <KapitelEintrag key={s.id} section={s} active={s.id === activeId} onSelect={scrollTo} />
                ))}
              </div>
            );
          })}
        </nav>

        {/* Inhalt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', minWidth: 0 }}>
          {kapitel.map((k) => {
            const eigene = sektionen.filter((s) => s.kapitel === k.id);
            if (eigene.length === 0) return null;
            return (
              <div key={k.id} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <KapitelKopf kapitel={k} anzahl={eigene.length} />
                {eigene.map((s) => (
                  <section key={s.id} id={s.id} style={{ scrollMarginTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.0625rem', margin: '0 0 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <s.Icon size={18} style={{ color: 'var(--color-accent)' }} /> {s.title}
                    </h3>
                    <div style={{
                      padding: '1rem 1.125rem', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius)', background: 'var(--color-bg-surface)',
                    }}>
                      {s.body}
                    </div>
                  </section>
                ))}
              </div>
            );
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />
            Ausführliche Anleitung mit mehr Detail je Fall:{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener">docs/ANLEITUNG.md</a>
            {' · '}
            Datenschutz: <code>docs/DATENSCHUTZ.md</code>
            {' · '}
            Fehler? <strong>Fehler melden</strong> unten in der Seitenleiste.
          </div>
        </div>
      </div>
    </ViewShell>
  );
}

function KapitelEintrag({ section, active, onSelect }: { section: HelpSection; active: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(section.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem', textAlign: 'left',
        padding: '0.3rem 0.4rem', fontSize: '0.8125rem', cursor: 'pointer',
        borderRadius: 'var(--radius)', width: '100%',
        border: 'none',
        borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
        background: active ? 'var(--color-highlight-bg)' : 'none',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontWeight: active ? 600 : 400,
      }}
    >
      <section.Icon size={14} style={{ flexShrink: 0, color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)' }} />
      {section.title}
    </button>
  );
}

function KapitelKopf({ kapitel, anzahl }: { kapitel: Kapitel; anzahl: number }) {
  return (
    <header style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem', paddingBottom: '0.375rem', borderBottom: '2px solid var(--color-accent)' }}>
      <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <kapitel.Icon size={20} style={{ color: 'var(--color-accent)' }} /> {kapitel.label}
      </h2>
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        {kapitel.kurz} ({anzahl} {anzahl === 1 ? 'Abschnitt' : 'Abschnitte'})
      </span>
    </header>
  );
}

export { P, Steps, Tip };
