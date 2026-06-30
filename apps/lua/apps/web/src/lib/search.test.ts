import { describe, expect, it } from 'vitest';
import {
  BLOCK_TYPE_LABEL,
  SECTION_LABELS,
  blockTypeLabel,
  buildSearchIndex,
  defaultResults,
  fachLabel,
  groupResults,
  isSubsequence,
  normalize,
  parseTags,
  scoreEntry,
  searchIndex,
  stufeLabel,
} from './search';
import type { SearchSources } from './search';

const sources = (overrides: Partial<SearchSources> = {}): SearchSources => ({
  documents: [],
  templates: [],
  pool: [],
  klassen: [],
  navigation: [],
  commands: [],
  ...overrides,
});

describe('search — normalize', () => {
  it('macht case- + umlaut-insensitiv (ä→ae, ß→ss)', () => {
    expect(normalize('Größe')).toBe('groesse');
    expect(normalize('ÜBUNG')).toBe('uebung');
    expect(normalize('Fußball')).toBe('fussball');
    expect(normalize('Photosynthese')).toBe('photosynthese');
  });
});

describe('search — isSubsequence', () => {
  it('erkennt nicht-benachbarte Zeichen in Reihenfolge', () => {
    expect(isSubsequence('abc', 'xaybzc')).toBe(true);
  });
  it('lehnt ab wenn Reihenfolge verletzt', () => {
    expect(isSubsequence('abc', 'cba')).toBe(false);
  });
  it('leerer Query trifft immer', () => {
    expect(isSubsequence('', 'irgendwas')).toBe(true);
  });
});

describe('search — Label-Helfer', () => {
  it('fachLabel/stufeLabel kennen die Werte und fallen sonst auf den Rohwert', () => {
    expect(fachLabel('deutsch')).toBe('Deutsch');
    expect(fachLabel('englisch')).toBe('Englisch');
    expect(fachLabel('franzoesisch')).toBe('franzoesisch');
    expect(stufeLabel('oberstufe')).toBe('Oberstufe');
    expect(stufeLabel('unterstufe')).toBe('Unterstufe');
  });
  it('blockTypeLabel mappt die bekannten Typen und fallbackt sonst', () => {
    expect(blockTypeLabel('lueckentext')).toBe('Lückentext');
    expect(blockTypeLabel('multipleChoice')).toBe('Multiple Choice');
    expect(blockTypeLabel('unbekannt')).toBe('unbekannt');
    expect(Object.keys(BLOCK_TYPE_LABEL).length).toBeGreaterThanOrEqual(15);
  });
  it('parseTags verarbeitet JSON-Array und Kommaliste', () => {
    expect(parseTags(JSON.stringify(['a', 'b']))).toEqual(['a', 'b']);
    expect(parseTags('a, b ,c')).toEqual(['a', 'b', 'c']);
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
  });
});

