import type { Auftrag, BlockTyp, Fach, Meta } from '@lehrunterlagen/schema';
import { buildSkelett, stufeFromSchulstufe, FachSchema } from '@lehrunterlagen/schema';
import type { AppState } from './types';
import type { ProfileLand } from './profile';
import type { GeplanteStunde } from './stundenMappen';

/**
 * Aus einem geplanten Termin eine vollständige Unterlage bauen.
 *
 *  Das Muster ist `KompetenzView.handleErstellen` (KompetenzView.tsx:129-216):
 *  Meta und Auftrag bauen, `buildSkelett` die Blöcke erzeugen lassen, dann
 *  generieren. Der Unterschied ist der zweite Weg - dort geht es danach in den
 *  Wizard, hier wird gespeichert und der Termin bekommt die Unterlage gehängt.
 *
 *  **Reine Logik, ohne React und ohne LLM.** Damit lässt sich prüfen, was aus
 *  einem Termin wirklich wird, bevor ein einziger Token erzeugt wird.
 */

/** Was die Planung über einen Termin weiß. Alles, was nicht aus der Stunde
 *  selbst stammt, wird hier nicht erfunden - insbesondere das Fach: `unterrichtseinsatz`
 *  hat keine Fachspalte, es kommt aus `lua_klassen.fach`. */
export type TerminKontext = {
  klasse?: string;
  schulstufe?: number;
  fach?: Fach;
  land?: ProfileLand;
  /** Thema aus `titel_snapshot`, also aus der Notiz der Lehrkraft. */
  thema?: string;
  notiz?: string;
  /** Geplantes Datum (ISO), wird als Auftragsdatum übernommen. */
  datum?: string;
};

export type UnterlagenAuftrag = {
  meta: Meta;
  auftrag: Auftrag;
  bloecke: AppState['bloecke'];
  /** Vollständiger Zustand als Übergabe an `generate`. */
  state: AppState;
};

/** Blocktypen für eine Unterlage aus dem Stundenplan.
 *
 *  Bewusst eine kleine, gemischte Auswahl: ankommen, einordnen, schreiben. Kein
 *  Block, der ohne Anpassung in jede Stunde passt - der Baukasten bleibt der Ort
 *  zum Drehen. */
export const TERMIN_BLOCKTYPEN: BlockTyp[] = ['matching', 'lueckentext', 'offeneSchreibaufgabe'];

/** Unterlagentyp für eine Stunde. `hausuebung` wäre falsch (das ist ein Auftrag
 *  nach Hause), `test` wäre ebenso. `schuluebung` ist die neutrale Sammelform
 *  und dieselbe, die der Korrekturweg benutzt. */
const TERMIN_TYP = 'schuluebung';

/** Warum eine Unterlage nicht direkt gebaut werden konnte. */
export type UnterlagenLuecke = 'thema' | 'fach';

export type UnterlagenBau =
  | { ok: true; auftrag: UnterlagenAuftrag }
  | { ok: false; fehlt: UnterlagenLuecke[] };

/** Das Thema des Termins. `buildSkelett` braucht ein nicht-leeres Thema - ohne
 *  eines erzeugt der Assistent nur Füllmaterial. */
export function themaAusTermin(termin: TerminKontext): string {
  return (termin.thema ?? '').trim();
}

/** Das Fach der Klasse prüfen, statt es zu übernehmen.
 *
 *  `lua_klassen.fach` ist in Rust ein freier Text - eine Lehrkraft kann dort
 *  auch „Deutsch 6b" oder „Deutsch/Kunst" eingetragen haben. Eine Union aus
 *  zuzweisen hieße, eine Obergrenze zu erfinden; stattdessen gilt: passt der
 *  Wert nicht auf das Schema, gilt die Klasse als fachlich unbestimmt und die
 *  Lehrkraft wird gefragt. */
