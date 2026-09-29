import { describe, expect, it } from 'vitest';
import {
  fachLabel, gruppiereRubriken, normiereSuchbegriff, rubrikLabel, rubrikPasstZurTextsorte,
} from './rubrikAuswahl';

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

describe('Raster-Vorschlag nach Aufgabenart', () => {
  // Der eigentliche Fund: die Rubrik-Datei führt `leseverstaendnis`, das
  // Auswahlfeld zeigt `Leseverständnis`. Ohne Normalisierung findet der
  // Vorschlag nichts — ä ≠ ae.
  const lese = { filename: 'leseverstaendnis.md', titel: 'Leseverständnis', textsorte: 'leseverstaendnis' };
  const kommentar = { filename: 'kommentar.md', titel: 'Kommentar', textsorte: 'kommentar' };

  it('findet das Raster trotz unterschiedlicher Umlaut-Schreibweise', () => {
    expect(rubrikPasstZurTextsorte(lese, 'Leseverständnis')).toBe(true);
    expect(rubrikPasstZurTextsorte(lese, 'leseverstaendnis')).toBe(true);
  });

  it('trennt sauber, was nicht dazu gehoert', () => {
    expect(rubrikPasstZurTextsorte(kommentar, 'Leseverständnis')).toBe(false);
    expect(rubrikPasstZurTextsorte(lese, 'Kommentar')).toBe(false);
  });

  it('ohne Auswahl passt nichts', () => {
    expect(rubrikPasstZurTextsorte(lese, '')).toBe(false);
    expect(rubrikPasstZurTextsorte(lese, undefined)).toBe(false);
    expect(rubrikPasstZurTextsorte({ filename: 'x.md' }, 'Leseverständnis')).toBe(false);
  });

  it('normalisiert beide Seiten gleich', () => {
    expect(normiereSuchbegriff(' LeseVERständnis ')).toBe('leseverstaendnis');
    expect(normiereSuchbegriff('Größe')).toBe('groesse');
    expect(normiereSuchbegriff(null)).toBe('');
  });
});
