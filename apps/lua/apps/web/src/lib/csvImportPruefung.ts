export type CsvImportWarnung = 'dubletten_in_datei' | 'dubletten_im_bestand' | 'vorname_fehlt';

export interface CsvImportBestand {
  vorname: string;
  nachname?: string | null;
}

export interface CsvImportZeile {
  id: string;
  zeile: number;
  vorname: string;
  nachname: string;
  ausgewaehlt: boolean;
  warnungen: CsvImportWarnung[];
}

export interface CsvImportPruefung {
  zeilen: CsvImportZeile[];
}

function schluessel(vorname: string, nachname: string): string {
  return `${vorname.trim().toLocaleLowerCase()}\u0000${nachname.trim().toLocaleLowerCase()}`;
}

function teileZeile(line: string): string[] {
  const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
  return line.split(delimiter).map((part) => part.trim());
}

function istKopfzeile(parts: string[]): boolean {
  return parts.some((part) => /^(vorname|nachname|name)$/i.test(part));
}

/** Prüft einen Schüler-CSV-Text, ohne Datenbank- oder UI-Zustand zu verändern. */
export function pruefeCsvImport(csvText: string, bestand: CsvImportBestand[] = []): CsvImportPruefung {
  const lines = csvText
    .split(/\r?\n/)
    .map((raw, index) => ({ raw: raw.trim(), zeile: index + 1 }))
    .filter(({ raw }) => raw.length > 0);
  if (lines.length === 0) return { zeilen: [] };

  const ersteTeile = teileZeile(lines[0]!.raw);
  const hatKopfzeile = istKopfzeile(ersteTeile);
  const vornameIndex = hatKopfzeile
    ? ersteTeile.findIndex((part) => /^vorname$/i.test(part))
    : 0;
  const nachnameIndex = hatKopfzeile
    ? ersteTeile.findIndex((part) => /^nachname$/i.test(part))
    : 1;
  const daten = hatKopfzeile ? lines.slice(1) : lines;

  const parsed = daten.map(({ raw, zeile }, index) => {
    const parts = teileZeile(raw);
    if (parts.length >= 2) {
      return {
        id: `csv-${zeile}-${index}`,
        zeile,
        vorname: parts[vornameIndex >= 0 ? vornameIndex : 0] ?? '',
        nachname: parts[nachnameIndex >= 0 ? nachnameIndex : 1] ?? '',
      };
    }

    const words = (parts[0] ?? '').split(/\s+/).filter(Boolean);
    return {
      id: `csv-${zeile}-${index}`,
      zeile,
      vorname: words[0] ?? '',
      nachname: words.slice(1).join(' '),
    };
  });

  const dateiAnzahl = new Map<string, number>();
  for (const row of parsed) {
    if (row.vorname.trim()) {
      const key = schluessel(row.vorname, row.nachname);
      dateiAnzahl.set(key, (dateiAnzahl.get(key) ?? 0) + 1);
    }
  }
  const bestandKeys = new Set(bestand.map((row) => schluessel(row.vorname, row.nachname ?? '')));

  return {
    zeilen: parsed.map((row) => {
      const warnungen: CsvImportWarnung[] = [];
      const key = schluessel(row.vorname, row.nachname);
      if (!row.vorname.trim()) warnungen.push('vorname_fehlt');
      if (row.vorname.trim() && (dateiAnzahl.get(key) ?? 0) > 1) warnungen.push('dubletten_in_datei');
      if (row.vorname.trim() && bestandKeys.has(key)) warnungen.push('dubletten_im_bestand');
      return { ...row, ausgewaehlt: !!row.vorname.trim(), warnungen };
    }),
  };
}
