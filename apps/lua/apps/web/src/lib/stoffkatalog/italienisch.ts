import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Italienisch — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['italienisch'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Italienisch ${stufe} — nicht offiziell zitiert`;

export const italienischDeskriptoren: Deskriptor[] = [
  // Hören — Unterstufe
  { id: 'at-it-un-hoer-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können einfache italienische Hörtexte zu vertrauten Themen verstehen und Hauptinformationen wiedergeben.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-hoer-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können aus kurzen italienischen Dialogen wichtige Details entnehmen.', quelle: Q('Unterstufe') },
  // Hören — Oberstufe
  { id: 'at-it-ob-hoer-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können authentische italienische Hörtexte verstehen und Inhalte strukturiert zusammenfassen.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-hoer-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können Sprecherintention, Stimmung und implizite Informationen in Hörtexten erkennen.', quelle: Q('Oberstufe') },

  // Lesen — Unterstufe
  { id: 'at-it-un-les-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können einfache italienische Texte (E-Mails, Anzeigen, Kurznachrichten) verstehen.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-les-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können relevante Informationen in kurzen Sachtexten finden.', quelle: Q('Unterstufe') },
  // Lesen — Oberstufe
  { id: 'at-it-ob-les-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können komplexe italienische Texte (Zeitungsartikel, literarische Texte) verstehen und analysieren.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-les-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können Textstruktur, Argumentation und Autorposition in italienischen Texten erfassen.', quelle: Q('Oberstufe') },

  // An Gesprächen teilnehmen — Unterstufe
  { id: 'at-it-un-gesp-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können sich in einfachen Alltagssituationen auf Italienisch verständigen.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-gesp-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können kurze Gespräche zu vertrauten Themen führen und reagieren.', quelle: Q('Unterstufe') },
  // An Gesprächen teilnehmen — Oberstufe
  { id: 'at-it-ob-gesp-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können an Diskussionen auf Italienisch teilnehmen und ihre Meinung begründen.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-gesp-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können Gespräche situations- und adressatengerecht führen.', quelle: Q('Oberstufe') },

  // Zusammenhängend sprechen — Unterstufe
  { id: 'at-it-un-sprec-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können sich zu vertrauten Themen kurz und zusammenhängend auf Italienisch äußern.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-sprec-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können einfache Sachverhalte auf Italienisch beschreiben.', quelle: Q('Unterstufe') },
  // Zusammenhängend sprechen — Oberstufe
  { id: 'at-it-ob-sprec-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können zu komplexen Themen strukturiert und kohärent auf Italienisch sprechen.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-sprec-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können Positionen argumentativ vertreten und Belege anführen.', quelle: Q('Oberstufe') },

  // Schreiben — Unterstufe
  { id: 'at-it-un-schr-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können einfache italienische Texte (E-Mail, Postkarte) zu vertrauten Themen verfassen.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-schr-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können kurze Sachtexte auf Italienisch strukturiert verfassen.', quelle: Q('Unterstufe') },
  // Schreiben — Oberstufe
  { id: 'at-it-ob-schr-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können zusammenhängende italienische Texte (Erörterung, Leserbrief, Bericht) verfassen.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-schr-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können Stil und Register zielgruppengerecht anpassen.', quelle: Q('Oberstufe') },

  // Sprachmittlung — Unterstufe
  { id: 'at-it-un-mitt-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können einfache Informationen zwischen Deutsch und Italienisch übertragen.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-mitt-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können unbekannte italienische Wörter mithilfe von Kontext erschließen.', quelle: Q('Unterstufe') },
  // Sprachmittlung — Oberstufe
  { id: 'at-it-ob-mitt-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können komplexere Textausschnitte zwischen Italienisch und Deutsch sinngemäß wiedergeben.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-mitt-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können italienische Informationen für ein deutschsprachiges Publikum zusammenfassen.', quelle: Q('Oberstufe') },

  // Grammatik — Unterstufe
  { id: 'at-it-un-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können die wichtigsten italienischen Zeitformen (Presente, Passato prossimo, Futuro semplice) bilden und anwenden.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Personalpronomen, Possessivbegleiter und Artikel richtig verwenden.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können einfache Satzstrukturen (Aussage, Frage, Verneinung) auf Italienisch bilden.', quelle: Q('Unterstufe') },
  // Grammatik — Oberstufe
  { id: 'at-it-ob-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können komplexe Zeitformen (Congiuntivo, Condizionale, Trapassato prossimo) unterscheiden und einsetzen.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Pronomen und deren Funktionen im italienischen Satz erklären.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Nebensätze und Satzgefüge auf Italienisch bilden und analysieren.', quelle: Q('Oberstufe') },

  // Wortschatz — Unterstufe
  { id: 'at-it-un-wort-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können thematischen Grundwortschatz (Alltag, Schule, Familie) verstehen und aktiv verwenden.', quelle: Q('Unterstufe') },
  { id: 'at-it-un-wort-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'unterstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können unbekannte Wörter mithilfe von Kontext und Wortbildung erschließen.', quelle: Q('Unterstufe') },
  // Wortschatz — Oberstufe
  { id: 'at-it-ob-wort-1', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können einen differenzierten, thematisch breiten Wortschatz verstehen und produktiv einsetzen.', quelle: Q('Oberstufe') },
  { id: 'at-it-ob-wort-2', rahmenwerk: 'at-lehrplan', fach: 'italienisch', stufe: 'oberstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können synonyme und registerabhängige Ausdrücke zielgruppengerecht verwenden.', quelle: Q('Oberstufe') },
];

export const italienischStoffItems: StoffItem[] = [
  // Hören
  { id: 'it-hoeren-un', rahmenwerk: 'at-lehrplan', titel: 'Alltagsdialoge verstehen', fach: 'italienisch', stufe: 'unterstufe', kategorie: 'Hören', deskriptorIds: ['at-it-un-hoer-1', 'at-it-un-hoer-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'it-hoeren-ob', rahmenwerk: 'at-lehrplan', titel: 'Authentische Hörtexte verstehen', fach: 'italienisch', stufe: 'oberstufe', kategorie: 'Hören', deskriptorIds: ['at-it-ob-hoer-1', 'at-it-ob-hoer-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  // Lesen
  { id: 'it-lesen-un', rahmenwerk: 'at-lehrplan', titel: 'E-Mails und Anzeigen lesen', fach: 'italienisch', stufe: 'unterstufe', kategorie: 'Lesen', deskriptorIds: ['at-it-un-les-1', 'at-it-un-les-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'it-lesen-ob', rahmenwerk: 'at-lehrplan', titel: 'Zeitungsartikel und literarische Texte lesen', fach: 'italienisch', stufe: 'oberstufe', kategorie: 'Lesen', deskriptorIds: ['at-it-ob-les-1', 'at-it-ob-les-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  // An Gesprächen teilnehmen
  { id: 'it-gespraech-un', rahmenwerk: 'at-lehrplan', titel: 'Alltagsgespräche führen', fach: 'italienisch', stufe: 'unterstufe', kategorie: 'An Gesprächen teilnehmen', deskriptorIds: ['at-it-un-gesp-1', 'at-it-un-gesp-2'], defaultAufgabentypen: ['roleplay', 'multipleChoice'] },
  { id: 'it-gespraech-ob', rahmenwerk: 'at-lehrplan', titel: 'Diskussionen auf Italienisch', fach: 'italienisch', stufe: 'oberstufe', kategorie: 'An Gesprächen teilnehmen', deskriptorIds: ['at-it-ob-gesp-1', 'at-it-ob-gesp-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Zusammenhängend sprechen
  { id: 'it-sprechen-un', rahmenwerk: 'at-lehrplan', titel: 'Mündliche Kurzpräsentationen', fach: 'italienisch', stufe: 'unterstufe', kategorie: 'Zusammenhängend sprechen', deskriptorIds: ['at-it-un-sprec-1', 'at-it-un-sprec-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  { id: 'it-sprechen-ob', rahmenwerk: 'at-lehrplan', titel: 'Strukturiertes mündliches Argumentieren', fach: 'italienisch', stufe: 'oberstufe', kategorie: 'Zusammenhängend sprechen', deskriptorIds: ['at-it-ob-sprec-1', 'at-it-ob-sprec-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Schreiben
  { id: 'it-schreiben-un', rahmenwerk: 'at-lehrplan', titel: 'E-Mail und Postkarte schreiben', fach: 'italienisch', stufe: 'unterstufe', kategorie: 'Schreiben', deskriptorIds: ['at-it-un-schr-1', 'at-it-un-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'lueckentext'] },
  { id: 'it-schreiben-ob', rahmenwerk: 'at-lehrplan', titel: 'Erörterung und Leserbrief', fach: 'italienisch', stufe: 'oberstufe', kategorie: 'Schreiben', deskriptorIds: ['at-it-ob-schr-1', 'at-it-ob-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'fehlerkorrektur'] },
  // Sprachmittlung
  { id: 'it-mittlung-un', rahmenwerk: 'at-lehrplan', titel: 'Einfache Übersetzung und Paraphrase', fach: 'italienisch', stufe: 'unterstufe', kategorie: 'Sprachmittlung', deskriptorIds: ['at-it-un-mitt-1', 'at-it-un-mitt-2'], defaultAufgabentypen: ['vokabeluebung', 'lueckentext'] },
  { id: 'it-mittlung-ob', rahmenwerk: 'at-lehrplan', titel: 'Zusammenfassung italienischer Texte', fach: 'italienisch', stufe: 'oberstufe', kategorie: 'Sprachmittlung', deskriptorIds: ['at-it-ob-mitt-1', 'at-it-ob-mitt-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Grammatik
  { id: 'it-zeiten-un', rahmenwerk: 'at-lehrplan', titel: 'Presente, Passato prossimo, Futuro semplice', fach: 'italienisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-it-un-gramm-1', 'at-it-un-gramm-2', 'at-it-un-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext', 'multipleChoice'] },
  { id: 'it-congiuntivo-ob', rahmenwerk: 'at-lehrplan', titel: 'Congiuntivo, Condizionale, Trapassato prossimo', fach: 'italienisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-it-ob-gramm-1', 'at-it-ob-gramm-2', 'at-it-ob-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext', 'multipleChoice'] },
  // Wortschatz
  { id: 'it-wortschatz-un', rahmenwerk: 'at-lehrplan', titel: 'Thematischer Grundwortschatz', fach: 'italienisch', stufe: 'unterstufe', kategorie: 'Wortschatz', deskriptorIds: ['at-it-un-wort-1', 'at-it-un-wort-2'], defaultAufgabentypen: ['vokabeluebung', 'kreuzwortraetsel'] },
  { id: 'it-wortschatz-ob', rahmenwerk: 'at-lehrplan', titel: 'Differenzierter Wortschatz und Register', fach: 'italienisch', stufe: 'oberstufe', kategorie: 'Wortschatz', deskriptorIds: ['at-it-ob-wort-1', 'at-it-ob-wort-2'], defaultAufgabentypen: ['vokabeluebung', 'offeneSchreibaufgabe'] },
];
