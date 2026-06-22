import type { Meta, Block, Schwierigkeit } from '@lehrunterlagen/schema';
import { BLOOM_TYP_ABGERATEN } from '@lehrunterlagen/schema';
import type { LucideIcon } from 'lucide-react';
import {
  Pencil, ArrowLeftRight, CircleDot, HelpCircle, PenLine, Highlighter,
  Shuffle, FolderTree, Table, Feather, Music, Puzzle, Grid3x3,
  FileSearch, Users,
} from 'lucide-react';

export const BLOCK_TYPE_DEFS: {
  id: Block['typ']; label: string; description: string; Icon: LucideIcon; color: string;
  minuten: [number, number];
}[] = [
  { id: 'lueckentext', label: 'Lückentext', description: 'Lücken im Text ergänzen', Icon: Pencil, color: '#e57373', minuten: [5, 8] },
  { id: 'matching', label: 'Matching', description: 'Begriffe richtig zuordnen', Icon: ArrowLeftRight, color: '#64b5f6', minuten: [4, 6] },
  { id: 'multipleChoice', label: 'Multiple Choice', description: 'Richtige Antwort ankreuzen', Icon: CircleDot, color: '#81c784', minuten: [3, 5] },
  { id: 'offeneVerstaendnisfrage', label: 'Verständnisfrage', description: 'Fragen zum Text beantworten', Icon: HelpCircle, color: '#ffb74d', minuten: [8, 12] },
  { id: 'offeneSchreibaufgabe', label: 'Schreibaufgabe', description: 'Aufsatz oder Kommentar verfassen', Icon: PenLine, color: '#ba68c8', minuten: [20, 30] },
  { id: 'markieraufgabe', label: 'Markieraufgabe', description: 'Textstellen markieren', Icon: Highlighter, color: '#4db6ac', minuten: [4, 7] },
  { id: 'wordScramble', label: 'Wörter ordnen', description: 'Wörter in die richtige Reihenfolge bringen', Icon: Shuffle, color: '#9575cd', minuten: [3, 5] },
  { id: 'kategorisierung', label: 'Kategorisierung', description: 'Begriffe Kategorien zuordnen', Icon: FolderTree, color: '#7986cb', minuten: [5, 8] },
  { id: 'tabelle', label: 'Tabelle', description: 'Werte in eine Tabelle eintragen', Icon: Table, color: '#5c6bc0', minuten: [6, 10] },
  { id: 'stiluebung', label: 'Stilübung', description: 'Text in einem anderen Stil umformulieren', Icon: Feather, color: '#f06292', minuten: [8, 12] },
  { id: 'songanalyse', label: 'Songanalyse', description: 'Songtext interpretieren', Icon: Music, color: '#4dd0e1', minuten: [10, 15] },
  { id: 'kreuzwortraetsel', label: 'Kreuzworträtsel', description: 'Wörter über Hinweise ins Gitter eintragen', Icon: Puzzle, color: '#a1887f', minuten: [8, 12] },
  { id: 'wortgitter', label: 'Wortgitter', description: 'Versteckte Wörter im Buchstabengitter finden', Icon: Grid3x3, color: '#90a4ae', minuten: [6, 10] },
  { id: 'vokabeluebung', label: 'Vokabelübung', description: 'Vokabeln übersetzen oder zuordnen', Icon: Pencil, color: '#4caf50', minuten: [5, 8] },
  { id: 'fehlerkorrektur', label: 'Fehlerkorrektur', description: 'Fehler in Sätzen finden und korrigieren', Icon: FileSearch, color: '#ba68c8', minuten: [6, 10] },
  { id: 'roleplay', label: 'Rollenspiel', description: 'Kommunikative Sprechsituation mit Rollenkarten', Icon: Users, color: '#ff8a65', minuten: [8, 12] },
];

export const STUFE_RULES = {
  oberstufe: {
    allowedBlockTypes: [
      'lueckentext', 'matching', 'multipleChoice',
      'offeneVerstaendnisfrage', 'offeneSchreibaufgabe', 'markieraufgabe',
      'wordScramble', 'kategorisierung', 'tabelle', 'stiluebung', 'songanalyse',
      'kreuzwortraetsel', 'wortgitter', 'vokabeluebung',
      'fehlerkorrektur', 'roleplay',
    ] as const,
    wortbankAllowed: true,
  },
  unterstufe: {
    allowedBlockTypes: [
      'lueckentext', 'matching', 'multipleChoice',
      'offeneVerstaendnisfrage', 'markieraufgabe',
      'wordScramble', 'kategorisierung', 'tabelle',
      'kreuzwortraetsel', 'wortgitter', 'vokabeluebung',
      'fehlerkorrektur', 'roleplay',
    ] as const,
    wortbankAllowed: true,
  },
} as const;

