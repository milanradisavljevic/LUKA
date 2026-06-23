import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Geschichte — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['geschichte'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Geschichte ${stufe} — nicht offiziell zitiert`;

export const geschichteDeskriptoren: Deskriptor[] = [
  // Historische Fragekompetenz — Unterstufe
  { id: 'at-ge-un-frage-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Historische Fragekompetenz', code: '', text: 'Die Schülerinnen können historische Fragen formulieren und nach passenden Quellen sowie Darstellungen suchen.', quelle: Q('Unterstufe') },
  { id: 'at-ge-un-frage-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Historische Fragekompetenz', code: '', text: 'Die Schülerinnen können einfache historische Sachverhalte erklären und in Frage stellen.', quelle: Q('Unterstufe') },
  // Historische Fragekompetenz — Oberstufe
  { id: 'at-ge-ob-frage-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Historische Fragekompetenz', code: '', text: 'Die Schülerinnen können komplexe historische Fragestellungen entwickeln und operationalisieren.', quelle: Q('Oberstufe') },
  { id: 'at-ge-ob-frage-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Historische Fragekompetenz', code: '', text: 'Die Schülerinnen können historische Probleme mehrdimensional formulieren und Forschungshypothesen aufstellen.', quelle: Q('Oberstufe') },

  // Historische Methodenkompetenz — Unterstufe
  { id: 'at-ge-un-meth-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Historische Methodenkompetenz', code: '', text: 'Die Schülerinnen können einfache Quellen erschließen und Informationen daraus entnehmen.', quelle: Q('Unterstufe') },
  { id: 'at-ge-un-meth-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Historische Methodenkompetenz', code: '', text: 'Die Schülerinnen können Quellen und Darstellungen unterscheiden und ihre Bedeutung für die Geschichtswissenschaft erkennen.', quelle: Q('Unterstufe') },
  // Historische Methodenkompetenz — Oberstufe
  { id: 'at-ge-ob-meth-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Historische Methodenkompetenz', code: '', text: 'Die Schülerinnen können Quellen kritisch analysieren, ihren Entstehungszusammenhang rekonstruieren und Tendenz erfassen.', quelle: Q('Oberstufe') },
  { id: 'at-ge-ob-meth-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Historische Methodenkompetenz', code: '', text: 'Die Schülerinnen können historische Darstellungen vergleichen, widersprüchliche Deutungen erkennen und begründet bewerten.', quelle: Q('Oberstufe') },

  // Historische Orientierungskompetenz — Unterstufe
  { id: 'at-ge-un-orient-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Historische Orientierungskompetenz', code: '', text: 'Die Schülerinnen können Ereignisse in Zeit und Raum einordnen und historische Zeitrechnungen anwenden.', quelle: Q('Unterstufe') },
  { id: 'at-ge-un-orient-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Historische Orientierungskompetenz', code: '', text: 'Die Schülerinnen können Zusammenhänge zwischen Vergangenheit und Gegenwart herstellen.', quelle: Q('Unterstufe') },
  // Historische Orientierungskompetenz — Oberstufe
  { id: 'at-ge-ob-orient-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Historische Orientierungskompetenz', code: '', text: 'Die Schülerinnen können langfristige Entwicklungen, Kontinuitäten und Brüche identifizieren und einordnen.', quelle: Q('Oberstufe') },
  { id: 'at-ge-ob-orient-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Historische Orientierungskompetenz', code: '', text: 'Die Schülerinnen können historische Prozesse in lokale, nationale und globale Zusammenhänge stellen.', quelle: Q('Oberstufe') },

  // Historische Sachkompetenz — Unterstufe
  { id: 'at-ge-un-sach-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Historische Sachkompetenz', code: '', text: 'Die Schülerinnen können grundlegende historische Fakten, Begriffe und Zusammenhänge wiedergeben.', quelle: Q('Unterstufe') },
  { id: 'at-ge-un-sach-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Historische Sachkompetenz', code: '', text: 'Die Schülerinnen können wichtige Personen, Ereignisse und Epochen der österreichischen und europäischen Geschichte nennen.', quelle: Q('Unterstufe') },
  // Historische Sachkompetenz — Oberstufe
  { id: 'at-ge-ob-sach-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Historische Sachkompetenz', code: '', text: 'Die Schülerinnen können historische Sachverhalte vergleichen, vernetzen und in übergeordnete Interpretationsrahmen einordnen.', quelle: Q('Oberstufe') },
  { id: 'at-ge-ob-sach-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Historische Sachkompetenz', code: '', text: 'Die Schülerinnen können historische Begriffe präzise definieren und kontextspezifisch anwenden.', quelle: Q('Oberstufe') },

  // Politische Bildung — Unterstufe
  { id: 'at-ge-un-pol-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Politische Bildung', code: '', text: 'Die Schülerinnen können demokratische Werte und Menschenrechte als Ergebnis historischer Auseinandersetzungen erkennen.', quelle: Q('Unterstufe') },
  { id: 'at-ge-un-pol-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'unterstufe', bereich: 'Politische Bildung', code: '', text: 'Die Schülerinnen können die Bedeutung von Partizipation und Mitverantwortung in einer Demokratie beschreiben.', quelle: Q('Unterstufe') },
  // Politische Bildung — Oberstufe
  { id: 'at-ge-ob-pol-1', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Politische Bildung', code: '', text: 'Die Schülerinnen können historische Wurzeln aktueller politischer Konflikte und Institutionen analysieren.', quelle: Q('Oberstufe') },
  { id: 'at-ge-ob-pol-2', rahmenwerk: 'at-lehrplan', fach: 'geschichte', stufe: 'oberstufe', bereich: 'Politische Bildung', code: '', text: 'Die Schülerinnen können aus historischer Perspektive zu aktuellen gesellschaftspolitischen Fragen argumentieren.', quelle: Q('Oberstufe') },
];

export const geschichteStoffItems: StoffItem[] = [
  // Historische Fragekompetenz
  { id: 'ge-frage-un', rahmenwerk: 'at-lehrplan', titel: 'Historische Fragen formulieren', fach: 'geschichte', stufe: 'unterstufe', kategorie: 'Historische Fragekompetenz', deskriptorIds: ['at-ge-un-frage-1', 'at-ge-un-frage-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  { id: 'ge-frage-ob', rahmenwerk: 'at-lehrplan', titel: 'Komplexe Fragestellungen entwickeln', fach: 'geschichte', stufe: 'oberstufe', kategorie: 'Historische Fragekompetenz', deskriptorIds: ['at-ge-ob-frage-1', 'at-ge-ob-frage-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Historische Methodenkompetenz
  { id: 'ge-quellen-un', rahmenwerk: 'at-lehrplan', titel: 'Einfache Quellen erschließen', fach: 'geschichte', stufe: 'unterstufe', kategorie: 'Historische Methodenkompetenz', deskriptorIds: ['at-ge-un-meth-1', 'at-ge-un-meth-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  { id: 'ge-quellenanalyse-ob', rahmenwerk: 'at-lehrplan', titel: 'Quellenkritische Analyse', fach: 'geschichte', stufe: 'oberstufe', kategorie: 'Historische Methodenkompetenz', deskriptorIds: ['at-ge-ob-meth-1', 'at-ge-ob-meth-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Historische Orientierungskompetenz
  { id: 'ge-zeit-raum-un', rahmenwerk: 'at-lehrplan', titel: 'Ereignisse in Zeit und Raum einordnen', fach: 'geschichte', stufe: 'unterstufe', kategorie: 'Historische Orientierungskompetenz', deskriptorIds: ['at-ge-un-orient-1', 'at-ge-un-orient-2'], defaultAufgabentypen: ['kategorisierung', 'multipleChoice'] },
  { id: 'ge-entwicklungen-ob', rahmenwerk: 'at-lehrplan', titel: 'Kontinuitäten und Brüche', fach: 'geschichte', stufe: 'oberstufe', kategorie: 'Historische Orientierungskompetenz', deskriptorIds: ['at-ge-ob-orient-1', 'at-ge-ob-orient-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'multipleChoice'] },
  // Historische Sachkompetenz
  { id: 'ge-epochen-un', rahmenwerk: 'at-lehrplan', titel: 'Personen, Ereignisse, Epochen', fach: 'geschichte', stufe: 'unterstufe', kategorie: 'Historische Sachkompetenz', deskriptorIds: ['at-ge-un-sach-1', 'at-ge-un-sach-2'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'ge-begriffe-ob', rahmenwerk: 'at-lehrplan', titel: 'Historische Begriffe und Vernetzung', fach: 'geschichte', stufe: 'oberstufe', kategorie: 'Historische Sachkompetenz', deskriptorIds: ['at-ge-ob-sach-1', 'at-ge-ob-sach-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  // Politische Bildung
  { id: 'ge-demokratie-un', rahmenwerk: 'at-lehrplan', titel: 'Demokratie und Menschenrechte', fach: 'geschichte', stufe: 'unterstufe', kategorie: 'Politische Bildung', deskriptorIds: ['at-ge-un-pol-1', 'at-ge-un-pol-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  { id: 'ge-aktuelles-ob', rahmenwerk: 'at-lehrplan', titel: 'Historische Wurzeln aktueller Politik', fach: 'geschichte', stufe: 'oberstufe', kategorie: 'Politische Bildung', deskriptorIds: ['at-ge-ob-pol-1', 'at-ge-ob-pol-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
];
