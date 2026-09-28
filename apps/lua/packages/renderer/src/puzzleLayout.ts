import { baueKreuzwortgitter, baueWortgitter, MAX_RAETSEL_EINTRRAEGE as MAX_RAETSEL_EINTRAEGE } from '@lehrunterlagen/schema';
import type { Block } from '@lehrunterlagen/schema';
import type { RenderLayout } from './layout.js';
import type { RenderTemplate } from './template.js';

const A4_BREITE_TWIP = 11906;
const A4_HOEHE_TWIP = 16838;
const TWIP_PRO_MM = 1440 / 25.4;
const RAHMEN_INNENRAND_TWIP = 280; // links + rechts bzw. oben + unten: je 140 twip

/**
 * Kästchengrößen in Twips (1 cm = 567 twips).
 *
 * ZIEL ist die Größe, auf die wir beim Export tatsächlich drucken: 0,65 cm. Das ist
 * die Größe, in der Schülerinnen und Schüler bequem von Hand schreiben — und sie ist
 * bewusst FIX statt "so groß wie möglich", damit ein Blatt mit 3 Wörtern genauso
 * beschreibbar ist wie eines mit 20.
 *
 * MAX ist die Obergrenze für sehr kleine Rätsel, damit dort nicht riesige Kästchen
 * entstehen. MIN ist die Grenze, unterhalb derer ein Kästchen nicht mehr als Kästchen
 * lesbar wäre; sie wird nie unterschritten — wenn das Gitter auch bei MIN nicht passt,
 * läuft es über den Seitenumbruch weiter (siehe `gitterPasst`).
 */
const ZIEL_ZELLE_TWIP = 368; // 0,65 cm
const MAX_ZELLE_TWIP = 460; // 0,81 cm
const MIN_ZELLE_TWIP = 141; // 0,25 cm

/**
 * Die Obergrenze kommt aus dem Schema, damit Normalisierung (`@lehrunterlagen/llm`),
 * Renderer und Panel garantiert dieselbe Zahl verwenden.
 */
export { MAX_RAETSEL_EINTRRAEGE } from '@lehrunterlagen/schema';

/**
 * Ein Eintrag, wie ihn das Panel eingibt. Beim Kreuzwort sind `wort` und `hinweis`
 * Pflicht — `KreuzwortEintrag` aus dem Schema gilt, deshalb wird es dort direkt
 * wiederverwendet statt einer eigenen, laxeren Form.
 */
type Eintrag = { wort: string; hinweis: string };

export interface RaetselA4Pruefung {
  /** Passt das Gitter mit mindestens 0,25 cm Kantenlänge auf eine Seite? */
  passt: boolean;
  /** Gewählte Kantenlänge der Kästchen in Twips. */
  zellgroesse: number;
  zeilen: number;
  spalten: number;
  verfuegbareBreite: number;
  verfuegbareHoehe: number;
  benoetigteBreite: number;
  benoetigteHoehe: number;
  /**
   * Platz für den Hinweisblock (unter dem Gitter). Reicht er nicht, laufen die
   * Hinweise auf die nächste Seite — das ist Blattfluss, kein Fehler.
   */
  hinweisePassen: boolean;
  grund?: string;
}

function schaetzeTextHoehe(text: string, zeichenProZeile: number, zeilenhoehe: number): number {
  return Math.max(1, Math.ceil(Math.max(1, text.trim().length) / zeichenProZeile)) * zeilenhoehe;
}

/** Platz, der für das Gitter selbst zur Verfügung steht — ohne Hinweise. */
function gitterFlaeche(
  template: RenderTemplate,
  layout: RenderLayout,
  arbeitsanweisung: string,
): { breite: number; hoehe: number; zeilenhoehe: number; bannerHoehe: number; anweisungHoehe: number } {
  const rahmenReserve = layout.frameBlocks ? RAHMEN_INNENRAND_TWIP : 0;
  const breite = A4_BREITE_TWIP - template.margin.left - template.margin.right - rahmenReserve;
  const seitenhoehe = A4_HOEHE_TWIP - template.margin.top - template.margin.bottom - rahmenReserve;
  const zeilenhoehe = Math.max(template.fontSize.body + 40, Math.round(template.lineHeightMm * TWIP_PRO_MM));
  const bannerHoehe = Math.max(720, Math.round(template.fontSize.h2 * 2.5));
  const anweisungHoehe = schaetzeTextHoehe(arbeitsanweisung, 80, zeilenhoehe) + 180;
  return {
    breite: Math.max(0, breite),
    hoehe: Math.max(0, seitenhoehe - bannerHoehe - anweisungHoehe),
    zeilenhoehe,
    bannerHoehe,
    anweisungHoehe,
  };
}

/** Höhe des Hinweisblocks, der unter dem Gitter steht. */
function hinweisHoehe(
  typ: 'kreuzwortraetsel' | 'wortgitter',
  block: Extract<Block, { typ: 'kreuzwortraetsel' | 'wortgitter' }>,
  zeilenhoehe: number,
): number {
  const kreuzwortGitter = typ === 'kreuzwortraetsel'
    ? baueKreuzwortgitter((block as Extract<Block, { typ: 'kreuzwortraetsel' }>).config.eintraege ?? [])
    : undefined;
  const wortgitter = typ === 'wortgitter'
    ? baueWortgitter((block as Extract<Block, { typ: 'wortgitter' }>).config.woerter ?? [])
    : undefined;
  return typ === 'kreuzwortraetsel'
    ? ((kreuzwortGitter?.platzierungen ?? []).reduce((sum, p) => sum + schaetzeTextHoehe(`${p.nr}. ${p.hinweis}`, 76, zeilenhoehe), 0) + zeilenhoehe * 2 + 160)
    : schaetzeTextHoehe(`Finde diese Wörter: ${(wortgitter?.woerter ?? []).join(' · ')}`, 76, zeilenhoehe) + zeilenhoehe + 160;
}