// ---------------------------------------------------------------------------
// Schwierigkeits-Gating für die UI (Step0_Absicht, Step2_Baukasten).
// ABGELEITET aus der EINZIGEN Quelle der Wahrheit `BLOOM_TYP_ABGERATEN`
// (packages/schema). NICHT hier hartkodieren — sonst driften UI-Gating und
// Prompt-/Schema-Logik auseinander. Inhaltliche Justierung NUR im Schema.
// ---------------------------------------------------------------------------

const SCHWIERIGKEIT_HINWEISE: Record<Schwierigkeit, string> = {
  leicht: 'Für "leicht" didaktisch zu anspruchsvoll — produktive/analytische Typen meiden.',
  mittel: '',
  schwer: 'Für "schwer" didaktisch ungeeignet — bevorzuge offene Typen.',
};

export const SCHWIERIGKEIT_RULES = Object.fromEntries(
  (Object.keys(BLOOM_TYP_ABGERATEN) as Schwierigkeit[]).map((s) => [
    s,
    {
      discouraged: BLOOM_TYP_ABGERATEN[s].map((e) => e.typ) as readonly string[],
      hinweis: SCHWIERIGKEIT_HINWEISE[s],
    },
  ]),
) as Record<Schwierigkeit, { discouraged: readonly string[]; hinweis: string }>;

export function isWortbankEnabled(stufe: Meta['stufe']): boolean {
  return STUFE_RULES[stufe].wortbankAllowed;
}

export function getDefaultMeta(stufe?: Meta['stufe']): Meta {
  return {
    stufe: stufe ?? 'oberstufe',
    fach: 'deutsch',
    thema: '',
    datum: new Date().toISOString().slice(0, 10),
    klasse: '',
    notizen: '',
    typ: 'schularbeit',
    schwierigkeit: 'mittel',
    lernziele: undefined,
  };
}

export const LLM_PROVIDERS = [
  { id: 'claude' as const, label: 'Claude (Anthropic)', models: ['Opus 4.8', 'Opus 4.7', 'Sonnet 4.6', 'Haiku 4.5'] },
  { id: 'chatgpt' as const, label: 'ChatGPT (OpenAI)', models: ['GPT-5.4', 'GPT-5.4 mini', 'GPT-5.4 nano'] },
  { id: 'deepseek' as const, label: 'DeepSeek', models: ['DeepSeek V4 Flash', 'DeepSeek V4 Pro'] },
  { id: 'mistral' as const, label: 'Mistral', models: ['Mistral Medium 3.5', 'Mistral Small 4'] },
  { id: 'qwen' as const, label: 'Qwen (Alibaba)', models: ['Qwen 3.7 Max', 'Qwen 3.6 Plus'] },
  { id: 'kimi' as const, label: 'Kimi (Moonshot)', models: ['Moonshot V1 8K', 'Kimi K2.6'] },
];

/**
 * Mappt die UI-Provider-ID (llmProvider) auf die im OS-Keychain verwendete Provider-ID.
 * Schlüssel werden unter diesen IDs gespeichert/geladen — beim Prüfen exakt dasselbe Mapping
 * verwenden (sonst falsch-negative „Kein Key"-Warnungen, z. B. chatgpt → openai).
 */
export const PROVIDER_KEY_IDS: Record<string, string> = {
  claude: 'claude',
  chatgpt: 'openai',
  deepseek: 'deepseek',
  mistral: 'mistral',
  qwen: 'qwen',
  kimi: 'kimi',
};

/** Geschätzte Bearbeitungszeit [min, max] je Unterlagentyp (Step0-Kacheln). */
export const UNTERLAGENTYP_MINUTEN: Record<string, [number, number]> = {
  hausuebung: [10, 15],
  test: [25, 35],
  schuluebung: [15, 25],
  schularbeit: [45, 60],
};