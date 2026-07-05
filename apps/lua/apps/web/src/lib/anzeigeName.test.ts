import { describe, it, expect } from 'vitest';
import { anzeigeName, bereinigeDateiname } from './anzeigeName';

describe('anzeigeName', () => {
  it('bevorzugt vorname+nachname, wenn verknüpft', () => {
    expect(anzeigeName({ vorname: 'Tamara', nachname: 'Ebner', dateiname: 'Neuer Booktok trend_TamaraEbner.docx' }))
      .toBe('Mia Muster');
  });

  it('nutzt nur vorname, wenn nachname fehlt', () => {
    expect(anzeigeName({ vorname: 'Emily', nachname: null, dateiname: 'Emily Pilz .docx' })).toBe('Emily');
  });

  it('fällt auf bereinigten Dateinamen zurück, wenn nicht verknüpft', () => {
    expect(anzeigeName({ vorname: null, nachname: null, dateiname: 'Neuer_Booktok_trend-TamaraEbner.docx' }))
      .toBe('Neuer Booktok trend TamaraEbner');
  });

  it('funktioniert ohne vorname/nachname-Felder (z. B. FehlerDetailRow)', () => {
    expect(anzeigeName({ dateiname: 'Clara Trautschold- deutsch schularbeit.docx' }))
      .toBe('Clara Trautschold deutsch schularbeit');
  });
});

describe('bereinigeDateiname', () => {
  it('entfernt bekannte Dateiendungen', () => {
    expect(bereinigeDateiname('Die neue Literatur.SophieKalteis.docx')).toBe('Die neue Literatur.SophieKalteis');
  });

  it('ersetzt Unterstriche/Bindestriche durch Leerzeichen', () => {
    expect(bereinigeDateiname('CeciliaSantosSchenk_Schularbeit_Deutsch.docx'))
      .toBe('CeciliaSantosSchenk Schularbeit Deutsch');
  });

  it('kollabiert Mehrfach-Leerzeichen und trimmt', () => {
    expect(bereinigeDateiname('  Emily  Pilz  .docx')).toBe('Emily Pilz');
  });

  it('gibt den Originalnamen zurück, falls nach Bereinigung nichts übrig bleibt', () => {
    expect(bereinigeDateiname('.docx')).toBe('.docx');
  });
});
