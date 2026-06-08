import { describe, it, expect } from 'vitest';
import { checkGrounding, checkDuplicates, checkDuplicateQuestions, runQualityChecks, llmJudgeHook, checkSchreibaufgabe, checkLernzielCoverage } from './quality.js';
import type { DocumentV1, QuellText } from '@lehrunterlagen/schema';

const mockMeta = {
  stufe: 'oberstufe' as const,
  fach: 'deutsch' as const,
  thema: 'Test',
  datum: '2026-06-04',
  klasse: '7A',
  notizen: '',
};

const mockQuelltexte: QuellText[] = [
  {
    id: 'q1',
    titel: 'Photosynthese',
    inhalt: 'Die Photosynthese ist ein Prozess, bei dem Pflanzen Lichtenergie nutzen, um Kohlenstoffdioxid und Wasser in Glucose und Sauerstoff umzuwandeln.',
    herkunft: { typ: 'upload', ref: 'test.pdf' },
  },
];

describe('checkGrounding', () => {
  it('findet keine Issues wenn Loesungen im Quelltext vorkommen', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'lueckentext',
          punkte: 4,
          arbeitsanweisung: 'Setze die Begriffe ein.',
          config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'Photosynthese' }, { nr: 2, wort: 'Glucose' }] },
          text: 'Die (1) wandelt (2) um.',
        },
      ],
    };

    const issues = checkGrounding(doc, mockQuelltexte);
    expect(issues).toHaveLength(0);
  });

  it('meldet Warning wenn Loesung nicht im Quelltext vorkommt', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'lueckentext',
          punkte: 4,
          arbeitsanweisung: 'Setze die Begriffe ein.',
          config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'Mitochondrium' }] },
          text: 'Das (1) ist wichtig.',
        },
      ],
    };

    const issues = checkGrounding(doc, mockQuelltexte);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.message).toContain('Mitochondrium');
  });

  it('ignoriert kurze Woerter (< 3 Zeichen)', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'lueckentext',
          punkte: 4,
          arbeitsanweisung: 'Setze die Begriffe ein.',
          config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'xy' }] },
          text: 'Das (1) ist wichtig.',
        },
      ],
    };

    const issues = checkGrounding(doc, mockQuelltexte);
    expect(issues).toHaveLength(0);
  });
});

describe('checkDuplicates', () => {
  it('findet keine Issues bei unterschiedlichen MC-Optionen', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'multipleChoice',
          punkte: 4,
          arbeitsanweisung: 'Kreuze an.',
          config: {
            fragen: [
              {
                nr: 1,
                frage: 'Was ist Photosynthese?',
                optionen: [
                  { key: 'A', text: 'Ein Prozess zur Energieumwandlung' },
                  { key: 'B', text: 'Eine chemische Reaktion' },
                  { key: 'C', text: 'Ein physikalisches Phaenomen' },
                  { key: 'D', text: 'Eine biologische Zelle' },
                ],
                mehrfach: false,
              },
            ],
          },
          loesung: { antworten: { '1': ['A'] } },
        },
      ],
    };

    const issues = checkDuplicates(doc);
    expect(issues).toHaveLength(0);
  });

  it('meldet Error bei identischen MC-Optionen', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'multipleChoice',
          punkte: 4,
          arbeitsanweisung: 'Kreuze an.',
          config: {
            fragen: [
              {
                nr: 1,
                frage: 'Was ist Photosynthese?',
                optionen: [
                  { key: 'A', text: 'Ein Prozess zur Energieumwandlung' },
                  { key: 'B', text: 'Ein Prozess zur Energieumwandlung' },
                  { key: 'C', text: 'Ein physikalisches Phaenomen' },
                  { key: 'D', text: 'Eine biologische Zelle' },
                ],
                mehrfach: false,
              },
            ],
          },
          loesung: { antworten: { '1': ['A'] } },
        },
      ],
    };

    const issues = checkDuplicates(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.message).toContain('Option B');
  });

  it('meldet Error bei identischen Matching-Optionen', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'matching',
          punkte: 4,
          arbeitsanweisung: 'Ordne zu.',
          config: {
            items: [{ nr: 1, prompt: 'Item 1' }],
            optionen: [
              { key: 'A', text: 'Gleiche Beschreibung' },
              { key: 'B', text: 'Gleiche Beschreibung' },
              { key: 'C', text: 'Andere Beschreibung' },
            ],
          },
          loesung: { zuordnung: { '1': 'A' } },
        },
      ],
    };

    const issues = checkDuplicates(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
  });
});

