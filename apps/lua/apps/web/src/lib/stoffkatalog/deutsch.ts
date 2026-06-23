import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Deutsch — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['deutsch'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

export const deutschDeskriptoren: Deskriptor[] = [
  // Deutsch Unterstufe
  { id: 'at-de-un-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können die wichtigsten Zeitformen (Präsens, Präteritum, Perfekt) unterscheiden und richtig bilden.', quelle: '' },
  { id: 'at-de-un-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Satzglieder (Subjekt, Prädikat, Akkusativ-/Dativobjekt) erkennen und bestimmen.', quelle: '' },
  { id: 'at-de-un-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können die wichtigsten Wortarten (Nomen, Verb, Adjektiv, Adverb, Pronomen) bestimmen.', quelle: '' },
  { id: 'at-de-un-gramm-4', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können einfache Kommasetzungsregeln (Haupt- und Nebensatz, Aufzählung) anwenden.', quelle: '' },
  { id: 'at-de-un-gramm-5', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Aktiv- und Passivsätze unterscheiden und einfache Passivformen bilden.', quelle: '' },
  // Deutsch Oberstufe
  { id: 'at-de-ob-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Tempus und Modus (Indikativ, Konjunktiv I und II) sicher unterscheiden und gezielt einsetzen.', quelle: '' },
  { id: 'at-de-ob-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Konjunktiv I und II in der indirekten Rede und in irreale Bedingungssätzen anwenden.', quelle: '' },
  { id: 'at-de-ob-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können komplexe Kommasetzungsregeln (Nebensätze, Infinitivkonstruktionen, Einschübe) korrekt anwenden.', quelle: '' },
  { id: 'at-de-ob-gramm-4', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Satzglieder und Satzgefüge analysieren sowie Syntax-Fehler begründen.', quelle: '' },
  { id: 'at-de-ob-gramm-5', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Wortarten und Wortbildung im Kontext grammatisch reflektieren und terminologisch benennen.', quelle: '' },
];

export const deutschStoffItems: StoffItem[] = [
  // Deutsch Unterstufe
  { id: 'de-zeiten-un', rahmenwerk: 'at-lehrplan', titel: 'Zeiten (Präsens, Präteritum, Perfekt)', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-un-gramm-1'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
  { id: 'de-satzglieder-un', rahmenwerk: 'at-lehrplan', titel: 'Satzglieder', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-un-gramm-2'], defaultAufgabentypen: ['kategorisierung', 'multipleChoice', 'markieraufgabe'] },
  { id: 'de-wortarten-un', rahmenwerk: 'at-lehrplan', titel: 'Wortarten', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-un-gramm-3'], defaultAufgabentypen: ['kategorisierung', 'multipleChoice', 'markieraufgabe'] },
  { id: 'de-kommasetzung-un', rahmenwerk: 'at-lehrplan', titel: 'Kommasetzung', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-un-gramm-4'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
  { id: 'de-passiv-un', rahmenwerk: 'at-lehrplan', titel: 'Aktiv und Passiv', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-un-gramm-5'], defaultAufgabentypen: ['fehlerkorrektur'] },
  // Deutsch Oberstufe
  { id: 'de-konjunktiv-ob', rahmenwerk: 'at-lehrplan', titel: 'Konjunktiv I und II', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-ob-gramm-1', 'at-de-ob-gramm-2'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext'] },
  { id: 'de-kommasetzung-ob', rahmenwerk: 'at-lehrplan', titel: 'Kommasetzung (komplex)', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-ob-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur'] },
  { id: 'de-satzgefüge-ob', rahmenwerk: 'at-lehrplan', titel: 'Satzglieder und Satzgefüge', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-ob-gramm-4'], defaultAufgabentypen: ['kategorisierung', 'multipleChoice', 'markieraufgabe'] },
  { id: 'de-wortarten-ob', rahmenwerk: 'at-lehrplan', titel: 'Wortarten und Wortbildung', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-ob-gramm-5'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'de-mixed-grammar-ob', rahmenwerk: 'at-lehrplan', titel: 'Mixed Grammar (Oberstufenwiederholung)', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-de-ob-gramm-1', 'at-de-ob-gramm-3', 'at-de-ob-gramm-4'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
];
