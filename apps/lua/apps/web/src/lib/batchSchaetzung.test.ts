import { describe, it, expect } from 'vitest';
import { schaetzeBatch, formatTokenzahl, ANTWORT_TOKENS_PRO_ABGABE } from './batchSchaetzung';

describe('schaetzeBatch (L2, Batch-Mengenschätzung)', () => {
  it('summiert Wortzahlen und rechnet Tokens konservativ hoch', () => {
    const s = schaetzeBatch([
      { woerter: 400 },
      { woerter: 600 },
      { woerter: 500 },
    ]);
    expect(s.dateien).toBe(3);
    expect(s.woerter).toBe(1500);
    expect(s.eingabeTokens).toBe(2250);
    expect(s.antwortTokens).toBe(3 * ANTWORT_TOKENS_PRO_ABGABE);
    expect(s.gesamtTokens).toBe(2250 + 3 * ANTWORT_TOKENS_PRO_ABGABE);
  });

  it('Vision-Dateien zählen nur ins Antwortbudget, nicht in die Wortzahl', () => {
    const s = schaetzeBatch([
      { woerter: 400, visionModus: false },
      { woerter: null, visionModus: true },
    ]);
    expect(s.woerter).toBe(400);
    expect(s.dateien).toBe(2);
  });

  it('ohne Wortzahlen → Tokens null, aber Antwortbudget bleibt sichtbar', () => {
    const s = schaetzeBatch([{ woerter: null, visionModus: true }, {}]);
    expect(s.woerter).toBeNull();
    expect(s.eingabeTokens).toBeNull();
    expect(s.gesamtTokens).toBeNull();
    expect(s.antwortTokens).toBe(2 * ANTWORT_TOKENS_PRO_ABGABE);
  });

  it('leerer Stapel → alles null/0', () => {
    const s = schaetzeBatch([]);
    expect(s.dateien).toBe(0);
    expect(s.gesamtTokens).toBeNull();
    expect(s.antwortTokens).toBe(0);
  });

  it('formatTokenzahl nutzt deutsche Gruppierung', () => {
    expect(formatTokenzahl(62350)).toMatch(/62/);
    expect(formatTokenzahl(62350)).not.toContain(',');
  });
});
