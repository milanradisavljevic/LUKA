/**
 * Reine, deterministische Such- + Fuzzy-Matching-Logik für die globale
 * Befehls-/Such-Palette (kein UI, keine Side-Effects, keine schweren Deps).
 *
 * Die Quellen (Dokumente/Vorlagen/Pool/Klassen/Navigation/Befehle) werden von
 * der App-Seite in strukturell kompatible Objekte überführt; dieses Modul kennt
 * keine konkreten Persistenz-Typen und zieht auch keine UI-Abhängigkeiten
 * (lucide & Co.) → isoliert testbar.
 */
import type { AppAction, ActiveView } from './types';

// ---------------------------------------------------------------------------
// Öffentliche Typen
// ---------------------------------------------------------------------------

export type SearchKind =
  | 'command'
  | 'document'
  | 'template'
  | 'pool'
  | 'klasse'
  | 'navigation';

/**
 * Was bei Enter passiert. Bewusst eine über die Spec hinausgehende, aber
 * treue Obermenge von „AppAction(s) | ActiveView-Ziel | Befehl-Callback-Key":
 * `paletteCommand` = Befehl-Callback-Key (wird vom App-Executor gelöst),
 * `view` = ActiveView-Ziel, `actions` = AppAction(s); plus konkrete
 * Komfort-Varianten, die nur eine id tragen — die App löst die Daten aus dem
 * Cache auf (Index bleibt leicht, da keine Snapshots gespeichert werden).
 */
export type SearchAction =
  | { type: 'actions'; actions: AppAction | AppAction[] }
  | { type: 'view'; view: ActiveView }
  | { type: 'paletteCommand'; commandId: string }
  | { type: 'openDocument'; docId: string }
  | { type: 'loadTemplate'; templateId: string }
  | { type: 'insertPoolBlock'; poolId: string };

export interface SearchResult {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  keywords: string[];
  /** wird von searchIndex gesetzt; aus buildSearchIndex ist es 0. */
  score: number;
  action: SearchAction;
  /** ISO-String für den Rezenz-Tie-Break (optional). */
  recency?: string;
}

export type SearchIndex = SearchResult[];

// --- Quellen-Formen (strukturell kompatibel zu den echten App-Typen) --------

export interface SearchDocumentSource {
  id: string;
  title: string;
  updatedAt?: string;
  meta?: { thema?: string; fach?: string; stufe?: string; klasse?: string } | null;
}
export interface SearchTemplateSource {
  id: string;
  name: string;
  savedAt?: string;
  meta?: { fach?: string; stufe?: string } | null;
}
export interface SearchPoolSource {
  id: string;
  fach?: string;
  stufe?: string;
  thema?: string | null;
  aufgabentyp?: string;
  /** JSON-Array-String oder kommagetrennt — wird geparsed. */
  tags?: string | null;
  createdAt?: string;
}
export interface SearchKlasseSource {
  klasse: string;
  anzahlAbgaben?: number;
}
export interface SearchNavTarget {
  view: ActiveView;
  label: string;
  description?: string;
}
export interface SearchCommandSource {
  id: string;
  label: string;
  description?: string;
  action: SearchAction;
}
export interface SearchSources {
  documents?: SearchDocumentSource[];
  templates?: SearchTemplateSource[];
  pool?: SearchPoolSource[];
  klassen?: SearchKlasseSource[];
  navigation?: SearchNavTarget[];
  commands?: SearchCommandSource[];
}

export interface SearchSection {
  kind: SearchKind;
  label: string;
  items: SearchResult[];
}

// ---------------------------------------------------------------------------
// Konsistente Reihenfolge + Sektions-Labels
// ---------------------------------------------------------------------------

export const SECTION_ORDER: SearchKind[] = [
  'command',
  'document',
  'template',
  'pool',
  'klasse',
  'navigation',
];

export const SECTION_LABELS: Record<SearchKind, string> = {
  command: 'Befehle',
  document: 'Unterlagen',
  template: 'Vorlagen',
  pool: 'Aufgaben-Pool',
  klasse: 'Klassen',
  navigation: 'Gehe zu …',
};

/** Tie-Break: niedriger Wert = höherer Vorrang. */
const KIND_PRIORITY: Record<SearchKind, number> = {
  command: 0,
  document: 1,
  template: 2,
  pool: 3,
  klasse: 4,
  navigation: 5,
};

