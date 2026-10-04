import { describe, it, expect } from 'vitest';
import { extractJson, parseAndValidate } from './validate.js';

const validDoc = {
  schemaVersion: '0.1.0',
  meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Test', datum: '2026-05-30', klasse: '7A', notizen: '' },
  quelltexte: [{ id: 'q1', titel: 'T', inhalt: 'Ein Beispieltext.', herkunft: { typ: 'upload', ref: 'a.pdf' } }],
  bloecke: [
    {
      id: 'b1',
      typ: 'lueckentext',
      punkte: 8,
      quelleId: 'q1',
      arbeitsanweisung: 'Lies den Text. Setze ein.',
      config: { anzahlLuecken: 1, wortbank: false, distraktoren: 0 },
      loesung: { luecken: [{ nr: 1, wort: 'Beispieltext' }] },
    },
  ],
};

describe('extractJson', () => {
  it('entfernt Markdown-Zaeune', () => {
    const raw = '```json\n{"a":1}\n```';
    expect(extractJson(raw)).toBe('{"a":1}');
  });

  it('grenzt auf das aeusserste JSON-Objekt ein', () => {
    const raw = 'Hier ist das Ergebnis: {"a":1} Ende.';
    expect(extractJson(raw)).toBe('{"a":1}');
  });
});

