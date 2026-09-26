/**
 * Inhalt der Hilfe — getrennt vom Renderer (`HelpView.tsx`), weil hier die
 * **Kapitel** stehen und drei Listen nicht mehr von Hand gepflegt werden:
 *
 *   - Fächer kommen aus `FACH_META` (packages/schema),
 *   - Aufgabentypen aus `BLOCK_TYPE_DEFS` (lib/constants),
 *   - Tastenkürzel aus `SHORTCUTS` (lib/shortcuts).
 *
 * Vorher standen diese Listen als Prosa in `HelpView.tsx` — und liefen der
 * App hinterher: zwei der 14 Fächer und einer der 20 Aufgabentypen fehlten,
 * von 19 existierenden Tastenkürzeln waren 3 genannt. `helpSections.test.tsx`
 * wacht jetzt darüber, dass das nicht wieder passiert.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Workflow, Rocket, FilePlus2, SpellCheck, GraduationCap, Users,
  ClipboardCheck, LayoutDashboard, Keyboard, ShieldCheck, LifeBuoy,
  Lightbulb, CheckCircle2, Target, FolderOpen, Shapes, BookOpen,
  Database, FileDown, Search, Compass, CalendarRange, Presentation,
  UserCog, Download, ClipboardList, Rocket as RocketIcon,
} from 'lucide-react';
import { FACH_META } from '@lehrunterlagen/schema';
import { BLOCK_TYPE_DEFS, BLOCK_TYP_GRUPPEN, type BlockTypGruppe } from '../lib/constants';
import { SHORTCUTS, SHORTCUT_SCOPES, formatShortcut, type ShortcutScope } from '../lib/shortcuts';
import { FEATURES } from '../lib/features';

/* --------------------------------- Bausteine -------------------------------- */

export function Tip({ children }: { children: ReactNode }) {
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

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: '0.875rem', lineHeight: 1.55 }}>{it}</li>
      ))}
    </ol>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.5rem', color: 'var(--color-text-primary)' }}>{children}</p>;
}

/* --------------------- Generierte Listen (Drift-Wächter) -------------------- */

const REPO_URL = 'https://github.com/milanradisavljevic/LUKA';

/** Fächer aus FACH_META — neue Pflichtfächer erscheinen automatisch. */
export function Fachliste() {
  const sprach = Object.values(FACH_META).filter((m) => m.sprachfach).map((m) => m.label);
  const sach = Object.values(FACH_META).filter((m) => !m.sprachfach).map((m) => m.label);
  return (
    <Steps items={[
      <><strong>Sprachfächer:</strong> {sprach.join(', ')}. Der Generator erzeugt Inhalte in der Zielsprache. Französisch, Spanisch und Italienisch haben eigene kuratierte Textsortenfamilien und Grundraster; Latein verwendet text- und übersetzungsbezogene Aufgaben ohne CEFR-Übertragung.</>,
      <><strong>Sachfächer:</strong> {sach.join(', ')}. Inhalte werden deutschsprachig erzeugt; Textsorten und Bewertungskataloge orientieren sich vorerst am Deutsch-Modell.</>,
    ]} />
  );
}

