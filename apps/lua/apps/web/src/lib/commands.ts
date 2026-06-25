import type { Block } from '@lehrunterlagen/schema';
import type { AppAction } from './types';
import { createDefaultBlock } from './blockDefaults';

export interface CommandDef {
  id: string;
  label: string;
  description: string;
  pattern: RegExp;
  parse: (match: RegExpMatchArray) => AppAction | AppAction[] | null;
}

const stepMap: Record<string, 'input' | 'baukasten' | 'llm' | 'generate'> = {
  '1': 'input',
  '2': 'baukasten',
  '3': 'llm',
  '4': 'generate',
};

export const COMMANDS: CommandDef[] = [
  // ---- Navigation ----
  {
    id: 'nav-step',
    label: 'Gehe zu Schritt 1–4',
    description: 'Wechselt zu einem bestimmten Schritt (Input, Baukasten, KI-Modell, Vorschau)',
    pattern: /^(schritt|step|gehe zu)\s*(\d|input|baukasten|llm|vorschau|generate)$/i,
    parse: (m) => {
      const target = m[2]?.toLowerCase();
      const step = stepMap[target ?? ''] ?? (target === 'input' || target === 'vorschau' ? 'generate' : undefined);
      if (!step && target) {
        const byName: Record<string, 'input' | 'baukasten' | 'llm' | 'generate'> = {
          input: 'input', baukasten: 'baukasten', llm: 'llm', vorschau: 'generate', generate: 'generate',
        };
        return { type: 'SET_STEP', step: byName[target] ?? 'input' };
      }
      return step ? { type: 'SET_STEP', step } : null;
    },
  },
  {
    id: 'nav-back',
    label: 'Zurück',
    description: 'Geht einen Schritt zurück',
    pattern: /^(zurück|back|zurueck)$/i,
    parse: () => null, // handled specially
  },
  {
    id: 'nav-next',
    label: 'Weiter',
    description: 'Geht einen Schritt vor',
    pattern: /^(weiter|next|weiter|vor)$/i,
    parse: () => null, // handled specially
  },

  // ---- Metadaten ----
  {
    id: 'meta-thema',
    label: 'Thema: <Text>',
    description: 'Setzt das Thema der Schularbeit',
    pattern: /^(thema|topic)\s*:?\s*(.+)$/i,
    parse: (m) => ({ type: 'SET_META', meta: { thema: m[2]?.trim() ?? '' } }),
  },
  {
    id: 'meta-fach',
    label: 'Fach: Deutsch/Englisch',
    description: 'Setzt das Fach',
    pattern: /^(fach|subject)\s*:?\s*(deutsch|englisch)$/i,
    parse: (m) => ({ type: 'SET_META', meta: { fach: m[2]?.toLowerCase() as 'deutsch' | 'englisch' } }),
  },
  {
    id: 'meta-stufe',
    label: 'Stufe: Unterstufe/Oberstufe',
    description: 'Setzt die Schulstufe',
    pattern: /^(stufe|level)\s*:?\s*(unterstufe|oberstufe)$/i,
    parse: (m) => ({ type: 'SET_META', meta: { stufe: m[2]?.toLowerCase() as 'unterstufe' | 'oberstufe' } }),
  },
  {
    id: 'meta-klasse',
    label: 'Klasse: <Text>',
    description: 'Setzt die Klasse (z. B. 7A)',
    pattern: /^(klasse|class)\s*:?\s*(.+)$/i,
    parse: (m) => ({ type: 'SET_META', meta: { klasse: m[2]?.trim() ?? '' } }),
  },

  // ---- Blöcke ----
  {
    id: 'block-add',
    label: 'Füge <Typ> hinzu',
    description: 'Fügt einen neuen Aufgabenblock hinzu (Lückentext, Matching, etc.)',
    pattern: /^(füge|add|neu(er|en)?)\s*(lückentext|lueckentext|matching|multiple.?choice|verständnisfrage|verstaendnisfrage|schreibaufgabe|markieraufgabe|rollenkarten|rollenkartenset)\s*(hinzu|block)?$/i,
    parse: (m) => {
      const raw = m[3]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';
      const typeMap: Record<string, string> = {
        lückentext: 'lueckentext', lueckentext: 'lueckentext',
        matching: 'matching',
        multiplechoice: 'multipleChoice',
        verständnisfrage: 'offeneVerstaendnisfrage',
        verstaendnisfrage: 'offeneVerstaendnisfrage',
        schreibaufgabe: 'offeneSchreibaufgabe',
        markieraufgabe: 'markieraufgabe',
        rollenkarten: 'rollenkartenSet',
        rollenkartenset: 'rollenkartenSet',
      };
      const typ = typeMap[raw];
      if (!typ) return null;
      const config = getDefaultConfig(typ);
      const loesung = getEmptyLoesung(typ);
      const id = `b${Date.now()}`;
      return {
        type: 'ADD_BLOCK' as const,
        block: { id, typ, punkte: 6, arbeitsanweisung: '', config, loesung, quelleId: undefined, clue: undefined } as Block,
      };
    },
  },
  {
    id: 'block-delete',
    label: 'Block löschen / entfernen',
    description: 'Entfernt den letzten Aufgabenblock',
    pattern: /^(block\s+)?(löschen|loeschen|entfernen|delete|letzten\s+löschen)$/i,
    parse: () => ({ type: 'REMOVE_BLOCK', id: '__last__' }), // handled specially
  },
  {
    id: 'block-punkte',
    label: 'Punkte: <Zahl>',
    description: 'Setzt die Punkte des aktuellen/letzten Blocks',
    pattern: /^(punkte|points)\s*:?\s*(\d+)$/i,
    parse: (m) => ({ type: 'UPDATE_BLOCK', id: '__last__', block: { punkte: parseInt(m[2] ?? '0') } }),
  },

  // ---- Export ----
  {
    id: 'export',
    label: 'Exportieren / Generieren',
    description: 'Generiert die Word-Dokumente (Schüler + Lösung)',
    pattern: /^(export(ieren)?|generieren|dokumente?\s+erstellen|download)$/i,
    parse: () => ({ type: 'SET_STEP', step: 'generate' }), // handled specially
  },

  // ---- Vorlagen ----
  {
    id: 'template-save',
    label: 'Vorlage speichern als <Name>',
    description: 'Speichert die aktuelle Konfiguration als Vorlage',
    pattern: /^(vorlage|template)\s+speichern\s+als\s+(.+)$/i,
    parse: (m) => ({ type: 'SET_META', meta: { notizen: `__TEMPLATE_SAVE:${m[2]?.trim() ?? ''}` as string } }), // signal for template save
  },
  {
    id: 'template-load',
    label: 'Vorlage laden: <Name>',
    description: 'Lädt eine gespeicherte Vorlage',
    pattern: /^(vorlage|template)\s+laden\s*:?\s*(.+)$/i,
    parse: (m) => ({ type: 'SET_META', meta: { notizen: `__TEMPLATE_LOAD:${m[2]?.trim() ?? ''}` as string } }),
  },
];

