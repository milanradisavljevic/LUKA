import type { StoffItem, Deskriptor } from '@lehrunterlagen/schema';

// Französisch — Lehrplan-Deskriptoren + Stoff-Items (Rahmenwerk at-lehrplan).
// `bereich`/`kategorie` verwenden die Namen aus KOMPETENZBEREICHE['franzoesisch'] wortgleich.
// Deskriptoren sind kuratierte Entwürfe (siehe `quelle`).

const Q = (stufe: string) =>
  `Entwurf, angelehnt an BMBWF-Lehrplan AHS Französisch ${stufe} — nicht offiziell zitiert`;

export const franzoesischDeskriptoren: Deskriptor[] = [
  // Hören — Unterstufe
  { id: 'at-fr-un-hoer-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können einfache Hörtexte zu vertrauten Themen (z. B. Alltag, Schule) verstehen und Hauptinformationen wiedergeben.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-hoer-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können aus kurzen französischen Dialogen Details entnehmen und einfache Schlussfolgerungen ziehen.', quelle: Q('Unterstufe') },
  // Hören — Oberstufe
  { id: 'at-fr-ob-hoer-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können längere Hörtexte (Reportagen, Interviews) verstehen und Inhalte strukturiert zusammenfassen.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-hoer-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Hören', code: '', text: 'Die Schülerinnen können implizite Informationen, Sprecherhaltung und Intention in französischen Hörtexten erkennen.', quelle: Q('Oberstufe') },

  // Lesen — Unterstufe
  { id: 'at-fr-un-les-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können einfache französische Texte (E-Mails, Kurznachrichten, Anzeigen) verstehen und Hauptinformationen entnehmen.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-les-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können relevante Details in kurzen Sachtexten finden und einfache Schlussfolgerungen ziehen.', quelle: Q('Unterstufe') },
  // Lesen — Oberstufe
  { id: 'at-fr-ob-les-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können komplexe französische Texte (Zeitungsartikel, literarische Texte) verstehen und argumentativ strukturieren.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-les-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Lesen', code: '', text: 'Die Schülerinnen können Textintention, Zielgruppe und Stil eines französischen Textes analysieren.', quelle: Q('Oberstufe') },

  // An Gesprächen teilnehmen — Unterstufe
  { id: 'at-fr-un-gesp-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können sich in einfachen Alltagssituationen auf Französisch verständigen und höflich nachfragen.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-gesp-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können kurze Gespräche zu vertrauten Themen führen und auf Gesprächsbeiträge reagieren.', quelle: Q('Unterstufe') },
  // An Gesprächen teilnehmen — Oberstufe
  { id: 'at-fr-ob-gesp-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können an Diskussionen auf Französisch teilnehmen, Argumente äußern und Gegenargumente einbringen.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-gesp-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'An Gesprächen teilnehmen', code: '', text: 'Die Schülerinnen können Gespräche situationsgerecht initiieren, aufrechterhalten und beenden.', quelle: Q('Oberstufe') },

  // Zusammenhängend sprechen — Unterstufe
  { id: 'at-fr-un-sprec-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können sich zu vertrauten Themen kurz und zusammenhängend mündlich äußern.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-sprec-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können einfache Sachverhalte auf Französisch beschreiben und erklären.', quelle: Q('Unterstufe') },
  // Zusammenhängend sprechen — Oberstufe
  { id: 'at-fr-ob-sprec-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können zu komplexen Themen strukturiert und kohärent auf Französisch sprechen.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-sprec-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Zusammenhängend sprechen', code: '', text: 'Die Schülerinnen können Positionen begründen, Beispiele anführen und rhetorisch wirksam argumentieren.', quelle: Q('Oberstufe') },

  // Schreiben — Unterstufe
  { id: 'at-fr-un-schr-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können einfache französische Texte (E-Mail, Postkarte, Kurznachricht) zu vertrauten Themen verfassen.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-schr-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können kurze Sachtexte auf Französisch strukturieren und wichtige Informationen vermitteln.', quelle: Q('Unterstufe') },
  // Schreiben — Oberstufe
  { id: 'at-fr-ob-schr-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können zusammenhängende französische Texte (Erörterung, Leserbrief, Bericht) verfassen.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-schr-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Schreiben', code: '', text: 'Die Schülerinnen können Stil, Register und Textstruktur zielgruppengerecht anpassen.', quelle: Q('Oberstufe') },

  // Sprachmittlung — Unterstufe
  { id: 'at-fr-un-mitt-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können einfache Informationen zwischen Deutsch und Französisch übertragen.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-mitt-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können unbekannte französische Wörter mithilfe von Kontext oder Wörterbuch erschließen.', quelle: Q('Unterstufe') },
  // Sprachmittlung — Oberstufe
  { id: 'at-fr-ob-mitt-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können komplexere Textausschnitte zwischen Französisch und Deutsch sinngemäß wiedergeben.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-mitt-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Sprachmittlung', code: '', text: 'Die Schülerinnen können fremdsprachige Informationen für ein deutschsprachiges Publikum zusammenfassen.', quelle: Q('Oberstufe') },

  // Grammatik — Unterstufe
  { id: 'at-fr-un-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können die wichtigsten französischen Zeitformen (Présent, Passé composé, Futur simple) bilden und anwenden.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Personalpronomen, Possessivbegleiter und unbestimmte Artikel richtig verwenden.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können einfache Satzstrukturen (Aussage, Frage, Verneinung) auf Französisch bilden.', quelle: Q('Unterstufe') },
  // Grammatik — Oberstufe
  { id: 'at-fr-ob-gramm-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können komplexe Zeitformen (Subjonctif, Conditionnel, Plus-que-parfait) unterscheiden und einsetzen.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-gramm-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Pronomen (relatifs, démonstratifs, possessifs) und deren Funktionen im Satz erklären.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-gramm-3', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Grammatik', code: '', text: 'Die Schülerinnen können Nebensätze und Satzgefüge auf Französisch bilden und korrekt satzgliedern.', quelle: Q('Oberstufe') },

  // Wortschatz — Unterstufe
  { id: 'at-fr-un-wort-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können thematischen Grundwortschatz (Alltag, Schule, Familie) verstehen und aktiv verwenden.', quelle: Q('Unterstufe') },
  { id: 'at-fr-un-wort-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'unterstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können unbekannte Wörter mithilfe von Kontext, Wortbildung und Wörterbuch erschließen.', quelle: Q('Unterstufe') },
  // Wortschatz — Oberstufe
  { id: 'at-fr-ob-wort-1', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können einen differenzierten, thematisch breiten Wortschatz verstehen und produktiv einsetzen.', quelle: Q('Oberstufe') },
  { id: 'at-fr-ob-wort-2', rahmenwerk: 'at-lehrplan', fach: 'franzoesisch', stufe: 'oberstufe', bereich: 'Wortschatz', code: '', text: 'Die Schülerinnen können synonyme und registerabhängige Ausdrücke unterscheiden und zielgruppengerecht verwenden.', quelle: Q('Oberstufe') },
];

export const franzoesischStoffItems: StoffItem[] = [
  // Hören
  { id: 'fr-hoeren-un', rahmenwerk: 'at-lehrplan', titel: 'Alltagsdialoge verstehen', fach: 'franzoesisch', stufe: 'unterstufe', kategorie: 'Hören', deskriptorIds: ['at-fr-un-hoer-1', 'at-fr-un-hoer-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'fr-hoeren-ob', rahmenwerk: 'at-lehrplan', titel: 'Reportagen und Interviews verstehen', fach: 'franzoesisch', stufe: 'oberstufe', kategorie: 'Hören', deskriptorIds: ['at-fr-ob-hoer-1', 'at-fr-ob-hoer-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'multipleChoice'] },
  // Lesen
  { id: 'fr-lesen-un', rahmenwerk: 'at-lehrplan', titel: 'E-Mails und Kurznachrichten lesen', fach: 'franzoesisch', stufe: 'unterstufe', kategorie: 'Lesen', deskriptorIds: ['at-fr-un-les-1', 'at-fr-un-les-2'], defaultAufgabentypen: ['multipleChoice', 'offeneVerstaendnisfrage'] },
  { id: 'fr-lesen-ob', rahmenwerk: 'at-lehrplan', titel: 'Zeitungsartikel und literarische Texte lesen', fach: 'franzoesisch', stufe: 'oberstufe', kategorie: 'Lesen', deskriptorIds: ['at-fr-ob-les-1', 'at-fr-ob-les-2'], defaultAufgabentypen: ['offeneVerstaendnisfrage', 'offeneSchreibaufgabe'] },
  // An Gesprächen teilnehmen
  { id: 'fr-gespraech-un', rahmenwerk: 'at-lehrplan', titel: 'Alltagsgespräche führen', fach: 'franzoesisch', stufe: 'unterstufe', kategorie: 'An Gesprächen teilnehmen', deskriptorIds: ['at-fr-un-gesp-1', 'at-fr-un-gesp-2'], defaultAufgabentypen: ['roleplay', 'multipleChoice'] },
  { id: 'fr-gespraech-ob', rahmenwerk: 'at-lehrplan', titel: 'Diskussionen und Debatten', fach: 'franzoesisch', stufe: 'oberstufe', kategorie: 'An Gesprächen teilnehmen', deskriptorIds: ['at-fr-ob-gesp-1', 'at-fr-ob-gesp-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Zusammenhängend sprechen
  { id: 'fr-sprechen-un', rahmenwerk: 'at-lehrplan', titel: 'Mündliche Kurzpräsentationen', fach: 'franzoesisch', stufe: 'unterstufe', kategorie: 'Zusammenhängend sprechen', deskriptorIds: ['at-fr-un-sprec-1', 'at-fr-un-sprec-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  { id: 'fr-sprechen-ob', rahmenwerk: 'at-lehrplan', titel: 'Strukturiertes mündliches Argumentieren', fach: 'franzoesisch', stufe: 'oberstufe', kategorie: 'Zusammenhängend sprechen', deskriptorIds: ['at-fr-ob-sprec-1', 'at-fr-ob-sprec-2'], defaultAufgabentypen: ['roleplay', 'offeneSchreibaufgabe'] },
  // Schreiben
  { id: 'fr-schreiben-un', rahmenwerk: 'at-lehrplan', titel: 'E-Mail und Postkarte schreiben', fach: 'franzoesisch', stufe: 'unterstufe', kategorie: 'Schreiben', deskriptorIds: ['at-fr-un-schr-1', 'at-fr-un-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'lueckentext'] },
  { id: 'fr-schreiben-ob', rahmenwerk: 'at-lehrplan', titel: 'Erörterung und Leserbrief', fach: 'franzoesisch', stufe: 'oberstufe', kategorie: 'Schreiben', deskriptorIds: ['at-fr-ob-schr-1', 'at-fr-ob-schr-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'fehlerkorrektur'] },
  // Sprachmittlung
  { id: 'fr-mittlung-un', rahmenwerk: 'at-lehrplan', titel: 'Einfache Übersetzung und Paraphrase', fach: 'franzoesisch', stufe: 'unterstufe', kategorie: 'Sprachmittlung', deskriptorIds: ['at-fr-un-mitt-1', 'at-fr-un-mitt-2'], defaultAufgabentypen: ['vokabeluebung', 'lueckentext'] },
  { id: 'fr-mittlung-ob', rahmenwerk: 'at-lehrplan', titel: 'Zusammenfassung französischer Texte', fach: 'franzoesisch', stufe: 'oberstufe', kategorie: 'Sprachmittlung', deskriptorIds: ['at-fr-ob-mitt-1', 'at-fr-ob-mitt-2'], defaultAufgabentypen: ['offeneSchreibaufgabe', 'offeneVerstaendnisfrage'] },
  // Grammatik
  { id: 'fr-zeiten-un', rahmenwerk: 'at-lehrplan', titel: 'Présent, Passé composé, Futur simple', fach: 'franzoesisch', stufe: 'unterstufe', kategorie: 'Grammatik', deskriptorIds: ['at-fr-un-gramm-1', 'at-fr-un-gramm-2', 'at-fr-un-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext', 'multipleChoice'] },
  { id: 'fr-subjonctif-ob', rahmenwerk: 'at-lehrplan', titel: 'Subjonctif, Conditionnel, Plus-que-parfait', fach: 'franzoesisch', stufe: 'oberstufe', kategorie: 'Grammatik', deskriptorIds: ['at-fr-ob-gramm-1', 'at-fr-ob-gramm-2', 'at-fr-ob-gramm-3'], defaultAufgabentypen: ['fehlerkorrektur', 'lueckentext', 'multipleChoice'] },
  // Wortschatz
  { id: 'fr-wortschatz-un', rahmenwerk: 'at-lehrplan', titel: 'Thematischer Grundwortschatz', fach: 'franzoesisch', stufe: 'unterstufe', kategorie: 'Wortschatz', deskriptorIds: ['at-fr-un-wort-1', 'at-fr-un-wort-2'], defaultAufgabentypen: ['vokabeluebung', 'kreuzwortraetsel'] },
  { id: 'fr-wortschatz-ob', rahmenwerk: 'at-lehrplan', titel: 'Differenzierter Wortschatz und Register', fach: 'franzoesisch', stufe: 'oberstufe', kategorie: 'Wortschatz', deskriptorIds: ['at-fr-ob-wort-1', 'at-fr-ob-wort-2'], defaultAufgabentypen: ['vokabeluebung', 'offeneSchreibaufgabe'] },
];
