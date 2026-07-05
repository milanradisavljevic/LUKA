import type { DocumentV1, QuellText, Block } from '@lehrunterlagen/schema';
import type { ChatMessage } from './types.js';
import { runJudge, runKompetenzJudge } from './judge.js';

export interface QualityIssue {
  blockId: string;
  severity: 'warning' | 'error';
  message: string;
}

export interface LlmJudgeResult {
  score: number;
  issues: string[];
}

// ---------------------------------------------------------------------------
// Stoppwoerter (DE + EN), die beim Grounding-Check ignoriert werden.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set<string>([
  // Deutsch
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'einem',
  'und', 'oder', 'aber', 'sondern', 'denn', 'weil', 'wenn', 'als', 'ob',
  'ist', 'sind', 'war', 'waren', 'sein', 'seine', 'ihre', 'ihr', 'ihm', 'ihnen',
  'ich', 'du', 'er', 'sie', 'es', 'wir',
  'mich', 'dich', 'sich', 'uns', 'euch',
  'mit', 'ohne', 'fuer', 'gegen', 'ueber', 'unter', 'durch', 'von', 'aus', 'bei',
  'nach', 'vor', 'seit', 'bis', 'waehrend', 'wegen', 'statt', 'trotz',
  'in', 'an', 'auf', 'um', 'zu', 'bei',
  'auch', 'noch', 'schon', 'mehr', 'weniger', 'sehr', 'ganz', 'etwa', 'etwas',
  'nicht', 'kein', 'keine', 'keiner', 'keinem', 'keinen', 'nichts', 'niemand',
  'haben', 'hat', 'hatte', 'hatten', 'wird', 'werden', 'wurde', 'wurden',
  'kann', 'koennen', 'konnte', 'konnten', 'muss', 'mussen', 'musste', 'mussten',
  'soll', 'sollen', 'sollte', 'sollten', 'will', 'wollen', 'wollte', 'wollten',
  'mag', 'moegen', 'mochte', 'darf', 'duerfen', 'durfte', 'durften',
  'dieser', 'diese', 'dieses', 'jener', 'jene', 'jenes',
  'welcher', 'welche', 'welches', 'was', 'wer', 'wem', 'wen', 'wessen',
  'hier', 'da', 'dort', 'dann', 'jetzt', 'heute', 'morgen', 'gestern',
  'so', 'wie', 'wieso', 'warum', 'weshalb', 'weswegen',
  'alle', 'alles', 'jeder', 'jede', 'jedes', 'manche', 'mancher', 'manches',
  'viele', 'viel', 'wenige', 'wenig', 'mehrere',
  'beim', 'am', 'im', 'zum', 'zur', 'vom', 'ans',
  'mal', 'eben', 'nun', 'ja', 'nein',
  'einen', 'einem', 'einer', 'eines',
  // Englisch
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'for', 'nor', 'yet',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'done',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'this', 'that', 'these', 'those',
  'in', 'on', 'at', 'by', 'to', 'from', 'of', 'with', 'without', 'about', 'as',
  'into', 'over', 'under', 'between', 'through', 'during', 'before', 'after',
  'above', 'below', 'up', 'down', 'out', 'off', 'onto',
  'not', 'no', 'nor',
  'if', 'then', 'else', 'when', 'while', 'where', 'why', 'how', 'what', 'who', 'whom', 'whose',
  'all', 'any', 'some', 'many', 'few', 'most', 'several', 'each', 'every',
  'here', 'there', 'now', 'then', 'today', 'tomorrow', 'yesterday',
  'also', 'too', 'very', 'much', 'more', 'less', 'just', 'only', 'even', 'still', 'already',
  'because', 'since', 'though', 'although', 'until', 'unless',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
]);

// Mindestlaenge, ab der ein Token als inhaltlich gewertet wird.
const MIN_CONTENT_TOKEN = 4;

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function isContentToken(t: string): boolean {
  return t.length >= MIN_CONTENT_TOKEN && !STOPWORDS.has(t);
}

function buildQuelltextIndex(quelltexte: QuellText[]): Set<string> {
  const idx = new Set<string>();
  for (const q of quelltexte) {
    for (const t of tokenize(q.inhalt)) {
      idx.add(t);
    }
    for (const t of tokenize(q.titel)) {
      idx.add(t);
    }
  }
  return idx;
}

function hashString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// ---------------------------------------------------------------------------
// 1) Grounding-Spotcheck (Loesungs-Felder)
// ---------------------------------------------------------------------------