/**
 * Berechnet die druckbaren Maße eines Rätsels.
 *
 * Kern: Das Gitter muss auf eine Seite passen, der Hinweisblock dahinter NICHT. Die
 * frühere Fassung verlangte beides zusammen undwarf dann den Export — bei 25 Feldern
 * blieben 0 Twips übrig, weil allein die Hinweiszeilen die Seite auffraßen. Jetzt
 * läuft der Hinweisblock bei Bedarf auf die Folgeseite.
 */
export function pruefeRaetselA4(
  block: Extract<Block, { typ: 'kreuzwortraetsel' | 'wortgitter' }>,
  template: RenderTemplate,
  layout: RenderLayout,
): RaetselA4Pruefung {
  const istKreuzwort = block.typ === 'kreuzwortraetsel';
  // `config` ist beim Kreuzwort und beim Wortgitter verschieden gebaut; die Verweise
  // unten sind deshalb auf den jeweiligen Typ verengt.
  const kreuzwortEintraege: Eintrag[] = istKreuzwort
    ? ((block as Extract<Block, { typ: 'kreuzwortraetsel' }>).config.eintraege ?? []).slice(0, MAX_RAETSEL_EINTRAEGE)
    : [];
  const wortgitterWoerter: string[] = istKreuzwort
    ? []
    : ((block as Extract<Block, { typ: 'wortgitter' }>).config.woerter ?? []).slice(0, MAX_RAETSEL_EINTRAEGE);
  const gitter = istKreuzwort ? baueKreuzwortgitter(kreuzwortEintraege) : baueWortgitter(wortgitterWoerter);
  const zeilen = gitter?.zeilen ?? 0;
  const spalten = gitter?.spalten ?? 0;
  if (zeilen === 0 || spalten === 0) {
    return {
      passt: true, zellgroesse: ZIEL_ZELLE_TWIP, zeilen, spalten,
      verfuegbareBreite: 0, verfuegbareHoehe: 0, benoetigteBreite: 0, benoetigteHoehe: 0, hinweisePassen: true,
    };
  }

  const f = gitterFlaeche(template, layout, block.arbeitsanweisung);
  // Zielgröße, aber höchstens MAX und mindestens so klein wie die Seite hergibt.
  const nachBreite = Math.floor(f.breite / spalten);
  const nachHoehe = Math.floor(f.hoehe / zeilen);
  const zellgroesse = Math.max(MIN_ZELLE_TWIP, Math.min(MAX_ZELLE_TWIP, ZIEL_ZELLE_TWIP, nachBreite, nachHoehe));
  const passt = zellgroesse * zeilen <= f.hoehe && zellgroesse * spalten <= f.breite;

  const hinweis = hinweisHoehe(istKreuzwort ? 'kreuzwortraetsel' : 'wortgitter', block, f.zeilenhoehe);
  const hinweisePassen = zellgroesse * zeilen + hinweis <= f.hoehe + f.bannerHoehe + f.anweisungHoehe;

  return {
    passt,
    zellgroesse,
    zeilen,
    spalten,
    verfuegbareBreite: f.breite,
    verfuegbareHoehe: f.hoehe,
    benoetigteBreite: zellgroesse * spalten,
    benoetigteHoehe: zellgroesse * zeilen,
    hinweisePassen,
    ...(passt
      ? {}
      : { grund: `Das Gitter (${spalten} × ${zeilen}) passt auch bei der kleinsten Kästchengröße von ${MIN_ZELLE_TWIP} Twips nicht auf eine A4-Seite. Bitte weniger oder kürzere Begriffe verwenden.` }),
  };
}

/**
 * Größte Anzahl Einträge, bei der das Gitter noch mit mindestens `zielZelle` Twips
 * aufgeht. Das ist der Wert, den das Zahlenfeld als `max` bekommt — die Lehrkraft
 * kann also nichts wählen, was nicht in 0,65 cm passt.
 */
export function maxEintraegeFuerBlatt(
  typ: 'kreuzwortraetsel' | 'wortgitter',
  vorhanden: Eintrag[],
  template: RenderTemplate,
  layout: RenderLayout,
  arbeitsanweisung: string,
  zielZelle: number = ZIEL_ZELLE_TWIP,
): number {
  const f = gitterFlaeche(template, layout, arbeitsanweisung);
  const start = Math.min(vorhanden.length > 0 ? vorhanden.length : MAX_RAETSEL_EINTRAEGE, MAX_RAETSEL_EINTRAEGE);
  for (let n = start; n >= 3; n--) {
    const probe = vorhanden.slice(0, n);
    const gitter = typ === 'kreuzwortraetsel'
      ? baueKreuzwortgitter(probe)
      : baueWortgitter(probe.map((e) => e.wort));
    if (!gitter || gitter.zeilen === 0) continue;
    const zelle = Math.min(zielZelle, Math.floor(f.breite / gitter.spalten), Math.floor(f.hoehe / gitter.zeilen));
    if (zelle >= zielZelle) return n;
  }
  return 3;
}

/** Kantenlänge in Zentimetern — für die Anzeige im Panel. */
export function zellGroesseInCm(twips: number): string {
  return (twips / TWIP_PRO_MM / 10).toFixed(2);
}
