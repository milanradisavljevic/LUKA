import { describe, it, expect } from 'vitest';
import { parseAndValidate } from './validate.js';
import { buildMessages } from './prompt.js';
import type { Meta } from '@lehrunterlagen/schema';

// Reale, fehlschlagende LLM-Antworten aus dem Smoke-Test 2026-06-04.
// Diese Tests sichern, dass die Normalisierung/der Prompt-Vertrag diese Faelle abfaengt.

const meta: Meta = {
  stufe: 'oberstufe',
  fach: 'deutsch',
  thema: 'Genderneutrale Mode',
  datum: '2026-06-04',
  klasse: '7A',
  notizen: '',
};

const quelltexte = [
  {
    id: 'q1',
    titel: 'Genderneutrale Mode',
    inhalt:
      'Die Generation Z treibt den Trend voran. Unternehmen nutzen Marketing, um neue Zielgruppen zu erreichen. ' +
      'Levis brachte die Kollektion Unisex heraus. Auch im Kosmetikbereich gibt es genderneutrale Produkte. ' +
      'Viele Verbraucher kaufen unabhaengig ihres zugewiesenen Geschlechts ein. Ein Vorteil ist der Wegfall der Geschlechtertrennung.',
    herkunft: { typ: 'upload' as const, ref: 'test.pdf' },
  },
];

describe('Regression 2026-06-04: DeepSeek lueckentext', () => {
  it('akzeptiert distraktoren als leeres Array und luecken als String-Array', async () => {
    const raw = JSON.stringify([
      {
        id: 'b1',
        typ: 'lueckentext',
        punkte: 6,
        quelleId: 'q1',
        arbeitsanweisung: 'Lies den Text. Setze die fehlenden Begriffe ein.',
        config: {
          text: 'Die (1) treibt den Trend voran. Unternehmen nutzen (2). Levis brachte (3) heraus. Auch im (4) gibt es Produkte. Viele kaufen (5) ein. Vorteil ist der Wegfall der (6).',
          anzahlLuecken: 6,
          wortbank: false,
          distraktoren: [], // <- DeepSeek liefert ein Array statt einer Zahl
        },
        loesung: {
          // <- DeepSeek liefert ein String-Array statt [{ nr, wort }]
          luecken: ['Generation Z', 'Marketing', 'Unisex', 'Kosmetikbereich', 'unabhaengig', 'Geschlechtertrennung'],
        },
      },
    ]);

    const res = await parseAndValidate(raw, meta, quelltexte);
    expect(res.ok).toBe(true);
    expect(res.document?.bloecke[0]?.typ).toBe('lueckentext');
  });

  it('coerced distraktoren-Array auf eine Zahl (Laenge)', async () => {
    const raw = JSON.stringify([
      {
        id: 'b1',
        typ: 'lueckentext',
        punkte: 4,
        quelleId: 'q1',
        arbeitsanweisung: 'Setze ein.',
        config: { text: 'Die (1) ist (2).', anzahlLuecken: 2, wortbank: false, distraktoren: ['x', 'y', 'z'] },
        loesung: { luecken: ['Generation Z', 'Marketing'] },
      },
    ]);

    const res = await parseAndValidate(raw, meta, quelltexte);
    expect(res.ok).toBe(true);
    const block = res.document?.bloecke[0];
    expect(block?.typ === 'lueckentext' && block.config.distraktoren).toBe(3);
  });
});

describe('Regression 2026-06-04: Prompt-Vertrag fuer loesung-Objekt-Typen', () => {
  // Mistral liess loesung.luecken / musterloesung / stellen weg, weil der Prompt
  // pauschal "kein separates loesung-Objekt" forderte. Der Prompt muss diese drei
  // Typen explizit mit loesung-Objekt UND Beispiel dokumentieren.
  const system = () =>
    buildMessages({
      meta,
      quelltexte,
      bloecke: [{ typ: 'lueckentext', punkte: 6, quelleId: 'q1', anzahlLuecken: 6, wortbank: false, distraktoren: 0 }],
    }).find((m) => m.role === 'system')!.content;

  it('dokumentiert loesung.luecken fuer lueckentext', () => {
    expect(system()).toContain('loesung');
    expect(system()).toMatch(/BEISPIEL fuer lueckentext/i);
  });

  it('dokumentiert loesung.musterloesung fuer offeneSchreibaufgabe', () => {
    expect(system()).toMatch(/BEISPIEL fuer offeneSchreibaufgabe/i);
    expect(system()).toContain('musterloesung');
  });

  it('dokumentiert loesung.stellen fuer markieraufgabe', () => {
    expect(system()).toMatch(/BEISPIEL fuer markieraufgabe/i);
    expect(system()).toContain('stellen');
  });

  it('config.distraktoren ist als ZAHL dokumentiert (nicht als Array)', () => {
    expect(system()).toMatch(/distraktoren ist eine ZAHL|distraktoren.*Zahl/i);
  });
});

// ---------------------------------------------------------------------------
// Regression 2026-06-05 — Smoke-Test neue Typen (Songanalyse)
// ---------------------------------------------------------------------------

