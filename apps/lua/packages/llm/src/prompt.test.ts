import { describe, it, expect } from 'vitest';
import { buildMessages, buildRefinementMessages, nummeriereAbsaetze } from './prompt.js';
import type { Meta } from '@lehrunterlagen/schema';

const baseMeta: Meta = {
  stufe: 'oberstufe',
  fach: 'deutsch',
  thema: 'Medienkonsum',
  datum: '2026-06-04',
  klasse: '7A',
  notizen: '',
};

const input = (meta: Partial<Meta> = {}) => ({
  meta: { ...baseMeta, ...meta },
  quelltexte: [
    {
      id: 'q1',
      titel: 'Test',
      inhalt: 'Ein langer Quelltext ueber Medienkonsum bei Jugendlichen.',
      herkunft: { typ: 'upload' as const, ref: 'test.pdf' },
    },
  ],
  bloecke: [{ typ: 'multipleChoice' as const, punkte: 4, quelleId: 'q1', anzahlFragen: 1, mehrfach: false }],
});

describe('buildMessages — Bloom-Steuerung (C1)', () => {
  it('System-Prompt enthaelt Bloom-Sektion mit allen drei Stufen', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system');
    expect(system).toBeDefined();
    expect(system!.content).toContain('KOGNITIVES NIVEAU (Bloom-Steuerung)');
    expect(system!.content).toContain('leicht');
    expect(system!.content).toContain('mittel');
    expect(system!.content).toContain('schwer');
    expect(system!.content).toContain('Bloom-Stufen 1-2');
    expect(system!.content).toContain('Bloom-Stufen 3-4');
    expect(system!.content).toContain('Bloom-Stufen 5-6');
  });

  it('User-Message propagiert schwierigkeit="leicht" an das LLM', () => {
    const messages = buildMessages(input({ schwierigkeit: 'leicht' }));
    const user = messages.find((m) => m.role === 'user');
    expect(user).toBeDefined();
    expect(user!.content).toContain('Schwierigkeitsniveau: "leicht"');
  });

  it('User-Message propagiert schwierigkeit="mittel" an das LLM', () => {
    const messages = buildMessages(input({ schwierigkeit: 'mittel' }));
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).toContain('Schwierigkeitsniveau: "mittel"');
  });

  it('User-Message propagiert schwierigkeit="schwer" an das LLM', () => {
    const messages = buildMessages(input({ schwierigkeit: 'schwer' }));
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).toContain('Schwierigkeitsniveau: "schwer"');
  });

  it('Ohne schwierigkeit faellt das System auf Default "mittel" zurueck', () => {
    const messages = buildMessages(input());
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).toContain('Schwierigkeitsniveau: "mittel"');
  });

  it('User-Message enthaelt zusaetzlich die meta-/quelltext-JSON', () => {
    const messages = buildMessages(input({ schwierigkeit: 'schwer' }));
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).toContain('"thema": "Medienkonsum"');
    expect(user!.content).toContain('"schwierigkeit": "schwer"');
    expect(user!.content).toContain('Medienkonsum bei Jugendlichen');
  });

  it('sendet Gruppensteuerung, aber keine lokalen Schüler-IDs an das Modell', () => {
    const messages = buildMessages(input({
      niveaugruppe: {
        id: 'foerder',
        label: 'Förderung',
        schwierigkeit: 'leicht',
        schuelerIds: [741852, 963258],
        notenbereich: { min: 4, max: 6 },
      },
    }));
    const user = messages.find((message) => message.role === 'user');
    expect(user!.content).toContain('"label": "Förderung"');
    expect(user!.content).toContain('"schwierigkeit": "leicht"');
    expect(user!.content).not.toContain('schuelerIds');
    expect(user!.content).not.toContain('741852');
    expect(user!.content).not.toContain('963258');
  });

  it('übermittelt echte Fehlermuster-Häufigkeiten nur als Priorisierung', () => {
    const messages = buildMessages(input({ bridgeFehler: [
      { typ: 'Z', zitat: 'Schüler die', korrektur: 'Schüler, die', haeufigkeit: 7 },
    ] }));
    const user = messages.find((message) => message.role === 'user');
    expect(user!.content).toContain('"haeufigkeit": 7');
    expect(user!.content).toContain('nicht als Zahl der betroffenen Schüler');
    expect(user!.content).toContain('den Fehler mehrfach zu erfinden');
  });

  it('begrenzt Operatoren deterministisch auf die niedrigere gemeinsame Niveaustufe', () => {
    const messages = buildMessages(input({ schwierigkeit: 'schwer', kompetenzNiveau: 'basis' }));
    const user = messages.find((message) => message.role === 'user');
    expect(user!.content).toContain('hoechstens AFB I');
    expect(user!.content).toContain('die niedrigere der beiden Niveaustufen begrenzt die Operatoren');
    expect(user!.content).toContain('kleinschrittigen Hilfen');
  });

  it('erlaubt AFB III nur, wenn Schwierigkeit und Kompetenzniveau es beide tragen', () => {
    const messages = buildMessages(input({ schwierigkeit: 'schwer', kompetenzNiveau: 'erweitert' }));
    const user = messages.find((message) => message.role === 'user');
    expect(user!.content).toContain('hoechstens AFB III');
    expect(user!.content).toContain('wenig Hilfen');
  });

  it('entfernt Schüler-IDs auch im Kompetenzmodus aus dem Prompt', () => {
    const messages = buildMessages(input({
      modus: 'kompetenz',
      niveaugruppe: {
        id: 'basis',
        label: 'Basis',
        schwierigkeit: 'mittel',
        schuelerIds: [741852],
        notenbereich: { min: 2, max: 4 },
      },
    }));
    const user = messages.find((message) => message.role === 'user');
    expect(user!.content).toContain('"label": "Basis"');
    expect(user!.content).not.toContain('schuelerIds');
    expect(user!.content).not.toContain('741852');
  });

  it('Messages-Struktur: erst System, dann User', () => {
    const messages = buildMessages(input());
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
    expect(messages).toHaveLength(2);
  });

  it('System-Prompt verbietet weiterhin Markdown-Zaune und Erklaerungen', () => {
    const messages = buildMessages(input());
    const system = messages[0];
    expect(system?.content).toContain('Kein Layout, keine Markdown-Zaeune');
    expect(system?.content).toContain('Antworte AUSSCHLIESSLICH mit dem JSON-Array');
  });
});

