import { describe, it, expect } from 'vitest';
import { anzeigeName, bereinigeDateiname } from './anzeigeName';

// Alle Namen in diesen Tests sind frei erfunden (Musterdaten).
describe('anzeigeName', () => {
  it('bevorzugt vorname+nachname, wenn verknüpft', () => {
    expect(anzeigeName({ vorname: 'Mia', nachname: 'Muster', dateiname: 'Neuer Booktok trend_MiaMuster.docx' }))
      .toBe('Mia Muster');
  });

  it('nutzt nur vorname, wenn nachname fehlt', () => {
    expect(anzeigeName({ vorname: 'Lena', nachname: null, dateiname: 'Lena Beispiel .docx' })).toBe('Lena');
  });

  it('fällt auf bereinigten Dateinamen zurück, wenn nicht verknüpft', () => {
    expect(anzeigeName({ vorname: null, nachname: null, dateiname: 'Neuer_Booktok_trend-MiaMuster.docx' }))
      .toBe('Neuer Booktok trend MiaMuster');
  });

  it('funktioniert ohne vorname/nachname-Felder (z. B. FehlerDetailRow)', () => {
    expect(anzeigeName({ dateiname: 'Nora Musterfrau- deutsch schularbeit.docx' }))
      .toBe('Nora Musterfrau deutsch schularbeit');
  });
});

describe('bereinigeDateiname', () => {
  it('entfernt bekannte Dateiendungen', () => {
    expect(bereinigeDateiname('Die neue Literatur.SophieMuster.docx')).toBe('Die neue Literatur.SophieMuster');
  });

  it('ersetzt Unterstriche/Bindestriche durch Leerzeichen', () => {
    expect(bereinigeDateiname('CarlaMusterSchmidt_Schularbeit_Deutsch.docx'))
      .toBe('CarlaMusterSchmidt Schularbeit Deutsch');
  });

  it('kollabiert Mehrfach-Leerzeichen und trimmt', () => {
    expect(bereinigeDateiname('  Lena  Beispiel  .docx')).toBe('Lena Beispiel');
  });

  it('gibt den Originalnamen zurück, falls nach Bereinigung nichts übrig bleibt', () => {
    expect(bereinigeDateiname('.docx')).toBe('.docx');
  });
});
