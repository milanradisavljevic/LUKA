/**
 * Normalisierer fuer LLM-Antworten
 *
 * Korrigiert strukturelle Abweichungen VOR der Zod-Validierung.
 * Nur strukturelle Umformung, niemals Inhalt erfinden.
 * Wenn eine sichere Umformung nicht moeglich ist, wird das Feld
 * unveraendert gelassen und Zod schlaegt fehl.
 */

type AnyObj = Record<string, unknown>;

function isObject(val: unknown): val is AnyObj {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/** Entfernt leere/whitespace Strings aus einem Array (Provider-Robustheit). */
function cleanStringArray(arr: unknown[]): string[] {
  return arr
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Filtert Optionen-Objekte mit leerem Text heraus. */
function cleanOptionen(optionen: unknown[]): AnyObj[] {
  return optionen
    .map((opt) => isObject(opt) ? opt : undefined)
    .filter((opt): opt is AnyObj => {
      if (!opt) return false;
      const text = typeof opt.text === 'string' ? opt.text.trim() : '';
      return text.length > 0;
    });
}

// ---------------------------------------------------------------------------
// Lueckentext
// ---------------------------------------------------------------------------

function normalizeLueckentext(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};

  // Manche LLMs (DeepSeek) fuegen config.fragen: [] hinzu — Lueckentext hat kein fragen-Feld
  if ('fragen' in config) {
    delete (config as AnyObj).fragen;
  }

  // config.anzahlLuecken: String → Number
  if (typeof config.anzahlLuecken === 'string') {
    const n = parseInt(config.anzahlLuecken, 10);
    config.anzahlLuecken = isNaN(n) ? 1 : n;
  }

  // config.distraktoren: das Schema erwartet eine ZAHL (Anzahl). LLMs liefern hier
  // gelegentlich ein Array von Distraktor-Woertern oder einen String.
  if (typeof config.distraktoren === 'string') {
    const n = parseInt(config.distraktoren, 10);
    config.distraktoren = isNaN(n) ? 0 : n;
  } else if (Array.isArray(config.distraktoren)) {
    // Array von Distraktor-Woertern → Anzahl
    config.distraktoren = config.distraktoren.length;
  } else if (typeof config.distraktoren !== 'number') {
    config.distraktoren = 0;
  }

  // config.distraktorWoerter: leere/whitespace Einträge entfernen
  if (Array.isArray(config.distraktorWoerter)) {
    config.distraktorWoerter = cleanStringArray(config.distraktorWoerter);
  }

  // loesung.luecken: Array von Strings → Array von Objekten { nr, wort }
  if (Array.isArray(loesung.luecken)) {
    loesung.luecken = loesung.luecken.map((item: unknown, idx: number) => {
      if (typeof item === 'string') {
        return { nr: idx + 1, wort: item };
      }
      if (isObject(item) && typeof item.wort === 'string') {
        return { nr: typeof item.nr === 'number' ? item.nr : idx + 1, wort: item.wort };
      }
      return { nr: idx + 1, wort: '' };
    });
  }

  // text: Falls vom LLM nicht geliefert, leer lassen (Renderer zeigt Fallback an)
  const text = typeof block.text === 'string' ? block.text : undefined;

  return { ...block, config, loesung, ...(text !== undefined ? { text } : {}) };
}

// ---------------------------------------------------------------------------
// Multiple Choice
// ---------------------------------------------------------------------------

function normalizeMultipleChoice(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};

  // config.fragen: Zahl statt Array (Mistral: "anzahlFragen: 1" → config.fragen: 1)
  // WICHTIG: Keine Platzhalter erzeugen! Wenn fragen eine Zahl ist, scheitert Zod.

  // config.fragen: Array von Strings → Array von Objekten
  // WICHTIG: Keine Optionen aus Fragetext extrahieren! Wenn Optionen fehlen, scheitert Zod.
  if (Array.isArray(config.fragen)) {
    config.fragen = config.fragen.map((item: unknown, idx: number) => {
      if (typeof item === 'string') {
        // Nur Frage-Text vorhanden, keine Optionen → Zod wird scheitern
        return {
          nr: idx + 1,
          frage: item,
          optionen: [], // Leer lassen, Zod validiert Mindestanzahl
          mehrfach: false
        };
      }
      // Optionen sind Strings statt Objekten (DeepSeek)
      if (isObject(item)) {
        const obj = item as AnyObj;
        if (Array.isArray(obj.optionen)) {
          obj.optionen = cleanOptionen(obj.optionen.map((opt: unknown, i: number) => {
            if (typeof opt === 'string') {
              return { key: String.fromCharCode(65 + i), text: opt };
            }
            return opt;
          }));
        }
        if (typeof obj.nr !== 'number') obj.nr = idx + 1;
        if (typeof obj.mehrfach !== 'boolean') obj.mehrfach = false;
        return obj;
      }
      return item;
    });
  }

  // loesung.antworten: Array → Record<string, string[]>
  if (Array.isArray(loesung.antworten)) {
    const fixed: AnyObj = {};
    loesung.antworten.forEach((value: unknown, idx: number) => {
      const key = String(idx + 1);
      if (typeof value === 'string') {
        fixed[key] = [value];
      } else if (Array.isArray(value)) {
        fixed[key] = value.flat().filter((v: unknown) => typeof v === 'string');
      } else if (isObject(value) && typeof value.key === 'string') {
        fixed[key] = [value.key];
      } else {
        fixed[key] = [];
      }
    });
    loesung.antworten = fixed;
  }
  // loesung.antworten: verschachteltes Objekt → flaches Record
  else if (isObject(loesung.antworten)) {
    const fixed: AnyObj = {};
    for (const [key, value] of Object.entries(loesung.antworten)) {
      if (Array.isArray(value)) {
        fixed[key] = value.flat().filter((v: unknown) => typeof v === 'string');
      } else if (isObject(value)) {
        const obj = value as AnyObj;
        fixed[key] = [obj.key ?? obj.antwort ?? obj.value ?? ''].filter((v: unknown) => typeof v === 'string');
      } else if (typeof value === 'string') {
        fixed[key] = [value];
      } else {
        fixed[key] = [];
      }
    }
    loesung.antworten = fixed;
  }

  return { ...block, config, loesung };
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function normalizeMatching(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};

  // config.items: Array von Strings → Array von Objekten
  if (Array.isArray(config.items)) {
    config.items = config.items.map((item: unknown, idx: number) => {
      if (typeof item === 'string') {
        return { nr: idx + 1, prompt: item };
      }
      return item;
    });
  }
  // WICHTIG: Keine Platzhalter erzeugen! Wenn items fehlt, scheitert Zod.

  // config.optionen: Array von Strings → Array von Objekten
  if (Array.isArray(config.optionen)) {
    config.optionen = config.optionen.map((item: unknown, idx: number) => {
      if (typeof item === 'string') {
        return { key: String.fromCharCode(65 + idx), text: item };
      }
      return item;
    });
  }
  // WICHTIG: Keine Platzhalter erzeugen! Wenn optionen fehlt, scheitert Zod.

  // loesung.zuordnung: Array → Record<string, string>
  if (Array.isArray(loesung.zuordnung)) {
    const fixed: AnyObj = {};
    loesung.zuordnung.forEach((value: unknown, idx: number) => {
      const key = String(idx + 1);
      if (typeof value === 'string') {
        fixed[key] = value;
      } else if (typeof value === 'number') {
        fixed[key] = String.fromCharCode(65 + value);
      } else if (isObject(value) && typeof value.key === 'string') {
        fixed[key] = value.key;
      } else {
        fixed[key] = '';
      }
    });
    loesung.zuordnung = fixed;
  }
  // loesung.zuordnung: String → Record<string, string> (Fallback)
  else if (typeof loesung.zuordnung === 'string') {
    loesung.zuordnung = { '1': loesung.zuordnung };
  }
  // loesung.zuordnung: Objekt → Werte normalisieren
  else if (isObject(loesung.zuordnung)) {
    const fixed: AnyObj = {};
    for (const [key, value] of Object.entries(loesung.zuordnung)) {
      if (typeof value === 'string') {
        fixed[key] = value;
      } else if (typeof value === 'number') {
        fixed[key] = String.fromCharCode(65 + (value as number));
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        fixed[key] = value[0];
      } else {
        fixed[key] = '';
      }
    }
    loesung.zuordnung = fixed;
  }
  // loesung.zuordnung fehlt komplett → leeres Record
  else {
    loesung.zuordnung = {};
  }

  return { ...block, config, loesung };
}

