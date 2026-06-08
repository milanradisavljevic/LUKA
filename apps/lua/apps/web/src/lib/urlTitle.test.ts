import { describe, it, expect } from 'vitest';
import { istUrlArtig, titelAusUrl } from './urlTitle';

describe('istUrlArtig', () => {
  it('erkennt http(s)-URLs und bare Domains mit Pfad', () => {
    expect(istUrlArtig('https://yougov.com/en-us/articles/x')).toBe(true);
    expect(istUrlArtig('yougov.com/en-us/articles/x')).toBe(true);
  });
  it('lässt echte Titel durch', () => {
    expect(istUrlArtig('American Dream: hard to achieve')).toBe(false);
    expect(istUrlArtig('Medienkonsum und seine Folgen')).toBe(false);
  });
});

describe('titelAusUrl', () => {
  it('baut aus einer Artikel-URL einen lesbaren Titel', () => {
    const t = titelAusUrl('https://yougov.com/en-us/articles/54917-american-dream-hard-to-achieve-poll');
    expect(t).toBe('yougov.com – american dream hard to achieve poll');
  });
  it('fällt auf den Hostname zurück, wenn kein Slug da ist', () => {
    expect(titelAusUrl('https://www.derstandard.at/')).toBe('derstandard.at');
  });
  it('ist robust bei kaputten URLs', () => {
    expect(titelAusUrl('kein-url')).toBe('kein-url');
  });
});
