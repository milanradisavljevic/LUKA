import type { ChatMessage, GenerateInput, Provider, ProviderConfig } from '@lehrunterlagen/llm';
import type { DocumentV1 } from '@lehrunterlagen/schema';

/**
 * Mock-LLM-Provider fuer Tests und CI ohne API-Key.
 * Parst die System-Prompt-Nachricht, um den gewuenschten Block-Typ zu extrahieren,
 * und gibt die passende JSON-Fixture aus packages/qa/src/fixtures/ zurueck.
 *
 * Aktivierung:
 *   - LLM_PROVIDER=mock in .env
 *   - oder direkter Import in Tests: provider = mockLlmProvider
 *
 * Die System-Prompt-Erkennung sucht nach Substrings wie 'wordScramble',
 * 'kategorisierung' etc. Fallback: lueckentext.
 */

import lueckentextFixture from '../fixtures/lueckentext.json' assert { type: 'json' };
import matchingFixture from '../fixtures/matching.json' assert { type: 'json' };
import multipleChoiceFixture from '../fixtures/multipleChoice.json' assert { type: 'json' };
import offeneVerstaendnisfrageFixture from '../fixtures/offeneVerstaendnisfrage.json' assert { type: 'json' };
import offeneSchreibaufgabeFixture from '../fixtures/offeneSchreibaufgabe.json' assert { type: 'json' };
import markieraufgabeFixture from '../fixtures/markieraufgabe.json' assert { type: 'json' };
import wordScrambleFixture from '../fixtures/wordScramble.json' assert { type: 'json' };
import kategorisierungFixture from '../fixtures/kategorisierung.json' assert { type: 'json' };
import tabelleFixture from '../fixtures/tabelle.json' assert { type: 'json' };
import stiluebungFixture from '../fixtures/stiluebung.json' assert { type: 'json' };
import songanalyseFixture from '../fixtures/songanalyse.json' assert { type: 'json' };

type BlockTyp =
  | 'lueckentext'
  | 'matching'
  | 'multipleChoice'
  | 'offeneVerstaendnisfrage'
  | 'offeneSchreibaufgabe'
  | 'markieraufgabe'
  | 'wordScramble'
  | 'kategorisierung'
  | 'tabelle'
  | 'stiluebung'
  | 'songanalyse';

const FIXTURES: Record<BlockTyp, DocumentV1> = {
  lueckentext: lueckentextFixture as DocumentV1,
  matching: matchingFixture as DocumentV1,
  multipleChoice: multipleChoiceFixture as DocumentV1,
  offeneVerstaendnisfrage: offeneVerstaendnisfrageFixture as DocumentV1,
  offeneSchreibaufgabe: offeneSchreibaufgabeFixture as DocumentV1,
  markieraufgabe: markieraufgabeFixture as DocumentV1,
  wordScramble: wordScrambleFixture as DocumentV1,
  kategorisierung: kategorisierungFixture as DocumentV1,
  tabelle: tabelleFixture as DocumentV1,
  stiluebung: stiluebungFixture as DocumentV1,
  songanalyse: songanalyseFixture as DocumentV1,
};

const TYPE_KEYWORDS: Record<BlockTyp, string[]> = {
  lueckentext: ['lueckentext', 'lückentext'],
  matching: ['matching', 'zuordnung'],
  multipleChoice: ['multiplechoice', 'mc-frage', 'multiple choice'],
  offeneVerstaendnisfrage: ['verstaendnisfrage', 'verständnisfrage'],
  offeneSchreibaufgabe: ['schreibaufgabe', 'kommentar', 'erorterung'],
  markieraufgabe: ['markieraufgabe', 'markiere'],
  wordScramble: ['wordscramble', 'satz ordnen', 'wortstellung'],
  kategorisierung: ['kategorisierung', 'kategorie', 'zuordnen'],
  tabelle: ['tabelle', 'tabelleneintrag'],
  stiluebung: ['stiluebung', 'stilübung', 'umformulieren'],
  songanalyse: ['songanalyse', 'songtext', 'lyrics'],
};

export function detectBlockTyp(messages: ChatMessage[]): BlockTyp {
  const haystack = messages.map((m) => m.content).join('\n').toLowerCase();
  for (const [typ, keywords] of Object.entries(TYPE_KEYWORDS) as [BlockTyp, string[]][]) {
    if (keywords.some((k) => haystack.includes(k))) {
      return typ;
    }
  }
  return 'lueckentext';
}

export const mockLlmProvider: Provider = {
  id: 'anthropic',
  async complete(messages: ChatMessage[], _cfg: ProviderConfig, _input?: GenerateInput): Promise<string> {
    const typ = detectBlockTyp(messages);
    const fixture = FIXTURES[typ];
    return JSON.stringify(fixture);
  },
};
