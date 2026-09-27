// Aufloesung der Quelltext-Schalter fuer die Oberflaeche.
//
// Beide Schalter existieren an zwei Stellen: im Wizard-Zustand (`state.meta`) und
// im eingefrorenen generierten Dokument (`dokument.meta`). Nach der Erstellung ist
// das Dokument-Meta fuehrend — sonst wuerde ein Toggling im UI nichts am bereits
// erzeugten Dokument aendern. Die Logik liegt hier als reine Funktion, damit sie
// testbar ist und nicht in der Komponente dupliziert wird.

import type { DocumentV1, Meta } from '@lehrunterlagen/schema';

type Schluessel = 'quelltextAusblenden' | 'quelltextFormatieren';

/** `state.generiertesDokument` ist vor der Erstellung null, danach ein Dokument. */
type DokumentOderLeer = DocumentV1 | null | undefined;

/** Effektiver Wert eines Quelltext-Schalters (Dokument-Meta hat Vorrang). */
export function effektiverQuelltextSchalter(
  dokument: DokumentOderLeer,
  meta: Meta | undefined,
  schluessel: Schluessel,
): boolean {
  return (dokument?.meta[schluessel] ?? meta?.[schluessel]) === true;
}

/** Quelltext im Arbeitsblatt abdrucken? */
export function quelltextWirdGedruckt(dokument: DokumentOderLeer, meta: Meta | undefined): boolean {
  return !effektiverQuelltextSchalter(dokument, meta, 'quelltextAusblenden');
}

/** Quelltext vom Modell aufbereiten lassen? */
export function quelltextWirdFormatiert(dokument: DokumentOderLeer, meta: Meta | undefined): boolean {
  return effektiverQuelltextSchalter(dokument, meta, 'quelltextFormatieren');
}

/**
 * Meta-Update fuer den naechsten Schrittwechsel. Ohne Dokument wird nur der
 * Wizard-Zustand gesetzt; mit Dokument wandert der Wert zusaetzlich in das
 * eingefrorene Dokument, damit Vorschau und DOCX sofort folgen.
 */
export function metaSchalterUpdate(
  dokument: DokumentOderLeer,
  aktuell: boolean,
  schluessel: Schluessel,
): { meta: Partial<Meta>; dokument?: DocumentV1 } {
  const naechster = !aktuell;
  const update: { meta: Partial<Meta>; dokument?: DocumentV1 } = { meta: { [schluessel]: naechster } };
  if (dokument) {
    update.dokument = { ...dokument, meta: { ...dokument.meta, [schluessel]: naechster } };
  }
  return update;
}
