import type { Block, Fach, Stufe, BlockTyp } from '@lehrunterlagen/schema';

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