// ---------------------------------------------------------------------------
// Normalisierung (case- + umlaut-insensitiv)
// ---------------------------------------------------------------------------

/** Kleinschreibung + Umlaut-Expansion (ä→ae, ö→oe, ü→ue, ß→ss). */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

// ---------------------------------------------------------------------------
// Kleine, selbstenthaltene Label-Helfer (keine UI-Abhängigkeit)
// ---------------------------------------------------------------------------

const FACH_LABEL: Record<string, string> = {
  deutsch: 'Deutsch',
  englisch: 'Englisch',
};
export function fachLabel(fach?: string): string {
  return (fach && FACH_LABEL[fach]) || fach || '';
}

const STUFE_LABEL: Record<string, string> = {
  oberstufe: 'Oberstufe',
  unterstufe: 'Unterstufe',
};
export function stufeLabel(stufe?: string): string {
  return (stufe && STUFE_LABEL[stufe]) || stufe || '';
}

export const BLOCK_TYPE_LABEL: Record<string, string> = {
  lueckentext: 'Lückentext',
  matching: 'Matching',
  multipleChoice: 'Multiple Choice',
  offeneVerstaendnisfrage: 'Verständnisfrage',
  offeneSchreibaufgabe: 'Schreibaufgabe',
  markieraufgabe: 'Markieraufgabe',
  wordScramble: 'Wörter ordnen',
  kategorisierung: 'Kategorisierung',
  tabelle: 'Tabelle',
  stiluebung: 'Stilübung',
  songanalyse: 'Songanalyse',
  kreuzwortraetsel: 'Kreuzworträtsel',
  wortgitter: 'Wortgitter',
  vokabeluebung: 'Vokabelübung',
  fehlerkorrektur: 'Fehlerkorrektur',
  roleplay: 'Rollenspiel',
  rollenkartenSet: 'Rollenkarten-Set',
};
export function blockTypeLabel(typ?: string): string {
  return (typ && BLOCK_TYPE_LABEL[typ]) || typ || '';
}

/** Pool-Tags: JSON-Array-String oder kommagetrennt → string[]. */
export function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    /* fallback: kommagetrennt */
  }
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const TIER_EXACT = 10000;
const TIER_PREFIX = 5000;
const TIER_SUBSTRING = 2000;
const TIER_SUBSEQUENCE = 500;
const TITLE_BONUS = 1000;
const POSITION_WEIGHT = 200;
const LENGTH_PENALTY = 1; // leichter Tie-Break: kürzere Treffer bevorzugt

/** Ist `q` eine Subsequence von `hay` (Reihenfolge erhalten, nicht benachbart)? */
export function isSubsequence(q: string, hay: string): boolean {
  if (!q) return true;
  let i = 0;
  for (let j = 0; j < hay.length && i < q.length; j++) {
    if (q[i] === hay[j]) i++;
  }
  return i === q.length;
}

interface HaystackScore {
  score: number;
  matched: boolean;
}

/**
 * Bewertet einen einzelnen (normalisierten) Heuhaufen-String gegen den Query.
 * Tiers: exact > prefix > substring > subsequence. Frühe Trefferposition gibt
 * einen Bonus, lange Heuhaufen einen leichten Abzug (Tie-Break).
 */
function scoreHaystack(hay: string, q: string, isTitle: boolean): HaystackScore {
  if (!q) return { score: 0, matched: false };
  if (!hay) return { score: 0, matched: false };

  const bonus = isTitle ? TITLE_BONUS : 0;
  const lengthPenalty = hay.length * LENGTH_PENALTY;

  if (hay === q) {
    return { score: TIER_EXACT + bonus - lengthPenalty, matched: true };
  }
  const prefixIdx = hay.indexOf(q);
  if (prefixIdx === 0) {
    const pos = Math.round((1 - 0 / Math.max(hay.length, 1)) * POSITION_WEIGHT);
    return { score: TIER_PREFIX + bonus + pos - lengthPenalty, matched: true };
  }
  const subIdx = hay.indexOf(q);
  if (subIdx >= 0) {
    const pos = Math.round((1 - subIdx / Math.max(hay.length, 1)) * POSITION_WEIGHT);
    return { score: TIER_SUBSTRING + bonus + pos - lengthPenalty, matched: true };
  }
  if (isSubsequence(q, hay)) {
    return { score: TIER_SUBSEQUENCE + bonus - lengthPenalty, matched: true };
  }
  return { score: 0, matched: false };
}

