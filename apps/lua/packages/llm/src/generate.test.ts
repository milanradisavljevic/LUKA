import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateDocument, getProvider } from './index.js';
import type { GenerateInput } from './types.js';

afterEach(() => vi.restoreAllMocks());

describe('generateDocument — IB structural repair gate', () => {
  it('retries an invalid IB output once and never returns it as a document if still invalid', async () => {
    const input: GenerateInput = {
      meta: {
        stufe: 'oberstufe', fach: 'deutsch', land: 'AT', rahmenwerk: 'ib-dp',
        thema: 'German A Literature Paper 1', datum: '2026-10-02', klasse: 'DP1', notizen: '',
        ibAssessment: {
          programme: 'ib-dp', course: 'german-a-literature', language: 'de', level: 'sl',
          programmeYear: 'dp1', assessmentComponent: 'paper1', syllabusVersion: 'first-assessment-2026',
          paper1LiteraryForms: ['drama', 'poetry'],
          assessmentCriteria: [
            { id: 'A', label: 'Verständnis und Interpretation', maxMarks: 5 },
            { id: 'B', label: 'Analyse und Evaluation', maxMarks: 5 },
            { id: 'C', label: 'Fokus und Organisation', maxMarks: 5 },
            { id: 'D', label: 'Sprache', maxMarks: 5 },
          ],
        },
      },
      quelltexte: [
        { id: 'q1', titel: 'Text eins', inhalt: 'Literarischer Text eins.', herkunft: { typ: 'eingabe', ref: '' } },
        { id: 'q2', titel: 'Text zwei', inhalt: 'Literarischer Text zwei.', herkunft: { typ: 'eingabe', ref: '' } },
      ],
      bloecke: [
        { typ: 'offeneSchreibaufgabe', punkte: 20, quelleId: 'q1', textsorte: 'Analyse', umfangWorte: { min: 250, max: 350 }, aspekte: ['Belege verwenden.'] },
        { typ: 'offeneSchreibaufgabe', punkte: 20, quelleId: 'q2', textsorte: 'Analyse', umfangWorte: { min: 250, max: 350 }, aspekte: ['Belege verwenden.'] },
      ],
    };
    const invalidOutput = JSON.stringify([
      { id: 'a', typ: 'offeneSchreibaufgabe', punkte: 20, quelleId: 'q1', arbeitsanweisung: 'Analysiere.', config: { situation: 'Analyse.', textsorte: 'Analyse', umfangWorte: { min: 250, max: 350 }, aspekte: ['Belege.'] }, loesung: { musterloesung: 'Hinweis.', erwartungshorizont: { inhalt: 'i', struktur: 's', ausdruck: 'a', sprachrichtigkeit: 'r' } } },
      { id: 'b', typ: 'offeneSchreibaufgabe', punkte: 20, quelleId: 'q2', arbeitsanweisung: 'Analysiere.', config: { situation: 'Analyse.', textsorte: 'Analyse', umfangWorte: { min: 250, max: 350 }, aspekte: ['Belege.'] }, loesung: { musterloesung: 'Hinweis.', erwartungshorizont: { inhalt: 'i', struktur: 's', ausdruck: 'a', sprachrichtigkeit: 'r' } } },
    ]);
    const complete = vi.spyOn(getProvider('deepseek'), 'complete').mockResolvedValue(invalidOutput);

    const result = await generateDocument(input, { provider: 'deepseek', apiKey: 'synthetic-test-key' });

    expect(complete).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.versuche).toBe(2);
      expect(result.fehler).toContain('Wahloption A/B');
    }
    expect(complete.mock.calls[1]?.[0].some((message) => message.content.includes('Validierungsfehler'))).toBe(true);
  });

  it('surfaces a Mistral 429 and does not silently retry through DeepSeek', async () => {
    const input: GenerateInput = {
      meta: { stufe: 'oberstufe', fach: 'deutsch', thema: 'Provider-Test', datum: '2026-10-02', klasse: '', notizen: '' },
      quelltexte: [],
      bloecke: [{ typ: 'offeneSchreibaufgabe', punkte: 20, textsorte: 'Analyse', umfangWorte: { min: 250, max: 350 }, aspekte: ['Belege verwenden.'] }],
    };
    const mistral = vi.spyOn(getProvider('mistral'), 'complete').mockRejectedValue(new Error('HTTP 429 Rate limit exceeded'));
    const deepseek = vi.spyOn(getProvider('deepseek'), 'complete').mockResolvedValue('[]');

    await expect(generateDocument(input, { provider: 'mistral', apiKey: 'synthetic-test-key' })).rejects.toThrow('429');
    expect(mistral).toHaveBeenCalledTimes(1);
    expect(deepseek).not.toHaveBeenCalled();
  });
});
