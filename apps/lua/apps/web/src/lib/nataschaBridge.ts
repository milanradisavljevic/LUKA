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
  pfad: string;
  dateiname: string;
}

export const SUPPORTED_BRIDGE_VERSION = 1;

/** Fehlerkategorie → passende LUA-Aufgabentypen (Heuristik, siehe bridge/README.md). */
export const KATEGORIE_TO_BLOCKTYPEN: Record<BridgeHeatmapEintrag['typ'], BlockTyp[]> = {
  R: ['lueckentext', 'vokabeluebung'],
  G: ['lueckentext', 'offeneVerstaendnisfrage', 'offeneSchreibaufgabe'],
  Z: ['lueckentext', 'markieraufgabe'],
  A: ['stiluebung', 'wordScramble'],
};

export interface NataschaPrefill {
  thema: string;
  fach: Fach;
  stufe: Stufe;
  fokusThemen: string[];
  gewuenschteAufgabenarten: BlockTyp[];
  notizen: string;
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
  if (d.schemaVersion !== SUPPORTED_BRIDGE_VERSION) {
    throw new Error(
      `NATASCHA-Export hat Version ${d.schemaVersion}, unterstützt wird ${SUPPORTED_BRIDGE_VERSION}.`,
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

  const beispielText = (ex.beispiele ?? [])
    .slice(0, 6)
    .map((b) => `„${b.zitat}" → „${b.korrektur}" (${b.typ})`)
    .join('; ');
  const empfehlungText = (ex.empfehlungen ?? []).slice(0, 3).join(' ');

  const notizenTeile = [
    `Gezielte Übung zu den Fehlerschwerpunkten der Klasse ${ex.klasse} (Aufgabe ${ex.aufgabe}).`,
    beispielText ? `Typische Schülerfehler: ${beispielText}.` : '',
    empfehlungText,
  ].filter(Boolean);

  return {
    thema: `Fehlerschwerpunkte – ${ex.aufgabe} (${ex.klasse})`,
    fach: ex.fach ?? 'deutsch',
    stufe: ex.schulstufe ?? 'oberstufe',
    fokusThemen,
    gewuenschteAufgabenarten,
    notizen: notizenTeile.join(' '),
  };
}
