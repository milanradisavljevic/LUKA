import type { ActiveView } from './types';

/** Arbeitsbereiche der Sidebar.
 *
 *  Klassen sind der gemeinsame Kontext für Planung, Schülerzuordnung und
 *  Lernverlauf. Sie stehen deshalb unabhängig von den Korrekturen als eigener
 *  Arbeitsbereich zur Verfügung.
 *
 *  `planung` bleibt bewusst im Bereich Unterricht und **nicht** im NATASCHA-Gatter:
 *  Unterrichtsplanung ist LUA-eigen und funktioniert auch ohne Korrekturmodul.
 *
 *  `gruppen` ist optional: eine Fläche mit vielen Reitern (Bibliothek) wird sonst
 *  zu einem Regal. Statt einer einzigen Knopfzeile bekommt jede Gruppe eine eigene.
 *
 *  Die Korrekturen-Fläche nutzt zwei Gruppen, weil dort zwei verschiedene Fragen
 *  stehen: „was ist aus der Klasse herausgekommen" (Korrektur) und „was lege ich
 *  vorher fest" (Erwartungshorizont, Bewertungsraster).
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
  { label: 'Unterricht', view: 'wizard', views: ['wizard', 'planung', 'kompetenz', 'quick', 'ib'] },
  { label: 'Klassen', view: 'klassen', views: ['klassen', 'schueler'] },
  {
    label: 'Korrekturen',
    view: 'korrektur',
    views: ['korrektur', 'erwartungshorizont', 'bewertungsraster'],
    gruppen: [
      ['korrektur'],
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