describe('buildMessages — Quellenanalyse', () => {
  it('verlangt fachliche Erwartung und Quellenbeleg', () => {
    const messages = buildMessages({
      ...input({ fach: 'geschichte' }),
      bloecke: [{
        typ: 'quellenanalyse' as const,
        punkte: 12,
        quelleId: 'q1',
        quellentyp: 'rede',
        anzahlAuftraege: 1,
        auftraege: [{ nr: 1, operator: 'analysieren', frage: 'Welche Absicht?', zeilen: 5 }],
      }],
    });
    expect(messages[0]?.content).toContain('quellenanalyse');
    expect(messages[0]?.content).toContain('mindestens einen konkreten Quellenbezug');
  });
});

describe('buildMessages — Timeline', () => {
  it('fordert eindeutige Chronologie und belegte Datierungen', () => {
    const messages = buildMessages({
      ...input({ fach: 'geschichte' }),
      bloecke: [{
        typ: 'timeline' as const,
        punkte: 8,
        anzahlEreignisse: 2,
        ereignisse: [
          { nr: 1, titel: 'Ereignis A', beschreibung: 'A' },
          { nr: 2, titel: 'Ereignis B', beschreibung: 'B' },
        ],
      }],
    });
    expect(messages[0]?.content).toContain('timeline');
    expect(messages[0]?.content).toContain('chronologischer Reihenfolge');
  });
});

