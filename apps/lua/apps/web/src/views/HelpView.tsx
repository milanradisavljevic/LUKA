import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Workflow, Rocket, FilePlus2, SpellCheck, GraduationCap, Users,
  ClipboardCheck, LayoutDashboard, Keyboard, ShieldCheck, LifeBuoy,
  Lightbulb, CheckCircle2, Target, FolderOpen, Shapes, BookOpen,
  Database, FileDown, Search,
} from 'lucide-react';
import { FEATURES } from '../lib/features';
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
    title: FEATURES.natascha ? 'Überblick & Closed Loop' : 'Überblick',
    Icon: Workflow,
    body: (
      <>
        <P>{FEATURES.natascha ? (
          <>LUKA verbindet Unterlagen erstellen, Schülerabgaben korrigieren und gezieltes Üben zu einem durchgängigen Kreislauf.</>
        ) : (
          <>Dieser Pilot konzentriert sich auf das <strong>Erstellen hochwertiger Lehrunterlagen</strong>: vom Thema oder Quelltext bis zu DOCX, Lösung und Korrekturraster.</>
        )}</P>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
          margin: '0.75rem 0', fontSize: '0.8125rem',
        }}>
          {(FEATURES.natascha
            ? ['Unterlagen erstellen', '→', 'Abgaben korrigieren', '→', 'Fehler-Heatmap', '→', 'gezieltes Übungsblatt', '↺']
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
        <Tip>Wenn du neu bist, lies <strong>Erste Schritte</strong> und erstelle anschließend eine kleine Schnell-Übung zum Ausprobieren.</Tip>
      </>
    ),
  },
  {
    id: 'erste-schritte',
    title: 'Erste Schritte',
    Icon: Rocket,
    body: (
      <>
        <P>Damit die KI-Generierung läuft, brauchst du einen API-Schlüssel deines KI-Anbieters.</P>
        <Steps items={[
          <>Öffne <strong>Einstellungen</strong> und trage deinen API-Schlüssel ein (z. B. Anthropic, OpenAI, Mistral, DeepSeek). Schlüssel werden sicher im Schlüsselspeicher des Betriebssystems abgelegt — nicht im Klartext.</>,
          <>Wähle Standard-Anbieter und -Modell (standardmäßig <strong>Mistral Medium 3.5</strong> — änderbar in den <strong>Einstellungen</strong>). Für günstige Tests eignet sich ein kleines Modell.</>,
          <>Starte über <strong>Neue erstellen</strong>, <strong>Kompetenz-Übung</strong> oder <strong>Schnell-Übung</strong> und exportiere eine erste Schüler- und Lösungsfassung.</>,
        ]} />
        <P><strong>Kein-Key-Hinweis:</strong> Wählst du in Schritt „KI-Modell" einen Anbieter, für den noch kein Schlüssel hinterlegt ist, zeigt die App dort einen Hinweis mit Direkt-Link zu den Einstellungen — so scheiterst du nicht erst beim Generieren.</P>
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
        <P><strong>Differenzierung (leichter / schwerer):</strong> Im Akkordeon „Differenzierung" (nach dem Generieren) erzeugst du zusätzlich zur Standardfassung (mittel = „Beide Dokumente") gezielt eine <em>leichtere</em> und/oder <em>schwerere</em> Variante: Häkchen setzen, dann „Variante(n) erstellen & exportieren". <em>Leicht</em> vereinfacht offene Aufgaben ohne KI-Kosten; <em>schwer</em> generiert die offenen Aufgaben anspruchsvoller neu. Dateinamen tragen <code>_leicht</code>/<code>_schwer</code>.</P>
        <P><strong>Manuell oder Hybrid festlegen:</strong> Bei Kreuzworträtsel, Wortgitter, Vokabelübung, Fehlerkorrektur und „Wörter ordnen" kannst du im Block-Editor auf „Selbst festlegen" umschalten. Gib eigene Wörter, Sätze oder Vokabeln ein — die KI übernimmt sie wortgleich und ergänzt nur noch fehlende Einträge, bis die gewünschte Anzahl erreicht ist. So bleibst du Herrin/Herr der Inhalte, sparst aber trotzdem Zeit.</P>
        <P><strong>Schnell ohne Quelltext:</strong> Für kleine Übungen mit eigenen Inhalten brauchst du keine Textgrundlage. Wähle im Dashboard oder in Schritt „Absicht" einen der Schnellstarts (z. B. „Kreuzworträtsel", „Vokabeltest", „Fehlerkorrektur", „Lückentext"). Der Assistent springt direkt in den Baukasten; Quelltexte kannst du überspringen.</P>
        <P><strong>Selbsteinschätzungsbogen:</strong> Nach dem Generieren kannst du einen zusätzlichen Bogen exportieren, mit dem Schülerinnen und Schüler einschätzen, wie sicher sie sich bei den einzelnen Aufgaben fühlen. Er eignet sich besonders für differenzierte Rückmeldung und Selbstregulation.</P>
        <Tip>Einen ganzen Blocktyp wieder entfernen: im Baukasten oben rechts am Block auf das <strong>X</strong> klicken. Mehr Zuordnungs-Paare/MC-Antworten: im Block-Editor auf „+ Item" / „+ Option" / „+ Frage".</Tip>
      </>
    ),
  },
  {
    id: 'deutschland',
    title: 'LUKA für Deutschland',
    Icon: GraduationCap,
    body: (
      <>
        <P>Wenn du in <strong>Einstellungen → Mein Profil</strong> das Land <strong>Deutschland</strong> auswählst, schreibt die KI bundesdeutsch und ordnet Beispiele dem deutschen Schulalltag zu. Dazu gehören Begriffe wie <strong>Abitur</strong>, <strong>Klassenarbeit</strong>, <strong>Klausur</strong> und <strong>Januar</strong> statt österreichischer Varianten.</P>
        <Steps items={[
          <><strong>Klassenstufen:</strong> Deutschland verwendet die Klassen 5 bis 13. Bis einschließlich Klasse 10 ist die Stufe die <strong>Sekundarstufe I</strong>, ab Klasse 11 die <strong>Sekundarstufe II</strong>.</>,
          <><strong>Profil:</strong> Im Profil kannst du deutsche Bundesländer und Schulformen auswählen. Diese Angaben helfen der KI, Szenarien und Beispiele passend zu deinem Schulort und deiner Schulart zu formulieren.</>,
          <><strong>Kompetenz-Modus:</strong> Bei Land Deutschland ist der deutsche Lehrplan-Katalog der <strong>Kultusministerkonferenz (KMK)</strong> für alle Fächer vorausgewählt. Er ist als <strong>kuratierter Entwurf</strong> gekennzeichnet: Die Inhalte sind sorgfältig zusammengestellt, aber kein amtliches Dokument.</>,
          <><strong>Startpaket Deutschland:</strong> Das neue Paket mit acht Aufgaben liegt auf GitHub unter <code>samples/fachpakete/</code>. Importiere die JSON-Datei über <strong>Aufgaben-Pool → Importieren</strong>, genauso wie die anderen Fachpakete.</>,
        ]} />
        <Tip>Die Auswahl des Landes bleibt eine Profileinstellung. Prüfe bei offiziellen Prüfungen und landesspezifischen Vorgaben weiterhin die aktuellen Hinweise deines Bundeslands.</Tip>
      </>
    ),
  },
  {
    id: 'pool',
    title: 'Aufgaben-Pool',
    Icon: Database,
    body: (
      <>
        <P>Der <strong>Aufgaben-Pool</strong> sammelt wiederverwendbare Aufgaben-Blöcke — einmal gespeichert, beliebig oft wieder eingefügt.</P>
        <Steps items={[
          <>In der <strong>Vorschau</strong> (Schritt Erstellen) bei einem Block auf <strong>„In Pool speichern"</strong> — der Block wird mit Fach, Stufe, Thema und Tags abgelegt.</>,
          <>In der Ansicht <strong>Aufgaben-Pool</strong> (Seitenleiste) suchst du nach Thema, Tags oder Typ und filterst nach Fach, Stufe, Aufgabentyp, Herkunft und Qualitätsstatus. Mit der Sortierung <strong>„Neueste zuerst"</strong>, <strong>„Zuletzt verwendet"</strong> oder <strong>„Empfohlen zuerst"</strong> findest du passende Aufgaben schneller.</>,
          <>Jede Aufgabe kannst du mit dem Stern als <strong>Favorit</strong> markieren und lokal mit einem Qualitätsstatus versehen: <strong>Unbewertet</strong>, <strong>Getestet</strong>, <strong>Empfohlen</strong> oder <strong>Zurückgestellt</strong>. Kuratierte Fachpaket-Aufgaben tragen das Badge <strong>„Kuratiert"</strong> und zeigen ihren Herkunftsvermerk.</>,
          <>Im <strong>Baukasten</strong> fügst du einen Pool-Eintrag über <strong>„Aus Pool einfügen"</strong> direkt als neuen Block ein — die Aufgabe inkl. Konfiguration und Lösung landet im aktuellen Dokument und wird als zuletzt verwendet gespeichert.</>,
          <>Nicht mehr gebrauchte Einträge löschst du direkt auf ihrer Pool-Karte. Der Button <strong>„Filter löschen"</strong> setzt aktive Suche und Filter zurück.</>,
        ]} />
        <P><strong>Fachpakete teilen:</strong> Mit <strong>„Exportieren"</strong> speicherst du den gesamten lokalen Pool als teilbare JSON-Datei. Die Favoriten, Qualitätsstatus und letzte Verwendung bleiben bewusst lokal und werden nicht exportiert.</P>
        <P>Mit <strong>„Importieren"</strong> wählst du eine JSON-Datei aus. Die App validiert sie vollständig, bevor sie den Pool verändert. In der Vorschau siehst du Anzahl, Fächer, Herkunftsvermerke und Duplikate; bei vorhandenen IDs entscheidest du zwischen <strong>„Ersetzen"</strong> und <strong>„Behalten"</strong>. Ungültige Dateien werden abgelehnt und verändern den Pool nicht.</P>
        <P><strong>Leerer Pool:</strong> Wenn noch keine Aufgaben vorhanden sind, bietet dir LUKA per Klick das Startpaket mit <strong>29 geprüften Aufgaben</strong> an. Nichts wird überschrieben; bereits vorhandene Aufgaben werden übersprungen. Die sechs mitgelieferten Fachpakete — darunter <strong>Startpaket Deutschland</strong> und <strong>Englisch Oberstufe (CEFR B1–B2)</strong> — liegen zusätzlich als JSON-Dateien im Repository unter <code>samples/fachpakete/</code>.</P>
        <Tip>Der Pool ist pro Rechner lokal. Beim Ersetzen eines Duplikats bleiben deine lokalen Organisationsdaten erhalten — ideal, um kuratierte Inhalte zu übernehmen und eigene Bewertungen weiterzuführen.</Tip>
      </>
    ),
  },
  {
    id: 'export',
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
        <Tip>Vor dem DOCX-Export läuft ein <strong>Quality-Gate</strong> (Lernziel-Abdeckung, Wortzahl Schreibaufgabe) — nur Hinweise, kein Zwang. Jeder Export wird im <strong>Verlauf</strong> protokolliert.</Tip>
      </>
    ),
  },
  {
    id: 'matura',
    title: 'Matura-Training (SRDP-Format)',
    Icon: GraduationCap,
    body: (
      <>
        <P>Das <strong>Matura-Training (SRDP-Format)</strong> ist ein eigener Unterlagentyp für <strong>Deutsch in der Oberstufe</strong>. Die Kachel erscheint nur, wenn Deutsch und eine Oberstufen-Schulstufe gewählt sind.</P>
        <Steps items={[
          <>Im Schritt <strong>Absicht</strong> „Matura-Training (SRDP-Format)" auswählen und eine Textsorte aus der kuratierten SRDP-Auswahl wählen.</>,
          <>Die App erzeugt eine <strong>textgebundene Einzelaufgabe</strong> mit genau einer Textbeilage und einem Schreibumfang von <strong>405–495 Wörtern</strong>.</>,
          <>Beim Export erhältst du die Schülerfassung, die Lösung und das bestehende <strong>K1/K3-Korrekturraster</strong>. Der Erwartungshorizont strukturiert die vier SRDP-Dimensionen und die zugehörigen Kriterien.</>,
        ]} />
        <Tip>Das Matura-Training ist ein Übungsformat für den Unterricht und <strong>kein amtliches Prüfungsmaterial</strong>.</Tip>
      </>
    ),
  },
  {
    id: 'kompetenz',
    title: 'Übung ohne Quelltext (Kompetenz)',
    Icon: Target,
    body: (
      <>
        <P>
          Die zweite Tür auf der Startseite — <strong>„Ohne Quelltext"</strong> — erzeugt Übungen <em>ohne</em>
          eigene Textgrundlage. Statt eines Quelltexts gibst du vor, <strong>woran</strong> geübt werden soll:
        </P>
        <Steps items={[
          <><strong>Freies Thema / Kompetenz</strong> — z. B. „Present Perfect vs. Past Simple" oder „Kommasetzung bei Relativsätzen" frei eintippen.</>,
          <><strong>Oder Lehrplan-Kompetenz</strong> aus dem Katalog wählen — dann entsteht zusätzlich ein <strong>Kompetenznachweis</strong> beim Export. Kompetenzkataloge gibt es für alle unterstützten Fächer.</>,
          <>Aufgabentypen wählen, optional Punkte an/aus, generieren — wie beim Quelltext-Pfad, nur dass die KI die Inhalte stufengerecht selbst erfindet.</>,
        ]} />
        <Tip>Faustregel: <strong>Aus Quelltext</strong> = Schularbeit/Test zu einem konkreten Text. <strong>Ohne Quelltext</strong> = schnelle Grammatik-/Kompetenz-Übung.</Tip>
      </>
    ),
  },
  {
    id: 'faecher',
    title: 'Fächer',
    Icon: BookOpen,
    body: (
      <>
        <P>LUKA unterstützt alle textbasierten AHS-Fächer:</P>
        <Steps items={[
          <><strong>Sprachfächer:</strong> Deutsch, Englisch, Französisch, Spanisch, Italienisch und Latein. Der Generator erzeugt Inhalte in der Zielsprache (z. B. französische Vokabeln, lateinische Übersetzungen) und nutzt CEFR-Niveaus bzw. Latein-spezifische Hinweise.</>,
          <><strong>Sachfächer:</strong> Geschichte, Geographie, Religion, Ethik, Psychologie und Philosophie. Inhalte werden deutschsprachig erzeugt; Textsorten und Bewertungskataloge orientieren sich vorerst am Deutsch-Modell.</>,
        ]} />
        <P>Du wählst das Fach in Schritt „Absicht" oder im Kompetenz-Modus. Die App passt daraufhin Sprache, verfügbare Blocktypen und didaktische Hinweise automatisch an.</P>
        <Tip>Sachfächer sind in v1 mit den deutschsprachigen Katalogen nutzbar. Fachspezifische Kompetenzkataloge (z. B. Geschichts-Quellenanalyse) folgen in späteren Updates.</Tip>
      </>
    ),
  },
  {
    id: 'aufgabentypen',
    title: 'Aufgabentypen',
    Icon: Shapes,
    body: (
      <>
        <P>Diese Blocktypen kannst du im Baukasten kombinieren (je nach Fach/Stufe sinnvoll vorausgewählt):</P>
        <Steps items={[
          <><strong>Geschlossen:</strong> Multiple Choice, Matching (Zuordnung), Lückentext (mit/ohne Wortbank), Kategorisierung, Wörter ordnen, Kreuzworträtsel, Wortgitter, Vokabelübung.</>,
          <><strong>Offen:</strong> Verständnisfrage, Schreibaufgabe, Markieraufgabe, Stilübung, Songanalyse.</>,
          <><strong>Sprachrichtigkeit:</strong> Fehlerkorrektur.</>,
          <><strong>Sprechhandlung:</strong> Rollenspiel — kommunikative Situationen mit Rollenkarten, Redemitteln, Zeitvorgabe und Bewertungs-Checkliste. Ideal für authentisches Sprechen im Paar oder in der Gruppe. Das <strong>Rollenkarten-Set</strong> ist die differenzierte Variante: jedes Paar bekommt ein eigenes Szenario als Karten-Set (Rollenhinweis, Inhalts-Stichpunkte, Sprachhinweis), sodass mehrere Paare gleichzeitig unterschiedliche Situationen spielen können.</>,
        ]} />
        <P>Die <strong>Schwierigkeit</strong> (leicht/mittel/schwer) steuert das kognitive Niveau <em>innerhalb</em> des Typs (Bloom; bei Englisch zusätzlich CEFR A2/B1/B2) — der Typ selbst bleibt erhalten.</P>
        <Tip>Ein Matching-Block = eine Aufgabe mit <em>mehreren</em> Paaren. Für mehr Paare „+ Item"/„+ Option" nutzen, nicht mehrere Matching-Blöcke anlegen.</Tip>
      </>
    ),
  },
  {
    id: 'dokumente',
    title: 'Dokumente, Vorlagen & Verlauf',
    Icon: FolderOpen,
    body: (
      <>
        <P>Erstellte Unterlagen und Konfigurationen verwaltest du über die Seitenleiste:</P>
        <Steps items={[
          <><strong>Speichern</strong> (Kopf oben) sichert die aktuelle Unterlage unter <strong>Meine Unterlagen</strong>.</>,
          <><strong>Vorlagen</strong> — gespeicherte Baukasten-Konfigurationen, die du als Startpunkt für neue Unterlagen lädst.</>,
          <><strong>Verlauf</strong> — jede Generierung/jeder Export wird protokolliert.</>,
          <><strong>Favoriten</strong> — häufig genutzte Dokumente markieren; <strong>Papierkorb</strong> — Gelöschtes wiederherstellen.</>,
        ]} />
        <Tip>Datensicherung: in <strong>Einstellungen → Datenbank → „Datensicherung exportieren"</strong> schreibst du eine Kopie der gesamten lokalen Datenbank an einen Ort deiner Wahl.</Tip>
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
          Die <strong>Übersicht</strong> ist deine Startseite: Sie führt zu den Generator-Einstiegen,
          zuletzt verwendeten Unterlagen und den wichtigsten nächsten Aktionen.
        </P>
        <P>
          <strong>Schnellstarts:</strong> Über die Übersicht legst du direkt los — <strong>„Wie zuletzt"</strong>
          öffnet das letzte Dokument mit denselben Einstellungen (Fach, Stufe, Typ), und <strong>„Schnell-Übung"</strong>
          springt mit Thema + Aufgabentyp direkt in den Baukasten, ohne Quelltext-Umweg.
        </P>
      </>
    ),
  },
  {
    id: 'suche',
    title: 'Suche & Befehle',
    Icon: Search,
    body: (
      <>
        <P>
          Die <strong>Such-/Befehlsleiste</strong> oben im Kopf (oder <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd>)
          durchsucht die gesamte App und führt Befehle aus — eine Eingabe, beides zugleich.
        </P>
        <Steps items={[
          <><strong>Inhalte suchen:</strong> Tippe ein Thema, Fach, eine Klasse oder einen Vorlagennamen — Treffer aus Unterlagen, Vorlagen, Aufgaben-Pool, Klassen und Navigation erscheinen <strong>gruppiert</strong>.</>,
          <><strong>Befehle ausführen:</strong> Slash-/Text-Befehle wie „Thema: …", „Exportieren", „Weiter/Zurück" funktionieren weiter; <kbd>Enter</kbd> <em>ohne</em> ausgewählte Zeile parst den getippten Text wie bisher.</>,
          <>Navigation mit der Tastatur: <kbd>↑</kbd>/<kbd>↓</kbd> Zeile wählen, <kbd>Enter</kbd> öffnen/ausführen, <kbd>Esc</kbd> schließen.</>,
        ]} />
        <Tip>Die Suche läuft rein lokal über die schon geladenen Daten — kein Server, keine Verzögerung. Der Aufgaben-Pool wird beim Öffnen der Palette frisch geladen.</Tip>
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
          <strong>Wichtig:</strong> Bei der Generierung werden Thema, Anweisungen und bereitgestellte
          Quelltexte an den gewählten KI-Anbieter übertragen. Verwende keine personenbezogenen
          Schülerdaten in Themen, Notizen oder Quelltexten.
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

const NATASCHA_HELP_IDS = new Set(['korrigieren', 'klassen', 'schueler', 'erwartungshorizont']);
const AVAILABLE_SECTIONS = SECTIONS.filter((section) => FEATURES.natascha || !NATASCHA_HELP_IDS.has(section.id));

/* ----------------------------------- View ----------------------------------- */

export function HelpView() {
  const [activeId, setActiveId] = useState(AVAILABLE_SECTIONS[0]!.id);

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
    AVAILABLE_SECTIONS.forEach((s) => {
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
      description={FEATURES.natascha
        ? 'Alle Bereiche der App — vom ersten API-Schlüssel bis zum Closed Loop.'
        : 'Der Generator-only-Pilot — vom ersten API-Schlüssel bis zum fertigen Export.'}
      maxWidth={1200}
    >
      <div className="help-grid" style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Inhaltsverzeichnis (sticky) */}
        <nav className="help-toc" style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {AVAILABLE_SECTIONS.map((s) => {
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
          {AVAILABLE_SECTIONS.map((s) => (
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
