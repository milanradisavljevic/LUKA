import type { IsoDatum } from './lokalDatum';

/**
 * Amtliche Schulferientermine, je Schuljahr, Land und Region.
 *
 *  **Warum eine Tabelle und keine Formel.** Fast alle Schulferien werden jedes
 *  Jahr neu verordnet. Nur die Oster-termine folgen einem Datum, das sich
 *  berechnen lässt (`ostersonntag`). Alles andere – Herbst, Winter, Pfingst,
 *  Sommer, Weihnachten – ist ein Beschluss, und der ändert sich. Wer hier
 *  rechnet, plant irgendwann in die falschen Ferien.
 *
 *  **Stand.** Befüllt für die Schuljahre 2025/26 und 2026/27. Fehlt ein Jahr,
 *  liefert `ferientermine()` `null` und die Oberfläche **meldet** das. Sie rät
 *  nicht – das war genau der Fehler, den diese Datei ersetzt.
 *
 *  **Jahrgang.** Der Schlüssel nennt den Beginn des Schuljahres: `2026` heißt
 *  2026/27. Der Zeitraum reicht also von Herbst 2026 bis Sommer 2027.
 *
 *  **Region.** Der Schlüssel ist der **Bundeslandname** – für Österreich wie für
 *  Deutschland, weil das Lehrerprofil genau das speichert (`regionAt` bzw.
 *  `regionDe`, siehe `profileOptions.ts`). Die österreichische Numerierung 1..9
 *  wird nur noch als Alteingabe akzeptiert: `regionSchluessel('AT', '5')` ergibt
 *  `Salzburg`. Vorher stand hier der Code, während das Profil den Namen
 *  lieferte – dadurch war die Tabelle für neun von neun Bundesländern
 *  unerreichbar, ohne dass ein Fehler sichtbar wurde.
 *
 *  **Zur Reihenfolge der Blöcke:** chronologisch aufsteigend, wie sie im
 *  Schuljahr liegen. Die Oberfläche sortiert ohnehin.
 */

/** Ein Ferienblock oder ein einzelner schulfreier Tag, wie ihn das Land
 *  bezeichnet. Kein Jahr im Namen – die Liste ist bereits nach Jahr gruppiert. */
export interface Ferienblock {
  bezeichnung: string;
  von: IsoDatum;
  bis: IsoDatum;
}

export interface FerienTerminQuelle {
  land: string;
  /** Für Österreich, wo alle Länder dieselben Termine haben. */
  quelle: string;
  /** Wann geprüft – in der Ferienlücke für die Lehrkraft sichtbar. */
  abgerufen: IsoDatum;
}

const ABGERUFEN: IsoDatum = '2026-09-26';
const AT_QUELLE = 'Bundesministerium für Bildung, Wissenschaft und Forschung (BMB), Schulferien im Schuljahr';
const DE_QUELLE = 'KMK-Ferienkalender, bestätigt durch das jeweilige Landesministerium';

export const QUELLEN: Record<string, FerienTerminQuelle> = {
  '2025/AT': { land: 'AT', quelle: `${AT_QUELLE} 2025/2026`, abgerufen: ABGERUFEN },
  '2026/AT': { land: 'AT', quelle: `${AT_QUELLE} 2026/2027`, abgerufen: ABGERUFEN },
  '2026/DE': { land: 'DE', quelle: DE_QUELLE, abgerufen: ABGERUFEN },
};

// ── Österreich ───────────────────────────────────────────────────────────────
//
// Die gemeinsamen Blöcke sind laut BMB **„alle Bundesländer"** – sie werden
// hier einmal notiert und allen neun Regionen zugeordnet. Das ist die
// amtliche Datenlage, keine Vereinfachung.
//
// Schlüssel ist der Bundeslandname, nicht die Nummer 1..9. Die Nummern waren
// ein Altbestand aus der ersten Planungsfassung; das Lehrerprofil speichert
// Namen, und dadurch passte nichts mehr zusammen.

/** Die neun österreichischen Bundesländer, in Verordnungsreihenfolge. */
export const AT_BUNDESLAENDER = [
  'Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg',
  'Steiermark', 'Tirol', 'Vorarlberg', 'Wien',
] as const;

export type ATBundesland = typeof AT_BUNDESLAENDER[number];

