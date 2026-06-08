export type RenderTemplateId = 'klassisch' | 'modern' | 'freundlich' | 'abgefahren';

export interface RenderTemplate {
  id: RenderTemplateId;
  label: string;
  description: string;
  font: string;
  fontSize: { body: number; h1: number; h2: number; h3: number; small: number };
  color: { text: string; gray: string; lightGray: string; accent: string };
  margin: { top: number; bottom: number; left: number; right: number };
  lineHeightMm: number;
  borderWidth: number;
  borderColor: string;
  blockShading?: string;
  headingStyle: 'bold' | 'bold-underline' | 'accent';
}

export const RENDER_TEMPLATES: Record<RenderTemplateId, RenderTemplate> = {
  klassisch: {
    id: 'klassisch',
    label: 'Klassisch',
    description: 'Schlicht, sachlich — für Oberstufe und Matura.',
    font: 'Arial',
    fontSize: { body: 22, h1: 28, h2: 24, h3: 22, small: 18 },
    color: { text: '000000', gray: '595959', lightGray: 'BFBFBF', accent: '000000' },
    margin: { top: 1134, bottom: 1134, left: 1247, right: 1247 },
    lineHeightMm: 9,
    borderWidth: 4,
    borderColor: '000000',
    headingStyle: 'bold',
  },
  modern: {
    id: 'modern',
    label: 'Modern',
    description: 'Klare Akzente, etwas mehr Luft.',
    font: 'Calibri',
    fontSize: { body: 22, h1: 30, h2: 26, h3: 22, small: 18 },
    color: { text: '1a1a1a', gray: '666666', lightGray: 'd9d9d9', accent: '2b579a' },
    margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
    lineHeightMm: 10,
    borderWidth: 6,
    borderColor: '2b579a',
    headingStyle: 'accent',
  },
  freundlich: {
    id: 'freundlich',
    label: 'Freundlich',
    description: 'Warme Farben, etwas verspielter — für Unterstufe.',
    font: 'Verdana',
    fontSize: { body: 24, h1: 30, h2: 26, h3: 24, small: 20 },
    color: { text: '2d2d2d', gray: '5a5a5a', lightGray: 'e8e8e8', accent: 'c45c26' },
    margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
    lineHeightMm: 11,
    borderWidth: 4,
    borderColor: 'c45c26',
    blockShading: 'fff8f0',
    headingStyle: 'bold-underline',
  },
  abgefahren: {
    id: 'abgefahren',
    label: 'Abgefahren',
    description: 'Ubuntu, Neon-Indigo, maximale Präsenz — weil es geht.',
    font: 'Ubuntu',
    fontSize: { body: 24, h1: 34, h2: 28, h3: 24, small: 20 },
    color: { text: '111827', gray: '4b5563', lightGray: 'd1d5db', accent: '6366f1' },
    margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
    lineHeightMm: 12,
    borderWidth: 8,
    borderColor: '6366f1',
    blockShading: 'eef2ff',
    headingStyle: 'accent',
  },
};

export function getDefaultTemplate(stufe?: 'oberstufe' | 'unterstufe'): RenderTemplate {
  return stufe === 'unterstufe' ? RENDER_TEMPLATES.freundlich : RENDER_TEMPLATES.klassisch;
}
