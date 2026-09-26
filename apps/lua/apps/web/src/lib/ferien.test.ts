import { describe, expect, it } from 'vitest';
import {
  bundeslandName, ferienAm, ferienBestandVorschlag, ferienWarnung, feiertagAm, feiertage,
  hatFerienDaten, istFeiertag, istSchulfrei, ostersonntag, pauseAm, pauseAm as tagespause,
  schulfreiAm, schuljahrFuer, schuljahrLabel, type FerienZeit, type SchulfreiTag,
} from './ferien';
import { AT_BUNDESLAENDER } from './ferienTermine';
import { plusTage } from './lokalDatum';

/** Amtliche Termine für Wien, Schuljahr 2026/27 (BMB). Vorher standen hier die
 *  Werte, die die alte Formel erzeugt hat – Sommerferien ab 01.07. und
 *  „Winterferien" statt Semesterferien. */
const W: FerienZeit[] = [
  { bezeichnung: 'Sommerferien', von: '2027-07-03', bis: '2027-09-05', region: 'Wien', schuljahr: 2026 },
  { bezeichnung: 'Semesterferien', von: '2027-02-01', bis: '2027-02-06', region: 'Wien', schuljahr: 2026 },
  { bezeichnung: 'Alle Schulen', von: '2027-03-12', bis: '2027-03-12', region: '', schuljahr: 2026 },
];
const P: SchulfreiTag[] = [
  { bezeichnung: 'MuT-Tag', datum: '2026-11-12', klasseName: '', notiz: '', schuljahr: 2026 },
  { bezeichnung: 'Fortbildung 6b', datum: '2026-11-20', klasseName: '6b', notiz: '', schuljahr: 2026 },
];

describe('ostersonntag – bekannte Referenzjahre', () => {
  it('trifft die dokumentierten Osterdaten', () => {
    expect(ostersonntag(2024)).toBe('2024-03-31');
    expect(ostersonntag(2025)).toBe('2025-04-20');
    expect(ostersonntag(2026)).toBe('2026-04-05');
    expect(ostersonntag(2027)).toBe('2027-03-28');
  });

  it('liegt immer zwischen 22. März und 25. April', () => {
    for (let jahr = 1990; jahr <= 2060; jahr++) {
      const m = ostersonntag(jahr);
      expect(Number(m.slice(5, 7)) * 100 + Number(m.slice(8, 10)))
        .toBeGreaterThanOrEqual(322);
      expect(Number(m.slice(5, 7)) * 100 + Number(m.slice(8, 10)))
        .toBeLessThanOrEqual(425);
    }
  });
});