describe('buildMessages — Diagramm-/Datenanalyse', () => {
  it('verlangt materialgebundene Datenbelege', () => {
    const messages = buildMessages({
      ...input({ fach: 'geographie' }),
      bloecke: [{
        typ: 'diagrammanalyse' as const,
        punkte: 10,
        diagrammtyp: 'balken', titel: 'Nutzung', anzahlDatenpunkte: 2, anzahlAuftraege: 1,
        daten: [{ label: 'A', wert: '40' }, { label: 'B', wert: '60' }],
        auftraege: [{ nr: 1, operator: 'auswerten', frage: 'Vergleiche.', zeilen: 4 }],
      }],
    });
    expect(messages[0]?.content).toContain('diagrammanalyse');
    expect(messages[0]?.content).toContain('konkreten Datenpunkt');
  });
});

describe('buildMessages — Notizen der Lehrkraft (A)', () => {
  it('System-Prompt dokumentiert die Notizen-Regel', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system');
    expect(system!.content).toContain('NOTIZEN DER LEHRKRAFT');
    // Notizen duerfen Format/Sicherheit nicht ueberschreiben.
    expect(system!.content).toMatch(/duerfen niemals das Ausgabeformat/i);
  });

  it('User-Message enthaelt den Notizen-Hinweis, wenn meta.notizen gesetzt ist', () => {
    const messages = buildMessages(input({ notizen: 'Bitte den Klimawandel betonen.' }));
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).toContain('Notizen der Lehrkraft');
    expect(user!.content).toContain('Bitte den Klimawandel betonen.');
  });

  it('Ohne Notizen erscheint kein Notizen-Hinweis in der User-Message', () => {
    const messages = buildMessages(input({ notizen: '   ' }));
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).not.toContain('Beruecksichtige die Notizen der Lehrkraft bei den Inhalten');
  });
});

describe('buildMessages — NATASCHA-Fehlerschwerpunkte (fokusThemen)', () => {
  it('User-Message enthaelt den Fokus-Hinweis mit allen Fehlerschwerpunkten', () => {
    const messages = buildMessages(input({ fokusThemen: ['Zeichensetzung', 'Grammatik'] }));
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).toContain('Fehlerschwerpunkte der Klasse');
    expect(user!.content).toContain('"Zeichensetzung"');
    expect(user!.content).toContain('"Grammatik"');
  });

  it('Ohne fokusThemen erscheint kein Fokus-Hinweis', () => {
    const messages = buildMessages(input());
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).not.toContain('Fehlerschwerpunkte der Klasse');
  });
});

describe('buildMessages — echte Klassenfehler (bridgeFehler, L1)', () => {
  it('User-Message enthaelt die Bridge-Fehler-Anweisung mit zitat/korrektur', () => {
    const messages = buildMessages(input({
      bridgeFehler: [{ typ: 'Z', zitat: 'Regale die sich', korrektur: 'Regale, die sich', clusterId: 'Z:relativsatz', regelMuster: 'Komma vor Relativsatz' }],
    }));
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).toContain('BRIDGE-FEHLER (echte Klassenfehler)');
    expect(user!.content).toContain('Regale, die sich');
    // Struktur: die Fehler reisen strukturiert im meta-Objekt mit.
    expect(user!.content).toContain('"bridgeFehler"');
    expect(user!.content).toContain('Komma vor Relativsatz');
  });

  it('Ohne bridgeFehler erscheint keine Bridge-Fehler-Anweisung', () => {
    const messages = buildMessages(input());
    const user = messages.find((m) => m.role === 'user');
    expect(user!.content).not.toContain('BRIDGE-FEHLER');
  });
});

