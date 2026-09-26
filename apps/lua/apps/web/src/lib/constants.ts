import type { Meta, Block, Schwierigkeit } from '@lehrunterlagen/schema';
import { BLOOM_TYP_ABGERATEN } from '@lehrunterlagen/schema';
import type { LucideIcon } from 'lucide-react';
import { heuteIso } from './lokalDatum';
import { BLOCK_TYP_LABEL, BLOCK_TYP_DESCRIPTION } from './blockLabels';
import {
  Pencil, ArrowLeftRight, CircleDot, HelpCircle, PenLine, Highlighter,
  Shuffle, FolderTree, Table, Feather, Music, Puzzle, Grid3x3,
  FileSearch, Users, Layers, CalendarDays,
} from 'lucide-react';

/** Nur die Darstellung: Icon + Farbe je Typ. Name/Beschreibung stehen in
 *  `blockLabels.ts`, damit die reine Logik sie ohne Icons mitnehmen kann. */
const BLOCK_TYP_ICON_COLOR: Record<Block['typ'], { Icon: LucideIcon; color: string }> = {
  lueckentext: { Icon: Pencil, color: '#e57373' },
  matching: { Icon: ArrowLeftRight, color: '#64b5f6' },
  multipleChoice: { Icon: CircleDot, color: '#81c784' },
  offeneVerstaendnisfrage: { Icon: HelpCircle, color: '#ffb74d' },
  offeneSchreibaufgabe: { Icon: PenLine, color: '#ba68c8' },
  markieraufgabe: { Icon: Highlighter, color: '#4db6ac' },
  wordScramble: { Icon: Shuffle, color: '#9575cd' },
  kategorisierung: { Icon: FolderTree, color: '#7986cb' },
  tabelle: { Icon: Table, color: '#5c6bc0' },
  stiluebung: { Icon: Feather, color: '#f06292' },
  songanalyse: { Icon: Music, color: '#4dd0e1' },
  kreuzwortraetsel: { Icon: Puzzle, color: '#a1887f' },
  wortgitter: { Icon: Grid3x3, color: '#90a4ae' },
  vokabeluebung: { Icon: Pencil, color: '#4caf50' },
  umformung: { Icon: Feather, color: '#9575cd' },
  fehlerkorrektur: { Icon: FileSearch, color: '#ba68c8' },
  quellenanalyse: { Icon: FileSearch, color: '#8d6e63' },
  timeline: { Icon: CalendarDays, color: '#6d4c41' },
  diagrammanalyse: { Icon: Table, color: '#546e7a' },
  roleplay: { Icon: Users, color: '#ff8a65' },
  rollenkartenSet: { Icon: Layers, color: '#ff7043' },
};

/** Gruppe, in der ein Blocktyp in der Hilfe und im Baukasten steht. Aus der
 *  Liste hier generiert, damit neue Typen nicht von Hand in drei Listen
 *  nachgetragen werden müssen. */
export type BlockTypGruppe =
  | 'geschlossen'
  | 'offen'
  | 'sprachrichtigkeit'
  | 'sprechhandlung'
  | 'sachfach';

export const BLOCK_TYP_GRUPPEN: { id: BlockTypGruppe; label: string; hinweis: string }[] = [
  { id: 'geschlossen', label: 'Geschlossen', hinweis: 'Die Antwort steht in der Aufgabe — gut für schnelles Kontrollieren und Selbsteinschätzung.' },
  { id: 'offen', label: 'Offen', hinweis: 'Die Schülerinnen und Schüler formulieren selbst — hier greift die Textkorrektur.' },
  { id: 'sprachrichtigkeit', label: 'Sprachrichtigkeit', hinweis: 'Rechtschreibung, Grammatik, Zeichensetzung.' },
  { id: 'sprechhandlung', label: 'Sprechhandlung', hinweis: 'Kommunikative Situationen zum Üben von Sprechen.' },
  { id: 'sachfach', label: 'Sachfach', hinweis: 'Für Geschichte und andere Sachfächer; Belege stammen aus dem Material.' },
];

