import { describe, expect, it } from 'vitest';
import { fachLabel, gruppiereRubriken, rubrikLabel } from './rubrikAuswahl';

describe('Rubrik-Auswahl', () => {
  it('zeigt den Header-Titel, sonst einen aufbereiteten Dateinamen', () => {
    expect(rubrikLabel({ filename: 'srdp_deutsch_oberstufe.md', titel: 'SRDP Deutsch Oberstufe' }))
      .toBe('SRDP Deutsch Oberstufe');
    expect(rubrikLabel({ filename: 'offener_brief.md' })).toBe('Offener Brief');
  });

  it('gruppiert die Optionen nach Fach und sortiert innerhalb der Gruppe', () => {
    const groups = gruppiereRubriken([
      { filename: 'srdp_englisch_b2.md', titel: 'SRDP Englisch B2', fach: 'englisch' },
      { filename: 'kommentar.md', titel: 'Kommentar', fach: 'deutsch' },
      { filename: 'srdp_deutsch_oberstufe.md', titel: 'SRDP Deutsch Oberstufe', fach: 'deutsch' },
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Deutsch', 'Englisch']);
    expect(groups[0]?.rubriken.map(rubrikLabel)).toEqual(['Kommentar', 'SRDP Deutsch Oberstufe']);
  });

  it('bezeichnet leere oder unbekannte Fachangaben nachvollziehbar', () => {
    expect(fachLabel('')).toBe('Weitere Raster');
    expect(fachLabel('geschichte')).toBe('Geschichte');
  });
});
