import type { ActiveView } from './types';

/** Arbeitsbereiche der Sidebar.
 *
 *  Der Schnitt ist **Erstellen vs. Bewerten**: „Unterricht" ist LUA (Material
 *  erzeugen und vorbereiten), „Korrekturen" ist der Korrektor (bewerten).
 *  Klassen und Schüler sind Teil des Korrektor-Moduls und stehen deshalb dort –
 *  als eigener Bereich wirkten sie wie ein drittes Werkzeug.
 *
 *  `planung` bleibt bewusst im Bereich Unterricht und **nicht** im NATASCHA-Gatter:
 *  Unterrichtsplanung ist LUA-eigen und funktioniert auch ohne Korrekturmodul.
 *
 *  `gruppen` ist optional: eine Fläche mit vielen Reitern (Bibliothek) wird sonst
 *  zu einem Regal. Statt einer einzigen Knopfzeile bekommt jede Gruppe eine eigene.
 *
 *  Die Korrekturen-Fläche nutzt zwei Gruppen, weil dort zwei verschiedene Fragen
 *  stehen: „was ist aus der Klasse herausgekommen" (Klassen, Korrektur, Schüler)
 *  und „was lege ich vorher fest" (Erwartungshorizont, Bewertungsraster).
 *  Erwartungshorizont und Bewertungsraster liegen darum in **verschiedenen** Tabs
 *  und nicht in einem: der Erwartungshorizont gilt für genau eine Aufgabe und wird
 *  bei jeder Änderung neu erzeugt, ein Bewertungsraster gilt für viele Aufgaben und
 *  wird gepflegt. Der Gültigkeitsbereich ist der Unterschied, nicht die Zugehörigkeit
 *  zum Korrekturthema.
 */
export interface WorkArea {
  label: string;
  view: ActiveView;
  views: ActiveView[];
  gruppen?: ActiveView[][];
}

export const WORK_AREAS: WorkArea[] = [
  { label: 'Start', view: 'dashboard', views: ['dashboard'] },
  { label: 'Unterricht', view: 'wizard', views: ['wizard', 'planung', 'kompetenz', 'quick'] },
  {
    label: 'Korrekturen',
    view: 'klassen',
    views: ['klassen', 'korrektur', 'schueler', 'erwartungshorizont', 'bewertungsraster'],
    gruppen: [
      ['klassen', 'korrektur', 'schueler'],
      ['erwartungshorizont', 'bewertungsraster'],
    ],
  },
  {
    label: 'Bibliothek',
    view: 'documents',
    views: ['documents', 'pool', 'templates', 'favorites', 'history', 'trash'],
    gruppen: [
      ['documents', 'pool', 'templates', 'favorites'],
      ['history', 'trash'],
    ],
  },
];

export function workArea(view: ActiveView): WorkArea | undefined {
  return WORK_AREAS.find(area => area.views.includes(view));
}

/** Reiter-Zeilen einer Fläche: entweder eine oder mehrere Gruppen. */
export function workAreaGruppen(area: WorkArea): ActiveView[][] {
  return area.gruppen ?? [area.views];
}
