import type { Block, Fach, Stufe, BlockTyp, DocumentV1 } from '@lehrunterlagen/schema';
import { heuteIso } from './lokalDatum';

export interface PoolEntry {
  id: string;
  fach: string;
  stufe: string;
  schulstufe: number | null;
  thema: string | null;
  aufgabentyp: string;
  tags: string | null;
  blockJson: string;
  quelleHinweis: string | null;
  createdAt: string;
}

export type PoolQualityStatus = 'unbewertet' | 'getestet' | 'empfohlen' | 'zurueckgestellt';

/** PoolEntry plus lokale Organisationsdaten aus der App-Datenbank.
 * Diese Zusatzfelder gehören bewusst nicht zum teilbaren Pool-JSON. */
export interface PoolRecord extends PoolEntry {
  isFavorite: boolean;
  qualityStatus: PoolQualityStatus;
  lastUsedAt: string | null;
}

export interface PoolFilter {
  fach?: string;
  stufe?: string;
  aufgabentyp?: string;
  search?: string;
}

export interface PoolEntryInput {
  id: string;
  fach: Fach;
  stufe: Stufe;
  schulstufe: number | null;
  thema: string | null;
  aufgabentyp: BlockTyp;
  tags: string | null;
  block: Block;
  quelleHinweis: string | null;
}

export interface PoolImportPreview {
  gesamt: number;
  /** [Fach-Key, Anzahl] — absteigend nach Anzahl */
  jeFach: [string, number][];
  duplikate: number;
  mitQuelle: number;
}

export interface PoolImportReport {
  eingefuegt: number;
  ersetzt: number;
  uebersprungen: number;
}

export function parsePoolBlock(entry: PoolEntry): Block | null {
  try {
    return JSON.parse(entry.blockJson) as Block;
  } catch {
    return null;
  }
}

/** Erzeugt ein minimales DocumentV1 aus einem Pool-Eintrag für direkten Export. */
export function poolEntryToDocument(entry: PoolEntry): DocumentV1 | null {
  const block = parsePoolBlock(entry);
  if (!block) return null;
  return {
    schemaVersion: '0.1.0',
    meta: {
      fach: entry.fach as DocumentV1['meta']['fach'],
      stufe: entry.stufe as DocumentV1['meta']['stufe'],
      thema: entry.thema ?? 'Pool-Aufgabe',
      datum: heuteIso(),
      klasse: '',
      notizen: entry.quelleHinweis ?? '',
      schulstufe: entry.schulstufe ?? undefined,
    },
    quelltexte: [],
    bloecke: [block],
  };
}

export function parsePoolTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return tags.split(',').map((t) => t.trim()).filter(Boolean);
  }
}

/** Tag, mit dem redaktionell kuratierte Fachpaket-Aufgaben markiert sind (im Unterschied zu selbst gespeicherten Wizard-Aufgaben). */
export const KURATIERT_TAG = 'redaktionell-kuratiert';

/** Erkennt anhand der geparsten Tags, ob eine Pool-Aufgabe redaktionell kuratiert ist (Fachpaket-Herkunft). */
export function isKuratiert(tags: string[]): boolean {
  return tags.includes(KURATIERT_TAG);
}