/** Nur die Metadaten ohne UI — Icon und Farbe kommen in BLOCK_TYPE_DEFS dazu. */
const BLOCK_TYP_META: { id: Block['typ']; gruppe: BlockTypGruppe; minuten: [number, number] }[] = [
  { id: 'lueckentext', gruppe: 'geschlossen', minuten: [5, 8] },
  { id: 'matching', gruppe: 'geschlossen', minuten: [4, 6] },
  { id: 'multipleChoice', gruppe: 'geschlossen', minuten: [3, 5] },
  { id: 'offeneVerstaendnisfrage', gruppe: 'offen', minuten: [8, 12] },
  { id: 'offeneSchreibaufgabe', gruppe: 'offen', minuten: [20, 30] },
  { id: 'markieraufgabe', gruppe: 'offen', minuten: [4, 7] },
  { id: 'wordScramble', gruppe: 'geschlossen', minuten: [3, 5] },
  { id: 'kategorisierung', gruppe: 'geschlossen', minuten: [5, 8] },
  { id: 'tabelle', gruppe: 'geschlossen', minuten: [6, 10] },
  { id: 'stiluebung', gruppe: 'offen', minuten: [8, 12] },
  { id: 'songanalyse', gruppe: 'offen', minuten: [10, 15] },
  { id: 'kreuzwortraetsel', gruppe: 'geschlossen', minuten: [8, 12] },
  { id: 'wortgitter', gruppe: 'geschlossen', minuten: [6, 10] },
  { id: 'vokabeluebung', gruppe: 'geschlossen', minuten: [5, 8] },
  { id: 'fehlerkorrektur', gruppe: 'sprachrichtigkeit', minuten: [6, 10] },
  { id: 'quellenanalyse', gruppe: 'sachfach', minuten: [12, 18] },
  { id: 'timeline', gruppe: 'sachfach', minuten: [8, 12] },
  { id: 'diagrammanalyse', gruppe: 'sachfach', minuten: [10, 15] },
  { id: 'roleplay', gruppe: 'sprechhandlung', minuten: [8, 12] },
  { id: 'rollenkartenSet', gruppe: 'sprechhandlung', minuten: [8, 15] },
];

export const BLOCK_TYPE_DEFS: {
  id: Block['typ']; label: string; description: string; Icon: LucideIcon; color: string;
  gruppe: BlockTypGruppe;
  minuten: [number, number];
}[] = BLOCK_TYP_META.map((meta) => {
  const def = BLOCK_TYP_ICON_COLOR[meta.id];
  return {
    id: meta.id,
    label: BLOCK_TYP_LABEL[meta.id],
    description: BLOCK_TYP_DESCRIPTION[meta.id],
    Icon: def.Icon,
    color: def.color,
    gruppe: meta.gruppe,
    minuten: meta.minuten,
  };
});

export const STUFE_RULES = {
  oberstufe: {
    allowedBlockTypes: [
      'lueckentext', 'matching', 'multipleChoice',
      'offeneVerstaendnisfrage', 'offeneSchreibaufgabe', 'markieraufgabe',
      'wordScramble', 'kategorisierung', 'tabelle', 'stiluebung', 'songanalyse',
      'kreuzwortraetsel', 'wortgitter', 'vokabeluebung',
      'fehlerkorrektur', 'quellenanalyse', 'timeline', 'diagrammanalyse', 'roleplay', 'rollenkartenSet',
    ] as const,
    wortbankAllowed: true,
  },
  unterstufe: {
    allowedBlockTypes: [
      'lueckentext', 'matching', 'multipleChoice',
      'offeneVerstaendnisfrage', 'markieraufgabe',
      'wordScramble', 'kategorisierung', 'tabelle',
      'kreuzwortraetsel', 'wortgitter', 'vokabeluebung',
      'fehlerkorrektur', 'quellenanalyse', 'timeline', 'diagrammanalyse', 'roleplay', 'rollenkartenSet',
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
    datum: heuteIso(),
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
  { id: 'deepseek' as const, label: 'DeepSeek', models: ['DeepSeek V4.1 Flash', 'DeepSeek V4 Pro'] },
  { id: 'mistral' as const, label: 'Mistral', models: ['Mistral Medium 3.5', 'Mistral Small 4'] },
  { id: 'qwen' as const, label: 'Qwen (Alibaba)', models: ['Qwen 3.7 Max', 'Qwen 3.5 Plus'] },
  { id: 'kimi' as const, label: 'Kimi (Moonshot)', models: ['Kimi K3', 'Kimi K2.6'] },
];

/**
 * Mappt die UI-Provider-ID (llmProvider) auf die Runtime-/Keychain-Provider-ID.
 * Schlüssel werden unter diesen IDs gespeichert/geladen — beim Prüfen exakt dasselbe
 * Mapping verwenden (sonst falsch-negative „Kein Key"-Warnungen, z. B. chatgpt → openai).
 * Claude nutzt runtime-seitig `anthropic`; Legacy-Key-Lookup liegt in providerSetup.ts.
 */
export const PROVIDER_KEY_IDS: Record<string, string> = {
  claude: 'anthropic',
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
  matura: [240, 270],
};

