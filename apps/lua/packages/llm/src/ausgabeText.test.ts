import { describe, it, expect } from 'vitest';
import type { QuellText } from '@lehrunterlagen/schema';
import { pruefeAusgabeText, uebernehmenAusgabeTexte } from './ausgabeText.js';

const QUELLTEXT =
  'Artificial intelligence is changing how people work. Many companies now use tools that '
  + 'automate repetitive tasks. Workers worry that their jobs could disappear. Researchers say '
  + 'that new tasks will also appear. The question is how quickly people can learn them.';

const qt = (inhalt: string, id = 'q1'): QuellText => ({
  id,
  titel: 'T',
  inhalt,
  herkunft: { typ: 'url', ref: 'https://example.com' },
});

// Aufbereitete Fassung mit VOLLEM Wortlaut, neu gesetzten Absätzen — der Normalfall.
const AUFGEBEREITET = 'Artificial intelligence is changing how people work.\n\n'
  + 'Many companies now use tools that automate repetitive tasks.\n\n'
  + 'Workers worry that their jobs could disappear.\n\n'
  + 'Researchers say that new tasks will also appear.\n\n'
  + 'The question is how quickly people can learn them.';

describe('pruefeAusgabeText', () => {
  it('akzeptiert identischen Wortlaut mit neu gesetzten Absätzen', () => {
    const urteil = pruefeAusgabeText(AUFGEBEREITET, QUELLTEXT);
    expect(urteil).toEqual({ ok: true, text: AUFGEBEREITET });
  });

  it('akzeptiert das Entfernen von Website-Resten aus dem Original', () => {
    // Der Originalinhalt traegt typische Navigations-/Linkzeilen. Diese sind
    // Boilerplate (bereinigeQuelltext entfernt sie) und duerfen im Ausgabetext
    // fehlen — der eigentliche Inhalt bleibt vollstaendig erhalten.
    const mitBoilerplate = [
      'Skip to main content',
      'Related content',
      'Artificial intelligence is changing how people work.',
      'Many companies now use tools that automate repetitive tasks.',
      'Workers worry that their jobs could disappear.',
      'Researchers say that new tasks will also appear.',
      'The question is how quickly people can learn them.',
    ].join('\n\n');
    const urteil = pruefeAusgabeText(AUFGEBEREITET, mitBoilerplate);
    expect(urteil).toEqual({ ok: true, text: AUFGEBEREITET });
  });

  it('lehnt umformulierten Wortlaut ab (Token kommt im Original nicht vor)', () => {
    const umformuliert = 'Artificial intelligence is changing how humans work.';
    expect(pruefeAusgabeText(umformuliert, QUELLTEXT)).toEqual({ ok: false, grund: 'wortlaut' });
  });

  it('lehnt halluzinierte Saetze ab', () => {
    const erfunden = QUELLTEXT + ' Experts agree that no job is ever at risk.';
    expect(pruefeAusgabeText(erfunden, QUELLTEXT)).toEqual({ ok: false, grund: 'wortlaut' });
  });

  it('lehnt stillen Inhaltsverlust ab (zu wenig erhalten)', () => {
    const zuWenig = 'Artificial intelligence is changing how people work.\n\nWorkers worry that their jobs could disappear.';
    expect(pruefeAusgabeText(zuWenig, QUELLTEXT)).toEqual({ ok: false, grund: 'unvollstaendig' });
  });

  it('bewertet die Vollstaendigkeitsquote bei kurzen Texten nicht', () => {
    // 3 Token Referenz: ein Verlust laesst sich hier nicht sinnvoll quotieren.
    expect(pruefeAusgabeText('work work', 'work work rest').ok).toBe(true);
  });

  it('lehnt HTML-Reste ab', () => {
    expect(pruefeAusgabeText('<p>Artificial</p> intelligence', QUELLTEXT)).toEqual({ ok: false, grund: 'html' });
  });

  it('lehnt Markdown-Reste ab', () => {
    expect(pruefeAusgabeText('**Artificial** intelligence is changing', QUELLTEXT))
      .toEqual({ ok: false, grund: 'html' });
    expect(pruefeAusgabeText('`Artificial` intelligence is changing', QUELLTEXT))
      .toEqual({ ok: false, grund: 'html' });
  });

  it('lehnt leere und nicht-textuelle Werte ab', () => {
    expect(pruefeAusgabeText('', QUELLTEXT)).toEqual({ ok: false, grund: 'leer' });
    expect(pruefeAusgabeText('   \n  ', QUELLTEXT)).toEqual({ ok: false, grund: 'leer' });
    expect(pruefeAusgabeText(undefined, QUELLTEXT)).toEqual({ ok: false, grund: 'leer' });
    expect(pruefeAusgabeText(42, QUELLTEXT)).toEqual({ ok: false, grund: 'leer' });
  });

  it('normalisiert CRLF und aeussere Leerraeume', () => {
    const mitCrlf = `\r\n  ${AUFGEBEREITET.replace(/\n/g, '\r\n')}  \r\n`;
    const urteil = pruefeAusgabeText(mitCrlf, QUELLTEXT);
    expect(urteil.ok).toBe(true);
    if (urteil.ok) {
      expect(urteil.text).not.toContain('\r');
      expect(urteil.text).toBe(AUFGEBEREITET);
    }
  });

  it('ignoriert Gross-/Kleinschreibung', () => {
    const gross = AUFGEBEREITET.toUpperCase();
    expect(pruefeAusgabeText(gross, QUELLTEXT).ok).toBe(true);
  });
});