describe('parseAndValidate', () => {
  it('akzeptiert ein schema-konformes Dokument', async () => {
    const res = await parseAndValidate(JSON.stringify(validDoc));
    expect(res.ok).toBe(true);
    expect(res.document?.bloecke[0]?.typ).toBe('lueckentext');
  });

  it('akzeptiert Dokument auch mit Markdown-Zaeunen drumherum', async () => {
    const res = await parseAndValidate('```json\n' + JSON.stringify(validDoc) + '\n```');
    expect(res.ok).toBe(true);
  });

  it('lehnt unparsebaren Text ab', async () => {
    const res = await parseAndValidate('kein json');
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('nicht parsebar');
  });

  it('lehnt wortbank=true mit distraktoren=0 ab', async () => {
    const doc = JSON.parse(JSON.stringify(validDoc));
    doc.bloecke[0].config.wortbank = true;
    doc.bloecke[0].config.distraktoren = 0;
    const res = await parseAndValidate(JSON.stringify(doc));
    expect(res.ok).toBe(false);
  });

  it('validiert das Deutsch-SRDP-Training als Einzelaufgabe mit 15 Subkriterien', async () => {
    const doc = {
      schemaVersion: '0.1.0',
      meta: { stufe: 'oberstufe', fach: 'deutsch', typ: 'matura', thema: 'Test', datum: '2026-05-30', klasse: '8A', notizen: '' },
      quelltexte: [{ id: 'q1', titel: 'Beilage', inhalt: 'Ein Beispieltext.', herkunft: { typ: 'eingabe', ref: '' } }],
      bloecke: [{
        id: 'b1', typ: 'offeneSchreibaufgabe', punkte: 60, quelleId: 'q1', arbeitsanweisung: 'Verfasse den Text.',
        config: { situation: 'Schreibe fuer eine Jugendzeitschrift auf Grundlage der Textbeilage.', textsorte: 'Kommentar', umfangWorte: { min: 405, max: 495 }, aspekte: ['Aufgabe', 'Textbeilage', 'Textsorte'] },
        loesung: {
          musterloesung: 'Musterloesung',
          erwartungshorizont: {
            inhalt: 'Schreibhandlung(en); Arbeitsaufträge; Textbeilage(n); Sachliche Richtigkeit; Qualität der Auseinandersetzung',
            struktur: 'Kohärenz; Bezugnahme auf Textbeilage(n); Kohäsionsmittel',
            ausdruck: 'Situationsadäquatheit; Wortwahl / Ausdruck; Satzstrukturen; Eigenständigkeit',
            sprachrichtigkeit: 'Orthografie; Zeichensetzung; Grammatik',
          },
        },
      }],
    };
    const res = await parseAndValidate(JSON.stringify(doc));
    expect(res.ok).toBe(true);
  });

  it('akzeptiert im Deutsch-SRDP-Training variantige Subkriterien-Schreibweisen', async () => {
    const doc = {
      schemaVersion: '0.1.0',
      meta: { stufe: 'oberstufe', fach: 'deutsch', typ: 'matura', thema: 'Test', datum: '2026-05-30', klasse: '8A', notizen: '' },
      quelltexte: [{ id: 'q1', titel: 'Beilage', inhalt: 'Ein Beispieltext.', herkunft: { typ: 'eingabe', ref: '' } }],
      bloecke: [{
        id: 'b1', typ: 'offeneSchreibaufgabe', punkte: 60, quelleId: 'q1', arbeitsanweisung: 'Verfasse den Text.',
        config: { situation: 'Schreibe fuer eine Jugendzeitschrift auf Grundlage der Textbeilage.', textsorte: 'Kommentar', umfangWorte: { min: 405, max: 495 }, aspekte: ['Aufgabe', 'Textbeilage', 'Textsorte'] },
        loesung: {
          musterloesung: 'Musterloesung',
          erwartungshorizont: {
            // Realistische Modell-Varianten: ohne Klammern, ohne Leerzeichen
            // um den Schrägstrich, „Orthographie" mit ph.
            inhalt: 'Beide Schreibhandlungen erfüllt; alle Arbeitsaufträge beantwortet; die Textbeilage wird konkret genutzt; sachlich korrekt; vertiefte Auseinandersetzung mit dem Thema',
            struktur: 'Kohärenz des Gedankengangs; klare Bezugnahme auf die Textbeilage; passende Kohäsionsmittel',
            ausdruck: 'Situationsadäquate Register (Situationsadäquatheit); treffende Wortwahl; variantenreiche Satzstrukturen; Eigenständigkeit der Formulierung',
            sprachrichtigkeit: 'Orthographie weitgehend fehlerfrei; korrekte Zeichensetzung; sichere Grammatik',
          },
        },
      }],
    };
    const res = await parseAndValidate(JSON.stringify(doc));
    expect(res.ok).toBe(true);
  });

  it('joint Erwartungshorizont-Dimensionen, die als Array geliefert werden', async () => {
    const doc = {
      schemaVersion: '0.1.0',
      meta: { stufe: 'oberstufe', fach: 'deutsch', typ: 'matura', thema: 'Test', datum: '2026-05-30', klasse: '8A', notizen: '' },
      quelltexte: [{ id: 'q1', titel: 'Beilage', inhalt: 'Ein Beispieltext.', herkunft: { typ: 'eingabe', ref: '' } }],
      bloecke: [{
        id: 'b1', typ: 'offeneSchreibaufgabe', punkte: 60, quelleId: 'q1', arbeitsanweisung: 'Verfasse den Text.',
        config: { situation: 'Schreibe fuer eine Jugendzeitschrift auf Grundlage der Textbeilage.', textsorte: 'Kommentar', umfangWorte: { min: 405, max: 495 }, aspekte: ['Aufgabe', 'Textbeilage', 'Textsorte'] },
        loesung: {
          musterloesung: 'Musterloesung',
          erwartungshorizont: {
            inhalt: ['Schreibhandlungen erfüllt', 'Arbeitsaufträge beantwortet', 'Textbeilage genutzt', 'sachlich korrekt', 'vertiefte Auseinandersetzung'],
            struktur: ['Kohärenz', 'Bezugnahme auf die Textbeilage', 'Kohäsionsmittel'],
            ausdruck: ['Situationsadäquatheit', 'Wortwahl', 'Satzstrukturen', 'Eigenständigkeit'],
            sprachrichtigkeit: ['Orthografie', 'Zeichensetzung', 'Grammatik'],
          },
        },
      }],
    };
    const res = await parseAndValidate(JSON.stringify(doc));
    expect(res.ok).toBe(true);
    expect(res.document?.bloecke[0]).toMatchObject({
      loesung: { erwartungshorizont: { sprachrichtigkeit: 'Orthografie; Zeichensetzung; Grammatik' } },
    });
  });

  it('nennt im Deutsch-SRDP-Training die fehlenden Subkriterien beim Ablehnen', async () => {
    const doc = {
      schemaVersion: '0.1.0',
      meta: { stufe: 'oberstufe', fach: 'deutsch', typ: 'matura', thema: 'Test', datum: '2026-05-30', klasse: '8A', notizen: '' },
      quelltexte: [{ id: 'q1', titel: 'Beilage', inhalt: 'Ein Beispieltext.', herkunft: { typ: 'eingabe', ref: '' } }],
      bloecke: [{
        id: 'b1', typ: 'offeneSchreibaufgabe', punkte: 60, quelleId: 'q1', arbeitsanweisung: 'Verfasse den Text.',
        config: { situation: 'Schreibe fuer eine Jugendzeitschrift auf Grundlage der Textbeilage.', textsorte: 'Kommentar', umfangWorte: { min: 405, max: 495 }, aspekte: ['Aufgabe', 'Textbeilage', 'Textsorte'] },
        loesung: {
          musterloesung: 'Musterloesung',
          erwartungshorizont: {
            inhalt: 'Nur allgemeines Gerede ohne Kriterien.',
            struktur: 'Kohärenz; Bezugnahme auf Textbeilage(n); Kohäsionsmittel',
            ausdruck: 'Situationsadäquatheit; Wortwahl / Ausdruck; Satzstrukturen; Eigenständigkeit',
            sprachrichtigkeit: 'Orthografie; Zeichensetzung; Grammatik',
          },
        },
      }],
    };
    const res = await parseAndValidate(JSON.stringify(doc));
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('Schreibhandlung(en)');
    expect(res.fehler).toContain('fehlen die Subkriterien');
  });

  it('lehnt im Deutsch-SRDP-Training eine zweite Aufgabe ab', async () => {
    const doc = JSON.parse(JSON.stringify(validDoc));
    doc.meta.typ = 'matura';
    doc.meta.stufe = 'oberstufe';
    doc.bloecke.push({ ...doc.bloecke[0], id: 'b2' });
    const res = await parseAndValidate(JSON.stringify(doc));
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('genau einen Block');
  });
});

