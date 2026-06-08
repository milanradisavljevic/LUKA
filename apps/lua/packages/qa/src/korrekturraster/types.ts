import type { Block } from '@lehrunterlagen/schema';

export interface RasterKriterium {
  kriterium: string;
  beschreibung: string;
  maxPunkte: number;
  erreichtePunkte: number | null;
  anmerkung: string;
}

export interface RasterBlock {
  blockId: string;
  blockNr: number;
  typ: Block['typ'];
  aufgabeLabel: string;
  kriterien: RasterKriterium[];
  maxPunkte: number;
}

export interface Notenstufe {
  note: 1 | 2 | 3 | 4 | 5;
  bezeichnung: string;
  minProzent: number;
  maxProzent: number;
  minPunkte: number;
  maxPunkte: number;
}

export interface KorrekturrasterDokument {
  meta: {
    fach: string;
    stufe: string;
    thema: string;
    datum: string;
    klasse: string;
  };
  bloecke: RasterBlock[];
  gesamtPunkte: number;
  notenschluessel: Notenstufe[];
}
