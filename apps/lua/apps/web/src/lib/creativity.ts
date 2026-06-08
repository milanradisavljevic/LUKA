export interface CreativityPreset {
  id: string;
  label: string;
  value: number;
  description: string;
}

export const CREATIVITY_PRESETS: CreativityPreset[] = [
  {
    id: 'praezise',
    label: 'Präzise',
    value: 0.2,
    description: 'Streng am Quelltext, wenig Variation.',
  },
  {
    id: 'ausgewogen',
    label: 'Ausgewogen',
    value: 0.4,
    description: 'Guter Standard für Unterrichtsmaterial.',
  },
  {
    id: 'kreativ',
    label: 'Kreativ',
    value: 0.75,
    description: 'Mehr Variation bei Aufgaben und Formulierungen.',
  },
];

export function getCreativityLabel(value: number): CreativityPreset {
  if (value <= 0.3) return CREATIVITY_PRESETS[0]!;
  if (value >= 0.65) return CREATIVITY_PRESETS[2]!;
  return CREATIVITY_PRESETS[1]!;
}
