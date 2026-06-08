import { describe, it, expect } from 'vitest';
import { buildMessages, nummeriereAbsaetze } from './prompt.js';
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
    expect(system.content).toContain('LaeNGEN- ae HNLIChKEIT');
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
