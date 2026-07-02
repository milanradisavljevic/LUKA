// Datei-Brücke NATASCHA → LUA (Phase 1): Typen + Mapping der Korrekturdaten
// auf die Felder, die Step0 zum Vorbefüllen braucht. Vertrag: ../../../../../bridge/schema.json.
import type { BlockTyp, Fach, Stufe } from '@lehrunterlagen/schema';

export interface BridgeHeatmapEintrag {
  typ: 'R' | 'G' | 'Z' | 'A';
  kategorie: string;
  anzahl: number;
  prozent?: number;
}

export interface BridgeBeispiel {
  typ: 'R' | 'G' | 'Z' | 'A';
  zitat: string;
  korrektur: string;
  erklaerung?: string;
  haeufigkeit?: number;
}

export interface BridgeExport {
  schemaVersion: number;
  klasse: string;
  aufgabe: string;
  fach: Fach;
  schulstufe?: Stufe;
  textsorte?: string;
  /** v2, optional: Ausgangstext der Originalarbeit → Quelltext-Vorbefüllung. */
  ausgangstext?: string;
  datum: string;
  anzahlAbgaben?: number;
  heatmap: BridgeHeatmapEintrag[];
  beispiele?: BridgeBeispiel[];
  empfehlungen?: string[];
}

/** Metadaten eines Exports für die Auswahlliste (Rückgabe des Rust-Commands). */
export interface BridgeExportMeta {
  klasse: string;
  aufgabe: string;
  datum: string;
  fach: string;
  anzahlAbgaben: number;
  /** Summe aller Heatmap-Fehler (für das "X Fehler"-Badge). */
  gesamtFehler: number;
  /** Heatmap, stärkste Kategorie zuerst (für die Mini-Vorschau). */
  heatmap: BridgeHeatmapEintrag[];
  pfad: string;
  dateiname: string;
}

/** Farben je Fehlerkategorie für die Heatmap-Vorschau in der Auswahlliste. */
export const TYP_FARBE: Record<BridgeHeatmapEintrag['typ'], string> = {
  R: '#e57373',
  G: '#64b5f6',
  Z: '#ffb74d',
  A: '#ba68c8',
};

/** Aktuelle Schreib-Version. */
export const SUPPORTED_BRIDGE_VERSION = 2;
/** Lesbare Versionen (abwärtskompatibel). */
export const SUPPORTED_BRIDGE_VERSIONS = [1, 2] as const;

/** Fehlerkategorie → passende LUA-Aufgabentypen (Heuristik, siehe bridge/README.md). */
export const KATEGORIE_TO_BLOCKTYPEN: Record<BridgeHeatmapEintrag['typ'], BlockTyp[]> = {
  R: ['lueckentext', 'vokabeluebung'],
  G: ['lueckentext', 'offeneVerstaendnisfrage', 'offeneSchreibaufgabe'],
  Z: ['lueckentext', 'markieraufgabe'],
  A: ['stiluebung', 'wordScramble'],
};

/** Kurze Kategoriecodes aus NATASCHA → lesbare Schwerpunkte. */
export const KATEGORIE_LABEL: Record<string, string> = {
  R: 'Rechtschreibung',
  G: 'Grammatik',
  Z: 'Zeichensetzung',
  A: 'Ausdruck',
};

export interface NataschaPrefill {
  thema: string;
  fach: Fach;
  stufe: Stufe;
  fokusThemen: string[];
  gewuenschteAufgabenarten: BlockTyp[];
  notizen: string;
  /** v2: Ausgangstext der Originalarbeit → Step0 befüllt damit den Quelltext vor. */
  ausgangstext?: string;
  /** v2: Strukturierte Schülerfehler → editierbare Kurations-Liste in Step0. */
  fehler?: BridgeBeispiel[];
}

interface HeatmapPrefillEntry {
  typ: string;
  anzahl: number;
}

interface BuildPrefillFromHeatmapArgs {
  klasse: string;
  aufgabe?: string;
  heatmap: HeatmapPrefillEntry[];
  ausgangstext?: string;
}