/** Höchster Score über Titel + alle Keywords. 0 = kein Treffer. */
export function scoreEntry(entry: SearchResult, qNorm: string): number {
  if (!qNorm) return 0;
  let best = 0;
  const titleScore = scoreHaystack(normalize(entry.title), qNorm, true);
  if (titleScore.matched) best = titleScore.score;
  for (const kw of entry.keywords) {
    const s = scoreHaystack(normalize(kw), qNorm, false);
    if (s.matched && s.score > best) best = s.score;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Index-Bau
// ---------------------------------------------------------------------------

function pushUnique(keywords: string[], value: string | undefined | null): void {
  if (!value) return;
  const v = value.trim();
  if (v && !keywords.includes(v)) keywords.push(v);
}

/**
 * Baut eine flache, durchsuchbare Liste aus den Quellen. Leere/fehlende Quellen
 * werden übersprungen (kein Crash). Reihenfolge ist deterministisch
 * (Dokumente → Vorlagen → Pool → Klassen → Navigation → Befehle).
 */
export function buildSearchIndex(sources: SearchSources): SearchIndex {
  const index: SearchResult[] = [];

  for (const d of sources.documents ?? []) {
    const meta = d.meta ?? {};
    const keywords: string[] = [];
    pushUnique(keywords, d.title);
    pushUnique(keywords, meta.thema);
    pushUnique(keywords, meta.fach);
    pushUnique(keywords, fachLabel(meta.fach));
    pushUnique(keywords, meta.stufe);
    pushUnique(keywords, stufeLabel(meta.stufe));
    pushUnique(keywords, meta.klasse);
    index.push({
      id: `doc:${d.id}`,
      kind: 'document',
      title: d.title || 'Unbenannt',
      subtitle: [fachLabel(meta.fach), stufeLabel(meta.stufe), meta.klasse]
        .filter(Boolean)
        .join(' · ') || undefined,
      keywords,
      score: 0,
      recency: d.updatedAt,
      action: { type: 'openDocument', docId: d.id },
    });
  }

  for (const t of sources.templates ?? []) {
    const meta = t.meta ?? {};
    const keywords: string[] = [];
    pushUnique(keywords, t.name);
    pushUnique(keywords, meta.fach);
    pushUnique(keywords, fachLabel(meta.fach));
    pushUnique(keywords, meta.stufe);
    pushUnique(keywords, stufeLabel(meta.stufe));
    index.push({
      id: `tpl:${t.id}`,
      kind: 'template',
      title: t.name || 'Unbenannte Vorlage',
      subtitle: [fachLabel(meta.fach), stufeLabel(meta.stufe)].filter(Boolean).join(' · ') || undefined,
      keywords,
      score: 0,
      recency: t.savedAt,
      action: { type: 'loadTemplate', templateId: t.id },
    });
  }

  for (const p of sources.pool ?? []) {
    const tags = parseTags(p.tags);
    const keywords: string[] = [];
    pushUnique(keywords, p.thema);
    for (const tag of tags) pushUnique(keywords, tag);
    pushUnique(keywords, p.aufgabentyp);
    pushUnique(keywords, blockTypeLabel(p.aufgabentyp));
    pushUnique(keywords, p.fach);
    pushUnique(keywords, fachLabel(p.fach));
    pushUnique(keywords, p.stufe);
    pushUnique(keywords, stufeLabel(p.stufe));
    const subtitle = [
      fachLabel(p.fach),
      stufeLabel(p.stufe),
      blockTypeLabel(p.aufgabentyp),
    ]
      .filter(Boolean)
      .join(' · ');
    index.push({
      id: `pool:${p.id}`,
      kind: 'pool',
      title: p.thema || 'Ohne Titel',
      subtitle: subtitle || undefined,
      keywords,
      score: 0,
      recency: p.createdAt,
      action: { type: 'insertPoolBlock', poolId: p.id },
    });
  }

  for (const k of sources.klassen ?? []) {
    index.push({
      id: `klasse:${k.klasse}`,
      kind: 'klasse',
      title: k.klasse,
      subtitle:
        typeof k.anzahlAbgaben === 'number'
          ? `${k.anzahlAbgaben} ${k.anzahlAbgaben === 1 ? 'Abgabe' : 'Abgaben'}`
          : undefined,
      keywords: [k.klasse],
      score: 0,
      action: { type: 'view', view: 'klassen' },
    });
  }

  for (const n of sources.navigation ?? []) {
    const keywords: string[] = [n.label];
    pushUnique(keywords, n.description);
    index.push({
      id: `nav:${n.view}`,
      kind: 'navigation',
      title: n.label,
      subtitle: n.description,
      keywords,
      score: 0,
      action: { type: 'view', view: n.view },
    });
  }

  for (const c of sources.commands ?? []) {
    const keywords: string[] = [c.label];
    pushUnique(keywords, c.description);
    pushUnique(keywords, c.id);
    index.push({
      id: `cmd:${c.id}`,
      kind: 'command',
      title: c.label,
      subtitle: c.description,
      keywords,
      score: 0,
      action: c.action,
    });
  }

  return index;
}

// ---------------------------------------------------------------------------
// Sortierung + Default-Ergebnisse
// ---------------------------------------------------------------------------

function recencyOf(r: SearchResult): string {
  return r.recency ?? '';
}

/** Deterministische Vergleichsfunktion: Score → Rezenz → Art-Prio → Titel. */
function compareResults(a: SearchResult, b: SearchResult): number {
  if (a.score !== b.score) return b.score - a.score;
  const ra = recencyOf(a);
  const rb = recencyOf(b);
  if (ra !== rb) return ra < rb ? 1 : -1;
  const pa = KIND_PRIORITY[a.kind];
  const pb = KIND_PRIORITY[b.kind];
  if (pa !== pb) return pa - pb;
  return a.title.localeCompare(b.title, 'de');
}

const PREFERRED_DEFAULT_COMMANDS = ['new', 'export', 'nav-next', 'nav-back'];

/**
 * Leerer Query → sinnvolle Defaults: zuletzt bearbeitete Unterlagen +
 * Top-Befehle + letzte Vorlagen + Klassen + wichtige Navigationsziele.
 * Deterministisch, gedeckelt.
 */
export function defaultResults(index: SearchIndex): SearchResult[] {
  const byKind = (kind: SearchKind) => index.filter((r) => r.kind === kind);

  const docs = byKind('document')
    .slice()
    .sort((a, b) => recencyOf(b).localeCompare(recencyOf(a)))
    .slice(0, 4);

  const commandsAll = byKind('command');
  const preferred = PREFERRED_DEFAULT_COMMANDS
    .map((id) => commandsAll.find((c) => c.id === `cmd:${id}`))
    .filter((c): c is SearchResult => Boolean(c));
  const commands = [
    ...preferred,
    ...commandsAll.filter((c) => !preferred.includes(c)),
  ].slice(0, 4);

  const templates = byKind('template')
    .slice()
    .sort((a, b) => recencyOf(b).localeCompare(recencyOf(a)))
    .slice(0, 2);

  const klassen = byKind('klasse')
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, 'de'))
    .slice(0, 2);

  const nav = byKind('navigation')
    .filter((n) => n.id === 'nav:dashboard' || n.id === 'nav:documents' || n.id === 'nav:pool')
    .slice(0, 2);

  return [...commands, ...docs, ...templates, ...klassen, ...nav].slice(0, 14);
}