describe('Gesetzliche Feiertage', () => {
  it('enthält alle bundesweiten Feiertage in Österreich', () => {
    const namen = feiertage(2026, 'AT', null).map(f => f.name);
    for (const erwartet of [
      'Neujahr', 'Ostermontag', 'Staatsfeiertag', 'Christi Himmelfahrt', 'Pfingstmontag',
      'Mariä Himmelfahrt', 'Nationalfeiertag', 'Allerheiligen', 'Mariä Empfängnis', 'Christtag', 'Stefanitag',
    ]) {
      expect(namen).toContain(erwartet);
    }
    expect(feiertage(2026, 'AT', null)).toHaveLength(11);
  });

  it('setzt die beweglichen Feiertage passend zu Ostern 2026', () => {
    expect(feiertagAm('2026-04-06', 'AT', null)?.name).toBe('Ostermontag');
    expect(feiertagAm('2026-05-14', 'AT', null)?.name).toBe('Christi Himmelfahrt');
    expect(feiertagAm('2026-05-25', 'AT', null)?.name).toBe('Pfingstmontag');
  });

  it('gibt Fronleichnam nur in den sieben passenden Bundesländern', () => {
    for (const bl of ['Burgenland', 'Kärnten', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg']) {
      expect(feiertagAm('2026-06-04', 'AT', bl)?.name, bl).toBe('Fronleichnam');
    }
    for (const bl of ['Niederösterreich', 'Wien']) {
      expect(feiertagAm('2026-06-04', 'AT', bl), bl).toBeNull();
    }
    expect(feiertagAm('2026-06-04', 'AT', null)).toBeNull();
  });

  it('entscheidet am Fronleichnam über den Namen, nicht über die alte Nummer', () => {
    // Derselbe Fehler wie bei den Ferientabellen: das Profil liefert „Wien",
    // der Vergleich sah aber auf „9". Dadurch wäre in Wien und Niederösterreich
    // der Feiertag als schulfrei behandelt worden – dort ist er keiner.
    expect(feiertagAm('2026-06-04', 'AT', 'Wien'), 'Wien nach Name').toBeNull();
    expect(feiertagAm('2026-06-04', 'AT', 'Niederösterreich'), 'NÖ nach Name').toBeNull();
    // Und die alte Nummer führt zum selben Ergebnis, damit alte DB-Zeilen stimmen.
    expect(feiertagAm('2026-06-04', 'AT', '9'), 'Wien nach Nummer').toBeNull();
    expect(feiertagAm('2026-06-04', 'AT', '3'), 'NÖ nach Nummer').toBeNull();
    expect(feiertagAm('2026-06-04', 'AT', '5')?.name, 'Salzburg nach Nummer').toBe('Fronleichnam');
  });

  it('rechnet die Karfreitagsverschiebung', () => {
    expect(feiertagAm('2026-04-03', 'DE', null)?.name).toBe('Karfreitag');
    expect(feiertagAm('2027-03-26', 'DE', null)?.name).toBe('Karfreitag');
    expect(feiertagAm('2026-10-03', 'DE', null)?.name).toBe('Tag der Deutschen Einheit');
  });

  it('lässt für die Schweiz die Kantonsfeiertage weg', () => {
    expect(feiertagAm('2026-08-01', 'CH', null)).toBeNull();
    expect(feiertagAm('2026-05-01', 'CH', null)).toBeNull();
    expect(feiertagAm('2026-05-14', 'CH', null)?.name).toBe('Auffahrt');
  });

  it('fällt auf Österreich zurück, wenn das Land unbekannt ist', () => {
    expect(feiertagAm('2026-10-26', 'FR', null)?.name).toBe('Nationalfeiertag');
  });

  it('erkennt einen Feiertag', () => {
    expect(istFeiertag('2026-12-25', 'AT', '9')).toBe(true);
    expect(istFeiertag('2026-12-24', 'AT', '9')).toBe(false);
  });
});

describe('Schulferien aus dem Datenbestand', () => {
  it('findet die Ferie an jedem Tag des Zeitraums', () => {
    // Amtliche Sommerferien Wien 2027: 03.07.–05.09.
    expect(ferienAm('2027-07-03', W, 'Wien')?.bezeichnung).toBe('Sommerferien');
    expect(ferienAm('2027-09-05', W, 'Wien')?.bezeichnung).toBe('Sommerferien');
    expect(ferienAm('2027-07-02', W, 'Wien')).toBeNull();
    expect(ferienAm('2027-09-06', W, 'Wien')).toBeNull();
  });

  it('respektiert das Bundesland', () => {
    expect(ferienAm('2027-08-02', W, 'Wien')?.bezeichnung).toBe('Sommerferien');
    expect(ferienAm('2027-08-02', W, 'Tirol')).toBeNull();
  });

  it('findet eine Ferie auch, wenn die Datenbank die alte Nummer trägt', () => {
    // `schulferien.region` ist ein freier Text. Eine Zeile aus einer älteren
    // Fassung trägt „5", das Profil sagt „Salzburg" – das muss zusammenpassen,
    // sonst fiel die eingetragene Ferienwoche beim Planen durch.
    const alt: FerienZeit[] = [{
      bezeichnung: 'Sommerferien', von: '2027-07-10', bis: '2027-09-12',
      region: '5', schuljahr: 2026,
    }];
    expect(ferienAm('2027-07-15', alt, 'Salzburg')?.bezeichnung).toBe('Sommerferien');
    expect(ferienAm('2027-07-15', alt, '5')?.bezeichnung).toBe('Sommerferien');
    expect(ferienAm('2027-07-15', alt, 'Wien')).toBeNull();
  });

  it('akzeptiert ein Bundesland mit führender Null', () => {
    expect(ferienAm('2027-08-02', W, '09')?.bezeichnung).toBe('Sommerferien');
  });

  it('nimmt einen Eintrag ohne Region für jedes Bundesland', () => {
    expect(ferienAm('2027-03-12', W, '9')?.bezeichnung).toBe('Alle Schulen');
    expect(ferienAm('2027-03-12', W, '3')?.bezeichnung).toBe('Alle Schulen');
  });

  it('liefert ohne Bundesland nichts – lieber nichts als geraten', () => {
    expect(ferienAm('2027-08-02', W, '')).toBeNull();
    expect(ferienAm('2027-08-02', W, null)).toBeNull();
  });

  it('überlebt einen leeren Bestand', () => {
    expect(ferienAm('2027-08-02', [], '9')).toBeNull();
    expect(ferienWarnung(2026, 'AT', '9', [])!.text).toContain('2026/27');
    expect(hatFerienDaten([], '9', 2026)).toBe(false);
  });

  it('erkennt vorhandene Termine für Bundesland und Schuljahr', () => {
    expect(hatFerienDaten(W, '9', 2026)).toBe(true);
    expect(hatFerienDaten(W, '9', 2027)).toBe(false);
    expect(hatFerienDaten(W, '7', 2026)).toBe(false);
  });
});

describe('Schulinterne Pausen', () => {
  it('trifft einen Tag ohne Einschränkung', () => {
    expect(pauseAm('2026-11-12', P, '9')?.bezeichnung).toBe('MuT-Tag');
  });

  it('trifft einen Tag nur für die genannte Klasse', () => {
    expect(pauseAm('2026-11-20', P, '6b')?.bezeichnung).toBe('Fortbildung 6b');
    expect(pauseAm('2026-11-20', P, '7a')).toBeNull();
  });

  it('gibt einem Tag ohne Einschränkung den Vorrang vor einem klassenspezifischen', () => {
    const doppelt: SchulfreiTag[] = [
      ...P,
      { bezeichnung: 'Auch 6b', datum: '2026-11-12', klasseName: '6b', notiz: '', schuljahr: 2026 },
    ];
    expect(pauseAm('2026-11-12', doppelt, '6b')?.bezeichnung).toBe('MuT-Tag');
  });
});

describe('schulfreiAm – Vorrang und Abdeckung', () => {
  it('unterscheidet die drei Arten eindeutig', () => {
    expect(schulfreiAm('2027-08-02', 'AT', '9', W, P)?.art).toBe('ferien');
    expect(schulfreiAm('2026-11-12', 'AT', '9', W, P)?.art).toBe('pause');
    expect(schulfreiAm('2026-10-26', 'AT', '9', W, P)?.art).toBe('feiertag');
    expect(schulfreiAm('2026-10-07', 'AT', '9', W, P)).toBeNull();
  });

  it('lässt die schulinterne Pause gewinnen – sie hat die Schule zuletzt entschieden', () => {
    // 01.11. ist Allerheiligen UND in den Winterferien der anderen Region
    const mitUeberschneidung: FerienZeit[] = [
      { bezeichnung: 'Herbstpause', von: '2026-10-26', bis: '2026-10-30', region: '', schuljahr: 2026 },
    ];
    expect(schulfreiAm('2026-10-26', 'AT', '9', mitUeberschneidung, P)?.art).toBe('ferien');
    const pausenDort: SchulfreiTag[] = [{ bezeichnung: 'MuT', datum: '2026-10-26', klasseName: '', notiz: '', schuljahr: 2026 }];
    expect(schulfreiAm('2026-10-26', 'AT', '9', mitUeberschneidung, pausenDort)?.art).toBe('pause');
  });

  it('fragt eine schulinterne Pause für eine einzelne Klasse ab', () => {
    expect(schulfreiAm('2026-11-20', 'AT', '9', W, P, '6b')?.art).toBe('pause');
    expect(schulfreiAm('2026-11-20', 'AT', '9', W, P, '7a')).toBeNull();
  });

  it('hat eine Kurzform', () => {
    expect(istSchulfrei('2026-12-25', 'AT', '9', W, P)).toBe(true);
    expect(istSchulfrei('2026-10-07', 'AT', '9', W, P)).toBe(false);
  });

  it('kommt ohne Bestand mit den Feiertagen aus', () => {
    expect(istSchulfrei('2026-12-25', 'AT', '9')).toBe(true);
  });
});

describe('Schuljahr', () => {
  it('beginnt in Österreich im September', () => {
    expect(schuljahrFuer('2026-09-01')).toBe(2026);
    expect(schuljahrFuer('2026-12-24')).toBe(2026);
    expect(schuljahrFuer('2026-01-02')).toBe(2025);
    expect(schuljahrFuer('2027-07-04')).toBe(2026);
  });

  it('formt das Schuljahr als 2026/27', () => {
    expect(schuljahrLabel(2026)).toBe('2026/27');
    expect(schuljahrLabel(2029)).toBe('2029/30');
  });
});

describe('ferienWarnung – Lücken zeigen statt raten', () => {
  it('schweigt, wenn Termine vorliegen', () => {
    expect(ferienWarnung(2026, 'AT', '9', W)).toBeNull();
  });

  it('warnt bei fehlendem Bundesland – aber nur leise', () => {
    const hinweis = ferienWarnung(2026, 'AT', '', W)!;
    expect(hinweis.text).toContain('Bundesland');
    expect(hinweis.art).toBe('hinweis');
    expect(hinweis.vorschlag).toBe(false);
  });

  it('warnt laut, wenn Termine vorliegen, die nicht eingetragen sind', () => {
    // Genau der Fall, in dem LUA anbieten kann: Österreich hat sie für 2026/27.
    const hinweis = ferienWarnung(2026, 'AT', '9', [])!;
    expect(hinweis.text).toContain('2026/27');
    expect(hinweis.art).toBe('warnung');
    expect(hinweis.vorschlag).toBe(true);
  });

  it('bleibt leise, wenn für das Schuljahr keine Termine vorliegen', () => {
    // 2030/31 ist nicht erhoben. Ein gelber Alarm wäre falsch – LUA kann nichts
    // anbieten, und der Text würde eine Schuld suggerieren, die es nicht gibt.
    const hinweis = ferienWarnung(2030, 'AT', '9', W)!;
    expect(hinweis.text).toContain('2030/31');
    expect(hinweis.art).toBe('hinweis');
    expect(hinweis.vorschlag).toBe(false);
  });

  it('bietet für Deutschland dieselbe Warnung an wie für Österreich', () => {
    const hinweis = ferienWarnung(2026, 'DE', 'Bayern', [])!;
    expect(hinweis.text).toContain('Bayern');
    expect(hinweis.art).toBe('warnung');
    expect(hinweis.vorschlag).toBe(true);
  });

  it('sagt für die Schweiz ehrlich, dass LUA keine Kantone führt', () => {
    const hinweis = ferienWarnung(2026, 'CH', 'ZH', [])!;
    expect(hinweis.text).toContain('Schweiz');
    expect(hinweis.text).toContain('kantonal');
    expect(hinweis.art).toBe('hinweis');
    expect(hinweis.vorschlag).toBe(false);
  });

  it('nennt bei DE das Bundesland aus dem Profil und sonst das Land', () => {
    expect(ferienWarnung(2026, 'DE', 'Bayern', [])!.text).toContain('Bayern');
    // Ohne gewähltes Bundesland muss der Text sagen, dass es um Deutschland geht –
    // sonst weiß die Lehrkraft nicht, wo sie das Bundesland überhaupt einträgt.
    const ohne = ferienWarnung(2026, 'DE', null, [])!;
    expect(ohne.text).toContain('deutsche');
    expect(ohne.vorschlag).toBe(false);
  });
});

describe('bundeslandName', () => {
  it('kennt jeden Namen, den das Profil speichert', () => {
    expect(bundeslandName('Wien')).toBe('Wien');
    expect(bundeslandName('Salzburg')).toBe('Salzburg');
    expect(bundeslandName('Niederösterreich')).toBe('Niederösterreich');
  });

  it('versteht die alten Nummern aus älteren Datenbankzeilen', () => {
    expect(bundeslandName('9')).toBe('Wien');
    expect(bundeslandName('09')).toBe('Wien');
    expect(bundeslandName('1')).toBe('Burgenland');
    expect(bundeslandName('7')).toBe('Tirol');
  });

  it('gibt null zurück, was kein Bundesland ist', () => {
    expect(bundeslandName(null)).toBeNull();
    expect(bundeslandName('')).toBeNull();
    expect(bundeslandName('Bayern')).toBeNull();
  });
});

describe('ferienBestandVorschlag - liest die amtlichen Termine', () => {
  // Die Erwartungen hier sind die Verordnung, nicht der Code. Vorher standen
  // die Formelwerte im Test (2027-07-01, Oster ab Ostermontag + 13 Tage) -
  // dadurch war die falsche Formel mit sich selbst glücklich. Die vollständigen
  // Prüfungen gegen die amtlichen Werte stehen in ferienTermine.test.ts.
  it('liefert für jedes Bundesland die amtlichen Blöcke des Schuljahres', () => {
    for (const bl of AT_BUNDESLAENDER) {
      const vorschlag = ferienBestandVorschlag(bl, 2026);
      const namen = vorschlag.map(v => v.bezeichnung);
      for (const erwartet of ['Herbstferien', 'Weihnachtsferien', 'Semesterferien', 'Osterferien', 'Pfingstferien', 'Sommerferien']) {
        expect(namen, bl).toContain(erwartet);
      }
    }
  });

  it('liefert für ein unbekanntes Bundesland nichts statt zu raten', () => {
    expect(ferienBestandVorschlag('', 2026)).toEqual([]);
    expect(ferienBestandVorschlag('99', 2026)).toEqual([]);
  });

  it('ist für ein Schuljahr ohne Termine leer, statt zu raten', () => {
    // Die nächste Verordnung ist noch nicht veröffentlicht. Lieber eine Lücke
    // melden als einen Ferientag erfinden.
    expect(ferienBestandVorschlag('Wien', 2031)).toEqual([]);
  });

  it('hält jeden Block gültig und in sich geschlossen', () => {
    for (const bl of ['Burgenland', 'Wien']) {
      for (const f of ferienBestandVorschlag(bl, 2026)) {
        expect(f.von <= f.bis).toBe(true);
        expect(f.von).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.bis).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('hält die Schuljahresblöcke im Schuljahr 2026/27', () => {
    // Die Sommerferien ragen über den 31. August hinaus - das ist die
    // Wirklichkeit, der September gehört schon zum nächsten Schuljahr.
    for (const bl of AT_BUNDESLAENDER) {
      for (const f of ferienBestandVorschlag(bl, 2026)) {
        expect(f.von.localeCompare('2026-09-01'), `${bl} ${f.bezeichnung}`).toBeGreaterThanOrEqual(0);
        if (f.bezeichnung !== 'Sommerferien') {
          expect(f.bis.localeCompare('2027-08-31'), `${bl} ${f.bezeichnung}`).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('unterscheidet sich zwischen den Bundesländern, wo es die Verordnung auch tut', () => {
    const sommer = (bl: string) => ferienBestandVorschlag(bl, 2026).find(f => f.bezeichnung === 'Sommerferien')!;
    // BMB 2026/27: Wien und Burgenland 03.07., Tirol 10.07.
    expect(sommer('Wien').von).toBe('2027-07-03');
    expect(sommer('Burgenland').von).toBe('2027-07-03');
    expect(sommer('Tirol').von).toBe('2027-07-10');
  });

  it('nimmt die Osterferien aus der Tabelle, nicht vom Ostermontag abgeleitet', () => {
    // Ostersonntag 2027 = 28.03. Die amtlichen Osterferien enden am
    // Ostermontag; die alte Formel rechnete zwei Wochen weiter.
    const oster = ferienBestandVorschlag('Wien', 2026).find(f => f.bezeichnung === 'Osterferien')!;
    expect(oster.von).toBe('2027-03-20');
    expect(oster.bis).toBe(plusTage(ostersonntag(2027), 1));
  });

  it('verschiebt den Vorschlag mit dem Schuljahr', () => {
    const sommer2025 = ferienBestandVorschlag('Wien', 2025).find(f => f.bezeichnung === 'Sommerferien')!;
    const sommer2026 = ferienBestandVorschlag('Wien', 2026).find(f => f.bezeichnung === 'Sommerferien')!;
    expect(sommer2026.von).not.toBe(sommer2025.von);
  });
});

