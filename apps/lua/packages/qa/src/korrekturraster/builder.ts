import type { DocumentV1, Block } from '@lehrunterlagen/schema';
import { istSprachfach } from '@lehrunterlagen/schema';
import type { KorrekturrasterDokument, RasterBlock, RasterKriterium } from './types';
import type { KriterienKatalog } from './kataloge';
import {
  ZUSAMMENFASSUNG,
  ERORTERUNG,
  TEXTANALYSE,
  OPEN_WRITING,
  SRDP_DEUTSCH,
  QUELLENANALYSE,
  MATERIALINTERPRETATION,
  SACHERORTERUNG,
  readingComprehension,
  WORD_SCRAMBLE,
  KATEGORISIERUNG,
  TABELLE,
  STILUEBUNG,
  SONGANALYSE,
} from './kataloge';
import { berechneNotenschluessel } from './notenschluessel';

// ---------------------------------------------------------------------------
// Katalog-Auswahl nach Block-Typ + Textsorte + Fach
// ---------------------------------------------------------------------------

function waehleKatalog(block: Block, fach: DocumentV1['meta']['fach'], typ?: DocumentV1['meta']['typ']): KriterienKatalog[] {
  switch (block.typ) {
    case 'lueckentext':
    case 'matching':
    case 'multipleChoice':
    case 'markieraufgabe':
    case 'wordScramble':
    case 'kreuzwortraetsel':
    case 'wortgitter':
    case 'vokabeluebung':
    case 'umformung':
    case 'fehlerkorrektur':
      // Geschlossene Blocks: eine Zeile "Richtig/Falsch"
      return [{ kriterium: 'Richtig/Falsch', beschreibung: 'Volle Punkte bei richtiger Antwort, 0 bei falsch', maxPunkte: block.punkte }];

    case 'kategorisierung':
      return KATEGORISIERUNG;

    case 'tabelle':
      return TABELLE;

    case 'stiluebung':
      return STILUEBUNG;

    case 'songanalyse':
      return SONGANALYSE;

    case 'offeneVerstaendnisfrage':
      return readingComprehension(block.config.fragen.length);

    case 'offeneSchreibaufgabe': {
      const textsorte = block.config.textsorte.toLowerCase();
      // Matura (SRDP): Deutsch → K1/K3-Raster, Fremdsprachen → Open Writing.
      if (typ === 'matura') {
        return fach === 'deutsch' ? SRDP_DEUTSCH : OPEN_WRITING;
      }
      if (istSprachfach(fach)) {
        // Fremdsprachen-Schreibaufgabe: einheitliches Open-Writing-Raster.
        return OPEN_WRITING;
      }
      // Sachfaecher: fachspezifische Schreibaufgaben-Raster.
      if (fach === 'geschichte') return QUELLENANALYSE;
      if (fach === 'geographie') return MATERIALINTERPRETATION;
      if (fach === 'religion' || fach === 'ethik' || fach === 'psychologie' || fach === 'philosophie') return SACHERORTERUNG;
      // Deutsch: nach Textsorte
      if (textsorte.includes('zusammenfassung')) return ZUSAMMENFASSUNG;
      if (textsorte.includes('erörterung') || textsorte.includes('erorterung') || textsorte.includes('stellungnahme')) return ERORTERUNG;
      if (textsorte.includes('analyse') || textsorte.includes('interpretation')) return TEXTANALYSE;
      // Default fuer Deutsch-Schreibaufgaben: Erörterung
      return ERORTERUNG;
    }

    case 'roleplay':
    case 'rollenkartenSet':
      // Sprechuebungen (Rollenspiel / Rollenkarten-Set) fliessen nicht in das Korrekturraster ein.
      return [];
  }
}

// ---------------------------------------------------------------------------
// Skalierung: Katalog auf Punktezahl des Blocks anpassen
// ---------------------------------------------------------------------------

function skaliereKatalog(katalog: KriterienKatalog[], zielPunkte: number): RasterKriterium[] {
  const katalogGesamt = katalog.reduce((s, k) => s + k.maxPunkte, 0);
  const faktor = zielPunkte / katalogGesamt;

  const skaliert = katalog.map((k) => ({
    kriterium: k.kriterium,
    beschreibung: k.beschreibung,
    maxPunkte: Math.round(k.maxPunkte * faktor),
    erreichtePunkte: null,
    anmerkung: '',
  }));

  // Rundungsfehler korrigieren: Differenz zum Ziel auf groesstes Element
  const summe = skaliert.reduce((s, k) => s + k.maxPunkte, 0);
  const diff = zielPunkte - summe;
  if (diff !== 0 && skaliert.length > 0) {
    // Groesstes Element anpassen
    const maxIdx = skaliert.reduce((mi, k, i, arr) => k.maxPunkte > arr[mi]!.maxPunkte ? i : mi, 0);
    skaliert[maxIdx]!.maxPunkte += diff;
  }

  return skaliert;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildRaster(doc: DocumentV1): KorrekturrasterDokument {
  const bloecke: RasterBlock[] = doc.bloecke.map((block, i) => {
    const katalog = waehleKatalog(block, doc.meta.fach, doc.meta.typ);
    const kriterien = skaliereKatalog(katalog, block.punkte);

    return {
      blockId: block.id,
      blockNr: i + 1,
      typ: block.typ,
      aufgabeLabel: `Aufgabe ${i + 1}`,
      kriterien,
      maxPunkte: block.punkte,
    };
  });

  const gesamtPunkte = bloecke.reduce((s, b) => s + b.maxPunkte, 0);
  const notenschluessel = berechneNotenschluessel(gesamtPunkte);

  return {
    meta: {
      fach: doc.meta.fach,
      stufe: doc.meta.stufe,
      thema: doc.meta.thema,
      datum: doc.meta.datum,
      klasse: doc.meta.klasse,
    },
    bloecke,
    gesamtPunkte,
    notenschluessel,
  };
}
