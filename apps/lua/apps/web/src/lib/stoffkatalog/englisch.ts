import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Englisch — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['englisch'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

export const englischDeskriptoren: Deskriptor[] = [
  // Englisch Oberstufe
  { id: 'at-en-ob-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können die Grundformen der englischen Verbzeiten (Past, Present, Future) sicher unterscheiden und anwenden.', quelle: '' },
  { id: 'at-en-ob-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen beherrschen die Perfect-Bildung und deren Zusammenhang mit Zeitverlauf und Handlungsabfolge.', quelle: '' },
  { id: 'at-en-ob-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Konditionalsätze (Type 1–3) bilden und ihre Bedeutungsunterschiede erkennen.', quelle: '' },
  { id: 'at-en-ob-gramm-4', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Passivkonstruktionen in verschiedenen Zeiten bilden und umformen.', quelle: '' },
  { id: 'at-en-ob-gramm-5', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können die indirekte Rede (Reported Speech) korrekt bilden und Zeitverschiebungen anwenden.', quelle: '' },
  // Englisch Unterstufe
  { id: 'at-en-un-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Present Simple und Present Continuous sicher unterscheiden und in Kontexten anwenden.', quelle: '' },
  { id: 'at-en-un-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Past Simple (regelmäßige und unregelmäßige Verben) bilden und verwenden.', quelle: '' },
  { id: 'at-en-un-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Future mit will und going to bilden und die Bedeutungsunterschiede erkennen.', quelle: '' },
  { id: 'at-en-un-gramm-4', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Steigerung von Adjektiven und Adverbien regelmäßig und unregelmäßig bilden.', quelle: '' },
  { id: 'at-en-un-gramm-5', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können die Verwendung von some, any, much, many und a lot of im Satz sicher anwenden.', quelle: '' },
  { id: 'at-en-un-gramm-6', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können das Present Perfect Simple (have/has + past participle) bilden und mit since/for, already/just/yet anwenden.', quelle: '' },
  { id: 'at-en-un-gramm-7', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Past Simple und Present Perfect Simple situationsgerecht unterscheiden und anwenden.', quelle: '' },
  { id: 'at-en-un-gramm-8', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Fragen, Verneinungen und Kurzantworten in den gängigen englischen Zeitformen bilden.', quelle: '' },
];

export const englischStoffItems: StoffItem[] = [
  // Englisch Oberstufe
  { id: 'en-present-perfect-vs-past-simple', rahmenwerk: 'at-lehrplan', titel: 'Present Perfect vs. Past Simple', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-ob-gramm-1', 'at-en-ob-gramm-2'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
  { id: 'en-past-perfect', rahmenwerk: 'at-lehrplan', titel: 'Past Perfect', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-ob-gramm-2'], defaultAufgabentypen: ['fehlerkorrektur'] },
  { id: 'en-future-forms', rahmenwerk: 'at-lehrplan', titel: 'Future forms (will, going to, present continuous)', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-ob-gramm-1'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'en-conditionals', rahmenwerk: 'at-lehrplan', titel: 'Conditionals (Type 1–3)', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-ob-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext'] },
  { id: 'en-passive-voice', rahmenwerk: 'at-lehrplan', titel: 'Passive Voice', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-ob-gramm-4'], defaultAufgabentypen: ['fehlerkorrektur'] },
  { id: 'en-reported-speech', rahmenwerk: 'at-lehrplan', titel: 'Reported Speech', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-ob-gramm-5'], defaultAufgabentypen: ['fehlerkorrektur'] },
  { id: 'en-gerund-vs-infinitive', rahmenwerk: 'at-lehrplan', titel: 'Gerund vs. Infinitive', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-ob-gramm-1'], defaultAufgabentypen: ['multipleChoice', 'fehlerkorrektur'] },
  { id: 'en-tenses-mixed', rahmenwerk: 'at-lehrplan', titel: 'Mixed Tenses (Oberstufenwiederholung)', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-ob-gramm-1', 'at-en-ob-gramm-2'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
  // Englisch Unterstufe
  { id: 'en-present-simple-vs-continuous-un', rahmenwerk: 'at-lehrplan', titel: 'Present Simple vs. Present Continuous', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-1'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'en-past-simple-un', rahmenwerk: 'at-lehrplan', titel: 'Past Simple', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-2'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext'] },
  { id: 'en-will-vs-going-to-un', rahmenwerk: 'at-lehrplan', titel: 'will vs. going to', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-3'], defaultAufgabentypen: ['multipleChoice', 'kategorisierung'] },
  { id: 'en-comparison-un', rahmenwerk: 'at-lehrplan', titel: 'Comparison of adjectives', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-4'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
  { id: 'en-some-any-much-many-un', rahmenwerk: 'at-lehrplan', titel: 'some, any, much, many', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-5'], defaultAufgabentypen: ['lueckentext', 'multipleChoice', 'fehlerkorrektur'] },
  { id: 'en-mixed-tenses-un', rahmenwerk: 'at-lehrplan', titel: 'Mixed Tenses (Unterstufenwiederholung)', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-1', 'at-en-un-gramm-2', 'at-en-un-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
  { id: 'en-present-perfect-un', rahmenwerk: 'at-lehrplan', titel: 'Present Perfect Simple', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-6'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
  { id: 'en-past-simple-vs-present-perfect-un', rahmenwerk: 'at-lehrplan', titel: 'Past Simple vs. Present Perfect', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-6', 'at-en-un-gramm-7'], defaultAufgabentypen: ['fehlerkorrektur', 'multipleChoice'] },
  { id: 'en-questions-negation-short-answers-un', rahmenwerk: 'at-lehrplan', titel: 'Questions, Negation, Short Answers', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-en-un-gramm-8'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext'] },
];