describe('buildMessages — Didaktik Runde 1 Regeln', () => {
  it('System-Prompt enthaelt Terminologie-Konservierungs-Regel (Didaktik #5a)', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('TERMINOLOGIE-KONSERVIERUNG');
    expect(system.content).toContain('Maische');
    expect(system.content).toContain('Habitat');
    expect(system.content).toContain('wortwoertlich');
  });

  it('System-Prompt enthaelt Distraktor-Qualitaets-Regel mit allen drei Mindeststandards (Didaktik #3)', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('DISTRAKTOR-QUALITAET');
    expect(system.content).toContain('THEMATISCHE NAeHE');
    expect(system.content).toContain('LAENGEN-AEHNLICHKEIT');
    expect(system.content).toContain('TYPISCHE SCHUeLERFEHLER');
    expect(system.content).toContain('Photosynthese');
    expect(system.content).toContain('Zellatmung');
  });

  it('System-Prompt enthaelt Verbot des stillen Typ-Tauschs (Didaktik #2 redesign)', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('VERBOT DES STILLEN TYP-TAUSCHS');
    expect(system.content).toContain('NICHT eigenmaechtig');
    expect(system.content).toMatch(/desynchronisier/);
  });

  it('System-Prompt enthaelt CEFR-Mapping fuer Englisch (Didaktik F5)', () => {
    const messages = buildMessages(input({ fach: 'englisch' }));
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('CEFR');
    expect(system.content).toContain('A2');
    expect(system.content).toContain('B1');
    expect(system.content).toContain('B2');
  });

  it('System-Prompt enthaelt Coverage-Präventions-Regel (Didaktik #4)', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('COVERAGE');
    expect(system.content).toContain('ALLE Abschnitte');
    expect(system.content).toContain('Absatz');
  });

  it('System-Prompt enthaelt Zeitbudget-Richtwerte je Unterlagentyp (Audit P4)', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('ZEITBUDGET');
    expect(system.content).toContain('~50 Minuten');
    expect(system.content).toContain('270 Minuten');
  });

  it('System-Prompt enthaelt Operatoren-Standard mit Anforderungsbereichen (Audit A1)', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('ARBEITSANWEISUNGEN & OPERATOREN');
    expect(system.content).toContain('Anforderungsbereiche');
    expect(system.content).toContain('Eroertere');
    // gilt auch im Kompetenz-Modus (BLOCK_REGELN sind geteilt)
    const kompetenz = buildMessages(input({ modus: 'kompetenz' }));
    expect(kompetenz.find((m) => m.role === 'system')!.content).toContain('ARBEITSANWEISUNGEN & OPERATOREN');
  });

  it('System-Prompt enthaelt Oesterreich-Register-Regel (Audit A2)', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('OESTERREICHISCHES DEUTSCH');
    expect(system.content).toContain('Jaenner');
    expect(system.content).toContain('Matura (nicht Abitur)');
  });

  it('System-Prompt erzwingt Textspezifitaet bei offenen Verstaendnisfragen (Audit A3)', () => {
    const messages = buildMessages(input());
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('TEXTSPEZIFITAET');
    expect(system.content).toContain('OHNE den Quelltext unbeantwortbar');
    expect(system.content).toContain('Was ist die Hauptaussage des Textes?');
  });
});

