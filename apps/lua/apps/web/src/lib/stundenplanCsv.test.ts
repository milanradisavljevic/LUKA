import { describe, expect, it } from 'vitest';
import { pruefeStundenplanCsv, zeileProbleme } from './stundenplanCsv';

describe('pruefeStundenplanCsv', () => {
  it('liest deutsche Semikolon-CSV mit BOM und normalisiert die Zeiten', () => {
    const result = pruefeStundenplanCsv('\uFEFFWochentag;Beginn;Ende;Klasse;Fach\r\nMo;8:00;08:45;1A;Deutsch');
    expect(result.fehler).toEqual([]);
    expect(result.zeilen).toEqual([{
      id: 'csv-2', zeile: 2, wochentag: 1, startZeit: '08:00', endeZeit: '08:45', klasse: '1A', bezeichnung: 'Deutsch', probleme: [],
    }]);
  });

  it('unterstützt englische Kopfzeilen und zitierte Trennzeichen', () => {
    const result = pruefeStundenplanCsv('Day,Start,End,Class,Subject\nTuesday,09:00,09:45,"1A, Gruppe 2",English');
    expect(result.fehler).toEqual([]);
    expect(result.zeilen[0]).toMatchObject({ wochentag: 2, klasse: '1A, Gruppe 2', bezeichnung: 'English' });
  });

  it('meldet fehlende Spalten', () => {
    expect(pruefeStundenplanCsv('Tag;Beginn\nMo;08:00').fehler[0]?.meldung).toContain('Kopfzeile unvollständig');
  });

  it('akzeptiert Zahlen als Wochentage und erklärt eine leere Datei', () => {
    const result = pruefeStundenplanCsv('Wochentag;Beginn;Ende;Klasse;Fach\n5;12:00;12:45;2B;Mathematik');
    expect(result.zeilen[0]?.wochentag).toBe(5);
    expect(pruefeStundenplanCsv('').fehler[0]?.meldung).toContain('Kopfzeile');
    expect(pruefeStundenplanCsv('Wochentag;Beginn;Ende;Klasse;Fach').fehler[0]?.meldung).toContain('mindestens eine Stundenzeile');
  });

  it('verliert keine Zeile: ungültige Zeilen bleiben in der Vorschau und tragen ihre Befunde', () => {
    const result = pruefeStundenplanCsv([
      'Wochentag;Beginn;Ende;Klasse;Fach',
      'Mo;08:00;08:45;1A;Deutsch',
      'Funday;10:00;09:00;1A;Deutsch',
      'Di;10:00;10:45;1A;',
    ].join('\n'));
    // Drei Datenzeilen in der Datei, drei Zeilen in der Vorschau.
    expect(result.zeilen).toHaveLength(3);
    expect(result.fehler).toEqual([]);
    expect(result.zeilen[0]?.probleme).toEqual([]);
    expect(result.zeilen[1]?.probleme).toEqual(expect.arrayContaining(['Wochentag ist ungültig', 'Ende muss nach Beginn liegen']));
    expect(result.zeilen[2]?.probleme).toContain('Fach fehlt');
  });

  it('liest Uhrzeiten aus Schulverwaltungs-Exporten', () => {
    const punkt = pruefeStundenplanCsv('Wochentag;Beginn;Ende;Klasse;Fach\nMo;8.00;8.45;1A;Deutsch');
    expect(punkt.zeilen[0]).toMatchObject({ startZeit: '08:00', endeZeit: '08:45', probleme: [] });

    const spanne = pruefeStundenplanCsv('Wochentag;Beginn;Ende;Klasse;Fach\nMo;8:00-8:45;8:00-8:45;1A;Deutsch');
    expect(spanne.zeilen[0]).toMatchObject({ startZeit: '08:00', endeZeit: '08:45', probleme: [] });

    const unsinnig = pruefeStundenplanCsv('Wochentag;Beginn;Ende;Klasse;Fach\nMo;25:00;26:00;1A;Deutsch');
    expect(unsinnig.zeilen[0]?.probleme).toEqual(expect.arrayContaining([
      'Beginn muss eine gültige Uhrzeit sein (z. B. 08:00)',
      'Ende muss eine gültige Uhrzeit sein (z. B. 08:45)',
    ]));
  });

  it('behandelt ein nicht geschlossenes Anführungszeichen als Dateifehler', () => {
    const result = pruefeStundenplanCsv('Wochentag;Beginn;Ende;Klasse;Fach\nMo;08:00;08:45;"1A;Deutsch');
    expect(result.zeilen).toEqual([]);
    expect(result.fehler[0]?.meldung).toContain('nicht geschlossenes Anführungszeichen');
  });
});

describe('zeileProbleme', () => {
  const gueltig = { zeile: 2, wochentag: 1, startZeit: '08:00', endeZeit: '08:45', klasse: '1A', bezeichnung: 'Deutsch' };

  it('meldet nichts fuer eine vollstaendige Zeile', () => {
    expect(zeileProbleme(gueltig)).toEqual([]);
  });

  it('bewertet nach einer Korrektur neu, statt den Befund zu behalten', () => {
    expect(zeileProbleme({ ...gueltig, endeZeit: '' })).toContain('Ende muss eine gültige Uhrzeit sein (z. B. 08:45)');
    expect(zeileProbleme({ ...gueltig, endeZeit: '' }).length).toBeGreaterThan(0);
    expect(zeileProbleme({ ...gueltig, endeZeit: '08:45' })).toEqual([]);
  });

  it('meldet fehlenden Wochentag und fehlende Klasse getrennt', () => {
    expect(zeileProbleme({ ...gueltig, wochentag: 0, klasse: '' }))
      .toEqual(expect.arrayContaining(['Wochentag ist ungültig', 'Klasse fehlt']));
  });
});
