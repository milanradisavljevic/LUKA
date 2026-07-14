import { describe, expect, it } from 'vitest';
import { pruefeCsvImport } from './csvImportPruefung';

describe('pruefeCsvImport', () => {
  it('markiert Dubletten innerhalb der Datei', () => {
    const result = pruefeCsvImport('Vorname,Nachname\nMia,Test\nMia,Test');
    expect(result.zeilen).toHaveLength(2);
    expect(result.zeilen.every((row) => row.warnungen.includes('dubletten_in_datei'))).toBe(true);
  });

  it('markiert Dubletten gegen den bestehenden Klassenbestand', () => {
    const result = pruefeCsvImport('Vorname,Nachname\nMia,Test', [{ vorname: ' mia ', nachname: 'TEST' }]);
    expect(result.zeilen[0]?.warnungen).toContain('dubletten_im_bestand');
  });

  it('markiert Zeilen ohne Vornamen und wählt sie nicht vor', () => {
    const result = pruefeCsvImport('Vorname,Nachname\n,OhneVorname\nLena,Test');
    expect(result.zeilen[0]?.warnungen).toContain('vorname_fehlt');
    expect(result.zeilen[0]?.ausgewaehlt).toBe(false);
    expect(result.zeilen[1]?.ausgewaehlt).toBe(true);
  });

  it('liefert für eine leere Datei keine Importzeilen', () => {
    expect(pruefeCsvImport(' \n\r\n\t ').zeilen).toEqual([]);
  });
});
