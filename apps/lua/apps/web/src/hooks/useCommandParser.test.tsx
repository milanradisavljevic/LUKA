/**
 * Die Befehlszeile der Palette.
 *
 * Vorher standen hier Zeilen, die **sichtbar, aber tot** waren: „Thema: <Text>",
 * „Fach: …", „Punkte: <Zahl>", „Gehe zu Schritt 1–4" und die beiden
 * Vorlagenbefehle. Ein Klick darauf tat nichts und meldete „Befehl nicht
 * erkannt" — nur der Rohtext ließ sich parsen, die Zeile nicht.
 *
 * Der Test deckt die halbe Korrektur ab: der Parser. Die andere Hälfte — dass
 * unpassende Zeilen gar nicht erst erscheinen — hängt an
 * `befehlIstAusfuehrbar` und wird hier ebenfalls geprüft.
 *
 * `useCommandParser` wird bewusst **ohne** DOM getestet: der Hook hält keinen
 * Zustand, nur ein `useCallback`. `renderToStaticMarkup` reicht, und so kommt
 * kein Test-Renderer ins Projekt.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCommandParser } from './useCommandParser';
import { COMMANDS } from '../lib/commands';
import { befehlIstAusfuehrbar } from '../components/CommandPalette';
import type { SearchResult } from '../lib/search';

/**
 * Ruft den Hook in einer winzigen Komponente auf – kein DOM nötig.
 *
 * Die Werte stehen als Attribute, nicht als Text: `renderToStaticMarkup`
 * escapt Anführungszeichen zu `&quot;`, was ein `JSON.parse` zerlegt.
 */
function parse(input: string) {
  function Harness() {
    const { parse: p } = useCommandParser();
    const r = p(input);
    return <span data-cid={r.commandId ?? ''} data-act={String(r.action !== null)} />;
  }
  const html = renderToStaticMarkup(<Harness />);
  const cid = /data-cid="([^"]*)"/.exec(html)?.[1] ?? '';
  const act = /data-act="([^"]*)"/.exec(html)?.[1] === 'true';
  return { commandId: cid === '' ? null : cid, label: '', hatAction: act };
}

/** Eine Befehlszeile, wie die Palette sie baut. */
const zeile = (commandId: string): SearchResult => ({
  id: `command:${commandId}`,
  kind: 'command',
  title: COMMANDS.find((c) => c.id === commandId)?.label ?? commandId,
  keywords: [],
  score: 0,
  action: { type: 'paletteCommand', commandId },
});

describe('useCommandParser — Platzhalter-Befehle', () => {
  it('erkennt „Thema: Goethe" und liefert eine Aktion', () => {
    const r = parse('Thema: Goethe');
    expect(r.commandId).toBe('meta-thema');
    expect(r.hatAction).toBe(true);
  });

  it('erkennt die Schrittbefehle und die Vorlagenbefehle', () => {
    expect(parse('Gehe zu 3').commandId).toBe('nav-step');
    expect(parse('Schritt 2').commandId).toBe('nav-step');
    expect(parse('Vorlage speichern als Lyrik').commandId).toBe('template-save');
    expect(parse('Vorlage laden: Lyrik').commandId).toBe('template-load');
  });

  it('erkennt Befehle ohne Platzhalter genauso', () => {
    // Ohne Platzhalter ist die Zeile auch ohne getippten Text ausführbar –
    // das ist der Grund, warum sie in der Palette dauerhaft stehen darf.
    expect(parse('Export').commandId).toBe('export');
    expect(parse('Tafelmodus').commandId).toBe('tafel-modus');
  });

  it('ignoriert Groß-/Kleinschreibung und Leerzeichen', () => {
    expect(parse('  thema :  Goethe  ').commandId).toBe('meta-thema');
    expect(parse('THEMA: Goethe').commandId).toBe('meta-thema');
  });
});

describe('useCommandParser — was nicht erkannt wird', () => {
  it('meldet leere Eingabe als „nichts"', () => {
    const r = parse('   ');
    expect(r.commandId).toBeNull();
    expect(r.hatAction).toBe(false);
  });

  it('meldet Unsinn als unbekannt, ohne zu raten', () => {
    const r = parse('blabla gibts nicht');
    expect(r.commandId).toBe('unknown');
    expect(r.hatAction).toBe(false);
  });

  it('erkennt „Fach:" nicht ohne Wert – das wäre eine leere Fachangabe', () => {
    // Das Muster verlangt einen der beiden Fächer; „Fach: Französisch" ist
    // bewusst nicht gültig, weil die App genau diese zwei Fächer im Generator
    // anbietet.
    expect(parse('Fach: Französisch').commandId).toBe('unknown');
    expect(parse('Fach: Deutsch').commandId).toBe('meta-fach');
  });
});

describe('befehlIstAusfuehrbar — die tote Zeile', () => {
  it('blendet eine Platzhalterzeile aus, wenn die Eingabe nicht passt', () => {
    // Genau der gemeldete Fall: „Thema: <Text>" stand da, obwohl der getippte
    // Text gar kein Thema war. Der Klick lief ins Leere.
    expect(befehlIstAusfuehrbar(zeile('meta-thema'), 'Goethe')).toBe(false);
    expect(befehlIstAusfuehrbar(zeile('meta-thema'), 'Thema: Goethe')).toBe(true);
  });

  it('blendet die Anzeige der Vorlagenbefehle ohne passende Eingabe aus', () => {
    expect(befehlIstAusfuehrbar(zeile('template-save'), 'Lyrik')).toBe(false);
    expect(befehlIstAusfuehrbar(zeile('template-save'), 'Vorlage speichern als Lyrik')).toBe(true);
    expect(befehlIstAusfuehrbar(zeile('template-load'), 'Vorlage laden: Lyrik')).toBe(true);
  });

  it('lässt Befehle ohne Platzhalter immer stehen', () => {
    // Ohne Eingabe ausführbar – deshalb dürfen sie nicht verschwinden.
    for (const id of ['export', 'tafel-modus', 'nav-back', 'nav-next']) {
      expect(befehlIstAusfuehrbar(zeile(id), ''), id).toBe(true);
    }
  });

  it('lässt Treffer anderer Art unangetastet', () => {
    const dokument: SearchResult = {
      id: 'doc:1', kind: 'document', title: 'Lyrik', keywords: [], score: 1,
      action: { type: 'openDocument', docId: '1' },
    };
    expect(befehlIstAusfuehrbar(dokument, 'nur dieser Text')).toBe(true);
  });

  it('hält jedes Befehlsmuster am Anfang verankert', () => {
    // Ein Muster ohne `^` passt auch auf Text, der gar kein Befehl ist: Die
    // Zeile „Fäuge Lückentext hinzu" erschiene dann, sobald irgendwo im
    // Eingabefeld "Lückentext" vorkommt — sichtbar, aber nicht ausführbar.
    // Das ist dieselbe Fehlerart wie die tote Zeile, nur umgekehrt.
    const locker = COMMANDS.filter(
      (c) => !new RegExp(c.pattern.source).source.startsWith('^'),
    );
    expect(
      locker.map((c) => c.id),
      'Befehlsmuster ist nicht am Anfang verankert: die Zeile wäre zu oft sichtbar',
    ).toEqual([]);
  });
});
