/**
 * Anzeigenamen der Aufgaben-Blocktypen — bewusst **ohne** UI-Abhängigkeiten
 * (keine Icons, keine Farben), damit auch reine Logik wie `lib/search.ts` sie
 * nutzen kann, ohne den Icon-Bund zu ziehen.
 *
 * `lib/constants.ts` (BLOCK_TYPE_DEFS) bezieht label + description von hier und
 * ergänzt nur noch Icon/Farbe. Damit gibt es genau eine Quelle für die
 * Blocktyp-Bezeichner — vorher existierten drei (constants.ts, search.ts,
 * helpSections) und die Hilfe lief der App um zwei Typen hinterher.
 *
 * Der Record ist bewusst über **alle** Typen des Schemas vollständig: `umformung`
 * wird von Schema, Renderer und Korrekturraster voll unterstützt, ist aber im
 * Baukasten bewusst nicht anwählbar (im Kompetenz-Modus lautet die Vorgabe
 * ausdrücklich, stattdessen Fehlerkorrektur/Lückentext zu verwenden). Deshalb
 * fehlt es in `BLOCK_TYPE_DEFS` — hier braucht es trotzdem einen Namen, sonst
 * zeigte die Suche den rohen Bezeichner.
 */
import type { Block } from '@lehrunterlagen/schema';

export const BLOCK_TYP_LABEL: Record<Block['typ'], string> = {
  lueckentext: 'Lückentext',
  matching: 'Matching',
  multipleChoice: 'Multiple Choice',
  offeneVerstaendnisfrage: 'Verständnisfrage',
  offeneSchreibaufgabe: 'Schreibaufgabe',
  markieraufgabe: 'Markieraufgabe',
  wordScramble: 'Wörter ordnen',
  kategorisierung: 'Kategorisierung',
  tabelle: 'Tabelle',
  stiluebung: 'Stilübung',
  songanalyse: 'Songanalyse',
  kreuzwortraetsel: 'Kreuzworträtsel',
  wortgitter: 'Wortgitter',
  vokabeluebung: 'Vokabelübung',
  umformung: 'Umformung',
  fehlerkorrektur: 'Fehlerkorrektur',
  quellenanalyse: 'Quellenanalyse',
  timeline: 'Timeline / Datierung',
  diagrammanalyse: 'Diagramm-/Datenanalyse',
  roleplay: 'Rollenspiel',
  rollenkartenSet: 'Rollenkarten-Set',
};

export const BLOCK_TYP_DESCRIPTION: Record<Block['typ'], string> = {
  lueckentext: 'Lücken im Text ergänzen',
  matching: 'Begriffe richtig zuordnen',
  multipleChoice: 'Richtige Antwort ankreuzen',
  offeneVerstaendnisfrage: 'Fragen zum Text beantworten',
  offeneSchreibaufgabe: 'Aufsatz oder Kommentar verfassen',
  markieraufgabe: 'Textstellen markieren',
  wordScramble: 'Wörter in die richtige Reihenfolge bringen',
  kategorisierung: 'Begriffe Kategorien zuordnen',
  tabelle: 'Werte in eine Tabelle eintragen',
  stiluebung: 'Text in einem anderen Stil umformulieren',
  songanalyse: 'Songtext interpretieren',
  kreuzwortraetsel: 'Wörter über Hinweise ins Gitter eintragen',
  wortgitter: 'Versteckte Wörter im Buchstabengitter finden',
  vokabeluebung: 'Wörter übersetzen oder zuordnen',
  umformung: 'Sätze in eine Zielstruktur umformen',
  fehlerkorrektur: 'Fehler in Sätzen finden und korrigieren',
  quellenanalyse: 'Historische Quelle untersuchen und belegen',
  timeline: 'Historische Ereignisse zeitlich ordnen',
  diagrammanalyse: 'Daten beschreiben, auswerten und belegen',
  roleplay: 'Kommunikative Sprechsituation mit Rollenkarten',
  rollenkartenSet: 'Differenzierte Sprech-Szenarien als Karten-Set (jedes Paar ein Szenario)',
};

/** Anzeigename eines Blocktyps; unbekannte Typen fallen auf den Rohwert zurück. */
export function blockTypeLabel(typ?: string): string {
  return (typ && BLOCK_TYP_LABEL[typ as Block['typ']]) || typ || '';
}
