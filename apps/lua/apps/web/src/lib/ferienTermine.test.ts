import { describe, expect, it } from 'vitest';
import {
  AT_BUNDESLAENDER, DE_BUNDESLAENDER, atBundesland, ferienTerminQuelle, ferientermine,
  regionNormalisieren,
} from './ferienTermine';
import { ferienBestandVorschlag, ostersonntag } from './ferien';
import { plusTage } from './lokalDatum';
import { REGION_AT, REGION_DE } from './profileOptions';

/**
 * Diese Tests prüfen gegen **die amtlichen Termine**, nicht gegen den Code.
 *
 *  Genau das hat vorher gefehlt: `ferien.test.ts` benutzte die Werte, die der
 *  Code selbst erzeugt hat (`2027-07-01`, `2027-02-08`). Dadurch war die
 *  falsche Formel mit sich selbst glücklich. Für 2026/27 gerechnet LUA
 *  Osterferien als 29.03.–11.04.; amtlich sind es 20.03.–29.03.
 *
 *  Wer hier ein Datum ändert, muss die Verordnung ändern – und das soll auffallen.
 */

// Quelle: BMB (bmb.gv.at), „Schulferien in Österreich im Schuljahr 2026/2027".
const AT_2026_27: Record<string, { semester: [string, string]; sommer: [string, string] }> = {
  Burgenland: { semester: ['2027-02-08', '2027-02-13'], sommer: ['2027-07-03', '2027-09-05'] },
  Kärnten: { semester: ['2027-02-08', '2027-02-13'], sommer: ['2027-07-10', '2027-09-12'] },
  Niederösterreich: { semester: ['2027-02-01', '2027-02-06'], sommer: ['2027-07-03', '2027-09-05'] },
  Oberösterreich: { semester: ['2027-02-15', '2027-02-20'], sommer: ['2027-07-10', '2027-09-12'] },
  Salzburg: { semester: ['2027-02-15', '2027-02-20'], sommer: ['2027-07-10', '2027-09-12'] },
  Steiermark: { semester: ['2027-02-15', '2027-02-20'], sommer: ['2027-07-10', '2027-09-12'] },
  Tirol: { semester: ['2027-02-15', '2027-02-20'], sommer: ['2027-07-10', '2027-09-12'] },
  Vorarlberg: { semester: ['2027-02-15', '2027-02-20'], sommer: ['2027-07-10', '2027-09-12'] },
  Wien: { semester: ['2027-02-01', '2027-02-06'], sommer: ['2027-07-03', '2027-09-05'] },
};

const AT_BUNDESLAND_ALT: Record<string, string> = {
  Burgenland: '1', Kärnten: '2', Niederösterreich: '3', Oberösterreich: '4',
  Salzburg: '5', Steiermark: '6', Tirol: '7', Vorarlberg: '8', Wien: '9',
};

/**
 * Profil und Ferientabelle müssen dasselbe Format sprechen.
 *
 *  Genau hier ist es schiefgegangen: `lua_lehrerprofil.region_at` speichert
 *  **„Salzburg"**, `ferientermine()` verlangte aber **„5"**. Ergebnis: für alle
 *  neun Bundesländer `null`, ohne Fehlermeldung – die amtlichen Termine waren da
 *  und unerreichbar. Dieser Test schlägt an, sobald jemand eine Seite umbenennt.
 */
describe('Profil und Ferientabelle sprechen dasselbe Format', () => {
  it('nimmt für Österreich genau die Namen, die das Profil anbietet', () => {
    expect([...AT_BUNDESLAENDER].sort()).toEqual([...REGION_AT].sort());
  });

  it('nimmt für Deutschland genau die Namen, die das Profil anbietet', () => {
    expect([...DE_BUNDESLAENDER].sort()).toEqual([...REGION_DE].sort());
  });

  it('liefert für jeden Profilwert Termine – nicht nur für die Hälfte', () => {
    // Der eigentliche Wächter: für jedes Bundesland, das eine Lehrkraft im
    // Profil wählen kann, muss eine Verordnung dahinterstehen.
    for (const name of REGION_AT) {
      const blok = ferientermine(2026, 'AT', name);
      expect(blok, `Österreich ${name}`).not.toBeNull();
      expect(blok!.length, `Österreich ${name}`).toBeGreaterThan(4);
    }
    for (const name of REGION_DE) {
      const blok = ferientermine(2026, 'DE', name);
      expect(blok, `Deutschland ${name}`).not.toBeNull();
      expect(blok!.length, `Deutschland ${name}`).toBeGreaterThan(3);
    }
  });
});

