import {
  buildSkelett,
  type Auftrag,
  type Block,
  type IBAssessmentContext,
  type IBExamSession,
  type IBLiteratureForm,
  type IBLiteratureWork,
  type Land,
  type Meta,
} from '@lehrunterlagen/schema';

export type IbProgrammeYear = 'coursewide' | 'dp1' | 'dp2';
export type IbPracticeMode = 'guided' | 'standard' | 'timed';
export type IbLiteratureLevel = 'sl' | 'hl';
export type IbLiteratureComponent = IBAssessmentContext['assessmentComponent'];

export const IB_LITERATURE_SYLLABUS_VERSION = 'first-assessment-2026';
export const IB_LITERATURE_COMPONENTS: IbLiteratureComponent[] = [
  'paper1', 'paper2', 'individual-oral', 'hl-essay',
];

export const IB_LITERATURE_REQUIREMENTS = {
  sl: { translatedPrl: 2, originalPrl: 3, freeChoice: 2, total: 7 },
  hl: { translatedPrl: 3, originalPrl: 4, freeChoice: 3, total: 10 },
} as const;

export interface IbLiteratureDraftConfig {
  level: IbLiteratureLevel;
  programmeYear: IbProgrammeYear;
  examSession?: IBExamSession;
  assessmentComponent: IbLiteratureComponent;
  practiceMode: IbPracticeMode;
  guidingQuestion?: string;
  selectedWorks?: IBLiteratureWork[];
  globalIssue?: string;
  lineOfInquiry?: string;
  paper1LiteraryForms?: [IBLiteratureForm, IBLiteratureForm];
  land?: Land;
  datum: string;
}

export interface IbLiteratureDraft {
  auftrag: Auftrag;
  meta: Meta;
  bloecke: Block[];
}

export function ibComponentLabel(component: IbLiteratureComponent): string {
  switch (component) {
    case 'paper1': return 'Paper 1 · Guided literary analysis';
    case 'paper2': return 'Paper 2 · Comparative essay';
    case 'individual-oral': return 'Individual Oral';
    case 'hl-essay': return 'HL Essay';
  }
}

export function ibComponentMinutes(level: IbLiteratureLevel, component: IbLiteratureComponent): number | undefined {
  if (component === 'paper1') return level === 'sl' ? 75 : 135;
  if (component === 'paper2') return 105;
  if (component === 'individual-oral') return 15;
  return undefined;
}

export function ibComponentRawMarks(level: IbLiteratureLevel, component: IbLiteratureComponent): number {
  if (component === 'paper1') return level === 'sl' ? 20 : 40;
  if (component === 'paper2') return 25;
  if (component === 'individual-oral') return 40;
  return 20;
}

export function ibAssessmentCriteria(level: IbLiteratureLevel, component: IbLiteratureComponent) {
  if (component === 'paper1') {
    const perText = [
    { id: 'A', label: 'Verständnis und Interpretation', maxMarks: 5 },
    { id: 'B', label: 'Analyse und Evaluation', maxMarks: 5 },
    { id: 'C', label: 'Fokus und Organisation', maxMarks: 5 },
    { id: 'D', label: 'Sprache', maxMarks: 5 },
    ];
    return level === 'sl'
      ? perText
      : [...perText.map((criterion) => ({ ...criterion, id: `Text 1 · ${criterion.id}` })),
        ...perText.map((criterion) => ({ ...criterion, id: `Text 2 · ${criterion.id}` }))];
  }
  if (component === 'paper2') return [
    { id: 'A', label: 'Kenntnis, Verständnis und Interpretation', maxMarks: 5 },
    { id: 'B1', label: 'Analyse und Evaluation', maxMarks: 5 },
    { id: 'B2', label: 'Vergleich und Kontrast', maxMarks: 5 },
    { id: 'C', label: 'Fokus und Organisation', maxMarks: 5 },
    { id: 'D', label: 'Sprache', maxMarks: 5 },
  ];
  if (component === 'individual-oral') return [
    { id: 'A', label: 'Kenntnis, Verständnis und Interpretation', maxMarks: 10 },
    { id: 'B', label: 'Analyse und Evaluation', maxMarks: 10 },
    { id: 'C', label: 'Fokus und Organisation', maxMarks: 10 },
    { id: 'D', label: 'Sprache', maxMarks: 10 },
  ];
  return [
    { id: 'A', label: 'Kenntnis, Verständnis und Interpretation', maxMarks: 5 },
    { id: 'B', label: 'Analyse und Evaluation', maxMarks: 5 },
    { id: 'C', label: 'Fokus und Entwicklung', maxMarks: 5 },
    { id: 'D', label: 'Sprache', maxMarks: 5 },
  ];
}

