import { BlockSchema } from '@lehrunterlagen/schema';
import type { PoolEntry } from './pool';

export interface PoolValidationIssue {
  index: number;
  id?: string;
  message: string;
}

export interface PoolValidationResult {
  valid: boolean;
  entries: PoolEntry[];
  issues: PoolValidationIssue[];
}

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

function addIssue(
  issues: PoolValidationIssue[],
  index: number,
  id: string | undefined,
  message: string,
): void {
  issues.push({ index, ...(id ? { id } : {}), message });
}

function zodMessage(error: { issues: Array<{ path: (string | number)[]; message: string }> }): string {
  const first = error.issues[0];
  if (!first) return 'Block erfüllt das Aufgaben-Schema nicht.';
  const path = first.path.length > 0 ? ' (' + first.path.join('.') + ')' : '';
  return 'Block erfüllt das Aufgaben-Schema nicht' + path + ': ' + first.message;
}

/** Validiert ein importiertes Pool-Paket vor jedem Datenbank-Schreibvorgang. */
export function validatePoolEntries(input: unknown): PoolValidationResult {
  if (!Array.isArray(input)) {
    return {
      valid: false,
      entries: [],
      issues: [{ index: -1, message: 'Die Datei muss ein JSON-Array von Pool-Aufgaben enthalten.' }],
    };
  }

  const issues: PoolValidationIssue[] = [];
  const seenIds = new Set<string>();
  const entries: PoolEntry[] = [];

  input.forEach((candidate, index) => {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      addIssue(issues, index, undefined, 'Der Eintrag muss ein JSON-Objekt sein.');
      return;
    }

    const value = candidate as Record<string, unknown>;
    const id = typeof value.id === 'string' && value.id.trim() ? value.id : undefined;
    let valid = true;
    const required = ['id', 'fach', 'stufe', 'schulstufe', 'thema', 'aufgabentyp', 'tags', 'blockJson', 'quelleHinweis', 'createdAt'];

    for (const key of required) {
      if (!hasOwn(value, key)) {
        addIssue(issues, index, id, 'Pflichtfeld „' + key + '" fehlt.');
        valid = false;
      }
    }

    if (!id) {
      addIssue(issues, index, undefined, 'Pflichtfeld „id" muss eine nichtleere Zeichenkette sein.');
      valid = false;
    } else if (seenIds.has(id)) {
      addIssue(issues, index, id, 'Die id kommt in dieser Datei doppelt vor.');
      valid = false;
    } else {
      seenIds.add(id);
    }

    for (const key of ['fach', 'stufe', 'aufgabentyp', 'createdAt']) {
      if (typeof value[key] !== 'string' || !(value[key] as string).trim()) {
        addIssue(issues, index, id, '„' + key + '" muss eine nichtleere Zeichenkette sein.');
        valid = false;
      }
    }

    if (!(value.schulstufe === null || (typeof value.schulstufe === 'number' && Number.isInteger(value.schulstufe)))) {
      addIssue(issues, index, id, '„schulstufe" muss eine ganze Zahl oder null sein.');
      valid = false;
    }
    if (!isNullableString(value.thema)) {
      addIssue(issues, index, id, '„thema" muss eine Zeichenkette oder null sein.');
      valid = false;
    }
    if (!isNullableString(value.quelleHinweis)) {
      addIssue(issues, index, id, '„quelleHinweis" muss eine Zeichenkette oder null sein.');
      valid = false;
    }

    if (typeof value.tags !== 'string') {
      addIssue(issues, index, id, '„tags" muss ein JSON-Array als Zeichenkette sein.');
      valid = false;
    } else {
      try {
        const tags = JSON.parse(value.tags) as unknown;
        if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
          addIssue(issues, index, id, '„tags" muss eine JSON-Zeichenkette mit einem Array aus Texten sein.');
          valid = false;
        }
      } catch {
        addIssue(issues, index, id, '„tags" enthält kein gültiges JSON-Array.');
        valid = false;
      }
    }

    let block: unknown = null;
    if (typeof value.blockJson !== 'string') {
      addIssue(issues, index, id, '„blockJson" muss eine JSON-Zeichenkette sein.');
      valid = false;
    } else {
      try {
        block = JSON.parse(value.blockJson) as unknown;
      } catch {
        addIssue(issues, index, id, '„blockJson" enthält kein gültiges JSON.');
        valid = false;
      }
    }

    if (block !== null && typeof block === 'object' && !Array.isArray(block)) {
      const blockRecord = block as Record<string, unknown>;
      if (blockRecord.typ !== value.aufgabentyp) {
        addIssue(issues, index, id, '„blockJson.typ" stimmt nicht mit „aufgabentyp" überein.');
        valid = false;
      }
      const parsed = BlockSchema.safeParse(block);
      if (!parsed.success) {
        addIssue(issues, index, id, zodMessage(parsed.error));
        valid = false;
      }
    }

    if (valid) entries.push(value as unknown as PoolEntry);
  });

  return {
    valid: issues.length === 0,
    entries: issues.length === 0 ? entries : [],
    issues,
  };
}

export function formatPoolValidationIssues(issues: PoolValidationIssue[], max = 5): string {
  const shown = issues.slice(0, max).map((item) => {
    const location = item.index >= 0 ? 'Eintrag ' + (item.index + 1) : 'Datei';
    const id = item.id ? ' (' + item.id + ')' : '';
    return '• ' + location + id + ': ' + item.message;
  });
  const remaining = issues.length - shown.length;
  if (remaining > 0) shown.push('• … und ' + remaining + ' weitere Fehler.');
  return shown.join('\n');
}
