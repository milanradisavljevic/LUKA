export interface ArchivKlasseMeta {
  name: string;
  archiviert: boolean;
}

/** Filtert Klassen für aktive Ansicht oder expliziten Archivmodus. */
export function filterKlassenNachArchiv<T extends { klasse: string }>(
  klassen: T[],
  metadaten: ArchivKlasseMeta[],
  zeigeArchivierte: boolean,
): T[] {
  if (zeigeArchivierte) return klassen;
  const archivierte = new Set(metadaten.filter((meta) => meta.archiviert).map((meta) => meta.name));
  return klassen.filter((klasse) => !archivierte.has(klasse.klasse));
}
