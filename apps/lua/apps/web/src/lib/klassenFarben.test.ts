import { describe, expect, it } from 'vitest';
import {
  farbFlaeche, farbHinweisNoetig, farbIndexFuerName, farbVar, farbeFuerKlasse,
  KLASSEN_SLOTS, KLASSEN_TONE, klasseFarbStil, naechsteFreieFarbnummer, farbListeAusKlassen,
} from './klassenFarben';

describe('Palette', () => {
  it('besteht aus acht eindeutig benannten Tönen', () => {
    expect(KLASSEN_SLOTS).toBe(8);
    expect(KLASSEN_TONE).toHaveLength(8);
    expect(new Set(KLASSEN_TONE.map(t => t.slot)).size).toBe(8);
    expect(new Set(KLASSEN_TONE.map(t => t.name)).size).toBe(8);
  });

  it('vergibt lückenlose Slots 1 bis 8', () => {
    expect(KLASSEN_TONE.map(t => t.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('farbVar – liefert eine CSS-Referenz, keine Farbe', () => {
  it('gibt die Variable des Slots zurück', () => {
    expect(farbVar(1)).toBe('var(--klasse-1)');
    expect(farbVar(8)).toBe('var(--klasse-8)');
  });

  it('fängt einen ungültigen Slot ab, statt eine kaputte CSS-Referenz zu bauen', () => {
    expect(farbVar(0)).toBe('var(--klasse-1)');
    expect(farbVar(9)).toBe('var(--klasse-1)');
    expect(farbVar(Number.NaN)).toBe('var(--klasse-1)');
  });

  it('akzeptiert die gespeicherte Form als Zeichenkette', () => {
    expect(farbVar('3' as unknown as number)).toBe('var(--klasse-3)');
  });
});

describe('farbFlaeche', () => {
  it('mischt die Farbe mit der Grundfläche', () => {
    expect(farbFlaeche(3)).toContain('color-mix(in srgb, var(--klasse-3) 14%');
    expect(farbFlaeche(3, 30)).toContain('30%');
  });
});

describe('farbIndexFuerName – stabiler Notfall', () => {
  it('liefert für denselben Namen immer denselben Slot', () => {
    const einmal = farbIndexFuerName('6b');
    expect(farbIndexFuerName('6b')).toBe(einmal);
    expect(farbIndexFuerName('6b')).toBe(einmal);
  });

  it('ignoriert Groß- und Kleinschreibung sowie Randleerzeichen', () => {
    expect(farbIndexFuerName(' 6B ')).toBe(farbIndexFuerName('6b'));
  });

  it('liefert immer einen Slot 1 bis 8', () => {
    for (const name of ['6a', '6b', '7a', '8b', '1a', '9c', '', '   ']) {
      const slot = farbIndexFuerName(name);
      expect(Number.isInteger(slot)).toBe(true);
      expect(slot).toBeGreaterThanOrEqual(1);
      expect(slot).toBeLessThanOrEqual(KLASSEN_SLOTS);
    }
  });

  it('liefert für typische Klassen möglichst verschiedene Slots', () => {
    const slots = ['6a', '6b', '7a', '7b', '8a', '8b', '5a', '5b'].map(farbIndexFuerName);
    // Vier gleiche Farben bei acht Klassen wären tolerierbar, aber wir wollen
    // deutlich mehr Trennschärfe.
    expect(new Set(slots).size).toBeGreaterThanOrEqual(5);
  });
});

describe('farbeFuerKlasse – die Reihenfolge der Kaskade', () => {
  const liste = new Map([['6b', 3]]);

  it('nimmt zuerst die gespeicherte Farbe', () => {
    expect(farbeFuerKlasse('5', '6b', liste)).toEqual({ slot: 5, quelle: 'gespeichert' });
  });

  it('dann die Farbe aus der Klassenliste', () => {
    expect(farbeFuerKlasse(null, '6b', liste)).toEqual({ slot: 3, quelle: 'liste' });
    expect(farbeFuerKlasse('', '6b', liste).quelle).toBe('liste');
    expect(farbeFuerKlasse('nix', '6b', liste).quelle).toBe('liste');
  });

  it('zuletzt den Hash – etwa für eine gelöschte Klasse', () => {
    const ergebnis = farbeFuerKlasse(null, '9z', liste);
    expect(ergebnis.quelle).toBe('hash');
    expect(ergebnis.slot).toBe(farbIndexFuerName('9z'));
  });

  it('übergeht einen defekten DB-Wert und nutzt die Liste weiter', () => {
    // Ein unbrauchbarer Wert in der Datenbank darf die Klasse nicht vergiften –
    // die Liste ist der nächste Schritt, nicht der Hash.
    expect(farbeFuerKlasse('99', '6b', liste)).toEqual({ slot: 3, quelle: 'liste' });
    expect(farbeFuerKlasse('0', '6b', liste).quelle).toBe('liste');
    // Steht die Klasse nicht in der Liste, greift der Hash.
    expect(farbeFuerKlasse('99', '9z', liste).quelle).toBe('hash');
  });

  it('ignoriert Groß- und Kleinschreibung beim Nachschlagen in der Liste', () => {
    const gross = new Map([['6B', 2]]);
    expect(farbeFuerKlasse(null, '6b', gross)).toEqual({ slot: 2, quelle: 'liste' });
  });

  it('findet zu jeder Klasse eine Farbe – nie bleibt eine ohne aus', () => {
    for (const name of ['6a', '6b', '7a', 'gelöscht', '']) {
      const { slot } = farbeFuerKlasse(null, name, liste);
      expect(slot).toBeGreaterThanOrEqual(1);
      expect(slot).toBeLessThanOrEqual(KLASSEN_SLOTS);
    }
  });
});

describe('naechsteFreieFarbnummer', () => {
  it('nimmt die niedrigste freie Stelle', () => {
    expect(naechsteFreieFarbnummer(new Set())).toBe(1);
    expect(naechsteFreieFarbnummer(new Set([1, 2]))).toBe(3);
    expect(naechsteFreieFarbnummer(new Set([1, 2, 4]))).toBe(3);
  });

  it('überspringt Lücken am Ende', () => {
    expect(naechsteFreieFarbnummer(new Set([1, 2, 3, 4, 5, 6, 7]))).toBe(8);
  });

  it('beginnt wieder vorn, wenn alle belegt sind', () => {
    expect(naechsteFreieFarbnummer(new Set([1, 2, 3, 4, 5, 6, 7, 8]))).toBe(1);
  });
});

describe('farbHinweisNoetig', () => {
  it('schweigt bis zur neunten Klasse', () => {
    expect(farbHinweisNoetig(1)).toBeNull();
    expect(farbHinweisNoetig(8)).toBeNull();
  });

  it('warnt ab der neunten Klasse – sichtbar, nicht versteckt', () => {
    expect(farbHinweisNoetig(9)).toContain('wiederholen');
    expect(farbHinweisNoetig(14)).toContain('Klassenname');
  });
});

describe('klasseFarbStil', () => {
  it('setzt die CSS-Variable, damit das Theme mitwechselt', () => {
    const stil = klasseFarbStil('3', '6b', new Map());
    expect((stil as Record<string, string>)['--klasse-farbe']).toBe('var(--klasse-3)');
  });
});

describe('farbListeAusKlassen', () => {
  it('übernimmt hinterlegte Farben und lässt den Rest frei', () => {
    const liste = farbListeAusKlassen([
      { name: '5a', farbe: '3' },
      { name: '6b', farbe: '7' },
      { name: '7c', farbe: null },
    ]);
    expect(liste.get('5a')).toBe(3);
    expect(liste.get('6b')).toBe(7);
    expect(liste.get('7c')).not.toBe(3);
    expect(liste.get('7c')).not.toBe(7);
  });

  it('vergibt freien Klassen in Listenreihenfolge den nächsten freien Ton', () => {
    const liste = farbListeAusKlassen([
      { name: '5a', farbe: null },
      { name: '6b', farbe: '2' },
      { name: '7c', farbe: null },
    ]);
    expect(liste.get('5a')).toBe(1);
    expect(liste.get('7c')).toBe(3);
  });

  it('vergibt zwei Klassen ohne Farbe niemals denselben Ton', () => {
    const liste = farbListeAusKlassen([
      { name: '5a', farbe: null },
      { name: '6b', farbe: null },
      { name: '7c', farbe: null },
    ]);
    const slots = [liste.get('5a'), liste.get('6b'), liste.get('7c')];
    expect(new Set(slots).size).toBe(3);
  });

  it('bleibt stabil, wenn die Liste neu aufgebaut wird', () => {
    const klassen = [
      { name: '5a', farbe: '4' },
      { name: '6b', farbe: null },
      { name: '7c', farbe: null },
    ];
    expect(farbListeAusKlassen(klassen)).toEqual(farbListeAusKlassen(klassen));
  });

  it('ignoriert unsinnige Farbangaben, statt einen Slot zu verlieren', () => {
    const liste = farbListeAusKlassen([
      { name: '5a', farbe: '99' },
      { name: '6b', farbe: 'null' },
      { name: '7c', farbe: null },
    ]);
    expect(liste.get('5a')).toBe(1);
    expect(liste.get('6b')).toBe(2);
    expect(liste.get('7c')).toBe(3);
  });

  it('vergibt höchstens acht Töne und lässt den Rest ohne Zuweisung', () => {
    const klassen = Array.from({ length: 11 }, (_, i) => ({ name: `k${i}`, farbe: null }));
    const liste = farbListeAusKlassen(klassen);
    expect(liste.size).toBe(KLASSEN_SLOTS);
  });

  it('schneidet Namen Leerzeichen und Groß-/Kleinschreibung beim Nachschlagen', () => {
    const liste = farbListeAusKlassen([{ name: '  5A  ', farbe: '5' }]);
    expect(farbeFuerKlasse(undefined, '5A', liste).slot).toBe(5);
  });
});