describe('parseAndValidate — Abitur-Deutsch-Training (land = DE)', () => {
  const abiturDoc = (patch: (doc: any) => void = () => {}) => {
    const doc = {
      schemaVersion: '0.1.0',
      meta: { stufe: 'oberstufe', fach: 'deutsch', typ: 'matura', land: 'DE', thema: 'Kurzgeschichte', datum: '2026-05-30', klasse: '12a', notizen: '' },
      quelltexte: [{ id: 'q1', titel: 'Beilage', inhalt: 'Ein literarischer Text.', herkunft: { typ: 'eingabe', ref: '' } }],
      bloecke: [{
        id: 'b1', typ: 'offeneSchreibaufgabe', punkte: 60, quelleId: 'q1',
        arbeitsanweisung: '1. Fasse den Text zusammen. 2. Interpretiere die Erzählperspektive. 3. Beurteile die Deutungsthese.',
        config: { situation: 'Klausur-Übung Sekundarstufe II.', textsorte: 'Interpretation literarischer Texte', umfangWorte: { min: 600, max: 900 }, aspekte: ['Erzählperspektive', 'Symbolik', 'Deutungsthese'] },
        loesung: {
          musterloesung: 'Vollständig ausformulierte Interpretation.',
          erwartungshorizont: {
            inhalt: 'AFB I: Inhalt korrekt zusammengefasst; AFB II: Erzählperspektive am Text gedeutet; AFB III: Deutungsthese eigenständig beurteilt.',
            struktur: 'Aufgabenbezogene Gliederung mit kohärentem Gedankengang.',
            ausdruck: 'Fachbegriffe der Erzähltextanalyse präzise verwendet.',
            sprachrichtigkeit: 'Orthografie, Zeichensetzung und Grammatik weitgehend fehlerfrei.',
          },
        },
      }],
    };
    patch(doc);
    return doc;
  };

  it('akzeptiert eine gültige Abitur-Trainingsaufgabe', async () => {
    const res = await parseAndValidate(JSON.stringify(abiturDoc()));
    expect(res.ok).toBe(true);
  });

  it('lehnt eine Aufgabenart außerhalb der KMK-Liste ab', async () => {
    const res = await parseAndValidate(JSON.stringify(abiturDoc((d) => { d.bloecke[0].config.textsorte = 'Kommentar'; })));
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('KMK-Aufgabenarten');
  });

  it('lehnt einen Erwartungshorizont ohne AFB-Staffelung ab', async () => {
    const res = await parseAndValidate(JSON.stringify(abiturDoc((d) => {
      d.bloecke[0].loesung.erwartungshorizont.inhalt = 'Der Inhalt wird gut erfasst und dargestellt.';
    })));
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('Anforderungsbereichen');
  });

  it('lehnt einen trivialen Wortumfang ab', async () => {
    const res = await parseAndValidate(JSON.stringify(abiturDoc((d) => { d.bloecke[0].config.umfangWorte = { min: 100, max: 200 }; })));
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('mindestens');
  });

  it('land=DE routet auf Abitur statt SRDP: SRDP-konformes Dokument fällt durch', async () => {
    // Kommentar + 405–495 Wörter + NATASCHA-Erwartungshorizont wäre SRDP-gültig —
    // mit land=DE greift stattdessen die Abitur-Prüfung (Aufgabenart-Fehler).
    const res = await parseAndValidate(JSON.stringify(abiturDoc((d) => {
      d.bloecke[0].config.textsorte = 'Kommentar';
      d.bloecke[0].config.umfangWorte = { min: 405, max: 495 };
    })));
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('Abitur-Deutsch-Training');
  });
});

