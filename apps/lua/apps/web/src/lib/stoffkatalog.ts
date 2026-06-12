import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// ---------------------------------------------------------------------------
// Stoffkatalog für den Kompetenz-Modus
// ---------------------------------------------------------------------------
// Aktuell hartkodiert, später aus JSON/RIS/BMBWF kuratiert.
// Rahmenwerk: at-lehrplan
// Fächer/Stufen: Englisch (Unter- + Oberstufe), Deutsch (Unter- + Oberstufe)

const DESKRIPTOREN: Deskriptor[] = [
  // -------------------------------------------------------------------------
  // Englisch Oberstufe (bestehend)
  // -------------------------------------------------------------------------
  {
    id: 'at-en-ob-gramm-1',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können die Grundformen der englischen Verbzeiten (Past, Present, Future) sicher unterscheiden und anwenden.',
    quelle: '',
  },
  {
    id: 'at-en-ob-gramm-2',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen beherrschen die Perfect-Bildung und deren Zusammenhang mit Zeitverlauf und Handlungsabfolge.',
    quelle: '',
  },
  {
    id: 'at-en-ob-gramm-3',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Konditionalsätze (Type 1–3) bilden und ihre Bedeutungsunterschiede erkennen.',
    quelle: '',
  },
  {
    id: 'at-en-ob-gramm-4',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Passivkonstruktionen in verschiedenen Zeiten bilden und umformen.',
    quelle: '',
  },
  {
    id: 'at-en-ob-gramm-5',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können die indirekte Rede (Reported Speech) korrekt bilden und Zeitverschiebungen anwenden.',
    quelle: '',
  },
  // -------------------------------------------------------------------------
  // Englisch Unterstufe
  // -------------------------------------------------------------------------
  {
    id: 'at-en-un-gramm-1',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Present Simple und Present Continuous sicher unterscheiden und in Kontexten anwenden.',
    quelle: '',
  },
  {
    id: 'at-en-un-gramm-2',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Past Simple (regelmäßige und unregelmäßige Verben) bilden und verwenden.',
    quelle: '',
  },
  {
    id: 'at-en-un-gramm-3',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Future mit will und going to bilden und die Bedeutungsunterschiede erkennen.',
    quelle: '',
  },
  {
    id: 'at-en-un-gramm-4',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Steigerung von Adjektiven und Adverbien regelmäßig und unregelmäßig bilden.',
    quelle: '',
  },
  {
    id: 'at-en-un-gramm-5',
    rahmenwerk: 'at-lehrplan',
    fach: 'englisch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können die Verwendung von some, any, much, many und a lot of im Satz sicher anwenden.',
    quelle: '',
  },
  // -------------------------------------------------------------------------
  // Deutsch Unterstufe
  // -------------------------------------------------------------------------
  {
    id: 'at-de-un-gramm-1',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können die wichtigsten Zeitformen (Präsens, Präteritum, Perfekt) unterscheiden und richtig bilden.',
    quelle: '',
  },
  {
    id: 'at-de-un-gramm-2',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Satzglieder (Subjekt, Prädikat, Akkusativ-/Dativobjekt) erkennen und bestimmen.',
    quelle: '',
  },
  {
    id: 'at-de-un-gramm-3',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können die wichtigsten Wortarten (Nomen, Verb, Adjektiv, Adverb, Pronomen) bestimmen.',
    quelle: '',
  },
  {
    id: 'at-de-un-gramm-4',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können einfache Kommasetzungsregeln (Haupt- und Nebensatz, Aufzählung) anwenden.',
    quelle: '',
  },
  {
    id: 'at-de-un-gramm-5',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'unterstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Aktiv- und Passivsätze unterscheiden und einfache Passivformen bilden.',
    quelle: '',
  },
  // -------------------------------------------------------------------------
  // Deutsch Oberstufe
  // -------------------------------------------------------------------------
  {
    id: 'at-de-ob-gramm-1',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Tempus und Modus (Indikativ, Konjunktiv I und II) sicher unterscheiden und gezielt einsetzen.',
    quelle: '',
  },
  {
    id: 'at-de-ob-gramm-2',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Konjunktiv I und II in der indirekten Rede und in irreale Bedingungssätzen anwenden.',
    quelle: '',
  },
  {
    id: 'at-de-ob-gramm-3',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können komplexe Kommasetzungsregeln (Nebensätze, Infinitivkonstruktionen, Einschübe) korrekt anwenden.',
    quelle: '',
  },
  {
    id: 'at-de-ob-gramm-4',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Satzglieder und Satzgefüge analysieren sowie Syntax-Fehler begründen.',
    quelle: '',
  },
  {
    id: 'at-de-ob-gramm-5',
    rahmenwerk: 'at-lehrplan',
    fach: 'deutsch',
    stufe: 'oberstufe',
    bereich: 'Grammatik',
    code: '',
    text: 'Die Schülerinnen können Wortarten und Wortbildung im Kontext grammatisch reflektieren und terminologisch benennen.',
    quelle: '',
  },
];

