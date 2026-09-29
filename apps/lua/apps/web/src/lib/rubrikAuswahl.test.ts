import { describe, expect, it } from 'vitest';
import {
  fachLabel, gruppiereRubriken, istVerstaendnisRubrik, normiereSuchbegriff,
  rubrikLabel, rubrikMetaZeile, rubrikPasstZurTextsorte, stufeLabel,
} from './rubrikAuswahl';
import { textsortenLabel } from './textsortenAuswahl';

describe('Verständnisraster erkennen', () => {
  // `aufgabenart` kommt seit v1.5.4 mit der Rasterliste mit (Python liefert den
  // ganzen Kopf), wurde aber nirgends gelesen. Genau daran hing die Frage, ob der
  // Ausgangstext Voraussetzung ist oder Kür.
  const verstaendnis = { filename: 'leseverstaendnis.md', titel: 'Leseverständnis', aufgabenart: 'verstaendnis' };
  const kanonisch = { filename: 'kommentar.md', titel: 'Kommentar', aufgabenart: 'kommentar' };

  it('erkennt ein Raster, das Verstehen misst', () => {
    expect(istVerstaendnisRubrik(verstaendnis)).toBe(true);
  });

  it('erkennt es auch bei abweichender Schreibweise', () => {
    expect(istVerstaendnisRubrik({ filename: 'x.md', aufgabenart: 'Verständnis' })).toBe(true);
    expect(istVerstaendnisRubrik({ filename: 'x.md', aufgabenart: ' Verstaendnis ' })).toBe(true);
  });

  it('lässt alles andere wie bisher', () => {
    expect(istVerstaendnisRubrik(kanonisch)).toBe(false);
    // Ohne Deklaration wird es nicht still zur Voraussetzung.
    expect(istVerstaendnisRubrik({ filename: 'srdp_deutsch_oberstufe.md' })).toBe(false);
    expect(istVerstaendnisRubrik(undefined)).toBe(false);
    expect(istVerstaendnisRubrik(null)).toBe(false);
  });
});

describe('Rubrik-Auswahl', () => {
  it('zeigt den Header-Titel, sonst einen aufbereiteten Dateinamen', () => {
    expect(rubrikLabel({ filename: 'srdp_deutsch_oberstufe.md', titel: 'SRDP Deutsch Oberstufe' }))
      .toBe('SRDP Deutsch Oberstufe');
    expect(rubrikLabel({ filename: 'offener_brief.md' })).toBe('Offener Brief');
  });

  it('zeigt nie den Dateinamen mit Endung', () => {
    // Der eigentliche Aerger: im Auswahlfeld stand "leseverstaendnis.md".
    for (const datei of ['leseverstaendnis.md', 'srdp_deutsch_oberstufe.md', 'AB_Checkliste.md']) {
      expect(rubrikLabel({ filename: datei })).not.toContain('.md');
    }
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

describe('Rubrik-Beschriftung ohne Dateinamen', () => {
  it('macht die Schulstufe lesbar', () => {
    expect(stufeLabel('unterstufe')).toBe('Unterstufe');
    expect(stufeLabel('Oberstufe')).toBe('Oberstufe');
    // "alle" ist keine Angabe, sondern eine Abgrenzung - da steht nichts.
    expect(stufeLabel('alle')).toBe('');
    expect(stufeLabel('')).toBe('');
  });

  it('baut die Nebenzeile aus Fach und Stufe', () => {
    expect(rubrikMetaZeile({ filename: 'x.md', fach: 'deutsch', schulstufe: 'oberstufe' }))
      .toBe('Deutsch · Oberstufe');
    // Ohne Stufenangabe bleibt kein Füllwort zurück.
    expect(rubrikMetaZeile({ filename: 'x.md', fach: 'deutsch' })).toBe('Deutsch');
  });

  it('macht die maschinenlesbare Textsorte wieder lesbar', () => {
    // Die Raster-Koepfe muessen "leseverstaendnis" schreiben (Python vergleicht
    // ohne Umlaute), angezeigt wird aber die Form aus den Auswahllisten.
    expect(textsortenLabel('leseverstaendnis')).toBe('Leseverständnis');
    expect(textsortenLabel('Leseverständnis')).toBe('Leseverständnis');
    expect(textsortenLabel('erzaehlung')).toBe('Erzählung');
  });

  it('lässt "alle" weg, statt es als Textsorte zu nennen', () => {
    expect(textsortenLabel('alle')).toBe('');
    expect(textsortenLabel('')).toBe('');
    expect(textsortenLabel(undefined)).toBe('');
  });

  it('macht auch unbekannte Angaben lesbar, statt sie roh zu zeigen', () => {
    expect(textsortenLabel('offener-brief')).toBe('Offener Brief');
    expect(textsortenLabel('lehrstueck')).toBe('Lehrstueck');
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