describe('nummeriereAbsaetze (Coverage-Prävention)', () => {
  it('nummeriert Mehrabsatz-Text ab 200 Zeichen', () => {
    const text = 'Erster Absatz ueber Medienkonsum bei Jugendlichen in der heutigen Zeit. ' +
      'Er enthaelt viele wichtige Details und Fakten, die man kennen sollte.\n\n' +
      'Zweiter Absatz ueber die Auswirkungen auf Schlaf und Konzentration. ' +
      'Auch dieser Absatz ist lang genug, um die 200-Zeichen-Schwelle zu ueberschreiten.\n\n' +
      'Dritter Absatz ueber moegliche Loesungsansaetze und Praeventionsstrategien.';
    const out = nummeriereAbsaetze(text);
    expect(out).toContain('[Absatz 1]');
    expect(out).toContain('[Absatz 2]');
    expect(out).toContain('[Absatz 3]');
  });

  it('verwendet "[Paragraph N]" bei fach=englisch', () => {
    const text = 'First paragraph about media consumption among teenagers in the modern world. ' +
      'It contains many important details and facts that one should know about.\n\n' +
      'Second paragraph about the effects on sleep and concentration over time. ' +
      'This paragraph is also long enough to exceed the 200 character threshold here.';
    const out = nummeriereAbsaetze(text, 'englisch');
    expect(out).toContain('[Paragraph 1]');
    expect(out).toContain('[Paragraph 2]');
    expect(out).not.toContain('[Absatz');
  });

  it('lässt Einabsatz-Text unveraendert (kein Mehraufwand fuer kurze Quellen)', () => {
    const text = 'Nur ein einzelner Absatz ohne Trennung.';
    const out = nummeriereAbsaetze(text);
    expect(out).toBe(text);
    expect(out).not.toContain('[Absatz');
  });

  it('lässt Mehrabsatz-Text unter 200 Zeichen unveraendert (kein LLM-Overhead)', () => {
    const text = 'Absatz eins.\n\nAbsatz zwei.';
    const out = nummeriereAbsaetze(text);
    expect(out).toBe(text);
  });

  it('nummerierung erscheint in der User-Message unter "inhalt"', () => {
    const inputMitAbsaetzen = {
      ...input(),
      quelltexte: [{
        id: 'q1',
        titel: 'T',
        inhalt: 'Erster Absatz mit hinreichend vielen Worten, damit die 200-Zeichen-Schwelle sicher ueberschritten wird und der Test verwertbar ist.\n\n' +
          'Zweiter Absatz, ebenfalls lang genug, um die Schwelle zu erreichen und die Nummerierung auszuloesen fuer den Test.',
        herkunft: { typ: 'upload' as const, ref: 'a.pdf' },
      }],
    };
    const messages = buildMessages(inputMitAbsaetzen);
    const user = messages.find((m) => m.role === 'user')!;
    expect(user.content).toContain('[Absatz 1]');
    expect(user.content).toContain('[Absatz 2]');
  });
});

describe('buildMessages — Deutsch-SRDP-Training', () => {
  it('fordert Einzelaufgabe, Wortumfang, Textbeilage und 15 Subkriterien', () => {
    const messages = buildMessages(input({ typ: 'matura', fach: 'deutsch', stufe: 'oberstufe' }));
    const user = messages.find((m) => m.role === 'user')!;
    expect(user.content).toContain('GENAU EINEN Block');
    expect(user.content).toContain('405–495');
    expect(user.content).toContain('Textbeilage');
    expect(user.content).toContain('Schreibhandlung(en)');
    expect(user.content).toContain('Situationsadäquatheit');
    expect(user.content).toContain('Grammatik');
    expect(user.content).toContain('mindestens zwei beobachtbare, textsortengerechte Arbeitsauftraege');
    expect(user.content).toContain('Verfasse eine/einen <Textsorte> zum Thema des Textes');
    expect(user.content).toContain('Keine Platzhalter');
    expect(user.content).toContain('nicht floskelhaft');
  });

  it('gated den SRDP-Training-Hinweis für andere Fächer', () => {
    const messages = buildMessages(input({ typ: 'matura', fach: 'englisch', stufe: 'oberstufe' }));
    const user = messages.find((m) => m.role === 'user')!;
    expect(user.content).not.toContain('SRDP-DEUTSCH-TRAINING');
  });
});