const STOFF_ITEMS: StoffItem[] = [
  // -------------------------------------------------------------------------
  // Englisch Oberstufe (bestehend)
  // -------------------------------------------------------------------------
  {
    id: 'en-present-perfect-vs-past-simple',
    rahmenwerk: 'at-lehrplan',
    titel: 'Present Perfect vs. Past Simple',
    fach: 'englisch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-ob-gramm-1', 'at-en-ob-gramm-2'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur', 'multipleChoice'],
  },
  {
    id: 'en-past-perfect',
    rahmenwerk: 'at-lehrplan',
    titel: 'Past Perfect',
    fach: 'englisch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-ob-gramm-2'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur'],
  },
  {
    id: 'en-future-forms',
    rahmenwerk: 'at-lehrplan',
    titel: 'Future forms (will, going to, present continuous)',
    fach: 'englisch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-ob-gramm-1'],
    defaultAufgabentypen: ['umformung', 'multipleChoice', 'kategorisierung'],
  },
  {
    id: 'en-conditionals',
    rahmenwerk: 'at-lehrplan',
    titel: 'Conditionals (Type 1–3)',
    fach: 'englisch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-ob-gramm-3'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur', 'lueckentext'],
  },
  {
    id: 'en-passive-voice',
    rahmenwerk: 'at-lehrplan',
    titel: 'Passive Voice',
    fach: 'englisch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-ob-gramm-4'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur'],
  },
  {
    id: 'en-reported-speech',
    rahmenwerk: 'at-lehrplan',
    titel: 'Reported Speech',
    fach: 'englisch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-ob-gramm-5'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur'],
  },
  {
    id: 'en-gerund-vs-infinitive',
    rahmenwerk: 'at-lehrplan',
    titel: 'Gerund vs. Infinitive',
    fach: 'englisch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-ob-gramm-1'],
    defaultAufgabentypen: ['multipleChoice', 'fehlerkorrektur'],
  },
  {
    id: 'en-tenses-mixed',
    rahmenwerk: 'at-lehrplan',
    titel: 'Mixed Tenses (Oberstufenwiederholung)',
    fach: 'englisch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-ob-gramm-1', 'at-en-ob-gramm-2'],
    defaultAufgabentypen: ['fehlerkorrektur', 'umformung', 'multipleChoice'],
  },
  // -------------------------------------------------------------------------
  // Englisch Unterstufe
  // -------------------------------------------------------------------------
  {
    id: 'en-present-simple-vs-continuous-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Present Simple vs. Present Continuous',
    fach: 'englisch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-un-gramm-1'],
    defaultAufgabentypen: ['multipleChoice', 'umformung', 'kategorisierung'],
  },
  {
    id: 'en-past-simple-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Past Simple',
    fach: 'englisch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-un-gramm-2'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur', 'lueckentext'],
  },
  {
    id: 'en-will-vs-going-to-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'will vs. going to',
    fach: 'englisch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-un-gramm-3'],
    defaultAufgabentypen: ['multipleChoice', 'umformung', 'kategorisierung'],
  },
  {
    id: 'en-comparison-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Comparison of adjectives',
    fach: 'englisch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-un-gramm-4'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur', 'multipleChoice'],
  },
  {
    id: 'en-some-any-much-many-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'some, any, much, many',
    fach: 'englisch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-un-gramm-5'],
    defaultAufgabentypen: ['lueckentext', 'multipleChoice', 'fehlerkorrektur'],
  },
  {
    id: 'en-mixed-tenses-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Mixed Tenses (Unterstufenwiederholung)',
    fach: 'englisch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-en-un-gramm-1', 'at-en-un-gramm-2', 'at-en-un-gramm-3'],
    defaultAufgabentypen: ['fehlerkorrektur', 'umformung', 'multipleChoice'],
  },
  // -------------------------------------------------------------------------
  // Deutsch Unterstufe
  // -------------------------------------------------------------------------
  {
    id: 'de-zeiten-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Zeiten (Präsens, Präteritum, Perfekt)',
    fach: 'deutsch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-un-gramm-1'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur', 'multipleChoice'],
  },
  {
    id: 'de-satzglieder-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Satzglieder',
    fach: 'deutsch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-un-gramm-2'],
    defaultAufgabentypen: ['kategorisierung', 'multipleChoice', 'markieraufgabe'],
  },
  {
    id: 'de-wortarten-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Wortarten',
    fach: 'deutsch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-un-gramm-3'],
    defaultAufgabentypen: ['kategorisierung', 'multipleChoice', 'markieraufgabe'],
  },
  {
    id: 'de-kommasetzung-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Kommasetzung',
    fach: 'deutsch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-un-gramm-4'],
    defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'],
  },
  {
    id: 'de-passiv-un',
    rahmenwerk: 'at-lehrplan',
    titel: 'Aktiv und Passiv',
    fach: 'deutsch',
    stufe: 'unterstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-un-gramm-5'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur'],
  },
  // -------------------------------------------------------------------------
  // Deutsch Oberstufe
  // -------------------------------------------------------------------------
  {
    id: 'de-konjunktiv-ob',
    rahmenwerk: 'at-lehrplan',
    titel: 'Konjunktiv I und II',
    fach: 'deutsch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-ob-gramm-1', 'at-de-ob-gramm-2'],
    defaultAufgabentypen: ['umformung', 'fehlerkorrektur', 'lueckentext'],
  },
  {
    id: 'de-kommasetzung-ob',
    rahmenwerk: 'at-lehrplan',
    titel: 'Kommasetzung (komplex)',
    fach: 'deutsch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-ob-gramm-3'],
    defaultAufgabentypen: ['fehlerkorrektur', 'umformung'],
  },
  {
    id: 'de-satzgefüge-ob',
    rahmenwerk: 'at-lehrplan',
    titel: 'Satzglieder und Satzgefüge',
    fach: 'deutsch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-ob-gramm-4'],
    defaultAufgabentypen: ['kategorisierung', 'multipleChoice', 'markieraufgabe'],
  },
  {
    id: 'de-wortarten-ob',
    rahmenwerk: 'at-lehrplan',
    titel: 'Wortarten und Wortbildung',
    fach: 'deutsch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-ob-gramm-5'],
    defaultAufgabentypen: ['multipleChoice', 'kategorisierung'],
  },
  {
    id: 'de-mixed-grammar-ob',
    rahmenwerk: 'at-lehrplan',
    titel: 'Mixed Grammar (Oberstufenwiederholung)',
    fach: 'deutsch',
    stufe: 'oberstufe',
    kategorie: 'grammatik',
    deskriptorIds: ['at-de-ob-gramm-1', 'at-de-ob-gramm-3', 'at-de-ob-gramm-4'],
    defaultAufgabentypen: ['fehlerkorrektur', 'umformung', 'multipleChoice'],
  },
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function listStoffItems(
  fach: StoffItem['fach'],
  stufe: StoffItem['stufe'],
  rahmenwerk?: StoffItem['rahmenwerk'],
): StoffItem[] {
  return STOFF_ITEMS.filter(
    (item) =>
      item.fach === fach &&
      item.stufe === stufe &&
      (rahmenwerk === undefined || item.rahmenwerk === rahmenwerk),
  );
}