describe('Salzburg – der gemeldete Fall', () => {
  it('findet die amtlichen Termine über den Profilwert', () => {
    // Vorher stand hier `null`, weil die Tabelle die Nummer 5 verlangte.
    const blok = ferientermine(2026, 'AT', 'Salzburg');
    expect(blok).not.toBeNull();
    expect(blok!.find(f => f.bezeichnung === 'Sommerferien'))
      .toMatchObject({ von: '2027-07-10', bis: '2027-09-12' });
    expect(blok!.find(f => f.bezeichnung === 'Semesterferien'))
      .toMatchObject({ von: '2027-02-15', bis: '2027-02-20' });
  });

  it('kommt mit der alten Nummer genauso zum Ziel', () => {
    expect(ferientermine(2026, 'AT', '5')).toEqual(ferientermine(2026, 'AT', 'Salzburg'));
  });

  it('findet Salzburg auch im Schuljahr 2025/26', () => {
    expect(ferientermine(2025, 'AT', 'Salzburg'))
      .toEqual(ferientermine(2025, 'AT', '5'));
  });
});

describe('atBundesland – Name oder alte Nummer', () => {
  it('nimmt jeden Namen aus dem Profil', () => {
    for (const name of REGION_AT) expect(atBundesland(name), name).toBe(name);
  });

  it('übersetzt jede alte Nummer', () => {
    for (const [name, code] of Object.entries(AT_BUNDESLAND_ALT)) {
      expect(atBundesland(code), code).toBe(name);
    }
  });

  it('verkraftet eine führende Null', () => {
    expect(atBundesland('05')).toBe('Salzburg');
    expect(atBundesland('  Salzburg ')).toBe('Salzburg');
  });

  it('gibt null zurück, was keines von beidem ist', () => {
    expect(atBundesland('')).toBeNull();
    expect(atBundesland(null)).toBeNull();
    expect(atBundesland(undefined)).toBeNull();
    expect(atBundesland('Bayern')).toBeNull();  // deutscher Name, kein österreichischer
    expect(atBundesland('99')).toBeNull();
  });
});

describe('regionNormalisieren – der Vergleich beider Seiten', () => {
  it('macht aus einer alten Nummer den Namen', () => {
    expect(regionNormalisieren('5')).toBe('Salzburg');
  });

  it('lässt Namen und deutsche Bundesländer unverändert', () => {
    expect(regionNormalisieren('Salzburg')).toBe('Salzburg');
    expect(regionNormalisieren('Bayern')).toBe('Bayern');
  });

  it('lässt einen deutschen Namen nicht versehentlich umdeuten', () => {
    // 'Bayern' ist keine österreichische Nummer und kein AT-Name.
    expect(regionNormalisieren('Bayern')).not.toBe('Niederösterreich');
  });

  it('behandelt leere und unbekannte Werte als leer bzw. unverändert', () => {
    expect(regionNormalisieren(null)).toBe('');
    expect(regionNormalisieren('  ')).toBe('');
    expect(regionNormalisieren('Irgendwo')).toBe('Irgendwo');
  });
});