describe('runQualityChecks', () => {
  it('kombiniert Grounding und Dubletten-Checks', async () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'lueckentext',
          punkte: 4,
          arbeitsanweisung: 'Setze ein.',
          config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'NichtImQuelltext' }] },
          text: 'Das (1) ist wichtig.',
        },
        {
          id: 'b2',
          typ: 'multipleChoice',
          punkte: 4,
          arbeitsanweisung: 'Kreuze an.',
          config: {
            fragen: [
              {
                nr: 1,
                frage: 'Frage?',
                optionen: [
                  { key: 'A', text: 'Duplikat' },
                  { key: 'B', text: 'Duplikat' },
                  { key: 'C', text: 'Anders' },
                  { key: 'D', text: 'Noch anders' },
                ],
                mehrfach: false,
              },
            ],
          },
          loesung: { antworten: { '1': ['A'] } },
        },
      ],
    };

    const { issues, judge } = await runQualityChecks(doc, mockQuelltexte);
    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues.some((i) => i.blockId === 'b1')).toBe(true);
    expect(issues.some((i) => i.blockId === 'b2')).toBe(true);
    expect(judge.score).toBe(1);
  });

  it('liefert leere issues-Liste und judge-Default fuer saubere Dokumente', async () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'lueckentext',
          punkte: 4,
          arbeitsanweisung: 'Setze ein.',
          config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'Photosynthese' }] },
          text: 'Die (1) ist wichtig.',
        },
      ],
    };

    const { issues, judge } = await runQualityChecks(doc, mockQuelltexte);
    expect(issues).toHaveLength(0);
    expect(judge).toEqual({ score: 1, issues: [] });
  });
});

describe('checkGrounding (erweiterte Loesungs-Felder)', () => {
  it('prueft offeneVerstaendnisfrage Musterantwort gegen Quelltext', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'offeneVerstaendnisfrage',
          punkte: 4,
          arbeitsanweisung: 'Beantworte.',
          config: { fragen: [{ nr: 1, frage: 'Was passiert bei Photosynthese?', zeilen: 3 }] },
          loesung: { antworten: { '1': 'Pflanzen nutzen Lichtenergie aus Kohlenstoffdioxid.' } },
        },
      ],
    };

    const issues = checkGrounding(doc, mockQuelltexte);
    expect(issues).toHaveLength(0);
  });

  it('meldet Warning bei ungegruendeter Musterantwort', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'offeneVerstaendnisfrage',
          punkte: 4,
          arbeitsanweisung: 'Beantworte.',
          config: { fragen: [{ nr: 1, frage: 'Was passiert?', zeilen: 3 }] },
          loesung: { antworten: { '1': 'Kometenflugbahn veraendert sich durch Strahlungsdruck.' } },
        },
      ],
    };

    const issues = checkGrounding(doc, mockQuelltexte);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.blockId).toBe('b1');
  });

  it('prueft markieraufgabe-Stellen gegen Quelltext', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'markieraufgabe',
          punkte: 4,
          arbeitsanweisung: 'Markiere.',
          config: { quelleId: 'q1', anweisung: 'Markiere Photosynthese' },
          loesung: { stellen: ['Photosynthese'] },
        },
      ],
    };

    const issues = checkGrounding(doc, mockQuelltexte);
    expect(issues).toHaveLength(0);
  });

  it('meldet Warning bei ungegruendeter markieraufgabe-Stelle', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'markieraufgabe',
          punkte: 4,
          arbeitsanweisung: 'Markiere.',
          config: { quelleId: 'q1', anweisung: 'Markiere' },
          loesung: { stellen: ['Kometenflugbahn'] },
        },
      ],
    };

    const issues = checkGrounding(doc, mockQuelltexte);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.blockId).toBe('b1');
  });

  it('ignoriert Stoppwoerter bei der Grounding-Pruefung', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'lueckentext',
          punkte: 4,
          arbeitsanweisung: 'Setze ein.',
          config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
          loesung: { luecken: [{ nr: 1, wort: 'Photosynthese' }] },
          text: 'Die (1) ist wichtig.',
        },
      ],
    };

    const issues = checkGrounding(doc, mockQuelltexte);
    expect(issues).toHaveLength(0);
  });
});