// ---------------------------------------------------------------------------
// Offene Verstaendnisfrage
// ---------------------------------------------------------------------------

function normalizeOffeneVerstaendnisfrage(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};

  // Manche LLMs (z.B. Sonnet) legen fragen auf BLOCK-Ebene statt in config.fragen
  if (!Array.isArray(config.fragen) && Array.isArray(block.fragen)) {
    config.fragen = block.fragen;
    delete (block as AnyObj).fragen;
  }

  // config.fragen: Zahl statt Array (Mistral)
  // WICHTIG: Keine Platzhalter erzeugen! Wenn fragen eine Zahl ist, scheitert Zod.

  // config.frage (Singular, String) → config.fragen (Array)
  if (typeof config.frage === 'string') {
    config.fragen = [{ nr: 1, frage: config.frage, zeilen: config.zeilen ?? 3 }];
    delete (config as AnyObj).frage;
  }
  // WICHTIG: Wenn config.fragen danach immer noch fehlt, scheitert Zod.

  // config.fragen: Array von Strings → Array von Objekten
  if (Array.isArray(config.fragen)) {
    config.fragen = config.fragen.map((item: unknown, idx: number) => {
      if (typeof item === 'string') {
        return { nr: idx + 1, frage: item, zeilen: 3 };
      }
      // Fehlende Felder ergaenzen
      if (isObject(item)) {
        const obj = item as AnyObj;
        if (typeof obj.nr !== 'number') obj.nr = idx + 1;
        if (typeof obj.zeilen !== 'number') obj.zeilen = 3;
        return obj;
      }
      return item;
    });
  }

  // config.zeilen: String → Number (Fallback auf Ebene des gesamten Blocks)
  if (typeof config.zeilen === 'string') {
    const n = parseInt(config.zeilen, 10);
    config.zeilen = isNaN(n) ? 3 : n;
  }

  // loesung.musterantworten (Sonnet) → loesung.antworten
  if (Array.isArray(loesung.musterantworten)) {
    const fixed: AnyObj = {};
    loesung.musterantworten.forEach((item: unknown) => {
      if (isObject(item) && typeof item.nr === 'number' && typeof item.antwort === 'string') {
        fixed[String(item.nr)] = item.antwort;
      } else if (typeof item === 'string') {
        fixed[String(Object.keys(fixed).length + 1)] = item;
      }
    });
    loesung.antworten = fixed;
    delete loesung.musterantworten;
  }

  // loesung.antworten: Array → Record<string, string>
  if (Array.isArray(loesung.antworten)) {
    const fixed: AnyObj = {};
    loesung.antworten.forEach((value: unknown, idx: number) => {
      const key = String(idx + 1);
      if (typeof value === 'string' && value.trim().length > 0) {
        fixed[key] = value;
      }
      // WICHTIG: Keine Platzhalter! Leere Werte werden weggelassen, Zod validiert.
    });
    loesung.antworten = fixed;
  }
  // loesung.antworten: Objekt → Werte normalisieren
  else if (isObject(loesung.antworten)) {
    const fixed: AnyObj = {};
    for (const [key, value] of Object.entries(loesung.antworten)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        fixed[key] = value;
      }
      // WICHTIG: Keine Platzhalter! Leere Werte werden weggelassen, Zod validiert.
    }
    loesung.antworten = fixed;
  }

  return { ...block, config, loesung };
}

