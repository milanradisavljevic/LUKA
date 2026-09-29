/**
 * Wann der Korrekturauftrag den Ausgangstext aus dem Speicher übernehmen darf.
 *
 * Der Ausgangstext gehört **der Aufgabe**, nicht dem Bewertungsraster: Er wird in
 * `aufgabe_quelltext` unter dem Schlüssel Klasse + Aufgabe abgelegt und sowohl vom
 * Erwartungshorizont als auch von der Korrektur gebraucht. Bis hierher las nur der
 * Erwartungshorizont-Reiter daraus — eine im Korrekturauftrag eingegebene Quelle
 * wurde zwar gespeichert, war beim nächsten Auftrag aber wieder leer.
 *
 * Frei von React, damit die Regeln prüfbar sind, ohne den Klickpfad zu
 * durchsuchen. Die Regeln sind streng zugunsten der Lehrkraft: es wird **nie**
 * überschrieben, was sie selbst eingetragen hat.
 */

export interface VorfuellAnfrage {
  klasse: string;
  aufgabe: string;
  /** Was für diese Aufgabe gespeichert liegt. */
  gespeichert: string;
  /** Was in diesem Auftrag eingetragen wurde. */
  eigenerText: string;
  /** Gewählte Datei — gilt als eigene Eingabe, auch wenn das Feld leer ist. */
  eigeneDatei: string;
  /** Für welche Aufgabe schon vorbelegt wurde (`klasse|aufgabe`). */
  bereitsGefuellt: string;
}

export type VorfuellGrund =
  | 'keine_aufgabe'
  | 'bereits_gefuehlt'
  | 'eigene_eingabe'
  | 'nichts_gespeichert'
  | 'uebernommen';

export interface VorfuellErgebnis {
  fuellen: boolean;
  text: string;
  grund: VorfuellGrund;
  /** Herkunftszeile für die Oberfläche. Leer, wenn nichts zu tun ist. */
  hinweis: string;
}

/** Schlüssel einer Aufgabe — auch der, an dem „schon gefüllt" erkannt wird. */
export function aufgabenSchluessel(klasse: string, aufgabe: string): string {
  return `${(klasse ?? '').trim()}|${(aufgabe ?? '').trim()}`;
}

export function entscheideVorfuellung(anfrage: VorfuellAnfrage): VorfuellErgebnis {
  const gespeichert = (anfrage.gespeichert ?? '').trim();

  if (!anfrage.klasse?.trim() || !anfrage.aufgabe?.trim()) {
    // Ohne Aufgabe gibt es keinen Speicher, aus dem man etwas holen könnte.
    return { fuellen: false, text: '', grund: 'keine_aufgabe', hinweis: '' };
  }

  if (anfrage.bereitsGefuellt === aufgabenSchluessel(anfrage.klasse, anfrage.aufgabe)) {
    // Ein zweites Vorbelegen würde eine bewusste Änderung der Lehrkraft
    // überschreiben — etwa wenn sie den Text entfernt hat, weil er nicht passt.
    return { fuellen: false, text: '', grund: 'bereits_gefuehlt', hinweis: '' };
  }

  if ((anfrage.eigenerText ?? '').trim() || (anfrage.eigeneDatei ?? '').trim()) {
    return {
      fuellen: false,
      text: '',
      grund: 'eigene_eingabe',
      hinweis: 'Eigene Eingabe — nach der Korrektur steht sie für diese Aufgabe bereit.',
    };
  }

  if (!gespeichert) {
    return { fuellen: false, text: '', grund: 'nichts_gespeichert', hinweis: '' };
  }

  return {
    fuellen: true,
    text: gespeichert,
    grund: 'uebernommen',
    hinweis: 'Für diese Aufgabe hinterlegt — bitte prüfen, ob es noch passt.',
  };
}