describe('checkGrounding (Audit-Fix 2026-06: Paraphrase & Schreibaufgabe)', () => {
  it('nimmt offeneSchreibaufgabe.musterloesung vom Grounding aus (Synthese, keine Extraktion)', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'offeneSchreibaufgabe',
          punkte: 20,
          arbeitsanweisung: 'Verfasse einen Kommentar.',
          config: {
            situation: 'Eine Diskussion ueber Umweltschutz.',
            textsorte: 'Kommentar',
            umfangWorte: { min: 200, max: 300 },
            aspekte: ['Argumentation'],
          },
          loesung: {
            // Voellig quellenfremder Aufsatz — darf KEINE Grounding-Warnung erzeugen.
            musterloesung: 'Klimawandel betrifft Gletscher Ozeane Artenvielfalt nachhaltig erheblich.',
            erwartungshorizont: { inhalt: 'x', struktur: 'x', ausdruck: 'x', sprachrichtigkeit: 'x' },
          },
        },
      ],
    };

    expect(checkGrounding(doc, mockQuelltexte)).toHaveLength(0);
  });

  it('warnt NICHT bei einer ueberwiegend quellengestuetzten Paraphrase', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'offeneVerstaendnisfrage',
          punkte: 4,
          arbeitsanweisung: 'Beantworte.',
          config: { fragen: [{ nr: 1, frage: 'Was passiert?', zeilen: 3 }] },
          // 4 von 5 Inhaltstokens stehen im Quelltext -> Anteil ungegruendet < 60% -> keine Warnung.
          loesung: { antworten: { '1': 'Pflanzen nutzen Lichtenergie und Kohlenstoffdioxid hierfuer.' } },
        },
      ],
    };

    expect(checkGrounding(doc, mockQuelltexte)).toHaveLength(0);
  });
});

describe('checkDuplicateQuestions', () => {
  it('meldet Warning wenn dieselbe Frage in zwei Bloecken vorkommt', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'multipleChoice',
          punkte: 4,
          arbeitsanweisung: 'Kreuze an.',
          config: {
            fragen: [{
              nr: 1, frage: 'Was ist Photosynthese?',
              optionen: [
                { key: 'A', text: 'Energieumwandlung' }, { key: 'B', text: 'Reaktion' },
                { key: 'C', text: 'Phaenomen' }, { key: 'D', text: 'Zelle' },
              ],
              mehrfach: false,
            }],
          },
          loesung: { antworten: { '1': ['A'] } },
        },
        {
          id: 'b2',
          typ: 'offeneVerstaendnisfrage',
          punkte: 4,
          arbeitsanweisung: 'Beantworte.',
          config: { fragen: [{ nr: 1, frage: 'Was ist Photosynthese?', zeilen: 3 }] },
          loesung: { antworten: { '1': 'Ein Prozess in Pflanzen.' } },
        },
      ],
    };

    const issues = checkDuplicateQuestions(doc);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.blockId).toBe('b2');
  });

  it('findet keine Dubletten bei unterschiedlichen Fragen', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'offeneVerstaendnisfrage',
          punkte: 4,
          arbeitsanweisung: 'Beantworte.',
          config: {
            fragen: [
              { nr: 1, frage: 'Was ist Photosynthese?', zeilen: 3 },
              { nr: 2, frage: 'Welche Rolle spielt das Sonnenlicht?', zeilen: 3 },
            ],
          },
          loesung: { antworten: { '1': 'Ein Prozess.', '2': 'Eine grosse Rolle.' } },
        },
      ],
    };

    expect(checkDuplicateQuestions(doc)).toHaveLength(0);
  });
});

