// L3: Textsorten-Auswahl je Fach und Schulstufe im Korrektur-Dialog.
// Englisch-Listen sind kuratiert (SRDP-orientiert), kein amtlicher Anspruch.
import {
  ENGLISCH_UNTERSTUFE_TEXTSORTEN,
  LESEVERSTAENDNIS_AUFGABENARTEN,
  SRDP_DEUTSCH_TEXTSORTEN,
  SRDP_ENGLISCH_TEXTSORTEN,
  SPRACHFACH_TEXTSORTEN,
} from '@lehrunterlagen/schema';
import { normiereSuchbegriff } from './rubrikAuswahl';

const DE_UNTERSTUFE_TEXTSORTEN = [
  'Erzählung',
  'Beschreibung',
  'Bericht',
  'Zusammenfassung',
  'Kommentar',
  'Leserbrief',
];

export function istEnglischFach(fach?: string | null): boolean {
  return (fach ?? '').toLowerCase().startsWith('engl');
}

export function istOberstufe(schulstufe?: string | null): boolean {
  return (schulstufe ?? '').toLowerCase() === 'oberstufe';
}

type WeitereSprachfachFamilie = keyof typeof SPRACHFACH_TEXTSORTEN;

function fachSchluessel(fach?: string | null): string {
  const normalized = (fach ?? '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    französisch: 'franzoesisch',
    francais: 'franzoesisch',
    español: 'spanisch',
    espanol: 'spanisch',
    italiano: 'italienisch',
    latin: 'latein',
  };
  return aliases[normalized] ?? normalized;
}

export function istWeitereSprachfach(fach?: string | null): fach is WeitereSprachfachFamilie {
  return Object.prototype.hasOwnProperty.call(SPRACHFACH_TEXTSORTEN, fachSchluessel(fach));
}

/** Textsorten-Liste für den Analyse-Dialog, getrennt nach Fachfamilie und Stufe. */
export function textsortenFuer(fach?: string | null, schulstufe?: string | null): string[] {
  const fachKey = fachSchluessel(fach);
  const englisch = istEnglischFach(fach);
  const oberstufe = istOberstufe(schulstufe);
  if (englisch) {
    return oberstufe ? [...SRDP_ENGLISCH_TEXTSORTEN] : [...ENGLISCH_UNTERSTUFE_TEXTSORTEN];
  }
  if (istWeitereSprachfach(fachKey)) {
    const family = SPRACHFACH_TEXTSORTEN[fachKey];
    return oberstufe ? [...family.oberstufe] : [...family.unterstufe];
  }
  // Leseverständnis ist eine Aufgabenart, keine Schreibtextsorte — steht
  // deshalb hinter den Textsorten und nicht darin (siehe schema).
  return oberstufe
    ? [...SRDP_DEUTSCH_TEXTSORTEN, ...LESEVERSTAENDNIS_AUFGABENARTEN]
    : [...DE_UNTERSTUFE_TEXTSORTEN, ...LESEVERSTAENDNIS_AUFGABENARTEN];
}

/** Kurzer Hinweis unter dem Auswahlfeld — je Fach und Stufe. */
export function textsortenHint(fach?: string | null, schulstufe?: string | null): string {
  const fachKey = fachSchluessel(fach);
  if (istEnglischFach(fach)) {
    return istOberstufe(schulstufe)
      ? 'Englisch Oberstufe: kuratierte Textsorten (SRDP-orientiert)'
      : 'Englisch Unterstufe: kuratierte Textsorten';
  }
  if (istWeitereSprachfach(fachKey)) {
    const label: Record<WeitereSprachfachFamilie, string> = {
      franzoesisch: 'Französisch',
      spanisch: 'Spanisch',
      italienisch: 'Italienisch',
      latein: 'Latein',
    };
    return fachKey === 'latein'
      ? `${label[fachKey]}: text- und übersetzungsbezogene Aufgaben (ohne CEFR)`
      : `${label[fachKey]}: kuratierte fachbezogene Textsorten (keine amtliche Vollständigkeitsliste)`;
  }
  return istOberstufe(schulstufe)
    ? 'Oberstufe: 7 offizielle SRDP-Textsorten + Empfehlung, dazu Leseverständnis'
    : 'Unterstufe: altersgerechte Textsorten, dazu Leseverständnis';
}

/**
 * Alle kuratierten Textsorten, die LUKA anbietet — für die Anzeige.
 *
 * Die Listen enthalten bereits die lesbare Schreibweise („Leseverständnis"),
 * die Auswahlfelder verwenden sie als Wert. Die Raster-Köpfe schreiben
 * dagegen maschinenlesbar (`textsorte: leseverstaendnis`), weil Python sie
 * ohne Umlaute vergleicht. Für Anzeigen wird deshalb über
 * `normiereSuchbegriff` zurück auf die lesbare Form aufgelöst; eine unbekannte
 * Angabe wird trotzdem lesbar gemacht, statt ungewandelt zu erscheinen.
 */
const ALLE_TEXTSORTEN: string[] = [
  ...SRDP_DEUTSCH_TEXTSORTEN,
  ...SRDP_ENGLISCH_TEXTSORTEN,
  ...ENGLISCH_UNTERSTUFE_TEXTSORTEN,
  ...DE_UNTERSTUFE_TEXTSORTEN,
  ...LESEVERSTAENDNIS_AUFGABENARTEN,
  // SPRACHFACH_TEXTSORTEN ist Fach -> { unterstufe, oberstufe }, also zwei
  // Listen je Fach, nicht eine.
  ...Object.values(SPRACHFACH_TEXTSORTEN).flatMap((stufen) => [...stufen.unterstufe, ...stufen.oberstufe]),
];

const TEXTSORTEN_LABELS = new Map(
  ALLE_TEXTSORTEN.map((ts) => [normiereSuchbegriff(ts), ts]),
);

/** Lesbare Form einer Textsorte. `alle` kommt als leerer String zurück. */
export function textsortenLabel(textsorte: string | null | undefined): string {
  const roh = (textsorte ?? '').trim();
  if (!roh || normiereSuchbegriff(roh) === 'alle') return '';
  const bekannt = TEXTSORTEN_LABELS.get(normiereSuchbegriff(roh));
  if (bekannt) return bekannt;
  return roh
    .replace(/[-_]+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}
