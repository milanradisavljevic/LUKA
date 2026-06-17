import { describe, it, expect } from 'vitest';
import { analysiereQuelltext } from './quelltextInfo';

const makeText = (words: number) => Array.from({ length: words }, (_, i) => `wort${i}`).join(' ');

function buildSentences(wordCount: number, wordsPerSentence: number): string {
  const sentences: string[] = [];
  let current: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    current.push(`wort${i}`);
    if (current.length === wordsPerSentence) {
      sentences.push(current.join(' ') + '.');
      current = [];
    }
  }
  if (current.length > 0) {
    sentences.push(current.join(' ') + '.');
  }
  return sentences.join(' ');
}

describe('analysiereQuelltext', () => {
  it('erkennt kurze Sätze als eher Unterstufe', () => {
    const text = buildSentences(100, 10);
    const info = analysiereQuelltext(text);
    expect(info.schnittSatzlaenge).toBe(10);
    expect(info.hinweis).toContain('kurze Sätze');
    expect(info.hinweis).toContain('Unterstufe');
  });

  it('erkennt mittlere Satzlänge', () => {
    const text = buildSentences(150, 15);
    const info = analysiereQuelltext(text);
    expect(info.schnittSatzlaenge).toBe(15);
    expect(info.hinweis).toBe('mittlere Satzlänge');
  });

  it('erkennt lange Sätze als eher Oberstufe', () => {
    const text = buildSentences(100, 20);
    const info = analysiereQuelltext(text);
    expect(info.schnittSatzlaenge).toBe(20);
    expect(info.hinweis).toContain('lange Sätze');
    expect(info.hinweis).toContain('Oberstufe');
  });

  it('markiert sehr kurze Texte', () => {
    const text = buildSentences(50, 12);
    const info = analysiereQuelltext(text);
    expect(info.woerter).toBe(50);
    expect(info.hinweis).toContain('sehr kurz');
  });

  it('markiert sehr lange Texte', () => {
    const text = buildSentences(1300, 12);
    const info = analysiereQuelltext(text);
    expect(info.woerter).toBe(1300);
    expect(info.hinweis).toContain('sehr lang');
  });

  it('vermeidet Division durch null bei leerem Text', () => {
    const info = analysiereQuelltext('');
    expect(info.woerter).toBe(0);
    expect(info.saetze).toBe(1);
    expect(info.schnittSatzlaenge).toBe(0);
  });

  it('verarbeitet einen einzelnen Satz korrekt', () => {
    const info = analysiereQuelltext('Dies ist ein einzelner Satz.');
    expect(info.saetze).toBe(1);
    expect(info.woerter).toBe(5);
    expect(info.schnittSatzlaenge).toBe(5);
  });
});
