/**
 * Transformations-Logik
 * 
 * Wandelt das LLM-Format (Loesungen direkt bei Frage/Item) in das Schema-Format
 * (Loesungen in separatem loesung-Objekt als Records) um.
 * 
 * LLM-Format:
 * - multipleChoice: korrekt direkt bei jeder Frage
 * - matching: korrekt direkt bei jedem Item
 * - offeneVerstaendnisfrage: musterantwort direkt bei jeder Frage
 * 
 * Schema-Format:
 * - multipleChoice: loesung.antworten als Record<string, string[]>
 * - matching: loesung.zuordnung als Record<string, string>
 * - offeneVerstaendnisfrage: loesung.antworten als Record<string, string>
 */

type AnyObj = Record<string, unknown>;

function isObject(val: unknown): val is AnyObj {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Transformiert multipleChoice: korrekt aus Fragen extrahieren → loesung.antworten
 */
function transformMultipleChoice(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};
  
  // Wenn loesung.antworten schon existiert (altes Format), nicht ueberschreiben
  if (loesung.antworten && isObject(loesung.antworten)) {
    return block;
  }

  if (!Array.isArray(config.fragen)) {
    return block;
  }

  const antworten: Record<string, string[]> = {};
  
  config.fragen = config.fragen.map((frage: any) => {
    if (!isObject(frage)) return frage;
    
    const f = { ...frage };
    
    // korrekt extrahieren
    if (f.korrekt !== undefined) {
      const nr = String(f.nr ?? '');
      if (nr) {
        // korrekt kann String oder Array sein
        if (Array.isArray(f.korrekt)) {
          antworten[nr] = f.korrekt.filter((k: any) => typeof k === 'string');
        } else if (typeof f.korrekt === 'string') {
          antworten[nr] = [f.korrekt];
        }
      }
      delete f.korrekt; // Aus config entfernen
    }
    
    return f;
  });

  // Nur wenn wir Antworten gefunden haben, loesung setzen
  if (Object.keys(antworten).length > 0) {
    loesung.antworten = antworten;
  }

  return { ...block, config, loesung };
}

/**
 * Transformiert matching: korrekt aus Items extrahieren → loesung.zuordnung
 */
function transformMatching(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};
  
  // Wenn loesung.zuordnung schon existiert (altes Format), nicht ueberschreiben
  if (loesung.zuordnung && isObject(loesung.zuordnung)) {
    return block;
  }

  if (!Array.isArray(config.items)) {
    return block;
  }

  const zuordnung: Record<string, string> = {};
  
  config.items = config.items.map((item: any) => {
    if (!isObject(item)) return item;
    
    const i = { ...item };
    
    // korrekt extrahieren
    if (i.korrekt !== undefined && typeof i.korrekt === 'string') {
      const nr = String(i.nr ?? '');
      if (nr) {
        zuordnung[nr] = i.korrekt;
      }
      delete i.korrekt; // Aus config entfernen
    }
    
    return i;
  });

  // Nur wenn wir Zuordnungen gefunden haben, loesung setzen
  if (Object.keys(zuordnung).length > 0) {
    loesung.zuordnung = zuordnung;
  }

  return { ...block, config, loesung };
}

/**
 * Transformiert offeneVerstaendnisfrage: musterantwort aus Fragen extrahieren → loesung.antworten
 */
function transformOffeneVerstaendnisfrage(block: AnyObj): AnyObj {
  const config = isObject(block.config) ? { ...block.config } : {};
  const loesung = isObject(block.loesung) ? { ...block.loesung } : {};
  
  // Wenn loesung.antworten schon existiert (altes Format), nicht ueberschreiben
  if (loesung.antworten && isObject(loesung.antworten)) {
    return block;
  }

  if (!Array.isArray(config.fragen)) {
    return block;
  }

  const antworten: Record<string, string> = {};
  
  config.fragen = config.fragen.map((frage: any) => {
    if (!isObject(frage)) return frage;
    
    const f = { ...frage };
    
    // musterantwort extrahieren
    if (f.musterantwort !== undefined && typeof f.musterantwort === 'string') {
      const nr = String(f.nr ?? '');
      if (nr) {
        antworten[nr] = f.musterantwort;
      }
      delete f.musterantwort; // Aus config entfernen
    }
    
    return f;
  });

  // Nur wenn wir Antworten gefunden haben, loesung setzen
  if (Object.keys(antworten).length > 0) {
    loesung.antworten = antworten;
  }

  return { ...block, config, loesung };
}

/**
 * Hauptfunktion: Transformiert LLM-Format in Schema-Format
 */
export function transformToSchema(data: unknown): unknown {
  if (!isObject(data)) return data;

  const doc = { ...data };
  if (!Array.isArray(doc.bloecke)) return doc;

  doc.bloecke = doc.bloecke.map((block: unknown) => {
    if (!isObject(block)) return block;

    const blockType = block.typ;

    switch (blockType) {
      case 'multipleChoice':
        return transformMultipleChoice(block);
      case 'matching':
        return transformMatching(block);
      case 'offeneVerstaendnisfrage':
        return transformOffeneVerstaendnisfrage(block);
      default:
        return block;
    }
  });

  return doc;
}
