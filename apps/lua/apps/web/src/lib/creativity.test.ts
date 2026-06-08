import { describe, expect, it } from 'vitest';
import { CREATIVITY_PRESETS, getCreativityLabel } from './creativity';

describe('getCreativityLabel', () => {
  it('ordnet Werte den Klartext-Stufen zu', () => {
    expect(getCreativityLabel(0.2).label).toBe('Präzise');
    expect(getCreativityLabel(0.4).label).toBe('Ausgewogen');
    expect(getCreativityLabel(0.75).label).toBe('Kreativ');
  });

  it('stellt die Preset-Werte bereit', () => {
    expect(CREATIVITY_PRESETS.map((preset) => preset.value)).toEqual([0.2, 0.4, 0.75]);
  });
});
