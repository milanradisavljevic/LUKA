/**
 * Logik für „neues Bewertungsraster anlegen".
 *
 * Bewusst frei von React: das sind Regeln, die man testen und nachlesen will,
 * ohne sie im Klickpfad zu suchen. Sie bilden ausschließlich ab, was
 * NATASCHA akzeptiert (`_is_safe_rubric_name` in `natascha_cli.py`) und wie
 * der Raster-Kopf aufgebaut ist (`_RUBRIK_HEADER_RE` in `natascha_core.py`).
 *
 * Warum kein leeres Raster: ein Raster ist `## JSON-Kriterien` mit exakten
 * Schlüsseln, `## Gewichtung` mit Summe 100 % und Stufen 1–5 je Kriterium.
 * Wer das verhaut, bekommt falsche Noten — das ist der Kern der Korrektur.
 * Der Einstieg über eine Vorlage ist deshalb der einzige Weg, den es hier gibt.
 */

export type NamePruefung = { ok: true } | { ok: false; grund: string };

/** Kopf eines Rasters, tolerant gegen Zeilenenden. */
const KOPF = /^<!--\s*luka-rubrik\s*\r?\n([\s\S]*?)-->/;

/**
 * Dieselben Regeln wie `_is_safe_rubric_name`, mit verständlicher Meldung.
 * Wird clientseitig geprüft, damit die Lehrkraft den Fehler vor dem
 * Speichern sieht und nicht als Antwort des Programms.
 */
export function pruefeRubrikName(name: string): NamePruefung {
  const wert = name.trim();
  if (!wert) return { ok: false, grund: 'Name fehlt.' };
  if (wert.includes('/') || wert.includes('\\')) {
    return { ok: false, grund: 'Kein Pfad angeben — nur den Dateinamen eintragen.' };
  }
  if (wert.includes('..')) {
    return { ok: false, grund: 'Zwei Punkte hintereinander sind nicht erlaubt.' };
  }
  if (!wert.toLowerCase().endsWith('.md')) {
    return { ok: false, grund: 'Das Raster ist eine .md-Datei — die Endung wird ergänzt.' };
  }
  if (wert.length < 6) return { ok: false, grund: 'Name ist zu kurz.' };
  return { ok: true };
}

/** `.md` ergänzen, falls die Lehrkraft es weggelassen hat. */
export function mitRubrikEndung(name: string): string {
  const wert = name.trim();
  if (!wert) return wert;
  return wert.toLowerCase().endsWith('.md') ? wert : `${wert}.md`;
}

/**
 * Vorschlag für den Dateinamen. Die Endung ist sichtbar, weil sie das ist,
 * was tatsächlich gespeichert wird — sie hat aber keine Bedeutung mehr und
 * darf auch kein Stufen-Suffix tragen: das steht im Kopf.
 */
export function dateinameVorschlag(titel: string): string {
  const slug = titel
    // Umlaute zuerst ausschreiben. Über die Zerlegung (NFD) allein würde aus
    // "ä" ein "a" — `leseverstaendnis` wäre dann `leseverstandnis`, und das
    // wäre weder lesbar noch auffindbar.
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // restliche Akzente abwerfen
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return `${slug || 'raster'}.md`;
}

/** Welcher Titel steht in diesem Raster? */
export function titelAusRubrik(inhalt: string): string {
  const treffer = KOPF.exec(inhalt);
  const zeile = (treffer?.[1] ?? '').match(/^titel:.*$/m);
  return zeile ? zeile[0].replace(/^titel:\s*/, '').trim() : '';
}

/**
 * Setzt `titel:` im Kopf eines Rasters — vorhandenen Wert ersetzen, fehlenden
 * Kopf anlegen. Alles andere bleibt unangetastet, damit `k1`/`k3` und die
 * Gewichtung gültig bleiben.
 */
export function rubrikMitTitel(inhalt: string, titel: string): string {
  const zeile = `titel: ${titel}`;
  const treffer = KOPF.exec(inhalt);

  if (!treffer) {
    // Kein Kopf: einen anlegen, mit Fach und Stufe offen. Sonst wäre das
    // Raster "generic" und tauchte in jedem Fach und jeder Stufe auf.
    return `<!-- luka-rubrik\n${zeile}\n-->\n\n${inhalt.replace(/^\s+/, '')}`;
  }

  const kopfInnen = treffer[1] ?? '';
  const neuerKopf = /^titel:.*$/m.test(kopfInnen)
    ? kopfInnen.replace(/^titel:.*$/m, zeile)
    : `${zeile}\n${kopfInnen}`;
  const nach = inhalt.slice(treffer.index + treffer[0].length);
  return `${inhalt.slice(0, treffer.index)}<!-- luka-rubrik\n${neuerKopf}-->${nach}`;
}
