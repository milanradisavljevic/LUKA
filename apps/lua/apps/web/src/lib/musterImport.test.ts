import { describe, it, expect } from 'vitest';
import { erkenneMuster, leseErkennung, metaFuerMuster, musterAlsParallelversion } from './musterImport';
import { istParallelBlock, originalInhalteAusHinweis } from './parallelversion';
import { getDefaultMeta } from './constants';

const antwort = JSON.stringify({
  erkannt: { thema: 'Relativsätze', kompetenz: 'Relativpronomen der/die/das', lesetext: null },
  bloecke: [
    {
      id: 'b1',
      typ: 'kreuzwortraetsel',
      punkte: 4,
      arbeitsanweisung: 'Löse das Kreuzworträtsel.',
      config: {
        anzahlWoerter: 2,
        eintraege: [
          { wort: 'Apfel', hinweis: 'Rotes oder grünes Obst' },
          { wort: 'Birne', hinweis: 'Gelbes Obst mit Stiel' },
        ],
      },
    },
  ],
});

const zustand = {
  auftrag: null,
  llmProvider: 'deepseek' as const,
  modelName: 'DeepSeek V4 Pro',
  kreativitaet: 0.4,
  ausgabeSprache: 'de',
  renderTemplate: 'standard' as never,
  renderLayout: 'standard' as never,
};

const blattText = 'Kreuzworträtsel\n1. Rotes oder grünes Obst\n2. Gelbes Obst mit Stiel\nName: ____ Klasse: ____';

describe('musterImport', () => {
  it('liest die Erkennung tolerant', () => {
    expect(leseErkennung(antwort)).toEqual({ thema: 'Relativsätze', kompetenz: 'Relativpronomen der/die/das', lesetext: null });
    expect(leseErkennung('kein json')).toEqual({ thema: '', kompetenz: '', lesetext: null });
  });

  it('wählt ohne Lesetext den Kompetenz-Modus, mit Lesetext den Text-Modus', () => {
    const basis = getDefaultMeta();
    expect(metaFuerMuster(basis, { thema: 'A', kompetenz: 'K', lesetext: null })).toMatchObject({ modus: 'kompetenz', freieKompetenz: 'K', thema: 'A' });
    expect(metaFuerMuster(basis, { thema: 'A', kompetenz: 'K', lesetext: 'Text' })).toMatchObject({ modus: 'text', thema: 'A' });
  });

  it('überträgt das Blatt, repariert eine ungültige erste Antwort und bereitet die Parallelversion vor', async () => {
    const antworten = ['{"bloecke": [{"typ": "unbekannt"}]}', antwort];
    const aufrufe: number[] = [];
    const ergebnis = await erkenneMuster(blattText, 'blatt.docx', getDefaultMeta(), async (_system, messages) => {
      aufrufe.push(messages.length);
      return antworten.shift()!;
    });
    expect(aufrufe).toEqual([1, 3]);
    expect(ergebnis.dokument.meta.thema).toBe('Relativsätze');

    const { snapshot, brauchtNeuenQuelltext } = musterAlsParallelversion(zustand, ergebnis);
    expect(brauchtNeuenQuelltext).toBe(false);
    expect(snapshot.meta.modus).toBe('kompetenz');
    expect(snapshot.bloecke).toHaveLength(1);
    expect(istParallelBlock(snapshot.bloecke[0]!)).toBe(true);
    expect(originalInhalteAusHinweis(snapshot.bloecke[0]!.hinweis)).toContain('Apfel');
  });

  it('lehnt Dateien ohne Text ab, statt die KI aufzurufen', async () => {
    let aufgerufen = false;
    await expect(erkenneMuster('   ', 'scan.pdf', getDefaultMeta(), async () => { aufgerufen = true; return antwort; }))
      .rejects.toThrow(/kaum Text/);
    expect(aufgerufen).toBe(false);
  });
});