/** Alte Bundesland-Nummern → Name. Nur noch als Alteingabe akzeptiert. */
const AT_ALTCODE: Record<string, ATBundesland> = {
  '1': 'Burgenland', '2': 'Kärnten', '3': 'Niederösterreich', '4': 'Oberösterreich',
  '5': 'Salzburg', '6': 'Steiermark', '7': 'Tirol', '8': 'Vorarlberg', '9': 'Wien',
};

/**
 * Der Name eines österreichischen Bundeslands – aus dem Namen selbst oder aus
 * einer alten Nummer. `null`, wenn es weder das eine noch das andere ist.
 */
export function atBundesland(region: string | null | undefined): ATBundesland | null {
  const r = (region ?? '').toString().trim().replace(/^0/, '');
  if (!r) return null;
  if ((AT_BUNDESLAENDER as readonly string[]).includes(r)) return r as ATBundesland;
  return AT_ALTCODE[r] ?? null;
}

const AT_SEMESTER: Record<ATBundesland, Ferienblock> = {
  Burgenland: { bezeichnung: 'Semesterferien', von: '2027-02-08', bis: '2027-02-13' },
  Kärnten: { bezeichnung: 'Semesterferien', von: '2027-02-08', bis: '2027-02-13' },
  Niederösterreich: { bezeichnung: 'Semesterferien', von: '2027-02-01', bis: '2027-02-06' },
  Oberösterreich: { bezeichnung: 'Semesterferien', von: '2027-02-15', bis: '2027-02-20' },
  Salzburg: { bezeichnung: 'Semesterferien', von: '2027-02-15', bis: '2027-02-20' },
  Steiermark: { bezeichnung: 'Semesterferien', von: '2027-02-15', bis: '2027-02-20' },
  Tirol: { bezeichnung: 'Semesterferien', von: '2027-02-15', bis: '2027-02-20' },
  Vorarlberg: { bezeichnung: 'Semesterferien', von: '2027-02-15', bis: '2027-02-20' },
  Wien: { bezeichnung: 'Semesterferien', von: '2027-02-01', bis: '2027-02-06' },
};

