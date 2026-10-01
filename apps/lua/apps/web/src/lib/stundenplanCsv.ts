export interface StundenplanCsvZeile {
  id: string;
  zeile: number;
  wochentag: number;
  startZeit: string;
  endeZeit: string;
  klasse: string;
  bezeichnung: string;
  /** Was an dieser Zeile noch fehlt. Leeres Array = importierbar. */
  probleme: string[];
}

export interface StundenplanCsvFehler {
  zeile: number;
  meldung: string;
}

export interface StundenplanCsvPruefung {
  /** Alle Datenzeilen der Datei — auch die mit Problemen, damit nichts stillschweigend fehlt. */
  zeilen: StundenplanCsvZeile[];
  /** Probleme der Datei selbst: Kopfzeile, Trennzeichen, leere Datei. */
  fehler: StundenplanCsvFehler[];
}

const TAGE: Record<string, number> = {
  mo: 1, montag: 1, monday: 1,
  di: 2, dienstag: 2, tuesday: 2,
  mi: 3, mittwoch: 3, wednesday: 3,
  do: 4, donnerstag: 4, thursday: 4,
  fr: 5, freitag: 5, friday: 5,
  sa: 6, samstag: 6, saturday: 6,
  so: 7, sonntag: 7, sunday: 7,
};

function normalisiere(text: string): string {
  return text.trim().toLocaleLowerCase('de-AT').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function csvZellen(text: string): string[][] {
  const ersteZeile = text.split(/\r?\n/, 1)[0] ?? '';
  const kandidaten = [',', ';', '\t'];
  const trenner = kandidaten
    .map((zeichen) => ({ zeichen, anzahl: [...ersteZeile].filter((c) => c === zeichen).length }))
    .sort((a, b) => b.anzahl - a.anzahl)[0]?.zeichen ?? ',';
  const zeilen: string[][] = [];
  let zellen: string[] = [];
  let zelle = '';
  let inZitat = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!;
    if (char === '"') {
      if (inZitat && input[i + 1] === '"') { zelle += '"'; i += 1; }
      else inZitat = !inZitat;
    } else if (char === trenner && !inZitat) {
      zellen.push(zelle.trim()); zelle = '';
    } else if ((char === '\n' || char === '\r') && !inZitat) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      zellen.push(zelle.trim());
      if (zellen.some((wert) => wert.length > 0)) zeilen.push(zellen);
      zellen = []; zelle = '';
    } else zelle += char;
  }
  zellen.push(zelle.trim());
  if (zellen.some((wert) => wert.length > 0)) zeilen.push(zellen);
  if (inZitat) throw new Error('Die CSV-Datei enthält ein nicht geschlossenes Anführungszeichen.');
  return zeilen;
}

/**
 * Liest Uhrzeiten aus einer Zelle. Schulverwaltungs-Excel schreibt mal
 * `8.00`, mal `08:00`, mal eine ganze Spanne `8:00-8:45` in dieselbe Spalte.
 * Fuer den Beginn zaehlt die erste, fuer das Ende die letzte Zeit der Zelle.
 */
function zeitAus(wert: string, position: 'start' | 'ende'): string | null {
  const zeiten = [...wert.matchAll(/(\d{1,2})[:.](\d{2})/g)]
    .filter((treffer) => Number(treffer[1]) <= 23 && Number(treffer[2]) <= 59)
    .map((treffer) => `${String(Number(treffer[1])).padStart(2, '0')}:${treffer[2]}`);
  if (!zeiten.length) return null;
  return position === 'start' ? zeiten[0]! : zeiten[zeiten.length - 1]!;
}

export interface StundenplanCsvZeileWerte {
  zeile: number;
  wochentag: number;
  startZeit: string;
  endeZeit: string;
  klasse: string;
  bezeichnung: string;
}

/**
 * Prueft eine Zeile und liefert alles, was noch fehlt. Wird beim Parsen und
 * nach jeder Bearbeitung in der Vorschau benutzt, damit eine Korrektur die
 * Befunde neu bewertet statt sie zu loeschen.
 */
export function zeileProbleme(werte: StundenplanCsvZeileWerte): string[] {
  const probleme: string[] = [];
  if (!werte.wochentag) probleme.push('Wochentag ist ungültig');
  if (!werte.startZeit) probleme.push('Beginn muss eine gültige Uhrzeit sein (z. B. 08:00)');
  if (!werte.endeZeit) probleme.push('Ende muss eine gültige Uhrzeit sein (z. B. 08:45)');
  if (werte.startZeit && werte.endeZeit && werte.endeZeit <= werte.startZeit) probleme.push('Ende muss nach Beginn liegen');
  if (!werte.klasse.trim()) probleme.push('Klasse fehlt');
  if (!werte.bezeichnung.trim()) probleme.push('Fach fehlt');
  return probleme;
}

function findeIndex(kopf: string[], aliases: string[]): number {
  return kopf.findIndex((zelle) => aliases.includes(normalisiere(zelle).replace(/[ _-]/g, '')));
}

/** Prueft und bearbeitet eine CSV-Vorlage für das wiederkehrende Wochenraster; verändert keine Daten. */
export function pruefeStundenplanCsv(text: string): StundenplanCsvPruefung {
  let matrix: string[][];
  try { matrix = csvZellen(text); }
  catch (error) {
    return { zeilen: [], fehler: [{ zeile: 1, meldung: error instanceof Error ? error.message : String(error) }] };
  }
  if (matrix.length < 2) return { zeilen: [], fehler: [{ zeile: 1, meldung: 'Die CSV braucht eine Kopfzeile und mindestens eine Stundenzeile.' }] };

  const kopf = matrix[0]!.map(normalisiere);
  const spalten = {
    tag: findeIndex(kopf, ['wochentag', 'tag', 'day']),
    start: findeIndex(kopf, ['beginn', 'start', 'startzeit', 'von']),
    ende: findeIndex(kopf, ['ende', 'bis', 'end', 'endzeit']),
    klasse: findeIndex(kopf, ['klasse', 'class', 'gruppe']),
    fach: findeIndex(kopf, ['fach', 'bezeichnung', 'subject', 'gegenstand']),
  };
  const fehlend = Object.entries(spalten).filter(([, index]) => index < 0).map(([name]) => name);
  if (fehlend.length) return { zeilen: [], fehler: [{ zeile: 1, meldung: `Kopfzeile unvollständig. Erforderlich sind Wochentag, Beginn, Ende, Klasse und Fach (fehlt: ${fehlend.join(', ')}).` }] };

  const zeilen: StundenplanCsvZeile[] = [];
  const fehler: StundenplanCsvFehler[] = [];
  matrix.slice(1).forEach((zellen, index) => {
    const zeile = index + 2;
    const rohTag = normalisiere(zellen[spalten.tag] ?? '');
    const werte: StundenplanCsvZeileWerte = {
      zeile,
      wochentag: TAGE[rohTag] ?? (/^[1-7]$/.test(rohTag) ? Number(rohTag) : 0),
      startZeit: zeitAus(zellen[spalten.start] ?? '', 'start') ?? '',
      endeZeit: zeitAus(zellen[spalten.ende] ?? '', 'ende') ?? '',
      klasse: (zellen[spalten.klasse] ?? '').trim(),
      bezeichnung: (zellen[spalten.fach] ?? '').trim(),
    };
    zeilen.push({ id: `csv-${zeile}`, ...werte, probleme: zeileProbleme(werte) });
  });
  return { zeilen, fehler };
}

export function gleicheKlasse(a: string, b: string): boolean {
  return normalisiere(a) === normalisiere(b);
}
