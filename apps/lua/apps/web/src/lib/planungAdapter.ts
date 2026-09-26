import { heuteIso } from './lokalDatum';
import type { GeplanteStunde, RasterSlot } from './stundenMappen';
import type { GeplanteStundeRecord, RasterSlotRecord } from '../hooks/usePlanung';

/**
 * Übersetzt die Datenbank-Records der Planung in die Form, mit der die
 * Kalenderlogik rechnet. Bewusst ohne eigene Logik: nur Felder benennen und den
 * Datumsfallback auflösen, den Rust nicht liefern kann.
 */

/** Wie `RasterSlot` aus `stundenMappen`, mit dem neuen Schuljahresbezug. */
export function alsRasterSlots(raster: readonly RasterSlotRecord[]): RasterSlot[] {
  return raster.map(r => ({
    id: r.id,
    klasseId: r.klasseId,
    klasseName: r.klasseNameSnapshot,
    wochentag: r.wochentag,
    startZeit: r.startZeit,
    endeZeit: r.endeZeit,
    bezeichnung: r.bezeichnung,
    schuljahr: r.schuljahr,
    aktiv: r.aktiv,
  }));
}

/** Wie `GeplanteStunde` aus `stundenMappen`. */
export function alsStunden(stunden: readonly GeplanteStundeRecord[]): GeplanteStunde[] {
  return stunden.map(s => ({
    id: s.id,
    klasseId: s.klasseId,
    klasseName: s.klasseNameSnapshot,
    // Ohne Plan-Datum (Altdatensatz) zählt der Einsatz, sonst das geplante Datum.
    datum: s.geplantAm ?? s.eingesetztAm ?? heuteIso(),
    startZeit: s.startZeit,
    endeZeit: s.endeZeit,
    titel: s.titelSnapshot,
    status: s.status,
    einsatzArt: s.einsatzArt,
    rasterId: s.rasterId,
    notiz: s.notiz,
    anzahlMaterialien: s.anzahlMaterialien,
  }));
}
