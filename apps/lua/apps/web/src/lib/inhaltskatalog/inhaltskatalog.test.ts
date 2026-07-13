import { describe, it, expect } from 'vitest';
import { getAllInhaltsModule, listInhaltsModule, getInhaltsModul } from './index';
import { FACH_META } from '@lehrunterlagen/schema';

describe('inhaltskatalog integrity', () => {
  it('has no duplicate ids', () => {
    const modules = getAllInhaltsModule();
    const ids = modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has valid fach and stufe values', () => {
    const modules = getAllInhaltsModule();
    for (const m of modules) {
      expect(FACH_META[m.fach]).toBeDefined();
      expect(['unterstufe', 'oberstufe']).toContain(m.stufe);
    }
  });

  it('returns modules for geschichte oberstufe', () => {
    const modules = listInhaltsModule('geschichte', 'oberstufe', 'at-lehrplan');
    expect(modules.length).toBeGreaterThan(0);
    expect(modules.every((m) => m.fach === 'geschichte' && m.stufe === 'oberstufe')).toBe(true);
  });

  it('filters by schulstufe with fallback', () => {
    const allOberstufe = listInhaltsModule('geschichte', 'oberstufe', 'at-lehrplan');
    const s11 = listInhaltsModule('geschichte', 'oberstufe', 'at-lehrplan', 11);
    expect(s11.length).toBeGreaterThan(0);
    expect(s11.length).toBeLessThanOrEqual(allOberstufe.length);
    expect(s11.some((m) => m.titel === 'Globalisierung und Gegenwart')).toBe(true);
  });

  it('returns undefined for unknown module', () => {
    expect(getInhaltsModul('does-not-exist')).toBeUndefined();
  });

  it('returns empty array for non-matching rahmenwerk', () => {
    expect(listInhaltsModule('deutsch', 'oberstufe', 'ib-dp')).toEqual([]);
  });

  it('registriert deutsche Inhaltskataloge für Deutsch und Geschichte', () => {
    for (const fach of ['deutsch', 'geschichte'] as const) {
      const modules = getAllInhaltsModule().filter((m) => m.fach === fach && m.rahmenwerk === 'de-lehrplan');
      expect(modules, `${fach}: erwartete 5 deutsche Inhaltsmodule`).toHaveLength(5);
      expect(modules.every((m) => m.id.startsWith('de-'))).toBe(true);
      expect(listInhaltsModule(fach, 'unterstufe', 'de-lehrplan').length).toBeGreaterThan(0);
      expect(listInhaltsModule(fach, 'oberstufe', 'de-lehrplan').length).toBeGreaterThan(0);
    }
  });
});
