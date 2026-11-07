import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RubricMarkdown } from './RubricMarkdown';

const render = (source: string) => renderToStaticMarkup(<RubricMarkdown source={source} />);
describe('Formatierte Rasteransicht', () => {
  it('zeigt Überschriften, Tabellen und Aufgabenlisten ohne Markdown-Zeichen', () => {
    const html = render('<!-- luka-rubrik\nfach: deutsch\n-->\n# Mein Raster\n\n**Wichtig**\n\n| Stufe | Beschreibung |\n|---|---|\n| 1 | prüfen |\n\n- [x] Gelesen\n- [ ] Überarbeiten');
    expect(html).toContain('<h1>Mein Raster</h1>');
    expect(html).toContain('<strong>Wichtig</strong>');
    expect(html).toContain('<table>');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('luka-rubrik');
    expect(html).not.toContain('fach: deutsch');
  });
  it('führt kein HTML aus und lädt keine entfernten Bilder', () => {
    const html = render('<script>alert(1)</script>\n\n![Beilage](https://example.com/tracking.png)\n\n[Link](javascript:alert%281%29)');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('https://example.com');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('[Bild: Beilage]');
  });
  it('öffnet normale Links getrennt und erhält Sonderzeichen', () => {
    const html = render('[Österreich](https://example.org)\n\n> Äußerungen prüfen – groß');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('Äußerungen');
  });
});
