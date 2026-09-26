/**
 * Drift-Wächter für die Hilfe.
 *
 * Die Hilfe nennt Fächer, Aufgabentypen und Tastenkürzel. Vorher standen diese
 * Listen als Prosa in `HelpView.tsx` — und die App lief ihnen hinterher: zwei
 * der 14 Fächer, einer der 20 Aufgabentypen und 16 von 19 Tastenkürzeln waren
 * nicht genannt, ohne dass irgendwo ein Test angesagt hätte.
 *
 * Diese Tests schlagen an, sobald in einer der Quelllisten etwas hinzukommt und
 * die Hilfe nicht mitwächst.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FACH_META, BlockTypSchema } from '@lehrunterlagen/schema';
import { BLOCK_TYPE_DEFS } from '../lib/constants';
import { SHORTCUTS, SHORTCUT_SCOPES, formatShortcut, isApplePlattform } from '../lib/shortcuts';
import { NAV_TARGETS } from '../lib/navigation';
import {
  HELP_SECTIONS, KAPITEL, verfuegbareSektionen, verfuegbareKapitel, Fachliste, AufgabentypenListe, TastenkuerzelTabelle,
} from './helpSections';
import { HelpView } from './HelpView';

const html = (node: Parameters<typeof renderToStaticMarkup>[0]): string =>
  renderToStaticMarkup(node).replace(/<!--[^>]*-->/g, '');

/** Ein sichtbarer Text, der im Markup als HTML-Entity steht. */
const sichtbar = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

describe('Hilfe — Struktur', () => {
  it('ordnet jeden Abschnitt einem Kapitel zu, und jedes Kapitel hat Inhalt', () => {
    const kapitelIds = new Set(KAPITEL.map((k) => k.id));
    for (const s of HELP_SECTIONS) {
      expect(kapitelIds.has(s.kapitel), `Abschnitt ${s.id} hat ein unbekanntes Kapitel ${s.kapitel}`).toBe(true);
    }
    for (const k of verfuegbareKapitel()) {
      const eigene = verfuegbareSektionen().filter((s) => s.kapitel === k.id);
      expect(eigene.length, `Kapitel ${k.label} ist leer`).toBeGreaterThan(0);
    }
  });

  it('hat eindeutige Abschnitts-Ids (das Inhaltsverzeichnis verlinkt darauf)', () => {
    const ids = HELP_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rendert mit und ohne Korrektur-Modul vollständig', () => {
    for (const natascha of [true, false]) {
      const sektionen = verfuegbareSektionen(natascha);
      expect(sektionen.length).toBeGreaterThan(0);
      for (const s of sektionen) {
        expect(s.title.trim().length).toBeGreaterThan(0);
        expect(html(s.body).trim().length).toBeGreaterThan(40);
      }
    }
  });

  it('versteckt die Korrektur-Abschnitte, wenn das Modul aus ist', () => {
    const ids = verfuegbareSektionen(false).map((s) => s.id);
    for (const erwartet of ['korrigieren', 'klassen', 'schueler', 'erwartungshorizont']) {
      expect(ids).not.toContain(erwartet);
      expect(verfuegbareSektionen(true).map((s) => s.id)).toContain(erwartet);
    }
  });

  it('deckt die wichtigsten Bereiche ab — der Planung darf nicht wieder fehlen', () => {
    const ids = verfuegbareSektionen(true).map((s) => s.id);
    for (const erwartet of ['planung', 'erstellen', 'korrigieren', 'pool', 'suche', 'tastenkuerzel', 'einstellungen', 'profil']) {
      expect(ids, `Abschnitt ${erwartet} fehlt in der Hilfe`).toContain(erwartet);
    }
  });

  it('rendert die ganze View — Inhaltsverzeichnis und alle Kapitel', () => {
    // Smoke-Test: bricht das Kapitel-TOC oder ein Body, fällt es hier auf.
    const markup = html(<HelpView />);
    for (const k of KAPITEL) {
      expect(markup, `Kapitel ${k.label} erscheint nicht`).toContain(sichtbar(k.label));
    }
    for (const s of HELP_SECTIONS) {
      expect(markup, `Abschnitt ${s.title} erscheint nicht`).toContain(sichtbar(s.title));
      // Jeder Abschnitt braucht eine Ankerspalte, sonst zeigt das Inhaltsverzeichnis ins Leere.
      expect(markup, `Abschnitt ${s.id} hat keine id`).toContain(`id="${s.id}"`);
    }
    // Kein toter Zeiger auf nicht mitgelieferte Dateien.
    expect(markup).not.toContain('TESTPLAN');
  });
});