describe('Ferientermine – Österreich 2026/27 gegen das BMB', () => {
  it('hält die Semesterferien jedes Landes amtlich fest', () => {
    for (const [name, soll] of Object.entries(AT_2026_27)) {
      const blok = ferientermine(2026, 'AT', name);
      expect(blok, name).not.toBeNull();
      const semester = blok!.find(f => f.bezeichnung === 'Semesterferien');
      expect([semester?.von, semester?.bis], name).toEqual(soll.semester);
    }
  });

  it('hält die Sommerferien jedes Landes amtlich fest', () => {
    for (const [name, soll] of Object.entries(AT_2026_27)) {
      const blok = ferientermine(2026, 'AT', name)!;
      const sommer = blok.find(f => f.bezeichnung === 'Sommerferien');
      expect([sommer?.von, sommer?.bis], name).toEqual(soll.sommer);
    }
  });

  it('hält die gemeinsamen Blöcke amtlich fest', () => {
    const wien = ferientermine(2026, 'AT', 'Wien')!;
    const herbst = wien.find(f => f.bezeichnung === 'Herbstferien');
    expect([herbst?.von, herbst?.bis]).toEqual(['2026-10-27', '2026-10-31']);
    const weihnacht = wien.find(f => f.bezeichnung === 'Weihnachtsferien');
    expect([weihnacht?.von, weihnacht?.bis]).toEqual(['2026-12-24', '2027-01-06']);
    const oster = wien.find(f => f.bezeichnung === 'Osterferien');
    expect([oster?.von, oster?.bis]).toEqual(['2027-03-20', '2027-03-29']);
    const pfingst = wien.find(f => f.bezeichnung === 'Pfingstferien');
    expect([pfingst?.von, pfingst?.bis]).toEqual(['2027-05-15', '2027-05-17']);
  });

  it('endet die Osterferien am Ostermontag, nicht zwei Wochen danach', () => {
    // Die alte Formel rechnete „Ostermontag + 13 Tage" und landete für 2026/27
    // auf dem 11.04. – LUA hätte in den Osterferien Unterricht geplant.
    for (const name of AT_BUNDESLAENDER) {
      const oster = ferientermine(2026, 'AT', name)!.find(f => f.bezeichnung === 'Osterferien')!;
      const ostermontag = plusTage(ostersonntag(2027), 1);
      expect(oster.bis, name).toBe(ostermontag);
      expect(oster.von < ostermontag, name).toBe(true);
    }
  });

  it('enthält Herbst- und Pfingstferien – beide fehlten vorher ganz', () => {
    const namen = ferientermine(2026, 'AT', 'Wien')!.map(f => f.bezeichnung);
    expect(namen).toContain('Herbstferien');
    expect(namen).toContain('Pfingstferien');
    expect(namen).toContain('Semesterferien');
  });

  it('hält die Termine 2025/26 amtlich fest', () => {
    // BMB: Semesterferien NÖ/Wien 2.–7.2.2026, Sommer 4.7.–6.9.2026
    const wien = ferientermine(2025, 'AT', 'Wien')!;
    const semester = wien.find(f => f.bezeichnung === 'Semesterferien')!;
    expect([semester.von, semester.bis]).toEqual(['2026-02-02', '2026-02-07']);
    const sommer = wien.find(f => f.bezeichnung === 'Sommerferien')!;
    expect([sommer.von, sommer.bis]).toEqual(['2026-07-04', '2026-09-06']);
    const oster = wien.find(f => f.bezeichnung === 'Osterferien')!;
    expect([oster.von, oster.bis]).toEqual(['2026-03-28', '2026-04-06']);
  });
});

describe('Ferientermine – Deutschland 2026/27', () => {
  it('kennt alle 16 Bundesländer', () => {
    expect(DE_BUNDESLAENDER).toHaveLength(16);
    // Und zwar genau die, die auch das Profil anbietet.
    expect([...DE_BUNDESLAENDER].sort()).toEqual([...REGION_DE].sort());
  });

  it('liefert für jedes Bundesland Termine', () => {
    for (const bl of DE_BUNDESLAENDER) {
      const blok = ferientermine(2026, 'DE', bl);
      expect(blok, bl).not.toBeNull();
      expect(blok!.length, bl).toBeGreaterThan(3);
    }
  });

  it('hält die Osterferien amtlich fest (Bayern und Berlin sind die Referenz)', () => {
    // KMK: Bayern und Berlin 22.03.–02.04.2027
    expect(ferientermine(2026, 'DE', 'Bayern')!
      .find(f => f.bezeichnung === 'Osterferien'))
      .toMatchObject({ von: '2027-03-22', bis: '2027-04-02' });
    expect(ferientermine(2026, 'DE', 'Berlin')!
      .find(f => f.bezeichnung === 'Osterferien'))
      .toMatchObject({ von: '2027-03-22', bis: '2027-04-02' });
  });

  it('unterscheidet Länder, die sich unterscheiden', () => {
    // Bayern hat Frühjahrsferien, Hessen nicht – das ist der Unterschied, an dem
    // sich zeigt, dass hier Daten stehen und keine Formel.
    const bayern = ferientermine(2026, 'DE', 'Bayern')!.map(f => f.bezeichnung);
    const hessen = ferientermine(2026, 'DE', 'Hessen')!.map(f => f.bezeichnung);
    expect(bayern).toContain('Frühjahrsferien');
    expect(hessen).not.toContain('Frühjahrsferien');
    expect(hessen).not.toContain('Winterferien');
  });

  it('lässt die Bundesländer in der Schuljahreszeit', () => {
    // Herbst 2026 bis Ende September 2027. Das Schuljahr endet in Deutschland
    // bewusst **nach** dem 31. August – Baden-Württemberg hat bis 11.09. Ferien,
    // Nordrhein-Westfalen bis 31.08. Eine Grenze am 31.08. wäre falsch.
    for (const bl of DE_BUNDESLAENDER) {
      for (const f of ferientermine(2026, 'DE', bl)!) {
        expect(f.von >= '2026-09-01', `${bl} ${f.bezeichnung} zu früh`).toBe(true);
        expect(f.bis <= '2027-09-30', `${bl} ${f.bezeichnung} zu spät`).toBe(true);
        expect(f.von <= f.bis, `${bl} ${f.bezeichnung} Ende vor Beginn`).toBe(true);
      }
    }
  });
});

