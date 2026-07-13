/**
 * Anzeigename für eine Abgabe: echter Schülername, wenn mit einem Schüler-
 * Datensatz verknüpft — sonst der Dateiname, aber bereinigt statt roh
 * ("Neuer_Booktok_trend-MiaMuster.docx" wirkt wie ein Bug, nicht wie ein
 * fehlender Datensatz). Der Original-Dateiname bleibt separat abrufbar
 * (z. B. als title-Tooltip), damit nichts an Information verloren geht.
 */
export function anzeigeName(a: { vorname?: string | null; nachname?: string | null; dateiname: string }): string {
  const echterName = [a.vorname, a.nachname].filter(Boolean).join(' ');
  if (echterName) return echterName;
  return bereinigeDateiname(a.dateiname);
}

export function bereinigeDateiname(dateiname: string): string {
  return dateiname
    .replace(/\.(docx?|pdf|txt|rtf|odt)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || dateiname;
}
