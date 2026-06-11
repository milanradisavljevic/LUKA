import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// ---------------------------------------------------------------------------
// Proof-Slice: Stoffkatalog für den Kompetenz-Modus
// ---------------------------------------------------------------------------
// Aktuell hartkodiert, später aus JSON/RIS/BMBWF kuratiert.
// Rahmenwerk: at-lehrplan, Fach: englisch, Stufe: oberstufe, Bereich: Tenses

const DESKRIPTOREN: Deskriptor[] = [
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
];

const STOFF_ITEMS: StoffItem[] = [
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
