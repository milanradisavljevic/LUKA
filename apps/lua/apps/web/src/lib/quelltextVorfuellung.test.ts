import { describe, expect, it } from 'vitest';
import { aufgabenSchluessel, entscheideVorfuellung, type VorfuellAnfrage } from './quelltextVorfuellung';

const anfrage = (over: Partial<VorfuellAnfrage> = {}): VorfuellAnfrage => ({
  klasse: '6i',
  aufgabe: 'SA2',
  gespeichert: 'Kapitel 1 aus Die Verwandlung ...',
  eigenerText: '',
  eigeneDatei: '',
  bereitsGefuellt: '',
  ...over,
});

describe('Ausgangstext im Korrekturauftrag', () => {
  it('übernimmt den für diese Aufgabe gespeicherten Text', () => {
    // Der eigentliche Zweck: der Text stand im Erwartungshorizont-Reiter, war
    // gespeichert — und das Feld im Korrekturauftrag war trotzdem leer.
    const ergebnis = entscheideVorfuellung(anfrage());
    expect(ergebnis.fuellen).toBe(true);
    expect(ergebnis.text).toBe('Kapitel 1 aus Die Verwandlung ...');
    expect(ergebnis.hinweis).toContain('hinterlegt');
  });

  it('überschreibt niemals einen selbst eingetragenen Text', () => {
    const ergebnis = entscheideVorfuellung(anfrage({ eigenerText: 'Mein eigener Auszug' }));
    expect(ergebnis.fuellen).toBe(false);
    expect(ergebnis.text).toBe('');
    expect(ergebnis.grund).toBe('eigene_eingabe');
  });

  it('überschreibt auch dann nicht, wenn eine Datei gewählt ist', () => {
    // Das Textfeld bleibt bei Datei-Auswahl leer — das ist kein „leer".
    const ergebnis = entscheideVorfuellung(anfrage({ eigeneDatei: 'C:/Temp/quelle.docx' }));
    expect(ergebnis.fuellen).toBe(false);
    expect(ergebnis.grund).toBe('eigene_eingabe');
  });

  it('holt für dieselbe Aufgabe nur einmal', () => {
    // Sonst würde ein nachträgliches Leeren des Feldes sofort rückgängig gemacht.
    const schluessel = aufgabenSchluessel('6i', 'SA2');
    const ergebnis = entscheideVorfuellung(anfrage({ bereitsGefuellt: schluessel }));
    expect(ergebnis.fuellen).toBe(false);
    expect(ergebnis.grund).toBe('bereits_gefuehlt');
  });

  it('holt für eine andere Aufgabe neu', () => {
    const ergebnis = entscheideVorfuellung(anfrage({ bereitsGefuellt: '6i|SA1' }));
    expect(ergebnis.fuellen).toBe(true);
  });

  it('lässt das Feld leer, wenn nichts gespeichert ist', () => {
    const ergebnis = entscheideVorfuellung(anfrage({ gespeichert: '   ' }));
    expect(ergebnis.fuellen).toBe(false);
    expect(ergebnis.grund).toBe('nichts_gespeichert');
    expect(ergebnis.hinweis).toBe('');
  });

  it('fragt nicht ab, solange keine Aufgabe gewählt ist', () => {
    // Ohne Aufgabe gibt es keinen Speicher, aus dem man etwas holen könnte.
    for (const unvollstaendig of [{ aufgabe: '' }, { klasse: '  ' }, { klasse: '', aufgabe: '' }]) {
      const ergebnis = entscheideVorfuellung(anfrage(unvollstaendig));
      expect(ergebnis.fuellen).toBe(false);
      expect(ergebnis.grund).toBe('keine_aufgabe');
    }
  });

  it('unterscheidet Aufgaben mit gleichem Namen in verschiedenen Klassen', () => {
    // Sonst würde 6i|SA2 als "schon gefuellt" gelten, sobald 7a|SA2 gefuellt wurde.
    expect(aufgabenSchluessel('6i', 'SA2')).not.toBe(aufgabenSchluessel('7a', 'SA2'));
  });

  it('ignoriert Leerraum in Klasse und Aufgabe', () => {
    const ergebnis = entscheideVorfuellung(anfrage({
      klasse: ' 6i ', aufgabe: ' SA2 ', bereitsGefuellt: aufgabenSchluessel('6i', 'SA2'),
    }));
    expect(ergebnis.grund).toBe('bereits_gefuehlt');
  });
});