// ---------------------------------------------------------------------------
// Offene Schreibaufgabe
// ---------------------------------------------------------------------------

function normalizeOffeneSchreibaufgabe(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};

  // config.situation fehlt → aus arbeitsanweisung ableiten oder Platzhalter
  if (!config.situation || typeof config.situation !== 'string' || (config.situation as string).trim().length === 0) {
    config.situation = typeof block.arbeitsanweisung === 'string' ? (block.arbeitsanweisung as string) : '[Situation]';
  }

  // config.textsorte fehlt → Platzhalter
  if (!config.textsorte || typeof config.textsorte !== 'string' || (config.textsorte as string).trim().length === 0) {
    config.textsorte = 'Kommentar';
  }

  // config.aspekte: String → Array
  if (typeof config.aspekte === 'string') {
    config.aspekte = [config.aspekte];
  }
  // config.aspekte: leere/whitespace Einträge entfernen
  if (Array.isArray(config.aspekte)) {
    config.aspekte = cleanStringArray(config.aspekte);
  }
  // config.aspekte fehlt oder nur leere Strings → sinnvoller Fallback
  if (!Array.isArray(config.aspekte) || config.aspekte.length === 0) {
    config.aspekte = ['Inhalt', 'Struktur'];
  }

  // config.umfangWorte: String → Objekt { min, max }
  if (typeof config.umfangWorte === 'string') {
    config.umfangWorte = { min: 200, max: 300 };
  }
  // config.umfangWorte fehlt → Standard
  if (!isObject(config.umfangWorte)) {
    config.umfangWorte = { min: 200, max: 300 };
  }

  // loesung.erwartungshorizont: String → Objekt
  if (typeof loesung.erwartungshorizont === 'string') {
    const text = loesung.erwartungshorizont;
    loesung.erwartungshorizont = {
      inhalt: text,
      struktur: text,
      ausdruck: text,
      sprachrichtigkeit: text
    };
  }
  // loesung.erwartungshorizont fehlt → aus musterloesung ableiten
  if (!isObject(loesung.erwartungshorizont)) {
    const text = typeof loesung.musterloesung === 'string' ? loesung.musterloesung : '[Erwartung]';
    loesung.erwartungshorizont = {
      inhalt: text,
      struktur: text,
      ausdruck: text,
      sprachrichtigkeit: text
    };
  }

  return { ...block, config, loesung };
}

