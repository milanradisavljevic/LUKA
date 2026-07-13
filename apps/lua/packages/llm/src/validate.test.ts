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
