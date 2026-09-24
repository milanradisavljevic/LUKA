/** Deterministische Niveaugruppen aus bestätigten Lehrkraftnoten.
 *
 * Die Funktion erzeugt nur eine Vorschaugrundlage. Unter sechs eindeutig
 * erkannten Schülern wird bewusst keine automatische Gruppierung vorgeschlagen.
 */
export interface NiveauNotenEintrag {
  schuelerId: number;
  noteFinal: number | null;
  datum?: string | null;
  abgabeId?: number;
}

export type NiveauGruppenSchwierigkeit = 'leicht' | 'mittel' | 'schwer';
export type KompetenzNiveau = 'basis' | 'standard' | 'erweitert';

export interface Niveaugruppe {
  id: 'foerder' | 'basis' | 'vertiefung';
  label: string;
  schwierigkeit: NiveauGruppenSchwierigkeit;
  schuelerIds: number[];
  notenbereich: { min: number; max: number };
}

/** Übersetzt die Fördergruppe in die Prompt-Steuerung ohne Schülernamen. */
export function kompetenzNiveauFuerGruppe(gruppe: Niveaugruppe): KompetenzNiveau {
  switch (gruppe.id) {
    case 'foerder': return 'basis';
    case 'vertiefung': return 'erweitert';
    case 'basis': return 'standard';
  }
}

/** Liefert pro Schüler die neueste bestätigte Lehrkraftnote. */
export function neuesteBestaetigteNoten<T extends NiveauNotenEintrag>(eintraege: T[]): T[] {
  const letzte = new Map<number, T>();
  for (const eintrag of eintraege) {
    if (!Number.isFinite(eintrag.noteFinal) || eintrag.noteFinal === null) continue;
    const alt = letzte.get(eintrag.schuelerId);
    if (!alt) {
      letzte.set(eintrag.schuelerId, eintrag);
      continue;
    }
    const datumNeu = eintrag.datum ? Date.parse(eintrag.datum) : NaN;
    const datumAlt = alt.datum ? Date.parse(alt.datum) : NaN;
    const neuer = Number.isFinite(datumNeu) && Number.isFinite(datumAlt)
      ? datumNeu > datumAlt || (datumNeu === datumAlt && (eintrag.abgabeId ?? 0) > (alt.abgabeId ?? 0))
      : Number.isFinite(datumNeu)
        ? true
        : Number.isFinite(datumAlt)
          ? false
          : String(eintrag.datum ?? '') > String(alt.datum ?? '')
            || (String(eintrag.datum ?? '') === String(alt.datum ?? '') && (eintrag.abgabeId ?? 0) > (alt.abgabeId ?? 0));
    if (neuer) letzte.set(eintrag.schuelerId, eintrag);
  }
  return [...letzte.values()];
}

/**
 * Nutzt pro Schüler nur die zuletzt gelieferte bestätigte Note. In Österreich
 * und Deutschland ist eine niedrigere Zahl stärker; in der Schweiz ist 6
 * stärker als 1. Ohne bekanntes Land gilt für Rückwärtskompatibilität AT/DE.
 */
export function ermittleNiveaugruppen(
  eintraege: NiveauNotenEintrag[],
  land?: 'AT' | 'DE' | 'CH',
): Niveaugruppe[] {
  const schweizerNotenrichtung = land === 'CH';
  const sortiert = neuesteBestaetigteNoten(eintraege)
    .sort((a, b) => (schweizerNotenrichtung ? b.noteFinal! - a.noteFinal! : a.noteFinal! - b.noteFinal!)
      || (a.schuelerId - b.schuelerId));
  const anzahlGruppen = sortiert.length >= 12 ? 3 : sortiert.length >= 6 ? 2 : 0;
  if (anzahlGruppen === 0) return [];

  const gruppen: Niveaugruppe[] = [];
  const labels: Array<{ id: Niveaugruppe['id']; label: string; schwierigkeit: NiveauGruppenSchwierigkeit }> =
    anzahlGruppen === 3
      ? [
          { id: 'vertiefung', label: 'Vertiefung', schwierigkeit: 'schwer' },
          { id: 'basis', label: 'Basis', schwierigkeit: 'mittel' },
          { id: 'foerder', label: 'Förderung', schwierigkeit: 'leicht' },
        ]
      : [
          { id: 'vertiefung', label: 'Vertiefung', schwierigkeit: 'schwer' },
          { id: 'foerder', label: 'Förderung', schwierigkeit: 'leicht' },
        ];

  const basisgroesse = Math.floor(sortiert.length / anzahlGruppen);
  const rest = sortiert.length % anzahlGruppen;
  let offset = 0;
  for (let i = 0; i < anzahlGruppen; i++) {
    const groesse = basisgroesse + (i < rest ? 1 : 0);
    const teil = sortiert.slice(offset, offset + groesse);
    offset += groesse;
    const meta = labels[i]!;
    const noten = teil.map((x) => x.noteFinal!);
    gruppen.push({
      ...meta,
      schuelerIds: teil.map((x) => x.schuelerId),
      notenbereich: { min: Math.min(...noten), max: Math.max(...noten) },
    });
  }
  return gruppen;
}
