import type { Block } from '@lehrunterlagen/schema';

/** Antworten aus einer digitalen, lokalen Übungsmaske. Kein LLM und kein Upload. */
export type DigitaleAntwort = string | readonly string[] | null | undefined;
export type DigitaleAntworten = Record<string, DigitaleAntwort>;

export type SelbstkontrolleStatus =
  | 'richtig'
  | 'falsch'
  | 'unvollständig'
  | 'nicht_automatisch';

export interface SelbstkontrolleItem {
  key: string;
  status: Exclude<SelbstkontrolleStatus, 'nicht_automatisch'>;
}

export interface SelbstkontrolleErgebnis {
  blockId: string;
  blockTyp: Block['typ'];
  automatisch: boolean;
  status: SelbstkontrolleStatus;
  richtig: number;
  gesamt: number;
  items: SelbstkontrolleItem[];
  hinweis: string;
}

interface ErwarteteAntwort {
  key: string;
  expected: string | string[];
}

function normalisiere(text: string): string {
  return text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-DE');
}

function antwortAlsListe(answer: DigitaleAntwort): string[] {
  if (Array.isArray(answer)) return answer.map(String).map(normalisiere).filter(Boolean);
  if (typeof answer === 'string' && answer.trim()) return [normalisiere(answer)];
  return [];
}

function erwartungAlsListe(expected: string | string[]): string[] {
  return (Array.isArray(expected) ? expected : [expected]).map(normalisiere).filter(Boolean);
}

function gleichwertig(answer: DigitaleAntwort, expected: string | string[]): boolean {
  const actual = antwortAlsListe(answer).sort();
  const wanted = erwartungAlsListe(expected).sort();
  return actual.length === wanted.length && actual.every((value, index) => value === wanted[index]);
}

