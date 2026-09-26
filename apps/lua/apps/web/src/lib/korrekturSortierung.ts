export type SortierModus = 'text' | 'typ' | 'sicherheit' | 'status';

export const SORTIER_MODI: ReadonlyArray<{ wert: SortierModus; label: string; hinweis: string }> = [
  { wert: 'text', label: 'Reihenfolge im Text', hinweis: 'Die Vorschläge folgen dem Schülertext – so lässt sich der Text von oben nach unten durchgehen.' },
  { wert: 'typ', label: 'Fehlerart', hinweis: 'G gruppiert nach Rechtschreibung, Grammatik, Zeichensetzung, Ausdruck.' },
  { wert: 'sicherheit', label: 'Unsicherheit zuerst', hinweis: 'Die unsichersten Vorschläge stehen oben – zum gezielten Nachprüfen.' },
  { wert: 'status', label: 'Offene zuerst', hinweis: 'Erst alles ohne Entscheidung, danach die bereits entschiedenen Vorschläge.' },
];

export type FehlerAktion = 'uebernommen' | 'geaendert' | 'verworfen' | null;

export interface SortierbarerFehler {
  id: number;
  typ: string;
  vertrauensstufe: string | null;
}

export interface SortierKontext {
  /** Erste Fundstelle im Rohtext, null wenn der Vorschlag nicht im Text steht. */
  startVon: (id: number) => number | null;
  /** Lehrkraftentscheidung inkl. lokalem, noch nicht gespeichertem Overlay. */
  aktionVon: (id: number) => FehlerAktion;
}

export interface SortiertesFehler<T> {
  /** im Text auffindbar, in gewählter Reihenfolge */
  zugeordnet: T[];
  /** kein Treffer im Text: eigene Gruppe am Listenende */
  nichtZuordenbar: T[];
  /** Fehler-ID -> laufende Nummer (1-basiert). Nur zugeordnete Vorschläge tragen eine. */
  nummern: Map<number, number>;
}

/** Reihenfolge der Fehlerarten: entspricht Legende und `feedback_schema.json`. */
const TYP_REIHENFOLGE = ['R', 'G', 'Z', 'A'];

/** Unsicherste zuerst, ohne Einstufung ans Ende. */
const STUFE_RANG: Record<string, number> = { niedrig: 0, mittel: 1, hoch: 2 };

/** Offene zuerst, entschiedene danach – die verworfenen zuletzt. */
const AKTION_RANG: Record<string, number> = { offen: 0, uebernommen: 1, geaendert: 2, verworfen: 3 };

function rangVon(wert: number | undefined): number {
  return wert === undefined ? Number.MAX_SAFE_INTEGER : wert;
}

/** Sortiert die Fehlerliste. Innerhalb einer Gruppe bleibt immer die
 *  Textreihenfolge erhalten (danach die ID) – ein Moduswechsel soll die
 *  Reihenfolge nicht zufällig wirken lassen.
 *
 *  Nummeriert wird erst danach: die Nummer hängt an der *sichtbaren* Reihenfolge
 *  und damit an der aktuellen Sortierung. Das ist gewollt und in der Anleitung
 *  beschrieben – sonst passten die Zahlen im Text und auf den Karten nicht mehr
 *  zusammen, sobald die Lehrkraft umsortiert. */
export function sortiereFehler<T extends SortierbarerFehler>(
  fehler: readonly T[],
  modus: SortierModus,
  ctx: SortierKontext,
): SortiertesFehler<T> {
  const eintraege = fehler.map(eintrag => ({
    eintrag,
    start: ctx.startVon(eintrag.id),
    typRang: rangVon(TYP_REIHENFOLGE.indexOf(eintrag.typ) >= 0 ? TYP_REIHENFOLGE.indexOf(eintrag.typ) : undefined),
    stufeRang: rangVon(eintrag.vertrauensstufe ? STUFE_RANG[eintrag.vertrauensstufe] : undefined),
    aktionRang: AKTION_RANG[ctx.aktionVon(eintrag.id) ?? 'offen'] ?? AKTION_RANG.offen!,
  }));

  // Nachschlüssel immer: Textposition, dann ID. Hält die Gruppen sortierbar.
  const nachText = (a: typeof eintraege[number], b: typeof eintraege[number]) =>
    rangVon(a.start ?? undefined) - rangVon(b.start ?? undefined) || a.eintrag.id - b.eintrag.id;

  const schluessel = (a: typeof eintraege[number], b: typeof eintraege[number]) => {
    if (modus === 'typ') return a.typRang - b.typRang || nachText(a, b);
    if (modus === 'sicherheit') return a.stufeRang - b.stufeRang || nachText(a, b);
    if (modus === 'status') return a.aktionRang - b.aktionRang || nachText(a, b);
    return nachText(a, b);
  };

  const zugeordnet = eintraege
    .filter(e => e.start !== null)
    .sort(schluessel)
    .map(e => e.eintrag);
  const nichtZuordenbar = eintraege
    .filter(e => e.start === null)
    .sort((a, b) => a.eintrag.id - b.eintrag.id)
    .map(e => e.eintrag);

  const nummern = new Map<number, number>();
  zugeordnet.forEach((f, i) => nummern.set(f.id, i + 1));

  return { zugeordnet, nichtZuordenbar, nummern };
}