describe('Regression 2026-06-05: DeepSeek liefert volles Dokument-Objekt', () => {
  it('zieht nur bloecke heraus, ignoriert halluziniertes meta + fehlendes schemaVersion', async () => {
    // DeepSeek gab ein KOMPLETTES Dokument zurueck (meta/quelltexte halluziniert,
    // klasse "6i", kein schemaVersion) statt nur des bloecke-Arrays.
    const raw = JSON.stringify({
      meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Falsch', datum: '2099-01-01', klasse: '6i', notizen: '', lernziele: [] },
      quelltexte: [{ id: 'qX', titel: 'Halluziniert', inhalt: 'x', herkunft: { typ: 'upload', ref: 'erfunden.txt' } }],
      bloecke: [{
        id: 'b1', typ: 'songanalyse', punkte: 12, quelleId: 'q1',
        arbeitsanweisung: 'Analysiere den Songtext.',
        config: { interpret: 'The Eagles', titel: 'Hotel California', medium: 'song', aufgabe: 'inhaltsangabe', lyrics: 'On a dark desert highway' },
        loesung: { ergebnis: 'Reise-Metapher.', zitate: 'dark desert highway', analysepunkte: [{ aspekt: 'Bild', befund: 'Metapher' }] },
      }],
    });
    const res = await parseAndValidate(raw, meta, quelltexte);
    expect(res.ok).toBe(true);
    // Echtes meta des Lehrers bleibt erhalten, nicht das halluzinierte.
    expect(res.document!.meta.klasse).toBe('7A');
    expect(res.document!.meta.thema).toBe('Genderneutrale Mode');
    expect(res.document!.quelltexte[0]?.id).toBe('q1');
    expect(res.document!.schemaVersion).toBe('0.1.0');
  });
});

describe('Regression 2026-06-06: leere meta.klasse (Direkteingabe ohne Klasse)', () => {
  it('akzeptiert ein Dokument mit leerer klasse', async () => {
    const metaOhneKlasse = { ...meta, klasse: '' };
    const raw = JSON.stringify([{
      id: 'b1', typ: 'kreuzwortraetsel', punkte: 6, quelleId: 'q1',
      arbeitsanweisung: 'Löse das Kreuzworträtsel.',
      config: { eintraege: [
        { wort: 'RISIKEN', hinweis: 'Gefahren, die mit KI verbunden sind' },
        { wort: 'PAUSE', hinweis: 'Temporäre Aussetzung der Entwicklung' },
      ] },
    }]);
    const res = await parseAndValidate(raw, metaOhneKlasse, quelltexte);
    expect(res.ok).toBe(true);
    expect(res.document!.meta.klasse).toBe('');
  });
});

describe('Regression 2026-06-05: Anthropic wordScramble mit Direkteingabe (leerer titel)', () => {
  it('akzeptiert quelltext mit leerem titel (Direkteingabe)', async () => {
    const eingabeQuelltext = [{
      id: 'q1', titel: '', inhalt: 'Anthropic will Gespräche mit politischen Entscheidungsträgern führen.',
      herkunft: { typ: 'eingabe' as const, ref: '' },
    }];
    const raw = JSON.stringify([{
      id: 'b1', typ: 'wordScramble', punkte: 6, quelleId: 'q1',
      arbeitsanweisung: 'Bringe die Wörter in die richtige Reihenfolge.',
      config: { wort: 'Anthropic will Gespräche mit politischen Entscheidungsträgern führen', anzahlWoerter: 6, loesungsreihenfolge: [1, 2, 3, 4, 5, 6] },
      loesung: { korrektAnordnung: ['Anthropic', 'will', 'Gespräche', 'mit', 'politischen', 'Entscheidungsträgern führen'] },
    }]);
    const res = await parseAndValidate(raw, meta, eingabeQuelltext);
    expect(res.ok).toBe(true);
    expect(res.document!.quelltexte[0]?.titel).toBe('');
  });
});

describe('Regression 2026-06-05: Mistral songanalyse mit manuell eingegebenem Quelltext', () => {
  it('akzeptiert quelltext mit leerem herkunft.ref (Direkteingabe)', async () => {
    const eingabeQuelltext = [{
      id: 'q1', titel: 'Hotel California', inhalt: 'On a dark desert highway, cool wind in my hair.',
      herkunft: { typ: 'eingabe' as const, ref: '' },
    }];
    const raw = JSON.stringify([{
      id: 'b1', typ: 'songanalyse', punkte: 12, quelleId: 'q1',
      arbeitsanweisung: 'Fasse den Inhalt zusammen und analysiere die zentrale Aussage.',
      config: { interpret: 'The Eagles', titel: 'Hotel California', medium: 'song', aufgabe: 'inhaltsangabe', lyrics: 'On a dark desert highway' },
      loesung: { ergebnis: 'Reise als Metapher.', zitate: 'dark desert highway', analysepunkte: [{ aspekt: 'Stimmung', befund: 'beklemmend' }] },
    }]);
    const res = await parseAndValidate(raw, meta, eingabeQuelltext);
    expect(res.ok).toBe(true);
    expect(res.document!.quelltexte[0]?.herkunft.ref).toBe('');
  });
});