describe('search — buildSearchIndex', () => {
  it('überspringt leere/fehlende Quellen ohne Crash', () => {
    expect(buildSearchIndex(sources())).toEqual([]);
    expect(buildSearchIndex({})).toEqual([]);
  });
  it('baut aus jeder Quelle einen Eintrag mit korrekter Art + Action', () => {
    const idx = buildSearchIndex(
      sources({
        documents: [{ id: 'd1', title: 'T', updatedAt: '2026-01-01T00:00:00.000Z', meta: { thema: 'T', fach: 'deutsch', stufe: 'oberstufe', klasse: '7A' } }],
        templates: [{ id: 't1', name: 'Vor', savedAt: '2026-01-01T00:00:00.000Z', meta: { fach: 'englisch', stufe: 'unterstufe' } }],
        pool: [{ id: 'p1', thema: 'P', aufgabentyp: 'lueckentext', tags: '["x"]', createdAt: '2026-01-01T00:00:00.000Z' }],
        klassen: [{ klasse: '7A', anzahlAbgaben: 3 }],
        navigation: [{ view: 'documents', label: 'Meine Unterlagen' }],
        commands: [{ id: 'export', label: 'Exportieren', action: { type: 'paletteCommand', commandId: 'export' } }],
      }),
    );
    const ids = idx.map((r) => r.id);
    expect(ids).toEqual(['doc:d1', 'tpl:t1', 'pool:p1', 'klasse:7A', 'nav:documents', 'cmd:export']);
    expect(idx[0]).toMatchObject({ kind: 'document', action: { type: 'openDocument', docId: 'd1' } });
    expect(idx[1]).toMatchObject({ kind: 'template', action: { type: 'loadTemplate', templateId: 't1' } });
    expect(idx[2]).toMatchObject({ kind: 'pool', action: { type: 'insertPoolBlock', poolId: 'p1' } });
    expect(idx[3]).toMatchObject({ kind: 'klasse', action: { type: 'view', view: 'klassen' } });
    expect(idx[4]).toMatchObject({ kind: 'navigation', action: { type: 'view', view: 'documents' } });
    expect(idx[5]).toMatchObject({ kind: 'command', action: { type: 'paletteCommand', commandId: 'export' } });
  });
  it('nimmt thema/fach/stufe/klasse/tags als Keywords auf', () => {
    const idx = buildSearchIndex(
      sources({
        documents: [{ id: 'd1', title: 'Photosynthese', meta: { fach: 'deutsch', stufe: 'oberstufe', klasse: '7A' } }],
        pool: [{ id: 'p1', thema: 'Reime', aufgabentyp: 'matching', tags: '["klang","paar"]' }],
      }),
    );
    expect(idx[0]!.keywords).toContain('deutsch');
    expect(idx[0]!.keywords).toContain('Deutsch');
    expect(idx[0]!.keywords).toContain('Oberstufe');
    expect(idx[0]!.keywords).toContain('7A');
    expect(idx[1]!.keywords).toEqual(expect.arrayContaining(['Reime', 'matching', 'Matching', 'klang', 'paar']));
  });
  it('score aus buildSearchIndex ist 0 (wird erst bei Suche gesetzt)', () => {
    const idx = buildSearchIndex(sources({ documents: [{ id: 'd1', title: 'X' }] }));
    expect(idx[0]!.score).toBe(0);
  });
});

describe('search — Ranking-Reihenfolge (exact > prefix > substring > subsequence)', () => {
  const idx = buildSearchIndex(
    sources({
      documents: [
        { id: 'exact', title: 'alpha', meta: {} },
        { id: 'prefix', title: 'alphabet', meta: {} },
        { id: 'substring', title: 'xalpha', meta: {} },
        { id: 'subseq', title: 'a__l__p__h__a', meta: {} },
        { id: 'nope', title: 'ganz anders', meta: {} },
      ],
    }),
  );

  it('sortiert exact vor prefix vor substring vor subsequence', () => {
    const res = searchIndex(idx, 'alpha');
    expect(res.map((r) => r.id)).toEqual(['doc:exact', 'doc:prefix', 'doc:substring', 'doc:subseq']);
    expect(res.some((r) => r.id === 'doc:nope')).toBe(false);
  });

  it('exact-Title schlägt keyword-exact', () => {
    const i = buildSearchIndex(
      sources({
        documents: [{ id: 'd_kw', title: 'irgendwas', meta: { klasse: 'alpha' } }],
        templates: [{ id: 't_exact', name: 'alpha', meta: {} }],
      }),
    );
    const res = searchIndex(i, 'alpha');
    expect(res[0]!.id).toBe('tpl:t_exact');
  });
});

describe('search — Umlaut-/Case-Insensitivität', () => {
  const idx = buildSearchIndex(
    sources({
      documents: [{ id: 'd1', title: 'Größe und Fußball', meta: {} }],
    }),
  );
  it('trifft trotz Groß-/Kleinschreibung', () => {
    expect(searchIndex(idx, 'größe')[0]!.id).toBe('doc:d1');
    expect(searchIndex(idx, 'GROSS')[0]!.id).toBe('doc:d1');
  });
  it('trifft trotz Umlaut-Expansion (gross → größe)', () => {
    expect(searchIndex(idx, 'gross')[0]!.id).toBe('doc:d1');
    expect(searchIndex(idx, 'fussball')[0]!.id).toBe('doc:d1');
  });
});

