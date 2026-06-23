import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Ethik — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['ethik'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Ethik ${stufe} — nicht offiziell zitiert`;

export const ethikDeskriptoren: Deskriptor[] = [
  // Wahrnehmen & Beschreiben — Unterstufe
  { id: 'at-et-un-wahr-1', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'unterstufe', bereich: 'Wahrnehmen & Beschreiben', code: '', text: 'Die Schülerinnen können ethische Fragen im Alltag wahrnehmen und beschreiben.', quelle: Q('Unterstufe') },
  { id: 'at-et-un-wahr-2', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'unterstufe', bereich: 'Wahrnehmen & Beschreiben', code: '', text: 'Die Schülerinnen können unterschiedliche Handlungsoptionen bei moralischen Dilemmata benennen.', quelle: Q('Unterstufe') },
  // Wahrnehmen & Beschreiben — Oberstufe
  { id: 'at-et-ob-wahr-1', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'oberstufe', bereich: 'Wahrnehmen & Beschreiben', code: '', text: 'Die Schülerinnen können komplexe ethische Konflikte in Gesellschaft, Wissenschaft und Politik beschreiben.', quelle: Q('Oberstufe') },
  { id: 'at-et-ob-wahr-2', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'oberstufe', bereich: 'Wahrnehmen & Beschreiben', code: '', text: 'Die Schülerinnen können die Interessen, Werte und Normen unterschiedlicher Akteure in ethischen Konflikten erfassen.', quelle: Q('Oberstufe') },

  // Analysieren & Argumentieren — Unterstufe
  { id: 'at-et-un-ana-1', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'unterstufe', bereich: 'Analysieren & Argumentieren', code: '', text: 'Die Schülerinnen können einfache ethische Argumente erkennen und nachvollziehen.', quelle: Q('Unterstufe') },
  { id: 'at-et-un-ana-2', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'unterstufe', bereich: 'Analysieren & Argumentieren', code: '', text: 'Die Schülerinnen können Vor- und Nachteile ethischer Handlungsoptionen abwägen.', quelle: Q('Unterstufe') },
  // Analysieren & Argumentieren — Oberstufe
  { id: 'at-et-ob-ana-1', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'oberstufe', bereich: 'Analysieren & Argumentieren', code: '', text: 'Die Schülerinnen können ethische Argumentationen nachvollziehen, ihre Prämissen prüfen und Schwachstellen erkennen.', quelle: Q('Oberstufe') },
  { id: 'at-et-ob-ana-2', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'oberstufe', bereich: 'Analysieren & Argumentieren', code: '', text: 'Die Schülerinnen können eigene ethische Positionen begründet und stringently vertreten.', quelle: Q('Oberstufe') },

  // Urteilen & Reflektieren — Unterstufe
  { id: 'at-et-un-urteil-1', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'unterstufe', bereich: 'Urteilen & Reflektieren', code: '', text: 'Die Schülerinnen können zu einfachen ethischen Fragen ein begründetes Urteil fällen.', quelle: Q('Unterstufe') },
  { id: 'at-et-un-urteil-2', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'unterstufe', bereich: 'Urteilen & Reflektieren', code: '', text: 'Die Schülerinnen können eigene Werte und deren Einfluss auf Entscheidungen reflektieren.', quelle: Q('Unterstufe') },
  // Urteilen & Reflektieren — Oberstufe
  { id: 'at-et-ob-urteil-1', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'oberstufe', bereich: 'Urteilen & Reflektieren', code: '', text: 'Die Schülerinnen können komplexe ethische Urteile unter Berücksichtigung unterschiedlicher Moraltheorien fällen.', quelle: Q('Oberstufe') },
  { id: 'at-et-ob-urteil-2', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'oberstufe', bereich: 'Urteilen & Reflektieren', code: '', text: 'Die Schülerinnen können die Grenzen eigener und gesellschaftlicher Urteilsfähigkeit reflektieren.', quelle: Q('Oberstufe') },

  // Perspektivenwechsel — Unterstufe
  { id: 'at-et-un-persp-1', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'unterstufe', bereich: 'Perspektivenwechsel', code: '', text: 'Die Schülerinnen können sich in die Situation anderer Personen hineinversetzen und deren Gefühle erkennen.', quelle: Q('Unterstufe') },
  { id: 'at-et-un-persp-2', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'unterstufe', bereich: 'Perspektivenwechsel', code: '', text: 'Die Schülerinnen können unterschiedliche Standpunkte zu einer ethischen Frage respektvoll darstellen.', quelle: Q('Unterstufe') },
  // Perspektivenwechsel — Oberstufe
  { id: 'at-et-ob-persp-1', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'oberstufe', bereich: 'Perspektivenwechsel', code: '', text: 'Die Schülerinnen können kulturelle, religiöse und weltanschauliche Perspektiven in ethischen Diskursen einholen.', quelle: Q('Oberstufe') },
  { id: 'at-et-ob-persp-2', rahmenwerk: 'at-lehrplan', fach: 'ethik', stufe: 'oberstufe', bereich: 'Perspektivenwechsel', code: '', text: 'Die Schülerinnen können Diskriminierung, Vorurteile und gruppenbezogene Menschenfeindlichkeit erkennen und entgegentreten.', quelle: Q('Oberstufe') },
];

export const ethikStoffItems: StoffItem[] = [
  // Wahrnehmen & Beschreiben
  { id: 'et-alltag-un', rahmenwerk: 'at-lehrplan', titel: 'Ethische Fragen im Alltag', fach: 'ethik', stufe: 'unterstufe', kategorie: 'Wahrnehmen & Beschreiben', deskriptorIds: ['at-et-un-wahr-1', 'at-et-un-wahr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'multipleChoice'] },
  { id: 'et-konflikte-ob', rahmenwerk: 'at-lehrplan', titel: 'Komplexe ethische Konflikte', fach: 'ethik', stufe: 'oberstufe', kategorie: 'Wahrnehmen & Beschreiben', deskriptorIds: ['at-et-ob-wahr-1', 'at-et-ob-wahr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Analysieren & Argumentieren
  { id: 'et-abwaegung-un', rahmenwerk: 'at-lehrplan', titel: 'Argumente erkennen und abwägen', fach: 'ethik', stufe: 'unterstufe', kategorie: 'Analysieren & Argumentieren', deskriptorIds: ['at-et-un-ana-1', 'at-et-un-ana-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'multipleChoice'] },
  { id: 'et-argumentation-ob', rahmenwerk: 'at-lehrplan', titel: 'Ethische Argumentation analysieren und vertreten', fach: 'ethik', stufe: 'oberstufe', kategorie: 'Analysieren & Argumentieren', deskriptorIds: ['at-et-ob-ana-1', 'at-et-ob-ana-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'roleplay'] },
  // Urteilen & Reflektieren
  { id: 'et-urteil-un', rahmenwerk: 'at-lehrplan', titel: 'Begründete Urteile fällen', fach: 'ethik', stufe: 'unterstufe', kategorie: 'Urteilen & Reflektieren', deskriptorIds: ['at-et-un-urteil-1', 'at-et-un-urteil-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'multipleChoice'] },
  { id: 'et-moraltheorien-ob', rahmenwerk: 'at-lehrplan', titel: 'Moraltheorien und Urteilsfähigkeit', fach: 'ethik', stufe: 'oberstufe', kategorie: 'Urteilen & Reflektieren', deskriptorIds: ['at-et-ob-urteil-1', 'at-et-ob-urteil-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Perspektivenwechsel
  { id: 'et-perspektive-un', rahmenwerk: 'at-lehrplan', titel: 'Sich in andere hineinversetzen', fach: 'ethik', stufe: 'unterstufe', kategorie: 'Perspektivenwechsel', deskriptorIds: ['at-et-un-persp-1', 'at-et-un-persp-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  { id: 'et-vielfalt-ob', rahmenwerk: 'at-lehrplan', titel: 'Kulturelle Perspektiven und Diskriminierung', fach: 'ethik', stufe: 'oberstufe', kategorie: 'Perspektivenwechsel', deskriptorIds: ['at-et-ob-persp-1', 'at-et-ob-persp-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
];