function hatSchluessel(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function sindEindeutigeSchluessel(keys: readonly string[]): boolean {
  return keys.length > 0 && new Set(keys).size === keys.length;
}

function erwarteteAntworten(block: Block): ErwarteteAntwort[] | null {
  switch (block.typ) {
    case 'multipleChoice': {
      const antworten = block.loesung.antworten;
      const fragenKeys = block.config.fragen.map((frage) => String(frage.nr));
      if (!antworten || !sindEindeutigeSchluessel(fragenKeys)) return null;
      for (const frage of block.config.fragen) {
        const key = String(frage.nr);
        const korrekt = antworten[key];
        const optionKeys = frage.optionen.map((option) => option.key);
        if (
          !Array.isArray(korrekt)
          || korrekt.length === 0
          || !sindEindeutigeSchluessel(optionKeys)
          || !sindEindeutigeSchluessel(korrekt)
          || korrekt.some((value) => !optionKeys.includes(value))
          || (!frage.mehrfach && korrekt.length !== 1)
        ) return null;
      }
      return block.config.fragen.map((frage) => ({ key: String(frage.nr), expected: antworten[String(frage.nr)]! }));
    }
    case 'lueckentext': {
      const luecken = block.loesung.luecken;
      const keys = luecken?.map((luecke) => String(luecke.nr)) ?? [];
      if (
        !luecken
        || luecken.length !== block.config.anzahlLuecken
        || !sindEindeutigeSchluessel(keys)
        || keys.some((key) => !/^[1-9]\d*$/.test(key) || Number(key) > block.config.anzahlLuecken)
        || luecken.some((luecke) => !luecke.wort.trim())
      ) return null;
      return luecken.map((luecke) => ({ key: String(luecke.nr), expected: luecke.wort }));
    }
    case 'matching': {
      const zuordnung = block.loesung.zuordnung;
      const itemKeys = block.config.items.map((item) => String(item.nr));
      const optionKeys = block.config.optionen.map((option) => option.key);
      if (
        !zuordnung
        || !sindEindeutigeSchluessel(itemKeys)
        || !sindEindeutigeSchluessel(optionKeys)
        || block.config.items.some((item) => {
          const value = zuordnung[String(item.nr)];
          return !hatSchluessel(zuordnung, String(item.nr)) || !value?.trim() || !optionKeys.includes(value);
        })
      ) return null;
      return block.config.items.map((item) => ({ key: String(item.nr), expected: zuordnung[String(item.nr)] ?? '' }));
    }
    case 'kategorisierung': {
      const zuordnung = block.loesung.zuordnung;
      const itemKeys = block.config.items.map((item) => String(item.nr));
      const categoryNames = block.config.kategorien.map((category) => category.name);
      if (
        !zuordnung
        || !sindEindeutigeSchluessel(itemKeys)
        || !sindEindeutigeSchluessel(categoryNames)
        || block.config.items.some((item) => {
          const key = String(item.nr);
          const values = zuordnung[key];
          const allowed = item.optionen.length > 0
            ? item.optionen.filter((option) => categoryNames.includes(option))
            : categoryNames;
          return !hatSchluessel(zuordnung, key)
            || !Array.isArray(values)
            || values.length === 0
            || !sindEindeutigeSchluessel(values)
            || values.some((value) => !allowed.includes(value));
        })
      ) return null;
      return block.config.items.map((item) => ({ key: String(item.nr), expected: zuordnung[String(item.nr)] ?? [] }));
    }
    case 'tabelle': {
      const zellen = block.loesung.zellen;
      const lueckenKeys = block.config.zeilen.flatMap((zeile) =>
        zeile.zellen.flatMap((zelle, index) => 'text' in zelle ? [] : [`${zeile.nr},${index}`]),
      );
      if (
        !sindEindeutigeSchluessel(lueckenKeys)
        || Object.keys(zellen).length !== lueckenKeys.length
        || lueckenKeys.some((key) => !hatSchluessel(zellen, key) || !zellen[key]?.trim())
      ) return null;
      return lueckenKeys.map((key) => ({ key, expected: zellen[key]! }));
    }
    case 'wordScramble': {
      if (block.config.saetze.length === 0 || block.config.saetze.some((satz) => !satz.wort.trim())) return null;
      return block.config.saetze.map((satz, index) => ({ key: String(index + 1), expected: satz.wort }));
    }
    case 'vokabeluebung': {
      const vokabeln = block.config.vokabeln;
      const antworten = block.loesung?.antworten;
      if (!vokabeln?.length || !antworten || vokabeln.length !== Object.keys(antworten).length) return null;
      const keys = vokabeln.map((_, index) => String(index + 1));
      if (!sindEindeutigeSchluessel(keys) || keys.some((key) => !hatSchluessel(antworten, key) || !antworten[key]?.trim())) return null;
      return keys.map((key) => ({ key, expected: antworten[key]! }));
    }
    case 'fehlerkorrektur': {
      const korrekturen = block.loesung.korrekturen;
      const satzKeys = block.config.saetze.map((satz) => String(satz.nr));
      const korrekturKeys = korrekturen.map((korrektur) => String(korrektur.nr));
      if (
        korrekturen.length !== block.config.saetze.length
        || !sindEindeutigeSchluessel(satzKeys)
        || !sindEindeutigeSchluessel(korrekturKeys)
        || satzKeys.some((key) => !korrekturKeys.includes(key))
        || korrekturen.some((korrektur) => !korrektur.korrigierterSatz.trim())
      ) return null;
      return korrekturen.map((korrektur) => ({ key: String(korrektur.nr), expected: korrektur.korrigierterSatz }));
    }
    default:
      return null;
  }
}

/** Gibt nur Blöcke zurück, für die ein vollständiger lokaler Schlüssel vorliegt. */
export function istDeterministischPruefbar(block: Block): boolean {
  return erwarteteAntworten(block) !== null;
}

/**
 * Prüft digitale Antworten lokal gegen den gespeicherten Schlüssel.
 *
 * Offene, materialgebundene und nicht vollständig verschlüsselte Aufgaben
 * werden niemals heuristisch bewertet, sondern ausdrücklich als
 * `nicht_automatisch` zurückgegeben.
 */
export function pruefeDigitaleAntworten(
  block: Block,
  antworten: DigitaleAntworten,
): SelbstkontrolleErgebnis {
  const expected = erwarteteAntworten(block);
  if (!expected) {
    return {
      blockId: block.id,
      blockTyp: block.typ,
      automatisch: false,
      status: 'nicht_automatisch',
      richtig: 0,
      gesamt: 0,
      items: [],
      hinweis: 'Dieser Aufgabentyp wird nicht automatisch bewertet. Bitte gemeinsam mit der Lösung prüfen.',
    };
  }

  const items = expected.map(({ key, expected: wanted }) => ({
    key,
    status: antwortAlsListe(antworten[key]).length === 0
      ? 'unvollständig' as const
      : gleichwertig(antworten[key], wanted)
        ? 'richtig' as const
        : 'falsch' as const,
  }));
  const richtig = items.filter((item) => item.status === 'richtig').length;
  const status: Exclude<SelbstkontrolleStatus, 'nicht_automatisch'> =
    items.some((item) => item.status === 'unvollständig')
      ? 'unvollständig'
      : richtig === items.length
        ? 'richtig'
        : 'falsch';

  return {
    blockId: block.id,
    blockTyp: block.typ,
    automatisch: true,
    status,
    richtig,
    gesamt: items.length,
    items,
    hinweis: 'Lokal gegen den gespeicherten Antwortschlüssel geprüft; kein KI-Aufruf.',
  };
}