describe('search — leerer Query → Defaults', () => {
  it('liefert bei leerem Index eine leere Liste (kein Crash)', () => {
    expect(searchIndex([], '')).toEqual([]);
    expect(defaultResults([])).toEqual([]);
  });
  it('liefert Top-Befehle + letzte Unterlagen + Vorlagen + Klassen + Navigation', () => {
    const idx = buildSearchIndex(
      sources({
        documents: [
          { id: 'old', title: 'Alt', updatedAt: '2026-01-01T00:00:00.000Z', meta: {} },
          { id: 'new', title: 'Neu', updatedAt: '2026-06-01T00:00:00.000Z', meta: {} },
        ],
        templates: [{ id: 't1', name: 'Vorlage', savedAt: '2026-05-01T00:00:00.000Z', meta: {} }],
        klassen: [{ klasse: '7A', anzahlAbgaben: 2 }],
        navigation: [
          { view: 'dashboard', label: 'Übersicht' },
          { view: 'documents', label: 'Meine Unterlagen' },
        ],
        commands: [
          { id: 'export', label: 'Exportieren', action: { type: 'paletteCommand', commandId: 'export' } },
          { id: 'new', label: 'Neue erstellen', action: { type: 'paletteCommand', commandId: 'new' } },
        ],
      }),
    );
    const res = defaultResults(idx);
    // Bevorzugte Befehle ('new','export') zuerst, dann neuestes Dokument vor altem.
    expect(res[0]!.id).toBe('cmd:new');
    expect(res[1]!.id).toBe('cmd:export');
    const docNew = res.findIndex((r) => r.id === 'doc:new');
    const docOld = res.findIndex((r) => r.id === 'doc:old');
    expect(docNew).toBeGreaterThan(-1);
    expect(docNew).toBeLessThan(docOld);
    expect(res.some((r) => r.id === 'tpl:t1')).toBe(true);
    expect(res.some((r) => r.id === 'klasse:7A')).toBe(true);
    expect(res.some((r) => r.id === 'nav:dashboard')).toBe(true);
  });
  it(' Defaults und searchIndex(""/" ") stimmen überein', () => {
    const idx = buildSearchIndex(sources({ commands: [{ id: 'x', label: 'X', action: { type: 'paletteCommand', commandId: 'x' } }] }));
    expect(searchIndex(idx, '')).toEqual(defaultResults(idx));
    expect(searchIndex(idx, '   ')).toEqual(defaultResults(idx));
  });
});

describe('search — Mischung aller kinds + Gruppierung', () => {
  const idx = buildSearchIndex(
    sources({
      documents: [{ id: 'd1', title: 'Thema Goethe', meta: { fach: 'deutsch' } }],
      templates: [{ id: 't1', name: 'Goethe-Vorlage', meta: {} }],
      pool: [{ id: 'p1', thema: 'Goethe Zitate', aufgabentyp: 'matching', tags: '["goethe"]' }],
      klassen: [{ klasse: 'Goethe-Klasse', anzahlAbgaben: 1 }],
      navigation: [{ view: 'help', label: 'Hilfe zu Goethe' }],
      commands: [{ id: 'goethe-cmd', label: 'Goethe-Befehl', action: { type: 'paletteCommand', commandId: 'goethe' } }],
    }),
  );

  it('liefert Treffer aus jeder Art', () => {
    const res = searchIndex(idx, 'goethe');
    const kinds = new Set(res.map((r) => r.kind));
    expect(kinds).toEqual(new Set(['command', 'document', 'template', 'pool', 'klasse', 'navigation']));
  });

  it('groupResults bildet Sektionen in fester Reihenfolge nur für vorhandene Arten', () => {
    const res = searchIndex(idx, 'goethe');
    const sections = groupResults(res);
    expect(sections.map((s) => s.label)).toEqual([
      SECTION_LABELS.command,
      SECTION_LABELS.document,
      SECTION_LABELS.template,
      SECTION_LABELS.pool,
      SECTION_LABELS.klasse,
      SECTION_LABELS.navigation,
    ]);
    expect(sections.every((s) => s.items.length > 0)).toBe(true);
  });

  it('groupResults lässt leere Sektionen weg', () => {
    const sections = groupResults([idx[0]!]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.kind).toBe('document');
  });
});

