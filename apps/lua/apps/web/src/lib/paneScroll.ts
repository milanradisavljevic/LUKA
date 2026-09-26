/** Rechteck-Geometrie reicht fürs Scrollen – bewusst ohne DOM, damit es testbar bleibt. */
export interface Rechteck {
  top: number;
  height: number;
}

/** Rand, den das Ziel zusätzlich zum sichtbaren Bereich braucht, damit es nicht
 *  am Rand klebt. */
const RAND = 12;

function verfuegbar(pane: Rechteck): number {
  return Math.max(0, pane.height - 2 * RAND);
}

/** Liefert die neue Scroll-Position, die das Ziel mittig in den sichtbaren Bereich
 *  des Pane holt – oder `null`, wenn es schon vollständig sichtbar ist.
 *
 *  Bewusst kein `scrollIntoView`: das rollt alle scrollbaren Vorfahren mit und
 *  würde beim Springen aus der Fehlerliste die ganze Seite verschieben. */
export function zentriereInPane(
  pane: Rechteck,
  ziel: Rechteck,
  scrollTop: number,
  paneHoehe: number,
): number | null {
  const oben = pane.top + RAND;
  const unten = pane.top + paneHoehe - RAND;
  const zielOben = ziel.top;
  const zielUnten = ziel.top + ziel.height;
  if (zielOben >= oben && zielUnten <= unten) return null;
  // Ein Ziel, das höher ist als der sichtbare Bereich, kann man nicht mittig
  // stellen – sonst ragt sein Ende aus dem Blick. Dann blickt man auf den Anfang.
  // Vorzeichen wie im Fall darunter: „liegt das Ziel unter der Wunschlinie,
  // muss nach unten gescrollt werden“.
  if (ziel.height > paneHoehe - 2 * RAND) return Math.max(0, scrollTop + zielOben - oben);
  const mitte = (zielOben + ziel.height / 2) - (pane.top + paneHoehe / 2);
  return Math.max(0, scrollTop + mitte);
}

/** Scrollt nur, wenn das Ziel nicht ohnehin schon vollständig im sichtbaren Bereich
 *  liegt. Sonst bleibt die Leseposition stehen — Springen bei jedem Klick ist
 *  beim Durchgehen von 40 Vorschlägen hetzerisch. */
export function zentriereInPaneWennNoetig(
  pane: HTMLElement,
  ziel: HTMLElement,
  verhalten: ScrollBehavior = 'smooth',
): boolean {
  const zielRechteck = ziel.getBoundingClientRect();
  const paneRechteck = pane.getBoundingClientRect();
  if (verfuegbar(paneRechteck) <= 0) return false;
  const neu = zentriereInPane(paneRechteck, zielRechteck, pane.scrollTop, paneRechteck.height);
  if (neu === null) return false;
  pane.scrollTo({ top: neu, behavior: verhalten });
  return true;
}