describe('Lückenhafte Daten werden gemeldet, nicht geraten', () => {
  it('liefert null für ein Schuljahr ohne Termine', () => {
    expect(ferientermine(2029, 'AT', 'Wien')).toBeNull();
    expect(ferientermine(2026, 'DE', 'Bayern') && ferientermine(2029, 'DE', 'Bayern')).toBeNull();
  });

  it('liefert null ohne Region', () => {
    expect(ferientermine(2026, 'AT', '')).toBeNull();
    expect(ferientermine(2026, 'DE', null)).toBeNull();
  });

  it('liefert null für die Schweiz – dort führt LUA keine Kantone', () => {
    expect(ferientermine(2026, 'CH', 'ZH')).toBeNull();
  });

  it('liefert null für eine unbekannte Region', () => {
    expect(ferientermine(2026, 'AT', '99')).toBeNull();
    expect(ferientermine(2026, 'DE', 'Bayreuth')).toBeNull();
  });

  it('verträgt einen führenden Nullen bei österreichischen Codes', () => {
    expect(ferientermine(2026, 'AT', '09')).toEqual(ferientermine(2026, 'AT', 'Wien'));
  });
});

describe('ferienBestandVorschlag liest die Tabelle statt zu rechnen', () => {
  it('gibt exakt die amtlichen Werte zurück', () => {
    const vorschlag = ferienBestandVorschlag('Wien', 2026);
    expect(vorschlag).toEqual(ferientermine(2026, 'AT', 'Wien'));
    expect(vorschlag.find(f => f.bezeichnung === 'Osterferien')?.von).toBe('2027-03-20');
  });

  it('ist für Deutschland ebenfalls befüllt', () => {
    const vorschlag = ferienBestandVorschlag('Bayern', 2026, 'DE');
    expect(vorschlag.length).toBeGreaterThan(4);
    expect(vorschlag.find(f => f.bezeichnung === 'Sommerferien')?.von).toBe('2027-08-02');
  });

  it('ist leer, statt zu raten, wenn das Jahr fehlt', () => {
    expect(ferienBestandVorschlag('Wien', 2031)).toEqual([]);
    expect(ferienBestandVorschlag('Bayern', 2031, 'DE')).toEqual([]);
  });

  it('kommt mit führender Null im österreichischen Code zurecht', () => {
    expect(ferienBestandVorschlag('09', 2026).length).toBeGreaterThan(0);
  });
});

describe('Quelle ist ausgewiesen', () => {
  it('nennt für jedes belegte Jahr eine Quelle mit Abrufdatum', () => {
    // Österreich ist für zwei Jahre erhoben, Deutschland bisher für eines.
    const belegt: Array<[number, string]> = [[2025, 'AT'], [2026, 'AT'], [2026, 'DE']];
    for (const [jahr, land] of belegt) {
      const q = ferienTerminQuelle(jahr, land);
      expect(q, `${jahr}/${land}`).not.toBeNull();
      expect(q!.quelle.length, `${jahr}/${land}`).toBeGreaterThan(10);
      expect(q!.abgerufen, `${jahr}/${land}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('gibt für ein unbelegtes Jahr nichts zurück', () => {
    expect(ferienTerminQuelle(2031, 'AT')).toBeNull();
    expect(ferienTerminQuelle(2025, 'DE')).toBeNull();
  });
});
