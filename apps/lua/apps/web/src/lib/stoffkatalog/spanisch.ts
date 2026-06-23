import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Spanisch — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['spanisch'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Spanisch ${stufe} — nicht offiziell zitiert`;

export const spanischDeskriptoren: Deskriptor[] = [
  // Hören — Unterstufe
  { id: 'at-es-un-hoer-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können einfache spanische Hörtexte zu vertrauten Themen verstehen und Hauptinformationen wiedergeben.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-hoer-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können aus kurzen spanischen Dialogen wichtige Details entnehmen.', quelle: Q('Unterstufe') },
  // Hören — Oberstufe
  { id: 'at-es-ob-hoer-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können authentische spanische Hörtexte (Podcasts, Nachrichten, Interviews) verstehen und zusammenfassen.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-hoer-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können Dialekt, Akzent und Sprecherintention in spanischen Hörtexten erkennen.', quelle: Q('Oberstufe') },

  // Lesen — Unterstufe
  { id: 'at-es-un-les-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können einfache spanische Texte (E-Mails, Anzeigen, Kurznachrichten) verstehen.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-les-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können relevante Informationen in kurzen Sachtexten finden.', quelle: Q('Unterstufe') },
  // Lesen — Oberstufe
  { id: 'at-es-ob-les-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können komplexe spanische Texte (Zeitungsartikel, Essays, literarische Texte) verstehen und analysieren.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-les-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können Textstruktur, Argumentation und Autorposition in spanischen Texten erfassen.', quelle: Q('Oberstufe') },

  // An Gesprächen teilnehmen — Unterstufe
  { id: 'at-es-un-gesp-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können sich in einfachen Alltagssituationen auf Spanisch verständigen.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-gesp-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können kurze Gespräche zu vertrauten Themen führen und reagieren.', quelle: Q('Unterstufe') },
  // An Gesprächen teilnehmen — Oberstufe
  { id: 'at-es-ob-gesp-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können an Diskussionen auf Spanisch teilnehmen und ihre Meinung begründen.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-gesp-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können Gespräche situations- und adressatengerecht führen.', quelle: Q('Oberstufe') },

  // Zusammenhängend sprechen — Unterstufe
  { id: 'at-es-un-sprec-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können sich zu vertrauten Themen kurz und zusammenhängend auf Spanisch äußern.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-sprec-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können einfache Sachverhalte auf Spanisch beschreiben.', quelle: Q('Unterstufe') },
  // Zusammenhängend sprechen — Oberstufe
  { id: 'at-es-ob-sprec-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können zu komplexen Themen strukturiert und kohärent auf Spanisch sprechen.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-sprec-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können Positionen argumentativ vertreten und Belege anführen.', quelle: Q('Oberstufe') },

  // Schreiben — Unterstufe
  { id: 'at-es-un-schr-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können einfache spanische Texte (E-Mail, Postkarte) zu vertrauten Themen verfassen.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-schr-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können kurze Sachtexte auf Spanisch strukturiert verfassen.', quelle: Q('Unterstufe') },
  // Schreiben — Oberstufe
  { id: 'at-es-ob-schr-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können zusammenhängende spanische Texte (Erörterung, Leserbrief, Bericht) verfassen.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-schr-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können Stil und Register zielgruppengerecht anpassen.', quelle: Q('Oberstufe') },

  // Sprachmittlung — Unterstufe
  { id: 'at-es-un-mitt-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können einfache Informationen zwischen Deutsch und Spanisch übertragen.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-mitt-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können unbekannte spanische Wörter mithilfe von Kontext erschließen.', quelle: Q('Unterstufe') },
  // Sprachmittlung — Oberstufe
  { id: 'at-es-ob-mitt-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können komplexere Textausschnitte zwischen Spanisch und Deutsch sinngemäß wiedergeben.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-mitt-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können spanische Informationen für ein deutschsprachiges Publikum zusammenfassen.', quelle: Q('Oberstufe') },

  // Grammatik — Unterstufe
  { id: 'at-es-un-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können die wichtigsten spanischen Zeitformen (Presente, Pretérito indefinido, Futuro) bilden und anwenden.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Personalpronomen, Possessivbegleiter und Artikel richtig verwenden.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können einfache Satzstrukturen (Aussage, Frage, Verneinung) auf Spanisch bilden.', quelle: Q('Unterstufe') },
  // Grammatik — Oberstufe
  { id: 'at-es-ob-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können komplexe Zeitformen (Subjuntivo, Condicional, Pluscuamperfecto) unterscheiden und einsetzen.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Pronomen und deren Funktionen im spanischen Satz erklären.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Nebensätze und Satzgefüge auf Spanisch bilden und analysieren.', quelle: Q('Oberstufe') },

  // Wortschatz — Unterstufe
  { id: 'at-es-un-wort-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können thematischen Grundwortschatz (Alltag, Schule, Familie) verstehen und aktiv verwenden.', quelle: Q('Unterstufe') },
  { id: 'at-es-un-wort-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'unterstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können unbekannte Wörter mithilfe von Kontext und Wortbildung erschließen.', quelle: Q('Unterstufe') },
  // Wortschatz — Oberstufe
  { id: 'at-es-ob-wort-1', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können einen differenzierten, thematisch breiten Wortschatz verstehen und produktiv einsetzen.', quelle: Q('Oberstufe') },
  { id: 'at-es-ob-wort-2', rahmenwerk: 'at-lehrplan', fach: 'spanisch', stufe: 'oberstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können synonyme und registerabhängige Ausdrücke zielgruppengerecht verwenden.', quelle: Q('Oberstufe') },
];

export const spanischStoffItems: StoffItem[] = [
  // Hören
  { id: 'es-hoeren-un', rahmenwerk: 'at-lehrplan', titel: 'Alltagsdialoge verstehen', fach: 'spanisch', stufe: 'unterstufe', kategorie: 'Hören', deskriptorIds: ['at-es-un-hoer-1', 'at-es-un-hoer-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'es-hoeren-ob', rahmenwerk: 'at-lehrplan', titel: 'Podcasts und Nachrichten verstehen', fach: 'spanisch', stufe: 'oberstufe', kategorie: 'Hören', deskriptorIds: ['at-es-ob-hoer-1', 'at-es-ob-hoer-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  // Lesen
  { id: 'es-lesen-un', rahmenwerk: 'at-lehrplan', titel: 'E-Mails und Anzeigen lesen', fach: 'spanisch', stufe: 'unterstufe', kategorie: 'Lesen', deskriptorIds: ['at-es-un-les-1', 'at-es-un-les-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'es-lesen-ob', rahmenwerk: 'at-lehrplan', titel: 'Zeitungsartikel und Essays lesen', fach: 'spanisch', stufe: 'oberstufe', kategorie: 'Lesen', deskriptorIds: ['at-es-ob-les-1', 'at-es-ob-les-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  // An Gesprächen teilnehmen
  { id: 'es-gespraech-un', rahmenwerk: 'at-lehrplan', titel: 'Alltagsgespräche führen', fach: 'spanisch', stufe: 'unterstufe', kategorie: 'An Gesprächen teilnehmen', deskriptorIds: ['at-es-un-gesp-1', 'at-es-un-gesp-2'], defaultAufgabentypen: ['roleplay', 'multipleChoice'] },
  { id: 'es-gespraech-ob', rahmenwerk: 'at-lehrplan', titel: 'Diskussionen auf Spanisch', fach: 'spanisch', stufe: 'oberstufe', kategorie: 'An Gesprächen teilnehmen', deskriptorIds: ['at-es-ob-gesp-1', 'at-es-ob-gesp-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Zusammenhängend sprechen
  { id: 'es-sprechen-un', rahmenwerk: 'at-lehrplan', titel: 'Mündliche Kurzpräsentationen', fach: 'spanisch', stufe: 'unterstufe', kategorie: 'Zusammenhängend sprechen', deskriptorIds: ['at-es-un-sprec-1', 'at-es-un-sprec-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  { id: 'es-sprechen-ob', rahmenwerk: 'at-lehrplan', titel: 'Strukturiertes mündliches Argumentieren', fach: 'spanisch', stufe: 'oberstufe', kategorie: 'Zusammenhängend sprechen', deskriptorIds: ['at-es-ob-sprec-1', 'at-es-ob-sprec-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Schreiben
  { id: 'es-schreiben-un', rahmenwerk: 'at-lehrplan', titel: 'E-Mail und Postkarte schreiben', fach: 'spanisch', stufe: 'unterstufe', kategorie: 'Schreiben', deskriptorIds: ['at-es-un-schr-1', 'at-es-un-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'lueckentext'] },
  { id: 'es-schreiben-ob', rahmenwerk: 'at-lehrplan', titel: 'Erörterung und Leserbrief', fach: 'spanisch', stufe: 'oberstufe', kategorie: 'Schreiben', deskriptorIds: ['at-es-ob-schr-1', 'at-es-ob-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'fehlerkorrektur'] },
  // Sprachmittlung
  { id: 'es-mittlung-un', rahmenwerk: 'at-lehrplan', titel: 'Einfache Übersetzung und Paraphrase', fach: 'spanisch', stufe: 'unterstufe', kategorie: 'Sprachmittlung', deskriptorIds: ['at-es-un-mitt-1', 'at-es-un-mitt-2'], defaultAufgabentypen: ['vokabeluebung', 'lueckentext'] },
  { id: 'es-mittlung-ob', rahmenwerk: 'at-lehrplan', titel: 'Zusammenfassung spanischer Texte', fach: 'spanisch', stufe: 'oberstufe', kategorie: 'Sprachmittlung', deskriptorIds: ['at-es-ob-mitt-1', 'at-es-ob-mitt-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Grammatik
  { id: 'es-zeiten-un', rahmenwerk: 'at-lehrplan', titel: 'Presente, Pretérito indefinido, Futuro', fach: 'spanisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-es-un-gramm-1', 'at-es-un-gramm-2', 'at-es-un-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext', 'multipleChoice'] },
  { id: 'es-subjuntivo-ob', rahmenwerk: 'at-lehrplan', titel: 'Subjuntivo, Condicional, Pluscuamperfecto', fach: 'spanisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-es-ob-gramm-1', 'at-es-ob-gramm-2', 'at-es-ob-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext', 'multipleChoice'] },
  // Wortschatz
  { id: 'es-wortschatz-un', rahmenwerk: 'at-lehrplan', titel: 'Thematischer Grundwortschatz', fach: 'spanisch', stufe: 'unterstufe', kategorie: 'Wortschatz', deskriptorIds: ['at-es-un-wort-1', 'at-es-un-wort-2'], defaultAufgabentypen: ['vokabeluebung', 'kreuzwortraetsel'] },
  { id: 'es-wortschatz-ob', rahmenwerk: 'at-lehrplan', titel: 'Differenzierter Wortschatz und Register', fach: 'spanisch', stufe: 'oberstufe', kategorie: 'Wortschatz', deskriptorIds: ['at-es-ob-wort-1', 'at-es-ob-wort-2'], defaultAufgabentypen: ['vokabeluebung', 'offeneSchreibaufgabe'] },
];
