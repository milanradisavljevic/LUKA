import { stufeFromSchulstufe, type BlockTyp, type Fach, type Land, type Stufe } from '@lehrunterlagen/schema';
import { KATEGORIE_LABEL, KATEGORIE_TO_BLOCKTYPEN, fehlerkorrekturZuerst, type NataschaPrefill } from './nataschaBridge';
import type { Niveaugruppe } from './niveauGruppen';
import type { KlasseMeta } from '../hooks/useKlassenMeta';
import { loadDocuments } from './storage';

type Kategorie = 'R' | 'G' | 'Z' | 'A';

/** Nur die Felder, die die Vorbefüllung braucht — Klassen- und Korrekturansicht
 *  haben eigene (strukturgleiche) Abgabe-Typen. */
export interface LoopAbgabe {
  materialId: string | null;
  fach: string | null;
  schulstufe: string | null;
  textsorte: string | null;
}

export interface LoopFehlerDetail {
  zitat: string | null;
  korrektur: string | null;
  erklaerung: string | null;
  clusterId?: string | null;
  regelMuster?: string | null;
  haeufigkeit: number;
}

export type LoopKlassenMeta = Pick<KlasseMeta, 'fach' | 'stufe' | 'schulstufe' | 'land'>;

export interface BaueLoopPrefillArgs {
  klasse: string;
  klasseId?: string | null;
  aufgabe?: string | null;
  heatmap: { typ: string; anzahl: number }[];
  abgaben: LoopAbgabe[];
  klasseMeta?: LoopKlassenMeta;
  /** Profil-Land als Rückfall, wenn die Klasse keines trägt. */
  land?: Land;
  niveaugruppe?: Niveaugruppe;
  quelltextGet: (klasse: string, aufgabe: string) => Promise<string>;
  getFehlerDetail: (klasse: string, typ: string, aufgabe?: string, limit?: number, klasseId?: string | null) => Promise<LoopFehlerDetail[]>;
  /** Quelltext des Materials, auf das sich die Abgaben beziehen (falls bekannt). */
  materialQuelltext?: (materialId: string) => string;
}

/** Höchstzahl echter Klassenfehler im Prompt (Schema-Limit `bridgeFehler`). */
const MAX_FEHLER = 12;

/**
 * Closed Loop: baut aus Heatmap und echten Klassenfehlern die Vorbefüllung für
 * eine Folgeübung. Gemeinsam für Klassen- und Korrekturansicht, damit beide
 * Einstiege dieselben Schwerpunkte, Aufgabenarten und Fehlerzitate liefern.
 * Die Datenbankabfrage liefert ausschließlich übernommene und geänderte Befunde.
 */
export async function baueLoopPrefill(args: BaueLoopPrefillArgs): Promise<NataschaPrefill | null> {
  const { klasse, klasseId, aufgabe, heatmap, abgaben, klasseMeta, land, niveaugruppe } = args;
  const top = [...heatmap].filter((h) => h.anzahl > 0).sort((a, b) => b.anzahl - a.anzahl).slice(0, 3);
  if (top.length === 0) return null;

  const fokusThemen = top.map((h) => KATEGORIE_LABEL[h.typ] ?? h.typ);
  const arten: BlockTyp[] = [];
  for (const h of top) {
    for (const t of (KATEGORIE_TO_BLOCKTYPEN[h.typ as Kategorie] ?? [])) {
      if (!arten.includes(t)) arten.push(t);
    }
  }

  let ausgangstext = '';
  const materialId = abgaben.find((a) => a.materialId)?.materialId;
  if (materialId && args.materialQuelltext) ausgangstext = args.materialQuelltext(materialId);
  if (!ausgangstext && aufgabe) ausgangstext = await args.quelltextGet(klasse, aufgabe);

  // Echte Klassenfehler der Schwerpunkte → fehlerkorrektur-Block daraus.
  const fehler: NonNullable<NataschaPrefill['fehler']> = [];
  const gesehene = new Set<string>();
  for (const h of top) {
    const rows = await args.getFehlerDetail(klasse, h.typ, aufgabe ?? undefined, 8, klasseId);
    for (const r of rows) {
      const zitat = (r.zitat ?? '').trim();
      const korrektur = (r.korrektur ?? '').trim();
      if (!zitat || !korrektur || zitat === korrektur) continue;
      const schluessel = `${zitat}→${korrektur}`;
      if (gesehene.has(schluessel)) continue;
      gesehene.add(schluessel);
      fehler.push({
        typ: h.typ as Kategorie,
        zitat,
        korrektur,
        erklaerung: r.erklaerung ?? undefined,
        haeufigkeit: r.haeufigkeit,
        clusterId: r.clusterId ?? undefined,
        regelMuster: r.regelMuster ?? undefined,
      });
      if (fehler.length >= MAX_FEHLER) break;
    }
    if (fehler.length >= MAX_FEHLER) break;
  }

  const rohSchulstufe = abgaben.find((a) => a.schulstufe)?.schulstufe;
  const abgabeSchulstufe = rohSchulstufe ? Number(rohSchulstufe) : NaN;
  const schulstufe = klasseMeta?.schulstufe ?? (Number.isFinite(abgabeSchulstufe) ? abgabeSchulstufe : undefined);
  const effektivesLand = klasseMeta?.land ?? land;

  return {
    thema: `Übung zu Fehlerschwerpunkten – ${klasse}${aufgabe ? ' · ' + aufgabe : ''}`,
    // Der Closed Loop übernimmt den Kontext der Klasse bzw. der jüngsten
    // Abgabe. Fehlen alte Metadaten, lässt Step 0 seine normalen Profilwerte.
    land: effektivesLand ?? undefined,
    fach: (klasseMeta?.fach ?? abgaben.find((a) => a.fach)?.fach) as Fach | undefined,
    stufe: (klasseMeta?.stufe
      ?? (Number.isFinite(abgabeSchulstufe) ? stufeFromSchulstufe(abgabeSchulstufe, effektivesLand) : undefined)) as Stufe | undefined,
    schulstufe,
    textsorte: abgaben.find((a) => a.textsorte)?.textsorte ?? undefined,
    fokusThemen,
    gewuenschteAufgabenarten: fehlerkorrekturZuerst(arten),
    notizen: `Automatisch aus der Korrektur-Heatmap der Klasse ${klasse} erzeugt. Schwerpunkte: ${fokusThemen.join(', ')}.`,
    ausgangstext: ausgangstext || undefined,
    fehler: fehler.length > 0 ? fehler : undefined,
    niveaugruppe,
    loopQuelle: { klasse, aufgabe: aufgabe ?? undefined },
  };
}

/** Quelltext eines gespeicherten Materials aus der lokalen Bibliothek. */
export function materialQuelltextAusBibliothek(materialId: string): string {
  const doc = loadDocuments().find((d) => d.id === materialId);
  return doc?.snapshot.quelltexte?.map((q) => q.inhalt).filter(Boolean).join('\n\n') ?? '';
}
