// In-App Closed Loop: KlassenView (Heatmap) → LUA-Generator (Step0).
// Da beide Module in EINER App laufen, reicht ein transienter In-Memory-Übergabe-
// punkt (keine Datei-Brücke nötig). Step0 konsumiert die Vorbefüllung beim Mounten.
import type { NataschaPrefill } from './nataschaBridge';

let pending: NataschaPrefill | null = null;

/** Woher die Vorbefüllung kommt. Nur die Korrektur-Quelle ist an `FEATURES.natascha`
 *  gebunden - aus der Planung kommt sie ohne den Umweg über NATASCHA. */
export type PrefillQuelle = 'korrektur' | 'planung';

let quelle: PrefillQuelle = 'korrektur';

/** Setzt die Übungs-Vorbefüllung (aus der Korrektur-Heatmap). */
export function setPendingUebung(prefill: NataschaPrefill): void {
  pending = prefill;
  quelle = 'korrektur';
}

/** Setzt eine Vorbefüllung aus der Unterrichtsplanung.
 *
 *  Eigenes Gatter, weil hier **ohne** NATASCHA gearbeitet wird: die Vorbefüllung
 *  kommt aus dem Stundenplan der Lehrkraft, nicht aus einer Korrektur. `Step0`
 *  hat den Kanal bisher an `FEATURES.natascha` gehängt und hätte sie sonst
 *  kommentarlos verworfen. */
export function setPendingPlanung(prefill: NataschaPrefill): void {
  pending = prefill;
  quelle = 'planung';
}

/** Holt die Vorbefüllung EINMALIG ab und löscht sie (verbraucht).
 *  Liefert zusammen mit der Quelle, damit `Step0` den richtigen Pfad nimmt. */
export function consumePendingUebung(): { prefill: NataschaPrefill; quelle: PrefillQuelle } | null {
  const p = pending;
  const q = quelle;
  pending = null;
  quelle = 'korrektur';
  return p ? { prefill: p, quelle: q } : null;
}