/** Baut eine Generator-Vorbefüllung direkt aus SQLite-Heatmap-Daten. */
export function buildPrefillFromHeatmap({
  klasse,
  aufgabe,
  heatmap,
  ausgangstext,
}: BuildPrefillFromHeatmapArgs): NataschaPrefill | null {
  const top = [...heatmap]
    .filter((h) => h.anzahl > 0)
    .sort((a, b) => b.anzahl - a.anzahl)
    .slice(0, 3);

  if (top.length === 0) return null;

  const fokusThemen = top.map((h) => KATEGORIE_LABEL[h.typ] ?? h.typ);
  const gewuenschteAufgabenarten: BlockTyp[] = [];
  for (const h of top) {
    for (const t of (KATEGORIE_TO_BLOCKTYPEN[h.typ as BridgeHeatmapEintrag['typ']] ?? [])) {
      if (!gewuenschteAufgabenarten.includes(t)) gewuenschteAufgabenarten.push(t);
    }
  }

  return {
    thema: `Übung zu Fehlerschwerpunkten – ${klasse}${aufgabe ? ' · ' + aufgabe : ''}`,
    // V1-Limitierung: NATASCHA-Heatmaps kommen aktuell aus Deutsch-Korrekturen; Stufe wird in Step 0 anpassbar.
    fach: 'deutsch',
    stufe: 'oberstufe',
    fokusThemen,
    gewuenschteAufgabenarten,
    notizen: `Automatisch aus der Korrektur-Heatmap der Klasse ${klasse} erzeugt. Schwerpunkte: ${fokusThemen.join(', ')}.`,
    ausgangstext: ausgangstext?.trim() || undefined,
  };
}

/**
 * Validiert + parst einen rohen Export-String. Wirft bei unbekannter Version oder
 * fehlenden Pflichtfeldern — der Aufrufer zeigt die Meldung freundlich an.
 */
export function parseBridgeExport(raw: string): BridgeExport {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Die NATASCHA-Datei ist kein gültiges JSON.');
  }
  const d = data as Partial<BridgeExport>;
  if (typeof d?.schemaVersion !== 'number') {
    throw new Error('Unbekanntes NATASCHA-Format (schemaVersion fehlt).');
  }
  if (!(SUPPORTED_BRIDGE_VERSIONS as readonly number[]).includes(d.schemaVersion)) {
    throw new Error(
      `NATASCHA-Export hat Version ${d.schemaVersion}, unterstützt werden ${SUPPORTED_BRIDGE_VERSIONS.join(', ')}.`,
    );
  }
  if (!d.klasse || !d.aufgabe || !Array.isArray(d.heatmap)) {
    throw new Error('NATASCHA-Export ist unvollständig (klasse/aufgabe/heatmap).');
  }
  return data as BridgeExport;
}

/** Baut die Vorbefüllung für Step0 aus einem geparsten Export. */
export function mapBridgeToPrefill(ex: BridgeExport): NataschaPrefill {
  // Kategorien nach Häufigkeit, stärkste zuerst; Top 3 als Fokus.
  const top = [...ex.heatmap]
    .filter((h) => (h.anzahl ?? 0) > 0)
    .sort((a, b) => b.anzahl - a.anzahl)
    .slice(0, 3);

  const fokusThemen = top.map((h) => h.kategorie);

  const gewuenschteAufgabenarten: BlockTyp[] = [];
  for (const h of top) {
    for (const t of KATEGORIE_TO_BLOCKTYPEN[h.typ] ?? []) {
      if (!gewuenschteAufgabenarten.includes(t)) gewuenschteAufgabenarten.push(t);
    }
  }

  // Fehler bleiben strukturiert (für die editierbare Kuration in Step0); notizen
  // tragen nur noch einen knappen Kontext-Satz, nicht mehr den ganzen Fehler-Blob.
  const fehler = (ex.beispiele ?? []).slice(0, 12);
  const empfehlungText = (ex.empfehlungen ?? []).slice(0, 3).join(' ');

  const notizenTeile = [
    `Gezielte Übung zu den Fehlerschwerpunkten der Klasse ${ex.klasse} (Aufgabe ${ex.aufgabe}).`,
    empfehlungText,
  ].filter(Boolean);

  return {
    thema: `Fehlerschwerpunkte – ${ex.aufgabe} (${ex.klasse})`,
    fach: ex.fach ?? 'deutsch',
    stufe: ex.schulstufe ?? 'oberstufe',
    fokusThemen,
    gewuenschteAufgabenarten,
    notizen: notizenTeile.join(' '),
    ausgangstext: ex.ausgangstext?.trim() || undefined,
    fehler: fehler.length > 0 ? fehler : undefined,
  };
}
