/**
 * Die Arbeitsbereiche der Sidebar.
 *
 * Die Aufteilung ist eine **Aussage**, keine Geschmacksfrage: „Unterricht" ist
 * LUA, „Korrekturen" ist der Korrektor. Deshalb stehen Klassen und Schüler
 * unter den Korrekturen – dort wird klassenbezogen gearbeitet.
 *
 * Vorher stand hier nichts. Ein Fehler in dieser Liste fällt sofort auf: eine
 * Ansicht, die in keinem Bereich steht, ist aus der Sidebar nicht erreichbar,
 * und eine Ansicht in zwei Bereichen bekommt zwei aktive Knöpfe.
 */
import { describe, expect, it } from 'vitest';
import { WORK_AREAS, workArea, workAreaGruppen, type WorkArea } from './workNavigation';
import { NAV_TARGETS } from './navigation';
import type { ActiveView } from './types';

/** Alle Ansichten, die die Sidebar kennt. */
const ALLE_ANSICHTEN: ActiveView[] = [
  'dashboard', 'wizard', 'planung', 'kompetenz', 'quick',
  'klassen', 'korrektur', 'schueler', 'erwartungshorizont',
  'documents', 'pool', 'templates', 'favorites', 'history', 'trash',
  'settings', 'help',
];

/** Ansichten, die nur in der Sidebar-Unterzeile stehen (kein Arbeitsbereich). */
const KEIN_BEREICH = new Set<ActiveView>(['settings', 'help']);

describe('workNavigation — Zuordnung der Ansichten', () => {
  it('gibt jeder Ansicht genau einen Bereich', () => {
    const mehrfach: string[] = [];
    for (const view of ALLE_ANSICHTEN) {
      const treffer = WORK_AREAS.filter((a) => a.views.includes(view));
      if (treffer.length > 1) mehrfach.push(`${view} → ${treffer.map((t) => t.label).join(', ')}`);
    }
    // Zwei aktive Knöpfe in der Sidebar wären ein sichtbarer Fehler.
    expect(mehrfach, `Ansicht in mehreren Bereichen: ${mehrfach.join('; ')}`).toEqual([]);
  });

  it('lässt keine Ansicht außerhalb der Bereiche', () => {
    const verwaist = ALLE_ANSICHTEN.filter(
      (v) => !KEIN_BEREICH.has(v) && !WORK_AREAS.some((a) => a.views.includes(v)),
    );
    // Eine verwaiste Ansicht ist aus der Sidebar nicht erreichbar.
    expect(verwaist, `nicht in der Sidebar erreichbar: ${verwaist.join(', ')}`).toEqual([]);
  });

  it('findet zu jedem Ziel der Palette einen Bereich – außer Einstellungen und Hilfe', () => {
    for (const ziel of NAV_TARGETS) {
      const bereich = workArea(ziel.view);
      if (KEIN_BEREICH.has(ziel.view)) {
        expect(bereich, `${ziel.view} sollte kein Arbeitsbereich sein`).toBeUndefined();
      } else {
        expect(bereich, `Palette-Ziel ${ziel.view} (${ziel.label}) fehlt in der Sidebar`).toBeTruthy();
      }
    }
  });

  it('nennt für jeden Bereich sein Startziel selbst', () => {
    // `view` ist, was beim Klick auf den Bereich geöffnet wird – es muss also in
    // `views` stehen, sonst springt der Knopf in eine fremde Ansicht.
    for (const area of WORK_AREAS) {
      expect(area.views, `${area.label}: Startziel ${area.view} steht nicht in seinen Ansichten`)
        .toContain(area.view);
    }
  });
});

describe('workNavigation — die gewählte Aufteilung', () => {
  const label = (view: ActiveView) => workArea(view)?.label;

  it('stellt Klassen und Schüler zu den Korrekturen', () => {
    // Dort wird klassenbezogen gearbeitet; als eigener Bereich wirkten sie wie
    // ein drittes, eigenständiges Werkzeug.
    expect(label('klassen')).toBe('Korrekturen');
    expect(label('schueler')).toBe('Korrekturen');
    expect(label('korrektur')).toBe('Korrekturen');
    expect(label('erwartungshorizont')).toBe('Korrekturen');
  });

  it('hält die Unterrichtsplanung beim Erstellen, nicht beim Bewerten', () => {
    expect(label('planung')).toBe('Unterricht');
  });

  it('zeigt genau vier Bereichen – nicht fünf', () => {
    // Der fünfte war „Klassen" und ist in „Korrekturen" aufgegangen.
    expect(WORK_AREAS.map((a) => a.label)).toEqual(['Start', 'Unterricht', 'Korrekturen', 'Bibliothek']);
  });
});

describe('workNavigation — Reiter-Zeilen', () => {
  const bibliothek = WORK_AREAS.find((a) => a.label === 'Bibliothek') as WorkArea;
  const unterricht = WORK_AREAS.find((a) => a.label === 'Unterricht') as WorkArea;

  it('teilt die Bibliothek in zwei Reihen statt in ein Regal', () => {
    const gruppen = workAreaGruppen(bibliothek);
    expect(gruppen).toHaveLength(2);
    expect(gruppen[0]).toContain('documents');
    expect(gruppen[0]).toContain('pool');
    expect(gruppen[1]).toEqual(['history', 'trash']);
  });

  it('lässt keine Bibliothek-Ansicht zwischen den Reihen verschwinden', () => {
    // Sonst wäre eine Ansicht erreichbar, aber ohne Reiter.
    const flach = workAreaGruppen(bibliothek).flat();
    expect([...flach].sort()).toEqual([...bibliothek.views].sort());
  });

  it('gibt Bereichen ohne eigene Gruppen genau eine Reihe', () => {
    expect(workAreaGruppen(unterricht)).toEqual([unterricht.views]);
  });
});
