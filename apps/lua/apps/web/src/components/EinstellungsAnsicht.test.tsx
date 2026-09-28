// Ergebnis-Ansicht des BlockConfigPanel: nach der Erstellung sollen nur Felder stehen,
// die auf das fertige Dokument wirken. Anforderungs-Zaehler ("Anzahl Saetze", …) wuerden
// dort nur tanzen — der Text steht fest, die Zahl aendert nichts.

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Block } from '@lehrunterlagen/schema';
import { BlockConfigPanel } from './BlockConfigPanel';

const tpl = 'oberstufe' as const;

const onConfigChange = () => {};

function html(block: Block, ansicht: 'anforderung' | 'ergebnis'): string {
  return renderToStaticMarkup(
    <BlockConfigPanel block={block} stufe={tpl} onConfigChange={onConfigChange} ansicht={ansicht} />,
  );
}

// Die Fixtures bilden ERGEBNIS-Bloecke ab (das Schema kennt dort keine Anforderungs-
// Zaehler wie anzahlSaetze) — genau die Form, die nach der Generierung im Dokument liegt.
const wordScramble: Block = {
  id: 'b1', typ: 'wordScramble', punkte: 6, quelleId: 'q1', arbeitsanweisung: 'Bring die Sätze in die richtige Reihenfolge.',
  config: { eingabemodus: 'ki', saetze: [{ wort: 'Haus' }, { wort: 'Baum' }] },
};

const lueckentext: Block = {
  id: 'b2', typ: 'lueckentext', punkte: 5, quelleId: 'q1', arbeitsanweisung: 'Setze ein.',
  text: 'Der (1) ist (2).',
  config: { anzahlLuecken: 2, wortbank: false, distraktoren: 0 },
  loesung: { luecken: [{ nr: 1, wort: 'Hund' }, { nr: 2, wort: 'klein' }] },
};

const multipleChoice: Block = {
  id: 'b3', typ: 'multipleChoice', punkte: 4, quelleId: 'q1', arbeitsanweisung: 'Wähle die richtige Antwort.',
  config: {
    fragen: [{
      nr: 1, frage: 'Wie viele?', mehrfach: false,
      // Das Schema verlangt mindestens vier Optionen.
      optionen: [
        { key: 'A', text: '21' }, { key: 'B', text: '26' },
        { key: 'C', text: '31' }, { key: 'D', text: '53' },
      ],
    }],
  },
  loesung: { antworten: { '1': ['A'] } },
};

const roleplay: Block = {
  id: 'b4', typ: 'roleplay', punkte: 10, quelleId: 'q1', arbeitsanweisung: 'Spielt das Rollenspiel.',
  config: {
    eingabemodus: 'ki', situation: 'In der Redaktion', setting: 'Zeitung', ziel: 'Tiere',
    zeitMinuten: 20,
    // Das Schema verlangt zwei bis vier Rollen.
    rollen: [
      { name: 'Redakteur', beschreibung: 'fragt nach', aufgabe: 'Recherche', redemittel: ['Wie geht es dir?'] },
      { name: 'Tierärztin', beschreibung: 'antwortet', aufgabe: 'Diagnose', redemittel: ['Das Tier ist krank.'] },
    ],
    redemittel: ['Danke dir'],
    bewertung: ['nennt Quellen'],
  },
  loesung: { musterdialog: 'Redakteurin: Wie geht es dem Hund?', hinweise: 'Auf sachliche Argumentation achten.' },
};

const stiluebung: Block = {
  id: 'b5', typ: 'stiluebung', punkte: 6, quelleId: 'q1', arbeitsanweisung: 'Formuliere um.',
  // Werte aus den echten Auswahllisten des Panels.
  config: {
    ausgangstext: 'Der Hund lief schnell.',
    zielniveau: 'gehoben',
    transformation: 'erweitern',
  },
  loesung: {
    umformulierung: 'Der Hund sprintete überraschend schnell über das Feld.',
    begruendung: '„lief" wird durch „sprintete" ersetzt, der Satz wird aussagekräftiger.',
  },
};

describe('BlockConfigPanel — Anforderungsansicht bleibt unveraendert', () => {
  it('zeigt im Baukasten weiterhin alle Zaehler', () => {
    const out = html(wordScramble, 'anforderung');
    expect(out).toContain('Anzahl Sätze');
    expect(out).toContain('KI-generiert');
  });

  it('zeigt im Baukasten weiterhin den Lueckentext-Zaehler', () => {
    expect(html(lueckentext, 'anforderung')).toContain('Anzahl Lücken');
  });
});

describe('BlockConfigPanel — Ergebnisansicht blendet Anforderungsfelder aus', () => {
  it('wordScramble: kein "Anzahl Saetze" mehr, die Woerter bleiben', () => {
    const out = html(wordScramble, 'ergebnis');
    expect(out).not.toContain('Anzahl Sätze');
    expect(out).not.toContain('KI-generiert');
    expect(out).toContain('Haus');
    expect(out).toContain('Baum');
  });

  it('lueckentext: gar keine Zaehler, weil nur der erzeugte Text zaehlt', () => {
    const out = html(lueckentext, 'ergebnis');
    expect(out).not.toContain('Anzahl Lücken');
    expect(out).not.toContain('Wortbank');
    expect(out.trim()).toBe('');
  });

  it('multipleChoice: die erzeugten Fragen und Optionen bleiben editierbar', () => {
    const out = html(multipleChoice, 'ergebnis');
    expect(out).toContain('Wie viele?');
    expect(out).toContain('21');
    expect(out).toContain('Mehrfachauswahl');
    expect(out).toContain('+ Frage');
  });

  it('roleplay: Rollen bleiben, Situation/Setting/Ziel bleiben — sie werden gedruckt', () => {
    // buildRoleplay druckt situation, setting und ziel. Sie zu verstecken waere stiller
    // Datenverlust: die Texte stehen im DOCX, liessen sich aber nicht mehr korrigieren.
    const out = html(roleplay, 'ergebnis');
    expect(out).not.toContain('KI-generiert');
    expect(out).toContain('Setting (Kontext)');
    expect(out).toContain('Zeit (Minuten)');
    expect(out).toContain('Redakteur');
  });

  it('stiluebung: Zielniveau und Transformation bleiben (buildStiluebung druckt sie)', () => {
    const out = html(stiluebung, 'ergebnis');
    expect(out).toContain('Zielniveau');
    expect(out).toContain('Transformation');
    expect(out).toContain('gehoben');
  });

  it('quellenanalyse: der Quellentyp wird nicht gedruckt und verschwindet', () => {
    const qa: Block = {
      id: 'b6', typ: 'quellenanalyse', punkte: 6, quelleId: 'q1', arbeitsanweisung: 'Analysiere die Quelle.',
      config: {
        quelleId: 'q1',
        quellentyp: 'text',
        auftraege: [{ nr: 1, operator: 'analysieren', frage: 'Was sagt der Text?', zeilen: 2 }],
      },
      loesung: {
        antworten: [{ nr: 1, erwartung: 'Eine belegte Aussage.', belege: ['Absatz 1'] }],
      },
    };
    const out = html(qa, 'ergebnis');
    expect(out).not.toContain('Quellentyp');
    expect(out).toContain('Was sagt der Text?');
  });
});
