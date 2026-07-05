import { describe, it, expect } from 'vitest';
import { parseGeparst } from './KiTextBlock';

describe('parseGeparst', () => {
  it('erkennt Schüler-Profil-JSON (kurzbild/staerken/foerderbereiche/maturabezug)', () => {
    const raw = JSON.stringify({
      kurzbild: 'Solide Stufe 3.',
      staerken: ['Klare Gliederung'],
      foerderbereiche: [{ kategorie: 'Ausdruck', befund: '...', uebung: '...' }],
      maturabezug: '',
    });
    const result = parseGeparst(raw);
    expect(result).not.toBeNull();
    expect(result?.kurzbild).toBe('Solide Stufe 3.');
    expect(result?.foerderbereiche?.[0]?.kategorie).toBe('Ausdruck');
  });

  it('erkennt Klassen-Briefing-JSON (schwerpunkte/unterrichtsempfehlungen/matura_fokus)', () => {
    const raw = JSON.stringify({
      kurzbild: 'Klasse insgesamt stabil.',
      schwerpunkte: [{ bereich: 'K1', befund: '...', empfehlung: '...' }],
      unterrichtsempfehlungen: [{ fokus: 'Kommasetzung', stundenidee: '...' }],
      matura_fokus: '',
    });
    const result = parseGeparst(raw);
    expect(result).not.toBeNull();
    expect(result?.schwerpunkte?.[0]?.bereich).toBe('K1');
    expect(result?.unterrichtsempfehlungen?.[0]?.fokus).toBe('Kommasetzung');
  });

  it('liefert null bei Prosa-Text (Fallback auf pre-wrap-Rendering)', () => {
    expect(parseGeparst('Das ist ein ganz normaler Fließtext ohne JSON.')).toBeNull();
  });

  it('liefert null bei kaputtem JSON', () => {
    expect(parseGeparst('{"kurzbild": "unterbrochen')).toBeNull();
  });

  it('liefert null bei validem JSON ohne bekannte Felder', () => {
    expect(parseGeparst(JSON.stringify({ irgendwas: 'unbekannt' }))).toBeNull();
  });

  it('liefert null bei JSON-Array oder Primitiv (kein Objekt)', () => {
    expect(parseGeparst(JSON.stringify([1, 2, 3]))).toBeNull();
    expect(parseGeparst(JSON.stringify('nur ein String'))).toBeNull();
    expect(parseGeparst('null')).toBeNull();
  });
});
