import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Psychologie — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['psychologie'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Psychologie ${stufe} — nicht offiziell zitiert`;

export const psychologieDeskriptoren: Deskriptor[] = [
  // Fachwissen — Unterstufe
  { id: 'at-psy-un-wiss-1', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'unterstufe', bereich: 'Fachwissen', code: '', text: 'Die Schülerinnen können grundlegende Begriffe, Methoden und Modelle der Psychologie wiedergeben.', quelle: Q('Unterstufe') },
  { id: 'at-psy-un-wiss-2', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'unterstufe', bereich: 'Fachwissen', code: '', text: 'Die Schülerinnen können zentrale Theorien aus Entwicklungs-, Lern- und Sozialpsychologie beschreiben.', quelle: Q('Unterstufe') },
  // Fachwissen — Oberstufe
  { id: 'at-psy-ob-wiss-1', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'oberstufe', bereich: 'Fachwissen', code: '', text: 'Die Schülerinnen können psychologische Theorien, Studien und deren Erkenntnisse differenziert darstellen.', quelle: Q('Oberstufe') },
  { id: 'at-psy-ob-wiss-2', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'oberstufe', bereich: 'Fachwissen', code: '', text: 'Die Schülerinnen können Fachwissen aus verschiedenen psychologischen Teilgebieten integrieren.', quelle: Q('Oberstufe') },

  // Methoden- & Erkenntniskompetenz — Unterstufe
  { id: 'at-psy-un-meth-1', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'unterstufe', bereich: 'Methoden- & Erkenntniskompetenz', code: '', text: 'Die Schülerinnen können einfache Forschungsmethoden der Psychologie unterscheiden und beschreiben.', quelle: Q('Unterstufe') },
  { id: 'at-psy-un-meth-2', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'unterstufe', bereich: 'Methoden- & Erkenntniskompetenz', code: '', text: 'Die Schülerinnen können psychologische Studien kritisch betrachten und Stärken sowie Grenzen erkennen.', quelle: Q('Unterstufe') },
  // Methoden- & Erkenntniskompetenz — Oberstufe
  { id: 'at-psy-ob-meth-1', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'oberstufe', bereich: 'Methoden- & Erkenntniskompetenz', code: '', text: 'Die Schülerinnen können quantitative und qualitative Forschungsmethoden auswählen und begründen.', quelle: Q('Oberstufe') },
  { id: 'at-psy-ob-meth-2', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'oberstufe', bereich: 'Methoden- & Erkenntniskompetenz', code: '', text: 'Die Schülerinnen können psychologische Studien nach wissenschaftlichen Kriterien evaluieren und eigene Fragestellungen entwickeln.', quelle: Q('Oberstufe') },

  // Reflexions- & Urteilskompetenz — Unterstufe
  { id: 'at-psy-un-refl-1', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'unterstufe', bereich: 'Reflexions- & Urteilskompetenz', code: '', text: 'Die Schülerinnen können psychologisches Wissen auf das eigene Erleben und Verhalten beziehen.', quelle: Q('Unterstufe') },
  { id: 'at-psy-un-refl-2', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'unterstufe', bereich: 'Reflexions- & Urteilskompetenz', code: '', text: 'Die Schülerinnen können psychologische Phänomene alltagssprachlich und fachsprachlich unterscheiden.', quelle: Q('Unterstufe') },
  // Reflexions- & Urteilskompetenz — Oberstufe
  { id: 'at-psy-ob-refl-1', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'oberstufe', bereich: 'Reflexions- & Urteilskompetenz', code: '', text: 'Die Schülerinnen können psychologisches Wissen kritisch reflektieren und ethische Implikationen einschätzen.', quelle: Q('Oberstufe') },
  { id: 'at-psy-ob-refl-2', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'oberstufe', bereich: 'Reflexions- & Urteilskompetenz', code: '', text: 'Die Schülerinnen können fachlich fundierte Urteile zu psychologischen Fragestellungen bilden und begründen.', quelle: Q('Oberstufe') },

  // Anwendung & Transfer — Unterstufe
  { id: 'at-psy-un-trans-1', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'unterstufe', bereich: 'Anwendung & Transfer', code: '', text: 'Die Schülerinnen können psychologisches Wissen auf alltägliche Situationen anwenden.', quelle: Q('Unterstufe') },
  { id: 'at-psy-un-trans-2', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'unterstufe', bereich: 'Anwendung & Transfer', code: '', text: 'Die Schülerinnen können einfache Strategien zur Stressbewältigung und Kommunikation beschreiben.', quelle: Q('Unterstufe') },
  // Anwendung & Transfer — Oberstufe
  { id: 'at-psy-ob-trans-1', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'oberstufe', bereich: 'Anwendung & Transfer', code: '', text: 'Die Schülerinnen können psychologische Erkenntnisse auf Bildung, Arbeit, Gesundheit und Gesellschaft transferieren.', quelle: Q('Oberstufe') },
  { id: 'at-psy-ob-trans-2', rahmenwerk: 'at-lehrplan', fach: 'psychologie', stufe: 'oberstufe', bereich: 'Anwendung & Transfer', code: '', text: 'Die Schülerinnen können evidenzbasierte Interventionen und Handlungsempfehlungen entwickeln.', quelle: Q('Oberstufe') },
];

export const psychologieStoffItems: StoffItem[] = [
  // Fachwissen
  { id: 'psy-grundlagen-un', rahmenwerk: 'at-lehrplan', titel: 'Grundlagen und Teilgebiete der Psychologie', fach: 'psychologie', stufe: 'unterstufe', kategorie: 'Fachwissen', deskriptorIds: ['at-psy-un-wiss-1', 'at-psy-un-wiss-2'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'psy-theorien-ob', rahmenwerk: 'at-lehrplan', titel: 'Theorien und Studien integrieren', fach: 'psychologie', stufe: 'oberstufe', kategorie: 'Fachwissen', deskriptorIds: ['at-psy-ob-wiss-1', 'at-psy-ob-wiss-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  // Methoden- & Erkenntniskompetenz
  { id: 'psy-methoden-un', rahmenwerk: 'at-lehrplan', titel: 'Forschungsmethoden kennen und kritisch betrachten', fach: 'psychologie', stufe: 'unterstufe', kategorie: 'Methoden- & Erkenntniskompetenz', deskriptorIds: ['at-psy-un-meth-1', 'at-psy-un-meth-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'psy-studien-ob', rahmenwerk: 'at-lehrplan', titel: 'Studien evaluieren und eigene Fragestellungen entwickeln', fach: 'psychologie', stufe: 'oberstufe', kategorie: 'Methoden- & Erkenntniskompetenz', deskriptorIds: ['at-psy-ob-meth-1', 'at-psy-ob-meth-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Reflexions- & Urteilskompetenz
  { id: 'psy-eigenes-erleben-un', rahmenwerk: 'at-lehrplan', titel: 'Psychologisches Wissen auf das eigene Erleben beziehen', fach: 'psychologie', stufe: 'unterstufe', kategorie: 'Reflexions- & Urteilskompetenz', deskriptorIds: ['at-psy-un-refl-1', 'at-psy-un-refl-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'multipleChoice'] },
  { id: 'psy-ethik-ob', rahmenwerk: 'at-lehrplan', titel: 'Kritische Reflexion und ethische Implikationen', fach: 'psychologie', stufe: 'oberstufe', kategorie: 'Reflexions- & Urteilskompetenz', deskriptorIds: ['at-psy-ob-refl-1', 'at-psy-ob-refl-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Anwendung & Transfer
  { id: 'psy-alltag-un', rahmenwerk: 'at-lehrplan', titel: 'Psychologie im Alltag anwenden', fach: 'psychologie', stufe: 'unterstufe', kategorie: 'Anwendung & Transfer', deskriptorIds: ['at-psy-un-trans-1', 'at-psy-un-trans-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'multipleChoice'] },
  { id: 'psy-gesellschaft-ob', rahmenwerk: 'at-lehrplan', titel: 'Transfer auf Bildung, Arbeit, Gesundheit und Gesellschaft', fach: 'psychologie', stufe: 'oberstufe', kategorie: 'Anwendung & Transfer', deskriptorIds: ['at-psy-ob-trans-1', 'at-psy-ob-trans-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
];