// ---------------------------------------------------------------------------
// Markieraufgabe
// ---------------------------------------------------------------------------

function normalizeMarkieraufgabe(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};

  // config.quelleId fehlt → nimm quelleId von Block-Ebene (falls vorhanden)
  if (!config.quelleId && typeof block.quelleId === 'string') {
    config.quelleId = block.quelleId;
  }

  // config.anweisung fehlt → nimm arbeitsanweisung als Fallback
  if (!config.anweisung && typeof block.arbeitsanweisung === 'string') {
    config.anweisung = block.arbeitsanweisung;
  }

  // loesung.stellen: String → Array
  if (typeof loesung.stellen === 'string') {
    loesung.stellen = [loesung.stellen];
  }
  // WICHTIG: Keine Platzhalter erzeugen! Wenn stellen fehlt, scheitert Zod.

  return { ...block, config, loesung };
}

// ---------------------------------------------------------------------------
// wordScramble
// ---------------------------------------------------------------------------

function normalizeWordScramble(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};

  if (typeof config.anzahlWoerter === 'string') {
    const n = parseInt(config.anzahlWoerter, 10);
    if (!isNaN(n)) config.anzahlWoerter = n;
  }

  // config.wort ist die Quelle der Wahrheit: anzahlWoerter, loesungsreihenfolge und
  // korrektAnordnung werden daraus konsistent abgeleitet. Das verhindert einen
  // Mismatch (z. B. anzahlWoerter=6, aber 7 Wörter im Satz), der sonst eine
  // Reparaturrunde kosten würde. Die Lehrer-Vorgabe wirkt über den Prompt (weich).
  if (typeof config.wort === 'string' && config.wort.trim().length > 0) {
    const woerter = config.wort.split(/\s+/).filter((w: string) => w.length > 0);
    config.anzahlWoerter = woerter.length;
    config.loesungsreihenfolge = woerter.map((_, i) => i + 1);
    loesung.korrektAnordnung = woerter;
    return { ...block, config, loesung };
  }

  // Kein wort vorhanden: defensiv wie bisher.
  if (Array.isArray(config.loesungsreihenfolge)) {
    config.loesungsreihenfolge = config.loesungsreihenfolge.map((v: unknown) =>
      typeof v === 'string' ? parseInt(v, 10) : v,
    );
  }
  if (!Array.isArray(config.loesungsreihenfolge) && typeof config.anzahlWoerter === 'number') {
    config.loesungsreihenfolge = Array.from({ length: config.anzahlWoerter }, (_, i) => i + 1);
  }
  return { ...block, config, loesung };
}