/** Aufgabentypen aus BLOCK_TYPE_DEFS, gruppiert — neue Typen erscheinen automatisch. */
export function AufgabentypenListe() {
  return (
    <>
      {BLOCK_TYP_GRUPPEN.map((gruppe) => {
        const typen = BLOCK_TYPE_DEFS.filter((d) => d.gruppe === gruppe.id);
        if (typen.length === 0) return null;
        return (
          <div key={gruppe.id} style={{ marginTop: '0.75rem' }}>
            <p style={{ fontSize: '0.875rem', margin: '0 0 0.25rem', fontWeight: 600 }}>
              {gruppe.label}
              <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}> — {gruppe.hinweis}</span>
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {typen.map((t) => (
                <li key={t.id} style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                  <strong>{t.label}</strong>
                  <span style={{ color: 'var(--color-text-secondary)' }}> — {t.description} · {t.minuten[0]}–{t.minuten[1]} Min.</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

/** Tastenkürzel aus SHORTCUTS, nach Geltungsbereich gruppiert. */
export function TastenkuerzelTabelle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {SHORTCUT_SCOPES.map((scope) => {
        const zeilen = SHORTCUTS.filter((s) => s.scope === scope.id);
        if (zeilen.length === 0) return null;
        return (
          <div key={scope.id}>
            <p style={{ fontSize: '0.8125rem', margin: '0 0 0.375rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--color-text-secondary)' }}>
              <scope.Icon size={14} aria-hidden="true" /> {scope.label}
            </p>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden', background: 'var(--color-bg-surface)' }}>
              {zeilen.map((s, i) => (
                <div key={`${s.scope}-${s.keys}-${i}`} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 1rem', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
                  <kbd style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'var(--color-bg-base)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.1875rem 0.5rem', whiteSpace: 'nowrap', minWidth: 150, textAlign: 'center' }}>{formatShortcut(s.keys)}</kbd>
                  <span style={{ fontSize: '0.875rem' }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Modell --------------------------------- */

export type KapitelId =
  | 'start'
  | 'unterricht'
  | 'bewerten'
  | 'bibliothek'
  | 'bedienen'
  | 'datenschutz';

export interface Kapitel {
  id: KapitelId;
  label: string;
  Icon: LucideIcon;
  /** Ein Satz, was in diesem Kapitel passiert. */
  kurz: string;
}

export const KAPITEL: Kapitel[] = [
  { id: 'start', label: 'Erste Schritte', Icon: RocketIcon, kurz: 'Einrichtung und der Weg durch die App.' },
  { id: 'unterricht', label: 'Unterricht vorbereiten', Icon: FilePlus2, kurz: 'Planen, Unterlagen bauen, im Unterricht einsetzen.' },
  { id: 'bewerten', label: 'Bewerten & auswerten', Icon: SpellCheck, kurz: 'Abgaben korrigieren und Folgearbeit ableiten.' },
  { id: 'bibliothek', label: 'Bibliothek & Austausch', Icon: Database, kurz: 'Was du schon hast: Pool, Unterlagen, Export.' },
  { id: 'bedienen', label: 'App bedienen', Icon: Keyboard, kurz: 'Übersicht, Suche, Tastenkürzel, Einstellungen.' },
  { id: 'datenschutz', label: 'Datenschutz & Hilfe', Icon: ShieldCheck, kurz: 'Was die App tut — und was nicht.' },
];

export interface HelpSection {
  id: string;
  kapitel: KapitelId;
  title: string;
  Icon: LucideIcon;
  /** Nur mit dem Korrektur-Modul verfügbar. */
  natascha?: boolean;
  body: ReactNode;
}

/* ---------------------------------- Inhalt --------------------------------- */

export const HELP_SECTIONS: HelpSection[] = [
  /* ------------------------------- Kapitel: Start ------------------------------ */
  {
    id: 'start',
    kapitel: 'start',
    title: 'So funktioniert LUKA',
    Icon: Workflow,
    body: (
      <>
        <P>
          LUKA ist ein lokales Lehrtool. Es verbindet <strong>Unterricht planen</strong>,
          <strong>Unterlagen erstellen</strong>, <strong>Abgaben korrigieren</strong> und
          <strong>gezieltes Üben</strong> zu einem durchgängigen Kreislauf. Alles läuft auf
          deinem Rechner — kein Konto, kein Server, keine Cloud-Datenbank.
        </P>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
          margin: '0.75rem 0', fontSize: '0.8125rem',
        }}>
          {(FEATURES.natascha
            ? ['Stunde planen', '→', 'Unterlage bauen', '→', 'Abgabe korrigieren', '→', 'Fehler-Heatmap', '→', 'Folgeübung', '↺']
            : ['Absicht festlegen', '→', 'Aufgaben erstellen', '→', 'Qualität prüfen', '→', 'DOCX/PDF exportieren']
          ).map((t, i) => (
            <span key={i} style={{
              padding: t.length > 2 ? '0.3rem 0.6rem' : '0.3rem 0.2rem',
              background: t.length > 2 ? 'var(--color-bg-base)' : 'none',
              borderRadius: 'var(--radius)', fontWeight: t.length > 2 ? 600 : 700,
              color: t.length > 2 ? 'var(--color-text-primary)' : 'var(--color-accent)',
            }}>{t}</span>
          ))}
        </div>
        <P><strong>Der kürzeste Weg (etwa 5 Minuten):</strong></P>
        <Steps items={[
          <>API-Schlüssel eintragen — <strong>Einstellungen</strong>, ganz oben. Mehr dazu in <strong>Erste Schritte</strong>.</>,
          <>Auf der <strong>Übersicht</strong> dein Bundesland und deine Fächer im <strong>Profil</strong> hinterlegen. Davon hängen Schulferien, Sprache und Notenskalen ab.</>,
          <>Eine <strong>Schnell-Übung</strong> anlegen: Thema + Aufgabentyp, ohne Quelltext. Das geht am schnellsten.</>,
          <>In der <strong>Vorschau</strong> beide Dokumente exportieren und einmal öffnen — so siehst du sofort, ob das Ergebnis trägt.</>,
        ]} />
        <P>
          <strong>Die Seitenleiste</strong> ist in vier Bereiche getrennt: <strong>Start</strong>,
          <strong>Unterricht</strong> (Assistent, Unterrichtsplanung, Kompetenz- und Schnell-Übung),
          <strong>Korrekturen</strong> (Klassen, Abgaben, Schüler, Bewertungsraster) und
          <strong>Bibliothek</strong> (Unterlagen, Pool, Vorlagen, Verlauf, Papierkorb).
          Unten findest du <strong>Einstellungen</strong>, <strong>Fehler melden</strong> und <strong>Hilfe</strong>.
        </P>
        <Tip>
          Überall gleich: <kbd>{formatShortcut('Mod + K')}</kbd> öffnet die Suche. Sie findet
          Unterlagen, Vorlagen, Pool-Aufgaben, Klassen und jeden Bereich — und führt Befehle aus.
        </Tip>
      </>
    ),
  },
  {
    id: 'erste-schritte',
    kapitel: 'start',
    title: 'API-Schlüssel einrichten',
    Icon: Rocket,
    body: (
      <>
        <P>Damit die KI-Generierung und die Korrektur laufen, brauchst du einen API-Schlüssel deines KI-Anbieters.</P>
        <Steps items={[
          <>Öffne <strong>Einstellungen</strong> und trage deinen API-Schlüssel ein (z. B. Anthropic, OpenAI, Mistral, DeepSeek). Schlüssel werden im Schlüsselspeicher des Betriebssystems abgelegt — nicht im Klartext.</>,
          <>Wähle Standard-Anbieter und -Modell (standardmäßig <strong>Mistral Medium 3.5</strong>). Für günstige Tests eignet sich ein kleines Modell.</>,
          <>Starte über <strong>Neue Unterlage</strong> (oben in der Seitenleiste), <strong>Kompetenz-Übung</strong> oder <strong>Schnell-Übung</strong> und exportiere eine erste Schüler- und Lösungsfassung.</>,
        ]} />
        <P><strong>Kein-Key-Hinweis:</strong> Wählst du in Schritt „KI-Modell" einen Anbieter, für den noch kein Schlüssel hinterlegt ist, zeigt die App dort einen Hinweis mit Direkt-Link zu den Einstellungen — so scheiterst du nicht erst beim Generieren.</P>
        <P><strong>Rechnen mit der KI:</strong> Jede Generierung kostet einen API-Aufruf bei deinem Anbieter. Der <strong>Qualitätspass</strong> und die schwerere Differenzierungsvariante sind zusätzliche Aufrufe. Für closed-loop-Übungen empfiehlt sich deshalb ein günstiges Modell.</P>
        <Tip>Ohne hinterlegten Schlüssel schlagen Generierung und Analyse fehl. Die Fehlermeldung nennt dann meist „Key/Provider prüfen".</Tip>
      </>
    ),
  },
  {
    id: 'installieren',
    kapitel: 'start',
    title: 'Installation & Updates',
    Icon: Download,
    body: (
      <>
        <P>
          LUKA läuft als Programm auf deinem Rechner — nicht im Browser. Es gibt keine
          Anmeldung und keine Datenübertragung an einen LUKA-Server.
        </P>
        <Steps items={[
          <><strong>Windows:</strong> Die Datei <code>*_x64-setup.exe</code> aus den Releases herunterladen und ausführen. Windows warnt per <strong>SmartScreen</strong>, weil das Programm noch nicht mit einem Firmen-Zertifikat signiert ist — über „Weitere Informationen" und „Trotzdem ausführen" geht es weiter. Das ist bei quelloffener Software ohne Zertifikat normal.</>,
          <><strong>macOS:</strong> Die <code>.dmg</code> öffnen und LUKA in „Programme" ziehen. Beim ersten Start meldet Gatekeeper, die App sei nicht überprüfbar: einmal die Warnung wegklicken, dann in <strong>Systemeinstellungen → Datenschutz &amp; Sicherheit</strong> auf „Dennoch öffnen" und noch einmal öffnen.</>,
        ]} />
        <P>
          <strong>Updates:</strong> LUKA prüft von selbst, ob eine neue Version vorliegt, und
          fragt nach, bevor es etwas anzeigt. Du kannst jederzeit auch von Hand nachsehen lassen:
          der Kreispfeil unten in der Seitenleiste neben der Versionsnummer. Welche Version aktiv
          ist, steht in den <strong>Einstellungen</strong> unter „Installation &amp; Updates" — dort
          siehst du auch den Pfad zur Programmdatei, wenn du ihn für eine Fehlermeldung brauchst.
        </P>
        <Tip>Läuft LUKA aus einem temporären oder Testordner, weist die App darauf hin. Nutze dann den regulären Installer.</Tip>
      </>
    ),
  },
  {
    id: 'profil',
    kapitel: 'start',
    title: 'Mein Profil',
    Icon: UserCog,
    body: (
      <>
        <P>
          Das Profil bleibt lokal auf deinem Gerät und steuert, was LUKA dir vorschlägt.
          Beim ersten Start fragt LUKA danach; später änderst du es jederzeit unter
          <strong> Einstellungen → Mein Profil</strong>. Bestehende Unterlagen und deine manuellen
          Eingaben bleiben davon unberührt — das Profil wirkt nur auf Neues.
        </P>
        <Steps items={[
          <><strong>Land</strong> entscheidet mehr als die Sprache: Notenskala (Österreich 1–5, Deutschland 1–6), die Bezeichnung „Matura" oder „Abitur", und ob LUKA deutsche Schulferien kennt.</>,
          <><strong>Bundesland bzw. Kanton</strong> ist für die Schulferien entscheidend. Deutschland hat sie je Bundesland verschieden, deshalb lohnt sich die Angabe dort besonders. Für die Schweiz führt LUKA bewusst keine Termine — dort sind die Ferien kantonal.</>,
          <><strong>Meine Fächer</strong> und <strong>Meine Schulstufen</strong> heben im Aufgaben-Pool hervor, was zu dir passt.</>,
          <><strong>Bevorzugte Aufgabenformate</strong> und <strong>Exportvorgaben</strong> gelten als Voreinstellung für neue Unterlagen.</>,
        ]} />
        <P>
          <strong>Standard-Anbieter, -Modell und Kreativitätsgrad</strong> aus dem Profil gelten
          für neue Unterlagen. Im laufenden Assistenten wählst du weiterhin selbst — dort gilt
          die Wahl nur für dieses Dokument.
        </P>
        <Tip>Gerade das Bundesland lohnt sich: Ohne Bundesland kann LUKA die Schulferien deines Schulorts nicht zuordnen und sagt dir das in der Planung auch so.</Tip>
      </>
    ),
  },

  /* --------------------------- Kapitel: Unterricht ---------------------------- */
  {
    id: 'erstellen',
    kapitel: 'unterricht',
    title: 'Unterlagen erstellen',
    Icon: FilePlus2,
    body: (
      <>
        <P>Der Assistent führt dich in fünf Schritten von der Absicht zum fertigen DOCX.</P>
        <Steps items={[
          <><strong>Absicht</strong> — Schulstufe, Fach, Thema und Art der Unterlage festlegen (Schulübung, <strong>Matura (SRDP)</strong> oder Kompetenz-Übung). Notizen fließen als Wünsche in die Generierung ein.</>,
          <><strong>Quelltexte</strong> — Textgrundlage per Direkteingabe, Datei (TXT/DOCX/PDF/HTML) oder URL hinzufügen.</>,
          <><strong>Aufgabenblöcke</strong> — gewünschte Aufgabentypen zusammenstellen, Punkte und Arbeitsanweisungen festlegen. Beispieldaten sind grau und werden beim Generieren ersetzt.</>,
          <><strong>KI-Modell</strong> — Anbieter, Modell und Kreativitätsgrad (präzise bis kreativ) wählen.</>,
          <><strong>Generieren</strong> — Inhalte erzeugen und Schülerfassung, Lösung und optional das Korrekturraster als DOCX exportieren. Jeder Export landet im Verlauf.</>,
        ]} />
        <P><strong>Bewertung (Punkte an/aus):</strong> In Schritt „Absicht" legst du fest, ob die Unterlage Punkte trägt. Schulübungen sind standardmäßig <em>ohne</em> Punkte; mit dem Schalter „Punkte vergeben / Ohne Punkte" überschreibst du das pro Dokument. „Ohne Punkte" blendet Punktespalte und Gesamtpunkte überall aus — in Vorschau <em>und</em> Export gleich.</P>
        <P><strong>Einzelne Aufgabe neu generieren:</strong> In der Vorschau bei einem Block auf „Neu generieren" — mit optionalem Hinweis (kürzer, schwieriger, andere Formulierung). Nur dieser Block wird ersetzt.</P>
        <P><strong>Qualität schärfen:</strong> Nach der Generierung kannst du den Qualitätspass bewusst einmal starten. Dein gewählter KI-Anbieter prüft das eigene Dokument als strenger Fachkollege gegen Kriterien wie konkrete Schreibsituation, Textbezug, beobachtbaren Erwartungshorizont sowie plausibles Niveau und liefert eine verbesserte Fassung mit zwei bis drei Änderungsnotizen. Dafür wird ein weiterer API-Aufruf deines Anbieters verwendet; Blockstruktur, IDs und Textbeilagen-Verweise bleiben unverändert.</P>
        <P><strong>Export-Varianten:</strong> „Beide Dokumente" (Schülerfassung + Lösung), „Korrekturraster", im Kompetenz-Modus zusätzlich „Kompetenznachweis", sowie „Als PDF". Für PDF exportierst du zuerst die Schülerfassung als DOCX und wählst danach den Speicherort im nativen Datei-Dialog; dafür muss LibreOffice installiert sein. Vor dem Export prüft ein <strong>Quality-Gate</strong> Lernziel-Abdeckung und Wortzahl der Schreibaufgaben — bei Auffälligkeiten kannst du „Nochmal prüfen" oder „Trotzdem exportieren".</P>
        <P><strong>Differenzierung (leichter / schwerer):</strong> Im Akkordeon „Differenzierung" (nach dem Generieren) erzeugst du zusätzlich zur Standardfassung (mittel = „Beide Dokumente") gezielt eine <em>leichtere</em> und/oder <em>schwerere</em> Variante: Häkchen setzen, dann „Variante(n) erstellen &amp; exportieren". <em>Leicht</em> vereinfacht unterstützte Aufgaben ohne KI-Kosten. Bei <em>schwer</em> werden offene Aufgaben mit dem gewählten Modell anspruchsvoller neu erzeugt; geschlossene Lückentexte verlieren eine vorhandene Wortbank. Weitere Lücken werden nur mit vollständig vorhandenem Lösungsschlüssel ergänzt; bei Cloze-Texten müssen auch die nummerierten Textmarker passen. Nicht sicher transformierbare Teile bleiben unverändert. Dateinamen tragen <code>_leicht</code>/<code>_schwer</code>.</P>
        <P><strong>Manuell oder Hybrid festlegen:</strong> Bei Kreuzworträtsel, Wortgitter, Vokabelübung, Fehlerkorrektur und „Wörter ordnen" kannst du im Block-Editor auf „Selbst festlegen" umschalten. Gib eigene Wörter, Sätze oder Vokabeln ein — die KI übernimmt sie wortgleich und ergänzt nur noch fehlende Einträge, bis die gewünschte Anzahl erreicht ist. So bleibst du Herrin/Herr der Inhalte, sparst aber trotzdem Zeit.</P>
        <P><strong>Schnell ohne Quelltext:</strong> Für kleine Übungen mit eigenen Inhalten brauchst du keine Textgrundlage. Wähle in der Übersicht oder in Schritt „Absicht" einen der Schnellstarts (z. B. „Kreuzworträtsel", „Vokabeltest", „Fehlerkorrektur", „Lückentext"). Der Assistent springt direkt in den Baukasten; Quelltexte kannst du überspringen.</P>
        <P><strong>Selbsteinschätzungsbogen:</strong> Nach dem Generieren kannst du einen zusätzlichen Bogen exportieren, mit dem Schülerinnen und Schüler einschätzen, wie sicher sie sich bei den einzelnen Aufgaben fühlen. Er eignet sich besonders für differenzierte Rückmeldung und Selbstregulation.</P>
        <P><strong>Digitale Selbstkontrolle:</strong> Für geschlossene Aufgaben gibt es in Schritt „Generieren" eine Selbstkontrolle. Schülerinnen und Schüler beantworten die Aufgaben direkt in LUKA; LUKA vergleicht lokal mit dem gespeicherten Schlüssel — ohne KI-Aufruf und ohne Upload. Offene oder materialgebundene Aufgaben werden nicht automatisch bewertet.</P>
        <P><strong>Rückgängig:</strong> Solange du in der Unterlage bist, nimmst du mit <kbd>{formatShortcut('Mod + Z')}</kbd> eine Änderung zurück und mit <kbd>{formatShortcut('Mod + Y')}</kbd> wieder her. In Textfeldern zählt wie üblich die Tastenkombination des Betriebssystems.</P>
        <Tip>Einen ganzen Blocktyp wieder entfernen: im Baukasten oben rechts am Block auf das <strong>X</strong> klicken. Mehr Zuordnungs-Paare/MC-Antworten: im Block-Editor auf „+ Item" / „+ Option" / „+ Frage".</Tip>
      </>
    ),
  },
  {
    id: 'planung',
    kapitel: 'unterricht',
    title: 'Unterrichtsplanung',
    Icon: CalendarRange,
    body: (
      <>
        <P>
          Im Bereich <strong>Unterricht</strong> findest du den Stundenplan. Er besteht aus
          zwei Teilen: deinem festen <strong>Wochenraster</strong> und den daraus erzeugten
          <strong>einzelnen Stunden</strong>. Das Raster pflegst du einmal pro Schuljahr, die
          Stunden erzeugst du daraus, wann du sie brauchst.
        </P>
        <P><strong>1. Wochenraster eintragen</strong></P>
        <Steps items={[
          <>Unten im Abschnitt „Mein Wochenraster" trägst du Tag, Klasse, Uhrzeit und Fach ein. <strong>Ohne Klasse</strong> bedeutet Freistunde oder Aufsicht: Die Zeile bleibt im Raster stehen, erzeugt aber keine Stunde.</>,
          <>Oben rechts wählst du das <strong>Schuljahr</strong>. So bleibt das Raster 2026/27 getrennt von 2027/28.</>,
          <><strong>Aus dem Vorjahr übernehmen</strong> überträgt beim Schuljahreswechsel die Zeiten. Die Klassen prüfst du danach selbst — übernommen werden nur die Zeiten.</>,
          <><strong>Bearbeiten</strong> blendet ein, wo du einzelne Zeilen deaktivierst (statt löschst) oder ganz entfernst. Deaktivierte Zeilen bleiben erhalten, zählen aber nicht mehr mit.</>,
        ]} />
        <P><strong>2. Einplanen</strong></P>
        <Steps items={[
          <><strong>Woche einplanen</strong>, <strong>Monat einplanen</strong> oder <strong>Schuljahr einplanen</strong>. Bereits geplante Stunden werden nicht doppelt angelegt; vor dem ganzen Schuljahr fragt LUKA nach.</>,
          <><strong>Ferien auslassen</strong> (Häkchen neben dem Knopf) ist standardmäßig an: An schulfreien Tagen entstehen dann keine Stunden. Ohne Häkchen werden sie mit eingeplant — praktisch, wenn du z. B. eine Praxisphase im Betrieb planst.</>,
          <>Ein Klick auf die <strong>Tageszahl im Monatsraster</strong> springt in die Woche dieses Tages und wählt die erste Stunde dort aus.</>,
        ]} />
        <P>
          <strong>Woche oder Monat:</strong> Der Umschalter oben wechselt zwischen Wochen- und
          Monatsansicht; Randtage des Monats bleiben grau. „Diese Woche" bzw. „Dieser Monat"
          springt zurück zum Heute. Die <strong>Wochenkarte</strong> zeigt nur dein festes Raster —
          eine Zeile je Klasse in der Farbe der Klasse. Uhrzeiten, Titel und Unterlagen stehen
          in der Liste darunter.
        </P>
        <P><strong>3. Eine einzelne Stunde anlegen (Vertretung)</strong></P>
        <Steps items={[
          <>Neben „Woche einplanen" findest du <strong>Stunde hinzufügen</strong>. Trage Datum, Klasse, Uhrzeit und bei Bedarf ein Thema ein.</>,
          <>Damit bekommst du eine Stunde für <em>einen</em> Tag, auch wenn es dafür keine Zeile im Wochenraster gibt — Vertretung, Einzelsehre, Projektstunde.</>,
          <>Sie kommt nicht aus dem Raster und wird deshalb beim nächsten Einplanen nicht ein zweites Mal erzeugt.</>,
        ]} />
        <P><strong>4. Eine Stunde anpassen</strong></P>
        <Steps items={[
          <>Wähle eine Stunde: Thema, Uhrzeit, Notiz eintragen und den <strong>Status</strong> setzen (Geplant / Vorbereitet / Gehalten).</>,
          <><strong>Auf einen anderen Tag legen</strong> — für Vertretungsstunden.</>,
          <><strong>Entfallen</strong> markieren: Die Stunde bleibt im Kalender stehen, gilt aber nicht mehr als Unterricht. Mit „Findet doch statt" machst du das rückgängig.</>,
        ]} />
        <P><strong>5. Unterlagen an die Stunde hängen</strong></P>
        <Steps items={[
          <><strong>Unterlage vorbereiten:</strong> LUKA übernimmt aus dem Kalendereintrag das Gerüst — Klasse, Fach, Thema und Datum — und öffnet den Assistenten. <strong>Quelltext und Aufgaben arbeitest du selbst aus.</strong> LUKA erfindet keinen Quelltext nur deshalb, weil im Kalender keine Datei danebenliegt. Beim Speichern hängt es die fertige Unterlage automatisch an den Termin; mit „Verknüpfung abbrechen" nimmst du den Termin wieder heraus.</>,
          <><strong>Datei ablegen</strong> kopiert eine Datei in den Ablage-Ordner von LUKA. Dein Original bleibt, wo es ist — du kannst es also gefahrlos verschieben. Fehlt eine abgelegte Datei, weist LUKA dich darauf hin.</>,
          <><strong>Verweis</strong> merkt sich einen Pfad oder eine Adresse für Material, das woanders liegt.</>,
        ]} />
        <P>
          <strong>Voraussetzung für „Unterlage vorbereiten":</strong> Damit das Gerüst vollständig
          ist, braucht die Klasse in der Klassenverwaltung ein <strong>Fach</strong>. Steht dort
          etwas, das LUKA nicht kennt (z. B. „Deutsch 6b"), trägst du es im Assistenten nach —
          LUKA rät kein Fach.
        </P>
        <P>
          <strong>Wo du die Unterlage wiederfindest:</strong> im Detailbereich der Stunde unter
          <strong> „Unterlagen"</strong>, mit Klammer-Symbol. Dort liegen auch abgelegte Dateien und
          Verweise — der ganze Materialbedarf der Stunde an einem Ort. Fehlt einer Stunde eine
          Unterlage, weist die Startseite und der Wochenstreifen darauf hin.
        </P>
        <P><strong>6. Ferien und Pausen</strong></P>
        <Steps items={[
          <><strong>Gesetzliche Feiertage</strong> rechnet LUKA selbst — für Österreich, Deutschland und die Schweiz.</>,
          <><strong>Schulferien</strong> sind amtlich hinterlegt: für Österreich 2025/26 und 2026/27 (alle neun Bundesländer), für Deutschland 2026/27 (alle 16 Bundesländer). Gibt es für dein Bundesland und Schuljahr noch keine, bietet LUKA den Vorschlag an und nennt <strong>Quelle und Abrufdatum</strong> — damit du ihn mit der geltenden Verordnung abgleichen kannst. Regelbetreuungstage und verschobene Feiertage stehen bewusst nicht darin.</>,
          <><strong>Deutschland:</strong> Damit LUKA weiß, welche Ferien gelten, muss im Lehrerprofil ein Bundesland gewählt sein. <strong>Für die Schweiz</strong> führt LUKA bewusst keine Termine: dort sind die Ferien kantonal, das wäre eine Datenpflege je Kanton. Trage sie bei Bedarf selbst ein.</>,
          <><strong>Einzelne Blöcke</strong> trägst du mit Bezeichnung, Von und Bis selbst ein. <strong>Schulinterne Pausen</strong> (Fortbildung, MuT, Elternabend) legst du als einzelne Tage an — für die ganze Schule oder nur für eine Klasse.</>,
        ]} />
        <Tip>
          <strong>Was in der Tabelle nicht stehen kann.</strong> „Amtlich" heißt nicht
          „für jeden Fall vollständig": Regelbetreuungstage und verschobene Feiertage gehören zu
          keiner Schulferien-Verordnung, die <strong>beweglichen Ferientage</strong> in Hessen
          unterscheiden sich je Staatlichem Schulamt, und auf Inseln oder in beruflichen Schulen
          gelten teils andere Termine als im Rest des Bundeslandes. Solche Fälle trägst du als
          <strong>einzelne Blöcke</strong> nach. LUKA füllt sie nicht auf — eine erfundene
          Ferienwoche, die du ungeprüft in deinen Stundenplan übernimmst, ist schlimmer als eine
          Lücke. Für die <strong>Schweiz</strong> gibt es gar keine Tabelle, dort sind die Ferien
          kantonal.
        </Tip>
        <P><strong>7. Klassenfarben</strong></P>
        <P>
          Jede Klasse bekommt einen von acht gedämpften Farbtönen. Festlegen tust du das in der
          Klassenverwaltung beim Bearbeiten einer Klasse; Klassen ohne eigene Farbe bekommen
          automatisch eine, und zwar so, dass sich keine zwei teilen. Die Farbe erscheint im
          Wochenstreifen, im Monatsraster, in der Rasterliste, in der Anstehend-Liste und als
          Randfarbe der Klassenkarte. In der <strong>Korrektur</strong> wird sie bewusst nicht
          verwendet — dort stehen die Farben für Richtig/Falsch/Zeichen/Ausdruck.
        </P>
        <Tip>
          LUKA unterscheidet zwei Lücken sauber: Sind die Termine <em>bekannt, aber nicht
          eingetragen</em>, ist es eine deutliche Warnung mit Übernehmen-Knopf. Gibt es für das
          Schuljahr <em>noch keine Verordnung</em> oder fehlt das Bundesland im Profil, ist es
          nur ein neutraler Hinweis — LUKA erfindet keine Termine.
        </Tip>
      </>
    ),
  },
  {
    id: 'aufgabentypen',
    kapitel: 'unterricht',
    title: 'Aufgabentypen',
    Icon: Shapes,
    body: (
      <>
        <P>
          Diese Blocktypen kannst du im Baukasten kombinieren; je nach Fach und Stufe sind
          sinnvolle vorausgewählt. Die Zeitenangabe ist eine grobe Orientierung für den
          erwarteten Bearbeitungsumfang.
        </P>
        <AufgabentypenListe />
        <P>
          <strong>Schwierigkeit</strong> (leicht/mittel/schwer) steuert das kognitive Niveau
          <em>innerhalb</em> des Typs (Bloom; bei Englisch zusätzlich CEFR A2/B1/B2) — der Typ
          selbst bleibt erhalten.
        </P>
        <P>
          <strong>Unterschiedliche Sprechsituationen:</strong> Beim Rollenspiel bekommen alle
          Paare dieselbe Situation. Das <strong>Rollenkarten-Set</strong> ist die differenzierte
          Variante: jedes Paar bekommt ein eigenes Szenario als Karten-Set (Rollenhinweis,
          Inhalts-Stichpunkte, Sprachhinweis), sodass mehrere Paare gleichzeitig unterschiedliche
          Situationen spielen können.
        </P>
        <Tip>Ein Matching-Block = eine Aufgabe mit <em>mehreren</em> Paaren. Für mehr Paare „+ Item"/„+ Option" nutzen, nicht mehrere Matching-Blöcke anlegen.</Tip>
      </>
    ),
  },
  {
    id: 'faecher',
    kapitel: 'unterricht',
    title: 'Fächer',
    Icon: BookOpen,
    body: (
      <>
        <P>LUKA unterstützt derzeit folgende textbasierte Fächer:</P>
        <Fachliste />
        <P>Du wählst das Fach in Schritt „Absicht" oder im Kompetenz-Modus. Die App passt daraufhin Sprache, verfügbare Blocktypen und didaktische Hinweise automatisch an.</P>
        <P>Bei einer Sachfach-Korrektur werden Operator-Erfüllung, Inhaltsgenauigkeit, Fachbegriffe und Erwartungshorizont getrennt von Sprachrichtigkeit betrachtet. Sprachfehler bleiben ein ergänzender Befund.</P>
        <P>
          <strong>Neue Pflichtfächer ab 2026/27:</strong> <em>Medien und Demokratie</em> und
          <em>Informatik und Künstliche Intelligenz</em> sind als eigene AHS-Pflichtfächer
          dazugekommen. Für sie liegen Stoffkataloge und eigene Startpakete vor. Die
          Lehrplan-Verordnung stand bei der Anlage noch aus — die Inhalte sind deshalb als
          Entwurf gekennzeichnet, keine amtlichen Lehrpläne.
        </P>
        <P><strong>Bewusste Grenze:</strong> Mathematik und performative Fächer (z. B. Musik- oder Sportpraxis) sind nicht als vollwertige Textkorrektur-Fächer freigegeben. LUKA kann dafür Unterlagen erstellen, behauptet aber keine automatische fachliche Korrektur.</P>
        <Tip>Für Geschichte und andere Sachfächer gibt es die Aufgabentypen „Quellenanalyse", „Timeline / Datierung" sowie „Diagramm-/Datenanalyse". Belege und Datierungen werden nur aus dem Material übernommen, nicht erfunden.</Tip>
      </>
    ),
  },
  {
    id: 'deutschland',
    kapitel: 'unterricht',
    title: 'LUKA für Deutschland',
    Icon: GraduationCap,
    body: (
      <>
        <P>Wenn du im <strong>Lehrerprofil</strong> das Land <strong>Deutschland</strong> auswählst, schreibt die KI bundesdeutsch und ordnet Beispiele dem deutschen Schulalltag zu. Dazu gehören Begriffe wie <strong>Abitur</strong>, <strong>Klassenarbeit</strong>, <strong>Klausur</strong> und <strong>Januar</strong> statt österreichischer Varianten.</P>
        <Steps items={[
          <><strong>Klassenstufen:</strong> Deutschland verwendet die Klassen 5 bis 13. Bis einschließlich Klasse 10 ist die Stufe die <strong>Sekundarstufe I</strong>, ab Klasse 11 die <strong>Sekundarstufe II</strong>.</>,
          <><strong>Profil:</strong> Im Profil kannst du deutsche Bundesländer und Schulformen auswählen. Diese Angaben helfen der KI, Szenarien und Beispiele passend zu deinem Schulort und deiner Schulart zu formulieren — und LUKA, die richtigen <strong>Schulferien</strong> zuzuordnen.</>,
          <><strong>Kompetenz-Modus:</strong> Bei Land Deutschland ist der deutsche Lehrplan-Katalog der <strong>Kultusministerkonferenz (KMK)</strong> für alle Fächer vorausgewählt. Er ist als <strong>kuratierter Entwurf</strong> gekennzeichnet: Die Inhalte sind sorgfältig zusammengestellt, aber kein amtliches Dokument.</>,
          <><strong>Abitur-Training (KMK-Format):</strong> Bei Land Deutschland wird aus dem Matura-Training das Abitur-Training — eine textbezogene Einzelaufgabe nach den sechs KMK-Aufgabenarten (Interpretation, Analyse, Erörterung, materialgestütztes Schreiben) mit zwei bis drei nach den <strong>Anforderungsbereichen AFB I–III</strong> gestaffelten Arbeitsaufträgen und passendem Erwartungshorizont. Wie das Matura-Training ein Übungsformat, <strong>kein amtliches Prüfungsmaterial</strong>.</>,
          <><strong>Deutsch-Korrektur im deutschen Schulsystem:</strong> Bei Land Deutschland korrigiert LUKA das Fach <strong>Deutsch</strong> als <strong>Klassenarbeit</strong> mit deutscher <strong>Notenskala 1–6</strong>. Österreichische Sprachbesonderheiten werden dabei nicht als Fehler gezählt. Für die Schweiz folgt die passende Skala in einer kommenden Version.</>,
          <><strong>Startpaket Deutschland:</strong> Im <strong>Aufgaben-Pool</strong> bietet LUKA dir das Startpaket an, sobald Deutschland in deinem Profil steht. Es liegt zusätzlich als JSON-Datei unter <code>samples/fachpakete/</code> und lässt sich über <strong>Aufgaben-Pool → Importieren</strong> jederzeit nachladen.</>,
        ]} />
        <Tip>Die Auswahl des Landes bleibt eine Profileinstellung. Prüfe bei offiziellen Prüfungen und landesspezifischen Vorgaben weiterhin die aktuellen Hinweise deines Bundeslands.</Tip>
      </>
    ),
  },
  {
    id: 'kompetenz',
    kapitel: 'unterricht',
    title: 'Übung ohne Quelltext',
    Icon: Target,
    body: (
      <>
        <P>
          Die zweite Tür auf der Startseite — <strong>„Ohne Quelltext"</strong> — erzeugt Übungen
          <em>ohne</em> eigene Textgrundlage. Statt eines Quelltexts gibst du vor, <strong>woran</strong>
          geübt werden soll:
        </P>
        <Steps items={[
          <><strong>Freies Thema / Kompetenz</strong> — z. B. „Present Perfect vs. Past Simple" oder „Kommasetzung bei Relativsätzen" frei eintippen.</>,
          <><strong>Oder Lehrplan-Kompetenz</strong> aus dem Katalog wählen — dann entsteht zusätzlich ein <strong>Kompetenznachweis</strong> beim Export. Kompetenzkataloge gibt es für alle unterstützten Fächer.</>,
          <>Aufgabentypen wählen, optional Punkte an/aus, generieren — wie beim Quelltext-Pfad, nur dass die KI die Inhalte stufengerecht selbst erfindet.</>,
        ]} />
        <P>
          <strong>Stufengerechte Anweisungen:</strong> Bei Englisch und anderen Fremdsprachen
          sind die Arbeitsaufträge bewusst eine Stufe einfacher als die Aufgaben — kurze,
          alltagssprachliche Anweisungen statt langer Erklärttexte. Im Deutschen bleiben die
          Arbeitsanweisungen deutsch, auch wenn der Quelltext lateinisch ist.
        </P>
        <Tip>Faustregel: <strong>Aus Quelltext</strong> = Schularbeit/Test zu einem konkreten Text. <strong>Ohne Quelltext</strong> = schnelle Grammatik-/Kompetenz-Übung.</Tip>
      </>
    ),
  },
  {
    id: 'matura',
    kapitel: 'unterricht',
    title: 'Matura-Training (SRDP)',
    Icon: GraduationCap,
    body: (
      <>
        <P>Das <strong>Matura-Training (SRDP-Format)</strong> ist ein eigener Unterlagentyp für <strong>Deutsch in der Oberstufe</strong>. Die Kachel erscheint nur, wenn Deutsch und eine Oberstufen-Schulstufe gewählt sind.</P>
        <Steps items={[
          <>Im Schritt <strong>Absicht</strong> „Matura-Training (SRDP-Format)" auswählen und eine Textsorte aus der kuratierten SRDP-Auswahl wählen.</>,
          <>Die App erzeugt eine <strong>textgebundene Einzelaufgabe</strong> mit genau einer Textbeilage und einem Schreibumfang von <strong>405–495 Wörtern</strong>.</>,
          <>Beim Export erhältst du die Schülerfassung, die Lösung und das bestehende K1/K3-Korrekturraster. Der Erwartungshorizont strukturiert die vier SRDP-Dimensionen und die zugehörigen Kriterien.</>,
        ]} />
        <P>
          <strong>Textsorten:</strong> Für die Korrektur stehen die offiziellen SRDP-Textsorten
          sowie Empfehlungen zur Auswahl; die Oberstufe bietet alle sieben, die Unterstufe
          altersgerechte Textsorten. Das passende Bewertungsraster schlägt LUKA selbst vor.
        </P>
        <Tip>Das Matura-Training ist ein Übungsformat für den Unterricht und <strong>kein amtliches Prüfungsmaterial</strong>.</Tip>
      </>
    ),
  },
  {
    id: 'tafel',
    kapitel: 'unterricht',
    title: 'Tafel-Modus',
    Icon: Presentation,
    body: (
      <>
        <P>
          Der <strong>Tafel-Modus</strong> zeigt die aktuelle Unterlage im Vollbild — für den
          Beamer. Jeder Aufgabenblock wird eine Folie.
        </P>
        <Steps items={[
          <>Öffne in der <strong>Vorschau</strong> den Tafel-Modus — über den Knopf in der Leiste oder über die Suche mit „Tafel" bzw. „Beamer". Es geht auch, wenn noch nicht generiert wurde.</>,
          <><kbd>→</kbd> / <kbd>Leertaste</kbd> blättern vor, <kbd>←</kbd> zurück.</>,
          <><kbd>L</kbd> deckt die Lösung auf bzw. blendet sie wieder aus. Gibt es stufenweise Lösungen, wandert <kbd>L</kbd> Schritt für Schritt weiter.</>,
          <><kbd>+</kbd> / <kbd>−</kbd> vergrößern und verkleinern die Schrift, für den hinteren Raum.</>,
          <><kbd>Esc</kbd> beendet den Tafel-Modus.</>,
        ]} />
        <P>
          Im Tafel-Modus gibt es auch einen Hell- und einen Dunkelmodus — je nach Beamer und
          Raumlicht. Die Schriftgröße der App selbst verstellst du unabhängig davon mit
          <kbd>{formatShortcut('Mod + +')}</kbd>, <kbd>{formatShortcut('Mod + −')}</kbd> und
          <kbd>{formatShortcut('Mod + 0')}</kbd>.
        </P>
        <Tip>Der Tafel-Modus braucht Blöcke. Ist die Unterlage noch leer, sagt LUKA das und schickt dich zur Generierung.</Tip>
      </>
    ),
  },

  /* --------------------------- Kapitel: Bewerten ----------------------------- */
  {
    id: 'korrigieren',
    kapitel: 'bewerten',
    title: 'Korrigieren',
    Icon: SpellCheck,
    natascha: true,
    body: (
      <>
        <P>
          Im Bereich <strong>Korrektur</strong> analysiert die KI Schülerabgaben anhand einer
          Rubrik: Kriterien-Bewertung, Notenempfehlung und einzelne Fehler — farbcodiert nach
          <strong> R</strong>echtschreibung, <strong>G</strong>rammatik, <strong>Z</strong>eichensetzung
          und <strong>A</strong>usdruck.
        </P>
        <Steps items={[
          <>Ein neuer Führungsassistent begleitet dich in fünf Schritten: Klasse &amp; Aufgabe, Textsorte &amp; Raster, Material, Abgaben, Übersicht &amp; Start.</>,
          <>KI-Anbieter und Modell lassen sich direkt im Dialog wählen, ohne Umweg über die Einstellungen.</>,
          <>Lade die Abgabe als Datei (DOCX/PDF/TXT) hoch. Mehrere Dateien können als Stapel laufen.</>,
          <>Optional Ausgangsmaterial als Text oder Datei und ein Bewertungsraster hinterlegen. Beides bleibt am Korrekturauftrag erhalten und steht später für Folgeübungen wieder bereit.</>,
          <>Vor dem Versand zeigt LUKA die erkannte Schülerzuordnung und — bei Textabgaben — die Redaktionsvorschau. Namen werden standardmäßig durch stabile Aliasse ersetzt; PDF- und Bildinhalte können nicht automatisch redigiert werden.</>,
          <>Nach der Analyse zeigt die Detailansicht links die Bewertung (Note, Kriterien, Fehlerliste) und rechts den <strong>markierten Schülertext</strong> als A4-Vorschau.</>,
          <>Eigene <strong>Lehrernote</strong> und einen Kommentar erfassen und speichern — die App vergleicht deine Note später mit der KI-Note (Kalibrierung).</>,
          <>Mit „Feedback-DOCX" ein Rückmelde-Dokument für die Schülerin/den Schüler erzeugen.</>,
        ]} />
        <P><strong>Fehlerliste und Schülertext sind verzahnt:</strong> Ein Klick auf einen Vorschlag holt die Stelle im Schülertext in den Blick — die Markierung bekommt einen kräftigen Rahmen, die übrigen treten zurück. Ein Klick auf eine Markierung hebt umgekehrt die zugehörige Karte hervor. Jeder Vorschlag trägt eine Nummer, die auf Karte und Text steht; bei 40 Markierungen sieht man so auf einen Blick, welcher Vorschlag zu welcher Stelle gehört. Mit „Nr. im Text" blendest du die Ziffern aus.</P>
        <P><strong>Sortieren statt Springen:</strong> Die Fehlerliste lässt sich nach „Reihenfolge im Text" ordnen — so gehst du den Aufsatz von oben nach unten durch, statt zwischen den Fehlerarten hin und zu springen. Weitere Reihenfolgen: nach Fehlerart, nach Unsicherheit zuerst und nach offenen Vorschlägen zuerst.</P>
        <P><strong>Vertrauensstufen:</strong> Jeder Vorschlag zeigt eine Ampel — wie sicher LUKA selbst ist. Über „Nur unsichere" blendest du die grünen aus. Du kannst einzelne Vorschläge übernehmen, ändern oder verwerfen; die Entscheidung wird gespeichert und ins Feedback-DOCX übernommen. Verworfene Fehler erscheinen im Text gestrichen, geänderte farbig hervorgehoben.</P>
        <P><strong>Wiederkehrende Fundstellen:</strong> Steht eine Wendung mehrfach im Text, ist sie an allen Fundstellen markiert. Vorschläge, deren Zitat nicht im Text gefunden wird, stehen unten in einer eigenen Gruppe mit Symbol — nicht verloren, aber klar als nachzuprüfen markiert.</P>
        <P><strong>Batch-Korrektur:</strong> Im Analyse-Dialog „Mehrere wählen …" → ganze Klasse auf einmal. Ein Fortschrittsbalken zeigt den Lauf; „Abbrechen" stoppt nach der laufenden Datei. Duplikate werden übersprungen, nicht abgebrochen.</P>
        <P><strong>Retro-Import:</strong> Bereits außerhalb der App korrigierte Abgaben (vorhandene Analyse-JSONs) holst du über „Retro-Import" im Abgaben-Kopf nachträglich in die Datenbank.</P>
        <P><strong>Erweiterte Einstellungen:</strong> Die Korrektur ist in der Desktop-App integriert und prüft sich vor einer Analyse selbst. Falls die Installation nicht bereit ist, zeigt die App eine verständliche Diagnose; der technische TUI-Fallback liegt in den <strong>erweiterten Einstellungen</strong>.</P>
        <Tip>Über den Schülernamen in der Detailansicht springst du direkt zum Längsschnitt dieses Schülers.</Tip>
      </>
    ),
  },
  {
    id: 'klassen',
    kapitel: 'bewerten',
    title: 'Klassen-Auswertung',
    Icon: GraduationCap,
    natascha: true,
    body: (
      <>
        <P>Der Bereich <strong>Meine Klassen</strong> verdichtet alle Korrekturen einer Klasse zu Auswertungen. Eine Klasse hat eine <strong>Farbe</strong> — die legst du beim Bearbeiten in der Klassenverwaltung fest.</P>
        <Steps items={[
          <><strong>Fehler-Heatmap</strong> — welche Fehlerarten dominieren.</>,
          <><strong>Notenverteilung</strong> und <strong>Trend</strong> über mehrere Aufgaben.</>,
          <><strong>Kalibrierung</strong> — wie stark KI-Note und Lehrernote auseinanderliegen.</>,
          <><strong>KI-Klassen-Briefing</strong> — eine generierte Zusammenfassung mit Handlungsempfehlungen.</>,
          <><strong>Förder- und Vertiefungsgruppen:</strong> Die Klassenansicht ordnet bestätigte Lehrkraftnoten zwei oder drei Gruppen zu und zeigt die Zuordnung vor der Übung; sie lässt sich vor der Generierung manuell ändern.</>,
        ]} />
        <P>
          <strong>Closed Loop:</strong> „Übungsblatt zu Top-Fehlern generieren" springt direkt in den
          Assistenten — die häufigsten Fehlerschwerpunkte der Klasse sind bereits als Fokus vorbefüllt.
        </P>
        <P>
          <strong>CSV-Import:</strong> mehrere Schüler auf einmal anlegen — eine Zeile pro Person
          (Vorname, Nachname). Die <strong>Noten</strong> einer Klasse lassen sich als CSV
          exportieren, z. B. fürs Notenbuch.
        </P>
        <Tip>Über die Notenverteilung springst du mit einem Klick direkt in die einzelne Abgabe.</Tip>
      </>
    ),
  },
  {
    id: 'schueler',
    kapitel: 'bewerten',
    title: 'Schüler-Längsschnitt',
    Icon: Users,
    natascha: true,
    body: (
      <>
        <P>Im Bereich <strong>Schüler</strong> verfolgst du die Entwicklung einzelner Lernender über mehrere Aufgaben.</P>
        <Steps items={[
          <>Klasse und Schüler wählen → Notenverlauf, Trend (K1/K3), Fehlerschwerpunkte und Kalibrierung.</>,
          <><strong>KI-Schüler-Profil</strong> generieren — eine individuelle Einschätzung auf Basis des Längsschnitts.</>,
          <><strong>Closed Loop pro Schüler:</strong> „Übungsblatt zu Schwächen" erzeugt ein Arbeitsblatt, das auf die persönlichen Fehlerschwerpunkte zugeschnitten ist.</>,
        ]} />
        <Tip>Fehlt eine Schülerin oder ein Schüler, legst du sie in der Klassenverwaltung an — mehrere auf einmal über den CSV-Import.</Tip>
      </>
    ),
  },
  {
    id: 'erwartungshorizont',
    kapitel: 'bewerten',
    title: 'Erwartungshorizont & Raster',
    Icon: ClipboardCheck,
    natascha: true,
    body: (
      <>
        <P>
          Ein <strong>Erwartungshorizont</strong> ist eine KI-generierte Musterlösung für eine
          Aufgabe. Generieren, im Textfeld bearbeiten und „Akzeptieren &amp; speichern" — danach
          nutzt die Korrektur dieser Aufgabe ihn automatisch als Maßstab.
        </P>
        <P>
          Im <strong>Rubrik-Editor</strong> (gleiche Ansicht) bearbeitest du die Bewertungsraster
          direkt: Rubrik wählen, Markdown anpassen, speichern. Änderungen wirken bei der nächsten
          Korrektur mit dieser Rubrik.
        </P>
        <P>
          LUKA liefert eigene Grundraster für Englisch, Französisch, Spanisch, Italienisch und
          Latein. Das <strong>Feedback bleibt deutsch</strong>, Zitate und Korrekturen stehen in
          der Zielsprache. Bei Land Deutschland korrigiert Deutsch mit Skala 1–6 und der
          Bezeichnung „Klassenarbeit".
        </P>
        <Tip>So steuerst du die Bewertung gezielt — z. B. strengere oder fachspezifische Kriterien.</Tip>
      </>
    ),
  },

  /* -------------------------- Kapitel: Bibliothek ---------------------------- */
  {
    id: 'pool',
    kapitel: 'bibliothek',
    title: 'Aufgaben-Pool',
    Icon: Database,
    body: (
      <>
        <P>Der <strong>Aufgaben-Pool</strong> sammelt wiederverwendbare Aufgaben-Blöcke — einmal gespeichert, beliebig oft wieder eingefügt.</P>
        <Steps items={[
          <>In der <strong>Vorschau</strong> (Schritt Erstellen) bei einem Block auf <strong>„In Pool speichern"</strong> — der Block wird mit Fach, Stufe, Thema und Tags abgelegt.</>,
          <>In der Ansicht <strong>Aufgaben-Pool</strong> suchst du nach Thema, Tags oder Typ und filterst nach Fach, Stufe, Aufgabentyp, Herkunft und Qualitätsstatus. Mit der Sortierung <strong>„Neueste zuerst"</strong>, <strong>„Zuletzt verwendet"</strong> oder <strong>„Empfohlen zuerst"</strong> findest du passende Aufgaben schneller — „Empfohlen zuerst" richtet sich nach deinem Profil.</>,
          <>Jede Aufgabe kannst du mit dem Stern als <strong>Favorit</strong> markieren und lokal mit einem Qualitätsstatus versehen: <strong>Unbewertet</strong>, <strong>Getestet</strong>, <strong>Empfohlen</strong> oder <strong>Zurückgestellt</strong>. Kuratierte Fachpaket-Aufgaben tragen das Badge <strong>„Kuratiert"</strong> und zeigen ihren Herkunftsvermerk.</>,
          <>Im <strong>Baukasten</strong> fügst du einen Pool-Eintrag über <strong>„Aus Pool einfügen"</strong> direkt als neuen Block ein — die Aufgabe inkl. Konfiguration und Lösung landet im aktuellen Dokument und wird als zuletzt verwendet gespeichert.</>,
          <>Nicht mehr gebrauchte Einträge löschst du direkt auf ihrer Pool-Karte. Der Button <strong>„Filter löschen"</strong> setzt aktive Suche und Filter zurück.</>,
        ]} />
        <P><strong>Fachpakete teilen:</strong> Mit <strong>„Exportieren"</strong> speicherst du den gesamten lokalen Pool als teilbare JSON-Datei. Die Favoriten, Qualitätsstatus und letzte Verwendung bleiben bewusst lokal und werden nicht exportiert.</P>
        <P>Mit <strong>„Importieren"</strong> wählst du eine JSON-Datei aus. Die App validiert sie vollständig, bevor sie den Pool verändert. In der Vorschau siehst du Anzahl, Fächer, Herkunftsvermerke und Duplikate; bei vorhandenen IDs entscheidest du zwischen <strong>„Ersetzen"</strong> und <strong>„Behalten"</strong>. Ungültige Dateien werden abgelehnt und verändern den Pool nicht.</P>
        <P>
          <strong>Startpaket:</strong> Ist der Pool leer, bietet dir LUKA per Klick
          <strong>29 geprüfte Aufgaben</strong> an — aus vier Paketen: <strong>Deutsch Oberstufe</strong>{' '}
          (Textsorten), <strong>Englisch Oberstufe</strong> (CEFR B1–B2), <strong>Medien und Demokratie</strong> und
          <strong>Informatik und Künstliche Intelligenz</strong>. Steht in deinem Profil
          <strong> Deutschland</strong>, kommen acht Aufgaben für das deutsche Schulsystem dazu
          (<strong>37 insgesamt</strong>). Nichts wird überschrieben; bereits vorhandene Aufgaben
          werden übersprungen. Zusätzlich liegt <strong>Englisch Oberstufe (CEFR B1–B2)</strong>
          als eigene JSON-Datei unter <code>samples/fachpakete/</code> bereit, die du über
          <strong> Importieren</strong> nachladen kannst.
        </P>
        <Tip>Der Pool ist pro Rechner lokal. Beim Ersetzen eines Duplikats bleiben deine lokalen Organisationsdaten erhalten — ideal, um kuratierte Inhalte zu übernehmen und eigene Bewertungen weiterzuführen.</Tip>
      </>
    ),
  },
  {
    id: 'dokumente',
    kapitel: 'bibliothek',
    title: 'Unterlagen, Vorlagen & Verlauf',
    Icon: FolderOpen,
    body: (
      <>
        <P>Erstellte Unterlagen und Konfigurationen verwaltest du in der <strong>Bibliothek</strong>:</P>
        <Steps items={[
          <><strong>Speichern</strong> (oben in der Leiste) sichert die aktuelle Unterlage unter <strong>Meine Unterlagen</strong>.</>,
          <><strong>Vorlagen</strong> — gespeicherte Baukasten-Konfigurationen, die du als Startpunkt für neue Unterlagen lädst.</>,
          <><strong>Verlauf</strong> — jede Generierung und jeder Export wird protokolliert.</>,
          <><strong>Favoriten</strong> — häufig genutzte Dokumente markieren; <strong>Papierkorb</strong> — Gelöschtes wiederherstellen.</>,
        ]} />
        <P>
          <strong>Alles wiederfinden:</strong> Über <kbd>{formatShortcut('Mod + K')}</kbd> findest du
          jede gespeicherte Unterlage nach Titel, Thema, Fach, Stufe und Klasse — die Treffer
          erscheinen gruppiert, und ein Klick öffnet die Unterlage im Assistenten.
        </P>
        <P>
          <strong>Datensicherung:</strong> Unter <strong>Einstellungen → Datenbank</strong> schreibst
          du mit „Datensicherung exportieren" eine Kopie der gesamten lokalen Datenbank an einen Ort
          deiner Wahl. Das ist vor einem Umzug oder einem Neustart auf einem anderen Rechner sinnvoll.
        </P>
        <Tip>Bevor du eine gespeicherte Unterlage öffnest, fragt LUKA nach, wenn im Assistenten noch ungespeicherte Arbeit liegt — so geht nichts verloren.</Tip>
      </>
    ),
  },
  {
    id: 'export',
    kapitel: 'bibliothek',
    title: 'Export & Dateien',
    Icon: FileDown,
    body: (
      <>
        <P>Beim Export entstehen pro Unterlage mehrere Dateien — wohin sie landen, stellst du in den <strong>Einstellungen → Export</strong> ein.</P>
        <Steps items={[
          <><strong>DOCX-Zielordner:</strong> In den Einstellungen legst du einen Ordner fest, in den alle DOCX geschrieben werden. Alternativ aktivierst du <strong>„Speichern unter…"</strong>, um bei jedem Export den Ort einzeln zu wählen. Ohne Tauri (Browser) landen die Dateien im Download-Ordner.</>,
          <><strong>Beide Dokumente</strong> (Schülerfassung + Lösung) sowie <strong>Korrekturraster</strong> als DOCX; im Kompetenz-Modus zusätzlich der <strong>Kompetenznachweis</strong>; optional <strong>PDF</strong> über den nativen Speicher-Dialog (braucht LibreOffice).</>,
          <><strong>Moodle/GIFT-Export:</strong> In Schritt Erstellen unter „Weitere Exporte" erzeugst du eine <code>.gift</code>-Datei zum Import in Moodle. Geschlossene Aufgaben (Multiple Choice, Matching, Lückentext …) werden zu Quizfragen, offene (Schreibaufgabe, Verständnisfrage) zu Essay-Fragen.</>,
          <>Zusätzlich: <strong>Übung mit Lösungsteil</strong> (Schüler- und Lösungsteil in einem Dokument) und <strong>Selbsteinschätzungsbogen</strong> für die Schüler/innen.</>,
        ]} />
        <P>
          <strong>„Speichern unter…" nachfragen:</strong> In den Einstellungen kannst du LUKA
          ausdrücklich anweisen, vor <em>jedem</em> Export nach dem Zielort zu fragen. Praktisch,
          wenn du nach einer Änderung nicht versehentlich in den alten Ordner exportierst.
        </P>
        <Tip>Vor dem DOCX-Export läuft ein <strong>Quality-Gate</strong> (Lernziel-Abdeckung, Wortzahl Schreibaufgabe) — nur Hinweise, kein Zwang. Jeder Export wird im <strong>Verlauf</strong> protokolliert.</Tip>
      </>
    ),
  },
  {
    id: 'einsatz',
    kapitel: 'bibliothek',
    title: 'Einsatz vermerken',
    Icon: ClipboardList,
    body: (
      <>
        <P>
          Wenn du eine Unterlage tatsächlich eingesetzt hast, vermerkst du das im
          <strong> Verlauf</strong>. Damit beantwortest du später zwei Fragen ohne Nachforschen:
          Was ist schon im Unterricht gewesen — und was hat sich bewährt?
        </P>
        <Steps items={[
          <>Im <strong>Verlauf</strong> auf der Materialkarte auf <strong>„Einsatz vermerken"</strong>. Du wählst <strong>Klasse</strong>, <strong>Art</strong> (verteilt, gemeinsam bearbeitet, Hausübung, Schularbeit oder nur geplant), <strong>Datum</strong> und <strong>Status</strong> (geplant oder eingesetzt). LUKA schnappt sich Titel und Lernziele der Unterlage mit.</>,
          <>Bei <strong>„Eingesetzt"</strong> zählt der Termin als Unterricht — bei „Nur geplant" nicht. Das ist der Unterschied zwischen „ich habe vor" und „ich habe gemacht".</>,
          <>Eine <strong>Notiz</strong> ist optional, aber der Ort für den Befund: Was hat funktioniert, was nicht.</>,
        ]} />
        <P>
          <strong>Rückblick:</strong> Jeder vermerkte Einsatz bekommt später eine eigene Zeile mit
          einem Status — <strong>Offen</strong>, <strong>Hilfreich</strong>, <strong>Anpassen</strong>
          oder <strong>Nicht eingesetzt</strong> — und einer Notiz. So sammelst du über ein Schuljahr
          die Rückmeldung, die eine Folgearbeit braucht: Welche Unterlage taugt, welche will ich beim
          nächsten Mal ändern?
        </P>
        <Tip>Um einen Einsatz wieder zu entfernen, löschst du die Zeile in der Einsatzliste im Verlauf. Die Unterlage selbst bleibt davon unberührt.</Tip>
      </>
    ),
  },

  /* --------------------------- Kapitel: Bedienen ----------------------------- */
  {
    id: 'dashboard',
    kapitel: 'bedienen',
    title: 'Übersicht',
    Icon: LayoutDashboard,
    body: (
      <>
        <P>
          Die <strong>Übersicht</strong> ist deine Startseite. Ganz oben steht kompakt, wo du
          bist und <strong>wie viele Stunden in den nächsten sieben Tagen anstehen</strong> — mit
          Sprung direkt in die Planung oder zu den Korrekturen.
        </P>
        <P>
          <strong>Wochenstreifen:</strong> Heute plus die folgenden sechs Tage, jeder Tag mit
          seinen Stunden in der Klassenfarbe. Tage ohne Unterlage sind markiert. Ein Klick auf
          einen Tag bringt dich in die Planung genau zu diesem Tag.
        </P>
        <P>
          <strong>Anstehend:</strong> Die nächsten Stunden mit Tag, Klasse, Uhrzeit und dem
          Hinweis, ob die Unterlage fehlt oder die Stunde entfallen ist.
        </P>
        <P>
          <strong>Weiterarbeiten:</strong> Öffnet das letzte Dokument mit denselben Einstellungen
          (Fach, Stufe, Typ). <strong>Schnell-Übung</strong> springt mit Thema und Aufgabentyp
          direkt in den Baukasten, ohne Quelltext-Umweg.
        </P>
        <Tip>Samstag und Sonntag sind im Wochenstreifen und auf der Startseite dezent gekennzeichnet — so siehst du auf einen Blick, wo ohnehin kein Unterricht ist.</Tip>
      </>
    ),
  },
  {
    id: 'suche',
    kapitel: 'bedienen',
    title: 'Suche & Befehle',
    Icon: Search,
    body: (
      <>
        <P>
          Die <strong>Such-/Befehlsleiste</strong> oben in der Kopfzeile (oder
          <kbd>{formatShortcut('Mod + K')}</kbd>) durchsucht die gesamte App und führt Befehle aus
          — eine Eingabe, beides zugleich.
        </P>
        <Steps items={[
          <><strong>Inhalte suchen:</strong> Tippe ein Thema, Fach, eine Klasse oder einen Vorlagennamen. Treffer aus <strong>Unterlagen</strong>, <strong>Vorlagen</strong>, <strong>Aufgaben-Pool</strong>, <strong>Klassen</strong> und <strong>Gehe zu …</strong> erscheinen gruppiert — passend zum Zweck, nicht nur nach Textähnlichkeit.</>,
          <><strong>Befehle ausführen:</strong> Textbefehle wie „Thema: …", „Klasse: 7A", „Fach: Deutsch", „Punkte: 8", „Exportieren", „Weiter/Zurück" setzen das Dokument, den Schritt oder den Export. <kbd>Enter</kbd> <em>ohne</em> ausgewählte Zeile parst den getippten Text.</>,
          <><strong>Navigation mit der Tastatur:</strong> <kbd>↑</kbd>/<kbd>↓</kbd> Zeile wählen, <kbd>Enter</kbd> öffnen/ausführen, <kbd>Esc</kbd> schließen.</>,
          <><strong>Spracheingabe:</strong> Ist im System eine Spracheingabe verfügbar, findest du links im Eingabefeld ein Mikrofon. LUKA hört Deutsch und trägt das Erkannte ein.</>,
        ]} />
        <P>
          <strong>Befehle mit Platzhalter</strong> wie „Thema: &lt;Text&gt;" oder „Punkte: &lt;Zahl&gt;"
          erscheinen erst, wenn deine Eingabe auch wirklich ein Thema bzw. eine Zahl enthält. Vorher
          wären sie sichtbar, aber nicht ausführbar.
        </P>
        <P>
          <strong>Was LUKA bei einem Treffer tut:</strong> Eine Unterlage wird im Assistenten
          geöffnet, eine Vorlage in den Baukasten geladen, eine Pool-Aufgabe als Block
          eingefügt. Steht im Assistenten noch ungespeicherte Arbeit, fragt LUKA vorher nach.
        </P>
        <Tip>Die Suche läuft rein lokal über die schon geladenen Daten — kein Server, keine Verzögerung. Der Aufgaben-Pool wird beim Öffnen der Palette frisch geladen.</Tip>
      </>
    ),
  },
  {
    id: 'tastenkuerzel',
    kapitel: 'bedienen',
    title: 'Tastenkürzel',
    Icon: Keyboard,
    body: <TastenkuerzelTabelle />,
  },
  {
    id: 'einstellungen',
    kapitel: 'bedienen',
    title: 'Einstellungen',
    Icon: Compass,
    body: (
      <>
        <P>Unten in der Seitenleiste. Die Abschnitte, die man kennen sollte:</P>
        <Steps items={[
          <><strong>Mein Profil</strong> — Land, Bundesland, Schulform, Fächer, Schulstufen, Aufgabenformate, Standard-Anbieter und Exportvorgaben. Siehe <strong>Mein Profil</strong> oben.</>,
          <><strong>Standard-Vorgaben</strong> — was für neue Unterlagen gilt, unabhängig vom Profil.</>,
          <><strong>Darstellung</strong> — drei Schalter: <strong>Fachzeichen aktivieren</strong> (dezente Fach-Symbole im Hintergrund), <strong>Bewegung reduzieren</strong> (stoppt Parallax-Effekte) und <strong>Hintergrundeffekte reduzieren</strong> (nur noch sehr leichte Papierstruktur). Für Beamer-Unterricht und bei Migräne empfiehlt sich „Bewegung reduzieren".</>,
          <><strong>Korrektur-Modul</strong> — Status des integrierten Korrekturmoduls, Pfad zum Ablage-Ordner sowie der technische TUI-Fallback. Im Normalfall ist hier nichts einzustellen.</>,
          <><strong>Export</strong> — DOCX-Zielordner, „Speichern unter…", ob vor jedem Export gefragt wird, und die Vorgaben aus deinem Profil.</>,
          <><strong>Datenbank</strong> — „Datensicherung exportieren" sowie der Import einer Sicherung.</>,
          <><strong>Installation &amp; Updates</strong> — aktive Version und der Pfad der Programmdatei.</>,
        ]} />
        <Tip>
          <strong>Größer und kleiner:</strong> <kbd>{formatShortcut('Mod + +')}</kbd>,
          <kbd>{formatShortcut('Mod + −')}</kbd> und <kbd>{formatShortcut('Mod + 0')}</kbd> verstellen
          die gesamte App — auch auf einem Beamer, an dem 1920×1080 wenig ist.
        </Tip>
      </>
    ),
  },

  /* -------------------------- Kapitel: Datenschutz --------------------------- */
  {
    id: 'datenschutz',
    kapitel: 'datenschutz',
    title: 'Datenschutz',
    Icon: ShieldCheck,
    body: (
      <>
        <P>
          <strong>Wichtig:</strong> Bei der Generierung werden Thema, Anweisungen und
          bereitgestellte Quelltexte an den gewählten KI-Anbieter übertragen. Verwende keine
          personenbezogenen Schülerdaten in Themen, Notizen oder Quelltexten.
        </P>
        <P>
          <strong>Bei der Korrektur:</strong> LUKA zeigt vor dem Versand die Redaktionsvorschau.
          Namen werden dabei standardmäßig durch stabile Aliasse ersetzt. Aus PDF- und
          Bildinhalten lassen sich Namen jedoch <strong>nicht</strong> automatisch entfernen —
          prüfe dort die Vorschau besonders sorgfältig, oder wähle ein Textformat.
        </P>
        <P>
          Alles andere bleibt <strong>lokal</strong>: Datenbank und Exporte liegen auf deinem
          Rechner und sind nicht in der Cloud. Die vollständige Beschreibung steht in
          <code> docs/DATENSCHUTZ.md</code> im Projekt, die Datensicherung über
          <strong>Einstellungen → Datenbank</strong>.
        </P>
        <P>
          Wenn du mit dem Anbieter wechseln willst: der alte Anbieter behält die bereits
          übertragenen Inhalte selbstverständlich. LUKA hat darauf keinen Einfluss.
        </P>
        <Tip>Alle Daten lassen sich jederzeit über „Datensicherung exportieren" mitnehmen und auf einem anderen Rechner wieder einspielen.</Tip>
      </>
    ),
  },
  {
    id: 'hilfe',
    kapitel: 'datenschutz',
    title: 'Wenn etwas nicht geht',
    Icon: LifeBuoy,
    body: (
      <>
        <Steps items={[
          <><strong>„Analyse fehlgeschlagen" / „Generierung fehlgeschlagen"</strong> → API-Schlüssel und Anbieter in den Einstellungen prüfen. Dort gibt es je Anbieter <strong>„Verbindung testen"</strong> — damit ist klar, ob der Schlüssel oder der Anbieter das Problem ist. Falls der Test gerade scheitert, kannst du den Schlüssel mit „Nur speichern" sichern und später erneut testen. Bleibt die Meldung, anderes Modell wählen.</>,
          <><strong>Selten unvollständige KI-Antwort</strong> bei sehr günstigen Modellen (z. B. abgeschnittenes JSON) → Vorgang erneut starten oder ein qualitätsreicheres Modell wählen.</>,
          <><strong>PDF-Export schlägt fehl</strong> → PDF geht nur über LibreOffice. Ohne LibreOffice exportierst du DOCX und wandelst sie selbst um.</>,
          <><strong>Der Korrekturauftrag startet nicht</strong> → Unter <strong>Einstellungen → Korrektur-Modul</strong> steht, ob die Installation bereit ist; dort findest du auch den technischen Fallback.</>,
          <><strong>Schulferien fehlen in der Planung</strong> → siehe <strong>Unterrichtsplanung</strong>: Ohne Bundesland im Profil kann LUKA sie nicht zuordnen.</>,
          <><strong>Speicherfehler</strong> erscheinen als Hinweis unten rechts. Bitte mit Screenshot melden.</>,
          <><strong>Daten nach Neustart weg?</strong> Sollte nicht passieren — falls doch, bitte als Fehler melden.</>,
        ]} />
        <P>
          <strong>Fehler melden:</strong> Der Knopf <strong>Fehler melden</strong> unten in der
          Seitenleiste öffnet ein Formular. Je mehr Kontext du mitgibst, desto schneller lässt
          sich die Ursache finden — Version (steht in den Einstellungen unter „Installation
          &amp; Updates") und ein Screenshot helfen dabei sehr.
        </P>
        <P>
          <strong>Mehr Tiefe:</strong> Die ausführliche Anleitung liegt als
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener"> ANLEITUNG im Projekt</a> —
          mit denselben Kapiteln wie diese Hilfe, aber mehr Detail zu jedem Fall.
        </P>
        <Tip>Bei einer offiziellen Prüfung: Matura- und Abitur-Training in LUKA sind Übungsformate. Nutze für die Prüfung selbst das Material deiner Schulbehörde.</Tip>
      </>
    ),
  },
];

/* --------------------------- Abhängigkeiten prüfen -------------------------- */

/** Abschnitte, die ohne das Korrektur-Modul entfallen. */
export const NATASCHA_SECTIONS = HELP_SECTIONS.filter((s) => s.natascha);

export function verfuegbareSektionen(nataschaEnabled: boolean = FEATURES.natascha): HelpSection[] {
  return HELP_SECTIONS.filter((s) => nataschaEnabled || !s.natascha);
}

export function verfuegbareKapitel(
  sektionen: HelpSection[] = verfuegbareSektionen(),
): Kapitel[] {
  const ids = new Set(sektionen.map((s) => s.kapitel));
  return KAPITEL.filter((k) => ids.has(k.id));
}