const QUERY_RESULT_CAP = 30;

/**
 * Durchsucht den Index. Leerer Query → Defaults. Sonst: Score-basiertes
 * Fuzzy-Matching (exact > prefix > substring > subsequence), deterministisch
 * sortiert und gedeckelt. Alle Rückgaben sind NEUE Objekte (score gesetzt).
 */
export function searchIndex(index: SearchIndex, query: string): SearchResult[] {
  const qNorm = normalize(query.trim());
  if (!qNorm) return defaultResults(index);

  const scored: SearchResult[] = [];
  for (const entry of index) {
    const score = scoreEntry(entry, qNorm);
    if (score > 0) scored.push({ ...entry, score });
  }
  scored.sort(compareResults);
  return scored.slice(0, QUERY_RESULT_CAP);
}

/**
 * Gruppiert eine Ergebnisliste in Sektionen fester Reihenfolge
 * (Befehle / Unterlagen / Vorlagen / Aufgaben-Pool / Klassen / Gehe zu …).
 * Leere Sektionen entfallen. Deterministisch.
 */
export function groupResults(results: SearchResult[]): SearchSection[] {
  const sections: SearchSection[] = [];
  for (const kind of SECTION_ORDER) {
    const items = results.filter((r) => r.kind === kind);
    if (items.length > 0) {
      sections.push({ kind, label: SECTION_LABELS[kind], items });
    }
  }
  return sections;
}
