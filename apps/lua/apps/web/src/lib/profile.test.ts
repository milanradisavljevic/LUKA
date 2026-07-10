import { describe, expect, it } from 'vitest';
import { DEFAULT_LEHRER_PROFIL, sortPoolByProfileSubjects, type LehrerProfil } from './profile';
import type { PoolEntry } from './pool';

const entry = (id: string, fach: string): PoolEntry => ({
  id, fach, stufe: 'oberstufe', schulstufe: 10, thema: id, aufgabentyp: 'multipleChoice',
  tags: null, blockJson: '{}', quelleHinweis: null, createdAt: id,
});

describe('Lehrerprofil', () => {
  it('hat sichere Generator-Defaults', () => {
    expect(DEFAULT_LEHRER_PROFIL.land).toBe('AT');
    expect(DEFAULT_LEHRER_PROFIL.exportDocx).toBe(true);
    expect(DEFAULT_LEHRER_PROFIL.exportLoesung).toBe(true);
    expect(DEFAULT_LEHRER_PROFIL.exportPdf).toBe(false);
  });

  it('sortiert Profilfächer zuerst und bleibt innerhalb der Gruppen stabil', () => {
    const items = [entry('a', 'geschichte'), entry('b', 'deutsch'), entry('c', 'informatikki'), entry('d', 'deutsch')];
    expect(sortPoolByProfileSubjects(items, ['deutsch', 'informatikki']).map((item) => item.id)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('lässt die Pool-Reihenfolge ohne Profilfächer unverändert', () => {
    const items = [entry('a', 'geschichte'), entry('b', 'deutsch')];
    expect(sortPoolByProfileSubjects(items, []).map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('repräsentiert das Profil als roundtrip-fähiges Objekt', () => {
    const profile: LehrerProfil = { ...DEFAULT_LEHRER_PROFIL, displayName: 'Mila', faecher: ['deutsch'], schulstufen: [7] };
    expect(JSON.parse(JSON.stringify(profile))).toEqual(profile);
  });
});