// ---------------------------------------------------------------------------
// kategorisierung
// ---------------------------------------------------------------------------

function normalizeKategorisierung(block: AnyObj): AnyObj {
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};
  // zuordnung-Werte: String → [String] (LLMs liefern oft nur einen Kategorienamen)
  if (isObject(loesung.zuordnung)) {
    const fixed: AnyObj = {};
    for (const [key, value] of Object.entries(loesung.zuordnung)) {
      if (typeof value === 'string') fixed[key] = [value];
      else if (Array.isArray(value)) fixed[key] = value.filter((v) => typeof v === 'string');
      else fixed[key] = [];
    }
    loesung.zuordnung = fixed;
  }
  return { ...block, loesung };
}

// ---------------------------------------------------------------------------
// tabelle
// ---------------------------------------------------------------------------

function normalizeTabelle(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  // spalten[].breiteProzent: String → Number
  if (Array.isArray(config.spalten)) {
    config.spalten = config.spalten.map((s: unknown) => {
      if (isObject(s) && typeof s.breiteProzent === 'string') {
        const n = parseInt(s.breiteProzent, 10);
        return { ...s, breiteProzent: isNaN(n) ? 10 : n };
      }
      return s;
    });
  }
  return { ...block, config };
}

// ---------------------------------------------------------------------------
// songanalyse
// ---------------------------------------------------------------------------

function normalizeSonganalyse(block: AnyObj): AnyObj {
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};
  // zitate: String → [String]
  if (typeof loesung.zitate === 'string') loesung.zitate = [loesung.zitate];
  if (!Array.isArray(loesung.zitate)) loesung.zitate = [];
  return { ...block, loesung };
}

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// kreuzwortraetsel
// ---------------------------------------------------------------------------

function normalizeKreuzwortraetsel(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};

  // Manche LLMs nennen das Feld anders (woerter/eintraege/items).
  const roh: unknown = config.eintraege ?? config.woerter ?? config.items;
  if (Array.isArray(roh)) {
    config.eintraege = roh.map((e: unknown) => {
      if (typeof e === 'string') return { wort: e, hinweis: '' };
      if (isObject(e)) {
        const wort = typeof e.wort === 'string' ? e.wort
          : typeof e.begriff === 'string' ? e.begriff
          : typeof e.loesung === 'string' ? e.loesung : '';
        const hinweis = typeof e.hinweis === 'string' ? e.hinweis
          : typeof e.frage === 'string' ? e.frage
          : typeof e.definition === 'string' ? e.definition : '';
        return { wort, hinweis };
      }
      return { wort: '', hinweis: '' };
    });
    delete (config as AnyObj).woerter;
    delete (config as AnyObj).items;
  }

  return { ...block, config };
}

// ---------------------------------------------------------------------------
// wortgitter
// ---------------------------------------------------------------------------

function normalizeWortgitter(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const roh: unknown = config.woerter ?? config.eintraege ?? config.items;
  if (Array.isArray(roh)) {
    config.woerter = roh
      .map((e: unknown) => {
        if (typeof e === 'string') return e;
        if (isObject(e)) {
          if (typeof e.wort === 'string') return e.wort;
          if (typeof e.begriff === 'string') return e.begriff;
        }
        return '';
      })
      .filter((w: string) => w.length > 0);
    delete (config as AnyObj).eintraege;
    delete (config as AnyObj).items;
  }
  return { ...block, config };
}