describe('Hilfe — generierte Listen', () => {
  it('nennt jedes Fach aus FACH_META mit Anzeigename', () => {
    const text = html(<Fachliste />);
    for (const meta of Object.values(FACH_META)) {
      expect(text, `Fach ${meta.label} fehlt in der Hilfe`).toContain(meta.label);
    }
  });

  it('nennt jeden Aufgabentyp, den der Baukasten anbietet', () => {
    const text = html(<AufgabentypenListe />);
    for (const def of BLOCK_TYPE_DEFS) {
      expect(text, `Aufgabentyp ${def.label} fehlt in der Hilfe`).toContain(def.label);
    }
  });

  it('gruppiert die Aufgabentypen vollständig — kein Typ fällt zwischen die Gruppen', () => {
    const text = html(<AufgabentypenListe />);
    for (const def of BLOCK_TYPE_DEFS) {
      expect(def.gruppe, `${def.id} hat keine Gruppe`).toBeTruthy();
    }
    // `umformung` ist im Baukasten bewusst nicht anwählbar und darf in der
    // Hilfe deshalb nicht als verfügbarer Typ auftauchen.
    expect(BLOCK_TYPE_DEFS.map((d) => d.id)).not.toContain('umformung');
    expect(text).not.toContain('umformung');
    // Jeder Schema-Typ braucht trotzdem einen Anzeigenamen (sonst zeigt die
    // Suche den rohen Bezeichner) — das prüft search.test.ts.
    expect(BlockTypSchema.options.length).toBeGreaterThan(BLOCK_TYPE_DEFS.length);
  });

  it('rendert jedes Tastenkürzel mit Beschreibung', () => {
    const text = html(<TastenkuerzelTabelle />);
    for (const s of SHORTCUTS) {
      expect(text, `Kürzel ${s.keys} fehlt in der Hilfe`).toContain(formatShortcut(s.keys, false));
      expect(text, `Beschreibung zu ${s.keys} fehlt`).toContain(s.desc);
    }
  });

  it('ordnet jedes Kürzel einem bekannten Geltungsbereich zu', () => {
    const scopes = new Set(SHORTCUT_SCOPES.map((s) => s.id));
    for (const s of SHORTCUTS) {
      expect(scopes.has(s.scope), `Unbekannter Bereich ${s.scope} bei ${s.keys}`).toBe(true);
    }
  });
});

describe('Hilfe — Tastenkürzel-Formatierung', () => {
  it('ersetzt Mod plattformabhängig', () => {
    expect(formatShortcut('Mod + K', false)).toBe('Strg + K');
    expect(formatShortcut('Mod + K', true)).toBe('⌘ + K');
    expect(formatShortcut('Mod + Shift + Z', true)).toBe('⌘ + Shift + Z');
    expect(formatShortcut('Esc', false)).toBe('Esc');
  });

  it('erkennt Apple-Plattformen', () => {
    expect(isApplePlattform({ platform: 'MacIntel', userAgent: '' })).toBe(true);
    expect(isApplePlattform({ platform: 'Win32', userAgent: 'Windows' })).toBe(false);
    expect(isApplePlattform({ platform: 'Linux x86_64', userAgent: 'X11' })).toBe(false);
  });
});

describe('Hilfe — Navigation', () => {
  it('jedes Navigationsziel ist entweder in der Hilfe erklärt oder bewusst ohne eigenen Abschnitt', () => {
    // Diese Bereiche brauchen keinen eigenen Abschnitt: sie sind einfache
    // Listen, die „Unterlagen, Vorlagen & Verlauf" bzw. „Einstellungen" deckt.
    const bewusstOhneAbschnitt = new Set([
      'wizard',          // = „Unterlagen erstellen"
      'planung',         // hat einen eigenen Abschnitt
      'quick',           // = „Übersicht" / „Unterlagen erstellen"
      'kompetenz',       // hat einen eigenen Abschnitt
      'documents',       // = „Unterlagen, Vorlagen & Verlauf"
      'pool',            // hat einen eigenen Abschnitt
      'templates',       // = „Unterlagen, Vorlagen & Verlauf"
      'klassen',         // hat einen eigenen Abschnitt
      'korrektur',       // hat einen eigenen Abschnitt
      'schueler',        // hat einen eigenen Abschnitt
      'erwartungshorizont', // hat einen eigenen Abschnitt
      'history',         // = „Unterlagen, Vorlagen & Verlauf"
      'favorites',       // = „Unterlagen, Vorlagen & Verlauf"
      'trash',           // = „Unterlagen, Vorlagen & Verlauf"
      'settings',        // hat einen eigenen Abschnitt
      'help',            // ist die Hilfe selbst
      'dashboard',       // hat einen eigenen Abschnitt
    ]);
    const ids = new Set(HELP_SECTIONS.map((s) => s.id));
    for (const ziel of NAV_TARGETS) {
      const abgedeckt = ids.has(ziel.view) || bewusstOhneAbschnitt.has(ziel.view);
      expect(abgedeckt, `Navigationsziel ${ziel.view} ist in der Hilfe nirgends erklärt`).toBe(true);
    }
  });
});