describe('buildRefinementMessages — Qualitätspass', () => {
  const refinementDoc = (meta: Partial<Meta> = {}) => ({
    schemaVersion: '0.1.0' as const,
    meta: { ...baseMeta, ...meta },
    quelltexte: [],
    bloecke: [],
  });

  it('enthält die konkrete Kritik-Checkliste und das Änderungsformat', () => {
    const messages = buildRefinementMessages(refinementDoc());
    const user = messages.find((m) => m.role === 'user')!;
    expect(user.content).toContain('Schreibsituation');
    expect(user.content).toContain('Textbezug');
    expect(user.content).toContain('Erwartungshorizont');
    expect(user.content).toContain('Niveau und Punkte');
    expect(user.content).toContain('aenderungen');
    expect(user.content).toContain('zwei bis drei');
  });

  it('fügt den SRDP-Maßstab nur bei Deutsch/Oberstufe/Matura hinzu', () => {
    const srdp = buildRefinementMessages(refinementDoc({ typ: 'matura', stufe: 'oberstufe', fach: 'deutsch' }));
    expect(srdp[0]!.content).toContain('ZUSAETZLICHER SRDP-MASSSTAB');
    expect(srdp[0]!.content).toContain('Schreibhandlung(en)');

    const english = buildRefinementMessages(refinementDoc({ typ: 'matura', stufe: 'oberstufe', fach: 'englisch' }));
    expect(english[0]!.content).not.toContain('ZUSAETZLICHER SRDP-MASSSTAB');
  });

  it('entfernt lokale Schüler-IDs auch aus dem Qualitätspass-Prompt', () => {
    const doc = refinementDoc({
      niveaugruppe: {
        id: 'vertiefung',
        label: 'Vertiefung',
        schwierigkeit: 'schwer',
        schuelerIds: [741852],
        notenbereich: { min: 1, max: 2 },
      },
    });
    const user = buildRefinementMessages(doc as never).find((message) => message.role === 'user')!;
    expect(user.content).toContain('"label": "Vertiefung"');
    expect(user.content).not.toContain('schuelerIds');
    expect(user.content).not.toContain('741852');
  });
});

describe('buildMessages — Kompetenz-Modus', () => {
  const stoffItems = [{
    id: 's1', rahmenwerk: 'at-lehrplan' as const, titel: 'Konjunktiv II',
    fach: 'deutsch' as const, stufe: 'oberstufe' as const, kategorie: 'grammatik' as const,
    deskriptorIds: ['d1'],
  }];

  it('waehlt den Kompetenz-System-Prompt und serialisiert stoffItems statt Quelltexte', () => {
    const messages = buildMessages({
      meta: { ...baseMeta, modus: 'kompetenz' },
      quelltexte: [],
      bloecke: [{ typ: 'umformung' as const, punkte: 6, anzahlAufgaben: 3 }],
      stoffItems,
    });
    const system = messages.find((m) => m.role === 'system')!;
    const user = messages.find((m) => m.role === 'user')!;
    expect(system.content).toContain('KOMPETENZ-MODUS');
    expect(system.content).not.toContain('Leite alle Inhalte strikt aus den gegebenen Quelltexten ab');
    expect(system.content).toContain('umformung');           // gemeinsame Block-Regeln
    expect(user.content).toContain('"titel": "Konjunktiv II"');
    expect(user.content).toContain('KOMPETENZ-MODUS');
  });

  it('haengt IB-Command-Terms an, wenn rahmenwerk === ib-dp', () => {
    const messages = buildMessages({
      meta: { ...baseMeta, modus: 'kompetenz', rahmenwerk: 'ib-dp' },
      quelltexte: [],
      bloecke: [{ typ: 'fehlerkorrektur' as const, punkte: 4, anzahlSaetze: 2 }],
      stoffItems,
    });
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('IB-RAHMENWERK');
    expect(system.content).toContain('Command Terms');
  });

  it('fehlerkorrektur: anzahlSaetze im System-Prompt (GENAU-N-Regel) und als verbindliche Vorgabe', () => {
    const messages = buildMessages({
      meta: baseMeta,
      quelltexte: [{ id: 'q1', titel: 'Test', inhalt: 'Text.', herkunft: { typ: 'upload' as const, ref: 't.docx' } }],
      bloecke: [{ typ: 'fehlerkorrektur' as const, punkte: 4, anzahlSaetze: 6 }],
      stoffItems: [],
    });
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('GENAU anzahlSaetze Saetze');
    expect(system.content).toContain('anzahlSaetze');
    const user = messages.find((m) => m.role === 'user')!;
    expect(user.content).toContain('"anzahlSaetze": 6');
  });

  it('Text-Modus bleibt unveraendert (Default ohne modus)', () => {
    const system = buildMessages(input()).find((m) => m.role === 'system')!;
    expect(system.content).toContain('Leite alle Inhalte strikt aus den gegebenen Quelltexten ab');
    expect(system.content).toContain('KOGNITIVES NIVEAU (Bloom-Steuerung)');
  });
});