// vokabeluebung
// ---------------------------------------------------------------------------

function normalizeVokabeluebung(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};

  // vokabeln normalisieren: Array sicherstellen
  if (!Array.isArray(config.vokabeln)) {
    const roh: unknown = config.vokabeln ?? config.woerter ?? config.items;
    if (Array.isArray(roh)) {
      config.vokabeln = roh.map((e: unknown) => {
        if (isObject(e)) {
          return {
            deutsch: String(e.deutsch ?? e.wort ?? e.text ?? ''),
            fremdsprache: String(e.fremdsprache ?? e.uebersetzung ?? e.bedeutung ?? ''),
            kontextsatz: typeof e.kontextsatz === 'string' ? e.kontextsatz : undefined,
          };
        }
        if (typeof e === 'string') {
          const parts = e.split(/[:=]/, 2);
          return { deutsch: parts[0]?.trim() ?? e, fremdsprache: parts[1]?.trim() ?? '' };
        }
        return { deutsch: '', fremdsprache: '' };
      }).filter((v: AnyObj) => v.deutsch && v.fremdsprache);
    } else {
      config.vokabeln = [];
    }
  }
  delete (config as AnyObj).woerter;
  delete (config as AnyObj).items;

  // richtung normalisieren
  const r = String(config.richtung ?? '');
  config.richtung = r.includes('fremd') && r.includes('de') ? 'fremd_de' : 'de_fremd';

  // loesung.antworten normalisieren
  if (isObject(loesung.antworten)) {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(loesung.antworten)) {
      normalized[String(k)] = String(v);
    }
    loesung.antworten = normalized;
  }

  return { ...block, config, loesung };
}

export function normalizeDocument(data: unknown): unknown {
  if (!isObject(data)) return data;

  const doc = { ...data };
  if (!Array.isArray(doc.bloecke)) return doc;

  doc.bloecke = doc.bloecke.map((block: unknown) => {
    if (!isObject(block)) return block;

    const blockType = block.typ;

    let normalized: unknown;
    switch (blockType) {
      case 'lueckentext':
        normalized = normalizeLueckentext(block); break;
      case 'multipleChoice':
        normalized = normalizeMultipleChoice(block); break;
      case 'matching':
        normalized = normalizeMatching(block); break;
      case 'offeneVerstaendnisfrage':
        normalized = normalizeOffeneVerstaendnisfrage(block); break;
      case 'offeneSchreibaufgabe':
        normalized = normalizeOffeneSchreibaufgabe(block); break;
      case 'markieraufgabe':
        normalized = normalizeMarkieraufgabe(block); break;
      case 'wordScramble':
        normalized = normalizeWordScramble(block); break;
      case 'kategorisierung':
        normalized = normalizeKategorisierung(block); break;
      case 'tabelle':
        normalized = normalizeTabelle(block); break;
      case 'songanalyse':
        normalized = normalizeSonganalyse(block); break;
      case 'kreuzwortraetsel':
        normalized = normalizeKreuzwortraetsel(block); break;
      case 'wortgitter':
        normalized = normalizeWortgitter(block); break;
      case 'vokabeluebung':
        normalized = normalizeVokabeluebung(block); break;
      default:
        normalized = block;
    }
    return isObject(normalized) ? coerceLernziele(normalized) : normalized;
  });

  return doc;
}

// Block-Lernziel-Tags robust auf string[] bringen; leeres/ungueltiges Feld entfernen.
function coerceLernziele(block: AnyObj): AnyObj {
  if (!('lernziele' in block)) return block;
  const lz = block.lernziele;
  if (typeof lz === 'string') return { ...block, lernziele: [lz] };
  if (Array.isArray(lz)) {
    const arr = lz.filter((x): x is string => typeof x === 'string' && x.length > 0);
    if (arr.length === 0) { const { lernziele: _drop, ...rest } = block; return rest; }
    return { ...block, lernziele: arr };
  }
  const { lernziele: _drop, ...rest } = block;
  return rest;
}
