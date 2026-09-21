import { baueKreuzwortgitter, baueWortgitter } from '@lehrunterlagen/schema';
import type { Block } from '@lehrunterlagen/schema';
import type { RenderLayout } from './layout.js';
import type { RenderTemplate } from './template.js';

const A4_BREITE_TWIP = 11906;
const A4_HOEHE_TWIP = 16838;
const TWIP_PRO_MM = 1440 / 25.4;
const RAHMEN_INNENRAND_TWIP = 280; // links + rechts bzw. oben + unten: je 140 twip

export interface RaetselA4Pruefung {
  passt: boolean;
  zellgroesse: number;
  zeilen: number;
  spalten: number;
  verfuegbareBreite: number;
  verfuegbareHoehe: number;
  benoetigteBreite: number;
  benoetigteHoehe: number;
  grund?: string;
}

function schaetzeTextHoehe(text: string, zeichenProZeile: number, zeilenhoehe: number): number {
  return Math.max(1, Math.ceil(Math.max(1, text.trim().length) / zeichenProZeile)) * zeilenhoehe;
}

/**
 * Prüft die druckbare Größe eines Rätsels vor dem DOCX-Export.
 * Die Reserven sind absichtlich konservativ: Banner, Arbeitsanweisung und
 * Hinweise müssen neben dem Gitter ebenfalls auf dessen eigener A4-Seite Platz haben.
 */
export function pruefeRaetselA4(
  block: Extract<Block, { typ: 'kreuzwortraetsel' | 'wortgitter' }>,
  template: RenderTemplate,
  layout: RenderLayout,
): RaetselA4Pruefung {
  const istKreuzwort = block.typ === 'kreuzwortraetsel';
  const kreuzwortGitter = block.typ === 'kreuzwortraetsel' ? baueKreuzwortgitter(block.config.eintraege ?? []) : undefined;
  const wortgitter = block.typ === 'wortgitter' ? baueWortgitter(block.config.woerter ?? []) : undefined;
  const zeilen = kreuzwortGitter?.zeilen ?? wortgitter?.zeilen ?? 0;
  const spalten = kreuzwortGitter?.spalten ?? wortgitter?.spalten ?? 0;
  if (zeilen === 0 || spalten === 0) {
    return { passt: true, zellgroesse: 0, zeilen, spalten, verfuegbareBreite: 0, verfuegbareHoehe: 0, benoetigteBreite: 0, benoetigteHoehe: 0 };
  }

  const rahmenReserve = layout.frameBlocks ? RAHMEN_INNENRAND_TWIP : 0;
  const verfuegbareBreite = A4_BREITE_TWIP - template.margin.left - template.margin.right - rahmenReserve;
  const seitenhoehe = A4_HOEHE_TWIP - template.margin.top - template.margin.bottom - rahmenReserve;
  const zeilenhoehe = Math.max(template.fontSize.body + 40, Math.round(template.lineHeightMm * TWIP_PRO_MM));
  const bannerHoehe = Math.max(720, Math.round(template.fontSize.h2 * 2.5));
  const arbeitsanweisungHoehe = schaetzeTextHoehe(block.arbeitsanweisung, 80, zeilenhoehe) + 180;
  const zusatzHoehe = istKreuzwort
    ? ((kreuzwortGitter?.platzierungen ?? []).reduce((sum, p) => sum + schaetzeTextHoehe(`${p.nr}. ${p.hinweis}`, 76, zeilenhoehe), 0) + zeilenhoehe * 2 + 160)
    : (schaetzeTextHoehe(`Finde diese Wörter: ${(wortgitter?.woerter ?? []).join(' · ')}`, 76, zeilenhoehe) + zeilenhoehe + 160);
  const verfuegbareHoehe = Math.max(0, seitenhoehe - bannerHoehe - arbeitsanweisungHoehe - zusatzHoehe);
  const maxZelle = istKreuzwort ? 460 : 420;
  const minZelle = istKreuzwort ? 200 : 180;
  const nachBreite = Math.floor(verfuegbareBreite / spalten);
  const nachHoehe = Math.floor(verfuegbareHoehe / zeilen);
  const zellgroesse = Math.min(maxZelle, nachBreite, nachHoehe);
  const effektiveZeilenhoehe = Math.max(zellgroesse, zeilenhoehe);
  const benoetigteBreite = Math.max(0, zellgroesse) * spalten;
  const benoetigteHoehe = effektiveZeilenhoehe * zeilen + bannerHoehe + arbeitsanweisungHoehe + zusatzHoehe;
  const passt = zellgroesse >= minZelle;

  return {
    passt,
    zellgroesse: Math.max(0, zellgroesse),
    zeilen,
    spalten,
    verfuegbareBreite,
    verfuegbareHoehe,
    benoetigteBreite,
    benoetigteHoehe,
    ...(passt ? {} : { grund: `${spalten} × ${zeilen} Felder passen auf A4-Hochformat nur mit ${Math.max(0, zellgroesse)} Twips pro Feld. Mindestens ${minZelle} Twips sind für eine lesbare Druckfassung nötig. Bitte weniger oder kürzere Begriffe verwenden.` }),
  };
}

export class RaetselPasstNichtAufA4Error extends Error {
  constructor(public readonly pruefung: RaetselA4Pruefung) {
    super(`DOCX-Export nicht möglich: ${pruefung.grund ?? 'Das Rätsel passt nicht lesbar auf eine A4-Seite.'}`);
    this.name = 'RaetselPasstNichtAufA4Error';
  }
}