describe('buildMessages — Deutschland-Modus (meta.land)', () => {
  it('haengt den DEUTSCHES-SCHULSYSTEM-MODUS-Hinweis an, wenn land === DE (Text-Modus)', () => {
    const messages = buildMessages(input({ land: 'DE' }));
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('DEUTSCHES-SCHULSYSTEM-MODUS');
    expect(system.content).toContain('Abitur (nicht Matura)');
  });

  it('haengt den Hinweis auch im Kompetenz-Modus an', () => {
    const messages = buildMessages({
      meta: { ...baseMeta, land: 'DE', modus: 'kompetenz' },
      quelltexte: [],
      bloecke: [{ typ: 'fehlerkorrektur' as const, punkte: 4, anzahlSaetze: 2 }],
      stoffItems: [],
    });
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('DEUTSCHES-SCHULSYSTEM-MODUS');
  });

  it('Zielgruppe bei land=DE als "Klasse N" statt AHS-Zaehlung', () => {
    const messages = buildMessages(input({ land: 'DE', schulstufe: 7 }));
    const user = messages.find((m) => m.role === 'user')!;
    expect(user.content).toContain('Zielgruppe: Klasse 7');
    expect(user.content).not.toContain('Klasse AHS');
  });

  it('Default (ohne land) bleibt oesterreichisch — kein DE-Hinweis, AHS-Zaehlung', () => {
    const messages = buildMessages(input({ schulstufe: 7 }));
    const system = messages.find((m) => m.role === 'system')!;
    const user = messages.find((m) => m.role === 'user')!;
    expect(system.content).not.toContain('DEUTSCHES-SCHULSYSTEM-MODUS');
    expect(system.content).toContain('OESTERREICHISCHES DEUTSCH');
    expect(user.content).toContain('3. Klasse AHS');
  });

  it('Qualitaetspass-Rolle wird bei land=DE zum deutschen Fachkollegen', () => {
    const doc = {
      schemaVersion: '0.1.0',
      meta: { ...baseMeta, land: 'DE' as const },
      quelltexte: [],
      bloecke: [],
    };
    const messages = buildRefinementMessages(doc as never);
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('deutsche Gymnasialunterlagen');
    expect(system.content).not.toContain('oesterreichische AHS-Unterlagen');
  });
});

describe('buildMessages — Abitur-Training (matura + land=DE)', () => {
  it('nutzt den Abitur-Hint statt des SRDP-Hints', () => {
    const messages = buildMessages(input({ typ: 'matura', land: 'DE' }));
    const user = messages.find((m) => m.role === 'user')!;
    expect(user.content).toContain('ABITUR-DEUTSCH-TRAINING');
    expect(user.content).toContain('AFB I');
    expect(user.content).not.toContain('SRDP-DEUTSCH-TRAINING');
  });

  it('ohne land bleibt es beim SRDP-Hint', () => {
    const messages = buildMessages(input({ typ: 'matura' }));
    const user = messages.find((m) => m.role === 'user')!;
    expect(user.content).toContain('SRDP-DEUTSCH-TRAINING');
    expect(user.content).not.toContain('ABITUR-DEUTSCH-TRAINING');
  });

  it('Qualitaetspass haengt bei land=DE den Abitur-Massstab an', () => {
    const doc = {
      schemaVersion: '0.1.0',
      meta: { ...baseMeta, typ: 'matura' as const, land: 'DE' as const },
      quelltexte: [],
      bloecke: [],
    };
    const messages = buildRefinementMessages(doc as never);
    const system = messages.find((m) => m.role === 'system')!;
    expect(system.content).toContain('ZUSAETZLICHER ABITUR-MASSSTAB');
    expect(system.content).not.toContain('ZUSAETZLICHER SRDP-MASSSTAB');
  });
});

