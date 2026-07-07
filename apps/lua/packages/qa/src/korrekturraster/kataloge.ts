export interface KriterienKatalog {
  kriterium: string;
  beschreibung: string;
  maxPunkte: number;
}

// ---------------------------------------------------------------------------
// Deutsch -- Zusammenfassung (Unterstufe, Oberstufe)
// ---------------------------------------------------------------------------

export const ZUSAMMENFASSUNG: KriterienKatalog[] = [
  { kriterium: 'Inhalt / Vollstaendigkeit', beschreibung: 'Alle wesentlichen Informationen vorhanden; keine Auslassungen, keine Erfindungen', maxPunkte: 10 },
  { kriterium: 'Eigene Formulierung', beschreibung: 'Keine wörtlichen Uebernahmen; Inhalt in eigenen Worten; Fachbegriffe korrekt uebernommen', maxPunkte: 6 },
  { kriterium: 'Struktur / Gliederung', beschreibung: 'Sinnvolle Einleitung, logisch geordneter Hauptteil; Abschnitte klar erkennbar', maxPunkte: 6 },
  { kriterium: 'Sprachliche Korrektheit', beschreibung: 'Grammatik, Rechtschreibung, Beistrichsetzung', maxPunkte: 6 },
  { kriterium: 'Textverknuepfung', beschreibung: 'Kohaesionsmittel (Konjunktionen, Pronomen, Verweiswoerter) verwendet', maxPunkte: 4 },
  { kriterium: 'Wortanzahl', beschreibung: 'Geforderte Wortanzahl eingehalten und angegeben', maxPunkte: 2 },
];

// ---------------------------------------------------------------------------
// Deutsch -- Erörterung / Stellungnahme (Oberstufe)
// ---------------------------------------------------------------------------

