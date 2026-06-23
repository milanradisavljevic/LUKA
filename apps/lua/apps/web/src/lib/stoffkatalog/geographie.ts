import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Geographie — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['geographie'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Geographie ${stufe} — nicht offiziell zitiert`;

export const geographieDeskriptoren: Deskriptor[] = [
  // Wahrnehmungs- & Orientierungskompetenz — Unterstufe
  { id: 'at-gw-un-wahr-1', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'unterstufe', bereich: 'Wahrnehmungs- & Orientierungskompetenz', code: '', text: 'Die Schülerinnen können räumliche Strukturen und Prozesse in ihrer Umgebung wahrnehmen und beschreiben.', quelle: Q('Unterstufe') },
  { id: 'at-gw-un-wahr-2', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'unterstufe', bereich: 'Wahrnehmungs- & Orientierungskompetenz', code: '', text: 'Die Schülerinnen können einfache Karten, Atlanten und digitale Medien zur Orientierung nutzen.', quelle: Q('Unterstufe') },
  // Wahrnehmungs- & Orientierungskompetenz — Oberstufe
  { id: 'at-gw-ob-wahr-1', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'oberstufe', bereich: 'Wahrnehmungs- & Orientierungskompetenz', code: '', text: 'Die Schülerinnen können komplexe räumliche Zusammenhänge wahrnehmen, kartieren und interpretieren.', quelle: Q('Oberstufe') },
  { id: 'at-gw-ob-wahr-2', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'oberstufe', bereich: 'Wahrnehmungs- & Orientierungskompetenz', code: '', text: 'Die Schülerinnen können unterschiedliche Raumkonzepte (Lebensraum, Wirtschaftsraum, Kulturräume) unterscheiden.', quelle: Q('Oberstufe') },

  // Methodenkompetenz — Unterstufe
  { id: 'at-gw-un-meth-1', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'unterstufe', bereich: 'Methodenkompetenz', code: '', text: 'Die Schülerinnen können geographische Informationen aus Karten, Diagrammen und Texten entnehmen.', quelle: Q('Unterstufe') },
  { id: 'at-gw-un-meth-2', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'unterstufe', bereich: 'Methodenkompetenz', code: '', text: 'Die Schülerinnen können einfache geographische Arbeitstechniken (Kartenskizze, Profil) anwenden.', quelle: Q('Unterstufe') },
  // Methodenkompetenz — Oberstufe
  { id: 'at-gw-ob-meth-1', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'oberstufe', bereich: 'Methodenkompetenz', code: '', text: 'Die Schülerinnen können geographische Daten auswerten, visualisieren und kritisch hinterfragen.', quelle: Q('Oberstufe') },
  { id: 'at-gw-ob-meth-2', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'oberstufe', bereich: 'Methodenkompetenz', code: '', text: 'Die Schülerinnen können GIS-basierte und digitale Methoden zur Raumanalyse gezielt einsetzen.', quelle: Q('Oberstufe') },

  // Synthesekompetenz — Unterstufe
  { id: 'at-gw-un-syn-1', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'unterstufe', bereich: 'Synthesekompetenz', code: '', text: 'Die Schülerinnen können naturräumliche und gesellschaftliche Faktoren miteinander verknüpfen.', quelle: Q('Unterstufe') },
  { id: 'at-gw-un-syn-2', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'unterstufe', bereich: 'Synthesekompetenz', code: '', text: 'Die Schülerinnen können regionale Beispiele auf übergeordnete geographische Fragestellungen beziehen.', quelle: Q('Unterstufe') },
  // Synthesekompetenz — Oberstufe
  { id: 'at-gw-ob-syn-1', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'oberstufe', bereich: 'Synthesekompetenz', code: '', text: 'Die Schülerinnen können komplexe geographische Zusammenhänge systemisch analysieren und Modelle bilden.', quelle: Q('Oberstufe') },
  { id: 'at-gw-ob-syn-2', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'oberstufe', bereich: 'Synthesekompetenz', code: '', text: 'Die Schülerinnen können lokale, regionale und globale Raumprozesse miteinander in Beziehung setzen.', quelle: Q('Oberstufe') },

  // Wirtschaftliche Bildung — Unterstufe
  { id: 'at-gw-un-wirt-1', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'unterstufe', bereich: 'Wirtschaftliche Bildung', code: '', text: 'Die Schülerinnen können grundlegende wirtschaftliche Aktivitäten in Räumen erkennen und beschreiben.', quelle: Q('Unterstufe') },
  { id: 'at-gw-un-wirt-2', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'unterstufe', bereich: 'Wirtschaftliche Bildung', code: '', text: 'Die Schülerinnen können Zusammenhänge zwischen Standortfaktoren und wirtschaftlicher Tätigkeit herstellen.', quelle: Q('Unterstufe') },
  // Wirtschaftliche Bildung — Oberstufe
  { id: 'at-gw-ob-wirt-1', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'oberstufe', bereich: 'Wirtschaftliche Bildung', code: '', text: 'Die Schülerinnen können globale Wertschöpfungsketten, Handelsströme und deren sozioökonomische Folgen analysieren.', quelle: Q('Oberstufe') },
  { id: 'at-gw-ob-wirt-2', rahmenwerk: 'at-lehrplan', fach: 'geographie', stufe: 'oberstufe', bereich: 'Wirtschaftliche Bildung', code: '', text: 'Die Schülerinnen können nachhaltige wirtschaftliche Entwicklung aus geographischer Perspektive bewerten.', quelle: Q('Oberstufe') },
];

export const geographieStoffItems: StoffItem[] = [
  // Wahrnehmungs- & Orientierungskompetenz
  { id: 'gw-orientierung-un', rahmenwerk: 'at-lehrplan', titel: 'Karten lesen und orientieren', fach: 'geographie', stufe: 'unterstufe', kategorie: 'Wahrnehmungs- & Orientierungskompetenz', deskriptorIds: ['at-gw-un-wahr-1', 'at-gw-un-wahr-2'], defaultAufgabentypen: ['kategorisierung', 'multipleChoice'] },
  { id: 'gw-raumkonzepte-ob', rahmenwerk: 'at-lehrplan', titel: 'Raumkonzepte und Räume analysieren', fach: 'geographie', stufe: 'oberstufe', kategorie: 'Wahrnehmungs- & Orientierungskompetenz', deskriptorIds: ['at-gw-ob-wahr-1', 'at-gw-ob-wahr-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  // Methodenkompetenz
  { id: 'gw-kartenarbeit-un', rahmenwerk: 'at-lehrplan', titel: 'Karten- und Diagrammarbeit', fach: 'geographie', stufe: 'unterstufe', kategorie: 'Methodenkompetenz', deskriptorIds: ['at-gw-un-meth-1', 'at-gw-un-meth-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'gw-datenanalyse-ob', rahmenwerk: 'at-lehrplan', titel: 'Geographische Daten auswerten', fach: 'geographie', stufe: 'oberstufe', kategorie: 'Methodenkompetenz', deskriptorIds: ['at-gw-ob-meth-1', 'at-gw-ob-meth-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  // Synthesekompetenz
  { id: 'gw-natur-gesellschaft-un', rahmenwerk: 'at-lehrplan', titel: 'Naturräumliche und gesellschaftliche Faktoren verknüpfen', fach: 'geographie', stufe: 'unterstufe', kategorie: 'Synthesekompetenz', deskriptorIds: ['at-gw-un-syn-1', 'at-gw-un-syn-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  { id: 'gw-systemanalyse-ob', rahmenwerk: 'at-lehrplan', titel: 'Systemische Raumanalyse', fach: 'geographie', stufe: 'oberstufe', kategorie: 'Synthesekompetenz', deskriptorIds: ['at-gw-ob-syn-1', 'at-gw-ob-syn-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Wirtschaftliche Bildung
  { id: 'gw-wirtschaft-un', rahmenwerk: 'at-lehrplan', titel: 'Wirtschaftliche Aktivitäten in Räumen', fach: 'geographie', stufe: 'unterstufe', kategorie: 'Wirtschaftliche Bildung', deskriptorIds: ['at-gw-un-wirt-1', 'at-gw-un-wirt-2'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'gw-globalisierung-ob', rahmenwerk: 'at-lehrplan', titel: 'Globale Wertschöpfungsketten und Nachhaltigkeit', fach: 'geographie', stufe: 'oberstufe', kategorie: 'Wirtschaftliche Bildung', deskriptorIds: ['at-gw-ob-wirt-1', 'at-gw-ob-wirt-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
];
