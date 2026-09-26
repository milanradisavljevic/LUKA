/** Farbe einer Klasse im Stundenplan.
 *
 *  Drei Grundsätze, die zusammenpassen müssen:
 *  1. Die Farbe ist ein **zusätzliches** Merkmal, nie das einzige. Der Klassenname
 *     steht immer daneben – sonst ist die Zuordnung für Farbenblinde verloren.
 *  2. Der Resolver gibt eine **CSS-Variablenreferenz** zurück (`var(--klasse-3)`),
 *     keine Farbe. Damit wechselt das Theme mit, ohne eine Zeile Theme-Logik in
 *     TypeScript. Ableitungen laufen über `color-mix()`, das die App schon nutzt.
 *  3. Acht Töne sind gewollt. Wer mehr Klassen hat, bekommt Wiederholungen – und
 *     einen sichtbaren Hinweis, statt zwei Klassen stillschweigend gleich zu färben.
 */

/** Anzahl der Farbslots. In Rust identisch (Backfill in `db.rs`). */
export const KLASSEN_SLOTS = 8;

export const KLASSEN_TONE = [
  { slot: 1, name: 'Navy' },
  { slot: 2, name: 'Terrakotta' },
  { slot: 3, name: 'Oliv' },
  { slot: 4, name: 'Pflaume' },
  { slot: 5, name: 'Petrol' },
  { slot: 6, name: 'Ocker' },
  { slot: 7, name: 'Rose' },
  { slot: 8, name: 'Schiefer' },
] as const;

/** Wie viele Klassen bereits eine Farbe haben – für den Hinweis bei mehr als acht. */
export function farbHinweisNoetig(anzahlKlassen: number): string | null {
  return anzahlKlassen > KLASSEN_SLOTS
    ? `Mehr als ${KLASSEN_SLOTS} Klassen: Die Farben wiederholen sich. Der Klassenname bleibt deshalb immer lesbar.`
    : null;
}

function normalisiereSlot(wert: string | number | null | undefined): number | null {
  if (wert === null || wert === undefined) return null;
  const n = typeof wert === 'number' ? wert : Number(String(wert).trim());
  if (!Number.isInteger(n) || n < 1 || n > KLASSEN_SLOTS) return null;
  return n;
}

/** Stabile Zahl aus einem Klassennamen – nur der Notfall für Klassen ohne
 *  Eintrag in der Datenbank (etwa weil die Klasse gelöscht wurde, der Termin
 *  aber bestehen bleibt). Ein Hash verteilt die Namen gut genug, und er ist
 *  stabil: dieselbe Klasse bekommt überall dieselbe Farbe. */
export function farbIndexFuerName(name: string): number {
  const text = name.trim().toUpperCase();
  if (!text) return 1;
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) % 100003;
  }
  return (h % KLASSEN_SLOTS) + 1;
}

/** `var(--klasse-3)` – für borderLeftColor, color und color-mix. */
export function farbVar(slot: number): string {
  const normiert = normalisiereSlot(slot) ?? 1;
  return `var(--klasse-${normiert})`;
}

/** Getönter Grund für Badges: `color-mix` statt einer eigenen Farbe je Theme. */
export function farbFlaeche(slot: number, anteil = 14): string {
  return `color-mix(in srgb, ${farbVar(slot)} ${anteil}%, var(--color-bg-surface))`;
}

/** Die nächste freie Farbe für eine neu angelegte Klasse. */
export function naechsteFreieFarbnummer(belegt: ReadonlySet<number>): number {
  for (let slot = 1; slot <= KLASSEN_SLOTS; slot++) {
    if (!belegt.has(slot)) return slot;
  }
  return 1;
}

/** Wie die Oberfläche eine Klassenfarbe findet, in dieser Reihenfolge:
 *  gespeichert → Name in der Klassenliste → Hash aus dem Namen.
 *
 *  `liste` bildet Klassennamen auf gespeicherte Slots ab. Der Hash-Zweig greift
 *  bei Klassen, die es in `liste` nicht (mehr) gibt. */
export function farbeFuerKlasse(
  gespeichert: string | number | null | undefined,
  klasseName: string,
  liste: ReadonlyMap<string, number>,
): { slot: number; quelle: 'gespeichert' | 'liste' | 'hash' } {
  const direkt = normalisiereSlot(gespeichert);
  if (direkt !== null) return { slot: direkt, quelle: 'gespeichert' };
  const ausListe = liste.get(klasseName.trim()) ?? liste.get(klasseName.trim().toUpperCase());
  if (ausListe !== undefined && normalisiereSlot(ausListe) !== null) {
    return { slot: normalisiereSlot(ausListe)!, quelle: 'liste' };
  }
  return { slot: farbIndexFuerName(klasseName), quelle: 'hash' };
}

/** Setzt die CSS-Farbe an einem Knoten – einmal für Rand, Text und Fläche. */
export function klasseFarbStil(gespeichert: string | number | null | undefined, klasseName: string, liste: ReadonlyMap<string, number>): React.CSSProperties {
  const { slot } = farbeFuerKlasse(gespeichert, klasseName, liste);
  return { '--klasse-farbe': farbVar(slot) } as React.CSSProperties;
}

/**
 * Vergibt die Farben für eine ganze Klassenliste und liefert Name → Slot.
 * Klassen ohne hinterlegte Farbe bekommen in Listenreihenfolge den nächsten
 * freien Ton – so bleiben sie über Neuladevorgänge hinweg stabil und kollidieren
 * nicht mit einer bereits zugewiesenen Farbe.
 *
 *  Wird von Klassenverwaltung und Planung geteilt, damit dieselbe Klasse
 *  überall dieselbe Farbe hat.
 */
export function farbListeAusKlassen(
  klassen: ReadonlyArray<{ name: string; farbe?: string | number | null }>,
): Map<string, number> {
  const liste = new Map<string, number>();
  const belegt = new Set<number>();
  for (const k of klassen) {
    const slot = normalisiereSlot(k.farbe);
    const name = k.name.trim();
    if (name && slot !== null && !liste.has(name)) {
      liste.set(name, slot);
      belegt.add(slot);
    }
  }
  for (const k of klassen) {
    const name = k.name.trim();
    if (!name || liste.has(name)) continue;
    // `naechsteFreieFarbnummer` läuft bewusst zyklisch und liefert bei voller
    // Palette wieder 1 – deshalb hier selbst die Kapazität prüfen, sonst
    // bekämen ab der neunten Klasse zwei Klassen denselben Ton.
    if (belegt.size >= KLASSEN_SLOTS) break;
    const frei = naechsteFreieFarbnummer(belegt);
    liste.set(name, frei);
    belegt.add(frei);
  }
  return liste;
}
