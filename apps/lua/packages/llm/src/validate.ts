import {
  ABITUR_DEUTSCH_AUFGABENARTEN,
  ABITUR_DEUTSCH_UMFANG_MINDEST,
  DocumentSchema,
  SRDP_DEUTSCH_EINZELAUFGABE_UMFANG,
  SRDP_DEUTSCH_TEXTSORTEN,
  type DocumentV1,
  type QuellText,
} from '@lehrunterlagen/schema';
import { normalizeDocument } from './normalize.js';
import { transformToSchema } from './transform.js';
import { uebernehmenAusgabeTexte } from './ausgabeText.js';
import { runQualityChecks, type QualityIssue, type LlmJudgeResult } from './quality.js';
import type { ChatMessage } from './types.js';

export interface ValidationResult {
  ok: boolean;
  document?: DocumentV1;
  fehler?: string;
  qualityIssues?: QualityIssue[];
  judge?: LlmJudgeResult;
  /**
   * Quelltext-IDs, deren vom Modell gelieferte Aufbereitung verworfen wurde,
   * weil sie den Originalwortlaut verletzt (oder HTML/Fragmente enthielt).
   * Das Dokument bleibt gueltig und druckt in diesem Fall den Originalinhalt.
   */
  verworfeneAusgabeTexte?: string[];
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function validateSrdpDeutschTraining(document: DocumentV1): string | undefined {
  // land = DE nutzt das Abitur-Pendant (validateAbiturDeutschTraining).
  if (document.meta.typ !== 'matura' || document.meta.fach !== 'deutsch' || document.meta.stufe !== 'oberstufe' || document.meta.land === 'DE') return undefined;
  if (document.bloecke.length !== 1 || document.bloecke[0]?.typ !== 'offeneSchreibaufgabe') {
    return 'SRDP-Deutsch-Training erwartet genau einen Block vom Typ offeneSchreibaufgabe.';
  }

  const block = document.bloecke[0];
  if (!block || block.typ !== 'offeneSchreibaufgabe') return 'SRDP-Deutsch-Training: Schreibaufgabe fehlt.';
  if (!SRDP_DEUTSCH_TEXTSORTEN.includes(block.config.textsorte as (typeof SRDP_DEUTSCH_TEXTSORTEN)[number])) {
    return `SRDP-Deutsch-Training: Textsorte muss eine der kuratierten SRDP-Textsorten sein (${SRDP_DEUTSCH_TEXTSORTEN.join(', ')}).`;
  }
  if (
    block.config.umfangWorte.min !== SRDP_DEUTSCH_EINZELAUFGABE_UMFANG.min
    || block.config.umfangWorte.max !== SRDP_DEUTSCH_EINZELAUFGABE_UMFANG.max
  ) {
    return `SRDP-Deutsch-Training: Wortumfang muss ${SRDP_DEUTSCH_EINZELAUFGABE_UMFANG.min}–${SRDP_DEUTSCH_EINZELAUFGABE_UMFANG.max} Wörter betragen.`;
  }
  if (!block.quelleId || !document.quelltexte.some((q) => q.id === block.quelleId)) {
    return 'SRDP-Deutsch-Training: Die Schreibaufgabe muss auf genau eine vorhandene Textbeilage verweisen.';
  }

  // Tolerantes Matching: Modelle variieren die Labels („Schreibhandlungen"
  // statt „Schreibhandlung(en)", „Wortwahl/Ausdruck", „Orthographie") —
  // geprüft wird deshalb ein normalisierter Kernbegriff je Subkriterium,
  // nicht der wörtliche Label-String.
  const subkriterien: Record<keyof typeof block.loesung.erwartungshorizont, readonly { label: string; kern: string }[]> = {
    inhalt: [
      { label: 'Schreibhandlung(en)', kern: 'schreibhandlung' },
      { label: 'Arbeitsaufträge', kern: 'arbeitsauftr' },
      { label: 'Textbeilage(n)', kern: 'textbeilage' },
      { label: 'Sachliche Richtigkeit', kern: 'sachlich' },
      { label: 'Qualität der Auseinandersetzung', kern: 'auseinandersetzung' },
    ],
    struktur: [
      { label: 'Kohärenz', kern: 'kohärenz' },
      { label: 'Bezugnahme auf Textbeilage(n)', kern: 'bezugnahme' },
      { label: 'Kohäsionsmittel', kern: 'kohäsion' },
    ],
    ausdruck: [
      { label: 'Situationsadäquatheit', kern: 'situationsadäquat' },
      { label: 'Wortwahl / Ausdruck', kern: 'wortwahl' },
      { label: 'Satzstrukturen', kern: 'satzstruktur' },
      { label: 'Eigenständigkeit', kern: 'eigenständig' },
    ],
    sprachrichtigkeit: [
      { label: 'Orthografie', kern: 'orthogra' },
      { label: 'Zeichensetzung', kern: 'zeichensetzung' },
      { label: 'Grammatik', kern: 'grammatik' },
    ],
  };
  for (const [dimension, kriterien] of Object.entries(subkriterien) as [keyof typeof subkriterien, readonly { label: string; kern: string }[]][]) {
    const erwartung = block.loesung.erwartungshorizont[dimension].toLowerCase();
    const fehlend = kriterien.filter((k) => !erwartung.includes(k.kern)).map((k) => k.label);
    if (fehlend.length > 0) {
      return `SRDP-Deutsch-Training: Im Erwartungshorizont-Feld "${dimension}" fehlen die Subkriterien: ${fehlend.join(', ')}. Jedes Subkriterium muss namentlich mit einem konkreten Erwartungssatz vorkommen.`;
    }
  }
  return undefined;
}

function validateAbiturDeutschTraining(document: DocumentV1): string | undefined {
  if (document.meta.typ !== 'matura' || document.meta.fach !== 'deutsch' || document.meta.stufe !== 'oberstufe' || document.meta.land !== 'DE') return undefined;
  if (document.bloecke.length !== 1 || document.bloecke[0]?.typ !== 'offeneSchreibaufgabe') {
    return 'Abitur-Deutsch-Training erwartet genau einen Block vom Typ offeneSchreibaufgabe.';
  }

  const block = document.bloecke[0];
  if (!block || block.typ !== 'offeneSchreibaufgabe') return 'Abitur-Deutsch-Training: Schreibaufgabe fehlt.';

  // Aufgabenart tolerant matchen (Modelle variieren Wortlaut/Umlaute) —
  // der Kernbegriff einer der sechs KMK-Aufgabenarten muss vorkommen.
  const aufgabenartKerne = ['interpretation', 'analyse', 'erörterung', 'eroerterung', 'materialgestützt', 'materialgestuetzt'];
  const textsorte = block.config.textsorte.toLowerCase();
  if (!aufgabenartKerne.some((kern) => textsorte.includes(kern))) {
    return `Abitur-Deutsch-Training: config.textsorte muss eine der KMK-Aufgabenarten sein (${ABITUR_DEUTSCH_AUFGABENARTEN.join(', ')}).`;
  }
  if (block.config.umfangWorte.min < ABITUR_DEUTSCH_UMFANG_MINDEST) {
    return `Abitur-Deutsch-Training: umfangWorte.min muss mindestens ${ABITUR_DEUTSCH_UMFANG_MINDEST} Wörter betragen — ein Abitur-Schreibauftrag ist kein Kurztext.`;
  }
  if (!block.quelleId || !document.quelltexte.some((q) => q.id === block.quelleId)) {
    return 'Abitur-Deutsch-Training: Die Schreibaufgabe muss auf genau eine vorhandene Textbeilage verweisen.';
  }

  // Erwartungshorizont: inhalt muss die Anforderungsbereiche explizit staffeln.
  // Tolerant: "AFB" oder "Anforderungsbereich" plus die Stufe III (I und II sind
  // in jeder ernsthaften Staffelung enthalten; Bereichs-Notation "AFB I–III" bleibt gültig).
  const inhalt = block.loesung.erwartungshorizont.inhalt.toLowerCase();
  const nenntAfb = /(afb|anforderungsbereich)/.test(inhalt);
  const nenntStufeDrei = /\biii\b|\b3\b/.test(inhalt);
  if (!nenntAfb || !nenntStufeDrei) {
    return 'Abitur-Deutsch-Training: Das Erwartungshorizont-Feld "inhalt" muss die Verstehensleistung den Anforderungsbereichen zuordnen (AFB I, AFB II, AFB III namentlich, je Arbeitsauftrag ein konkreter Erwartungssatz).';
  }
  return undefined;
}

function validateIbGermanLiterature(document: DocumentV1): string | undefined {
  const assessment = document.meta.ibAssessment;
  if (assessment?.programme !== 'ib-dp' || assessment.course !== 'german-a-literature') return undefined;

  const tasks = document.bloecke;
  const writingTasks = tasks.filter((block) => block.typ === 'offeneSchreibaufgabe');
  if (writingTasks.length !== tasks.length) return 'IB German A: Literature erwartet ausschließlich Schreibaufgaben.';
  const expectedTotalMarks = assessment.assessmentComponent === 'paper1'
    ? assessment.level === 'sl' ? 20 : 40
    : assessment.assessmentComponent === 'paper2' ? 25
      : assessment.assessmentComponent === 'individual-oral' ? 40 : 20;
  const criteria = assessment.assessmentCriteria ?? [];
  if (criteria.length === 0
    || new Set(criteria.map((criterion) => criterion.id)).size !== criteria.length
    || criteria.reduce((sum, criterion) => sum + criterion.maxMarks, 0) !== expectedTotalMarks) {
    return `${assessment.assessmentComponent}: IB-Kriterien müssen eindeutige IDs haben und zusammen genau ${expectedTotalMarks} Rohpunkte ergeben.`;
  }

  const requireTasks = (count: number, component: string): string | undefined => tasks.length === count
    ? undefined
    : `${component}: erwartet genau ${count} Schreibaufgabe(n), erhalten: ${tasks.length}.`;
  const allSourcesMatch = writingTasks.every((block, index) => (
    block.typ === 'offeneSchreibaufgabe'
    && block.quelleId === document.quelltexte[index]?.id
  ));
  const correctMarks = (marks: number) => writingTasks.every((block) => block.punkte === marks);

  if (assessment.assessmentComponent === 'paper1') {
    const countError = requireTasks(2, 'Paper 1');
    if (countError) return countError;
    if (document.quelltexte.length !== 2 || !allSourcesMatch) {
      return 'Paper 1: Beide Analysen müssen eindeutig auf je einen der zwei bereitgestellten Texte verweisen.';
    }
    if (assessment.paper1LiteraryForms?.length !== 2 || assessment.paper1LiteraryForms[0] === assessment.paper1LiteraryForms[1]) {
      return 'Paper 1: Die beiden Textoptionen müssen unterschiedliche literarische Formen abbilden.';
    }
    if (assessment.level === 'sl') {
      if (!correctMarks(20)) return 'Paper 1 SL: Jede Wahloption muss mit 20 Rohpunkten bewertet werden.';
      const options = writingTasks.map((block) => block.typ === 'offeneSchreibaufgabe' ? block.config.ibChoiceGroup : undefined);
      if (options.some((option) => !option || option.id !== 'paper1-sl-choice' || option.totalOptions !== 2 || option.totalMaxMarks !== 20)
        || options[0]?.option !== 'A' || options[1]?.option !== 'B') {
        return 'Paper 1 SL: Beide Texte müssen als Wahloption A/B derselben Auswahlgruppe gekennzeichnet sein; insgesamt gilt maximal 20 Rohpunkte.';
      }
    } else if (!correctMarks(20) || writingTasks.some((block) => block.typ === 'offeneSchreibaufgabe' && block.config.ibChoiceGroup)) {
      return 'Paper 1 HL: Beide verpflichtenden Analysen müssen je 20 Rohpunkte haben und dürfen nicht als Wahloption markiert sein.';
    }
    return undefined;
  }

  if (assessment.assessmentComponent === 'paper2') {
    const countError = requireTasks(1, 'Paper 2');
    if (countError) return countError;
    const task = writingTasks[0];
    if (!task || task.typ !== 'offeneSchreibaufgabe' || task.punkte !== 25) return 'Paper 2: Die einzelne Schreibaufgabe muss 25 Rohpunkte haben.';
    const questions = task.config.ibPaper2Questions;
    if (!questions || questions.length !== 4 || new Set(questions.map((question) => question.trim().toLocaleLowerCase())).size !== 4) {
      return 'Paper 2: Es müssen genau vier unterschiedliche Essayfragen strukturiert enthalten sein.';
    }
    const works = assessment.selectedWorks ?? [];
    if (works.length !== 2 || new Set(works.map((work) => work.author.trim().toLocaleLowerCase())).size !== 2) {
      return 'Paper 2: Die Aufgabe muss genau zwei Werke unterschiedlicher Autor:innen verwenden.';
    }
    const taskText = [task.arbeitsanweisung, task.config.situation, ...questions].join(' ').toLocaleLowerCase();
    if (!/(vergleich|kontrast|gegenueberstell|gegenüberstell)/.test(taskText)) {
      return 'Paper 2: Die Aufgabenanweisung muss den Vergleich oder Kontrast der beiden Werke ausdrücklich verlangen.';
    }
    if (works.some((work) => !taskText.includes(work.title.trim().toLocaleLowerCase()))) {
      return 'Paper 2: Beide ausgewählten Werktitel müssen in der Aufgabenanweisung oder den vier Essayfragen vorkommen.';
    }
    return undefined;
  }

  if (assessment.assessmentComponent === 'individual-oral') {
    const countError = requireTasks(1, 'Individual Oral');
    if (countError) return countError;
    const works = assessment.selectedWorks ?? [];
    if (!correctMarks(40) || document.quelltexte.length !== 2 || !assessment.globalIssue?.trim()
      || works.length !== 2
      || !works.some((work) => ['de', 'deu', 'ger', 'german', 'deutsch'].includes(work.originalLanguage.trim().toLowerCase()))
      || !works.some((work) => !['de', 'deu', 'ger', 'german', 'deutsch'].includes(work.originalLanguage.trim().toLowerCase()))) {
      return 'Individual Oral: erwartet eine Aufgabe mit 40 Rohpunkten, einem Global Issue und zwei Auszügen.';
    }
    const oralTask = writingTasks[0];
    const oralText = oralTask?.typ === 'offeneSchreibaufgabe'
      ? [oralTask.arbeitsanweisung, oralTask.config.situation, ...oralTask.config.aspekte].join(' ').toLocaleLowerCase()
      : '';
    if (works.some((work) => !oralText.includes(work.title.trim().toLocaleLowerCase()))
      || !oralText.includes(assessment.globalIssue.trim().toLocaleLowerCase())) {
      return 'Individual Oral: Global Issue und beide Werke müssen in der Aufgabenstellung eindeutig benannt sein.';
    }
    if (/\b(vergleiche|vergleich|kontrast|gegenueberstell|gegenüberstell)\b/i.test(oralText)) {
      return 'Individual Oral: Die beiden Werke dürfen nicht als Vergleichsaufgabe formuliert werden.';
    }
    return undefined;
  }

  const countError = requireTasks(1, 'HL Essay');
  if (countError) return countError;
  const essay = writingTasks[0];
  if (assessment.level !== 'hl' || !essay || essay.typ !== 'offeneSchreibaufgabe' || essay.punkte !== 20) {
    return 'HL Essay: nur für HL und mit genau einer Aufgabe zu 20 Rohpunkten.';
  }
  const works = assessment.selectedWorks ?? [];
  if (essay.config.umfangWorte.min !== 1200 || essay.config.umfangWorte.max !== 1500 || !assessment.lineOfInquiry?.trim()
    || works.length !== 1) {
    return 'HL Essay: Umfang muss exakt 1.200–1.500 Wörter betragen und eine Line of Inquiry voraussetzen.';
  }
  const coachingText = `${essay.arbeitsanweisung} ${essay.config.situation} ${essay.config.aspekte.join(' ')}`.toLocaleLowerCase();
  if (!coachingText.includes(works[0]!.title.trim().toLocaleLowerCase())) {
    return 'HL Essay: Das ausgewählte Werk muss in der Aufgabenstellung genannt sein.';
  }
  const coachingWords = essay.loesung.musterloesung.trim().split(/\s+/).filter(Boolean).length;
  if (!/(coaching|planung|gliederung|ueberarbeit|überarbeit|line of inquiry)/.test(coachingText) || coachingWords > 900) {
    return 'HL Essay: Ausgabe muss ein kurzes Coaching-Gerüst sein, kein ausformulierter oder einreichbarer Essay.';
  }
  return undefined;
}

// Holt das JSON-Objekt aus der Modellantwort heraus, auch wenn versehentlich
// Markdown-Zaeune oder Begleittext mitgeliefert wurden.
export function extractJson(raw: string): string {
  let s = raw.trim();
  // ```json ... ``` oder ``` ... ``` entfernen
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) s = fence[1].trim();