describe('search — Tie-Breaks', () => {
  it('bei gleichem Score gewinnt die rezentere Unterlage', () => {
    const idx = buildSearchIndex(
      sources({
        documents: [
          { id: 'alt', title: 'Goethe', updatedAt: '2026-01-01T00:00:00.000Z', meta: {} },
          { id: 'neu', title: 'Goethe', updatedAt: '2026-06-01T00:00:00.000Z', meta: {} },
        ],
      }),
    );
    const res = searchIndex(idx, 'goethe');
    expect(res[0]!.id).toBe('doc:neu');
    expect(res[1]!.id).toBe('doc:alt');
  });

  it('bei gleichem Score + Rezenz gewinnt die Art-Prio (command vor document)', () => {
    const idx = buildSearchIndex(
      sources({
        documents: [{ id: 'd1', title: 'Ping', meta: {} }],
        commands: [{ id: 'c1', label: 'Ping', action: { type: 'paletteCommand', commandId: 'c1' } }],
      }),
    );
    const res = searchIndex(idx, 'ping');
    expect(res[0]!.kind).toBe('command');
    expect(res[1]!.kind).toBe('document');
  });

  it('bei gleichem Score + Rezenz + Art gewinnt der alphabetisch frühere Titel', () => {
    const idx = buildSearchIndex(
      sources({
        documents: [
          { id: 'b', title: 'Beta', meta: {} },
          { id: 'a', title: 'Alpha', meta: {} },
        ],
      }),
    );
    const res = searchIndex(idx, 'a'); // substring-Treffer bei beiden (Alpha enthält a, Beta enthält a)
    expect(res[0]!.id).toBe('doc:a');
  });
});

describe('search — Keyword-only-Treffer', () => {
  it('findet Eintrag, dessen Titel nicht passt, aber ein Keyword', () => {
    const idx = buildSearchIndex(
      sources({
        documents: [{ id: 'd1', title: 'Irgendwas', meta: { klasse: '7A' } }],
      }),
    );
    const res = searchIndex(idx, '7a');
    expect(res[0]!.id).toBe('doc:d1');
  });
  it('scoreEntry gibt 0 wenn gar nichts passt', () => {
    const idx = buildSearchIndex(sources({ documents: [{ id: 'd1', title: 'X', meta: {} }] }));
    expect(scoreEntry(idx[0]!, 'yyy')).toBe(0);
  });
});

describe('search — Sonderzeichen & Edge-Cases', () => {
  it('Query mit Sonderzeichen (/, (, .) crasht nicht und matched substring', () => {
    const idx = buildSearchIndex(sources({ documents: [{ id: 'd1', title: 'A/B (C) Test.txt', meta: {} }] }));
    expect(() => searchIndex(idx, 'A/B')).not.toThrow();
    expect(searchIndex(idx, '(C)')[0]!.id).toBe('doc:d1');
    expect(searchIndex(idx, '.txt')[0]!.id).toBe('doc:d1');
  });
  it('sehr langer Query wird deterministic leer geliefert wenn kein Treffer', () => {
    const idx = buildSearchIndex(sources({ documents: [{ id: 'd1', title: 'Kurz', meta: {} }] }));
    expect(searchIndex(idx, 'x'.repeat(500))).toEqual([]);
  });
  it('ist deterministisch: gleicher Query → gleiche Reihenfolge', () => {
    const idx = buildSearchIndex(
      sources({
        documents: [
          { id: 'd1', title: 'Goethe', meta: {} },
          { id: 'd2', title: 'Goethe Freund', meta: {} },
        ],
      }),
    );
    const a = searchIndex(idx, 'goethe');
    const b = searchIndex(idx, 'goethe');
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });
  it('deckt die Ergebnisliste bei vielen Treffern', () => {
    const docs = Array.from({ length: 60 }, (_, i) => ({ id: `d${i}`, title: `treffer ${i}`, meta: {} }));
    const idx = buildSearchIndex(sources({ documents: docs }));
    expect(searchIndex(idx, 'treffer').length).toBeLessThanOrEqual(30);
  });
});