interface LoesungsText {
  text: string;
  // 'verbatim'   = muss wortwoertlich aus dem Quelltext stammen (Lueckenwort, Markierstelle)
  // 'paraphrase' = Synthese/Umformulierung erlaubt (Musterantwort) -> nur grobe Pruefung
  mode: 'verbatim' | 'paraphrase';
}

function collectLoesungsTexte(block: Block): LoesungsText[] {
  const parts: LoesungsText[] = [];

  if (block.typ === 'lueckentext') {
    for (const l of block.loesung.luecken) {
      if (l.wort.trim()) parts.push({ text: l.wort, mode: 'verbatim' });
    }
  } else if (block.typ === 'offeneVerstaendnisfrage') {
    for (const antwort of Object.values(block.loesung.antworten)) {
      if (antwort && antwort.trim()) parts.push({ text: antwort, mode: 'paraphrase' });
    }
  } else if (block.typ === 'markieraufgabe') {
    for (const stelle of block.loesung.stellen) {
      if (stelle.trim()) parts.push({ text: stelle, mode: 'verbatim' });
    }
  }
  // offeneSchreibaufgabe.musterloesung: BEWUSST ausgenommen. Ein Schueleraufsatz ist
  // Synthese, keine Extraktion — ein Grounding-Check gegen den Quelltext erzeugt nur
  // Fehlalarme (Audit 2026-06).
  // multipleChoice und matching: Loesung enthaelt nur Keys (A, B, C, ...), keine Inhaltstexte.

  return parts;
}

// Anteil ungegruendeter Inhaltstokens, ab dem eine Paraphrase als nicht quellengestuetzt gilt.
const PARAPHRASE_MAX_UNGROUNDED_RATIO = 0.6;

