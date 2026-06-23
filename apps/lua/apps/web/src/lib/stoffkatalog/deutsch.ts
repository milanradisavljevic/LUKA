import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Deutsch — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['deutsch'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Deutsch ${stufe} — nicht offiziell zitiert`;

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

  // Zuhören & Sprechen — Unterstufe
  { id: 'at-de-un-zusp-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Zuhören & Sprechen', code: '', text: 'Die Schülerinnen können Informationen aus mündlichen Beiträgen entnehmen und zusammenfassen.', quelle: Q('Unterstufe') },
  { id: 'at-de-un-zusp-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Zuhören & Sprechen', code: '', text: 'Die Schülerinnen können sich in Diskussionen und Gesprächen sachgerecht äußern und auf andere eingehen.', quelle: Q('Unterstufe') },
  // Zuhören & Sprechen — Oberstufe
  { id: 'at-de-ob-zusp-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Zuhören & Sprechen', code: '', text: 'Die Schülerinnen können komplexe mündliche Beiträge analysieren und deren Argumentation kritisch erfassen.', quelle: Q('Oberstufe') },
  { id: 'at-de-ob-zusp-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Zuhören & Sprechen', code: '', text: 'Die Schülerinnen können in Diskussionen differenziert argumentieren und Gespräche moderieren.', quelle: Q('Oberstufe') },

  // Lesen & Textverständnis — Unterstufe
  { id: 'at-de-un-les-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Lesen & Textverständnis', code: '', text: 'Die Schülerinnen können literarische und sachliche Texte lesen und Hauptinhalte wiedergeben.', quelle: Q('Unterstufe') },
  { id: 'at-de-un-les-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Lesen & Textverständnis', code: '', text: 'Die Schülerinnen können Textinformationen gezielt entnehmen und einfache Schlussfolgerungen ziehen.', quelle: Q('Unterstufe') },
  // Lesen & Textverständnis — Oberstufe
  { id: 'at-de-ob-les-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Lesen & Textverständnis', code: '', text: 'Die Schülerinnen können komplexe Texte (Lyrik, Drama, Essay, Mediencode) interpretieren und in Kontext setzen.', quelle: Q('Oberstufe') },
  { id: 'at-de-ob-les-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Lesen & Textverständnis', code: '', text: 'Die Schülerinnen können Textstrategien, Erzählperspektive und intendierte Wirkung analysieren.', quelle: Q('Oberstufe') },

  // Schreiben — Unterstufe
  { id: 'at-de-un-schr-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können zusammenhängende Texte zu vertrauten Themen verfassen und dabei Textsortenmerkmale beachten.', quelle: Q('Unterstufe') },
  { id: 'at-de-un-schr-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können eigene Texte planen, strukturieren und sprachlich gestalten.', quelle: Q('Unterstufe') },
  // Schreiben — Oberstufe
  { id: 'at-de-ob-schr-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können komplexe Textsorten (Erörterung, Interpretation, Stellungnahme) zielgruppengerecht verfassen.', quelle: Q('Oberstufe') },
  { id: 'at-de-ob-schr-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können Argumentationsstrukturen aufbauen, Belege einbinden und sprachlich differenzieren.', quelle: Q('Oberstufe') },

  // Sprachbewusstsein — Unterstufe
  { id: 'at-de-un-sprb-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Sprachbewusstsein', code: '', text: 'Die Schülerinnen können Sprache als Mittel der Verständigung reflektieren und Sprachvarietäten unterscheiden.', quelle: Q('Unterstufe') },
  { id: 'at-de-un-sprb-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Sprachbewusstsein', code: '', text: 'Die Schülerinnen können Wortbildung und Bedeutungszusammenhänge erkennen und erklären.', quelle: Q('Unterstufe') },
  // Sprachbewusstsein — Oberstufe
  { id: 'at-de-ob-sprb-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Sprachbewusstsein', code: '', text: 'Die Schülerinnen können Sprachgebrauch, Sprachwandel und Sprachkritik analysieren und bewerten.', quelle: Q('Oberstufe') },
  { id: 'at-de-ob-sprb-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Sprachbewusstsein', code: '', text: 'Die Schülerinnen können den Zusammenhang von Sprache, Denken und Gesellschaft reflektieren.', quelle: Q('Oberstufe') },

  // Literarische Bildung — Unterstufe
  { id: 'at-de-un-lit-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Literarische Bildung', code: '', text: 'Die Schülerinnen können literarische Texte lesen, Inhalt und Aussage erfassen.', quelle: Q('Unterstufe') },
  { id: 'at-de-un-lit-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'unterstufe', bereich: 'Literarische Bildung', code: '', text: 'Die Schülerinnen können Figuren, Handlung und Sprache in literarischen Texten beschreiben.', quelle: Q('Unterstufe') },
  // Literarische Bildung — Oberstufe
  { id: 'at-de-ob-lit-1', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Literarische Bildung', code: '', text: 'Die Schülerinnen können literarische Werke im historischen und kulturellen Kontext interpretieren.', quelle: Q('Oberstufe') },
  { id: 'at-de-ob-lit-2', rahmenwerk: 'at-lehrplan', fach: 'deutsch', stufe: 'oberstufe', bereich: 'Literarische Bildung', code: '', text: 'Die Schülerinnen können ästhetische, ethische und gesellschaftliche Fragestellungen an literarischen Texten entwickeln.', quelle: Q('Oberstufe') },
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
  // Zuhören & Sprechen
  { id: 'de-diskussion-un', rahmenwerk: 'at-lehrplan', titel: 'Diskussion und Gesprächsführung', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Zuhören & Sprechen', deskriptorIds: ['at-de-un-zusp-1', 'at-de-un-zusp-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  { id: 'de-moderation-ob', rahmenwerk: 'at-lehrplan', titel: 'Argumentative Diskussion und Moderation', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Zuhören & Sprechen', deskriptorIds: ['at-de-ob-zusp-1', 'at-de-ob-zusp-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Lesen & Textverständnis
  { id: 'de-textverstaendnis-un', rahmenwerk: 'at-lehrplan', titel: 'Texte lesen und verstehen', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Lesen & Textverständnis', deskriptorIds: ['at-de-un-les-1', 'at-de-un-les-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  { id: 'de-textinterpretation-ob', rahmenwerk: 'at-lehrplan', titel: 'Textinterpretation (Lyrik, Drama, Essay)', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Lesen & Textverständnis', deskriptorIds: ['at-de-ob-les-1', 'at-de-ob-les-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  // Schreiben
  { id: 'de-textsorten-un', rahmenwerk: 'at-lehrplan', titel: 'Textsorten kennen und anwenden', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Schreiben', deskriptorIds: ['at-de-un-schr-1', 'at-de-un-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'lueckentext'] },
  { id: 'de-eroerterung-ob', rahmenwerk: 'at-lehrplan', titel: 'Erörterung und Stellungnahme', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Schreiben', deskriptorIds: ['at-de-ob-schr-1', 'at-de-ob-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'fehlerkorrektur'] },
  // Sprachbewusstsein
  { id: 'de-sprachvarietäten-un', rahmenwerk: 'at-lehrplan', titel: 'Sprache und Sprachvarietäten', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Sprachbewusstsein', deskriptorIds: ['at-de-un-sprb-1', 'at-de-un-sprb-2'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'de-sprachkritik-ob', rahmenwerk: 'at-lehrplan', titel: 'Sprachkritik und Sprachwandel', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Sprachbewusstsein', deskriptorIds: ['at-de-ob-sprb-1', 'at-de-ob-sprb-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Literarische Bildung
  { id: 'de-literatur-un', rahmenwerk: 'at-lehrplan', titel: 'Literarische Texte lesen und beschreiben', fach: 'deutsch', stufe: 'unterstufe', kategorie: 'Literarische Bildung', deskriptorIds: ['at-de-un-lit-1', 'at-de-un-lit-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  { id: 'de-literatur-ob', rahmenwerk: 'at-lehrplan', titel: 'Literatur im historischen und kulturellen Kontext', fach: 'deutsch', stufe: 'oberstufe', kategorie: 'Literarische Bildung', deskriptorIds: ['at-de-ob-lit-1', 'at-de-ob-lit-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
];
