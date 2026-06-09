// In-App Closed Loop: KlassenView (Heatmap) → LUA-Generator (Step0).
// Da beide Module in EINER App laufen, reicht ein transienter In-Memory-Übergabe-
// punkt (keine Datei-Brücke nötig). Step0 konsumiert die Vorbefüllung beim Mounten.
import type { NataschaPrefill } from './nataschaBridge';

let pending: NataschaPrefill | null = null;

/** Setzt die Übungs-Vorbefüllung (aus der Korrektur-Heatmap). */
export function setPendingUebung(prefill: NataschaPrefill): void {
  pending = prefill;
}

/** Holt die Vorbefüllung EINMALIG ab und löscht sie (verbraucht). */
export function consumePendingUebung(): NataschaPrefill | null {
  const p = pending;
  pending = null;
  return p;
}