export const ERORTERUNG: KriterienKatalog[] = [
  { kriterium: 'Aufgabenerfuellung / Thema', beschreibung: 'Thema klar erkannt; Schreibziel (Textsortenmerkmal) eingehalten', maxPunkte: 6 },
  { kriterium: 'Argumentation', beschreibung: 'Argumente nachvollziehbar, belegt, differenziert; keine Scheinargumente', maxPunkte: 12 },
  { kriterium: 'Struktur', beschreibung: 'Einleitung -- Hauptteil -- Schluss erkennbar und funktional', maxPunkte: 6 },
  { kriterium: 'Ausdrucksvermoegen / Stilistik', beschreibung: 'Abwechslungsreicher Wortschatz; angemessenes Register', maxPunkte: 6 },
  { kriterium: 'Sprachliche Korrektheit', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung', maxPunkte: 6 },
  { kriterium: 'Textverknuepfung', beschreibung: 'Logische Uebergaenge, Kohaesionsmittel', maxPunkte: 4 },
];

// ---------------------------------------------------------------------------
// Deutsch -- Textanalyse / Textinterpretation (Oberstufe)
// ---------------------------------------------------------------------------

export const TEXTANALYSE: KriterienKatalog[] = [
  { kriterium: 'Aufgabenerfuellung', beschreibung: 'Analysefokus korrekt; Textsorte korrekt benannt', maxPunkte: 4 },
  { kriterium: 'Inhaltserfassung', beschreibung: 'Kernaussagen richtig erkannt und beschrieben', maxPunkte: 8 },
  { kriterium: 'Analysetiefe', beschreibung: 'Sprachliche Mittel benannt, belegt, gedeutet', maxPunkte: 10 },
  { kriterium: 'Struktur', beschreibung: 'Sinnvoller Aufbau; klare Abschnittsgliederung', maxPunkte: 6 },
  { kriterium: 'Ausdruck / Stil', beschreibung: 'Sachlich-analytisches Register; Fachvokabular korrekt', maxPunkte: 6 },
  { kriterium: 'Sprachrichtigkeit', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung', maxPunkte: 6 },
];

// ---------------------------------------------------------------------------
// Sachfach -- Geschichte: Quellenanalyse / -interpretation (Ober- und Unterstufe)
// ---------------------------------------------------------------------------

export const QUELLENANALYSE: KriterienKatalog[] = [
  { kriterium: 'Quellenbeschreibung', beschreibung: 'Quellenart, Autor/in, Entstehungszeit und -kontext korrekt benannt', maxPunkte: 6 },
  { kriterium: 'Inhaltserfassung', beschreibung: 'Kernaussagen der Quelle korrekt herausgearbeitet und in eigenen Worten wiedergegeben', maxPunkte: 8 },
  { kriterium: 'Analyse / Einordnung', beschreibung: 'Quelle in den historischen Kontext eingeordnet; Intention/Perspektive erkannt', maxPunkte: 10 },
  { kriterium: 'Sach- und Werturteil', beschreibung: 'Begründetes Urteil zu Aussagekraft und Bedeutung der Quelle', maxPunkte: 6 },
  { kriterium: 'Fachsprache', beschreibung: 'Korrekte historische Fachbegriffe; sachliches Register', maxPunkte: 4 },
  { kriterium: 'Sprachrichtigkeit', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung', maxPunkte: 4 },
];

// ---------------------------------------------------------------------------
// Sachfach -- Geographie/GW: Materialinterpretation / Sachanalyse
// ---------------------------------------------------------------------------

export const MATERIALINTERPRETATION: KriterienKatalog[] = [
  { kriterium: 'Materialerfassung', beschreibung: 'Material (Karte, Diagramm, Statistik, Text) korrekt gelesen und beschrieben', maxPunkte: 6 },
  { kriterium: 'Auswertung', beschreibung: 'Relevante Daten/Zusammenhaenge herausgearbeitet; Tendenzen erkannt', maxPunkte: 10 },
  { kriterium: 'Erklaerung / Vernetzung', beschreibung: 'Ursachen, Wirkungen und raeumliche/wirtschaftliche Zusammenhaenge erklaert', maxPunkte: 8 },
  { kriterium: 'Sach- und Werturteil', beschreibung: 'Begruendete Einschaetzung/Bewertung der Ergebnisse', maxPunkte: 6 },
  { kriterium: 'Fachsprache', beschreibung: 'Korrekte Fachbegriffe; sachliches Register', maxPunkte: 4 },
  { kriterium: 'Sprachrichtigkeit', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung', maxPunkte: 4 },
];

// ---------------------------------------------------------------------------
// Sachfach -- Religion/Ethik/Psychologie/Philosophie: argumentativer Reflexionstext
// ---------------------------------------------------------------------------

export const SACHERORTERUNG: KriterienKatalog[] = [
  { kriterium: 'Fragestellung erfasst', beschreibung: 'Problem-/Fragestellung klar erkannt und entfaltet', maxPunkte: 6 },
  { kriterium: 'Fachwissen', beschreibung: 'Relevante Begriffe, Theorien, Positionen korrekt eingebracht', maxPunkte: 8 },
  { kriterium: 'Argumentation', beschreibung: 'Nachvollziehbar, mehrperspektivisch, belegt; Pro/Contra abgewogen', maxPunkte: 10 },
  { kriterium: 'Eigenes begruendetes Urteil', beschreibung: 'Reflektierte, begruendete eigene Position', maxPunkte: 6 },
  { kriterium: 'Struktur', beschreibung: 'Einleitung -- Hauptteil -- Schluss erkennbar und funktional', maxPunkte: 4 },
  { kriterium: 'Sprachrichtigkeit', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung; sachliches Register', maxPunkte: 4 },
];

// ---------------------------------------------------------------------------
// Sachfach -- Medien und Demokratie: Medienquellen-/Post-Analyse
// (Wortlaut-Adaption von QUELLENANALYSE: "Quelle" -> "Medienquelle/Post",
// "Autor/in" -> "Urheber/Plattform" -- neues AHS-Pflichtfach ab 2026/27,
// Lehrplan-Verordnung stand bei Anlage noch aus, siehe docs/PLAN-neue-faecher-2026-07.md)
// ---------------------------------------------------------------------------

export const MEDIENQUELLENANALYSE: KriterienKatalog[] = [
  { kriterium: 'Medienquellenbeschreibung', beschreibung: 'Medienart, Urheber/Plattform, Entstehungszeit und -kontext korrekt benannt', maxPunkte: 6 },
  { kriterium: 'Inhaltserfassung', beschreibung: 'Kernaussagen der Medienquelle/des Posts korrekt herausgearbeitet und in eigenen Worten wiedergegeben', maxPunkte: 8 },
  { kriterium: 'Analyse / Einordnung', beschreibung: 'Medienquelle/Post in den gesellschaftlich-politischen Kontext eingeordnet; Intention/Perspektive erkannt', maxPunkte: 10 },
  { kriterium: 'Sach- und Werturteil', beschreibung: 'Begründetes Urteil zu Aussagekraft und Glaubwürdigkeit der Medienquelle/des Posts', maxPunkte: 6 },
  { kriterium: 'Fachsprache', beschreibung: 'Korrekte medien- und politikwissenschaftliche Fachbegriffe; sachliches Register', maxPunkte: 4 },
  { kriterium: 'Sprachrichtigkeit', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung', maxPunkte: 4 },
];

// ---------------------------------------------------------------------------
// Deutsch -- SRDP-Matura-Klausur (K1 Inhalt+Textstruktur / K3 Ausdruck+Sprachnormen)
// ---------------------------------------------------------------------------

export const SRDP_DEUTSCH: KriterienKatalog[] = [
  { kriterium: 'K1 — Inhalt', beschreibung: 'Aufgabenstellung vollstaendig erfuellt; Inhalt sachlich richtig, relevant und ausreichend ausgefuehrt', maxPunkte: 10 },
  { kriterium: 'K1 — Textstruktur', beschreibung: 'Textsortenkonformer Aufbau; klare Gliederung, Kohaerenz und nachvollziehbare Gedankenfuehrung', maxPunkte: 8 },
  { kriterium: 'K3 — Ausdruck & Stil', beschreibung: 'Praeziser, variabler Wortschatz; angemessenes Register; stilistische Sicherheit', maxPunkte: 8 },
  { kriterium: 'K3 — Sprachnormen', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung; normgerechte Sprachrichtigkeit', maxPunkte: 8 },
];

// ---------------------------------------------------------------------------
// Englisch -- Open Writing Task (Oberstufe, SRDP-kompatibel)
// ---------------------------------------------------------------------------

export const OPEN_WRITING: KriterienKatalog[] = [
  { kriterium: 'Task Achievement', beschreibung: 'Aufgabe vollstaendig erfuellt; Schreibziel erreicht; Adressatenbezug', maxPunkte: 10 },
  { kriterium: 'Organisation & Kohaerenz', beschreibung: 'Logischer Aufbau; Uebergaenge; Textsortenmerkmale eingehalten', maxPunkte: 8 },
  { kriterium: 'Lexical Range & Accuracy', beschreibung: 'Wortschatzbreite; korrekte Verwendung; Kollokationen', maxPunkte: 8 },
  { kriterium: 'Grammatical Range & Accuracy', beschreibung: 'Varietaet der Strukturen; wenige Fehler; Zeichensetzung', maxPunkte: 8 },
];

// ---------------------------------------------------------------------------
// Englisch -- Reading Comprehension / offene Fragen (Unter- und Oberstufe)
// ---------------------------------------------------------------------------

export function readingComprehension(anzahlFragen: number): KriterienKatalog[] {
  const katalog: KriterienKatalog[] = [];
  for (let i = 1; i <= anzahlFragen; i++) {
    katalog.push(
      { kriterium: `Frage ${i} — Aufgabenerfuellung`, beschreibung: 'Frage direkt beantwortet; keine irrelevanten Zusatzinfos', maxPunkte: 2 },
      { kriterium: `Frage ${i} — Sprache`, beschreibung: 'Grammatikalisch korrekt; verstaendlich', maxPunkte: 1 },
    );
  }
  return katalog;
}

// ---------------------------------------------------------------------------
// wordScramble (Unter- und Oberstufe)
// ---------------------------------------------------------------------------

export const WORD_SCRAMBLE: KriterienKatalog[] = [
  { kriterium: 'Reihenfolge', beschreibung: 'Alle Woerter in der vom Satz geforderten Reihenfolge', maxPunkte: 5 },
  { kriterium: 'Wortmaterial', beschreibung: 'Nur die vorgegebenen Woerter verwendet; keine zusaetzlichen', maxPunkte: 2 },
  { kriterium: 'Rechtschreibung', beschreibung: 'Korrekte Schreibweise (Gross-/Kleinschreibung am Satzanfang)', maxPunkte: 2 },
];

// ---------------------------------------------------------------------------
// kategorisierung (Unterstufe und Oberstufe)
// ---------------------------------------------------------------------------

export const KATEGORISIERUNG: KriterienKatalog[] = [
  { kriterium: 'Vollstaendigkeit', beschreibung: 'Alle Items einer Kategorie zugeordnet; keine Luecken', maxPunkte: 4 },
  { kriterium: 'Korrekte Zuordnung', beschreibung: 'Jedes Item der richtigen Kategorie zugeordnet', maxPunkte: 4 },
  { kriterium: 'Begruendung', beschreibung: 'Nachvollziehbare Begruendung der Zuordnung (bei freier Antwort)', maxPunkte: 2 },
];

// ---------------------------------------------------------------------------
// tabelle (Unterstufe und Oberstufe)
// ---------------------------------------------------------------------------

export const TABELLE: KriterienKatalog[] = [
  { kriterium: 'Vollstaendigkeit', beschreibung: 'Alle Zellen ausgefuellt; keine leeren Felder', maxPunkte: 3 },
  { kriterium: 'Sachrichtigkeit', beschreibung: 'Inhalte korrekt und dem Thema entsprechend', maxPunkte: 5 },
  { kriterium: 'Praezision', beschreibung: 'Knappe, sachliche Formulierungen; keine Fuellwoerter', maxPunkte: 3 },
  { kriterium: 'Erfuellungs-Kriterien', beschreibung: 'Alle in der Loesung genannten Kriterien erfuellt', maxPunkte: 3 },
];

// ---------------------------------------------------------------------------
// stiluebung (Oberstufe)
// ---------------------------------------------------------------------------

export const STILUEBUNG: KriterienKatalog[] = [
  { kriterium: 'Zielniveau erreicht', beschreibung: 'Umformulierung entspricht dem geforderten Sprachniveau', maxPunkte: 4 },
  { kriterium: 'Transformation umgesetzt', beschreibung: 'Geforderte Transformation (verdeutlichen/variieren/kuerzen/erweitern) klar erkennbar', maxPunkte: 4 },
  { kriterium: 'Inhaltstreue', beschreibung: 'Bedeutung des Ausgangstextes erhalten; keine inhaltlichen Verfaelschungen', maxPunkte: 3 },
  { kriterium: 'Sprachliche Qualitaet', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung', maxPunkte: 3 },
];

// ---------------------------------------------------------------------------
// songanalyse (Oberstufe)
// ---------------------------------------------------------------------------

export const SONGANALYSE: KriterienKatalog[] = [
  { kriterium: 'Inhalt / Textverstaendnis', beschreibung: 'Songtext inhaltlich korrekt erfasst; Hauptbotschaft benannt', maxPunkte: 4 },
  { kriterium: 'Bildsprache / Metaphern', beschreibung: 'Zentrale Metaphern und Bilder identifiziert und gedeutet', maxPunkte: 4 },
  { kriterium: 'Sprachliche Mittel', beschreibung: 'Stilmittel (Trikolon, rhetorische Frage, etc.) erkannt und belegt', maxPunkte: 4 },
  { kriterium: 'Wirkung', beschreibung: 'Wirkung der Mittel auf den Hoerer nachvollziehbar beschrieben', maxPunkte: 3 },
  { kriterium: 'Zitate / Belege', beschreibung: 'Aussagen mit konkreten Songtext-Zitaten belegt', maxPunkte: 2 },
  { kriterium: 'Struktur / Aufbau', beschreibung: 'Sinnvoller Aufbau; klare Abschnittsgliederung', maxPunkte: 2 },
  { kriterium: 'Sprachrichtigkeit', beschreibung: 'Grammatik, Rechtschreibung, Zeichensetzung', maxPunkte: 3 },
];