/**
 * Baut einen frischen German A: Literature-Entwurf. Der Kurskontext wird sowohl
 * in der Meta als auch in jedem Dokument-Snapshot gespeichert, damit spätere
 * Änderungen an der lokalen Werkeliste alte Unterlagen nicht umdeuten.
 */
export function createIbLiteratureDraft(config: IbLiteratureDraftConfig): IbLiteratureDraft {
  const componentLabel = ibComponentLabel(config.assessmentComponent);
  const thema = `IB German A: Literature · ${config.level.toUpperCase()} · ${componentLabel}`;
  const writingTaskCount = config.assessmentComponent === 'paper1' ? 2 : 1;
  const pointsPerTask = config.assessmentComponent === 'paper1' && config.level === 'hl'
    ? 20
    : ibComponentRawMarks(config.level, config.assessmentComponent);

  const auftrag: Auftrag = {
    typ: 'schuluebung',
    fach: 'deutsch',
    stufe: 'oberstufe',
    land: config.land,
    thema,
    datum: config.datum,
    quelltexte: [],
    schwierigkeit: 'schwer',
    gewuenschteAufgabenarten: ['offeneSchreibaufgabe'],
    gesamtpunkteZiel: config.assessmentComponent === 'paper1' && config.level === 'sl'
      ? pointsPerTask
      : pointsPerTask * writingTaskCount,
    modus: 'text',
  };

  const skeleton = buildSkelett(auftrag).find((block) => block.typ === 'offeneSchreibaufgabe');
  if (!skeleton || skeleton.typ !== 'offeneSchreibaufgabe') {
    throw new Error('Der IB-Entwurf benötigt einen Schreibaufgaben-Block.');
  }
  const bloecke: Block[] = Array.from({ length: writingTaskCount }, (_, index) => ({
    ...skeleton,
    ...(config.assessmentComponent === 'hl-essay'
      ? { config: { ...skeleton.config, umfangWorte: { min: 1200, max: 1500 } } }
      : {}),
    id: `ib-${config.assessmentComponent}-${index + 1}`,
    punkte: pointsPerTask,
    quelleId: config.assessmentComponent === 'paper1' ? `q${index + 1}` : undefined,
  }));

  const assessment: IBAssessmentContext = {
    programme: 'ib-dp',
    course: 'german-a-literature',
    language: 'de',
    level: config.level,
    programmeYear: config.programmeYear,
    ...(config.examSession ? { examSession: config.examSession } : {}),
    assessmentComponent: config.assessmentComponent,
    syllabusVersion: IB_LITERATURE_SYLLABUS_VERSION,
    practiceMode: config.practiceMode,
    ...(config.guidingQuestion?.trim() ? { guidingQuestion: config.guidingQuestion.trim() } : {}),
    ...(config.selectedWorks?.length ? { selectedWorks: config.selectedWorks } : {}),
    ...(config.paper1LiteraryForms ? { paper1LiteraryForms: config.paper1LiteraryForms } : {}),
    assessmentCriteria: ibAssessmentCriteria(config.level, config.assessmentComponent),
    ...(config.globalIssue?.trim() ? { globalIssue: config.globalIssue.trim() } : {}),
    ...(config.lineOfInquiry?.trim() ? { lineOfInquiry: config.lineOfInquiry.trim() } : {}),
  };

  const meta: Meta = {
    stufe: 'oberstufe',
    fach: 'deutsch',
    land: config.land,
    thema,
    datum: config.datum,
    klasse: '',
    notizen: '',
    typ: 'schuluebung',
    punkteAusblenden: false,
    schwierigkeit: 'schwer',
    modus: 'text',
    rahmenwerk: 'ib-dp',
    bewertungsschema: undefined,
    ibAssessment: assessment,
  };

  return { auftrag, meta, bloecke };
}
