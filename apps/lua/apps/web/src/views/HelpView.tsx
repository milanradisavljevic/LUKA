import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Workflow, Rocket, FilePlus2, SpellCheck, GraduationCap, Users,
  ClipboardCheck, LayoutDashboard, Keyboard, ShieldCheck, LifeBuoy,
  Lightbulb, CheckCircle2,
} from 'lucide-react';
import { ViewShell } from './_ViewShell';

/* ---------- kleine Bausteine für ein konsistentes Handbuch-Layout ---------- */

function Tip({ children }: { children: ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
      padding: '0.625rem 0.875rem', margin: '0.75rem 0 0',
      background: 'var(--color-bg-base)', borderRadius: 'var(--radius)',
      borderLeft: '3px solid var(--color-accent)', fontSize: '0.8125rem', lineHeight: 1.5,
    }}>
      <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--color-accent)' }} />
      <div>{children}</div>
    </div>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: '0.875rem', lineHeight: 1.55 }}>{it}</li>
      ))}
    </ol>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>{children}</p>;
}

interface Section {
  id: string;
  title: string;
  Icon: LucideIcon;
  body: ReactNode;
}

/* ----------------------------------- Inhalt ----------------------------------- */

const SECTIONS: Section[] = [
  {
    id: 'ueberblick',
    title: 'Überblick & Closed Loop',
    Icon: Workflow,
    body: (
      <>
        <P>
          LUKA verbindet zwei Lehrer-Werkzeuge zu <strong>einem</strong> durchgängigen Kreislauf:
          Unterlagen <strong>erstellen</strong>, Schülerabgaben <strong>korrigieren</strong> und daraus
          gezielt <strong>üben</strong> lassen — alles in einer App, mit gemeinsamer Datenbank.
        </P>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
          margin: '0.75rem 0', fontSize: '0.8125rem',
        }}>
          {['Unterlagen erstellen', '→', 'Abgaben korrigieren', '→', 'Fehler-Heatmap', '→', 'gezieltes Übungsblatt', '↺'].map((t, i) => (
            <span key={i} style={{
              padding: t.length > 2 ? '0.3rem 0.6rem' : '0.3rem 0.2rem',
              background: t.length > 2 ? 'var(--color-bg-base)' : 'none',
              borderRadius: 'var(--radius)', fontWeight: t.length > 2 ? 600 : 700,
              color: t.length > 2 ? 'var(--color-text-primary)' : 'var(--color-accent)',
            }}>{t}</span>
          ))}
        </div>
        <P>
          Der Clou: Nach der Korrektur kennt die App die häufigsten Fehler einer Klasse oder
          eines einzelnen Schülers — und erzeugt mit einem Klick ein passendes Übungsblatt dazu.
        </P>
        <Tip>Wenn du neu bist, lies <strong>Erste Schritte</strong> und spiele danach den Closed Loop einmal komplett durch — das dauert keine 5 Minuten.</Tip>
      </>
    ),
  },
  {
    id: 'erste-schritte',
    title: 'Erste Schritte',
    Icon: Rocket,
    body: (
      <>
        <P>Damit die KI-Funktionen (Generieren, Korrigieren) laufen, brauchst du einen API-Schlüssel deines KI-Anbieters.</P>
        <Steps items={[
          <>Öffne <strong>Einstellungen</strong> und trage deinen API-Schlüssel ein (z. B. Anthropic, OpenAI, Mistral, DeepSeek). Schlüssel werden sicher im Schlüsselspeicher des Betriebssystems abgelegt — nicht im Klartext.</>,
          <>Wähle Standard-Anbieter und -Modell. Für günstige Tests eignet sich ein kleines Modell.</>,
          <>Zum gefahrlosen Ausprobieren ohne echte Schülerdaten: Testdaten laden (siehe <strong>Onboarding</strong> im README / Beispiel-Abgaben im Ordner <code>samples/</code>).</>,
          <>Lade in <strong>Korrektur</strong> eine erste Abgabe hoch und starte die Analyse.</>,
        ]} />
        <Tip>Ohne hinterlegten Schlüssel schlagen Analyse/Generierung fehl. Die Fehlermeldung nennt dann meist „Key/Provider prüfen".</Tip>
      </>
    ),
  },
  {
    id: 'erstellen',
    title: 'Unterlagen erstellen',
    Icon: FilePlus2,
    body: (
      <>
        <P>Der Generator führt dich in fünf Schritten von der Absicht zum fertigen DOCX.</P>
        <Steps items={[
          <><strong>Absicht</strong> — Schulstufe, Fach, Thema und Art der Unterlage festlegen. Notizen fließen als Wünsche in die Generierung ein.</>,
          <><strong>Quelltexte</strong> — Textgrundlage per Direkteingabe, Datei (TXT/DOCX/PDF/HTML) oder URL hinzufügen.</>,
          <><strong>Aufgabenblöcke</strong> — gewünschte Aufgabentypen zusammenstellen, Punkte und Arbeitsanweisungen festlegen. Beispieldaten sind grau und werden beim Generieren ersetzt.</>,
          <><strong>KI-Modell</strong> — Anbieter, Modell und Kreativitätsgrad (präzise bis kreativ) wählen.</>,
          <><strong>Generieren</strong> — Inhalte erzeugen und Schülerfassung, Lösung und optional das Korrekturraster als DOCX exportieren. Jeder Export landet im Verlauf.</>,
        ]} />
        <Tip>Einen ganzen Blocktyp wieder entfernen: im Baukasten oben rechts am Block auf das <strong>X</strong> klicken.</Tip>
      </>
    ),
  },
  {
    id: 'korrigieren',
    title: 'Korrigieren (NATASCHA)',
    Icon: SpellCheck,
    body: (
      <>
        <P>
          Im Bereich <strong>Korrektur</strong> analysiert die KI Schülerabgaben anhand einer Rubrik:
          Kriterien-Bewertung, Notenempfehlung und einzelne Fehler — farbcodiert nach
          <strong> R</strong>echtschreibung, <strong>G</strong>rammatik, <strong>Z</strong>eichensetzung
          und <strong>A</strong>usdruck.
        </P>
        <Steps items={[
          <>Klasse und Aufgabe links wählen, dann „Neue Analyse" und eine Datei (DOCX/PDF/TXT) hochladen.</>,
          <>Nach der Analyse zeigt die Detailansicht links die Bewertung (Note, Kriterien, Fehlerliste) und rechts den <strong>markierten Schülertext</strong> als A4-Vorschau.</>,
          <>Eigene <strong>Lehrernote</strong> und einen Kommentar erfassen und speichern — die App vergleicht deine Note später mit der KI-Note (Kalibrierung).</>,
          <>Mit „Feedback-DOCX" ein Rückmelde-Dokument für die Schülerin/den Schüler erzeugen.</>,
        ]} />
        <P><strong>Batch-Korrektur:</strong> Im Analyse-Dialog „Mehrere wählen …" → ganze Klasse auf einmal. Ein Fortschrittsbalken zeigt den Lauf; „Abbrechen" stoppt nach der laufenden Datei. Duplikate werden übersprungen, nicht abgebrochen.</P>
        <P><strong>Retro-Import:</strong> Bereits außerhalb der App korrigierte Abgaben (vorhandene Analyse-JSONs) holst du über „Retro-Import" im Abgaben-Kopf nachträglich in die Datenbank.</P>
        <Tip>Über den Schülernamen in der Detailansicht springst du direkt zum Längsschnitt dieses Schülers.</Tip>
      </>
    ),
  },
  {
    id: 'klassen',
    title: 'Klassen-Auswertung',
    Icon: GraduationCap,
    body: (
      <>
        <P>Der Bereich <strong>Meine Klassen</strong> verdichtet alle Korrekturen einer Klasse zu Auswertungen:</P>
        <Steps items={[
          <><strong>Fehler-Heatmap</strong> — welche Fehlerarten dominieren.</>,
          <><strong>Notenverteilung</strong> und <strong>Trend</strong> über mehrere Aufgaben.</>,
          <><strong>Kalibrierung</strong> — wie stark KI-Note und Lehrernote auseinanderliegen.</>,
          <><strong>KI-Klassen-Briefing</strong> — eine generierte Zusammenfassung mit Handlungsempfehlungen.</>,
        ]} />
        <P>
          <strong>Closed Loop:</strong> „Übungsblatt zu Top-Fehlern generieren" springt direkt in den
          Generator — die häufigsten Fehlerschwerpunkte der Klasse sind bereits als Fokus vorbefüllt.
        </P>
        <Tip>Du kannst die Noten einer Klasse als CSV exportieren (z. B. fürs Notenbuch).</Tip>
      </>
    ),
  },
  {
    id: 'schueler',
    title: 'Schüler-Längsschnitt',
    Icon: Users,
    body: (
      <>
        <P>Im Bereich <strong>Schüler</strong> verfolgst du die Entwicklung einzelner Lernender über mehrere Aufgaben.</P>
        <Steps items={[
          <>Klasse und Schüler wählen → Notenverlauf, Trend (K1/K3), Fehlerschwerpunkte und Kalibrierung.</>,
          <><strong>KI-Schüler-Profil</strong> generieren — eine individuelle Einschätzung auf Basis des Längsschnitts.</>,
          <><strong>Closed Loop pro Schüler:</strong> „Übungsblatt zu Schwächen" erzeugt ein Arbeitsblatt, das auf die persönlichen Fehlerschwerpunkte zugeschnitten ist.</>,
          <><strong>CSV-Import:</strong> mehrere Schüler auf einmal anlegen — eine Zeile pro Person (Vorname, Nachname).</>,
        ]} />
      </>
    ),
  },
  {
    id: 'erwartungshorizont',
    title: 'Erwartungshorizont & Rubrik-Editor',
    Icon: ClipboardCheck,
    body: (
      <>
        <P>
          Ein <strong>Erwartungshorizont</strong> ist eine KI-generierte Musterlösung für eine Aufgabe.
          Generieren, im Textfeld bearbeiten und „Akzeptieren &amp; speichern" — danach nutzt die
          Korrektur dieser Aufgabe ihn automatisch als Maßstab.
        </P>
        <P>
          Im <strong>Rubrik-Editor</strong> (gleiche Ansicht) bearbeitest du die Bewertungsraster direkt:
          Rubrik wählen, Markdown anpassen, speichern. Änderungen wirken bei der nächsten Korrektur mit dieser Rubrik.
        </P>
        <Tip>So steuerst du die Bewertung gezielt — z. B. strengere oder fachspezifische Kriterien.</Tip>
      </>
    ),
  },
  {
    id: 'dashboard',
    title: 'Übersicht (Dashboard)',
    Icon: LayoutDashboard,
    body: (
      <>
        <P>
          Die <strong>Übersicht</strong> ist deine Startseite: Anzahl Klassen und Abgaben, Klassen mit
          <strong> Handlungsbedarf</strong> (schwacher Notenschnitt) und pro Klasse eine Karte mit
          Notenschnitt, letzter Aktivität und Lehrer-Feedback-Quote. Ein Klick führt in die Klassen-Ansicht.
        </P>
      </>
    ),
  },
  {
    id: 'tastenkuerzel',
    title: 'Tastenkürzel',
    Icon: Keyboard,
    body: (
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--color-bg-surface)' }}>
        {[
          { keys: 'Strg / Cmd + K', desc: 'Befehlspalette öffnen oder schließen' },
          { keys: 'Esc', desc: 'Befehlspalette / Dialog schließen' },
          { keys: 'Enter', desc: 'In Eingabefeldern: Aktion bestätigen (z. B. Schüler hinzufügen)' },
        ].map((s, i) => (
          <div key={s.keys} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.625rem 1rem', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
            <kbd style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.1875rem 0.5rem', whiteSpace: 'nowrap', minWidth: 140, textAlign: 'center' }}>{s.keys}</kbd>
            <span style={{ fontSize: '0.875rem' }}>{s.desc}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'datenschutz',
    title: 'Datenschutz',
    Icon: ShieldCheck,
    body: (
      <>
        <P>
          <strong>Wichtig:</strong> Bei Korrektur, Erwartungshorizont und Schüler-Profil wird der
          jeweilige <strong>Text an den gewählten KI-Anbieter übertragen</strong> (z. B. Anthropic,
          OpenAI, DeepSeek). Verwende daher möglichst <strong>pseudonymisierte</strong> Abgaben —
          keine vollen Klarnamen in den Dokumenten.
        </P>
        <P>
          Alles andere bleibt <strong>lokal</strong>: Datenbank und Exporte liegen auf deinem Rechner und
          sind nicht in der Cloud. Details im Dokument <code>docs/DATENSCHUTZ.md</code>.
        </P>
      </>
    ),
  },
  {
    id: 'hilfe',
    title: 'Bekannte Einschränkungen & Hilfe',
    Icon: LifeBuoy,
    body: (
      <>
        <Steps items={[
          <><strong>„Analyse fehlgeschlagen"</strong> → API-Schlüssel und Anbieter in den Einstellungen prüfen; ggf. anderes Modell wählen.</>,
          <><strong>Erzeugtes DOCX öffnet sich nicht automatisch</strong> (in der Entwicklungs-/WSL-Umgebung bekannt) → Datei manuell im Ausgabeordner öffnen.</>,
          <><strong>Selten unvollständige KI-Antwort</strong> bei sehr günstigen Modellen (z. B. abgeschnittenes JSON) → Analyse erneut starten oder hochwertigeres Modell wählen.</>,
          <><strong>Daten nach Neustart weg?</strong> Sollte nicht passieren — falls doch, bitte als Fehler melden (siehe README / Testplan).</>,
        ]} />
        <Tip>Speicherfehler werden seit Kurzem als Hinweis (Toast) unten rechts angezeigt — wenn so einer auftaucht, bitte mit Screenshot melden.</Tip>
      </>
    ),
  },
];

/* ----------------------------------- View ----------------------------------- */

export function HelpView() {
  const [activeId, setActiveId] = useState(SECTIONS[0]!.id);

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
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <ViewShell
      title="Hilfe & Handbuch"
      description="Alle Bereiche der App — vom ersten API-Schlüssel bis zum Closed Loop."
      maxWidth={1200}
    >
      <div className="help-grid" style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Inhaltsverzeichnis (sticky) */}
        <nav className="help-toc" style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECTIONS.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left',
                  padding: '0.4rem 0.6rem', fontSize: '0.8125rem', cursor: 'pointer',
                  borderRadius: 'var(--radius)', width: '100%',
                  border: 'none',
                  borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
                  background: active ? 'var(--color-highlight-bg)' : 'none',
                  color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <s.Icon size={15} style={{ flexShrink: 0, color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)' }} />
                {s.title}
              </button>
            );
          })}
        </nav>

        {/* Inhalt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', minWidth: 0 }}>
          {SECTIONS.map((s) => (
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', paddingTop: '0.5rem' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />
            Mehr Details im Repo: <code>docs/TESTPLAN.md</code> und <code>README.md</code>.
          </div>
        </div>
      </div>
    </ViewShell>
  );
}
