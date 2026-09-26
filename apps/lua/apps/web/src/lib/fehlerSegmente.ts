import { findeTextanker, type AnkerStatus, type Textanker } from './textAnchors';

export type FehlerAktion = 'uebernommen' | 'geaendert' | 'verworfen' | null;

/** Das, was die Korrektur-Ansicht zum Sortieren/Orten braucht — bewusst
 *  strukturell, damit die DB-Zeile und der lokale Aktions-Overlay beide passen. */
export interface FehlerEingang {
  id: number;
  zitat: string | null;
  typ: string;
  aktion: FehlerAktion;
}

export interface FehlerSegment {
  fehlerId: number;
  typ: string;
  aktion: FehlerAktion;
  ankerStatus: AnkerStatus;
  /** true bei mehr als einer Fundstelle — der Text bekommt dann gestrichelte Unterstreichung. */
  mehrdeutig: boolean;
  start: number;
  ende: number;
  /** Erste Fundstelle: darauf springt die Ansicht, darauf wird sortiert. */
  primaer: boolean;
}

export interface SegmentErgebnis {
  /** aufsteigend nach `start` — direkt als Text-Ersetzung verwendbar */
  segmente: FehlerSegment[];
  /** Fehler-ID -> tatsächlich gerenderte Segmente (leer = kein Platz im Text) */
  nachFehler: Map<number, FehlerSegment[]>;
  /** Fehler-ID -> Rohbefund des Ankers, auch wenn nichts gerendert werden konnte */
  anker: Map<number, Textanker>;
  /** Vorschlaege mit Fundstelle, deren Platz ein anderer Vorschlag belegt hat */
  ohnePlatz: number[];
}

function ueberschneidet(a: { start: number; ende: number }, b: { start: number; ende: number }): boolean {
  return a.start < b.ende && b.start < a.ende;
}

/** Ordnet jedem Vorschlag seine Markierungen im Rohtext zu.
 *
 *  Zwei Durchgaenge, damit moeglichst jeder Vorschlag mindestens eine Stelle bekommt:
 *  erst alle ersten Fundstellen, dann die weiteren. Innerhalb eines Durchgangs
 *  gewinnt die laengere Stelle, bei Gleichstand die kleinere Fehler-ID — damit ist
 *  das Ergebnis unabhaengig von der Reihenfolge der Fehlerliste.
 */
export function baueFehlerSegmente(text: string, fehler: readonly FehlerEingang[]): SegmentErgebnis {
  const anker = new Map<number, Textanker>();
  for (const f of fehler) anker.set(f.id, findeTextanker(text, f.zitat));

  const wartend: Array<{ kandidat: Omit<FehlerSegment, 'start' | 'ende'>; start: number; ende: number }> = [];
  for (const f of fehler) {
    const treffer = anker.get(f.id)?.treffer ?? [];
    treffer.forEach((t, i) => {
      wartend.push({
        kandidat: {
          fehlerId: f.id,
          typ: f.typ,
          aktion: f.aktion,
          ankerStatus: anker.get(f.id)!.status,
          mehrdeutig: treffer.length > 1,
          primaer: i === 0,
        },
        start: t.start,
        ende: t.start + t.laenge,
      });
    });
  }

  // Längere Stelle gewinnt Überlappungen, danach kleinere ID: stabil und unabhängig
  // von der Listenreihenfolge. start ist nur der Nachschlüssel für den Vergleich.
  const rang = (a: typeof wartend[number], b: typeof wartend[number]) =>
    (b.ende - b.start) - (a.ende - a.start)
    || a.kandidat.fehlerId - b.kandidat.fehlerId
    || a.start - b.start;

  const genommen: Array<{ start: number; ende: number }> = [];
  const behalten: typeof wartend = [];
  for (const Durchgang of [true, false]) {
    const kandidaten = wartend.filter(w => w.kandidat.primaer === Durchgang).sort(rang);
    for (const k of kandidaten) {
      if (genommen.some(g => ueberschneidet(g, k))) continue;
      genommen.push({ start: k.start, ende: k.ende });
      behalten.push(k);
    }
  }

  const segmente = behalten
    .map(k => ({ ...k.kandidat, start: k.start, ende: k.ende }))
    .sort((a, b) => a.start - b.start || a.ende - b.ende);

  const nachFehler = new Map<number, FehlerSegment[]>();
  for (const s of segmente) {
    const liste = nachFehler.get(s.fehlerId);
    if (liste) liste.push(s);
    else nachFehler.set(s.fehlerId, [s]);
  }

  const ohnePlatz = fehler
    .filter(f => (anker.get(f.id)?.treffer.length ?? 0) > 0 && !nachFehler.has(f.id))
    .map(f => f.id);

  return { segmente, nachFehler, anker, ohnePlatz };
}

/** Erste (springende) Fundstelle eines Vorschlags — null, wenn er nicht im Text steht. */
export function primaerStart(ergebnis: SegmentErgebnis, fehlerId: number): number | null {
  const seg = ergebnis.nachFehler.get(fehlerId)?.find(s => s.primaer);
  return seg ? seg.start : null;
}