describe('uebernehmenAusgabeTexte', () => {
  const aufbereitet = AUFGEBEREITET;

  it('übernimmt ausschließlich ausgabeText und lässt den Originalinhalt unangetastet', () => {
    const original = qt(QUELLTEXT);
    const ergebnis = uebernehmenAusgabeTexte([original], [{ id: 'q1', ausgabeText: aufbereitet }]);
    expect(ergebnis.verworfen).toEqual([]);
    expect(ergebnis.quelltexte[0]?.ausgabeText).toBe(aufbereitet);
    // Hoheit der Lehrkraft: id/titel/inhalt/herkunft unveraendert.
    expect(ergebnis.quelltexte[0]?.inhalt).toBe(QUELLTEXT);
    expect(ergebnis.quelltexte[0]?.id).toBe('q1');
    expect(ergebnis.quelltexte[0]?.herkunft).toEqual({ typ: 'url', ref: 'https://example.com' });
  });

  it('übernimmt NICHT das inhalt-Feld der Modellantwort', () => {
    const ergebnis = uebernehmenAusgabeTexte(
      [qt(QUELLTEXT)],
      [{ id: 'q1', inhalt: 'Völlig anderer Text vom Modell.', ausgabeText: aufbereitet }],
    );
    expect(ergebnis.quelltexte[0]?.inhalt).toBe(QUELLTEXT);
  });

  it('verwirft verletzten Wortlaut und meldet die ID', () => {
    const ergebnis = uebernehmenAusgabeTexte(
      [qt(QUELLTEXT)],
      [{ id: 'q1', ausgabeText: 'Das Modell hat etwas ganz anderes geschrieben.' }],
    );
    expect(ergebnis.verworfen).toEqual(['q1']);
    expect(ergebnis.quelltexte[0]?.ausgabeText).toBeUndefined();
  });

  it('ignoriert unbekannte IDs', () => {
    const ergebnis = uebernehmenAusgabeTexte([qt(QUELLTEXT)], [{ id: 'q99', ausgabeText: aufbereitet }]);
    expect(ergebnis.verworfen).toEqual([]);
    expect(ergebnis.quelltexte[0]?.ausgabeText).toBeUndefined();
  });

  it('lässt Quelltexte ohne passenden Modelleintrag unverändert', () => {
    const ergebnis = uebernehmenAusgabeTexte([qt(QUELLTEXT, 'q1'), qt(QUELLTEXT, 'q2')], [{ id: 'q2', ausgabeText: aufbereitet }]);
    expect(ergebnis.quelltexte[0]?.ausgabeText).toBeUndefined();
    expect(ergebnis.quelltexte[1]?.ausgabeText).toBe(aufbereitet);
  });

  it('toleriert fehlende oder unbrauchbare Modelldaten', () => {
    expect(uebernehmenAusgabeTexte([qt(QUELLTEXT)], undefined).quelltexte[0]?.ausgabeText).toBeUndefined();
    expect(uebernehmenAusgabeTexte([qt(QUELLTEXT)], []).quelltexte[0]?.ausgabeText).toBeUndefined();
    expect(uebernehmenAusgabeTexte([qt(QUELLTEXT)], [null, 5, {}]).quelltexte[0]?.ausgabeText).toBeUndefined();
  });

  it('behandelt mehrfach vorkommende Tokens korrekt (Multiset)', () => {
    // "work" kommt zweimal vor — ein einzelnes "work" darf, zwei dürfen nicht.
    const referenz = 'work work rest';
    expect(pruefeAusgabeText('work rest', referenz).ok).toBe(true);
    expect(pruefeAusgabeText('work work rest', referenz).ok).toBe(true);
    expect(pruefeAusgabeText('work work work rest', referenz)).toEqual({ ok: false, grund: 'wortlaut' });
  });
});