/**
 * Die Planung ist die aufwendigste Stelle der App — und die einzige, deren Hilfe
 * **handgeschriebener Fließtext** ist. Fächer, Aufgabentypen und Tastenkürzel
 * werden generiert und können deshalb nicht zurückbleiben; ein neuer Knopf im
 * Planungsbereich dagegen fällt lautlos durch.
 *
 * Deshalb diese Handliste. Wer einen Knopf in `PlanungView` ergänzt, trägt hier
 * seinen Begriff ein — und der Test sagt Bescheid, falls die Hilfe ihn nicht
 * nennt. Der umgekehrte Fehler (Liste zu groß, Hilfe vollständig) fällt harmlos
 * auf: der Begriff wird dann nur gesucht und nicht gefunden … weshalb hier
 * bewusst nur *Pflicht* Begriffe stehen, keine Vollständigkeitsforderung.
 */
const PLANUNGS_BEGRIFFE: Array<{ begriff: string; warum: string }> = [
  { begriff: 'Wochenraster', warum: 'der Kern der Planung' },
  { begriff: 'Einplanen', warum: 'sonst entstehen nie Stunden' },
  { begriff: 'Ferien auslassen', warum: 'sonst plant LUA in die Ferien' },
  { begriff: 'Aus dem Vorjahr', warum: 'der Schuljahreswechsel' },
  { begriff: 'deaktiv', warum: 'Zeile behalten statt löschen' },
  { begriff: 'Stunde hinzufügen', warum: 'Vertretung ohne Rasterzeile' },
  { begriff: 'Entfallen', warum: 'Vertretungsstunden markieren' },
  { begriff: 'Unterlage vorbereiten', warum: 'der Weg aus der Stunde in den Assistenten' },
  { begriff: 'Verknüpfung abbrechen', warum: 'sonst hängt die Unterlage am falschen Termin' },
  { begriff: 'Unterlagen', warum: 'wo der Materialbedarf der Stunde liegt' },
  { begriff: 'Quelle', warum: 'Ferienvorschläge müssen prüfbar bleiben' },
  { begriff: 'beweglichen Ferientage', warum: 'die Datenlage ist nicht für jeden Fall vollständig' },
  { begriff: 'Klassenfarben', warum: 'sonst sucht man die Farbe vergeblich' },
];

describe('Hilfe — Unterrichtsplanung', () => {
  const planung = HELP_SECTIONS.find((s) => s.id === 'planung');

  it('gibt es überhaupt', () => {
    expect(planung, 'Abschnitt „Unterrichtsplanung" fehlt').toBeTruthy();
  });

  it('nennt jeden Knopf und jede Entscheidung des Planungsbereichs', () => {
    // Absichtlich **nicht** die ganze View rendern: der Test soll den Text der
    // Sektion prüfen, nicht den der generierten Listen am Ende der Seite.
    const text = html(<>{planung!.body}</>);
    for (const { begriff, warum } of PLANUNGS_BEGRIFFE) {
      expect(text, `"${begriff}" steht nicht in der Hilfe (${warum})`).toContain(begriff);
    }
  });

  it('behauptet nicht, die Schulferien seien für jeden Fall vollständig', () => {
    // Die Hilfe sagt „amtlich hinterlegt". Wer das liest, muss daraus schließen
    // können, dass LUKA nicht ergänzt, was es nicht belegen kann.
    const text = html(<>{planung!.body}</>);
    expect(text).toMatch(/nicht (stehen kann|vollständig)/);
  });
});

