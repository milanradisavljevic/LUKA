import { describe, expect, it } from 'vitest';
import {
  createIbLiteratureDraft,
  IB_LITERATURE_REQUIREMENTS,
  ibAssessmentCriteria,
  ibComponentRawMarks,
} from './ibPilot';

const base = {
  level: 'sl' as const,
  programmeYear: 'dp1' as const,
  practiceMode: 'guided' as const,
  datum: '2026-10-01',
};

describe('IB German A: Literature', () => {
  it('bildet die getrennten Werk-Mindestumfänge für SL und HL ab', () => {
    expect(IB_LITERATURE_REQUIREMENTS.sl).toEqual({ translatedPrl: 2, originalPrl: 3, freeChoice: 2, total: 7 });
    expect(IB_LITERATURE_REQUIREMENTS.hl).toEqual({ translatedPrl: 3, originalPrl: 4, freeChoice: 3, total: 10 });
  });

  it('erzeugt SL Paper 1 mit zwei verknüpften Wahloptionen und 20 Rohpunkten insgesamt', () => {
    const draft = createIbLiteratureDraft({ ...base, programmeYear: 'dp1', examSession: { session: 'may', year: 2027 }, assessmentComponent: 'paper1', paper1LiteraryForms: ['prose-fiction', 'poetry'] });
    expect(draft.meta.ibAssessment).toMatchObject({
      course: 'german-a-literature', language: 'de', level: 'sl',
      assessmentComponent: 'paper1', syllabusVersion: 'first-assessment-2026',
      programmeYear: 'dp1', examSession: { session: 'may', year: 2027 },
      paper1LiteraryForms: ['prose-fiction', 'poetry'],
    });
    expect(draft.meta.bewertungsschema).toBeUndefined();
    expect(draft.bloecke).toHaveLength(2);
    expect(draft.bloecke.map((block) => [block.quelleId, block.punkte])).toEqual([['q1', 20], ['q2', 20]]);
    expect(draft.auftrag.gesamtpunkteZiel).toBe(20);
  });

  it('erzeugt HL Paper 1 mit zwei getrennten Analysen zu je 20 Rohpunkten', () => {
    const draft = createIbLiteratureDraft({ ...base, level: 'hl', assessmentComponent: 'paper1', paper1LiteraryForms: ['drama', 'poetry'] });
    expect(draft.bloecke).toHaveLength(2);
    expect(draft.bloecke.map((block) => [block.quelleId, block.punkte])).toEqual([['q1', 20], ['q2', 20]]);
    expect(draft.auftrag.gesamtpunkteZiel).toBe(40);
  });

  it.each([
    ['paper1', 'sl', 20], ['paper1', 'hl', 40], ['paper2', 'sl', 25],
    ['paper2', 'hl', 25], ['individual-oral', 'sl', 40], ['individual-oral', 'hl', 40],
    ['hl-essay', 'hl', 20],
  ] as const)('%s %s hat die passenden Rohpunkte und Kriterien', (component, level, expected) => {
    expect(ibComponentRawMarks(level, component)).toBe(expected);
    expect(ibAssessmentCriteria(level, component).reduce((sum, criterion) => sum + criterion.maxMarks, 0)).toBe(expected);
  });

  it('hinterlegt beim Paper 2 die Vergleichs- und Kontrastdimension als eigene Rohpunktkriterien', () => {
    expect(ibAssessmentCriteria('sl', 'paper2')).toContainEqual({ id: 'B2', label: 'Vergleich und Kontrast', maxMarks: 5 });
  });

  it('führt einen HL Essay als Coaching-Entwurf, nicht als 1-7-Notenraster', () => {
    const draft = createIbLiteratureDraft({ ...base, level: 'hl', assessmentComponent: 'hl-essay', lineOfInquiry: 'Wie verändert die Erzählperspektive die Wirkung des Werks?' });
    expect(draft.meta.ibAssessment?.lineOfInquiry).toContain('Erzählperspektive');
    expect(draft.meta.bewertungsschema).toBeUndefined();
    expect(draft.bloecke[0]?.punkte).toBe(20);
    expect(draft.bloecke[0]).toMatchObject({ config: { umfangWorte: { min: 1200, max: 1500 } } });
  });
});