  // Unterstuetze beide Formate:
  // 1. Array (nur bloecke) — suche erstes [ bis letztes ]
  // 2. Objekt (volles Dokument) — suche erstes { bis letztes }
  const firstBrace = s.indexOf('{');
  const firstBracket = s.indexOf('[');
  const lastBrace = s.lastIndexOf('}');
  const lastBracket = s.lastIndexOf(']');

  const hasObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
  const hasArray = firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;

  if (hasArray && hasObject) {
    // Beides vorhanden — waehle das, was zuerst kommt
    if (firstBracket < firstBrace) {
      s = s.slice(firstBracket, lastBracket + 1);
    } else {
      s = s.slice(firstBrace, lastBrace + 1);
    }
  } else if (hasArray) {
    s = s.slice(firstBracket, lastBracket + 1);
  } else if (hasObject) {
    s = s.slice(firstBrace, lastBrace + 1);
  }

  return s;
}

export async function parseAndValidate(
  raw: string,
  meta?: any,
  quelltexte?: any[],
  judgeCfg?: { provider: string; model?: string; apiKey?: string; enabled?: boolean },
  complete?: (messages: ChatMessage[]) => Promise<string>,
  // Aufgeloeste Stoff-Items (Kompetenz-Modus) — Kontext für den Kompetenz-Judge.
  stoffItems?: { titel: string }[],
): Promise<ValidationResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (e) {
    return { ok: false, fehler: `JSON nicht parsebar: ${(e as Error).message}` };
  }

  // Das Modell liefert nur INHALTE (bloecke). meta/quelltexte/schemaVersion sind
  // Hoheit des Aufrufers (Lehrer-Eingabe) — niemals aus der Modellantwort uebernehmen,
  // sonst ueberschreiben halluzinierte Werte (Klasse, Thema, Quelltext) die echten.
  let bloecke: unknown;
  if (Array.isArray(parsed)) {
    bloecke = parsed;
  } else if (isObject(parsed)) {
    // Volles Dokument zurueckgegeben: nur die bloecke herausziehen.
    bloecke = Array.isArray(parsed.bloecke) ? parsed.bloecke : undefined;
  }

  if (bloecke === undefined) {
    return { ok: false, fehler: 'Ungueltiges Format: weder bloecke-Array noch Objekt mit bloecke erhalten.' };
  }

  // Optionaler didaktischer Rahmen (Kompetenz-Modus): liefert das Modell zusaetzlich
  // zu bloecke ein "didaktik"-Objekt (Titel, Einleitung, Merkkasten, Transferaufgabe),
  // wird es uebernommen — meta bleibt unveraendert Hoheit des Aufrufers.
  const didaktik = isObject(parsed) && isObject(parsed.didaktik) ? parsed.didaktik : undefined;

  let docCandidate: unknown;
  if (meta && quelltexte) {
    docCandidate = { schemaVersion: '0.1.0', meta, quelltexte, bloecke, ...(didaktik ? { didaktik } : {}) };
  } else if (isObject(parsed)) {
    // Kein meta/quelltexte vom Aufrufer (z.B. Tests): vorhandenes Dokument nutzen,
    // aber schemaVersion erzwingen, falls das Modell sie ausgelassen hat.
    docCandidate = { schemaVersion: '0.1.0', ...parsed };
  } else {
    return { ok: false, fehler: 'Nur bloecke-Array erhalten, aber meta/quelltexte fehlen zum Zusammensetzen.' };
  }

  const transformed = transformToSchema(docCandidate);
  const normalized = normalizeDocument(transformed);

  const result = DocumentSchema.safeParse(normalized);
  if (!result.success) {
    const fehler = result.error.issues
      .map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    return { ok: false, fehler };
  }

  const document = result.data;

  const ibFehler = validateIbGermanLiterature(document);
  if (ibFehler) return { ok: false, fehler: ibFehler };

  // Quelltext-Aufbereitung (meta.quelltextFormatieren): Uebernommen wird AUSSCHLIESSLICH
  // das Feld "ausgabeText" der Modellantwort, geprueft gegen den Originalinhalt
  // (uebernehmenAusgabeTexte). id/titel/inhalt/herkunft bleiben die des Aufrufers —
  // die Kommentar-Invariante oben (Z. 174-176) gilt unveraendert fort.
  const verworfeneQuelltexte: string[] = [];
  if (quelltexte && document.meta.quelltextFormatieren === true) {
    const uebernahme = uebernehmenAusgabeTexte(quelltexte as QuellText[], (parsed as { quelltexte?: unknown })?.quelltexte);
    document.quelltexte = uebernahme.quelltexte;
    verworfeneQuelltexte.push(...uebernahme.verworfen);
  }

  const srdpFehler = validateSrdpDeutschTraining(document);
  if (srdpFehler) return { ok: false, fehler: srdpFehler };

  const abiturFehler = validateAbiturDeutschTraining(document);
  if (abiturFehler) return { ok: false, fehler: abiturFehler };

  // Umformung ist im Kompetenz-Modus nicht mehr erlaubt (sinnentleerte Transformationen).
  if (document.meta.modus === 'kompetenz' && document.bloecke.some((b) => b.typ === 'umformung')) {
    return { ok: false, fehler: 'Blocktyp "umformung" ist im Kompetenz-Modus nicht mehr erlaubt.' };
  }
  if (!quelltexte) {
    return {
      ok: true,
      document,
      qualityIssues: [],
      judge: { score: 1, issues: [] },
      ...(verworfeneQuelltexte.length > 0 ? { verworfeneAusgabeTexte: verworfeneQuelltexte } : {}),
    };
  }

  // Qualitaetspruefung weiterhin gegen die ORIGINALINHALTE (unveraenderte
  // `quelltexte` des Aufrufers) — die Formatierung darf die
  // Abdeckungs-/Laengenpruefung nicht verfaelschen.
  const { issues: qualityIssues, judge } = await runQualityChecks(
    document,
    quelltexte as QuellText[],
    stoffItems ? { ...meta, stoffItems } : meta,
    judgeCfg,
    complete,
  );
  const errors = qualityIssues.filter((i) => i.severity === 'error');
  if (errors.length > 0) {
    const fehler = errors.map((i) => `- ${i.blockId}: ${i.message}`).join('\n');
    return {
      ok: false,
      fehler,
      qualityIssues,
      judge,
      ...(verworfeneQuelltexte.length > 0 ? { verworfeneAusgabeTexte: verworfeneQuelltexte } : {}),
    };
  }

  return {
    ok: true,
    document,
    qualityIssues,
    judge,
    ...(verworfeneQuelltexte.length > 0 ? { verworfeneAusgabeTexte: verworfeneQuelltexte } : {}),
  };
}
