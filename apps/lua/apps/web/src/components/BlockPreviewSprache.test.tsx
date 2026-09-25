import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Block } from '@lehrunterlagen/schema';
import { baueWortbank } from '@lehrunterlagen/schema';
import { BlockPreviewKreuzwortraetsel } from './BlockPreviewKreuzwortraetsel';
import { BlockPreviewLueckentext } from './BlockPreviewLueckentext';

const kreuzwort: Block = {
  id: 'k1', typ: 'kreuzwortraetsel', punkte: 4, arbeitsanweisung: 'Löse das Rätsel.',
  // Gemeinsamer Buchstabe, damit ein Eintrag senkrecht platziert wird.
  config: { eintraege: [{ wort: 'HUND', hinweis: 'Haustier' }, { wort: 'UND', hinweis: 'Bindewort' }] },
};

describe('BlockPreviewKreuzwortraetsel — Richtungs-Labels', () => {
  // Bug-Report v1.5.0: „Waagrecht/senkrecht sollte auch auf Englisch sein".
  it('ohne fach bzw. Deutsch: Waagrecht/Senkrecht', () => {
    const html = renderToStaticMarkup(<BlockPreviewKreuzwortraetsel block={kreuzwort} showSolution={false} />);
    expect(html).toContain('Waagrecht:');
    expect(html).toContain('Senkrecht:');
    expect(html).not.toContain('Across:');
    expect(html).not.toContain('Down:');
  });

  it('fach=englisch: Across/Down statt Waagrecht/Senkrecht', () => {
    const html = renderToStaticMarkup(<BlockPreviewKreuzwortraetsel block={kreuzwort} showSolution={false} fach="englisch" />);
    expect(html).toContain('Across:');
    expect(html).toContain('Down:');
    expect(html).not.toContain('Waagrecht');
    expect(html).not.toContain('Senkrecht');
  });
});

const lueckentext: Block = {
  id: 'bPreviewBank', typ: 'lueckentext', punkte: 5, arbeitsanweisung: 'Setze ein.',
  config: { anzahlLuecken: 4, wortbank: true, distraktoren: 0 },
  loesung: { luecken: [
    { nr: 1, wort: 'Alpha' }, { nr: 2, wort: 'Beta' }, { nr: 3, wort: 'Gamma' }, { nr: 4, wort: 'Delta' },
  ] },
};

describe('BlockPreviewLueckentext — Wortbank', () => {
  // Bug-Report v1.5.0: Wörter der Wortbank durcheinander, wie gedruckt.
  it('zeigt die Wortbank gemischt (seed-stabil, wie der DOCX-Export)', () => {
    const html = renderToStaticMarkup(<BlockPreviewLueckentext block={lueckentext} showSolution={true} />);
    const bank = html.slice(html.indexOf('Wortbank:'));
    const loesungsworte = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    const reihenfolge = loesungsworte
      .map((w) => ({ w, i: bank.indexOf(w) }))
      .sort((a, b) => a.i - b.i)
      .map((x) => x.w);
    expect(reihenfolge).toEqual(baueWortbank(loesungsworte, [], 'bPreviewBank'));
    expect(reihenfolge).not.toEqual(loesungsworte);
  });

  it('zeigt alle Wörter sichtbar (Lösungshilfe wie auf dem Ausdruck)', () => {
    const html = renderToStaticMarkup(<BlockPreviewLueckentext block={lueckentext} showSolution={false} />);
    const bank = html.slice(html.indexOf('Wortbank:'));
    for (const wort of ['Alpha', 'Beta', 'Gamma', 'Delta']) expect(bank).toContain(wort);
    expect(bank).not.toContain('________');
  });
});