export function checkGrounding(doc: DocumentV1, quelltexte: QuellText[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const index = buildQuelltextIndex(quelltexte);

  for (const block of doc.bloecke) {
    for (const { text, mode } of collectLoesungsTexte(block)) {
      const normalized = normalizeText(text);
      if (normalized.length < MIN_CONTENT_TOKEN) continue;

      // Einzelwort (Lueckenwort): muss als Token im Quelltext vorkommen.
      if (mode === 'verbatim' && !text.includes(' ')) {
        if (!normalized.split(/\s+/).some((tok) => index.has(tok))) {
          issues.push({
            blockId: block.id,
            severity: 'warning',
            message: `Loesung "${text}" nicht in Quelltexten gefunden (Grounding-Verletzung).`,
          });
        }
        continue;
      }

      const uniqueContent = [...new Set(tokenize(text).filter(isContentToken))];
      if (uniqueContent.length === 0) continue;
      const ungrounded = uniqueContent.filter((t) => !index.has(t));
      if (ungrounded.length === 0) continue;
      const sample = ungrounded.slice(0, 3).map((t) => `"${t}"`).join(', ');

      if (mode === 'verbatim') {
        // Markierstelle: soll wortwoertlich sein -> jedes ungegruendete Token ist verdaechtig.
        issues.push({
          blockId: block.id,
          severity: 'warning',
          message: `Markierstelle nicht wortwoertlich im Quelltext: ${sample}.`,
        });
      } else {
        // Paraphrase (Musterantwort): nur warnen, wenn der GROSSTEIL ungegruendet ist.
        const ratio = ungrounded.length / uniqueContent.length;
        if (ratio > PARAPHRASE_MAX_UNGROUNDED_RATIO) {
          issues.push({
            blockId: block.id,
            severity: 'warning',
            message: `Musterantwort kaum quellengestuetzt (${Math.round(ratio * 100)}% ungegruendet): ${sample}.`,
          });
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 2) Dubletten-Check (textlich identische Optionen)
// ---------------------------------------------------------------------------

export function checkDuplicates(doc: DocumentV1): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const block of doc.bloecke) {
    if (block.typ === 'multipleChoice' && block.config?.fragen) {
      for (const frage of block.config.fragen) {
        const hashes = new Map<string, string>();
        for (const option of frage.optionen) {
          const h = hashString(normalizeText(option.text));
          if (hashes.has(h)) {
            issues.push({
              blockId: block.id,
              severity: 'error',
              message: `MC-Frage ${frage.nr}: Option ${option.key} ist textlich identisch mit Option ${hashes.get(h)}.`,
            });
          } else {
            hashes.set(h, option.key);
          }
        }
      }
    }

    if (block.typ === 'matching' && block.config?.optionen) {
      const hashes = new Map<string, string>();
      for (const option of block.config.optionen) {
        const h = hashString(normalizeText(option.text));
        if (hashes.has(h)) {
          issues.push({
            blockId: block.id,
            severity: 'error',
            message: `Matching: Option ${option.key} ist textlich identisch mit Option ${hashes.get(h)}.`,
          });
        } else {
          hashes.set(h, option.key);
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 3) Dubletten-Check ueber Bloecke hinweg (dieselbe Frage mehrfach gestellt)
// ---------------------------------------------------------------------------

export function checkDuplicateQuestions(doc: DocumentV1): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const seen = new Map<string, string>(); // hash -> erste blockId

  for (const block of doc.bloecke) {
    const fragen: string[] = [];
    if (block.typ === 'multipleChoice') {
      fragen.push(...block.config.fragen.map((f) => f.frage));
    } else if (block.typ === 'offeneVerstaendnisfrage') {
      fragen.push(...block.config.fragen.map((f) => f.frage));
    }

    for (const frage of fragen) {
      const norm = normalizeText(frage);
      if (norm.length < MIN_CONTENT_TOKEN) continue;
      const h = hashString(norm);
      const erst = seen.get(h);
      if (erst) {
        issues.push({
          blockId: block.id,
          severity: 'warning',
          message: `Frage "${frage}" ist eine Dublette (zuerst in Block ${erst}).`,
        });
      } else {
        seen.set(h, block.id);
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 4) Schreibaufgabe — Laengen- und Grounding-Check
// ---------------------------------------------------------------------------

const SCHRIFTLICH_MAX_LENGENTOLERANZ = 0.30;
const SCHRIFTLICH_MAX_UNGROUNDED_RATIO = 0.70;

export function checkSchreibaufgabe(doc: DocumentV1, quelltexte: QuellText[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const index = buildQuelltextIndex(quelltexte);

  for (const block of doc.bloecke) {
    if (block.typ !== 'offeneSchreibaufgabe') continue;

    const cfg = block.config;
    const loesung = block.loesung;
    if (!cfg || !loesung) continue;

    // 1) Laengencheck
    const min = cfg.umfangWorte?.min;
    const max = cfg.umfangWorte?.max;
    const muster = loesung.musterloesung ?? '';
    const wortzahl = tokenize(muster).length;

    if (min != null && max != null && wortzahl > 0) {
      const mitte = (min + max) / 2;
      const toleranz = mitte * SCHRIFTLICH_MAX_LENGENTOLERANZ;
      if (wortzahl < mitte - toleranz || wortzahl > mitte + toleranz) {
        const richtung = wortzahl < mitte ? 'kuerzer' : 'laenger';
        issues.push({
          blockId: block.id,
          severity: 'warning',
          message: `Schreibaufgabe: Die Musterloesung ist mit ${wortzahl} Woertern deutlich ${richtung} als der Schreibumfang, den die Schueler erreichen sollen (${min}–${max} Woerter, eingestellt im Schritt „Aufgabenbloecke"). Entweder die Musterloesung anpassen oder den Wortumfang der Aufgabe aendern — oder ignorieren, falls bewusst so gewollt.`,
        });
      }
    }

    // 2) Weicher Grounding-Check (Musterloesung ist Paraphrase — darf kreativ sein,
    //    aber komplett themenfremd sollte geflaggt werden)
    const uniqueContent = [...new Set(tokenize(muster).filter(isContentToken))];
    if (uniqueContent.length > 0) {
      const ungrounded = uniqueContent.filter((t) => !index.has(t));
      const ratio = ungrounded.length / uniqueContent.length;
      if (ratio > SCHRIFTLICH_MAX_UNGROUNDED_RATIO) {
        const sample = ungrounded.slice(0, 3).map((t) => `"${t}"`).join(', ');
        issues.push({
          blockId: block.id,
          severity: 'warning',
          message: `Musterloesung kaum quellengestuetzt (${Math.round(ratio * 100)}% fremde Begriffe: ${sample}).`,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 5) Lernziel-Coverage (WARNING, nie error)
// ---------------------------------------------------------------------------

export function checkLernzielCoverage(doc: DocumentV1, meta: { lernziele?: string[] }): QualityIssue[] {
  const ziele = meta.lernziele ?? [];
  if (ziele.length === 0) return [];

  const abgedeckt = new Set<string>();
  for (const block of doc.bloecke) {
    for (const z of block.lernziele ?? []) {
      abgedeckt.add(z);
    }
  }

  const fehlend = ziele.filter((z) => !abgedeckt.has(z));
  if (fehlend.length === 0) return [];

  return [{
    blockId: doc.bloecke[0]?.id ?? 'global',
    severity: 'warning',
    message: `Lernziele nicht abgedeckt: ${fehlend.join(', ')}. Aufgaben erweitern oder Lernziele anpassen.`,
  }];
}

// ---------------------------------------------------------------------------
// 6) LLM-Judge-Hook (Stub fuer spaetere Anbindung)
// ---------------------------------------------------------------------------

/**
 * Hook fuer einen spaeteren LLM-as-judge.
 *
 * V1: liefert immer {score:1, issues:[]}. Kein API-Aufruf.
 *
 * Beispielhafte spaetere Anbindung:
 *   const provider = getProvider(cfg.provider);
 *   const raw = await provider.complete(buildJudgeMessages(doc), cfg);
 *   const parsed = JSON.parse(extractJson(raw));
 *   return { score: parsed.score ?? 0, issues: parsed.issues ?? [] };
 */
export async function llmJudgeHook(
  doc: DocumentV1,
  quelltexte: QuellText[],
  cfg?: { provider: string; model?: string; apiKey?: string; enabled?: boolean },
  complete?: (messages: ChatMessage[]) => Promise<string>,
): Promise<LlmJudgeResult> {
  if (cfg?.enabled === false || !complete) {
    return { score: 1, issues: [] };
  }
  const issues = await runJudge(doc, quelltexte, complete);
  const score = issues.length === 0 ? 1 : Math.max(0, 1 - issues.length * 0.2);
  return { score, issues: issues.map((i) => i.message) };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface QualityCheckResult {
  issues: QualityIssue[];
  judge: LlmJudgeResult;
}

export async function runQualityChecks(
  doc: DocumentV1,
  quelltexte: QuellText[],
  meta?: {
    lernziele?: string[];
    modus?: 'text' | 'kompetenz';
    kompetenzNiveau?: string;
    fach?: string;
    /** Aufgeloeste Stoff-Items (für den Kompetenz-Judge-Kontext). */
    stoffItems?: { titel: string }[];
  },
  judgeCfg?: { provider: string; model?: string; apiKey?: string; enabled?: boolean },
  complete?: (messages: ChatMessage[]) => Promise<string>,
): Promise<QualityCheckResult> {
  // Kompetenz-Modus: kein Quelltext → Quelltext-Grounding/Schreibaufgaben-Check und der
  // quelltext-bezogene Judge entfallen. Stattdessen grammatik-/inhaltsbewusster Judge.
  if ((meta?.modus ?? 'text') === 'kompetenz') {
    const issues: QualityIssue[] = [
      ...checkDuplicates(doc),
      ...checkDuplicateQuestions(doc),
      ...checkLernzielCoverage(doc, meta ?? {}),
    ];
    let judge: LlmJudgeResult = { score: 1, issues: [] };
    if (judgeCfg?.enabled !== false && complete) {
      const ctx = {
        stoffItemTitel: (meta?.stoffItems ?? []).map((s) => s.titel).join(', ') || undefined,
        niveau: meta?.kompetenzNiveau,
        fach: meta?.fach,
      };
      const judgeIssues = await runKompetenzJudge(doc, ctx, complete);
      // Judge ist ADVISORY: seine Befunde werden als WARNUNGEN gefuehrt und blockieren die
      // Generierung NIE (ein Judge-Fehlalarm darf keine Uebung verwerfen). Der "harte"-Anteil
      // fliesst nur in den informativen Score; die Lehrkraft sieht die Hinweise in der Vorschau.
      const harte = judgeIssues.filter((i) => i.severity === 'error').length;
      issues.push(...judgeIssues.map((i) => ({ ...i, severity: 'warning' as const })));
      judge = {
        score: harte === 0 ? 1 : Math.max(0, 1 - harte * 0.25),
        issues: judgeIssues.map((i) => i.message),
      };
    }
    return { issues, judge };
  }

  const issues = [
    ...checkGrounding(doc, quelltexte),
    ...checkDuplicates(doc),
    ...checkDuplicateQuestions(doc),
    ...checkSchreibaufgabe(doc, quelltexte),
    ...checkLernzielCoverage(doc, meta ?? {}),
  ];
  // Audit A5: umformung/fehlerkorrektur tragen KI-erfundene Musterlösungen auch im
  // Text-Modus (Quelltext-Grounding greift dort nicht). Der Kompetenz-Judge prüft
  // genau diese Blocktypen; ohne solche Blöcke macht er keine Calls. ADVISORY:
  // Befunde werden zu Warnungen herabgestuft und blockieren nie.
  if (judgeCfg?.enabled !== false && complete) {
    const kjIssues = await runKompetenzJudge(doc, { fach: meta?.fach }, complete);
    issues.push(...kjIssues.map((i) => ({ ...i, severity: 'warning' as const })));
  }
  const judge = await llmJudgeHook(doc, quelltexte, judgeCfg, complete);
  return { issues, judge };
}
