import { describe, expect, it } from 'vitest';
import { extractHtmlText, normalizePlainText } from './importText';

describe('extractHtmlText', () => {
  it('entfernt Boilerplate und behaelt Haupttext', () => {
    const result = extractHtmlText(`
      <html>
        <head><title>Seitentitel</title><style>.x { color: red; }</style></head>
        <body>
          <nav>Navigation</nav>
          <main>
            <h1>Artikel</h1>
            <p>Erster Absatz.</p>
            <script>window.evil = true;</script>
            <p>Zweiter Absatz.</p>
          </main>
          <footer>Impressum</footer>
        </body>
      </html>
    `);

    expect(result.titel).toBe('Seitentitel');
    expect(result.inhalt).toContain('Artikel');
    expect(result.inhalt).toContain('Erster Absatz.');
    expect(result.inhalt).toContain('Zweiter Absatz.');
    expect(result.inhalt).not.toContain('Navigation');
    expect(result.inhalt).not.toContain('Impressum');
    expect(result.inhalt).not.toContain('window.evil');
  });
});

describe('normalizePlainText', () => {
  it('komprimiert Leerzeilen ohne Inhalt zu verlieren', () => {
    expect(normalizePlainText(' A \n\n\n B \n ')).toBe('A\n\nB');
  });
});