function getDefaultConfig(typ: string): Record<string, unknown> {
  switch (typ) {
    case 'lueckentext': return { anzahlLuecken: 6, wortbank: false, distraktoren: 0 };
    case 'matching': return { items: [{ nr: 1, prompt: '' }, { nr: 2, prompt: '' }], optionen: [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }] };
    case 'multipleChoice': return { fragen: [{ nr: 1, frage: '', optionen: [{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }], mehrfach: false }] };
    case 'offeneVerstaendnisfrage': return { fragen: [{ nr: 1, frage: '', zeilen: 4 }] };
    case 'offeneSchreibaufgabe': return { situation: '', textsorte: '', umfangWorte: { min: 200, max: 300 }, aspekte: [''] };
    case 'markieraufgabe': return { quelleId: '', anweisung: '' };
    case 'vokabeluebung': return { richtung: 'de_fremd', vokabeln: [{ deutsch: '', fremdsprache: '' }] };
    case 'rollenkartenSet': return createDefaultBlock('rollenkartenSet').config;
    default: return {};
  }
}

function getEmptyLoesung(typ: string): Record<string, unknown> {
  switch (typ) {
    case 'lueckentext': return { luecken: [] };
    case 'matching': return { zuordnung: {} };
    case 'multipleChoice': return { antworten: {} };
    case 'offeneVerstaendnisfrage': return { antworten: {} };
    case 'offeneSchreibaufgabe': return { musterloesung: '', erwartungshorizont: { inhalt: '', struktur: '', ausdruck: '', sprachrichtigkeit: '' } };
    case 'markieraufgabe': return { stellen: [] };
    case 'vokabeluebung': return { antworten: {} };
    case 'rollenkartenSet': return { hinweise: '' };
    default: return {};
  }
}