describe('checkSchreibaufgabe', () => {
  it('meldet Warning bei zu langer Musterloesung', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'offeneSchreibaufgabe',
          punkte: 20,
          arbeitsanweisung: 'Schreibe einen Kommentar.',
          config: { textsorte: 'Kommentar', situation: 'Zeitung', umfangWorte: { min: 50, max: 60 }, aspekte: ['Position', 'Argumente'] },
          loesung: { musterloesung: 'Wort '.repeat(120), erwartungshorizont: { inhalt: 'OK', struktur: 'OK', ausdruck: 'OK', sprachrichtigkeit: 'OK' } },
        },
      ],
    };
    const issues = checkSchreibaufgabe(doc, mockQuelltexte);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('weicht vom vorgegebenen Umfang');
  });

  it('meldet Warning bei themenfremder Musterloesung', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'offeneSchreibaufgabe',
          punkte: 20,
          arbeitsanweisung: 'Schreibe einen Kommentar.',
          config: { textsorte: 'Kommentar', situation: 'Zeitung', umfangWorte: { min: 50, max: 60 }, aspekte: ['Position', 'Argumente'] },
          loesung: { musterloesung: 'Quantenphysik '.repeat(55), erwartungshorizont: { inhalt: 'OK', struktur: 'OK', ausdruck: 'OK', sprachrichtigkeit: 'OK' } },
        },
      ],
    };
    const issues = checkSchreibaufgabe(doc, mockQuelltexte);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('kaum quellengestuetzt');
  });

  it('findet keine Issues bei passender Musterloesung', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'offeneSchreibaufgabe',
          punkte: 20,
          arbeitsanweisung: 'Schreibe einen Kommentar.',
          config: { textsorte: 'Kommentar', situation: 'Zeitung', umfangWorte: { min: 8, max: 15 }, aspekte: ['Position'] },
          loesung: { musterloesung: 'Die Photosynthese wandelt Lichtenergie in Glucose um. Pflanzen nutzen diesen Prozess zur Ernaehrung.', erwartungshorizont: { inhalt: 'OK', struktur: 'OK', ausdruck: 'OK', sprachrichtigkeit: 'OK' } },
        },
      ],
    };
    const issues = checkSchreibaufgabe(doc, mockQuelltexte);
    expect(issues).toHaveLength(0);
  });
});

describe('checkLernzielCoverage', () => {
  it('findet keine Issues wenn alle Lernziele abgedeckt sind', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'multipleChoice',
          punkte: 4,
          arbeitsanweisung: 'Beantworte.',
          config: { fragen: [{ nr: 1, frage: 'F?', optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }, { key: 'D', text: 'd' }], mehrfach: false }] },
          loesung: { antworten: { '1': ['A'] } },
          lernziele: ['Hauptgedanke erfassen'],
        },
      ],
    };
    const issues = checkLernzielCoverage(doc, { lernziele: ['Hauptgedanke erfassen'] });
    expect(issues).toHaveLength(0);
  });

  it('meldet Warning bei fehlenden Lernzielen', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [
        {
          id: 'b1',
          typ: 'multipleChoice',
          punkte: 4,
          arbeitsanweisung: 'Beantworte.',
          config: { fragen: [{ nr: 1, frage: 'F?', optionen: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }, { key: 'D', text: 'd' }], mehrfach: false }] },
          loesung: { antworten: { '1': ['A'] } },
          lernziele: ['Hauptgedanke erfassen'],
        },
      ],
    };
    const issues = checkLernzielCoverage(doc, { lernziele: ['Hauptgedanke erfassen', 'Stilmittel erkennen'] });
    expect(issues.length).toBe(1);
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('Stilmittel erkennen');
  });

  it('liefert leeres Array wenn keine Lernziele definiert sind', () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [],
    };
    const issues = checkLernzielCoverage(doc, {});
    expect(issues).toHaveLength(0);
  });
});

describe('llmJudgeHook', () => {
  it('liefert Default-Score ohne Konfiguration', async () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [],
    };
    const result = await llmJudgeHook(doc, mockQuelltexte);
    expect(result).toEqual({ score: 1, issues: [] });
  });

  it('ignoriert cfg ohne complete-Funktion (Stub)', async () => {
    const doc: DocumentV1 = {
      schemaVersion: '0.1.0',
      meta: mockMeta,
      quelltexte: mockQuelltexte,
      bloecke: [],
    };
    const result = await llmJudgeHook(doc, mockQuelltexte, { provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'sk-test', enabled: true });
    expect(result.score).toBe(1);
  });
});
