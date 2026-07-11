import { describe, expect, it } from 'vitest';
import { formatPoolValidationIssues, validatePoolEntries } from './poolValidation';

const block = JSON.stringify({
  id: 'b1',
  punkte: 1,
  arbeitsanweisung: 'Kreuze an.',
  typ: 'multipleChoice',
  config: {
    fragen: [{
      nr: 1,
      frage: 'Ist das eine Testfrage?',
      optionen: [
        { key: 'A', text: 'Ja' },
        { key: 'B', text: 'Nein' },
        { key: 'C', text: 'Vielleicht' },
        { key: 'D', text: 'Unklar' },
      ],
      mehrfach: false,
    }],
  },
  loesung: { antworten: { '1': ['A'] } },
});

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  fach: 'informatikki',
  stufe: 'oberstufe',
  schulstufe: 9,
  thema: 'Testaufgabe',
  aufgabentyp: 'multipleChoice',
  tags: '["redaktionell-kuratiert"]',
  blockJson: block,
  quelleHinweis: 'Testquelle',
  createdAt: '2026-07-11T00:00:00.000Z',
  ...overrides,
});

describe('Pool-Paket-Validierung', () => {
  it('akzeptiert einen gültigen Eintrag', () => {
    const result = validatePoolEntries([entry()]);
    expect(result.valid).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.issues).toHaveLength(0);
  });

  it('lehnt kein Array, ungültige Tags und kaputtes blockJson ab', () => {
    expect(validatePoolEntries({}).valid).toBe(false);
    expect(validatePoolEntries([entry({ tags: 'kaputt' })]).issues[0].message).toContain('tags');
    expect(validatePoolEntries([entry({ blockJson: '{ kaputt' })]).issues[0].message).toContain('blockJson');
  });

  it('prüft typ-Abgleich und Block-Schema', () => {
    const mismatch = validatePoolEntries([entry({ aufgabentyp: 'matching' })]);
    expect(mismatch.issues.some((item) => item.message.includes('blockJson.typ'))).toBe(true);
    const invalidBlock = validatePoolEntries([entry({ blockJson: JSON.stringify({ id: 'b1', typ: 'multipleChoice' }) })]);
    expect(invalidBlock.issues.some((item) => item.message.includes('Aufgaben-Schema'))).toBe(true);
  });

  it('lehnt doppelte ids ab und begrenzt die Fehleranzeige', () => {
    const result = validatePoolEntries([entry(), entry({ tags: 'kaputt' })]);
    expect(result.valid).toBe(false);
    expect(result.issues.some((item) => item.message.includes('doppelt'))).toBe(true);
    expect(formatPoolValidationIssues(result.issues, 1)).toContain('weitere Fehler');
  });
});
