import { describe, it, expect } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { parseHtml, parseHtmlString, parseUrl, InputError, truncateText } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// HTML Fixtures
// ---------------------------------------------------------------------------

const sampleHtml = `<!DOCTYPE html>
<html>
<head><title>Social Media Artikel</title></head>
<body>
  <nav><a href="#">Home</a> | <a href="#">About</a></nav>
  <header><h1>Social Media und Jugendliche</h1></header>
  <main>
    <article>
      <p>Die Nutzung von sozialen Medien hat in den letzten Jahren stark zugenommen.</p>
      <p>Besonders Jugendliche verbringen mehrere Stunden am Tag auf Plattformen.</p>
      <h2>Auswirkungen</h2>
      <p>Forscher stellten fest, dass exzessive Nutzung zu Schlafproblemen fuehren kann.</p>
      <ul>
        <li>Schlafprobleme</li>
        <li>Vergleichsdruck</li>
        <li>Einsamkeit</li>
      </ul>
    </article>
  </main>
  <footer><p>Copyright 2026</p></footer>
  <script>alert('test');</script>
</body>
</html>`;

const fixtureDir = join(__dirname, '__fixtures__');
writeFileSync(join(fixtureDir, 'sample.html'), sampleHtml, 'utf-8');

// ---------------------------------------------------------------------------
// parseHtml
// ---------------------------------------------------------------------------

describe('parseHtml', () => {
  it('extrahiert Text aus einer HTML-Datei', async () => {
    const result = await parseHtml(join(fixtureDir, 'sample.html'));
    expect(result.inhalt).toContain('Die Nutzung von sozialen Medien');
    expect(result.inhalt).toContain('Besonders Jugendliche verbringen');
    expect(result.inhalt).toContain('Auswirkungen');
    expect(result.titel).toBe('Social Media Artikel');
  });

  it('entfernt Boilerplate (nav, footer, script)', async () => {
    const result = await parseHtml(join(fixtureDir, 'sample.html'));
    expect(result.inhalt).not.toContain('Home');
    expect(result.inhalt).not.toContain('About');
    expect(result.inhalt).not.toContain('Copyright');
    expect(result.inhalt).not.toContain('alert');
  });

  it('behaelt Listen-Eintraege', async () => {
    const result = await parseHtml(join(fixtureDir, 'sample.html'));
    expect(result.inhalt).toContain('Schlafprobleme');
    expect(result.inhalt).toContain('Vergleichsdruck');
    expect(result.inhalt).toContain('Einsamkeit');
  });
});

// ---------------------------------------------------------------------------
// parseHtmlString
// ---------------------------------------------------------------------------

describe('parseHtmlString', () => {
  it('verwendet h1 als Titel, wenn kein title vorhanden', () => {
    const html = '<html><body><h1>Mein Titel</h1><p>Text.</p></body></html>';
    const result = parseHtmlString(html, 'fallback');
    expect(result.titel).toBe('Mein Titel');
  });

  it('verwendet fallback-Titel, wenn weder title noch h1 vorhanden', () => {
    const html = '<html><body><p>Nur Text.</p></body></html>';
    const result = parseHtmlString(html, 'fallback');
    expect(result.titel).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// parseUrl
// ---------------------------------------------------------------------------

describe('parseUrl', () => {
  it('ruft example.com erfolgreich ab', async () => {
    const result = await parseUrl('https://example.com');
    expect(result.inhalt.length).toBeGreaterThan(0);
    expect(result.inhalt).toContain('Example');
  });

  it('wirft InputError bei ungueltiger URL', async () => {
    await expect(parseUrl('https://this-domain-definitely-does-not-exist-12345.invalid'))
      .rejects
      .toThrow(InputError);
  });

  it('wirft InputError bei 404', async () => {
    await expect(parseUrl('https://example.com/this-page-does-not-exist-12345'))
      .rejects
      .toThrow(InputError);
  });
});

// ---------------------------------------------------------------------------
// truncateText
// ---------------------------------------------------------------------------

describe('truncateText', () => {
  const longText =
    `Die Nutzung von sozialen Medien hat in den letzten Jahren stark zugenommen. ` +
    `Besonders Jugendliche verbringen taeglich mehrere Stunden auf Plattformen.\n\n` +
    `Forscher der Universitaet Wien stellten fest, dass exzessive Nutzung schaedlich sein kann. ` +
    `Die Studie umfasste ueber tausend Teilnehmer und zeigte eindeutige Zusammenhaenge.\n\n` +
    `Eltern und Lehrer sollten gemeinsam Strategien entwickeln, um einen gesunden Umgang zu foerdern. ` +
    `Bewusste Mediennutzung ist der Schluessel zum Wohlbefinden.\n\n` +
    `Die Politik muss Rahmenbedingungen schaffen, die den Schutz von Jugendlichen gewaehrleisten. ` +
    `Neue Regelungen sind notwendig, um Datenmissbrauch zu verhindern.\n\n` +
    `Zusammenfassend laesst sich sagen, dass Social Media Chancen und Risiken birgt. ` +
    `Eine reflektierte Nutzung ist entscheidend fuer die Entwicklung von Jugendlichen.`;

  it('kuerzt einen langen Text auf das Limit', () => {
    const result = truncateText(longText, { maxWoerter: 50 });
    expect(result.wasTruncated).toBe(true);
    expect(result.resultWoerter).toBeLessThanOrEqual(55); // etwas Toleranz
    expect(result.text).toContain('[…]');
  });

  it('behaelt ersten und letzten Absatz', () => {
    const result = truncateText(longText, { maxWoerter: 50 });
    const absaetze = result.text.split('\n\n');
    expect(absaetze[0]).toContain('Die Nutzung von sozialen Medien');
    expect(absaetze[absaetze.length - 1]).toContain('Zusammenfassend');
  });

  it('kuerzt nicht, wenn Text unter dem Limit ist', () => {
    const shortText = 'Dies ist ein kurzer Text mit wenigen Woertern.';
    const result = truncateText(shortText, { maxWoerter: 100 });
    expect(result.wasTruncated).toBe(false);
    expect(result.text).toBe(shortText);
  });

  it('respektiert Stufen-Defaults', () => {
    const resultUnterstufe = truncateText(longText, { stufe: 'unterstufe' });
    const resultOberstufe = truncateText(longText, { stufe: 'oberstufe' });
    // Oberstufe hat hoeheres Limit, also wird weniger gekuerzt
    expect(resultOberstufe.resultWoerter).toBeGreaterThanOrEqual(resultUnterstufe.resultWoerter);
  });
});