export function getStoffItems(ids: string[]): StoffItem[] {
  return ids
    .map((id) => STOFF_ITEMS.find((item) => item.id === id))
    .filter((item): item is StoffItem => item !== undefined);
}

export function getDeskriptoren(ids: string[]): Deskriptor[] {
  return ids
    .map((id) => DESKRIPTOREN.find((d) => d.id === id))
    .filter((d): d is Deskriptor => d !== undefined);
}

export function getAllDeskriptoren(): Deskriptor[] {
  return [...DESKRIPTOREN];
}

export function getAllStoffItems(): StoffItem[] {
  return [...STOFF_ITEMS];
}

/**
 * Alle Deskriptoren ("Universum") für eine Fach/Stufe(/Rahmenwerk)-Kombination.
 * Basis für die Coverage-Berechnung: fehlend = Universum − abgedeckt.
 */
export function listDeskriptoren(
  fach: Deskriptor['fach'],
  stufe: Deskriptor['stufe'],
  rahmenwerk?: Deskriptor['rahmenwerk'],
): Deskriptor[] {
  return DESKRIPTOREN.filter(
    (d) =>
      d.fach === fach &&
      d.stufe === stufe &&
      (rahmenwerk === undefined || d.rahmenwerk === rahmenwerk),
  );
}
