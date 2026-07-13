/** Landabhängige Auswahllisten fürs Lehrerprofil (Settings + First-Run-Schritt). */

export interface SchulformOption {
  value: string;
  label: string;
}

export const REGION_AT = ['Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'];

export const REGION_DE = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen',
  'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
  'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
];

export const SCHULFORMEN_AT: SchulformOption[] = [
  { value: 'ahs', label: 'AHS' },
  { value: 'mittelschule', label: 'Mittelschule' },
  { value: 'bhs', label: 'BHS' },
  { value: 'berufsschule', label: 'Berufsschule' },
  { value: 'sonstige', label: 'Sonstige' },
];

export const SCHULFORMEN_DE: SchulformOption[] = [
  { value: 'gymnasium', label: 'Gymnasium' },
  { value: 'realschule', label: 'Realschule' },
  { value: 'hauptschule', label: 'Haupt-/Mittelschule' },
  { value: 'gesamtschule', label: 'Gesamtschule' },
  { value: 'berufskolleg', label: 'Berufskolleg/Berufsschule' },
  { value: 'sonstige', label: 'Sonstige' },
];