const AT_SOMMER: Record<ATBundesland, Ferienblock> = {
  Burgenland: { bezeichnung: 'Sommerferien', von: '2027-07-03', bis: '2027-09-05' },
  Kärnten: { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-09-12' },
  Niederösterreich: { bezeichnung: 'Sommerferien', von: '2027-07-03', bis: '2027-09-05' },
  Oberösterreich: { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-09-12' },
  Salzburg: { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-09-12' },
  Steiermark: { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-09-12' },
  Tirol: { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-09-12' },
  Vorarlberg: { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-09-12' },
  Wien: { bezeichnung: 'Sommerferien', von: '2027-07-03', bis: '2027-09-05' },
};

const AT2026_GEMEINSAM: Ferienblock[] = [
  { bezeichnung: 'Herbstferien', von: '2026-10-27', bis: '2026-10-31' },
  { bezeichnung: 'Weihnachtsferien', von: '2026-12-24', bis: '2027-01-06' },
];

const AT2025_GEMEINSAM: Ferienblock[] = [
  { bezeichnung: 'Herbstferien', von: '2025-10-27', bis: '2025-10-31' },
  { bezeichnung: 'Weihnachtsferien', von: '2025-12-24', bis: '2026-01-06' },
];

/** Die Ferien eines österreichischen Schuljahres, chronologisch. */
function at2026(region: ATBundesland): Ferienblock[] {
  return [
    ...AT2026_GEMEINSAM,
    AT_SEMESTER[region],
    { bezeichnung: 'Osterferien', von: '2027-03-20', bis: '2027-03-29' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-15', bis: '2027-05-17' },
    AT_SOMMER[region],
  ];
}

function at2025(region: ATBundesland): Ferienblock[] {
  const semester: Record<ATBundesland, Ferienblock> = {
    Burgenland: { bezeichnung: 'Semesterferien', von: '2026-02-09', bis: '2026-02-14' },
    Kärnten: { bezeichnung: 'Semesterferien', von: '2026-02-09', bis: '2026-02-14' },
    Niederösterreich: { bezeichnung: 'Semesterferien', von: '2026-02-02', bis: '2026-02-07' },
    Oberösterreich: { bezeichnung: 'Semesterferien', von: '2026-02-16', bis: '2026-02-21' },
    Salzburg: { bezeichnung: 'Semesterferien', von: '2026-02-09', bis: '2026-02-14' },
    Steiermark: { bezeichnung: 'Semesterferien', von: '2026-02-16', bis: '2026-02-21' },
    Tirol: { bezeichnung: 'Semesterferien', von: '2026-02-09', bis: '2026-02-14' },
    Vorarlberg: { bezeichnung: 'Semesterferien', von: '2026-02-09', bis: '2026-02-14' },
    Wien: { bezeichnung: 'Semesterferien', von: '2026-02-02', bis: '2026-02-07' },
  };
  const sommer: Record<ATBundesland, Ferienblock> = {
    Burgenland: { bezeichnung: 'Sommerferien', von: '2026-07-04', bis: '2026-09-06' },
    Kärnten: { bezeichnung: 'Sommerferien', von: '2026-07-11', bis: '2026-09-13' },
    Niederösterreich: { bezeichnung: 'Sommerferien', von: '2026-07-04', bis: '2026-09-06' },
    Oberösterreich: { bezeichnung: 'Sommerferien', von: '2026-07-11', bis: '2026-09-13' },
    Salzburg: { bezeichnung: 'Sommerferien', von: '2026-07-11', bis: '2026-09-13' },
    Steiermark: { bezeichnung: 'Sommerferien', von: '2026-07-11', bis: '2026-09-13' },
    Tirol: { bezeichnung: 'Sommerferien', von: '2026-07-11', bis: '2026-09-13' },
    Vorarlberg: { bezeichnung: 'Sommerferien', von: '2026-07-11', bis: '2026-09-13' },
    Wien: { bezeichnung: 'Sommerferien', von: '2026-07-04', bis: '2026-09-06' },
  };
  return [
    ...AT2025_GEMEINSAM,
    semester[region],
    { bezeichnung: 'Osterferien', von: '2026-03-28', bis: '2026-04-06' },
    { bezeichnung: 'Pfingstferien', von: '2026-05-23', bis: '2026-05-25' },
    sommer[region],
  ];
}

// ── Deutschland ──────────────────────────────────────────────────────────────
//
// Je Bundesland eigen. Zwei Angaben sind **nicht** belastbar genug, um sie
// ungeprüft zu übernehmen, und stehen deshalb nicht drin:
//
//   - Hessen: die vier „beweglichen Ferientage" unterscheiden sich je
//     Staatlichem Schulamt (Bad Vilbel, Bebra, Frankfurt …). Landesweit modelliert
//     wären sie falsch.
//   - Inseln (Schleswig-Holstein, Niedersachsen) und berufliche Schulen in
//     Mecklenburg-Vorpommern haben abweichende Termine.
//
// Für Sachsen-Anhalt weicht die Pfingstwoche 2027 vom üblichen Muster ab
// (KMK nennt 15.–22.05., eine Landesquelle 18.–21.05.). Hier steht der
// KMK-Stand, weil die KMK die Termine der Länder sammelt. **Vor Nutzung
// gegenprüfen.**

const DE_2026: Record<string, Ferienblock[]> = {
  'Baden-Württemberg': [
    { bezeichnung: 'Herbstferien', von: '2026-10-26', bis: '2026-10-30' },
    { bezeichnung: 'Unterrichtsfrei (Reformationstag)', von: '2026-10-31', bis: '2026-10-31' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-09' },
    { bezeichnung: 'Osterferien', von: '2027-03-30', bis: '2027-04-03' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-18', bis: '2027-05-29' },
    { bezeichnung: 'Sommerferien', von: '2027-07-29', bis: '2027-09-11' },
  ],
  'Bayern': [
    { bezeichnung: 'Herbstferien', von: '2026-10-31', bis: '2026-11-04' },
    { bezeichnung: 'Unterrichtsfreie Woche (Allerheiligen)', von: '2026-11-02', bis: '2026-11-06' },
    { bezeichnung: 'Unterrichtsfrei (Buß- und Bettag)', von: '2026-11-18', bis: '2026-11-18' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-24', bis: '2027-01-08' },
    { bezeichnung: 'Frühjahrsferien', von: '2027-02-08', bis: '2027-02-12' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-02' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-18', bis: '2027-05-28' },
    { bezeichnung: 'Sommerferien', von: '2027-08-02', bis: '2027-09-13' },
  ],
  'Berlin': [
    { bezeichnung: 'Herbstferien', von: '2026-10-19', bis: '2026-10-31' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-02' },
    { bezeichnung: 'Winterferien', von: '2027-02-01', bis: '2027-02-06' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-02' },
    { bezeichnung: 'Unterrichtsfrei', von: '2027-05-07', bis: '2027-05-07' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-18', bis: '2027-05-19' },
    { bezeichnung: 'Sommerferien', von: '2027-07-01', bis: '2027-08-14' },
  ],
  'Brandenburg': [
    { bezeichnung: 'Herbstferien', von: '2026-10-19', bis: '2026-10-30' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-02' },
    { bezeichnung: 'Winterferien', von: '2027-02-01', bis: '2027-02-06' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-03' },
    { bezeichnung: 'Unterrichtsfrei', von: '2027-05-07', bis: '2027-05-07' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-18', bis: '2027-05-18' },
    { bezeichnung: 'Sommerferien', von: '2027-07-01', bis: '2027-08-14' },
  ],
  'Bremen': [
    { bezeichnung: 'Herbstferien', von: '2026-10-12', bis: '2026-10-24' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-09' },
    { bezeichnung: 'Halbjahresferien', von: '2027-02-01', bis: '2027-02-02' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-03' },
    { bezeichnung: 'Unterrichtsfrei', von: '2027-05-07', bis: '2027-05-07' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-18', bis: '2027-05-18' },
    { bezeichnung: 'Sommerferien', von: '2027-07-08', bis: '2027-08-18' },
  ],
  'Hamburg': [
    { bezeichnung: 'Herbstferien', von: '2026-10-19', bis: '2026-10-30' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-21', bis: '2027-01-01' },
    { bezeichnung: 'Winterferien', von: '2027-01-29', bis: '2027-01-29' },
    { bezeichnung: 'Frühjahrsferien', von: '2027-03-01', bis: '2027-03-12' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-07', bis: '2027-05-14' },
    { bezeichnung: 'Sommerferien', von: '2027-07-01', bis: '2027-08-11' },
  ],
  'Hessen': [
    { bezeichnung: 'Herbstferien', von: '2026-10-05', bis: '2026-10-17' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-12' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-02' },
    { bezeichnung: 'Sommerferien', von: '2027-06-28', bis: '2027-08-06' },
  ],
  'Mecklenburg-Vorpommern': [
    { bezeichnung: 'Herbstferien', von: '2026-10-15', bis: '2026-10-24' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-21', bis: '2027-01-02' },
    { bezeichnung: 'Winterferien', von: '2027-02-08', bis: '2027-02-19' },
    { bezeichnung: 'Osterferien', von: '2027-03-24', bis: '2027-04-02' },
    { bezeichnung: 'Feststehender Ferientag', von: '2027-05-07', bis: '2027-05-07' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-14', bis: '2027-05-18' },
    { bezeichnung: 'Sommerferien', von: '2027-07-05', bis: '2027-08-14' },
  ],
  'Niedersachsen': [
    { bezeichnung: 'Herbstferien', von: '2026-10-12', bis: '2026-10-24' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-09' },
    { bezeichnung: 'Halbjahresferien', von: '2027-02-01', bis: '2027-02-02' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-03' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-07', bis: '2027-05-07' },
    { bezeichnung: 'Pfingstferien (2. Tag)', von: '2027-05-18', bis: '2027-05-18' },
    { bezeichnung: 'Sommerferien', von: '2027-07-08', bis: '2027-08-18' },
  ],
  'Nordrhein-Westfalen': [
    { bezeichnung: 'Herbstferien', von: '2026-10-17', bis: '2026-10-31' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-06' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-03' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-18', bis: '2027-05-18' },
    { bezeichnung: 'Sommerferien', von: '2027-07-19', bis: '2027-08-31' },
  ],
  'Rheinland-Pfalz': [
    { bezeichnung: 'Herbstferien', von: '2026-10-05', bis: '2026-10-16' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-08' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-02' },
    { bezeichnung: 'Sommerferien', von: '2027-06-28', bis: '2027-08-06' },
  ],
  'Saarland': [
    { bezeichnung: 'Herbstferien', von: '2026-10-05', bis: '2026-10-16' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-21', bis: '2026-12-31' },
    { bezeichnung: 'Fastnachtsferien', von: '2027-02-08', bis: '2027-02-12' },
    { bezeichnung: 'Osterferien', von: '2027-03-30', bis: '2027-04-09' },
    { bezeichnung: 'Sommerferien', von: '2027-06-28', bis: '2027-08-06' },
  ],
  'Sachsen': [
    { bezeichnung: 'Herbstferien', von: '2026-10-12', bis: '2026-10-24' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-02' },
    { bezeichnung: 'Winterferien', von: '2027-02-08', bis: '2027-02-19' },
    { bezeichnung: 'Osterferien', von: '2027-03-26', bis: '2027-04-02' },
    { bezeichnung: 'Unterrichtsfrei', von: '2027-05-07', bis: '2027-05-07' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-15', bis: '2027-05-18' },
    { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-08-20' },
  ],
  'Sachsen-Anhalt': [
    { bezeichnung: 'Herbstferien', von: '2026-10-19', bis: '2026-10-30' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-21', bis: '2027-01-02' },
    { bezeichnung: 'Winterferien', von: '2027-02-01', bis: '2027-02-06' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-03-27' },
    { bezeichnung: 'Pfingstferien', von: '2027-05-15', bis: '2027-05-22' },
    { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-08-20' },
  ],
  'Schleswig-Holstein': [
    { bezeichnung: 'Herbstferien', von: '2026-10-12', bis: '2026-10-24' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-21', bis: '2027-01-06' },
    { bezeichnung: 'Osterferien', von: '2027-03-30', bis: '2027-04-10' },
    { bezeichnung: 'Unterrichtsfrei', von: '2027-05-07', bis: '2027-05-07' },
    { bezeichnung: 'Sommerferien', von: '2027-07-03', bis: '2027-08-14' },
  ],
  'Thüringen': [
    { bezeichnung: 'Herbstferien', von: '2026-10-12', bis: '2026-10-24' },
    { bezeichnung: 'Weihnachtsferien', von: '2026-12-23', bis: '2027-01-02' },
    { bezeichnung: 'Winterferien', von: '2027-02-01', bis: '2027-02-06' },
    { bezeichnung: 'Osterferien', von: '2027-03-22', bis: '2027-04-03' },
    { bezeichnung: 'Unterrichtsfrei', von: '2027-05-07', bis: '2027-05-07' },
    { bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-08-20' },
  ],
};

/** Die Bundesländer, für die Termine vorliegen. Für Einstellungen und Tests. */
export const DE_BUNDESLAENDER = Object.keys(DE_2026);

/**
 * Die amtlichen Termine eines Schuljahres.
 *
 *  `null` heißt: **für dieses Jahr oder dieses Bundesland liegen keine Termine
 *  vor.** Kein leeres Array, kein Raten – die aufrufende Oberfläche meldet die
 *  Lücke, damit die Lehrkraft ihre Ferien selbst einträgt.
 */
export function ferientermine(
  schuljahr: number, land: string, region: string | null | undefined,
): Ferienblock[] | null {
  const l = (land ?? 'AT').toUpperCase();
  if (l === 'AT') {
    const bl = atBundesland(region);
    if (!bl) return null;
    if (schuljahr === 2026) return at2026(bl);
    if (schuljahr === 2025) return at2025(bl);
    return null;
  }
  if (l === 'DE') {
    const reg = (region ?? '').toString().trim();
    if (!reg) return null;
    return schuljahr === 2026 ? (DE_2026[reg] ?? null) : null;
  }
  // Die Schweiz bleibt außen vor: die Schulferien sind kantonal, und im Profil
  // steht dafür ein Freitextfeld. Siehe `ferienWarnung`.
  return null;
}

/**
 * Bringt einen Regionswert auf die Form, in der Vergleiche stattfinden.
 *
 *  Nötig, weil `schulferien.region` in der Datenbank ein **freier Text** ist:
 *  Zeilen aus einer älteren Fassung tragen dort die Bundesland-Nummer (`'5'`),
 *  das Lehrerprofil dagegen den Namen. Ohne diese Normalisierung findet eine
 *  eingetragene Ferie nie ihr Bundesland – und der Fehler zeigt sich als
 *  „nichts passiert", nicht als Fehlermeldung.
 *
 *  Ohne Landbezug: `'5'` wird zu `'Salzburg'`, `'Bayern'` bleibt `'Bayern'`,
 *  Unbekanntes bleibt, wie es ist.
 */
export function regionNormalisieren(region: string | null | undefined): string {
  return atBundesland(region) ?? (region ?? '').toString().trim();
}

/** Die Quelle hinter den Terminen – für die Anzeige beim Übernehmen. */
export function ferienTerminQuelle(schuljahr: number, land: string): FerienTerminQuelle | null {
  return QUELLEN[`${schuljahr}/${(land ?? '').toUpperCase()}`] ?? null;
}
