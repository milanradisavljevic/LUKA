import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Englisch — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['englisch'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Englisch ${stufe} — nicht offiziell zitiert`;

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

  // Hören — Unterstufe
  { id: 'at-en-un-hoer-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können einfache englische Hörtexte zu vertrauten Themen verstehen und Hauptinformationen wiedergeben.', quelle: Q('Unterstufe') },
  { id: 'at-en-un-hoer-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können aus kurzen englischen Dialogen wichtige Details entnehmen.', quelle: Q('Unterstufe') },
  // Hören — Oberstufe
  { id: 'at-en-ob-hoer-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können authentische englische Hörtexte (Podcasts, Nachrichten, Interviews) verstehen und zusammenfassen.', quelle: Q('Oberstufe') },
  { id: 'at-en-ob-hoer-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können Sprecherintention, Akzent und implizite Informationen in Hörtexten erkennen.', quelle: Q('Oberstufe') },

  // Lesen — Unterstufe
  { id: 'at-en-un-les-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können einfache englische Texte (E-Mails, Anzeigen, Kurznachrichten) verstehen.', quelle: Q('Unterstufe') },
  { id: 'at-en-un-les-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können relevante Informationen in kurzen Sachtexten finden.', quelle: Q('Unterstufe') },
  // Lesen — Oberstufe
  { id: 'at-en-ob-les-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können komplexe englische Texte (Zeitungsartikel, Essays, literarische Texte) verstehen und analysieren.', quelle: Q('Oberstufe') },
  { id: 'at-en-ob-les-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können Textstruktur, Argumentation und Autorposition in englischen Texten erfassen.', quelle: Q('Oberstufe') },

  // An Gesprächen teilnehmen — Unterstufe
  { id: 'at-en-un-gesp-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können sich in einfachen Alltagssituationen auf Englisch verständigen.', quelle: Q('Unterstufe') },
  { id: 'at-en-un-gesp-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können kurze Gespräche zu vertrauten Themen führen und reagieren.', quelle: Q('Unterstufe') },
  // An Gesprächen teilnehmen — Oberstufe
  { id: 'at-en-ob-gesp-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können an Diskussionen auf Englisch teilnehmen und ihre Meinung begründen.', quelle: Q('Oberstufe') },
  { id: 'at-en-ob-gesp-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können Gespräche situations- und adressatengerecht führen.', quelle: Q('Oberstufe') },

  // Zusammenhängend sprechen — Unterstufe
  { id: 'at-en-un-sprec-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können sich zu vertrauten Themen kurz und zusammenhängend auf Englisch äußern.', quelle: Q('Unterstufe') },
  { id: 'at-en-un-sprec-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können einfache Sachverhalte auf Englisch beschreiben.', quelle: Q('Unterstufe') },
  // Zusammenhängend sprechen — Oberstufe
  { id: 'at-en-ob-sprec-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können zu komplexen Themen strukturiert und kohärent auf Englisch sprechen.', quelle: Q('Oberstufe') },
  { id: 'at-en-ob-sprec-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können Positionen argumentativ vertreten und Belege anführen.', quelle: Q('Oberstufe') },

  // Schreiben — Unterstufe
  { id: 'at-en-un-schr-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können einfache englische Texte (E-Mail, Postkarte) zu vertrauten Themen verfassen.', quelle: Q('Unterstufe') },
  { id: 'at-en-un-schr-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können kurze Sachtexte auf Englisch strukturiert verfassen.', quelle: Q('Unterstufe') },
  // Schreiben — Oberstufe
  { id: 'at-en-ob-schr-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können zusammenhängende englische Texte (Erörterung, Leserbrief, Bericht) verfassen.', quelle: Q('Oberstufe') },
  { id: 'at-en-ob-schr-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können Stil und Register zielgruppengerecht anpassen.', quelle: Q('Oberstufe') },

  // Sprachmittlung — Unterstufe
  { id: 'at-en-un-mitt-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können einfache Informationen zwischen Deutsch und Englisch übertragen.', quelle: Q('Unterstufe') },
  { id: 'at-en-un-mitt-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können unbekannte englische Wörter mithilfe von Kontext erschließen.', quelle: Q('Unterstufe') },
  // Sprachmittlung — Oberstufe
  { id: 'at-en-ob-mitt-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können komplexere Textausschnitte zwischen Englisch und Deutsch sinngemäß wiedergeben.', quelle: Q('Oberstufe') },
  { id: 'at-en-ob-mitt-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können englische Informationen für ein deutschsprachiges Publikum zusammenfassen.', quelle: Q('Oberstufe') },

  // Wortschatz — Unterstufe
  { id: 'at-en-un-wort-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können thematischen Grundwortschatz (Alltag, Schule, Familie) verstehen und aktiv verwenden.', quelle: Q('Unterstufe') },
  { id: 'at-en-un-wort-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'unterstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können unbekannte Wörter mithilfe von Kontext und Wortbildung erschließen.', quelle: Q('Unterstufe') },
  // Wortschatz — Oberstufe
  { id: 'at-en-ob-wort-1', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können einen differenzierten, thematisch breiten Wortschatz verstehen und produktiv einsetzen.', quelle: Q('Oberstufe') },
  { id: 'at-en-ob-wort-2', rahmenwerk: 'at-lehrplan', fach: 'englisch', stufe: 'oberstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können synonyme und registerabhängige Ausdrücke zielgruppengerecht verwenden.', quelle: Q('Oberstufe') },
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
  // Hören
  { id: 'en-hoeren-un', rahmenwerk: 'at-lehrplan', titel: 'Alltagsdialoge verstehen', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Hören', deskriptorIds: ['at-en-un-hoer-1', 'at-en-un-hoer-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'en-hoeren-ob', rahmenwerk: 'at-lehrplan', titel: 'Podcasts und Nachrichten verstehen', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Hören', deskriptorIds: ['at-en-ob-hoer-1', 'at-en-ob-hoer-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  // Lesen
  { id: 'en-lesen-un', rahmenwerk: 'at-lehrplan', titel: 'E-Mails und Anzeigen lesen', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Lesen', deskriptorIds: ['at-en-un-les-1', 'at-en-un-les-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'en-lesen-ob', rahmenwerk: 'at-lehrplan', titel: 'Zeitungsartikel und Essays lesen', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Lesen', deskriptorIds: ['at-en-ob-les-1', 'at-en-ob-les-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  // An Gesprächen teilnehmen
  { id: 'en-gespraech-un', rahmenwerk: 'at-lehrplan', titel: 'Alltagsgespräche führen', fach: 'englisch', stufe: 'unterstufe', kategorie: 'An Gesprächen teilnehmen', deskriptorIds: ['at-en-un-gesp-1', 'at-en-un-gesp-2'], defaultAufgabentypen: ['roleplay', 'multipleChoice'] },
  { id: 'en-gespraech-ob', rahmenwerk: 'at-lehrplan', titel: 'Diskussionen auf Englisch', fach: 'englisch', stufe: 'oberstufe', kategorie: 'An Gesprächen teilnehmen', deskriptorIds: ['at-en-ob-gesp-1', 'at-en-ob-gesp-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Zusammenhängend sprechen
  { id: 'en-sprechen-un', rahmenwerk: 'at-lehrplan', titel: 'Mündliche Kurzpräsentationen', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Zusammenhängend sprechen', deskriptorIds: ['at-en-un-sprec-1', 'at-en-un-sprec-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  { id: 'en-sprechen-ob', rahmenwerk: 'at-lehrplan', titel: 'Strukturiertes mündliches Argumentieren', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Zusammenhängend sprechen', deskriptorIds: ['at-en-ob-sprec-1', 'at-en-ob-sprec-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Schreiben
  { id: 'en-schreiben-un', rahmenwerk: 'at-lehrplan', titel: 'E-Mail und Postkarte schreiben', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Schreiben', deskriptorIds: ['at-en-un-schr-1', 'at-en-un-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'lueckentext'] },
  { id: 'en-schreiben-ob', rahmenwerk: 'at-lehrplan', titel: 'Erörterung und Leserbrief', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Schreiben', deskriptorIds: ['at-en-ob-schr-1', 'at-en-ob-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'fehlerkorrektur'] },
  // Sprachmittlung
  { id: 'en-mittlung-un', rahmenwerk: 'at-lehrplan', titel: 'Einfache Übersetzung und Paraphrase', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Sprachmittlung', deskriptorIds: ['at-en-un-mitt-1', 'at-en-un-mitt-2'], defaultAufgabentypen: ['vokabeluebung', 'lueckentext'] },
  { id: 'en-mittlung-ob', rahmenwerk: 'at-lehrplan', titel: 'Zusammenfassung englischer Texte', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Sprachmittlung', deskriptorIds: ['at-en-ob-mitt-1', 'at-en-ob-mitt-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Wortschatz
  { id: 'en-wortschatz-un', rahmenwerk: 'at-lehrplan', titel: 'Thematischer Grundwortschatz', fach: 'englisch', stufe: 'unterstufe', kategorie: 'Wortschatz', deskriptorIds: ['at-en-un-wort-1', 'at-en-un-wort-2'], defaultAufgabentypen: ['vokabeluebung', 'kreuzwortraetsel'] },
  { id: 'en-wortschatz-ob', rahmenwerk: 'at-lehrplan', titel: 'Differenzierter Wortschatz und Register', fach: 'englisch', stufe: 'oberstufe', kategorie: 'Wortschatz', deskriptorIds: ['at-en-ob-wort-1', 'at-en-ob-wort-2'], defaultAufgabentypen: ['vokabeluebung', 'offeneSchreibaufgabe'] },
];