describe('parseAndValidate — German A: Literature', () => {
  const sources = [
    { id: 'q1', titel: 'Text 1', inhalt: 'Literarischer Text eins.', herkunft: { typ: 'eingabe', ref: '' } },
    { id: 'q2', titel: 'Text 2', inhalt: 'Literarischer Text zwei.', herkunft: { typ: 'eingabe', ref: '' } },
  ];
  const meta = (assessmentComponent: string, level: 'sl' | 'hl' = 'sl', extra: Record<string, unknown> = {}) => ({
    ...validDoc.meta,
    rahmenwerk: 'ib-dp',
    land: 'AT',
    ibAssessment: {
      programme: 'ib-dp', course: 'german-a-literature', language: 'de', level,
      programmeYear: 'dp1', assessmentComponent, syllabusVersion: 'first-assessment-2026',
      paper1LiteraryForms: ['drama', 'poetry'],
      assessmentCriteria: assessmentComponent === 'paper1' && level === 'hl'
        ? ['A', 'B', 'C', 'D'].flatMap((id) => [
            { id: `Text 1 · ${id}`, label: id, maxMarks: 5 },
            { id: `Text 2 · ${id}`, label: id, maxMarks: 5 },
          ])
        : assessmentComponent === 'paper2'
          ? ['A', 'B1', 'B2', 'C', 'D'].map((id) => ({ id, label: id, maxMarks: 5 }))
          : assessmentComponent === 'individual-oral'
            ? ['A', 'B', 'C', 'D'].map((id) => ({ id, label: id, maxMarks: 10 }))
            : ['A', 'B', 'C', 'D'].map((id) => ({ id, label: id, maxMarks: 5 })),
      ...extra,
    },
  });
  const task = (overrides: Record<string, unknown> = {}) => ({
    id: 'ib-task', typ: 'offeneSchreibaufgabe', punkte: 20, quelleId: 'q1',
    arbeitsanweisung: 'Analysiere die literarischen Entscheidungen.',
    config: { situation: 'Analysiere den Text.', textsorte: 'Literarische Analyse', umfangWorte: { min: 250, max: 350 }, aspekte: ['Stütze deine Deutung auf Belege.'] },
    loesung: { musterloesung: 'Planungshinweis.', erwartungshorizont: { inhalt: 'i', struktur: 's', ausdruck: 'a', sprachrichtigkeit: 'r' } },
    ...overrides,
  });

  it('accepts SL Paper 1 as two linked, clearly grouped alternatives worth 20 overall', async () => {
    const options = ['A', 'B'].map((option, index) => task({
      id: `paper1-${option}`, quelleId: sources[index]!.id,
      config: {
        ...task().config,
        ibChoiceGroup: { id: 'paper1-sl-choice', option, totalOptions: 2, totalMaxMarks: 20 },
      },
    }));
    const res = await parseAndValidate(JSON.stringify(options), meta('paper1'), sources);
    expect(res.ok).toBe(true);
  });

  it('rejects Paper 1 SL without explicit choice metadata', async () => {
    const options = ['A', 'B'].map((option, index) => task({ id: option, quelleId: sources[index]!.id }));
    const res = await parseAndValidate(JSON.stringify(options), meta('paper1'), sources);
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('Wahloption A/B');
  });

  it('accepts HL Paper 1 as two required analyses at 20 each', async () => {
    const options = [task({ id: 'hl-1', quelleId: 'q1' }), task({ id: 'hl-2', quelleId: 'q2' })];
    const res = await parseAndValidate(JSON.stringify(options), meta('paper1', 'hl'), sources);
    expect(res.ok).toBe(true);
  });

  it('requires four distinct, comparative Paper 2 questions and both selected works', async () => {
    const selectedWorks = [
      { id: 'w1', title: 'Werk Alpha', author: 'Autor A', literaryForm: 'drama', originalLanguage: 'de', selectionCategory: 'original-prl' },
      { id: 'w2', title: 'Werk Beta', author: 'Autor B', literaryForm: 'prose-fiction', originalLanguage: 'en', selectionCategory: 'translated-prl' },
    ];
    const paper2Task = task({
      punkte: 25, quelleId: undefined,
      arbeitsanweisung: 'Wähle genau eine Frage und vergleiche Werk Alpha von Autor A mit Werk Beta von Autor B.',
      config: { ...task().config, ibPaper2Questions: ['Frage 1', 'Frage 2', 'Frage 3', 'Frage 4'] },
    });
    const valid = await parseAndValidate(JSON.stringify([paper2Task]), meta('paper2', 'sl', { selectedWorks }), []);
    expect(valid.ok).toBe(true);
    const invalidTask = { ...paper2Task, config: { ...paper2Task.config, ibPaper2Questions: ['Nur eine Frage'] } };
    const invalid = await parseAndValidate(JSON.stringify([invalidTask]), meta('paper2', 'sl', { selectedWorks }), []);
    expect(invalid.ok).toBe(false);
    expect(invalid.fehler).toContain('ibPaper2Questions');
  });

  it('rejects Individual Oral task language that turns it into a comparison', async () => {
    const oral = task({ punkte: 40, arbeitsanweisung: 'Vergleiche Werk Alpha und Werk Beta zum Global Issue Macht und Freiheit.' });
    const works = [
      { id: 'w1', title: 'Werk Alpha', author: 'Autor A', literaryForm: 'drama', originalLanguage: 'de', selectionCategory: 'original-prl' },
      { id: 'w2', title: 'Werk Beta', author: 'Autor B', literaryForm: 'prose-fiction', originalLanguage: 'en', selectionCategory: 'translated-prl' },
    ];
    const res = await parseAndValidate(JSON.stringify([oral]), meta('individual-oral', 'sl', { globalIssue: 'Macht und Freiheit', selectedWorks: works }), sources);
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('nicht als Vergleichsaufgabe');
  });

  it('rejects an HL Essay that is a long sample essay rather than short coaching', async () => {
    const hlMeta = meta('hl-essay', 'hl', {
      lineOfInquiry: 'Wie prägt die Perspektive die Wirkung?',
      selectedWorks: [{ id: 'w1', title: 'Werk Alpha', author: 'Autor A', literaryForm: 'drama', originalLanguage: 'de', selectionCategory: 'original-prl' }],
    });
    const essay = task({
      quelleId: undefined, punkte: 20,
      arbeitsanweisung: 'Plane dein Essay zu Werk Alpha mithilfe der folgenden Coachingfragen.',
      config: { ...task().config, umfangWorte: { min: 1200, max: 1500 }, aspekte: ['Gliederung planen.', 'Überarbeiten.'] },
      loesung: { ...task().loesung, musterloesung: Array.from({ length: 901 }, () => 'Wort').join(' ') },
    });
    const validCoaching = await parseAndValidate(JSON.stringify([{
      ...essay,
      loesung: { ...essay.loesung, musterloesung: 'Coaching-Gerüst: Plane die Gliederung und überarbeite die Argumentation.' },
    }]), hlMeta, []);
    expect(validCoaching.ok).toBe(true);
    const res = await parseAndValidate(JSON.stringify([essay]), hlMeta, []);
    expect(res.ok).toBe(false);
    expect(res.fehler).toContain('kurzes Coaching-Gerüst');
  });
});