describe('buildMessages — Latein: Anweisungen deutsch (v1.5.2)', () => {
  const latein = input({ fach: 'latein', thema: 'Caesar, de bello Gallico' });
  const user = (i = latein) => buildMessages(i).find((m) => m.role === 'user')!;

  it('verlangt schülerseitige Anweisungstexte auf Deutsch (inkl. arbeitsblattTitel)', () => {
    const content = user().content;
    expect(content).toContain('ist auf Deutsch');
    expect(content).toContain('arbeitsanweisung');
    expect(content).toContain('arbeitsblattTitel');
    expect(content).toContain('VORRANG vor allen anderen Sprachregeln');
  });

  it('enthält nicht mehr die alte Zielsprachen-Formulierung "MUSS auf Latein"', () => {
    for (const m of buildMessages(latein)) expect(m.content).not.toContain('MUSS auf Latein');
  });

  it('lässt Quelltexte und lateinische Arbeitstexte lateinisch', () => {
    expect(user().content).toContain('bleiben lateinisch');
    expect(user().content).toContain('Saetze zum Uebersetzen');
  });

  it('greift auch im Kompetenz-Modus (dort fordert der System-Prompt Zielsprache-Titel)', () => {
    const content = user(input({ fach: 'latein', modus: 'kompetenz' })).content;
    expect(content).toContain('ist auf Deutsch');
    expect(content).not.toContain('MUSS auf Latein');
  });

  it('Englisch behält unverändert die Zielsprachen-Regel', () => {
    const content = user(input({ fach: 'englisch' })).content;
    expect(content).toContain('MUSS auf Englisch');
  });
});

describe('buildMessages — Anweisungs-Niveau moderne Fremdsprachen (v1.5.2)', () => {
  const userContent = (meta: Partial<Meta>) => buildMessages(input(meta)).find((m) => m.role === 'user')!.content;

  it('Englisch "mittel": Anweisungen eine CEFR-Stufe leichter (B1 → A2)', () => {
    const content = userContent({ fach: 'englisch', schwierigkeit: 'mittel' });
    expect(content).toContain('NIVEAUSTUFE EINFACHER');
    expect(content).toContain('mittel ~ B1 → A2');
    expect(content).toContain('bleiben auf der gewaehlten Stufe');
  });

  it('Englisch "schwer": Anweisungen auf B1 (B2 → B1)', () => {
    const content = userContent({ fach: 'englisch', schwierigkeit: 'schwer' });
    expect(content).toContain('NIVEAUSTUFE EINFACHER');
    expect(content).toContain('schwer ~ B2 → B1');
  });

  it('gilt für alle modernen Fremdsprachen', () => {
    for (const fach of ['franzoesisch', 'spanisch', 'italienisch'] as const) {
      expect(userContent({ fach })).toContain('NIVEAUSTUFE EINFACHER');
    }
  });

  it('gilt auch im Kompetenz-Modus', () => {
    expect(userContent({ fach: 'englisch', modus: 'kompetenz' })).toContain('NIVEAUSTUFE EINFACHER');
  });

  it('Deutsch (kein Sprachfach) hat keine Niveau-Regel', () => {
    expect(userContent({})).not.toContain('NIVEAUSTUFE EINFACHER');
  });

  it('Latein hat keine Niveau-Regel (dort gilt: Anweisungen deutsch)', () => {
    expect(userContent({ fach: 'latein' })).not.toContain('NIVEAUSTUFE EINFACHER');
  });
});