export function fachPruefen(raw: string | null | undefined): Fach | undefined {
  if (!raw) return undefined;
  const geprueft = FachSchema.safeParse(raw.trim().toLowerCase());
  return geprueft.success ? geprueft.data : undefined;
}

/** Was dem Termin zu einer Unterlage fehlt. Fach fehlt genauso häufig wie Thema:
 *  eine Klasse bekommt erst in der Klassenverwaltung ein Fach. */
export function fehlendeAngaben(termin: TerminKontext): UnterlagenLuecke[] {
  const fehlt: UnterlagenLuecke[] = [];
  if (!themaAusTermin(termin)) fehlt.push('thema');
  if (!termin.fach) fehlt.push('fach');
  return fehlt;
}

/**
 * Baut Meta, Auftrag und Blöcke aus einem Termin.
 *
 *  Wirft nicht, sondern meldet: fehlende Angaben sind kein Fehler, sondern der
 *  Grund, warum die aufrufende View den Assistenten mit Vorbefüllung öffnet.
 *  `basis` ist der laufende Wizard-Zustand - er trägt Anbieter, Modell und
 *  Sprache, ohne die ein Generieren nicht sinnvoll wäre.
 */
export function unterlageAusTermin(termin: TerminKontext, basis: AppState): UnterlagenBau {
  const fehlt = fehlendeAngaben(termin);
  if (fehlt.length > 0) return { ok: false, fehlt };

  const thema = themaAusTermin(termin);
  const fach = termin.fach as Fach;
  const stufe = termin.schulstufe
    ? stufeFromSchulstufe(termin.schulstufe, termin.land)
    : basis.meta.stufe;

  const meta: Meta = {
    ...basis.meta,
    stufe,
    fach,
    thema,
    klasse: termin.klasse?.trim() ?? '',
    notizen: termin.notiz?.trim() ?? '',
    land: termin.land,
    schulstufe: termin.schulstufe,
    typ: TERMIN_TYP,
    datum: termin.datum ?? basis.meta.datum,
  };

  const auftrag: Auftrag = {
    typ: TERMIN_TYP,
    fach,
    stufe,
    land: termin.land,
    thema,
    datum: meta.datum,
    klasse: termin.klasse?.trim() || undefined,
    notizen: termin.notiz?.trim() || undefined,
    schulstufe: termin.schulstufe,
    quelltexte: [],
    gewuenschteAufgabenarten: [...TERMIN_BLOCKTYPEN],
  };

  const bloecke = buildSkelett(auftrag);

  return {
    ok: true,
    auftrag: {
      meta,
      auftrag,
      bloecke,
      // `generiertesDokument` bleibt null, bis `generate` sie gesetzt hat - sonst
      // würde der Aufrufer ein veraltetes Dokument mitschicken.
      state: { ...basis, meta, auftrag, quelltexte: [], bloecke, generiertesDokument: null },
    },
  };
}

/** Was `PlanungView` aus einer geplanten Stunde für `unterlageAusTermin` übergibt.
 *
 *  `land` ist **Pflicht**, nicht Kür: `stufeFromSchulstufe` legt die Grenze
 *  zwischen Unter- und Oberstufe je nach Land fest (DE 10, AT 8), und `Meta.land`
 *  bestimmt Lehrplan und Vorlage. Fehlt das Land, wird eine deutsche Klasse 9 zur
 *  Oberstufe und die Unterlage bekommt österreichisches Recht.
 *
 *  Bewusst nicht optional: das Profil hat das Land immer, also gibt es keinen
 *  Grund, es nicht weiterzugeben. Pflichtparameter machen den Fehler zu einem
 *  Compilerfehler statt zu stillschweigend falschem Unterrichtsmaterial. */
export function kontextAusStunde(
  s: GeplanteStunde,
  ergaenzung: { land: ProfileLand; schulstufe?: number; fach?: Fach },
): TerminKontext {
  return {
    klasse: s.klasseName || undefined,
    thema: s.titel,
    notiz: s.notiz,
    datum: s.datum,
    ...ergaenzung,
  };
}
